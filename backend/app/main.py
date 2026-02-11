from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.cors import CORSMiddleware
import os
import sentry_sdk

from app.api.v1.api import api_router
from app.api.deps import limiter
from app.core.config import settings
from app.core.exceptions import PharmaFleetException
from app.core.logging import setup_logging
from app.api.middleware import RequestLoggingMiddleware, RateLimitMiddleware
from app.routers.websocket import start_redis_listener

# Detect serverless environment (same check as session.py)
IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

# Setup logging
setup_logging()

# Initialize Sentry error monitoring
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,  # 10% of requests for performance monitoring
    )

tags_metadata = [
    {"name": "login", "description": "Operations with authentication logic."},
    {"name": "users", "description": "Manage users and permissions."},
    {"name": "utils", "description": "Utility endpoints."},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Only start Redis listener in non-serverless environments.
    # Vercel doesn't support WebSockets; frontend uses HTTP polling instead.
    if not IS_SERVERLESS:
        await start_redis_listener()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

# Add slowapi rate limiter state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, limit=1000, window=60)

# CORS Middleware added LAST to be the outermost layer
if settings.BACKEND_CORS_ORIGINS:
    origins = [str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS]
    # Ensure port 3001, 3000, 5173 are included for dev environment
    for port in ["3001", "3000", "5173"]:
        origin = f"http://localhost:{port}"
        if origin not in origins:
            origins.append(origin)
        origin_ip = f"http://127.0.0.1:{port}"
        if origin_ip not in origins:
            origins.append(origin_ip)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.exception_handler(PharmaFleetException)
async def pharmafleet_exception_handler(request: Request, exc: PharmaFleetException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_code": exc.error_code, "message": exc.message},
    )


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount static files (skip if directory doesn't exist, e.g., on Vercel)
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
