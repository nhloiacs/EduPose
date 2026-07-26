import logging
import socket
from urllib.parse import urlparse, urlunparse

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


def normalize_database_url(value: str) -> str:
    if not value:
        return value

    try:
        parsed = urlparse(value)
    except Exception:
        return value

    if parsed.hostname != 'db':
        return value

    try:
        socket.gethostbyname('db')
        return value
    except OSError:
        logger.warning(
            "Cannot resolve database host 'db'. Falling back to localhost for local development. "
            "If you are running in Docker, ensure the backend is started inside the compose network."
        )

        username = parsed.username or ''
        password = parsed.password or ''
        auth = ''
        if username:
            auth = username
            if password:
                auth = f"{username}:{password}"
            auth = f"{auth}@"

        port = f":{parsed.port}" if parsed.port else ''
        netloc = f"{auth}localhost{port}"
        fallback = parsed._replace(netloc=netloc)
        return urlunparse(fallback)


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
    )

    @classmethod
    def model_validator(cls, values):
        if isinstance(values, dict):
            database_url = values.get('DATABASE_URL')
            if isinstance(database_url, str):
                values['DATABASE_URL'] = normalize_database_url(database_url)
        return values


settings = Settings()
