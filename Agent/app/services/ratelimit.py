"""Tiny in-memory sliding-window rate limiter for the decision endpoint.
Mirrors the web app's per-session limiter. Process-local (not for multi-worker
horizontal scaling — put a shared store in front for that)."""
from __future__ import annotations

import time

_WINDOW_SECONDS = 60.0
_MAX_REQUESTS = 20
_hits: dict[str, list[float]] = {}


def check(key: str) -> tuple[bool, int]:
    """Returns (ok, retry_in_ms). ok=False means the caller is over the limit."""
    now = time.time()
    bucket = [t for t in _hits.get(key, []) if now - t < _WINDOW_SECONDS]
    if len(bucket) >= _MAX_REQUESTS:
        retry_in_ms = int((_WINDOW_SECONDS - (now - bucket[0])) * 1000)
        _hits[key] = bucket
        return False, max(retry_in_ms, 0)
    bucket.append(now)
    _hits[key] = bucket
    return True, 0
