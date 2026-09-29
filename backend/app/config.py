import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Wi-Fi & Network Performance Analyzer"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./network_analyzer.db"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    # Ping & Network scan defaults
    DEFAULT_PING_TARGET: str = "8.8.8.8"
    DEFAULT_PING_INTERVAL_SECONDS: float = 1.0
    WS_POLL_INTERVAL_SECONDS: float = 1.0

    class Config:
        env_file = ".env"

settings = Settings()
