from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from ..database import Base

class WifiMeasurement(Base):
    __tablename__ = "wifi_measurements"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    ssid = Column(String, nullable=True)
    bssid = Column(String, nullable=True)
    signal_percent = Column(Float, nullable=True)  # 0 - 100%
    signal_dbm = Column(Float, nullable=True)      # e.g. -55 dBm
    channel = Column(Integer, nullable=True)
    frequency_mhz = Column(Float, nullable=True)
    interface_name = Column(String, nullable=True)
    link_speed_mbps = Column(Float, nullable=True)

class PingMeasurement(Base):
    __tablename__ = "ping_measurements"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    target_host = Column(String, index=True)
    latency_ms = Column(Float, nullable=True)
    packet_loss_percent = Column(Float, default=0.0)
    jitter_ms = Column(Float, nullable=True)
    status = Column(String, default="success")  # "success", "timeout", "error"
