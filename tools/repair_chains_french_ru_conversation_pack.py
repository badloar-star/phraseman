#!/usr/bin/env python3
"""Repair duplicate rows in the French-Russian conversation Chains pack."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_chains_french_ru_conversation_pack import (  # noqa: E402
    OUT,
    chat_json,
    load_env_file,
    normalize,
    row_type,
    validate_rows,
    write_outputs,
)


ROWS_PATH = OUT / "chains_800_french_ru_conversation.json"
REPORT_PATH = OUT / "chains_800_french_ru_conversation_repair_report.json"
BATCH_SIZE = 12
MAX_ROUNDS = 6

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


def load_rows() -> list[dict[str, Any]]:
    rows = json.loads(ROWS_PATH.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise RuntimeError(f"bad rows file: {ROWS_PATH}")
    return rows


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def duplicate_indexes(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen_fr: dict[str, dict[str, Any]] = {}
    seen_ru: dict[str, dict[str, Any]] = {}
    problems: dict[int, dict[str, Any]] = {}
    for row in rows:
        index = int(row["index"])
        nfr = normalize(str(row.get("french") or ""))
        nru = normalize(str(row.get("russian") or ""))
        reasons: list[str] = []
        if nfr in seen_fr:
            reasons.append(f"duplicate French with {seen_fr[nfr]['index']}")
        else:
            seen_fr[nfr] = row
        if nru in seen_ru:
            reasons.append(f"duplicate Russian with {seen_ru[nru]['index']}")
        else:
            seen_ru[nru] = row
        if reasons:
            problems[index] = {"index": index, "row": row, "reasons": reasons}
    return [problems[index] for index in sorted(problems)]


def prompt_for_batch(rows: list[dict[str, Any]], batch: list[dict[str, Any]]) -> dict[str, Any]:
    replace_indexes = {int(item["index"]) for item in batch}
    banned_fr = [str(row["french"]) for row in rows if int(row["index"]) not in replace_indexes]
    banned_ru = [str(row["russian"]) for row in rows if int(row["index"]) not in replace_indexes]
    return {
        "task": "Replace duplicate rows in an 800-row conversational French-Russian lesson pack.",
        "language_pair": "French -> Russian",
        "output": "Return strict JSON object: {\"rows\":[...]} only.",
        "row_schema": {
            "index": "integer, must match one row_to_replace index",
            "type": "one of: question, request_or_command, je_statement, you_we_statement, situation_statement, reaction, other",
            "french": "new natural spoken French phrase, sentence case",
            "russian": "new natural Russian translation, sentence case",
        },
        "hard_rules": [
            "Return exactly one replacement for every row_to_replace item.",
            "Keep each replacement in the same block and everyday situation as the original row.",
            "Every new French phrase must be unique and must not appear in banned_french.",
            "Every new Russian translation must be unique and must not appear in banned_russian.",
            "Do not create tiny paraphrase clones of banned phrases.",
            "Prefer conversational phrases people actually say: questions, requests, short reactions, small practical sentences.",
            "A1-A2 French only. 3-10 French words when possible.",
            "Avoid monotonous Je/J' starts unless the row really needs it.",
            "Use correct French accents and punctuation.",
            "Russian must be natural, not word-for-word awkward.",
            "No profanity, politics, religion, romance, violence, alcohol, or medical emergency detail.",
        ],
        "style_examples_good": [
            {"french": "Tu peux ouvrir un peu ?", "russian": "Можешь немного открыть?"},
            {"french": "On fait ça après le déjeuner.", "russian": "Сделаем это после обеда."},
            {"french": "Ça marche pour moi.", "russian": "Мне это подходит."},
            {"french": "Vous pouvez m'aider une minute ?", "russian": "Вы можете помочь мне минутку?"},
            {"french": "Je vérifie et je reviens.", "russian": "Я проверю и вернусь."},
        ],
        "row_to_replace": [
            {
                "index": item["index"],
                "block": item["row"]["block"],
                "current_type": item["row"].get("type"),
                "bad_french": item["row"]["french"],
                "bad_russian": item["row"]["russian"],
                "reasons": item["reasons"],
            }
            for item in batch
        ],
        "banned_french": banned_fr,
        "banned_russian": banned_ru,
    }


def normalize_replacement(raw: dict[str, Any], old: dict[str, Any]) -> dict[str, Any]:
    french = " ".join(str(raw.get("french") or "").strip().split())
    russian = " ".join(str(raw.get("russian") or "").strip().split())
    return {
        **old,
        "type": str(raw.get("type") or row_type(french)).strip(),
        "french": french,
        "russian": russian,
    }


def apply_replacements(rows: list[dict[str, Any]], replacements: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_index = {int(row["index"]): row for row in rows}
    for replacement in replacements:
        index = int(replacement["index"])
        if index not in by_index:
            raise RuntimeError(f"replacement index not in rows: {index}")
        old = by_index[index]
        by_index[index] = normalize_replacement(replacement, old)
    return [by_index[index] for index in sorted(by_index)]


def conflicts_after_replacement(rows: list[dict[str, Any]], indexes: set[int]) -> list[str]:
    errors: list[str] = []
    seen_fr: dict[str, int] = {}
    seen_ru: dict[str, int] = {}
    for row in rows:
        index = int(row["index"])
        nfr = normalize(str(row.get("french") or ""))
        nru = normalize(str(row.get("russian") or ""))
        if nfr in seen_fr and (index in indexes or seen_fr[nfr] in indexes):
            errors.append(f"{index:03d} duplicate French with {seen_fr[nfr]}: {row.get('french')}")
        else:
            seen_fr.setdefault(nfr, index)
        if nru in seen_ru and (index in indexes or seen_ru[nru] in indexes):
            errors.append(f"{index:03d} duplicate Russian with {seen_ru[nru]}: {row.get('russian')}")
        else:
            seen_ru.setdefault(nru, index)
    return errors


def repair_batch(api_key: str, rows: list[dict[str, Any]], batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
    indexes = {int(item["index"]) for item in batch}
    prompt = prompt_for_batch(rows, batch)
    last_errors: list[str] = []
    for attempt in range(1, 5):
        parsed = chat_json(api_key, prompt)
        candidate = parsed.get("rows")
        if not isinstance(candidate, list) or len(candidate) != len(batch):
            last_errors = [f"bad candidate count: {len(candidate) if isinstance(candidate, list) else 'non-list'}"]
            time.sleep(1.5 * attempt)
            continue
        got_indexes = {int(item.get("index", -1)) for item in candidate}
        if got_indexes != indexes:
            last_errors = [f"bad replacement indexes: {sorted(got_indexes)} expected {sorted(indexes)}"]
            time.sleep(1.5 * attempt)
            continue
        proposed = apply_replacements(rows, candidate)
        conflicts = conflicts_after_replacement(proposed, indexes)
        if conflicts:
            last_errors = conflicts[:12]
            prompt["previous_attempt_errors"] = last_errors
            prompt["hard_rules"].append("The previous attempt still created duplicates. Replace with completely different meanings.")
            time.sleep(1.5 * attempt)
            continue
        return proposed
    if len(batch) > 1:
        middle = max(1, len(batch) // 2)
        repaired = repair_batch(api_key, rows, batch[:middle])
        return repair_batch(api_key, repaired, batch[middle:])
    raise RuntimeError(f"repair batch failed for {sorted(indexes)}: {last_errors}")


def main() -> int:
    api_key = load_env_file(Path.cwd()).get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is missing in .env.local")
    rows = load_rows()
    history: list[dict[str, Any]] = []
    for round_index in range(1, MAX_ROUNDS + 1):
        problems = duplicate_indexes(rows)
        print(f"[chains-fr-repair] round {round_index}: duplicates={len(problems)}", flush=True)
        if not problems:
            break
        for start in range(0, len(problems), BATCH_SIZE):
            batch = problems[start : start + BATCH_SIZE]
            before_indexes = [item["index"] for item in batch]
            rows = repair_batch(api_key, rows, batch)
            write_json(ROWS_PATH, rows)
            print(
                f"[chains-fr-repair] round {round_index} repaired "
                f"{start + 1}-{min(start + BATCH_SIZE, len(problems))}/{len(problems)} "
                f"indexes={before_indexes[0]}-{before_indexes[-1]}",
                flush=True,
            )
        report = validate_rows(rows)
        write_outputs(rows, report)
        history.append({"round": round_index, "remaining_duplicates": len(duplicate_indexes(rows)), "gate_ok": report["ok"], "errors": report["errors"][:20]})
        if report["ok"]:
            break
    final_report = validate_rows(rows)
    write_outputs(rows, final_report)
    repair_report = {"status": "ready" if final_report["ok"] else "failed", "history": history, "final_gate": final_report}
    write_json(REPORT_PATH, repair_report)
    print(json.dumps(repair_report, ensure_ascii=False, indent=2), flush=True)
    return 0 if final_report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
