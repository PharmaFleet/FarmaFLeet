"""
Vercel serverless function handler for PharmaFleet backend.

This file is the entry point for Vercel serverless deployments.
It wraps the FastAPI app with Mangum to make it compatible with AWS Lambda/Vercel.
"""
import sys
import os
from mangum import Mangum

# Add the backend directory to sys.path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.insert(0, backend_dir)

# Import the FastAPI app
from app.main import app

# Wrap FastAPI with Mangum for serverless compatibility
# This creates a Lambda/Vercel-compatible handler
handler = Mangum(app, lifespan="off")

# Note: Vercel will call 'handler' as the entry point
# For local development, use: uvicorn app.main:app --reload
