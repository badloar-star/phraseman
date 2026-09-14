"""Safely merge approved audio and right-side alpha illustrations into the DE draft.

This deliberately does not create, remove, alter, or move text clips.  It only
updates audio source/target durations to the already-generated WAV files and
adds a single photo track directly above BACKGROUND and below every text track.
"""

from __future__ import annotations

import argparse
import copy
import json
import shutil
import time
import uuid
import wave
from pathlib import Path

from PIL import Image


EXPECTED_DRAFT_NAME = "DE A1 — Фразы для жизни в Германии"
EXPECTED_TEXT_TRACKS = 22
EXPECTED_TEXTS = 3621
IMAGE_TRACK_NAME = "ILLUSTRATIONS_RIGHT_50"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def save_json_atomically(path: Path, value: dict) -> None:
    temporary = path.with_name(f"{path.name}.new-{uuid.uuid4().hex}")
    try:
        temporary.write_text(
            json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def wav_duration_us(path: Path) -> int:
    with wave.open(str(path), "rb") as audio:
        return round(audio.getnframes() * 1_000_000 / audio.getframerate())


def new_id() -> str:
    return str(uuid.uuid4()).upper()


def build_photo_material(source_path: Path, stored_path: Path) -> dict:
    with Image.open(source_path) as image:
        width, height = image.size
    return {
        "id": new_id(),
        "unique_id": "",
        "type": "photo",
        "duration": 10_800_000_000,
        "path": stored_path.as_posix(),
        "media_path": "",
        "local_id": "",
        "has_audio": False,
        "reverse_path": "",
        "intensifies_path": "",
        "reverse_intensifies_path": "",
        "intensifies_audio_path": "",
        "cartoon_path": "",
        "width": width,
        "height": height,
        "category_id": "",
        "category_name": "local",
        "material_id": "",
        "material_name": source_path.name,
        "material_url": "",
        "crop": {
            "upper_left_x": 0.0,
            "upper_left_y": 0.0,
            "upper_right_x": 1.0,
            "upper_right_y": 0.0,
            "lower_left_x": 0.0,
            "lower_left_y": 1.0,
            "lower_right_x": 1.0,
            "lower_right_y": 1.0,
        },
        "crop_ratio": "free",
        "audio_fade": None,
        "crop_scale": 1.0,
        "extra_type_option": 0,
        "stable": {"stable_level": 0, "matrix_path": "", "time_range": {"start": 0, "duration": 0}},
        "matting": {
            "flag": 0,
            "path": "",
            "interactiveTime": [],
            "has_use_quick_brush": False,
            "strokes": [],
            "has_use_quick_eraser": False,
            "expansion": 0,
            "feather": 0,
            "reverse": False,
            "custom_matting_id": "",
            "enable_matting_stroke": False,
            "is_clould": False,
            "mask_video_path": "",
            "cloud_product_fps": 0.0,
        },
        "source": 0,
        "source_platform": 0,
        "formula_id": "",
        "check_flag": 62978047,
        "video_algorithm": {"algorithms": [], "time_range": None, "path": "", "gameplay_configs": [], "ai_in_painting_config": [], "complement_frame_config": None, "motion_blur_config": None, "deflicker": None, "noise_reduction": None, "quality_enhance": None, "super_resolution": None, "ai_background_configs": [], "smart_complement_frame": None, "aigc_generate": None, "aigc_generate_list": [], "mouth_shape_driver": None, "ai_expression_driven": None, "ai_motion_driven": None, "image_interpretation": None, "story_video_modify_video_config": {"task_id": "", "is_overwrite_last_video": False, "tracker_task_id": "", "generate_id": "", "generate_card_id": ""}, "skip_algorithm_index": []},
        "is_unified_beauty_mode": False,
        "is_set_beauty_mode": False,
        "object_locked": None,
        "smart_motion": None,
        "multi_camera_info": None,
        "freeze": None,
        "picture_from": "none",
        "picture_set_category_id": "",
        "picture_set_category_name": "",
        "team_id": "",
        "local_material_id": "",
        "origin_material_id": "",
        "request_id": "",
        "has_sound_separated": False,
        "is_text_edit_overdub": False,
        "is_ai_generate_content": False,
        "aigc_type": "none",
        "is_copyright": False,
        "aigc_history_id": "",
        "aigc_item_id": "",
        "local_material_from": "",
        "smart_match_info": None,
        "beauty_face_preset_infos": [],
        "beauty_body_preset_id": "",
        "beauty_face_auto_preset": {"preset_id": "", "name": "", "rate_map": "", "scene": ""},
        "beauty_face_auto_preset_infos": [],
        "beauty_body_auto_preset": None,
        "live_photo_timestamp": -1,
        "live_photo_cover_path": "",
        "content_feature_info": None,
        "corner_pin": None,
        "surface_trackings": [],
        "video_mask_stroke": {"resource_id": "", "path": "", "type": "", "color": "", "size": 0.0, "alpha": 0.0, "distance": 0.0, "texture": 0.0, "horizontal_shift": 0.0, "vertical_shift": 0.0},
        "video_mask_shadow": {"resource_id": "", "path": "", "color": "", "alpha": 0.0, "blur": 0.0, "distance": 0.0, "angle": 0.0},
    }


def build_image_segment(material_id: str, start: int, duration: int, number: int) -> dict:
    return {
        "id": new_id(),
        "source_timerange": {"start": 0, "duration": duration},
        "target_timerange": {"start": start, "duration": duration},
        "render_timerange": {"start": 0, "duration": 0},
        "desc": f"DE_{number:03d}_RIGHT_ALPHA_ILLUSTRATION",
        "state": 0,
        "speed": 1.0,
        "is_loop": False,
        "is_tone_modify": False,
        "reverse": False,
        "intensifies_audio": False,
        "cartoon": False,
        "volume": 1.0,
        "last_nonzero_volume": 1.0,
        "clip": {
            "scale": {"x": 0.8, "y": 0.8},
            "rotation": 0.0,
            "transform": {"x": 0.6432291666666666, "y": -0.18518518518518515},
            "flip": {"vertical": False, "horizontal": False},
            "alpha": 1.0,
        },
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
        "hdr_settings": {"mode": 1, "intensity": 1.0, "nits": 1000},
        "enable_color_wheels": False,
        "track_attribute": 0,
        "is_placeholder": False,
        "template_id": "",
        "enable_smart_color_adjust": False,
        "template_scene": "default",
        "common_keyframes": [],
        "caption_info": None,
        "responsive_layout": {"enable": False, "target_follow": "", "size_layout": 0, "horizontal_pos_layout": 0, "vertical_pos_layout": 0},
        "enable_color_match_adjust": False,
        "enable_color_correct_adjust": False,
        "enable_adjust_mask": False,
        "raw_segment_id": "",
        "lyric_keyframes": None,
        "enable_video_mask": False,
        "digital_human_template_group_id": "",
        "color_correct_alg_result": "",
        "source": "segmentsourcenormal",
        "enable_mask_stroke": False,
        "enable_mask_shadow": False,
        "enable_color_adjust_pro": False,
    }


def update_audio_durations(draft: dict, root: Path) -> tuple[int, int]:
    materials = {item["id"]: item for item in draft["materials"]["audios"]}
    changed = 0
    longest_growth = 0
    for track in draft["tracks"]:
        if track["type"] != "audio":
            continue
        for segment in track["segments"]:
            material = materials[segment["material_id"]]
            actual_duration = wav_duration_us(root / material["path"])
            previous_duration = segment["target_timerange"]["duration"]
            material["duration"] = actual_duration
            segment["source_timerange"]["duration"] = actual_duration
            segment["target_timerange"]["duration"] = actual_duration
            changed += 1
            longest_growth = max(longest_growth, actual_duration - previous_duration)
    return changed, longest_growth


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    root = args.project.resolve()
    draft_path = root / "draft_content.json"
    draft = load_json(draft_path)

    if draft.get("name") != EXPECTED_DRAFT_NAME:
        raise SystemExit(f"Refusing unexpected draft: {draft.get('name')!r}")
    text_tracks = [track for track in draft["tracks"] if track["type"] == "text"]
    if len(text_tracks) != EXPECTED_TEXT_TRACKS or len(draft["materials"]["texts"]) != EXPECTED_TEXTS:
        raise SystemExit("Refusing: the expected original DE text layout is not present.")
    if any(track["name"] == IMAGE_TRACK_NAME for track in draft["tracks"]):
        raise SystemExit("Refusing: illustration track already exists; this operation is not repeatable.")

    images = sorted((root / "ASSETS" / "COLLAGE_TRANSPARENT_V3").glob("*.png"))
    if len(images) != 50:
        raise SystemExit(f"Expected 50 transparent illustrations, found {len(images)}")

    main_de = next(track for track in draft["tracks"] if track["name"] == "MAIN_DE")
    replay = next(track for track in draft["tracks"] if track["name"] == "REPLAY_DE")
    if len(main_de["segments"]) != 250 or len(replay["segments"]) != 50:
        raise SystemExit("Unexpected main/replay segment count; no draft was changed.")

    # One visual begins with each chain's first DE phrase and ends with the
    # replay of that exact chain.  Text positions stay untouched.
    windows: list[tuple[int, int]] = []
    for index in range(50):
        start = main_de["segments"][index * 5]["target_timerange"]["start"]
        final = replay["segments"][index]["target_timerange"]
        end = final["start"] + final["duration"]
        windows.append((start, end - start))

    preview = copy.deepcopy(draft)
    audio_changed, longest_growth = update_audio_durations(preview, root)
    image_materials = [
        build_photo_material(image, Path("ASSETS") / "COLLAGE_TRANSPARENT_V3" / image.name)
        for image in images
    ]
    image_track = {
        "id": new_id(),
        "type": "video",
        "flag": 0,
        "attribute": 0,
        "name": IMAGE_TRACK_NAME,
        "is_default_name": False,
        "segments": [
            build_image_segment(material["id"], start, duration, number)
            for number, (material, (start, duration)) in enumerate(zip(image_materials, windows), start=1)
        ],
    }
    preview["materials"]["videos"].extend(image_materials)
    background_index = next(index for index, track in enumerate(preview["tracks"]) if track["name"] == "BACKGROUND")
    preview["tracks"].insert(background_index + 1, image_track)
    preview["update_time"] = int(time.time() * 1_000_000)

    report = {
        "draft_name": preview["name"],
        "text_tracks_preserved": len(text_tracks),
        "text_materials_preserved": len(draft["materials"]["texts"]),
        "audio_segments_retimed_from_wav": audio_changed,
        "largest_audio_growth_us": longest_growth,
        "illustration_track": IMAGE_TRACK_NAME,
        "illustrations_added": len(image_track["segments"]),
        "first_visual_window": windows[0],
        "last_visual_window": windows[-1],
    }
    if args.dry_run:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    backup = root / "BACKUPS" / f"draft_content_before_DE_media_merge_{time.strftime('%Y%m%d_%H%M%S')}.json"
    backup.parent.mkdir(exist_ok=True)
    shutil.copy2(draft_path, backup)
    save_json_atomically(draft_path, preview)
    report["backup"] = backup.as_posix()
    (root / "QA" / "DE_MEDIA_MERGE_REPORT.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
