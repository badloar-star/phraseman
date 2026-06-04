#!/usr/bin/env python3
"""Audit and correct the VSSCP RU->FR phrase pack."""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


MODEL = "gpt-4o"
CHUNK_SIZE = 20


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


def chat_json(api_key: str, rows: list[dict[str, Any]], retries: int = 4) -> list[dict[str, Any]]:
    prompt = {
        "task": "Audit and correct a French A1 phrase pack for Russian speakers.",
        "requirements": [
            "Return only valid JSON with key rows.",
            "Keep exactly the same index, ru, and en_reference.",
            "Correct fr if it is unnatural, too formal, too hard, or semantically off.",
            "Prefer short spoken France French suitable for A1 learners.",
            "For questions, prefer simple spoken order when it helps A1 clarity, e.g. Tu viens quand ?",
            "Correct IPA carefully for France French. IPA must be wrapped in slashes.",
            "Correct breakdown so every French chunk maps to Russian, not English.",
            "Do not put fake literal meanings like est-ce que — это; either choose simpler French or group est-ce que as вопросительная конструкция.",
            "For contractions/articles, group natural chunks: de l'eau, du café, au magasin, à la maison.",
            "Breakdown format: French chunk — Russian meaning; French chunk — Russian meaning.",
            "Do not omit meaningful auxiliaries. Example: tout — всё; a changé — изменилось.",
            "No comments outside JSON.",
        ],
        "rows": rows,
    }
    payload = json.dumps(
        {
            "model": MODEL,
            "temperature": 0.05,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You are a strict native French/Russian linguistic QA editor. Output JSON only."},
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
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            out_rows = parsed["rows"]
            if not isinstance(out_rows, list):
                raise RuntimeError("rows is not a list")
            return out_rows
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            last_error = RuntimeError(f"OpenAI chat failed {error.code}: {body[:800]}")
        except Exception as error:  # noqa: BLE001
            last_error = error
        if attempt < retries:
            time.sleep(1.5 * attempt)
    raise RuntimeError(f"OpenAI chat failed after {retries} attempts: {last_error}")


def validate_rows(rows: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    if len(rows) != 200:
        errors.append(f"expected 200 rows, got {len(rows)}")
    for expected, row in enumerate(rows, start=1):
        index = int(row.get("index", -1))
        if index != expected:
            errors.append(f"index mismatch at {expected}: {index}")
        for key in ["ru", "en_reference", "fr", "ipa", "breakdown"]:
            if not str(row.get(key, "")).strip():
                errors.append(f"{index:03d} missing {key}")
        if not (str(row.get("ipa", "")).startswith("/") and str(row.get("ipa", "")).endswith("/")):
            errors.append(f"{index:03d} ipa must be wrapped in slashes")
        breakdown = str(row.get("breakdown", ""))
        if " — " not in breakdown:
            errors.append(f"{index:03d} breakdown missing em dash separators")
        if re.search(r"\b(the|and|to|with|you|I)\b", breakdown, flags=re.IGNORECASE):
            errors.append(f"{index:03d} breakdown may contain English: {breakdown}")
        if "est-ce que — это" in breakdown:
            errors.append(f"{index:03d} bad est-ce que breakdown")
    return errors


def write_review(rows: list[dict[str, Any]], path: Path) -> None:
    lines = [
        "# VSSCP RU-FR A1 Phrase Pack - Audited",
        "",
        "Format: `RU | FR | IPA | French->Russian breakdown | EN reference`.",
        "",
    ]
    for row in rows:
        lines.append(
            f"{int(row['index']):03d}. {row['ru']} | {row['fr']} | {row['ipa']} | {row['breakdown']} | {row['en_reference']}"
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phrases", type=Path, default=Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/phrase_rows.json"))
    parser.add_argument("--out-dir", type=Path, default=Path("exports/venga-phrase-packs/ru-fr-a1-vsscp"))
    parser.add_argument("--chunk-size", type=int, default=CHUNK_SIZE)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    api_key = load_env_file(Path.cwd()).get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required in .env.local")

    source_rows = load_json(args.phrases)
    corrected: list[dict[str, Any]] = []
    audit_dir = args.out_dir / "audit_chunks"
    for start in range(0, len(source_rows), args.chunk_size):
        chunk = source_rows[start : start + args.chunk_size]
        chunk_path = audit_dir / f"audit_chunk_{start // args.chunk_size + 1:02d}.json"
        if chunk_path.exists() and not args.force:
            audited = load_json(chunk_path)
        else:
            print(f"[ru-fr-audit] auditing {chunk[0]['index']:03d}-{chunk[-1]['index']:03d}", flush=True)
            audited = chat_json(str(api_key), chunk)
            by_index = {int(item["index"]): item for item in audited}
            audited = [{**source, **by_index[int(source["index"])]} for source in chunk]
            write_json(chunk_path, audited)
        corrected.extend(audited)

    corrected.sort(key=lambda item: int(item["index"]))
    errors = validate_rows(corrected)
    write_json(args.out_dir / "phrase_rows.audited.json", corrected)
    write_json(args.out_dir / "validation.audited.json", {"error_count": len(errors), "errors": errors})
    write_review(corrected, args.out_dir / "ru-fr-a1-review.audited.md")
    if not errors:
        write_json(args.out_dir / "phrase_rows.json", corrected)
        write_review(corrected, args.out_dir / "ru-fr-a1-review.md")
    print(json.dumps({"rows": len(corrected), "errors": len(errors), "out_dir": args.out_dir.as_posix()}, ensure_ascii=False, indent=2))
    if errors:
        raise RuntimeError(f"Validation failed with {len(errors)} errors")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
