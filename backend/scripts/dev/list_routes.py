from app.main import app

for route in app.routes:
    methods = getattr(route, "methods", [])
    path = getattr(route, "path", "No Path")
    print(f"{list(methods)} {path}")
