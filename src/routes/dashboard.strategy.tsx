import { createFileRoute } from "@tanstack/react-router";
import { BrutalCard, StickerTag } from "@/components/brutal";
import { useState } from "react";
import { useApp, makeTradeId, MODE_LABELS, type MarketSnapshot } from "@/lib/store";
import { fetchSignals } from "@/lib/services/cmcService";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useBalance } from "wagmi";
import { appChain } from "@/lib/wagmi";
import { formatUnits } from "viem";
import { Sparkles, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/strategy")({
  component: StrategyPage,
});

type DecisionResp = {
  decision: {
    action: "buy" | "sell" | "hold";
    tokenIn: string;
    tokenOut: string;
    sizePercent: number;
    confidence: number;
    reasoning: string;
  };
  validation: { approved: boolean; reason?: string; reasons?: string[] };
  explanation?: string | null;
  error?: string | null;
};

function StrategyPage() {
  const { guardrails, killSwitch, strategy, setStrategy, addTrade, mode } = useApp();
  const [sources, setSources] = useState({ fg: true, funding: true, sentiment: true, momentum: false });
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<DecisionResp | null>(null);
  const [marketSnapshot, setMarketSnapshot] = useState<MarketSnapshot>({});

  const { address, isConnected } = useAccount();
  const { data: bal } = useBalance({ address, chainId: appChain.id, query: { enabled: isConnected } });

  const signalsQ = useQuery({ queryKey: ["signals"], queryFn: fetchSignals });
  const signals = signalsQ.data;
  const fg = signals?.fearGreed ?? null;
  const funding = signals?.funding ?? null;
  const sentiment = signals?.sentiment ?? null;

  const onchainQ = useQuery({
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
      return (await r.json()) as { configured: boolean; price?: number; priceChange24h?: number; orderbookImbalance?: number };
    },
    refetchInterval: 30_000,
  });

  const run = async () => {
    setLoading(true);
    try {
      const snap: MarketSnapshot = {
        fearGreed: fg,
        price: marketQ.data?.price ?? null,
        priceChange24h: marketQ.data?.priceChange24h ?? null,
        orderbookImbalance: marketQ.data?.orderbookImbalance ?? null,
        blockNumber: onchainQ.data?.ok ? onchainQ.data.blockNumber : null,
        gasPriceGwei: onchainQ.data?.ok ? onchainQ.data.gasPriceGwei : null,
      };
      setMarketSnapshot(snap);

      const res = await fetch("/api/agent/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy,
          signals: {
            fearGreed: sources.fg ? fg ?? undefined : undefined,
            funding: sources.funding ? funding ?? undefined : undefined,
            sentiment: sources.sentiment ? sentiment ?? undefined : undefined,
            onchain: onchainQ.data?.ok ? onchainQ.data : undefined,
            binance: marketQ.data?.price ? marketQ.data : undefined,
            mode,
          },
          guardrails: {
            ...guardrails, killSwitch, tradesToday: 0, spentTodayUsd: 0, drawdownPct: 0, portfolioValueUsd: 0,
          },
        }),
      });

      const data: DecisionResp = await res.json();
      setResult(data);

      const approved = Boolean(data.validation.approved) && !data.error;
      const status = mode === "analysis"
        ? "analysis" as const
        : !approved
          ? "rejected" as const
          : mode === "paper"
            ? "simulated" as const
            : "simulated" as const; // manual runs never auto-submit to testnet/mainnet

      addTrade({
        id: makeTradeId(),
        at: Date.now(),
        source: "manual",
        mode,
        marketSnapshot: snap,
        action: data.decision.action,
        tokenIn: data.decision.tokenIn,
        tokenOut: data.decision.tokenOut,
        sizePercent: data.decision.sizePercent,
        confidence: data.decision.confidence,
        reasoning: data.decision.reasoning,
        approved,
        riskReason: data.validation.reason,
        riskChecks: buildChecks(data.validation),
        status,
        entryPrice: approved && mode === "paper" ? (marketQ.data?.price ?? null) : null,
        explanation: data.explanation ?? null,
        aiError: data.error ?? null,
      });

      if (data.error) {
        toast.error(data.error);
      } else {
        toast[approved ? "success" : "error"](
          approved ? "Decision approved" : "Decision rejected",
          { description: data.validation.reason },
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const execute = async () => {
    if (!result) return;
    const d = result.decision;
    let amount = "0";
    if (d.tokenIn.toUpperCase() === "BNB" && bal) {
      amount = ((Number(formatUnits(bal.value, bal.decimals)) * d.sizePercent) / 100).toFixed(6);
    }
    setExecuting(true);
    try {
      const res = await fetch("/api/twak/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenIn: d.tokenIn, tokenOut: d.tokenOut, amount, slippage: guardrails.slippagePct }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Execution failed"); return; }
      toast.success(data.txHash ? `Swap submitted: ${String(data.txHash).slice(0, 12)}…` : "Swap submitted");
    } catch {
      toast.error("Execution request failed");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <StickerTag tone="pink">AI engine</StickerTag>
        <h1 className="font-display text-4xl md:text-5xl uppercase mt-2">Strategy + AI</h1>
        <p className="text-ink/60 font-mono text-xs mt-1">
          Mode: <span className="font-bold">{MODE_LABELS[mode]}</span> — decisions are logged to the Activity tab
        </p>
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
              {([["fg", "Fear & Greed"], ["funding", "Funding Rates"], ["sentiment", "Sentiment"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setSources((s) => ({ ...s, [k]: !s[k] }))}
                  className={`border-brutal px-2 py-1 font-display text-xs uppercase shadow-brutal-sm ${sources[k] ? "bg-lime translate-x-[2px] translate-y-[2px] shadow-none" : "bg-paper"}`}>
                  {label}
                </button>
              ))}
              {marketQ.data?.price && (
                <div className="border-brutal px-2 py-1 font-display text-xs uppercase bg-lime shadow-brutal-sm">
                  Binance ✓ ${marketQ.data.price.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <button onClick={run} disabled={loading || killSwitch}
            className="inline-flex items-center gap-2 border-brutal bg-pink px-5 py-3 font-display uppercase shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {killSwitch ? "Kill switch engaged" : "Run analysis"}
          </button>

          {result && (
            <div className="mt-2 border-brutal bg-ink text-paper p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-display uppercase">AI Decision</div>
                <span className={`border-brutal px-2 py-0.5 font-display text-xs uppercase shadow-brutal-sm ${
                  result.error ? "bg-orange text-ink"
                  : result.validation.approved ? "bg-lime text-ink"
                  : "bg-destructive text-destructive-foreground"
                }`}>
                  {result.error ? "AI ERROR" : result.validation.approved ? "APPROVED" : "REJECTED"}
                </span>
              </div>
              <pre className="text-xs font-mono whitespace-pre-wrap text-paper">{JSON.stringify(result.decision, null, 2)}</pre>

              {result.error && (
                <div className="text-sm border-2 border-orange p-2 font-mono text-orange">
                  <span className="font-bold">AI error:</span> {result.error}
                </div>
              )}
              {result.validation.reason && (
                <div className="text-sm border-2 border-paper p-2 font-mono">
                  <span className="text-pink">guardrail:</span> {result.validation.reason}
                </div>
              )}
              {result.explanation && (
                <div className="border-2 border-paper/40 p-3 text-xs font-mono text-paper/80 italic">
                  <div className="font-display text-[10px] uppercase text-paper/40 mb-1">AI Explanation</div>
                  {result.explanation}
                </div>
              )}

              {!result.error && result.validation.approved && result.decision.action !== "hold" && (
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={execute} disabled={!isConnected || executing}
                    className="inline-flex items-center gap-2 border-2 border-paper bg-lime text-ink px-4 py-2 font-display text-xs uppercase shadow-[5px_5px_0_0_#f5f1e0] disabled:opacity-50">
                    {executing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                    Execute via Trust Wallet
                  </button>
                  {!isConnected && <span className="text-xs font-mono text-paper/60">connect a wallet to execute</span>}
                </div>
              )}
            </div>
          )}
        </BrutalCard>

        <BrutalCard className="p-5 space-y-4" tone="cyan">
          <div className="font-display uppercase">Market Signals</div>
          {signalsQ.isLoading ? (
            <div className="text-xs font-mono text-ink/60 flex items-center gap-2"><Loader2 className="size-3 animate-spin" /> Loading…</div>
          ) : !signals?.configured ? (
            <div className="border-2 border-dashed border-ink/40 p-4 text-xs font-mono text-ink/70">
              Live signals not configured. Set <span className="font-bold">CMC_AGENT_API_KEY</span> on the server.
            </div>
          ) : (
            <>
              {fg ? (
                <Gauge label="Fear & Greed" value={fg.value} sub={fg.label} />
              ) : (
                <div className="text-xs font-mono text-ink/60">Fear &amp; Greed unavailable.</div>
              )}
              {marketQ.data?.price && (
                <div className="border-brutal bg-paper p-3">
                  <div className="font-display text-xs uppercase mb-1">BNB / USDT (Binance)</div>
                  <div className="font-display text-2xl">${marketQ.data.price.toFixed(2)}</div>
                  <div className="font-mono text-[11px] text-ink/60 mt-1">
                    {marketQ.data.priceChange24h != null && `${marketQ.data.priceChange24h >= 0 ? "+" : ""}${marketQ.data.priceChange24h.toFixed(2)}% 24h`}
                    {marketQ.data.orderbookImbalance != null && ` · OB ${marketQ.data.orderbookImbalance.toFixed(2)}`}
                  </div>
                </div>
              )}
              <div>
                <div className="font-display text-xs uppercase mb-1">Funding rates</div>
                {funding?.length ? (
                  <table className="w-full text-xs font-mono">
                    <tbody>
                      {funding.map((r) => (
                        <tr key={r.symbol} className="border-t border-ink/20">
                          <td className="py-1 font-display">{r.symbol}</td>
                          <td className={`text-right ${r.rate >= 0 ? "" : "text-destructive"}`}>{(r.rate * 100).toFixed(3)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-[11px] font-mono text-ink/50">No funding-rate source wired.</div>
                )}
              </div>
              <div>
                <div className="font-display text-xs uppercase mb-1">Sentiment</div>
                {sentiment?.length ? (
                  <ul className="text-xs font-mono space-y-1">
                    {sentiment.map((s) => (
                      <li key={s.symbol} className="flex justify-between"><span>{s.symbol}</span><span>{s.score.toFixed(2)}</span></li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[11px] font-mono text-ink/50">No sentiment source wired.</div>
                )}
              </div>
            </>
          )}
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

function buildChecks(validation: { approved?: boolean; reasons?: string[] }): Record<string, "PASS" | "FAIL"> {
  if (!validation.reasons?.length) return { overall: "PASS" };
  const c: Record<string, "PASS" | "FAIL"> = { overall: "FAIL" };
  for (const r of validation.reasons) {
    if (r.includes("confidence")) c.confidence = "FAIL";
    else if (r.includes("size") || r.includes("per-trade")) c.trade_size = "FAIL";
    else if (r.includes("daily trade cap")) c.daily_count = "FAIL";
    else if (r.includes("slippage")) c.slippage = "FAIL";
    else if (r.includes("allowlist")) c.allowlist = "FAIL";
    else if (r.includes("drawdown")) c.drawdown = "FAIL";
    else if (r.includes("spend")) c.daily_spend = "FAIL";
    else if (r.includes("kill")) c.kill_switch = "FAIL";
    else c.other = "FAIL";
  }
  return c;
}
