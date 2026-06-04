#!/usr/bin/env python3
"""Verify the final RU->ES Venga CapCut draft."""

from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageFilter, ImageStat


PROJECT_NAME = "VENGA_ES_200_0601_LANGFIX_FINAL 20260601_162739"
PACK_DIR = Path("exports/venga-phrase-packs/ru-es-a1-vsscp")
REPORT = PACK_DIR / "final_capcut_verify_report.json"


def load_module(path: Path, name: str) -> Any:
    spec = importlib.util.spec_from_file_location(name, path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def text_of(texts: dict[str, dict[str, Any]], material_id: str) -> str:
    raw = texts.get(material_id, {}).get("content", "")
    try:
        return str(json.loads(raw).get("text", ""))
    except Exception:
        return str(raw)


def ffprobe_ok(path: str) -> bool:
    result = subprocess.run(
        ["ffprobe", "-v", "error", path],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        timeout=20,
    )
    return result.returncode == 0


def sharpness_score(frame: Path) -> float:
    image = Image.open(frame).convert("L").resize((320, 180))
    return round(float(ImageStat.Stat(image.filter(ImageFilter.FIND_EDGES)).var[0]), 2)


def main() -> int:
    builder = load_module(Path("tools/build_venga_ru_es_from_fixed_template.py"), "es_builder")
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    project = capcut_root / PROJECT_NAME
    draft = load_json(project / "draft_content.json")
    rows = load_json(PACK_DIR / "phrase_rows.json")
    texts = {item["id"]: item for item in draft.get("materials", {}).get("texts", [])}
    audios = {item["id"]: item for item in draft.get("materials", {}).get("audios", [])}
    videos = {item["id"]: item for item in draft.get("materials", {}).get("videos", [])}
    errors: list[str] = []

    expected = [
        ("video", 200),
        ("video", 1),
        ("effect", 1),
        ("video", 2),
        ("text", 4),
        ("text", 4),
        ("text", 4),
        ("text", 200),
        ("text", 200),
        ("text", 200),
        ("text", 200),
        ("video", 1),
        ("filter", 1),
        ("effect", 1),
        ("audio", 1),
        ("audio", 200),
        ("audio", 200),
        ("audio", 200),
        ("audio", 200),
    ]
    track_counts = [(index, track.get("type"), len(track.get("segments", []))) for index, track in enumerate(draft.get("tracks", []))]
    if len(draft.get("tracks", [])) != 19:
        errors.append(f"track count {len(draft.get('tracks', []))}")
    for index, (track_type, count) in enumerate(expected):
        got = (draft["tracks"][index].get("type"), len(draft["tracks"][index].get("segments", []))) if index < len(draft["tracks"]) else None
        if got != (track_type, count):
            errors.append(f"track {index} expected {track_type}/{count} got {got}")

    all_text: list[str] = []
    for track_index in [7, 8, 9, 10]:
        all_text.extend(text_of(texts, segment["material_id"]) for segment in draft["tracks"][track_index]["segments"])
    typo = "\u0447\u0438\u0441\u0442\u044e"
    if any(typo in value.casefold() for value in all_text):
        errors.append("bad Russian typo still present")

    expected_81 = builder.display_text("ru", str(rows[80]["ru"]))
    expected_86 = builder.display_text("ru", str(rows[85]["ru"]))
    actual_81 = text_of(texts, draft["tracks"][7]["segments"][80]["material_id"])
    actual_86 = text_of(texts, draft["tracks"][7]["segments"][85]["material_id"])
    if actual_81 != expected_81:
        errors.append(f"row 81 mismatch: {actual_81!r} != {expected_81!r}")
    if actual_86 != expected_86:
        errors.append(f"row 86 mismatch: {actual_86!r} != {expected_86!r}")

    allowed = {"I", "A", "\u042f", "\u0423", "ON", "OF", "IN", "TO", "LA", "EL", "UN"}
    for value in all_text:
        for part in value.split("\n"):
            stripped = part.strip().strip("/").strip()
            if 0 < len(stripped) <= 2 and stripped.upper() not in allowed and len(value.replace("\n", " ")) > 8:
                errors.append(f"suspicious tiny line: {value!r}")
                break

    audio_paths: list[str] = []
    for track_index in [14, 15, 16, 17, 18]:
        for segment in draft["tracks"][track_index]["segments"]:
            path = str(audios.get(segment["material_id"], {}).get("path") or "")
            audio_paths.append(path)
            if not path or not Path(path).exists():
                errors.append(f"missing audio {track_index} {path}")
    if len(audio_paths) != 801:
        errors.append(f"audio refs {len(audio_paths)}")
    if sum("venga_ru_es_openai_audio" in path for path in audio_paths) != 800:
        errors.append("not 800 es openai audio refs")
    if not any("intro_ru_for_es" in path for path in audio_paths):
        errors.append("Spanish Russian intro not referenced")

    bg_paths: list[str] = []
    for segment in draft["tracks"][0]["segments"]:
        path = str(videos.get(segment["material_id"], {}).get("path") or "")
        bg_paths.append(path)
        if not path or not Path(path).exists():
            errors.append(f"missing bg {path}")
    if len(bg_paths) != 200:
        errors.append(f"bg refs {len(bg_paths)}")
    if len(set(bg_paths)) != 200:
        errors.append(f"duplicate bg paths {200 - len(set(bg_paths))}")
    if sum("venga_ru_es_langfix_fresh_semantic_bg" in path for path in bg_paths) != 200:
        errors.append("not all bgs are langfix fresh")
    if any("venga_ru_de_fresh_semantic_bg" in path or "venga_semantic_strict" in path for path in bg_paths):
        errors.append("old bg path referenced")

    frame_dir = PACK_DIR / "final_verify_frames"
    frame_dir.mkdir(parents=True, exist_ok=True)
    for index in [121, 166, 173]:
        frame = frame_dir / f"{index:03d}.jpg"
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", "1.0", "-i", bg_paths[index - 1], "-frames:v", "1", "-q:v", "3", str(frame)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=60,
        )
    sharpness: list[float] = []
    missing_frames: list[int] = []
    for index in range(1, 201):
        frame = frame_dir / f"{index:03d}.jpg"
        if not frame.exists():
            missing_frames.append(index)
            sharpness.append(0.0)
        else:
            sharpness.append(sharpness_score(frame))
    low = [(index, score) for index, score in enumerate(sharpness, start=1) if score < 180.0]
    if missing_frames:
        errors.append(f"missing verify frames {missing_frames[:10]}")
    if low:
        errors.append(f"low sharp referenced {low[:10]} total {len(low)}")

    probe_fail = [path for path in bg_paths if not ffprobe_ok(path)]
    audio_sample = audio_paths[:1] + audio_paths[1::50]
    probe_fail.extend(path for path in audio_sample if not ffprobe_ok(path))
    if probe_fail:
        errors.append(f"ffprobe failures {len(probe_fail)} first {probe_fail[:3]}")

    for service_name in ["draft_meta_info.json", "draft_content.json", "template-2.tmp", "timeline_layout.json", "draft_biz_config.json"]:
        if not (project / service_name).exists():
            errors.append(f"missing service {service_name}")
    timeline_layout = load_json(project / "timeline_layout.json")
    if str(draft.get("id")) not in json.dumps(timeline_layout):
        errors.append("timeline_layout mismatch")
    if not (project / "Timelines" / str(draft.get("id"))).exists():
        errors.append("missing Timelines/draft_id folder")
    root_meta = load_json(project.parent / "root_meta_info.json")
    if not any(item.get("draft_name") == project.name for item in root_meta.get("all_draft_store", [])):
        errors.append("not registered in root_meta")

    report = {
        "project": str(project),
        "track_counts": track_counts,
        "audio_refs": len(audio_paths),
        "openai_es_audio_refs": sum("venga_ru_es_openai_audio" in path for path in audio_paths),
        "bg_refs": len(bg_paths),
        "unique_bg_refs": len(set(bg_paths)),
        "sharp_min": min(sharpness),
        "sharp_low_count": len(low),
        "bg_ffprobe_checked": len(bg_paths),
        "audio_ffprobe_sample_checked": len(audio_sample),
        "errors": errors,
        "sample_texts": {str(track_index): [text_of(texts, segment["material_id"]) for segment in draft["tracks"][track_index]["segments"][:3]] for track_index in [7, 8, 9, 10]},
        "fixed_samples": {
            "81_ru": actual_81,
            "86_ru": actual_86,
            "86_es": text_of(texts, draft["tracks"][9]["segments"][85]["material_id"]),
        },
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in {"sample_texts", "fixed_samples"}}, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
