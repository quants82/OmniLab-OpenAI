from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _path_from_env(name: str, default: Path) -> Path:
    value = Path(os.getenv(name, str(default)))
    return value if value.is_absolute() else (BASE_DIR / value).resolve()


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Ominilab Open Physics Backend")
    app_secret: str = os.getenv("APP_SECRET", "development-only-change-me")
    database_path: Path = _path_from_env("DATABASE_PATH", BASE_DIR / "data" / "ominilab.db")
    access_token_minutes: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "1440"))
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3003").split(",")
        if origin.strip()
    )
    demo_username: str = os.getenv("DEMO_USERNAME", "judge")
    demo_password: str = os.getenv("DEMO_PASSWORD", "ominilab-demo")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-5.6")
    public_ws_host: str = os.getenv("PUBLIC_WS_HOST", "your-backend.example.com")
    firmware_source_dir: Path = (BASE_DIR.parent / "frontend_Ominilab" / "esp32").resolve()


settings = Settings()
