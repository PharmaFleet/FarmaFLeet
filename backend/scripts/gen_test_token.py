import asyncio
from app.core import security
from app.core.config import settings
from datetime import timedelta


async def test_token():
    user_id = 1
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    print(f"DEBUG: gen_test_token using KEY: {settings.SECRET_KEY}")
    token = security.create_access_token(user_id, expires_delta=access_token_expires)
    print(f"TOKEN: {token}")


if __name__ == "__main__":
    asyncio.run(test_token())
