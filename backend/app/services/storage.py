from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self):
        self._client: Optional[Client] = None
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                self._client = create_client(
                    settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
                )
                logger.info("Supabase storage client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")

    async def upload_file(
        self,
        file_content: bytes,
        file_name: str,
        content_type: str,
        bucket: str = settings.SUPABASE_BUCKET,
    ) -> Optional[str]:
        """
        Upload a file to Supabase Storage and return the public URL.
        """
        if not self._client:
            logger.error("Supabase client not initialized. Cannot upload.")
            return None

        try:
            # Upload file
            self._client.storage.from_(bucket).upload(
                path=file_name,
                file=file_content,
                file_options={"content-type": content_type, "upsert": "true"},
            )

            # Get public URL
            url = self._client.storage.from_(bucket).get_public_url(file_name)
            return url
        except Exception as e:
            logger.error(f"Supabase upload failed: {e}")
            return None


storage_service = StorageService()
