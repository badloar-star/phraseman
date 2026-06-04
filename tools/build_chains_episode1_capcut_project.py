#!/usr/bin/env python3
"""Clone the CHAINS template and inject episode 1 text, audio, intro and backgrounds."""

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


US = 1_000_000
SOURCE_DRAFT = "\u0426\u0415\u041f\u0418 \u0426\u0415\u041f\u0418 \u0426\u0415\u041f\u0418 (1)"
TARGET_BASE = "CHAINS_EP01_EN_OPENAI_DIRECT_BG"
PACK_DIR = Path("exports/chains/episode1")
ROWS_PATH = PACK_DIR / "phrase_rows.json"
BG_MANIFEST = PACK_DIR / "backgrounds-direct-gate" / "background_manifest.json"
OPENAI_AUDIO = PACK_DIR / "openai-audio"
INTRO_WAV = PACK_DIR / "intro-11labs" / "chains_ep01_intro_ru_alina_beauty_slot_41s10.wav"


def capcut_id() -> str:
    return str(uuid.uuid4()).upper()


def capcut_root() -> Path:
    return Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def write_pretty(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def capcut_is_open() -> bool:
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "Get-Process CapCut -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    return bool(completed.stdout.strip())


def unique_target_dir(root: Path) -> Path:
    stamp = time.strftime("%Y%m%d_%H%M%S")
    candidate = root / f"{TARGET_BASE} {stamp}"
    if not candidate.exists():
        return candidate
    return root / f"{TARGET_BASE} {stamp}_{capcut_id()[:6]}"


def text_content(material: dict[str, Any]) -> dict[str, Any]:
    try:
        return json.loads(material.get("content") or "{}")
    except json.JSONDecodeError:
        return {}


def set_text(material: dict[str, Any], text: str) -> None:
    content = text_content(material)
    content["text"] = text
    length = len(text)
    for style in content.get("styles", []) or []:
        style["range"] = [0, length]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    if material.get("base_content"):
        material["base_content"] = text


def wrap_words(text: str, max_chars: int, max_lines: int = 2) -> str:
    words = text.split()
    if len(text) <= max_chars or len(words) <= 1:
        return text
    if max_lines == 2:
        best: tuple[int, str, str] | None = None
        for split in range(1, len(words)):
            left = " ".join(words[:split])
            right = " ".join(words[split:])
            score = max(len(left), len(right)) + abs(len(left) - len(right))
            if best is None or score < best[0]:
                best = (score, left, right)
        if best:
            return f"{best[1]}\n{best[2]}"
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= max_chars or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    if len(lines) <= max_lines:
        return "\n".join(lines)
    return "\n".join(lines[: max_lines - 1] + [" ".join(" ".join(lines[max_lines - 1:]).split())])


def assert_no_midword_wrap(text: str) -> None:
    for line in text.split("\n"):
        if not line:
            raise RuntimeError(f"Empty wrapped line in {text!r}")
    if "-\n" in text:
        raise RuntimeError(f"Hyphen newline wrap forbidden: {text!r}")


def audio_probe(path: Path) -> dict[str, Any]:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    data = json.loads(completed.stdout)
    stream = next(item for item in data["streams"] if item.get("codec_type") == "audio")
    duration = float(data.get("format", {}).get("duration") or stream.get("duration") or 0.0)
    return {
        "duration_us": int(round(duration * US)),
        "duration_sec": duration,
        "sample_rate": int(stream.get("sample_rate") or 44100),
        "channels": int(stream.get("channels") or 1),
    }


def video_probe(path: Path) -> dict[str, Any]:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    data = json.loads(completed.stdout)
    stream = next(item for item in data["streams"] if item.get("codec_type") == "video")
    duration = float(data.get("format", {}).get("duration") or stream.get("duration") or 0.0)
    return {
        "duration_us": int(round(duration * US)),
        "duration_sec": duration,
        "width": int(stream.get("width") or 0),
        "height": int(stream.get("height") or 0),
        "codec": stream.get("codec_name"),
        "pix_fmt": stream.get("pix_fmt"),
    }


def clone_audio_material(template: dict[str, Any], path: Path, duration_us: int) -> dict[str, Any]:
    material = deepcopy(template)
    material["id"] = capcut_id()
    material["path"] = str(path)
    material["duration"] = duration_us
    material["name"] = path.name
    material["material_name"] = path.name
    return material


def clone_video_material(template: dict[str, Any], path: Path, duration_us: int) -> dict[str, Any]:
    material = deepcopy(template)
    material["id"] = capcut_id()
    material["unique_id"] = capcut_id()
    material["path"] = str(path)
    material["duration"] = duration_us
    material["name"] = path.name
    material["material_name"] = path.name
    material["width"] = 1920
    material["height"] = 1080
    material["has_audio"] = False
    return material


def background_segment(template: dict[str, Any], material_id: str, start: int, duration: int) -> dict[str, Any]:
    seg = deepcopy(template)
    seg["id"] = capcut_id()
    seg["material_id"] = material_id
    seg["source_timerange"] = {"start": 0, "duration": duration}
    seg["target_timerange"] = {"start": start, "duration": duration}
    seg["is_loop"] = False
    seg["extra_material_refs"] = []
    seg["keyframe_refs"] = []
    seg["visible"] = True
    seg["clip"] = {"scale": {"x": 1.0, "y": 1.0}, "rotation": 0.0, "transform": {"x": 0.0, "y": 0.0}, "flip": {"vertical": False, "horizontal": False}, "alpha": 1.0}
    seg["uniform_scale"] = {"on": True, "value": 1.0}
    return seg


def update_identity_and_register(draft_dir: Path, draft: dict[str, Any]) -> None:
    now_us = int(time.time() * US)
    project_id = capcut_id()
    draft["name"] = draft_dir.name
    draft["path"] = draft_dir.as_posix()
    draft["update_time"] = now_us

    resources_size = sum(file.stat().st_size for file in (draft_dir / "Resources").rglob("*") if file.is_file())
    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
    meta.update(
        {
            "draft_id": project_id,
            "draft_name": draft_dir.name,
            "draft_fold_path": draft_dir.as_posix(),
            "draft_root_path": draft_dir.parent.as_posix(),
            "draft_is_invisible": False,
            "tm_duration": draft["duration"],
            "tm_draft_modified": now_us,
            "tm_draft_removed": 0,
            "draft_timeline_materials_size": resources_size,
            "draft_timeline_materials_size_": resources_size,
        }
    )
    write_json(meta_path, meta)

    root_path = draft_dir.parent / "root_meta_info.json"
    root = load_json(root_path)
    shutil.copy2(root_path, root_path.with_suffix(f".json.bak_{time.strftime('%Y%m%d_%H%M%S')}"))
    entry = {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": draft_dir.as_posix(),
        "draft_id": project_id,
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_dir.name,
        "draft_new_version": meta.get("draft_new_version") or "164.0.0",
        "draft_root_path": draft_dir.parent.as_posix(),
        "draft_timeline_materials_size": resources_size,
        "draft_timeline_materials_size_": resources_size,
        "draft_type": "",
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
            and Path(str(item.get("draft_fold_path", ""))).as_posix().casefold() != draft_dir.as_posix().casefold()
        ],
    ]
    root["draft_ids"] = max(int(root.get("draft_ids", 0) or 0), len(root["all_draft_store"]))
    root["root_path"] = draft_dir.parent.as_posix()
    write_json(root_path, root)


def main() -> int:
    if capcut_is_open():
        print("[chains-build] CapCut is open; close/reopen after build so it reloads JSON.", flush=True)
    rows = load_json(ROWS_PATH)
    bg_rows = load_json(BG_MANIFEST)["rows"]
    if len(rows) != 100 or len(bg_rows) != 100:
        raise RuntimeError(f"Need 100 rows/backgrounds, got {len(rows)}/{len(bg_rows)}")
    root = capcut_root()
    source_dir = root / SOURCE_DRAFT
    if not source_dir.exists():
        raise RuntimeError(f"Source draft not found: {source_dir}")
    target_dir = unique_target_dir(root)
    shutil.copytree(source_dir, target_dir)
    if (target_dir / ".locked").exists():
        (target_dir / ".locked").unlink()

    draft = load_json(target_dir / "draft_content.json")
    texts = {item["id"]: item for item in draft["materials"]["texts"]}
    audios = {item["id"]: item for item in draft["materials"]["audios"]}

    text_errors: list[str] = []
    for i, row in enumerate(rows):
        en = wrap_words(str(row["english"]).rstrip(".?!").upper(), 23, 2)
        ru = wrap_words(str(row["russian"]).rstrip(".?!").upper(), 22, 2)
        ipa = wrap_words(str(row["ipa"]), 34, 2)
        for value in [en, ru, ipa]:
            assert_no_midword_wrap(value)
        set_text(texts[draft["tracks"][5]["segments"][i]["material_id"]], en)
        set_text(texts[draft["tracks"][2]["segments"][i]["material_id"]], en)
        set_text(texts[draft["tracks"][3]["segments"][i]["material_id"]], ru)
        set_text(texts[draft["tracks"][4]["segments"][i]["material_id"]], ipa)
        set_text(texts[draft["tracks"][1]["segments"][i]["material_id"]], ipa)
        if any(len(line) > 46 for line in en.split("\n")):
            text_errors.append(f"EN {i+1:03d}: {en}")
        if any(len(line) > 42 for line in ru.split("\n")):
            text_errors.append(f"RU {i+1:03d}: {ru}")
    if text_errors:
        raise RuntimeError("Text wrap gate failed: " + "; ".join(text_errors[:8]))

    audio_dir = target_dir / "Resources" / "chains_ep01_openai_audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    audio_templates = {
        7: audios[draft["tracks"][7]["segments"][0]["material_id"]],
        8: audios[draft["tracks"][8]["segments"][0]["material_id"]],
        9: audios[draft["tracks"][9]["segments"][0]["material_id"]],
        10: audios[draft["tracks"][10]["segments"][0]["material_id"]],
        11: audios[draft["tracks"][11]["segments"][0]["material_id"]],
    }
    role_for_track = {7: "en1", 8: "ru", 9: "en2", 10: "en1", 11: "en2"}
    new_audios: list[dict[str, Any]] = []
    for track_index, role in role_for_track.items():
        for i, segment in enumerate(draft["tracks"][track_index]["segments"], start=1):
            matches = sorted((OPENAI_AUDIO / role).glob(f"{i:03d}_*.wav"))
            src = matches[0] if matches else OPENAI_AUDIO / role / f"{i:03d}.wav"
            if not src.exists():
                raise RuntimeError(f"Missing audio {src}")
            dst = audio_dir / f"{role}_{i:03d}.wav"
            if not dst.exists():
                shutil.copy2(src, dst)
            duration_us = audio_probe(dst)["duration_us"]
            material = clone_audio_material(audio_templates[track_index], dst, duration_us)
            new_audios.append(material)
            segment["material_id"] = material["id"]
            slot = int(segment["target_timerange"]["duration"])
            segment["source_timerange"] = {"start": 0, "duration": min(duration_us, slot)}
            segment["target_timerange"]["duration"] = min(slot, duration_us)

    intro_dst = target_dir / "Resources" / "chains_ep01_intro_ru_11labs.wav"
    shutil.copy2(INTRO_WAV, intro_dst)
    intro_duration = audio_probe(intro_dst)["duration_us"]
    nested_intro = draft["materials"]["drafts"][1]["draft"]
    nested_audios = {item["id"]: item for item in nested_intro["materials"]["audios"]}
    intro_segment = nested_intro["tracks"][7]["segments"][0]
    intro_material = nested_audios[intro_segment["material_id"]]
    intro_material["path"] = str(intro_dst)
    intro_material["duration"] = intro_duration
    intro_material["name"] = intro_dst.name
    intro_material["material_name"] = intro_dst.name
    intro_segment["source_timerange"] = {"start": 0, "duration": min(intro_duration, 41100000)}
    intro_segment["target_timerange"] = {"start": 0, "duration": min(intro_duration, 41100000)}
    intro_texts = {item["id"]: item for item in nested_intro["materials"]["texts"]}
    intro_lines = [
        "СЕГОДНЯ МЫ БУДЕМ УЧИТЬ",
        "АНГЛИЙСКИЙ МЕТОДОМ",
        "ЦЕПОЧЕК",
    ]
    for segment, line in zip(nested_intro["tracks"][1]["segments"], intro_lines, strict=False):
        set_text(intro_texts[segment["material_id"]], line)

    bg_dir = target_dir / "Resources" / "chains_ep01_direct_backgrounds"
    bg_dir.mkdir(parents=True, exist_ok=True)
    video_template_source = None
    nested_main = draft["materials"]["drafts"][0]["draft"]
    for item in nested_main["materials"]["videos"]:
        if item.get("path"):
            video_template_source = item
            break
    if not video_template_source:
        raise RuntimeError("No video material template found")
    segment_template = deepcopy(nested_main["tracks"][2]["segments"][0])
    bg_materials: list[dict[str, Any]] = []
    bg_segments: list[dict[str, Any]] = []
    for i, bg in enumerate(bg_rows):
        src = Path(bg["path"])
        if not src.exists():
            raise RuntimeError(f"Missing background {src}")
        dst = bg_dir / f"{i+1:03d}_chains_direct_bg.mp4"
        if not dst.exists():
            shutil.copy2(src, dst)
        duration = int(draft["tracks"][5]["segments"][i]["target_timerange"]["duration"])
        meta = video_probe(dst)
        if meta["width"] != 1920 or meta["height"] != 1080 or meta["duration_us"] + 80_000 < duration:
            raise RuntimeError(f"Background gate failed {dst}: {meta}, need {duration}")
        material = clone_video_material(video_template_source, dst, duration)
        bg_materials.append(material)
        first = draft["tracks"][5]["segments"][i]["target_timerange"]
        second = draft["tracks"][2]["segments"][i]["target_timerange"]
        bg_segments.append(background_segment(segment_template, material["id"], int(first["start"]), int(first["duration"])))
        bg_segments.append(background_segment(segment_template, material["id"], int(second["start"]), int(second["duration"])))
    draft["materials"]["audios"].extend(new_audios)
    draft["materials"]["videos"].extend(bg_materials)
    draft["tracks"][0]["segments"] = sorted(bg_segments, key=lambda item: item["target_timerange"]["start"])

    for path in [target_dir / "draft_content.json", target_dir / "template-2.tmp"]:
        if path.exists() or path.name == "draft_content.json":
            write_json(path, draft)
    update_identity_and_register(target_dir, draft)

    report = {
        "draft_name": target_dir.name,
        "draft_dir": str(target_dir),
        "source_draft": str(source_dir),
        "text_rows": len(rows),
        "background_segments": len(bg_segments),
        "background_materials": len(bg_materials),
        "audio_materials_added": len(new_audios),
        "intro_wav": str(intro_dst),
        "gate": {
            "no_midword_wrap": True,
            "backgrounds_100": True,
            "openai_audio_300": True,
            "intro_11labs": True,
        },
    }
    write_pretty(PACK_DIR / "capcut_project_build_report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
