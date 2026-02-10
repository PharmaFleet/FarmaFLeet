import redis.asyncio as redis
from app.core.config import settings


class AuthService:
    def __init__(self):
        self.redis = redis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )

    async def blacklist_token(self, token: str, expires_in: int) -> None:
        """Add a token to the blacklist with an expiration time."""
        try:
            await self.redis.set(f"blacklist:{token}", "true", ex=expires_in)
        except Exception:
            # Redis might be down, skip blacklisting
            pass

    async def is_token_blacklisted(self, token: str) -> bool:
        """Check if a token is in the blacklist."""
        try:
            exists = await self.redis.get(f"blacklist:{token}")
            return exists is not None
        except Exception:
            # Redis might be down, assume token is valid
            return False


auth_service = AuthService()
