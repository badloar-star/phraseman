#!/usr/bin/env python3
"""Add 3 intro variants as separate video tracks in CapCut project.

Each intro is placed at time=0 on its own new track, stacked under track[0].
The user can then pick the best one and delete the rest.

Usage:
    python inject_3_intros_capcut.py
"""

from __future__ import annotations

import copy
import json
import os
import shutil
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any

PROJECT_NAME = "ЦЕПИ ЦЕПИ ЦЕПИ (1)"
INTROS = [
    ("IntroBold",   "tools/intro_remotion/out/intro_bold.mp4",    "INTRO — BOLD"),
    ("IntroMinimal","tools/intro_remotion/out/intro_minimal.mp4",  "INTRO — MINIMAL"),
    ("IntroEnergy", "tools/intro_remotion/out/intro_energy.mp4",   "INTRO — ENERGY"),
]
US = 1_000_000


def project_path() -> Path:
    return (
        Path(os.environ["LOCALAPPDATA"])
        / "CapCut" / "User Data" / "Projects"
        / "com.lveditor.draft" / PROJECT_NAME
    )


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def capcut_is_open() -> bool:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command",
         "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id"],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, check=False,
    )
    return bool(result.stdout.strip())


def ffprobe_duration_us(path: Path) -> int:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr[:200]}")
    return int(round(float(result.stdout.strip()) * US))


def new_id() -> str:
    return str(uuid.uuid4()).upper()


def localize(project: Path, source: Path, folder: str) -> Path:
    target = project / "Resources" / folder / source.name
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists() or target.stat().st_size != source.stat().st_size:
        shutil.copy2(source, target)
    return target


def make_video_material(local_path: Path, dur_us: int) -> dict:
    """Build a minimal CapCut video material entry."""
    mid = new_id()
    return {
        "id": mid,
        "unique_id": new_id(),
        "type": "video",
        "duration": dur_us,
        "path": str(local_path),
        "media_path": str(local_path),
        "local_id": "",
        "has_audio": False,
        "reverse_path": "",
        "intensifies_path": "",
        "reverse_intensifies_path": "",
        "intensifies_audio_path": "",
        "cartoon_path": "",
        "width": 1920,
        "height": 1080,
        "category_id": "",
        "category_name": "",
        "material_id": "",
        "material_name": local_path.name,
        "material_url": "",
        "crop": {"upper_left_x": 0.0, "upper_left_y": 0.0, "upper_right_x": 1.0,
                 "upper_right_y": 0.0, "lower_right_x": 1.0, "lower_right_y": 1.0,
                 "lower_left_x": 0.0, "lower_left_y": 1.0},
        "crop_ratio": "original",
        "crop_scale": 1.0,
        "audio_fade": None,
        "extra_type_option": 0,
        "stable": {"matrix_path": "", "time_range": None, "on": False},
        "matting": {"flag": 0},
        "source": 0,
        "source_platform": 0,
        "formula_id": "",
        "check_flag": 63487,
        "video_algorithm": {},
        "is_unified_beauty_mode": False,
        "is_set_beauty_mode": False,
        "object_locked": None,
        "smart_motion": None,
        "multi_camera_info": None,
        "freeze": None,
        "picture_from": "",
        "picture_set_category_id": "",
        "picture_set_category_name": "",
        "team_id": "",
        "local_material_id": "",
        "origin_material_id": "",
        "request_id": "",
        "has_sound_separated": False,
        "is_text_edit_overdub": False,
        "is_ai_generate_content": False,
        "aigc_type": "0",
        "is_copyright": False,
        "aigc_history_id": "",
        "aigc_item_id": "",
        "local_material_from": 0,
        "smart_match_info": None,
        "beauty_face_preset_infos": [],
        "beauty_body_preset_id": "",
        "beauty_face_auto_preset": False,
        "beauty_face_auto_preset_infos": [],
        "beauty_body_auto_preset": False,
        "live_photo_timestamp": 0,
        "live_photo_cover_path": "",
        "content_feature_info": None,
        "corner_pin": None,
        "surface_trackings": [],
        "video_mask_stroke": None,
        "video_mask_shadow": None,
    }


def make_segment(material_id: str, dur_us: int) -> dict:
    """Build a minimal CapCut segment entry."""
    return {
        "id": new_id(),
        "source_timerange": {"start": 0, "duration": dur_us},
        "target_timerange": {"start": 0, "duration": dur_us},
        "render_timerange": {"start": 0, "duration": dur_us},
        "desc": "",
        "state": 0,
        "speed": 1.0,
        "is_loop": False,
        "is_tone_modify": False,
        "reverse": False,
        "intensifies_audio": False,
        "cartoon": False,
        "volume": 1.0,
        "last_nonzero_volume": 1.0,
        "clip": {"alpha": 1.0, "flip": {"horizontal": False, "vertical": False},
                 "rotation": 0.0, "scale": {"x": 1.0, "y": 1.0},
                 "translation": {"x": 0.0, "y": 0.0}},
        "uniform_scale": {"on": True, "value": 1.0},
        "material_id": material_id,
        "extra_material_refs": [],
        "render_index": 0,
        "keyframe_refs": [],
        "enable_lut": False,
        "enable_adjust": False,
        "enable_hsl": False,
        "visible": True,
        "group_id": "",
        "enable_color_curves": False,
        "enable_hsl_curves": False,
        "track_render_index": 0,
        "hdr_settings": None,
        "enable_color_wheels": False,
        "track_attribute": 0,
        "is_placeholder": False,
        "template_id": "",
        "enable_smart_color_adjust": False,
        "template_scene": "default",
        "common_keyframes": [],
        "caption_info": None,
        "responsive_layout": {"enable": False, "horizontal_pos_layout": 0,
                              "vertical_pos_layout": 0, "target_follow": ""},
        "enable_color_match_adjust": False,
        "enable_color_correct_adjust": False,
        "enable_adjust_mask": False,
        "raw_segment_id": "",
        "lyric_keyframes": [],
        "enable_video_mask": False,
        "digital_human_template_group_id": "",
        "color_correct_alg_result": None,
        "source": {"platform": 0, "team_id": "", "material_id": ""},
        "enable_mask_stroke": False,
        "enable_mask_shadow": False,
        "enable_color_adjust_pro": False,
    }


def make_track(name: str, segment: dict) -> dict:
    return {
        "id": new_id(),
        "type": "video",
        "segments": [segment],
        "flag": 0,
        "attribute": 0,
        "name": name,
        "is_default_name": False,
    }


def inject_intros() -> dict:
    if capcut_is_open():
        raise SystemExit("CapCut is open — close it first.")

    project = project_path()
    content = load_json(project / "draft_content.json")

    mats = content.setdefault("materials", {})
    mats.setdefault("videos", [])

    added_tracks = []

    for comp_name, mp4_rel, track_name in INTROS:
        mp4 = Path(mp4_rel)
        if not mp4.exists():
            print(f"  SKIP {comp_name} — file not found: {mp4}", flush=True)
            continue

        dur_us = ffprobe_duration_us(mp4)
        local = localize(project, mp4, "cepicepi_english_intro_variants")

        # Create material + segment + track
        vmat = make_video_material(local, dur_us)
        seg  = make_segment(vmat["id"], dur_us)
        track = make_track(track_name, seg)

        mats["videos"].append(vmat)
        # Insert new track right after track[0] so they stack at top
        content["tracks"].insert(1, track)

        added_tracks.append(track_name)
        print(f"  Added: {track_name}  ({dur_us/US:.2f}s)", flush=True)

    write_json(project / "draft_content.json", content)
    if (project / "template-2.tmp").exists():
        write_json(project / "template-2.tmp", content)
    if (project / "Timelines").exists():
        for mirror in (project / "Timelines").glob("*/draft_content.json"):
            write_json(mirror, content)

    return {"status": "done", "added_tracks": added_tracks}


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    result = inject_intros()
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
