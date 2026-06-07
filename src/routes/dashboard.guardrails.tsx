import { createFileRoute } from "@tanstack/react-router";
import { BrutalCard, StickerTag } from "@/components/brutal";
import { useApp } from "@/lib/store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { allowedTokens } from "@/lib/mock/mockData";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/dashboard/guardrails")({
  component: GuardrailsPage,
});

const schema = z.object({
  maxPerTradePct: z.coerce.number().min(0.1).max(100),
  dailyTradeCap: z.coerce.number().int().min(1).max(500),
  dailySpendLimitUsd: z.coerce.number().min(1),
  maxDrawdownPct: z.coerce.number().min(1).max(100),
  slippagePct: z.coerce.number().min(0.1).max(10),
  minConfidence: z.coerce.number().min(0).max(1),
  allowlist: z.array(z.string()).min(1, "Pick at least one token"),
});

function GuardrailsPage() {
  const { guardrails, setGuardrails } = useApp();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema), defaultValues: guardrails,
  });
  const allowlist = watch("allowlist") ?? [];

  const onSubmit = (data: z.infer<typeof schema>) => {
    setGuardrails(data);
    toast.success("Guardrails saved", { description: "New rules take effect on the next decision." });
  };

  const toggleToken = (t: string) => {
    const has = allowlist.includes(t);
    setValue("allowlist", has ? allowlist.filter((x) => x !== t) : [...allowlist, t], { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <StickerTag tone="lime">Hard rules</StickerTag>
        <h1 className="font-display text-4xl md:text-5xl uppercase mt-2">Guardrails</h1>
        <p className="text-ink/70 mt-2 max-w-2xl">Deterministic rules enforced in code. The AI's output is rejected if it violates any rule below.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid lg:grid-cols-3 gap-5">
        <BrutalCard className="p-5 lg:col-span-2 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Max % per trade" err={errors.maxPerTradePct?.message}>
              <input type="number" step="0.1" {...register("maxPerTradePct")} className="border-brutal w-full bg-paper px-3 py-2 font-mono shadow-brutal-sm" />
            </Field>
            <Field label="Daily trade cap" err={errors.dailyTradeCap?.message}>
              <input type="number" {...register("dailyTradeCap")} className="border-brutal w-full bg-paper px-3 py-2 font-mono shadow-brutal-sm" />
            </Field>
            <Field label="Daily spend limit (USD)" err={errors.dailySpendLimitUsd?.message}>
              <input type="number" {...register("dailySpendLimitUsd")} className="border-brutal w-full bg-paper px-3 py-2 font-mono shadow-brutal-sm" />
            </Field>
            <Field label="Max drawdown %" err={errors.maxDrawdownPct?.message}>
              <input type="number" step="0.1" {...register("maxDrawdownPct")} className="border-brutal w-full bg-paper px-3 py-2 font-mono shadow-brutal-sm" />
            </Field>
            <Field label="Slippage %" err={errors.slippagePct?.message}>
              <input type="number" step="0.1" {...register("slippagePct")} className="border-brutal w-full bg-paper px-3 py-2 font-mono shadow-brutal-sm" />
            </Field>
            <Field label="Min confidence (0-1)" err={errors.minConfidence?.message}>
              <input type="number" step="0.05" {...register("minConfidence")} className="border-brutal w-full bg-paper px-3 py-2 font-mono shadow-brutal-sm" />
            </Field>
          </div>

          <div>
            <div className="font-display text-xs uppercase mb-2">Token allowlist</div>
            <div className="text-xs text-ink/60 mb-3 font-mono">Only the 149 competition-eligible BEP-20 tokens count toward your score.</div>
            <div className="flex flex-wrap gap-2">
              {allowedTokens.map((t) => {
                const on = allowlist.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleToken(t)}
                    className={`border-brutal px-2 py-1 font-mono text-xs shadow-brutal-sm ${on ? "bg-pink translate-x-[2px] translate-y-[2px] shadow-none" : "bg-paper hover:bg-lime"}`}>
                    {t}
                  </button>
                );
              })}
            </div>
            {errors.allowlist && <div className="text-destructive text-xs mt-2 font-mono">{errors.allowlist.message as string}</div>}
          </div>

          <button type="submit" className="border-brutal bg-lime px-5 py-3 font-display uppercase shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
            Save guardrails
          </button>
        </BrutalCard>

        <BrutalCard tone="ink" className="p-5">
          <div className="font-display uppercase text-paper">Live status</div>
          <ul className="mt-4 space-y-3 text-sm">
            <Row ok label="Allowlist enforced" detail={`${allowlist.length} tokens`} />
            <Row ok label="Per-trade cap" detail={`${watch("maxPerTradePct")}% max`} />
            <Row ok={Number(watch("slippagePct")) <= 5} label="Slippage cap" detail={`${watch("slippagePct")}% (limit 5%)`} />
            <Row ok={Number(watch("minConfidence")) >= 0.5} label="Confidence floor" detail={`min ${watch("minConfidence")}`} />
            <Row ok label="Kill switch wired" detail="Engageable from header" />
          </ul>
          <div className="mt-5 border-2 border-paper p-3">
            <div className="font-display text-xs uppercase text-paper/60">Sample rejection</div>
            <pre className="text-xs text-paper mt-1 font-mono whitespace-pre-wrap">{`{
  "approved": false,
  "reason": "size 18% exceeds per-trade cap 10%"
}`}</pre>
          </div>
        </BrutalCard>
      </form>
    </div>
  );
}

function Field({ label, children, err }: { label: string; children: React.ReactNode; err?: string }) {
  return (
    <label className="block">
      <span className="font-display text-xs uppercase">{label}</span>
      <div className="mt-1">{children}</div>
      {err && <div className="text-destructive text-xs mt-1 font-mono">{err}</div>}
    </label>
  );
}

function Row({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2 text-paper">
      {ok ? <CheckCircle2 className="size-4 mt-0.5 text-lime" /> : <AlertTriangle className="size-4 mt-0.5 text-orange" />}
      <div className="flex-1">
        <div className="font-display uppercase text-xs">{label}</div>
        <div className="text-xs text-paper/60 font-mono">{detail}</div>
      </div>
    </li>
  );
}
