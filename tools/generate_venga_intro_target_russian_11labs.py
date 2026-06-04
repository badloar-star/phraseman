#!/usr/bin/env python3
"""Generate Russian-language Venga intro voiceovers for target languages."""

from __future__ import annotations

import argparse
import json
import subprocess
import time
from pathlib import Path
from typing import Any

import requests


OUT_DIR = Path("exports/venga-phrase-packs/intro-russian-target-11labs")
MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "mp3_44100_128"
ALINA_BEAUTY_VOICE_ID = "dH2EgYIVjY7q84hZZrSF"
INTRO_DURATION_SEC = 19.833333
INTRO_TAIL_SILENCE_SEC = 0.55

TARGETS = {
    "de": ("немецком", "немецких"),
    "en": ("английском", "английских"),
    "es": ("испанском", "испанских"),
    "it": ("итальянском", "итальянских"),
    "fr": ("французском", "французских"),
}


def load_env(path: Path = Path(".env.local")) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def intro_text(code: str) -> str:
    if code not in TARGETS:
        raise RuntimeError(f"Unsupported target code: {code}")
    language, adjective = TARGETS[code]
    return (
        f"В этом видео я научу тебя говорить на {language}. "
        "Тебе не нужны толстые учебники и куча выученных правил. "
        f"Ты услышишь 200 {adjective} фраз уровня A1 с разным темпом озвучивания. "
        "Включай видео фоном, пока занимаешься другими важными делами, "
        "имитируя вокруг себя языковую среду."
    )


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
            "stability": 0.50,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
            "speed": 1.0,
        },
        "apply_text_normalization": "on",
        "seed": 1062026,
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
    dst.parent.mkdir(parents=True, exist_ok=True)
    duration = float(probe(src)["duration_sec"])
    target_speech_sec = INTRO_DURATION_SEC - INTRO_TAIL_SILENCE_SEC
    filters: list[str] = []
    speed_factor = 1.0
    if duration > target_speech_sec:
        speed_factor = duration / target_speech_sec
        filters.append(atempo_filter(speed_factor))
    filters.append("apad")
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", choices=sorted(TARGETS), default="de")
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    env = load_env()
    api_key = env.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is missing in .env.local")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    text = intro_text(args.target)
    mp3 = args.out_dir / f"intro_ru_for_{args.target}_alina_beauty.mp3"
    wav = args.out_dir / f"intro_ru_for_{args.target}_alina_beauty_slot_19s83.wav"
    if args.overwrite or not mp3.exists():
        elevenlabs_tts(str(api_key), text, mp3)
    fit = fit_to_slot(mp3, wav)
    manifest = {
        "target": args.target,
        "language_code": "ru",
        "text": text,
        "voice": "ALINA BEAUTY",
        "voice_id": ALINA_BEAUTY_VOICE_ID,
        "model_id": MODEL_ID,
        "mp3": str(mp3),
        "wav": str(wav),
        "fit": fit,
        "mp3_probe": probe(mp3),
        "wav_probe": probe(wav),
    }
    (args.out_dir / f"intro_ru_for_{args.target}_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
