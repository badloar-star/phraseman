#!/usr/bin/env python3
"""Repair current RU->DE Venga draft: intro tail, visible tracks, and no mid-word text wrapping."""

from __future__ import annotations

import json
import argparse
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


DRAFT = Path(r"C:\Users\badlo\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\VENGA RU DE NEWBG")
INTRO_SRC = Path("exports/venga-phrase-packs/intro-russian-target-11labs/intro_ru_for_de_alina_beauty_slot_19s83.wav")
INTRO_RESOURCE_SUBDIR = "venga_intro_11labs_ru_target"
INTRO_NAME = "intro_ru_for_de_alina_beauty_slot_19s83.wav"
US = 1_000_000


def capcut_is_open() -> bool:
    completed = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "Get-Process | Where-Object { $_.ProcessName -like '*CapCut*' -or $_.ProcessName -like '*VECreator*' -or $_.ProcessName -like '*lv*' } | Select-Object -First 1",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    return bool(completed.stdout.strip())


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def ffprobe_duration_us(path: Path) -> int:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    return int(round(float(completed.stdout.strip()) * US))


def segment_material_ids(segment: dict[str, Any]) -> list[str]:
    material_id = segment.get("material_id")
    if isinstance(material_id, str):
        return [material_id]
    if isinstance(material_id, list):
        return [item for item in material_id if isinstance(item, str)]
    return []


def material_path(material: dict[str, Any]) -> str:
    for key in ("path", "media_path", "file_Path", "file_path"):
        value = material.get(key)
        if isinstance(value, str) and value:
            return value
    return ""


def set_material_path(material: dict[str, Any], path: Path) -> None:
    value = str(path)
    if "path" in material:
        material["path"] = value
    if "media_path" in material and material.get("media_path"):
        material["media_path"] = value
    if "file_Path" in material and material.get("file_Path"):
        material["file_Path"] = value.replace("\\", "/")


def text_payload(material: dict[str, Any]) -> tuple[dict[str, Any], str] | None:
    raw = material.get("content") or material.get("text")
    if not isinstance(raw, str) or not raw:
        return None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return None
    text = payload.get("text")
    if not isinstance(text, str):
        return None
    return payload, text


def store_text_payload(material: dict[str, Any], payload: dict[str, Any], text: str) -> None:
    old_text = payload.get("text") or ""
    payload["text"] = text
    for style in payload.get("styles", []) or []:
        if isinstance(style, dict) and isinstance(style.get("range"), list) and len(style["range"]) == 2:
            if style["range"][0] == 0 and style["range"][1] >= len(old_text) - 1:
                style["range"] = [0, len(text)]
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    material["content"] = encoded
    if "base_content" in material:
        material["base_content"] = encoded
    if "recognize_text" in material:
        material["recognize_text"] = text
    if "translate_original_text" in material:
        material["translate_original_text"] = text


def visual_len(text: str) -> int:
    total = 0
    for char in text:
        if char == " ":
            total += 1
        elif re.match(r"[A-ZА-ЯЁÄÖÜẞ]", char):
            total += 1
        else:
            total += 1
    return total


def best_two_line_wrap(words: list[str]) -> str:
    best: tuple[int, int, str] | None = None
    for split in range(1, len(words)):
        left = " ".join(words[:split])
        right = " ".join(words[split:])
        score = max(visual_len(left), visual_len(right))
        balance = abs(visual_len(left) - visual_len(right))
        candidate = (score, balance, left + "\n" + right)
        if best is None or candidate < best:
            best = candidate
    return best[2] if best else " ".join(words)


def wrap_text(text: str, max_line: int, max_lines: int = 2) -> str:
    words = " ".join(text.split()).split()
    if not words:
        return ""
    one = " ".join(words)
    if visual_len(one) <= max_line:
        return one
    if max_lines == 2:
        return best_two_line_wrap(words)

    lines: list[str] = []
    current: list[str] = []
    for word in words:
        trial = " ".join([*current, word])
        if current and visual_len(trial) > max_line:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return "\n".join(lines)


def wrap_breakdown(text: str) -> str:
    raw_lines: list[str] = []
    for line in text.splitlines():
        parts = [part.strip() for part in line.split(";") if part.strip()]
        raw_lines.extend(parts or [line.strip()])
    lines: list[str] = []
    for line in raw_lines:
        if visual_len(line) <= 28:
            lines.append(line)
            continue
        if " — " in line:
            left, right = line.split(" — ", 1)
            lines.append(f"{left} —")
            lines.append(right)
        else:
            lines.append(wrap_text(line, 28, max_lines=4))
    return "\n".join(item for item in lines if item)


def bad_explicit_wrap(text: str) -> bool:
    lines = text.splitlines()
    for left, right in zip(lines, lines[1:]):
        left = left.strip()
        right = right.strip()
        if not left or not right:
            continue
        if re.search(r"[\wÀ-ÖØ-öø-ÿА-Яа-яЁё]$", left) and re.match(r"^[\wÀ-ÖØ-öø-ÿА-Яа-яЁё]", right):
            if len(left) <= 2 or len(right) <= 2:
                return True
    return False


def text_line_gate(track_index: int, text: str) -> list[str]:
    limits = {7: 20, 8: 34, 9: 17, 10: 28}
    limit = limits[track_index]
    problems: list[str] = []
    for line in text.splitlines() or [text]:
        for word in line.split():
            clean = word.strip("/.,;:!?()[]{}")
            if visual_len(clean) > max(limit, 18):
                problems.append(f"track {track_index} single word too long: {clean!r}")
        if visual_len(line.strip()) > limit and " " not in line.strip():
            problems.append(f"track {track_index} unbreakable long line: {line!r}")
    if bad_explicit_wrap(text):
        problems.append(f"track {track_index} explicit mid-word/tiny wrap: {text!r}")
    return problems


def update_meta_intro_path(meta_path: Path, old_path: str, new_path: Path, duration_us: int) -> None:
    meta = load_json(meta_path)
    for group in meta.get("draft_materials", []):
        for item in group.get("value", []) or []:
            if str(item.get("file_Path", "")).replace("\\", "/").casefold() == old_path.replace("\\", "/").casefold():
                item["file_Path"] = str(new_path).replace("\\", "/")
                item["duration"] = duration_us
                item["roughcut_time_range"] = {"start": 0, "duration": duration_us}
    write_json(meta_path, meta)


def unique_copy_path(source: Path, requested: str) -> Path:
    base = source.parent / requested
    if not base.exists():
        return base
    return source.parent / f"{requested} {time.strftime('%Y%m%d_%H%M%S')}"


def folder_size(path: Path) -> int:
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())


def register_project(draft_dir: Path, draft: dict[str, Any]) -> None:
    now_us = int(time.time() * US)
    draft["name"] = draft_dir.name
    draft["path"] = draft_dir.as_posix()
    draft["update_time"] = now_us

    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
    meta.update(
        {
            "draft_name": draft_dir.name,
            "draft_fold_path": draft_dir.as_posix(),
            "draft_root_path": draft_dir.parent.as_posix(),
            "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
            "draft_cover": (draft_dir / "draft_cover.jpg").as_posix() if (draft_dir / "draft_cover.jpg").exists() else meta.get("draft_cover", ""),
            "draft_is_invisible": False,
            "streaming_edit_draft_ready": True,
            "tm_duration": draft.get("duration", meta.get("tm_duration", 0)),
            "tm_draft_modified": now_us,
            "tm_draft_removed": 0,
            "draft_timeline_materials_size": folder_size(draft_dir / "Resources"),
            "draft_timeline_materials_size_": folder_size(draft_dir / "Resources"),
        }
    )
    write_json(meta_path, meta)

    root_meta_path = draft_dir.parent / "root_meta_info.json"
    if not root_meta_path.exists():
        return
    root = load_json(root_meta_path)
    entry = {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cover": meta.get("draft_cover", ""),
        "draft_fold_path": draft_dir.as_posix(),
        "draft_id": meta.get("draft_id", ""),
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_dir.name,
        "draft_new_version": "164.0.0",
        "draft_root_path": draft_dir.parent.as_posix(),
        "draft_timeline_materials_size": meta["draft_timeline_materials_size"],
        "draft_type": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_create": meta.get("tm_draft_create", now_us),
        "tm_draft_modified": now_us,
        "tm_draft_removed": 0,
        "tm_duration": draft.get("duration", 0),
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
    shutil.copy2(root_meta_path, root_meta_path.with_suffix(f".json.bak_{time.strftime('%Y%m%d_%H%M%S')}"))
    write_json(root_meta_path, root)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft", type=Path, default=DRAFT)
    parser.add_argument("--target-copy", default="")
    parser.add_argument("--allow-open-copy", action="store_true")
    args = parser.parse_args()

    draft_dir = args.draft
    if args.target_copy:
        target = unique_copy_path(draft_dir, args.target_copy)
        shutil.copytree(draft_dir, target)
        draft_dir = target
    if capcut_is_open() and not (args.target_copy and args.allow_open_copy):
        print("CapCut is open. Close CapCut before applying this repair.")
        return 3
    if not draft_dir.exists():
        raise RuntimeError(f"Draft not found: {draft_dir}")
    if not INTRO_SRC.exists():
        raise RuntimeError(f"Regenerated intro not found: {INTRO_SRC}")

    backup: Path | None = None
    if not args.target_copy:
        backup = draft_dir.with_name(f"{draft_dir.name}.backup-before-intro-wrap-gate-{time.strftime('%Y-%m-%d-%H-%M-%S')}")
        shutil.copytree(draft_dir, backup)

    draft = load_json(draft_dir / "draft_content.json")
    materials_by_id: dict[str, dict[str, Any]] = {}
    for group in draft.get("materials", {}).values():
        if isinstance(group, list):
            for material in group:
                if isinstance(material, dict) and material.get("id"):
                    materials_by_id[material["id"]] = material

    # Make tracks and segments visible without changing template track order or user positions.
    for track in draft.get("tracks", []):
        track["attribute"] = 0
        for segment in track.get("segments", []):
            segment["visible"] = True
            if track.get("type") == "audio":
                segment["volume"] = 1.0
                segment["last_nonzero_volume"] = 1.0

    intro_dst = draft_dir / "Resources" / INTRO_RESOURCE_SUBDIR / INTRO_NAME
    intro_dst.parent.mkdir(parents=True, exist_ok=True)
    if intro_dst.exists():
        shutil.copy2(intro_dst, intro_dst.with_suffix(f".before_fix_{time.strftime('%Y%m%d_%H%M%S')}.wav"))
    shutil.copy2(INTRO_SRC, intro_dst)
    intro_duration = ffprobe_duration_us(intro_dst)

    intro_old_path = ""
    intro_track = draft["tracks"][14]
    for segment in intro_track.get("segments", []):
        segment["source_timerange"] = {"start": 0, "duration": intro_duration}
        segment["target_timerange"] = {"start": 0, "duration": intro_duration}
        for material_id in segment_material_ids(segment):
            material = materials_by_id.get(material_id)
            if material:
                intro_old_path = material_path(material)
                set_material_path(material, intro_dst)
                material["duration"] = intro_duration
                material["volume"] = 1.0
                material["last_nonzero_volume"] = 1.0

    changed_texts = 0
    for track_index, max_line in [(7, 20), (8, 34), (9, 17), (10, 28)]:
        for segment in draft["tracks"][track_index].get("segments", []):
            for material_id in segment_material_ids(segment):
                material = materials_by_id.get(material_id, {})
                parsed = text_payload(material)
                if not parsed:
                    continue
                payload, text = parsed
                if track_index == 10:
                    new_text = wrap_breakdown(text)
                else:
                    new_text = wrap_text(text, max_line, max_lines=2)
                if new_text != text:
                    store_text_payload(material, payload, new_text)
                    changed_texts += 1

    gate_errors: list[str] = []
    for track_index in [7, 8, 9, 10]:
        for segment_number, segment in enumerate(draft["tracks"][track_index].get("segments", []), start=1):
            for material_id in segment_material_ids(segment):
                parsed = text_payload(materials_by_id.get(material_id, {}))
                if not parsed:
                    continue
                _, text = parsed
                for problem in text_line_gate(track_index, text):
                    gate_errors.append(f"segment {segment_number}: {problem}")
    if gate_errors:
        raise RuntimeError("Text wrap gate failed:\n" + "\n".join(gate_errors[:80]))

    register_project(draft_dir, draft)
    for path in [draft_dir / "draft_content.json", draft_dir / "template-2.tmp", draft_dir / "Timelines" / draft["id"] / "draft_content.json"]:
        if path.exists():
            write_json(path, draft)
    if intro_old_path:
        update_meta_intro_path(draft_dir / "draft_meta_info.json", intro_old_path, intro_dst, intro_duration)

    print(
        json.dumps(
            {
                "draft": str(draft_dir),
                "backup": str(backup) if backup else "",
                "intro_duration_us": intro_duration,
                "changed_texts": changed_texts,
                "tracks": [(i, t.get("type"), len(t.get("segments", [])), t.get("attribute")) for i, t in enumerate(draft.get("tracks", []))],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
