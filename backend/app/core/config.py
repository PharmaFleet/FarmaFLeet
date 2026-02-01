from typing import List
from pydantic import AnyHttpUrl, PostgresDsn, computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "PharmaFleet"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "CHANGEME"  # Should be set in env
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days for drivers
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 days for refresh token

    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "pharmafleet"
    POSTGRES_PORT: int = 5444
    DATABASE_URL: str | None = None

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # CORS - Include all operational domains
    BACKEND_CORS_ORIGINS: List[str] | str = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://dashboard.pharmafleet.com",
        "https://staging.dashboard.pharmafleet.com",
        "https://storage.googleapis.com",
        "https://pharmafleet-dashboard.storage.googleapis.com",
        "https://pharmafleet-dashboard-staging.storage.googleapis.com",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str] | str:
        if isinstance(v, str) and not v.startswith("["):
            # Support both comma and semicolon to avoid gcloud CLI list parsing issues
            import re

            return [i.strip() for i in re.split(r"[,;]", v) if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @computed_field
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL

        from urllib.parse import quote_plus

        if self.POSTGRES_SERVER.startswith("/cloudsql"):
            return f"postgresql+asyncpg://{self.POSTGRES_USER}:{quote_plus(self.POSTGRES_PASSWORD)}@/{self.POSTGRES_DB}?host={self.POSTGRES_SERVER}"

        return str(
            PostgresDsn.build(
                scheme="postgresql+asyncpg",
                username=self.POSTGRES_USER,
                password=self.POSTGRES_PASSWORD,
                host=self.POSTGRES_SERVER,
                port=self.POSTGRES_PORT,
                path=self.POSTGRES_DB,
            )
        )

    model_config = SettingsConfigDict(
        env_file=".env", case_sensitive=True, extra="ignore"
    )

    @field_validator("POSTGRES_PASSWORD", mode="before")
    @classmethod
    def strip_password(cls, v: str) -> str:
        return v.strip() if v else v


settings = Settings()
