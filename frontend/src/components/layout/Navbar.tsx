"use client";

import React, { useEffect, useState } from "react";
import { Wifi, Activity, Server, Radio, RefreshCw } from "lucide-react";
import { checkBackendHealth } from "@/lib/api";

export const Navbar = () => {
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  const checkStatus = async () => {
    try {
      await checkBackendHealth();
      setBackendStatus("online");
    } catch {
      setBackendStatus("offline");
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-gray-800 bg-surface/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-600/20 text-accent-blue border border-blue-500/30">
          <Radio className="w-5 h-5 animate-pulse text-cyan-400" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wide text-white">NetPulse Analyzer</h1>
          <p className="text-xs text-gray-400">Wi-Fi & Network Performance Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Backend status pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-800 bg-gray-900/60 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              backendStatus === "online"
                ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                : backendStatus === "checking"
                ? "bg-amber-400"
                : "bg-rose-500"
            }`}
          />
          <span className="text-gray-300 capitalize">
            Backend: {backendStatus}
          </span>
        </div>

        <button
          onClick={checkStatus}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-surfaceHover transition"
          title="Refresh connection status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
