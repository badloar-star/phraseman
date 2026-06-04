from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any


CAPCUT_DRAFTS_DIR = (
    Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    / "CapCut"
    / "User Data"
    / "Projects"
    / "com.lveditor.draft"
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def resolve_draft_dir(name_or_path: str) -> Path:
    path = Path(name_or_path)
    if path.exists():
        return path
    candidate = CAPCUT_DRAFTS_DIR / name_or_path
    if candidate.exists():
        return candidate
    lowered = name_or_path.casefold()
    for child in CAPCUT_DRAFTS_DIR.iterdir():
        if child.is_dir() and child.name.casefold() == lowered:
            return child
    raise FileNotFoundError(f"CapCut draft was not found: {name_or_path}")


def draft_id_for_folder(draft_dir: Path) -> str:
    meta_path = draft_dir / "draft_meta_info.json"
    if meta_path.exists():
        meta = load_json(meta_path)
        draft_id = str(meta.get("draft_id", "")).strip()
        if draft_id:
            return draft_id
    content_path = draft_dir / "draft_content.json"
    content = load_json(content_path)
    draft_id = str(content.get("id", "")).strip()
    if not draft_id:
        raise ValueError(f"Draft has no id: {draft_dir}")
    return draft_id


def duration_for_folder(draft_dir: Path) -> int:
    for path, key in ((draft_dir / "draft_meta_info.json", "tm_duration"), (draft_dir / "draft_content.json", "duration")):
        if path.exists():
            value = load_json(path).get(key)
            if isinstance(value, (int, float)):
                return int(value)
    return 0


def materials_size_for_folder(draft_dir: Path) -> int:
    meta_path = draft_dir / "draft_meta_info.json"
    if meta_path.exists():
        meta = load_json(meta_path)
        for key in ("draft_timeline_materials_size_", "draft_timeline_materials_size"):
            value = meta.get(key)
            if isinstance(value, (int, float)):
                return int(value)
    total = 0
    resources = draft_dir / "Resources"
    if resources.exists():
        for path in resources.rglob("*"):
            if path.is_file():
                total += path.stat().st_size
    return total


def register_draft(draft_dir: Path) -> dict[str, Any]:
    root_meta_path = CAPCUT_DRAFTS_DIR / "root_meta_info.json"
    root_meta = load_json(root_meta_path) if root_meta_path.exists() else {}
    entries = list(root_meta.get("all_draft_store", []))
    draft_id = draft_id_for_folder(draft_dir)
    draft_name = draft_dir.name
    draft_path = draft_dir.as_posix()
    now_us = int(time.time() * 1_000_000)
    existing = next(
        (
            entry
            for entry in entries
            if entry.get("draft_name") == draft_name or Path(str(entry.get("draft_fold_path", ""))).as_posix() == draft_path
        ),
        {},
    )
    entries = [
        entry
        for entry in entries
        if entry.get("draft_name") != draft_name and Path(str(entry.get("draft_fold_path", ""))).as_posix() != draft_path
    ]
    entry = {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cloud_last_action_download": False,
        "draft_cloud_purchase_info": "",
        "draft_cloud_template_id": "",
        "draft_cloud_tutorial_info": "",
        "draft_cloud_videocut_purchase_info": "",
        "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": draft_path,
        "draft_id": draft_id,
        "draft_is_ai_shorts": False,
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_is_web_article_video": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_name,
        "draft_new_version": existing.get("draft_new_version", "164.0.0"),
        "draft_root_path": CAPCUT_DRAFTS_DIR.as_posix(),
        "draft_timeline_materials_size": materials_size_for_folder(draft_dir),
        "draft_type": "",
        "draft_web_article_video_enter_from": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_cloud_completed": "",
        "tm_draft_cloud_entry_id": -1,
        "tm_draft_cloud_modified": 0,
        "tm_draft_cloud_parent_entry_id": -1,
        "tm_draft_cloud_space_id": -1,
        "tm_draft_cloud_user_id": -1,
        "tm_draft_create": existing.get("tm_draft_create", now_us),
        "tm_draft_modified": now_us,
        "tm_draft_removed": 0,
        "tm_duration": duration_for_folder(draft_dir),
    }
    entries.insert(0, entry)
    entries[1:] = sorted(entries[1:], key=lambda item: int(item.get("tm_draft_modified") or 0), reverse=True)
    root_meta["all_draft_store"] = entries
    root_meta["draft_ids"] = max(int(root_meta.get("draft_ids", 0) or 0), len(entries))
    root_meta["root_path"] = CAPCUT_DRAFTS_DIR.as_posix()
    write_json(root_meta_path, root_meta)
    return entry


def main() -> None:
    parser = argparse.ArgumentParser(description="Register an existing CapCut draft folder in root_meta_info.json.")
    parser.add_argument("--draft", required=True)
    args = parser.parse_args()
    entry = register_draft(resolve_draft_dir(args.draft))
    print(entry["draft_name"])
    print(entry["draft_id"])


if __name__ == "__main__":
    main()
