#!/usr/bin/env python3
"""Generate OpenAI TTS audio for the VENGA phrase template."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from openai_dev_guard import require_openai_dev_spend_guard


# Requires PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 before any OpenAI batch spend.
MODEL_ID = "gpt-4o-mini-tts"
OUTPUT_FORMAT = "wav"
OPENAI_TTS_ESTIMATE_USD_PER_1K_CHARS = 0.015
ROLE_CONFIG: dict[str, dict[str, str]] = {
    "ru": {
        "voice": "marin",
        "instructions": (
            "Speak in Russian with a warm native Moscow-neutral accent. "
            "Slow, pleasant, clear YouTube lesson voice. Correct Russian stress. "
            "Say only the phrase, then stop cleanly with a tiny natural pause. No extra words."
        ),
    },
    "en1": {
        "voice": "coral",
        "instructions": (
            "Speak English slowly and clearly for an A1 learner. Warm, beautiful teacher voice. "
            "Say only the phrase, then stop cleanly with a tiny natural pause. No extra words."
        ),
    },
    "en2": {
        "voice": "cedar",
        "instructions": (
            "Speak English at a calm medium lesson pace, clear and natural, not rushed. "
            "Say only the phrase, then stop cleanly with a tiny natural pause. No extra words."
        ),
    },
    "en3": {
        "voice": "sage",
        "instructions": (
            "Speak English slowly, calm and clear, not faster than the previous voice. "
            "Use a gentle learner-friendly pace. Say only the phrase, then stop cleanly with a tiny natural pause. No extra words."
        ),
    },
}


@dataclass(frozen=True)
class PhraseRow:
    index: int
    ru: str
    en: str
    ipa: str
    breakdown: str


def load_env_file(start: Path) -> dict[str, str]:
    current = start.resolve()
    env_path = next(
        (folder / ".env.local" for folder in [current, *current.parents] if (folder / ".env.local").exists()),
        None,
    )
    if not env_path:
        return {}
    values: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def parse_phrase_file(path: Path) -> list[PhraseRow]:
    import re

    rows: list[PhraseRow] = []
    pattern = re.compile(r"^(\d+)\.\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$")
    for line in path.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line.strip())
        if not match:
            continue
        rows.append(
            PhraseRow(
                index=int(match.group(1)),
                ru=match.group(2).strip(),
                en=match.group(3).strip(),
                ipa=match.group(4).strip(),
                breakdown=match.group(5).strip(),
            )
        )
    if len(rows) != 200:
        raise ValueError(f"Expected 200 phrase rows, got {len(rows)} from {path}")
    return rows


def digest_for(role: str, row: PhraseRow) -> str:
    text = row.ru if role == "ru" else row.en
    payload = {
        "role": role,
        "index": row.index,
        "text": text,
        "model": MODEL_ID,
        "format": OUTPUT_FORMAT,
        "config": ROLE_CONFIG[role],
    }
    return hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:12]


def probe_duration(path: Path) -> float:
    completed = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ],
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
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
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


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phrases", type=Path, default=Path("exports/venga-phrase-packs/first-200-a1-everyday-review.md"))
    parser.add_argument("--out-dir", type=Path, default=Path("exports/venga-phrase-packs/first-200-a1-everyday-openai-audio"))
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    env = load_env_file(Path.cwd())
    api_key = env.get("OPENAI_API_KEY")
    if not api_key and not args.dry_run:
        raise RuntimeError("OPENAI_API_KEY is required in .env.local")

    rows = parse_phrase_file(args.phrases)
    if args.limit:
        rows = rows[: args.limit]
    args.out_dir.mkdir(parents=True, exist_ok=True)

    manifest: list[dict[str, Any]] = []
    for row in rows:
        for role in ["ru", "en1", "en2", "en3"]:
            text = row.ru if role == "ru" else row.en
            path = args.out_dir / role / f"{row.index:03d}_{digest_for(role, row)}.{OUTPUT_FORMAT}"
            manifest.append(
                {
                    "index": row.index,
                    "role": role,
                    "source_text": text,
                    "tts_text": text,
                    "ipa": row.ipa,
                    "breakdown": row.breakdown,
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
        total_chars = sum(len(str(item["tts_text"])) for item in manifest)
        estimated_cost = (total_chars / 1000) * OPENAI_TTS_ESTIMATE_USD_PER_1K_CHARS
        print(json.dumps({
            "planned_files": len(manifest),
            "planned_chars": total_chars,
            "estimated_cost_usd": round(estimated_cost, 4),
            "out_dir": args.out_dir.as_posix(),
        }, ensure_ascii=False))
        return 0

    total_chars = sum(len(str(item["tts_text"])) for item in manifest)
    require_openai_dev_spend_guard(
        action="VENGA OpenAI TTS batch",
        estimated_cost_usd=(total_chars / 1000) * OPENAI_TTS_ESTIMATE_USD_PER_1K_CHARS,
        units=len(manifest),
    )

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
        print(f"[openai-tts] {position:03d}/{len(manifest):03d} {item['role']} {item['index']:03d}", flush=True)
        openai_tts(api_key=str(api_key), role=str(item["role"]), text=str(item["tts_text"]), path=path)
        item["duration_sec"] = probe_duration(path)
        item["status"] = "generated"
        generated += 1
        with log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({"event": "done", "position": position, "path": path.as_posix()}, ensure_ascii=False) + "\n")

    write_json(args.out_dir / "tts_manifest.json", manifest)
    summary = {
        "out_dir": args.out_dir.as_posix(),
        "planned": len(manifest),
        "generated": generated,
        "cached": cached,
        "failed": 0,
        "duration_sec": round(time.time() - started, 1),
        "roles": {role: sum(1 for item in manifest if item["role"] == role) for role in ["ru", "en1", "en2", "en3"]},
    }
    write_json(args.out_dir / "generation_summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
