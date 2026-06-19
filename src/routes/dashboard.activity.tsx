import { createFileRoute } from "@tanstack/react-router";
import { BrutalCard, StickerTag } from "@/components/brutal";
import { config } from "@/lib/config";
import { WalletButton } from "@/components/wallet-button";
import { ExternalLink, Trophy, Inbox, X, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { appChain } from "@/lib/wagmi";
import { useQuery } from "@tanstack/react-query";
import { useApp, MODE_LABELS, MODE_COLORS, type TradeRecord } from "@/lib/store";

export const Route = createFileRoute("/dashboard/activity")({
  component: ActivityPage,
});

type TxResp = {
  configured: boolean;
  txs: { hash: string; time: string; direction: "IN" | "OUT"; valueBnb: number; status: "CONFIRMED" | "FAILED" }[];
  note?: string;
  error?: string;
};

const competitionRegistryAbi = [
  { type: "function", name: "isRegistered", stateMutability: "view", inputs: [{ name: "agent", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

const isContractAddress = (v: string): v is `0x${string}` => /^0x[a-fA-F0-9]{40}$/.test(v);

function ActivityPage() {
  const { address, isConnected } = useAccount();
  const { trades } = useApp();
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);
  const [registered, setRegistered] = useState(false);
  const [registerPending, setRegisterPending] = useState(false);
  const contractAddress = config.competitionContract;
  const canUseContract = isContractAddress(contractAddress);
  const { writeContractAsync } = useWriteContract();

  const { data: isRegisteredOnChain, refetch: refetchRegistered } = useReadContract({
    abi: competitionRegistryAbi,
    address: canUseContract ? contractAddress : undefined,
    functionName: "isRegistered",
    args: address ? [address] : undefined,
    chainId: appChain.id,
    query: { enabled: isConnected && !!address && canUseContract },
  });

  const [registrationTx, setRegistrationTx] = useState<`0x${string}` | undefined>();
  const receiptQ = useWaitForTransactionReceipt({ hash: registrationTx, chainId: appChain.id, query: { enabled: !!registrationTx } });

  useEffect(() => { if (isRegisteredOnChain) setRegistered(true); }, [isRegisteredOnChain]);
  useEffect(() => {
    if (receiptQ.isSuccess) { setRegistered(true); setRegisterPending(false); refetchRegistered(); toast.success("Agent registered on-chain"); }
  }, [receiptQ.isSuccess, refetchRegistered]);

  const txsQ = useQuery({
    queryKey: ["txs", address],
    queryFn: async (): Promise<TxResp> => {
      const res = await fetch(`/api/chain/txs?address=${address}`);
      return res.json();
    },
    enabled: isConnected && !!address,
  });

  const register = async () => {
    if (!isConnected || !address) { toast.error("Connect a wallet before registering"); return; }
    if (!canUseContract) { toast.error("Competition contract is not configured"); return; }
    setRegisterPending(true);
    try {
      const res = await fetch("/api/twak/register", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        const canFallback = res.status === 501 && String(data.error ?? "").includes("TWAK_REGISTER_PATH");
        if (!canFallback) { setRegisterPending(false); toast.error(data.error ?? "Registration failed"); return; }
        const hash = await writeContractAsync({ abi: competitionRegistryAbi, address: contractAddress, functionName: "register", chainId: appChain.id });
        setRegistrationTx(hash);
        toast.message("Registration submitted on-chain");
        return;
      }
      setRegistered(Boolean(data.registered));
      setRegisterPending(false);
      toast[data.simulated ? "message" : "success"](data.simulated ? "Registered (simulated)" : "Agent registered");
    } catch (err) {
      setRegisterPending(false);
      toast.error(err instanceof Error ? err.message : "Registration failed");
    }
  };

  const txs = txsQ.data?.txs ?? [];
  const registering = registerPending || receiptQ.isLoading;

  return (
    <div className="space-y-6">
      {/* Trade Detail Drawer */}
      {selectedTrade && (
        <TradeDrawer trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
      )}

      <div>
        <StickerTag tone="orange">Proof</StickerTag>
        <h1 className="font-display text-4xl md:text-5xl uppercase mt-2">Activity</h1>
      </div>

      {/* Competition registration */}
      <BrutalCard tone="ink" className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-display uppercase text-paper">Competition</div>
          <div className="text-paper/70 text-sm font-mono mt-1">
            Contract:{" "}
            <a className="underline text-lime" href={`${config.bscTrace}/address/${config.competitionContract}`} target="_blank" rel="noreferrer">
              {config.competitionContract}
            </a>
          </div>
          <div className="text-paper/70 text-sm font-mono">Status: {registered ? "REGISTERED ✓" : "Not registered"}</div>
        </div>
        <button onClick={register} disabled={!isConnected || registered || registering}
          className="inline-flex items-center gap-2 border-2 border-paper bg-lime text-ink px-4 py-2 font-display uppercase shadow-[5px_5px_0_0_#f5f1e0] disabled:opacity-50">
          <Trophy className="size-4" /> {registered ? "Registered" : registering ? "Registering…" : "Register Agent"}
        </button>
      </BrutalCard>

      {/* Trade History — AI audit trail */}
      <BrutalCard className="p-5">
        <div className="font-display uppercase mb-1">Trade History</div>
        <div className="text-xs font-mono text-ink/60 mb-4">Full audit trail — every decision, approved or rejected. Click a row to inspect.</div>
        {trades.length === 0 ? (
          <EmptyBox icon={Inbox} title="No trades logged yet" body="Run an analysis or start the autonomous agent to populate the audit trail." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-left font-display uppercase text-xs border-b-[3px] border-ink">
                  <th className="py-2 pr-3">ID</th>
                  <th className="pr-3">Time</th>
                  <th className="pr-3">Mode</th>
                  <th className="pr-3">Action</th>
                  <th className="pr-3">Pair</th>
                  <th className="pr-3">Conf</th>
                  <th className="pr-3">Status</th>
                  <th className="pr-3">Entry $</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <TradeRow key={t.id} trade={t} onClick={() => setSelectedTrade(t)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BrutalCard>

      {/* On-chain TX history */}
      <BrutalCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="font-display uppercase">On-chain Transactions</div>
          {isConnected && (
            <a href={`${config.bscScan}/address/${address}`} target="_blank" rel="noreferrer"
              className="text-xs font-mono underline hover:text-pink inline-flex items-center gap-1">
              BscScan <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        {!isConnected ? (
          <EmptyBox icon={Inbox} title="Connect a wallet" body="On-chain history is read from your connected wallet."><WalletButton /></EmptyBox>
        ) : txsQ.isLoading ? (
          <div className="mt-4 text-xs font-mono text-ink/60">Loading…</div>
        ) : !txsQ.data?.configured ? (
          <EmptyBox icon={Inbox} title="Not configured" body="Set BSCSCAN_API_KEY on the server to load real transactions." />
        ) : txs.length === 0 ? (
          <EmptyBox icon={Inbox} title="No transactions yet" body={txsQ.data.error ?? txsQ.data.note ?? "No recent transactions on BNB Chain."} />
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-left font-display uppercase text-xs border-b-[3px] border-ink">
                  <th className="py-2 pr-2">Time</th><th className="pr-2">Dir</th><th className="pr-2">Value</th>
                  <th className="pr-2">Status</th><th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.hash} className="border-b border-ink/10 hover:bg-lime/20">
                    <td className="py-2 pr-2">{new Date(t.time).toLocaleString()}</td>
                    <td className="pr-2"><span className={`border-2 border-ink px-1.5 ${t.direction === "IN" ? "bg-lime" : "bg-pink"}`}>{t.direction}</span></td>
                    <td className="pr-2">{t.valueBnb.toFixed(5)} BNB</td>
                    <td className="pr-2"><span className={`px-1.5 border-2 border-ink ${t.status === "CONFIRMED" ? "bg-lime" : "bg-destructive text-destructive-foreground"}`}>{t.status}</span></td>
                    <td>
                      <a href={`${config.bscScan}/tx/${t.hash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline hover:text-pink">
                        {t.hash.slice(0, 10)}…<ExternalLink className="size-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BrutalCard>
    </div>
  );
}

// ─── Trade row ────────────────────────────────────────────────────────────────

function TradeRow({ trade: t, onClick }: { trade: TradeRecord; onClick: () => void }) {
  const statusCls =
    t.aiError ? "bg-orange text-ink"
    : t.status === "rejected" ? "bg-destructive text-destructive-foreground"
    : t.status === "executed" ? "bg-lime text-ink"
    : t.status === "simulated" ? "bg-cyan text-ink"
    : "bg-card text-ink";

  const statusLabel =
    t.aiError ? "AI ERR"
    : t.status === "rejected" ? "REJECT"
    : t.status === "executed" ? "EXEC"
    : t.status === "simulated" ? "SIM"
    : "ANALYSIS";

  return (
    <tr
      className="border-b border-ink/10 hover:bg-lime/20 cursor-pointer"
      onClick={onClick}
    >
      <td className="py-2 pr-3 font-mono text-[10px] text-ink/50">{t.id.slice(0, 8)}</td>
      <td className="pr-3 text-[11px]">{new Date(t.at).toLocaleTimeString()}</td>
      <td className="pr-3">
        <span className={`border border-ink px-1 py-0.5 font-display text-[9px] uppercase ${MODE_COLORS[t.mode]}`}>
          {t.mode}
        </span>
      </td>
      <td className="pr-3">
        <span className={`border-2 border-ink px-1.5 py-0.5 font-display text-[10px] uppercase ${
          t.action === "buy" ? "bg-lime" : t.action === "sell" ? "bg-pink" : "bg-card"
        }`}>{t.action}</span>
      </td>
      <td className="pr-3 text-[11px]">{t.action !== "hold" ? `${t.tokenIn}→${t.tokenOut}` : "—"}</td>
      <td className="pr-3 text-[11px]">{(t.confidence * 100).toFixed(0)}%</td>
      <td className="pr-3">
        <span className={`border-2 border-ink px-1.5 py-0.5 font-display text-[10px] uppercase ${statusCls}`}>{statusLabel}</span>
      </td>
      <td className="pr-3 text-[11px]">{t.entryPrice ? `$${t.entryPrice.toFixed(2)}` : "—"}</td>
    </tr>
  );
}

// ─── Trade detail drawer ──────────────────────────────────────────────────────

function TradeDrawer({ trade: t, onClose }: { trade: TradeRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="relative w-full max-w-lg bg-paper border-l-[3px] border-ink overflow-y-auto shadow-[-8px_0_0_0_#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-paper border-b-[3px] border-ink px-5 py-4 flex items-center justify-between z-10">
          <div>
            <div className="font-display text-xs uppercase text-ink/50">Trade ID</div>
            <div className="font-mono text-sm">{t.id}</div>
          </div>
          <button onClick={onClose} className="border-2 border-ink p-2 hover:bg-pink transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`border-2 border-ink px-2 py-1 font-display text-xs uppercase ${MODE_COLORS[t.mode]}`}>{MODE_LABELS[t.mode]}</span>
            <span className={`border-2 border-ink px-2 py-1 font-display text-xs uppercase ${
              t.action === "buy" ? "bg-lime" : t.action === "sell" ? "bg-pink" : "bg-card"
            }`}>{t.action.toUpperCase()}</span>
            <span className={`border-2 border-ink px-2 py-1 font-display text-xs uppercase ${
              t.status === "executed" ? "bg-lime" : t.status === "simulated" ? "bg-cyan" : t.status === "rejected" ? "bg-destructive text-destructive-foreground" : "bg-card"
            }`}>{t.status.toUpperCase()}</span>
            <span className="border-2 border-ink px-2 py-1 font-mono text-xs text-ink/60">{t.source}</span>
          </div>
          <div className="text-xs font-mono text-ink/50">{new Date(t.at).toLocaleString()}</div>

          {/* Market Snapshot */}
          <Section title="Market Snapshot">
            <Grid>
              <Cell label="BNB Price" value={t.marketSnapshot.price ? `$${t.marketSnapshot.price.toFixed(2)}` : "—"} />
              <Cell label="24h Change" value={t.marketSnapshot.priceChange24h != null ? `${t.marketSnapshot.priceChange24h >= 0 ? "+" : ""}${t.marketSnapshot.priceChange24h.toFixed(2)}%` : "—"} />
              <Cell label="Fear & Greed" value={t.marketSnapshot.fearGreed ? `${t.marketSnapshot.fearGreed.value} · ${t.marketSnapshot.fearGreed.label}` : "—"} />
              <Cell label="OB Imbalance" value={t.marketSnapshot.orderbookImbalance != null ? t.marketSnapshot.orderbookImbalance.toFixed(2) : "—"} />
              <Cell label="Block" value={t.marketSnapshot.blockNumber ? `#${t.marketSnapshot.blockNumber}` : "—"} />
              <Cell label="Gas (gwei)" value={t.marketSnapshot.gasPriceGwei != null ? t.marketSnapshot.gasPriceGwei.toFixed(2) : "—"} />
            </Grid>
          </Section>

          {/* AI Decision */}
          <Section title="AI Decision">
            <Grid>
              <Cell label="Action" value={t.action.toUpperCase()} />
              <Cell label="Token In" value={t.tokenIn} />
              <Cell label="Token Out" value={t.tokenOut} />
              <Cell label="Size" value={`${t.sizePercent}%`} />
              <Cell label="Confidence" value={`${(t.confidence * 100).toFixed(0)}%`} />
            </Grid>
            <div className="mt-3 border-2 border-ink/30 p-3 font-mono text-xs text-ink/80 leading-relaxed">
              {t.reasoning}
            </div>
          </Section>

          {/* Risk Analysis */}
          <Section title="Risk Analysis">
            <div className={`border-2 border-ink p-3 font-display text-xs uppercase flex items-center gap-2 ${
              t.approved ? "bg-lime" : "bg-destructive text-destructive-foreground"
            }`}>
              {t.approved ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {t.approved ? "All guardrails passed" : "Rejected by guardrails"}
            </div>
            {t.riskReason && (
              <div className="mt-2 border-2 border-ink/30 p-3 font-mono text-xs text-pink">{t.riskReason}</div>
            )}
            {t.riskChecks && Object.keys(t.riskChecks).length > 0 && (
              <div className="mt-3 space-y-1">
                {Object.entries(t.riskChecks).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 font-mono text-xs">
                    {v === "PASS"
                      ? <CheckCircle2 className="size-3 text-lime shrink-0" />
                      : <XCircle className="size-3 text-destructive shrink-0" />}
                    <span className="font-display uppercase text-[10px]">{k.replace(/_/g, " ")}</span>
                    <span className={`ml-auto font-display text-[10px] px-1 ${v === "PASS" ? "text-lime" : "text-destructive"}`}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Execution */}
          <Section title="Execution">
            <Grid>
              <Cell label="Status" value={t.status.toUpperCase()} />
              <Cell label="Entry Price" value={t.entryPrice ? `$${t.entryPrice.toFixed(2)}` : "—"} />
              <Cell label="Tx Hash" value={t.txHash ? `${t.txHash.slice(0, 14)}…` : "—"} />
            </Grid>
            {t.txHash && (
              <a
                href={`${config.bscScan}/tx/${t.txHash}`} target="_blank" rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-mono underline hover:text-pink"
              >
                View on BscScan <ExternalLink className="size-3" />
              </a>
            )}
            {t.aiError && (
              <div className="mt-2 border-2 border-orange p-3 font-mono text-xs text-orange">{t.aiError}</div>
            )}
          </Section>

          {/* SLM Reasoning */}
          {t.explanation && (
            <Section title="AI Explanation">
              <div className="border-2 border-ink/20 p-4 font-mono text-sm text-ink/80 leading-relaxed italic bg-card">
                {t.explanation}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-xs uppercase border-b-2 border-ink pb-1 mb-3">{title}</div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-ink/20 p-2">
      <div className="font-display text-[9px] uppercase text-ink/50">{label}</div>
      <div className="font-mono text-xs mt-0.5 truncate">{value}</div>
    </div>
  );
}

function EmptyBox({
  icon: Icon, title, body, children,
}: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="mt-4 border-2 border-dashed border-ink/30 p-6 flex flex-col items-center text-center gap-2">
      <Icon className="size-8 text-ink/40" />
      <div className="font-display uppercase text-sm">{title}</div>
      <p className="text-xs text-ink/60 font-mono max-w-sm">{body}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
