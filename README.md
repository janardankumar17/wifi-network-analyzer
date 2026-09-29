# Wi-Fi & Network Performance Analyzer (NetPulse)

A cross-platform web application for real-time Wi-Fi, ping latency, and controlled TCP/UDP performance and connection analysis.

## Features (Controlled Scope)
- **Wi-Fi Signal Strength & Quality**: Real-time signal strength (dBm & %), SSID, frequency, and channel analytics.
- **Speed & Latency**: Download/Upload performance measurement and historical tests.
- **Packet Loss & Jitter**: Continuous ping telemetry and jitter variation calculation.
- **Controlled TCP & UDP Telemetry**:
  - Live socket connection monitor (endpoints, states, process name & PID).
  - Controlled TCP stream and UDP datagram throughput benchmarking.
  - Sequence-number analysis for packet loss and out-of-order delivery.
  - Handshake round-trip time (RTT) and statistical jitter.
- *(Port scanning, network vulnerability auditing, packet flooding, and low-level buffer-bloat monitoring are disabled by design)*.

## Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide icons, Recharts
- **Backend**: Python 3.11+, FastAPI, Uvicorn, SQLite, SQLAlchemy, WebSockets, psutil

## Quick Start

### 1. Start Backend
```bash
cd backend
# Activate virtual environment
.\venv\Scripts\activate   # Windows
source venv/bin/activate  # macOS / Linux

uvicorn app.main:app --reload --port 8000
```
API Documentation will be available at: http://localhost:8000/docs

### 2. Start Frontend
```bash
cd frontend
npm run dev
```
Dashboard will be available at: http://localhost:3000
