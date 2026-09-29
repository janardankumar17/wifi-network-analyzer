"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wifi,
  Gauge,
  Activity,
  Network,
  Globe2,
  History
} from "lucide-react";

const navigationItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Wi-Fi Signal", href: "/wifi", icon: Wifi },
  { name: "Speed Test", href: "/speed", icon: Gauge },
  { name: "Latency & Jitter", href: "/ping", icon: Activity },
  { name: "TCP & UDP Monitor", href: "/tcp-udp", icon: Network },
  { name: "DNS & Route", href: "/dns", icon: Globe2 },
  { name: "History & Logs", href: "/history", icon: History },
];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-gray-800 bg-surface/50 p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <nav className="space-y-1">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Navigation
        </p>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600/15 text-cyan-400 border border-blue-500/30 shadow-sm"
                  : "text-gray-400 hover:text-gray-200 hover:bg-surfaceHover"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-gray-500"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/80 text-xs text-gray-400 space-y-1">
        <div className="flex items-center justify-between font-medium text-gray-300">
          <span>Engine Status</span>
          <span className="text-emerald-400 font-mono">v1.0.0</span>
        </div>
        <p className="text-[11px] text-gray-500">FastAPI + Next.js Scaffolding</p>
      </div>
    </aside>
  );
};
