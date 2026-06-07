import { createFileRoute } from "@tanstack/react-router";
import { BrutalCard, StickerTag } from "@/components/brutal";
import { useApp } from "@/lib/store";
import { WalletButton } from "@/components/wallet-button";
import { useAccount, useBalance } from "wagmi";
import { bsc } from "wagmi/chains";
import { formatUnits } from "viem";
import { useQuery } from "@tanstack/react-query";
import { Play, Square, Power, Zap, LineChart, PieChart, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

function Overview() {
  const { running, setRunning, autonomous, setAutonomous, killSwitch, setKill, guardrails } = useApp();
  const { address, isConnected } = useAccount();
  const { data: bal } = useBalance({ address, chainId: bsc.id, query: { enabled: isConnected } });
  const bnb = bal ? Number(formatUnits(bal.value, bal.decimals)) : null;
  // Live BNB Smart Chain context (real RPC reads via the BNB agent layer).
  const netCtx = useQuery({
    queryKey: ["bnb-context"],
    queryFn: async () => {
      const r = await fetch("/api/bnb/context");
      return (await r.json()) as { ok: boolean; blockNumber?: number; gasPriceGwei?: number };
    },
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <StickerTag tone="cyan">Live</StickerTag>
          <h1 className="font-display text-4xl md:text-5xl uppercase mt-2">Overview</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Wallet (BNB)"
          tone="paper"
          value={isConnected ? (bnb !== null ? bnb.toFixed(4) : "…") : "—"}
          sub={isConnected ? "live on-chain" : "not connected"}
        />
        <Kpi
          label="Network"
          tone="lime"
          value="BSC · 56"
          sub={
            netCtx.data?.ok
              ? `blk ${netCtx.data.blockNumber} · ${netCtx.data.gasPriceGwei?.toFixed(2)} gwei`
              : "BNB Smart Chain"
          }
        />
        <Kpi
          label="Agent"
          tone="pink"
          value={killSwitch ? "PAUSED" : running ? "RUNNING" : "STOPPED"}
          sub={autonomous ? "autonomous" : "manual"}
        />
        <Kpi label="Allowlist" tone="cyan" value={`${guardrails.allowlist.length}`} sub="tokens enabled" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <BrutalCard className="lg:col-span-2 p-5">
          <div className="font-display uppercase">Portfolio history</div>
          <EmptyState
            icon={LineChart}
            title="No history recorded yet"
            body="Portfolio value over time is built from on-chain balance snapshots. Snapshot recording isn't enabled (no datastore), so there's nothing to chart — by design, no placeholder numbers."
          />
        </BrutalCard>

        <BrutalCard className="p-5">
          <div className="font-display uppercase">Allocation</div>
          {!isConnected ? (
            <EmptyState
              icon={Wallet}
              title="Connect a wallet"
              body="Token allocation is read from your real on-chain balances."
              action={<WalletButton />}
            />
          ) : (
            <EmptyState
              icon={PieChart}
              title="Native balance only"
              body={`${bnb !== null ? bnb.toFixed(4) : "…"} BNB held. Per-token allocation needs a token-list + price source, which isn't wired yet.`}
            />
          )}
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
          <Mini label="Decisions today" value="—" />
          <Mini label="Trades today" value="—" />
          <Mini label="Rejected" value="—" />
        </div>
        <div className="mt-2 text-[11px] font-mono text-paper/50">
          Counters are blank until decision/trade logging is persisted — no fabricated activity.
        </div>
      </BrutalCard>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
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
