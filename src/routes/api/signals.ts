import { createFileRoute } from "@tanstack/react-router";

// GET /api/signals — live market signals from CoinMarketCap (server-only key).
// When CMC_AGENT_API_KEY isn't set, returns { configured:false } so the UI shows
// an honest empty state. NEVER returns fabricated/mock numbers.
type SignalsResponse = {
  configured: boolean;
  fearGreed: { value: number; label: string; updatedAt: string } | null;
  funding: { symbol: string; rate: number }[] | null;
  sentiment: { symbol: string; score: number }[] | null;
  momentum: { symbol: string; rsi: number; macd: number }[] | null;
  note?: string;
  error?: string;
};

const EMPTY = {
  fearGreed: null,
  funding: null,
  sentiment: null,
  momentum: null,
} as const;

export const Route = createFileRoute("/api/signals")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.CMC_AGENT_API_KEY;
        if (!key) {
          return Response.json({
            configured: false,
            ...EMPTY,
            note: "Live signals disabled — set CMC_AGENT_API_KEY on the server.",
          } satisfies SignalsResponse);
        }

        // Fear & Greed is a real, documented CoinMarketCap endpoint.
        const base = process.env.CMC_API_URL || "https://pro-api.coinmarketcap.com";
        try {
          const res = await fetch(`${base}/v3/fear-and-greed/latest`, {
            headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" },
          });
          const json = (await res.json().catch(() => null)) as any;
          if (!res.ok) {
            return Response.json({
              configured: true,
              ...EMPTY,
              error: json?.status?.error_message ?? `CMC request failed (${res.status})`,
            } satisfies SignalsResponse);
          }
          const d = json?.data ?? {};
          const value = Number(d.value);
          return Response.json({
            configured: true,
            fearGreed: Number.isFinite(value)
              ? {
                  value,
                  label: d.value_classification ?? "—",
                  updatedAt: d.update_time ?? new Date().toISOString(),
                }
              : null,
            funding: null,
            sentiment: null,
            momentum: null,
            note: "Funding / sentiment / momentum require dedicated data sources (not wired).",
          } satisfies SignalsResponse);
        } catch (err) {
          return Response.json({
            configured: true,
            ...EMPTY,
            error: err instanceof Error ? err.message : "signals fetch failed",
          } satisfies SignalsResponse);
        }
      },
    },
  },
});
