from typing import Any, Dict, Optional
from fastapi import HTTPException, status

class DetailedHTTPException(HTTPException):
    STATUS_CODE = status.HTTP_500_INTERNAL_SERVER_ERROR
    DETAIL = "Server error"

    def __init__(self, detail: Any = None, headers: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=self.STATUS_CODE,
            detail=detail if detail is not None else self.DETAIL,
            headers=headers,
        )

class EntityNotFoundException(DetailedHTTPException):
    STATUS_CODE = status.HTTP_404_NOT_FOUND
    DETAIL = "Entity not found"

class PermissionDeniedException(DetailedHTTPException):
    STATUS_CODE = status.HTTP_403_FORBIDDEN
    DETAIL = "Permission denied"

class BadRequestException(DetailedHTTPException):
    STATUS_CODE = status.HTTP_400_BAD_REQUEST
    DETAIL = "Bad request"
