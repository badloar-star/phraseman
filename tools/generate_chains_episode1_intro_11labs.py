#!/usr/bin/env python3
"""Generate Russian ElevenLabs intro voiceover for the first CHAINS episode."""

from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path
from typing import Any

import requests


OUT_DIR = Path("exports/chains/episode1/intro-11labs")
MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "mp3_44100_128"
ALINA_BEAUTY_VOICE_ID = "dH2EgYIVjY7q84hZZrSF"
INTRO_DURATION_SEC = 41.1
INTRO_TAIL_SILENCE_SEC = 0.8

INTRO_TEXT = (
    "Сегодня мы будем учить английский язык с помощью метода цепочек. "
    "Сначала ты услышишь короткую фразу, потом она будет становиться длиннее и естественнее. "
    "Смотри на экран, слушай перевод и повторяй вслух. "
    "Так мозг быстро привыкает собирать английскую речь по шагам."
)


def load_env(path: Path = Path(".env.local")) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def probe(path: Path) -> dict[str, Any]:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    data = json.loads(completed.stdout)
    stream = next(item for item in data["streams"] if item.get("codec_type") == "audio")
    return {
        "duration_sec": round(float(data.get("format", {}).get("duration") or stream.get("duration") or 0.0), 6),
        "codec": stream.get("codec_name"),
        "sample_rate": int(stream.get("sample_rate") or 0),
        "channels": int(stream.get("channels") or 0),
        "size": int(path.stat().st_size),
    }


def elevenlabs_tts(api_key: str, text: str, path: Path) -> None:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ALINA_BEAUTY_VOICE_ID}?output_format={OUTPUT_FORMAT}"
    payload = {
        "text": text,
        "model_id": MODEL_ID,
        "language_code": "ru",
        "voice_settings": {
            "stability": 0.52,
            "similarity_boost": 0.78,
            "style": 0.0,
            "use_speaker_boost": True,
            "speed": 0.96,
        },
        "apply_text_normalization": "on",
        "seed": 106202601,
    }
    headers = {"Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": api_key}
    last_error = ""
    for attempt in range(1, 5):
        response = requests.post(url, headers=headers, data=json.dumps(payload, ensure_ascii=False).encode("utf-8"), timeout=120)
        if response.ok:
            path.write_bytes(response.content)
            return
        last_error = f"HTTP {response.status_code}: {response.text[:500]}"
        time.sleep(1.5 * attempt)
    raise RuntimeError(f"ElevenLabs request failed: {last_error}")


def atempo_filter(factor: float) -> str:
    parts: list[str] = []
    while factor > 2.0:
        parts.append("atempo=2.0")
        factor /= 2.0
    while factor < 0.5:
        parts.append("atempo=0.5")
        factor /= 0.5
    parts.append(f"atempo={factor:.6f}")
    return ",".join(parts)


def fit_to_slot(src: Path, dst: Path) -> dict[str, float]:
    duration = float(probe(src)["duration_sec"])
    target_speech_sec = INTRO_DURATION_SEC - INTRO_TAIL_SILENCE_SEC
    filters: list[str] = []
    speed_factor = 1.0
    if duration > target_speech_sec:
        speed_factor = duration / target_speech_sec
        filters.append(atempo_filter(speed_factor))
    filters.append("apad")
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(src),
            "-af",
            ",".join(filters),
            "-t",
            f"{INTRO_DURATION_SEC:.6f}",
            "-ac",
            "1",
            "-ar",
            "44100",
            "-c:a",
            "pcm_s16le",
            str(dst),
        ],
        check=True,
    )
    return {"raw_duration_sec": duration, "speed_factor": speed_factor, "tail_silence_sec": INTRO_TAIL_SILENCE_SEC}


def main() -> int:
    env = load_env()
    api_key = env.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is missing in .env.local")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    mp3 = OUT_DIR / "chains_ep01_intro_ru_alina_beauty.mp3"
    wav = OUT_DIR / "chains_ep01_intro_ru_alina_beauty_slot_41s10.wav"
    if not mp3.exists():
        elevenlabs_tts(api_key, INTRO_TEXT, mp3)
    fit = fit_to_slot(mp3, wav)
    manifest = {
        "text": INTRO_TEXT,
        "language_code": "ru",
        "voice": "ALINA BEAUTY",
        "voice_id": ALINA_BEAUTY_VOICE_ID,
        "model_id": MODEL_ID,
        "mp3": str(mp3),
        "wav": str(wav),
        "fit": fit,
        "mp3_probe": probe(mp3),
        "wav_probe": probe(wav),
    }
    (OUT_DIR / "intro_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
