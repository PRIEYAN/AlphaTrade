import { createFileRoute } from "@tanstack/react-router";
import { twakService } from "@/lib/services/twakService";
import { TwakError } from "@/lib/services/twClient";

// POST /api/twak/register — self-custodial competition registration.
// Returns { registered, simulated } on success; an honest error otherwise
// (it never fakes success when TWAK is configured but no endpoint is set).
export const Route = createFileRoute("/api/twak/register")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await twakService.registerForCompetition();
          return Response.json(result);
        } catch (err) {
          const status = err instanceof TwakError && err.status >= 400 ? err.status : 502;
          const body = err instanceof TwakError ? err.body : null;
          return Response.json(
            { error: err instanceof Error ? err.message : "registration failed", details: body },
            { status },
          );
        }
      },
    },
  },
});
