import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { twakService } from "@/lib/services/twakService";
import { TwakError } from "@/lib/services/twClient";

// POST /api/twak/swap — execute a swap through Trust Wallet Agent Kit (server-side
// signing). Honest by design: returns a clear 501 when the (currently
// undocumented) TWAK swap-execute path isn't configured, never a fake tx hash.
const schema = z.object({
  tokenIn: z.string().min(1).max(12),
  tokenOut: z.string().min(1).max(12),
  amount: z.string().min(1),
  chain: z.string().optional(),
  slippage: z.number().optional(),
});

export const Route = createFileRoute("/api/twak/swap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
        }
        try {
          const result = await twakService.signAndSendSwap(parsed.data);
          return Response.json(result);
        } catch (err) {
          const status = err instanceof TwakError && err.status >= 400 ? err.status : 502;
          const details = err instanceof TwakError ? err.body : null;
          return Response.json(
            { error: err instanceof Error ? err.message : "swap failed", details },
            { status },
          );
        }
      },
    },
  },
});
