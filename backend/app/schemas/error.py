from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standard error response schema for PharmaFleet API."""

    error_code: str
    message: str
