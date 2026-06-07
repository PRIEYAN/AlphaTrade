import { createFileRoute } from "@tanstack/react-router";
import Groq from "groq-sdk";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/agent/systemPrompt";
import {
  decisionSchema,
  safeHoldFallback,
  sanitizeStrategy,
  validateDecision,
  type Decision,
  type Guardrails,
} from "@/lib/agent/guardrailValidator";
import { rateLimit } from "@/lib/agent/rateLimit";

const requestSchema = z.object({
  strategy: z.string().max(2000),
  signals: z.object({
    fearGreed: z.any().optional(),
    funding: z.any().optional(),
    sentiment: z.any().optional(),
    momentum: z.any().optional(),
  }),
  guardrails: z.object({
    maxPerTradePct: z.number(),
    dailyTradeCap: z.number(),
    dailySpendLimitUsd: z.number(),
    maxDrawdownPct: z.number(),
    slippagePct: z.number(),
    minConfidence: z.number(),
    allowlist: z.array(z.string()),
    killSwitch: z.boolean(),
    tradesToday: z.number().default(0),
    spentTodayUsd: z.number().default(0),
    drawdownPct: z.number().default(0),
  }),
  sessionId: z.string().optional(),
});

export const Route = createFileRoute("/api/agent/decide")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get("x-forwarded-for") ?? "anon";
        const body = await request.json().catch(() => null);
        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
        }

        const key = parsed.data.sessionId ?? ip;
        const rl = rateLimit(key);
        if (!rl.ok) {
          return Response.json({ error: "Rate limit exceeded", retryInMs: rl.retryInMs }, { status: 429 });
        }

        const g = parsed.data.guardrails as Guardrails;
        if (g.killSwitch) {
          const hold = safeHoldFallback("Kill switch engaged — agent paused.");
          return Response.json({
            decision: hold,
            validation: { approved: false, decision: hold, reason: "Kill switch is engaged" },
            raw: null,
          });
        }

        const strategy = sanitizeStrategy(parsed.data.strategy);
        const apiKey = process.env.GROQ_API_KEY;

        let decision: Decision;
        let raw: string | null = null;

        if (!apiKey) {
          // Deterministic demo fallback when no key is configured.
          decision = {
            action: "buy",
            tokenIn: "USDT",
            tokenOut: "BNB",
            sizePercent: Math.min(5, g.maxPerTradePct),
            confidence: 0.72,
            reasoning: "Demo decision (no GROQ_API_KEY configured). Market sentiment positive; small rotation into BNB.",
          };
        } else {
          try {
            const groq = new Groq({ apiKey });
            const completion = await groq.chat.completions.create({
              model: "llama-3.3-70b-versatile",
              temperature: 0.2,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                  role: "user",
                  content: JSON.stringify({
                    strategy,
                    allowlist: g.allowlist,
                    guardrails: {
                      maxPerTradePct: g.maxPerTradePct,
                      minConfidence: g.minConfidence,
                      slippagePct: g.slippagePct,
                    },
                    signals: parsed.data.signals,
                  }),
                },
              ],
            });
            raw = completion.choices[0]?.message?.content ?? "";
            const json = JSON.parse(raw);
            const v = decisionSchema.safeParse(json);
            decision = v.success ? v.data : safeHoldFallback("Schema validation failed.");
          } catch (err) {
            console.error("Groq error", err);
            decision = safeHoldFallback("Upstream AI error — defaulting to hold.");
          }
        }

        const validation = validateDecision(decision, g);
        return Response.json({ decision, validation, raw });
      },
    },
  },
});
