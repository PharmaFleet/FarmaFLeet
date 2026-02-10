import time
import uuid
from typing import Callable
import redis.asyncio as redis
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import logger
from app.core.config import settings


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start_time = time.time()
        logger.info(
            f"Incoming Request: {request.method} {request.url} [IDs: {request_id}]"
        )

        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            formatted_process_time = "{0:.2f}".format(process_time)
            response.headers["X-Request-ID"] = request_id
            logger.info(
                f"Request Completed: {request.method} {request.url} "
                f"Status: {response.status_code} "
                f"Duration: {formatted_process_time}ms [ID: {request_id}]"
            )
            return response
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            try:
                logger.error(
                    f"Request Failed: {request.method} {request.url} "
                    f"Duration: {process_time:.2f}ms Error: {str(e)} [ID: {request_id}]"
                )
            except Exception:
                # Fallback if logger fails due to encoding
                print(
                    f"CRITICAL: Request Failed and Logger Errored. Original Error: {e}"
                )
            raise e


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 100, window: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.redis = redis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Simple IP-based rate limiting
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}"

        try:
            # Increment count
            current = await self.redis.incr(key)
            if current == 1:
                await self.redis.expire(key, self.window)

            if current > self.limit:
                return Response("Too many requests", status_code=429)
        except Exception as e:
            # Fail open if Redis is down
            logger.error(f"Rate limit error: {e}")
            pass

        return await call_next(request)
