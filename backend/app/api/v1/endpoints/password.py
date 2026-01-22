from typing import Any
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core import security
from app.models.user import User
from app.services.email import email_service
from app.schemas import Msg

router = APIRouter()


@router.post("/password-reset/request", response_model=Msg)
async def request_password_reset(
    email: str = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Request a password reset email.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if user:
        # Generate a password reset token (valid for 15 mins)
        from datetime import timedelta

        password_reset_token = security.create_access_token(
            subject=user.email, expires_delta=timedelta(minutes=15)
        )
        await email_service.send_password_reset_email(user.email, password_reset_token)

    # Always return success to prevent email enumeration
    return {"msg": "If the email exists, a password reset link has been sent."}


@router.post("/password-reset/confirm", response_model=Msg)
async def confirm_password_reset(
    token: str = Body(...),
    new_password: str = Body(...),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Confirm password reset with valid token.
    """
    try:
        email = security.verify_token_subject(
            token
        )  # Need to create this helper or use logic
        if not email:
            raise HTTPException(status_code=400, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = security.get_password_hash(new_password)
    db.add(user)
    await db.commit()

    return {"msg": "Password updated successfully"}
