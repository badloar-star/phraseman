#!/usr/bin/env python3
"""Audit why the generated Chains 800 CapCut draft does not open."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any


BROKEN_NAME = "CHAINS_800_READY_DIRECT_BG 20260603_181307"
SOURCE_NAME = "CHAINS_EP01_EN_OPENAI_DIRECT_BG 20260601_214833"
OUT = Path("exports/chains/phrase_packs/chains_800_20260603/capcut_repair")


def root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def safe_json(path: Path) -> tuple[bool, Any]:
    try:
        return True, read_json(path)
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


def backup_project(project: Path) -> Path:
    backup = Path(".codex-tmp/capcut-backups") / f"{project.name}.backup-before-open-repair-{time.strftime('%Y%m%d_%H%M%S')}"
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(project, backup)
    return backup


def ffprobe(path: Path) -> bool:
    result = subprocess.run(["ffprobe", "-v", "error", str(path)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return result.returncode == 0


def all_paths(node: Any) -> list[str]:
    out: list[str] = []
    if isinstance(node, dict):
        for key, value in node.items():
            if "path" in str(key).lower() and isinstance(value, str) and value:
                out.append(value)
            else:
                out.extend(all_paths(value))
    elif isinstance(node, list):
        for item in node:
            out.extend(all_paths(item))
    return out


def timeline_ids_from_layout(layout: Any) -> list[str]:
    ids: list[str] = []
    if isinstance(layout, dict):
        for key in ("timelineIds", "timeline_ids", "timeline_id"):
            value = layout.get(key)
            if isinstance(value, list):
                ids.extend(map(str, value))
            elif isinstance(value, str):
                ids.append(value)
        for value in layout.values():
            ids.extend(timeline_ids_from_layout(value))
    elif isinstance(layout, list):
        for item in layout:
            ids.extend(timeline_ids_from_layout(item))
    return sorted(set(ids))


def biz_timeline_ids(biz: Any) -> list[str]:
    ids: list[str] = []
    if isinstance(biz, dict):
        for key, value in biz.items():
            if isinstance(key, str) and len(key) > 20 and "-" in key:
                ids.append(key)
            ids.extend(biz_timeline_ids(value))
    elif isinstance(biz, list):
        for item in biz:
            ids.extend(biz_timeline_ids(item))
    return sorted(set(ids))


def summarize(project: Path) -> dict[str, Any]:
    summary: dict[str, Any] = {"path": str(project), "exists": project.exists()}
    if not project.exists():
        return summary
    files = ["draft_content.json", "template-2.tmp", "draft_meta_info.json", "draft_biz_config.json", "timeline_layout.json", "Timelines/project.json"]
    summary["files"] = {}
    for name in files:
        path = project / name
        ok, parsed = safe_json(path) if path.exists() else (False, "missing")
        summary["files"][name] = {"exists": path.exists(), "size": path.stat().st_size if path.exists() else 0, "json_ok": ok, "error": None if ok else parsed}
    ok, content = safe_json(project / "draft_content.json")
    if ok:
        tid = str(content.get("id"))
        summary["draft_content_id"] = tid
        summary["duration"] = content.get("duration")
        summary["tracks"] = [{"index": i, "type": t.get("type"), "name": t.get("name"), "segments": len(t.get("segments", []))} for i, t in enumerate(content.get("tracks", []))]
        summary["timeline_mirror_exists"] = (project / "Timelines" / tid / "draft_content.json").exists()
        summary["timeline_mirror_size"] = (project / "Timelines" / tid / "draft_content.json").stat().st_size if summary["timeline_mirror_exists"] else 0
        material_paths = []
        missing_paths = []
        for group in ("videos", "audios", "images"):
            for item in content.get("materials", {}).get(group, []):
                path = item.get("path")
                if path:
                    material_paths.append(path)
                    if not Path(path).exists():
                        missing_paths.append(path)
        summary["material_path_count"] = len(material_paths)
        summary["material_unique_path_count"] = len(set(material_paths))
        summary["missing_material_path_count"] = len(missing_paths)
        summary["missing_material_paths_sample"] = missing_paths[:20]
        summary["resources_size_mb"] = round(sum(p.stat().st_size for p in (project / "Resources").rglob("*") if p.is_file()) / 1024 / 1024, 2) if (project / "Resources").exists() else 0
        summary["content_size_mb"] = round((project / "draft_content.json").stat().st_size / 1024 / 1024, 2)
    ok, layout = safe_json(project / "timeline_layout.json")
    if ok:
        summary["layout_timeline_ids"] = timeline_ids_from_layout(layout)
    ok, biz = safe_json(project / "draft_biz_config.json")
    if ok:
        summary["biz_timeline_ids"] = biz_timeline_ids(biz)
    ok, tproj = safe_json(project / "Timelines" / "project.json")
    if ok:
        summary["timelines_project_paths"] = all_paths(tproj)[:80]
    return summary


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    broken = root() / BROKEN_NAME
    source = root() / SOURCE_NAME
    backup = backup_project(broken) if broken.exists() else None
    report = {
        "broken": summarize(broken),
        "source": summarize(source),
        "backup": str(backup) if backup else None,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "chains_800_open_failure_audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
