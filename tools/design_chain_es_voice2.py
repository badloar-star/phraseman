#!/usr/bin/env python3
"""Create and save the dedicated male Spanish narrator for the chain pack.

The script is deliberately idempotent by voice name and never prints secrets or
base64 audio.  It stores the three design previews and a small receipt next to
the target package.
"""

from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env.local"
PACKAGE = Path(r"C:\Users\badlo\OneDrive\Документы\проекты\CHAIN_ES_50_ACTIVE_LISTENING_A1_FULL_PACK")
PREVIEW_DIR = PACKAGE / "VOICE_PREVIEWS"
RECEIPT = PREVIEW_DIR / "SPANISH_VOICE_2_RECEIPT.json"
VOICE_NAME = "DIEGO ES NARRATOR"
DESCRIPTION = (
    "A native European Spanish male narrator, 35 to 45 years old, with a warm "
    "low baritone and impeccable standard Castilian pronunciation. Calm, patient "
    "and reassuring language teacher delivery; measured pace, clear consonants, "
    "natural pauses, neutral professional studio tone, never theatrical, rushed, "
    "breathy, gravelly, nasal or overly energetic. Suitable for slow A1 listening practice."
)
TEST_TEXT = (
    "Hola. Soy tu profesor de español. Escucha con calma y repite después de mí. "
    "Hoy practicaremos frases sencillas, con una pronunciación clara, natural y pausada. "
    "No tengas prisa: respira, escucha cada palabra y vuelve a intentarlo."
)


def read_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if value:
        return value
    if ENV_PATH.exists():
        for raw in ENV_PATH.read_text(encoding="utf-8-sig").splitlines():
            if raw.strip().startswith(f"{name}="):
                return raw.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def api_json(method: str, url: str, api_key: str, payload: dict | None = None) -> dict:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=body,
        method=method,
        headers={"xi-api-key": api_key, "Content-Type": "application/json"},
    )
    try:
        with urlopen(request, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:1000]
        raise RuntimeError(f"ElevenLabs HTTP {exc.code}: {detail}") from exc


def main() -> int:
    if read_env("PHRASEMAN_ALLOW_ELEVENLABS_DEV_SPEND") != "1":
        raise RuntimeError("Set PHRASEMAN_ALLOW_ELEVENLABS_DEV_SPEND=1 for the authorized voice design call.")
    api_key = read_env("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is missing.")

    voices = api_json("GET", "https://api.elevenlabs.io/v2/voices?page_size=100", api_key)
    existing = next((v for v in voices.get("voices", []) if v.get("name") == VOICE_NAME), None)
    if existing:
        receipt = {
            "voice_name": VOICE_NAME,
            "voice_id": existing["voice_id"],
            "reused_existing": True,
            "model_for_production": "eleven_v3",
        }
        PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
        RECEIPT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"VOICE_READY name={VOICE_NAME} reused=true")
        return 0

    design = api_json(
        "POST",
        "https://api.elevenlabs.io/v1/text-to-voice/design?output_format=mp3_44100_192",
        api_key,
        {
            "voice_description": DESCRIPTION,
            "text": TEST_TEXT,
            "auto_generate_text": False,
            "loudness": 0.5,
            "quality": 0.9,
            "guidance_scale": 5,
        },
    )
    previews = design.get("previews") or []
    if not previews:
        raise RuntimeError("ElevenLabs returned no voice previews.")
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    preview_meta = []
    for index, preview in enumerate(previews, start=1):
        audio = base64.b64decode(preview["audio_base_64"])
        path = PREVIEW_DIR / f"spanish_voice_2_candidate_{index}.mp3"
        path.write_bytes(audio)
        preview_meta.append(
            {
                "candidate": index,
                "file": path.name,
                "generated_voice_id": preview["generated_voice_id"],
                "duration_secs": preview.get("duration_secs"),
                "media_type": preview.get("media_type"),
            }
        )

    selected = previews[0]
    saved = api_json(
        "POST",
        "https://api.elevenlabs.io/v1/text-to-voice",
        api_key,
        {
            "voice_name": VOICE_NAME,
            "voice_description": DESCRIPTION,
            "generated_voice_id": selected["generated_voice_id"],
            "labels": {"language": "es", "accent": "Spain", "use_case": "education"},
        },
    )
    receipt = {
        "voice_name": VOICE_NAME,
        "voice_id": saved["voice_id"],
        "reused_existing": False,
        "selected_candidate": 1,
        "model_for_production": "eleven_v3",
        "production_speed": 0.85,
        "description": DESCRIPTION,
        "previews": preview_meta,
    }
    RECEIPT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"VOICE_READY name={VOICE_NAME} candidates={len(previews)} selected=1")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
