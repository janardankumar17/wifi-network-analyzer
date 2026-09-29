"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Globe2,
  Search,
  Zap,
  Route,
  Server,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  BarChart3,
  Network
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import {
  fetchDnsLookup,
  fetchDnsBenchmark,
  runTraceroute
} from "@/lib/api";
import {
  DnsLookupResult,
  DnsBenchmarkResponse,
  TracerouteResponse,
  TracerouteHop
} from "@/types";

const PRESET_DOMAINS = ["google.com", "cloudflare.com", "github.com", "amazon.com"];
const PRESET_TRACE_TARGETS = ["google.com", "8.8.8.8", "1.1.1.1", "github.com"];
const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"];

export default function DnsAndTraceroutePage() {
  const [activeTab, setActiveTab] = useState<"dns" | "traceroute">("dns");

  // DNS State
  const [domain, setDomain] = useState("google.com");
  const [recordType, setRecordType] = useState("A");
  const [loadingDns, setLoadingDns] = useState(false);
  const [lookupResult, setLookupResult] = useState<DnsLookupResult | null>(null);
  const [benchResult, setBenchResult] = useState<DnsBenchmarkResponse | null>(null);

  // Traceroute State
  const [traceTarget, setTraceTarget] = useState("8.8.8.8");
  const [runningTrace, setRunningTrace] = useState(false);
  const [traceResult, setTraceResult] = useState<TracerouteResponse | null>(null);

  // Initial benchmark run
  useEffect(() => {
    handleRunDns("google.com", "A");
  }, []);

  const handleRunDns = async (targetDomain: string, rtype: string) => {
    setLoadingDns(true);
    try {
      const [lookup, bench] = await Promise.allSettled([
        fetchDnsLookup(targetDomain, rtype),
        fetchDnsBenchmark(targetDomain)
      ]);
      if (lookup.status === "fulfilled") setLookupResult(lookup.value);
      if (bench.status === "fulfilled") setBenchResult(bench.value);
    } finally {
      setLoadingDns(false);
    }
  };

  const handleDnsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    handleRunDns(domain.trim(), recordType);
  };

  const handleRunTrace = async (target: string) => {
    setRunningTrace(true);
    try {
      const res = await runTraceroute(target, 15);
      setTraceResult(res);
    } finally {
      setRunningTrace(false);
    }
  };

  const handleTraceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traceTarget.trim()) return;
    handleRunTrace(traceTarget.trim());
  };

  // Color mapping for DNS benchmark bars
  const dnsChartData = useMemo(() => {
    if (!benchResult?.providers) return [];
    return benchResult.providers.map((p) => ({
      name: p.provider,
      latency: p.latency_ms === 999.0 ? 0 : p.latency_ms,
      isFastest: p.provider === benchResult.fastest_provider
    }));
  }, [benchResult]);

  // Chart data for traceroute latency accumulation
  const traceChartData = useMemo(() => {
    if (!traceResult?.hops) return [];
    return traceResult.hops
      .filter((h) => h.avg_rtt_ms !== null)
      .map((h) => ({
        hop: `Hop ${h.hop}`,
        ip: h.ip,
        rtt: h.avg_rtt_ms
      }));
  }, [traceResult]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-cyan-400" />
            DNS Resolution & Route Path Tracer
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Compare public DNS resolver query speeds and visualize hop-by-hop packet network paths.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-surface border border-gray-800 rounded-xl">
          <button
            onClick={() => setActiveTab("dns")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "dns"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            DNS Resolver Benchmark
          </button>
          <button
            onClick={() => setActiveTab("traceroute")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "traceroute"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Visual Traceroute
          </button>
        </div>
      </div>

      {/* TAB 1: DNS BENCHMARK & LOOKUP */}
      {activeTab === "dns" && (
        <div className="space-y-6">
          {/* Query Bar */}
          <div className="p-4 rounded-xl bg-surface border border-gray-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                Presets:
              </span>
              {PRESET_DOMAINS.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDomain(d);
                    handleRunDns(d, recordType);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    domain === d
                      ? "bg-blue-600/20 text-cyan-400 border border-blue-500/40"
                      : "bg-gray-900 text-gray-300 hover:bg-surfaceHover border border-gray-800"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleDnsSubmit} className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Domain name..."
                className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono w-44"
              />
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              >
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={loadingDns}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                <Search className={`w-3.5 h-3.5 ${loadingDns ? "animate-spin" : ""}`} />
                {loadingDns ? "Querying..." : "Benchmark"}
              </button>
            </form>
          </div>

          {/* Fastest Resolver Banner */}
          {benchResult?.fastest_provider && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs text-emerald-300">
                    Fastest DNS Provider for <span className="font-mono text-white font-bold">{domain}</span>:
                  </div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {benchResult.fastest_provider}{" "}
                    <span className="text-emerald-400 font-mono text-sm">
                      ({benchResult.fastest_latency_ms} ms)
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-700/60 text-emerald-300 font-medium">
                Recommended Provider
              </span>
            </div>
          )}

          {/* Grid: Benchmark Comparison Chart + Resolved Records */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Latency Comparison Chart */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-surface border border-gray-800/80 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Resolver Response Time Comparison (Lower is Faster)
                </h3>
                <p className="text-xs text-gray-400">Response latency in milliseconds across resolvers</p>
              </div>

              <div className="h-60 w-full">
                {dnsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dnsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} unit="ms" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111827",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(val: any) => [`${val} ms`, "Latency"]}
                      />
                      <Bar dataKey="latency" name="Latency (ms)" radius={[4, 4, 0, 0]}>
                        {dnsChartData.map((entry, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={entry.isFastest ? "#34d399" : "#38bdf8"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-500">
                    Running DNS benchmarks...
                  </div>
                )}
              </div>
            </div>

            {/* Resolved Records Card */}
            <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-semibold text-white">Resolved Records</h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950 text-cyan-400 border border-blue-800">
                    {lookupResult?.record_type || recordType}
                  </span>
                </div>
                <p className="text-xs text-gray-400">Query result for {domain}</p>
              </div>

              <div className="space-y-2 flex-1 my-2 overflow-y-auto max-h-48">
                {lookupResult?.records && lookupResult.records.length > 0 ? (
                  lookupResult.records.map((rec, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-gray-900/60 border border-gray-800 font-mono text-xs text-gray-200 break-all"
                    >
                      {rec}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 py-6 text-center">
                    {loadingDns ? "Resolving DNS..." : "No records found."}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-800 text-xs text-gray-400 flex items-center justify-between">
                <span>TTL: <span className="text-white font-mono">{lookupResult?.ttl || 300}s</span></span>
                <span>Latency: <span className="text-cyan-400 font-mono">{lookupResult?.latency_ms || 0} ms</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VISUAL TRACEROUTE */}
      {activeTab === "traceroute" && (
        <div className="space-y-6">
          {/* Target Selector */}
          <div className="p-4 rounded-xl bg-surface border border-gray-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                Targets:
              </span>
              {PRESET_TRACE_TARGETS.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTraceTarget(t);
                    handleRunTrace(t);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    traceTarget === t
                      ? "bg-cyan-600/20 text-cyan-400 border border-cyan-500/40"
                      : "bg-gray-900 text-gray-300 hover:bg-surfaceHover border border-gray-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={handleTraceSubmit} className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={traceTarget}
                onChange={(e) => setTraceTarget(e.target.value)}
                placeholder="IP or Hostname..."
                className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono w-48"
              />
              <button
                type="submit"
                disabled={runningTrace}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                <Route className={`w-3.5 h-3.5 ${runningTrace ? "animate-spin" : ""}`} />
                {runningTrace ? "Tracing Route..." : "Start Trace"}
              </button>
            </form>
          </div>

          {/* Hop Latency Progression Chart */}
          {traceChartData.length > 0 && (
            <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Route className="w-4 h-4 text-cyan-400" />
                  Hop-by-Hop Latency Accumulation
                </h3>
                <p className="text-xs text-gray-400">Response time from local client through intermediate gateways</p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={traceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="hop" stroke="#6b7280" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#38bdf8" tick={{ fontSize: 11 }} unit="ms" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111827",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [`${val} ms`, "Avg Latency"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rtt"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ fill: "#38bdf8", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Visual Pathway & Hop Cards */}
          <div className="p-6 rounded-2xl bg-surface border border-gray-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Network Route Path</h3>
                <p className="text-xs text-gray-400">
                  Target: <span className="text-white font-mono font-bold">{traceResult?.target || traceTarget}</span>{" "}
                  {traceResult?.total_hops ? `(${traceResult.total_hops} hops)` : ""}
                </p>
              </div>
              {runningTrace && (
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Probing network hops...
                </span>
              )}
            </div>

            {/* Hop Cards Progression */}
            <div className="space-y-3">
              {traceResult?.hops && traceResult.hops.length > 0 ? (
                traceResult.hops.map((hop) => (
                  <div
                    key={hop.hop}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      hop.status === "timeout"
                        ? "bg-gray-900/30 border-gray-800/60 opacity-60"
                        : "bg-gray-900/60 border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center font-mono font-bold text-xs text-cyan-400 border border-gray-800">
                        {hop.hop}
                      </div>
                      <div>
                        <div className="font-mono text-xs font-semibold text-white flex items-center gap-2">
                          {hop.ip}
                          {hop.is_private && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-cyan-400 border border-blue-900">
                              LAN Gateway
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                          {hop.rtts && hop.rtts.length > 0
                            ? `Probes: ${hop.rtts.map((r) => `${r}ms`).join(", ")}`
                            : "Packet dropped at gateway"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      {hop.avg_rtt_ms !== null ? (
                        <span className="text-emerald-400 font-bold font-mono">
                          {hop.avg_rtt_ms} ms
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">* * * timed out</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-gray-500">
                  {runningTrace
                    ? "Executing traceroute probes across network routers..."
                    : "Click \"Start Trace\" to map the routing path."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
