import { createFileRoute } from "@tanstack/react-router";
import { BrutalCard, StickerTag } from "@/components/brutal";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { cmcService } from "@/lib/services/cmcService";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/strategy")({
  component: StrategyPage,
});

type DecisionResp = {
  decision: { action: "buy" | "sell" | "hold"; tokenIn: string; tokenOut: string; sizePercent: number; confidence: number; reasoning: string };
  validation: { approved: boolean; reason?: string };
};

function StrategyPage() {
  const { guardrails, killSwitch } = useApp();
  const [strategy, setStrategy] = useState("Rotate up to 5% from USDT into BNB when Fear & Greed is above 60 and funding stays positive. Hold otherwise.");
  const [sources, setSources] = useState({ fg: true, funding: true, sentiment: true, momentum: false });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecisionResp | null>(null);

  const fg = useQuery({ queryKey: ["fg"], queryFn: () => cmcService.getFearAndGreed() });
  const funding = useQuery({ queryKey: ["funding"], queryFn: () => cmcService.getFundingRates() });
  const sentiment = useQuery({ queryKey: ["sentiment"], queryFn: () => cmcService.getSentiment() });

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy,
          signals: {
            fearGreed: sources.fg ? fg.data : undefined,
            funding: sources.funding ? funding.data : undefined,
            sentiment: sources.sentiment ? sentiment.data : undefined,
          },
          guardrails: {
            ...guardrails, killSwitch, tradesToday: 6, spentTodayUsd: 240, drawdownPct: 3,
            portfolioValueUsd: 19450,
          },
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        toast.error(e.error ?? "Decision failed");
        return;
      }
      const data: DecisionResp = await res.json();
      setResult(data);
      toast[data.validation.approved ? "success" : "error"](data.validation.approved ? "Decision approved" : "Decision rejected", { description: data.validation.reason });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <StickerTag tone="pink">AI engine</StickerTag>
        <h1 className="font-display text-4xl md:text-5xl uppercase mt-2">Strategy + AI</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <BrutalCard className="p-5 lg:col-span-2 space-y-4">
          <label className="block">
            <span className="font-display text-xs uppercase">Natural-language strategy</span>
            <textarea value={strategy} onChange={(e) => setStrategy(e.target.value)} rows={5}
              className="border-brutal w-full bg-paper px-3 py-2 font-mono text-sm shadow-brutal-sm mt-1" />
          </label>

          <div>
            <div className="font-display text-xs uppercase mb-2">Signal sources</div>
            <div className="flex flex-wrap gap-2">
              {([["fg", "Fear & Greed"], ["funding", "Funding Rates"], ["sentiment", "Sentiment"], ["momentum", "Momentum"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setSources((s) => ({ ...s, [k]: !s[k as keyof typeof s] }))}
                  className={`border-brutal px-2 py-1 font-display text-xs uppercase shadow-brutal-sm ${sources[k as keyof typeof sources] ? "bg-lime translate-x-[2px] translate-y-[2px] shadow-none" : "bg-paper"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={run} disabled={loading || killSwitch}
            className="inline-flex items-center gap-2 border-brutal bg-pink px-5 py-3 font-display uppercase shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {killSwitch ? "Kill switch engaged" : "Run analysis"}
          </button>

          {result && (
            <div className="mt-2 border-brutal bg-ink text-paper p-4">
              <div className="flex items-center justify-between">
                <div className="font-display uppercase">AI Decision</div>
                <span className={`border-brutal px-2 py-0.5 font-display text-xs uppercase shadow-brutal-sm ${result.validation.approved ? "bg-lime text-ink" : "bg-destructive text-destructive-foreground"}`}>
                  {result.validation.approved ? "APPROVED" : "REJECTED"}
                </span>
              </div>
              <pre className="mt-3 text-xs font-mono whitespace-pre-wrap text-paper">{JSON.stringify(result.decision, null, 2)}</pre>
              {result.validation.reason && (
                <div className="mt-3 text-sm border-2 border-paper p-2 font-mono">
                  <span className="text-pink">guardrail:</span> {result.validation.reason}
                </div>
              )}
            </div>
          )}
        </BrutalCard>

        <BrutalCard className="p-5 space-y-4" tone="cyan">
          <div className="font-display uppercase">Market Signals</div>
          <Gauge label="Fear & Greed" value={fg.data?.value ?? 0} sub={fg.data?.label ?? "—"} />
          <div>
            <div className="font-display text-xs uppercase mb-1">Funding rates</div>
            <table className="w-full text-xs font-mono">
              <tbody>
                {(funding.data ?? []).map((r) => (
                  <tr key={r.symbol} className="border-t border-ink/20">
                    <td className="py-1 font-display">{r.symbol}</td>
                    <td className={`text-right ${r.rate >= 0 ? "" : "text-destructive"}`}>{(r.rate * 100).toFixed(3)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="font-display text-xs uppercase mb-1">Sentiment</div>
            <ul className="text-xs font-mono space-y-1">
              {(sentiment.data ?? []).map((s) => (
                <li key={s.symbol} className="flex justify-between"><span>{s.symbol}</span><span>{s.score.toFixed(2)}</span></li>
              ))}
            </ul>
          </div>
        </BrutalCard>
      </div>
    </div>
  );
}

function Gauge({ label, value, sub }: { label: string; value: number; sub: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="border-brutal bg-paper p-3">
      <div className="flex justify-between font-display text-xs uppercase"><span>{label}</span><span>{sub}</span></div>
      <div className="mt-2 h-3 border-2 border-ink bg-card relative">
        <div className="h-full bg-pink" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}
