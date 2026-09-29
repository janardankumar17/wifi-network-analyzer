"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Gauge,
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  Server,
  Play,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3
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
  startSpeedTest,
  fetchSpeedTestStatus,
  fetchLatestSpeedTest,
  fetchSpeedTestHistory
} from "@/lib/api";
import {
  SpeedTestResult,
  SpeedTestStatus,
  SpeedTestHistoryPoint
} from "@/types";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function SpeedTestPage() {
  const [status, setStatus] = useState<SpeedTestStatus>({
    is_running: false,
    status: "idle",
    progress: 0,
    current_speed_mbps: 0,
    last_result: null
  });
  const [history, setHistory] = useState<SpeedTestHistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { lastMessage } = useWebSocket();

  // Load initial data
  const loadInitial = async () => {
    try {
      const [st, hist] = await Promise.allSettled([
        fetchSpeedTestStatus(),
        fetchSpeedTestHistory(15)
      ]);
      if (st.status === "fulfilled") setStatus(st.value);
      if (hist.status === "fulfilled") setHistory(hist.value);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const isRunning = Boolean(status.is_running && status.status !== "completed" && status.status !== "error");

  // Listen to live WebSocket speed test progress
  useEffect(() => {
    if (lastMessage && lastMessage.type === "speed_test_progress" && lastMessage.data) {
      const live: SpeedTestStatus = lastMessage.data;
      const running = Boolean(live.status !== "completed" && live.status !== "error" && live.is_running);
      setStatus({ ...live, is_running: running });

      // If test just completed, reload history
      if (live.status === "completed" && live.last_result) {
        fetchSpeedTestHistory(15).then(setHistory);
      }
    }
  }, [lastMessage]);

  // Polling fallback while test is actively running
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(async () => {
      try {
        const live = await fetchSpeedTestStatus();
        if (live) {
          const running = Boolean(live.status !== "completed" && live.status !== "error" && live.is_running);
          setStatus({ ...live, is_running: running });
          if (!running && live.status === "completed" && live.last_result) {
            fetchSpeedTestHistory(15).then(setHistory);
          }
        }
      } catch (e) {
        // ignore
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStartTest = async () => {
    if (isRunning) return;
    try {
      await startSpeedTest();
      setStatus({
        is_running: true,
        status: "starting",
        progress: 5,
        current_speed_mbps: 0,
        last_result: null
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Speed gauge calculations
  const displaySpeed = useMemo(() => {
    if (isRunning) {
      return status.current_speed_mbps || 0;
    }
    if (status.status === "completed" && status.last_result?.download_mbps) {
      return status.last_result.download_mbps;
    }
    return status.current_speed_mbps || status.last_result?.download_mbps || 0;
  }, [status, isRunning]);

  // Dynamic max scale for gauge
  const maxScale = useMemo(() => {
    const val = displaySpeed || 0;
    if (val > 100) return 250;
    if (val > 50) return 100;
    return 50;
  }, [displaySpeed]);

  // Compute gauge needle rotation (-90deg to +90deg)
  const ratio = Math.max(0, Math.min(displaySpeed / maxScale, 1.0));
  const needleRotation = -90 + ratio * 180;
  const strokeDashoffset = 251.3 * (1 - ratio);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Gauge className="w-6 h-6 text-amber-400" />
            Network Speed & Bandwidth Benchmark
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time streaming download/upload throughput and multi-point latency profiling.
          </p>
        </div>

        <button
          onClick={handleStartTest}
          disabled={isRunning}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg ${
            isRunning
              ? "bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-700"
              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-amber-500/20"
          }`}
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              Testing ({status.progress}%)
            </>
          ) : status.status === "completed" ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Run Test Again
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Start Speed Test
            </>
          )}
        </button>
      </div>

      {/* Main Gauge & Live Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Speedometer Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-surface border border-gray-800/80 flex flex-col items-center justify-between relative overflow-hidden">
          {/* Active phase badge */}
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs uppercase font-semibold tracking-wider text-gray-400">
              Live Bandwidth Gauge
            </span>
            <span
              className={`text-xs px-3 py-1 rounded-full font-mono font-medium uppercase border ${
                status.status === "download"
                  ? "bg-cyan-950/80 text-cyan-400 border-cyan-800 animate-pulse"
                  : status.status === "upload"
                  ? "bg-amber-950/80 text-amber-400 border-amber-800 animate-pulse"
                  : status.status === "ping"
                  ? "bg-purple-950/80 text-purple-400 border-purple-800 animate-pulse"
                  : status.status === "completed"
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                  : "bg-gray-900 text-gray-400 border-gray-800"
              }`}
            >
              {isRunning
                ? status.status === "download"
                  ? "Testing Download..."
                  : status.status === "upload"
                  ? "Testing Upload..."
                  : status.status === "ping"
                  ? "Measuring Ping..."
                  : `Testing ${status.status}...`
                : status.status === "completed"
                ? "Completed"
                : "Ready"}
            </span>
          </div>

          {/* SVG Gauge */}
          <div className="relative w-80 h-48 flex flex-col items-center justify-end my-2">
            <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
              {/* Background Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#1f2937"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Colored Track Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#speedGradient)"
                strokeWidth="14"
                strokeDasharray="251.3"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                opacity={ratio > 0.005 ? 1 : 0}
                className="transition-all duration-150 ease-out"
              />
              <defs>
                <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>

              {/* Gauge Tick Labels */}
              <text x="20" y="118" fill="#6b7280" fontSize="9" textAnchor="middle" fontWeight="bold">0</text>
              <text x="100" y="15" fill="#6b7280" fontSize="9" textAnchor="middle" fontWeight="bold">{maxScale / 2}</text>
              <text x="180" y="118" fill="#6b7280" fontSize="9" textAnchor="middle" fontWeight="bold">{maxScale}</text>

              {/* Gauge Needle */}
              <g
                transform={`rotate(${needleRotation}, 100, 100)`}
                className="transition-transform duration-150 ease-out"
              >
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="30"
                  stroke="#f97316"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="100" r="6" fill="#f97316" />
                <circle cx="100" cy="100" r="2.5" fill="#fff" />
              </g>
            </svg>

            {/* Center Speed Display */}
            <div className="absolute bottom-1 text-center pointer-events-none">
              <div className="text-4xl font-extrabold text-white font-mono tracking-tight">
                {displaySpeed.toFixed(1)}
              </div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
                {isRunning ? (status.status === "upload" ? "Upload Mbps" : "Download Mbps") : "Mbps"}
              </div>
            </div>
          </div>

          {/* Test Progress Step Indicators */}
          <div className="w-full mt-4 grid grid-cols-3 gap-2 border-t border-gray-800/80 pt-4">
            {/* Ping */}
            <div
              className={`p-2.5 rounded-lg border text-center transition ${
                status.status === "ping"
                  ? "bg-purple-950/40 border-purple-500/50 text-purple-400 animate-pulse"
                  : status.progress > 30 || status.last_result?.ping_ms
                  ? "bg-gray-900/60 border-purple-900/40 text-gray-300"
                  : "bg-gray-900/30 border-gray-800 text-gray-500"
              }`}
            >
              <div className="text-[10px] uppercase font-semibold">Latency</div>
              <div className="text-sm font-bold font-mono">
                {status.last_result?.ping_ms ? `${status.last_result.ping_ms} ms` : isRunning && status.status === "ping" ? "Pinging..." : "—"}
              </div>
            </div>

            {/* Download */}
            <div
              className={`p-2.5 rounded-lg border text-center transition ${
                status.status === "download"
                  ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-400 animate-pulse"
                  : status.progress > 70 || status.last_result?.download_mbps
                  ? "bg-gray-900/60 border-cyan-900/40 text-gray-300"
                  : "bg-gray-900/30 border-gray-800 text-gray-500"
              }`}
            >
              <div className="text-[10px] uppercase font-semibold">Download</div>
              <div className="text-sm font-bold font-mono">
                {status.status === "download"
                  ? `${status.current_speed_mbps.toFixed(1)} M`
                  : status.last_result?.download_mbps
                  ? `${status.last_result.download_mbps.toFixed(1)} M`
                  : "—"}
              </div>
            </div>

            {/* Upload */}
            <div
              className={`p-2.5 rounded-lg border text-center transition ${
                status.status === "upload"
                  ? "bg-amber-950/40 border-amber-500/50 text-amber-400 animate-pulse"
                  : status.progress >= 95 || status.last_result?.upload_mbps
                  ? "bg-gray-900/60 border-amber-900/40 text-gray-300"
                  : "bg-gray-900/30 border-gray-800 text-gray-500"
              }`}
            >
              <div className="text-[10px] uppercase font-semibold">Upload</div>
              <div className="text-sm font-bold font-mono">
                {status.status === "upload"
                  ? `${status.current_speed_mbps.toFixed(1)} M`
                  : status.last_result?.upload_mbps
                  ? `${status.last_result.upload_mbps.toFixed(1)} M`
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Panel */}
        <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-semibold text-white mb-1">Benchmark Summary</h3>
            <p className="text-xs text-gray-400">Latest completed performance telemetry</p>
          </div>

          <div className="space-y-3">
            {/* Download Card */}
            <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ArrowDownCircle className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-xs text-gray-400 font-medium">Download Throughput</div>
                  <div className="text-lg font-bold text-white font-mono">
                    {status.last_result?.download_mbps
                      ? `${status.last_result.download_mbps.toFixed(2)} Mbps`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Card */}
            <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ArrowUpCircle className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-xs text-gray-400 font-medium">Upload Throughput</div>
                  <div className="text-lg font-bold text-white font-mono">
                    {status.last_result?.upload_mbps
                      ? `${status.last_result.upload_mbps.toFixed(2)} Mbps`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Latency & Jitter Card */}
            <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs text-gray-400 font-medium">Ping & Jitter</div>
                  <div className="text-sm font-bold text-white font-mono">
                    {status.last_result?.ping_ms ? `${status.last_result.ping_ms} ms` : "—"}{" "}
                    <span className="text-xs text-gray-400 font-normal">
                      (Jitter: {status.last_result?.jitter_ms ? `${status.last_result.jitter_ms}ms` : "0ms"})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Server Location Card */}
            <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-violet-400" />
                <div className="truncate">
                  <div className="text-xs text-gray-400 font-medium">Test Server / POP</div>
                  <div className="text-xs font-mono text-gray-200 truncate">
                    {status.last_result?.server_name || "Cloudflare Edge"}{" "}
                    <span className="text-amber-400">({status.last_result?.server_location || "MAA"})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-2 border-t border-gray-800">
            <Clock className="w-3.5 h-3.5" />
            Last run:{" "}
            {status.last_result?.timestamp
              ? new Date(status.last_result.timestamp).toLocaleTimeString()
              : "Never"}
          </div>
        </div>
      </div>

      {/* Historical Trend Chart */}
      <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              Speed Test History & Trends
            </h3>
            <p className="text-xs text-gray-400">Download and upload speed recorded in SQLite database</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Download (Mbps)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Upload (Mbps)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              No historical speed tests found. Click &quot;Start Speed Test&quot; above to run your first benchmark.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
