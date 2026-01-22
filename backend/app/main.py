from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.middleware import RequestLoggingMiddleware, RateLimitMiddleware

# Setup logging
setup_logging()


tags_metadata = [
    {"name": "login", "description": "Operations with authentication logic."},
    {"name": "users", "description": "Manage users and permissions."},
    {"name": "utils", "description": "Utility endpoints."},
]

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    openapi_tags=tags_metadata,
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, limit=100, window=60)

app.include_router(api_router, prefix=settings.API_V1_STR)
