#!/usr/bin/env python3
"""Emit markdown: lesson phrases (EN/RU/UK) + card fields side by side."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def extract_lesson24_phrases(ts: str) -> dict[int, tuple[str, str, str]]:
    start = ts.index("export const LESSON_24_PHRASES")
    end = ts.index("export const LESSON_24_VOCABULARY", start)
    block = ts[start:end]
    pat = re.compile(
        r"\{id:'l24p(\d+)',english:'((?:\\'|[^'])*)',russian:'((?:\\'|[^'])*)',ukrainian:'((?:\\'|[^'])*)'",
        re.DOTALL,
    )
    out: dict[int, tuple[str, str, str]] = {}
    for m in pat.finditer(block):
        n = int(m.group(1))
        en = m.group(2).replace("\\'", "'")
        ru = m.group(3).replace("\\'", "'")
        uk = m.group(4).replace("\\'", "'")
        out[n] = (en, ru, uk)
    return out


def unescape_ts_string(s: str) -> str:
    return (
        s.replace("\\`", "`")
        .replace("\\n", "\n")
        .replace("\\'", "'")
    )


def extract_lesson24_cards(ts: str) -> dict[int, dict[str, str]]:
    m = re.search(r"\n  24: \{", ts)
    if not m:
        raise SystemExit("Could not find `24: {` in lesson_cards_data.ts")
    i = m.end() - 1  # points at '{'
    depth = 0
    j = i
    while j < len(ts):
        c = ts[j]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                block = ts[i : j + 1]
                break
        j += 1
    else:
        raise SystemExit("Unbalanced braces for lesson 24 cards")

    cards: dict[int, dict[str, str]] = {}
    field_re = re.compile(r"(correctRu|correctUk|wrongRu|wrongUk|secretRu|secretUk):\s*`([^`]*)`", re.DOTALL)
    card_split = re.compile(r"\n    (\d+): \{")

    parts = card_split.split(block)
    # parts[0] is junk before first card; then id, body, id, body, ...
    k = 1
    while k + 1 < len(parts):
        idx = int(parts[k])
        body = parts[k + 1]
        fields: dict[str, str] = {}
        for fm in field_re.finditer(body):
            fields[fm.group(1)] = unescape_ts_string(fm.group(2))
        cards[idx] = fields
        k += 2
    return cards


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lesson", type=int, default=24, help="Only lesson 24 supported for phrases TS slice")
    ap.add_argument("-o", "--out", type=Path, help="Output .md path")
    args = ap.parse_args()
    if args.lesson != 24:
        print("Only --lesson 24 is wired to LESSON_24_PHRASES slice.", file=sys.stderr)
        sys.exit(2)

    data_path = ROOT / "app" / "lesson_data_17_24.ts"
    cards_path = ROOT / "app" / "lesson_cards_data.ts"
    phrases = extract_lesson24_phrases(data_path.read_text(encoding="utf-8"))
    cards = extract_lesson24_cards(cards_path.read_text(encoding="utf-8"))

    lines: list[str] = [
        "# Урок 24 — фрази та картки (зведення)",
        "",
        "Джерела: `app/lesson_data_17_24.ts` (`LESSON_24_PHRASES`), `app/lesson_cards_data.ts` (`24`).",
        "Номер **pNN** = ключ картки **NN**.",
        "",
    ]
    for n in range(1, 51):
        en, ru, uk = phrases.get(n, ("?", "?", "?"))
        c = cards.get(n, {})
        lines.append(f"## l24p{n} / картка {n}")
        lines.append("")
        lines.append(f"- **EN:** {en}")
        lines.append(f"- **RU:** {ru}")
        lines.append(f"- **UK:** {uk}")
        lines.append("")
        for key in ("correctRu", "correctUk", "wrongRu", "wrongUk", "secretRu", "secretUk"):
            val = c.get(key, "—")
            lines.append(f"- **{key}:** {val}")
        lines.append("")

    text = "\n".join(lines)
    out = args.out or (ROOT / "docs" / "reports" / "lesson-24-phrases-with-cards.md")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"Written: {out}")


if __name__ == "__main__":
    main()
