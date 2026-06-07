"""Strategy-text sanitizer: cap length and strip the most common prompt-injection
patterns and role/control tokens before the text reaches the model. Defense in
depth — the deterministic guardrails are the real backstop."""
from __future__ import annotations

import re

_PATTERNS: list[tuple[str, str]] = [
    (r"[\x00-\x1f\x7f]", " "),  # control chars
    (r"ignore\s+(all|any|the)?\s*(previous|prior|above)?\s*instructions", "[redacted]"),
    (r"disregard\s+(all|any|the)?\s*(previous|prior|above)?\s*(instructions|rules)", "[redacted]"),
    (r"forget\s+(everything|all|your|the)\s+(instructions|rules|above)", "[redacted]"),
    (r"you\s+are\s+now\b", "[redacted]"),
    (r"new\s+(instructions|system\s+prompt|rules)", "[redacted]"),
    (r"system\s*prompt", "[redacted]"),
    (r"\b(jailbreak|DAN\s+mode)\b", "[redacted]"),
    (r"</?\s*(system|assistant|user|tool)\s*>", "[redacted]"),
    (r"`{3,}", ""),
]


def sanitize_strategy(text: str | None) -> str:
    capped = (text or "")[:1500]
    for pattern, repl in _PATTERNS:
        capped = re.sub(pattern, repl, capped, flags=re.IGNORECASE)
    return capped.strip()
