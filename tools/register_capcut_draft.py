from __future__ import annotations

import argparse
import json
import os
import shutil
import time
from pathlib import Path
from typing import Any


US = 1_000_000


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def same_path(left: str, right: Path) -> bool:
    return left.replace("\\", "/").rstrip("/").casefold() == right.as_posix().rstrip("/").casefold()


def folder_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())


def require_file(path: Path) -> None:
    if not path.exists() or path.stat().st_size == 0:
        raise SystemExit(f"Missing or empty required file: {path}")


def timeline_ids_from_layout(layout: dict[str, Any]) -> list[str]:
    ids: list[str] = []
    for item in layout.get("dockItems", []):
        ids.extend(str(value) for value in item.get("timelineIds", []))
    return ids


def build_root_entry(draft_dir: Path, root_dir: Path, now_us: int) -> dict[str, Any]:
    meta_path = draft_dir / "draft_meta_info.json"
    content_path = draft_dir / "draft_content.json"
    layout_path = draft_dir / "timeline_layout.json"
    biz_path = draft_dir / "draft_biz_config.json"

    for path in [meta_path, content_path, layout_path, biz_path, draft_dir / "draft_cover.jpg"]:
        require_file(path)

    meta = load_json(meta_path)
    content = load_json(content_path)
    layout = load_json(layout_path)
    biz = load_json(biz_path)

    timeline_id = str(content.get("id") or "")
    duration = int(content.get("duration") or 0)
    if not timeline_id:
        raise SystemExit("draft_content.json has no id")
    if duration <= 0:
        raise SystemExit("draft_content.json has zero duration")

    layout_ids = timeline_ids_from_layout(layout)
    if layout_ids != [timeline_id]:
        raise SystemExit(f"timeline_layout.json mismatch: expected {[timeline_id]}, got {layout_ids}")
    if timeline_id not in (biz.get("timeline_settings") or {}):
        raise SystemExit(f"draft_biz_config.json does not reference timeline id {timeline_id}")
    require_file(draft_dir / "Timelines" / timeline_id / "draft_content.json")

    resources_size = folder_size(draft_dir / "Resources")
    meta.update(
        {
            "draft_id": timeline_id,
            "draft_name": draft_dir.name,
            "draft_fold_path": draft_dir.as_posix(),
            "draft_root_path": root_dir.as_posix(),
            "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
            "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
            "draft_new_version": meta.get("draft_new_version") or "164.0.0",
            "draft_is_invisible": False,
            "streaming_edit_draft_ready": True,
            "tm_duration": duration,
            "tm_draft_modified": now_us,
            "draft_timeline_materials_size": resources_size,
            "draft_timeline_materials_size_": resources_size,
            "tm_draft_removed": 0,
        }
    )
    meta.setdefault("tm_draft_create", now_us)
    write_json(meta_path, meta)

    return {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cloud_last_action_download": False,
        "draft_cloud_purchase_info": "",
        "draft_cloud_template_id": "",
        "draft_cloud_tutorial_info": "",
        "draft_cloud_videocut_purchase_info": "",
        "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": draft_dir.as_posix(),
        "draft_id": timeline_id,
        "draft_is_ai_shorts": False,
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_is_web_article_video": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_dir.name,
        "draft_new_version": meta.get("draft_new_version") or "164.0.0",
        "draft_root_path": root_dir.as_posix(),
        "draft_timeline_materials_size": resources_size,
        "draft_type": "",
        "draft_web_article_video_enter_from": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_cloud_completed": "",
        "tm_draft_cloud_entry_id": -1,
        "tm_draft_cloud_modified": 0,
        "tm_draft_cloud_parent_entry_id": -1,
        "tm_draft_cloud_space_id": -1,
        "tm_draft_cloud_user_id": -1,
        "tm_draft_create": meta.get("tm_draft_create") or now_us,
        "tm_draft_modified": now_us,
        "tm_draft_removed": 0,
        "tm_duration": duration,
    }


def register_draft(name: str) -> dict[str, Any]:
    root_dir = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    draft_dir = root_dir / name
    if not draft_dir.exists():
        raise SystemExit(f"Draft folder does not exist: {draft_dir}")

    now_us = int(time.time() * US)
    entry = build_root_entry(draft_dir, root_dir, now_us)

    root_meta_path = root_dir / "root_meta_info.json"
    root_meta = load_json(root_meta_path) if root_meta_path.exists() else {"all_draft_store": [], "draft_ids": 0}
    backup_path = root_meta_path.with_suffix(f".json.bak_{time.strftime('%Y%m%d_%H%M%S')}")
    if root_meta_path.exists():
        shutil.copy2(root_meta_path, backup_path)

    entries = [
        item
        for item in root_meta.get("all_draft_store", [])
        if item.get("draft_name") != name
        and not same_path(str(item.get("draft_fold_path", "")), draft_dir)
        and item.get("draft_id") != entry["draft_id"]
    ]
    root_meta["all_draft_store"] = [entry, *entries]
    root_meta["draft_ids"] = max(int(root_meta.get("draft_ids", 0) or 0), len(root_meta["all_draft_store"]))
    root_meta["root_path"] = root_dir.as_posix()
    write_json(root_meta_path, root_meta)

    return verify_registration(name, root_dir)


def verify_registration(name: str, root_dir: Path | None = None) -> dict[str, Any]:
    root_dir = root_dir or Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    draft_dir = root_dir / name
    content = load_json(draft_dir / "draft_content.json")
    meta = load_json(draft_dir / "draft_meta_info.json")
    root_meta = load_json(root_dir / "root_meta_info.json")
    entries = [
        item
        for item in root_meta.get("all_draft_store", [])
        if item.get("draft_name") == name or same_path(str(item.get("draft_fold_path", "")), draft_dir)
    ]

    first = root_meta.get("all_draft_store", [{}])[0]
    report = {
        "draft_name": name,
        "draft_dir": str(draft_dir),
        "folder_exists": draft_dir.exists(),
        "root_entry_count": len(entries),
        "root_index_0_name": first.get("draft_name"),
        "root_index_0_matches": first.get("draft_name") == name,
        "draft_id": content.get("id"),
        "meta_draft_id": meta.get("draft_id"),
        "root_draft_id": entries[0].get("draft_id") if entries else None,
        "duration": content.get("duration"),
        "meta_duration": meta.get("tm_duration"),
        "root_duration": entries[0].get("tm_duration") if entries else None,
        "materials_size": folder_size(draft_dir / "Resources"),
        "root_materials_size": entries[0].get("draft_timeline_materials_size") if entries else None,
        "visible": bool(entries and not entries[0].get("draft_is_invisible") and entries[0].get("tm_draft_removed") == 0),
        "streaming_edit_draft_ready": bool(entries and entries[0].get("streaming_edit_draft_ready")),
    }
    report["ok"] = (
        report["folder_exists"]
        and report["root_entry_count"] == 1
        and report["root_index_0_matches"]
        and report["draft_id"] == report["meta_draft_id"] == report["root_draft_id"]
        and report["duration"] == report["meta_duration"] == report["root_duration"]
        and report["materials_size"] == report["root_materials_size"]
        and report["visible"]
        and report["streaming_edit_draft_ready"]
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Register and verify a native CapCut draft card.")
    parser.add_argument("draft_name")
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()

    report = verify_registration(args.draft_name) if args.verify_only else register_draft(args.draft_name)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
