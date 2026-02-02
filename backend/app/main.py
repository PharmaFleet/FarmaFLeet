from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import os

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

app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount static files (skip if directory doesn't exist, e.g., on Vercel)
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
