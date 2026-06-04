#!/usr/bin/env python3
"""Regenerate broken Russian phrase WAVs through ElevenLabs fallback."""

from __future__ import annotations

import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


PACK = Path("exports/chains/phrase_packs/chains_800_20260603")
ROWS_JSON = PACK / "capcut_build" / "chains_800_timeline_rows.json"
OUT = PACK / "capcut_build" / "sapi_audio_800" / "ru"
RAW = PACK / "capcut_repair" / "elevenlabs_ru_raw_mp3"
REPORT = PACK / "capcut_repair" / "regenerate_ru_elevenlabs_report.json"
MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "mp3_44100_128"
DEFAULT_VOICE_ID = "dH2EgYIVjY7q84hZZrSF"


def load_env_file(start: Path) -> dict[str, str]:
    env_path = next((folder / ".env.local" for folder in [start.resolve(), *start.resolve().parents] if (folder / ".env.local").exists()), None)
    values: dict[str, str] = {}
    if not env_path:
        return values
    for line in env_path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def eleven_tts(api_key: str, voice_id: str, text: str, path: Path) -> None:
    payload = {
        "text": text,
        "model_id": MODEL_ID,
        "language_code": "ru",
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.78,
            "style": 0.0,
            "use_speaker_boost": True,
            "speed": 0.94,
        },
        "apply_text_normalization": "on",
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format={OUTPUT_FORMAT}",
        data=data,
        headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        method="POST",
    )
    last_error: Exception | None = None
    for attempt in range(1, 6):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                path.write_bytes(response.read())
                return
        except urllib.error.HTTPError as error:
            last_error = RuntimeError(f"ElevenLabs failed {error.code}: {error.read().decode('utf-8', errors='replace')[:800]}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(1.2 * attempt)
    raise RuntimeError(f"ElevenLabs failed: {last_error}")


def convert_mp3_to_wav(mp3: Path, wav: Path) -> None:
    wav.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(mp3),
            "-ac",
            "1",
            "-ar",
            "44100",
            "-sample_fmt",
            "s16",
            str(wav),
        ],
        check=True,
    )


def main() -> int:
    env = load_env_file(Path.cwd())
    api_key = env.get("ELEVENLABS_API_KEY")
    voice_id = env.get("ELEVENLABS_VOICE_ID") or DEFAULT_VOICE_ID
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is required in .env.local")
    rows = load_json(ROWS_JSON)
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    generated = 0
    converted = 0
    cached = 0
    failed: list[dict[str, Any]] = []
    for row in rows:
        index = int(row["index"])
        wav = OUT / f"{index:03d}.wav"
        if wav.exists() and wav.stat().st_size > 4096:
            cached += 1
            continue
        mp3 = RAW / f"{index:03d}.mp3"
        try:
            if not mp3.exists() or mp3.stat().st_size <= 4096:
                print(f"[ru-eleven] {index:03d}", flush=True)
                eleven_tts(api_key, voice_id, str(row["russian"]), mp3)
                generated += 1
            convert_mp3_to_wav(mp3, wav)
            converted += 1
        except Exception as exc:  # noqa: BLE001
            failed.append({"index": index, "error": str(exc)})
            write_json(REPORT, {"generated": generated, "converted": converted, "cached": cached, "failed": failed})
            raise
    tiny = [p.name for p in OUT.glob("*.wav") if p.stat().st_size <= 4096]
    report = {
        "provider": "elevenlabs",
        "voice_id": voice_id,
        "generated": generated,
        "converted": converted,
        "cached": cached,
        "tiny_after": len(tiny),
        "tiny_files": tiny[:20],
        "failed": failed,
    }
    write_json(REPORT, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not tiny and not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
