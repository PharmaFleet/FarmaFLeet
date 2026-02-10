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


# New PharmaFleet Exception Hierarchy
class PharmaFleetException(Exception):
    """Base exception for PharmaFleet application."""

    error_code: str = "INTERNAL_ERROR"
    status_code: int = 500

    def __init__(self, message: str = None):
        self.message = message or self.__class__.__doc__ or "An error occurred"
        super().__init__(self.message)


class OrderNotFoundException(PharmaFleetException):
    """Order not found"""

    error_code = "ORDER_NOT_FOUND"
    status_code = 404


class OrderStatusTransitionError(PharmaFleetException):
    """Invalid order status transition"""

    error_code = "INVALID_STATUS_TRANSITION"
    status_code = 400


class WarehouseAccessDeniedException(PharmaFleetException):
    """Access to warehouse denied"""

    error_code = "WAREHOUSE_ACCESS_DENIED"
    status_code = 403


class DriverNotFoundException(PharmaFleetException):
    """Driver not found"""

    error_code = "DRIVER_NOT_FOUND"
    status_code = 404


class DriverNotAvailableException(PharmaFleetException):
    """Driver is not available for assignment"""

    error_code = "DRIVER_NOT_AVAILABLE"
    status_code = 400


class InvalidFileFormatException(PharmaFleetException):
    """Invalid file format"""

    error_code = "INVALID_FILE_FORMAT"
    status_code = 400
