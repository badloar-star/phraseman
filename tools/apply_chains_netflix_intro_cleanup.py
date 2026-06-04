#!/usr/bin/env python3
"""Repair the current Chains CapCut draft without replacing the user template."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
DRAFT_ROOT = (
    Path(os.environ.get("LOCALAPPDATA", r"C:\Users\badlo\AppData\Local"))
    / "CapCut"
    / "User Data"
    / "Projects"
    / "com.lveditor.draft"
    / DRAFT_NAME
)
INTRO_MANIFEST = Path("exports/chains/episode1/unique_explanations_approved/intro_netflix_doc_20260603_manifest.json")
INTRO_AUDIO = Path("exports/chains/episode1/intro-11labs-netflix-doc-20260603/chains_ep01_intro_netflix_doc_ru_11labs_slot_44s.wav")
REPORT = Path("exports/chains/episode1/unique_explanations_approved/netflix_intro_cleanup_apply_report.json")

INTRO_RESOURCE_SUBDIR = "chains_intro_netflix_doc_20260603"
INTRO_AUDIO_SUBDIR = "chains_intro_11labs_netflix_doc_20260603"
INTRO_TRACK_NAME = "INTRO 11LABS NETFLIX DOC ACTIVE"
FORBIDDEN_TRACK_MARKERS = ("ФРАЗА СОБРАНА", "ПОЛНЫЙ ВАРИАНТ", "КОРОТКАЯ МЫСЛЬ", "ОСНОВА:")


def capcut_id() -> str:
    return str(uuid.uuid4()).upper()


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


def text_plain(raw: str) -> str:
    try:
        return str(json.loads(raw).get("text", ""))
    except Exception:
        return raw or ""


def set_text_content(material: dict[str, Any], new_text: str) -> None:
    try:
        content = json.loads(str(material.get("content") or "{}"))
    except Exception:
        content = {"text": ""}
    old_len = len(str(content.get("text") or ""))
    content["text"] = new_text
    for style in content.get("styles", []):
        style["range"] = [0, len(new_text)]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    material["base_content"] = new_text
    material["recognize_text"] = new_text
    material["words"] = {"words": []}
    material["current_words"] = {"words": []}
    material["text_size"] = len(new_text)
    material["fixed_width"] = 0.0
    material["line_max_width"] = 0.92
    material["force_apply_line_max_width"] = True
    if old_len != len(new_text):
        material["name"] = "netflix_intro_title"


def ffprobe_duration_us(path: Path) -> int:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    )
    return int(round(float(result.stdout.strip()) * 1_000_000))


def backup_json(root: Path) -> Path:
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.json-backup-before-netflix-intro-cleanup-{time.strftime('%Y%m%d_%H%M%S')}"
    out.mkdir(parents=True, exist_ok=False)
    for name in [
        "draft_content.json",
        "template-2.tmp",
        "draft_content.json.bak",
        "draft_meta_info.json",
        "timeline_layout.json",
        "draft_biz_config.json",
    ]:
        src = root / name
        if src.exists():
            shutil.copy2(src, out / name)
    for content in (root / "Timelines").glob("*/draft_content.json"):
        dst = out / content.relative_to(root)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(content, dst)
    return out


def mirror_content(root: Path, timeline_id: str) -> list[str]:
    source = root / "draft_content.json"
    targets = [
        root / "template-2.tmp",
        root / "draft_content.json.bak",
        root / "Timelines" / timeline_id / "draft_content.json",
    ]
    written: list[str] = []
    for target in targets:
        if target.exists():
            shutil.copy2(source, target)
            written.append(str(target))
    return written


def copy_intro_assets(root: Path, manifest: dict[str, Any]) -> list[dict[str, Any]]:
    out_dir = root / "Resources" / INTRO_RESOURCE_SUBDIR
    out_dir.mkdir(parents=True, exist_ok=True)
    copied: list[dict[str, Any]] = []
    for shot in manifest["shots"]:
        src = Path(shot["rendered_path"])
        if not src.exists():
            raise RuntimeError(f"Intro rendered clip missing: {src}")
        dst = out_dir / f"intro_{int(shot['index']):02d}.mp4"
        shutil.copy2(src, dst)
        copied.append({**shot, "capcut_path": str(dst), "duration_us": int(shot["duration_us"])})
    return copied


def copy_intro_audio(root: Path) -> Path:
    if not INTRO_AUDIO.exists():
        raise RuntimeError(f"Intro audio missing: {INTRO_AUDIO}")
    out_dir = root / "Resources" / INTRO_AUDIO_SUBDIR
    out_dir.mkdir(parents=True, exist_ok=True)
    dst = out_dir / INTRO_AUDIO.name
    shutil.copy2(INTRO_AUDIO, dst)
    return dst


def remove_bad_root_text_tracks(content: dict[str, Any]) -> dict[str, Any]:
    text_materials = {item.get("id"): item for item in content.get("materials", {}).get("texts", [])}
    remove_indices: list[int] = []
    removed_tracks: list[dict[str, Any]] = []
    for index, track in enumerate(content.get("tracks", [])):
        if track.get("type") != "text":
            continue
        if str(track.get("name") or "").startswith("CODEx CTA VENGA SOURCE"):
            continue
        samples = [
            text_plain(str(text_materials.get(segment.get("material_id"), {}).get("content") or ""))
            for segment in track.get("segments", [])
        ]
        joined = "\n".join(samples).upper()
        one_or_two_late = len(track.get("segments", [])) <= 2 and any(
            int(segment.get("target_timerange", {}).get("start") or 0) > 1_200_000_000
            for segment in track.get("segments", [])
        )
        has_standalone_debris = any(sample.strip().upper() in {"AT SCHOOL", "BAD WEATHER", "AFTER WORK"} for sample in samples)
        has_forbidden = any(marker in joined for marker in FORBIDDEN_TRACK_MARKERS)
        if has_forbidden or has_standalone_debris or one_or_two_late:
            remove_indices.append(index)
            removed_tracks.append(
                {
                    "index": index,
                    "segments": len(track.get("segments", [])),
                    "reason": "forbidden_or_late_duplicate_text",
                    "samples": samples[:8],
                }
            )
    content["tracks"] = [
        track for index, track in enumerate(content.get("tracks", [])) if index not in set(remove_indices)
    ]
    used_ids = {
        segment.get("material_id")
        for track in content.get("tracks", [])
        for segment in track.get("segments", [])
        if segment.get("material_id")
    }
    content["materials"]["texts"] = [
        item for item in content.get("materials", {}).get("texts", []) if item.get("id") in used_ids
    ]
    return {"removed_text_tracks": removed_tracks}


def video_material_name(content: dict[str, Any], material_id: str | None) -> str:
    for item in content.get("materials", {}).get("videos", []):
        if item.get("id") == material_id:
            return str(item.get("material_name") or Path(str(item.get("path") or "")).name)
    return ""


def compact_construction_gaps(content: dict[str, Any]) -> dict[str, Any]:
    tracks = content.get("tracks", [])
    if not tracks or tracks[0].get("type") != "video":
        return {"removed_gap_count": 0, "removed_gap_duration_us": 0}
    primary = tracks[0]
    removals: list[tuple[int, int]] = []
    kept_primary_segments = []
    for segment in primary.get("segments", []):
        name = video_material_name(content, segment.get("material_id"))
        start = int(segment.get("target_timerange", {}).get("start") or 0)
        duration = int(segment.get("target_timerange", {}).get("duration") or 0)
        if name.startswith("construction_screensaver") and duration >= 5_000_000:
            removals.append((start, duration))
            continue
        kept_primary_segments.append(segment)
    if not removals:
        return {"removed_gap_count": 0, "removed_gap_duration_us": 0}
    removals.sort()
    primary["segments"] = kept_primary_segments

    def shift_for_start(start: int) -> int:
        shift = 0
        for rem_start, rem_duration in removals:
            if start >= rem_start + rem_duration:
                shift += rem_duration
        return shift

    removed_inside_nonprimary = 0
    for track_index, track in enumerate(tracks):
        new_segments = []
        for segment in track.get("segments", []):
            timerange = segment.get("target_timerange", {})
            start = int(timerange.get("start") or 0)
            duration = int(timerange.get("duration") or 0)
            entirely_inside_removed = any(start >= rem_start and start + duration <= rem_start + rem_duration for rem_start, rem_duration in removals)
            if track_index != 0 and entirely_inside_removed and not str(track.get("name") or "").startswith("CODEx CTA VENGA SOURCE"):
                removed_inside_nonprimary += 1
                continue
            shift = shift_for_start(start)
            if shift:
                timerange["start"] = max(0, start - shift)
            new_segments.append(segment)
        track["segments"] = new_segments

    total_removed = sum(duration for _, duration in removals)
    content["duration"] = max(0, int(content.get("duration") or 0) - total_removed)
    for track in tracks:
        for segment in track.get("segments", []):
            if video_material_name(content, segment.get("material_id")) == "Compound clip8":
                segment["target_timerange"]["duration"] = content["duration"]
                segment["source_timerange"]["duration"] = min(
                    int(segment.get("source_timerange", {}).get("duration") or content["duration"]),
                    content["duration"],
                )
                segment["volume"] = 0.0
                segment["last_nonzero_volume"] = 0.0
    return {
        "removed_gap_count": len(removals),
        "removed_gap_duration_us": total_removed,
        "removed_nonprimary_segments_inside_gaps": removed_inside_nonprimary,
    }


def replace_intro_draft(content: dict[str, Any], shots: list[dict[str, Any]]) -> dict[str, Any]:
    drafts = content.get("materials", {}).get("drafts", [])
    if not drafts:
        raise RuntimeError("No compound intro draft found")
    draft = drafts[0]["draft"]
    draft["duration"] = sum(int(shot["duration_us"]) for shot in shots)

    video_template_track = next(track for track in draft.get("tracks", []) if track.get("type") == "video" and track.get("segments"))
    video_template_segment = deepcopy(video_template_track["segments"][0])
    video_template_material = deepcopy(
        next(item for item in draft["materials"]["videos"] if item["id"] == video_template_segment["material_id"])
    )
    text_template_track = next(track for track in draft.get("tracks", []) if track.get("type") == "text" and track.get("segments"))
    text_template_segment = deepcopy(text_template_track["segments"][0])
    text_template_material = deepcopy(
        next(item for item in draft["materials"]["texts"] if item["id"] == text_template_segment["material_id"])
    )

    new_video_track = deepcopy(video_template_track)
    new_video_track["id"] = capcut_id()
    new_video_track["name"] = "CODEx INTRO NETFLIX DOC VIDEO"
    new_video_track["segments"] = []
    new_text_track = deepcopy(text_template_track)
    new_text_track["id"] = capcut_id()
    new_text_track["name"] = "CODEx INTRO NETFLIX DOC TITLES"
    new_text_track["segments"] = []

    new_videos: list[dict[str, Any]] = []
    new_texts: list[dict[str, Any]] = []
    cursor = 0
    for index, shot in enumerate(shots, 1):
        duration = int(shot["duration_us"])
        video_material = deepcopy(video_template_material)
        video_material["id"] = capcut_id()
        video_material["path"] = shot["capcut_path"]
        video_material["media_path"] = shot["capcut_path"]
        video_material["material_name"] = Path(shot["capcut_path"]).name
        video_material["duration"] = duration
        video_material["has_audio"] = False
        new_videos.append(video_material)

        video_segment = deepcopy(video_template_segment)
        video_segment["id"] = capcut_id()
        video_segment["material_id"] = video_material["id"]
        video_segment["source_timerange"] = {"start": 0, "duration": duration}
        video_segment["target_timerange"] = {"start": cursor, "duration": duration}
        video_segment["render_index"] = 1000 + index
        video_segment["track_render_index"] = 1
        video_segment["common_keyframes"] = deepcopy(video_template_segment.get("common_keyframes") or [])
        for keyframe in video_segment["common_keyframes"]:
            keyframe["id"] = capcut_id()
            for item in keyframe.get("keyframe_list", []):
                item["id"] = capcut_id()
                if int(item.get("time_offset") or 0) > 0:
                    item["time_offset"] = duration
        new_video_track["segments"].append(video_segment)

        text_material = deepcopy(text_template_material)
        text_material["id"] = capcut_id()
        set_text_content(text_material, str(shot["title"]))
        new_texts.append(text_material)

        text_segment = deepcopy(text_template_segment)
        text_segment["id"] = capcut_id()
        text_segment["material_id"] = text_material["id"]
        text_segment["target_timerange"] = {"start": cursor + 180_000, "duration": max(500_000, duration - 360_000)}
        text_segment["source_timerange"] = None
        text_segment["render_index"] = 2000 + index
        text_segment["track_render_index"] = 2
        text_segment["common_keyframes"] = deepcopy(text_template_segment.get("common_keyframes") or [])
        for keyframe in text_segment["common_keyframes"]:
            keyframe["id"] = capcut_id()
            for item in keyframe.get("keyframe_list", []):
                item["id"] = capcut_id()
                if int(item.get("time_offset") or 0) > 0:
                    item["time_offset"] = max(500_000, duration - 360_000)
        new_text_track["segments"].append(text_segment)
        cursor += duration

    draft["tracks"] = [new_video_track, new_text_track]
    draft["materials"]["videos"] = new_videos
    draft["materials"]["texts"] = new_texts
    for key in [
        "audios",
        "effects",
        "stickers",
        "audio_effects",
        "beats",
        "material_animations",
        "transitions",
    ]:
        if key in draft.get("materials", {}):
            draft["materials"][key] = []
    return {"intro_internal_tracks": len(draft["tracks"]), "intro_internal_duration_us": draft["duration"]}


def add_visible_intro_audio(content: dict[str, Any], audio_path: Path, duration_us: int) -> dict[str, Any]:
    removed = 0
    for track in content.get("tracks", []):
        if str(track.get("name") or "").startswith("INTRO 11LABS"):
            removed += 1
    content["tracks"] = [track for track in content.get("tracks", []) if not str(track.get("name") or "").startswith("INTRO 11LABS")]

    audio_template_track = next(track for track in content.get("tracks", []) if track.get("type") == "audio" and track.get("segments"))
    audio_template_segment = deepcopy(audio_template_track["segments"][0])
    audio_template_material = deepcopy(
        next(item for item in content["materials"]["audios"] if item["id"] == audio_template_segment["material_id"])
    )

    material = audio_template_material
    material["id"] = capcut_id()
    material["name"] = audio_path.name
    material["material_name"] = audio_path.name
    material["path"] = str(audio_path)
    material["duration"] = duration_us
    material["wave_points"] = []
    content["materials"]["audios"].append(material)

    segment = audio_template_segment
    segment["id"] = capcut_id()
    segment["material_id"] = material["id"]
    segment["source_timerange"] = {"start": 0, "duration": duration_us}
    segment["target_timerange"] = {"start": 0, "duration": duration_us}
    segment["volume"] = 1.0
    segment["last_nonzero_volume"] = 1.0

    track = deepcopy(audio_template_track)
    track["id"] = capcut_id()
    track["name"] = INTRO_TRACK_NAME
    track["segments"] = [segment]
    track["render_index"] = max(int(t.get("render_index") or 0) for t in content.get("tracks", [])) + 1
    track["track_render_index"] = track["render_index"]
    segment["render_index"] = track["render_index"]
    segment["track_render_index"] = track["render_index"]
    content["tracks"].append(track)
    return {"removed_old_intro_audio_tracks": removed, "added_intro_audio_duration_us": duration_us}


def update_meta(root: Path, duration_us: int) -> None:
    meta_path = root / "draft_meta_info.json"
    if not meta_path.exists():
        return
    meta = load_json(meta_path)
    meta["tm_duration"] = duration_us
    meta["draft_duration"] = duration_us
    write_json(meta_path, meta)


def main() -> int:
    ensure_capcut_closed()
    if not DRAFT_ROOT.exists():
        raise RuntimeError(f"Draft not found: {DRAFT_ROOT}")
    if not INTRO_MANIFEST.exists():
        raise RuntimeError(f"Intro manifest missing: {INTRO_MANIFEST}")
    manifest = load_json(INTRO_MANIFEST)
    backup = backup_json(DRAFT_ROOT)
    content_path = DRAFT_ROOT / "draft_content.json"
    content = load_json(content_path)
    copied_shots = copy_intro_assets(DRAFT_ROOT, manifest)
    copied_audio = copy_intro_audio(DRAFT_ROOT)
    audio_duration = ffprobe_duration_us(copied_audio)

    results: dict[str, Any] = {
        "backup": str(backup),
        "copied_intro_shots": len(copied_shots),
        "intro_audio": str(copied_audio),
    }
    results.update(remove_bad_root_text_tracks(content))
    results.update(compact_construction_gaps(content))
    results.update(replace_intro_draft(content, copied_shots))
    results.update(add_visible_intro_audio(content, copied_audio, audio_duration))

    write_json(content_path, content)
    mirrors = mirror_content(DRAFT_ROOT, content["id"])
    update_meta(DRAFT_ROOT, int(content.get("duration") or 0))
    results["mirrors"] = mirrors
    results["final_duration_us"] = content.get("duration")
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
