#!/usr/bin/env python3
"""Generate OpenAI TTS audio for the Venga RU->DE phrase pack."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


MODEL_ID = "gpt-4o-mini-tts"
OUTPUT_FORMAT = "wav"
ROLE_CONFIG: dict[str, dict[str, str]] = {
    "ru": {
        "voice": "marin",
        "instructions": (
            "Speak in Russian with a warm native Moscow-neutral accent. Slow, pleasant, clear YouTube lesson voice. "
            "Correct Russian stress. Say only the phrase, then stop cleanly with a tiny natural pause. No extra words."
        ),
    },
    "de1": {
        "voice": "coral",
        "instructions": (
            "Speak German slowly and clearly for an A1 learner. Warm, beautiful native Hochdeutsch teacher voice. "
            "Correct German stress and vowel length. Say only the phrase, then stop cleanly with a tiny natural pause. No extra words."
        ),
    },
    "de2": {
        "voice": "cedar",
        "instructions": (
            "Speak German at a calm medium lesson pace, clear and natural, not rushed. Native Hochdeutsch pronunciation. "
            "Correct stress, vowel length, and final consonants. Say only the phrase, then stop cleanly with a tiny natural pause. No extra words."
        ),
    },
    "de3": {
        "voice": "sage",
        "instructions": (
            "Speak German slowly and clearly, not faster than the previous voice. Gentle learner-friendly native Hochdeutsch pronunciation. "
            "Correct stress and vowel length. Say only the phrase, then stop cleanly with a tiny natural pause. No extra words."
        ),
    },
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_env_file(start: Path) -> dict[str, str]:
    current = start.resolve()
    env_path = next((folder / ".env.local" for folder in [current, *current.parents] if (folder / ".env.local").exists()), None)
    if not env_path:
        return {}
    values: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def digest_for(role: str, row: dict[str, Any]) -> str:
    text = str(row["ru"] if role == "ru" else row["de"])
    payload = {
        "role": role,
        "index": int(row["index"]),
        "text": text,
        "model": MODEL_ID,
        "format": OUTPUT_FORMAT,
        "config": ROLE_CONFIG[role],
    }
    return hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:12]


def probe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    )
    return float(completed.stdout.strip())


def openai_tts(*, api_key: str, role: str, text: str, path: Path, retries: int = 4) -> None:
    payload = json.dumps(
        {
            "model": MODEL_ID,
            "voice": ROLE_CONFIG[role]["voice"],
            "input": text,
            "instructions": ROLE_CONFIG[role]["instructions"],
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
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                path.write_bytes(response.read())
                return
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            last_error = RuntimeError(f"OpenAI TTS failed {error.code}: {body[:600]}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        if attempt < retries:
            time.sleep(1.5 * attempt)
    raise RuntimeError(f"OpenAI TTS failed after {retries} attempts: {last_error}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phrases", type=Path, default=Path("exports/venga-phrase-packs/ru-de-a1-vsscp/phrase_rows.json"))
    parser.add_argument("--out-dir", type=Path, default=Path("exports/venga-phrase-packs/ru-de-a1-vsscp/openai-audio"))
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    env = load_env_file(Path.cwd())
    api_key = env.get("OPENAI_TTS_API_KEY")
    if not api_key and not args.dry_run:
        raise RuntimeError("OPENAI_TTS_API_KEY is required in .env.local")

    rows = load_json(args.phrases)
    if args.limit:
        rows = rows[: args.limit]
    args.out_dir.mkdir(parents=True, exist_ok=True)

    manifest: list[dict[str, Any]] = []
    for row in rows:
        for role in ["ru", "de1", "de2", "de3"]:
            text = str(row["ru"] if role == "ru" else row["de"])
            path = args.out_dir / role / f"{int(row['index']):03d}_{digest_for(role, row)}.{OUTPUT_FORMAT}"
            manifest.append(
                {
                    "index": int(row["index"]),
                    "role": role,
                    "source_text": text,
                    "tts_text": text,
                    "ru": row["ru"],
                    "de": row["de"],
                    "ipa": row["ipa"],
                    "breakdown": row["breakdown"],
                    "voice": ROLE_CONFIG[role]["voice"],
                    "instructions": ROLE_CONFIG[role]["instructions"],
                    "model_id": MODEL_ID,
                    "output_format": OUTPUT_FORMAT,
                    "path": path.as_posix(),
                    "duration_sec": None,
                    "status": "pending",
                }
            )
    write_json(args.out_dir / "voice_config.json", {"model_id": MODEL_ID, "roles": ROLE_CONFIG})
    write_json(args.out_dir / "tts_manifest.planned.json", manifest)
    if args.dry_run:
        print(json.dumps({"planned_files": len(manifest), "out_dir": args.out_dir.as_posix()}, ensure_ascii=False))
        return 0

    generated = 0
    cached = 0
    started = time.time()
    log_path = args.out_dir / "generation_log.jsonl"
    for position, item in enumerate(manifest, start=1):
        path = Path(item["path"])
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.stat().st_size > 1024 and not args.overwrite:
            item["duration_sec"] = probe_duration(path)
            item["status"] = "cached"
            cached += 1
            continue
        print(f"[openai-tts-de] {position:03d}/{len(manifest):03d} {item['role']} {item['index']:03d}", flush=True)
        openai_tts(api_key=str(api_key), role=str(item["role"]), text=str(item["tts_text"]), path=path)
        item["duration_sec"] = probe_duration(path)
        item["status"] = "generated"
        generated += 1
        with log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({"event": "done", "position": position, "path": path.as_posix()}, ensure_ascii=False) + "\n")

    durations = [float(item["duration_sec"] or 0) for item in manifest]
    summary = {
        "out_dir": args.out_dir.as_posix(),
        "planned": len(manifest),
        "generated": generated,
        "cached": cached,
        "failed": 0,
        "duration_sec": round(time.time() - started, 1),
        "audio_duration_min": round(min(durations), 3) if durations else None,
        "audio_duration_max": round(max(durations), 3) if durations else None,
        "roles": {role: sum(1 for item in manifest if item["role"] == role) for role in ["ru", "de1", "de2", "de3"]},
    }
    write_json(args.out_dir / "tts_manifest.json", manifest)
    write_json(args.out_dir / "generation_summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
