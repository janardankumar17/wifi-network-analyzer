from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import json
import csv
import io

from ..database import get_db
from ..models.measurement import WifiMeasurement, PingMeasurement
from ..models.speed_test import SpeedTestResult
from ..models.tcp_udp import TcpUdpBenchmarkResult

router = APIRouter(prefix="/api/history", tags=["history"])

def get_cutoff_time(time_range: str) -> Optional[datetime]:
    now = datetime.utcnow()
    if time_range == "1h":
        return now - timedelta(hours=1)
    elif time_range == "24h":
        return now - timedelta(days=1)
    elif time_range == "7d":
        return now - timedelta(days=7)
    elif time_range == "30d":
        return now - timedelta(days=30)
    return None # All time

@router.get("/summary")
def get_historical_summary(
    time_range: str = Query("24h", description="1h, 24h, 7d, 30d, all"),
    db: Session = Depends(get_db)
):
    """
    Returns aggregate network performance summary and health scores over selected time window.
    """
    cutoff = get_cutoff_time(time_range)

    # Wi-Fi query
    wifi_q = db.query(WifiMeasurement)
    if cutoff:
        wifi_q = wifi_q.filter(WifiMeasurement.timestamp >= cutoff)
    wifi_records = wifi_q.all()

    # Ping query
    ping_q = db.query(PingMeasurement)
    if cutoff:
        ping_q = ping_q.filter(PingMeasurement.timestamp >= cutoff)
    ping_records = ping_q.all()

    # Speed query
    speed_q = db.query(SpeedTestResult)
    if cutoff:
        speed_q = speed_q.filter(SpeedTestResult.timestamp >= cutoff)
    speed_records = speed_q.all()

    # TCP/UDP benchmarks query
    bench_q = db.query(TcpUdpBenchmarkResult)
    if cutoff:
        bench_q = bench_q.filter(TcpUdpBenchmarkResult.timestamp >= cutoff)
    bench_records = bench_q.all()

    # Calculate statistics
    avg_wifi_signal = (
        sum(r.signal_percent for r in wifi_records if r.signal_percent is not None) / len(wifi_records)
        if wifi_records else 0.0
    )

    valid_pings = [r.latency_ms for r in ping_records if r.latency_ms is not None]
    avg_latency = sum(valid_pings) / len(valid_pings) if valid_pings else 0.0
    avg_jitter = (
        sum(r.jitter_ms for r in ping_records if r.jitter_ms is not None) / len(ping_records)
        if ping_records else 0.0
    )
    lost_pings = sum(1 for r in ping_records if r.status != "success")
    ping_loss_pct = (lost_pings / len(ping_records) * 100.0) if ping_records else 0.0

    avg_download = (
        sum(r.download_mbps for r in speed_records) / len(speed_records)
        if speed_records else 0.0
    )
    max_download = max([r.download_mbps for r in speed_records], default=0.0)
    avg_upload = (
        sum(r.upload_mbps for r in speed_records) / len(speed_records)
        if speed_records else 0.0
    )

    # Health score computation (0 to 100)
    # Starts at 100, penalties for signal < 70, latency > 50, loss > 1%, jitter > 5
    score = 100
    if avg_wifi_signal > 0 and avg_wifi_signal < 60:
        score -= int((60 - avg_wifi_signal) * 0.4)
    if avg_latency > 60:
        score -= min(int((avg_latency - 60) * 0.25), 20)
    if ping_loss_pct > 0:
        score -= min(int(ping_loss_pct * 3), 30)
    if avg_jitter > 5:
        score -= min(int((avg_jitter - 5) * 1.5), 15)
    score = max(min(score, 100), 20)

    grade = "A+" if score >= 90 else "A" if score >= 80 else "B" if score >= 70 else "C" if score >= 50 else "D"

    return {
        "time_range": time_range,
        "health_score": score,
        "grade": grade,
        "wifi": {
            "sample_count": len(wifi_records),
            "avg_signal_percent": round(avg_wifi_signal, 1),
            "current_ssid": wifi_records[-1].ssid if wifi_records else None
        },
        "ping": {
            "sample_count": len(ping_records),
            "avg_latency_ms": round(avg_latency, 1),
            "avg_jitter_ms": round(avg_jitter, 2),
            "packet_loss_percent": round(ping_loss_pct, 1)
        },
        "speed": {
            "test_count": len(speed_records),
            "avg_download_mbps": round(avg_download, 2),
            "max_download_mbps": round(max_download, 2),
            "avg_upload_mbps": round(avg_upload, 2)
        },
        "benchmarks": {
            "total_runs": len(bench_records)
        }
    }

@router.get("/trends")
def get_historical_trends(
    time_range: str = Query("24h", description="1h, 24h, 7d, 30d, all"),
    limit: int = Query(50, ge=10, le=200),
    db: Session = Depends(get_db)
):
    """
    Returns time-series data points for charts over selected time range.
    """
    cutoff = get_cutoff_time(time_range)

    wifi_q = db.query(WifiMeasurement)
    ping_q = db.query(PingMeasurement)
    speed_q = db.query(SpeedTestResult)

    if cutoff:
        wifi_q = wifi_q.filter(WifiMeasurement.timestamp >= cutoff)
        ping_q = ping_q.filter(PingMeasurement.timestamp >= cutoff)
        speed_q = speed_q.filter(SpeedTestResult.timestamp >= cutoff)

    wifi_pts = wifi_q.order_by(WifiMeasurement.id.desc()).limit(limit).all()
    ping_pts = ping_q.order_by(PingMeasurement.id.desc()).limit(limit).all()
    speed_pts = speed_q.order_by(SpeedTestResult.id.desc()).limit(limit).all()

    return {
        "wifi": [
            {
                "timestamp": r.timestamp.strftime("%H:%M:%S") if r.timestamp else "",
                "signal_percent": r.signal_percent,
                "signal_dbm": r.signal_dbm,
                "link_speed_mbps": r.link_speed_mbps
            }
            for r in reversed(wifi_pts)
        ],
        "ping": [
            {
                "timestamp": r.timestamp.strftime("%H:%M:%S") if r.timestamp else "",
                "latency_ms": r.latency_ms if r.status == "success" else 0,
                "jitter_ms": r.jitter_ms,
                "packet_loss_percent": r.packet_loss_percent
            }
            for r in reversed(ping_pts)
        ],
        "speed": [
            {
                "timestamp": r.timestamp.strftime("%b %d %H:%M") if r.timestamp else "",
                "download_mbps": r.download_mbps,
                "upload_mbps": r.upload_mbps,
                "ping_ms": r.ping_ms
            }
            for r in reversed(speed_pts)
        ]
    }

@router.get("/export")
def export_network_data(
    format: str = Query("json", description="json or csv"),
    module: str = Query("all", description="all, wifi, ping, speed, tcp_udp"),
    db: Session = Depends(get_db)
):
    """
    Exports historical telemetry as downloadable CSV or JSON.
    """
    if format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)

        if module in ("speed", "all"):
            writer.writerow(["=== SPEED TESTS ==="])
            writer.writerow(["ID", "Timestamp", "Download (Mbps)", "Upload (Mbps)", "Ping (ms)", "Server", "Location"])
            for r in db.query(SpeedTestResult).all():
                writer.writerow([r.id, r.timestamp, r.download_mbps, r.upload_mbps, r.ping_ms, r.server_name, r.server_location])
            writer.writerow([])

        if module in ("wifi", "all"):
            writer.writerow(["=== WI-FI MEASUREMENTS ==="])
            writer.writerow(["ID", "Timestamp", "SSID", "BSSID", "Signal (%)", "RSSI (dBm)", "Channel", "Rx Speed (Mbps)"])
            for r in db.query(WifiMeasurement).limit(500).all():
                writer.writerow([r.id, r.timestamp, r.ssid, r.bssid, r.signal_percent, r.signal_dbm, r.channel, r.link_speed_mbps])
            writer.writerow([])

        if module in ("ping", "all"):
            writer.writerow(["=== PING MEASUREMENTS ==="])
            writer.writerow(["ID", "Timestamp", "Target", "Latency (ms)", "Loss (%)", "Jitter (ms)", "Status"])
            for r in db.query(PingMeasurement).limit(500).all():
                writer.writerow([r.id, r.timestamp, r.target_host, r.latency_ms, r.packet_loss_percent, r.jitter_ms, r.status])

        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=network_telemetry_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
        )

    # JSON export
    data = {
        "exported_at": datetime.utcnow().isoformat(),
        "speed_tests": [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "download_mbps": r.download_mbps,
                "upload_mbps": r.upload_mbps,
                "ping_ms": r.ping_ms,
                "server_location": r.server_location
            }
            for r in db.query(SpeedTestResult).all()
        ],
        "wifi_measurements": [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "ssid": r.ssid,
                "signal_percent": r.signal_percent,
                "signal_dbm": r.signal_dbm,
                "channel": r.channel
            }
            for r in db.query(WifiMeasurement).limit(300).all()
        ],
        "ping_measurements": [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "target": r.target_host,
                "latency_ms": r.latency_ms,
                "packet_loss_percent": r.packet_loss_percent,
                "jitter_ms": r.jitter_ms,
                "status": r.status
            }
            for r in db.query(PingMeasurement).limit(300).all()
        ]
    }
    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=network_telemetry_{datetime.utcnow().strftime('%Y%m%d')}.json"}
    )
