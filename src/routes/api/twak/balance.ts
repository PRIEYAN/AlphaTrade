import { createFileRoute } from "@tanstack/react-router";
import { twakService } from "@/lib/services/twakService";
import { TwakError } from "@/lib/services/twClient";

// GET /api/twak/balance — live native balance for the configured agent wallet.
// Returns the raw upstream payload too, so the exact field mapping can be
// confirmed from a real response.
export const Route = createFileRoute("/api/twak/balance")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await twakService.getNativeBalance();
          return Response.json(result);
        } catch (err) {
          const status = err instanceof TwakError && err.status >= 400 ? err.status : 502;
          const body = err instanceof TwakError ? err.body : null;
          return Response.json(
            { error: err instanceof Error ? err.message : "balance lookup failed", details: body },
            { status },
          );
        }
      },
    },
  },
});
