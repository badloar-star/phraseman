#!/usr/bin/env python3
"""Patch the edited RU->FR CapCut draft: remove video Blur effects and safe-wrap breakdown text."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any

from fix_venga_ru_fr_breakdown_safewrap import (
    PROJECT,
    capcut_text,
    patch_draft,
    verify_draft,
    visual_width,
)


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
        / f"{time.strftime('%Y-%m-%d-%H-%M-%S')}-before-blur-remove-and-safewrap"
    )
    backup_root.mkdir(parents=True, exist_ok=True)
    for index, path in enumerate(paths, start=1):
        shutil.copy2(path, backup_root / f"{index:02d}_{path.name}")
    return backup_root


def remove_video_blur(path: Path) -> dict[str, Any]:
    draft = load_json(path)
    video_effects = draft.get("materials", {}).get("video_effects", [])
    blur_ids = {
        item.get("id")
        for item in video_effects
        if str(item.get("name", "")).strip().casefold() == "blur"
        and str(item.get("type", "")).strip().casefold() == "video_effect"
    }
    blur_ids.discard(None)
    removed_materials = sum(1 for item in video_effects if item.get("id") in blur_ids)
    draft["materials"]["video_effects"] = [item for item in video_effects if item.get("id") not in blur_ids]

    touched_segments = 0
    removed_refs = 0
    for track_index, track in enumerate(draft.get("tracks", [])):
        if track.get("type") != "video":
            continue
        for segment in track.get("segments", []):
            refs = segment.get("extra_material_refs")
            if not isinstance(refs, list):
                continue
            new_refs = [ref for ref in refs if ref not in blur_ids]
            if len(new_refs) != len(refs):
                touched_segments += 1
                removed_refs += len(refs) - len(new_refs)
                segment["extra_material_refs"] = new_refs
    write_json(path, draft)
    return {
        "path": str(path),
        "blur_ids": sorted(blur_ids),
        "removed_materials": removed_materials,
        "touched_video_segments": touched_segments,
        "removed_refs": removed_refs,
    }


def verify_blur_removed(path: Path) -> dict[str, Any]:
    draft = load_json(path)
    video_effects = draft.get("materials", {}).get("video_effects", [])
    blur_ids = {
        item.get("id")
        for item in video_effects
        if "blur" in str(item.get("name", "")).casefold()
    }
    blur_ids.discard(None)
    refs: list[dict[str, Any]] = []
    for track_index, track in enumerate(draft.get("tracks", [])):
        if track.get("type") != "video":
            continue
        for segment_index, segment in enumerate(track.get("segments", []), start=1):
            found = sorted(set(segment.get("extra_material_refs", [])) & blur_ids)
            if found:
                refs.append({"track": track_index, "segment": segment_index, "refs": found})
    transition_blur_count = sum(
        1
        for item in draft.get("materials", {}).get("transitions", [])
        if str(item.get("name", "")).casefold() == "bubble blur"
    )
    return {
        "path": str(path),
        "video_blur_material_count": len(blur_ids),
        "video_blur_ref_count": len(refs),
        "video_blur_ref_sample": refs[:10],
        "bubble_blur_transition_count": transition_blur_count,
    }


def max_breakdown_width(path: Path) -> float:
    draft = load_json(path)
    texts = {item["id"]: item for item in draft["materials"]["texts"]}
    max_width = 0.0
    for segment in draft["tracks"][9]["segments"]:
        text = capcut_text(texts[segment["material_id"]])
        for line in text.splitlines():
            max_width = max(max_width, visual_width(line))
    return max_width


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
    blur_patches = [remove_video_blur(path) for path in paths]
    wrap_patches = [patch_draft(path) for path in paths]
    wrap_verifications = [verify_draft(path) for path in paths]
    blur_verifications = [verify_blur_removed(path) for path in paths]
    risky_total = sum(item["risky_line_count"] for item in wrap_verifications)
    unstable_total = sum(item["unstable_wrap_count"] for item in wrap_verifications)
    blur_material_total = sum(item["video_blur_material_count"] for item in blur_verifications)
    blur_ref_total = sum(item["video_blur_ref_count"] for item in blur_verifications)
    report = {
        "project": args.project,
        "draft_dir": str(root),
        "backup": str(backup),
        "blur_patches": blur_patches,
        "wrap_patches": wrap_patches,
        "wrap_verifications": wrap_verifications,
        "blur_verifications": blur_verifications,
        "risky_total": risky_total,
        "unstable_total": unstable_total,
        "blur_material_total": blur_material_total,
        "blur_ref_total": blur_ref_total,
        "max_breakdown_line_visual_width": round(max(max_breakdown_width(path) for path in paths), 2),
    }
    report_path = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/blur_remove_and_safewrap_report.json")
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if risky_total or unstable_total or blur_material_total or blur_ref_total:
        raise RuntimeError(
            "Verification failed: "
            f"risky={risky_total}, unstable={unstable_total}, blur_material={blur_material_total}, blur_ref={blur_ref_total}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
