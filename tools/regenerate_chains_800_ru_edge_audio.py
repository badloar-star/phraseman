#!/usr/bin/env python3
"""Regenerate broken Russian phrase WAVs through Edge neural TTS."""

from __future__ import annotations

import asyncio
import json
import subprocess
from pathlib import Path
from typing import Any

import edge_tts


PACK = Path("exports/chains/phrase_packs/chains_800_20260603")
ROWS_JSON = PACK / "capcut_build" / "chains_800_timeline_rows.json"
OUT = PACK / "capcut_build" / "sapi_audio_800" / "ru"
RAW = PACK / "capcut_repair" / "edge_ru_raw_mp3"
REPORT = PACK / "capcut_repair" / "regenerate_ru_edge_report.json"
VOICE = "ru-RU-SvetlanaNeural"
RATE = "-5%"
VOLUME = "+0%"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


async def edge_tts_mp3(text: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(text=text, voice=VOICE, rate=RATE, volume=VOLUME)
    await communicate.save(str(path))


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


async def main_async() -> int:
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
                print(f"[ru-edge] {index:03d}", flush=True)
                await edge_tts_mp3(str(row["russian"]), mp3)
                generated += 1
            convert_mp3_to_wav(mp3, wav)
            converted += 1
        except Exception as exc:  # noqa: BLE001
            failed.append({"index": index, "error": str(exc)})
            write_json(REPORT, {"generated": generated, "converted": converted, "cached": cached, "failed": failed})
            raise
    tiny = [p.name for p in OUT.glob("*.wav") if p.stat().st_size <= 4096]
    report = {
        "provider": "edge-tts",
        "voice": VOICE,
        "rate": RATE,
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


def main() -> int:
    return asyncio.run(main_async())


if __name__ == "__main__":
    raise SystemExit(main())
