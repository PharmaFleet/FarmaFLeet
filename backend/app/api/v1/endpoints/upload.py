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
    Saves to Supabase Storage.
    """
    from app.services.storage import storage_service

    try:
        # Validate file extension
        file_ext = validate_file_extension(file.filename)

        # Check file size (approximate)
        contents = await file.read()
        file_size = len(contents)

        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB",
            )

        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"

        # Upload to Supabase
        url = await storage_service.upload_file(
            file_content=contents,
            file_name=unique_filename,
            content_type=file.content_type or "application/octet-stream",
        )

        if not url:
            raise HTTPException(
                status_code=500, detail="Failed to upload file to cloud storage"
            )

        return {"url": url}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not upload file: {str(e)}")
