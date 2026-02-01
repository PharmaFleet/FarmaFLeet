import sys
import os

# Add the 'backend' directory to sys.path so we can import 'app'
# This file is in backend/api/index.py -> three levels up is root, but we need 'backend' to be importable as 'app' or 'backend.app'?
# If we want to import 'app.main', we need the directory CONTAINING 'app' (which is 'backend') to be in path.

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)  # backend/
# parent_dir = os.path.dirname(backend_dir) # root

sys.path.append(backend_dir)

from app.main import app
from mangum import Mangum

handler = Mangum(app)
