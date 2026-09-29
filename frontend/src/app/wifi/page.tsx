"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Wifi,
  Radio,
  Signal,
  ArrowDownUp,
  Shield,
  Layers,
  RefreshCw,
  Cpu,
  BarChart3,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import {
  fetchWifiStatus,
  fetchWifiHistory,
  fetchNearbyNetworks
} from "@/lib/api";
import {
  WifiStatus,
  WifiHistoryPoint,
  NearbyNetwork
} from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function WifiAnalyticsPage() {
  const [current, setCurrent] = useState<WifiStatus | null>(null);
  const [history, setHistory] = useState<WifiHistoryPoint[]>([]);
  const [nearby, setNearby] = useState<NearbyNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningNearby, setScanningNearby] = useState(false);
  const { isConnected: isWsConnected, lastMessage } = useWebSocket();

  // Load baseline status and history
  const loadInitialData = async () => {
    try {
      const [statusData, historyData] = await Promise.allSettled([
        fetchWifiStatus(),
        fetchWifiHistory(30)
      ]);
      if (statusData.status === "fulfilled") setCurrent(statusData.value);
      if (historyData.status === "fulfilled") setHistory(historyData.value);
    } finally {
      setLoading(false);
    }
  };

  const scanNearbyNetworks = async () => {
    setScanningNearby(true);
    try {
      const nets = await fetchNearbyNetworks();
      setNearby(nets);
    } finally {
      setScanningNearby(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    scanNearbyNetworks();
    const interval = setInterval(loadInitialData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update real-time from WebSocket telemetry stream
  useEffect(() => {
    if (lastMessage && lastMessage.type === "wifi_telemetry" && lastMessage.data) {
      const liveData: WifiStatus = lastMessage.data;
      setCurrent(liveData);

      setHistory((prev) => {
        const newPoint: WifiHistoryPoint = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          signal_percent: liveData.signal_percent,
          signal_dbm: liveData.signal_dbm,
          ssid: liveData.ssid,
          channel: liveData.channel,
          link_speed_mbps: liveData.rx_rate_mbps
        };
        const updated = [...prev, newPoint];
        return updated.slice(-30); // Keep last 30 data points
      });
    }
  }, [lastMessage]);

  // Channel distribution for nearby APs
  const channelData = useMemo(() => {
    const counts: Record<string, number> = {};
    nearby.forEach((net) => {
      const ch = net.channel ? `Ch ${net.channel}` : "Unknown";
      counts[ch] = (counts[ch] || 0) + 1;
    });
    return Object.entries(counts).map(([channel, count]) => ({
      channel,
      count
    }));
  }, [nearby]);

  const qualityColor = useMemo(() => {
    switch (current?.quality) {
      case "Excellent":
        return "text-emerald-400 border-emerald-500/30 bg-emerald-950/40";
      case "Good":
        return "text-cyan-400 border-cyan-500/30 bg-cyan-950/40";
      case "Fair":
        return "text-amber-400 border-amber-500/30 bg-amber-950/40";
      default:
        return "text-rose-400 border-rose-500/30 bg-rose-950/40";
    }
  }, [current?.quality]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Wifi className="w-6 h-6 text-cyan-400" />
            Wi-Fi Signal & Channel Analyzer
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time RSSI signal monitoring, link speed telemetry, and 2.4GHz / 5GHz channel congestion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={scanNearbyNetworks}
            disabled={scanningNearby}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-surfaceHover hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanningNearby ? "animate-spin" : ""}`} />
            {scanningNearby ? "Scanning APs..." : "Rescan Nearby"}
          </button>
        </div>
      </div>

      {/* Primary Status Card Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Signal Strength & Grade */}
        <div className="p-5 rounded-xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Signal Strength</span>
            <Signal className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">
                {current?.signal_percent ?? 0}%
              </span>
              <span className="text-sm font-mono text-cyan-400">
                {current?.signal_dbm ? `${current.signal_dbm} dBm` : "—"}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(current?.signal_percent ?? 0, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Quality Rating:</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${qualityColor}`}>
              {current?.quality ?? "Scanning..."}
            </span>
          </div>
        </div>

        {/* Network & AP Identity */}
        <div className="p-5 rounded-xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Connected AP</span>
            <Radio className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold text-white truncate" title={current?.ssid || ""}>
              {current?.ssid || "Disconnected"}
            </div>
            <div className="text-xs font-mono text-gray-400 truncate mt-1">
              BSSID: {current?.bssid || "—"}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Security: <span className="text-gray-200">WPA2/WPA3</span></span>
            <span className="text-emerald-400 font-medium">
              {current?.connected ? "Active" : "Offline"}
            </span>
          </div>
        </div>

        {/* Frequency Band & Channel */}
        <div className="p-5 rounded-xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Band & Channel</span>
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold text-white">
              Channel {current?.channel || "—"}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Frequency Band: <span className="text-amber-400 font-semibold">{current?.band || "2.4 GHz"}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Protocol:</span>
            <span className="font-mono text-gray-200">{current?.radio_type || "802.11ax"}</span>
          </div>
        </div>

        {/* Link Speed Rates */}
        <div className="p-5 rounded-xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">PHY Link Speed</span>
            <ArrowDownUp className="w-5 h-5 text-violet-400" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold text-white">
              {current?.rx_rate_mbps ? `${current.rx_rate_mbps} Mbps` : "—"}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Receive (Rx) Rate
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Transmit (Tx):</span>
            <span className="font-mono text-violet-300">
              {current?.tx_rate_mbps ? `${current.tx_rate_mbps} Mbps` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Rolling Chart */}
      <div className="p-5 rounded-xl bg-surface border border-gray-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Live Signal Strength History (Rolling 60 Seconds)
            </h3>
            <p className="text-xs text-gray-400">Real-time signal fluctuations and RSSI stability tracking</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Signal (%)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> RSSI (dBm)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="timestamp" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                stroke="#38bdf8"
                tick={{ fontSize: 11 }}
                unit="%"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[-100, -20]}
                stroke="#34d399"
                tick={{ fontSize: 11 }}
                unit="dBm"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="signal_percent"
                name="Signal (%)"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="signal_dbm"
                name="RSSI (dBm)"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Channel Congestion + Nearby Networks Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel Distribution */}
        <div className="p-5 rounded-xl bg-surface border border-gray-800/80 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-white">Channel Congestion</h3>
            <p className="text-xs text-gray-400">Nearby networks detected per Wi-Fi channel</p>
          </div>
          <div className="h-60 w-full">
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="channel" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" name="Networks" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                No channel congestion data available.
              </div>
            )}
          </div>
        </div>

        {/* Nearby Access Points Table */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-surface border border-gray-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Nearby Access Points ({nearby.length})</h3>
              <p className="text-xs text-gray-400">Discovered SSIDs, signals, and radio standards</p>
            </div>
            <span className="text-xs text-gray-400 font-mono">Sorted by signal strength</span>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-gray-800 text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">SSID</th>
                  <th className="py-2.5 px-3">Signal</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Band</th>
                  <th className="py-2.5 px-3">Radio</th>
                  <th className="py-2.5 px-3">Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {nearby.length > 0 ? (
                  nearby.map((net, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-surfaceHover/50 transition ${
                        net.ssid === current?.ssid ? "bg-blue-950/20 font-semibold" : ""
                      }`}
                    >
                      <td className="py-2 px-3 font-sans text-white flex items-center gap-2">
                        {net.ssid === current?.ssid && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400" title="Currently Connected" />
                        )}
                        <span className="truncate max-w-[150px]">{net.ssid}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-semibold ${
                            net.signal_percent >= 70
                              ? "text-emerald-400"
                              : net.signal_percent >= 40
                              ? "text-amber-400"
                              : "text-rose-400"
                          }`}
                        >
                          {net.signal_percent}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-300">
                        {net.channel ? `Ch ${net.channel}` : "—"}
                      </td>
                      <td className="py-2 px-3 text-gray-400">{net.band || "—"}</td>
                      <td className="py-2 px-3 text-gray-400">{net.radio_type || "—"}</td>
                      <td className="py-2 px-3 text-gray-400 truncate max-w-[120px]">
                        {net.authentication || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 font-sans">
                      {scanningNearby ? "Scanning for nearby Wi-Fi networks..." : "No nearby networks found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
