from shapely.geometry import Point, shape
import json

def create_point(lat: float, lon: float) -> str:
    """Create a PostGIS compatible WKT point string."""
    return f"SRID=4326;POINT({lon} {lat})"

def parse_wkt_point(wkt: str):
    """Parse a WKT point string into lat, lon."""
    # This is a simplified parser, for real usage allow WKBElement handling from GeoAlchemy
    # For now, assuming generic string manipulation or use shapely libraries
    pass
