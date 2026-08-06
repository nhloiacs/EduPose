import os
import uuid
import math
import logging
from sqlalchemy.orm import Session
from typing import List, Tuple, Optional
from fastapi import HTTPException
from app.core.exceptions import (
    NotFoundException,
    BadRequestException,
    ConflictException,
)
from app.modules.classroom_session.repository import ClassroomSessionRepository
from app.modules.classroom.repository import ClassroomRepository
from app.modules.camera.repository import CameraRepository
from app.modules.classroom_session.schema import (
    ClassroomSessionListRead,
    ClassroomSessionEditRead,
    ClassroomSessionDetailRead,
    SessionMetricSummary,
    ClassroomSessionUpdate,
    SessionStudentMetricRead,
    ClassroomSessionCreate,
)
from app.models.classroom_session import ClassroomSession
from app.models.frame_log import FrameLog
from app.models.session_seating import SessionSeating
from app.models.student_metric import StudentMetric
from app.models.classroom_metric import ClassroomMetric
from app.models.student import Student
from app.modules.stream.camera_manager import CameraManager
from app.modules.stream.ai_processor import AIProcessor

logger = logging.getLogger(__name__)

# Ambang keyakinan minimum agar sebuah deteksi dianggap benar-benar
# "angkat tangan" saat absensi. Bisa disetel lewat variabel lingkungan.
MIN_RAISE_HAND_CONFIDENCE = float(os.getenv("RAISE_HAND_MIN_CONFIDENCE", "0.75"))


class ClassroomSessionService:
    @staticmethod
    def create_session(
        db: Session, data: ClassroomSessionCreate, teacher_id: uuid.UUID
    ) -> dict:
        classroom = ClassroomRepository.get_by_id(db, data.classroom_id)
        if not classroom:
            raise NotFoundException("Ruang kelas tidak ditemukan.")
        camera = CameraRepository.get_by_id(db, data.camera_id)
        if not camera:
            raise NotFoundException("Kamera tidak ditemukan.")
        if camera.status != "ONLINE":
            raise ConflictException("Kamera sedang offline dan tidak bisa digunakan.")
        active_classroom = ClassroomSessionRepository.get_active_session_by_classroom(
            db, data.classroom_id
        )
        if active_classroom:
            raise ConflictException(
                "Ruang kelas ini masih digunakan dalam sesi yang sedang berlangsung."
            )
        active_camera = ClassroomSessionRepository.get_active_session_by_camera(
            db, data.camera_id
        )
        if active_camera:
            raise ConflictException(
                "Kamera ini masih digunakan dalam sesi yang sedang berlangsung."
            )
        create_data = data.model_dump()
        create_data["teacher_id"] = teacher_id
        create_data["status"] = "ONGOING"
        new_session = ClassroomSessionRepository.create(db, create_data)
        students = (
            db.query(Student)
            .filter(
                Student.classroom_id == data.classroom_id, Student.deleted_at.is_(None)
            )
            .all()
        )
        student_list = []
        if students:
            seating_records = [
                SessionSeating(
                    session_id=new_session.id,
                    student_id=student.id,
                    pos_x=-1,
                    pos_y=-1,
                    attendance_status="ABSENT",
                )
                for student in students
            ]
            db.add_all(seating_records)
            db.commit()
            student_list = [
                {"id": student.id, "name": student.name} for student in students
            ]
        return {
            "id": new_session.id,
            "subject": new_session.subject,
            "camera_id": new_session.camera_id,
            "students": student_list,
        }

    @staticmethod
    def _verify_access(
        session_teacher_id: Optional[uuid.UUID], request_teacher_id: Optional[str]
    ):
        if request_teacher_id and str(session_teacher_id) != str(request_teacher_id):
            raise HTTPException(
                status_code=403, detail="Akses ditolak. Sesi ini bukan milik Anda."
            )

    @staticmethod
    def get_all_sessions(
        db: Session,
        page: int,
        size: int,
        search: Optional[str] = None,
        teacher_id: Optional[str] = None,
    ) -> Tuple[List[ClassroomSessionListRead], int]:
        page = max(1, page)
        skip = (page - 1) * size
        teacher_uuid = None
        if teacher_id:
            try:
                teacher_uuid = uuid.UUID(teacher_id)
            except ValueError:
                pass
        items, total = ClassroomSessionRepository.get_all(
            db, skip, size, search, teacher_uuid
        )
        result = []
        for (
            session,
            classroom_name,
            teacher_name,
            camera_name,
            avg_focus,
            avg_active,
            sum_phone,
            sum_raised,
        ) in items:
            result.append(
                ClassroomSessionListRead(
                    id=session.id,
                    classroom_name=classroom_name,
                    teacher_name=teacher_name,
                    subject=session.subject,
                    start_time=session.start_time,
                    end_time=session.end_time,
                    status=session.status,
                    camera_id=session.camera_id,
                    camera_name=camera_name,
                    metrics_summary=SessionMetricSummary(
                        avg_focus_percentage=round(avg_focus, 2),
                        avg_active_students=round(avg_active, 2),
                        total_using_phone=int(sum_phone),
                        total_raised_hand=int(sum_raised),
                    ),
                )
            )
        return result, total

    @staticmethod
    def get_session_edit(
        db: Session, session_id: uuid.UUID, teacher_id: Optional[str] = None
    ) -> ClassroomSessionEditRead:
        session = ClassroomSessionRepository.get_subject_only(db, session_id)
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        ClassroomSessionService._verify_access(session.teacher_id, teacher_id)
        return ClassroomSessionEditRead(
            id=session.id, subject=session.subject, camera_id=session.camera_id
        )

    @staticmethod
    def get_session_detail(
        db: Session, session_id: uuid.UUID, teacher_id: Optional[str] = None
    ) -> ClassroomSessionDetailRead:
        result = ClassroomSessionRepository.get_detail_with_metrics(db, session_id)
        if not result:
            raise NotFoundException("Sesi kelas tidak ditemukan")

        (
            session,
            classroom_name,
            teacher_name,
            camera_name,
            avg_focus,
            avg_active,
            sum_phone,
            sum_raised,
            present_count,
            absent_count,
        ) = result
        ClassroomSessionService._verify_access(session.teacher_id, teacher_id)
        return ClassroomSessionDetailRead(
            id=session.id,
            classroom_id=session.classroom_id,
            classroom_name=classroom_name,
            teacher_id=session.teacher_id,
            teacher_name=teacher_name,
            camera_id=session.camera_id,
            camera_name=camera_name,
            subject=session.subject,
            start_time=session.start_time,
            end_time=session.end_time,
            status=session.status,
            metrics_summary=SessionMetricSummary(
                avg_focus_percentage=round(avg_focus, 2),
                avg_active_students=round(avg_active, 2),
                total_using_phone=int(sum_phone),
                total_raised_hand=int(sum_raised),
            ),
            present_count=present_count,
            absent_count=absent_count,
        )

    @staticmethod
    def update_session(
        db: Session,
        session_id: uuid.UUID,
        data: ClassroomSessionUpdate,
        teacher_id: Optional[str] = None,
    ) -> ClassroomSessionEditRead:
        session = ClassroomSessionRepository.get_subject_only(db, session_id)
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        ClassroomSessionService._verify_access(session.teacher_id, teacher_id)
        updated_session = ClassroomSessionRepository.update(
            db, session_id, subject=data.subject, camera_id=data.camera_id
        )
        return ClassroomSessionEditRead(
            id=updated_session.id,
            subject=updated_session.subject,
            camera_id=updated_session.camera_id,
        )

    @staticmethod
    def delete_session(
        db: Session, session_id: uuid.UUID, teacher_id: Optional[str] = None
    ):
        session = ClassroomSessionRepository.get_subject_only(db, session_id)
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        ClassroomSessionService._verify_access(session.teacher_id, teacher_id)
        deleted = ClassroomSessionRepository.soft_delete(db, session_id)
        return deleted

    @staticmethod
    def get_session_students(
        db: Session,
        session_id: uuid.UUID,
        page: int,
        size: int,
        search: Optional[str] = None,
        teacher_id: Optional[str] = None,
    ):
        session = ClassroomSessionRepository.get_subject_only(db, session_id)
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan")
        ClassroomSessionService._verify_access(session.teacher_id, teacher_id)
        page = max(1, page)
        skip = (page - 1) * size
        items, total = ClassroomSessionRepository.get_session_students_metrics(
            db, session_id, skip, size, search
        )
        result = []
        for metric, student_name, student_nis in items:
            result.append(
                SessionStudentMetricRead(
                    id=metric.id,
                    student_id=metric.student_id,
                    student_name=student_name,
                    student_nis=student_nis,
                    focus_score=round(metric.focus_score, 2),
                    distracted_score=round(metric.distracted_score, 2),
                    raised_hand_count=metric.raised_hand_count,
                    updated_at=metric.updated_at,
                )
            )
        return result, total

    @staticmethod
    def end_session(db: Session, session_id: uuid.UUID):
        session = (
            db.query(ClassroomSession)
            .filter(
                ClassroomSession.id == session_id, ClassroomSession.deleted_at.is_(None)
            )
            .first()
        )
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan.")
        if session.status == "FINISHED":
            raise BadRequestException("Sesi kelas ini sudah berakhir sebelumnya.")
        endpoint = session.camera.endpoint if session.camera else None
        seatings = (
            db.query(SessionSeating)
            .filter(SessionSeating.session_id == session_id)
            .all()
        )
        logs = db.query(FrameLog).filter(FrameLog.session_id == session_id).all()
        if seatings and logs:
            student_stats = {
                s.student_id: {
                    "focus_count": 0,
                    "distracted_count": 0,
                    "total_frames": 0,
                    "raised_hand": 0,
                }
                for s in seatings
            }
            RADIUS = 150.0
            for log in logs:
                detections = log.payload
                for seating in seatings:
                    matched_det = None
                    min_dist = float("inf")
                    for det in detections:
                        dx = det["center"][0] - seating.pos_x
                        dy = det["center"][1] - seating.pos_y
                        dist = math.hypot(dx, dy)
                        if dist < min_dist and dist <= RADIUS:
                            min_dist = dist
                            matched_det = det
                    if matched_det:
                        stats = student_stats[seating.student_id]
                        stats["total_frames"] += 1
                        if matched_det["label"] == "focus":
                            stats["focus_count"] += 1
                        elif matched_det["label"] == "distracted":
                            stats["distracted_count"] += 1
                        elif matched_det["label"] == "raise-hand":
                            stats["raised_hand"] += 1
            total_class_focus = 0.0
            total_active_students = len(seatings)
            total_phone_count = 0
            total_raised_hand_count = 0
            for student_id, stats in student_stats.items():
                total = stats["total_frames"]
                if total > 0:
                    focus_score = (stats["focus_count"] / total) * 100.0
                    distracted_score = (stats["distracted_count"] / total) * 100.0
                else:
                    focus_score = 0.0
                    distracted_score = 0.0
                total_class_focus += focus_score
                total_raised_hand_count += stats["raised_hand"]
                metric_record = StudentMetric(
                    session_id=session_id,
                    student_id=student_id,
                    focus_score=round(focus_score, 2),
                    distracted_score=round(distracted_score, 2),
                    raised_hand_count=stats["raised_hand"],
                )
                db.add(metric_record)
            avg_class_focus = (
                (total_class_focus / total_active_students)
                if total_active_students > 0
                else 0.0
            )
            classroom_metric = ClassroomMetric(
                session_id=session_id,
                active_students=total_active_students,
                focus_percentage=round(avg_class_focus, 2),
                using_phone_count=total_phone_count,
                raised_hand_count=total_raised_hand_count,
            )
            db.add(classroom_metric)
        session.status = "FINISHED"
        db.commit()
        if endpoint:
            CameraManager.stop_stream(endpoint)
        return session

    @staticmethod
    def get_live_detections(db: Session, session_id: uuid.UUID) -> dict:
        """
        Hasil deteksi kamera terbaru yang sudah dipetakan ke nama siswa,
        memakai posisi duduk hasil absensi (logika sama dengan rekap sesi).
        """
        session = ClassroomSessionRepository.get_by_id(db, session_id)
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan.")

        endpoint = session.camera.endpoint if session.camera else None
        detections = (
            CameraManager.get_latest_detections(endpoint) if endpoint else None
        )

        if detections is None:
            return {"stream_active": False, "students": []}

        seatings = (
            db.query(SessionSeating, Student)
            .join(Student, SessionSeating.student_id == Student.id)
            .filter(SessionSeating.session_id == session_id)
            .all()
        )

        RADIUS = 150.0
        students = []
        for seating, student in seatings:
            matched_label = None
            matched_confidence = None
            min_dist = float("inf")
            for det in detections:
                dx = det["center"][0] - seating.pos_x
                dy = det["center"][1] - seating.pos_y
                dist = math.hypot(dx, dy)
                if dist < min_dist and dist <= RADIUS:
                    min_dist = dist
                    matched_label = det["label"]
                    matched_confidence = det["confidence"]

            students.append(
                {
                    "id": student.id,
                    "name": student.name,
                    "label": matched_label,
                    "confidence": matched_confidence,
                }
            )

        return {
            "stream_active": True,
            "detected_people": len(detections),
            "students": students,
        }

    @staticmethod
    def get_evaluation_status(db: Session, session_id: uuid.UUID) -> dict:
        """Status stream & evaluasi terkini, dipakai UI untuk memulihkan tampilan."""
        session = ClassroomSessionRepository.get_by_id(db, session_id)
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan.")

        endpoint = session.camera.endpoint if session.camera else None
        state = (
            CameraManager.get_evaluation_state(endpoint) if endpoint else None
        )

        return {
            "stream_active": state is not None,
            "is_evaluating": bool(state),
        }

    @staticmethod
    def get_session_attendance(db: Session, session_id: uuid.UUID) -> list:
        """Daftar siswa kelas beserta status kehadirannya pada sesi ini."""
        session = ClassroomSessionRepository.get_by_id(db, session_id)
        if not session:
            raise NotFoundException("Sesi kelas tidak ditemukan.")

        students = (
            db.query(Student)
            .filter(
                Student.classroom_id == session.classroom_id,
                Student.deleted_at.is_(None),
            )
            .order_by(Student.name)
            .all()
        )

        seatings = {
            seating.student_id: seating.attendance_status
            for seating in db.query(SessionSeating)
            .filter(SessionSeating.session_id == session_id)
            .all()
        }

        return [
            {
                "id": student.id,
                "name": student.name,
                "nis": student.nis,
                # NOT_REGISTERED = belum pernah diabsen pada sesi ini.
                "status": seatings.get(student.id, "NOT_REGISTERED"),
            }
            for student in students
        ]

    @staticmethod
    def register_student_pose(
        db: Session, session_id: uuid.UUID, student_id: uuid.UUID
    ) -> dict:
        session = ClassroomSessionRepository.get_by_id(db, session_id)
        if not session or session.status != "ONGOING":
            raise BadRequestException("Sesi tidak valid atau sudah selesai.")
        if not session.camera or not session.camera.endpoint:
            raise BadRequestException(
                "Sesi ini belum terhubung ke kamera mana pun."
            )
        endpoint = session.camera.endpoint
        frame = CameraManager.get_latest_frame(endpoint)
        if frame is None:
            raise BadRequestException(
                "Stream kamera belum siap. Tunggu beberapa detik."
            )
        # Inferensi model dibungkus supaya kegagalan model tidak muncul sebagai
        # error 500 tanpa keterangan di sisi pengguna.
        try:
            detections = AIProcessor.process_frame(frame)
        except Exception as exc:  # noqa: BLE001
            logger.exception("[ABSENSI] Model AI gagal memproses frame")
            raise BadRequestException(
                f"Model AI gagal memproses gambar kamera: {exc}"
            )
        # Model hanya mengenal tiga kelas (fokus, terdistraksi, angkat tangan),
        # sehingga kelas "angkat tangan" bisa menang tipis walau siswa hanya
        # duduk biasa. Karena itu absensi mensyaratkan ambang keyakinan minimum.
        raise_hand_candidates = [d for d in detections if d["label"] == "raise-hand"]
        raise_hand_detections = [
            d
            for d in raise_hand_candidates
            if d["confidence"] >= MIN_RAISE_HAND_CONFIDENCE
        ]

        if len(raise_hand_detections) == 0:
            best_confidence = max(
                (d["confidence"] for d in raise_hand_candidates), default=None
            )
            if best_confidence is not None:
                raise BadRequestException(
                    "Pose angkat tangan belum meyakinkan "
                    f"(keyakinan {best_confidence * 100:.0f}%, minimal "
                    f"{MIN_RAISE_HAND_CONFIDENCE * 100:.0f}%). "
                    "Minta siswa mengangkat tangan lebih tinggi dan menghadap kamera, lalu coba lagi."
                )
            raise BadRequestException(
                "Siswa tidak terdeteksi mengangkat tangan. Silakan coba lagi."
            )
        elif len(raise_hand_detections) > 1:
            raise BadRequestException(
                "Terdeteksi lebih dari satu orang mengangkat tangan. Harap bergantian."
            )
        target_student = raise_hand_detections[0]
        cx, cy = target_student["center"]

        existing_seating = (
            db.query(SessionSeating)
            .filter(
                SessionSeating.session_id == session_id,
                SessionSeating.student_id == student_id,
            )
            .first()
        )
        if existing_seating:
            existing_seating.pos_x = cx
            existing_seating.pos_y = cy
            existing_seating.attendance_status = "PRESENT"
        else:
            new_seating = SessionSeating(
                session_id=session_id,
                student_id=student_id,
                pos_x=cx,
                pos_y=cy,
                attendance_status="PRESENT",
            )
            db.add(new_seating)
        db.commit()
        attendance_records = (
            db.query(SessionSeating, Student)
            .join(Student, SessionSeating.student_id == Student.id)
            .filter(SessionSeating.session_id == session_id)
            .all()
        )
        students_list = []
        present_count = 0
        absent_count = 0
        for seating, student_obj in attendance_records:
            if seating.attendance_status == "PRESENT":
                present_count += 1
            else:
                absent_count += 1
            students_list.append(
                {
                    "id": student_obj.id,
                    "name": student_obj.name,
                    "status": seating.attendance_status,
                }
            )
        return {
            "center_x": cx,
            "center_y": cy,
            "present_count": present_count,
            "absent_count": absent_count,
            "students": students_list,
        }

    @staticmethod
    def _toggle_evaluation(db: Session, session_id: uuid.UUID, is_evaluating: bool):
        session = ClassroomSessionRepository.get_by_id(db, session_id)
        if not session or session.status != "ONGOING":
            raise BadRequestException("Sesi tidak valid atau sudah selesai.")
        endpoint = session.camera.endpoint
        stream = CameraManager._active_streams.get(endpoint)
        if not stream:
            raise BadRequestException("Stream belum aktif.")
        stream.is_evaluating = is_evaluating

    @staticmethod
    def start_evaluation(db: Session, session_id: uuid.UUID):
        ClassroomSessionService._toggle_evaluation(db, session_id, True)

    @staticmethod
    def end_evaluation(db: Session, session_id: uuid.UUID):
        ClassroomSessionService._toggle_evaluation(db, session_id, False)
