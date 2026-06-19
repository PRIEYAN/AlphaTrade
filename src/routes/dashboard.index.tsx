import { createFileRoute } from "@tanstack/react-router";
import { BrutalCard, StickerTag } from "@/components/brutal";
import {
  useApp, tradeCounts, paperPnl, MODE_LABELS, MODE_COLORS,
  type TradeRecord, type TradingMode,
} from "@/lib/store";
import { WalletButton } from "@/components/wallet-button";
import { useAccount, useBalance } from "wagmi";
import { appChain } from "@/lib/wagmi";
import { formatUnits } from "viem";
import { useQuery } from "@tanstack/react-query";
import { Play, Square, Power, Zap, PieChart, Wallet, Trash2, Bot, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

function Overview() {
  const {
    running, setRunning, autonomous, setAutonomous, killSwitch, setKill,
    mode, setMode, guardrails, trades, clearTrades,
  } = useApp();
  const counts = tradeCounts(trades);
  const { address, isConnected } = useAccount();
  const { data: bal } = useBalance({ address, chainId: appChain.id, query: { enabled: isConnected } });
  const bnb = bal ? Number(formatUnits(bal.value, bal.decimals)) : null;

  const netCtx = useQuery({
    queryKey: ["bnb-context"],
    queryFn: async () => {
      const r = await fetch("/api/bnb/context");
      return (await r.json()) as { ok: boolean; blockNumber?: number; gasPriceGwei?: number };
    },
    refetchInterval: 15_000,
  });

  const marketQ = useQuery({
    queryKey: ["market"],
    queryFn: async () => {
      const r = await fetch("/api/market?symbol=BNBUSDT");
      return (await r.json()) as { configured: boolean; price?: number; priceChange24h?: number };
    },
    refetchInterval: 30_000,
  });

  const currentPrice = marketQ.data?.price ?? null;
  const pnl = paperPnl(trades, currentPrice);
  const todayTrades = trades.filter((t) => {
    const d = new Date(t.at); const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <StickerTag tone="cyan">Live</StickerTag>
          <h1 className="font-display text-4xl md:text-5xl uppercase mt-2">Overview</h1>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Wallet (BNB)"
          tone="paper"
          value={isConnected ? (bnb !== null ? bnb.toFixed(4) : "…") : "—"}
          sub={isConnected ? "live on-chain" : "not connected"}
        />
        <Kpi
          label="BNB Price"
          tone="lime"
          value={currentPrice ? `$${currentPrice.toFixed(2)}` : "—"}
          sub={
            marketQ.data?.priceChange24h != null
              ? `${marketQ.data.priceChange24h >= 0 ? "+" : ""}${marketQ.data.priceChange24h.toFixed(2)}% 24h`
              : netCtx.data?.ok
                ? `blk ${netCtx.data.blockNumber} · ${netCtx.data.gasPriceGwei?.toFixed(2)} gwei`
                : "BSC Testnet"
          }
        />
        <Kpi
          label="Paper PnL"
          tone="pink"
          value={pnl !== null ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%` : "—"}
          sub={`${counts.simulated} simulated trades`}
        />
        <Kpi label="Today" tone="cyan" value={`${counts.total}`} sub={`${counts.approved} approved · ${counts.rejected} rejected`} />
      </div>

      {/* Mode selector */}
      <BrutalCard className="p-5">
        <div className="font-display uppercase text-sm mb-3">Operating Mode</div>
        <div className="flex flex-wrap gap-2">
          {(["analysis", "paper", "testnet", "mainnet"] as TradingMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); toast(`Mode: ${MODE_LABELS[m]}`); }}
              className={`border-2 border-ink px-3 py-1.5 font-display text-xs uppercase shadow-brutal-sm transition-all ${
                mode === m
                  ? `${MODE_COLORS[m]} translate-x-[2px] translate-y-[2px] shadow-none`
                  : "bg-paper hover:bg-lime"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="mt-2 text-[11px] font-mono text-ink/60">
          {mode === "analysis" && "Signals + AI decision are shown. No trade is recorded."}
          {mode === "paper" && "Full pipeline runs. Trade is logged with real entry price. No transaction submitted."}
          {mode === "testnet" && "Full pipeline. TWAK submits to BNB testnet (no real money)."}
          {mode === "mainnet" && "⚠ Full pipeline. Real BNB mainnet. Gated behind kill switch."}
        </div>
      </BrutalCard>

{/* Agent controls */}
      <BrutalCard tone="ink" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-display uppercase text-sm text-paper/70">Agent status</div>
            <div className="font-display text-3xl mt-1 text-paper">{killSwitch ? "PAUSED" : running ? "RUNNING" : "STOPPED"}</div>
            <div className={`inline-block mt-1 border-2 border-paper px-2 py-0.5 font-display text-xs uppercase ${MODE_COLORS[mode]}`}>
              {MODE_LABELS[mode]}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-paper font-display text-sm uppercase">
              <input type="checkbox" checked={autonomous} onChange={(e) => setAutonomous(e.target.checked)}
                className="size-5 accent-pink" />
              Autonomous
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
        <div className="mt-4 grid sm:grid-cols-4 gap-3 text-paper">
          <Mini label="Decisions today" value={String(counts.total)} />
          <Mini label="Approved" value={String(counts.approved)} />
          <Mini label="Simulated" value={String(counts.simulated)} />
          <Mini label="Rejected" value={String(counts.rejected)} />
        </div>
      </BrutalCard>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Decision feed */}
        <BrutalCard className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between">
            <div className="font-display uppercase">Live Trade Feed</div>
            {trades.length > 0 && (
              <button
                onClick={() => { clearTrades(); toast("Trade log cleared"); }}
                className="inline-flex items-center gap-1 border-2 border-ink bg-card px-2 py-1 font-display text-[10px] uppercase shadow-brutal-sm hover:bg-pink transition-colors"
              >
                <Trash2 className="size-3" /> Clear
              </button>
            )}
          </div>
          {todayTrades.length === 0 ? (
            <EmptyState
              icon={Bot}
              title={running && !killSwitch ? "Waiting for first decision…" : "Agent is stopped"}
              body={
                killSwitch
                  ? "Kill switch is engaged. Release it to let the agent decide."
                  : running
                    ? "The autonomous agent runs a decision cycle on a timer."
                    : "Press START (below) and enable Autonomous Mode."
              }
            />
          ) : (
            <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {todayTrades.map((t) => (
                <TradeRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </BrutalCard>




        {/* Portfolio panel */}
        <BrutalCard className="p-5">
          <div className="font-display uppercase">Portfolio</div>
          {!isConnected ? (
            <EmptyState
              icon={Wallet}
              title="Connect a wallet"
              body="Wallet balance is read from on-chain."
              action={<WalletButton />}
            />
          ) : (
            <div className="mt-4 space-y-3">
              <div className="border-2 border-ink p-3">
                <div className="font-display text-xs uppercase text-ink/60">Native BNB</div>
                <div className="font-display text-2xl mt-1">{bnb !== null ? bnb.toFixed(4) : "…"}</div>
                {currentPrice && bnb !== null && (
                  <div className="font-mono text-xs text-ink/60 mt-1">
                    ≈ ${(bnb * currentPrice).toFixed(2)} USD
                  </div>
                )}
              </div>
              {pnl !== null && (
                <div className={`border-2 border-ink p-3 ${pnl >= 0 ? "bg-lime/30" : "bg-pink/30"}`}>
                  <div className="font-display text-xs uppercase text-ink/60">Paper PnL (avg)</div>
                  <div className="font-display text-2xl mt-1 flex items-center gap-1">
                    {pnl >= 0 ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
                    {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                  </div>
                </div>
              )}
              <EmptyState
                icon={PieChart}
                title="Token allocation"
                body="Per-token breakdown needs a price feed for each asset."
              />
            </div>
          )}
        </BrutalCard>
      </div>

      
    </div>
  );
}

function EmptyState({
  icon: Icon, title, body, action,
}: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="mt-4 border-2 border-dashed border-ink/30 p-6 flex flex-col items-center text-center gap-2">
      <Icon className="size-8 text-ink/40" />
      <div className="font-display uppercase text-sm">{title}</div>
      <p className="text-xs text-ink/60 font-mono max-w-xs">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone: "paper" | "pink" | "lime" | "cyan" }) {
  return (
    <BrutalCard tone={tone} className="p-4">
      <div className="font-display text-xs uppercase tracking-wider">{label}</div>
      <div className="font-display text-3xl mt-2">{value}</div>
      {sub && <div className="font-mono text-[10px] uppercase mt-1 opacity-60">{sub}</div>}
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

function TradeRow({ t }: { t: TradeRecord }) {
  const statusCls =
    t.aiError ? "bg-orange text-ink"
    : t.status === "rejected" ? "bg-destructive text-destructive-foreground"
    : t.status === "executed" ? "bg-lime text-ink"
    : t.status === "simulated" ? "bg-cyan text-ink"
    : "bg-card text-ink";

  const statusLabel =
    t.aiError ? "AI ERROR"
    : t.status === "rejected" ? "REJECTED"
    : t.status === "executed" ? "EXECUTED"
    : t.status === "simulated" ? "SIMULATED"
    : "ANALYSIS";

  const time = new Date(t.at).toLocaleTimeString();

  return (
    <div className="border-2 border-ink bg-paper p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 font-display text-xs uppercase">
          <span className={`border-2 border-ink px-1.5 py-0.5 ${t.action === "hold" ? "bg-card" : t.action === "buy" ? "bg-lime" : "bg-pink"}`}>
            {t.action} {t.action !== "hold" ? `${t.tokenIn}→${t.tokenOut}` : ""}
          </span>
          <span className="font-mono text-[10px] text-ink/50">{t.source} · {MODE_LABELS[t.mode]}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`border-2 border-ink px-1.5 py-0.5 font-display text-[10px] uppercase ${statusCls}`}>{statusLabel}</span>
          <span className="font-mono text-[10px] text-ink/50">{time}</span>
        </div>
      </div>
      <div className="mt-1 font-mono text-[11px] text-ink/70">
        {t.action !== "hold" && <span>size {t.sizePercent}% · conf {(t.confidence * 100).toFixed(0)}% · </span>}
        {t.reasoning}
      </div>
      {(t.aiError || t.riskReason || t.txHash || t.entryPrice) && (
        <div className="mt-1 font-mono text-[10px] flex flex-wrap gap-2">
          {t.aiError && <span className="text-orange">ai: {t.aiError}</span>}
          {!t.aiError && t.riskReason && <span className="text-pink">guardrail: {t.riskReason}</span>}
          {t.entryPrice && <span className="text-ink/60">entry: ${t.entryPrice.toFixed(2)}</span>}
          {t.txHash && <span className="text-ink/60">tx: {t.txHash.slice(0, 14)}…</span>}
        </div>
      )}
    </div>
  );
}
