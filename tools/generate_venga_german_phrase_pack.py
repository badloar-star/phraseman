#!/usr/bin/env python3
"""Generate a RU->DE Venga A1 phrase pack from the approved RU/FR rows."""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


SOURCE_ROWS = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/phrase_rows.json")
OUT_DIR = Path("exports/venga-phrase-packs/ru-de-a1-vsscp")
MODEL = "gpt-4o-mini"
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


def source_rows(path: Path) -> list[dict[str, Any]]:
    rows = load_json(path)
    out: list[dict[str, Any]] = []
    for row in rows:
        out.append(
            {
                "index": int(row["index"]),
                "ru": str(row["ru"]).replace("\n", " ").strip(),
                "en_reference": str(row.get("en_reference") or "").replace("\n", " ").strip(),
            }
        )
    if len(out) != 200:
        raise RuntimeError(f"Expected 200 source rows, got {len(out)}")
    return out


def chat_json(api_key: str, rows: list[dict[str, Any]], retries: int = 4) -> list[dict[str, Any]]:
    prompt = {
        "task": "Translate an A1 English/Russian phrase list into natural German for a YouTube language lesson.",
        "requirements": [
            "Return only valid JSON with key rows.",
            "Keep exactly the same index values.",
            "Use natural everyday Hochdeutsch, spoken but grammatically correct.",
            "Keep A1 short phrases. Avoid long textbook constructions.",
            "de must be normal sentence case, not uppercase.",
            "ipa must be German IPA between slashes.",
            "breakdown must be German-to-Russian word/phrase-by-word/phrase, separated by semicolons.",
            "Breakdown format example: Ich — я; trinke — пью; Wasser — воду.",
            "For German separable verbs and fixed chunks, group natural chunks: stehe auf, gehe zur Arbeit, zu Hause.",
            "Do not translate German words with English. Russian only in breakdown meanings.",
            "No extra explanations.",
        ],
        "rows": rows,
    }
    payload = json.dumps(
        {
            "model": MODEL,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You are a meticulous native German/Russian lesson editor. Output strict JSON only."},
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
    seen: set[int] = set()
    for expected, row in enumerate(rows, start=1):
        index = int(row.get("index", -1))
        if index != expected:
            errors.append(f"index mismatch at {expected}: {index}")
        if index in seen:
            errors.append(f"duplicate index {index}")
        seen.add(index)
        for key in ["ru", "en_reference", "de", "ipa", "breakdown"]:
            if not str(row.get(key, "")).strip():
                errors.append(f"{index:03d} missing {key}")
        de = str(row.get("de", ""))
        breakdown = str(row.get("breakdown", ""))
        if de.upper() == de and re.search(r"[A-Za-zÄÖÜäöüß]", de):
            errors.append(f"{index:03d} de is uppercase")
        if not (str(row.get("ipa", "")).startswith("/") and str(row.get("ipa", "")).endswith("/")):
            errors.append(f"{index:03d} ipa must be wrapped in slashes")
        if " — " not in breakdown:
            errors.append(f"{index:03d} breakdown missing em dash separators")
        if re.search(r"\b(the|and|to|with|you|I|me|my)\b", breakdown, flags=re.IGNORECASE):
            errors.append(f"{index:03d} breakdown may contain English: {breakdown}")
    return errors


def write_review(rows: list[dict[str, Any]], path: Path) -> None:
    lines = [
        "# VSSCP RU-DE A1 Phrase Pack",
        "",
        "Format: `RU | DE | IPA | German->Russian breakdown | EN reference`.",
        "",
    ]
    for row in rows:
        lines.append(
            f"{int(row['index']):03d}. {row['ru']} | {row['de']} | {row['ipa']} | {row['breakdown']} | {row['en_reference']}"
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE_ROWS)
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument("--chunk-size", type=int, default=CHUNK_SIZE)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    env = load_env_file(Path.cwd())
    api_key = env.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required in .env.local")

    raw_rows = source_rows(args.source)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    write_json(args.out_dir / "source_rows.json", raw_rows)

    all_rows: list[dict[str, Any]] = []
    for start in range(0, len(raw_rows), args.chunk_size):
        chunk = raw_rows[start : start + args.chunk_size]
        chunk_path = args.out_dir / "chunks" / f"chunk_{start // args.chunk_size + 1:02d}.json"
        if chunk_path.exists() and not args.force:
            translated = load_json(chunk_path)
        else:
            print(f"[ru-de-pack] translating {chunk[0]['index']:03d}-{chunk[-1]['index']:03d}", flush=True)
            translated = chat_json(str(api_key), chunk)
            by_index = {int(item["index"]): item for item in translated}
            translated = [{**source, **by_index[int(source["index"])]} for source in chunk]
            write_json(chunk_path, translated)
        all_rows.extend(translated)

    all_rows.sort(key=lambda item: int(item["index"]))
    errors = validate_rows(all_rows)
    write_json(args.out_dir / "phrase_rows.json", all_rows)
    write_json(args.out_dir / "validation.json", {"error_count": len(errors), "errors": errors})
    write_review(all_rows, args.out_dir / "ru-de-a1-review.md")
    print(json.dumps({"rows": len(all_rows), "errors": len(errors), "out_dir": args.out_dir.as_posix()}, ensure_ascii=False, indent=2))
    if errors:
        raise RuntimeError(f"Validation failed with {len(errors)} errors")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
