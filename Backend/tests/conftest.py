# tests/conftest.py
import pytest
from app.database.database import SessionLocal

@pytest.fixture(scope="function")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()