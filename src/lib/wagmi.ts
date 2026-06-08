// Real wallet configuration (wagmi + viem). Chain is env-switchable and
// defaults to BNB Smart Chain TESTNET (id 97):
//   VITE_CHAIN_ID=97  -> bscTestnet  (default)
//   VITE_CHAIN_ID=56  -> bsc (mainnet)
//
// - `injected` (MetaMask / Trust Wallet extension, + EIP-6963 wallets) needs no keys.
// - WalletConnect (Trust Wallet mobile via QR) activates when
//   VITE_WALLETCONNECT_PROJECT_ID is set (free id at https://cloud.reown.com).
import { createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const chainId = Number(import.meta.env.VITE_CHAIN_ID ?? 97);

/** The active chain for the whole app. Import this everywhere instead of a
 *  hardcoded chain so mainnet/testnet flips with one env var. */
export const appChain = chainId === 56 ? bsc : bscTestnet;

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
const customRpc = import.meta.env.VITE_BSC_RPC_URL as string | undefined;
// VITE_BSC_RPC_URL overrides the ACTIVE chain's RPC; each chain keeps a sane default.
const testnetRpc =
  appChain.id === bscTestnet.id && customRpc ? customRpc : "https://bsc-testnet-rpc.publicnode.com";
const mainnetRpc =
  appChain.id === bsc.id && customRpc ? customRpc : "https://bsc-dataseed.binance.org";

/** True when WalletConnect (mobile) is configured. */
export const hasWalletConnect = Boolean(projectId);

export const wagmiConfig = createConfig({
  // Both chains are registered (testnet default); `appChain` is the one the app
  // reads/writes. Components pass chainId: appChain.id explicitly.
  chains: [bscTestnet, bsc],
  ssr: true, // app is server-rendered; defer wallet state until hydration
  connectors: [
    injected({ shimDisconnect: true }),
    ...(projectId
      ? [
          walletConnect({
            projectId,
            showQrModal: true,
            metadata: {
              name: "AlphaTrade",
              description: "Autonomous crypto trading agent on BNB Chain.",
              url: "https://alphatrade.app",
              icons: [],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [bscTestnet.id]: http(testnetRpc),
    [bsc.id]: http(mainnetRpc),
  },
});

// Make wagmi hooks fully type-aware of this config.
declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
