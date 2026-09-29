"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  RefreshCw,
  Server,
  Zap,
  ShieldAlert,
  ArrowDownRight,
  TrendingDown,
  Globe2
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import {
  fetchPingMetrics,
  setPingTarget,
  togglePingMonitor
} from "@/lib/api";
import {
  PingMetrics,
  PingHistoryItem
} from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";

const PRESET_TARGETS = [
  { name: "Google DNS", host: "8.8.8.8" },
  { name: "Cloudflare", host: "1.1.1.1" },
  { name: "Quad9", host: "9.9.9.9" },
  { name: "OpenDNS", host: "208.67.222.222" },
];

export default function PingAnalyticsPage() {
  const [metrics, setMetrics] = useState<PingMetrics>({
    target: "8.8.8.8",
    is_running: true,
    latency_ms: 0,
    min_latency_ms: 0,
    max_latency_ms: 0,
    avg_latency_ms: 0,
    jitter_ms: 0,
    packet_loss_percent: 0,
    health: "Optimal",
    total_sent: 0,
    total_received: 0,
    total_lost: 0,
    history: []
  });

  const [customTarget, setCustomTarget] = useState("");
  const [updatingTarget, setUpdatingTarget] = useState(false);
  const { lastMessage } = useWebSocket();

  // Load initial ping metrics
  const loadData = async () => {
    try {
      const data = await fetchPingMetrics();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update from WebSocket live telemetry
  useEffect(() => {
    if (lastMessage && lastMessage.type === "telemetry_update" && lastMessage.ping) {
      setMetrics(lastMessage.ping);
    }
  }, [lastMessage]);

  const handleSelectTarget = async (host: string) => {
    setUpdatingTarget(true);
    try {
      await setPingTarget(host);
      await loadData();
    } finally {
      setUpdatingTarget(false);
    }
  };

  const handleCustomTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTarget.trim()) return;
    await handleSelectTarget(customTarget.trim());
    setCustomTarget("");
  };

  const handleToggle = async () => {
    try {
      const res = await togglePingMonitor();
      setMetrics((prev) => ({ ...prev, is_running: res.is_running }));
    } catch (e) {
      console.error(e);
    }
  };

  // Health Color Coding
  const healthBadge = useMemo(() => {
    switch (metrics.health) {
      case "Optimal":
        return {
          text: "Optimal Stability",
          color: "text-emerald-400 bg-emerald-950/60 border-emerald-800",
          icon: CheckCircle2
        };
      case "Moderate":
        return {
          text: "Moderate Stability",
          color: "text-cyan-400 bg-cyan-950/60 border-cyan-800",
          icon: Activity
        };
      case "Degraded":
        return {
          text: "Degraded Connection",
          color: "text-amber-400 bg-amber-950/60 border-amber-800",
          icon: AlertTriangle
        };
      default:
        return {
          text: "Critical Loss / High Ping",
          color: "text-rose-400 bg-rose-950/60 border-rose-800",
          icon: ShieldAlert
        };
    }
  }, [metrics.health]);

  const HealthIcon = healthBadge.icon;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            Packet Loss & Jitter Telemetry
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Continuous real-time ping probing, RFC 3550 jitter calculation, and packet drop monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              metrics.is_running
                ? "bg-amber-950/40 text-amber-300 border-amber-800 hover:bg-amber-900/50"
                : "bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50"
            }`}
          >
            {metrics.is_running ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause Probing
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Resume Probing
              </>
            )}
          </button>
        </div>
      </div>

      {/* Threshold Alert Banner */}
      {metrics.packet_loss_percent > 5 ? (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-white">Threshold Alert: Packet Loss Detected ({metrics.packet_loss_percent}%)</span>
            <p className="text-rose-300/80 mt-0.5">
              The sliding-window packet loss exceeds the 5% threshold. This may indicate Wi-Fi congestion, distance from router, or ISP transit issues.
            </p>
          </div>
        </div>
      ) : metrics.latency_ms > 100 ? (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-white">Notice: High Latency ({metrics.latency_ms} ms)</span>
            <p className="text-amber-300/80 mt-0.5">
              Round-trip response time exceeds 100ms. Gaming and video calls may experience noticeable delays.
            </p>
          </div>
        </div>
      ) : null}

      {/* Target Selector Bar */}
      <div className="p-4 rounded-xl bg-surface border border-gray-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
            Target Host:
          </span>
          {PRESET_TARGETS.map((t) => (
            <button
              key={t.host}
              onClick={() => handleSelectTarget(t.host)}
              disabled={updatingTarget}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                metrics.target === t.host
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                  : "bg-gray-900 text-gray-300 hover:bg-surfaceHover border border-gray-800"
              }`}
            >
              {t.name} ({t.host})
            </button>
          ))}
        </div>

        {/* Custom target input */}
        <form onSubmit={handleCustomTargetSubmit} className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Custom IP or Domain"
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value)}
            className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono w-44"
          />
          <button
            type="submit"
            disabled={updatingTarget || !customTarget.trim()}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
          >
            Set
          </button>
        </form>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Latency Card */}
        <div className="p-5 rounded-xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Current Latency</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white font-mono">
                {metrics.latency_ms.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-emerald-400">ms</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mt-2">
              <span>Min: <span className="text-gray-200">{metrics.min_latency_ms}ms</span></span>
              <span>Avg: <span className="text-cyan-400 font-bold">{metrics.avg_latency_ms}ms</span></span>
              <span>Max: <span className="text-gray-200">{metrics.max_latency_ms}ms</span></span>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
            <span className="text-xs text-gray-400">Status:</span>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1.5 ${healthBadge.color}`}>
              <HealthIcon className="w-3 h-3" />
              {healthBadge.text}
            </span>
          </div>
        </div>

        {/* Jitter Card (RFC 3550) */}
        <div className="p-5 rounded-xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Jitter (RFC 3550)</span>
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white font-mono">
                {metrics.jitter_ms.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-amber-400">ms</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Statistical inter-arrival packet variation. Lower is smoother.
            </p>
          </div>
          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
            <span className="text-gray-400">Quality:</span>
            <span className={`font-semibold ${metrics.jitter_ms < 3 ? "text-emerald-400" : metrics.jitter_ms < 10 ? "text-amber-400" : "text-rose-400"}`}>
              {metrics.jitter_ms < 3 ? "Smooth" : metrics.jitter_ms < 10 ? "Variable" : "Spiking"}
            </span>
          </div>
        </div>

        {/* Packet Loss Card */}
        <div className="p-5 rounded-xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Packet Loss</span>
            <TrendingDown className="w-5 h-5 text-rose-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono ${metrics.packet_loss_percent > 0 ? "text-rose-400" : "text-white"}`}>
                {metrics.packet_loss_percent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${metrics.packet_loss_percent > 0 ? "bg-rose-500" : "bg-emerald-400"}`}
                style={{ width: `${Math.max(metrics.packet_loss_percent, 2)}%` }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400 font-mono">
            <span>Dropped: <span className="text-rose-400">{metrics.total_lost}</span></span>
            <span>Total: <span className="text-gray-200">{metrics.total_sent}</span></span>
          </div>
        </div>

        {/* Transmission Overview Card */}
        <div className="p-5 rounded-xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Probe Target</span>
            <Globe2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="my-2">
            <div className="text-xl font-bold text-white font-mono truncate" title={metrics.target}>
              {metrics.target}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Sent: <span className="text-gray-200 font-mono">{metrics.total_sent}</span> | Recv: <span className="text-emerald-400 font-mono">{metrics.total_received}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
            <span className="text-gray-400">Monitor:</span>
            <span className={`font-medium ${metrics.is_running ? "text-emerald-400 animate-pulse" : "text-gray-500"}`}>
              {metrics.is_running ? "● Active Sampling" : "Paused"}
            </span>
          </div>
        </div>
      </div>

      {/* Latency Timeline Chart */}
      <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Live Latency Timeline & Packet Drop History
            </h3>
            <p className="text-xs text-gray-400">Sliding window timeline recording round-trip times and drops</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Latency (ms)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-0.5 bg-cyan-400" /> Avg Line
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {metrics.history && metrics.history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="timestamp" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#34d399" tick={{ fontSize: 11 }} unit="ms" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [`${value} ms`, "Latency"]}
                />
                {metrics.avg_latency_ms > 0 && (
                  <ReferenceLine
                    y={metrics.avg_latency_ms}
                    stroke="#38bdf8"
                    strokeDasharray="4 4"
                    label={{
                      value: `Avg ${metrics.avg_latency_ms}ms`,
                      fill: "#38bdf8",
                      fontSize: 10,
                      position: "insideTopRight"
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="latency_ms"
                  name="Latency"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#latencyGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-500">
              Gathering ping samples...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
