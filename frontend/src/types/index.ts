export interface WifiStatus {
  connected: boolean;
  interface: string | null;
  adapter?: string | null;
  ssid: string | null;
  bssid: string | null;
  band?: string | null;
  channel: number | null;
  radio_type?: string | null;
  signal_percent: number;
  signal_dbm: number;
  quality: "Excellent" | "Good" | "Fair" | "Poor" | "Disconnected";
  rx_rate_mbps: number;
  tx_rate_mbps: number;
  timestamp: string;
}

export interface WifiHistoryPoint {
  id: number;
  timestamp: string;
  signal_percent: number;
  signal_dbm: number;
  ssid: string | null;
  channel: number | null;
  link_speed_mbps: number | null;
}

export interface NearbyNetwork {
  ssid: string;
  bssid: string | null;
  signal_percent: number;
  channel: number | null;
  band: string | null;
  radio_type: string | null;
  authentication: string | null;
  encryption: string | null;
}

export interface PingHistoryItem {
  timestamp: string;
  latency_ms: number | null;
  status: "success" | "timeout" | "error";
}

export interface PingMetrics {
  target: string;
  is_running?: boolean;
  latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  avg_latency_ms: number;
  jitter_ms: number;
  packet_loss_percent: number;
  health: "Optimal" | "Moderate" | "Degraded" | "Critical";
  total_sent: number;
  total_received: number;
  total_lost: number;
  history?: PingHistoryItem[];
}

export interface TcpUdpConnection {
  protocol: "TCP" | "UDP";
  local_address: string;
  remote_address: string | null;
  status: string;
  pid: number | null;
  process_name: string | null;
}

export interface TopProcessItem {
  name: string;
  sockets: number;
}

export interface TcpUdpConnectionsResponse {
  total_connections: number;
  tcp_count: number;
  udp_count: number;
  state_distribution?: Record<string, number>;
  top_processes?: TopProcessItem[];
  connections: TcpUdpConnection[];
}

export interface TcpUdpBenchmarkResult {
  protocol: "TCP" | "UDP";
  direction?: string;
  duration_seconds: number;
  throughput_mbps: number;
  total_bytes: number;
  handshake_rtt_ms?: number;
  packets_sent: number;
  packets_received: number;
  packets_lost?: number;
  packet_loss_percent: number;
  avg_jitter_ms: number;
  out_of_order_packets: number;
  duplicate_packets?: number;
  timestamp: string;
}

export interface SpeedTestResult {
  download_mbps: number;
  upload_mbps: number;
  ping_ms: number;
  jitter_ms?: number;
  server_name?: string | null;
  server_location?: string | null;
  isp?: string | null;
  timestamp: string | null;
}

export interface SpeedTestStatus {
  is_running: boolean;
  status: "idle" | "starting" | "ping" | "download" | "upload" | "completed" | "error";
  progress: number;
  current_speed_mbps: number;
  last_result: SpeedTestResult | null;
}

export interface SpeedTestHistoryPoint {
  id: number;
  timestamp: string;
  download_mbps: number;
  upload_mbps: number;
  ping_ms: number;
  server_location?: string | null;
}

export interface DnsLookupResult {
  domain: string;
  record_type: string;
  records: string[];
  ttl: number;
  latency_ms: number;
  status: string;
  error?: string | null;
}

export interface DnsProviderBench {
  provider: string;
  server_ip: string;
  latency_ms: number;
  records: string[];
  status: string;
  error?: string | null;
}

export interface DnsBenchmarkResponse {
  domain: string;
  fastest_provider: string | null;
  fastest_latency_ms: number | null;
  providers: DnsProviderBench[];
}

export interface TracerouteHop {
  hop: number;
  ip: string;
  avg_rtt_ms: number | null;
  rtts: number[];
  status: "ok" | "timeout";
  is_private: boolean;
}

export interface TracerouteResponse {
  target: string;
  total_hops: number;
  hops: TracerouteHop[];
  completed: boolean;
  error?: string;
}

// History & Export Types
export interface HistorySummary {
  time_range: string;
  health_score: number;
  grade: string;
  wifi: {
    sample_count: number;
    avg_signal_percent: number;
    current_ssid: string | null;
  };
  ping: {
    sample_count: number;
    avg_latency_ms: number;
    avg_jitter_ms: number;
    packet_loss_percent: number;
  };
  speed: {
    test_count: number;
    avg_download_mbps: number;
    max_download_mbps: number;
    avg_upload_mbps: number;
  };
  benchmarks: {
    total_runs: number;
  };
}

export interface HistoryTrends {
  wifi: { timestamp: string; signal_percent: number; signal_dbm: number; link_speed_mbps: number | null }[];
  ping: { timestamp: string; latency_ms: number; jitter_ms: number; packet_loss_percent: number }[];
  speed: { timestamp: string; download_mbps: number; upload_mbps: number; ping_ms: number }[];
}
