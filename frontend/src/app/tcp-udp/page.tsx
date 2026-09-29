"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Network,
  Activity,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Play,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  Server,
  Cpu,
  Zap,
  Hash
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import {
  fetchTcpUdpConnections,
  fetchTcpUdpStats,
  runTcpUdpBenchmark,
  fetchTcpUdpBenchmarkHistory
} from "@/lib/api";
import {
  TcpUdpConnectionsResponse,
  TcpUdpBenchmarkResult,
  TcpUdpConnection,
  TopProcessItem
} from "@/types";

const STATE_COLORS: Record<string, string> = {
  ESTABLISHED: "#34d399", // Emerald
  LISTEN: "#38bdf8",      // Cyan
  TIME_WAIT: "#fbbf24",   // Amber
  CLOSE_WAIT: "#fb7185",  // Rose
  SYN_SENT: "#a78bfa",    // Violet
  FIN_WAIT1: "#f472b6",
  FIN_WAIT2: "#c084fc",
  ACTIVE: "#818cf8"
};

export default function TcpUdpPage() {
  const [activeTab, setActiveTab] = useState<"sockets" | "benchmark">("sockets");

  // Sockets state
  const [connData, setConnData] = useState<TcpUdpConnectionsResponse>({
    total_connections: 0,
    tcp_count: 0,
    udp_count: 0,
    state_distribution: {},
    top_processes: [],
    connections: []
  });
  const [protocolFilter, setProtocolFilter] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingSockets, setLoadingSockets] = useState(true);

  // Benchmark state
  const [benchProto, setBenchProto] = useState<"TCP" | "UDP">("TCP");
  const [benchDuration, setBenchDuration] = useState(3.0);
  const [benchPacketCount, setBenchPacketCount] = useState(200);
  const [benchPacketRate, setBenchPacketRate] = useState(150);
  const [isRunningBench, setIsRunningBench] = useState(false);
  const [latestBenchmark, setLatestBenchmark] = useState<TcpUdpBenchmarkResult | null>(null);
  const [benchHistory, setBenchHistory] = useState<TcpUdpBenchmarkResult[]>([]);

  // Load sockets data
  const loadSockets = async () => {
    try {
      const data = await fetchTcpUdpConnections({
        protocol: protocolFilter,
        state: stateFilter,
        search: searchTerm,
        limit: 150
      });
      setConnData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSockets(false);
    }
  };

  // Load benchmark history
  const loadBenchHistory = async () => {
    try {
      const hist = await fetchTcpUdpBenchmarkHistory(10);
      setBenchHistory(hist);
      if (hist.length > 0 && !latestBenchmark) {
        setLatestBenchmark(hist[hist.length - 1]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSockets();
    loadBenchHistory();
    const interval = setInterval(loadSockets, 4000);
    return () => clearInterval(interval);
  }, [protocolFilter, stateFilter, searchTerm]);

  // Execute controlled benchmark
  const handleRunBenchmark = async () => {
    if (isRunningBench) return;
    setIsRunningBench(true);
    try {
      const res = await runTcpUdpBenchmark({
        protocol: benchProto,
        duration_seconds: benchDuration,
        packet_count: benchPacketCount,
        packet_rate: benchPacketRate
      });
      setLatestBenchmark(res);
      await loadBenchHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningBench(false);
    }
  };

  // Prepare chart data for state distribution
  const pieData = useMemo(() => {
    if (!connData.state_distribution) return [];
    return Object.entries(connData.state_distribution).map(([state, count]) => ({
      name: state,
      value: count,
      color: STATE_COLORS[state] || "#94a3b8"
    }));
  }, [connData.state_distribution]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-violet-400" />
            TCP & UDP Telemetry & Sequence Analyzer
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time socket inspection, connection state breakdown, and controlled sequence/jitter benchmarking.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 p-1 bg-surface border border-gray-800 rounded-xl">
          <button
            onClick={() => setActiveTab("sockets")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "sockets"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Live Sockets & States
          </button>
          <button
            onClick={() => setActiveTab("benchmark")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "benchmark"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Controlled Benchmark & Sequences
          </button>
        </div>
      </div>

      {/* Scope Guardrail Banner */}
      <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Active Guardrail Compliance:</span> Benchmarks run in controlled rate-limited mode measuring handshake timing, datagram sequencing, packet loss, and RFC 3550 jitter. Port scanning, security audits, packet flooding, and buffer-bloat monitoring are disabled.
        </div>
      </div>

      {/* TAB 1: LIVE SOCKETS & STATES */}
      {activeTab === "sockets" && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-surface border border-gray-800/80">
              <span className="text-xs uppercase font-semibold text-gray-400">Total Sockets</span>
              <div className="text-3xl font-extrabold text-white font-mono mt-1">
                {connData.total_connections}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Active IPv4/IPv6 endpoints</p>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-gray-800/80">
              <span className="text-xs uppercase font-semibold text-cyan-400">TCP Connections</span>
              <div className="text-3xl font-extrabold text-cyan-400 font-mono mt-1">
                {connData.tcp_count}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Streams (ESTABLISHED, LISTEN, etc.)</p>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-gray-800/80">
              <span className="text-xs uppercase font-semibold text-violet-400">UDP Sockets</span>
              <div className="text-3xl font-extrabold text-violet-400 font-mono mt-1">
                {connData.udp_count}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Active datagram endpoints</p>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-gray-800/80">
              <span className="text-xs uppercase font-semibold text-emerald-400">Top Application</span>
              <div className="text-xl font-bold text-white truncate mt-1">
                {connData.top_processes && connData.top_processes.length > 0
                  ? connData.top_processes[0].name
                  : "—"}
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                {connData.top_processes && connData.top_processes.length > 0
                  ? `${connData.top_processes[0].sockets} active sockets`
                  : ""}
              </p>
            </div>
          </div>

          {/* Grid: Donut Chart of States + Top Processes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TCP Connection State Donut Chart */}
            <div className="p-5 rounded-xl bg-surface border border-gray-800/80 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white">TCP State Distribution</h3>
                <p className="text-xs text-gray-400">Breakdown by active socket lifecycle state</p>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111827",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-gray-500">No states recorded</div>
                )}
              </div>

              {/* State Legend */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-gray-800">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-300 truncate">{d.name}:</span>
                    <span className="text-white font-bold ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Socket-Consuming Applications */}
            <div className="lg:col-span-2 p-5 rounded-xl bg-surface border border-gray-800/80 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white">Top Applications Consuming Sockets</h3>
                <p className="text-xs text-gray-400">Active process names and socket binding counts</p>
              </div>

              <div className="space-y-2.5">
                {connData.top_processes && connData.top_processes.length > 0 ? (
                  connData.top_processes.map((proc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <Cpu className="w-4 h-4 text-violet-400" />
                        <span className="font-semibold text-xs text-gray-200">{proc.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-28 h-2 bg-gray-800 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-violet-500"
                            style={{
                              width: `${Math.min((proc.sockets / (connData.total_connections || 1)) * 100 * 2, 100)}%`
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-violet-300">
                          {proc.sockets} sockets
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-gray-500">Loading top applications...</div>
                )}
              </div>
            </div>
          </div>

          {/* Sockets Filter & Table */}
          <div className="p-5 rounded-xl bg-surface border border-gray-800/80 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">Active Socket Endpoints</h3>
                <p className="text-xs text-gray-400">Inspecting endpoints, PIDs, and connection states</p>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Protocol Filter */}
                <select
                  value={protocolFilter}
                  onChange={(e) => setProtocolFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="ALL">Protocol: All</option>
                  <option value="TCP">Protocol: TCP</option>
                  <option value="UDP">Protocol: UDP</option>
                </select>

                {/* State Filter */}
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="ALL">State: All</option>
                  <option value="ESTABLISHED">ESTABLISHED</option>
                  <option value="LISTEN">LISTEN</option>
                  <option value="TIME_WAIT">TIME_WAIT</option>
                  <option value="CLOSE_WAIT">CLOSE_WAIT</option>
                </select>

                {/* Search text */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search process or IP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono w-48"
                  />
                </div>
              </div>
            </div>

            {/* Sockets Table */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface">
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
                  {connData.connections.length > 0 ? (
                    connData.connections.map((conn, idx) => (
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
                            className={`text-[11px] font-medium ${
                              conn.status === "ESTABLISHED"
                                ? "text-emerald-400"
                                : conn.status === "LISTEN"
                                ? "text-cyan-400"
                                : conn.status === "TIME_WAIT"
                                ? "text-amber-400"
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
                      <td colSpan={6} className="py-8 text-center text-gray-500 font-sans">
                        {loadingSockets ? "Loading sockets..." : "No connections matching filters."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTROLLED PROTOCOL BENCHMARK & SEQUENCE ANALYSIS */}
      {activeTab === "benchmark" && (
        <div className="space-y-6">
          {/* Benchmark Controls Panel */}
          <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Controlled Socket Performance Benchmark
                </h3>
                <p className="text-xs text-gray-400">
                  Rate-limited micro-benchmarks for TCP handshake/throughput and UDP sequence tracking.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-2 p-1 bg-gray-900 border border-gray-800 rounded-xl">
                <button
                  onClick={() => setBenchProto("TCP")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    benchProto === "TCP"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  TCP Stream & Handshake
                </button>
                <button
                  onClick={() => setBenchProto("UDP")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    benchProto === "UDP"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  UDP Sequence & Jitter
                </button>
              </div>
            </div>

            {/* Benchmark Parameter Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-800/80">
              {benchProto === "TCP" ? (
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1">
                    Test Duration: <span className="text-cyan-400 font-mono font-bold">{benchDuration}s</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={benchDuration}
                    onChange={(e) => setBenchDuration(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-300 block mb-1">
                      Datagram Count: <span className="text-purple-400 font-mono font-bold">{benchPacketCount} packets</span>
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="50"
                      value={benchPacketCount}
                      onChange={(e) => setBenchPacketCount(parseInt(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-300 block mb-1">
                      Packet Rate: <span className="text-purple-400 font-mono font-bold">{benchPacketRate} pkt/s</span>
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      step="25"
                      value={benchPacketRate}
                      onChange={(e) => setBenchPacketRate(parseInt(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </div>
                </>
              )}

              <div className="flex items-end">
                <button
                  onClick={handleRunBenchmark}
                  disabled={isRunningBench}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md ${
                    isRunningBench
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white"
                  }`}
                >
                  <Play className={`w-3.5 h-3.5 fill-current ${isRunningBench ? "animate-spin" : ""}`} />
                  {isRunningBench ? "Executing Benchmark..." : `Run Controlled ${benchProto} Test`}
                </button>
              </div>
            </div>
          </div>

          {/* Benchmark Results Display */}
          {latestBenchmark && (
            <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Latest Benchmark Telemetry ({latestBenchmark.protocol})
                  </h3>
                  <p className="text-xs text-gray-400">
                    Duration: {latestBenchmark.duration_seconds}s | Transferred: {(latestBenchmark.total_bytes / 1024).toFixed(1)} KB
                  </p>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {new Date(latestBenchmark.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* Grid of Results */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Throughput */}
                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                  <div className="text-xs text-gray-400">Throughput</div>
                  <div className="text-2xl font-extrabold text-white font-mono mt-1">
                    {latestBenchmark.throughput_mbps.toFixed(2)} <span className="text-xs font-semibold text-cyan-400">Mbps</span>
                  </div>
                </div>

                {/* Handshake RTT or Jitter */}
                {latestBenchmark.protocol === "TCP" ? (
                  <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                    <div className="text-xs text-gray-400">Handshake RTT</div>
                    <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                      {latestBenchmark.handshake_rtt_ms ? `${latestBenchmark.handshake_rtt_ms} ms` : "—"}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                    <div className="text-xs text-gray-400">RFC 3550 Jitter</div>
                    <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
                      {latestBenchmark.avg_jitter_ms.toFixed(3)} <span className="text-xs font-semibold text-amber-400">ms</span>
                    </div>
                  </div>
                )}

                {/* Sequence Loss % */}
                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                  <div className="text-xs text-gray-400">Sequence Packet Loss</div>
                  <div className="text-2xl font-extrabold font-mono mt-1 text-emerald-400">
                    {latestBenchmark.packet_loss_percent.toFixed(2)}%
                  </div>
                </div>

                {/* Out of order / Duplicates */}
                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                  <div className="text-xs text-gray-400">Out-of-Order / Duplicates</div>
                  <div className="text-2xl font-extrabold text-white font-mono mt-1">
                    {latestBenchmark.out_of_order_packets}{" "}
                    <span className="text-xs text-gray-400 font-normal">
                      / {latestBenchmark.duplicate_packets ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sequence Analysis Card for UDP */}
              {latestBenchmark.protocol === "UDP" && (
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs text-purple-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-purple-400" />
                    <span>
                      Sequence Analysis: Verified {latestBenchmark.packets_sent} transmitted datagrams. Received: {latestBenchmark.packets_received} packets. Dropped: {latestBenchmark.packets_lost ?? 0}.
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-900/50 text-purple-300 font-mono font-semibold">
                    Sequential Integrity 100%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Benchmark History Table */}
          <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 space-y-4">
            <h3 className="text-base font-semibold text-white">Historical Controlled Benchmarks</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Protocol</th>
                    <th className="py-2.5 px-3">Throughput</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Loss %</th>
                    <th className="py-2.5 px-3">Jitter</th>
                    <th className="py-2.5 px-3">Out-of-Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono">
                  {benchHistory.length > 0 ? (
                    benchHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surfaceHover/50 transition">
                        <td className="py-2 px-3 text-gray-400">{item.timestamp}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.protocol === "TCP"
                                ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                                : "bg-purple-950 text-purple-400 border border-purple-800"
                            }`}
                          >
                            {item.protocol}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-white font-bold">{item.throughput_mbps.toFixed(1)} Mbps</td>
                        <td className="py-2 px-3 text-gray-300">{item.duration_seconds}s</td>
                        <td className="py-2 px-3 text-emerald-400">{item.packet_loss_percent}%</td>
                        <td className="py-2 px-3 text-amber-400">{item.avg_jitter_ms.toFixed(2)} ms</td>
                        <td className="py-2 px-3 text-gray-300">{item.out_of_order_packets}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-500 font-sans">
                        No previous benchmark runs found. Run a test above to record telemetry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
