from app.core.config import settings

print(f"SECRET_KEY: '{settings.SECRET_KEY}'")
print(f"ALGORITHM: '{settings.ALGORITHM}'")
print(f"BACKEND_CORS_ORIGINS: {settings.BACKEND_CORS_ORIGINS}")
print(f"SQLALCHEMY_DATABASE_URI: {settings.SQLALCHEMY_DATABASE_URI}")
