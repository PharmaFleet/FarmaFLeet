from typing import List, Optional
from app.core.config import settings
from app.core.logging import logger


class EmailService:
    async def send_password_reset_email(self, email: str, token: str) -> None:
        """
        Mock sending a password reset email.
        In production, this would use SMTP or an API like SendGrid/SES.
        """
        reset_link = f"{settings.API_V1_STR}/auth/password-reset/confirm?token={token}"
        logger.info(
            f"mock_email_sent_to={email} subject='Password Reset' link='{reset_link}'"
        )
        # In a real app, we would send the email here


email_service = EmailService()
