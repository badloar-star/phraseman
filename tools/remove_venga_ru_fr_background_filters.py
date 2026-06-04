#!/usr/bin/env python3
"""Remove filter/LUT/effect refs from the 200 background video fragments only."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any


PROJECT = "VENGA A1 200 RU FR VSSCP BUBBLEBLUR SAFEWRAP"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def capcut_is_open() -> bool:
    completed = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "Get-Process | Where-Object { $_.ProcessName -match 'CapCut' } | Select-Object -First 1 -ExpandProperty Id",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    return bool(completed.stdout.strip())


def content_paths(root: Path) -> list[Path]:
    paths = [root / "draft_content.json"]
    for rel in ["template-2.tmp", "draft_content.json.bak"]:
        path = root / rel
        if path.exists():
            paths.append(path)
    paths.extend((root / "Timelines").rglob("draft_content.json"))
    unique: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        key = str(path.resolve()).casefold()
        if path.exists() and key not in seen:
            unique.append(path)
            seen.add(key)
    return unique


def backup_paths(paths: list[Path]) -> Path:
    backup_root = (
        Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/backups")
        / f"{time.strftime('%Y-%m-%d-%H-%M-%S')}-before-remove-background-filters"
    )
    backup_root.mkdir(parents=True, exist_ok=True)
    for index, path in enumerate(paths, start=1):
        shutil.copy2(path, backup_root / f"{index:02d}_{path.name}")
    return backup_root


def effect_ref_ids(draft: dict[str, Any]) -> set[str]:
    ids: set[str] = set()
    for item in draft.get("materials", {}).get("effects", []):
        if item.get("id") and str(item.get("type", "")).casefold() in {"filter", "lut", "video_effect"}:
            ids.add(item["id"])
    for item in draft.get("materials", {}).get("video_effects", []):
        if item.get("id"):
            ids.add(item["id"])
    return ids


def remove_background_filters(path: Path) -> dict[str, Any]:
    draft = load_json(path)
    ids = effect_ref_ids(draft)
    touched = 0
    removed_refs = 0
    bg_track = draft["tracks"][0]
    for segment in bg_track.get("segments", []):
        refs = segment.get("extra_material_refs")
        if isinstance(refs, list):
            new_refs = [ref for ref in refs if ref not in ids]
            if len(new_refs) != len(refs):
                touched += 1
                removed_refs += len(refs) - len(new_refs)
                segment["extra_material_refs"] = new_refs
        for flag in [
            "enable_lut",
            "enable_adjust",
            "enable_hsl",
            "enable_color_curves",
            "enable_hsl_curves",
            "enable_color_wheels",
            "enable_smart_color_adjust",
            "enable_color_match_adjust",
            "enable_color_correct_adjust",
            "enable_color_adjust_pro",
        ]:
            if flag in segment:
                segment[flag] = False
    write_json(path, draft)
    return {"path": str(path), "effect_ids": sorted(ids), "touched_bg_segments": touched, "removed_refs": removed_refs}


def verify(path: Path) -> dict[str, Any]:
    draft = load_json(path)
    ids = effect_ref_ids(draft)
    refs: list[dict[str, Any]] = []
    for index, segment in enumerate(draft["tracks"][0].get("segments", []), start=1):
        found = sorted(set(segment.get("extra_material_refs", [])) & ids)
        enabled_flags = [
            flag
            for flag in [
                "enable_lut",
                "enable_adjust",
                "enable_hsl",
                "enable_color_curves",
                "enable_hsl_curves",
                "enable_color_wheels",
                "enable_smart_color_adjust",
                "enable_color_match_adjust",
                "enable_color_correct_adjust",
                "enable_color_adjust_pro",
            ]
            if segment.get(flag) is True
        ]
        if found or enabled_flags:
            refs.append({"segment": index, "refs": found, "enabled_flags": enabled_flags})
    return {"path": str(path), "dirty_bg_segment_count": len(refs), "dirty_sample": refs[:10]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default=PROJECT)
    parser.add_argument("--allow-open-capcut", action="store_true")
    args = parser.parse_args()

    root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / args.project
    if not root.exists():
        raise RuntimeError(f"Draft not found: {root}")
    if not args.allow_open_capcut and capcut_is_open():
        raise RuntimeError("CapCut is open. Close CapCut before editing draft JSON.")
    if not args.allow_open_capcut and (root / ".locked").exists():
        raise RuntimeError(f"Draft is locked: {root}")

    paths = content_paths(root)
    backup = backup_paths(paths)
    patches = [remove_background_filters(path) for path in paths]
    verifications = [verify(path) for path in paths]
    dirty_total = sum(item["dirty_bg_segment_count"] for item in verifications)
    report = {"project": args.project, "backup": str(backup), "patches": patches, "verifications": verifications, "dirty_total": dirty_total}
    report_path = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/remove_background_filters_report.json")
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if dirty_total:
        raise RuntimeError(f"Background filter verification failed: dirty={dirty_total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
