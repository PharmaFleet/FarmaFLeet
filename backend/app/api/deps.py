from typing import Generator, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import logger
from app.db.session import SessionLocal
from app.models.user import User

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


async def get_db() -> Generator:
    async with SessionLocal() as session:
        yield session


async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = payload.get("sub")

        # Check if token is blacklisted
        from app.services.auth import auth_service

        if await auth_service.is_token_blacklisted(token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been invalidated",
            )

    except (JWTError, ValidationError) as e:
        logger.error(f"JWT Validation Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user
    result = await db.execute(select(User).where(User.id == int(token_data)))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_active_superuser(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user


def requires_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in allowed_roles and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user doesn't have enough privileges",
            )
        return current_user

    return role_checker


async def get_user_warehouse_ids(
    user: User, db: AsyncSession
) -> List[int] | None:
    """
    Get list of warehouse IDs that the user has access to.

    Returns:
        - None if user is super_admin (has access to all warehouses)
        - List of warehouse IDs if user is warehouse_manager or driver
        - Empty list if user has no warehouse access
    """
    from app.models.driver import Driver
    from app.models.user import UserRole

    # Super admins have access to all warehouses
    if user.role == UserRole.SUPER_ADMIN or user.is_superuser:
        return None  # None means "all warehouses"

    # For drivers, get their assigned warehouse
    if user.role == UserRole.DRIVER:
        stmt = select(Driver).where(Driver.user_id == user.id)
        result = await db.execute(stmt)
        driver = result.scalars().first()
        if driver and driver.warehouse_id:
            return [driver.warehouse_id]
        return []  # Driver has no warehouse assigned

    # For warehouse managers and dispatchers, get their assigned warehouse
    # TODO: Add warehouse_id field to User model for non-driver roles
    # For now, warehouse managers can see all warehouses
    if user.role in [UserRole.WAREHOUSE_MANAGER, UserRole.DISPATCHER, UserRole.EXECUTIVE]:
        return None  # Allow access to all warehouses for now

    return []  # Default: no access
