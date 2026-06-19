import { createFileRoute } from "@tanstack/react-router";

// GET /api/market — proxy to Python Agent's Binance price service.
export const Route = createFileRoute("/api/market")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const agentUrl = process.env.AGENT_API_URL ?? "http://localhost:5000";
        const url = new URL(request.url);
        const symbol = url.searchParams.get("symbol") ?? "BNBUSDT";
        try {
          const upstream = await fetch(`${agentUrl}/api/market?symbol=${symbol}`, {
            signal: AbortSignal.timeout(8_000),
          });
          const data = await upstream.json();
          return Response.json(data, { status: upstream.status });
        } catch {
          return Response.json({ configured: false, error: "Market service unavailable" }, { status: 503 });
        }
      },
    },
  },
});
