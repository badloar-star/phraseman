#!/usr/bin/env python3
"""Quality gate for the editable CapCut Chains lesson draft.

This is the real Windows desktop guard behind the Maestro flow marker. Maestro
CLI validates the flow syntax, while this script validates the native CapCut
draft files and media that Maestro cannot control directly on Windows Desktop.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any

from chains_description_quality_rules import validate_description_pack


DEFAULT_DRAFT = Path(
    r"C:\Users\badlo\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft"
    r"\CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
)
DEFAULT_ASSETS = Path(r"exports\chains\episode1\unique_explanations_approved")
DEFAULT_INTRO_MANIFEST = DEFAULT_ASSETS / "intro_semantic_manifest.json"

REQUIRED_TRACK_SEGMENTS = {
    "CODEx construction explanation SCREENSAVER": 50,
    "CODEx construction explanation UNIQUE VO": 50,
}

FORBIDDEN_OLD_CTA_PREFIXES = {
    "CODEx CTA WHITE BG",
    "CODEx CTA HEADLINE",
    "CODEx CTA SUB",
    "CODEx CTA QR",
    "CODEx CTA SFX",
}

PATH_KEYS = {"path", "media_path", "cover_path", "source_path", "file_path"}
MEDIA_EXTS = (".mp4", ".mp3", ".wav", ".png", ".jpg", ".jpeg", ".webp", ".mov")


def is_orphan_text_line(line: str) -> bool:
    stripped = line.strip().strip(".,!?;:«»()[]{}—-–")
    return len(stripped) == 1


def load_json(path: Path, errors: list[str]) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001 - gate report needs exact failure.
        errors.append(f"json parse failed: {path}: {exc}")
        return {}


def capcut_is_open() -> bool:
    try:
        result = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq CapCut.exe"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            check=False,
        )
    except FileNotFoundError:
        return False
    return "CapCut.exe" in result.stdout


def collect_paths(value: Any, paths: list[str]) -> None:
    if isinstance(value, dict):
        for key, item in value.items():
            if isinstance(item, str):
                text = item.strip()
                lower = text.lower()
                looks_like_path = key.lower() in PATH_KEYS or (
                    (":" in text or "\\" in text or "/" in text) and lower.endswith(MEDIA_EXTS)
                )
                if looks_like_path:
                    for part in text.split(";"):
                        part = part.strip()
                        if part and not part.startswith(("http://", "https://")):
                            paths.append(part)
            collect_paths(item, paths)
    elif isinstance(value, list):
        for item in value:
            collect_paths(item, paths)


def ffprobe_ok(path: Path) -> bool:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return False
    return result.returncode == 0


def material_text(material: dict[str, Any]) -> str:
    try:
        return json.loads(str(material.get("content") or "{}")).get("text", "")
    except Exception:  # noqa: BLE001 - malformed text is caught by other gates.
        return str(material.get("base_content") or material.get("text") or "")


def validate_text_materials(content: dict[str, Any], errors: list[str]) -> int:
    text_count = 0
    used_text_material_ids = {
        segment.get("material_id")
        for track in content.get("tracks", [])
        if track.get("type") == "text" or str(track.get("name", "")).startswith("CODEx")
        for segment in track.get("segments", [])
        if segment.get("material_id")
    }
    for material in content.get("materials", {}).get("texts", []):
        if used_text_material_ids and material.get("id") not in used_text_material_ids:
            continue
        text = material_text(material)
        text_count += 1
        upper_text = text.upper()
        for forbidden in (
            "ФРАЗА СОБРАНА",
            "ПОЛНЫЙ ВАРИАНТ",
            "КОРОТКАЯ МЫСЛЬ",
            "ОСНОВА:",
            "ШАГ 1",
            "ШАГ 2",
            "ШАГ 3",
            "ШАГ 4",
        ):
            if forbidden in upper_text:
                errors.append(f"forbidden construction/explanation text found: {text[:160]!r}")
        lowered = text.casefold()
        if "француз" in lowered or "french" in lowered:
            errors.append(f"wrong French text found: {text[:120]}")
        for line in text.replace("\\n", "\n").splitlines():
            stripped = line.strip()
            if is_orphan_text_line(stripped):
                errors.append(f"one-letter text line found: {text[:160]!r}")
            if stripped.upper() in {"AT SCHOOL", "BAD WEATHER", "AFTER WORK"}:
                errors.append(f"standalone debris text found: {text[:160]!r}")
    return text_count


def validate_timed_explanation_assets(assets_dir: Path, errors: list[str]) -> dict[str, Any]:
    validation = load_json(assets_dir / "explanation_validation.json", errors)
    timed = load_json(assets_dir / "timed_explanations.json", errors)
    if validation.get("errors"):
        errors.append(f"explanation_validation errors: {validation.get('errors')!r}")

    timed_blocks = 0
    aligned_blocks = 0
    split_planned_blocks = 0
    authorial_transcript_blocks = 0
    split_voiceover_items = 0
    authorial_voiceover_items = 0
    text_block_errors: list[str] = []
    description_errors = validate_description_pack(timed if isinstance(timed, list) else [], expected_count=50)
    if description_errors:
        errors.extend([f"description quality: {item}" for item in description_errors[:40]])
    for item in timed if isinstance(timed, list) else []:
        provider = str(item.get("tts_provider", ""))
        if "split_ru_en" in provider:
            split_voiceover_items += 1
        elif "authorial_one_voice" in provider:
            authorial_voiceover_items += 1
        elif provider:
            errors.append(f"explanation {item.get('chain_index')} uses unsupported explanation audio provider: {provider}")
        for block in item.get("timed_blocks", []):
            timed_blocks += 1
            if block.get("alignment_source") == "elevenlabs_char":
                aligned_blocks += 1
            if block.get("alignment_source") == "split_ru_en_planned":
                split_planned_blocks += 1
            if block.get("alignment_source") == "authorial_transcript_eleven_char_scaled":
                authorial_transcript_blocks += 1
            if block.get("alignment_source") == "authorial_transcript_edge_word_scaled":
                authorial_transcript_blocks += 1
            if block.get("alignment_source") == "authorial_transcript_edge_word_exact_reveal":
                authorial_transcript_blocks += 1
            lines = str(block.get("text", "")).split("\n")
            if len(lines) > 2:
                text_block_errors.append(f"block has >2 lines: {block.get('text')!r}")
            upper_text = str(block.get("text", "")).upper()
            for forbidden in ("ОСНОВА:", "ФРАЗА СОБРАНА", "ПОЛНЫЙ ВАРИАНТ", "ШАГ 1", "ШАГ 2", "ШАГ 3", "ШАГ 4"):
                if forbidden in upper_text:
                    text_block_errors.append(f"forbidden explanation heading in block: {block.get('text')!r}")
            for line in lines:
                stripped = line.strip()
                if is_orphan_text_line(stripped):
                    text_block_errors.append(f"block has one-letter line: {block.get('text')!r}")
                if len(stripped.split()) > 9:
                    text_block_errors.append(f"block line too dense: {block.get('text')!r}")

    if text_block_errors:
        errors.extend(text_block_errors[:20])
    if len(timed) != 50:
        errors.append(f"expected 50 timed explanations, got {len(timed)}")
    if authorial_voiceover_items != len(timed):
        errors.append(f"expected all explanations to use authorial one-voice audio, got {authorial_voiceover_items}/{len(timed)}")
    if aligned_blocks + split_planned_blocks + authorial_transcript_blocks != timed_blocks:
        errors.append(
            "expected all timed blocks to have an accepted alignment source, "
            f"got elevenlabs_char={aligned_blocks}, split_ru_en_planned={split_planned_blocks}, "
            f"authorial_transcript={authorial_transcript_blocks}, total={timed_blocks}"
        )

    audio_files = sorted((assets_dir / "audio_eleven").glob("*_explanation.mp3"))
    if len(audio_files) != 50:
        errors.append(f"expected 50 explanation mp3 files, got {len(audio_files)}")
    bad_audio = [str(path) for path in audio_files if not ffprobe_ok(path)]
    if bad_audio:
        errors.append(f"bad explanation audio files: {bad_audio[:5]}")

    screensaver = assets_dir / "screensaver_loop" / "chains_explain_screensaver_loop_60s.mp4"
    if not screensaver.exists():
        errors.append(f"screensaver missing: {screensaver}")
    elif not ffprobe_ok(screensaver):
        errors.append(f"screensaver ffprobe failed: {screensaver}")

    authorial_report = assets_dir / "authorial_explanation_assets_report.json"
    if not authorial_report.exists():
        errors.append(f"authorial explanation assets report missing: {authorial_report}")
    else:
        report = load_json(authorial_report, errors)
        if report.get("items") != 50 or report.get("validation") != "passed":
            errors.append(f"authorial explanation assets report is not passed: {report}")

    return {
        "timed_explanations": len(timed) if isinstance(timed, list) else 0,
        "timed_blocks": timed_blocks,
        "elevenlabs_aligned_blocks": aligned_blocks,
        "split_planned_blocks": split_planned_blocks,
        "authorial_transcript_blocks": authorial_transcript_blocks,
        "split_voiceover_items": split_voiceover_items,
        "authorial_voiceover_items": authorial_voiceover_items,
        "explanation_audio_files": len(audio_files),
        "screensaver": str(screensaver),
    }


def text_material_index(content: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        material.get("id"): material
        for material in content.get("materials", {}).get("texts", [])
        if material.get("id")
    }


def validate_explanation_timeline(
    content: dict[str, Any],
    assets_dir: Path,
    errors: list[str],
) -> dict[str, Any]:
    tracks = content.get("tracks", [])
    by_name = {track.get("name"): track for track in tracks if track.get("name")}
    bg_track = by_name.get("CODEx construction explanation SCREENSAVER")
    audio_track = by_name.get("CODEx construction explanation UNIQUE VO")
    word_reveal_track = by_name.get("CODEx construction explanation TRANSCRIPT LINE 1 WORD REVEAL")
    word_reveal_mode = word_reveal_track is not None
    line_tracks = (
        [word_reveal_track]
        if word_reveal_mode
        else [
            by_name.get(f"CODEx construction explanation TRANSCRIPT LINE {index}")
            or by_name.get(f"CODEx construction explanation PERSISTENT TEXT LINE {index}")
            for index in range(1, 6)
        ]
    )
    if not bg_track or not audio_track or any(track is None for track in line_tracks):
        errors.append("one or more explanation tracks are missing")
        return {}

    timed = load_json(assets_dir / "timed_explanations.json", errors)
    if not isinstance(timed, list):
        errors.append("timed_explanations.json is not a list")
        return {}

    bg_segments = bg_track.get("segments", [])
    audio_segments = audio_track.get("segments", [])
    if len(bg_segments) != 50:
        errors.append(f"expected 50 explanation bg segments, got {len(bg_segments)}")
    if len(audio_segments) != 50:
        errors.append(f"expected 50 explanation audio segments, got {len(audio_segments)}")
    transcript_total = 0
    for index, track in enumerate(line_tracks, start=1):
        segments = track.get("segments", []) if track else []
        transcript_total += len(segments)
        ordered = sorted(segments, key=lambda s: int(s.get("target_timerange", {}).get("start", 0)))
        for left, right in zip(ordered, ordered[1:]):
            left_tr = left.get("target_timerange", {})
            right_tr = right.get("target_timerange", {})
            left_end = int(left_tr.get("start", 0)) + int(left_tr.get("duration", 0))
            right_start = int(right_tr.get("start", 0))
            if left_end > right_start + 80_000:
                errors.append(f"transcript line {index} has overlapping segments")
                break

    if len(bg_segments) == len(audio_segments) == len(timed):
        for index, (bg, audio, item) in enumerate(zip(bg_segments, audio_segments, timed), start=1):
            bg_tr = bg.get("target_timerange", {})
            audio_tr = audio.get("target_timerange", {})
            bg_start = int(bg_tr.get("start", 0))
            bg_duration = int(bg_tr.get("duration", 0))
            audio_start = int(audio_tr.get("start", 0))
            audio_duration = int(audio_tr.get("duration", 0))
            expected_audio = int(round(float(item.get("duration_sec", 0)) * 1_000_000))
            tail = bg_start + bg_duration - (audio_start + audio_duration)
            if abs(audio_duration - expected_audio) > 600_000:
                errors.append(f"explanation {index} audio duration does not match generated VO")
            if not (50_000 <= audio_start - bg_start <= 1_000_000):
                errors.append(f"explanation {index} audio does not start close to bg start")
            if not (700_000 <= tail <= 3_000_000):
                errors.append(f"explanation {index} bg duration is not tied to VO length; tail={tail}")

    transcript_failures = 0
    text_by_id = text_material_index(content)
    expected_text_blocks = sum(len(item.get("timed_blocks", [])) for item in timed if isinstance(item, dict))
    if transcript_total != expected_text_blocks:
        errors.append(f"expected transcript segments to match timed blocks: {transcript_total}/{expected_text_blocks}")
    if len(bg_segments) == 50 and all(track is not None for track in line_tracks):
        for exp_index, bg in enumerate(bg_segments):
            bg_tr = bg.get("target_timerange", {})
            bg_start = int(bg_tr.get("start", 0))
            bg_end = bg_start + int(bg_tr.get("duration", 0))
            audio_start = int(audio_segments[exp_index].get("target_timerange", {}).get("start", 0))
            exp_segments = []
            for line_index, track in enumerate(line_tracks, start=1):
                for segment in track.get("segments", []):
                    tr = segment.get("target_timerange", {})
                    start = int(tr.get("start", 0))
                    end = start + int(tr.get("duration", 0))
                    if bg_start <= start < bg_end:
                        exp_segments.append(segment)
                        if start < audio_start - 200_000 or end > bg_end + 80_000:
                            transcript_failures += 1
                        material = text_by_id.get(segment.get("material_id"), {})
                        text = material_text(material)
                        lines = text.splitlines() or [text]
                        if (not word_reveal_mode) and "\n" in text:
                            transcript_failures += 1
                        if word_reveal_mode and (
                            len(lines) > 2
                            or any(is_orphan_text_line(line) for line in lines)
                            or any(len(line.split()) > 9 for line in lines)
                        ):
                            transcript_failures += 1
                        if any(forbidden in text.upper() for forbidden in ("ОСНОВА:", "ФРАЗА СОБРАНА", "ПОЛНЫЙ ВАРИАНТ")):
                            transcript_failures += 1
            if not exp_segments:
                transcript_failures += 1
    if transcript_failures:
        errors.append(f"authorial transcript text gate failed: {transcript_failures} issue(s)")

    return {
        "explanation_bg_segments": len(bg_segments),
        "explanation_audio_segments": len(audio_segments),
        "explanation_transcript_text_segments": transcript_total,
    }


def intervals_overlap(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    return a_start < b_end and b_start < a_end


def validate_cta_gaps(content: dict[str, Any], errors: list[str]) -> dict[str, Any]:
    tracks = content.get("tracks", [])
    cta_intervals: list[tuple[int, int]] = []
    for track in tracks:
        if track.get("name") == "CODEx CTA VENGA SOURCE":
            for segment in track.get("segments", []):
                tr = segment.get("target_timerange", {})
                start = int(tr.get("start", 0))
                cta_intervals.append((start, start + int(tr.get("duration", 0))))
    if not cta_intervals:
        errors.append("no transferred VENGA CTA intervals found")
        return {"cta_clusters": 0}

    cta_intervals.sort()
    clusters: list[list[tuple[int, int]]] = []
    for interval in cta_intervals:
        if not clusters or interval[0] - min(start for start, _ in clusters[-1]) > 90_000_000:
            clusters.append([interval])
        else:
            clusters[-1].append(interval)
    if len(clusters) != 3:
        errors.append(f"expected exactly 3 CTA clusters, got {len(clusters)}")

    cluster_ranges = [
        (min(start for start, _ in cluster), max(end for _, end in cluster))
        for cluster in clusters
    ]
    for index, (start, end) in enumerate(cluster_ranges, start=1):
        duration = end - start
        if not (18_000_000 <= duration <= 23_000_000):
            errors.append(f"CTA cluster {index} duration is not VENGA-like: {duration}")

    phrase_intervals: list[tuple[int, int]] = []
    for track in tracks:
        if track.get("name"):
            continue
        segments = track.get("segments", [])
        if len(segments) < 80:
            continue
        for segment in segments:
            tr = segment.get("target_timerange", {})
            start = int(tr.get("start", 0))
            duration = int(tr.get("duration", 0))
            if duration <= 45_000_000:
                phrase_intervals.append((start, start + duration))

    overlaps = 0
    for cta_start, cta_end in cluster_ranges:
        if any(intervals_overlap(cta_start, cta_end, p_start, p_end) for p_start, p_end in phrase_intervals):
            overlaps += 1
    if overlaps:
        errors.append(f"CTA overlaps primary phrase material in {overlaps} cluster(s)")

    return {"cta_clusters": len(clusters), "cta_cluster_ranges": cluster_ranges}


def validate_intro_semantic_manifest(manifest_path: Path, errors: list[str]) -> dict[str, Any]:
    if not manifest_path.exists():
        errors.append(f"intro semantic manifest missing: {manifest_path}")
        return {"intro_semantic_manifest": "missing"}
    manifest = load_json(manifest_path, errors)
    if manifest.get("status") != "approved":
        errors.append("intro semantic manifest status is not approved")
    shots = manifest.get("shots", [])
    if len(shots) < 4:
        errors.append(f"intro semantic manifest must contain at least 4 shots, got {len(shots)}")
    for index, shot in enumerate(shots, start=1):
        shot_text = " ".join(
            str(shot.get(key, ""))
            for key in ("voiceover_phrase", "direct_visual_association", "search_query", "used_query")
        ).casefold()
        if "короткая мысль" in shot_text:
            errors.append(f"intro shot {index} uses forbidden weak wording 'короткая мысль'")
        if not shot.get("voiceover_phrase"):
            errors.append(f"intro shot {index} missing voiceover_phrase")
        if not shot.get("direct_visual_association"):
            errors.append(f"intro shot {index} missing direct_visual_association")
        asset = shot.get("asset_path")
        if not asset or not Path(asset).exists():
            errors.append(f"intro shot {index} asset missing: {asset}")
        if float(shot.get("semantic_score", 0)) < 0.9:
            errors.append(f"intro shot {index} semantic_score below 0.9")
    return {"intro_semantic_manifest": str(manifest_path), "intro_shots": len(shots)}


def validate_timeline_service_content(
    draft_dir: Path,
    content: dict[str, Any],
    errors: list[str],
) -> dict[str, Any]:
    content_id = content.get("id")
    if not content_id:
        return {"timeline_service_content": "skipped_no_content_id"}
    timeline_content_path = draft_dir / "Timelines" / str(content_id) / "draft_content.json"
    if not timeline_content_path.exists():
        errors.append(f"Timelines/{content_id}/draft_content.json missing")
        return {"timeline_service_content": "missing"}
    timeline_content = load_json(timeline_content_path, errors)
    checks = {
        "path": str(timeline_content_path),
        "root_id": content.get("id"),
        "timeline_id": timeline_content.get("id"),
        "root_duration": content.get("duration"),
        "timeline_duration": timeline_content.get("duration"),
        "root_track_count": len(content.get("tracks", [])),
        "timeline_track_count": len(timeline_content.get("tracks", [])),
    }
    if checks["root_id"] != checks["timeline_id"]:
        errors.append("timeline service draft_content.id differs from root draft_content.id")
    if checks["root_duration"] != checks["timeline_duration"]:
        errors.append("timeline service draft_content.duration differs from root draft_content.duration")
    if checks["root_track_count"] != checks["timeline_track_count"]:
        errors.append(
            "timeline service draft_content track count differs from root "
            f"({checks['timeline_track_count']} != {checks['root_track_count']})"
        )
    return checks


def validate_draft(
    draft_dir: Path,
    assets_dir: Path,
    require_capcut_closed: bool,
    intro_manifest: Path,
    require_intro_semantic_gate: bool,
    require_explanation_gate: bool,
) -> dict[str, Any]:
    errors: list[str] = []
    if require_capcut_closed and capcut_is_open():
        errors.append("CapCut is open. Close CapCut before validating/editing the draft.")

    content = load_json(draft_dir / "draft_content.json", errors)
    meta = load_json(draft_dir / "draft_meta_info.json", errors)
    layout = load_json(draft_dir / "timeline_layout.json", errors)
    biz = load_json(draft_dir / "draft_biz_config.json", errors)
    root = load_json(draft_dir.parent / "root_meta_info.json", errors)

    template_path = draft_dir / "template-2.tmp"
    if not template_path.exists():
        errors.append("template-2.tmp missing")
    elif (draft_dir / "draft_content.json").read_bytes() != template_path.read_bytes():
        errors.append("draft_content.json != template-2.tmp")

    content_id = content.get("id")
    if not content_id:
        errors.append("draft_content.id missing")
    if not content.get("duration"):
        errors.append("draft_content.duration zero/missing")
    if not meta.get("tm_duration"):
        errors.append("draft_meta_info.tm_duration zero/missing")

    layout_text = json.dumps(layout, ensure_ascii=False)
    biz_text = json.dumps(biz, ensure_ascii=False)
    root_text = json.dumps(root, ensure_ascii=False)
    if content_id and content_id not in layout_text:
        errors.append("draft_content.id not referenced in timeline_layout.json")
    if content_id and content_id not in biz_text:
        errors.append("draft_content.id not referenced in draft_biz_config.json")
    if content_id and not (draft_dir / "Timelines" / content_id).exists():
        errors.append(f"Timelines/{content_id} missing")
    for token in (draft_dir.name, meta.get("draft_id", "")):
        if token and token not in root_text:
            errors.append(f"root_meta_info does not contain {token}")

    tracks = content.get("tracks", [])
    track_counts = Counter(track.get("name", "") for track in tracks for _ in track.get("segments", []))
    if require_explanation_gate:
        for name, expected in REQUIRED_TRACK_SEGMENTS.items():
            if track_counts[name] != expected:
                errors.append(f"{name} count {track_counts[name]} != {expected}")
    else:
        remaining_explanation_tracks = [
            track.get("name")
            for track in tracks
            if str(track.get("name", "")).startswith("CODEx construction explanation")
        ]
        if remaining_explanation_tracks:
            errors.append(f"explanation tracks should be removed: {remaining_explanation_tracks[:5]}")
    for prefix in FORBIDDEN_OLD_CTA_PREFIXES:
        if any(track.get("name", "").startswith(prefix) for track in tracks):
            errors.append(f"old self-made CTA track still present: {prefix}")

    cta_tracks = [track for track in tracks if track.get("name") == "CODEx CTA VENGA SOURCE"]
    if len(cta_tracks) < 10:
        errors.append(f"expected transferred VENGA CTA tracks >=10, got {len(cta_tracks)}")

    text_count = validate_text_materials(content, errors)

    if any(track.get("name") == "CODEx construction explanation TIMED TEXT" for track in tracks):
        errors.append("old disappearing TIMED TEXT explanation track is still present")

    paths: list[str] = []
    collect_paths(content, paths)
    missing_paths = []
    for raw_path in sorted(set(paths)):
        if not (":" in raw_path or raw_path.startswith("\\\\")):
            continue
        if not Path(raw_path).exists():
            missing_paths.append(raw_path)
    if missing_paths:
        errors.append(f"missing_paths {len(missing_paths)} first={missing_paths[:5]}")

    if require_explanation_gate:
        asset_summary = validate_timed_explanation_assets(assets_dir, errors)
        explanation_timeline_summary = validate_explanation_timeline(content, assets_dir, errors)
    else:
        asset_summary = {"timed_explanations": "skipped"}
        explanation_timeline_summary = {"explanation_timeline": "removed_by_request"}
    cta_gap_summary = validate_cta_gaps(content, errors)
    intro_summary = (
        validate_intro_semantic_manifest(intro_manifest, errors)
        if require_intro_semantic_gate
        else {"intro_semantic_manifest": "skipped"}
    )
    timeline_service_summary = validate_timeline_service_content(draft_dir, content, errors)

    return {
        "passed": not errors,
        "errors": errors,
        "draft_dir": str(draft_dir),
        "assets_dir": str(assets_dir),
        "draft_content_id": content_id,
        "draft_duration": content.get("duration"),
        "meta_tm_duration": meta.get("tm_duration"),
        "track_objects": len(tracks),
        "required_track_counts": {name: track_counts[name] for name in REQUIRED_TRACK_SEGMENTS},
        "cta_track_objects": len(cta_tracks),
        "missing_paths": len(missing_paths),
        "text_materials": text_count,
        "asset_summary": asset_summary,
        "explanation_timeline_summary": explanation_timeline_summary,
        "cta_gap_summary": cta_gap_summary,
        "intro_summary": intro_summary,
        "timeline_service_summary": timeline_service_summary,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the CapCut Chains editable draft.")
    parser.add_argument("--draft-dir", type=Path, default=DEFAULT_DRAFT)
    parser.add_argument("--assets-dir", type=Path, default=DEFAULT_ASSETS)
    parser.add_argument(
        "--report",
        type=Path,
        default=DEFAULT_ASSETS / "capcut_chains_quality_gate_report.json",
    )
    parser.add_argument("--intro-manifest", type=Path, default=DEFAULT_INTRO_MANIFEST)
    parser.add_argument("--skip-intro-semantic-gate", action="store_true")
    parser.add_argument("--skip-explanation-gate", action="store_true")
    parser.add_argument("--allow-capcut-open", action="store_true")
    args = parser.parse_args()

    result = validate_draft(
        args.draft_dir,
        args.assets_dir,
        not args.allow_capcut_open,
        args.intro_manifest,
        not args.skip_intro_semantic_gate,
        not args.skip_explanation_gate,
    )
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
