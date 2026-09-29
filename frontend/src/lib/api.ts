import {
  WifiStatus,
  WifiHistoryPoint,
  NearbyNetwork,
  PingMetrics,
  TcpUdpConnectionsResponse,
  TcpUdpBenchmarkResult,
  SpeedTestResult,
  SpeedTestStatus,
  SpeedTestHistoryPoint,
  DnsLookupResult,
  DnsBenchmarkResponse,
  TracerouteResponse,
  HistorySummary,
  HistoryTrends
} from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Wi-Fi APIs
export async function fetchWifiStatus(): Promise<WifiStatus> {
  const res = await fetch(`${API_BASE_URL}/api/wifi/status`);
  if (!res.ok) throw new Error("Failed to fetch Wi-Fi status");
  return res.json();
}

export async function fetchWifiHistory(limit: number = 60): Promise<WifiHistoryPoint[]> {
  const res = await fetch(`${API_BASE_URL}/api/wifi/history?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch Wi-Fi history");
  return res.json();
}

export async function fetchNearbyNetworks(): Promise<NearbyNetwork[]> {
  const res = await fetch(`${API_BASE_URL}/api/wifi/nearby`);
  if (!res.ok) throw new Error("Failed to fetch nearby Wi-Fi networks");
  return res.json();
}

// Speed Test APIs
export async function startSpeedTest(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/speed/start`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to trigger speed test");
  return res.json();
}

export async function fetchSpeedTestStatus(): Promise<SpeedTestStatus> {
  const res = await fetch(`${API_BASE_URL}/api/speed/status`);
  if (!res.ok) throw new Error("Failed to fetch speed test status");
  return res.json();
}

export async function fetchLatestSpeedTest(): Promise<SpeedTestResult> {
  const res = await fetch(`${API_BASE_URL}/api/speed/latest`);
  if (!res.ok) throw new Error("Failed to fetch latest speed test");
  return res.json();
}

export async function fetchSpeedTestHistory(limit: number = 20): Promise<SpeedTestHistoryPoint[]> {
  const res = await fetch(`${API_BASE_URL}/api/speed/history?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch speed test history");
  return res.json();
}

// Ping & Latency Telemetry APIs
export async function fetchPingMetrics(): Promise<PingMetrics> {
  const res = await fetch(`${API_BASE_URL}/api/ping/metrics`);
  if (!res.ok) throw new Error("Failed to fetch ping metrics");
  return res.json();
}

export async function setPingTarget(target: string): Promise<{ status: string; target: string }> {
  const res = await fetch(`${API_BASE_URL}/api/ping/target`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target })
  });
  if (!res.ok) throw new Error("Failed to update ping target");
  return res.json();
}

export async function togglePingMonitor(): Promise<{ is_running: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/ping/toggle`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to toggle ping monitor");
  return res.json();
}

// TCP & UDP Telemetry & Benchmark APIs
export async function fetchTcpUdpConnections(params?: {
  protocol?: string;
  state?: string;
  search?: string;
  limit?: number;
}): Promise<TcpUdpConnectionsResponse> {
  const query = new URLSearchParams();
  if (params?.protocol) query.set("protocol", params.protocol);
  if (params?.state) query.set("state", params.state);
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await fetch(`${API_BASE_URL}/api/tcp-udp/connections?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch TCP/UDP connections");
  return res.json();
}

export async function fetchTcpUdpStats(): Promise<{
  total_connections: number;
  tcp_count: number;
  udp_count: number;
  state_distribution: Record<string, number>;
  top_processes: { name: string; sockets: number }[];
}> {
  const res = await fetch(`${API_BASE_URL}/api/tcp-udp/stats`);
  if (!res.ok) throw new Error("Failed to fetch TCP/UDP stats");
  return res.json();
}

export async function runTcpUdpBenchmark(payload: {
  protocol: "TCP" | "UDP";
  duration_seconds?: number;
  packet_count?: number;
  packet_rate?: number;
}): Promise<TcpUdpBenchmarkResult> {
  const res = await fetch(`${API_BASE_URL}/api/tcp-udp/benchmark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to run TCP/UDP benchmark");
  return res.json();
}

export async function fetchTcpUdpBenchmarkHistory(limit: number = 20): Promise<TcpUdpBenchmarkResult[]> {
  const res = await fetch(`${API_BASE_URL}/api/tcp-udp/benchmark/history?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch benchmark history");
  return res.json();
}

// DNS & Traceroute APIs
export async function fetchDnsLookup(domain: string, recordType: string = "A"): Promise<DnsLookupResult> {
  const res = await fetch(`${API_BASE_URL}/api/dns/lookup?domain=${encodeURIComponent(domain)}&record_type=${recordType}`);
  if (!res.ok) throw new Error("Failed to resolve DNS query");
  return res.json();
}

export async function fetchDnsBenchmark(domain: string = "google.com"): Promise<DnsBenchmarkResponse> {
  const res = await fetch(`${API_BASE_URL}/api/dns/benchmark?domain=${encodeURIComponent(domain)}`);
  if (!res.ok) throw new Error("Failed to benchmark DNS resolvers");
  return res.json();
}

export async function runTraceroute(target: string, maxHops: number = 15): Promise<TracerouteResponse> {
  const res = await fetch(`${API_BASE_URL}/api/dns/traceroute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, max_hops: maxHops })
  });
  if (!res.ok) throw new Error("Failed to run traceroute");
  return res.json();
}

// History & Export APIs
export async function fetchHistorySummary(timeRange: string = "24h"): Promise<HistorySummary> {
  const res = await fetch(`${API_BASE_URL}/api/history/summary?time_range=${timeRange}`);
  if (!res.ok) throw new Error("Failed to fetch historical summary");
  return res.json();
}

export async function fetchHistoryTrends(timeRange: string = "24h"): Promise<HistoryTrends> {
  const res = await fetch(`${API_BASE_URL}/api/history/trends?time_range=${timeRange}`);
  if (!res.ok) throw new Error("Failed to fetch historical trends");
  return res.json();
}

export function getExportDownloadUrl(format: "csv" | "json", module: string = "all"): string {
  return `${API_BASE_URL}/api/history/export?format=${format}&module=${module}`;
}

// System Health API
export async function checkBackendHealth(): Promise<{ status: string; app: string }> {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  if (!res.ok) throw new Error("Backend unreachable");
  return res.json();
}
