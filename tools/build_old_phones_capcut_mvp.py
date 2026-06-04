#!/usr/bin/env python3
"""Build an editable native CapCut MVP draft for the old phones documentary."""

from __future__ import annotations

import copy
import json
import math
import shutil
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
WEDNESDAY_TOOLS = ROOT / "lingman-scenarist-pipeline" / "capcut_wednesday_assembler"
sys.path.insert(0, str(WEDNESDAY_TOOLS))

from wednesday_reference import (  # type: ignore  # noqa: E402
    CAPCUT_DRAFTS_DIR,
    clone_wednesday_template,
    folder_size,
    load_json,
    update_timeline_service_files,
    validate_native_clone,
    write_json,
)


SOURCE_DRAFT = "LINGMAN_MONTAZHER_MAX_EDL_STATIC_0525"
DRAFT_NAME = "OLD_PHONES_DOC_MVP_EDITABLE_0529"
OUT_DIR = ROOT / "exports" / "old-phones-doc-mvp"
VIDEO_WIDTH = 1920
VIDEO_HEIGHT = 1080
FPS = 30
US = 1_000_000


@dataclass(frozen=True)
class Scene:
    slug: str
    label: str
    start: float
    duration: float
    color: str
    title: str
    callout: str


SCENES = [
    Scene("01_hook_lag", "HOOK LAG", 0.0, 20.0, "0x111827", "Он же раньше летал.", "Что с ним стало?"),
    Scene("02_heavy_apps", "APPS HEAVIER", 20.0, 45.0, "0x0F766E", "Приложения стали тяжелее", "Видео, кэш, реклама, функции"),
    Scene("03_storage_full", "STORAGE FULL", 65.0, 45.0, "0x7C2D12", "2 GB свободно - это не запас", "Кэш + фото + чаты"),
    Scene("04_battery_aging", "BATTERY AGING", 110.0, 45.0, "0x854D0E", "Старая батарея хуже держит пики", "Для телефона это режим выживания"),
    Scene("05_heat_throttling", "HEAT THROTTLING", 155.0, 45.0, "0x991B1B", "Throttling", "Телефон снижает скорость, чтобы не перегреться"),
    Scene("06_expectations", "EXPECTATIONS", 200.0, 50.0, "0x1D4ED8", "Телефон стареет. Ожидания растут.", "Раньше нормально, сегодня лаг"),
    Scene("07_fixes", "FIXES", 250.0, 60.0, "0x166534", "Что можно сделать", "Память, батарея, приложения, жара"),
]

TEXT_EVENTS = [
    (0.5, 4.0, "Ты нажимаешь. Он думает."),
    (6.0, 5.0, "Он же раньше летал."),
    (16.0, 4.0, "Что изменилось?"),
    (22.0, 5.0, "Приложения стали тяжелее"),
    (38.0, 5.0, "Цифровой мир стал больше"),
    (67.0, 5.0, "2 GB свободно - это не нормально"),
    (87.0, 5.0, "Кэш, фото, чаты, видео"),
    (113.0, 5.0, "Батарея хуже держит пики"),
    (135.0, 5.0, "Система выбирает осторожность"),
    (158.0, 5.0, "THROTTLING"),
    (177.0, 6.0, "Жара режет скорость"),
    (203.0, 6.0, "Изменился не только телефон"),
    (228.0, 6.0, "Изменились твои ожидания"),
    (252.0, 4.0, "1. Освободи память"),
    (260.0, 4.0, "2. Проверь батарею"),
    (268.0, 4.0, "3. Убери лишнее"),
    (276.0, 4.0, "4. Не перегревай"),
    (292.0, 8.0, "Меньше цифрового хаоса"),
]

SCRIPT_MARKERS = [
    (0.0, 20.0, "HOOK: slow tap, loading, frustration"),
    (20.0, 45.0, "B-ROLL: apps, feeds, notifications"),
    (65.0, 45.0, "B-ROLL: storage full, gallery, cache"),
    (110.0, 45.0, "B-ROLL: battery, charging, repair"),
    (155.0, 45.0, "B-ROLL: sun, navigation, gaming"),
    (200.0, 50.0, "B-ROLL: old vs new phone"),
    (250.0, 60.0, "CHECKLIST: fixes and final calm shot"),
]


def new_id() -> str:
    return str(uuid.uuid4()).upper()


def us(seconds: float) -> int:
    return int(round(seconds * US))


def run(command: list[str]) -> None:
    completed = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if completed.returncode != 0:
        raise RuntimeError("Command failed:\n" + " ".join(command) + "\n\n" + completed.stdout)


def placeholder_video_filter(color: str) -> str:
    return (
        f"drawbox=x=0:y=0:w=iw:h=ih:color={color}@1:t=fill,"
        "drawgrid=width=120:height=120:thickness=1:color=white@0.08,"
        "drawbox=x=140:y=820:w=1640:h=120:color=black@0.35:t=fill,"
        "drawbox=x=160:y=840:w=1600:h=80:color=white@0.08:t=fill"
    )


def generate_scene_video(path: Path, scene: Scene) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"color=c={scene.color}:s={VIDEO_WIDTH}x{VIDEO_HEIGHT}:r={FPS}:d={scene.duration}",
            "-vf",
            placeholder_video_filter(scene.color),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(path),
        ]
    )


def generate_audio(path: Path, duration: float, *, kind: str) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    if kind == "voice":
        source = f"sine=frequency=180:sample_rate=44100:duration={duration}"
        volume = "volume=0.10"
    elif kind == "music":
        source = f"sine=frequency=74:sample_rate=44100:duration={duration}"
        volume = "volume=0.045"
    else:
        source = f"sine=frequency=880:sample_rate=44100:duration={duration}"
        volume = "volume=0.12"
    run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            source,
            "-af",
            volume,
            "-c:a",
            "pcm_s16le",
            str(path),
        ]
    )


def probe_media(path: Path) -> None:
    run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)])


def resource_prefix(draft_content: dict[str, Any]) -> str:
    for bucket_name in ("videos", "audios"):
        for item in draft_content.get("materials", {}).get(bucket_name, []):
            path = str(item.get("path", ""))
            if "/Resources/" in path:
                return path.split("/Resources/", 1)[0]
    return "##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##"


def resource_path(prefix: str, name: str) -> str:
    return f"{prefix}/Resources/{name}"


def same_capcut_path(left: str, right: Path) -> bool:
    left_normalized = left.replace("\\", "/").rstrip("/").casefold()
    right_normalized = right.as_posix().rstrip("/").casefold()
    return left_normalized == right_normalized


def sync_root_meta_entry(draft_dir: Path, draft_id: str, duration_us: int, materials_size: int) -> None:
    root_meta_path = CAPCUT_DRAFTS_DIR / "root_meta_info.json"
    root_meta = load_json(root_meta_path) if root_meta_path.exists() else {"all_draft_store": [], "draft_ids": 0}
    entries = [
        entry
        for entry in root_meta.get("all_draft_store", [])
        if entry.get("draft_name") != draft_dir.name
        and not same_capcut_path(str(entry.get("draft_fold_path", "")), draft_dir)
    ]
    now_us = int(time.time() * US)
    entries.insert(
        0,
        {
            "cloud_draft_cover": False,
            "cloud_draft_sync": False,
            "draft_cloud_last_action_download": False,
            "draft_cloud_purchase_info": "",
            "draft_cloud_template_id": "",
            "draft_cloud_tutorial_info": "",
            "draft_cloud_videocut_purchase_info": "",
            "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
            "draft_fold_path": draft_dir.as_posix(),
            "draft_id": draft_id,
            "draft_is_ai_shorts": False,
            "draft_is_cloud_temp_draft": False,
            "draft_is_invisible": False,
            "draft_is_web_article_video": False,
            "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
            "draft_name": draft_dir.name,
            "draft_new_version": "164.0.0",
            "draft_root_path": CAPCUT_DRAFTS_DIR.as_posix(),
            "draft_timeline_materials_size": materials_size,
            "draft_type": "",
            "draft_web_article_video_enter_from": "",
            "streaming_edit_draft_ready": True,
            "tm_draft_cloud_completed": "",
            "tm_draft_cloud_entry_id": -1,
            "tm_draft_cloud_modified": 0,
            "tm_draft_cloud_parent_entry_id": -1,
            "tm_draft_cloud_space_id": -1,
            "tm_draft_cloud_user_id": -1,
            "tm_draft_create": now_us,
            "tm_draft_modified": now_us,
            "tm_draft_removed": 0,
            "tm_duration": duration_us,
        },
    )
    root_meta["all_draft_store"] = entries
    root_meta["draft_ids"] = max(int(root_meta.get("draft_ids", 0) or 0), len(entries))
    root_meta["root_path"] = CAPCUT_DRAFTS_DIR.as_posix()
    if root_meta_path.exists():
        backup = root_meta_path.with_suffix(f".json.bak_{time.strftime('%Y%m%d_%H%M%S')}")
        shutil.copy2(root_meta_path, backup)
    write_json(root_meta_path, root_meta)
    saved = load_json(root_meta_path)
    saved_entries = saved.get("all_draft_store", [])
    if not saved_entries:
        raise RuntimeError("CapCut root_meta_info.json has no draft entries after registration")
    first = saved_entries[0]
    matching = [
        item
        for item in saved_entries
        if item.get("draft_name") == draft_dir.name
        or same_capcut_path(str(item.get("draft_fold_path", "")), draft_dir)
    ]
    if (
        len(matching) != 1
        or first.get("draft_name") != draft_dir.name
        or first.get("draft_id") != draft_id
        or first.get("tm_duration") != duration_us
        or first.get("draft_timeline_materials_size") != materials_size
        or first.get("draft_is_invisible")
        or first.get("tm_draft_removed") != 0
    ):
        raise RuntimeError(
            "CapCut draft registration gate failed: root_meta_info.json does not expose "
            f"{draft_dir.name} as a visible first project"
        )


def clone_segment(template: dict[str, Any], material_id: str, start: float, duration: float, index: int) -> dict[str, Any]:
    segment = copy.deepcopy(template)
    segment["id"] = new_id()
    segment["material_id"] = material_id
    segment["render_index"] = index
    segment["target_timerange"] = {"start": us(start), "duration": us(duration)}
    segment["render_timerange"] = {"start": us(start), "duration": us(duration)}
    if segment.get("source_timerange") is not None:
        segment["source_timerange"] = {"start": 0, "duration": us(duration)}
    segment["keyframe_refs"] = []
    segment["common_keyframes"] = []
    return segment


def update_text_content(existing_content: str, text: str) -> str:
    try:
        content = json.loads(existing_content)
    except json.JSONDecodeError:
        content = {"styles": [{}]}
    content["text"] = text
    styles = content.setdefault("styles", [{}])
    if not styles:
        styles.append({})
    styles[0]["range"] = [0, len(text)]
    styles[0]["size"] = 18.0
    styles[0].setdefault("fill", {"content": {"render_type": "solid", "solid": {"color": [1, 1, 1]}}})
    return json.dumps(content, ensure_ascii=False, separators=(",", ":"))


def make_text_material(template: dict[str, Any], text: str) -> dict[str, Any]:
    material = copy.deepcopy(template)
    material["id"] = new_id()
    material["unique_id"] = new_id()
    material["name"] = "Old phones documentary text"
    material["base_content"] = text
    material["content"] = update_text_content(str(material.get("content", "")), text)
    material["text_color"] = "#FFFFFF"
    material["text_alpha"] = 1.0
    material["font_size"] = 18.0
    material["alignment"] = 1
    material["background_color"] = "#111827"
    material["background_alpha"] = 0.62
    material["background_round_radius"] = 0.08
    material["line_max_width"] = 0.72
    return material


def make_video_material(template: dict[str, Any], path: Path, scene: Scene, prefix: str) -> dict[str, Any]:
    material = copy.deepcopy(template)
    material["id"] = new_id()
    material["unique_id"] = new_id()
    material["name"] = path.name
    material["material_name"] = path.name
    material["path"] = resource_path(prefix, path.name)
    material["media_path"] = ""
    material["duration"] = us(scene.duration)
    material["has_audio"] = False
    material["width"] = VIDEO_WIDTH
    material["height"] = VIDEO_HEIGHT
    return material


def make_audio_material(template: dict[str, Any], path: Path, duration: float, prefix: str, *, name: str) -> dict[str, Any]:
    material = copy.deepcopy(template)
    material["id"] = new_id()
    material["unique_id"] = new_id()
    material["type"] = "extract_music"
    material["name"] = name
    material["material_name"] = name
    material["path"] = resource_path(prefix, path.name)
    material["duration"] = us(duration)
    return material


def build_draft() -> dict[str, Any]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    result = clone_wednesday_template(
        source_draft=SOURCE_DRAFT,
        draft_name=DRAFT_NAME,
        blank_tracks=[],
        copy_mode="copy",
    )
    draft_dir = Path(result["draftDir"])
    resources = draft_dir / "Resources"
    resources.mkdir(exist_ok=True)

    for scene in SCENES:
        generate_scene_video(resources / f"{scene.slug}.mp4", scene)
    total_duration = max(scene.start + scene.duration for scene in SCENES)
    generate_audio(resources / "voiceover_placeholder_guide.wav", total_duration, kind="voice")
    generate_audio(resources / "music_bed_placeholder.wav", total_duration, kind="music")
    generate_audio(resources / "sfx_soft_pop_placeholder.wav", 0.25, kind="sfx")
    for path in resources.glob("*.mp4"):
        probe_media(path)

    content_path = draft_dir / "draft_content.json"
    draft_content = load_json(content_path)
    prefix = resource_prefix(draft_content)
    now_us = int(time.time() * US)
    total_us = us(total_duration)
    timeline_id = str(draft_content["id"])
    draft_content["name"] = draft_dir.name
    draft_content["duration"] = total_us
    draft_content["update_time"] = now_us
    draft_content["path"] = draft_dir.as_posix()

    materials = draft_content["materials"]
    base_video = materials["videos"][0]
    base_audio = materials["audios"][0]
    base_text = materials["texts"][0]

    video_materials = [
        make_video_material(base_video, resources / f"{scene.slug}.mp4", scene, prefix)
        for scene in SCENES
    ]
    voice_material = make_audio_material(
        base_audio,
        resources / "voiceover_placeholder_guide.wav",
        total_duration,
        prefix,
        name="VOICEOVER PLACEHOLDER - replace with narration",
    )
    music_material = make_audio_material(
        base_audio,
        resources / "music_bed_placeholder.wav",
        total_duration,
        prefix,
        name="MUSIC BED PLACEHOLDER - replace with licensed track",
    )
    sfx_material = make_audio_material(
        base_audio,
        resources / "sfx_soft_pop_placeholder.wav",
        0.25,
        prefix,
        name="SFX SOFT POP PLACEHOLDER",
    )

    title_materials = [make_text_material(base_text, scene.title) for scene in SCENES]
    callout_materials = [make_text_material(base_text, scene.callout) for scene in SCENES]
    text_materials = [make_text_material(base_text, text) for _, _, text in TEXT_EVENTS]
    marker_materials = [make_text_material(base_text, text) for _, _, text in SCRIPT_MARKERS]

    materials["videos"] = video_materials
    materials["audios"] = [voice_material, music_material, sfx_material]
    materials["texts"] = title_materials + callout_materials + text_materials + marker_materials

    base_video_segment = draft_content["tracks"][0]["segments"][0]
    base_title_segment = draft_content["tracks"][1]["segments"][0]
    base_callout_segment = draft_content["tracks"][3]["segments"][0]
    base_audio_segment = draft_content["tracks"][5]["segments"][0]

    video_track = copy.deepcopy(draft_content["tracks"][0])
    video_track["name"] = "B-ROLL PLACEHOLDERS - replace each clip"
    video_track["segments"] = [
        clone_segment(base_video_segment, material["id"], scene.start, scene.duration, index)
        for index, (scene, material) in enumerate(zip(SCENES, video_materials, strict=True))
    ]

    title_track = copy.deepcopy(draft_content["tracks"][1])
    title_track["name"] = "Scene title text"
    title_track["segments"] = [
        clone_segment(base_title_segment, material["id"], scene.start + 1.0, min(7.0, scene.duration - 2.0), index)
        for index, (scene, material) in enumerate(zip(SCENES, title_materials, strict=True))
    ]

    callout_track = copy.deepcopy(draft_content["tracks"][3])
    callout_track["name"] = "Callout text"
    callout_track["segments"] = [
        clone_segment(base_callout_segment, material["id"], scene.start + 9.0, min(8.0, scene.duration - 10.0), index)
        for index, (scene, material) in enumerate(zip(SCENES, callout_materials, strict=True))
    ]

    text_track = copy.deepcopy(draft_content["tracks"][2])
    text_track["name"] = "Beat text overlays"
    text_track["segments"] = [
        clone_segment(base_title_segment, material["id"], start, duration, index)
        for index, ((start, duration, _), material) in enumerate(zip(TEXT_EVENTS, text_materials, strict=True))
    ]

    marker_track = copy.deepcopy(draft_content["tracks"][4])
    marker_track["name"] = "Editor notes markers"
    marker_track["segments"] = [
        clone_segment(base_callout_segment, material["id"], start, duration, index)
        for index, ((start, duration, _), material) in enumerate(zip(SCRIPT_MARKERS, marker_materials, strict=True))
    ]

    voice_track = copy.deepcopy(draft_content["tracks"][5])
    voice_track["name"] = "VOICEOVER GUIDE"
    voice_track["segments"] = [clone_segment(base_audio_segment, voice_material["id"], 0.0, total_duration, 0)]
    voice_track["segments"][0]["volume"] = 0.65
    voice_track["segments"][0]["last_nonzero_volume"] = 0.65

    music_track = copy.deepcopy(draft_content["tracks"][5])
    music_track["id"] = new_id()
    music_track["name"] = "MUSIC BED PLACEHOLDER"
    music_track["segments"] = [clone_segment(base_audio_segment, music_material["id"], 0.0, total_duration, 0)]
    music_track["segments"][0]["volume"] = 0.30
    music_track["segments"][0]["last_nonzero_volume"] = 0.30

    sfx_track = copy.deepcopy(draft_content["tracks"][5])
    sfx_track["id"] = new_id()
    sfx_track["name"] = "SFX POPS"
    sfx_starts = [0.5, 6.0, 16.0, 22.0, 67.0, 113.0, 158.0, 203.0, 252.0, 260.0, 268.0, 276.0]
    sfx_track["segments"] = [
        clone_segment(base_audio_segment, sfx_material["id"], start, 0.25, index)
        for index, start in enumerate(sfx_starts)
    ]
    for segment in sfx_track["segments"]:
        segment["volume"] = 0.22
        segment["last_nonzero_volume"] = 0.22

    draft_content["tracks"] = [
        video_track,
        title_track,
        callout_track,
        text_track,
        marker_track,
        voice_track,
        music_track,
        sfx_track,
    ]

    write_json(content_path, draft_content)
    if (draft_dir / "template-2.tmp").exists():
        write_json(draft_dir / "template-2.tmp", draft_content)
    if (draft_dir / "draft_content.json.bak").exists():
        write_json(draft_dir / "draft_content.json.bak", draft_content)
    update_timeline_service_files(draft_dir, timeline_id, timeline_id, draft_content, now_us)

    meta_path = draft_dir / "draft_meta_info.json"
    if meta_path.exists():
        meta = load_json(meta_path)
        meta["draft_name"] = draft_dir.name
        meta["draft_fold_path"] = draft_dir.as_posix()
        meta["draft_root_path"] = CAPCUT_DRAFTS_DIR.as_posix()
        meta["tm_draft_modified"] = now_us
        meta["tm_duration"] = total_us
        meta["draft_timeline_materials_size"] = folder_size(resources)
        meta["draft_timeline_materials_size_"] = folder_size(resources)
        write_json(meta_path, meta)

    sync_root_meta_entry(draft_dir, timeline_id, total_us, folder_size(resources))
    validation = validate_native_clone(draft_dir, [])

    asset_manifest = {
        "draft_name": draft_dir.name,
        "draft_dir": str(draft_dir),
        "duration_seconds": total_duration,
        "status": "placeholder_editable_capcut_mvp",
        "note": "All b-roll/audio media are generated placeholders. Replace with licensed assets before publishing.",
        "scenes": [scene.__dict__ for scene in SCENES],
        "resources": sorted(path.name for path in resources.glob("*") if path.is_file()),
        "validation": validation,
    }
    write_json(OUT_DIR / "asset_manifest.placeholder.json", asset_manifest, compact=False)
    (OUT_DIR / "capcut_native_draft_path.txt").write_text(str(draft_dir) + "\n", encoding="utf-8")
    (OUT_DIR / "README.md").write_text(
        "# Old Phones CapCut MVP\n\n"
        f"Open this editable native CapCut project:\n\n`{draft_dir}`\n\n"
        "This is a placeholder draft: b-roll, text, voice guide, music bed, and SFX are separate layers. "
        "Replace placeholder media with licensed internet/source assets before publishing or monetization.\n",
        encoding="utf-8",
    )
    return asset_manifest


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    manifest = build_draft()
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
