// Real wallet configuration (wagmi + viem) for BNB Smart Chain (id 56).
//
// - The `injected` connector (MetaMask / Trust Wallet extension, plus any
//   EIP-6963-discovered wallet) works with ZERO setup — no keys required.
// - The WalletConnect connector (Trust Wallet MOBILE via QR) is added only when
//   VITE_WALLETCONNECT_PROJECT_ID is present. Grab a free id at
//   https://cloud.reown.com (formerly WalletConnect Cloud).
import { createConfig, http } from "wagmi";
import { bsc } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
const rpcUrl = (import.meta.env.VITE_BSC_RPC_URL as string) || "https://bsc-dataseed.binance.org";

/** True when WalletConnect (mobile) is configured. */
export const hasWalletConnect = Boolean(projectId);

export const wagmiConfig = createConfig({
  chains: [bsc],
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
    [bsc.id]: http(rpcUrl),
  },
});

// Make wagmi hooks fully type-aware of this config.
declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
