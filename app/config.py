from functools import lru_cache
from cryptography.fernet import Fernet
from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "StreamPulse"
    app_env: str = "prod"
    secret_key: str = "change-me-to-32-bytes-minimum-secret-key-0000"
    fernet_key: str = ""
    database_url: str = "postgresql+asyncpg://streampulse:streampulse@db:5432/streampulse"
    sync_database_url: str = "postgresql+psycopg2://streampulse:streampulse@db:5432/streampulse"
    redis_url: str = "redis://redis:6379/0"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    default_lang: str = "uk"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @model_validator(mode="after")
    def validate_application_keys(self) -> "Settings":
        if (
            len(self.secret_key.encode("utf-8")) < 32
            or self.secret_key.startswith("__GENERATE_")
            or self.secret_key.startswith("change-me")
        ):
            raise ValueError("SECRET_KEY must be a generated secret of at least 32 bytes")
        try:
            Fernet(self.fernet_key.encode("ascii"))
        except (AttributeError, UnicodeEncodeError, ValueError) as exc:
            raise ValueError("FERNET_KEY must be a valid Fernet key") from exc
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
