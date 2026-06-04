#!/usr/bin/env python3
"""Rebuild RU->DE Venga from the 19-track user-latest backup template."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any


US = 1_000_000
SOURCE_BACKUP = Path("exports/venga-phrase-packs/ru-fr-a1-vsscp/backups/2026-05-31-14-32-06-user-latest-edits-full-draft")
SOURCE_ORIGINAL_DRAFT = "VENGA A1 200 RU FR VSSCP BUBBLEBLUR SAFEWRAP"
TARGET_DRAFT = "VENGA A1 200 RU DE VSSCP USER TEMPLATE"
PACK_DIR = Path("exports/venga-phrase-packs/ru-de-a1-vsscp")
INTRO_WAV = Path("exports/venga-phrase-packs/intro-russian-target-11labs/intro_ru_for_de_alina_beauty_slot_19s83.wav")
INTRO_DURATION_US = 19_833_333

TRACK_TEXT = {7: "ru", 8: "ipa", 9: "de", 10: "breakdown"}
TRACK_AUDIO = {15: "ru", 16: "de1", 17: "de2", 18: "de3"}
INTRO_TRACK = 14


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
    return root / f"{base_name} {time.strftime('%Y%m%d_%H%M%S')}"


def visual_width(text: str) -> float:
    width = 0.0
    for char in text:
        codepoint = ord(char)
        if char == "\n":
            continue
        if char.isspace():
            width += 0.45
        elif char in "\u2014\u2013-;:/.,!?()":
            width += 0.55
        elif 0x0400 <= codepoint <= 0x04FF:
            width += 1.18
        elif codepoint > 127:
            width += 1.05
        else:
            width += 0.92
    return width


def wrap_words(text: str, max_width: float, max_lines: int = 2) -> str:
    words = text.split()
    if not words:
        return text
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
    if len(lines) <= max_lines:
        return "\n".join(lines)
    midpoint = (len(words) + 1) // 2
    left = " ".join(words[:midpoint])
    right = " ".join(words[midpoint:])
    return f"{left}\n{right}" if right else left


def split_breakdown(text: str) -> list[str]:
    normalized = " ".join(text.replace("\r", "\n").replace("\n", " ; ").split())
    return [chunk.strip() for chunk in normalized.split(";") if chunk.strip()]


def wrap_breakdown_chunk(chunk: str, max_width: float) -> list[str]:
    if visual_width(chunk) <= max_width:
        return [chunk]
    if " — " in chunk:
        left, right = chunk.split(" — ", 1)
        if visual_width(f"{left} —") <= max_width and visual_width(right) <= max_width:
            return [f"{left} —", right]
        if visual_width(left) <= max_width and visual_width(f"— {right}") <= max_width:
            return [left, f"— {right}"]
    return wrap_words(chunk, max_width, max_lines=3).split("\n")


def wrap_breakdown_safe(text: str, max_width: float = 18.0) -> str:
    chunks = split_breakdown(text)
    lines: list[str] = []
    current = ""
    for chunk in chunks:
        candidate = chunk if not current else f"{current}; {chunk}"
        if current and visual_width(candidate) > max_width:
            lines.extend(wrap_breakdown_chunk(current, max_width))
            current = chunk
        else:
            current = candidate
    if current:
        lines.extend(wrap_breakdown_chunk(current, max_width))
    return "\n".join(lines)


def strip_screen_period(text: str) -> str:
    return text.strip().rstrip(".")


def display_text(field: str, text: str) -> str:
    if field == "ru":
        return wrap_words(strip_screen_period(text).upper(), 19.0, 2)
    if field == "de":
        return wrap_words(strip_screen_period(text).upper(), 22.0, 2)
    if field == "ipa":
        return wrap_words(text, 26.0, 2)
    if field == "breakdown":
        return wrap_breakdown_safe(text)
    return text


def capcut_text(material: dict[str, Any]) -> str:
    try:
        content = json.loads(material.get("content") or "{}")
        return str(content.get("text") or material.get("base_content") or "")
    except json.JSONDecodeError:
        return str(material.get("base_content") or "")


def update_text_material(material: dict[str, Any], text: str) -> None:
    content = json.loads(material.get("content") or "{}")
    content["text"] = text
    text_length = len(text)
    for style in content.get("styles", []) or []:
        if isinstance(style, dict):
            style["range"] = [0, text_length]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    if material.get("base_content") is not None:
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
    audio_root = draft_dir / "Resources" / "venga_ru_de_openai_audio"
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


def probe_duration_sec(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    )
    return float(completed.stdout.strip())


def fit_audio_to_slot(asset_path: Path, slot_us: int) -> dict[str, Any]:
    slot_sec = slot_us / US
    source_sec = probe_duration_sec(asset_path)
    tmp_path = asset_path.with_suffix(".slot.tmp.wav")
    filters: list[str] = []
    speed_ratio = 1.0
    if source_sec > slot_sec - 0.12:
        speed_ratio = source_sec / max(slot_sec - 0.18, 0.1)
        if speed_ratio > 1.18:
            raise RuntimeError(f"Audio too long for slot without bad speedup: {asset_path} {source_sec:.3f}s > {slot_sec:.3f}s")
        filters.append(f"atempo={speed_ratio:.5f}")
    filters.append("apad")
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
            ",".join(filters),
            "-t",
            f"{slot_sec:.6f}",
            "-c:a",
            "pcm_s16le",
            str(tmp_path),
        ],
        check=True,
    )
    tmp_path.replace(asset_path)
    return {"source_sec": round(source_sec, 3), "slot_sec": round(slot_sec, 3), "speed_ratio": round(speed_ratio, 4)}


def rewrite_paths(value: Any, old_prefixes: list[Path], target_dir: Path) -> Any:
    if isinstance(value, dict):
        return {key: rewrite_paths(child, old_prefixes, target_dir) for key, child in value.items()}
    if isinstance(value, list):
        return [rewrite_paths(child, old_prefixes, target_dir) for child in value]
    if isinstance(value, str):
        for prefix in old_prefixes:
            prefix_text = str(prefix)
            if value.startswith(prefix_text):
                return str(target_dir) + value[len(prefix_text) :]
            prefix_posix = prefix.as_posix()
            if value.startswith(prefix_posix):
                return target_dir.as_posix() + value[len(prefix_posix) :]
    return value


def update_intro(draft: dict[str, Any], repo_root: Path, target_dir: Path) -> Path:
    src = repo_root / INTRO_WAV
    if not src.exists():
        raise RuntimeError(f"Missing Russian German intro WAV: {src}")
    out_dir = target_dir / "Resources" / "venga_intro_11labs_ru_target"
    out_dir.mkdir(parents=True, exist_ok=True)
    dst = out_dir / src.name
    shutil.copy2(src, dst)
    duration_us = int(round(probe_duration_sec(dst) * US))
    if duration_us != INTRO_DURATION_US:
        raise RuntimeError(f"Intro duration mismatch: {duration_us}")
    audios = {item["id"]: item for item in draft["materials"]["audios"]}
    track = draft["tracks"][INTRO_TRACK]
    if track.get("type") != "audio" or len(track.get("segments", [])) != 1:
        raise RuntimeError("Intro track index does not match 19-track template")
    segment = track["segments"][0]
    material = audios[segment["material_id"]]
    material["path"] = str(dst)
    material["duration"] = INTRO_DURATION_US
    material["name"] = dst.name
    material["material_name"] = dst.name
    material["wave_points"] = []
    segment["source_timerange"] = {"start": 0, "duration": INTRO_DURATION_US}
    segment["target_timerange"] = {"start": 0, "duration": INTRO_DURATION_US}
    segment["volume"] = 1.0
    segment["last_nonzero_volume"] = 1.0
    track["name"] = "INTRO 11LABS RU FOR GERMAN ACTIVE"
    return dst


def update_timeline(draft: dict[str, Any], rows: list[dict[str, Any]], assets: dict[tuple[int, str], Path]) -> list[dict[str, Any]]:
    text_by_id = {item["id"]: item for item in draft["materials"]["texts"]}
    audio_by_id = {item["id"]: item for item in draft["materials"]["audios"]}
    for track_index, field in TRACK_TEXT.items():
        segments = draft["tracks"][track_index]["segments"]
        if len(segments) != 200:
            raise RuntimeError(f"Text track {track_index} has {len(segments)} segments, expected 200")
        for index, segment in enumerate(segments, start=1):
            update_text_material(text_by_id[segment["material_id"]], display_text(field, str(rows[index - 1][field])))

    fit_rows: list[dict[str, Any]] = []
    for track_index, role in TRACK_AUDIO.items():
        segments = draft["tracks"][track_index]["segments"]
        if len(segments) != 200:
            raise RuntimeError(f"Audio track {track_index} has {len(segments)} segments, expected 200")
        for index, segment in enumerate(segments, start=1):
            slot_us = int(segment["target_timerange"]["duration"])
            asset_path = assets[(index, role)]
            fit = fit_audio_to_slot(asset_path, slot_us)
            material = audio_by_id[segment["material_id"]]
            material["path"] = str(asset_path)
            material["duration"] = slot_us
            material["name"] = asset_path.name
            material["material_name"] = asset_path.name
            segment["source_timerange"] = {"start": 0, "duration": slot_us}
            segment["target_timerange"]["duration"] = slot_us
            fit_rows.append({"index": index, "role": role, **fit})
    return fit_rows


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


def content_paths(root: Path, timeline_id: str) -> list[Path]:
    paths = [root / "draft_content.json", root / "template-2.tmp", root / "draft_content.json.bak", root / "Timelines" / timeline_id / "draft_content.json"]
    unique: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        key = str(path.resolve()).casefold()
        if path.exists() and key not in seen:
            unique.append(path)
            seen.add(key)
    return unique


def collect_missing_paths(draft: Any) -> list[str]:
    missing: list[str] = []

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key == "path" and isinstance(child, str) and (":" in child or child.startswith("/")):
                    first_path = child.split(";")[0]
                    if first_path and not Path(first_path.replace("\\", "/")).exists():
                        missing.append(child)
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(draft)
    return missing


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-backup", type=Path, default=SOURCE_BACKUP)
    parser.add_argument("--target-draft", default=TARGET_DRAFT)
    parser.add_argument("--phrases", type=Path, default=PACK_DIR / "phrase_rows.json")
    parser.add_argument("--manifest", type=Path, default=PACK_DIR / "openai-audio" / "tts_manifest.json")
    parser.add_argument("--allow-open-capcut", action="store_true")
    args = parser.parse_args()

    if not args.allow_open_capcut and capcut_is_open():
        raise RuntimeError("CapCut is open. Close CapCut before building/registering a new draft.")

    repo_root = Path(__file__).resolve().parents[1]
    source_dir = (repo_root / args.source_backup).resolve()
    if not source_dir.exists():
        raise RuntimeError(f"Source backup not found: {source_dir}")
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    target_dir = unique_draft_dir(capcut_root, args.target_draft)
    shutil.copytree(source_dir, target_dir)
    if (target_dir / ".locked").exists():
        (target_dir / ".locked").unlink()

    rows = manifest_rows(args.phrases, args.manifest)
    draft = load_json(target_dir / "draft_content.json")
    if len(draft.get("tracks", [])) != 19:
        raise RuntimeError(f"Expected 19-track user template, got {len(draft.get('tracks', []))}")
    original_source = capcut_root / SOURCE_ORIGINAL_DRAFT
    draft = rewrite_paths(draft, [original_source, source_dir], target_dir)
    intro_path = update_intro(draft, repo_root, target_dir)
    assets = copy_audio_assets(rows, repo_root, target_dir)
    audio_fit = update_timeline(draft, rows, assets)
    project_id = update_identity_and_register(target_dir, draft)

    for path in content_paths(target_dir, str(draft["id"])):
        write_capcut_json(path, draft)

    missing = collect_missing_paths(draft)
    report = {
        "draft_name": target_dir.name,
        "draft_dir": str(target_dir),
        "source_backup": str(source_dir),
        "project_id": project_id,
        "timeline_id": draft["id"],
        "track_count": len(draft.get("tracks", [])),
        "phrase_count": len(rows),
        "intro_path": str(intro_path),
        "text_tracks": {str(track): len(draft["tracks"][track]["segments"]) for track in TRACK_TEXT},
        "audio_tracks": {str(track): len(draft["tracks"][track]["segments"]) for track in TRACK_AUDIO},
        "copied_audio_files": len(assets),
        "audio_speedup_count": sum(1 for item in audio_fit if float(item["speed_ratio"]) > 1.0),
        "audio_speedup_max": max(float(item["speed_ratio"]) for item in audio_fit) if audio_fit else 1.0,
        "missing_paths": len(missing),
        "missing_path_samples": missing[:12],
    }
    out = repo_root / PACK_DIR / "capcut_build_user_template_report.json"
    write_capcut_json(out, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if missing:
        raise RuntimeError(f"Missing paths: {len(missing)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
