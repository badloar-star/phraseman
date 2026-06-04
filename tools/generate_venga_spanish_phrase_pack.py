#!/usr/bin/env python3
"""Generate a fresh RU->ES Venga A1 phrase pack with different phrases."""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


OUT_DIR = Path("exports/venga-phrase-packs/ru-es-a1-vsscp")
OLD_ROWS = [
    Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/phrase_rows.json"),
    Path("exports/venga-phrase-packs/ru-de-a1-vsscp/phrase_rows.json"),
]
MODEL = "gpt-4o-mini"
CHUNK_SIZE = 10

TOPICS = [
    "daily routines at home, but not the old wake/drink/work examples",
    "small talk with friends and neighbors",
    "city errands and simple services",
    "food, market, ordering, preferences",
    "travel basics, hotel, station, airport",
    "health, feelings, simple needs",
    "phone, internet, messages, plans",
    "polite requests, problems, quick decisions",
]


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
    for line in env_path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def banned_rows() -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for path in OLD_ROWS:
        if not path.exists():
            continue
        for row in load_json(path):
            out.append(
                {
                    "ru": str(row.get("ru") or "").strip(),
                    "en_reference": str(row.get("en_reference") or "").strip(),
                    "foreign": str(row.get("fr") or row.get("de") or "").strip(),
                }
            )
    return out[:240]


def chat_json(api_key: str, *, start_index: int, count: int, topic: str, banned: list[dict[str, str]], retries: int = 4) -> list[dict[str, Any]]:
    prompt = {
        "task": "Create fresh A1 Spanish phrases for a Russian-speaking YouTube lesson video.",
        "range": {"start_index": start_index, "count": count},
        "topic": topic,
        "requirements": [
            "Return strict JSON only with key rows.",
            "Create new phrases, not translations of the banned/old examples.",
            "Every row must have: index, ru, en_reference, es, ipa, breakdown.",
            "ru is a natural Russian translation, not uppercase.",
            "en_reference is a concise English meaning for background search only.",
            "es is natural everyday Latin American neutral Spanish, sentence case, A1 level.",
            "ipa is Spanish IPA wrapped in slashes.",
            "breakdown is Spanish-to-Russian word/short-chunk mapping separated by semicolons.",
            "Use breakdown format: Necesito — мне нужно; ayuda — помощь.",
            "No English in breakdown. Russian only after dash.",
            "Avoid long textbook sentences. Prefer 2-6 Spanish words.",
            "Avoid duplicate meanings inside this chunk.",
            "No idioms that need cultural explanation.",
        ],
        "banned_old_examples": banned,
    }
    payload = json.dumps(
        {
            "model": MODEL,
            "temperature": 0.35,
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
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                data = json.loads(response.read().decode("utf-8"))
            parsed = json.loads(data["choices"][0]["message"]["content"])
            rows = parsed["rows"]
            if not isinstance(rows, list):
                raise RuntimeError("rows is not a list")
            return rows
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            last_error = RuntimeError(f"OpenAI chat failed {error.code}: {body[:800]}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        if attempt < retries:
            time.sleep(1.5 * attempt)
    raise RuntimeError(f"OpenAI chat failed after {retries} attempts: {last_error}")


def normalize_row(row: dict[str, Any], index: int) -> dict[str, Any]:
    return {
        "index": index,
        "ru": str(row.get("ru") or "").replace("\n", " ").strip().rstrip("."),
        "en_reference": str(row.get("en_reference") or "").replace("\n", " ").strip().rstrip("."),
        "es": str(row.get("es") or "").replace("\n", " ").strip().rstrip("."),
        "ipa": str(row.get("ipa") or "").replace("\n", " ").strip(),
        "breakdown": str(row.get("breakdown") or "").replace("\n", "; ").strip().rstrip("."),
    }


def validate_rows(rows: list[dict[str, Any]], banned: list[dict[str, str]]) -> list[str]:
    errors: list[str] = []
    if len(rows) != 200:
        errors.append(f"expected 200 rows, got {len(rows)}")
    old_ru = {item["ru"].casefold() for item in banned if item["ru"]}
    old_en = {item["en_reference"].casefold() for item in banned if item["en_reference"]}
    seen_ru: set[str] = set()
    seen_es: set[str] = set()
    for expected, row in enumerate(rows, start=1):
        index = int(row.get("index", -1))
        if index != expected:
            errors.append(f"index mismatch at {expected}: {index}")
        for key in ["ru", "en_reference", "es", "ipa", "breakdown"]:
            if not str(row.get(key, "")).strip():
                errors.append(f"{expected:03d} missing {key}")
        ru = str(row.get("ru", "")).casefold()
        en = str(row.get("en_reference", "")).casefold()
        es = str(row.get("es", "")).casefold()
        if ru in seen_ru:
            errors.append(f"{expected:03d} duplicate ru: {row.get('ru')}")
        if es in seen_es:
            errors.append(f"{expected:03d} duplicate es: {row.get('es')}")
        if ru in old_ru:
            errors.append(f"{expected:03d} repeats old ru: {row.get('ru')}")
        if en in old_en:
            errors.append(f"{expected:03d} repeats old en_reference: {row.get('en_reference')}")
        seen_ru.add(ru)
        seen_es.add(es)
        if str(row.get("es", "")).upper() == str(row.get("es", "")) and re.search(r"[A-Za-zÁÉÍÓÚÑÜáéíóúñü]", str(row.get("es", ""))):
            errors.append(f"{expected:03d} es is uppercase")
        if not (str(row.get("ipa", "")).startswith("/") and str(row.get("ipa", "")).endswith("/")):
            errors.append(f"{expected:03d} ipa must be wrapped in slashes")
        breakdown = str(row.get("breakdown", ""))
        if " — " not in breakdown:
            errors.append(f"{expected:03d} breakdown missing em dash separators")
        if re.search(r"\b(the|and|to|with|you|I|my|is|are)\b", breakdown, flags=re.IGNORECASE):
            errors.append(f"{expected:03d} breakdown may contain English: {breakdown}")
    return errors


def write_review(rows: list[dict[str, Any]], path: Path) -> None:
    lines = ["# VSSCP RU-ES A1 Fresh Phrase Pack", "", "Format: `RU | ES | IPA | Spanish->Russian breakdown | EN reference`.", ""]
    for row in rows:
        lines.append(f"{int(row['index']):03d}. {row['ru']} | {row['es']} | {row['ipa']} | {row['breakdown']} | {row['en_reference']}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    env = load_env_file(Path.cwd())
    api_key = env.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required in .env.local")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    banned = banned_rows()
    write_json(args.out_dir / "banned_old_rows.json", banned)

    all_rows: list[dict[str, Any]] = []
    for chunk_index, start in enumerate(range(1, 201, CHUNK_SIZE), start=1):
        count = min(CHUNK_SIZE, 201 - start)
        topic = TOPICS[(chunk_index - 1) % len(TOPICS)]
        chunk_path = args.out_dir / "chunks" / f"chunk_{chunk_index:02d}.json"
        if chunk_path.exists() and not args.force:
            raw = load_json(chunk_path)
        else:
            print(f"[ru-es-pack] generating {start:03d}-{start + count - 1:03d}: {topic}", flush=True)
            raw = chat_json(str(api_key), start_index=start, count=count, topic=topic, banned=banned[-80:])
            while len(raw) < count:
                missing_start = start + len(raw)
                missing_count = count - len(raw)
                print(f"[ru-es-pack] topping up {missing_start:03d}-{start + count - 1:03d}", flush=True)
                raw.extend(chat_json(str(api_key), start_index=missing_start, count=missing_count, topic=topic, banned=banned[-80:]))
            if len(raw) > count:
                raw = raw[:count]
            write_json(chunk_path, raw)
        if len(raw) < count:
            raise RuntimeError(f"Chunk {chunk_index} expected {count} rows, got {len(raw)}")
        for offset, item in enumerate(raw):
            index = start + offset
            row = normalize_row(item, index)
            all_rows.append(row)
            banned.append({"ru": row["ru"], "en_reference": row["en_reference"], "foreign": row["es"]})

    all_rows.sort(key=lambda item: int(item["index"]))
    errors = validate_rows(all_rows, banned_rows())
    write_json(args.out_dir / "phrase_rows.json", all_rows)
    write_json(args.out_dir / "validation.json", {"error_count": len(errors), "errors": errors})
    write_review(all_rows, args.out_dir / "ru-es-a1-review.md")
    print(json.dumps({"rows": len(all_rows), "errors": len(errors), "out_dir": args.out_dir.as_posix()}, ensure_ascii=False, indent=2))
    if errors:
        raise RuntimeError(f"Validation failed with {len(errors)} errors")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
