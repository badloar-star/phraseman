#!/usr/bin/env python3
"""Build two openable native CapCut drafts for Chains 800 unique v3."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from copy import deepcopy
from pathlib import Path
from typing import Any

from build_chains_800_capcut_project import (
    US,
    backup_source,
    capcut_is_open,
    capcut_root,
    clone_material,
    clone_segment,
    compute_duration,
    get_materials,
    gid,
    load_json,
    localize_copied_project_paths,
    set_text,
    update_meta,
    write_json,
    write_pretty,
)


SOURCE_DRAFT = "CHAINS_EP01_EN_OPENAI_DIRECT_BG 20260601_214833"
TARGET_BASE = "CHAINS_800_UNIQUE_V3_OPENAI_PART"
PACK = Path("exports/chains/phrase_packs/chains_800_unique_v3_20260604")
ROWS_PATH = PACK / "chains_800_unique_phrases.json"
TEXT_MANIFEST_PATH = PACK / "screen_texts" / "chains_unique_v3_screen_text_manifest.json"
AUDIO_TIMING_PATH = PACK / "openai_audio" / "chains_unique_v3_audio_timing_manifest.json"
INTRO_PREVIEW = PACK / "intro_assets" / "chains_unique_v3_intro_preview_voice_text.mp4"
INTRO_VOICE = PACK / "intro_assets" / "voice" / "chains_unique_v3_intro_openai_marin.mp3"
REPORT_PATH = PACK / "capcut_build" / "chains_unique_v3_capcut_parts_report.json"
INTRO_GAP_US = 0
ROW_GAP_US = 0
MID_GAP_US = 0
CTA_GAP_US = 0
CTA_DUR_US = 20_100_000


def unique_target(base: str) -> Path:
    root = capcut_root()
    stamp = time.strftime("%Y%m%d_%H%M%S")
    target = root / f"{base}_{stamp}"
    if target.exists():
        return root / f"{base}_{stamp}_{gid()[:6]}"
    return target


def ffprobe_duration_us(path: Path) -> int:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {completed.stderr[:500]}")
    return int(round(float(completed.stdout.strip()) * US))


def localize_asset(target: Path, src: Path, folder: str) -> Path:
    dst = target / "Resources" / folder / src.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists() or dst.stat().st_size != src.stat().st_size:
        shutil.copy2(src, dst)
    return dst


def load_maps() -> tuple[list[dict[str, Any]], dict[int, dict[str, Any]], dict[int, dict[str, Any]]]:
    rows = load_json(ROWS_PATH)
    text_items = {int(item["index"]): item for item in load_json(TEXT_MANIFEST_PATH)["items"]}
    timing_items = {int(item["index"]): item for item in load_json(AUDIO_TIMING_PATH)["rows"]}
    if len(rows) != 800 or len(text_items) != 800 or len(timing_items) != 800:
        raise RuntimeError("need 800 rows/text/timing items")
    return rows, text_items, timing_items


def update_intro(content: dict[str, Any], target: Path) -> int:
    if not INTRO_PREVIEW.exists():
        raise RuntimeError(f"missing intro preview: {INTRO_PREVIEW}")
    if not INTRO_VOICE.exists():
        raise RuntimeError(f"missing intro voice: {INTRO_VOICE}")
    local_intro = localize_asset(target, INTRO_PREVIEW, "chains_unique_v3_intro")
    local_voice = localize_asset(target, INTRO_VOICE, "chains_unique_v3_intro")
    duration = ffprobe_duration_us(local_intro)
    voice_duration = ffprobe_duration_us(local_voice)
    intro_seg = content["tracks"][6]["segments"][0]
    video_template = get_materials(content, "videos")[content["tracks"][0]["segments"][0]["material_id"]]
    intro_mat = clone_material(video_template, local_intro, duration)
    intro_mat.update({"media_path": str(local_intro), "has_audio": False, "width": 1920, "height": 1080})
    content["materials"]["videos"].append(intro_mat)
    intro_seg["material_id"] = intro_mat["id"]
    intro_seg["target_timerange"] = {"start": 0, "duration": duration}
    intro_seg["source_timerange"] = {"start": 0, "duration": duration}
    intro_seg["volume"] = 0.0
    audio_template_track = next(track for track in content["tracks"] if track.get("type") == "audio" and track.get("segments"))
    audio_template_seg = audio_template_track["segments"][0]
    audio_template_mat = get_materials(content, "audios")[audio_template_seg["material_id"]]
    voice_mat = clone_material(audio_template_mat, local_voice, voice_duration)
    voice_mat.update({"name": local_voice.name, "material_name": local_voice.name})
    content["materials"]["audios"].append(voice_mat)
    intro_audio_track = deepcopy(audio_template_track)
    intro_audio_track["id"] = gid()
    intro_audio_track["name"] = "CODEx UNIQUE V3 INTRO VOICE"
    intro_audio_track["segments"] = [clone_segment(audio_template_seg, voice_mat["id"], 0, voice_duration, voice_duration)]
    content["tracks"].append(intro_audio_track)
    return duration


def add_text_segment(
    content: dict[str, Any],
    track_idx: int,
    template_seg: dict[str, Any],
    template_mat: dict[str, Any],
    text: str,
    start: int,
    duration: int,
) -> None:
    mat = clone_material(template_mat)
    set_text(mat, text)
    content["materials"]["texts"].append(mat)
    content["tracks"][track_idx]["segments"].append(clone_segment(template_seg, mat["id"], start, duration))


def add_audio_segment(
    content: dict[str, Any],
    target: Path,
    track_idx: int,
    template_seg: dict[str, Any],
    template_mat: dict[str, Any],
    event: dict[str, Any],
    start: int,
) -> None:
    src = Path(event["path"])
    if not src.exists():
        raise RuntimeError(f"missing audio source: {src}")
    local = localize_asset(target, src, f"chains_unique_v3_openai_audio/{event['role']}")
    duration = int(round(float(event["duration_sec"]) * US))
    mat = clone_material(template_mat, local, duration)
    content["materials"]["audios"].append(mat)
    content["tracks"][track_idx]["segments"].append(clone_segment(template_seg, mat["id"], start, duration, duration))


def layout_half(
    rows: list[dict[str, Any]],
    timing: dict[int, dict[str, Any]],
    part_name: str,
    start_us: int,
    next_cta_us: int,
) -> tuple[list[dict[str, Any]], int, int, list[int]]:
    infos: list[dict[str, Any]] = []
    ctas: list[int] = []
    cursor = start_us
    for row in rows:
        item = timing[int(row["index"])]
        events = item[part_name]
        duration = int(round(float(item[f"{part_name}_duration_sec"]) * US))
        slot = max(duration + 600_000, 9_000_000)
        infos.append({"row_index": int(row["index"]), "start": cursor, "duration": slot, "events": events})
        cursor += slot + ROW_GAP_US
        if cursor >= next_cta_us:
            ctas.append(cursor + CTA_GAP_US)
            cursor += CTA_DUR_US + CTA_GAP_US * 2
            while next_cta_us <= cursor:
                next_cta_us += 1800 * US
    return infos, cursor, next_cta_us, ctas


def shift_middle(content: dict[str, Any], mid_start: int) -> int:
    mid_video_dur = int(content["tracks"][7]["segments"][0]["target_timerange"]["duration"])
    for track_idx in [7, 8, 12, 13]:
        for seg in content["tracks"][track_idx]["segments"]:
            offset = 350_000 if track_idx == 8 else 0
            seg["target_timerange"]["start"] = mid_start + offset
            if seg.get("source_timerange"):
                seg["source_timerange"]["start"] = 0
    return max(mid_video_dur, 9_600_000)


def compute_real_duration(content: dict[str, Any]) -> int:
    end = 0
    for track_index, track in enumerate(content.get("tracks", [])):
        if track_index == 1:
            continue
        for seg in track.get("segments", []):
            tr = seg.get("target_timerange") or {}
            end = max(end, int(tr.get("start", 0)) + int(tr.get("duration", 0)))
    return end


def add_cta_tracks_dense(content: dict[str, Any], template_tracks: list[dict[str, Any]], cta_times: list[int]) -> None:
    if not template_tracks:
        return
    if not any(track.get("segments") for track in template_tracks):
        return
    new_tracks = []
    for track in template_tracks:
        new_track = deepcopy(track)
        new_track["id"] = gid()
        new_track["segments"] = []
        new_tracks.append(new_track)
    for cta_start in cta_times:
        for new_track, template_track in zip(new_tracks, template_tracks, strict=True):
            for seg in template_track.get("segments", [])[:1]:
                original_duration = int(seg["target_timerange"]["duration"])
                # Keep short effect overlays short, but stretch main CTA visuals,
                # text, and audio so CTA never leaves a black visual tail.
                duration = original_duration if template_track.get("type") == "video" and not template_track.get("name") else CTA_DUR_US
                new_track["segments"].append(clone_segment(seg, seg["material_id"], cta_start, duration, duration))
    content["tracks"].extend(new_tracks)


def build_part(part_number: int, rows: list[dict[str, Any]], text_items: dict[int, dict[str, Any]], timing: dict[int, dict[str, Any]]) -> dict[str, Any]:
    source = capcut_root() / SOURCE_DRAFT
    if not source.exists():
        raise RuntimeError(f"source draft missing: {source}")
    target = unique_target(f"{TARGET_BASE}{part_number}")
    shutil.copytree(source, target)
    lock = target / ".locked"
    if lock.exists():
        lock.unlink()

    content = load_json(target / "draft_content.json")
    localized_paths = localize_copied_project_paths(content, source, target)
    intro_duration = update_intro(content, target)
    text_mats = get_materials(content, "texts")
    audio_mats = get_materials(content, "audios")
    video_templates = content["tracks"][0]["segments"][:400]

    first_ru_template = content["tracks"][2]["segments"][0]
    first_ipa_template = content["tracks"][3]["segments"][0]
    first_en_template = content["tracks"][4]["segments"][0]
    second_ru_template = content["tracks"][5]["segments"][0]
    second_ipa_template = content["tracks"][2]["segments"][400]
    second_en_template = content["tracks"][3]["segments"][400]
    en1_audio_template = content["tracks"][9]["segments"][0]
    ru_audio_template = content["tracks"][10]["segments"][0]
    en2_audio_template = content["tracks"][11]["segments"][0]
    second_en1_audio_template = content["tracks"][14]["segments"][0]
    second_ru_audio_template = content["tracks"][15]["segments"][0]
    second_en2_audio_template = content["tracks"][16]["segments"][0]
    cta_template_tracks = [deepcopy(track) for track in content["tracks"][17:23]]

    first_en_mat = text_mats[first_en_template["material_id"]]
    first_ru_mat = text_mats[first_ru_template["material_id"]]
    first_ipa_mat = text_mats[first_ipa_template["material_id"]]
    second_ru_mat = text_mats[second_ru_template["material_id"]]
    second_en_mat = text_mats[second_en_template["material_id"]]
    second_ipa_mat = text_mats[second_ipa_template["material_id"]]
    audio_templates = {
        "en1": audio_mats[en1_audio_template["material_id"]],
        "ru": audio_mats[ru_audio_template["material_id"]],
        "en2": audio_mats[en2_audio_template["material_id"]],
        "second_en1": audio_mats[second_en1_audio_template["material_id"]],
        "second_ru": audio_mats[second_ru_audio_template["material_id"]],
        "second_en2": audio_mats[second_en2_audio_template["material_id"]],
    }

    for idx in [0, 2, 3, 4, 5, 9, 10, 11, 14, 15, 16]:
        content["tracks"][idx]["segments"] = []
    intro_tracks = content["tracks"][23:]
    content["tracks"] = content["tracks"][:17] + intro_tracks

    first_start = intro_duration + INTRO_GAP_US
    next_cta = 240 * US
    first_infos, first_end, next_cta, cta_slots = layout_half(rows, timing, "part1", first_start, next_cta)
    mid_start = first_end + MID_GAP_US
    mid_duration = shift_middle(content, mid_start)
    second_start = mid_start + mid_duration + MID_GAP_US
    second_infos, _second_end, _next_cta, second_ctas = layout_half(rows, timing, "part2", second_start, next_cta)
    cta_slots.extend(second_ctas)

    def event_by_role(events: list[dict[str, Any]], role: str) -> dict[str, Any]:
        return next(event for event in events if event["role"] == role)

    for local_i, (info, row) in enumerate(zip(first_infos, rows, strict=True), start=1):
        row_index = int(row["index"])
        start = int(info["start"])
        slot = int(info["duration"])
        texts = text_items[row_index]["part1"]["texts"]
        bg_template = video_templates[(local_i - 1) % len(video_templates)]
        content["tracks"][0]["segments"].append(
            clone_segment(bg_template, bg_template["material_id"], start, slot, min(slot, int(bg_template.get("source_timerange", {}).get("duration", slot))))
        )
        add_text_segment(content, 2, first_ru_template, first_ru_mat, texts["russian_top"], start, slot)
        add_text_segment(content, 3, first_ipa_template, first_ipa_mat, texts["ipa_middle"], start, slot)
        add_text_segment(content, 4, first_en_template, first_en_mat, texts["english_bottom"], start, slot)
        for role, track_idx, seg_template, mat_template in [
            ("en1", 9, en1_audio_template, audio_templates["en1"]),
            ("ru", 10, ru_audio_template, audio_templates["ru"]),
            ("en2", 11, en2_audio_template, audio_templates["en2"]),
        ]:
            event = event_by_role(info["events"], role)
            add_audio_segment(content, target, track_idx, seg_template, mat_template, event, start + int(round(float(event["start_sec"]) * US)))

    for local_i, (info, row) in enumerate(zip(second_infos, rows, strict=True), start=1):
        row_index = int(row["index"])
        start = int(info["start"])
        slot = int(info["duration"])
        texts = text_items[row_index]["part2"]["texts"]
        bg_template = video_templates[(local_i - 1) % len(video_templates)]
        content["tracks"][0]["segments"].append(
            clone_segment(bg_template, bg_template["material_id"], start, slot, min(slot, int(bg_template.get("source_timerange", {}).get("duration", slot))))
        )
        add_text_segment(content, 3, second_en_template, second_en_mat, texts["english_top"], start, slot)
        add_text_segment(content, 2, second_ipa_template, second_ipa_mat, texts["ipa_middle"], start, slot)
        add_text_segment(content, 5, second_ru_template, second_ru_mat, texts["russian_bottom"], start, slot)
        for role, track_idx, seg_template, mat_template in [
            ("ru", 15, second_ru_audio_template, audio_templates["second_ru"]),
            ("en1", 14, second_en1_audio_template, audio_templates["second_en1"]),
            ("en2", 16, second_en2_audio_template, audio_templates["second_en2"]),
        ]:
            event = event_by_role(info["events"], role)
            add_audio_segment(content, target, track_idx, seg_template, mat_template, event, start + int(round(float(event["start_sec"]) * US)))

    add_cta_tracks_dense(content, cta_template_tracks, cta_slots)
    content["duration"] = compute_real_duration(content)
    if content["tracks"][1]["segments"]:
        content["tracks"][1]["segments"][0]["target_timerange"]["duration"] = content["duration"]
    for track in content["tracks"]:
        track["segments"].sort(key=lambda seg: int((seg.get("target_timerange") or {}).get("start", 0)))

    write_json(target / "draft_content.json", content)
    if (target / "template-2.tmp").exists():
        write_json(target / "template-2.tmp", content)
    timeline_dir = target / "Timelines" / str(content["id"])
    if timeline_dir.exists():
        write_json(timeline_dir / "draft_content.json", content)
    update_meta(target, content)
    return {
        "part": part_number,
        "target": str(target),
        "rows": [int(rows[0]["index"]), int(rows[-1]["index"])],
        "duration_us": content["duration"],
        "duration_hours": round(content["duration"] / US / 3600, 3),
        "intro_duration_us": intro_duration,
        "cta_slots": len(cta_slots),
        "localized_copied_project_paths": localized_paths,
        "content_size_mb": round((target / "draft_content.json").stat().st_size / 1024 / 1024, 2),
        "tracks": [{"index": i, "type": track.get("type"), "name": track.get("name"), "segments": len(track.get("segments", []))} for i, track in enumerate(content["tracks"])],
    }


def validate_part(part: dict[str, Any]) -> dict[str, Any]:
    target = Path(part["target"])
    content = load_json(target / "draft_content.json")
    errors: list[str] = []
    timeline_path = target / "Timelines" / str(content.get("id")) / "draft_content.json"
    if not timeline_path.exists():
        errors.append("timeline mirror missing")
    missing = []
    for group in ("videos", "audios", "images"):
        for material in content.get("materials", {}).get(group, []):
            raw = material.get("path") or material.get("media_path")
            if raw and not Path(str(raw)).exists():
                missing.append(str(raw))
    if missing:
        errors.append(f"missing media paths: {len(missing)}")
    for idx in [2, 3, 4, 5, 9, 10, 11, 14, 15, 16]:
        expected = 800 if idx in [2, 3] else 400
        actual = len(content["tracks"][idx].get("segments", []))
        if actual != expected:
            errors.append(f"track {idx} expected {expected}, got {actual}")
    for idx in [9, 10, 11, 14, 15, 16]:
        previous_end = -1
        for seg in sorted(content["tracks"][idx].get("segments", []), key=lambda s: int(s["target_timerange"]["start"])):
            start = int(seg["target_timerange"]["start"])
            duration = int(seg["target_timerange"]["duration"])
            if start < previous_end:
                errors.append(f"audio overlap on track {idx}")
                break
            previous_end = start + duration
    return {"part": part["part"], "error_count": len(errors), "errors": errors, "missing_media_count": len(missing)}


def main() -> int:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close it before editing native draft files.")
    source = capcut_root() / SOURCE_DRAFT
    backup = backup_source(source)
    rows, text_items, timing = load_maps()
    part1 = build_part(1, rows[:400], text_items, timing)
    part2 = build_part(2, rows[400:], text_items, timing)
    validations = [validate_part(part1), validate_part(part2)]
    report = {
        "status": "ready" if all(item["error_count"] == 0 for item in validations) else "failed",
        "source": str(source),
        "backup": str(backup),
        "parts": [part1, part2],
        "validation": validations,
    }
    write_pretty(REPORT_PATH, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "ready" else 1


if __name__ == "__main__":
    raise SystemExit(main())
