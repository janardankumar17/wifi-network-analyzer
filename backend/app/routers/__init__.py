from .wifi import router as wifi_router
from .speed import router as speed_router
from .ping import router as ping_router
from .tcp_udp import router as tcp_udp_router
from .dns import router as dns_router
from .history import router as history_router

__all__ = [
    "wifi_router",
    "speed_router",
    "ping_router",
    "tcp_udp_router",
    "dns_router",
    "history_router"
]
