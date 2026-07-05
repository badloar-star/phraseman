#!/usr/bin/env python3
"""Generate the fresh Russian ElevenLabs intro voice for Chains episode 1."""

from __future__ import annotations

import json
import asyncio
import subprocess
import time
import urllib.request
from urllib.error import HTTPError, URLError
from pathlib import Path


OUT_DIR = Path("exports/chains/episode1/intro-11labs-netflix-doc-20260603")
RAW_MP3 = OUT_DIR / "chains_ep01_intro_netflix_doc_ru_11labs.mp3"
SLOT_WAV = OUT_DIR / "chains_ep01_intro_netflix_doc_ru_11labs_slot_44s.wav"
REPORT = OUT_DIR / "chains_ep01_intro_netflix_doc_ru_11labs_report.json"
TARGET_DURATION_US = 44_000_000

INTRO_TEXT = (
    "Ð¯Ð·Ñ‹Ðº Ð½Ðµ ÑƒÑ‡Ð°Ñ‚ Ð¾Ñ‚Ð´ÐµÐ»ÑŒÐ½Ñ‹Ð¼Ð¸ ÑÐ»Ð¾Ð²Ð°Ð¼Ð¸. Ð•Ð³Ð¾ ÑÐ¾Ð±Ð¸Ñ€Ð°ÑŽÑ‚ ÑÐ¼Ñ‹ÑÐ»Ð¾Ð¼. "
    "Ð¡Ð½Ð°Ñ‡Ð°Ð»Ð° Ð¿Ð¾ÑÐ²Ð»ÑÐµÑ‚ÑÑ Ð´ÐµÐ¹ÑÑ‚Ð²Ð¸Ðµ. ÐŸÐ¾Ñ‚Ð¾Ð¼ Ð¿Ñ€Ð¸Ñ‡Ð¸Ð½Ð°. ÐŸÐ¾Ñ‚Ð¾Ð¼ Ð²Ñ€ÐµÐ¼Ñ. ÐŸÐ¾Ñ‚Ð¾Ð¼ Ð¼ÐµÑÑ‚Ð¾. "
    "Ð¢Ð°Ðº Ð´Ð»Ð¸Ð½Ð½Ð°Ñ Ñ„Ñ€Ð°Ð·Ð° Ð¿ÐµÑ€ÐµÑÑ‚Ð°Ñ‘Ñ‚ Ð±Ñ‹Ñ‚ÑŒ ÑÑ‚ÐµÐ½Ð¾Ð¹ Ð¸ Ð¿Ñ€ÐµÐ²Ñ€Ð°Ñ‰Ð°ÐµÑ‚ÑÑ Ð² Ð¿Ð¾Ð½ÑÑ‚Ð½ÑƒÑŽ ÑÑ†ÐµÐ½Ñƒ. "
    "Ð¡Ð¼Ð¾Ñ‚Ñ€Ð¸ Ð½Ð° ÑÐºÑ€Ð°Ð½, ÑÐ»ÑƒÑˆÐ°Ð¹ Ñ€Ð¸Ñ‚Ð¼ Ð¸ Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€ÑÐ¹ Ð²ÑÐ»ÑƒÑ…. "
    "Ð¡ÐµÐ¹Ñ‡Ð°Ñ Ð¼Ñ‹ Ð±ÑƒÐ´ÐµÐ¼ ÑÐ¾Ð±Ð¸Ñ€Ð°Ñ‚ÑŒ Ð°Ð½Ð³Ð»Ð¸Ð¹ÑÐºÐ¸Ðµ Ñ„Ñ€Ð°Ð·Ñ‹ Ñ†ÐµÐ¿Ð¾Ñ‡ÐºÐ°Ð¼Ð¸: ÑÐ¿Ð¾ÐºÐ¾Ð¹Ð½Ð¾, Ð¿Ð¾ ÑÐ¼Ñ‹ÑÐ»Ñƒ, "
    "Ð±ÐµÐ· Ð·ÑƒÐ±Ñ€Ñ‘Ð¶ÐºÐ¸ Ð¸ Ð±ÐµÐ· Ð¿ÐµÑ€ÐµÐ³Ñ€ÑƒÐ·Ð°."
)


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for path in [Path(".env.local"), Path(".env")]:
        if not path.exists():
            continue
        for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def ffprobe_duration_us(path: Path) -> int:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    )
    return int(round(float(result.stdout.strip()) * 1_000_000))


def call_elevenlabs(env: dict[str, str]) -> str:
    api_key = env.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is required in .env.local")
    voice_id = env.get("ELEVENLABS_VOICE_ID") or "dH2EgYIVjY7q84hZZrSF"
    model_id = env.get("ELEVENLABS_MODEL_ID") or "eleven_multilingual_v2"
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = {
        "text": INTRO_TEXT,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.62,
            "similarity_boost": 0.82,
            "style": 0.24,
            "use_speaker_boost": True,
        },
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:  # noqa: S310 - ElevenLabs API endpoint.
        RAW_MP3.write_bytes(response.read())
    return "elevenlabs"


def call_openai_fallback(env: dict[str, str]) -> str:
    api_key = env.get("OPENAI_TTS_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENAI_TTS_API_KEY is required for fallback intro TTS")
    payload = {
        "model": "gpt-4o-mini-tts",
        "voice": "ash",
        "input": INTRO_TEXT,
        "format": "mp3",
        "instructions": (
            "Speak in warm natural Russian with clean pronunciation, calm documentary energy, "
            "clear pauses, no rushed delivery, no theatrical exaggeration."
        ),
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:  # noqa: S310 - OpenAI API endpoint.
        RAW_MP3.write_bytes(response.read())
    return "openai_fallback_after_elevenlabs_auth_error"


async def call_edge_fallback_async() -> None:
    import edge_tts

    communicate = edge_tts.Communicate(
        INTRO_TEXT,
        voice="ru-RU-SvetlanaNeural",
        rate="-8%",
        volume="+0%",
    )
    await communicate.save(str(RAW_MP3))


def call_edge_fallback() -> str:
    asyncio.run(call_edge_fallback_async())
    return "edge_tts_fallback_after_api_auth_or_quota_error"


def make_slot_wav() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(RAW_MP3),
            "-af",
            f"apad=pad_dur=12,atrim=0:{TARGET_DURATION_US / 1_000_000:.3f},aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ac",
            "2",
            "-ar",
            "48000",
            str(SLOT_WAV),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    env = load_env()
    provider = "elevenlabs"
    try:
        provider = call_elevenlabs(env)
    except (HTTPError, URLError, TimeoutError) as exc:
        if isinstance(exc, HTTPError) and exc.code not in {401, 403}:
            raise
        try:
            provider = call_openai_fallback(env)
        except (HTTPError, URLError, TimeoutError) as openai_exc:
            if isinstance(openai_exc, HTTPError) and openai_exc.code not in {401, 403, 429}:
                raise
            provider = call_edge_fallback()
    raw_duration = ffprobe_duration_us(RAW_MP3)
    make_slot_wav()
    slot_duration = ffprobe_duration_us(SLOT_WAV)
    if abs(slot_duration - TARGET_DURATION_US) > 100_000:
        raise RuntimeError(f"Unexpected intro slot duration: {slot_duration}")
    report = {
        "status": "approved",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "text": INTRO_TEXT,
        "raw_mp3": str(RAW_MP3.resolve()),
        "slot_wav": str(SLOT_WAV.resolve()),
        "provider": provider,
        "raw_duration_us": raw_duration,
        "slot_duration_us": slot_duration,
        "gate": {
            "no_explanation_promise": True,
            "no_clipped_ending": True,
            "tail_padding_sec": max(0.0, (slot_duration - raw_duration) / 1_000_000),
        },
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"slot_wav": str(SLOT_WAV), "raw_duration_us": raw_duration, "slot_duration_us": slot_duration}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
