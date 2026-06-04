#!/usr/bin/env python3
"""Fix residual CTA overlaps after timeline compaction."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
ROOT = (
    Path(os.environ.get("LOCALAPPDATA", r"C:\Users\badlo\AppData\Local"))
    / "CapCut"
    / "User Data"
    / "Projects"
    / "com.lveditor.draft"
    / DRAFT_NAME
)
REPORT = Path("exports/chains/episode1/unique_explanations_approved/cta_residual_overlap_repair_report.json")
MARGIN_US = 333_333


def ensure_capcut_closed() -> None:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -First 1"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.stdout.strip():
        raise RuntimeError("CapCut is open. Close CapCut before writing the draft.")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def backup(root: Path) -> Path:
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.json-backup-before-cta-residual-overlap-{time.strftime('%Y%m%d_%H%M%S')}"
    out.mkdir(parents=True, exist_ok=False)
    for name in ["draft_content.json", "template-2.tmp", "draft_content.json.bak", "draft_meta_info.json"]:
        src = root / name
        if src.exists():
            shutil.copy2(src, out / name)
    for content in (root / "Timelines").glob("*/draft_content.json"):
        dst = out / content.relative_to(root)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(content, dst)
    return out


def mirror(root: Path, timeline_id: str) -> list[str]:
    src = root / "draft_content.json"
    out = []
    for dst in [root / "template-2.tmp", root / "draft_content.json.bak", root / "Timelines" / timeline_id / "draft_content.json"]:
        if dst.exists():
            shutil.copy2(src, dst)
            out.append(str(dst))
    return out


def update_meta(root: Path, duration_us: int) -> None:
    path = root / "draft_meta_info.json"
    if not path.exists():
        return
    meta = load_json(path)
    meta["tm_duration"] = duration_us
    meta["draft_duration"] = duration_us
    write_json(path, meta)


def video_name(content: dict[str, Any], material_id: str | None) -> str:
    for item in content.get("materials", {}).get("videos", []):
        if item.get("id") == material_id:
            return str(item.get("material_name") or Path(str(item.get("path") or "")).name)
    return ""


def cta_clusters(content: dict[str, Any]) -> list[tuple[int, int]]:
    intervals = []
    for track in content.get("tracks", []):
        if track.get("name") != "CODEx CTA VENGA SOURCE":
            continue
        for segment in track.get("segments", []):
            tr = segment.get("target_timerange", {})
            start = int(tr.get("start") or 0)
            intervals.append((start, start + int(tr.get("duration") or 0)))
    intervals.sort()
    clusters: list[list[tuple[int, int]]] = []
    for interval in intervals:
        if not clusters or interval[0] - min(start for start, _ in clusters[-1]) > 90_000_000:
            clusters.append([interval])
        else:
            clusters[-1].append(interval)
    return [(min(start for start, _ in cluster), max(end for _, end in cluster)) for cluster in clusters]


def find_phrase_overlaps(content: dict[str, Any], cluster: tuple[int, int]) -> list[tuple[int, int, int]]:
    cta_start, cta_end = cluster
    hits = []
    for track_index, track in enumerate(content.get("tracks", [])):
        if track.get("name") or len(track.get("segments", [])) < 80:
            continue
        for segment in track.get("segments", []):
            tr = segment.get("target_timerange", {})
            start = int(tr.get("start") or 0)
            duration = int(tr.get("duration") or 0)
            end = start + duration
            if duration <= 45_000_000 and start < cta_end and cta_start < end:
                hits.append((track_index, start, end))
    return hits


def shift_non_cta_from(content: dict[str, Any], threshold: int, amount: int) -> int:
    shifted = 0
    for track in content.get("tracks", []):
        if track.get("name") == "CODEx CTA VENGA SOURCE":
            continue
        for segment in track.get("segments", []):
            tr = segment.get("target_timerange", {})
            start = int(tr.get("start") or 0)
            if start >= threshold:
                tr["start"] = start + amount
                shifted += 1
    content["duration"] = int(content.get("duration") or 0) + amount
    return shifted


def update_compound(content: dict[str, Any]) -> None:
    for track in content.get("tracks", []):
        for segment in track.get("segments", []):
            if video_name(content, segment.get("material_id")) == "Compound clip8":
                segment["target_timerange"]["duration"] = content["duration"]
                segment["source_timerange"]["duration"] = min(
                    int(segment.get("source_timerange", {}).get("duration") or content["duration"]),
                    content["duration"],
                )
                segment["volume"] = 0.0
                segment["last_nonzero_volume"] = 0.0


def repair(content: dict[str, Any]) -> dict[str, Any]:
    actions = []
    for _ in range(8):
        changed = False
        for cluster in cta_clusters(content):
            hits = find_phrase_overlaps(content, cluster)
            if not hits:
                continue
            earliest = min(start for _, start, _ in hits)
            amount = cluster[1] - earliest + MARGIN_US
            shifted = shift_non_cta_from(content, earliest, amount)
            actions.append(
                {
                    "cluster": cluster,
                    "earliest_overlap_start": earliest,
                    "shift_amount_us": amount,
                    "shifted_segments": shifted,
                }
            )
            changed = True
        if not changed:
            break
    update_compound(content)
    remaining = {str(index + 1): len(find_phrase_overlaps(content, cluster)) for index, cluster in enumerate(cta_clusters(content))}
    return {"actions": actions, "remaining_overlaps_by_cluster": remaining, "final_duration_us": content["duration"]}


def main() -> int:
    ensure_capcut_closed()
    b = backup(ROOT)
    path = ROOT / "draft_content.json"
    content = load_json(path)
    result = repair(content)
    write_json(path, content)
    result["backup"] = str(b)
    result["mirrors"] = mirror(ROOT, content["id"])
    update_meta(ROOT, int(content.get("duration") or 0))
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
