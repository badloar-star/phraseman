#!/usr/bin/env python3
"""Remove broken Chains explanation blocks and close their timeline gaps.

CTA tracks are intentionally preserved in place because the user explicitly
asked not to touch them.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
DRAFT_DIR = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft" / DRAFT_NAME
CONTENT_PATH = DRAFT_DIR / "draft_content.json"
META_PATH = DRAFT_DIR / "draft_meta_info.json"
TMP_PATH = DRAFT_DIR / "template-2.tmp"
REPORT_PATH = Path("exports/chains/episode1/unique_explanations_approved/remove_explanations_close_gaps_report.json")
EXPLANATION_PREFIX = "CODEx construction explanation"
CTA_TRACK_NAME = "CODEx CTA VENGA SOURCE"


def capcut_is_open() -> bool:
    result = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq CapCut.exe"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=False,
    )
    return "CapCut.exe" in result.stdout


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def backup() -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.backup-before-remove-explanations-{stamp}"
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(DRAFT_DIR, out)
    return out


def timerange(segment: dict[str, Any]) -> tuple[int, int]:
    tr = segment.get("target_timerange", {}) or {}
    start = int(tr.get("start", 0))
    duration = int(tr.get("duration", 0))
    return start, start + duration


def merge_intervals(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    merged: list[tuple[int, int]] = []
    for start, end in sorted(intervals):
        if end <= start:
            continue
        if not merged or start > merged[-1][1] + 100_000:
            merged.append((start, end))
        else:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
    return merged


def shift_for(start: int, gaps: list[tuple[int, int]]) -> int:
    return sum(end - gap_start for gap_start, end in gaps if end <= start)


def cta_clusters(content: dict[str, Any]) -> list[tuple[int, int]]:
    intervals: list[tuple[int, int]] = []
    for track in content.get("tracks", []):
        if track.get("name") != CTA_TRACK_NAME:
            continue
        intervals.extend(timerange(segment) for segment in track.get("segments", []))
    if not intervals:
        return []
    clusters: list[list[tuple[int, int]]] = []
    for interval in sorted(intervals):
        if not clusters or interval[0] - min(start for start, _ in clusters[-1]) > 90_000_000:
            clusters.append([interval])
        else:
            clusters[-1].append(interval)
    return [
        (min(start for start, _ in cluster), max(end for _, end in cluster))
        for cluster in clusters
    ]


def avoid_cta_windows(start: int, duration: int, clusters: list[tuple[int, int]]) -> int:
    if duration <= 0:
        return start
    placed = start
    while True:
        end = placed + duration
        overlap = next(
            ((cluster_start, cluster_end) for cluster_start, cluster_end in clusters if placed < cluster_end and cluster_start < end),
            None,
        )
        if overlap is None:
            return placed
        placed = overlap[1]


def cta_snapshot(content: dict[str, Any]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for track in content.get("tracks", []):
        if track.get("name") != CTA_TRACK_NAME:
            continue
        for segment_index, segment in enumerate(track.get("segments", [])):
            tr = segment.get("target_timerange", {}) or {}
            items.append(
                {
                    "segment_index": segment_index,
                    "material_id": segment.get("material_id"),
                    "start": int(tr.get("start", 0)),
                    "duration": int(tr.get("duration", 0)),
                }
            )
    return items


def collect_paths(node: Any, out: list[str]) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            if key in {"path", "audio_path", "video_path", "cover_path"} and isinstance(value, str):
                out.extend(part for part in value.split(";") if part)
            else:
                collect_paths(value, out)
    elif isinstance(node, list):
        for item in node:
            collect_paths(item, out)


def remove_unused_materials(content: dict[str, Any]) -> dict[str, int]:
    used_material_ids = {
        segment.get("material_id")
        for track in content.get("tracks", [])
        for segment in track.get("segments", [])
        if segment.get("material_id")
    }
    removed: dict[str, int] = {}
    for group_name, group in list(content.get("materials", {}).items()):
        if not isinstance(group, list):
            continue
        before = len(group)
        content["materials"][group_name] = [
            material
            for material in group
            if not (
                isinstance(material, dict)
                and str(material.get("name", "")).startswith(EXPLANATION_PREFIX)
                and material.get("id") not in used_material_ids
            )
        ]
        removed[group_name] = before - len(content["materials"][group_name])
    return {name: count for name, count in removed.items() if count}


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close CapCut before removing explanation blocks.")
    content = read_json(CONTENT_PATH)
    before_cta = cta_snapshot(content)
    protected_cta_clusters = cta_clusters(content)

    explanation_tracks = [
        track for track in content.get("tracks", []) if str(track.get("name", "")).startswith(EXPLANATION_PREFIX)
    ]
    if not explanation_tracks:
        paths: list[str] = []
        collect_paths(content, paths)
        missing_paths = [
            path
            for path in sorted(set(paths))
            if (":" in path or path.startswith("\\\\"))
            and not Path(path).exists()
        ]
        report = {
            "draft_dir": str(DRAFT_DIR),
            "already_removed": True,
            "cta_segment_count": len(before_cta),
            "remaining_explanation_tracks": [],
            "missing_paths": len(missing_paths),
            "first_missing_paths": missing_paths[:5],
            "draft_duration": content.get("duration"),
        }
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        if missing_paths:
            raise SystemExit("Missing media paths remain after explanation removal.")
        return 0

    bg_track = next((track for track in explanation_tracks if "SCREENSAVER" in str(track.get("name", ""))), None)
    gap_source_tracks = [bg_track] if bg_track else explanation_tracks
    gaps = merge_intervals(
        [
            timerange(segment)
            for track in gap_source_tracks
            for segment in track.get("segments", [])
        ]
    )
    if not gaps:
        raise SystemExit("No explanation gap intervals found.")

    backup_path = backup()
    removed_track_names = [str(track.get("name", "")) for track in explanation_tracks]
    removed_segments = sum(len(track.get("segments", [])) for track in explanation_tracks)
    explanation_ids = {id(track) for track in explanation_tracks}

    shifted_segments = 0
    for track in content.get("tracks", []):
        if id(track) in explanation_ids or track.get("name") == CTA_TRACK_NAME:
            continue
        for segment in track.get("segments", []):
            tr = segment.get("target_timerange")
            if not isinstance(tr, dict):
                continue
            start = int(tr.get("start", 0))
            duration = int(tr.get("duration", 0))
            delta = shift_for(start, gaps)
            new_start = max(0, start - delta)
            if duration <= 45_000_000:
                new_start = avoid_cta_windows(new_start, duration, protected_cta_clusters)
            if new_start != start:
                tr["start"] = new_start
                shifted_segments += 1

    content["tracks"] = [track for track in content.get("tracks", []) if id(track) not in explanation_ids]
    removed_materials = remove_unused_materials(content)

    max_end = 0
    for track in content.get("tracks", []):
        for segment in track.get("segments", []):
            start, end = timerange(segment)
            max_end = max(max_end, end)
    if max_end:
        content["duration"] = max_end

    write_json(CONTENT_PATH, content)
    if TMP_PATH.exists():
        write_json(TMP_PATH, content)
    meta = read_json(META_PATH)
    meta["tm_duration"] = content["duration"]
    write_json(META_PATH, meta)

    after_cta = cta_snapshot(content)
    paths: list[str] = []
    collect_paths(content, paths)
    missing_paths = [
        path
        for path in sorted(set(paths))
        if (":" in path or path.startswith("\\\\"))
        and not Path(path).exists()
    ]
    remaining_explanation_tracks = [
        track.get("name")
        for track in content.get("tracks", [])
        if str(track.get("name", "")).startswith(EXPLANATION_PREFIX)
    ]
    report = {
        "backup": str(backup_path),
        "draft_dir": str(DRAFT_DIR),
        "removed_track_names": removed_track_names,
        "removed_track_count": len(removed_track_names),
        "removed_segment_count": removed_segments,
        "gap_count": len(gaps),
        "total_gap_removed_us": sum(end - start for start, end in gaps),
        "shifted_non_cta_segments": shifted_segments,
        "cta_preserved": before_cta == after_cta,
        "protected_cta_clusters": protected_cta_clusters,
        "cta_segment_count": len(after_cta),
        "remaining_explanation_tracks": remaining_explanation_tracks,
        "removed_materials": removed_materials,
        "missing_paths": len(missing_paths),
        "first_missing_paths": missing_paths[:5],
        "draft_duration": content.get("duration"),
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report["cta_preserved"]:
        raise SystemExit("CTA changed unexpectedly.")
    if remaining_explanation_tracks:
        raise SystemExit("Explanation tracks remain after removal.")
    if missing_paths:
        raise SystemExit("Missing media paths remain after removal.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
