#!/usr/bin/env python3
"""Fit each two-line intro in the reused CapCut compound template.

Every intro consists of five layered text materials.  This removes uncovered
character ranges (which CapCut renders at its enormous fallback size) and uses
the same responsive type scale in all five layers of every block.
"""

from __future__ import annotations

import argparse
import copy
import datetime as dt
import json
import shutil
import sys
from collections import Counter
from pathlib import Path


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft", type=Path, required=True)
    parser.add_argument("--compound-track", type=int, default=1)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def draft_references(data: dict, segment: dict) -> dict:
    drafts = {item["id"]: item for item in data["materials"].get("drafts", []) if item.get("id")}
    entry = next((drafts[ref] for ref in segment.get("extra_material_refs", []) if ref in drafts), None)
    if entry is None or entry.get("type") != "combination" or not isinstance(entry.get("draft"), dict):
        raise RuntimeError("Compound placement is missing its editable nested draft.")
    return entry["draft"]


def repeated_intro_materials(compound: dict) -> tuple[str, list[dict]]:
    candidates: list[tuple[str, dict]] = []
    for material in compound["materials"].get("texts", []):
        try:
            text = json.loads(material.get("content", "{}")).get("text", "")
        except json.JSONDecodeError:
            continue
        if isinstance(text, str) and "\n" in text and text.strip():
            candidates.append((text, material))
    counts = Counter(text for text, _ in candidates)
    titles = [text for text, count in counts.items() if count == 5]
    if len(titles) != 1:
        raise RuntimeError(f"Expected one five-layer intro title, found {titles!r}.")
    title = titles[0]
    return title, [material for text, material in candidates if text == title]


def sizes_for(title: str) -> tuple[float, float]:
    first, second = title.split("\n", 1)
    # These preserve the template's 8/6 visual hierarchy for short titles,
    # then reduce only long lines so all text remains inside its right panel.
    first_size = round(max(3.4, min(8.0, 112.0 / len(first))), 2)
    second_size = round(max(3.1, min(6.0, 78.0 / len(second))), 2)
    return first_size, second_size


def fit_material(material: dict, title: str) -> None:
    first_line, second_line = title.split("\n", 1)
    payload = json.loads(material["content"])
    styles = payload.get("styles", [])
    if not styles:
        raise RuntimeError("Intro text material has no styles to preserve.")
    first_style = copy.deepcopy(styles[0])
    second_style = copy.deepcopy(styles[-1])
    first_size, second_size = sizes_for(title)
    first_style["range"] = [0, len(first_line)]
    first_style["size"] = first_size
    second_style["range"] = [len(first_line) + 1, len(title)]
    second_style["size"] = second_size
    payload["styles"] = [first_style, second_style]
    material["content"] = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def validate(data: dict, track: dict) -> list[str]:
    titles: list[str] = []
    for segment in track["segments"]:
        compound = draft_references(data, segment)
        title, materials = repeated_intro_materials(compound)
        first, second = title.split("\n", 1)
        expected_ranges = [[0, len(first)], [len(first) + 1, len(title)]]
        expected_sizes = list(sizes_for(title))
        for material in materials:
            styles = json.loads(material["content"])["styles"]
            if len(styles) != 2 or [style.get("range") for style in styles] != expected_ranges:
                raise RuntimeError("Intro style ranges do not cover both text lines exactly.")
            if [style.get("size") for style in styles] != expected_sizes:
                raise RuntimeError("Intro type sizes do not match the responsive scale.")
        titles.append(title)
    if len(titles) != 30 or len(set(titles)) != 30:
        raise RuntimeError("Intro uniqueness changed unexpectedly.")
    return titles


def main() -> int:
    args = parse_args()
    draft_path = args.draft.resolve()
    data = json.loads(draft_path.read_text(encoding="utf-8"))
    track = data["tracks"][args.compound_track]
    if len(track.get("segments", [])) != 30:
        raise RuntimeError("Expected 30 compound placements.")
    report: list[tuple[int, str, tuple[float, float]]] = []
    for index, segment in enumerate(track["segments"], start=1):
        compound = draft_references(data, segment)
        title, materials = repeated_intro_materials(compound)
        for material in materials:
            fit_material(material, title)
        report.append((index, title, sizes_for(title)))

    for index, title, sizes in report:
        print(f"{index:02d}: {title.replace(chr(10), ' / ')}  sizes={sizes[0]}/{sizes[1]}")
    if args.dry_run:
        return 0
    validate(data, track)
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = draft_path.with_name(f"draft_content.before_intro_type_fit_{stamp}.json")
    shutil.copy2(draft_path, backup_path)
    pending = draft_path.with_suffix(".json.intro-type-pending")
    pending.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    pending.replace(draft_path)
    print(f"written={draft_path}")
    print(f"backup={backup_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
