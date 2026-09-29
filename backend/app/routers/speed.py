from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ..database import get_db
from ..models.speed_test import SpeedTestResult
from ..services.speed_tester import speed_tester

router = APIRouter(prefix="/api/speed", tags=["speed"])

@router.post("/start")
async def start_speed_test(background_tasks: BackgroundTasks):
    """
    Triggers a new speed test execution asynchronously.
    """
    if speed_tester.is_running:
        return {"status": "busy", "message": "A speed test is already running"}

    # Run in background task
    background_tasks.add_task(speed_tester.run_test)
    return {"status": "started", "message": "Speed test initialized"}

@router.get("/status")
def get_speed_test_status():
    """
    Returns the live progress, active phase, and instant throughput of the running test.
    """
    return speed_tester.get_status()

@router.get("/latest")
def get_latest_speed_test(db: Session = Depends(get_db)):
    """
    Returns the most recent completed speed test from database or current session.
    """
    if speed_tester.last_result:
        return speed_tester.last_result

    latest = db.query(SpeedTestResult).order_by(SpeedTestResult.id.desc()).first()
    if latest:
        return {
            "download_mbps": latest.download_mbps,
            "upload_mbps": latest.upload_mbps,
            "ping_ms": latest.ping_ms,
            "server_name": latest.server_name,
            "server_location": latest.server_location,
            "isp": latest.isp,
            "timestamp": latest.timestamp.isoformat() if latest.timestamp else None
        }

    return {
        "download_mbps": 0.0,
        "upload_mbps": 0.0,
        "ping_ms": 0.0,
        "timestamp": None
    }

@router.get("/history")
def get_speed_test_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Returns speed test history for historical trend visualizations.
    """
    records = (
        db.query(SpeedTestResult)
        .order_by(SpeedTestResult.id.desc())
        .limit(limit)
        .all()
    )
    records = list(reversed(records))
    return [
        {
            "id": r.id,
            "timestamp": r.timestamp.strftime("%b %d %H:%M") if r.timestamp else "",
            "download_mbps": r.download_mbps,
            "upload_mbps": r.upload_mbps,
            "ping_ms": r.ping_ms,
            "server_location": r.server_location
        }
        for r in records
    ]
