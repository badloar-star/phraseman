#!/usr/bin/env python3
"""Build stable on-screen text and IPA manifests for Chains unique v3."""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any

import eng_to_ipa


PACK = Path("exports/chains/phrase_packs/chains_800_unique_v3_20260604")
ROWS_PATH = PACK / "chains_800_unique_phrases.json"
OUT = PACK / "screen_texts"
MANIFEST_PATH = OUT / "chains_unique_v3_screen_text_manifest.json"
CSV_PATH = OUT / "chains_unique_v3_screen_text_manifest.csv"
REPORT_PATH = OUT / "chains_unique_v3_screen_text_report.json"
MD_PATH = OUT / "chains_unique_v3_screen_text_rules.md"

IPA_REPLACEMENTS = {
    "inbox*": "ˈɪnˌbɑks",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def clean_for_ipa(text: str) -> str:
    cleaned = text.strip().rstrip(".!?")
    cleaned = cleaned.replace("’", "'")
    cleaned = re.sub(r"\bcafé\b", "cafe", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.replace("check-in", "check in")
    cleaned = cleaned.replace("hold-up", "hold up")
    return cleaned


def ipa_for(text: str) -> str:
    value = eng_to_ipa.convert(clean_for_ipa(text))
    for bad, good in IPA_REPLACEMENTS.items():
        value = value.replace(bad, good)
    if "*" in value:
        raise RuntimeError(f"IPA unresolved for {text!r}: {value!r}")
    return value.strip().strip("/")


def wrap_text(text: str, max_chars: int, max_lines: int) -> str:
    text = " ".join(str(text).split())
    if len(text) <= max_chars:
        return text
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        if len(word) > max_chars:
            raise RuntimeError(f"word too long for text box: {word!r}")
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        # Use a slightly denser wrap instead of letting CapCut clip text.
        return wrap_text(text, max_chars + 8, max_lines)
    return "\n".join(lines)


def text_size(text: str) -> int:
    length = max(len(line) for line in text.splitlines())
    if length <= 22:
        return 74
    if length <= 30:
        return 66
    return 58


def build_item(row: dict[str, Any]) -> dict[str, Any]:
    english = str(row["english"]).strip()
    russian = str(row["russian"]).strip()
    ipa = ipa_for(english)
    en_main = wrap_text(english.upper(), 28, 2)
    ru_main = wrap_text(russian.upper(), 30, 2)
    ipa_text = wrap_text(ipa, 42, 2)
    return {
        "index": int(row["index"]),
        "id": row["id"],
        "block": row["block"],
        "type": row["type"],
        "english": english,
        "russian": russian,
        "ipa": ipa,
        "part1": {
            "primary_language": "english",
            "text_order": ["russian_top", "ipa_middle", "english_bottom"],
            "texts": {
                "russian_top": ru_main,
                "ipa_middle": ipa_text,
                "english_bottom": en_main,
            },
        },
        "part2": {
            "primary_language": "russian",
            "text_order": ["english_top", "ipa_middle", "russian_bottom"],
            "texts": {
                "english_top": en_main,
                "ipa_middle": ipa_text,
                "russian_bottom": ru_main,
            },
        },
        "layout": {
            "canvas": {"width": 1920, "height": 1080},
            "stable_positions": {
                "top": {"x": 960, "y": 210, "anchor": "center"},
                "middle": {"x": 960, "y": 530, "anchor": "center"},
                "bottom": {"x": 960, "y": 835, "anchor": "center"},
            },
            "styles": {
                "english_main": {
                    "font_family": "Arial Black",
                    "font_size": text_size(en_main),
                    "color": "#FFFFFF",
                    "stroke": "#121212",
                    "stroke_width": 6,
                    "shadow": {"color": "#000000", "opacity": 0.55, "blur": 10, "distance": 3},
                },
                "russian_main": {
                    "font_family": "Arial Black",
                    "font_size": text_size(ru_main),
                    "color": "#FFFFFF",
                    "stroke": "#121212",
                    "stroke_width": 6,
                    "shadow": {"color": "#000000", "opacity": 0.55, "blur": 10, "distance": 3},
                },
                "ipa": {
                    "font_family": "Arial",
                    "font_size": 38 if len(ipa_text) <= 42 else 34,
                    "italic": True,
                    "color": "#F2E2CF",
                    "stroke": "#111111",
                    "stroke_width": 3,
                    "shadow": {"color": "#000000", "opacity": 0.45, "blur": 8, "distance": 2},
                },
            },
        },
    }


def main() -> int:
    rows = load_json(ROWS_PATH)
    items = [build_item(row) for row in rows]
    OUT.mkdir(parents=True, exist_ok=True)
    write_json(MANIFEST_PATH, {"status": "ready", "row_count": len(items), "items": items})
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "index",
                "id",
                "block",
                "type",
                "english",
                "russian",
                "ipa",
                "part1_russian_top",
                "part1_ipa_middle",
                "part1_english_bottom",
                "part2_english_top",
                "part2_ipa_middle",
                "part2_russian_bottom",
            ],
        )
        writer.writeheader()
        for item in items:
            writer.writerow(
                {
                    "index": item["index"],
                    "id": item["id"],
                    "block": item["block"],
                    "type": item["type"],
                    "english": item["english"],
                    "russian": item["russian"],
                    "ipa": item["ipa"],
                    "part1_russian_top": item["part1"]["texts"]["russian_top"],
                    "part1_ipa_middle": item["part1"]["texts"]["ipa_middle"],
                    "part1_english_bottom": item["part1"]["texts"]["english_bottom"],
                    "part2_english_top": item["part2"]["texts"]["english_top"],
                    "part2_ipa_middle": item["part2"]["texts"]["ipa_middle"],
                    "part2_russian_bottom": item["part2"]["texts"]["russian_bottom"],
                }
            )
    report = {
        "status": "ready",
        "row_count": len(items),
        "ipa_unresolved": 0,
        "max_english_lines": max(item["part1"]["texts"]["english_bottom"].count("\n") + 1 for item in items),
        "max_russian_lines": max(item["part1"]["texts"]["russian_top"].count("\n") + 1 for item in items),
        "max_ipa_lines": max(item["ipa"].count("\n") + 1 for item in items),
        "layout_rule": "All rows use the same top/middle/bottom coordinates so text does not jump between phrases.",
        "part2_swap_rule": "Part 2 swaps language priority: Russian is the bottom/main prompt, English moves to top, IPA stays middle.",
    }
    write_json(REPORT_PATH, report)
    MD_PATH.write_text(
        "# Chains Unique V3 Screen Text Rules\n\n"
        "- Stable coordinates for every phrase: top x=960 y=210, middle x=960 y=530, bottom x=960 y=835.\n"
        "- Part 1: Russian top, IPA middle, English bottom.\n"
        "- Part 2: English top, IPA middle, Russian bottom.\n"
        "- English and Russian use bold white text with dark stroke and shadow.\n"
        "- IPA uses smaller warm off-white italic text.\n"
        "- Text wraps to two lines maximum; font size is reduced for longer phrases.\n",
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
