import { createFileRoute } from "@tanstack/react-router";

// GET /api/chain/txs?address=0x... — real recent transactions for an address
// from BscScan. Returns { configured:false } when BSCSCAN_API_KEY isn't set, so
// the Activity log shows an honest empty state rather than mock trades.
type Tx = {
  hash: string;
  time: string;
  direction: "IN" | "OUT";
  valueBnb: number;
  status: "CONFIRMED" | "FAILED";
};

export const Route = createFileRoute("/api/chain/txs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const address = new URL(request.url).searchParams.get("address");
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
          return Response.json({ error: "valid ?address= required" }, { status: 400 });
        }
        const key = process.env.BSCSCAN_API_KEY;
        if (!key) {
          return Response.json({ configured: false, txs: [] as Tx[], note: "Set BSCSCAN_API_KEY to load on-chain history." });
        }
        // Testnet by default; override with BSCSCAN_API_URL (mainnet: https://api.bscscan.com/api).
        const api = process.env.BSCSCAN_API_URL || "https://api-testnet.bscscan.com/api";
        try {
          const url = `${api}?module=account&action=txlist&address=${address}&page=1&offset=15&sort=desc&apikey=${key}`;
          const res = await fetch(url);
          const json = (await res.json().catch(() => null)) as any;
          // BscScan returns status "1" with results, or "0" with a message
          // (often just "No transactions found") — not an error condition.
          if (json?.status !== "1" || !Array.isArray(json.result)) {
            return Response.json({ configured: true, txs: [] as Tx[], note: json?.message ?? "No transactions found" });
          }
          const txs: Tx[] = json.result.map((t: any) => ({
            hash: t.hash,
            time: new Date(Number(t.timeStamp) * 1000).toISOString(),
            direction: String(t.from).toLowerCase() === address.toLowerCase() ? "OUT" : "IN",
            valueBnb: Number(t.value) / 1e18,
            status: t.isError === "0" ? "CONFIRMED" : "FAILED",
          }));
          return Response.json({ configured: true, txs });
        } catch (err) {
          return Response.json({
            configured: true,
            txs: [] as Tx[],
            error: err instanceof Error ? err.message : "tx fetch failed",
          });
        }
      },
    },
  },
});
