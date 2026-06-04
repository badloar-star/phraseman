#!/usr/bin/env python3
"""Build an editable RU->FR CapCut project from the VSSCP BubbleBlur SafeWrap template."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any


US = 1_000_000
SOURCE_DRAFT = "VENGA A1 200 OPENAI SEMANTIC HQ NOFADE CAPS"
TARGET_DRAFT = "VENGA A1 200 RU FR VSSCP BUBBLEBLUR SAFEWRAP"
TRACK_TEXT = {
    6: "ru",
    7: "ipa",
    8: "fr",
    9: "breakdown",
}
TRACK_AUDIO = {
    10: "ru",
    11: "fr1",
    12: "fr2",
    13: "fr3",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_capcut_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def folder_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file()) if path.exists() else 0


def capcut_is_open() -> bool:
    completed = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "Get-Process | Where-Object { $_.ProcessName -match 'CapCut' } | Select-Object -First 1 -ExpandProperty Id",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    return bool(completed.stdout.strip())


def unique_draft_dir(root: Path, base_name: str) -> Path:
    candidate = root / base_name
    if not candidate.exists():
        return candidate
    stamp = time.strftime("%Y%m%d_%H%M%S")
    return root / f"{base_name} {stamp}"


def wrap_plain_text(text: str, max_chars: int, max_lines: int = 2) -> str:
    words = text.split()
    if not words:
        return text
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
    midpoint = (len(words) + 1) // 2
    return " ".join(words[:midpoint]) + "\n" + " ".join(words[midpoint:])


def split_breakdown(text: str) -> list[str]:
    normalized = " ".join(text.replace("\r", "\n").replace("\n", " ; ").split())
    return [chunk.strip() for chunk in normalized.split(";") if chunk.strip()]


def visual_width(text: str) -> float:
    width = 0.0
    for char in text:
        codepoint = ord(char)
        if char == "\n":
            continue
        if char.isspace():
            width += 0.45
        elif char in "\u2014\u2013-;:/.,!?":
            width += 0.55
        elif 0x0400 <= codepoint <= 0x04FF:
            width += 1.18
        elif codepoint > 127:
            width += 1.05
        else:
            width += 0.92
    return width


def wrap_words_visual(text: str, max_width: float) -> list[str]:
    words = text.split()
    if not words:
        return [text]
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if not current or visual_width(candidate) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def wrap_overwide_breakdown_line(line: str, max_width: float) -> list[str]:
    if visual_width(line) <= max_width + 2:
        return [line]
    if " \u2014 " in line:
        left, right = line.split(" \u2014 ", 1)
        wrapped: list[str] = []
        if left.strip():
            wrapped.extend(wrap_words_visual(left.strip(), max_width))
        if right.strip():
            wrapped.extend(wrap_words_visual(f"\u2014 {right.strip()}", max_width))
        return wrapped
    return wrap_words_visual(line, max_width)


def wrap_breakdown_safe(text: str, max_width: float = 23.0) -> str:
    chunks = split_breakdown(text)
    if len(chunks) <= 1:
        return text
    lines: list[str] = []
    current = ""
    for chunk in chunks:
        candidate = chunk if not current else f"{current}; {chunk}"
        if current and visual_width(candidate) > max_width:
            lines.append(current)
            current = chunk
        else:
            current = candidate
    if current:
        lines.append(current)
    safe_lines: list[str] = []
    for line in lines:
        safe_lines.extend(wrap_overwide_breakdown_line(line, max_width))
    return "\n".join(safe_lines)


def display_text(field: str, text: str) -> str:
    if field == "ru":
        return wrap_plain_text(text.upper(), 18, 2)
    if field == "fr":
        return wrap_plain_text(text.upper(), 20, 2)
    if field == "ipa":
        return wrap_plain_text(text, 28, 2)
    if field == "breakdown":
        return wrap_breakdown_safe(text)
    return text


def update_text_material(material: dict[str, Any], text: str) -> None:
    content = json.loads(material.get("content") or "{}")
    content["text"] = text
    text_length = len(text)
    for style in content.get("styles", []) or []:
        if isinstance(style, dict):
            style["range"] = [0, text_length]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    if material.get("base_content"):
        material["base_content"] = text


def manifest_rows(phrases_path: Path, manifest_path: Path) -> list[dict[str, Any]]:
    phrases = {int(item["index"]): item for item in load_json(phrases_path)}
    audio: dict[int, dict[str, Any]] = {index: {} for index in phrases}
    for item in load_json(manifest_path):
        audio[int(item["index"])][str(item["role"])] = item
    rows: list[dict[str, Any]] = []
    for index in range(1, 201):
        row = dict(phrases[index])
        row["audio"] = audio[index]
        missing = [role for role in TRACK_AUDIO.values() if role not in row["audio"]]
        if missing:
            raise RuntimeError(f"Phrase {index} missing audio roles: {missing}")
        rows.append(row)
    return rows


def copy_audio_assets(rows: list[dict[str, Any]], repo_root: Path, draft_dir: Path) -> dict[tuple[int, str], Path]:
    assets: dict[tuple[int, str], Path] = {}
    audio_root = draft_dir / "Resources" / "venga_ru_fr_openai_audio"
    audio_root.mkdir(parents=True, exist_ok=True)
    for index, row in enumerate(rows, start=1):
        for role, item in row["audio"].items():
            src = repo_root / item["path"]
            if not src.exists():
                raise RuntimeError(f"Missing generated audio: {src}")
            role_dir = audio_root / role
            role_dir.mkdir(parents=True, exist_ok=True)
            dst = role_dir / f"{index:03d}{src.suffix.lower()}"
            shutil.copy2(src, dst)
            assets[(index, role)] = dst
    return assets


def pad_audio_to_slot(asset_path: Path, slot_us: int) -> None:
    slot_sec = slot_us / US
    tmp_path = asset_path.with_suffix(".pad.tmp.wav")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(asset_path),
            "-af",
            "apad",
            "-t",
            f"{slot_sec:.6f}",
            "-c:a",
            "pcm_s16le",
            str(tmp_path),
        ],
        check=True,
    )
    tmp_path.replace(asset_path)


def update_audio_material(material: dict[str, Any], asset_path: Path, slot_us: int) -> None:
    pad_audio_to_slot(asset_path, slot_us)
    material["path"] = str(asset_path)
    material["duration"] = slot_us
    material["name"] = asset_path.name


def update_timeline(draft: dict[str, Any], rows: list[dict[str, Any]], assets: dict[tuple[int, str], Path]) -> None:
    text_by_id = {item["id"]: item for item in draft["materials"]["texts"]}
    audio_by_id = {item["id"]: item for item in draft["materials"]["audios"]}
    for track_index, field in TRACK_TEXT.items():
        segments = draft["tracks"][track_index]["segments"]
        if len(segments) != 200:
            raise RuntimeError(f"Text track {track_index} has {len(segments)} segments, expected 200")
        for index, segment in enumerate(segments, start=1):
            update_text_material(text_by_id[segment["material_id"]], display_text(field, str(rows[index - 1][field])))
    for track_index, role in TRACK_AUDIO.items():
        segments = draft["tracks"][track_index]["segments"]
        if len(segments) != 200:
            raise RuntimeError(f"Audio track {track_index} has {len(segments)} segments, expected 200")
        for index, segment in enumerate(segments, start=1):
            slot_us = int(segment["target_timerange"]["duration"])
            update_audio_material(audio_by_id[segment["material_id"]], assets[(index, role)], slot_us)
            segment["source_timerange"] = {"start": 0, "duration": slot_us}
            segment["target_timerange"]["duration"] = slot_us


def update_identity_and_register(draft_dir: Path, draft: dict[str, Any]) -> str:
    now_us = int(time.time() * US)
    project_id = str(uuid.uuid4()).upper()
    draft["name"] = draft_dir.name
    draft["path"] = draft_dir.as_posix()
    draft["update_time"] = now_us

    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
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
            "tm_draft_create": now_us,
            "tm_draft_modified": now_us,
            "tm_draft_removed": 0,
            "draft_timeline_materials_size": folder_size(draft_dir / "Resources"),
            "draft_timeline_materials_size_": folder_size(draft_dir / "Resources"),
        }
    )
    write_capcut_json(meta_path, meta)

    root_meta_path = draft_dir.parent / "root_meta_info.json"
    root = load_json(root_meta_path) if root_meta_path.exists() else {"all_draft_store": [], "draft_ids": 0}
    if root_meta_path.exists():
        shutil.copy2(root_meta_path, root_meta_path.with_suffix(f".json.bak_{time.strftime('%Y%m%d_%H%M%S')}"))
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
        "draft_new_version": "164.0.0",
        "draft_root_path": draft_dir.parent.as_posix(),
        "draft_timeline_materials_size": folder_size(draft_dir / "Resources"),
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
            and item.get("draft_id") != project_id
        ],
    ]
    root["draft_ids"] = max(int(root.get("draft_ids", 0) or 0), len(root["all_draft_store"]))
    root["root_path"] = draft_dir.parent.as_posix()
    write_capcut_json(root_meta_path, root)
    return project_id


def collect_missing_paths(draft: Any) -> list[str]:
    missing: list[str] = []

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key == "path" and isinstance(child, str) and (":" in child or child.startswith("/")):
                    first_path = child.split(";")[0]
                    if not Path(first_path.replace("\\", "/")).exists():
                        missing.append(child)
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(draft)
    return missing


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-draft", default=SOURCE_DRAFT)
    parser.add_argument("--target-draft", default=TARGET_DRAFT)
    parser.add_argument("--phrases", type=Path, default=Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/phrase_rows.json"))
    parser.add_argument("--manifest", type=Path, default=Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/openai-audio/tts_manifest.json"))
    parser.add_argument("--allow-open-capcut", action="store_true")
    args = parser.parse_args()

    if not args.allow_open_capcut and capcut_is_open():
        raise RuntimeError("CapCut is open. Close CapCut before building/registering a new draft.")

    repo_root = Path(__file__).resolve().parents[1]
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    source_dir = capcut_root / args.source_draft
    if not source_dir.exists():
        raise RuntimeError(f"Source draft not found: {source_dir}")
    if (source_dir / ".locked").exists() and not args.allow_open_capcut:
        raise RuntimeError(f"Source draft is locked: {source_dir}")
    rows = manifest_rows(args.phrases, args.manifest)
    target_dir = unique_draft_dir(capcut_root, args.target_draft)
    shutil.copytree(source_dir, target_dir)
    if (target_dir / ".locked").exists():
        (target_dir / ".locked").unlink()

    assets = copy_audio_assets(rows, repo_root, target_dir)
    draft = load_json(target_dir / "draft_content.json")
    update_timeline(draft, rows, assets)
    project_id = update_identity_and_register(target_dir, draft)

    for rel in ["draft_content.json", "template-2.tmp", "draft_content.json.bak"]:
        path = target_dir / rel
        if path.exists():
            write_capcut_json(path, draft)
    timeline_content = target_dir / "Timelines" / draft["id"] / "draft_content.json"
    if timeline_content.exists():
        write_capcut_json(timeline_content, draft)

    missing = collect_missing_paths(draft)
    report = {
        "draft_name": target_dir.name,
        "draft_dir": str(target_dir),
        "source_draft": args.source_draft,
        "project_id": project_id,
        "timeline_id": draft["id"],
        "phrase_count": len(rows),
        "text_tracks": {str(track): len(draft["tracks"][track]["segments"]) for track in TRACK_TEXT},
        "audio_tracks": {str(track): len(draft["tracks"][track]["segments"]) for track in TRACK_AUDIO},
        "copied_audio_files": len(assets),
        "missing_paths": len(missing),
        "missing_path_samples": missing[:12],
    }
    report_path = repo_root / "exports" / "venga-phrase-packs" / "ru-fr-a1-vsscp" / "capcut_build_report.json"
    write_capcut_json(report_path, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if missing:
        raise RuntimeError(f"Missing paths: {len(missing)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
