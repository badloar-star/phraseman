#!/usr/bin/env python3
"""Replace all 200 RU->FR background videos with sharper semantic-open renders."""

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
OPEN_REPORT = Path("exports/venga-phrase-packs/semantic-open-backgrounds/semantic_background_report.json")
TARGET_SUBDIR = "venga_semantic_noblur_open_bg"


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
        / f"{time.strftime('%Y-%m-%d-%H-%M-%S')}-before-replace-bg-with-open-sharp"
    )
    backup_root.mkdir(parents=True, exist_ok=True)
    for index, path in enumerate(paths, start=1):
        shutil.copy2(path, backup_root / f"{index:02d}_{path.name}")
    return backup_root


def open_rows() -> list[dict[str, Any]]:
    report = load_json(OPEN_REPORT)
    for key in ["rows", "report_rows", "backgrounds"]:
        rows = report.get(key)
        if isinstance(rows, list) and rows:
            return rows
    for value in report.values():
        if isinstance(value, list) and value and isinstance(value[0], dict):
            return value
    raise RuntimeError(f"No rows found in {OPEN_REPORT}")


def prepare_assets(root: Path) -> list[Path]:
    rows = open_rows()[:200]
    if len(rows) != 200:
        raise RuntimeError(f"Expected 200 open background rows, got {len(rows)}")
    out_dir = root / "Resources" / TARGET_SUBDIR
    out_dir.mkdir(parents=True, exist_ok=True)
    assets: list[Path] = []
    for index, row in enumerate(rows, start=1):
        source = Path(str(row.get("rendered_path") or row.get("output_path") or row.get("path") or ""))
        if not source.exists():
            raise RuntimeError(f"Missing open background {index}: {source}")
        target = out_dir / f"{index:03d}_{source.name}"
        if not target.exists() or target.stat().st_size != source.stat().st_size:
            shutil.copy2(source, target)
        assets.append(target)
    return assets


def patch_content(path: Path, assets: list[Path]) -> dict[str, Any]:
    draft = load_json(path)
    videos = {item["id"]: item for item in draft["materials"]["videos"]}
    changed = 0
    for index, segment in enumerate(draft["tracks"][0]["segments"], start=1):
        material = videos[segment["material_id"]]
        new_path = str(assets[index - 1])
        if material.get("path") != new_path:
            material["path"] = new_path
            changed += 1
        # Keep the background raw: no effects/transitions/filters.
        segment["extra_material_refs"] = [
            ref
            for ref in segment.get("extra_material_refs", [])
            if ref not in {item.get("id") for item in draft.get("materials", {}).get("effects", [])}
            and ref not in {item.get("id") for item in draft.get("materials", {}).get("transitions", [])}
            and ref not in {item.get("id") for item in draft.get("materials", {}).get("video_effects", [])}
        ]
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
    return {"path": str(path), "changed_bg_material_paths": changed}


def verify(path: Path, assets: list[Path]) -> dict[str, Any]:
    draft = load_json(path)
    videos = {item["id"]: item for item in draft["materials"]["videos"]}
    wrong_paths: list[dict[str, Any]] = []
    effect_ids = {
        item.get("id")
        for key in ["effects", "transitions", "video_effects"]
        for item in draft.get("materials", {}).get(key, [])
    }
    dirty_refs: list[dict[str, Any]] = []
    for index, segment in enumerate(draft["tracks"][0]["segments"], start=1):
        path_value = Path(str(videos[segment["material_id"]].get("path", "")))
        if path_value.resolve() != assets[index - 1].resolve():
            wrong_paths.append({"index": index, "path": str(path_value), "expected": str(assets[index - 1])})
        refs = sorted(set(segment.get("extra_material_refs", [])) & effect_ids)
        if refs:
            dirty_refs.append({"index": index, "refs": refs})
    return {
        "path": str(path),
        "wrong_path_count": len(wrong_paths),
        "wrong_path_sample": wrong_paths[:5],
        "dirty_ref_count": len(dirty_refs),
        "dirty_ref_sample": dirty_refs[:5],
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
    assets = prepare_assets(root)
    patches = [patch_content(path, assets) for path in paths]
    verifications = [verify(path, assets) for path in paths]
    wrong_total = sum(item["wrong_path_count"] for item in verifications)
    dirty_total = sum(item["dirty_ref_count"] for item in verifications)
    report = {
        "project": args.project,
        "backup": str(backup),
        "asset_dir": str(root / "Resources" / TARGET_SUBDIR),
        "asset_count": len(assets),
        "patches": patches,
        "verifications": verifications,
        "wrong_total": wrong_total,
        "dirty_total": dirty_total,
    }
    report_path = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/replace_backgrounds_with_open_sharp_report.json")
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if wrong_total or dirty_total:
        raise RuntimeError(f"Background replacement failed: wrong={wrong_total}, dirty={dirty_total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
