from datetime import timedelta, datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, Body, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.api.deps import limiter, RATE_LIMIT_LOGIN
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas import Token

router = APIRouter()


@router.post("/login/access-token", response_model=Token)
@limiter.limit(RATE_LIMIT_LOGIN)
async def login_access_token(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    # Custom Login Rate Limiting (by Username/IP) - optional if Redis unavailable
    client_ip = request.client.host if request.client else "unknown"
    limiter_key = f"login_limit:{client_ip}"

    redis_available = True
    redis_client = None
    try:
        import redis.asyncio as redis

        redis_client = redis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )

        attempts = await redis_client.get(limiter_key)
        if attempts and int(attempts) > 5:
            raise HTTPException(
                status_code=429,
                detail="Too many login attempts. Please try again later.",
            )
    except HTTPException:
        raise
    except Exception:
        # Redis unavailable - skip rate limiting
        redis_available = False
        redis_client = None

    # Authenticate
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()

    if not user or not security.verify_password(
        form_data.password, user.hashed_password
    ):
        # Increment failed attempts if Redis available
        if redis_available and redis_client:
            try:
                await redis_client.incr(limiter_key)
                await redis_client.expire(limiter_key, 300)  # 5 minutes block
            except Exception:
                pass
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "refresh_token": security.create_refresh_token(user.id),
        "token_type": "bearer",
    }


@router.post("/auth/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Refresh access token.
    """
    from jose import jwt, JWTError

    try:
        payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type")

        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=400, detail="Invalid token")

        user = await db.get(User, int(user_id))
        if not user or not user.is_active:
            raise HTTPException(status_code=400, detail="User not found or inactive")

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

        return {
            "access_token": security.create_access_token(
                user.id, expires_delta=access_token_expires
            ),
            "refresh_token": refresh_token,  # Return same refresh token or rotate? Simple: return same.
            "token_type": "bearer",
        }

    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid refresh token")


@router.post("/auth/logout")
async def logout(
    current_user: User = Depends(deps.get_current_active_user),
    token: str = Depends(deps.reusable_oauth2),
) -> Any:
    """
    Logout current user.
    """
    from app.services.auth import auth_service

    await auth_service.blacklist_token(
        token, expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    return {"msg": "Successfully logged out"}


@router.post("/auth/fcm-token")
async def register_fcm_token(
    token: str = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Register or update FCM token for push notifications.

    The FCM token is stored on the user record and used for sending
    push notifications to the user's device.

    For drivers, this also subscribes them to their warehouse topic
    for broadcast notifications.
    """
    from app.models.driver import Driver
    from app.services.notification import notification_service

    # Update user's FCM token
    current_user.fcm_token = token
    db.add(current_user)

    # If user is a driver, subscribe to warehouse topic
    if current_user.role == "driver":
        result = await db.execute(
            select(Driver).where(Driver.user_id == current_user.id)
        )
        driver = result.scalars().first()

        if driver and driver.warehouse_id:
            await notification_service.subscribe_to_warehouse_topic(
                token, driver.warehouse_id
            )

    await db.commit()

    return {"msg": "FCM token registered successfully"}
