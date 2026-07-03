#!/usr/bin/env python3
"""Generate an 800-row conversational French-Russian Chains phrase pack.

Phrase-selection stage only. It writes exports and does not touch CapCut.
"""

from __future__ import annotations

import csv
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


MODEL = "gpt-4o-mini"
OUT = Path("exports/chains/phrase_packs/chains_800_french_ru_conversation_v1_20260703")
CHECKPOINT = OUT / "chains_800_french_ru_conversation.partial.json"
CHUNK_SIZE = 20

BLOCKS = [
    ("Дом и быт", "home life, rooms, chores, comfort, small problems"),
    ("Утро и вечер", "morning, evening, getting ready, bedtime, daily rhythm"),
    ("Работа", "office, tasks, calls, deadlines, simple team communication"),
    ("Учёба", "studying, notebooks, lessons, questions, language practice"),
    ("Дорога и транспорт", "commute, metro, bus, taxi, walking, delays, tickets"),
    ("Покупки", "shops, supermarket, sizes, prices, returns, pharmacy"),
    ("Еда и кафе", "ordering, cooking, drinks, bill, preferences, table talk"),
    ("Общение", "messages, calls, small talk, reactions, invitations"),
    ("Просьбы и помощь", "polite requests, favors, help, instructions"),
    ("Планы", "plans, scheduling, changes, options, decisions"),
    ("Проблемы и ошибки", "mistakes, broken things, wrong files, delays"),
    ("Здоровье", "feeling unwell, medicine, doctor, rest, simple advice"),
    ("Деньги и документы", "payments, cards, forms, receipts, documents"),
    ("Телефон и технологии", "phone, laptop, files, passwords, calls, internet"),
    ("Путешествия", "hotel, airport, station, city, directions, luggage"),
    ("Срочные ситуации", "urgent help, safety, lost items, emergency basics"),
]

BAD_FRENCH_PATTERNS = [
    "j'ai achete",
    "je suis tres beaucoup",
    "c'est interessant pour moi beaucoup",
    "maintenant maintenant",
]

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


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s'’À-ÿ-]", "", text.casefold())).strip()


def chat_json(api_key: str, prompt: dict[str, Any], retries: int = 4) -> dict[str, Any]:
    payload = json.dumps(
        {
            "model": MODEL,
            "temperature": 0.62,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a strict bilingual French-Russian editor for a YouTube lesson called Chains. "
                        "You write natural spoken A1-A2 French phrases with accurate natural Russian translations. "
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


def row_type(french: str) -> str:
    clean = french.strip()
    low = clean.casefold()
    if clean.endswith("?"):
        return "question"
    if low.startswith(("s'il te plaît", "s'il vous plaît", "peux-tu", "pouvez-vous", "aide-moi", "attends", "regarde", "dis-moi")):
        return "request_or_command"
    if low.startswith(("ça ", "c'est", "il y a", "il faut", "on peut", "on va")):
        return "situation_statement"
    if low.startswith(("tu ", "vous ", "on ", "nous ")):
        return "you_we_statement"
    if low.startswith(("je ", "j'")):
        return "je_statement"
    return "other"


def prompt_for_chunk(
    *,
    block_index: int,
    block_name: str,
    topic: str,
    start_index: int,
    count: int,
    existing_fr: list[str],
    existing_ru: list[str],
) -> dict[str, Any]:
    return {
        "task": "Create phrase rows for a Russian-speaking French lesson video using the Chains method.",
        "language_pair": "French -> Russian",
        "block": {"index": block_index, "name_ru": block_name, "topic": topic},
        "range": {"start_index": start_index, "count": count},
        "output": "Return strict JSON object: {\"rows\":[...]} only.",
        "row_schema": {
            "index": "integer, exact global index",
            "block": block_name,
            "type": "one of: question, request_or_command, je_statement, you_we_statement, situation_statement, reaction, other",
            "french": "natural spoken French phrase, sentence case",
            "russian": "natural Russian translation, sentence case",
        },
        "hard_rules": [
            "Exactly count rows.",
            "Indexes must be consecutive from start_index.",
            "Every French phrase must be unique and not semantically copied from existing_fr.",
            "Every Russian translation must be unique and natural, not word-for-word awkward.",
            "Prefer conversational phrases people actually say: questions, requests, reactions, short plans, small problems.",
            "Do NOT make a pack of progressive passé composé chains like 'J'ai acheté...'.",
            "Avoid monotonous 'Je/J'' starts. No more than 5 rows in this chunk may start with Je or J'.",
            "Use a varied mix: tu/vous questions, polite requests, 'on' statements, 'ça/c'est' reactions, short practical sentences.",
            "A1-A2 everyday French. Useful for real life. 3-10 French words each unless a polite phrase needs 11.",
            "Keep French idiomatic but beginner-safe. Avoid slang that sounds teen-only or region-locked.",
            "Use French punctuation and accents correctly.",
            "Russian must sound like a Russian speaker would actually say it.",
            "No profanity, politics, religion, romance, violence, alcohol, or medical emergency detail.",
            "Each phrase should be good for screen display and TTS.",
        ],
        "style_examples_good": [
            {"french": "Tu peux répéter, s'il te plaît ?", "russian": "Можешь повторить, пожалуйста?"},
            {"french": "On se retrouve devant le café.", "russian": "Встретимся перед кафе."},
            {"french": "Ça prend combien de temps ?", "russian": "Сколько это займёт времени?"},
            {"french": "Je n'ai pas encore fini.", "russian": "Я ещё не закончил."},
            {"french": "Vous avez cette taille ?", "russian": "У вас есть этот размер?"},
            {"french": "Il faut partir maintenant.", "russian": "Нужно уходить сейчас."},
            {"french": "C'est plus simple comme ça.", "russian": "Так проще."},
        ],
        "avoid_examples": [
            {"french": "J'ai acheté du pain à la boulangerie avant le petit-déjeuner parce que nous n'avions rien."},
            {"french": "Je suis très beaucoup fatigué."},
            {"french": "Où est la porte d'avant dans le train ?"},
        ],
        "existing_fr_do_not_repeat": existing_fr[-260:],
        "existing_ru_do_not_repeat": existing_ru[-260:],
    }


def normalize_row(raw: dict[str, Any], *, index: int, block_index: int, block: str) -> dict[str, Any]:
    french = re.sub(r"\s+", " ", str(raw.get("french") or "").strip())
    russian = re.sub(r"\s+", " ", str(raw.get("russian") or "").strip())
    return {
        "index": index,
        "id": f"CHFR-{index:03d}",
        "block_index": block_index,
        "block": block,
        "type": str(raw.get("type") or row_type(french)).strip(),
        "french": french,
        "russian": russian,
    }


def starts_with_je(text: str) -> bool:
    return text.casefold().startswith(("je ", "j'"))


def validate_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    errors: list[str] = []
    if len(rows) != 800:
        errors.append(f"expected 800 rows, got {len(rows)}")
    seen_fr: dict[str, int] = {}
    seen_ru: dict[str, int] = {}
    block_counts: dict[str, int] = {}
    type_counts: dict[str, int] = {}
    starts_je = 0
    questions = 0
    requests = 0
    situation_markers = 0
    bad_patterns: list[dict[str, Any]] = []
    bad_encoded: list[dict[str, Any]] = []
    long_rows: list[dict[str, Any]] = []
    for expected, row in enumerate(rows, start=1):
        if row.get("index") != expected:
            errors.append(f"index mismatch at {expected}: {row.get('index')}")
        block_counts[row["block"]] = block_counts.get(row["block"], 0) + 1
        type_counts[row["type"]] = type_counts.get(row["type"], 0) + 1
        fr = str(row.get("french") or "").strip()
        ru = str(row.get("russian") or "").strip()
        if not fr or not ru:
            errors.append(f"{expected:03d} empty phrase")
        if "???" in ru or "Ð" in ru or "Ñ" in ru or "\ufffd" in ru:
            bad_encoded.append({"index": expected, "russian": ru})
        words = fr.replace("?", " ?").replace("!", " !").split()
        if len(words) < 2 or len(words) > 12:
            long_rows.append({"index": expected, "french": fr, "word_count": len(words)})
        if starts_with_je(fr):
            starts_je += 1
        if fr.endswith("?"):
            questions += 1
        if row_type(fr) == "request_or_command" or str(row.get("type") or "") == "request_or_command":
            requests += 1
        if fr.casefold().startswith(("ça ", "c'est", "il y a", "il faut", "on ")):
            situation_markers += 1
        nfr = normalize(fr)
        nru = normalize(ru)
        if nfr in seen_fr:
            errors.append(f"{expected:03d} duplicate French with {seen_fr[nfr]}: {fr}")
        else:
            seen_fr[nfr] = expected
        if nru in seen_ru:
            errors.append(f"{expected:03d} duplicate Russian with {seen_ru[nru]}: {ru}")
        else:
            seen_ru[nru] = expected
        lowered = nfr
        if any(pattern in lowered for pattern in BAD_FRENCH_PATTERNS):
            bad_patterns.append({"index": expected, "french": fr})
    for block, count in block_counts.items():
        if count != 50:
            errors.append(f"bad block count {block}: {count}")
    if starts_je > 190:
        errors.append(f"too many Je-start phrases: {starts_je}")
    if questions < 180:
        errors.append(f"too few questions: {questions}")
    if requests < 80:
        errors.append(f"too few requests/commands: {requests}")
    if situation_markers < 120:
        errors.append(f"too few conversational situation markers: {situation_markers}")
    if len(long_rows) > 35:
        errors.append(f"too many length outliers: {long_rows[:10]}")
    if bad_patterns:
        errors.append(f"bad pattern examples: {bad_patterns[:5]}")
    if bad_encoded:
        errors.append(f"bad encoded Russian text: {bad_encoded[:10]}")
    return {
        "ok": not errors,
        "errors": errors[:100],
        "row_count": len(rows),
        "unique_french": len(seen_fr),
        "unique_russian": len(seen_ru),
        "starts_with_je": starts_je,
        "question_count": questions,
        "request_or_command_count": requests,
        "situation_marker_count": situation_markers,
        "type_counts": type_counts,
        "block_counts": block_counts,
        "length_outliers": long_rows[:30],
        "bad_encoded_russian": bad_encoded[:30],
    }


def write_outputs(rows: list[dict[str, Any]], report: dict[str, Any]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "chains_800_french_ru_conversation.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    with (OUT / "chains_800_french_ru_conversation.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["index", "id", "block_index", "block", "type", "french", "russian"])
        writer.writeheader()
        writer.writerows(rows)
    lines = ["# Chains 800 French-Russian Conversation Pack", ""]
    for row in rows:
        if (row["index"] - 1) % 50 == 0:
            lines.extend(["", f"## {row['block_index']:02d}. {row['block']}", ""])
        lines.append(f"{row['index']:03d}. {row['french']} — {row['russian']}")
    (OUT / "chains_800_french_ru_conversation.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (OUT / "chains_800_french_ru_conversation_gate_report.json").write_text(
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
    env = load_env_file(Path.cwd())
    api_key = env.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is missing in .env.local")

    rows: list[dict[str, Any]] = load_checkpoint()
    existing_fr: list[str] = [str(row["french"]) for row in rows]
    existing_ru: list[str] = [str(row["russian"]) for row in rows]
    if rows:
        print(f"[chains-fr] resumed checkpoint with {len(rows)} rows", flush=True)
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
                existing_fr=existing_fr,
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
                    f"[chains-fr] retry {chunk_attempt}/3 for {start_index:03d}: "
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
                existing_fr.append(row["french"])
                existing_ru.append(row["russian"])
            got = len(raw_rows)
            offset += got
            write_checkpoint(rows)
            print(f"[chains-fr] generated {start_index:03d}-{start_index + got - 1:03d} {block_name}", flush=True)

    report = validate_rows(rows)
    write_outputs(rows, report)
    if report["ok"] and CHECKPOINT.exists():
        CHECKPOINT.unlink()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
