import shutil
import os
import uuid
from typing import Any
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.models.user import User

router = APIRouter()

# Security: Whitelist allowed file extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}
MAX_FILE_SIZE_MB = 10


def validate_file_extension(filename: str) -> str:
    """Validate and return the file extension."""
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file_ext}'. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    return file_ext


@router.post("", response_model=dict)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload a file and return its public URL.
    Saves to 'static/uploads'.

    Requires authentication.
    """
    try:
        # Validate file extension
        file_ext = validate_file_extension(file.filename)

        # Check file size (read first chunk to estimate)
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning

        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB",
            )

        # Create static/uploads directory if it doesn't exist
        base_static_dir = os.path.join(os.getcwd(), "static")
        upload_dir = os.path.join(base_static_dir, "uploads")

        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir, exist_ok=True)

        # Generate unique filename (prevents path traversal and overwrites)
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        url = f"/static/uploads/{unique_filename}"

        return {"url": url}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not upload file: {str(e)}")
