# -*- coding: utf-8 -*-
"""Set LESSON_28 PHRASE russian/ukrainian from scripts/lesson_28_user.md **RU / **UK lines."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD = ROOT / "scripts" / "lesson_28_user.md"
TS = ROOT / "app" / "lesson_data_25_32.ts"


def parse_md() -> dict[int, tuple[str, str]]:
    text = MD.read_text(encoding="utf-8")
    # File may start with ### 1. (no leading newline)
    parts = re.split(r"(?:\A|\r?\n)###\s*(\d+)\.\s*", text)
    if len(parts) < 2:
        raise ValueError("no ### N. sections")
    out: dict[int, tuple[str, str]] = {}
    for i in range(1, len(parts), 2):
        n = int(parts[i])
        block = parts[i + 1] if i + 1 < len(parts) else ""
        m_ru = re.search(r"\*\*RU:\s*([^*]+?)\s*\*\*", block)
        m_uk = re.search(r"\*\*UK:\s*([^*]+?)\s*\*\*", block)
        if not m_ru or not m_uk:
            raise ValueError(f"missing RU/UK in section {n}")
        out[n] = (m_ru.group(1).strip(), m_uk.group(1).strip())
    if len(out) != 50:
        raise ValueError(f"expected 50 phrases, got {len(out)}")
    if set(out.keys()) != set(range(1, 51)):
        raise ValueError("missing ids")
    return out


def ts_single_quote(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def main() -> None:
    pairs = parse_md()
    t = TS.read_text(encoding="utf-8")
    a = t.index("export const LESSON_28_PHRASES")
    b = t.index("export const LESSON_28_VOCABULARY")
    head, section, tail = t[:a], t[a:b], t[b:]

    lines = section.splitlines(keepends=True)
    out_lines: list[str] = []
    current_id: int | None = None
    for line in lines:
        m = re.match(r"    id: (\d+),", line)
        if m:
            current_id = int(m.group(1))
            out_lines.append(line)
            continue
        if current_id is not None and 1 <= current_id <= 50 and line.lstrip().startswith("russian:"):
            out_lines.append(
                f"    russian: '{ts_single_quote(pairs[current_id][0])}',\n"
            )
            continue
        if current_id is not None and 1 <= current_id <= 50 and line.lstrip().startswith("ukrainian:"):
            out_lines.append(
                f"    ukrainian: '{ts_single_quote(pairs[current_id][1])}',\n"
            )
            continue
        if re.match(r"  \},", line):
            current_id = None
        out_lines.append(line)

    new_t = head + "".join(out_lines) + tail
    TS.write_text(new_t, encoding="utf-8")
    print("Updated LESSON_28_PHRASES russian/ukrainian for ids 1–50 from", MD.name)


if __name__ == "__main__":
    main()
