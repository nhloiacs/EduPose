from sqlalchemy.orm import Session
from app.models.teacher import Teacher 

class TeacherRepository:

    @staticmethod
    def get_by_email(
        db: Session,
        email: str
    ) -> Teacher | None:
        return (
            db.query(Teacher)
            .filter(Teacher.email == email)
            .first()
        )