import functools
import json
import hashlib
from typing import Callable, Any
from fastapi import Request, Response
from app.core.config import settings
import redis.asyncio as redis

# Global Redis Client (Connection Pool)
redis_client = redis.from_url(
    settings.REDIS_URL, encoding="utf-8", decode_responses=True
)


def cache_response(expiration: int = 60):
    """
    Cache endpoint response for a specific duration (seconds).
    Uses request path and query params as key.
    """

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Try to get request object
            request = kwargs.get("request")
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            # If no request object found (shouldn't happen in proper usage), skip caching
            if not request:
                return await func(*args, **kwargs)

            # Generate Cache Key
            cache_key = (
                f"cache:{request.method}:{request.url.path}:{request.query_params}"
            )
            hashed_key = hashlib.md5(cache_key.encode()).hexdigest()
            final_key = f"api_cache:{hashed_key}"

            # Use Global Client
            # redis_client already defined
            cached_data = await redis_client.get(final_key)

            if cached_data:
                return json.loads(cached_data)

            # Execute function
            response_data = await func(*args, **kwargs)

            # Cache Result (only if it's serializable, assuming Pydantic models -> dict or similar)
            # In a real app we might need to handle Response objects specifically
            # For simplicity, assuming JSON-compatible return
            try:
                # If it's a Pydantic model, dump it
                if hasattr(response_data, "model_dump"):
                    data_to_cache = response_data.model_dump()
                else:
                    data_to_cache = response_data

                await redis_client.set(
                    final_key, json.dumps(data_to_cache), ex=expiration
                )
            except Exception:
                pass  # Skip caching if serialization fails

            return response_data

        return wrapper

    return decorator
