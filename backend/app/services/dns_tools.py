import asyncio
import subprocess
import platform
import re
import time
import ipaddress
from typing import Dict, Any, List, Optional
import dns.resolver

DNS_PROVIDERS = [
  {"name": "Cloudflare", "ip": "1.1.1.1"},
  {"name": "Google DNS", "ip": "8.8.8.8"},
  {"name": "Quad9", "ip": "9.9.9.9"},
  {"name": "OpenDNS", "ip": "208.67.222.222"},
]

class DnsTools:
    def lookup_records(self, domain: str, record_type: str = "A") -> Dict[str, Any]:
        """
        Resolves specific DNS records (A, AAAA, MX, TXT, CNAME, NS) and measures query latency.
        """
        clean_domain = domain.strip().lower()
        if not clean_domain:
            return {"error": "Domain cannot be empty"}

        rtype = record_type.strip().upper()
        resolver = dns.resolver.Resolver()
        resolver.timeout = 3.0
        resolver.lifetime = 3.0

        t0 = time.perf_counter()
        records = []
        ttl = 300
        status = "success"
        error_msg = None

        try:
            answers = resolver.resolve(clean_domain, rtype)
            ttl = answers.ttl
            for r in answers:
                if rtype == "MX":
                    records.append(f"{r.preference} {r.exchange}")
                else:
                    records.append(str(r))
        except Exception as e:
            status = "error"
            error_msg = str(e)

        t1 = time.perf_counter()
        latency_ms = round((t1 - t0) * 1000.0, 2)

        return {
            "domain": clean_domain,
            "record_type": rtype,
            "records": records,
            "ttl": ttl,
            "latency_ms": latency_ms,
            "status": status,
            "error": error_msg
        }

    async def benchmark_resolvers(self, domain: str = "google.com") -> Dict[str, Any]:
        """
        Benchmarks resolution latency against multiple public DNS providers and system default.
        """
        clean_domain = domain.strip().lower() or "google.com"
        results = []

        # 1. System Default Resolver
        sys_res = await asyncio.to_thread(self._query_resolver, clean_domain, None, "System Default")
        results.append(sys_res)

        # 2. Public DNS Providers
        for prov in DNS_PROVIDERS:
            r = await asyncio.to_thread(self._query_resolver, clean_domain, prov["ip"], prov["name"])
            results.append(r)

        # Determine fastest
        successful = [x for x in results if x["status"] == "success"]
        fastest = min(successful, key=lambda x: x["latency_ms"]) if successful else None

        return {
            "domain": clean_domain,
            "fastest_provider": fastest["provider"] if fastest else None,
            "fastest_latency_ms": fastest["latency_ms"] if fastest else None,
            "providers": results
        }

    def _query_resolver(self, domain: str, server_ip: Optional[str], provider_name: str) -> Dict[str, Any]:
        resolver = dns.resolver.Resolver()
        resolver.timeout = 2.5
        resolver.lifetime = 2.5
        if server_ip:
            resolver.nameservers = [server_ip]

        t0 = time.perf_counter()
        records = []
        status = "success"
        error_msg = None

        try:
            answers = resolver.resolve(domain, "A")
            records = [str(r) for r in answers]
        except Exception as e:
            status = "timeout"
            error_msg = str(e)

        t1 = time.perf_counter()
        latency_ms = round((t1 - t0) * 1000.0, 2)

        return {
            "provider": provider_name,
            "server_ip": server_ip or "Local Gateway",
            "latency_ms": latency_ms if status == "success" else 999.0,
            "records": records[:3],
            "status": status,
            "error": error_msg
        }

    async def run_traceroute(self, target: str, max_hops: int = 15) -> Dict[str, Any]:
        """
        Runs traceroute to target and parses hop-by-hop latency and router IP addresses.
        """
        clean_target = target.strip()
        if not clean_target:
            return {"error": "Target cannot be empty"}

        return await asyncio.to_thread(self._execute_traceroute, clean_target, max_hops)

    def _execute_traceroute(self, target: str, max_hops: int) -> Dict[str, Any]:
        os_name = platform.system()
        hops: List[Dict[str, Any]] = []

        if os_name == "Windows":
            cmd = ["tracert", "-d", "-h", str(max_hops), "-w", "700", target]
        else:
            cmd = ["traceroute", "-n", "-m", str(max_hops), "-w", "1", target]

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20.0)
            output = proc.stdout

            for line in output.splitlines():
                line = line.strip()
                if not line or not line[0].isdigit():
                    continue

                parts = line.split()
                if len(parts) >= 2 and parts[0].isdigit():
                    hop_num = int(parts[0])

                    # Check for timeout lines like: "1 * * * Request timed out."
                    if "Request timed out" in line or (parts[1] == "*" and parts[2] == "*" and parts[3] == "*"):
                        hops.append({
                            "hop": hop_num,
                            "ip": "Request timed out (*)",
                            "avg_rtt_ms": None,
                            "rtts": [],
                            "status": "timeout",
                            "is_private": False
                        })
                        continue

                    # Extract RTTs (e.g. "9 ms 2 ms 2 ms 10.137.244.178")
                    rtts = []
                    ip_candidate = None

                    # Regex match all time values
                    time_matches = re.findall(r"(\d+(?:\.\d+)?)\s*ms", line)
                    for tm in time_matches:
                        try:
                            rtts.append(float(tm))
                        except ValueError:
                            pass

                    # Last element is usually the IP address
                    possible_ip = parts[-1]
                    is_priv = False
                    try:
                        ip_obj = ipaddress.ip_address(possible_ip)
                        ip_candidate = str(ip_obj)
                        is_priv = ip_obj.is_private
                    except ValueError:
                        ip_candidate = possible_ip

                    avg_rtt = round(sum(rtts) / len(rtts), 1) if rtts else None

                    hops.append({
                        "hop": hop_num,
                        "ip": ip_candidate,
                        "avg_rtt_ms": avg_rtt,
                        "rtts": rtts,
                        "status": "ok" if avg_rtt is not None else "timeout",
                        "is_private": is_priv
                    })

            return {
                "target": target,
                "total_hops": len(hops),
                "hops": hops,
                "completed": True
            }

        except subprocess.TimeoutExpired:
            return {
                "target": target,
                "total_hops": len(hops),
                "hops": hops,
                "completed": False,
                "error": "Traceroute exceeded time limit"
            }
        except Exception as e:
            return {
                "target": target,
                "total_hops": 0,
                "hops": [],
                "completed": False,
                "error": str(e)
            }

dns_tools = DnsTools()
