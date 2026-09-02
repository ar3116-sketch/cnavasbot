from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Adaptive Academic Planner"
    database_url: str = f"sqlite:///{ROOT_DIR / 'planner.db'}"
    frontend_origin: str = "http://localhost:5173"
    demo_mode: bool = True
    api_prefix: str = "/api/v1"

    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")


settings = Settings()
