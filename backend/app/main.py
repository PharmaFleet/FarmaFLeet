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

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    RateLimitMiddleware, limit=1000, window=60
)  # Increased limit for testing
app.add_middleware(
    RateLimitMiddleware, limit=1000, window=60
)  # Increased limit for testing

# Set all CORS enabled origins - Added LAST to be the outermost middleware
if settings.BACKEND_CORS_ORIGINS:
    origins = [str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS]
    print(f"DEBUG: Setting up CORSMiddleware with origins: {origins}")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
