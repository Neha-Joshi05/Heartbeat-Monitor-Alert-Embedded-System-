import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  Heart,
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  Bell,
  Volume2,
  VolumeX,
  Clock,
  TrendingUp,
  TrendingDown,
  Radio,
  CheckCircle2,
  Filter,
  RadioTower,
  Gauge,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_HISTORY_POINTS = 40;
const MAX_LOG_ENTRIES = 60;
const TICK_INTERVAL_MS = 1500;
const BASELINE_BPM = 75;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(date) {
  return date.toLocaleTimeString("en-US", { hour12: true });
}

function formatUptime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function getStatus(bpm, low, high) {
  if (bpm < low) return "LOW";
  if (bpm > high) return "HIGH";
  return "NORMAL";
}

const STATUS_META = {
  NORMAL: {
    label: "NORMAL",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
    stroke: "#34d399",
  },
  HIGH: {
    label: "CRITICAL HIGH",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    dot: "bg-rose-400",
    stroke: "#fb7185",
  },
  LOW: {
    label: "CRITICAL LOW",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    dot: "bg-rose-400",
    stroke: "#fb7185",
  },
};

// ---------------------------------------------------------------------------
// Reusable glass card wrapper
// ---------------------------------------------------------------------------
function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------
export default function App() {
  const [bpm, setBpm] = useState(BASELINE_BPM);
  const [history, setHistory] = useState(() =>
    Array.from({ length: MAX_HISTORY_POINTS }, (_, i) => ({
      t: i,
      bpm: BASELINE_BPM + Math.round(Math.sin(i / 3) * 3),
    }))
  );
  const [peakBpm, setPeakBpm] = useState(BASELINE_BPM);
  const [lowestBpm, setLowestBpm] = useState(BASELINE_BPM);
  const [lastSync, setLastSync] = useState(new Date());
  const [uptimeSec, setUptimeSec] = useState(0);
  const [connected, setConnected] = useState(true);
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState("all"); // 'all' | 'alerts'

  const [lowThreshold, setLowThreshold] = useState(60);
  const [highThreshold, setHighThreshold] = useState(100);
  const [muted, setMuted] = useState(false);
  const [testAlertUntil, setTestAlertUntil] = useState(0);

  const tickCount = useRef(0);

  const status = getStatus(bpm, lowThreshold, highThreshold);
  const isAlert = status !== "NORMAL" || Date.now() < testAlertUntil;
  const effectiveStatus = Date.now() < testAlertUntil ? "HIGH" : status;
  const meta = STATUS_META[effectiveStatus];

  const addLog = useCallback((message, bpmVal, statusVal) => {
    setLogs((prev) => {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: formatTime(new Date()),
        message,
        bpm: bpmVal,
        status: statusVal,
      };
      return [entry, ...prev].slice(0, MAX_LOG_ENTRIES);
    });
  }, []);

  // ---- Mock telemetry generator ----
  useEffect(() => {
    const interval = setInterval(() => {
      tickCount.current += 1;

      setBpm((prevBpm) => {
        // Random-walk with occasional simulated excursions for demo purposes
        let delta = (Math.random() - 0.5) * 6;

        // Cyclical bias so viewers reliably see NORMAL / HIGH / LOW states
        const cyclePos = tickCount.current % 40;
        if (cyclePos > 32 && cyclePos <= 36) {
          delta += 6; // simulate rising toward tachycardia
        } else if (cyclePos > 12 && cyclePos <= 16) {
          delta -= 5; // simulate dipping toward bradycardia
        }

        let next = prevBpm + delta;
        next = Math.max(38, Math.min(150, next));
        next = Math.round(next);

        setPeakBpm((p) => Math.max(p, next));
        setLowestBpm((l) => Math.min(l, next));

        const nextStatus = getStatus(next, lowThreshold, highThreshold);

        setHistory((prevHist) => {
          const point = { t: prevHist[prevHist.length - 1].t + 1, bpm: next };
          const updated = [...prevHist, point];
          return updated.length > MAX_HISTORY_POINTS
            ? updated.slice(updated.length - MAX_HISTORY_POINTS)
            : updated;
        });

        if (nextStatus === "NORMAL") {
          if (tickCount.current % 4 === 0) {
            addLog("Signal OK", next, "NORMAL");
          }
        } else {
          addLog(
            nextStatus === "HIGH"
              ? "High BPM alert triggered"
              : "Low BPM alert triggered",
            next,
            nextStatus
          );
        }

        return next;
      });

      setLastSync(new Date());
      setConnected(Math.random() > 0.02); // rare simulated dropout
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [lowThreshold, highThreshold, addLog]);

  // ---- Uptime clock ----
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      setUptimeSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleTestAlert = () => {
    setTestAlertUntil(Date.now() + 4000);
    addLog("Manual test alert triggered", bpm, "HIGH");
  };

  const filteredLogs =
    logFilter === "alerts" ? logs.filter((l) => l.status !== "NORMAL") : logs;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans px-4 py-6 md:px-8 md:py-8">
      {/* Background ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* ---------------- Header ---------------- */}
        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">
              <RadioTower className="w-3.5 h-3.5" />
              Embedded Systems &middot; Live Telemetry
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Patient Heartbeat Telemetry
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Real-time BPM monitoring &middot; ESP32 / Arduino + Pulse Sensor
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium ${
                connected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                }`}
              />
              {connected ? "ESP32 Connected via Wi-Fi" : "Signal Lost"}
              {connected ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
        </header>

        {/* ---------------- Alert Banner ---------------- */}
        {isAlert && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-500/40 px-5 py-3.5 text-rose-300 animate-flash-alert">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              {effectiveStatus === "HIGH"
                ? "Critical High BPM detected — reading is above the configured threshold."
                : "Critical Low BPM detected — reading is below the configured threshold."}
              {muted && (
                <span className="ml-2 text-rose-400/70">(Buzzer muted)</span>
              )}
            </p>
          </div>
        )}

        {/* ---------------- KPI Row ---------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Current BPM */}
          <GlassCard className="p-5 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Current BPM
              </span>
              <Heart
                className={`w-5 h-5 ${
                  effectiveStatus === "NORMAL" ? "text-emerald-400" : "text-rose-400"
                } animate-pulse-glow`}
                fill="currentColor"
              />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">{bpm}</span>
              <span className="text-slate-500 text-sm">bpm</span>
            </div>
            <div
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.badgeClass}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </div>
          </GlassCard>

          {/* Peak / Lowest */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Peak BPM
              </span>
              <TrendingUp className="w-4 h-4 text-rose-400/70" />
            </div>
            <div className="text-3xl font-bold tabular-nums">{peakBpm}</div>
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Lowest
              </span>
              <TrendingDown className="w-4 h-4 text-sky-400/70" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-slate-300">
              {lowestBpm}
            </div>
          </GlassCard>

          {/* Connection status */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Sensor Status
              </span>
              <Radio className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connected ? "bg-emerald-400" : "bg-rose-400"
                } animate-pulse`}
              />
              <span className="text-sm font-semibold">
                {connected ? "Connected" : "Reconnecting…"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              ESP32 &middot; Pulse Sensor &middot; Serial/Wi-Fi
            </p>
          </GlassCard>

          {/* Uptime */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                System Uptime
              </span>
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {formatUptime(uptimeSec)}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Last sync: {formatTime(lastSync)}
            </p>
          </GlassCard>
        </div>

        {/* ---------------- Main Grid: Chart + Controls ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Waveform */}
          <GlassCard className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h2 className="font-semibold text-sm">Live BPM Waveform</h2>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.badgeClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="t" hide />
                  <YAxis
                    domain={[30, 160]}
                    stroke="rgba(148,163,184,0.4)"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    labelFormatter={() => ""}
                    formatter={(value) => [`${value} bpm`, "BPM"]}
                  />
                  <ReferenceLine
                    y={highThreshold}
                    stroke="#fb7185"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <ReferenceLine
                    y={lowThreshold}
                    stroke="#fb7185"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="bpm"
                    stroke={meta.stroke}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={300}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Threshold & Alert Control Panel */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <Gauge className="w-4 h-4 text-amber-400" />
              <h2 className="font-semibold text-sm">Threshold &amp; Alert Control</h2>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">Low Threshold</span>
                  <span className="font-semibold text-sky-400 tabular-nums">
                    {lowThreshold} bpm
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="80"
                  value={lowThreshold}
                  onChange={(e) => setLowThreshold(Number(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">High Threshold</span>
                  <span className="font-semibold text-rose-400 tabular-nums">
                    {highThreshold} bpm
                  </span>
                </div>
                <input
                  type="range"
                  min="90"
                  max="160"
                  value={highThreshold}
                  onChange={(e) => setHighThreshold(Number(e.target.value))}
                  className="w-full accent-rose-400"
                />
              </div>

              <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {muted ? (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="text-sm">Buzzer / LED</span>
                </div>
                <button
                  onClick={() => setMuted((m) => !m)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    muted ? "bg-slate-700" : "bg-emerald-500/70"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      muted ? "translate-x-0.5" : "translate-x-5"
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={handleTestAlert}
                className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-sm font-semibold py-2.5 flex items-center justify-center gap-2 transition-colors"
              >
                <Bell className="w-4 h-4" />
                Trigger Test Alert
              </button>
            </div>
          </GlassCard>
        </div>

        {/* ---------------- Telemetry Log Table ---------------- */}
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-sm">Serial / Device Telemetry Logs</h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <button
                onClick={() => setLogFilter("all")}
                className={`px-3 py-1.5 rounded-full border transition-colors ${
                  logFilter === "all"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 text-slate-500 hover:text-slate-300"
                }`}
              >
                All Logs
              </button>
              <button
                onClick={() => setLogFilter("alerts")}
                className={`px-3 py-1.5 rounded-full border transition-colors ${
                  logFilter === "alerts"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                    : "border-white/10 text-slate-500 hover:text-slate-300"
                }`}
              >
                Alert Logs
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-white/5">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
                <tr className="text-left text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Message</th>
                  <th className="px-4 py-2.5 font-medium">BPM</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-600">
                      No log entries yet — telemetry will appear here.
                    </td>
                  </tr>
                )}
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-slate-400 font-mono">{log.time}</td>
                    <td className="px-4 py-2.5 text-slate-300">{log.message}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums">{log.bpm}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_META[log.status].badgeClass}`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <footer className="mt-8 text-center text-[11px] text-slate-600 pb-2">
          Educational embedded systems prototype — not a certified medical
          diagnostic device. Readings shown are simulated for demonstration.
        </footer>
      </div>
    </div>
  );
}
