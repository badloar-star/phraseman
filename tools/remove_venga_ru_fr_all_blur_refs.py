#!/usr/bin/env python3
"""Remove every blur-named CapCut effect/transition reference from RU->FR video fragments."""

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
        / f"{time.strftime('%Y-%m-%d-%H-%M-%S')}-before-remove-all-blur-refs"
    )
    backup_root.mkdir(parents=True, exist_ok=True)
    for index, path in enumerate(paths, start=1):
        shutil.copy2(path, backup_root / f"{index:02d}_{path.name}")
    return backup_root


def blur_material_ids(draft: dict[str, Any]) -> set[str]:
    ids: set[str] = set()
    for key, items in draft.get("materials", {}).items():
        if not isinstance(items, list):
            continue
        for item in items:
            name = str(item.get("name", "")).casefold()
            material_type = str(item.get("type", "")).casefold()
            if "blur" in name or "blur" in material_type:
                item_id = item.get("id")
                if item_id:
                    ids.add(item_id)
    return ids


def remove_blur_refs(path: Path) -> dict[str, Any]:
    draft = load_json(path)
    ids = blur_material_ids(draft)
    removed_materials: dict[str, int] = {}
    for key, items in draft.get("materials", {}).items():
        if not isinstance(items, list):
            continue
        old_len = len(items)
        draft["materials"][key] = [item for item in items if item.get("id") not in ids]
        removed = old_len - len(draft["materials"][key])
        if removed:
            removed_materials[key] = removed

    touched_segments = 0
    removed_refs = 0
    for track in draft.get("tracks", []):
        if track.get("type") != "video":
            continue
        for segment in track.get("segments", []):
            refs = segment.get("extra_material_refs")
            if not isinstance(refs, list):
                continue
            new_refs = [ref for ref in refs if ref not in ids]
            if len(new_refs) != len(refs):
                touched_segments += 1
                removed_refs += len(refs) - len(new_refs)
                segment["extra_material_refs"] = new_refs
    write_json(path, draft)
    return {
        "path": str(path),
        "removed_ids": sorted(ids),
        "removed_materials": removed_materials,
        "touched_video_segments": touched_segments,
        "removed_refs": removed_refs,
    }


def verify_no_blur_refs(path: Path) -> dict[str, Any]:
    draft = load_json(path)
    ids = blur_material_ids(draft)
    refs: list[dict[str, Any]] = []
    for track_index, track in enumerate(draft.get("tracks", [])):
        if track.get("type") != "video":
            continue
        for segment_index, segment in enumerate(track.get("segments", []), start=1):
            found = sorted(set(segment.get("extra_material_refs", [])) & ids)
            if found:
                refs.append({"track": track_index, "segment": segment_index, "refs": found})
    return {
        "path": str(path),
        "blur_named_material_count": len(ids),
        "blur_ref_count": len(refs),
        "blur_ref_sample": refs[:10],
    }


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
    patches = [remove_blur_refs(path) for path in paths]
    verifications = [verify_no_blur_refs(path) for path in paths]
    blur_material_total = sum(item["blur_named_material_count"] for item in verifications)
    blur_ref_total = sum(item["blur_ref_count"] for item in verifications)
    report = {
        "project": args.project,
        "backup": str(backup),
        "patches": patches,
        "verifications": verifications,
        "blur_material_total": blur_material_total,
        "blur_ref_total": blur_ref_total,
    }
    report_path = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/remove_all_blur_refs_report.json")
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if blur_material_total or blur_ref_total:
        raise RuntimeError(f"Blur verification failed: materials={blur_material_total}, refs={blur_ref_total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
