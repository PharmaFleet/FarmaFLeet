"""
Vercel serverless function handler for PharmaFleet backend.
Vercel has native FastAPI support - no Mangum wrapper needed.
"""
import sys
import os

# Add the backend directory to sys.path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.insert(0, backend_dir)

# Import the FastAPI app
# Vercel natively supports FastAPI - just expose the app directly
from app.main import app
