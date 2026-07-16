import pytest
from sqlalchemy import delete # Penting!
from app.database.database import SessionLocal, engine
from app.database.base import Base

@pytest.fixture(scope="function")
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    db = SessionLocal(bind=connection)
    for table in reversed(Base.metadata.sorted_tables):
        connection.execute(delete(table))
    connection.commit()
    yield db
    db.close()
    transaction.rollback()
    connection.close()
