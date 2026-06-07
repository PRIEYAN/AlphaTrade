// Simple in-memory per-session rate limit for /api/agent/decide.
const bucket = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX = 8;

export function rateLimit(key: string) {
  const now = Date.now();
  const arr = (bucket.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX) return { ok: false, retryInMs: WINDOW_MS - (now - arr[0]) };
  arr.push(now);
  bucket.set(key, arr);
  return { ok: true };
}
