from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from pydantic import BaseModel

from ..database import get_db
from ..models.measurement import PingMeasurement
from ..services.ping_analyzer import ping_analyzer

router = APIRouter(prefix="/api/ping", tags=["ping"])

class TargetRequest(BaseModel):
    target: str

@router.get("/metrics")
def get_ping_metrics():
    """
    Returns latest ping latency, rolling jitter, packet loss percentage, and health status.
    """
    if ping_analyzer.is_running:
        return ping_analyzer.ping_once()
    return ping_analyzer.get_metrics()

@router.get("/history")
def get_ping_history(
    limit: int = Query(50, ge=10, le=200),
    db: Session = Depends(get_db)
):
    """
    Returns historical ping measurements from the database for timeline rendering.
    """
    records = (
        db.query(PingMeasurement)
        .order_by(PingMeasurement.id.desc())
        .limit(limit)
        .all()
    )
    records = list(reversed(records))
    return [
        {
            "id": r.id,
            "timestamp": r.timestamp.strftime("%H:%M:%S") if r.timestamp else "",
            "latency_ms": r.latency_ms if r.status == "success" else 0,
            "packet_loss_percent": r.packet_loss_percent,
            "jitter_ms": r.jitter_ms,
            "status": r.status
        }
        for r in records
    ]

@router.post("/target")
def set_ping_target(req: TargetRequest):
    """
    Updates the active ping target host (e.g. 8.8.8.8, 1.1.1.1, gateway).
    """
    ping_analyzer.set_target(req.target)
    return {"status": "updated", "target": ping_analyzer.target_host}

@router.post("/toggle")
def toggle_ping_monitor():
    """
    Pauses or resumes continuous ping probing.
    """
    ping_analyzer.is_running = not ping_analyzer.is_running
    return {"is_running": ping_analyzer.is_running}
