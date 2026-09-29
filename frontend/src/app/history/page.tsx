"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Download,
  Calendar,
  Activity,
  Wifi,
  Gauge,
  Network,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  TrendingUp,
  Award
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  fetchHistorySummary,
  fetchHistoryTrends,
  getExportDownloadUrl
} from "@/lib/api";
import {
  HistorySummary,
  HistoryTrends
} from "@/types";

const TIME_RANGES = [
  { label: "Last 1h", value: "1h" },
  { label: "Last 24h", value: "24h" },
  { label: "Last 7d", value: "7d" },
  { label: "Last 30d", value: "30d" },
  { label: "All Time", value: "all" },
];

export default function HistoryAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [trends, setTrends] = useState<HistoryTrends>({ wifi: [], ping: [], speed: [] });
  const [loading, setLoading] = useState(true);

  const loadData = async (range: string) => {
    setLoading(true);
    try {
      const [sumData, trendData] = await Promise.allSettled([
        fetchHistorySummary(range),
        fetchHistoryTrends(range)
      ]);
      if (sumData.status === "fulfilled") setSummary(sumData.value);
      if (trendData.status === "fulfilled") setTrends(trendData.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(timeRange);
  }, [timeRange]);

  const handleExport = (format: "csv" | "json") => {
    const url = getExportDownloadUrl(format, "all");
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-6 h-6 text-amber-400" />
            Historical Trends & Data Logging
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Aggregated performance telemetry, long-term health scores, and exportable network reports.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surfaceHover hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-semibold transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport("json")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surfaceHover hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-semibold transition"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Time Range Filter Bar */}
      <div className="p-4 rounded-xl bg-surface border border-gray-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Time Range:
          </span>
          <div className="flex items-center gap-1.5">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  timeRange === r.value
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                    : "bg-gray-900 text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs text-gray-500 font-mono hidden sm:block">
          Aggregated over {timeRange.toUpperCase()}
        </span>
      </div>

      {/* Network Health Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Health Score Card */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Network Health Score</span>
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <div className="my-3 flex items-baseline gap-3">
            <div className="text-4xl font-extrabold text-white font-mono">
              {summary ? summary.health_score : "—"}
            </div>
            <span className="text-sm text-gray-500">/ 100</span>
            <span
              className={`text-sm px-2.5 py-0.5 rounded-full border font-bold ${
                summary?.grade === "A+" || summary?.grade === "A"
                  ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                  : summary?.grade === "B"
                  ? "bg-cyan-950 text-cyan-400 border-cyan-800"
                  : "bg-amber-950 text-amber-400 border-amber-800"
              }`}
            >
              Grade {summary?.grade || "A"}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 border-t border-gray-800/80 pt-2">
            Composite stability index from signal, packet loss, and jitter.
          </p>
        </div>

        {/* Wi-Fi Summary Card */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Wi-Fi Telemetry</span>
            <Wifi className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-white">
              {summary ? `${summary.wifi.avg_signal_percent}%` : "—"}
            </div>
            <div className="text-xs text-gray-400 mt-1 truncate">
              SSID: <span className="text-gray-200 font-semibold">{summary?.wifi.current_ssid || "—"}</span>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 border-t border-gray-800/80 pt-2 font-mono">
            {summary?.wifi.sample_count || 0} samples recorded
          </div>
        </div>

        {/* Latency Summary Card */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Ping & Packet Loss</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-white font-mono">
              {summary ? `${summary.ping.avg_latency_ms} ms` : "—"}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Packet Loss:{" "}
              <span
                className={`font-bold font-mono ${
                  (summary?.ping.packet_loss_percent ?? 0) > 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {summary?.ping.packet_loss_percent ?? 0}%
              </span>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 border-t border-gray-800/80 pt-2 font-mono">
            Avg Jitter: {summary?.ping.avg_jitter_ms ?? 0} ms
          </div>
        </div>

        {/* Speed Summary Card */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Throughput Peaks</span>
            <Gauge className="w-5 h-5 text-amber-400" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-white font-mono">
              {summary ? `${summary.speed.max_download_mbps} Mbps` : "—"}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Avg Down: {summary?.speed.avg_download_mbps ?? 0} Mbps
            </div>
          </div>
          <div className="text-[11px] text-gray-500 border-t border-gray-800/80 pt-2 font-mono">
            {summary?.speed.test_count || 0} benchmark tests run
          </div>
        </div>
      </div>

      {/* Historical Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart 1: Wi-Fi Signal Strength (%) */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Wifi className="w-4 h-4 text-cyan-400" />
                Wi-Fi Signal History (%)
              </h3>
              <p className="text-xs text-gray-400">Signal quality variation over selected range</p>
            </div>
            <span className="text-xs text-cyan-400 font-mono">0 - 100%</span>
          </div>

          <div className="h-56 w-full">
            {trends.wifi.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.wifi} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wifiHistGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="timestamp" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#38bdf8" tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="signal_percent"
                    name="Signal"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fill="url(#wifiHistGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                No Wi-Fi trend points recorded in this window.
              </div>
            )}
          </div>
        </div>

        {/* Trend Chart 2: Ping Latency & Jitter (ms) */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Ping Latency & Jitter Evolution
              </h3>
              <p className="text-xs text-gray-400">Round-trip response and RFC 3550 variation</p>
            </div>
            <span className="text-xs text-emerald-400 font-mono">ms</span>
          </div>

          <div className="h-56 w-full">
            {trends.ping.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.ping} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  />
                  <Line
                    type="monotone"
                    dataKey="latency_ms"
                    name="Latency"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="jitter_ms"
                    name="Jitter"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="3 3"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                No latency points recorded in this window.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trend Chart 3: Speed Test History */}
      <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-400" />
              Bandwidth Throughput History
            </h3>
            <p className="text-xs text-gray-400">Download and upload benchmark history in Mbps</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Download
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Upload
            </span>
          </div>
        </div>

        <div className="h-60 w-full">
          {trends.speed.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends.speed} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="timestamp" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} unit="M" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="download_mbps" name="Download" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="upload_mbps" name="Upload" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-500">
              No speed benchmarks recorded in this time range.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
