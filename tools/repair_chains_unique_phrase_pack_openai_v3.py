#!/usr/bin/env python3
"""Repair duplicate rows in the OpenAI Chains 800 phrase pack."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from generate_chains_unique_phrase_pack_openai_v3 import OUT, BLOCKS, load_env_file, normalize, validate_rows, write_outputs


MODEL = "gpt-4o-mini"
ROWS_PATH = OUT / "chains_800_unique_phrases.json"
REPORT_PATH = OUT / "chains_800_unique_repair_report.json"
BATCH_SIZE = 12


def chat_json(api_key: str, prompt: dict[str, Any], retries: int = 4) -> dict[str, Any]:
    payload = json.dumps(
        {
            "model": MODEL,
            "temperature": 0.7,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a strict bilingual English-Russian lesson editor. "
                        "Write natural A1-A2 English phrases and natural Russian translations. "
                        "Return valid JSON only."
                    ),
                },
                {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
            ],
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=240) as response:
                data = json.loads(response.read().decode("utf-8"))
            return json.loads(data["choices"][0]["message"]["content"])
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            last_error = RuntimeError(f"OpenAI chat failed {error.code}: {body[:800]}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        if attempt < retries:
            time.sleep(2 * attempt)
    raise RuntimeError(f"OpenAI chat failed after {retries} attempts: {last_error}")


def row_type(english: str) -> str:
    if english.endswith("?"):
        return "question"
    if english.startswith(("Please ", "Don't ", "Let’s ", "Let's ", "Can you ", "Could you ")):
        return "request_or_command"
    if english.startswith("I "):
        return "i_statement"
    if english.startswith(("You ", "We ")):
        return "you_we_statement"
    if english.startswith(("There ", "It ", "The ", "This ", "That ")):
        return "situation_statement"
    return "other"


def duplicate_indices(rows: list[dict[str, Any]]) -> list[int]:
    seen_en: dict[str, int] = {}
    seen_ru: dict[str, int] = {}
    duplicates: set[int] = set()
    for pos, row in enumerate(rows):
        en = normalize(str(row.get("english") or ""))
        ru = normalize(str(row.get("russian") or ""))
        if en in seen_en:
            duplicates.add(pos)
        else:
            seen_en[en] = pos
        if ru in seen_ru:
            duplicates.add(pos)
        else:
            seen_ru[ru] = pos
    return sorted(duplicates)


def prompt_for_batch(rows: list[dict[str, Any]], batch_positions: list[int]) -> dict[str, Any]:
    targets = []
    for pos in batch_positions:
        row = rows[pos]
        block_index = int(row["block_index"])
        block_name, topic = BLOCKS[block_index - 1]
        targets.append(
            {
                "index": row["index"],
                "block": block_name,
                "topic": topic,
                "replace_bad_english": row["english"],
                "replace_bad_russian": row["russian"],
            }
        )
    banned_en = [str(row["english"]) for i, row in enumerate(rows) if i not in batch_positions]
    banned_ru = [str(row["russian"]) for i, row in enumerate(rows) if i not in batch_positions]
    return {
        "task": "Replace duplicate or repeated phrase rows in a Chains 800 English lesson pack.",
        "output": "Return strict JSON object: {\"rows\":[...]} only.",
        "targets": targets,
        "row_schema": {
            "index": "same index as target",
            "english": "new natural A1-A2 English phrase, 4-11 words",
            "russian": "natural Russian translation",
        },
        "hard_rules": [
            "Return exactly one row per target index.",
            "Keep the row in the same block/topic.",
            "Do not reuse the bad phrase.",
            "Do not repeat any banned English or Russian phrase.",
            "Do not make tiny paraphrase clones of banned phrases.",
            "Use varied sentence forms: questions, requests, you/we statements, there/it/the statements, and only a few I statements.",
            "Russian must be natural and grammatically correct.",
            "No weird object/place combinations.",
            "No profanity, politics, romance, religion, or violent content.",
        ],
        "banned_english": banned_en,
        "banned_russian": banned_ru,
    }


def normalize_replacement(raw: dict[str, Any], old: dict[str, Any]) -> dict[str, Any]:
    english = re.sub(r"\s+", " ", str(raw.get("english") or "").strip())
    russian = re.sub(r"\s+", " ", str(raw.get("russian") or "").strip())
    return {
        **old,
        "type": row_type(english),
        "english": english,
        "russian": russian,
    }


def main() -> int:
    env = load_env_file(Path.cwd())
    api_key = env.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is missing in .env.local")
    rows = json.loads(ROWS_PATH.read_text(encoding="utf-8"))
    report: dict[str, Any] = {"rounds": []}

    for round_index in range(1, 8):
        dupes = duplicate_indices(rows)
        report["rounds"].append({"round": round_index, "duplicate_rows": [rows[pos]["index"] for pos in dupes]})
        print(f"[chains-v3-repair] round {round_index}: {len(dupes)} duplicate rows", flush=True)
        if not dupes:
            break
        for start in range(0, len(dupes), BATCH_SIZE):
            batch = dupes[start : start + BATCH_SIZE]
            prompt = prompt_for_batch(rows, batch)
            parsed = chat_json(api_key, prompt)
            replacements = parsed.get("rows")
            if not isinstance(replacements, list) or not replacements:
                raise RuntimeError(f"bad replacement batch: expected non-empty list, got {type(replacements)} {replacements!r}")
            by_index = {int(item.get("index")): item for item in replacements}
            applied = 0
            for pos in batch:
                old = rows[pos]
                replacement = by_index.get(int(old["index"]))
                if not replacement:
                    continue
                rows[pos] = normalize_replacement(replacement, old)
                applied += 1
            ROWS_PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(
                f"[chains-v3-repair] repaired {start + 1}-{min(start + BATCH_SIZE, len(dupes))}/{len(dupes)} "
                f"(applied {applied}/{len(batch)})",
                flush=True,
            )

    validation = validate_rows(rows)
    write_outputs(rows, validation)
    report["final_validation"] = validation
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(validation, ensure_ascii=False, indent=2))
    return 0 if validation["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
