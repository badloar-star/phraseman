#!/usr/bin/env python3
"""Add the visible active ElevenLabs intro VO track to the Chains CapCut draft."""

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
SRC = Path("exports/chains/episode1/intro-11labs/chains_ep01_intro_ru_alina_beauty_slot_41s10.wav")
RESOURCE_SUBDIR = "chains_intro_11labs_active"
TRACK_NAME = "INTRO 11LABS ACTIVE"
EXPECTED_DURATION_US = 41_100_000


def capcut_id() -> str:
    return str(uuid.uuid4()).upper()


def draft_root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / DRAFT_NAME


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def probe_duration_us(path: Path) -> int:
    completed = subprocess.run(
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
    return int(round(float(completed.stdout.strip()) * 1_000_000))


def ensure_capcut_closed() -> None:
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -First 1"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if completed.stdout.strip():
        raise RuntimeError("CapCut is open. Close CapCut before writing the draft.")


def content_paths(root: Path, timeline_id: str) -> list[Path]:
    candidates = [
        root / "draft_content.json",
        root / "template-2.tmp",
        root / "draft_content.json.bak",
        root / "Timelines" / timeline_id / "draft_content.json",
    ]
    paths: list[Path] = []
    seen: set[str] = set()
    for path in candidates:
        if path.exists():
            key = str(path.resolve()).casefold()
            if key not in seen:
                paths.append(path)
                seen.add(key)
    return paths


def mirror_root_content(root: Path, timeline_id: str) -> list[str]:
    source = root / "draft_content.json"
    mirrors = [
        root / "template-2.tmp",
        root / "draft_content.json.bak",
        root / "Timelines" / timeline_id / "draft_content.json",
    ]
    written: list[str] = []
    for dst in mirrors:
        if dst.exists():
            shutil.copy2(source, dst)
            written.append(str(dst))
    return written


def backup_project(root: Path) -> Path:
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.json-backup-before-add-visible-intro-11labs-{time.strftime('%Y%m%d_%H%M%S')}"
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
    timelines = root / "Timelines"
    if timelines.exists():
        for content in timelines.glob("*/draft_content.json"):
            rel = content.relative_to(root)
            dst = out / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(content, dst)
    return out


def copy_audio(root: Path) -> Path:
    if not SRC.exists():
        raise RuntimeError(f"Missing intro source: {SRC}")
    out_dir = root / "Resources" / RESOURCE_SUBDIR
    out_dir.mkdir(parents=True, exist_ok=True)
    dst = out_dir / SRC.name
    shutil.copy2(SRC, dst)
    duration = probe_duration_us(dst)
    if abs(duration - EXPECTED_DURATION_US) > 100_000:
        raise RuntimeError(f"Unexpected intro duration: {duration} us")
    return dst


def remove_existing_intro_tracks(draft: dict[str, Any]) -> int:
    removed_materials: set[str] = set()
    kept_tracks: list[dict[str, Any]] = []
    removed = 0
    for track in draft.get("tracks", []):
        if str(track.get("name") or "").startswith(TRACK_NAME):
            removed += 1
            for segment in track.get("segments", []):
                material_id = segment.get("material_id")
                if material_id:
                    removed_materials.add(str(material_id))
            continue
        kept_tracks.append(track)
    draft["tracks"] = kept_tracks
    if removed_materials:
        draft["materials"]["audios"] = [
            item for item in draft["materials"].get("audios", []) if str(item.get("id")) not in removed_materials
        ]
    return removed


def apply_intro_audio(path: Path, audio_path: Path, duration_us: int) -> dict[str, Any]:
    draft = load_json(path)
    removed = remove_existing_intro_tracks(draft)
    draft.setdefault("materials", {}).setdefault("audios", [])

    template_track = next(
        track for track in draft.get("tracks", []) if track.get("type") == "audio" and track.get("segments")
    )
    template_segment = deepcopy(template_track["segments"][0])
    template_material = deepcopy(
        next(item for item in draft["materials"]["audios"] if item["id"] == template_segment["material_id"])
    )

    material_id = capcut_id()
    material = template_material
    material["id"] = material_id
    material["unique_id"] = ""
    material["name"] = audio_path.name
    material["material_name"] = audio_path.name
    material["path"] = str(audio_path)
    material["duration"] = duration_us
    material["wave_points"] = []

    segment = template_segment
    segment["id"] = capcut_id()
    segment["material_id"] = material_id
    segment["source_timerange"] = {"start": 0, "duration": duration_us}
    segment["target_timerange"] = {"start": 0, "duration": duration_us}
    segment["render_timerange"] = {"start": 0, "duration": 0}
    segment["volume"] = 1.0
    segment["last_nonzero_volume"] = 1.0

    track = deepcopy(template_track)
    track["id"] = capcut_id()
    track["name"] = TRACK_NAME
    track["segments"] = [segment]
    render_index = max(int(item.get("render_index") or 0) for item in draft.get("tracks", [])) + 1
    track["render_index"] = render_index
    track["track_render_index"] = render_index
    segment["render_index"] = render_index
    segment["track_render_index"] = render_index

    draft["materials"]["audios"].append(material)
    draft["tracks"].append(track)
    write_json(path, draft)
    return {"path": str(path), "removed": removed, "tracks": len(draft["tracks"])}


def verify(path: Path, duration_us: int) -> dict[str, Any]:
    draft = load_json(path)
    audios = {item["id"]: item for item in draft.get("materials", {}).get("audios", [])}
    found = []
    for index, track in enumerate(draft.get("tracks", [])):
        if str(track.get("name") or "").startswith(TRACK_NAME):
            segment = track.get("segments", [{}])[0]
            material = audios.get(segment.get("material_id"), {})
            found.append(
                {
                    "track_index": index,
                    "track_name": track.get("name"),
                    "target_start": segment.get("target_timerange", {}).get("start"),
                    "target_duration": segment.get("target_timerange", {}).get("duration"),
                    "source_duration": segment.get("source_timerange", {}).get("duration"),
                    "material_duration": material.get("duration"),
                    "path_exists": Path(str(material.get("path", ""))).exists(),
                    "volume": segment.get("volume"),
                }
            )
    bad = [
        item
        for item in found
        if item["target_start"] != 0
        or item["target_duration"] != duration_us
        or item["source_duration"] != duration_us
        or item["material_duration"] != duration_us
        or item["volume"] != 1.0
        or not item["path_exists"]
    ]
    return {"path": str(path), "found": found, "bad": bad}


def main() -> int:
    ensure_capcut_closed()
    root = draft_root()
    if not root.exists():
        raise RuntimeError(f"Draft not found: {root}")
    first_content = load_json(root / "draft_content.json")
    timeline_id = first_content["id"]
    backup = backup_project(root)
    audio_path = copy_audio(root)
    duration_us = probe_duration_us(audio_path)
    root_content_path = root / "draft_content.json"
    patches = [apply_intro_audio(root_content_path, audio_path, duration_us)]
    mirrored_paths = mirror_root_content(root, timeline_id)
    paths = content_paths(root, timeline_id)
    verifications = [verify(path, duration_us) for path in paths]
    report = {
        "draft": str(root),
        "backup": str(backup),
        "audio_path": str(audio_path),
        "duration_us": duration_us,
        "patched_paths": patches,
        "mirrored_paths": mirrored_paths,
        "verifications": verifications,
    }
    out = Path("exports/chains/episode1/unique_explanations_approved/add_visible_intro_11labs_report.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if any(len(item["found"]) != 1 or item["bad"] for item in verifications):
        raise RuntimeError("Intro 11Labs verification failed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
