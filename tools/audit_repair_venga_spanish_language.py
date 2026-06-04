#!/usr/bin/env python3
"""Audit and minimally repair RU->ES Venga rows for language quality."""

from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path
from typing import Any

import generate_venga_spanish_phrase_pack as gen


PACK = Path("exports/venga-phrase-packs/ru-es-a1-vsscp")
MODEL = "gpt-4o-mini"
CHUNK = 40


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def chat_audit(api_key: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    prompt = {
        "task": "Audit RU->ES A1 lesson rows. Return only rows that need correction.",
        "rules": [
            "Output strict JSON only: {\"fixes\":[...]}",
            "Keep the same index.",
            "Do not rewrite good rows.",
            "Fix unnatural or wrong Russian, Spanish, Spanish IPA, or Spanish-to-Russian breakdown.",
            "Russian must be natural sentence case without grammar mistakes.",
            "Spanish must be natural neutral Latin American A1.",
            "IPA must match the Spanish text and be wrapped in slashes.",
            "Breakdown must be Spanish chunks to Russian only, separated by semicolons, using an em dash.",
            "No English meanings inside breakdown.",
            "Preserve the intended meaning if it is correct.",
        ],
        "rows": rows,
    }
    payload = json.dumps(
        {
            "model": MODEL,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You are a strict native Russian and native Spanish lesson editor. Output JSON only."},
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
    return parsed.get("fixes", [])


def normalized_fix(item: dict[str, Any], original: dict[str, Any]) -> dict[str, Any]:
    fixed = dict(original)
    for key in ["ru", "en_reference", "es", "ipa", "breakdown"]:
        if key in item and str(item[key]).strip():
            fixed[key] = str(item[key]).replace("\n", " ").strip().rstrip(".")
    fixed["index"] = int(original["index"])
    return fixed


def main() -> int:
    env = gen.load_env_file(Path.cwd())
    api_key = env.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required")
    rows = load_json(PACK / "phrase_rows.json")
    by_index = {int(row["index"]): row for row in rows}
    fixes: list[dict[str, Any]] = []
    for start in range(0, len(rows), CHUNK):
        chunk = rows[start : start + CHUNK]
        got = chat_audit(str(api_key), chunk)
        print(json.dumps({"range": [int(chunk[0]["index"]), int(chunk[-1]["index"])], "fixes": len(got)}, ensure_ascii=False), flush=True)
        fixes.extend(got)
        time.sleep(0.5)

    changed: list[dict[str, Any]] = []
    for fix in fixes:
        idx = int(fix["index"])
        if idx not in by_index:
            continue
        new_row = normalized_fix(fix, by_index[idx])
        if json.dumps(new_row, ensure_ascii=False, sort_keys=True) != json.dumps(by_index[idx], ensure_ascii=False, sort_keys=True):
            by_index[idx] = new_row
            changed.append({"index": idx, "before": rows[idx - 1], "after": new_row, "reason": fix.get("reason", "")})

    repaired = [by_index[i] for i in range(1, len(rows) + 1)]
    errors = gen.validate_rows(repaired, gen.banned_rows())
    write_json(PACK / "phrase_rows.json", repaired)
    write_json(PACK / "validation.json", {"error_count": len(errors), "errors": errors})
    write_json(PACK / "language_audit_fixes.json", changed)
    gen.write_review(repaired, PACK / "ru-es-a1-review.md")
    print(json.dumps({"rows": len(repaired), "changed": len(changed), "errors": len(errors), "changed_indexes": [c["index"] for c in changed]}, ensure_ascii=False, indent=2))
    if errors:
        raise RuntimeError(f"Validation failed: {len(errors)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
