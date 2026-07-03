#!/usr/bin/env python3
"""Generate OpenAI TTS for the French-Russian conversation Chains pack."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request
from typing import Any

from openai_dev_guard import require_openai_dev_spend_guard


PACK = Path("exports/chains/phrase_packs/chains_800_french_ru_conversation_v1_20260703")
ROWS_PATH = PACK / "chains_800_french_ru_conversation.json"
AUDIO_ROOT = PACK / "openai_audio"
MANIFEST_PATH = AUDIO_ROOT / "openai_audio_manifest.json"
TIMING_PATH = AUDIO_ROOT / "chains_french_ru_conversation_audio_timing_manifest.json"
SUMMARY_PATH = AUDIO_ROOT / "openai_audio_generation_summary.json"
MODEL_ID = "gpt-4o-mini-tts"
OUTPUT_FORMAT = "wav"
OPENAI_TTS_ESTIMATE_USD_PER_1K_CHARS = 0.015
PAUSE_SEC = 0.75

ROLES: dict[str, dict[str, str]] = {
    "fr1": {
        "voice": "coral",
        "instructions": (
            "Speak clear standard French for A1-A2 learners. Warm, natural, conversational, "
            "not theatrical. Say only the phrase, then stop cleanly."
        ),
    },
    "ru": {
        "voice": "marin",
        "instructions": (
            "Говори по-русски естественно и тепло, как диктор хорошего учебного ролика. "
            "Чётко, спокойно, без театральности. Скажи только фразу и остановись чисто."
        ),
    },
    "fr2": {
        "voice": "cedar",
        "instructions": (
            "Speak standard French clearly with a second distinct lesson voice. Calm, precise, "
            "friendly for beginners. Say only the phrase, then stop cleanly."
        ),
    },
}

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


def load_env_file(start: Path) -> dict[str, str]:
    env_path = next((folder / ".env.local" for folder in [start.resolve(), *start.resolve().parents] if (folder / ".env.local").exists()), None)
    values: dict[str, str] = {}
    if not env_path:
        return values
    for line in env_path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize(value: str) -> str:
    return " ".join(str(value or "").casefold().split())


def text_for_role(row: dict[str, Any], role: str) -> str:
    return str(row["russian"] if role == "ru" else row["french"]).strip()


def audio_digest(row: dict[str, Any], role: str) -> str:
    payload = {
        "model": MODEL_ID,
        "format": OUTPUT_FORMAT,
        "role": role,
        "voice": ROLES[role]["voice"],
        "instructions": ROLES[role]["instructions"],
        "text": text_for_role(row, role),
    }
    return hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:12]


def audio_path(row: dict[str, Any], role: str) -> Path:
    index = int(row["index"])
    return AUDIO_ROOT / role / f"{index:03d}_{audio_digest(row, role)}.{OUTPUT_FORMAT}"


def ffprobe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if completed.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {completed.stderr[:400]}")
    return float(completed.stdout.strip())


def openai_tts(api_key: str, row: dict[str, Any], role: str, path: Path) -> None:
    payload = json.dumps(
        {
            "model": MODEL_ID,
            "voice": ROLES[role]["voice"],
            "input": text_for_role(row, role),
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
    for attempt in range(1, 6):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                path.write_bytes(response.read())
                return
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:800]
            last_error = RuntimeError(f"OpenAI TTS failed {error.code}: {detail}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(1.5 * attempt)
    raise RuntimeError(f"OpenAI TTS failed after retries: {last_error}")


def validate_unique_rows(rows: list[dict[str, Any]]) -> None:
    if len(rows) != 800:
        raise RuntimeError(f"expected 800 rows, got {len(rows)}")
    for key in ("french", "russian"):
        values = [normalize(str(row.get(key, ""))) for row in rows]
        if len(set(values)) != len(values):
            raise RuntimeError(f"{key} rows are not unique")


def load_existing_manifest() -> dict[str, dict[str, Any]]:
    if not MANIFEST_PATH.exists():
        return {}
    items = load_json(MANIFEST_PATH)
    return {f"{int(item['index']):03d}:{item['role']}": item for item in items}


def build_timing(rows: list[dict[str, Any]], manifest_items: list[dict[str, Any]]) -> dict[str, Any]:
    by_key = {f"{int(item['index']):03d}:{item['role']}": item for item in manifest_items}
    row_timings: list[dict[str, Any]] = []
    for row in rows:
        index = int(row["index"])
        durations = {role: float(by_key[f"{index:03d}:{role}"]["duration_sec"]) for role in ROLES}
        sequences = {
            "part1": ["fr1", "pause", "ru", "pause", "fr2"],
            "part2": ["ru", "pause", "fr1", "pause", "fr2"],
            "part3": ["fr1", "pause", "fr2"],
        }
        sequence_timings: dict[str, list[dict[str, Any]]] = {}
        sequence_durations: dict[str, float] = {}
        for part, sequence in sequences.items():
            cursor = 0.0
            events = []
            pause_number = 0
            for role in sequence:
                if role == "pause":
                    pause_number += 1
                    events.append({"role": f"pause{pause_number}", "start_sec": round(cursor, 3), "duration_sec": PAUSE_SEC})
                    cursor += PAUSE_SEC
                    continue
                events.append(
                    {
                        "role": role,
                        "start_sec": round(cursor, 3),
                        "duration_sec": round(durations[role], 3),
                        "path": by_key[f"{index:03d}:{role}"]["path"],
                    }
                )
                cursor += durations[role]
            sequence_timings[part] = events
            sequence_durations[part] = round(cursor, 3)
        row_timings.append(
            {
                "index": index,
                "id": row["id"],
                "block": row["block"],
                "french": row["french"],
                "russian": row["russian"],
                "part1_duration_sec": sequence_durations["part1"],
                "part2_duration_sec": sequence_durations["part2"],
                "part3_duration_sec": sequence_durations["part3"],
                "part1": sequence_timings["part1"],
                "part2": sequence_timings["part2"],
                "part3": sequence_timings["part3"],
            }
        )
    return {
        "status": "ready",
        "pause_sec": PAUSE_SEC,
        "part1_rule": "FR -> pause -> RU -> pause -> FR",
        "part2_rule": "RU -> pause -> FR -> pause -> FR",
        "part3_rule": "FR -> pause -> FR",
        "row_count": len(row_timings),
        "rows": row_timings,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=1)
    parser.add_argument("--end", type=int, default=800)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--roles", nargs="+", choices=sorted(ROLES), default=list(ROLES))
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    api_key = load_env_file(Path.cwd()).get("OPENAI_API_KEY")
    rows = load_json(ROWS_PATH)
    validate_unique_rows(rows)
    selected = [row for row in rows if args.start <= int(row["index"]) <= args.end]
    if args.limit:
        selected = selected[: args.limit]
    existing = load_existing_manifest()
    generated = 0
    cached = 0
    failed: list[dict[str, Any]] = []

    tasks: list[tuple[dict[str, Any], str, Path]] = []
    for row in selected:
        for role in args.roles:
            path = audio_path(row, role)
            path.parent.mkdir(parents=True, exist_ok=True)
            if not args.overwrite and path.exists() and path.stat().st_size > 4096:
                cached += 1
            else:
                tasks.append((row, role, path))

    planned_chars = sum(len(text_for_role(row, role)) for row, role, _path in tasks)
    estimated_cost = (planned_chars / 1000) * OPENAI_TTS_ESTIMATE_USD_PER_1K_CHARS
    planned_summary = {
        "selected_rows": len(selected),
        "cached_files": cached,
        "planned_files": len(tasks),
        "planned_chars": planned_chars,
        "estimated_cost_usd": round(estimated_cost, 4),
        "roles": args.roles,
    }
    print(json.dumps(planned_summary, ensure_ascii=False), flush=True)
    if args.dry_run:
        write_json(SUMMARY_PATH, {**planned_summary, "dry_run": True})
        return 0
    if tasks:
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is required in .env.local")
        require_openai_dev_spend_guard(
            action="Chains French-Russian conversation OpenAI TTS batch",
            estimated_cost_usd=estimated_cost,
            units=len(tasks),
        )

    def generate_task(item: tuple[dict[str, Any], str, Path]) -> dict[str, Any]:
        row, role, path = item
        openai_tts(api_key, row, role, path)
        return {"index": int(row["index"]), "role": role, "path": path.as_posix()}

    if tasks:
        last_progress = 0
        with ThreadPoolExecutor(max_workers=max(1, int(args.workers))) as pool:
            futures = [pool.submit(generate_task, task) for task in tasks]
            for future in as_completed(futures):
                try:
                    future.result()
                    generated += 1
                    if generated - last_progress >= 50 or generated == len(tasks):
                        last_progress = generated
                        print(f"[chains-fr-tts] generated {generated}/{len(tasks)} cached={cached}", flush=True)
                except Exception as exc:  # noqa: BLE001
                    failed.append({"error": str(exc)})
                    write_json(SUMMARY_PATH, {"generated": generated, "cached": cached, "failed": failed})
                    raise

    for row in selected:
        for role in args.roles:
            key = f"{int(row['index']):03d}:{role}"
            path = audio_path(row, role)
            expected_hash = audio_digest(row, role)
            duration = ffprobe_duration(path)
            existing[key] = {
                "index": int(row["index"]),
                "id": row["id"],
                "block": row["block"],
                "role": role,
                "voice": ROLES[role]["voice"],
                "text": text_for_role(row, role),
                "path": path.as_posix(),
                "hash": expected_hash,
                "duration_sec": round(duration, 3),
            }
        write_json(MANIFEST_PATH, sorted(existing.values(), key=lambda item: (int(item["index"]), item["role"])))

    manifest_items = sorted(existing.values(), key=lambda item: (int(item["index"]), item["role"]))
    complete_rows = [row for row in rows if all(f"{int(row['index']):03d}:{role}" in existing for role in ROLES)]
    if len(complete_rows) == len(rows):
        write_json(TIMING_PATH, build_timing(rows, manifest_items))
    summary = {
        "status": "complete" if len(complete_rows) == len(rows) and not failed else "partial",
        "generated": generated,
        "cached": cached,
        "failed": failed,
        "manifest_items": len(manifest_items),
        "complete_rows": len(complete_rows),
        "expected_manifest_items": len(rows) * len(ROLES),
        "timing_manifest_written": TIMING_PATH.exists(),
    }
    write_json(SUMMARY_PATH, summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
