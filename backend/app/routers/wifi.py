from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Any

from ..database import get_db
from ..models.measurement import WifiMeasurement
from ..services.wifi_scanner import wifi_scanner

router = APIRouter(prefix="/api/wifi", tags=["wifi"])

@router.get("/status")
def get_wifi_status(db: Session = Depends(get_db)):
    """
    Returns current live Wi-Fi connection info and logs the measurement to the database.
    """
    data = wifi_scanner.get_current_connection()

    if data.get("connected"):
        record = WifiMeasurement(
            ssid=data.get("ssid"),
            bssid=data.get("bssid"),
            signal_percent=data.get("signal_percent"),
            signal_dbm=data.get("signal_dbm"),
            channel=data.get("channel"),
            interface_name=data.get("interface"),
            link_speed_mbps=data.get("rx_rate_mbps")
        )
        db.add(record)
        db.commit()

    return data

@router.get("/history")
def get_wifi_history(
    limit: int = Query(60, ge=5, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns the most recent Wi-Fi signal measurements for real-time rolling charts.
    """
    records = (
        db.query(WifiMeasurement)
        .order_by(WifiMeasurement.id.desc())
        .limit(limit)
        .all()
    )
    # Return chronologically ascending for line charts
    records = list(reversed(records))
    return [
        {
            "id": r.id,
            "timestamp": r.timestamp.strftime("%H:%M:%S") if r.timestamp else "",
            "signal_percent": r.signal_percent,
            "signal_dbm": r.signal_dbm,
            "ssid": r.ssid,
            "channel": r.channel,
            "link_speed_mbps": r.link_speed_mbps
        }
        for r in records
    ]

@router.get("/nearby")
def get_nearby_networks():
    """
    Scans and returns nearby Wi-Fi networks with signal strength and channel distribution.
    """
    return wifi_scanner.get_nearby_networks()
