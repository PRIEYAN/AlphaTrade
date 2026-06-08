import { createFileRoute } from "@tanstack/react-router";
import { twakService } from "@/lib/services/twakService";
import { TwakError } from "@/lib/services/twClient";

// GET /api/twak/ping — verifies credentials + HMAC signing against the live API.
// A 200 here proves the signing layer works end-to-end.
export const Route = createFileRoute("/api/twak/ping")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const result = await twakService.ping();
          return Response.json(result);
        } catch (err) {
          const status = err instanceof TwakError && err.status >= 400 ? err.status : 502;
          const body = err instanceof TwakError ? err.body : null;
          return Response.json(
            { ok: false, error: err instanceof Error ? err.message : "ping failed", details: body },
            { status },
          );
        }
      },
    },
  },
});
