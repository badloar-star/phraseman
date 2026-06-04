from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import time
import uuid
import wave
from pathlib import Path
from typing import Any


CAPCUT_DRAFTS_DIR = (
    Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    / "CapCut"
    / "User Data"
    / "Projects"
    / "com.lveditor.draft"
)
DEFAULT_TEMPLATE_NAME = "PHRASEMAN_A1_FIXED_0524"
DEFAULT_DRAFT_NAME = "LINGMAN_MONTAZHER_V4_0524"
SOURCE_VIDEO_NAME = "lingman_source_current_video.mp4"
POP_SFX_NAMES = [
    "lingman_text_pop_soft_a.wav",
    "lingman_text_pop_soft_b.wav",
    "lingman_text_pop_soft_c.wav",
    "lingman_text_pop_soft_d.wav",
]
CANVAS_WIDTH = 1920
CANVAS_HEIGHT = 1080
SOURCE_WIDTH = 3840
SOURCE_HEIGHT = 2160
TEXT_VISUAL_PREROLL_US = 0
TEXT_POP_SYNC_US = 0
REFERENCE_PHRASE_X = 0.42
REFERENCE_PHRASE_Y = -0.19


def capcut_us(seconds: float) -> int:
    return int(round(seconds * 1_000_000))


def new_capcut_id() -> str:
    return str(uuid.uuid4()).upper()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def unique_draft_dir(base_name: str) -> Path:
    CAPCUT_DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    candidate = CAPCUT_DRAFTS_DIR / base_name
    if not candidate.exists():
        return candidate
    for index in range(2, 100):
        candidate = CAPCUT_DRAFTS_DIR / f"{base_name}_{index:03d}"
        if not candidate.exists():
            return candidate
    raise RuntimeError(f"Could not find a free CapCut draft folder for {base_name}")


def draft_resource_prefix(draft_content: dict[str, Any]) -> str:
    materials = draft_content.get("materials", {})
    if not isinstance(materials, dict):
        return "##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##"
    for bucket_name in ("videos", "audios"):
        for item in materials.get(bucket_name, []) or []:
            path = str(item.get("path", ""))
            if "/Resources/" in path:
                return path.split("/Resources/", 1)[0]
    return "##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##"


def capcut_resource_path(prefix: str, name: str) -> str:
    return f"{prefix}/Resources/{name}"


def deep_clone(value: Any) -> Any:
    return json.loads(json.dumps(value, ensure_ascii=False))


def resolve_draft_dir(name_or_path: str) -> Path:
    path = Path(name_or_path)
    if path.exists():
        return path
    candidate = CAPCUT_DRAFTS_DIR / name_or_path
    if candidate.exists():
        return candidate
    lowered = name_or_path.casefold()
    for child in CAPCUT_DRAFTS_DIR.iterdir():
        if child.is_dir() and child.name.casefold() == lowered:
            return child
    raise FileNotFoundError(f"CapCut draft was not found: {name_or_path}")


def text_from_material(material: dict[str, Any]) -> str:
    content = material.get("content")
    if isinstance(content, str):
        try:
            parsed = json.loads(content)
            text = parsed.get("text")
            if isinstance(text, str):
                return text
        except json.JSONDecodeError:
            pass
    return str(material.get("base_content", ""))


def material_has_latin_text(material: dict[str, Any]) -> bool:
    return any("A" <= char <= "Z" or "a" <= char <= "z" for char in text_from_material(material))


def reference_animation_material(
    segment: dict[str, Any],
    reference_content: dict[str, Any],
) -> dict[str, Any] | None:
    animations = {
        item.get("id"): item
        for item in reference_content.get("materials", {}).get("material_animations", [])
        if isinstance(item, dict)
    }
    for ref_id in segment.get("extra_material_refs") or []:
        material = animations.get(ref_id)
        if material:
            return material
    return None


def load_reference_text_style(draft_name_or_path: str | None) -> dict[str, Any] | None:
    if not draft_name_or_path:
        return None
    draft_dir = resolve_draft_dir(draft_name_or_path)
    reference_content = load_json(draft_dir / "draft_content.json")
    text_materials = {
        item.get("id"): item
        for item in reference_content.get("materials", {}).get("texts", [])
        if isinstance(item, dict)
    }
    rows: list[dict[str, Any]] = []
    for track_index, track in enumerate(reference_content.get("tracks", [])):
        if track.get("type") != "text":
            continue
        for segment in track.get("segments", []):
            material = text_materials.get(segment.get("material_id"))
            if not material:
                continue
            rows.append(
                {
                    "trackIndex": track_index,
                    "segment": segment,
                    "material": material,
                    "text": text_from_material(material),
                    "animation": reference_animation_material(segment, reference_content),
                }
            )
    if not rows:
        return None
    phrase = next(
        (
            row
            for row in rows
            if material_has_latin_text(row["material"])
            and str(row["material"].get("text_color", "")).casefold() == "#ffffff"
            and float(row["material"].get("font_size", 99)) <= 6
        ),
        rows[0],
    )
    accent = next(
        (
            row
            for row in rows
            if material_has_latin_text(row["material"])
            and str(row["material"].get("text_color", "")).casefold() in {"#cbff45", "#ffd396"}
        ),
        phrase,
    )
    title = next(
        (row for row in rows if material_has_latin_text(row["material"]) and float(row["material"].get("font_size", 0)) >= 9),
        phrase,
    )
    return {
        "draftDir": draft_dir,
        "phraseMaterial": phrase["material"],
        "accentMaterial": accent["material"],
        "titleMaterial": title["material"],
        "animationMaterial": phrase.get("animation"),
    }


def hardlink_or_copy(source: Path, target: Path) -> None:
    if target.exists():
        return
    try:
        os.link(source, target)
    except OSError:
        shutil.copy2(source, target)


def write_pop_sfx(path: Path, variant: int) -> None:
    sample_rate = 48_000
    duration = 0.24
    tones = [(220.0, 330.0), (246.94, 369.99), (261.63, 392.0), (293.66, 440.0)]
    low, high = tones[variant % len(tones)]
    total_samples = int(duration * sample_rate)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        pcm = bytearray()
        for offset in range(total_samples):
            t = offset / sample_rate
            attack = min(1.0, t / 0.018)
            release = max(0.0, 1.0 - t / duration)
            envelope = attack * (release**1.8)
            shimmer = math.sin(2 * math.pi * high * t) * 0.34
            body = math.sin(2 * math.pi * low * t) * 0.66
            value = int(max(-1.0, min(1.0, 0.24 * envelope * (body + shimmer))) * 32767)
            pcm.extend(value.to_bytes(2, "little", signed=True))
        handle.writeframes(bytes(pcm))


def set_media_material(
    material: dict[str, Any],
    *,
    path: str,
    name: str,
    duration_us: int,
    width: int = 0,
    height: int = 0,
    has_audio: bool | None = None,
) -> None:
    material["id"] = material.get("id") or new_capcut_id()
    material["unique_id"] = new_capcut_id()
    material["duration"] = duration_us
    material["path"] = path
    material["name"] = name
    material["material_name"] = name
    if "media_path" in material:
        material["media_path"] = ""
    if width:
        material["width"] = width
    if height:
        material["height"] = height
    if has_audio is not None:
        material["has_audio"] = has_audio


def set_timerange(
    segment: dict[str, Any],
    *,
    target_start_us: int,
    duration_us: int,
    source_start_us: int | None = None,
) -> None:
    segment["target_timerange"] = {"start": target_start_us, "duration": duration_us}
    segment["render_timerange"] = {"start": 0, "duration": 0}
    if source_start_us is not None:
        segment["source_timerange"] = {"start": source_start_us, "duration": duration_us}


def clear_manual_segment_animation(segment: dict[str, Any]) -> None:
    segment["keyframe_refs"] = []
    segment["common_keyframes"] = []
    segment["extra_material_refs"] = []
    segment["template_id"] = ""
    segment["lyric_keyframes"] = None


def remove_template_animation_refs(segment: dict[str, Any], animation_ids: set[str]) -> None:
    if not animation_ids:
        return
    segment["extra_material_refs"] = [
        material_id
        for material_id in segment.get("extra_material_refs", []) or []
        if material_id not in animation_ids
    ]


def add_reference_native_animation(
    segment: dict[str, Any],
    materials: dict[str, Any],
    reference_style: dict[str, Any] | None,
) -> None:
    if not reference_style or not reference_style.get("animationMaterial"):
        return
    animation_material = deep_clone(reference_style["animationMaterial"])
    animation_material["id"] = new_capcut_id()
    materials.setdefault("material_animations", []).append(animation_material)
    segment["extra_material_refs"] = [animation_material["id"]]


def capcut_text_content(
    existing_content: str,
    text: str,
    font_size: float,
    color: tuple[float, float, float] = (1.0, 1.0, 1.0),
) -> str:
    try:
        content = json.loads(existing_content)
    except json.JSONDecodeError:
        content = {"styles": [{}]}
    content["text"] = text
    styles = content.setdefault("styles", [{}])
    if not styles:
        styles.append({})
    styles[0]["range"] = [0, len(text)]
    styles[0]["size"] = font_size
    styles[0]["fill"] = {"content": {"render_type": "solid", "solid": {"color": list(color)}}}
    return json.dumps(content, ensure_ascii=False, separators=(",", ":"))


def update_text_material(material: dict[str, Any], text: str, role: str) -> None:
    line_count = max(1, text.count("\n") + 1)
    longest_line = max(len(line) for line in text.splitlines() or [text])
    reference_sized = float(material.get("font_size", 0.0)) <= 6.0 and material.get("font_path")
    if reference_sized:
        font_size = 4.5 if longest_line > 30 else 5.0
    else:
        font_size = 7.2 if longest_line > 30 else 8.2
    color = (0.80, 1.0, 0.27) if role == "correction" else (1.0, 1.0, 1.0)
    material["id"] = new_capcut_id()
    material["unique_id"] = new_capcut_id()
    material["base_content"] = text
    material["content"] = capcut_text_content(str(material.get("content", "")), text, font_size, color)
    material["font_size"] = font_size
    material["text_color"] = "#CBFF45" if role == "correction" else "#FFFFFF"
    material["text_alpha"] = 1.0
    material["alignment"] = 1
    material["has_shadow"] = True
    material["shadow_color"] = "#000000"
    material["shadow_alpha"] = 0.9
    material["shadow_smoothing"] = 0.45 if reference_sized else 0.35
    material["shadow_distance"] = 5.0 if reference_sized else 3.0
    material["border_color"] = "#000000"
    material["border_alpha"] = 1.0
    material["border_width"] = 0.08 if reference_sized else 0.035
    material["background_alpha"] = 0.0
    material["background_width"] = 0.0
    material["background_height"] = 0.0
    material["line_max_width"] = 0.50 if reference_sized and longest_line > 30 else 0.42 if longest_line > 30 else 0.34
    material["fixed_width"] = -1.0
    material["fixed_height"] = -1.0


def update_plaque_material(material: dict[str, Any], text: str) -> None:
    line_count = max(1, text.count("\n") + 1)
    longest_line = max(len(line) for line in text.splitlines() or [text])
    width = 0.45 if longest_line > 30 else 0.34
    height = 0.095 + (line_count - 1) * 0.062
    material["id"] = new_capcut_id()
    material["unique_id"] = new_capcut_id()
    material["base_content"] = "\n".join(" " * max(8, min(34, longest_line + 3)) for _ in range(line_count))
    material["content"] = capcut_text_content(str(material.get("content", "")), material["base_content"], 1.0, (0.0, 0.0, 0.0))
    material["font_size"] = 1.0
    material["text_alpha"] = 0.0
    material["text_color"] = "#000000"
    material["background_style"] = 1
    material["background_color"] = "#161616"
    material["background_alpha"] = 0.74
    material["background_round_radius"] = 0.08
    material["background_width"] = width
    material["background_height"] = height
    material["line_max_width"] = width
    material["fixed_width"] = -1.0
    material["fixed_height"] = -1.0


def selected_decisions(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    decisions = [
        decision
        for decision in manifest.get("editDecisions", [])
        if decision.get("decision") == "take_selected"
        and float(decision.get("sourceEnd", 0)) > float(decision.get("sourceStart", 0))
    ]
    if not decisions:
        raise ValueError("Manifest has no take_selected decisions")
    return decisions


def build_meta_materials(
    *,
    duration_us: int,
    video_id: str,
    video_name: str,
    sfx_assets: list[tuple[str, str]],
    now_seconds: int,
) -> list[dict[str, Any]]:
    def item(
        *,
        material_id: str,
        name: str,
        metetype: str,
        width: int = 0,
        height: int = 0,
        duration: int = duration_us,
    ) -> dict[str, Any]:
        return {
            "ai_group_type": "",
            "create_time": now_seconds,
            "duration": duration,
            "enter_from": 0,
            "extra_info": name,
            "file_Path": f"./Resources/{name}",
            "height": height,
            "id": material_id,
            "import_time": now_seconds,
            "import_time_ms": now_seconds * 1_000_000,
            "item_source": 1,
            "md5": "",
            "metetype": metetype,
            "roughcut_time_range": {"duration": duration, "start": 0},
            "sub_time_range": {"duration": -1, "start": -1},
            "type": 0,
            "width": width,
        }

    return [
        {
            "type": 0,
            "value": [
                item(material_id=video_id, name=video_name, metetype="video", width=SOURCE_WIDTH, height=SOURCE_HEIGHT),
                *[
                    item(material_id=sfx_id, name=sfx_name, metetype="music", duration=capcut_us(0.24))
                    for sfx_id, sfx_name in sfx_assets
                ],
            ],
        },
        {"type": 1, "value": []},
        {"type": 2, "value": []},
        {"type": 3, "value": []},
        {"type": 6, "value": []},
        {"type": 7, "value": []},
        {"type": 8, "value": []},
        {"type": 18, "value": []},
    ]


def reset_service_files(draft_dir: Path, draft_id: str) -> None:
    write_json(
        draft_dir / "timeline_layout.json",
        {
            "dockItems": [
                {"dockIndex": 0, "ratio": 1, "timelineIds": [draft_id], "timelineNames": ["Timeline 01"]}
            ],
            "layoutOrientation": 1,
        },
    )
    biz_path = draft_dir / "draft_biz_config.json"
    if biz_path.exists():
        write_json(biz_path, {"timeline_settings": {draft_id: {"linkage_enabled": False}}})
    for cache_name in ("key_value.json", "performance_opt_info.json", "draft_content.json.bak", "template-2.tmp", ".locked"):
        cache_path = draft_dir / cache_name
        if cache_path.exists():
            cache_path.unlink()


def update_timeline_files(draft_dir: Path, draft_content: dict[str, Any], now_us: int) -> None:
    timelines_dir = draft_dir / "Timelines"
    if not timelines_dir.exists():
        return
    timeline_dirs = [path for path in timelines_dir.iterdir() if path.is_dir()]
    if not timeline_dirs:
        return
    draft_id = str(draft_content["id"])
    timeline_dir = timeline_dirs[0]
    target_timeline_dir = timelines_dir / draft_id
    if timeline_dir != target_timeline_dir:
        timeline_dir.rename(target_timeline_dir)
        timeline_dir = target_timeline_dir
    write_json(timeline_dir / "draft_content.json", draft_content)
    project_path = timelines_dir / "project.json"
    if project_path.exists():
        project = load_json(project_path)
        project["id"] = draft_id
        project["main_timeline_id"] = draft_id
        project["update_time"] = now_us
        project["create_time"] = now_us
        for timeline in project.get("timelines", []):
            timeline["id"] = draft_id
            timeline["name"] = "Timeline 01"
            timeline["is_marked_delete"] = False
            timeline["update_time"] = now_us
            timeline["create_time"] = now_us
        write_json(project_path, project)
        backup_path = timelines_dir / "project.json.bak"
        if backup_path.exists():
            write_json(backup_path, project)


def register_root_meta_info(
    *,
    draft_dir: Path,
    draft_id: str,
    draft_name: str,
    duration_us: int,
    now_us: int,
    timeline_materials_size: int,
) -> None:
    root_meta_path = CAPCUT_DRAFTS_DIR / "root_meta_info.json"
    if root_meta_path.exists():
        root_meta = load_json(root_meta_path)
    else:
        root_meta = {"all_draft_store": [], "draft_ids": 0, "root_path": CAPCUT_DRAFTS_DIR.as_posix()}

    entries = root_meta.setdefault("all_draft_store", [])
    draft_path = draft_dir.as_posix()
    kept_entries = [
        entry
        for entry in entries
        if entry.get("draft_name") != draft_name and Path(str(entry.get("draft_fold_path", ""))).as_posix() != draft_path
    ]
    existing = next(
        (
            entry
            for entry in entries
            if entry.get("draft_name") == draft_name or Path(str(entry.get("draft_fold_path", ""))).as_posix() == draft_path
        ),
        {},
    )
    entry = {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cloud_last_action_download": False,
        "draft_cloud_purchase_info": "",
        "draft_cloud_template_id": "",
        "draft_cloud_tutorial_info": "",
        "draft_cloud_videocut_purchase_info": "",
        "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": draft_path,
        "draft_id": draft_id,
        "draft_is_ai_shorts": False,
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_is_web_article_video": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_name,
        "draft_new_version": existing.get("draft_new_version", "164.0.0"),
        "draft_root_path": CAPCUT_DRAFTS_DIR.as_posix(),
        "draft_timeline_materials_size": timeline_materials_size,
        "draft_type": "",
        "draft_web_article_video_enter_from": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_cloud_completed": "",
        "tm_draft_cloud_entry_id": -1,
        "tm_draft_cloud_modified": 0,
        "tm_draft_cloud_parent_entry_id": -1,
        "tm_draft_cloud_space_id": -1,
        "tm_draft_cloud_user_id": -1,
        "tm_draft_create": existing.get("tm_draft_create", now_us),
        "tm_draft_modified": now_us,
        "tm_draft_removed": 0,
        "tm_duration": duration_us,
    }
    kept_entries.append(entry)
    kept_entries.sort(key=lambda item: int(item.get("tm_draft_modified") or 0), reverse=True)
    root_meta["all_draft_store"] = kept_entries
    root_meta["draft_ids"] = max(int(root_meta.get("draft_ids", 0) or 0), len(kept_entries))
    root_meta["root_path"] = CAPCUT_DRAFTS_DIR.as_posix()
    write_json(root_meta_path, root_meta)


def export_draft(
    *,
    manifest_path: Path,
    source_video: Path,
    out_dir: Path,
    template_name: str,
    draft_name: str,
    reference_draft_name: str | None = None,
    reference_text_style: str = "off",
) -> Path:
    manifest = load_json(manifest_path)
    decisions = selected_decisions(manifest)
    screen_text = manifest.get("screenText", [])
    motion_by_id = {effect.get("targetId"): effect for effect in manifest.get("motionEffects", [])}
    reference_style = load_reference_text_style(reference_draft_name) if reference_text_style != "off" else None

    template = CAPCUT_DRAFTS_DIR / template_name
    if not (template / "draft_content.json").exists():
        raise FileNotFoundError(f"CapCut template draft was not found: {template}")

    draft_dir = unique_draft_dir(draft_name)
    shutil.copytree(template, draft_dir)

    resources_dir = draft_dir / "Resources"
    resources_dir.mkdir(exist_ok=True)
    source_resource = resources_dir / SOURCE_VIDEO_NAME
    pop_resources = [resources_dir / name for name in POP_SFX_NAMES]
    hardlink_or_copy(source_video, source_resource)
    for index, pop_resource in enumerate(pop_resources):
        write_pop_sfx(pop_resource, index)

    draft_content_path = draft_dir / "draft_content.json"
    draft_content = load_json(draft_content_path)
    prefix = draft_dir.as_posix()
    now_us = int(time.time() * 1_000_000)
    now_seconds = now_us // 1_000_000
    draft_id = new_capcut_id()
    total_us = capcut_us(float(manifest["project"]["editedDuration"]))
    source_duration_us = capcut_us(float(manifest["project"]["duration"]))

    draft_content["id"] = draft_id
    draft_content["name"] = draft_dir.name
    draft_content["duration"] = total_us
    draft_content["update_time"] = now_us
    draft_content["create_time"] = now_us
    draft_content["path"] = draft_dir.as_posix()
    draft_content["canvas_config"] = {
        "ratio": "original",
        "width": CANVAS_WIDTH,
        "height": CANVAS_HEIGHT,
        "background": None,
    }

    materials = draft_content["materials"]
    template_animation_ids = {
        str(item.get("id"))
        for item in materials.get("material_animations", []) or []
        if isinstance(item, dict) and item.get("id")
    }
    materials["material_animations"] = []

    video_material = deep_clone(materials["videos"][0])
    video_material["id"] = new_capcut_id()
    set_media_material(
        video_material,
        path=capcut_resource_path(prefix, SOURCE_VIDEO_NAME),
        name=SOURCE_VIDEO_NAME,
        duration_us=source_duration_us,
        width=SOURCE_WIDTH,
        height=SOURCE_HEIGHT,
        has_audio=True,
    )
    materials["videos"] = [video_material]

    sfx_template = (materials.get("audios") or [{}])[-1]
    sfx_materials: list[dict[str, Any]] = []
    for pop_resource in pop_resources:
        sfx_material = deep_clone(sfx_template)
        sfx_material["id"] = new_capcut_id()
        set_media_material(
            sfx_material,
            path=capcut_resource_path(prefix, pop_resource.name),
            name=pop_resource.name,
            duration_us=capcut_us(0.24),
        )
        sfx_materials.append(sfx_material)
    materials["audios"] = sfx_materials

    template_text_materials = materials.get("texts") or [{}]
    base_plaque_material = deep_clone(template_text_materials[0])
    base_text_material = deep_clone(template_text_materials[1] if len(template_text_materials) > 1 else template_text_materials[0])
    plaque_materials: list[dict[str, Any]] = []
    text_materials: list[dict[str, Any]] = []
    for event in screen_text:
        plaque_material = deep_clone(base_plaque_material)
        update_plaque_material(plaque_material, str(event["text"]))
        plaque_materials.append(plaque_material)
        if reference_style:
            reference_material = (
                reference_style["accentMaterial"]
                if str(event.get("role", "phrase")) == "correction"
                else reference_style["phraseMaterial"]
            )
            material = deep_clone(reference_material)
        else:
            material = deep_clone(base_text_material)
        update_text_material(material, str(event["text"]), str(event.get("role", "phrase")))
        text_materials.append(material)
    materials["texts"] = plaque_materials + text_materials

    video_template_track = next(track for track in draft_content["tracks"] if track.get("type") == "video")
    video_template_segment = video_template_track["segments"][0]
    video_track = deep_clone(video_template_track)
    video_track["id"] = new_capcut_id()
    video_track["name"] = "Lingman selected takes"
    video_track["segments"] = []
    for index, decision in enumerate(decisions):
        duration_us = capcut_us(float(decision["sourceEnd"]) - float(decision["sourceStart"]))
        segment = deep_clone(video_template_segment)
        segment["id"] = new_capcut_id()
        segment["material_id"] = video_material["id"]
        segment["render_index"] = index
        set_timerange(
            segment,
            target_start_us=capcut_us(float(decision["outputStart"])),
            duration_us=duration_us,
            source_start_us=capcut_us(float(decision["sourceStart"])),
        )
        segment["volume"] = 1.0
        segment["last_nonzero_volume"] = 1.0
        motion = motion_by_id.get(decision["id"], {})
        zoom = max(1.0, min(1.18, float(motion.get("zoom", 1.0)) if isinstance(motion, dict) else 1.0))
        segment.setdefault("clip", {}).setdefault("scale", {})
        segment["clip"]["scale"] = {"x": zoom, "y": zoom}
        transform = segment.setdefault("clip", {}).setdefault("transform", {"x": 0.0, "y": 0.0})
        if isinstance(motion, dict):
            transform["x"] = float(motion.get("x", motion.get("reframeX", transform.get("x", 0.0))))
            transform["y"] = float(motion.get("y", motion.get("reframeY", transform.get("y", 0.0))))
        segment["uniform_scale"] = {"on": True, "value": zoom}
        remove_template_animation_refs(segment, template_animation_ids)
        video_track["segments"].append(segment)

    text_tracks = [track for track in draft_content["tracks"] if track.get("type") == "text"]
    plaque_template_track = min(text_tracks, key=lambda track: len(track.get("segments", [])))
    text_template_track = max(text_tracks, key=lambda track: len(track.get("segments", [])))
    plaque_template_segment = plaque_template_track["segments"][0]
    text_template_segment = text_template_track["segments"][0]

    plaque_track = deep_clone(plaque_template_track)
    plaque_track["id"] = new_capcut_id()
    plaque_track["name"] = "Lingman dark plaque backs"
    plaque_track["segments"] = []

    text_track = deep_clone(text_template_track)
    text_track["id"] = new_capcut_id()
    text_track["name"] = "Lingman English phrase overlays"
    text_track["segments"] = []
    for index, (event, plaque_material, material) in enumerate(
        zip(screen_text, plaque_materials, text_materials, strict=False)
    ):
        duration = max(0.2, float(event["end"]) - float(event["start"]))
        event_start_us = capcut_us(float(event["start"]))
        visual_start_us = max(0, event_start_us - TEXT_VISUAL_PREROLL_US)
        duration_us = capcut_us(duration) + (event_start_us - visual_start_us)
        plaque_segment = deep_clone(plaque_template_segment)
        plaque_segment["id"] = new_capcut_id()
        plaque_segment["material_id"] = plaque_material["id"]
        plaque_segment["render_index"] = index
        set_timerange(
            plaque_segment,
            target_start_us=visual_start_us,
            duration_us=duration_us,
        )
        plaque_segment.setdefault("clip", {}).setdefault("transform", {})
        slot = int(event.get("slot", 0))
        text_x = REFERENCE_PHRASE_X if reference_style else 0.23
        text_y = REFERENCE_PHRASE_Y - slot * 0.10
        plaque_segment["clip"]["transform"] = {"x": text_x, "y": text_y}
        plaque_segment.setdefault("clip", {}).setdefault("scale", {})
        plaque_segment["clip"]["scale"] = {"x": 1.0, "y": 1.0}
        clear_manual_segment_animation(plaque_segment)
        if reference_text_style == "native":
            add_reference_native_animation(plaque_segment, materials, reference_style)
        plaque_track["segments"].append(plaque_segment)

        segment = deep_clone(text_template_segment)
        segment["id"] = new_capcut_id()
        segment["material_id"] = material["id"]
        segment["render_index"] = index
        set_timerange(
            segment,
            target_start_us=visual_start_us,
            duration_us=duration_us,
        )
        segment.setdefault("clip", {}).setdefault("transform", {})
        segment["clip"]["transform"] = {"x": text_x, "y": text_y}
        segment.setdefault("clip", {}).setdefault("scale", {})
        segment["clip"]["scale"] = {"x": 1.0, "y": 1.0}
        clear_manual_segment_animation(segment)
        if reference_text_style == "native":
            add_reference_native_animation(segment, materials, reference_style)
        text_track["segments"].append(segment)

    audio_template_track = max(
        (track for track in draft_content["tracks"] if track.get("type") == "audio"),
        key=lambda track: len(track.get("segments", [])),
    )
    audio_template_segment = audio_template_track["segments"][0]
    sfx_track = deep_clone(audio_template_track)
    sfx_track["id"] = new_capcut_id()
    sfx_track["name"] = "Lingman text pop SFX"
    sfx_track["segments"] = []
    for index, event in enumerate(screen_text):
        segment = deep_clone(audio_template_segment)
        segment["id"] = new_capcut_id()
        variant = int(event.get("sfxVariant", index)) % len(sfx_materials)
        segment["material_id"] = sfx_materials[variant]["id"]
        segment["render_index"] = index
        segment["volume"] = 0.18
        segment["last_nonzero_volume"] = 0.18
        set_timerange(
            segment,
            target_start_us=max(0, capcut_us(float(event["start"])) + TEXT_POP_SYNC_US),
            duration_us=capcut_us(0.24),
            source_start_us=0,
        )
        sfx_track["segments"].append(segment)

    draft_content["tracks"] = [video_track, plaque_track, text_track, sfx_track]

    reset_service_files(draft_dir, draft_id)
    write_json(draft_content_path, draft_content)
    update_timeline_files(draft_dir, draft_content, now_us)

    meta_path = draft_dir / "draft_meta_info.json"
    if meta_path.exists():
        meta = load_json(meta_path)
        meta["draft_id"] = draft_id
        meta["draft_name"] = draft_dir.name
        meta["draft_fold_path"] = draft_dir.as_posix()
        meta["draft_root_path"] = CAPCUT_DRAFTS_DIR.as_posix()
        meta["draft_materials"] = build_meta_materials(
            duration_us=total_us,
            video_id=video_material["id"],
            video_name=SOURCE_VIDEO_NAME,
            sfx_assets=[(material["id"], material["name"]) for material in sfx_materials],
            now_seconds=now_seconds,
        )
        meta["draft_timeline_materials_size_"] = source_resource.stat().st_size + sum(
            path.stat().st_size for path in pop_resources
        )
        meta["tm_draft_create"] = now_us
        meta["tm_draft_modified"] = now_us
        meta["tm_duration"] = total_us
        write_json(meta_path, meta)
        timeline_materials_size = int(meta["draft_timeline_materials_size_"])
    else:
        timeline_materials_size = source_resource.stat().st_size + sum(path.stat().st_size for path in pop_resources)

    register_root_meta_info(
        draft_dir=draft_dir,
        draft_id=draft_id,
        draft_name=draft_dir.name,
        duration_us=total_us,
        now_us=now_us,
        timeline_materials_size=timeline_materials_size,
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "capcut_native_draft_path.txt").write_text(str(draft_dir) + "\n", encoding="utf-8")
    (out_dir / "capcut_open_instructions.md").write_text(
        "# Open in CapCut\n\n"
        f"Native draft folder:\n\n`{draft_dir}`\n\n"
        "Open CapCut Desktop, go to Projects, and open this draft. "
        "The timeline contains separate selected-take video clips, editable English phrase text clips, "
        "and individual text-pop SFX clips.\n",
        encoding="utf-8",
    )
    (out_dir / "capcut_edit_decisions.csv").write_text(
        "clip_id,source_start,source_end,output_start,output_end,reason\n"
        + "\n".join(
            ",".join(
                [
                    str(decision["id"]),
                    str(decision["sourceStart"]),
                    str(decision["sourceEnd"]),
                    str(decision["outputStart"]),
                    str(decision["outputEnd"]),
                    '"' + str(decision.get("reason", "")).replace('"', '""') + '"',
                ]
            )
            for decision in decisions
        )
        + "\n",
        encoding="utf-8",
    )
    return draft_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Export Lingman Montazher manifest as an editable CapCut draft.")
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--source-video", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--template-name", default=DEFAULT_TEMPLATE_NAME)
    parser.add_argument("--draft-name", default=DEFAULT_DRAFT_NAME)
    parser.add_argument("--reference-draft-name", default="")
    parser.add_argument("--reference-text-style", choices=("off", "static", "native"), default="off")
    args = parser.parse_args()
    draft_dir = export_draft(
        manifest_path=args.manifest,
        source_video=args.source_video,
        out_dir=args.out_dir,
        template_name=args.template_name,
        draft_name=args.draft_name,
        reference_draft_name=args.reference_draft_name or None,
        reference_text_style=args.reference_text_style,
    )
    print(draft_dir)


if __name__ == "__main__":
    main()
