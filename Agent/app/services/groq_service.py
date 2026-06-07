"""Groq AI agent — server-side decision engine.

Calls a Llama-3.3-70B class model with a disciplined system prompt and forces a
JSON object response. Returns the RAW model content; schema validation and
guardrails happen downstream (controller + model layer)."""
from __future__ import annotations

import json
from typing import Any, Optional


class GroqService:
    def __init__(self, api_key: str, model: str) -> None:
        self.model = model
        self._client: Optional[Any] = None
        if api_key:
            # Imported lazily so the app still boots if the SDK is absent.
            from groq import Groq

            self._client = Groq(api_key=api_key)

    @property
    def configured(self) -> bool:
        return self._client is not None

    def decide(self, system_prompt: str, user_payload: dict[str, Any]) -> str:
        """Return the raw JSON string proposed by the model."""
        if self._client is None:
            raise RuntimeError("GROQ_API_KEY not configured")
        completion = self._client.chat.completions.create(
            model=self.model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload)},
            ],
        )
        return completion.choices[0].message.content or ""
