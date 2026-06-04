#!/usr/bin/env python3
"""Regenerate only broken Russian WAV files for the Chains 800 repair."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


PACK = Path("exports/chains/phrase_packs/chains_800_20260603")
ROWS_JSON = PACK / "capcut_build" / "chains_800_timeline_rows.json"
OUT = PACK / "capcut_build" / "sapi_audio_800" / "ru"
REPORT = PACK / "capcut_repair" / "regenerate_ru_openai_report.json"
MODEL_ID = "gpt-4o-mini-tts"
VOICE = "marin"
OUTPUT_FORMAT = "wav"
INSTRUCTIONS = (
    "Говори по-русски теплым нейтральным голосом для учебного видео. "
    "Произношение чистое, ударения естественные и правильные. "
    "Скажи только фразу и остановись чисто, без лишних слов."
)


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


def openai_tts(api_key: str, text: str, path: Path) -> None:
    payload = json.dumps(
        {
            "model": MODEL_ID,
            "voice": VOICE,
            "input": text,
            "instructions": INSTRUCTIONS,
            "response_format": OUTPUT_FORMAT,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    last_error: Exception | None = None
    for attempt in range(1, 6):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                path.write_bytes(response.read())
                return
        except urllib.error.HTTPError as error:
            last_error = RuntimeError(f"OpenAI TTS failed {error.code}: {error.read().decode('utf-8', errors='replace')[:800]}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(1.5 * attempt)
    raise RuntimeError(f"OpenAI TTS failed: {last_error}")


def main() -> int:
    api_key = load_env_file(Path.cwd()).get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required in .env.local")
    rows = load_json(ROWS_JSON)
    OUT.mkdir(parents=True, exist_ok=True)
    generated = 0
    cached = 0
    failed: list[dict[str, Any]] = []
    for row in rows:
        index = int(row["index"])
        path = OUT / f"{index:03d}.wav"
        if path.exists() and path.stat().st_size > 4096:
            cached += 1
            continue
        print(f"[ru-openai] {index:03d}", flush=True)
        try:
            openai_tts(api_key, str(row["russian"]), path)
            generated += 1
        except Exception as exc:  # noqa: BLE001
            failed.append({"index": index, "error": str(exc)})
            write_json(REPORT, {"generated": generated, "cached": cached, "failed": failed})
            raise
    tiny = [p.name for p in OUT.glob("*.wav") if p.stat().st_size <= 4096]
    report = {"generated": generated, "cached": cached, "tiny_after": len(tiny), "tiny_files": tiny[:20], "failed": failed}
    write_json(REPORT, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not tiny and not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
