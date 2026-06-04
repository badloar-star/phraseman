#!/usr/bin/env python3
"""Generate a RU->FR phrase pack from the current VSSCP CapCut template."""

from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


SOURCE_DRAFT = "VENGA A1 200 OPENAI SEMANTIC HQ NOFADE CAPS"
OUT_DIR = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp")
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


def capcut_text(material: dict[str, Any]) -> str:
    try:
        content = json.loads(material.get("content") or "{}")
        return str(content.get("text") or material.get("base_content") or "")
    except json.JSONDecodeError:
        return str(material.get("base_content") or "")


def source_rows(draft_name: str) -> list[dict[str, Any]]:
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    draft = load_json(capcut_root / draft_name / "draft_content.json")
    texts = {item["id"]: item for item in draft["materials"]["texts"]}
    rows: list[dict[str, Any]] = []
    for index, (ru_seg, en_seg) in enumerate(zip(draft["tracks"][6]["segments"], draft["tracks"][8]["segments"], strict=True), start=1):
        rows.append(
            {
                "index": index,
                "ru": capcut_text(texts[ru_seg["material_id"]]).replace("\n", " ").strip(),
                "en_reference": capcut_text(texts[en_seg["material_id"]]).replace("\n", " ").strip().capitalize(),
            }
        )
    if len(rows) != 200:
        raise RuntimeError(f"Expected 200 rows, got {len(rows)}")
    return rows


def chat_json(api_key: str, rows: list[dict[str, Any]], retries: int = 4) -> list[dict[str, Any]]:
    prompt = {
        "task": "Translate an A1 English/Russian phrase list into natural French for a YouTube language lesson.",
        "requirements": [
            "Return only valid JSON with key rows.",
            "Keep exactly the same index values.",
            "Use natural everyday French, informal tu when the English 'you' is singular/general.",
            "Do not over-formalize. Keep A1 short spoken phrases.",
            "fr must be normal sentence case, not uppercase.",
            "ipa must be French IPA between slashes.",
            "breakdown must be French-to-Russian word/phrase-by-word/phrase, separated by semicolons.",
            "Breakdown format example: Je — я; bois — пью; de l'eau — воду.",
            "For French contractions/articles, group natural chunks: de l'eau, au travail, à la maison.",
            "Do not translate French words with English. Russian only in breakdown meanings.",
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
                {
                    "role": "system",
                    "content": "You are a meticulous native French/Russian lesson editor. Output strict JSON only.",
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
    seen = set()
    for expected, row in enumerate(rows, start=1):
        index = int(row.get("index", -1))
        if index != expected:
            errors.append(f"index mismatch at {expected}: {index}")
        if index in seen:
            errors.append(f"duplicate index {index}")
        seen.add(index)
        for key in ["ru", "en_reference", "fr", "ipa", "breakdown"]:
            if not str(row.get(key, "")).strip():
                errors.append(f"{index:03d} missing {key}")
        fr = str(row.get("fr", ""))
        breakdown = str(row.get("breakdown", ""))
        if fr.upper() == fr and re.search(r"[A-Za-zÀ-ÿ]", fr):
            errors.append(f"{index:03d} fr is uppercase")
        if not (str(row.get("ipa", "")).startswith("/") and str(row.get("ipa", "")).endswith("/")):
            errors.append(f"{index:03d} ipa must be wrapped in slashes")
        if " — " not in breakdown:
            errors.append(f"{index:03d} breakdown missing em dash separators")
        if re.search(r"\b(the|and|to|with|you|I)\b", breakdown, flags=re.IGNORECASE):
            errors.append(f"{index:03d} breakdown may contain English: {breakdown}")
    return errors


def write_review(rows: list[dict[str, Any]], path: Path) -> None:
    lines = [
        "# VSSCP RU-FR A1 Phrase Pack",
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
    parser.add_argument("--source-draft", default=SOURCE_DRAFT)
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument("--chunk-size", type=int, default=CHUNK_SIZE)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    env = load_env_file(Path.cwd())
    api_key = env.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required in .env.local")

    raw_rows = source_rows(args.source_draft)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    write_json(args.out_dir / "source_rows.json", raw_rows)

    all_rows: list[dict[str, Any]] = []
    for start in range(0, len(raw_rows), args.chunk_size):
        chunk = raw_rows[start : start + args.chunk_size]
        chunk_path = args.out_dir / "chunks" / f"chunk_{start // args.chunk_size + 1:02d}.json"
        if chunk_path.exists() and not args.force:
            translated = load_json(chunk_path)
        else:
            print(f"[ru-fr-pack] translating {chunk[0]['index']:03d}-{chunk[-1]['index']:03d}", flush=True)
            translated = chat_json(str(api_key), chunk)
            by_index = {int(item["index"]): item for item in translated}
            translated = [{**source, **by_index[int(source["index"])]} for source in chunk]
            write_json(chunk_path, translated)
        all_rows.extend(translated)

    all_rows.sort(key=lambda item: int(item["index"]))
    errors = validate_rows(all_rows)
    write_json(args.out_dir / "phrase_rows.json", all_rows)
    write_json(args.out_dir / "validation.json", {"error_count": len(errors), "errors": errors})
    write_review(all_rows, args.out_dir / "ru-fr-a1-review.md")
    print(json.dumps({"rows": len(all_rows), "errors": len(errors), "out_dir": args.out_dir.as_posix()}, ensure_ascii=False, indent=2))
    if errors:
        raise RuntimeError(f"Validation failed with {len(errors)} errors")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
