#!/usr/bin/env python3
"""Repair the current Chains CapCut draft timeline clutter.

This keeps the existing phrase/voice/CTA content, but fixes the structural
damage caused by earlier explanation insertions:

- trim the invisible long compound and blank spacer layers so they cannot
  stretch the project;
- rename phrase text tracks that were accidentally labelled as CTA;
- move the late third CTA cluster from the empty tail to immediately after the
  last phrase background;
- mirror the repaired draft into all native CapCut content files.
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
CTA_TRACK_NAME = "CODEx CTA VENGA SOURCE"
REPORT = Path("exports/chains/episode1/unique_explanations_approved/repair_timeline_overlap_gaps_current_report.json")
US = 1_000_000


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


def backup_project() -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.backup-before-current-overlap-gap-repair-{stamp}"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=False)
    for name in [
        "draft_content.json",
        "template-2.tmp",
        "draft_content.json.bak",
        "draft_meta_info.json",
        "timeline_layout.json",
        "draft_biz_config.json",
    ]:
        src = DRAFT_DIR / name
        if src.exists():
            shutil.copy2(src, out / name)
    timeline_root = DRAFT_DIR / "Timelines"
    if timeline_root.exists():
        for src in timeline_root.glob("*/draft_content.json"):
            dst = out / "Timelines" / src.parent.name
            dst.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst / "draft_content.json")
    return out


def timerange(segment: dict[str, Any]) -> tuple[int, int]:
    tr = segment.get("target_timerange", {}) or {}
    start = int(tr.get("start", 0))
    duration = int(tr.get("duration", 0))
    return start, start + duration


def set_timerange(segment: dict[str, Any], start: int, duration: int) -> None:
    for key in ("target_timerange", "render_timerange"):
        if isinstance(segment.get(key), dict):
            segment[key]["start"] = start
            segment[key]["duration"] = duration
    if isinstance(segment.get("source_timerange"), dict):
        segment["source_timerange"]["duration"] = min(int(segment["source_timerange"].get("duration", duration)), duration)


def shift_segment_start(segment: dict[str, Any], delta: int) -> None:
    for key in ("target_timerange", "render_timerange"):
        if isinstance(segment.get(key), dict):
            segment[key]["start"] = int(segment[key].get("start", 0)) + delta


def material_texts(content: dict[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for material in content.get("materials", {}).get("texts", []):
        material_id = material.get("id")
        if not material_id:
            continue
        text = ""
        try:
            text = json.loads(str(material.get("content") or "{}")).get("text", "")
        except Exception:
            text = str(material.get("text") or material.get("base_content") or "")
        out[str(material_id)] = text
    return out


def is_phrase_text_track(track: dict[str, Any], texts: dict[str, str]) -> bool:
    if track.get("type") != "text":
        return False
    segments = track.get("segments", [])
    if len(segments) < 4:
        return False
    samples = [texts.get(str(segment.get("material_id")), "") for segment in segments[:8]]
    joined = "\n".join(samples).upper()
    return any(token in joined for token in ("MISSED THE", "FOUND THE", "SENT A", "FORGOT THE", "BOOKED A"))


def is_blank_spacer_track(track: dict[str, Any], texts: dict[str, str]) -> bool:
    if track.get("type") != "text" or len(track.get("segments", [])) != 1:
        return False
    text = texts.get(str(track["segments"][0].get("material_id")), "")
    return text.strip() == ""


def primary_phrase_end(content: dict[str, Any]) -> int:
    primary = content.get("tracks", [])[0]
    ends = [timerange(segment)[1] for segment in primary.get("segments", [])]
    if not ends:
        raise RuntimeError("Primary phrase background track is empty.")
    return max(ends)


def move_late_cta_cluster(content: dict[str, Any], phrase_end: int) -> dict[str, Any]:
    cta_segments: list[dict[str, Any]] = []
    for track in content.get("tracks", []):
        if track.get("name") != CTA_TRACK_NAME:
            continue
        # Real CTA tracks are one-shot imported tracks; phrase text tracks that
        # were accidentally named CTA are renamed before this function runs.
        if len(track.get("segments", [])) != 1:
            continue
        segment = track["segments"][0]
        start, _ = timerange(segment)
        if start > 4_500 * US:
            cta_segments.append(segment)

    if not cta_segments:
        return {"moved": False, "reason": "no late CTA cluster found"}

    old_audio_start = min(timerange(segment)[0] for segment in cta_segments)
    # Put the audio half a second after the last phrase background. This removes
    # the huge empty tail but keeps the CTA as a clean final insert.
    new_audio_start = phrase_end + 500_000
    delta = new_audio_start - old_audio_start
    for segment in cta_segments:
        shift_segment_start(segment, delta)
    return {
        "moved": True,
        "segments": len(cta_segments),
        "old_audio_start_us": old_audio_start,
        "new_audio_start_us": new_audio_start,
        "delta_us": delta,
    }


def compute_visible_duration(content: dict[str, Any], texts: dict[str, str]) -> int:
    max_end = 0
    for track in content.get("tracks", []):
        for segment in track.get("segments", []):
            if segment.get("visible") is False:
                continue
            if track.get("type") == "text" and texts.get(str(segment.get("material_id")), "").strip() == "":
                continue
            max_end = max(max_end, timerange(segment)[1])
    return max_end


def visual_key(segment: dict[str, Any]) -> tuple[float, float, float]:
    clip = segment.get("clip", {}) or {}
    transform = clip.get("transform", {}) or {}
    scale = clip.get("scale", {}) or {}
    return (
        round(float(transform.get("x", 0) or 0), 3),
        round(float(transform.get("y", 0) or 0), 3),
        round(float(scale.get("x", 1) or 1), 3),
    )


def trim_same_row_text_overlaps(content: dict[str, Any], texts: dict[str, str]) -> dict[str, Any]:
    buckets: dict[tuple[float, float, float], list[dict[str, Any]]] = {}
    for track in content.get("tracks", []):
        if track.get("type") != "text" or track.get("name") == CTA_TRACK_NAME:
            continue
        for segment in track.get("segments", []):
            if not texts.get(str(segment.get("material_id")), "").strip():
                continue
            buckets.setdefault(visual_key(segment), []).append(segment)

    trimmed = 0
    zero_or_negative = 0
    for key, segments in buckets.items():
        ordered = sorted(segments, key=lambda item: timerange(item)[0])
        for left, right in zip(ordered, ordered[1:]):
            left_start, left_end = timerange(left)
            right_start, _ = timerange(right)
            if left_end <= right_start:
                continue
            new_duration = right_start - left_start - 20_000
            if new_duration <= 80_000:
                new_duration = max(1, right_start - left_start)
                zero_or_negative += 1
            set_timerange(left, left_start, new_duration)
            trimmed += 1
    return {
        "visual_rows": len(buckets),
        "trimmed_text_segments": trimmed,
        "near_zero_text_segments": zero_or_negative,
    }


def mirror_content(content: dict[str, Any]) -> list[str]:
    timeline_id = str(content.get("id"))
    paths = [
        DRAFT_DIR / "draft_content.json",
        DRAFT_DIR / "template-2.tmp",
        DRAFT_DIR / "draft_content.json.bak",
        DRAFT_DIR / "Timelines" / timeline_id / "draft_content.json",
    ]
    written = []
    for path in paths:
        if path.parent.exists() or path.name == "draft_content.json":
            path.parent.mkdir(parents=True, exist_ok=True)
            write_json(path, content)
            written.append(str(path))
    return written


def update_meta(duration: int) -> None:
    meta_path = DRAFT_DIR / "draft_meta_info.json"
    if meta_path.exists():
        meta = read_json(meta_path)
        meta["tm_duration"] = duration
        meta["draft_duration"] = duration
        meta["tm_draft_modified"] = int(datetime.now().timestamp() * 1_000_000)
        write_json(meta_path, meta)

    root_meta_path = DRAFT_DIR.parent / "root_meta_info.json"
    if root_meta_path.exists():
        root = read_json(root_meta_path)
        now = int(datetime.now().timestamp() * 1_000_000)
        for entry in root.get("drafts", []):
            if entry.get("draft_name") == DRAFT_NAME or str(entry.get("draft_fold_path", "")).endswith(DRAFT_NAME):
                entry["tm_duration"] = duration
                entry["tm_draft_modified"] = now
        write_json(root_meta_path, root)


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close it before writing the draft.")

    backup = backup_project()
    content = read_json(DRAFT_DIR / "draft_content.json")
    texts = material_texts(content)
    phrase_end = primary_phrase_end(content)

    renamed_phrase_text_tracks = []
    trimmed_blank_spacers = 0
    trimmed_hidden_compounds = 0

    for index, track in enumerate(content.get("tracks", [])):
        if track.get("name") == CTA_TRACK_NAME and is_phrase_text_track(track, texts):
            track["name"] = ""
            track["is_default_name"] = True
            renamed_phrase_text_tracks.append(index)

    for track in content.get("tracks", []):
        if is_blank_spacer_track(track, texts):
            segment = track["segments"][0]
            start, end = timerange(segment)
            if end > phrase_end + 2_000_000:
                set_timerange(segment, min(start, 44 * US), phrase_end - min(start, 44 * US))
                trimmed_blank_spacers += 1
        if track.get("type") == "video" and len(track.get("segments", [])) == 1:
            segment = track["segments"][0]
            if segment.get("visible") is False:
                start, end = timerange(segment)
                if end > phrase_end + 2_000_000:
                    set_timerange(segment, start, min(44 * US, max(0, phrase_end - start)))
                    trimmed_hidden_compounds += 1

    cta_move = move_late_cta_cluster(content, phrase_end)
    texts_after = material_texts(content)
    text_overlap_trim = trim_same_row_text_overlaps(content, texts_after)
    duration = compute_visible_duration(content, texts_after)
    content["duration"] = duration
    written = mirror_content(content)
    update_meta(duration)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "backup": str(backup),
        "draft_dir": str(DRAFT_DIR),
        "phrase_end_us": phrase_end,
        "renamed_phrase_text_tracks": renamed_phrase_text_tracks,
        "trimmed_blank_spacers": trimmed_blank_spacers,
        "trimmed_hidden_compounds": trimmed_hidden_compounds,
        "cta_move": cta_move,
        "text_overlap_trim": text_overlap_trim,
        "duration_us": duration,
        "duration_sec": round(duration / US, 3),
        "tracks": len(content.get("tracks", [])),
        "written": written,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
