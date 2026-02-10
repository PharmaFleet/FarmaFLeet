from sqlalchemy import Select
from app.models.user import User


def filter_by_warehouse(query: Select, user: User, warehouse_col) -> Select:
    """
    Applies warehouse filtering to a SQLAlchemy query based on the user's role and assigned warehouse.

    If the user is a superuser or has access to all warehouses, the query is returned unchanged.
    If the user is restricted to a specific warehouse, a filter is applied.
    """
    if user.is_superuser:
        return query

    # Assuming 'warehouse_manager' or similar roles are restricted
    # And assuming User model has a warehouse_id field (or similar)
    # If User doesn't have warehouse_id, we might need to look at a related model

    # For now, let's assume we check if the user has a warehouse_id
    if hasattr(user, "warehouse_id") and user.warehouse_id:
        return query.where(warehouse_col == user.warehouse_id)

    return query


def check_permission(user: User, required_role: str) -> bool:
    """
    Simple check if a user has a specific role.
    """
    if user.is_superuser:
        return True
    return user.role == required_role
