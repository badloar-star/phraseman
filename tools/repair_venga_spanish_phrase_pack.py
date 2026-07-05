#!/usr/bin/env python3
"""Repair duplicate/old rows in the RU->ES phrase pack."""

from __future__ import annotations

import json
import re
import time
import urllib.request
from pathlib import Path
from typing import Any

import generate_venga_spanish_phrase_pack as gen
from openai_dev_guard import require_codex_openai_tts_only


PACK = Path("exports/venga-phrase-packs/ru-es-a1-vsscp")
MODEL = "gpt-4o-mini"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def problem_indexes(rows: list[dict[str, Any]]) -> list[int]:
    banned = gen.banned_rows()
    old_ru = {item["ru"].casefold() for item in banned if item["ru"]}
    old_en = {item["en_reference"].casefold() for item in banned if item["en_reference"]}
    seen_ru: dict[str, int] = {}
    seen_es: dict[str, int] = {}
    bad: set[int] = set()
    for row in rows:
        idx = int(row["index"])
        ru = str(row.get("ru", "")).casefold()
        en = str(row.get("en_reference", "")).casefold()
        es = str(row.get("es", "")).casefold()
        if ru in old_ru or en in old_en:
            bad.add(idx)
        if ru in seen_ru:
            bad.add(idx)
        else:
            seen_ru[ru] = idx
        if es in seen_es:
            bad.add(idx)
        else:
            seen_es[es] = idx
        if not str(row.get("ipa", "")).startswith("/") or not str(row.get("ipa", "")).endswith("/"):
            bad.add(idx)
        if " — " not in str(row.get("breakdown", "")):
            bad.add(idx)
        if str(row.get("ru", "")).upper() == str(row.get("ru", "")):
            bad.add(idx)
    return sorted(bad)


def chat_repair(api_key: str, rows: list[dict[str, Any]], bad_indexes: list[int]) -> list[dict[str, Any]]:
    locked = [row for row in rows if int(row["index"]) not in bad_indexes]
    prompt = {
        "task": "Replace only the listed bad rows in a RU->ES A1 phrase pack.",
        "bad_indexes": bad_indexes,
        "rules": [
            "Return strict JSON only with key rows.",
            "Return exactly one replacement row for every bad index.",
            "Keep the same index number.",
            "Each row has: index, ru, en_reference, es, ipa, breakdown.",
            "Use fresh everyday A1 phrases that are NOT semantically the same as locked rows or banned old rows.",
            "ru must be natural Russian sentence case.",
            "es must be natural everyday neutral Latin American Spanish, sentence case, 2-6 words.",
            "ipa must be Spanish IPA wrapped in slashes.",
            "breakdown must be Spanish-to-Russian chunks separated by semicolons, no English meanings.",
            "Avoid: help, tea, bathroom, hotel, how are you, tired, cold, hot, phone, bus, work, breakfast, water, coffee.",
        ],
        "locked_existing_rows": locked[-160:],
        "banned_old_rows": gen.banned_rows()[-220:],
    }
    payload = json.dumps(
        {
            "model": MODEL,
            "temperature": 0.45,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You are a meticulous native Spanish/Russian A1 lesson editor. Output valid JSON only."},
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
    with urllib.request.urlopen(request, timeout=240) as response:
        data = json.loads(response.read().decode("utf-8"))
    parsed = json.loads(data["choices"][0]["message"]["content"])
    if "rows" in parsed:
        return parsed["rows"]
    if "replacements" in parsed:
        return parsed["replacements"]
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict) and all(str(key).isdigit() for key in parsed):
        return list(parsed.values())
    raise RuntimeError(f"Unexpected repair response keys: {list(parsed) if isinstance(parsed, dict) else type(parsed)}")


def sentence_case_ru(text: str) -> str:
    if text.upper() == text and re.search(r"[А-ЯЁ]", text):
        lower = text.lower()
        return lower[:1].upper() + lower[1:]
    return text


def main() -> int:
    require_codex_openai_tts_only(action="Venga Spanish phrase pack repair", endpoint="chat/completions")
    env = gen.load_env_file(Path.cwd())
    api_key = env.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required")
    rows = load_json(PACK / "phrase_rows.json")
    for row in rows:
        row["ru"] = sentence_case_ru(str(row.get("ru", "")).strip().rstrip("."))

    for round_index in range(1, 5):
        bad = problem_indexes(rows)
        print(json.dumps({"round": round_index, "bad_count": len(bad), "bad": bad[:80]}, ensure_ascii=False), flush=True)
        if not bad:
            break
        repaired = chat_repair(str(api_key), rows, bad[:80])
        by_index = {int(item["index"]): gen.normalize_row(item, int(item["index"])) for item in repaired}
        for i, row in enumerate(rows):
            idx = int(row["index"])
            if idx in by_index:
                rows[i] = by_index[idx]
        time.sleep(1)

    errors = gen.validate_rows(rows, gen.banned_rows())
    write_json(PACK / "phrase_rows.json", rows)
    write_json(PACK / "validation.json", {"error_count": len(errors), "errors": errors})
    gen.write_review(rows, PACK / "ru-es-a1-review.md")
    print(json.dumps({"rows": len(rows), "errors": len(errors)}, ensure_ascii=False, indent=2))
    if errors:
        raise RuntimeError(f"Validation failed: {len(errors)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
