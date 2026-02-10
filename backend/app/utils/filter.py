from typing import Optional, Dict, Any
from sqlalchemy.sql import Select

def apply_filters(query: Select, filters: Dict[str, Any], model) -> Select:
    """
    Apply simple equality filters to a content query.
    """
    for field, value in filters.items():
        if value is not None and hasattr(model, field):
            query = query.where(getattr(model, field) == value)
    return query
