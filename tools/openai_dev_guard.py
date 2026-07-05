"""Guard for dev-only OpenAI batch scripts.

These scripts are not user runtime, but they can burn real API money in bulk.
Require an explicit opt-in after a dry run or cost estimate.
"""

from __future__ import annotations

import os
from typing import Optional


def require_openai_dev_spend_guard(
    *,
    action: str,
    estimated_cost_usd: Optional[float] = None,
    units: Optional[int] = None,
) -> None:
    if os.environ.get("PHRASEMAN_ALLOW_OPENAI_DEV_SPEND") == "1":
        return
    planned = f" Planned units: {units}." if units is not None else ""
    cost = f" Estimated cost: ${estimated_cost_usd:.4f}." if estimated_cost_usd is not None else ""
    raise RuntimeError(
        f"[openai-dev-guard] {action} is blocked.{planned}{cost} "
        "Run a dry-run/cost estimate first, then set PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 to spend intentionally."
    )


def require_codex_openai_tts_only(*, action: str, endpoint: str) -> None:
    """Block local Codex OpenAI calls except /v1/audio/speech."""
    if not os.environ.get("CODEX_THREAD_ID"):
        return
    if endpoint == "audio/speech":
        return
    raise RuntimeError(
        f"[codex-openai-firewall] {action} is blocked in Codex sessions. "
        "Codex may use the project OpenAI API only for TTS voiceover generation via /v1/audio/speech. "
        "Use Firebase user runtime, local files, or an exported report instead."
    )
