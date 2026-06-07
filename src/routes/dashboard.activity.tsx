import { createFileRoute } from "@tanstack/react-router";
import { BrutalCard, StickerTag } from "@/components/brutal";
import { mockTrades, mockDecisions, mockX402Payments } from "@/lib/mock/mockData";
import { config } from "@/lib/config";
import { ExternalLink, Trophy } from "lucide-react";
import { twakService } from "@/lib/services/twakService";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const [registered, setRegistered] = useState(false);
  const register = async () => {
    const r = await twakService.registerForCompetition();
    setRegistered(r.registered);
    toast.success("Agent registered for competition");
  };

  return (
    <div className="space-y-6">
      <div>
        <StickerTag tone="orange">Proof</StickerTag>
        <h1 className="font-display text-4xl md:text-5xl uppercase mt-2">Activity</h1>
      </div>

      <BrutalCard tone="ink" className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-display uppercase text-paper">Competition</div>
          <div className="text-paper/70 text-sm font-mono mt-1">
            Contract:{" "}
            <a className="underline text-lime" href={`${config.bscTrace}/address/${config.competitionContract}`} target="_blank" rel="noreferrer">
              {config.competitionContract}
            </a>
          </div>
          <div className="text-paper/70 text-sm font-mono">Status: {registered ? "REGISTERED ✓" : "Not registered"}</div>
        </div>
        <button onClick={register} disabled={registered}
          className="inline-flex items-center gap-2 border-2 border-paper bg-lime text-ink px-4 py-2 font-display uppercase shadow-[5px_5px_0_0_#f5f1e0] disabled:opacity-50">
          <Trophy className="size-4" /> {registered ? "Registered" : "Register Agent"}
        </button>
      </BrutalCard>

      <BrutalCard className="p-5">
        <div className="font-display uppercase mb-3">Trade Log</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-left font-display uppercase text-xs border-b-[3px] border-ink">
                <th className="py-2 pr-2">Time</th><th className="pr-2">Action</th><th className="pr-2">Pair</th>
                <th className="pr-2">Size</th><th className="pr-2">Status</th><th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {mockTrades.map((t) => (
                <tr key={t.id} className="border-b border-ink/10 hover:bg-lime/20">
                  <td className="py-2 pr-2">{new Date(t.time).toLocaleString()}</td>
                  <td className="pr-2"><span className={`border-2 border-ink px-1.5 ${t.action === "BUY" ? "bg-lime" : "bg-pink"}`}>{t.action}</span></td>
                  <td className="pr-2">{t.pair}</td>
                  <td className="pr-2">{t.size}</td>
                  <td className="pr-2"><span className={`px-1.5 border-2 border-ink ${t.status === "CONFIRMED" ? "bg-lime" : t.status === "PENDING" ? "bg-orange" : "bg-destructive text-destructive-foreground"}`}>{t.status}</span></td>
                  <td>
                    <a href={`${config.bscScan}/tx/${t.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline hover:text-pink">
                      {t.txHash.slice(0, 10)}…<ExternalLink className="size-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BrutalCard>

      <div className="grid lg:grid-cols-2 gap-5">
        <BrutalCard className="p-5">
          <div className="font-display uppercase mb-3">AI Decisions</div>
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-left font-display uppercase text-xs border-b-[3px] border-ink">
                <th className="py-2 pr-2">Time</th><th className="pr-2">Action</th><th className="pr-2">Conf</th><th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {mockDecisions.map((d) => (
                <tr key={d.id} className="border-b border-ink/10">
                  <td className="py-2 pr-2 text-xs">{new Date(d.ts).toLocaleTimeString()}</td>
                  <td className="pr-2 font-display uppercase">{d.action}</td>
                  <td className="pr-2">{(d.confidence * 100).toFixed(0)}%</td>
                  <td><span className={`px-1.5 border-2 border-ink ${d.approved ? "bg-lime" : "bg-destructive text-destructive-foreground"}`}>{d.approved ? "APPROVED" : "REJECTED"}</span>
                    <div className="text-[10px] text-ink/60 mt-0.5">{d.reason}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </BrutalCard>

        <BrutalCard className="p-5">
          <div className="font-display uppercase mb-3">x402 Payments</div>
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-left font-display uppercase text-xs border-b-[3px] border-ink">
                <th className="py-2 pr-2">Time</th><th className="pr-2">Endpoint</th><th className="pr-2">Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockX402Payments.map((p) => (
                <tr key={p.id} className="border-b border-ink/10">
                  <td className="py-2 pr-2 text-xs">{new Date(p.ts).toLocaleTimeString()}</td>
                  <td className="pr-2">{p.endpoint}</td>
                  <td className="pr-2">{p.amount} {p.asset}</td>
                  <td><span className="px-1.5 border-2 border-ink bg-lime">{p.status.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </BrutalCard>
      </div>
    </div>
  );
}
