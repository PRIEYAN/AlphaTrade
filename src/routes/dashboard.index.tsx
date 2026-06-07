import { createFileRoute } from "@tanstack/react-router";
import { BrutalCard, StickerTag } from "@/components/brutal";
import { AnimatedNumber } from "@/components/animated-number";
import { mockPortfolioSeries, mockAllocation } from "@/lib/mock/mockData";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { useApp } from "@/lib/store";
import { Play, Square, Power, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

function Overview() {
  const { running, setRunning, autonomous, setAutonomous, killSwitch, setKill } = useApp();
  const [tf, setTf] = useState<"24h" | "7d" | "30d">("30d");
  const series = tf === "24h" ? mockPortfolioSeries.slice(-2) : tf === "7d" ? mockPortfolioSeries.slice(-7) : mockPortfolioSeries;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <StickerTag tone="cyan">Live</StickerTag>
          <h1 className="font-display text-4xl md:text-5xl uppercase mt-2">Overview</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Portfolio Value" value={<><span className="text-2xl">$</span><AnimatedNumber value={19450} /></>} tone="paper" />
        <Kpi label="24h PnL %" value={<>+<AnimatedNumber value={4.8} suffix="%" /></>} tone="lime" />
        <Kpi label="Total PnL %" value={<>+<AnimatedNumber value={28.3} suffix="%" /></>} tone="pink" />
        <Kpi label="Active Since" value={<><AnimatedNumber value={42} suffix=" days" /></>} tone="cyan" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <BrutalCard className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between">
            <div className="font-display uppercase">Portfolio</div>
            <div className="flex gap-1">
              {(["24h", "7d", "30d"] as const).map((t) => (
                <button key={t} onClick={() => setTf(t)}
                  className={`border-brutal px-2 py-1 font-display text-xs uppercase shadow-brutal-sm ${tf === t ? "bg-pink translate-x-[2px] translate-y-[2px] shadow-none" : "bg-paper hover:bg-lime"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.27 6)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="oklch(0.68 0.27 6)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#0a0a0a" style={{ fontFamily: "JetBrains Mono", fontSize: 11 }} />
                <YAxis stroke="#0a0a0a" style={{ fontFamily: "JetBrains Mono", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#fff", border: "3px solid #0a0a0a", borderRadius: 0, fontFamily: "JetBrains Mono" }} />
                <Area type="monotone" dataKey="value" stroke="#0a0a0a" strokeWidth={3} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </BrutalCard>

        <BrutalCard className="p-5">
          <div className="font-display uppercase">Allocation</div>
          <div className="h-48 mt-2">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={mockAllocation} dataKey="value" innerRadius={40} outerRadius={70} strokeWidth={3} stroke="#0a0a0a">
                  {mockAllocation.map((d, i) => <Cell key={i} fill={d.color.startsWith("var") ? ["#ff2ea6", "#c8ff2e", "#ff7a1a", "#34d2ff"][i] : d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#fff", border: "3px solid #0a0a0a", borderRadius: 0 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1 text-sm font-mono">
            {mockAllocation.map((a, i) => (
              <li key={a.name} className="flex justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-3 border border-ink" style={{ background: ["#ff2ea6", "#c8ff2e", "#ff7a1a", "#34d2ff"][i] }} />
                  {a.name}
                </span>
                <span>{a.value}%</span>
              </li>
            ))}
          </ul>
        </BrutalCard>
      </div>

      <BrutalCard tone="ink" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-display uppercase text-sm text-paper/70">Agent status</div>
            <div className="font-display text-3xl mt-1 text-paper">{killSwitch ? "PAUSED" : running ? "RUNNING" : "STOPPED"}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-paper font-display text-sm uppercase">
              <input type="checkbox" checked={autonomous} onChange={(e) => setAutonomous(e.target.checked)}
                className="size-5 accent-pink" />
              Autonomous Mode
            </label>
            <button onClick={() => { setRunning(true); toast.success("Agent started"); }}
              disabled={killSwitch}
              className="inline-flex items-center gap-2 border-2 border-paper bg-lime text-ink px-3 py-2 font-display text-xs uppercase shadow-[5px_5px_0_0_#f5f1e0] disabled:opacity-40">
              <Play className="size-4" /> Start
            </button>
            <button onClick={() => { setRunning(false); toast("Agent stopped"); }}
              className="inline-flex items-center gap-2 border-2 border-paper bg-paper text-ink px-3 py-2 font-display text-xs uppercase shadow-[5px_5px_0_0_#c8ff2e]">
              <Square className="size-4" /> Stop
            </button>
            <button onClick={() => { setKill(!killSwitch); toast(killSwitch ? "Kill switch released" : "KILL SWITCH ENGAGED"); }}
              className="inline-flex items-center gap-2 border-2 border-paper bg-destructive text-destructive-foreground px-3 py-2 font-display text-xs uppercase shadow-[5px_5px_0_0_#ff2ea6]">
              <Power className="size-4" /> Kill Switch
            </button>
          </div>
        </div>
        <div className="mt-4 grid sm:grid-cols-3 gap-3 text-paper">
          <Mini label="Decisions today" value="14" />
          <Mini label="Trades today" value="6" />
          <Mini label="Rejected" value="3" />
        </div>
      </BrutalCard>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: React.ReactNode; tone: "paper" | "pink" | "lime" | "cyan" }) {
  return (
    <BrutalCard tone={tone} className="p-4">
      <div className="font-display text-xs uppercase tracking-wider">{label}</div>
      <div className="font-display text-3xl mt-2">{value}</div>
    </BrutalCard>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-paper p-3">
      <div className="font-display text-[10px] uppercase text-paper/60 flex items-center gap-1"><Zap className="size-3" /> {label}</div>
      <div className="font-display text-xl mt-1">{value}</div>
    </div>
  );
}
