import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Shield, Sparkles, Activity, Power, ArrowLeft } from "lucide-react";
import { useAccount } from "wagmi";
import { useApp, MODE_LABELS, MODE_COLORS } from "@/lib/store";
import { useAgentLoop } from "@/lib/agent/useAgentLoop";
import { WalletButton } from "@/components/wallet-button";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AlphaTrade" }] }),
  component: DashboardLayout,
});

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/guardrails", label: "Guardrails", icon: Shield },
  { to: "/dashboard/strategy", label: "Strategy + AI", icon: Sparkles },
  { to: "/dashboard/activity", label: "Activity", icon: Activity },
];

function DashboardLayout() {
  const { killSwitch, setKill, mode } = useApp();
  const { isConnected } = useAccount();
  const loc = useLocation();

  // Drives the autonomous agent loop across all tabs.
  useAgentLoop();

  return (
    <div className="min-h-screen bg-paper grid-bg">
      <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-paper/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="border-brutal bg-card p-2 shadow-brutal-sm hover:bg-pink transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <Link to="/" className="font-display text-lg tracking-tight flex items-center gap-2">
              <span className="border-brutal bg-ink text-paper px-2 py-0.5 shadow-brutal-sm">A/</span>
              ALPHATRADE
            </Link>
            {/* Chain badge */}
            <span className="hidden md:inline-block border-brutal bg-lime px-2 py-0.5 font-mono text-xs shadow-brutal-sm">BSC · {config.chainId}</span>
            {/* Mode badge — always visible so users never confuse paper with live */}
            <span className={cn(
              "border-brutal px-2 py-0.5 font-display text-xs uppercase shadow-brutal-sm",
              MODE_COLORS[mode],
            )}>
              {MODE_LABELS[mode]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setKill(!killSwitch);
                toast(killSwitch ? "Kill switch released" : "KILL SWITCH ENGAGED", {
                  description: killSwitch ? "Agent can resume" : "All decisions and execution blocked",
                });
              }}
              className={cn(
                "inline-flex items-center gap-2 border-brutal px-3 py-2 font-display text-xs uppercase shadow-brutal-sm transition-all",
                killSwitch
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-card hover:bg-destructive hover:text-destructive-foreground",
              )}>
              <Power className="size-4" /> {killSwitch ? "KILLED" : "Kill switch"}
            </button>
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:block w-60 shrink-0 border-r-[3px] border-ink bg-card min-h-[calc(100vh-65px)] p-3">
          <nav className="space-y-2">
            {navItems.map((it) => {
              const active = it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
              return (
                <Link key={it.to} to={it.to}
                  className={cn(
                    "flex items-center gap-3 border-brutal px-3 py-2 font-display text-sm uppercase shadow-brutal-sm transition-all",
                    active ? "bg-pink translate-x-[3px] translate-y-[3px] shadow-none" : "bg-paper hover:bg-lime",
                  )}>
                  <it.icon className="size-4" /> {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 border-brutal bg-ink text-paper p-3">
            <div className="font-display text-xs uppercase">Agent</div>
            <div className="font-display text-2xl mt-1">{killSwitch ? "PAUSED" : "RUNNING"}</div>
            <div className={cn("mt-2 border border-paper/30 px-2 py-1 font-display text-[10px] uppercase", MODE_COLORS[mode])}>
              {MODE_LABELS[mode]}
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          {!isConnected && (
            <div className="mb-6 border-brutal bg-orange p-4 shadow-brutal-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display uppercase">Connect a wallet to continue</div>
                <div className="text-sm">BNB Smart Chain ({config.chainId}) only. Signing flows through Trust Wallet Agent Kit.</div>
              </div>
              <WalletButton />
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
