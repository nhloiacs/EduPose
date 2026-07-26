import logging
import socket
from urllib.parse import urlparse, urlunparse

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)


def resolve_database_url(database_url: str) -> str:
    if not database_url:
        return database_url

    try:
        parsed = urlparse(database_url)
    except Exception:
        return database_url

    if parsed.hostname != 'db':
        return database_url

    try:
        socket.gethostbyname('db')
        return database_url
    except OSError:
        logger.warning(
            "Cannot resolve database host 'db'. Falling back to localhost for local development. "
            "If you are running in Docker, ensure the backend is started inside the compose network."
        )

        auth = ''
        if parsed.username:
            auth = parsed.username
            if parsed.password:
                auth = f"{parsed.username}:{parsed.password}"
            auth = f"{auth}@"

        port = f":{parsed.port}" if parsed.port else ''
        netloc = f"{auth}127.0.0.1{port}"
        return urlunparse(parsed._replace(netloc=netloc))


engine = create_engine(
    resolve_database_url(settings.DATABASE_URL)
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()