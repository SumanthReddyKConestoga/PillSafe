from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, field_validator
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Application
    APP_ENV: str = "development"
    APP_VERSION: str = "0.1.0"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "pillsafe"
    POSTGRES_USER: str = "pillsafe_user"
    POSTGRES_PASSWORD: str = "change_me"
    DATABASE_URL: str = "postgresql+asyncpg://pillsafe_user:change_me@postgres:5432/pillsafe"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Rate Limiting
    AUTH_RATE_LIMIT: str = "10/minute"

    # Feature Flags
    OPENAPI_ENABLED: bool = True
    ML_PIPELINE_ENABLED: bool = False

    # LLM (Sprint 6)
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "claude-sonnet-4-20250514"

    @field_validator("FRONTEND_ORIGIN")
    @classmethod
    def parse_frontend_origin(cls, v: str) -> str:
        return v.strip()


settings = Settings()
