#!/usr/bin/env python3
"""Apply the semantic intro montage video to the nested CapCut intro draft."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
DRAFT_DIR = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft" / DRAFT_NAME
CONTENT_PATH = DRAFT_DIR / "draft_content.json"
META_PATH = DRAFT_DIR / "draft_meta_info.json"
TMP_PATH = DRAFT_DIR / "template-2.tmp"
MANIFEST_PATH = Path("exports/chains/episode1/unique_explanations_approved/intro_semantic_manifest.json")
INTRO_RESOURCE_DIR = DRAFT_DIR / "Resources" / "chains_intro_semantic"
INTRO_SUPPORT_TEXTS = [
    "ЯЗЫК НЕ УЧАТ\nСЛОВАМИ",
    "ЕГО СОБИРАЮТ\nСМЫСЛОМ",
    "ДЕЙСТВИЕ",
    "ПРИЧИНА",
    "ВРЕМЯ",
    "МЕСТО",
    "СМЫСЛ\nСТАНОВИТСЯ ЦЕЛЬНЫМ",
]


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


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def backup() -> Path:
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.backup-before-intro-netflix-doc"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(DRAFT_DIR, out)
    return out


def find_intro_draft(content: dict[str, Any]) -> dict[str, Any]:
    candidates: list[dict[str, Any]] = []
    for material in content.get("materials", {}).get("drafts", []):
        draft = material.get("draft", {})
        if draft.get("name") == "My presets37":
            return draft
        video_tracks = [
            track for track in draft.get("tracks", []) if track.get("type") == "video" and track.get("segments")
        ]
        text_tracks = [
            track for track in draft.get("tracks", []) if track.get("type") == "text" and track.get("segments")
        ]
        if video_tracks and text_tracks and int(draft.get("duration", 0)) >= 40_000_000:
            candidates.append(draft)
    if len(candidates) == 1:
        return candidates[0]
    raise RuntimeError("Nested intro draft not found by name or structure.")


def material_by_id(materials: dict[str, Any], material_id: str) -> dict[str, Any] | None:
    for group in materials.values():
        if isinstance(group, list):
            for material in group:
                if isinstance(material, dict) and material.get("id") == material_id:
                    return material
    return None


def make_video_material(template: dict[str, Any], path: Path, duration_us: int) -> dict[str, Any]:
    material = json.loads(json.dumps(template))
    material["id"] = gid()
    material["unique_id"] = gid()
    material["local_material_id"] = gid().lower()
    material["path"] = str(path)
    material["name"] = path.name
    material["material_name"] = path.name
    material["duration"] = duration_us
    material["width"] = 1920
    material["height"] = 1080
    material["has_audio"] = False
    return material


def make_text_material(template: dict[str, Any], text: str) -> dict[str, Any]:
    material = json.loads(json.dumps(template))
    material["id"] = gid()
    material["base_content"] = text
    material["font_size"] = 11.0
    material["text_size"] = 46
    material["text_color"] = "#ffc416"
    material["text_alpha"] = 1.0
    content = json.loads(str(material.get("content") or "{}"))
    content["text"] = text
    for style in content.get("styles", []):
        style["range"] = [0, len(text)]
        style["size"] = 11.0
        fill = style.setdefault("fill", {}).setdefault("content", {}).setdefault("solid", {})
        fill["color"] = [1, 0.7686274648, 0.0862745121]
        border = style.setdefault("border", {})
        border["alpha"] = 0.78
        border["width"] = 0.075
        shadow = style.setdefault("shadow", {})
        shadow["alpha"] = 0.9
        shadow["angle"] = -45
        shadow["distance"] = 10
        shadow["smoothing"] = 0.48
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    return material


def slow_zoom_keyframes(duration_us: int) -> list[dict[str, Any]]:
    def one_axis(property_type: str) -> dict[str, Any]:
        return {
            "id": gid(),
            "material_id": "",
            "property_type": property_type,
            "keyframe_list": [
                {
                    "id": gid(),
                    "curveType": "Line",
                    "time_offset": 0,
                    "left_control": {"x": 0.0, "y": 0.0},
                    "right_control": {"x": 0.0, "y": 0.0},
                    "values": [1.0],
                    "string_value": "",
                    "graphID": "",
                },
                {
                    "id": gid(),
                    "curveType": "Line",
                    "time_offset": max(500_000, duration_us),
                    "left_control": {"x": 0.0, "y": 0.0},
                    "right_control": {"x": 0.0, "y": 0.0},
                    "values": [1.08],
                    "string_value": "",
                    "graphID": "",
                },
            ],
        }

    return [one_axis("KFTypeScaleX"), one_axis("KFTypeScaleY")]


def validate_safe_intro_titles(texts: list[str]) -> None:
    for index, text in enumerate(texts, start=1):
        lines = text.splitlines() or [text]
        if len(lines) > 2:
            raise RuntimeError(f"Intro title {index} has more than 2 lines: {text!r}")
        if any(len(line) > 24 for line in lines):
            raise RuntimeError(f"Intro title {index} line is too long for safe zone: {text!r}")
        if any(" " not in line and len(line) > 13 for line in lines):
            raise RuntimeError(f"Intro title {index} has unsafe long unbroken word: {text!r}")


def clone_track(template: dict[str, Any], name: str, segments: list[dict[str, Any]]) -> dict[str, Any]:
    track = json.loads(json.dumps(template))
    track["id"] = gid()
    track["name"] = name
    track["is_default_name"] = False
    track["segments"] = segments
    return track


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close CapCut before applying intro semantic background.")
    validate_safe_intro_titles(INTRO_SUPPORT_TEXTS)
    manifest = read_json(MANIFEST_PATH)
    if manifest.get("status") != "approved":
        raise SystemExit("Intro semantic manifest is not approved.")
    shots = list(manifest.get("shots") or [])
    if not shots:
        raise SystemExit("Intro semantic manifest has no shots.")
    rendered_paths = [Path(shot["rendered_asset_path"]) for shot in shots]
    missing = [str(path) for path in rendered_paths if not path.exists()]
    if missing:
        raise SystemExit(f"Intro rendered shot files missing: {missing[:5]}")

    backup_path = backup()
    content = read_json(CONTENT_PATH)
    intro = find_intro_draft(content)
    intro_video_track = next(
        (track for track in intro["tracks"] if track.get("type") == "video" and track.get("segments")),
        None,
    )
    if intro_video_track is None:
        raise RuntimeError("Intro background video track missing.")
    if not intro_video_track.get("segments"):
        raise RuntimeError("Intro background video segment missing.")
    video_template_segment = intro_video_track["segments"][0]
    video_template_material = material_by_id(intro.get("materials", {}), video_template_segment["material_id"])
    if video_template_material is None:
        raise RuntimeError("Intro background video material not found.")
    text_template_track = next((track for track in intro["tracks"] if track.get("type") == "text" and track.get("segments")), None)
    if text_template_track is None:
        raise RuntimeError("Intro text template track not found.")
    text_template_segment = text_template_track["segments"][0]
    text_template_material = material_by_id(intro.get("materials", {}), text_template_segment["material_id"])
    if text_template_material is None:
        raise RuntimeError("Intro text template material not found.")

    INTRO_RESOURCE_DIR.mkdir(parents=True, exist_ok=True)
    intro.get("materials", {}).setdefault("videos", [])
    intro.get("materials", {}).setdefault("texts", [])
    video_segments: list[dict[str, Any]] = []
    text_segments: list[dict[str, Any]] = []
    for index, shot in enumerate(shots, start=1):
        source = Path(shot["rendered_asset_path"])
        target = INTRO_RESOURCE_DIR / source.name
        shutil.copy2(source, target)
        start_us = int(round(float(shot["start_sec"]) * 1_000_000))
        duration_us = int(round(float(shot["duration_sec"]) * 1_000_000))
        video_material = make_video_material(video_template_material, target, duration_us)
        intro["materials"]["videos"].append(video_material)
        video_segment = json.loads(json.dumps(video_template_segment))
        video_segment["id"] = gid()
        video_segment["material_id"] = video_material["id"]
        video_segment["target_timerange"] = {"start": start_us, "duration": duration_us}
        video_segment["source_timerange"] = {"start": 0, "duration": duration_us}
        video_segment["render_index"] = 1000 + index
        video_segments.append(video_segment)

        text = INTRO_SUPPORT_TEXTS[index - 1] if index <= len(INTRO_SUPPORT_TEXTS) else str(shot["voiceover_phrase"]).upper()
        text_material = make_text_material(text_template_material, text)
        intro["materials"]["texts"].append(text_material)
        text_segment = json.loads(json.dumps(text_template_segment))
        text_segment["id"] = gid()
        text_segment["material_id"] = text_material["id"]
        text_segment["target_timerange"] = {
            "start": start_us + 180_000,
            "duration": max(500_000, duration_us - 360_000),
        }
        text_segment["source_timerange"] = None
        text_segment["visible"] = True
        text_segment["render_index"] = 2000 + index
        text_segment["clip"]["transform"] = {"x": 0.0, "y": 0.0}
        text_segment["clip"]["scale"] = {"x": 0.9, "y": 0.9}
        text_segment["common_keyframes"] = slow_zoom_keyframes(duration_us)
        text_segments.append(text_segment)

    intro_video_track["segments"] = video_segments
    intro["tracks"] = [track for track in intro["tracks"] if track.get("type") != "text"]
    intro["tracks"].append(clone_track(text_template_track, "CODEx INTRO SUPPORT TEXT", text_segments))
    intro["duration"] = 44_000_000

    write_json(CONTENT_PATH, content)
    if TMP_PATH.exists():
        write_json(TMP_PATH, content)
    meta = read_json(META_PATH)
    meta["tm_duration"] = content["duration"]
    write_json(META_PATH, meta)
    report = {
        "backup": str(backup_path),
        "draft_dir": str(DRAFT_DIR),
        "intro_visible_video_segments": len(video_segments),
        "intro_support_text_segments": len(text_segments),
        "intro_support_texts": INTRO_SUPPORT_TEXTS,
        "intro_manifest": str(MANIFEST_PATH),
    }
    out = Path("exports/chains/episode1/unique_explanations_approved/intro_semantic_apply_report.json")
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
