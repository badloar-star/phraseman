#!/usr/bin/env python3
"""Repair current Chains draft intro VO/layers and empty timeline gaps."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
DRAFT_DIR = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft" / DRAFT_NAME
CONTENT_PATH = DRAFT_DIR / "draft_content.json"
META_PATH = DRAFT_DIR / "draft_meta_info.json"
TMP_PATH = DRAFT_DIR / "template-2.tmp"
INTRO_RESOURCE_DIR = DRAFT_DIR / "Resources" / "chains_intro_semantic"
ASSET_DIR = Path("exports/chains/episode1/unique_explanations_approved")
INTRO_AUDIO_DIR = ASSET_DIR / "intro_netflix_doc_voice"
REPORT_PATH = ASSET_DIR / "repair_intro_vo_cta_gaps_report.json"
INTRO_VO_TEXT = (
    "Ð¡ÐµÐ³Ð¾Ð´Ð½Ñ Ð¼Ñ‹ ÑÐ¾Ð±Ð¸Ñ€Ð°ÐµÐ¼ Ð°Ð½Ð³Ð»Ð¸Ð¹ÑÐºÐ¸Ðµ Ñ„Ñ€Ð°Ð·Ñ‹ Ð¼ÐµÑ‚Ð¾Ð´Ð¾Ð¼ Ñ†ÐµÐ¿Ð¾Ñ‡ÐµÐº. "
    "Ð—Ð´ÐµÑÑŒ Ð½Ðµ Ð±ÑƒÐ´ÐµÑ‚ Ð»Ð¸ÑˆÐ½ÐµÐ¹ Ñ‚ÐµÐ¾Ñ€Ð¸Ð¸ Ð¸ Ñ‚ÑÐ¶ÐµÐ»Ñ‹Ñ… Ñ‚Ð°Ð±Ð»Ð¸Ñ†. "
    "Ð¯Ð·Ñ‹Ðº Ð½Ðµ ÑƒÑ‡Ð°Ñ‚ Ð¾Ñ‚Ð´ÐµÐ»ÑŒÐ½Ñ‹Ð¼Ð¸ ÑÐ»Ð¾Ð²Ð°Ð¼Ð¸. Ð•Ð³Ð¾ ÑÐ¾Ð±Ð¸Ñ€Ð°ÑŽÑ‚ ÑÐ¼Ñ‹ÑÐ»Ð¾Ð¼. "
    "Ð¡Ð½Ð°Ñ‡Ð°Ð»Ð° Ñ‚Ñ‹ ÑÐ»Ñ‹ÑˆÐ¸ÑˆÑŒ Ð´ÐµÐ¹ÑÑ‚Ð²Ð¸Ðµ. ÐŸÐ¾Ñ‚Ð¾Ð¼ Ð´Ð¾Ð±Ð°Ð²Ð»ÑÐµÑ‚ÑÑ Ð¿Ñ€Ð¸Ñ‡Ð¸Ð½Ð°. "
    "Ð—Ð°Ñ‚ÐµÐ¼ Ð²Ñ€ÐµÐ¼Ñ. Ð—Ð°Ñ‚ÐµÐ¼ Ð¼ÐµÑÑ‚Ð¾. "
    "ÐšÐ°Ð¶Ð´Ñ‹Ð¹ Ð½Ð¾Ð²Ñ‹Ð¹ ÐºÑƒÑÐ¾Ðº Ð¾Ñ‚Ð²ÐµÑ‡Ð°ÐµÑ‚ Ð½Ð° Ð¿Ñ€Ð¾ÑÑ‚Ð¾Ð¹ Ð²Ð¾Ð¿Ñ€Ð¾Ñ Ð¸ Ð´ÐµÐ»Ð°ÐµÑ‚ Ñ„Ñ€Ð°Ð·Ñƒ Ð¿Ð¾Ð½ÑÑ‚Ð½ÐµÐµ. "
    "Ð¡Ð»ÑƒÑˆÐ°Ð¹ Ð²Ð½Ð¸Ð¼Ð°Ñ‚ÐµÐ»ÑŒÐ½Ð¾, Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€ÑÐ¹ Ð²ÑÐ»ÑƒÑ…, Ð¸ Ð´Ð»Ð¸Ð½Ð½Ð°Ñ ÑÑ‚Ñ€Ð¾ÐºÐ° Ð½Ð°Ñ‡Ð½ÐµÑ‚ ÑÐ¾Ð±Ð¸Ñ€Ð°Ñ‚ÑŒÑÑ ÑÐ°Ð¼Ð°, ÑˆÐ°Ð³ Ð·Ð° ÑˆÐ°Ð³Ð¾Ð¼."
)
INTRO_TARGET_US = 44_000_000
CTA_TRACK_NAME = "CODEx CTA VENGA SOURCE"


def gid() -> str:
    return str(uuid.uuid4()).upper()


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


def load_env() -> dict[str, str]:
    env = dict(os.environ)
    for path in (Path(".env.local"), Path(".env")):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env.setdefault(key.strip(), value.strip().strip('"'))
    return env


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def backup() -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.backup-before-intro-vo-cta-gap-repair-{stamp}"
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(DRAFT_DIR, out)
    return out


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return 0.0
    return float(result.stdout.strip())


def openai_tts(api_key: str, text: str, out_path: Path) -> None:
    if out_path.exists() and out_path.stat().st_size > 100_000:
        return
    payload = json.dumps(
        {
            "model": "gpt-4o-mini-tts",
            "voice": "marin",
            "input": text,
            "response_format": "mp3",
            "instructions": (
                "Speak Russian with a warm native Moscow-neutral documentary narrator voice. "
                "Serious, cinematic, clear, no Ukrainian accent, no rushed ending. "
                "Fit the delivery into about forty seconds."
            ),
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        out_path.write_bytes(response.read())


def fit_audio_to_intro(source: Path, target: Path) -> Path:
    duration = ffprobe_duration(source)
    if not duration:
        raise RuntimeError(f"Cannot probe intro VO duration: {source}")
    if duration <= 43.2:
        return source
    ratio = min(1.22, duration / 42.5)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(source),
            "-filter:a",
            f"atempo={ratio:.6f}",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "192k",
            str(target),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return target


def timerange(segment: dict[str, Any]) -> tuple[int, int]:
    tr = segment.get("target_timerange", {}) or {}
    start = int(tr.get("start", 0))
    return start, start + int(tr.get("duration", 0))


def material_by_id(materials: dict[str, Any], material_id: str) -> dict[str, Any] | None:
    for group in materials.values():
        if isinstance(group, list):
            for material in group:
                if isinstance(material, dict) and material.get("id") == material_id:
                    return material
    return None


def find_intro_draft(content: dict[str, Any]) -> dict[str, Any]:
    for material in content.get("materials", {}).get("drafts", []):
        draft = material.get("draft", {})
        if int(draft.get("duration", 0)) >= 40_000_000 and any(
            track.get("name") == "CODEx INTRO SUPPORT TEXT" for track in draft.get("tracks", [])
        ):
            return draft
    raise RuntimeError("Intro nested draft with CODEx INTRO SUPPORT TEXT not found.")


def make_audio_material(template: dict[str, Any], path: Path, duration_us: int) -> dict[str, Any]:
    material = json.loads(json.dumps(template))
    material["id"] = gid()
    material["unique_id"] = gid()
    material["local_material_id"] = gid().lower()
    material["path"] = str(path)
    material["name"] = path.name
    material["material_name"] = path.name
    material["duration"] = duration_us
    return material


def clone_track(template: dict[str, Any], name: str, segments: list[dict[str, Any]]) -> dict[str, Any]:
    track = json.loads(json.dumps(template))
    track["id"] = gid()
    track["name"] = name
    track["is_default_name"] = False
    track["segments"] = segments
    return track


def clean_intro_layers(content: dict[str, Any], audio_path: Path, audio_duration_us: int) -> dict[str, Any]:
    intro = find_intro_draft(content)
    tracks = intro.get("tracks", [])
    main_video = next(
        (
            track
            for track in tracks
            if track.get("type") == "video"
            and len(track.get("segments", [])) == 7
            and all(
                "intro_rendered_" in str(material_by_id(intro.get("materials", {}), segment.get("material_id")) or {})
                for segment in track.get("segments", [])
            )
        ),
        None,
    )
    text_track = next((track for track in tracks if track.get("name") == "CODEx INTRO SUPPORT TEXT"), None)
    audio_template_track = next((track for track in tracks if track.get("type") == "audio" and track.get("segments")), None)
    if main_video is None or text_track is None or audio_template_track is None:
        raise RuntimeError("Intro template tracks missing.")
    audio_template_segment = audio_template_track["segments"][0]
    audio_template_material = material_by_id(intro.get("materials", {}), audio_template_segment.get("material_id"))
    if audio_template_material is None:
        raise RuntimeError("Intro audio template material missing.")

    intro.get("materials", {}).setdefault("audios", [])
    target_audio = INTRO_RESOURCE_DIR / audio_path.name
    shutil.copy2(audio_path, target_audio)
    audio_material = make_audio_material(audio_template_material, target_audio, audio_duration_us)
    intro["materials"]["audios"].append(audio_material)
    audio_segment = json.loads(json.dumps(audio_template_segment))
    audio_segment["id"] = gid()
    audio_segment["material_id"] = audio_material["id"]
    audio_segment["target_timerange"] = {"start": 0, "duration": min(audio_duration_us, INTRO_TARGET_US)}
    audio_segment["source_timerange"] = {"start": 0, "duration": min(audio_duration_us, INTRO_TARGET_US)}
    audio_segment["volume"] = 1.0
    audio_segment["last_nonzero_volume"] = 1.0

    empty_video_tracks = [track for track in tracks if track.get("type") == "video" and not track.get("segments")]
    intro["tracks"] = [
        *empty_video_tracks[:1],
        main_video,
        clone_track(audio_template_track, "CODEx INTRO VO NETFLIX DOC", [audio_segment]),
        text_track,
    ]
    intro["duration"] = INTRO_TARGET_US

    old_refs = []
    for track in intro["tracks"]:
        for segment in track.get("segments", []):
            material = material_by_id(intro.get("materials", {}), segment.get("material_id")) or {}
            name_blob = json.dumps(material, ensure_ascii=False)
            if any(token in name_blob for token in ("chains_ep01_intro_ru_11labs", "intro_slot.wav", "outro_slot.wav")):
                old_refs.append(material.get("name") or material.get("path"))
    return {
        "intro_tracks_after": [(track.get("type"), track.get("name", ""), len(track.get("segments", []))) for track in intro["tracks"]],
        "old_intro_refs_remaining": old_refs,
    }


def cta_clusters(content: dict[str, Any]) -> list[tuple[int, int]]:
    intervals: list[tuple[int, int]] = []
    for track in content.get("tracks", []):
        if track.get("name") == CTA_TRACK_NAME:
            intervals.extend(timerange(segment) for segment in track.get("segments", []))
    clusters: list[list[tuple[int, int]]] = []
    for interval in sorted(intervals):
        if not clusters or interval[0] - min(start for start, _ in clusters[-1]) > 90_000_000:
            clusters.append([interval])
        else:
            clusters[-1].append(interval)
    return [(min(s for s, _ in cluster), max(e for _, e in cluster)) for cluster in clusters]


def overlaps_any(start: int, end: int, intervals: list[tuple[int, int]]) -> bool:
    return any(start < b and a < end for a, b in intervals)


def close_non_cta_gaps(content: dict[str, Any]) -> dict[str, Any]:
    primary = content.get("tracks", [])[0]
    intervals = sorted(timerange(segment) for segment in primary.get("segments", []))
    clusters = cta_clusters(content)
    gaps_to_remove = []
    for (_, left_end), (right_start, _) in zip(intervals, intervals[1:]):
        gap = right_start - left_end
        if gap <= 15_000_000:
            continue
        if overlaps_any(left_end, right_start, clusters):
            continue
        remove = max(0, gap - 500_000)
        if remove:
            gaps_to_remove.append((left_end, right_start, remove))
    if not gaps_to_remove:
        return {"removed_empty_gaps": []}

    shifted = 0
    for track in content.get("tracks", []):
        for segment in track.get("segments", []):
            tr = segment.get("target_timerange")
            if not isinstance(tr, dict):
                continue
            start = int(tr.get("start", 0))
            delta = sum(remove for _, gap_end, remove in gaps_to_remove if gap_end <= start)
            if delta:
                tr["start"] = max(0, start - delta)
                shifted += 1

    max_end = 0
    for track in content.get("tracks", []):
        for segment in track.get("segments", []):
            max_end = max(max_end, timerange(segment)[1])
    content["duration"] = max_end
    return {
        "removed_empty_gaps": gaps_to_remove,
        "shifted_segments_for_empty_gap_close": shifted,
        "cta_clusters_after": cta_clusters(content),
    }


def collect_paths(value: Any, paths: list[str]) -> None:
    if isinstance(value, dict):
        for key, item in value.items():
            if key in {"path", "media_path", "cover_path", "source_path", "file_path"} and isinstance(item, str):
                paths.extend(part for part in item.split(";") if part)
            else:
                collect_paths(item, paths)
    elif isinstance(value, list):
        for item in value:
            collect_paths(item, paths)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close CapCut before repairing intro VO and CTA gaps.")
    env = load_env()
    api_key = env.get("OPENAI_TTS_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_TTS_API_KEY is required in .env.local for the new intro voiceover.")

    INTRO_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    raw_audio = INTRO_AUDIO_DIR / "chains_intro_netflix_doc_vo_raw.mp3"
    fitted_audio = INTRO_AUDIO_DIR / "chains_intro_netflix_doc_vo_fit.mp3"
    openai_tts(api_key, INTRO_VO_TEXT, raw_audio)
    final_audio = fit_audio_to_intro(raw_audio, fitted_audio)
    audio_duration_us = int(round(ffprobe_duration(final_audio) * 1_000_000))

    backup_path = backup()
    content = read_json(CONTENT_PATH)
    intro_report = clean_intro_layers(content, final_audio, audio_duration_us)
    gap_report = close_non_cta_gaps(content)

    write_json(CONTENT_PATH, content)
    if TMP_PATH.exists():
        write_json(TMP_PATH, content)
    meta = read_json(META_PATH)
    meta["tm_duration"] = content.get("duration")
    write_json(META_PATH, meta)

    paths: list[str] = []
    collect_paths(content, paths)
    missing = [
        path
        for path in sorted(set(paths))
        if (":" in path or path.startswith("\\\\"))
        and not Path(path).exists()
    ]
    report = {
        "backup": str(backup_path),
        "draft_dir": str(DRAFT_DIR),
        "intro_voiceover_text": INTRO_VO_TEXT,
        "intro_voiceover_path": str(final_audio),
        "intro_voiceover_duration_us": audio_duration_us,
        "intro": intro_report,
        "gaps": gap_report,
        "draft_duration": content.get("duration"),
        "missing_paths": len(missing),
        "first_missing_paths": missing[:5],
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if intro_report["old_intro_refs_remaining"]:
        raise SystemExit("Old intro audio/video references remain.")
    if missing:
        raise SystemExit("Missing media paths remain.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
