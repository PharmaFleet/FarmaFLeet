from typing import Generator, List
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import logger
from app.db.session import SessionLocal
from app.models.user import User


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


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
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if token is blacklisted
        from app.services.auth import auth_service

        if await auth_service.is_token_blacklisted(token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been invalidated",
            )

    except JWTError as e:
        if "expired" in str(e).lower():
            logger.info(f"Token expired for request")
        else:
            logger.error(f"JWT Validation Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except ValidationError as e:
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


def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Dependency that requires the user to be a super_admin.
    Use for admin-only operations like user management and batch deletions.
    """
    from app.models.user import UserRole

    if current_user.role != UserRole.SUPER_ADMIN and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action",
        )
    return current_user


def get_current_manager_or_above(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Dependency that requires the user to be a warehouse_manager or super_admin.
    Use for operations like payment verification, driver management, etc.
    """
    from app.models.user import UserRole

    allowed_roles = [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_MANAGER]
    if current_user.role not in allowed_roles and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers and administrators can perform this action",
        )
    return current_user


def get_current_dispatcher_or_above(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Dependency that requires the user to be a dispatcher, warehouse_manager, or super_admin.
    Use for operations like order assignment, driver status changes, etc.
    """
    from app.models.user import UserRole

    allowed_roles = [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.DISPATCHER]
    if current_user.role not in allowed_roles and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dispatchers, managers, and administrators can perform this action",
        )
    return current_user


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


async def verify_order_warehouse_access(
    order_warehouse_id: int, user: User, db: AsyncSession
) -> None:
    """
    Verify the current user has access to the order's warehouse.
    Raises 403 if the user does not have access.
    Super admins always have access.
    """
    warehouse_ids = await get_user_warehouse_ids(user, db)
    if warehouse_ids is None:
        return  # Super admin or unrestricted role
    if order_warehouse_id not in warehouse_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to orders in this warehouse",
        )


async def verify_orders_warehouse_access(
    order_warehouse_ids: list[int], user: User, db: AsyncSession
) -> None:
    """
    Verify the current user has access to all given warehouse IDs (for batch ops).
    Raises 403 if any warehouse is not accessible.
    """
    warehouse_ids = await get_user_warehouse_ids(user, db)
    if warehouse_ids is None:
        return  # Super admin or unrestricted role
    unauthorized = set(order_warehouse_ids) - set(warehouse_ids)
    if unauthorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to orders in some of the selected warehouses",
        )


# Rate limit decorators for specific endpoints
# These are used with slowapi's @limiter.limit decorator on endpoints
#
# Rate limits:
# - /auth/login: 5 requests per minute
# - /orders/import: 10 requests per 5 minutes
# - /orders/export: 5 requests per minute
#
# Usage in endpoints:
#   from app.api.deps import limiter
#   @router.post("/import")
#   @limiter.limit("10/5minutes")
#   async def import_orders(request: Request, ...):

# Rate limit strings for easy reference
RATE_LIMIT_LOGIN = "5/minute"
RATE_LIMIT_IMPORT = "10/5minutes"
RATE_LIMIT_EXPORT = "5/minute"
