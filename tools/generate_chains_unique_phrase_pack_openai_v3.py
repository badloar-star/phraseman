#!/usr/bin/env python3
"""Generate a human-natural 800-phrase Chains pack with OpenAI chat.

Phrase-selection stage only. It writes exports and does not touch CapCut.
"""

from __future__ import annotations

import csv
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from openai_dev_guard import require_codex_openai_tts_only


MODEL = "gpt-4o-mini"
OUT = Path("exports/chains/phrase_packs/chains_800_unique_v3_20260604")
CHECKPOINT = OUT / "chains_800_unique_phrases.partial.json"
CHUNK_SIZE = 20

BLOCKS = [
    ("Дом и быт", "home life, rooms, small chores, objects, comfort"),
    ("Утро и вечер", "morning, evening, getting ready, bedtime, daily rhythm"),
    ("Работа", "office, tasks, calls, deadlines, simple team communication"),
    ("Учёба", "studying, notebooks, words, lessons, practice, questions"),
    ("Дорога и транспорт", "commute, bus, train, taxi, routes, delays"),
    ("Покупки", "shops, supermarket, sizes, prices, returns, pharmacy"),
    ("Еда и кафе", "ordering, cooking, drinks, bill, preferences"),
    ("Общение", "messages, calls, small talk, explanations, invitations"),
    ("Просьбы и помощь", "polite requests, favors, help, instructions"),
    ("Планы", "plans, scheduling, changes, options, decisions"),
    ("Проблемы и ошибки", "mistakes, broken things, wrong files, delays"),
    ("Здоровье", "feeling unwell, medicine, doctor, rest, simple advice"),
    ("Деньги и документы", "payments, cards, forms, receipts, documents"),
    ("Телефон и технологии", "phone, laptop, files, passwords, calls, internet"),
    ("Путешествия", "hotel, airport, station, city, directions, luggage"),
    ("Срочные ситуации", "urgent help, safety, lost items, emergency basics"),
]


def load_env_file(start: Path) -> dict[str, str]:
    current = start.resolve()
    env_path = next((folder / ".env.local" for folder in [current, *current.parents] if (folder / ".env.local").exists()), None)
    if not env_path:
        return {}
    values: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s']", "", text.casefold())).strip()


def chat_json(api_key: str, prompt: dict[str, Any], retries: int = 4) -> dict[str, Any]:
    payload = json.dumps(
        {
            "model": MODEL,
            "temperature": 0.55,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a strict bilingual English-Russian editor for a YouTube lesson called Chains. "
                        "You write natural A1-A2 English phrases with accurate natural Russian translations. "
                        "Output valid JSON only."
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
            last_error = RuntimeError(f"OpenAI chat failed {error.code}: {body[:1000]}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        if attempt < retries:
            time.sleep(2 * attempt)
    raise RuntimeError(f"OpenAI chat failed after {retries} attempts: {last_error}")


def row_type(english: str) -> str:
    if english.endswith("?"):
        return "question"
    if english.startswith(("Please ", "Don't ", "Let’s ", "Let's ")):
        return "request_or_command"
    if english.startswith("I "):
        return "i_statement"
    if english.startswith(("You ", "We ")):
        return "you_we_statement"
    if english.startswith(("There ", "It ", "The ", "This ", "That ")):
        return "situation_statement"
    return "other"


def prompt_for_chunk(
    *,
    block_index: int,
    block_name: str,
    topic: str,
    start_index: int,
    count: int,
    existing_en: list[str],
    existing_ru: list[str],
) -> dict[str, Any]:
    return {
        "task": "Create phrase rows for a Russian-speaking English lesson video using the Chains method.",
        "block": {"index": block_index, "name_ru": block_name, "topic": topic},
        "range": {"start_index": start_index, "count": count},
        "output": "Return strict JSON object: {\"rows\":[...]} only.",
        "row_schema": {
            "index": "integer, exact global index",
            "block": block_name,
            "type": "one of: question, request_or_command, i_statement, you_we_statement, situation_statement, other",
            "english": "natural English phrase, sentence case",
            "russian": "natural Russian translation, sentence case",
        },
        "hard_rules": [
            "Exactly count rows.",
            "Indexes must be consecutive from start_index.",
            "Every English phrase must be unique and not semantically copied from existing_en.",
            "Every Russian translation must be unique and natural, not word-for-word awkward.",
            "Do NOT create chains by repeating one base phrase with tiny tails.",
            "Avoid monotonous I + verb + object construction. No more than 6 rows in this chunk may start with 'I '.",
            "Use a varied mix: questions, requests, short situation statements, you/we statements, there/it statements, and a few I statements.",
            "A1-A2 everyday English. Useful for real life. 4-11 English words each.",
            "No unnatural lines like 'Where did you put the front door?', 'menu is too hot to drink', 'now now', or grammar-broken Russian.",
            "No profanity, politics, religion, romance, or violent content.",
            "Russian must sound like a Russian speaker would actually say it.",
            "Each phrase should be good for screen display and TTS.",
        ],
        "style_examples_good": [
            {"english": "Can you close the door quietly?", "russian": "Можешь тихо закрыть дверь?"},
            {"english": "The meeting starts in five minutes.", "russian": "Встреча начнётся через пять минут."},
            {"english": "Please write it down before you forget.", "russian": "Пожалуйста, запиши это, пока не забыл."},
            {"english": "Where can I charge my phone?", "russian": "Где можно зарядить телефон?"},
            {"english": "We should check the plan again.", "russian": "Нам стоит ещё раз проверить план."},
        ],
        "existing_en_do_not_repeat": existing_en[-220:],
        "existing_ru_do_not_repeat": existing_ru[-220:],
    }


def normalize_row(raw: dict[str, Any], *, index: int, block_index: int, block: str) -> dict[str, Any]:
    english = re.sub(r"\s+", " ", str(raw.get("english") or "").strip())
    russian = re.sub(r"\s+", " ", str(raw.get("russian") or "").strip())
    return {
        "index": index,
        "id": f"CHU3-{index:03d}",
        "block_index": block_index,
        "block": block,
        "type": str(raw.get("type") or row_type(english)).strip(),
        "english": english,
        "russian": russian,
    }


def validate_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    errors: list[str] = []
    if len(rows) != 800:
        errors.append(f"expected 800 rows, got {len(rows)}")
    seen_en: dict[str, int] = {}
    seen_ru: dict[str, int] = {}
    block_counts: dict[str, int] = {}
    type_counts: dict[str, int] = {}
    starts_i = 0
    bad_patterns = []
    for expected, row in enumerate(rows, start=1):
        if row.get("index") != expected:
            errors.append(f"index mismatch at {expected}: {row.get('index')}")
        block_counts[row["block"]] = block_counts.get(row["block"], 0) + 1
        type_counts[row["type"]] = type_counts.get(row["type"], 0) + 1
        en = str(row.get("english") or "").strip()
        ru = str(row.get("russian") or "").strip()
        if not en or not ru:
            errors.append(f"{expected:03d} empty phrase")
        if len(en.split()) < 3 or len(en.split()) > 12:
            errors.append(f"{expected:03d} odd English length: {en}")
        if en.startswith("I "):
            starts_i += 1
        nen = normalize(en)
        nru = normalize(ru)
        if nen in seen_en:
            errors.append(f"{expected:03d} duplicate English with {seen_en[nen]}: {en}")
        else:
            seen_en[nen] = expected
        if nru in seen_ru:
            errors.append(f"{expected:03d} duplicate Russian with {seen_ru[nru]}: {ru}")
        else:
            seen_ru[nru] = expected
        lowered = en.casefold()
        if any(pattern in lowered for pattern in ["front door in", "now now", "help me carry this box", "menu is too hot"]):
            bad_patterns.append({"index": expected, "english": en})
    for block, count in block_counts.items():
        if count != 50:
            errors.append(f"bad block count {block}: {count}")
    if starts_i > 180:
        errors.append(f"too many I-start phrases: {starts_i}")
    questions = sum(1 for row in rows if str(row["english"]).endswith("?"))
    if questions < 120:
        errors.append(f"too few questions: {questions}")
    if bad_patterns:
        errors.append(f"bad pattern examples: {bad_patterns[:5]}")
    return {
        "ok": not errors,
        "errors": errors[:80],
        "row_count": len(rows),
        "unique_english": len(seen_en),
        "unique_russian": len(seen_ru),
        "starts_with_i": starts_i,
        "question_count": questions,
        "type_counts": type_counts,
        "block_counts": block_counts,
    }


def write_outputs(rows: list[dict[str, Any]], report: dict[str, Any]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "chains_800_unique_phrases.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    with (OUT / "chains_800_unique_phrases.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["index", "id", "block_index", "block", "type", "english", "russian"])
        writer.writeheader()
        writer.writerows(rows)
    lines = ["# Chains 800 Unique V3 Phrase Selection", ""]
    for row in rows:
        if (row["index"] - 1) % 50 == 0:
            lines.extend(["", f"## {row['block_index']:02d}. {row['block']}", ""])
        lines.append(f"{row['index']:03d}. {row['english']} — {row['russian']}")
    (OUT / "chains_800_unique_phrases.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (OUT / "chains_800_unique_gate_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_checkpoint(rows: list[dict[str, Any]]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    CHECKPOINT.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_checkpoint() -> list[dict[str, Any]]:
    if not CHECKPOINT.exists():
        return []
    rows = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise RuntimeError(f"bad checkpoint: {CHECKPOINT}")
    return rows


def main() -> int:
    require_codex_openai_tts_only(action="Chains unique phrase pack generation", endpoint="chat/completions")
    env = load_env_file(Path.cwd())
    api_key = env.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is missing in .env.local")

    rows: list[dict[str, Any]] = load_checkpoint()
    existing_en: list[str] = [str(row["english"]) for row in rows]
    existing_ru: list[str] = [str(row["russian"]) for row in rows]
    if rows:
        print(f"[chains-v3] resumed checkpoint with {len(rows)} rows", flush=True)
    for block_index, (block_name, topic) in enumerate(BLOCKS, start=1):
        already_in_block = max(0, min(50, len(rows) - (block_index - 1) * 50))
        offset = already_in_block
        while offset < 50:
            start_index = (block_index - 1) * 50 + offset + 1
            count = min(CHUNK_SIZE, 50 - offset)
            prompt = prompt_for_chunk(
                block_index=block_index,
                block_name=block_name,
                topic=topic,
                start_index=start_index,
                count=count,
                existing_en=existing_en,
                existing_ru=existing_ru,
            )
            raw_rows = None
            for chunk_attempt in range(1, 4):
                parsed = chat_json(api_key, prompt)
                candidate = parsed.get("rows")
                if isinstance(candidate, list) and 1 <= len(candidate) <= count:
                    raw_rows = candidate
                    break
                print(
                    f"[chains-v3] retry {chunk_attempt}/3 for {start_index:03d}: "
                    f"got {len(candidate) if isinstance(candidate, list) else 'non-list'} rows",
                    flush=True,
                )
                time.sleep(1.5 * chunk_attempt)
            if raw_rows is None:
                raise RuntimeError(f"bad rows for block {block_name} start {start_index}: expected {count}")
            for local_offset, raw in enumerate(raw_rows):
                index = start_index + local_offset
                row = normalize_row(raw, index=index, block_index=block_index, block=block_name)
                rows.append(row)
                existing_en.append(row["english"])
                existing_ru.append(row["russian"])
            got = len(raw_rows)
            offset += got
            write_checkpoint(rows)
            print(f"[chains-v3] generated {start_index:03d}-{start_index + got - 1:03d} {block_name}", flush=True)

    report = validate_rows(rows)
    write_outputs(rows, report)
    if report["ok"] and CHECKPOINT.exists():
        CHECKPOINT.unlink()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
