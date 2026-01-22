from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel
from fastapi.responses import JSONResponse

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: Optional[T] = None
    meta: Optional[dict] = None


def create_response(
    data: Any = None,
    message: str = "Success",
    success: bool = True,
    status_code: int = 200,
    meta: dict = None,
) -> JSONResponse:
    content = APIResponse(
        success=success, message=message, data=data, meta=meta
    ).model_dump()
    return JSONResponse(status_code=status_code, content=content)
