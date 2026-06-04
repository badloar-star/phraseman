#!/usr/bin/env python3
"""Generate OpenAI TTS audio for CHAINS episode 1."""

from __future__ import annotations

import hashlib
import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


PACK = Path("exports/chains/episode1")
MODEL_ID = "gpt-4o-mini-tts"
OUTPUT_FORMAT = "wav"
ROLES: dict[str, dict[str, str]] = {
    "en1": {
        "voice": "coral",
        "instructions": "Speak American English clearly for a chain-method lesson. Slow, warm, precise pronunciation. Say only the phrase, then stop cleanly.",
    },
    "ru": {
        "voice": "marin",
        "instructions": "Speak Russian with a warm native Moscow-neutral accent. Clear lesson voice, correct stress. Say only the phrase, then stop cleanly.",
    },
    "en2": {
        "voice": "cedar",
        "instructions": "Speak American English naturally at a calm medium lesson pace. Clear pronunciation and stress. Say only the phrase, then stop cleanly.",
    },
}


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
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def digest(role: str, row: dict[str, Any]) -> str:
    text = row["russian"] if role == "ru" else row["english"]
    payload = {"role": role, "text": text, "model": MODEL_ID, "voice": ROLES[role]["voice"], "instructions": ROLES[role]["instructions"]}
    return hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:12]


def probe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    )
    return float(completed.stdout.strip())


def openai_tts(api_key: str, role: str, text: str, path: Path) -> None:
    payload = json.dumps(
        {
            "model": MODEL_ID,
            "voice": ROLES[role]["voice"],
            "input": text,
            "instructions": ROLES[role]["instructions"],
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
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                path.write_bytes(response.read())
                return
        except urllib.error.HTTPError as error:
            last_error = RuntimeError(f"OpenAI TTS failed {error.code}: {error.read().decode('utf-8', errors='replace')[:600]}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(1.5 * attempt)
    raise RuntimeError(f"OpenAI TTS failed: {last_error}")


def main() -> int:
    api_key = load_env_file(Path.cwd()).get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required")
    rows = load_json(PACK / "phrase_rows.json")
    out = PACK / "openai-audio"
    manifest: list[dict[str, Any]] = []
    generated = 0
    cached = 0
    for row in rows:
        for role in ["en1", "ru", "en2"]:
            text = str(row["russian"] if role == "ru" else row["english"]).rstrip(".")
            path = out / role / f"{int(row['index']):03d}_{digest(role, row)}.{OUTPUT_FORMAT}"
            item = {"index": int(row["index"]), "role": role, "text": text, "voice": ROLES[role]["voice"], "path": path.as_posix(), "duration_sec": None}
            path.parent.mkdir(parents=True, exist_ok=True)
            if path.exists() and path.stat().st_size > 1024:
                cached += 1
            else:
                print(f"[chains-tts] {role} {int(row['index']):03d}", flush=True)
                openai_tts(str(api_key), role, text, path)
                generated += 1
            item["duration_sec"] = probe_duration(path)
            manifest.append(item)
    summary = {
        "planned": len(manifest),
        "generated": generated,
        "cached": cached,
        "roles": {role: sum(1 for item in manifest if item["role"] == role) for role in ROLES},
        "duration_min": min(item["duration_sec"] for item in manifest),
        "duration_max": max(item["duration_sec"] for item in manifest),
    }
    write_json(out / "tts_manifest.json", manifest)
    write_json(out / "generation_summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
