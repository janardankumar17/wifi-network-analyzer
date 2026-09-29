from fastapi import APIRouter, Query, Body
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from ..services.dns_tools import dns_tools

router = APIRouter(prefix="/api/dns", tags=["dns"])

class TracerouteRequest(BaseModel):
    target: str = "8.8.8.8"
    max_hops: int = 15

@router.get("/lookup")
def dns_lookup(
    domain: str = Query("google.com", description="Domain to resolve"),
    record_type: str = Query("A", description="Record type: A, AAAA, MX, TXT, CNAME, NS")
):
    """
    Performs standard DNS lookup with timing and record parsing.
    """
    return dns_tools.lookup_records(domain=domain, record_type=record_type)

@router.get("/benchmark")
async def dns_benchmark(
    domain: str = Query("google.com", description="Target domain for resolver benchmark")
):
    """
    Benchmarks resolution latency across multiple public resolvers (Cloudflare, Google, Quad9, OpenDNS, System Default).
    """
    return await dns_tools.benchmark_resolvers(domain=domain)

@router.post("/traceroute")
async def run_traceroute(req: TracerouteRequest):
    """
    Runs hop-by-hop traceroute to target host and returns hop latencies and router addresses.
    """
    return await dns_tools.run_traceroute(target=req.target, max_hops=req.max_hops)
