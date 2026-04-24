import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# When installed as a package, the bundled frontend lives next to this file.
_BUNDLED_STATIC = str(Path(__file__).parent / "static")
_DEV_STATIC = str(Path(__file__).parent.parent / "frontend" / "dist")
_DEFAULT_STATIC = _DEV_STATIC if os.path.isdir(_DEV_STATIC) else _BUNDLED_STATIC


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "sqlite:///./memorybase.db"
    MEMORYBASE_API_KEY: str = "dev-key-change-in-production"
    MEMORYBASE_LLM_PROVIDER: str = "anthropic"
    MEMORYBASE_LLM_MODEL: str = "claude-sonnet-4-20250514"
    MEMORYBASE_LLM_API_KEY: str = ""
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    STATIC_DIR: str = _DEFAULT_STATIC


settings = Settings()
