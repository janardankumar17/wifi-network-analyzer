import asyncio
import socket
import struct
import time
import threading
import psutil
from typing import Dict, Any, List, Optional
from datetime import datetime

from ..database import SessionLocal
from ..models.tcp_udp import TcpUdpBenchmarkResult
from ..websocket.manager import manager

class TcpUdpAnalyzer:
    def __init__(self):
        self.is_benchmarking = False
        self.last_benchmark_result: Optional[Dict[str, Any]] = None

    def get_connections(
        self,
        protocol: Optional[str] = None,
        state: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 150
    ) -> Dict[str, Any]:
        """
        Controlled connection monitoring: lists active TCP and UDP sockets with state,
        endpoints, and owning process name.
        """
        results = []
        state_distribution: Dict[str, int] = {}
        process_counts: Dict[str, int] = {}

        try:
            for conn in psutil.net_connections(kind="inet"):
                # 1 = SOCK_STREAM (TCP), 2 = SOCK_DGRAM (UDP)
                if conn.type not in (1, 2):
                    continue

                proto = "TCP" if conn.type == 1 else "UDP"
                laddr = f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None
                raddr = f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None
                status = conn.status if proto == "TCP" else "ACTIVE"

                # Track state distribution for TCP
                if proto == "TCP":
                    state_distribution[status] = state_distribution.get(status, 0) + 1

                pid = conn.pid
                pname = "System/Unknown"
                if pid:
                    try:
                        pname = psutil.Process(pid).name()
                    except Exception:
                        pname = "Terminated"

                process_counts[pname] = process_counts.get(pname, 0) + 1

                # Apply filters
                if protocol and protocol.upper() != "ALL" and proto != protocol.upper():
                    continue
                if state and state.upper() != "ALL" and status != state.upper():
                    continue
                if search:
                    s_lower = search.lower()
                    if not (
                        (pname and s_lower in pname.lower()) or
                        (laddr and s_lower in laddr.lower()) or
                        (raddr and s_lower in raddr.lower()) or
                        (status and s_lower in status.lower()) or
                        (str(pid) == s_lower)
                    ):
                        continue

                results.append({
                    "protocol": proto,
                    "local_address": laddr,
                    "remote_address": raddr,
                    "status": status,
                    "pid": pid,
                    "process_name": pname
                })
        except Exception as e:
            return {"error": str(e), "total": 0, "connections": []}

        # Top processes
        top_processes = sorted(
            [{"name": k, "sockets": v} for k, v in process_counts.items()],
            key=lambda x: x["sockets"],
            reverse=True
        )[:8]

        tcp_count = sum(1 for c in results if c["protocol"] == "TCP")
        udp_count = sum(1 for c in results if c["protocol"] == "UDP")

        return {
            "total_connections": len(results),
            "tcp_count": tcp_count,
            "udp_count": udp_count,
            "state_distribution": state_distribution,
            "top_processes": top_processes,
            "connections": results[:limit]
        }

    async def run_tcp_benchmark(self, duration_seconds: float = 3.0) -> Dict[str, Any]:
        """
        Controlled rate-limited TCP stream benchmark measuring 3-way handshake RTT,
        sustained throughput, and bytes transferred.
        """
        self.is_benchmarking = True
        try:
            return await asyncio.to_thread(self._execute_tcp_benchmark, duration_seconds)
        finally:
            self.is_benchmarking = False

    def _execute_tcp_benchmark(self, duration_seconds: float) -> Dict[str, Any]:
        # 1. Ephemeral server
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.bind(("127.0.0.1", 0))
        server.listen(1)
        port = server.getsockname()[1]

        received_bytes = 0
        def serve():
            nonlocal received_bytes
            try:
                conn, _ = server.accept()
                while True:
                    data = conn.recv(65536)
                    if not data:
                        break
                    received_bytes += len(data)
                conn.close()
            except Exception:
                pass

        srv_thread = threading.Thread(target=serve)
        srv_thread.start()

        # 2. Measure Handshake Latency
        t_hs_start = time.perf_counter()
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client.connect(("127.0.0.1", port))
        t_hs_end = time.perf_counter()
        handshake_rtt_ms = round((t_hs_end - t_hs_start) * 1000.0, 3)

        # 3. Stream controlled data
        chunk = b"T" * 32768  # 32KB
        bytes_sent = 0
        t_start = time.perf_counter()

        while (time.perf_counter() - t_start) < duration_seconds:
            client.sendall(chunk)
            bytes_sent += len(chunk)

        client.shutdown(socket.SHUT_WR)
        client.close()
        srv_thread.join(timeout=2.0)
        server.close()

        actual_duration = max(time.perf_counter() - t_start, 0.001)
        throughput_mbps = round((bytes_sent * 8) / (actual_duration * 1_000_000), 2)

        res = {
            "protocol": "TCP",
            "direction": "loopback",
            "duration_seconds": round(actual_duration, 2),
            "throughput_mbps": throughput_mbps,
            "total_bytes": bytes_sent,
            "handshake_rtt_ms": handshake_rtt_ms,
            "packets_sent": bytes_sent // len(chunk),
            "packets_received": received_bytes // len(chunk),
            "packet_loss_percent": 0.0,
            "avg_jitter_ms": 0.0,
            "out_of_order_packets": 0,
            "timestamp": datetime.utcnow().isoformat()
        }

        self.last_benchmark_result = res
        self._save_benchmark(res)
        return res

    async def run_udp_benchmark(
        self,
        packet_count: int = 300,
        packet_rate: int = 150,
        payload_size: int = 512
    ) -> Dict[str, Any]:
        """
        Controlled UDP datagram and sequence-number analysis:
        Measures packet sequence ordering, loss %, and RFC 3550 inter-arrival jitter.
        """
        self.is_benchmarking = True
        try:
            return await asyncio.to_thread(
                self._execute_udp_benchmark, packet_count, packet_rate, payload_size
            )
        finally:
            self.is_benchmarking = False

    def _execute_udp_benchmark(
        self,
        packet_count: int,
        packet_rate: int,
        payload_size: int
    ) -> Dict[str, Any]:
        # 1. Ephemeral UDP receiver
        receiver = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        receiver.bind(("127.0.0.1", 0))
        port = receiver.getsockname()[1]

        received_packets: List[tuple[int, float, float]] = [] # (seq, send_time, recv_time)
        def listen():
            receiver.settimeout(1.5)
            while True:
                try:
                    data, _ = receiver.recvfrom(2048)
                    seq, send_t = struct.unpack("!Id", data[:12])
                    recv_t = time.perf_counter()
                    received_packets.append((seq, send_t, recv_t))
                except socket.timeout:
                    break
                except Exception:
                    break

        recv_thread = threading.Thread(target=listen)
        recv_thread.start()

        # 2. Rate-controlled UDP sender
        sender = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        payload = b"U" * payload_size
        interval = 1.0 / max(packet_rate, 10)

        t_start = time.perf_counter()
        for seq in range(packet_count):
            header = struct.pack("!Id", seq, time.perf_counter())
            sender.sendto(header + payload, ("127.0.0.1", port))
            time.sleep(interval)
        t_end = time.perf_counter()

        recv_thread.join(timeout=2.0)
        receiver.close()
        sender.close()

        # 3. Sequence-number analysis
        received_seqs = [x[0] for x in received_packets]
        received_count = len(received_seqs)
        lost_count = packet_count - received_count
        loss_pct = round((lost_count / packet_count) * 100.0, 2) if packet_count > 0 else 0.0

        # Out-of-order and duplicate analysis
        out_of_order = 0
        duplicates = 0
        seen = set()
        max_seen = -1

        for s in received_seqs:
            if s in seen:
                duplicates += 1
            else:
                seen.add(s)

            if s < max_seen:
                out_of_order += 1
            else:
                max_seen = s

        # Jitter calculation (RFC 3550 on packet transit times)
        jitter = 0.0
        if len(received_packets) > 1:
            transit_times = [(r[2] - r[1]) * 1000.0 for r in received_packets]
            diffs = [abs(transit_times[i] - transit_times[i - 1]) for i in range(1, len(transit_times))]
            jitter = round(sum(diffs) / len(diffs), 3) if diffs else 0.0

        total_bytes = received_count * (12 + payload_size)
        duration = max(t_end - t_start, 0.001)
        throughput_mbps = round((total_bytes * 8) / (duration * 1_000_000), 2)

        res = {
            "protocol": "UDP",
            "direction": "loopback",
            "duration_seconds": round(duration, 2),
            "throughput_mbps": throughput_mbps,
            "total_bytes": total_bytes,
            "packets_sent": packet_count,
            "packets_received": received_count,
            "packets_lost": lost_count,
            "packet_loss_percent": loss_pct,
            "out_of_order_packets": out_of_order,
            "duplicate_packets": duplicates,
            "avg_jitter_ms": jitter,
            "timestamp": datetime.utcnow().isoformat()
        }

        self.last_benchmark_result = res
        self._save_benchmark(res)
        return res

    def _save_benchmark(self, res: Dict[str, Any]):
        db = SessionLocal()
        try:
            rec = TcpUdpBenchmarkResult(
                protocol=res["protocol"],
                direction=res.get("direction", "loopback"),
                duration_seconds=res["duration_seconds"],
                throughput_mbps=res["throughput_mbps"],
                total_bytes=res["total_bytes"],
                packets_sent=res.get("packets_sent", 0),
                packets_received=res.get("packets_received", 0),
                packet_loss_percent=res.get("packet_loss_percent", 0.0),
                avg_jitter_ms=res.get("avg_jitter_ms", 0.0),
                out_of_order_packets=res.get("out_of_order_packets", 0)
            )
            db.add(rec)
            db.commit()
        except Exception:
            pass
        finally:
            db.close()

tcp_udp_analyzer = TcpUdpAnalyzer()
