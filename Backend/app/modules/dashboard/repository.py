import uuid
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, Date, desc, asc
from app.models.student import Student
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.classroom_session import ClassroomSession
from app.models.classroom_metric import ClassroomMetric
from app.models.student_metric import StudentMetric
from app.modules.dashboard.schema import Granularity, TopSortBy

class DashboardRepository:
    @staticmethod
    def get_principal_stats(db: Session):
        total_students = db.query(func.count(Student.id)).filter(Student.deleted_at.is_(None)).scalar() or 0
        total_classrooms = db.query(func.count(Classroom.id)).filter(Classroom.deleted_at.is_(None)).scalar() or 0
        total_teachers = db.query(func.count(Teacher.id)).filter(
            Teacher.role == "teacher", 
            Teacher.deleted_at.is_(None)
        ).scalar() or 0
        total_subjects = db.query(func.count(distinct(ClassroomSession.subject))).filter(
            ClassroomSession.deleted_at.is_(None),
            ClassroomSession.subject.isnot(None),
            ClassroomSession.subject != ""
        ).scalar() or 0
        return total_students, total_classrooms, total_teachers, total_subjects

    @staticmethod
    def get_teacher_stats(db: Session, teacher_id: uuid.UUID):
        total_classrooms = db.query(func.count(distinct(ClassroomSession.classroom_id))).filter(
            ClassroomSession.teacher_id == teacher_id,
            ClassroomSession.deleted_at.is_(None)
        ).scalar() or 0
        classrooms_subquery = db.query(ClassroomSession.classroom_id).filter(
            ClassroomSession.teacher_id == teacher_id,
            ClassroomSession.deleted_at.is_(None)
        ).subquery()
        total_students = db.query(func.count(Student.id)).filter(
            Student.classroom_id.in_(classrooms_subquery.select()),
            Student.deleted_at.is_(None)
        ).scalar() or 0
        total_subjects = db.query(func.count(distinct(ClassroomSession.subject))).filter(
            ClassroomSession.teacher_id == teacher_id,
            ClassroomSession.deleted_at.is_(None),
            ClassroomSession.subject.isnot(None),
            ClassroomSession.subject != ""
        ).scalar() or 0
        metrics = db.query(
            func.coalesce(func.avg(ClassroomMetric.focus_percentage), 0).label("avg_focus"),
            func.coalesce(func.avg(ClassroomMetric.active_students), 0).label("avg_active"),
            func.coalesce(func.sum(ClassroomMetric.using_phone_count), 0).label("sum_phone"),
            func.coalesce(func.sum(ClassroomMetric.raised_hand_count), 0).label("sum_raised")
        ).join(
            ClassroomSession, ClassroomMetric.session_id == ClassroomSession.id
        ).filter(
            ClassroomSession.teacher_id == teacher_id,
            ClassroomSession.deleted_at.is_(None)
        ).first()
        return total_classrooms, total_students, total_subjects, metrics

    @staticmethod
    def get_metrics(db: Session, granularity: Granularity, start: date, end: date, teacher_id: uuid.UUID = None):
        query = db.query(
            func.avg(ClassroomMetric.focus_percentage).label("avg_focus"),
            func.avg(ClassroomMetric.active_students).label("avg_active"),
            func.sum(ClassroomMetric.using_phone_count).label("sum_phone"),
            func.sum(ClassroomMetric.raised_hand_count).label("sum_raised")
        ).join(ClassroomSession, ClassroomMetric.session_id == ClassroomSession.id) \
         .filter(ClassroomSession.start_time.between(start, end), ClassroomSession.deleted_at.is_(None))
        if teacher_id:
            query = query.filter(ClassroomSession.teacher_id == teacher_id)
        if granularity == Granularity.DAILY:
            grouping = [func.date(ClassroomSession.start_time)]
            query = query.add_columns(func.date(ClassroomSession.start_time).label("date"))
        elif granularity == Granularity.WEEKLY:
            grouping = [func.extract('year', ClassroomSession.start_time), func.extract('week', ClassroomSession.start_time)]
            query = query.add_columns(grouping[0].label("year"), grouping[1].label("week"))
        else:
            grouping = [func.extract('year', ClassroomSession.start_time), func.extract('month', ClassroomSession.start_time)]
            query = query.add_columns(grouping[0].label("year"), grouping[1].label("month"))
        return query.group_by(*grouping).order_by(*grouping).all()


    @staticmethod
    def _apply_sorting(query, sort_by: TopSortBy):
        if sort_by == TopSortBy.FOCUS:
            return query.order_by(desc("avg_focus"))
        return query.order_by(desc("total_raised"))

    @staticmethod
    def get_top_students(db: Session, limit: int, sort_by: TopSortBy, teacher_id: uuid.UUID = None):
        query = db.query(
            Student.id.label("id"),
            Student.name.label("name"),
            Student.photo_filepath.label("photo_filepath"),
            func.avg(StudentMetric.focus_score).label("avg_focus"),
            func.sum(StudentMetric.raised_hand_count).label("total_raised")
        ).join(StudentMetric, Student.id == StudentMetric.student_id)
        if teacher_id:
            query = query.join(ClassroomSession, StudentMetric.session_id == ClassroomSession.id)\
                         .filter(ClassroomSession.teacher_id == teacher_id)
        query = query.filter(Student.deleted_at.is_(None)).group_by(Student.id)
        return DashboardRepository._apply_sorting(query, sort_by).limit(limit).all()

    @staticmethod
    def get_top_classrooms(db: Session, limit: int, sort_by: TopSortBy, teacher_id: uuid.UUID = None):
        query = db.query(
            Classroom.id.label("id"),
            Classroom.name.label("name"),
            func.avg(ClassroomMetric.focus_percentage).label("avg_focus"),
            func.sum(ClassroomMetric.raised_hand_count).label("total_raised")
        ).join(ClassroomSession, Classroom.id == ClassroomSession.classroom_id)\
         .join(ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id)
        if teacher_id:
            query = query.filter(ClassroomSession.teacher_id == teacher_id)
        query = query.filter(Classroom.deleted_at.is_(None)).group_by(Classroom.id)
        return DashboardRepository._apply_sorting(query, sort_by).limit(limit).all()

    @staticmethod
    def get_top_subjects(db: Session, limit: int, sort_by: TopSortBy, teacher_id: uuid.UUID = None):
        query = db.query(
            ClassroomSession.subject.label("name"),
            func.avg(ClassroomMetric.focus_percentage).label("avg_focus"),
            func.sum(ClassroomMetric.raised_hand_count).label("total_raised")
        ).join(ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id)\
         .filter(ClassroomSession.subject.isnot(None))
        if teacher_id:
            query = query.filter(ClassroomSession.teacher_id == teacher_id)
        query = query.group_by(ClassroomSession.subject)
        return DashboardRepository._apply_sorting(query, sort_by).limit(limit).all()

    @staticmethod
    def get_top_teachers(db: Session, limit: int, sort_by: TopSortBy, teacher_id: uuid.UUID = None):
        query = db.query(
            Teacher.id.label("id"),
            Teacher.name.label("name"),
            Teacher.photo_filepath.label("photo_filepath"),
            func.avg(ClassroomMetric.focus_percentage).label("avg_focus"),
            func.sum(ClassroomMetric.raised_hand_count).label("total_raised")
        ).join(
            ClassroomSession, Teacher.id == ClassroomSession.teacher_id
        ).join(
            ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id
        ).filter(Teacher.deleted_at.is_(None))
        if teacher_id:
            query = query.filter(Teacher.id == teacher_id)
        query = query.group_by(Teacher.id)
        return DashboardRepository._apply_sorting(query, sort_by).limit(limit).all()


    @staticmethod
    def get_top_sessions(db: Session, limit: int, sort_by: TopSortBy, teacher_id: uuid.UUID = None):
        query = db.query(
            ClassroomSession.id.label("id"),
            ClassroomSession.subject.label("subject"),
            ClassroomSession.start_time.label("start_time"),
            ClassroomSession.end_time.label("end_time"),
            func.avg(ClassroomMetric.focus_percentage).label("avg_focus"),
            func.sum(ClassroomMetric.raised_hand_count).label("total_raised")
        ).join(
            ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id
        ).filter(ClassroomSession.deleted_at.is_(None))
        if teacher_id:
            query = query.filter(ClassroomSession.teacher_id == teacher_id)
        query = query.group_by(ClassroomSession.id)
        return DashboardRepository._apply_sorting(query, sort_by).limit(limit).all()

    @staticmethod
    def get_warning_students(db: Session, threshold: float, teacher_id: uuid.UUID = None):
        query = db.query(
            Student.id.label("id"),
            Student.name.label("name"),
            Student.photo_filepath.label("photo_filepath"),
            func.avg(StudentMetric.focus_score).label("avg_focus"),
            func.sum(StudentMetric.raised_hand_count).label("total_raised")
        ).join(StudentMetric, Student.id == StudentMetric.student_id)
        if teacher_id:
            query = query.join(ClassroomSession, StudentMetric.session_id == ClassroomSession.id)\
                         .filter(ClassroomSession.teacher_id == teacher_id)
        return query.filter(Student.deleted_at.is_(None))\
                    .group_by(Student.id)\
                    .having(func.avg(StudentMetric.focus_score) < threshold)\
                    .order_by(asc("avg_focus")).all()

    @staticmethod
    def get_warning_classrooms(db: Session, threshold: float, teacher_id: uuid.UUID = None):
        query = db.query(
            Classroom.id.label("id"),
            Classroom.name.label("name"),
            func.avg(ClassroomMetric.focus_percentage).label("avg_focus"),
            func.sum(ClassroomMetric.raised_hand_count).label("total_raised")
        ).join(ClassroomSession, Classroom.id == ClassroomSession.classroom_id)\
         .join(ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id)
        if teacher_id:
            query = query.filter(ClassroomSession.teacher_id == teacher_id)
        return query.filter(Classroom.deleted_at.is_(None))\
                    .group_by(Classroom.id)\
                    .having(func.avg(ClassroomMetric.focus_percentage) < threshold)\
                    .order_by(asc("avg_focus")).all()

    @staticmethod
    def get_warning_subjects(db: Session, threshold: float, teacher_id: uuid.UUID = None):
        query = db.query(
            ClassroomSession.subject.label("name"),
            func.avg(ClassroomMetric.focus_percentage).label("avg_focus"),
            func.sum(ClassroomMetric.raised_hand_count).label("total_raised")
        ).join(ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id)\
         .filter(ClassroomSession.subject.isnot(None))
        if teacher_id:
            query = query.filter(ClassroomSession.teacher_id == teacher_id)
        return query.group_by(ClassroomSession.subject)\
                    .having(func.avg(ClassroomMetric.focus_percentage) < threshold)\
                    .order_by(asc("avg_focus")).all()

    @staticmethod
    def get_warning_teachers(db: Session, threshold: float, teacher_id: uuid.UUID = None):
        query = db.query(
            Teacher.id.label("id"),
            Teacher.name.label("name"),
            Teacher.photo_filepath.label("photo_filepath"),
            func.avg(ClassroomMetric.focus_percentage).label("avg_focus"),
            func.sum(ClassroomMetric.raised_hand_count).label("total_raised")
        ).join(ClassroomSession, Teacher.id == ClassroomSession.teacher_id)\
         .join(ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id)
        if teacher_id:
            query = query.filter(Teacher.id == teacher_id)
        return query.filter(Teacher.deleted_at.is_(None))\
                    .group_by(Teacher.id)\
                    .having(func.avg(ClassroomMetric.focus_percentage) < threshold)\
                    .order_by(asc("avg_focus")).all()

    @staticmethod
    def get_warning_sessions(db: Session, threshold: float, teacher_id: uuid.UUID = None):
        query = db.query(
            ClassroomSession.id.label("id"),
            ClassroomSession.subject.label("subject"),
            ClassroomSession.start_time.label("start_time"),
            ClassroomSession.end_time.label("end_time"),
            func.avg(ClassroomMetric.focus_percentage).label("avg_focus"),
            func.sum(ClassroomMetric.raised_hand_count).label("total_raised")
        ).join(ClassroomMetric, ClassroomSession.id == ClassroomMetric.session_id)\
         .filter(ClassroomSession.deleted_at.is_(None))
        if teacher_id:
            query = query.filter(ClassroomSession.teacher_id == teacher_id)
        return query.group_by(ClassroomSession.id)\
                    .having(func.avg(ClassroomMetric.focus_percentage) < threshold)\
                    .order_by(asc("avg_focus")).all()
