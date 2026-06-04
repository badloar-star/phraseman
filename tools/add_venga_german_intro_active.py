#!/usr/bin/env python3
"""Add active German ElevenLabs intro audio to the RU->DE Venga draft."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any


PROJECT = "VENGA A1 200 RU DE VSSCP"
TIMELINE_ID = "B9D7525D-D806-4014-AFA3-401A3BD3B10C"
INTRO_DURATION_US = 19_833_333
SRC = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/intro-multilang-11labs/intro_de_alina_beauty_slot_19s83.wav")
RESOURCE_SUBDIR = "venga_intro_11labs_de"


def capcut_id() -> str:
    return str(uuid.uuid4()).upper()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def project_root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft" / PROJECT


def content_paths(root: Path) -> list[Path]:
    paths = [root / "draft_content.json", root / "template-2.tmp", root / "draft_content.json.bak", root / "Timelines" / TIMELINE_ID / "draft_content.json"]
    unique: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        key = str(path.resolve()).casefold()
        if path.exists() and key not in seen:
            unique.append(path)
            seen.add(key)
    return unique


def probe_duration_us(path: Path) -> int:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    )
    return int(round(float(completed.stdout.strip()) * 1_000_000))


def copy_resource(root: Path) -> Path:
    if not SRC.exists():
        raise RuntimeError(f"Missing source intro: {SRC}")
    out_dir = root / "Resources" / RESOURCE_SUBDIR
    out_dir.mkdir(parents=True, exist_ok=True)
    dst = out_dir / SRC.name
    shutil.copy2(SRC, dst)
    duration = probe_duration_us(dst)
    if duration != INTRO_DURATION_US:
        raise RuntimeError(f"Intro duration mismatch: {duration} != {INTRO_DURATION_US}")
    return dst


def remove_existing_intro(draft: dict[str, Any]) -> int:
    removed = 0
    removed_materials: set[str] = set()
    tracks = []
    for track in draft.get("tracks", []):
        if str(track.get("name") or "").startswith("INTRO 11LABS DE ACTIVE"):
            removed += 1
            for segment in track.get("segments", []):
                if segment.get("material_id"):
                    removed_materials.add(str(segment["material_id"]))
            continue
        tracks.append(track)
    draft["tracks"] = tracks
    if removed_materials:
        draft["materials"]["audios"] = [item for item in draft["materials"]["audios"] if str(item.get("id")) not in removed_materials]
    return removed


def apply(path: Path, audio_path: Path) -> dict[str, Any]:
    draft = load_json(path)
    removed = remove_existing_intro(draft)
    audio_materials = {item["id"]: item for item in draft["materials"]["audios"]}

    template_track = next(track for track in draft["tracks"] if track.get("type") == "audio" and len(track.get("segments", [])) == 200)
    template_segment = deepcopy(template_track["segments"][0])
    template_material = deepcopy(audio_materials[template_segment["material_id"]])

    material = template_material
    material["id"] = capcut_id()
    material["unique_id"] = ""
    material["name"] = audio_path.name
    material["material_name"] = audio_path.name
    material["path"] = str(audio_path)
    material["duration"] = INTRO_DURATION_US
    material["wave_points"] = []

    segment = template_segment
    segment["id"] = capcut_id()
    segment["material_id"] = material["id"]
    segment["source_timerange"] = {"start": 0, "duration": INTRO_DURATION_US}
    segment["target_timerange"] = {"start": 0, "duration": INTRO_DURATION_US}
    segment["volume"] = 1.0
    segment["last_nonzero_volume"] = 1.0
    segment["render_index"] = 0

    track = deepcopy(template_track)
    track["id"] = capcut_id()
    track["name"] = "INTRO 11LABS DE ACTIVE - GERMAN"
    track["segments"] = [segment]
    render_index = max(int(item.get("render_index") or 0) for item in draft["tracks"]) + 1
    track["render_index"] = render_index
    track["track_render_index"] = render_index
    segment["track_render_index"] = render_index

    draft["materials"]["audios"].append(material)
    draft["tracks"].append(track)
    write_json(path, draft)
    return {"path": str(path), "removed": removed, "track_count": len(draft["tracks"]), "intro_path": str(audio_path)}


def verify(path: Path) -> dict[str, Any]:
    draft = load_json(path)
    audio_materials = {item["id"]: item for item in draft["materials"]["audios"]}
    found = []
    for track_index, track in enumerate(draft.get("tracks", [])):
        if str(track.get("name") or "").startswith("INTRO 11LABS DE ACTIVE"):
            segment = track["segments"][0]
            material = audio_materials[segment["material_id"]]
            found.append(
                {
                    "track_index": track_index,
                    "track_name": track["name"],
                    "volume": segment.get("volume"),
                    "target_duration": segment.get("target_timerange", {}).get("duration"),
                    "source_duration": segment.get("source_timerange", {}).get("duration"),
                    "material_duration": material.get("duration"),
                    "path_exists": Path(str(material.get("path"))).exists(),
                }
            )
    return {"path": str(path), "intro_tracks": found, "bad": [item for item in found if item["volume"] != 1.0 or item["target_duration"] != INTRO_DURATION_US or item["source_duration"] != INTRO_DURATION_US or item["material_duration"] != INTRO_DURATION_US or not item["path_exists"]]}


def main() -> int:
    root = project_root()
    if not root.exists():
        raise RuntimeError(f"Draft not found: {root}")
    audio_path = copy_resource(root)
    paths = content_paths(root)
    patches = [apply(path, audio_path) for path in paths]
    verifications = [verify(path) for path in paths]
    report = {"project": PROJECT, "audio_path": str(audio_path), "patches": patches, "verifications": verifications}
    out = Path("exports/venga-phrase-packs/ru-de-a1-vsscp/add_german_intro_report.json")
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if any(len(item["intro_tracks"]) != 1 or item["bad"] for item in verifications):
        raise RuntimeError("German intro verification failed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
