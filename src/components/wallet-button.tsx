import { useState } from "react";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { bsc } from "wagmi/chains";
import { formatUnits } from "viem";
import { Wallet, Loader2, ChevronDown, Power, AlertTriangle } from "lucide-react";

function short(addr?: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

/**
 * Real wallet connect/disconnect button (wagmi). Lists every available
 * connector — the injected browser wallet (MetaMask / Trust Wallet extension,
 * and any EIP-6963-discovered wallet) plus WalletConnect for Trust Wallet
 * mobile when VITE_WALLETCONNECT_PROJECT_ID is set. No mock state.
 */
export function WalletButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { data: bal } = useBalance({
    address,
    chainId: bsc.id,
    query: { enabled: isConnected },
  });
  const [open, setOpen] = useState(false);

  if (isConnected) {
    // Connected but on the wrong network — must be BSC (56) to trade.
    if (chainId !== bsc.id) {
      return (
        <button
          onClick={() => switchChain({ chainId: bsc.id })}
          disabled={switching}
          className="inline-flex items-center gap-2 border-brutal bg-destructive text-destructive-foreground px-3 py-2 font-display text-xs uppercase shadow-brutal-sm"
        >
          <AlertTriangle className="size-4" /> {switching ? "Switching…" : "Switch to BSC"}
        </button>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex border-brutal bg-lime px-3 py-2 font-mono text-xs shadow-brutal-sm">
          {bal ? `${Number(formatUnits(bal.value, bal.decimals)).toFixed(3)} ${bal.symbol}` : "…"} · {short(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="border-brutal bg-card px-3 py-2 font-display text-xs uppercase shadow-brutal-sm inline-flex items-center gap-1"
        >
          <Power className="size-3" /> <span className="hidden sm:inline">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="inline-flex items-center gap-2 border-brutal bg-pink px-3 py-2 font-display text-sm uppercase shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-60"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
        Connect Wallet <ChevronDown className="size-3" />
      </button>
      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 w-60 border-brutal bg-paper shadow-brutal p-2 space-y-1">
            {connectors.length === 0 && (
              <div className="p-2 text-xs font-mono text-ink/60">
                No wallet detected. Install MetaMask / Trust Wallet, or set a
                WalletConnect project id for mobile.
              </div>
            )}
            {connectors.map((c) => (
              <button
                key={c.uid}
                onClick={() => {
                  connect({ connector: c });
                  setOpen(false);
                }}
                className="w-full text-left border-2 border-ink bg-card px-3 py-2 font-display text-xs uppercase hover:bg-lime transition-colors"
              >
                {c.name}
              </button>
            ))}
            <div className="px-1 pt-1 text-[10px] font-mono text-ink/50">BNB Smart Chain · 56</div>
          </div>
        </>
      )}
    </div>
  );
}
