import asyncio
import subprocess
import platform
import re
import time
import socket
from collections import deque
from typing import Dict, Any, List, Optional
from datetime import datetime

from ..database import SessionLocal
from ..models.measurement import PingMeasurement
from ..websocket.manager import manager

class PingAnalyzer:
    def __init__(self, target_host: str = "8.8.8.8", window_size: int = 50):
        self.target_host = target_host
        self.window_size = window_size
        self.is_running = True
        self.interval_seconds = 1.0

        # Rolling statistics window
        self._history: deque = deque(maxlen=window_size)
        self._last_latency: Optional[float] = None
        self._jitter: float = 0.0

        # Aggregate counters
        self.total_sent = 0
        self.total_received = 0
        self.total_lost = 0

    def set_target(self, new_target: str):
        cleaned = new_target.strip()
        if cleaned and cleaned != self.target_host:
            self.target_host = cleaned
            self.reset_stats()

    def reset_stats(self):
        self._history.clear()
        self._last_latency = None
        self._jitter = 0.0
        self.total_sent = 0
        self.total_received = 0
        self.total_lost = 0

    def ping_once(self) -> Dict[str, Any]:
        """
        Executes a single ICMP or TCP probe to target_host and returns latency (ms) or None on drop.
        """
        self.total_sent += 1
        os_name = platform.system()
        latency_ms = None
        status = "timeout"

        # Try native ICMP ping first
        try:
            if os_name == "Windows":
                cmd = ["ping", "-n", "1", "-w", "1000", self.target_host]
            else:
                cmd = ["ping", "-c", "1", "-W", "1", self.target_host]

            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=2.0)
            output = proc.stdout

            # Windows pattern: time=12ms or time<1ms
            m_win = re.search(r"time[=<](\d+(?:\.\d+)?)ms", output, re.IGNORECASE)
            # Linux/macOS pattern: time=12.3 ms
            m_nix = re.search(r"time=(\d+(?:\.\d+)?)\s*ms", output, re.IGNORECASE)

            if m_win:
                latency_ms = float(m_win.group(1))
                status = "success"
            elif m_nix:
                latency_ms = float(m_nix.group(1))
                status = "success"
        except Exception:
            pass

        # Fallback to TCP handshake probe (port 80 or 443 or 53) if ICMP failed
        if latency_ms is None:
            t0 = time.perf_counter()
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1.0)
                port = 53 if self.target_host in ("8.8.8.8", "1.1.1.1", "9.9.9.9") else 443
                s.connect((self.target_host, port))
                t1 = time.perf_counter()
                latency_ms = round((t1 - t0) * 1000.0, 1)
                status = "success"
                s.close()
            except Exception:
                status = "timeout"

        # Process statistics
        if latency_ms is not None:
            self.total_received += 1
            if self._last_latency is not None:
                # RFC 3550 Interarrival Jitter formula: J = J + (|D| - J)/16
                d = abs(latency_ms - self._last_latency)
                self._jitter = self._jitter + (d - self._jitter) / 16.0
            self._last_latency = latency_ms
        else:
            self.total_lost += 1

        entry = {
            "timestamp": datetime.utcnow().strftime("%H:%M:%S"),
            "latency_ms": latency_ms,
            "status": status
        }
        self._history.append(entry)

        # Save to database periodically
        self._save_measurement(latency_ms, status)

        return self.get_metrics()

    def get_metrics(self) -> Dict[str, Any]:
        valid_latencies = [x["latency_ms"] for x in self._history if x["latency_ms"] is not None]
        lost_in_window = sum(1 for x in self._history if x["status"] != "success")
        window_len = len(self._history) if self._history else 1

        loss_percent = round((lost_in_window / window_len) * 100.0, 1)
        curr_lat = valid_latencies[-1] if valid_latencies else 0.0
        min_lat = round(min(valid_latencies), 1) if valid_latencies else 0.0
        max_lat = round(max(valid_latencies), 1) if valid_latencies else 0.0
        avg_lat = round(sum(valid_latencies) / len(valid_latencies), 1) if valid_latencies else 0.0

        # Health status evaluation
        if loss_percent > 15 or (curr_lat > 150):
            health = "Critical"
        elif loss_percent > 3 or (curr_lat > 80):
            health = "Degraded"
        elif curr_lat > 40:
            health = "Moderate"
        else:
            health = "Optimal"

        return {
            "target": self.target_host,
            "is_running": self.is_running,
            "latency_ms": curr_lat,
            "min_latency_ms": min_lat,
            "max_latency_ms": max_lat,
            "avg_latency_ms": avg_lat,
            "jitter_ms": round(self._jitter, 2),
            "packet_loss_percent": loss_percent,
            "health": health,
            "total_sent": self.total_sent,
            "total_received": self.total_received,
            "total_lost": self.total_lost,
            "history": list(self._history)
        }

    def _save_measurement(self, latency_ms: Optional[float], status: str):
        # Sample save every 2 pings to prevent SQLite bloat
        if self.total_sent % 2 == 0:
            db = SessionLocal()
            try:
                lost_in_window = sum(1 for x in self._history if x["status"] != "success")
                loss_pct = (lost_in_window / len(self._history)) * 100.0 if self._history else 0.0
                rec = PingMeasurement(
                    target_host=self.target_host,
                    latency_ms=latency_ms,
                    packet_loss_percent=round(loss_pct, 1),
                    jitter_ms=round(self._jitter, 2),
                    status=status
                )
                db.add(rec)
                db.commit()
            except Exception:
                pass
            finally:
                db.close()

ping_analyzer = PingAnalyzer()
