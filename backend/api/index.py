"""
Vercel serverless function handler for PharmaFleet backend.
Minimal test version to diagnose FUNCTION_INVOCATION_FAILED error.
"""
import sys
import os
import json

# First, let's just make a minimal handler that works
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from mangum import Mangum

# Diagnostic info
diag_info = {
    "python_version": sys.version,
    "cwd": os.getcwd(),
    "env_vars": {k: "***" if "KEY" in k or "SECRET" in k or "PASSWORD" in k or "URL" in k else v
                 for k, v in os.environ.items() if k.startswith(("VERCEL", "DATABASE", "SECRET", "REDIS", "SUPABASE"))},
    "path": str(sys.path[:5]),
}

# Create a minimal app first to test
test_app = FastAPI()

@test_app.get("/api/v1/health")
async def health():
    return {"status": "ok", "diagnostics": diag_info}

@test_app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def api_handler(path: str = ""):
    # Try to load the real app here, lazily
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(current_dir)
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)

        from app.main import app
        # If successful, return a message indicating we should restart
        return JSONResponse(content={"status": "app_loaded", "message": "App loaded successfully, restart may be needed"})
    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
        })

handler = Mangum(test_app, lifespan="off")
