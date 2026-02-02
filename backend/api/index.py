"""
Vercel serverless function handler for PharmaFleet backend.

This file is the entry point for Vercel serverless deployments.
It wraps the FastAPI app with Mangum to make it compatible with AWS Lambda/Vercel.
"""
import sys
import os
import traceback

# Add the backend directory to sys.path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.insert(0, backend_dir)

try:
    from mangum import Mangum
    # Import the FastAPI app
    from app.main import app

    # Wrap FastAPI with Mangum for serverless compatibility
    # This creates a Lambda/Vercel-compatible handler
    handler = Mangum(app, lifespan="off")
except Exception as e:
    # If import fails, create a minimal handler that returns the error
    error_message = f"Startup Error: {str(e)}\n\nTraceback:\n{traceback.format_exc()}"
    print(error_message, file=sys.stderr)

    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    from mangum import Mangum

    error_app = FastAPI()

    @error_app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def catch_all(path: str):
        return JSONResponse(
            status_code=500,
            content={"error": "Startup failed", "detail": str(e), "traceback": traceback.format_exc()}
        )

    handler = Mangum(error_app, lifespan="off")

# Note: Vercel will call 'handler' as the entry point
# For local development, use: uvicorn app.main:app --reload
