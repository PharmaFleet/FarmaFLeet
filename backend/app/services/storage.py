from typing import BinaryIO
import shutil
import os
from pathlib import Path

# In a real implementation, this would connect to Google Cloud Storage
# For now, we implement a local filesystem fallback

UPLOAD_DIR = Path("uploads")

class StorageService:
    def __init__(self):
        UPLOAD_DIR.mkdir(exist_ok=True)

    async def upload_file(self, file: BinaryIO, filename: str) -> str:
        file_path = UPLOAD_DIR / filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file, buffer)
        
        # Return a relative URL or absolute URL depending on requirements
        # For local dev, we might serve this via StaticFiles
        return f"/static/{filename}"

storage_service = StorageService()
