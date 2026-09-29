"use client";

import React, { useEffect, useState } from "react";
import {
  Wifi,
  Activity,
  Gauge,
  Network,
  Radio,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ShieldCheck
} from "lucide-react";
import {
  fetchWifiStatus,
  fetchPingMetrics,
  fetchTcpUdpConnections,
  fetchLatestSpeedTest
} from "@/lib/api";
import {
  WifiStatus,
  PingMetrics,
  TcpUdpConnectionsResponse,
  SpeedTestResult
} from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function DashboardPage() {
  const [wifi, setWifi] = useState<WifiStatus | null>(null);
  const [ping, setPing] = useState<PingMetrics | null>(null);
  const [tcpUdp, setTcpUdp] = useState<TcpUdpConnectionsResponse | null>(null);
  const [speed, setSpeed] = useState<SpeedTestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { isConnected: isWsConnected } = useWebSocket();

  const loadData = async () => {
    try {
      const [w, p, t, s] = await Promise.allSettled([
        fetchWifiStatus(),
        fetchPingMetrics(),
        fetchTcpUdpConnections(),
        fetchLatestSpeedTest()
      ]);
      if (w.status === "fulfilled") setWifi(w.value);
      if (p.status === "fulfilled") setPing(p.value);
      if (t.status === "fulfilled") setTcpUdp(t.value);
      if (s.status === "fulfilled") setSpeed(s.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Network Performance Dashboard
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400">
              Phase 1 Active
            </span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time cross-platform telemetry, Wi-Fi analytics, and controlled TCP/UDP inspection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-gray-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isWsConnected ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-gray-500"
              }`}
            />
            <span className="text-gray-300">
              WebSocket: {isWsConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Scope banner: explicitly showing user guardrails */}
      <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Controlled Scope Mode:</span>{" "}
          TCP/UDP modules are constrained to controlled throughput, packet loss, jitter, connection state monitoring, and sequence-number analysis. Port scanning, security auditing, packet flooding, and buffer-bloat monitoring are disabled.
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wi-Fi Card */}
        <a
          href="/wifi"
          className="p-5 rounded-xl bg-surface border border-gray-800/80 hover:border-cyan-500/50 hover:bg-surfaceHover/60 transition group block"
        >
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-xs uppercase font-semibold tracking-wider group-hover:text-cyan-400 transition">
              Wi-Fi Signal
            </span>
            <Wifi className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between mb-1">
            <div className="text-2xl font-bold text-white">
              {wifi ? `${wifi.signal_percent}%` : "—"}
            </div>
            {wifi?.quality && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-medium">
                {wifi.quality}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="truncate max-w-[120px]">
              SSID: <span className="text-gray-200 font-medium">{wifi?.ssid || "Scanning"}</span>
            </span>
            <span className="font-mono text-cyan-400">
              {wifi?.signal_dbm ? `${wifi.signal_dbm} dBm` : ""}
            </span>
          </div>
        </a>

        {/* Latency & Jitter Card */}
        <a
          href="/ping"
          className="p-5 rounded-xl bg-surface border border-gray-800/80 hover:border-emerald-500/50 hover:bg-surfaceHover/60 transition group block"
        >
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-xs uppercase font-semibold tracking-wider group-hover:text-emerald-400 transition">
              Latency & Jitter
            </span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between mb-1">
            <div className="text-2xl font-bold text-white font-mono">
              {ping ? `${ping.latency_ms.toFixed(1)} ms` : "—"}
            </div>
            {ping?.health && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">
                {ping.health}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Target: <span className="text-gray-200 font-mono">{ping?.target || "8.8.8.8"}</span></span>
            <span className="font-mono text-emerald-400">
              Jitter: {ping?.jitter_ms ? `${ping.jitter_ms.toFixed(1)}ms` : "0ms"}
            </span>
          </div>
        </a>

        {/* Speed Card */}
        <a
          href="/speed"
          className="p-5 rounded-xl bg-surface border border-gray-800/80 hover:border-amber-500/50 hover:bg-surfaceHover/60 transition group block"
        >
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-xs uppercase font-semibold tracking-wider group-hover:text-amber-400 transition">
              Last Speed Test
            </span>
            <Gauge className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {speed?.download_mbps ? `${speed.download_mbps.toFixed(1)} Mbps` : "Not run yet"}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Upload: {speed?.upload_mbps ? `${speed.upload_mbps.toFixed(1)} Mbps` : "—"}</span>
            <span className="font-mono text-amber-400">
              {speed?.ping_ms ? `${speed.ping_ms.toFixed(0)} ms` : ""}
            </span>
          </div>
        </a>

        {/* TCP/UDP Active Sockets Card */}
        <a
          href="/tcp-udp"
          className="p-5 rounded-xl bg-surface border border-gray-800/80 hover:border-violet-500/50 hover:bg-surfaceHover/60 transition group block"
        >
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-xs uppercase font-semibold tracking-wider group-hover:text-violet-400 transition">
              Active Sockets
            </span>
            <Network className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {tcpUdp ? tcpUdp.total_connections : "—"}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
            <span className="text-cyan-400">TCP: {tcpUdp?.tcp_count ?? 0}</span>
            <span className="text-violet-400">UDP: {tcpUdp?.udp_count ?? 0}</span>
          </div>
        </a>
      </div>

      {/* Active Connections Live Table (Preview) */}
      <div className="rounded-xl bg-surface border border-gray-800/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Active Sockets & Connections</h3>
            <p className="text-xs text-gray-400">Inspecting active endpoints and process ownership</p>
          </div>
          <span className="text-xs text-gray-400">Showing up to 10 entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Protocol</th>
                <th className="py-2.5 px-3">Local Address</th>
                <th className="py-2.5 px-3">Remote Address</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Process</th>
                <th className="py-2.5 px-3">PID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {tcpUdp?.connections && tcpUdp.connections.length > 0 ? (
                tcpUdp.connections.slice(0, 10).map((conn, idx) => (
                  <tr key={idx} className="hover:bg-surfaceHover/50 transition">
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          conn.protocol === "TCP"
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                            : "bg-purple-950 text-purple-400 border border-purple-800"
                        }`}
                      >
                        {conn.protocol}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-300">{conn.local_address || "—"}</td>
                    <td className="py-2 px-3 text-gray-400">{conn.remote_address || "—"}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[11px] ${
                          conn.status === "ESTABLISHED"
                            ? "text-emerald-400 font-medium"
                            : conn.status === "LISTEN"
                            ? "text-cyan-400"
                            : "text-gray-400"
                        }`}
                      >
                        {conn.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans text-gray-200">{conn.process_name || "—"}</td>
                    <td className="py-2 px-3 text-gray-500">{conn.pid || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500 font-sans">
                    {loading ? "Loading active connections..." : "No active connections detected."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
