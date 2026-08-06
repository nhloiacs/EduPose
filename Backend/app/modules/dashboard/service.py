import math
import uuid
from sqlalchemy.orm import Session
from typing import Union
from datetime import date
from app.models.classroom_session import ClassroomSession
from app.models.session_seating import SessionSeating
from app.models.student import Student
from app.modules.stream.camera_manager import CameraManager
from app.modules.dashboard.repository import DashboardRepository
from app.modules.dashboard.schema import (
    PrincipalDashboardResponse, TeacherDashboardResponse, TeacherDashboardMetrics, Granularity, DailyMetric, WeeklyMetric, MonthlyMetric, TopEntityTarget, TopSortBy, TopStudentRead, TopClassroomRead, TopSubjectRead, TopSessionRead, TopTeacherRead
)

class DashboardService:
    @staticmethod
    def get_dashboard_data(db: Session, user_role: str, user_id: uuid.UUID) -> Union[PrincipalDashboardResponse, TeacherDashboardResponse]:
        if user_role == "principal":
            total_students, total_classrooms, total_teachers, total_subjects, total_cameras = DashboardRepository.get_principal_stats(db)
            return PrincipalDashboardResponse(
                total_students=total_students,
                total_classrooms=total_classrooms,
                total_teachers=total_teachers,
                total_subjects=total_subjects,
                total_cameras=total_cameras
            )
        else:
            total_classrooms, total_students, total_subjects, total_cameras, metrics = DashboardRepository.get_teacher_stats(db, user_id)
            avg_focus, avg_active, sum_phone, sum_raised = metrics if metrics else (0.0, 0.0, 0, 0)
            return TeacherDashboardResponse(
                total_classrooms=total_classrooms,
                total_students=total_students,
                total_subjects=total_subjects,
                total_cameras=total_cameras,
                metrics_summary=TeacherDashboardMetrics(
                    avg_focus_percentage=round(avg_focus, 2),
                    avg_active_students=round(avg_active, 2),
                    total_using_phone=int(sum_phone),
                    total_raised_hand=int(sum_raised)
                )
            )

    @staticmethod
    def get_metrics(db: Session, granularity: Granularity, start: date, end: date, role: str, uid: uuid.UUID):
        teacher_id = uid if role == "teacher" else None
        rows = DashboardRepository.get_metrics(db, granularity, start, end, teacher_id)
        result = []
        for row in rows:
            data = {
                "avg_focus_percentage": round(row.avg_focus or 0, 2),
                "avg_active_students": round(row.avg_active or 0, 2),
                "total_using_phone": int(row.sum_phone or 0),
                "total_raised_hand": int(row.sum_raised or 0)
            }
            if granularity == Granularity.DAILY:
                result.append(DailyMetric(date=row.date, **data))
            elif granularity == Granularity.WEEKLY:
                result.append(WeeklyMetric(year=int(row.year), week=int(row.week), **data))
            elif granularity == Granularity.MONTHLY:
                result.append(MonthlyMetric(year=int(row.year), month=int(row.month), **data))
        return result

    @staticmethod
    def get_top_performers(db: Session, entity: TopEntityTarget, limit: int, sort_by: TopSortBy, role: str, uid: uuid.UUID):
        teacher_id = uid if role == "teacher" else None
        result = []
        if entity == TopEntityTarget.STUDENT:
            rows = DashboardRepository.get_top_students(db, limit, sort_by, teacher_id)
            result = [TopStudentRead(
                id=r.id, name=r.name, photo_filepath=r.photo_filepath,
                avg_focus_percentage=round(r.avg_focus or 0, 2),
                total_raised_hand=int(r.total_raised or 0)
            ) for r in rows]
        elif entity == TopEntityTarget.CLASSROOM:
            rows = DashboardRepository.get_top_classrooms(db, limit, sort_by, teacher_id)
            result = [TopClassroomRead(
                id=r.id, name=r.name,
                avg_focus_percentage=round(r.avg_focus or 0, 2),
                total_raised_hand=int(r.total_raised or 0)
            ) for r in rows]
        elif entity == TopEntityTarget.SUBJECT:
            rows = DashboardRepository.get_top_subjects(db, limit, sort_by, teacher_id)
            result = [TopSubjectRead(
                name=r.name,
                avg_focus_percentage=round(r.avg_focus or 0, 2),
                total_raised_hand=int(r.total_raised or 0)
            ) for r in rows]
        elif entity == TopEntityTarget.TEACHER:
            rows = DashboardRepository.get_top_teachers(db, limit, sort_by, teacher_id)
            result = [TopTeacherRead(
                id=r.id, 
                name=r.name, 
                photo_filepath=r.photo_filepath,
                avg_focus_percentage=round(r.avg_focus or 0, 2),
                total_raised_hand=int(r.total_raised or 0)
            ) for r in rows]
        elif entity == TopEntityTarget.SESSION:
            rows = DashboardRepository.get_top_sessions(db, limit, sort_by, teacher_id)
            result = [TopSessionRead(
                id=r.id, 
                subject=r.subject,
                start_time=r.start_time,
                end_time=r.end_time,
                avg_focus_percentage=round(r.avg_focus or 0, 2),
                total_raised_hand=int(r.total_raised or 0)
            ) for r in rows]
        return result

    @staticmethod
    def get_live_warnings(db: Session, role: str, uid: uuid.UUID) -> dict:
        """
        Peringatan atensi berdasarkan deteksi kamera saat ini pada sesi yang
        sedang berlangsung, bukan rata-rata historis.
        """
        query = db.query(ClassroomSession).filter(
            ClassroomSession.status == "ONGOING",
            ClassroomSession.deleted_at.is_(None),
        )
        if role == "teacher":
            query = query.filter(ClassroomSession.teacher_id == uid)

        sessions = query.all()
        RADIUS = 150.0
        warnings = []
        active_sessions = 0

        for session in sessions:
            endpoint = session.camera.endpoint if session.camera else None
            if not endpoint:
                continue

            detections = CameraManager.get_latest_detections(endpoint)
            if detections is None:
                continue

            active_sessions += 1
            if not detections:
                continue

            seatings = (
                db.query(SessionSeating, Student)
                .join(Student, SessionSeating.student_id == Student.id)
                .filter(SessionSeating.session_id == session.id)
                .all()
            )

            classroom_name = session.classroom.name if session.classroom else None

            for seating, student in seatings:
                matched = None
                min_dist = float("inf")
                for det in detections:
                    dx = det["center"][0] - seating.pos_x
                    dy = det["center"][1] - seating.pos_y
                    dist = math.hypot(dx, dy)
                    if dist < min_dist and dist <= RADIUS:
                        min_dist = dist
                        matched = det

                if matched and matched["label"] == "distracted":
                    warnings.append(
                        {
                            "id": student.id,
                            "name": student.name,
                            "classroom_name": classroom_name,
                            "subject": session.subject,
                            "confidence": matched["confidence"],
                        }
                    )

        return {
            "has_active_session": active_sessions > 0,
            "students": warnings,
        }

    @staticmethod
    def get_dashboard_warnings(db: Session, entity: TopEntityTarget, threshold: float, role: str, uid: uuid.UUID):
        teacher_id = uid if role == "teacher" else None
        result = []
        if entity == TopEntityTarget.STUDENT:
            rows = DashboardRepository.get_warning_students(db, threshold, teacher_id)
            result = [TopStudentRead(
                id=r.id, name=r.name, photo_filepath=r.photo_filepath,
                avg_focus_percentage=round(r.avg_focus or 0, 2),
                total_raised_hand=int(r.total_raised or 0)
            ) for r in rows]
        elif entity == TopEntityTarget.CLASSROOM:
            rows = DashboardRepository.get_warning_classrooms(db, threshold, teacher_id)
            result = [TopClassroomRead(
                id=r.id, name=r.name,
                avg_focus_percentage=round(r.avg_focus or 0, 2),
                total_raised_hand=int(r.total_raised or 0)
            ) for r in rows]
        elif entity == TopEntityTarget.SUBJECT:
            rows = DashboardRepository.get_warning_subjects(db, threshold, teacher_id)
            result = [TopSubjectRead(
                name=r.name,
                avg_focus_percentage=round(r.avg_focus or 0, 2),
                total_raised_hand=int(r.total_raised or 0)
            ) for r in rows]
        elif entity == TopEntityTarget.TEACHER:
            rows = DashboardRepository.get_warning_teachers(db, threshold, teacher_id)
            result = [TopTeacherRead(
                id=r.id, name=r.name, photo_filepath=r.photo_filepath,
                avg_focus_percentage=round(r.avg_focus or 0, 2),
                total_raised_hand=int(r.total_raised or 0)
            ) for r in rows]
        elif entity == TopEntityTarget.SESSION:
            rows = DashboardRepository.get_warning_sessions(db, threshold, teacher_id)
            result = [TopSessionRead(
                id=r.id, subject=r.subject, start_time=r.start_time, end_time=r.end_time,
                avg_focus_percentage=round(r.avg_focus or 0, 2),
                total_raised_hand=int(r.total_raised or 0)
            ) for r in rows]
        return result
