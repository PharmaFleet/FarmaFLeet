import sys
import os

# Add the 'backend' directory to sys.path so we can import 'app'
# This file is in backend/api/index.py -> three levels up is root, but we need 'backend' to be importable as 'app' or 'backend.app'?
# If we want to import 'app.main', we need the directory CONTAINING 'app' (which is 'backend') to be in path.

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)  # backend/
# parent_dir = os.path.dirname(backend_dir) # root

sys.path.append(backend_dir)

print(f"DEBUG: sys.path: {sys.path}")

try:
    from app.core.config import settings

    uri = str(settings.SQLALCHEMY_DATABASE_URI)
    # Simple masking
    print(
        f"DEBUG: SQLALCHEMY_DATABASE_URI: {uri.split('@')[1] if '@' in uri else 'NO_CREDENTIALS_FOUND'}"
    )
except Exception as e:
    print(f"DEBUG: Error loading settings: {e}")

from app.main import app
from mangum import Mangum

handler = Mangum(app)
