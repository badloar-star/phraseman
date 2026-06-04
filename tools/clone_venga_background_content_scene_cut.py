from __future__ import annotations

import json
import os
import shutil
import time
import uuid
from copy import deepcopy
from pathlib import Path
from typing import Any


US = 1_000_000
SOURCE_DRAFT_NAME = os.environ.get("VENGA_SOURCE_DRAFT", "VENGA A1 200 OPENAI LAYOUT FIX")
TARGET_DRAFT_NAME = os.environ.get("VENGA_TARGET_DRAFT", "VENGA A1 200 OPENAI BG CONTENT CUT FADE")
SCENE_DETECT_BASE_US = 2_146_083_333
FADE_OUT_RESOURCE_ID = "6798320902548230669"
FADE_OUT_PATH = (
    "C:/Users/badlo/AppData/Local/CapCut/User Data/Cache/effect/"
    "6798320902548230669/c6f05ce62355b537be762550040bfc08"
)
MIN_SCENE_GAP_US = int(float(os.environ.get("VENGA_MIN_SCENE_GAP_SECONDS", "22")) * US)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def folder_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())


def unique_draft_dir(root: Path, base_name: str) -> Path:
    candidate = root / base_name
    if not candidate.exists():
        return candidate
    return root / f"{base_name} {time.strftime('%Y%m%d_%H%M%S')}"


def load_content_scene_starts(repo_root: Path) -> list[int]:
    scene_file = repo_root / ".codex-tmp" / "venga-bg-content-scenes-full.txt"
    if not scene_file.exists():
        raise SystemExit(f"Missing content scene detection file: {scene_file}")
    starts: list[int] = []
    for line in scene_file.read_text(encoding="utf-8", errors="ignore").splitlines():
        if "pts_time:" not in line:
            continue
        try:
            relative_seconds = float(line.split("pts_time:", 1)[1].strip())
        except ValueError:
            continue
        starts.append(SCENE_DETECT_BASE_US + round(relative_seconds * US))
    if len(starts) < 200:
        raise SystemExit(f"Expected at least 200 content scene starts, got {len(starts)}")
    return starts


def ordered_scene_cycle(values: list[int], needed: int, minimum_gap_us: int) -> tuple[list[int], int]:
    picked: list[int] = []
    last = -10**18
    for value in values:
        if value - last >= minimum_gap_us:
            picked.append(value)
            last = value
    if not picked:
        raise SystemExit("No content scene starts remained after filtering")
    return [picked[i % len(picked)] for i in range(needed)], len(picked)


def combined_fade_material(animation_id: str, segment_duration: int, fade_in_animation: dict[str, Any]) -> dict[str, Any]:
    fade_in = deepcopy(fade_in_animation)
    fade_in["start"] = 0
    fade_duration = min(500_000, max(100_000, segment_duration // 5))
    return {
        "id": animation_id,
        "type": "sticker_animation",
        "animations": [
            fade_in,
            {
                "id": FADE_OUT_RESOURCE_ID,
                "type": "out",
                "start": max(0, segment_duration - fade_duration),
                "duration": fade_duration,
                "path": FADE_OUT_PATH,
                "platform": "all",
                "resource_id": FADE_OUT_RESOURCE_ID,
                "third_resource_id": FADE_OUT_RESOURCE_ID,
                "source_platform": 1,
                "name": "Fade Out",
                "category_id": "2037708371",
                "category_name": "",
                "panel": "video",
                "material_type": "video",
                "anim_adjust_params": None,
                "request_id": "",
            }
        ],
        "multi_language_current": "none",
    }


def video_material_duration(draft: dict[str, Any], material_id: str) -> int:
    for material in draft.get("materials", {}).get("videos", []):
        if material.get("id") == material_id:
            return int(material.get("duration") or 0)
    return 0


def find_background_fade_in(draft: dict[str, Any], base_segment: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    animations_by_id = {m.get("id"): m for m in draft.get("materials", {}).get("material_animations", [])}
    for ref_id in base_segment.get("extra_material_refs") or []:
        material = animations_by_id.get(ref_id)
        if not material:
            continue
        for animation in material.get("animations") or []:
            if animation.get("type") == "in" and animation.get("name") == "Fade In":
                return ref_id, animation
    raise SystemExit("Could not find the existing background Fade In animation")


def is_fade_animation_ref(draft: dict[str, Any], ref_id: str) -> bool:
    animations_by_id = {m.get("id"): m for m in draft.get("materials", {}).get("material_animations", [])}
    material = animations_by_id.get(ref_id)
    if not material:
        return False
    for animation in material.get("animations") or []:
        if animation.get("type") in {"in", "out"} and animation.get("name") in {"Fade In", "Fade Out"}:
            return True
    return False


def rebuild_background_by_content_scenes(draft: dict[str, Any], scene_starts: list[int]) -> dict[str, int]:
    bg_track = draft["tracks"][0]
    phrase_segments = draft["tracks"][6]["segments"]
    if len(bg_track.get("segments", [])) != 200 or len(phrase_segments) != 200:
        raise SystemExit("Expected 200 background segments and 200 phrase text segments")

    base_segment = deepcopy(bg_track["segments"][0])
    phrase_starts = [int(seg["target_timerange"]["start"]) for seg in phrase_segments]
    last_phrase_end = int(phrase_segments[-1]["target_timerange"]["start"]) + int(
        phrase_segments[-1]["target_timerange"]["duration"]
    )
    max_target_duration = max(
        (phrase_starts[i + 1] if i + 1 < len(phrase_starts) else last_phrase_end) - start
        for i, start in enumerate(phrase_starts)
    )
    source_duration = video_material_duration(draft, base_segment["material_id"])
    max_source_start = max(0, source_duration - max_target_duration)
    valid_scene_starts = [start for start in scene_starts if start <= max_source_start]
    source_starts, unique_cycle_length = ordered_scene_cycle(
        valid_scene_starts,
        len(phrase_starts),
        MIN_SCENE_GAP_US,
    )
    fade_in_ref, fade_in_animation = find_background_fade_in(draft, base_segment)

    animations = draft.setdefault("materials", {}).setdefault("material_animations", [])
    rebuilt: list[dict[str, Any]] = []
    for i, start in enumerate(phrase_starts):
        next_start = phrase_starts[i + 1] if i + 1 < len(phrase_starts) else last_phrase_end
        duration = max(1, next_start - start)
        seg = deepcopy(base_segment)
        seg["id"] = str(uuid.uuid4()).upper()
        seg["target_timerange"] = {"start": start, "duration": duration}
        seg["source_timerange"] = {"start": source_starts[i], "duration": duration}
        fade_id = str(uuid.uuid4()).upper()
        refs = [ref for ref in seg.get("extra_material_refs", []) if not is_fade_animation_ref(draft, ref)]
        seg["extra_material_refs"] = [*refs, fade_id]
        animations.append(combined_fade_material(fade_id, duration, fade_in_animation))
        rebuilt.append(seg)
    bg_track["segments"] = rebuilt
    return {
        "background_segments": len(rebuilt),
        "content_scene_candidates": len(scene_starts),
        "valid_content_scene_candidates": len(valid_scene_starts),
        "ordered_unique_scene_cycle": unique_cycle_length,
        "minimum_scene_gap_seconds": MIN_SCENE_GAP_US / US,
        "combined_fade_in_out_materials_added": len(rebuilt),
    }


def update_identity_and_register(draft_dir: Path, draft: dict[str, Any]) -> None:
    now_us = int(time.time() * US)
    project_id = str(uuid.uuid4()).upper()
    draft["name"] = draft_dir.name
    draft["path"] = draft_dir.as_posix()
    draft["update_time"] = now_us

    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
    size = folder_size(draft_dir / "Resources")
    meta.update(
        {
            "draft_id": project_id,
            "draft_name": draft_dir.name,
            "draft_fold_path": draft_dir.as_posix(),
            "draft_root_path": draft_dir.parent.as_posix(),
            "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
            "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
            "draft_is_invisible": False,
            "streaming_edit_draft_ready": True,
            "tm_duration": draft["duration"],
            "tm_draft_modified": now_us,
            "draft_timeline_materials_size": size,
            "draft_timeline_materials_size_": size,
            "tm_draft_removed": 0,
        }
    )
    write_json(meta_path, meta)

    root_path = draft_dir.parent / "root_meta_info.json"
    root = load_json(root_path)
    entry = {
        "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": draft_dir.as_posix(),
        "draft_id": project_id,
        "draft_is_invisible": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_dir.name,
        "draft_new_version": "164.0.0",
        "draft_root_path": draft_dir.parent.as_posix(),
        "draft_timeline_materials_size": size,
        "streaming_edit_draft_ready": True,
        "tm_draft_create": now_us,
        "tm_draft_modified": now_us,
        "tm_draft_removed": 0,
        "tm_duration": draft["duration"],
    }
    root["all_draft_store"] = [
        entry,
        *[
            item
            for item in root.get("all_draft_store", [])
            if item.get("draft_name") != draft_dir.name
            and Path(str(item.get("draft_fold_path", ""))).as_posix().casefold()
            != draft_dir.as_posix().casefold()
            and item.get("draft_id") != project_id
        ],
    ]
    root["draft_ids"] = max(int(root.get("draft_ids", 0) or 0), len(root["all_draft_store"]))
    root["root_path"] = draft_dir.parent.as_posix()
    write_json(root_path, root)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    source_dir = capcut_root / SOURCE_DRAFT_NAME
    if not source_dir.exists():
        raise SystemExit(f"Source draft does not exist: {source_dir}")
    target_dir = unique_draft_dir(capcut_root, TARGET_DRAFT_NAME)
    shutil.copytree(source_dir, target_dir)

    draft = load_json(target_dir / "draft_content.json")
    report = rebuild_background_by_content_scenes(draft, load_content_scene_starts(repo_root))

    for rel in ["draft_content.json", "template-2.tmp", "draft_content.json.bak"]:
        path = target_dir / rel
        if path.exists():
            write_json(path, draft)
    timeline_content = target_dir / "Timelines" / draft["id"] / "draft_content.json"
    if timeline_content.exists():
        write_json(timeline_content, draft)
    update_identity_and_register(target_dir, draft)

    report.update(
        {
            "draft_name": target_dir.name,
            "draft_dir": str(target_dir),
            "source_dir": str(source_dir),
            "changed_tracks": [0],
            "preserved_tracks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        }
    )
    out = repo_root / "exports" / "venga-phrase-packs" / "capcut_bg_content_cut_fade_report.json"
    write_json(out, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
