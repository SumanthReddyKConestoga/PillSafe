from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Look for .env in: current dir → Sprint-0/ → project root
    model_config = SettingsConfigDict(
        env_file=[".env", "../.env", "../../.env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: str = "development"
    APP_VERSION: str = "0.1.0"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # SQLite — file lives next to backend/
    DATABASE_URL: str = "sqlite+aiosqlite:///./pillsafe.db"

    FRONTEND_ORIGIN: str = "http://localhost:5173"

    OPENAPI_ENABLED: bool = True
    ML_PIPELINE_ENABLED: bool = False

    LLM_API_KEY: str = ""
    LLM_MODEL: str = "claude-sonnet-4-6"


settings = Settings()
