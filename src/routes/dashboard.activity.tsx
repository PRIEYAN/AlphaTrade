import { createFileRoute } from "@tanstack/react-router";
import { BrutalCard, StickerTag } from "@/components/brutal";
import { config } from "@/lib/config";
import { WalletButton } from "@/components/wallet-button";
import { ExternalLink, Trophy, Bot, Coins, Inbox } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/dashboard/activity")({
  component: ActivityPage,
});

type TxResp = {
  configured: boolean;
  txs: { hash: string; time: string; direction: "IN" | "OUT"; valueBnb: number; status: "CONFIRMED" | "FAILED" }[];
  note?: string;
  error?: string;
};

function ActivityPage() {
  const { address, isConnected } = useAccount();
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);

  const txsQ = useQuery({
    queryKey: ["txs", address],
    queryFn: async (): Promise<TxResp> => {
      const res = await fetch(`/api/chain/txs?address=${address}`);
      return res.json();
    },
    enabled: isConnected && !!address,
  });

  const register = async () => {
    setRegistering(true);
    try {
      // Signing is server-side — the browser never sees TWAK credentials.
      const res = await fetch("/api/twak/register", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Registration failed");
        return;
      }
      setRegistered(Boolean(data.registered));
      if (data.simulated) {
        toast.message("Registered (simulated — TWAK not configured)");
      } else {
        toast.success("Agent registered for competition");
      }
    } catch {
      toast.error("Registration request failed");
    } finally {
      setRegistering(false);
    }
  };

  const txs = txsQ.data?.txs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <StickerTag tone="orange">Proof</StickerTag>
        <h1 className="font-display text-4xl md:text-5xl uppercase mt-2">Activity</h1>
      </div>

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
        <button onClick={register} disabled={registered || registering}
          className="inline-flex items-center gap-2 border-2 border-paper bg-lime text-ink px-4 py-2 font-display uppercase shadow-[5px_5px_0_0_#f5f1e0] disabled:opacity-50">
          <Trophy className="size-4" /> {registered ? "Registered" : registering ? "Registering…" : "Register Agent"}
        </button>
      </BrutalCard>

      <BrutalCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="font-display uppercase">Trade Log</div>
          {isConnected && (
            <a href={`${config.bscScan}/address/${address}`} target="_blank" rel="noreferrer"
              className="text-xs font-mono underline hover:text-pink inline-flex items-center gap-1">
              View on BscScan <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        {!isConnected ? (
          <EmptyBox icon={Inbox} title="Connect a wallet" body="On-chain trade history is read from your connected wallet.">
            <WalletButton />
          </EmptyBox>
        ) : txsQ.isLoading ? (
          <div className="mt-4 text-xs font-mono text-ink/60">Loading on-chain history…</div>
        ) : !txsQ.data?.configured ? (
          <EmptyBox icon={Inbox} title="History source not configured"
            body="Set BSCSCAN_API_KEY on the server to load real transactions. No mock trades are shown." />
        ) : txs.length === 0 ? (
          <EmptyBox icon={Inbox} title="No transactions yet"
            body={txsQ.data.error ?? txsQ.data.note ?? "This wallet has no recent transactions on BNB Chain."} />
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

      <div className="grid lg:grid-cols-2 gap-5">
        <BrutalCard className="p-5">
          <div className="font-display uppercase mb-1">AI Decisions</div>
          <EmptyBox icon={Bot} title="No decisions logged"
            body="Each AI decision will appear here once decision logging is persisted. Nothing is fabricated in the meantime." />
        </BrutalCard>

        <BrutalCard className="p-5">
          <div className="font-display uppercase mb-1">x402 Payments</div>
          <EmptyBox icon={Coins} title="No payments yet"
            body="Pay-per-call x402 settlements will appear here once the facilitator is wired. No placeholder ledger." />
        </BrutalCard>
      </div>
    </div>
  );
}

function EmptyBox({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-2 border-dashed border-ink/30 p-6 flex flex-col items-center text-center gap-2">
      <Icon className="size-8 text-ink/40" />
      <div className="font-display uppercase text-sm">{title}</div>
      <p className="text-xs text-ink/60 font-mono max-w-sm">{body}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
