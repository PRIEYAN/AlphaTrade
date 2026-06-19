import { createFileRoute } from "@tanstack/react-router";

// POST /api/agent/decide — thin proxy to the Python Agent (Flask, port 5000).
// All guardrail validation, Groq AI calls, rate limiting, and SLM explanation
// generation happen in the Agent/ folder. The frontend has zero AI logic.
export const Route = createFileRoute("/api/agent/decide")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const agentUrl = process.env.AGENT_API_URL ?? "http://localhost:5000";
        const body = await request.json().catch(() => null);
        if (!body) {
          return Response.json({ error: "Invalid request body" }, { status: 400 });
        }
        try {
          const upstream = await fetch(`${agentUrl}/api/agent/decide`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30_000),
          });
          const data = await upstream.json();
          return Response.json(data, { status: upstream.status });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Agent unreachable";
          return Response.json(
            {
              decision: {
                action: "hold",
                tokenIn: "USDT",
                tokenOut: "USDT",
                sizePercent: 0,
                confidence: 0,
                reasoning: "Python Agent is offline — defaulting to hold.",
              },
              validation: { approved: false, reason: `Agent offline: ${msg}`, reasons: [`Agent offline: ${msg}`] },
              error: `Python Agent unreachable: ${msg}. Start it with: cd Agent && python wsgi.py`,
            },
            { status: 503 },
          );
        }
      },
    },
  },
});
