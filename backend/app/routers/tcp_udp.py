from fastapi import APIRouter, Query, Depends, Body
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from ..database import get_db
from ..models.tcp_udp import TcpUdpBenchmarkResult
from ..services.tcp_udp_analyzer import tcp_udp_analyzer

router = APIRouter(prefix="/api/tcp-udp", tags=["tcp-udp"])

class BenchmarkRequest(BaseModel):
    protocol: str = "TCP" # "TCP" or "UDP"
    duration_seconds: float = 3.0
    packet_count: int = 200
    packet_rate: int = 150

@router.get("/connections")
def get_active_connections(
    protocol: Optional[str] = Query(None, description="Filter by TCP or UDP"),
    state: Optional[str] = Query(None, description="Filter by connection state (e.g. ESTABLISHED, LISTEN)"),
    search: Optional[str] = Query(None, description="Search by process, IP, or port"),
    limit: int = Query(100, ge=10, le=500)
):
    """
    Returns active TCP and UDP sockets with state, endpoints, and owning process name.
    """
    return tcp_udp_analyzer.get_connections(
        protocol=protocol,
        state=state,
        search=search,
        limit=limit
    )

@router.get("/stats")
def get_protocol_statistics():
    """
    Returns overall TCP vs UDP connection counts and TCP state distribution (ESTABLISHED, LISTEN, etc.)
    """
    data = tcp_udp_analyzer.get_connections(limit=500)
    return {
        "total_connections": data["total_connections"],
        "tcp_count": data["tcp_count"],
        "udp_count": data["udp_count"],
        "state_distribution": data["state_distribution"],
        "top_processes": data["top_processes"]
    }

@router.post("/benchmark")
async def run_benchmark(req: BenchmarkRequest):
    """
    Executes a controlled micro-benchmark:
    - TCP: Handshake latency and sustained stream throughput
    - UDP: Sequenced datagram transmission, missing sequence (loss), duplicate and out-of-order analysis
    """
    if tcp_udp_analyzer.is_benchmarking:
        return {"status": "busy", "message": "A benchmark is already running"}

    if req.protocol.upper() == "UDP":
        res = await tcp_udp_analyzer.run_udp_benchmark(
            packet_count=req.packet_count,
            packet_rate=req.packet_rate
        )
    else:
        res = await tcp_udp_analyzer.run_tcp_benchmark(
            duration_seconds=req.duration_seconds
        )

    return res

@router.get("/benchmark/history")
def get_benchmark_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Returns historical benchmark executions.
    """
    records = (
        db.query(TcpUdpBenchmarkResult)
        .order_by(TcpUdpBenchmarkResult.id.desc())
        .limit(limit)
        .all()
    )
    records = list(reversed(records))
    return [
        {
            "id": r.id,
            "timestamp": r.timestamp.strftime("%H:%M:%S") if r.timestamp else "",
            "protocol": r.protocol,
            "throughput_mbps": r.throughput_mbps,
            "duration_seconds": r.duration_seconds,
            "packet_loss_percent": r.packet_loss_percent,
            "avg_jitter_ms": r.avg_jitter_ms,
            "out_of_order_packets": r.out_of_order_packets
        }
        for r in records
    ]
