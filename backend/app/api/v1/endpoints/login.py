from datetime import timedelta, datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, Body, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas import Token

router = APIRouter()


@router.post("/login/access-token", response_model=Token)
async def login_access_token(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    import traceback

    try:
        print(f"[LOGIN] Starting login for: {form_data.username}")

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
        except Exception as e:
            # Redis unavailable - skip rate limiting for local dev
            print(f"[LOGIN] Redis unavailable: {e}")
            redis_available = False
            redis_client = None

        # Authenticate
        print(f"[LOGIN] Querying database for user...")
        result = await db.execute(select(User).where(User.email == form_data.username))
        user = result.scalars().first()
        print(f"[LOGIN] User found: {user is not None}")

        if not user:
            raise HTTPException(status_code=400, detail="Incorrect email or password")

        print(f"[LOGIN] Verifying password...")
        password_valid = security.verify_password(form_data.password, user.hashed_password)
        print(f"[LOGIN] Password valid: {password_valid}")

        if not password_valid:
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

        print(f"[LOGIN] Creating tokens...")
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(user.id, expires_delta=access_token_expires)
        refresh_token = security.create_refresh_token(user.id)
        print(f"[LOGIN] Login successful for user: {user.id}")

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[LOGIN] UNEXPECTED ERROR: {type(e).__name__}: {e}")
        print(f"[LOGIN] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")


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
