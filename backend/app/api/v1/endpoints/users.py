from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
import math

from app.api import deps
from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole
from app.schemas import (
    User as UserSchema,
    UserCreate,
    UserUpdate,
    PaginatedUserResponse,
)

router = APIRouter()


@router.get("", response_model=PaginatedUserResponse)
async def read_users(
    db: AsyncSession = Depends(deps.get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1),
    search: Optional[str] = None,
    current_user: User = Depends(deps.get_current_manager_or_above),
) -> Any:
    """
    Retrieve users with pagination and search.
    """
    skip = (page - 1) * size

    # Base query
    base_query = select(User)

    if search:
        search_filter = f"%{search}%"
        base_query = base_query.where(
            or_(User.email.ilike(search_filter), User.full_name.ilike(search_filter))
        )

    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    # Get items
    query = base_query.offset(skip).limit(size)
    result = await db.execute(query)
    users = result.scalars().all()

    pages = math.ceil(total / size) if total > 0 else 1

    return {"items": users, "total": total, "page": page, "size": size, "pages": pages}


@router.post("", response_model=UserSchema)
async def create_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create new user.
    """
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )

    # Simple create
    db_obj = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,  # Role needs to be passed
        is_active=user_in.is_active,
        is_superuser=user_in.is_superuser,
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


@router.put("/me", response_model=UserSchema)
async def update_user_me(
    *,
    db: AsyncSession = Depends(deps.get_db),
    password: str = Body(None),
    full_name: str = Body(None),
    email: str = Body(None),
    fcm_token: str = Body(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update own user.
    """
    current_user_data = jsonable_encoder(current_user)
    user_in = UserUpdate(**current_user_data)

    if password:
        current_user.hashed_password = get_password_hash(password)
    if full_name:
        current_user.full_name = full_name
    if email:
        current_user.email = email
    if fcm_token:
        current_user.fcm_token = fcm_token

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me", response_model=UserSchema)
def read_user_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user


@router.get("/{user_id}", response_model=UserSchema)
async def read_user_by_id(
    user_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Get a specific user by id.
    Users can view their own profile. Managers+ can view any user.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Users can always view their own profile
    if user.id == current_user.id:
        return user

    # Check if current user has manager+ privileges to view other users
    allowed_roles = [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_MANAGER]
    if current_user.role not in allowed_roles and not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="You don't have permission to view other users"
        )
    return user


@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a user.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )

    update_data = user_in.dict(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password

    for field, value in update_data.items():
        setattr(user, field, value)

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
) -> Any:
    """
    Delete a user. Admin only.
    Cannot delete yourself or other super_admins.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-deletion
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Prevent deletion of other super_admins (unless you're deleting a non-admin)
    if user.role == UserRole.SUPER_ADMIN and user.id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Cannot delete other super_admin users"
        )

    await db.delete(user)
    await db.commit()
    return {"msg": f"User {user_id} deleted successfully"}
