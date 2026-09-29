from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from ..database import Base

class SpeedTestResult(Base):
    __tablename__ = "speed_test_results"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    download_mbps = Column(Float, nullable=False)
    upload_mbps = Column(Float, nullable=False)
    ping_ms = Column(Float, nullable=False)
    server_name = Column(String, nullable=True)
    server_location = Column(String, nullable=True)
    isp = Column(String, nullable=True)
