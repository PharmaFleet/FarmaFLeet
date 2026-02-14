import asyncio
import logging
from typing import Optional

import httpx
from storage3.utils import StorageException
from supabase import Client, ClientOptions, create_client

from app.core.config import settings

logger = logging.getLogger(__name__)

STORAGE_TIMEOUT = 30  # seconds per attempt
MAX_RETRIES = 3
BACKOFF_BASE = 1.0  # retries after ~1s, ~2s


class StorageService:
    def __init__(self):
        self._client: Optional[Client] = None
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                options = ClientOptions(
                    headers={"Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"},
                )
                self._client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY,
                    options=options,
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
        Retries on timeouts and server errors with exponential backoff.
        """
        if not self._client:
            logger.error("Supabase client not initialized. Cannot upload.")
            return None

        def _sync_upload() -> str:
            self._client.storage.from_(bucket).upload(
                path=file_name,
                file=file_content,
                file_options={"content-type": content_type, "upsert": "true"},
            )
            return self._client.storage.from_(bucket).get_public_url(file_name)

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                url = await asyncio.to_thread(_sync_upload)
                if attempt > 1:
                    logger.info(f"Upload succeeded on attempt {attempt}")
                return url

            except (httpx.TimeoutException, httpx.ConnectError) as e:
                logger.warning(
                    f"Upload attempt {attempt}/{MAX_RETRIES} failed (network): {type(e).__name__}: {e}"
                )
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(BACKOFF_BASE * attempt)
                    continue
                logger.error("Upload failed after all retries (network error)")
                return None

            except StorageException as e:
                error_str = str(e)
                if "401" in error_str or "403" in error_str:
                    logger.error(f"Upload failed (auth): {e}")
                    return None
                logger.warning(
                    f"Upload attempt {attempt}/{MAX_RETRIES} failed (storage): {e}"
                )
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(BACKOFF_BASE * attempt)
                    continue
                logger.error("Upload failed after all retries (storage error)")
                return None

            except Exception as e:
                logger.error(f"Upload failed (unexpected): {type(e).__name__}: {e}")
                return None

        return None


storage_service = StorageService()
