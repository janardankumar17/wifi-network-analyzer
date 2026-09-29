from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from ..database import Base

class TcpUdpBenchmarkResult(Base):
    __tablename__ = "tcp_udp_benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    protocol = Column(String, nullable=False)  # "TCP" or "UDP"
    direction = Column(String, default="loopback") # "loopback", "local_target"
    duration_seconds = Column(Float, nullable=False)
    throughput_mbps = Column(Float, nullable=False)
    total_bytes = Column(Integer, default=0)
    packets_sent = Column(Integer, default=0)
    packets_received = Column(Integer, default=0)
    packet_loss_percent = Column(Float, default=0.0)
    avg_jitter_ms = Column(Float, default=0.0)
    out_of_order_packets = Column(Integer, default=0)
