#!/usr/bin/env python3
"""Clone the latest user-edited RU->FR CapCut draft and patch only breakdown wrapping."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any

from fix_venga_ru_fr_breakdown_safewrap import (
    MAX_VISUAL_WIDTH,
    capcut_text,
    patch_draft,
    verify_draft,
    visual_width,
)


SOURCE = "VENGA A1 200 RU FR VSSCP BUBBLEBLUR SAFEWRAP"
TARGET = "VENGA A1 200 RU FR VSSCP BUBBLEBLUR SAFEWRAP USER OBJECTS FIX"
US = 1_000_000


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


def folder_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())


def replace_strings(value: Any, replacements: list[tuple[str, str]]) -> Any:
    if isinstance(value, str):
        for old, new in replacements:
            value = value.replace(old, new)
        return value
    if isinstance(value, list):
        return [replace_strings(item, replacements) for item in value]
    if isinstance(value, dict):
        return {key: replace_strings(item, replacements) for key, item in value.items()}
    return value


def rewrite_json_files(target_dir: Path, replacements: list[tuple[str, str]]) -> None:
    for path in target_dir.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".json", ".tmp"}:
            continue
        try:
            data = load_json(path)
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
        write_json(path, replace_strings(data, replacements))


def content_paths(root: Path, timeline_id: str) -> list[Path]:
    paths = [root / "draft_content.json"]
    for rel in ["template-2.tmp", "draft_content.json.bak"]:
        path = root / rel
        if path.exists():
            paths.append(path)
    timeline_path = root / "Timelines" / timeline_id / "draft_content.json"
    if timeline_path.exists():
        paths.append(timeline_path)
    return paths


def text_track_counts(path: Path) -> dict[str, int]:
    draft = load_json(path)
    return {
        str(index): len(track.get("segments", []))
        for index, track in enumerate(draft.get("tracks", []))
        if track.get("type") == "text"
    }


def collect_missing_paths(value: Any) -> list[str]:
    missing: list[str] = []

    def walk(item: Any) -> None:
        if isinstance(item, dict):
            for child in item.values():
                walk(child)
        elif isinstance(item, list):
            for child in item:
                walk(child)
        elif isinstance(item, str):
            lowered = item.lower()
            if (
                (":/" in item or ":\\" in item)
                and any(lowered.endswith(ext) for ext in [".mp4", ".mov", ".mp3", ".wav", ".png", ".jpg", ".jpeg", ".webp"])
            ):
                if not Path(item.replace("/", "\\")).exists():
                    missing.append(item)

    walk(value)
    return sorted(set(missing))


def root_entry_from_meta(target_dir: Path, root_dir: Path, project_id: str, now_us: int) -> dict[str, Any]:
    meta = load_json(target_dir / "draft_meta_info.json")
    content = load_json(target_dir / "draft_content.json")
    size = folder_size(target_dir / "Resources")
    return {
        "cloud_draft_cover": bool(meta.get("cloud_draft_cover", False)),
        "cloud_draft_sync": bool(meta.get("cloud_draft_sync", False)),
        "draft_cloud_last_action_download": False,
        "draft_cloud_purchase_info": "",
        "draft_cloud_template_id": "",
        "draft_cloud_tutorial_info": "",
        "draft_cloud_videocut_purchase_info": "",
        "draft_cover": (target_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": target_dir.as_posix(),
        "draft_id": project_id,
        "draft_is_ai_shorts": False,
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_is_web_article_video": False,
        "draft_json_file": (target_dir / "draft_content.json").as_posix(),
        "draft_name": target_dir.name,
        "draft_new_version": meta.get("draft_new_version") or "164.0.0",
        "draft_root_path": root_dir.as_posix(),
        "draft_timeline_materials_size": size,
        "draft_type": "",
        "draft_web_article_video_enter_from": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_cloud_completed": "",
        "tm_draft_cloud_entry_id": -1,
        "tm_draft_cloud_modified": 0,
        "tm_draft_cloud_parent_entry_id": -1,
        "tm_draft_cloud_space_id": -1,
        "tm_draft_cloud_user_id": -1,
        "tm_draft_create": now_us,
        "tm_draft_modified": now_us,
        "tm_draft_removed": 0,
        "tm_duration": int(content.get("duration") or 0),
    }


def verify_clone(root_dir: Path, source: str, target: str, project_id: str, timeline_id: str) -> dict[str, Any]:
    source_dir = root_dir / source
    target_dir = root_dir / target
    content = load_json(target_dir / "draft_content.json")
    meta = load_json(target_dir / "draft_meta_info.json")
    layout = load_json(target_dir / "timeline_layout.json")
    biz = load_json(target_dir / "draft_biz_config.json")
    root_meta = load_json(root_dir / "root_meta_info.json")
    entries = [item for item in root_meta.get("all_draft_store", []) if item.get("draft_name") == target]
    source_entries = [item for item in root_meta.get("all_draft_store", []) if item.get("draft_name") == source]
    layout_ids = [
        timeline
        for item in layout.get("dockItems", [])
        for timeline in item.get("timelineIds", [])
    ]
    draft = load_json(target_dir / "draft_content.json")
    texts = {item["id"]: item for item in draft["materials"]["texts"]}
    max_line_width = 0.0
    for segment in draft["tracks"][9]["segments"]:
        text = capcut_text(texts[segment["material_id"]])
        for line in text.splitlines():
            max_line_width = max(max_line_width, visual_width(line))
    missing = collect_missing_paths(draft)
    return {
        "target_exists": target_dir.exists(),
        "source_still_exists": source_dir.exists(),
        "source_root_entry_count": len(source_entries),
        "target_root_entry_count": len(entries),
        "project_id_ok": bool(entries and entries[0].get("draft_id") == project_id and meta.get("draft_id") == project_id),
        "timeline_id_ok": content.get("id") == timeline_id,
        "timeline_layout_ok": layout_ids == [timeline_id],
        "biz_config_ok": timeline_id in (biz.get("timeline_settings") or {}),
        "timeline_file_ok": (target_dir / "Timelines" / timeline_id / "draft_content.json").exists(),
        "text_track_counts_source": text_track_counts(source_dir / "draft_content.json"),
        "text_track_counts_target": text_track_counts(target_dir / "draft_content.json"),
        "missing_paths": len(missing),
        "missing_path_sample": missing[:10],
        "max_breakdown_line_visual_width": round(max_line_width, 2),
        "max_allowed_visual_width": MAX_VISUAL_WIDTH + 2,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default=SOURCE)
    parser.add_argument("--target", default=TARGET)
    parser.add_argument("--replace", action="store_true")
    parser.add_argument("--allow-open-capcut", action="store_true")
    args = parser.parse_args()

    if not args.allow_open_capcut and capcut_is_open():
        raise RuntimeError("CapCut is open. Close CapCut before cloning/registering drafts.")

    root_dir = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    source_dir = root_dir / args.source
    target_dir = root_dir / args.target
    if not source_dir.exists():
        raise RuntimeError(f"Source draft not found: {source_dir}")
    if (source_dir / ".locked").exists() and not args.allow_open_capcut:
        raise RuntimeError(f"Source draft is locked: {source_dir}")
    if target_dir.exists():
        if not args.replace:
            raise RuntimeError(f"Target already exists: {target_dir}")
        shutil.rmtree(target_dir)

    content = load_json(source_dir / "draft_content.json")
    old_timeline_id = str(content.get("id") or "")
    if not old_timeline_id:
        raise RuntimeError("Source draft_content.json has no id")

    project_id = str(uuid.uuid4()).upper()
    timeline_id = str(uuid.uuid4()).upper()
    now_us = int(time.time() * US)

    shutil.copytree(source_dir, target_dir, ignore=shutil.ignore_patterns(".locked"))
    old_timeline_dir = target_dir / "Timelines" / old_timeline_id
    new_timeline_dir = target_dir / "Timelines" / timeline_id
    if old_timeline_dir.exists():
        old_timeline_dir.rename(new_timeline_dir)

    replacements = [
        (args.source, args.target),
        (source_dir.as_posix(), target_dir.as_posix()),
        (str(source_dir), str(target_dir)),
        (old_timeline_id, timeline_id),
    ]
    rewrite_json_files(target_dir, replacements)

    for path in content_paths(target_dir, timeline_id):
        draft = load_json(path)
        draft["id"] = timeline_id
        draft["name"] = args.target
        draft["path"] = target_dir.as_posix()
        draft["update_time"] = now_us
        write_json(path, draft)

    meta_path = target_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
    meta.update(
        {
            "draft_id": project_id,
            "draft_name": args.target,
            "draft_fold_path": target_dir.as_posix(),
            "draft_root_path": root_dir.as_posix(),
            "draft_json_file": (target_dir / "draft_content.json").as_posix(),
            "draft_cover": (target_dir / "draft_cover.jpg").as_posix(),
            "draft_is_invisible": False,
            "streaming_edit_draft_ready": True,
            "tm_draft_create": now_us,
            "tm_draft_modified": now_us,
            "tm_draft_removed": 0,
        }
    )
    write_json(meta_path, meta)

    patches = [patch_draft(path) for path in content_paths(target_dir, timeline_id)]
    verifications = [verify_draft(path) for path in content_paths(target_dir, timeline_id)]
    risky_total = sum(item["risky_line_count"] for item in verifications)
    unstable_total = sum(item["unstable_wrap_count"] for item in verifications)

    root_meta_path = root_dir / "root_meta_info.json"
    root_meta_backup = root_meta_path.with_suffix(f".json.bak_{time.strftime('%Y%m%d_%H%M%S')}")
    shutil.copy2(root_meta_path, root_meta_backup)
    root_meta = load_json(root_meta_path)
    entry = root_entry_from_meta(target_dir, root_dir, project_id, now_us)
    entries = [
        item
        for item in root_meta.get("all_draft_store", [])
        if item.get("draft_name") != args.target
        and str(item.get("draft_fold_path", "")).replace("\\", "/").rstrip("/").casefold()
        != target_dir.as_posix().rstrip("/").casefold()
        and item.get("draft_id") != project_id
    ]
    root_meta["all_draft_store"] = [entry, *entries]
    root_meta["draft_ids"] = max(int(root_meta.get("draft_ids", 0) or 0), len(root_meta["all_draft_store"]))
    root_meta["root_path"] = root_dir.as_posix()
    write_json(root_meta_path, root_meta)

    clone_check = verify_clone(root_dir, args.source, args.target, project_id, timeline_id)
    report = {
        "source": args.source,
        "target": args.target,
        "source_dir": str(source_dir),
        "target_dir": str(target_dir),
        "project_id": project_id,
        "timeline_id": timeline_id,
        "root_meta_backup": str(root_meta_backup),
        "patches": patches,
        "verifications": verifications,
        "risky_total": risky_total,
        "unstable_total": unstable_total,
        "clone_check": clone_check,
    }
    report_path = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/clone_latest_user_objects_safewrap_report.json")
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))

    required_ok = [
        clone_check["target_exists"],
        clone_check["source_still_exists"],
        clone_check["source_root_entry_count"] >= 1,
        clone_check["target_root_entry_count"] == 1,
        clone_check["project_id_ok"],
        clone_check["timeline_id_ok"],
        clone_check["timeline_layout_ok"],
        clone_check["biz_config_ok"],
        clone_check["timeline_file_ok"],
        clone_check["missing_paths"] == 0,
        risky_total == 0,
        unstable_total == 0,
    ]
    if not all(required_ok):
        raise RuntimeError("Clone verification failed; see report.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
