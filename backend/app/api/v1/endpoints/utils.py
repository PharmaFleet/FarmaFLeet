from typing import Any
from fastapi import APIRouter
from app.schemas import Msg

router = APIRouter()


@router.get("/health-check", response_model=Msg)
def health_check() -> Any:
    """
    Health check endpoint.
    """
    return {"msg": "OK"}
