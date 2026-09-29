from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from .config import settings
from .database import engine, Base
from .models import WifiMeasurement, PingMeasurement, SpeedTestResult, TcpUdpBenchmarkResult
from .websocket.manager import manager
from .routers import (
    wifi_router,
    speed_router,
    ping_router,
    tcp_udp_router,
    dns_router,
    history_router
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

from contextlib import asynccontextmanager
from .services.wifi_scanner import wifi_scanner
from .services.ping_analyzer import ping_analyzer

broadcast_task = None

async def telemetry_broadcaster():
    """Continuously broadcast live Wi-Fi and ping telemetry to all connected WebSocket clients."""
    while True:
        try:
            if manager.active_connections:
                wifi_data = wifi_scanner.get_current_connection()
                ping_data = ping_analyzer.ping_once() if ping_analyzer.is_running else ping_analyzer.get_metrics()
                await manager.broadcast({
                    "type": "telemetry_update",
                    "wifi": wifi_data,
                    "ping": ping_data
                })
        except Exception:
            pass
        await asyncio.sleep(2.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global broadcast_task
    broadcast_task = asyncio.create_task(telemetry_broadcaster())
    yield
    if broadcast_task:
        broadcast_task.cancel()

app = FastAPI(
    title=settings.APP_NAME,
    description="Cross-platform real-time Wi-Fi & Network Performance Analyzer",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all during local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(wifi_router)
app.include_router(speed_router)
app.include_router(ping_router)
app.include_router(tcp_udp_router)
app.include_router(dns_router)
app.include_router(history_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "database": "connected"
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Receive client ping or commands
            data = await websocket.receive_text()
            # Echo back or acknowledge
            await websocket.send_json({"type": "ack", "payload": data})
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)
