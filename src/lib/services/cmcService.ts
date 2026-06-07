// Client-side accessor for live market signals served by /api/signals.
// No mock data: when the server has no CMC key, `configured` is false and the
// UI renders an honest empty state instead of fabricated numbers.
export type Signals = {
  configured: boolean;
  fearGreed: { value: number; label: string; updatedAt: string } | null;
  funding: { symbol: string; rate: number }[] | null;
  sentiment: { symbol: string; score: number }[] | null;
  momentum: { symbol: string; rsi: number; macd: number }[] | null;
  note?: string;
  error?: string;
};

export async function fetchSignals(): Promise<Signals> {
  const res = await fetch("/api/signals");
  if (!res.ok) throw new Error(`signals request failed (${res.status})`);
  return res.json();
}
