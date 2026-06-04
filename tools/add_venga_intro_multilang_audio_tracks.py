#!/usr/bin/env python3
"""Add muted multilingual intro ElevenLabs audio tracks to the current CapCut draft."""

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


PROJECT = "VENGA A1 200 RU FR VSSCP BUBBLEBLUR SAFEWRAP"
TIMELINE_ID = "B9D7525D-D806-4014-AFA3-401A3BD3B10C"
INTRO_AUDIO_NAME = "ElevenLabs_2026-05-31T11_22_41_ALINA BEAUTY_gen_sp100_s50_sb75_se0_b_m2.mp3"
INTRO_DURATION_US = 19_833_333
SRC_DIR = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/intro-multilang-11labs")
RESOURCE_SUBDIR = "venga_intro_multilang_11labs"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def capcut_id() -> str:
    return str(uuid.uuid4()).upper()


def project_root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / PROJECT


def content_paths(root: Path) -> list[Path]:
    paths = [root / "draft_content.json"]
    for rel in ["template-2.tmp", "draft_content.json.bak"]:
        path = root / rel
        if path.exists():
            paths.append(path)
    paths.extend((root / "Timelines").rglob("draft_content.json"))
    unique: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        key = str(path.resolve()).casefold()
        if path.exists() and key not in seen:
            unique.append(path)
            seen.add(key)
    return unique


def backup(paths: list[Path]) -> Path:
    backup_root = (
        Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/backups")
        / f"{time.strftime('%Y-%m-%d-%H-%M-%S')}-before-add-intro-multilang-tracks"
    )
    backup_root.mkdir(parents=True, exist_ok=True)
    for index, path in enumerate(paths, start=1):
        shutil.copy2(path, backup_root / f"{index:02d}_{path.name}")
    return backup_root


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
        stderr=subprocess.PIPE,
        text=True,
    )
    return int(round(float(completed.stdout.strip()) * 1_000_000))


def source_files() -> dict[str, Path]:
    files = {
        "DE": SRC_DIR / "intro_de_alina_beauty_slot_19s83.wav",
        "EN": SRC_DIR / "intro_en_alina_beauty_slot_19s83.wav",
        "ES": SRC_DIR / "intro_es_alina_beauty_slot_19s83.wav",
        "IT": SRC_DIR / "intro_it_alina_beauty_slot_19s83.wav",
    }
    missing = [str(path) for path in files.values() if not path.exists()]
    if missing:
        raise RuntimeError(f"Missing intro audio files: {missing}")
    return files


def copy_resources(root: Path, files: dict[str, Path]) -> dict[str, Path]:
    out_dir = root / "Resources" / RESOURCE_SUBDIR
    out_dir.mkdir(parents=True, exist_ok=True)
    copied: dict[str, Path] = {}
    for code, src in files.items():
        dst = out_dir / src.name
        shutil.copy2(src, dst)
        copied[code] = dst
    return copied


def find_intro_templates(draft: dict[str, Any]) -> tuple[int, dict[str, Any], dict[str, Any], dict[str, Any]]:
    audio_materials = {item["id"]: item for item in draft.get("materials", {}).get("audios", [])}
    for track_index, track in enumerate(draft.get("tracks", [])):
        if track.get("type") != "audio":
            continue
        for segment in track.get("segments", []):
            material = audio_materials.get(segment.get("material_id"))
            if material and material.get("name") == INTRO_AUDIO_NAME:
                return track_index, track, segment, material
    raise RuntimeError("Original intro ElevenLabs audio segment was not found")


def remove_existing_multilang_intro(draft: dict[str, Any]) -> int:
    removed_tracks = 0
    keep_tracks = []
    removed_material_ids: set[str] = set()
    for track in draft.get("tracks", []):
        name = str(track.get("name") or "")
        if any(name.startswith(f"INTRO 11LABS {code} ") for code in ["DE", "EN", "ES", "IT"]):
            removed_tracks += 1
            for segment in track.get("segments", []):
                if segment.get("material_id"):
                    removed_material_ids.add(str(segment["material_id"]))
            continue
        keep_tracks.append(track)
    draft["tracks"] = keep_tracks
    if removed_material_ids:
        draft["materials"]["audios"] = [
            item for item in draft.get("materials", {}).get("audios", []) if str(item.get("id")) not in removed_material_ids
        ]
    return removed_tracks


def apply(path: Path, copied: dict[str, Path]) -> dict[str, Any]:
    draft = load_json(path)
    removed = remove_existing_multilang_intro(draft)
    intro_track_index, intro_track, intro_segment, intro_material = find_intro_templates(draft)
    intro_track["name"] = "INTRO 11LABS FR ACTIVE"
    intro_segment["volume"] = 1.0
    intro_segment["last_nonzero_volume"] = 1.0
    intro_segment["source_timerange"] = {"start": 0, "duration": INTRO_DURATION_US}
    intro_segment["target_timerange"] = {"start": 0, "duration": INTRO_DURATION_US}
    intro_material["duration"] = INTRO_DURATION_US

    added: list[dict[str, Any]] = []
    next_render_index = max(
        [int(track.get("render_index") or 0) for track in draft.get("tracks", [])]
        + [int(track.get("track_render_index") or 0) for track in draft.get("tracks", [])]
        + [intro_track_index]
    )
    labels = {
        "DE": "GERMAN",
        "EN": "ENGLISH",
        "ES": "SPANISH",
        "IT": "ITALIAN",
    }
    for offset, (code, audio_path) in enumerate(copied.items(), start=1):
        name = f"intro_{code.lower()}_alina_beauty_slot_19s83.wav"
        material = deepcopy(intro_material)
        material["id"] = capcut_id()
        material["unique_id"] = ""
        material["name"] = name
        material["material_name"] = name
        material["path"] = str(audio_path)
        material["duration"] = INTRO_DURATION_US
        material["wave_points"] = []

        segment = deepcopy(intro_segment)
        segment["id"] = capcut_id()
        segment["material_id"] = material["id"]
        segment["volume"] = 0.0
        segment["last_nonzero_volume"] = 1.0
        segment["source_timerange"] = {"start": 0, "duration": INTRO_DURATION_US}
        segment["target_timerange"] = {"start": 0, "duration": INTRO_DURATION_US}

        track = deepcopy(intro_track)
        track["id"] = capcut_id()
        track["name"] = f"INTRO 11LABS {code} MUTED - {labels[code]}"
        track["segments"] = [segment]
        render_index = next_render_index + offset
        track["render_index"] = render_index
        track["track_render_index"] = render_index
        segment["track_render_index"] = render_index
        segment["render_index"] = 0

        draft["materials"]["audios"].append(material)
        draft["tracks"].append(track)
        added.append(
            {
                "code": code,
                "track_name": track["name"],
                "volume": segment["volume"],
                "duration_us": INTRO_DURATION_US,
                "path": str(audio_path),
                "source_duration_us": probe_duration_us(audio_path),
            }
        )

    write_json(path, draft)
    return {
        "path": str(path),
        "removed_existing_multilang_tracks": removed,
        "intro_track_index": intro_track_index,
        "track_count": len(draft.get("tracks", [])),
        "added": added,
    }


def verify(path: Path) -> dict[str, Any]:
    draft = load_json(path)
    audio_materials = {item["id"]: item for item in draft.get("materials", {}).get("audios", [])}
    found: list[dict[str, Any]] = []
    for track_index, track in enumerate(draft.get("tracks", [])):
        name = str(track.get("name") or "")
        if name.startswith("INTRO 11LABS "):
            segment = track.get("segments", [None])[0]
            material = audio_materials.get(segment.get("material_id")) if segment else None
            found.append(
                {
                    "track_index": track_index,
                    "track_name": name,
                    "segment_duration_us": segment.get("target_timerange", {}).get("duration") if segment else None,
                    "source_duration_us": segment.get("source_timerange", {}).get("duration") if segment else None,
                    "volume": segment.get("volume") if segment else None,
                    "material_duration_us": material.get("duration") if material else None,
                    "path_exists": Path(str(material.get("path"))).exists() if material else False,
                    "path": material.get("path") if material else None,
                }
            )
    active = [item for item in found if float(item["volume"] or 0.0) > 0.0]
    bad = [
        item
        for item in found
        if item["segment_duration_us"] != INTRO_DURATION_US
        or item["source_duration_us"] != INTRO_DURATION_US
        or item["material_duration_us"] != INTRO_DURATION_US
        or not item["path_exists"]
    ]
    return {
        "path": str(path),
        "track_count": len(draft.get("tracks", [])),
        "intro_tracks": found,
        "active_intro_tracks": active,
        "bad_intro_tracks": bad,
    }


def main() -> int:
    root = project_root()
    if not root.exists():
        raise RuntimeError(f"Draft not found: {root}")
    files = source_files()
    copied = copy_resources(root, files)
    paths = content_paths(root)
    backup_dir = backup(paths)
    patches = [apply(path, copied) for path in paths]
    verifications = [verify(path) for path in paths]
    report = {
        "project": PROJECT,
        "backup": str(backup_dir),
        "resource_subdir": str(root / "Resources" / RESOURCE_SUBDIR),
        "intro_duration_us": INTRO_DURATION_US,
        "patches": patches,
        "verifications": verifications,
    }
    out = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/add_intro_multilang_tracks_report.json")
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if any(item["bad_intro_tracks"] for item in verifications):
        raise RuntimeError("Intro multilang track verification failed")
    if any(len(item["active_intro_tracks"]) != 1 or item["active_intro_tracks"][0]["track_name"] != "INTRO 11LABS FR ACTIVE" for item in verifications):
        raise RuntimeError("Exactly one active intro track expected: INTRO 11LABS FR ACTIVE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
