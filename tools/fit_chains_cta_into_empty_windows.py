#!/usr/bin/env python3
"""Fit CTA clusters into real empty windows on the primary Chains timeline."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
DRAFT_DIR = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft" / DRAFT_NAME
CONTENT_PATH = DRAFT_DIR / "draft_content.json"
META_PATH = DRAFT_DIR / "draft_meta_info.json"
TMP_PATH = DRAFT_DIR / "template-2.tmp"
CTA_TRACK_NAME = "CODEx CTA VENGA SOURCE"
REPORT_PATH = Path("exports/chains/episode1/unique_explanations_approved/fit_cta_empty_windows_report.json")


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


def backup() -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.backup-before-cta-fit-{stamp}"
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(DRAFT_DIR, out)
    return out


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def timerange(segment: dict[str, Any]) -> tuple[int, int]:
    tr = segment.get("target_timerange", {}) or {}
    start = int(tr.get("start", 0))
    return start, start + int(tr.get("duration", 0))


def primary_empty_windows(content: dict[str, Any]) -> list[tuple[int, int]]:
    primary = content["tracks"][0]
    intervals = sorted(timerange(segment) for segment in primary.get("segments", []))
    windows: list[tuple[int, int]] = []
    for (_, left_end), (right_start, _) in zip(intervals, intervals[1:]):
        if right_start - left_end >= 20_500_000:
            windows.append((left_end, right_start))
    return windows


def phrase_intervals(content: dict[str, Any]) -> list[tuple[int, int]]:
    intervals: list[tuple[int, int]] = []
    for track in content.get("tracks", []):
        if track.get("name"):
            continue
        segments = track.get("segments", [])
        if len(segments) < 80:
            continue
        for segment in segments:
            start, end = timerange(segment)
            if end - start <= 45_000_000:
                intervals.append((start, end))
    return sorted(intervals)


def cta_clusters(content: dict[str, Any]) -> list[dict[str, Any]]:
    segments: list[tuple[int, int, dict[str, Any]]] = []
    for track in content.get("tracks", []):
        if track.get("name") != CTA_TRACK_NAME:
            continue
        for segment in track.get("segments", []):
            start, end = timerange(segment)
            segments.append((start, end, segment))
    clusters: list[list[tuple[int, int, dict[str, Any]]]] = []
    for item in sorted(segments, key=lambda item: item[0]):
        if not clusters or item[0] - min(start for start, _, _ in clusters[-1]) > 90_000_000:
            clusters.append([item])
        else:
            clusters[-1].append(item)
    out: list[dict[str, Any]] = []
    for cluster in clusters:
        start = min(item[0] for item in cluster)
        end = max(item[1] for item in cluster)
        out.append({"start": start, "end": end, "duration": end - start, "items": cluster})
    return out


def move_cluster(cluster: dict[str, Any], new_start: int) -> int:
    delta = new_start - int(cluster["start"])
    moved = 0
    if delta == 0:
        return moved
    for start, _, segment in cluster["items"]:
        tr = segment.get("target_timerange", {}) or {}
        tr["start"] = int(start + delta)
        moved += 1
    return moved


def shift_everything_after(content: dict[str, Any], threshold: int, delta: int) -> int:
    if delta <= 0:
        return 0
    shifted = 0
    for track in content.get("tracks", []):
        for segment in track.get("segments", []):
            tr = segment.get("target_timerange")
            if not isinstance(tr, dict):
                continue
            start = int(tr.get("start", 0))
            if start >= threshold:
                tr["start"] = start + delta
                shifted += 1
    return shifted


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close CapCut before fitting CTA windows.")
    backup_path = backup()
    content = read_json(CONTENT_PATH)
    windows = primary_empty_windows(content)
    moves = []
    for index, window in enumerate(windows[:2], start=0):
        clusters = cta_clusters(content)
        if index >= len(clusters):
            break
        cluster = clusters[index]
        win_start, win_end = window
        intervals = phrase_intervals(content)
        left_tail_end = max((end for start, end in intervals if start < win_end and end <= win_end), default=win_start)
        target_start = max(win_start + 250_000, left_tail_end + 250_000)
        next_start = min((start for start, _ in intervals if start > target_start), default=win_end)
        needed_shift = max(0, target_start + int(cluster["duration"]) + 250_000 - next_start)
        shifted_after = shift_everything_after(content, next_start, needed_shift)
        if shifted_after:
            windows = primary_empty_windows(content)
        moved = move_cluster(cluster, target_start)
        moves.append(
            {
                "cluster_index": index + 1,
                "window_before": window,
                "left_tail_end": left_tail_end,
                "next_phrase_start": next_start,
                "expanded_window_by_us": needed_shift,
                "shifted_segments_after_window": shifted_after,
                "old_start": cluster["start"],
                "old_end": cluster["end"],
                "new_start": target_start,
                "new_end": target_start + int(cluster["duration"]),
                "moved_segments": moved,
            }
        )
    max_end = 0
    for track in content.get("tracks", []):
        for segment in track.get("segments", []):
            max_end = max(max_end, timerange(segment)[1])
    content["duration"] = max_end
    write_json(CONTENT_PATH, content)
    if TMP_PATH.exists():
        write_json(TMP_PATH, content)
    meta = read_json(META_PATH)
    meta["tm_duration"] = max_end
    write_json(META_PATH, meta)
    report = {
        "backup": str(backup_path),
        "draft_dir": str(DRAFT_DIR),
        "empty_windows": windows,
        "moves": moves,
        "cta_clusters_after": [
            {key: value for key, value in cluster.items() if key != "items"} for cluster in cta_clusters(content)
        ],
        "draft_duration": max_end,
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
