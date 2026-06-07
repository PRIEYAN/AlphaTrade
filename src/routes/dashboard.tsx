import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Shield, Sparkles, Activity, Wallet, Power, ArrowLeft } from "lucide-react";
import { useApp } from "@/lib/store";
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
  const { wallet, connect, disconnect, killSwitch, setKill } = useApp();
  const loc = useLocation();

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
            <span className="hidden md:inline-block border-brutal bg-lime px-2 py-0.5 font-mono text-xs shadow-brutal-sm">BSC · 56</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setKill(!killSwitch); toast(killSwitch ? "Kill switch released" : "KILL SWITCH ENGAGED", { description: killSwitch ? "Agent can resume" : "All decisions and execution blocked" }); }}
              className={cn("inline-flex items-center gap-2 border-brutal px-3 py-2 font-display text-xs uppercase shadow-brutal-sm transition-all",
                killSwitch ? "bg-destructive text-destructive-foreground" : "bg-card hover:bg-destructive hover:text-destructive-foreground")}>
              <Power className="size-4" /> {killSwitch ? "KILLED" : "Kill switch"}
            </button>
            {wallet.connected ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex border-brutal bg-lime px-3 py-2 font-mono text-xs shadow-brutal-sm">
                  {wallet.balanceBnb} BNB · {wallet.address}
                </span>
                <button onClick={disconnect} className="border-brutal bg-card px-3 py-2 font-display text-xs uppercase shadow-brutal-sm">Disconnect</button>
              </div>
            ) : (
              <button onClick={() => { connect(); toast.success("Wallet connected"); }}
                className="inline-flex items-center gap-2 border-brutal bg-pink px-3 py-2 font-display text-sm uppercase shadow-brutal-sm">
                <Wallet className="size-4" /> Connect Wallet
              </button>
            )}
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
                  className={cn("flex items-center gap-3 border-brutal px-3 py-2 font-display text-sm uppercase shadow-brutal-sm transition-all",
                    active ? "bg-pink translate-x-[3px] translate-y-[3px] shadow-none" : "bg-paper hover:bg-lime")}>
                  <it.icon className="size-4" /> {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 border-brutal bg-ink text-paper p-3">
            <div className="font-display text-xs uppercase">Agent</div>
            <div className="font-display text-2xl mt-1">{killSwitch ? "PAUSED" : "RUNNING"}</div>
            <div className="font-mono text-[10px] mt-2 text-paper/70">v0.3 · groq · twak</div>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          {!wallet.connected && (
            <div className="mb-6 border-brutal bg-orange p-4 shadow-brutal-sm flex items-center justify-between">
              <div>
                <div className="font-display uppercase">Connect a wallet to continue</div>
                <div className="text-sm">BSC (chain 56) only. Signing flows through Trust Wallet Agent Kit.</div>
              </div>
              <button onClick={() => { connect(); toast.success("Wallet connected"); }}
                className="border-brutal bg-ink text-paper px-3 py-2 font-display text-xs uppercase shadow-brutal-sm">Connect</button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
