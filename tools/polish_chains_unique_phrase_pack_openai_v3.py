#!/usr/bin/env python3
"""Block-wise editorial polish for the Chains 800 phrase pack."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from generate_chains_unique_phrase_pack_openai_v3 import OUT, load_env_file, validate_rows, write_outputs


MODEL = "gpt-4o-mini"
ROWS_PATH = OUT / "chains_800_unique_phrases.json"
REPORT_PATH = OUT / "chains_800_unique_polish_report.json"


def chat_json(api_key: str, prompt: dict[str, Any], retries: int = 4) -> dict[str, Any]:
    payload = json.dumps(
        {
            "model": MODEL,
            "temperature": 0.35,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a strict bilingual English-Russian editor for a YouTube English lesson. "
                        "You preserve useful good rows, rewrite awkward rows, and output valid JSON only."
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
            last_error = RuntimeError(f"OpenAI chat failed {error.code}: {error.read().decode('utf-8', errors='replace')[:800]}")
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


def clean_row(raw: dict[str, Any], old: dict[str, Any]) -> dict[str, Any]:
    english = re.sub(r"\s+", " ", str(raw.get("english") or old["english"]).strip())
    russian = re.sub(r"\s+", " ", str(raw.get("russian") or old["russian"]).strip())
    return {
        **old,
        "type": row_type(english),
        "english": english,
        "russian": russian,
    }


def prompt_for_block(block_rows: list[dict[str, Any]], banned_outside: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "task": "Polish one 50-row block for a Chains English lesson pack.",
        "output": "Return strict JSON object: {\"rows\":[...]} only.",
        "block": block_rows[0]["block"],
        "rows_to_edit": [
            {"index": row["index"], "english": row["english"], "russian": row["russian"]}
            for row in block_rows
        ],
        "banned_outside_examples": banned_outside[-260:],
        "rules": [
            "Return exactly 50 rows with the same indexes.",
            "Keep good natural rows when they are already useful.",
            "Rewrite awkward Russian translations into natural Russian.",
            "Rewrite awkward English into natural A1-A2 English.",
            "Remove semantic repetition inside the block: do not ask the same thing twice with tiny wording changes.",
            "Every English phrase in this block must be meaningfully different.",
            "Every Russian translation in this block must be meaningfully different.",
            "Avoid too many I-statements.",
            "Keep phrases 4-11 English words.",
            "Use varied forms: questions, requests, short situation statements, you/we statements, it/there/the statements.",
            "No weird collocations and no literal broken Russian.",
            "Do not use English phrases or Russian translations from banned_outside_examples.",
        ],
        "fix_examples": [
            {"bad": "I prefer tea over coffee. — Я предпочитаю чай кофе.", "good": "I prefer tea to coffee. — Я предпочитаю чай, а не кофе."},
            {"bad": "What help do you need? — С какой помощью ты нуждаешься?", "good": "What kind of help do you need? — Какая помощь тебе нужна?"},
            {"bad": "Please send me an invitation. / Please send an invitation.", "good": "Keep one, rewrite the other to a different communication situation."},
        ],
    }


def main() -> int:
    env = load_env_file(Path.cwd())
    api_key = env.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is missing in .env.local")
    rows = json.loads(ROWS_PATH.read_text(encoding="utf-8"))
    report: dict[str, Any] = {"blocks": []}
    completed_blocks: set[str] = set()
    if REPORT_PATH.exists():
        try:
            old_report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
            completed_blocks = {
                str(item.get("block"))
                for item in old_report.get("blocks", [])
                if int(item.get("applied", 0)) == 50
            }
            report["blocks"] = list(old_report.get("blocks", []))
        except Exception:
            completed_blocks = set()

    for block_index in range(16):
        start = block_index * 50
        block_rows = rows[start : start + 50]
        if block_rows[0]["block"] in completed_blocks:
            print(f"[chains-v3-polish] {block_rows[0]['block']}: already complete, skipping", flush=True)
            continue
        outside = [
            {"english": row["english"], "russian": row["russian"]}
            for i, row in enumerate(rows)
            if not (start <= i < start + 50)
        ]
        parsed = chat_json(api_key, prompt_for_block(block_rows, outside))
        polished = parsed.get("rows")
        if not isinstance(polished, list) or not polished:
            raise RuntimeError(f"bad polish rows for block {block_rows[0]['block']}: {type(polished)} {polished!r}")
        by_index = {int(item.get("index")): item for item in polished}
        changed = 0
        applied = 0
        for offset, old in enumerate(block_rows):
            item = by_index.get(int(old["index"]))
            if not item:
                continue
            new = clean_row(item, old)
            if new["english"] != old["english"] or new["russian"] != old["russian"]:
                changed += 1
            rows[start + offset] = new
            applied += 1
        ROWS_PATH.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        report["blocks"].append({"block": block_rows[0]["block"], "changed": changed, "applied": applied})
        print(f"[chains-v3-polish] {block_rows[0]['block']}: changed {changed}/50, applied {applied}/50", flush=True)

    validation = validate_rows(rows)
    write_outputs(rows, validation)
    report["validation"] = validation
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(validation, ensure_ascii=False, indent=2))
    return 0 if validation["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
