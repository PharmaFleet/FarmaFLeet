from fastapi import APIRouter

from app.api.v1.endpoints import (
    login,
    users,
    utils,
    password,
    drivers,
    orders,
    payments,
    notifications,
    analytics,
    warehouses,
    sync,
)

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(
    password.router, tags=["password"]
)  # No prefix usually for password reset flow or /auth
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(utils.router, prefix="/utils", tags=["utils"])
api_router.include_router(drivers.router, prefix="/drivers", tags=["drivers"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(warehouses.router, prefix="/warehouses", tags=["warehouses"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
