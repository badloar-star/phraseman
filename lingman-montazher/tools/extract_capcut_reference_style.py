from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from pathlib import Path
from typing import Any


CAPCUT_DRAFTS_DIR = (
    Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    / "CapCut"
    / "User Data"
    / "Projects"
    / "com.lveditor.draft"
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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


def material_summary(material: dict[str, Any]) -> dict[str, Any]:
    return {
        "text": text_from_material(material),
        "fontSize": material.get("font_size"),
        "textColor": material.get("text_color"),
        "lineMaxWidth": material.get("line_max_width"),
        "hasShadow": material.get("has_shadow"),
        "shadowAlpha": material.get("shadow_alpha"),
        "shadowDistance": material.get("shadow_distance"),
        "shadowSmoothing": material.get("shadow_smoothing"),
        "borderWidth": material.get("border_width"),
        "fontPath": material.get("font_path"),
    }


def animation_summary(material: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not material:
        return []
    return [
        {
            "name": item.get("name"),
            "type": item.get("type"),
            "duration": item.get("duration"),
            "resourceId": item.get("resource_id"),
            "path": item.get("path"),
        }
        for item in material.get("animations", [])
        if isinstance(item, dict)
    ]


def collect_text_rows(draft: dict[str, Any]) -> list[dict[str, Any]]:
    texts = {
        material.get("id"): material
        for material in draft.get("materials", {}).get("texts", [])
        if isinstance(material, dict)
    }
    animations = {
        material.get("id"): material
        for material in draft.get("materials", {}).get("material_animations", [])
        if isinstance(material, dict)
    }
    rows: list[dict[str, Any]] = []
    for track_index, track in enumerate(draft.get("tracks", [])):
        if track.get("type") != "text":
            continue
        for segment_index, segment in enumerate(track.get("segments", [])):
            material = texts.get(segment.get("material_id"))
            if not material:
                continue
            animation = None
            for ref_id in segment.get("extra_material_refs") or []:
                if ref_id in animations:
                    animation = animations[ref_id]
                    break
            target = segment.get("target_timerange", {})
            clip = segment.get("clip", {})
            rows.append(
                {
                    "trackIndex": track_index,
                    "segmentIndex": segment_index,
                    "start": round(float(target.get("start", 0)) / 1_000_000, 3),
                    "duration": round(float(target.get("duration", 0)) / 1_000_000, 3),
                    "material": material_summary(material),
                    "transform": clip.get("transform", {}),
                    "scale": clip.get("scale", {}),
                    "manualKeyframeTypes": [
                        keyframe.get("property_type")
                        for keyframe in segment.get("common_keyframes") or []
                        if isinstance(keyframe, dict)
                    ],
                    "nativeAnimations": animation_summary(animation),
                }
            )
    return rows


def collect_audio_rows(draft: dict[str, Any]) -> list[dict[str, Any]]:
    audios = {
        material.get("id"): material
        for material in draft.get("materials", {}).get("audios", [])
        if isinstance(material, dict)
    }
    rows: list[dict[str, Any]] = []
    for track_index, track in enumerate(draft.get("tracks", [])):
        if track.get("type") != "audio":
            continue
        for segment_index, segment in enumerate(track.get("segments", [])):
            material = audios.get(segment.get("material_id"), {})
            target = segment.get("target_timerange", {})
            source = segment.get("source_timerange", {})
            rows.append(
                {
                    "trackIndex": track_index,
                    "segmentIndex": segment_index,
                    "start": round(float(target.get("start", 0)) / 1_000_000, 3),
                    "duration": round(float(target.get("duration", 0)) / 1_000_000, 3),
                    "sourceStart": round(float(source.get("start", 0)) / 1_000_000, 3) if source else None,
                    "volume": segment.get("volume"),
                    "name": material.get("name"),
                    "path": material.get("path"),
                    "materialDuration": material.get("duration"),
                }
            )
    return rows


def collect_video_profile(draft: dict[str, Any]) -> dict[str, Any]:
    scales: Counter[str] = Counter()
    transforms: Counter[str] = Counter()
    keyframes: Counter[str] = Counter()
    durations: list[float] = []
    for track in draft.get("tracks", []):
        if track.get("type") != "video":
            continue
        for segment in track.get("segments", []):
            clip = segment.get("clip", {})
            scale = clip.get("scale", {}).get("x")
            transform = clip.get("transform", {})
            scales[str(round(float(scale), 4)) if isinstance(scale, (int, float)) else "unknown"] += 1
            transforms[
                f"{round(float(transform.get('x', 0.0)), 4)},{round(float(transform.get('y', 0.0)), 4)}"
            ] += 1
            target = segment.get("target_timerange", {})
            durations.append(round(float(target.get("duration", 0)) / 1_000_000, 3))
            for item in segment.get("common_keyframes") or []:
                if isinstance(item, dict):
                    keyframes[str(item.get("property_type"))] += 1
    durations.sort()
    median = durations[len(durations) // 2] if durations else 0.0
    return {
        "segmentCount": len(durations),
        "scaleCounts": scales.most_common(20),
        "transformCounts": transforms.most_common(20),
        "manualKeyframeCounts": keyframes.most_common(),
        "duration": {
            "min": durations[0] if durations else 0.0,
            "median": median,
            "max": durations[-1] if durations else 0.0,
        },
    }


def build_profile(draft_name_or_path: str) -> dict[str, Any]:
    draft_dir = resolve_draft_dir(draft_name_or_path)
    draft = load_json(draft_dir / "draft_content.json")
    text_rows = collect_text_rows(draft)
    audio_rows = collect_audio_rows(draft)
    transitions = [
        {
            "name": material.get("name"),
            "duration": material.get("duration"),
            "resourceId": material.get("resource_id"),
            "path": material.get("path"),
        }
        for material in draft.get("materials", {}).get("transitions", [])
        if isinstance(material, dict)
    ]
    track_summary = [
        {
            "index": index,
            "type": track.get("type"),
            "name": track.get("name"),
            "segmentCount": len(track.get("segments", [])),
        }
        for index, track in enumerate(draft.get("tracks", []))
    ]
    return {
        "sourceDraft": draft_dir.name,
        "sourceDraftPath": str(draft_dir),
        "duration": round(float(draft.get("duration", 0)) / 1_000_000, 3),
        "canvas": draft.get("canvas_config", {}),
        "trackSummary": track_summary,
        "text": {
            "segmentCount": len(text_rows),
            "samples": text_rows[:80],
        },
        "audio": {
            "segmentCount": len(audio_rows),
            "segments": audio_rows,
        },
        "video": collect_video_profile(draft),
        "transitions": transitions,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract a compact CapCut style profile from a reference draft.")
    parser.add_argument("--draft", required=True)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    profile = build_profile(args.draft)
    write_json(args.out, profile)
    print(args.out)


if __name__ == "__main__":
    main()
