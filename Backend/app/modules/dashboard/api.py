import uuid
from typing import Union, List
from datetime import date
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.core.auth_deps import require_principal_or_teacher
from app.core.responses import BaseResponse
from app.modules.dashboard.service import DashboardService
from app.modules.dashboard.schema import PrincipalDashboardResponse, TeacherDashboardResponse, AggregatedMetric, Granularity, TopEntityTarget, TopSortBy, TopPerformerResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/", response_model=BaseResponse[Union[PrincipalDashboardResponse, TeacherDashboardResponse]], summary="Get dashboard metrics based on role")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    """
    Mengambil data statistik dashboard utama sekolah.
    - **Principal**: Menampilkan total siswa, kelas, guru, dan mapel keseluruhan.
    - **Teacher**: Menampilkan total kelas yang diajar, siswa, mapel unik, dan performa metrik kelasnya.
    """
    user_id = uuid.UUID(current_user.get("sub"))
    user_role = current_user.get("role")
    
    data = DashboardService.get_dashboard_data(db, user_role, user_id)
    return BaseResponse(message="Dashboard data retrieved successfully", data=data)

@router.get("/metrics", response_model=BaseResponse[List[AggregatedMetric]])
def get_metrics(
    granularity: Granularity = Query(Granularity.DAILY),
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    """
    Mengambil data rata rata classroom metric per hari
    """
    user_id = uuid.UUID(current_user.get("sub"))
    user_role = current_user.get("role")
    data = DashboardService.get_metrics(db, granularity, start_date, end_date, user_role, user_id)
    return BaseResponse(message=f"{granularity.value} metrics retrieved", data=data)


@router.get("/top-performers/{entity}", response_model=BaseResponse[List[TopPerformerResponse]])
def get_top_performers(
    entity: TopEntityTarget = Path(...),
    limit: int = Query(5, ge=1, le=50, description="Max items to return"),
    sort_by: TopSortBy = Query(TopSortBy.FOCUS, description="Sort by focus or participation"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    """
    Mengambil data berdasarkan peringkat terbaik 
    """
    user_id = uuid.UUID(current_user.get("sub"))
    role = current_user.get("role")
    if role == "teacher" and entity == TopEntityTarget.TEACHER:
        return BaseResponse(status_code=403, message="Teachers cannot view teacher rankings", data=[])
    data = DashboardService.get_top_performers(db, entity, limit, sort_by, role, user_id)
    return BaseResponse(message=f"Top {limit} {entity.value}s retrieved successfully", data=data)

@router.get("/warnings/{entity}", response_model=BaseResponse[List[TopPerformerResponse]])
def get_dashboard_warnings(
    entity: TopEntityTarget = Path(...),
    threshold: float = Query(60.0, ge=0.0, le=100.0, description="Batas minimum focus score (persentase)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_principal_or_teacher)
):
    """
    Mengambil data berdasarkan peringkat terbaik 
    """
    user_id = uuid.UUID(current_user.get("sub"))
    role = current_user.get("role")
    if role == "teacher" and entity == TopEntityTarget.TEACHER:
        return BaseResponse(status_code=403, message="Teachers cannot view teacher warnings", data=[])
    data = DashboardService.get_dashboard_warnings(db, entity, threshold, role, user_id)
    return BaseResponse(message=f"Warnings for {entity.value}s with focus below {threshold}% retrieved", data=data)
