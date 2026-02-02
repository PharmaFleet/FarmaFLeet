"""
Vercel serverless function handler for PharmaFleet backend.
"""
import sys
import os

# Set up path FIRST
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.insert(0, backend_dir)

# Import only what we absolutely need for the fallback
from mangum import Mangum
from fastapi import FastAPI
from fastapi.responses import JSONResponse

# Try importing the real app
_real_handler = None
_import_error = None

try:
    from app.main import app
    _real_handler = Mangum(app, lifespan="off")
except Exception as e:
    import traceback
    _import_error = {
        "error": str(e),
        "traceback": traceback.format_exc(),
        "type": type(e).__name__
    }
    print(f"IMPORT ERROR: {_import_error}", file=sys.stderr)

# Create fallback app
fallback_app = FastAPI()

@fallback_app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def fallback_handler(path: str = ""):
    if _import_error:
        return JSONResponse(status_code=500, content=_import_error)
    return JSONResponse(status_code=500, content={"error": "Unknown error"})

_fallback_handler = Mangum(fallback_app, lifespan="off")

def handler(event, context):
    """Main handler that tries real app first, falls back on error."""
    if _real_handler:
        return _real_handler(event, context)
    return _fallback_handler(event, context)
