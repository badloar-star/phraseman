#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Permute PhraseCard bodies within each lesson so that slot k best matches
LESSON_n_PHRASES phrase k (1-based), using the same token rules as
check_phrase_card_alignment (required words[].text in six fields as Latin).

Run:  python tools/reorder_lesson_cards_by_phrase.py
Then: python tools/audit_lesson_cards_l1_l4.py
"""
from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

import numpy as np

from scipy.optimize import linear_sum_assignment

ROOT = Path(__file__).resolve().parents[1]
CARDS_PATH = ROOT / "app" / "lesson_cards_data.ts"

_AUDIT = None

def _audit():
    global _AUDIT
    if _AUDIT is None:
        name = "audit_lesson_cards_l1_l4"
        spec = importlib.util.spec_from_file_location(
            name, ROOT / "tools" / "audit_lesson_cards_l1_l4.py"
        )
        mod = importlib.util.module_from_spec(spec)
        assert spec.loader
        sys.modules[name] = mod
        spec.loader.exec_module(mod)
        _AUDIT = mod
    return _AUDIT


FIELDS = re.compile(
    r"(correctRu|correctUk|wrongRu|wrongUk|secretRu|secretUk):\s*([`\"'])([\s\S]*?)\2"
)

_CARD_FIELDS = (
    "correctRu",
    "correctUk",
    "wrongRu",
    "wrongUk",
    "secretRu",
    "secretUk",
)


def card_dict_from_inner(inner: str) -> dict[str, str]:
    c: dict[str, str] = {}
    for m in FIELDS.finditer(inner):
        c[m.group(1)] = m.group(3)
    return c


def parse_card_inners(lesson: int, text: str) -> dict[int, str] | None:
    anchor = f"\n  {lesson}: {{"
    start = text.find(anchor)
    if start < 0:
        return None
    if lesson < 23:
        nxt = text.find(f"\n  {lesson + 1}: {{", start + 1)
    else:
        nxt = text.find("\n};", start)
    if nxt < 0:
        return None
    block = text[start:nxt]
    out: dict[int, str] = {}
    for m in re.finditer(
        r"\n    (\d{1,2}): \{([\s\S]*?)\n    \},",
        block,
    ):
        k = int(m.group(1))
        out[k] = m.group(2)
    return out


def build_cost_matrix(
    a,
    data: str,
    lesson: int,
    inners: dict[int, str],
) -> np.ndarray:
    """
    cost[r, c] = number of G_card_phrase_align issues if card body r+1
    is placed in slot c+1 (same logic as check_phrase_card_alignment in audit).
    """
    n = 50
    cost = np.zeros((n, n), dtype=np.float64)
    phrases = a.extract_lesson_phrases(data, lesson)
    for r in range(n):
        inner = inners.get(r + 1)
        if not inner:
            cost[r, :] = 1e4
            continue
        cdict = card_dict_from_inner(inner)
        if any(not (cdict.get(f) or "").strip() for f in _CARD_FIELDS):
            cost[r, :] = 1e4
            continue
        for c in range(n):
            eng = phrases.get(c + 1, "")
            toks = a.extract_phrase_target_tokens(data, lesson, c + 1)
            problems = a.check_phrase_card_alignment(eng, toks, cdict)
            cost[r, c] = float(len(problems))
            if r == c:
                cost[r, c] -= 1e-4
    return cost


def identity_assignment(row_ind: np.ndarray, col_ind: np.ndarray, n: int) -> bool:
    assign = {int(row_ind[k]): int(col_ind[k]) for k in range(n)}
    return all(assign.get(r, -1) == r for r in range(n))


def rebuild_lesson_block(lesson: int, new_inners: dict[int, str]) -> str:
    """Same shape as in lesson_cards_data.ts: `  L: {` + cards + `  },`."""
    lines: list[str] = [f"  {lesson}: {{"]
    for i in range(1, 51):
        inner = new_inners[i]
        lines.append(f"    {i}: {{\n{inner}\n    }},")
    lines.append("  },")
    return "\n".join(lines)


def main() -> int:
    a = _audit()
    d18 = a.DATA_TS.read_text(encoding="utf-8")
    d916 = a.DATA_TS_9_16.read_text(encoding="utf-8")
    d1724 = a.DATA_TS_17_24.read_text(encoding="utf-8")

    text = CARDS_PATH.read_text(encoding="utf-8")
    total_changed = 0

    for lesson in range(1, 24):
        inners = parse_card_inners(lesson, text)
        if not inners or len(inners) < 50:
            print(f"lesson {lesson}: expected 50 card bodies, got {len(inners or {})}, skip")
            continue

        data = a.get_data_for_lesson(lesson, d18, d916, d1724)
        cost = build_cost_matrix(a, data, lesson, inners)
        r_idx, c_idx = linear_sum_assignment(cost)
        if identity_assignment(r_idx, c_idx, 50):
            print(f"lesson {lesson}: identity (no reorder)")
            continue

        new_inners: dict[int, str] = {}
        for k in range(50):
            r, c = int(r_idx[k]), int(c_idx[k])
            new_inners[c + 1] = inners[r + 1]

        diffs = sum(1 for j in range(1, 51) if inners.get(j) != new_inners.get(j))
        total_changed += diffs
        print(f"lesson {lesson}: permute, {diffs}/50 card bodies moved")

        anchor = f"\n  {lesson}: {{"
        start = text.find(anchor)
        if start < 0:
            print("internal: anchor lost", lesson, file=sys.stderr)
            return 1
        if lesson < 23:
            nxt = text.find(f"\n  {lesson + 1}: {{", start + 1)
        else:
            nxt = text.find("\n};", start)
        if nxt < 0:
            print("internal: nxt", lesson, file=sys.stderr)
            return 1
        new_block = rebuild_lesson_block(lesson, new_inners)
        text = text[:start] + "\n" + new_block + text[nxt:]

    CARDS_PATH.write_text(text, encoding="utf-8")
    print(f"Done. Total card bodies moved (counted with multiplicity): {total_changed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
