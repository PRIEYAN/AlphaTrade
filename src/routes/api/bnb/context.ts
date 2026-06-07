import { createFileRoute } from "@tanstack/react-router";
import { bnbAgentService } from "@/lib/services/bnbAgentService";

// GET /api/bnb/context — live BNB Smart Chain network context (block, gas).
// Real RPC reads via viem; works with zero credentials.
export const Route = createFileRoute("/api/bnb/context")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const ctx = await bnbAgentService.getOnChainContext();
          return Response.json({ ok: true, ...ctx });
        } catch (err) {
          return Response.json(
            { ok: false, error: err instanceof Error ? err.message : "RPC read failed" },
            { status: 502 },
          );
        }
      },
    },
  },
});
