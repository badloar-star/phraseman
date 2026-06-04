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
SOURCE_DRAFT_NAME = "VENGA OLD T"
TARGET_DRAFT_NAME = "VENGA A1 200 OPENAI FIXED"
TRACK_TEXT = {
    3: "ru",
    4: "ipa",
    5: "en",
    6: "breakdown",
}
TRACK_AUDIO = {
    7: "ru",
    8: "en1",
    9: "en2",
    10: "en3",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def windows_path(path: Path) -> str:
    return str(path)


def folder_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())


def unique_draft_dir(root: Path, base_name: str) -> Path:
    candidate = root / base_name
    if not candidate.exists():
        return candidate
    stamp = time.strftime("%Y%m%d_%H%M%S")
    return root / f"{base_name} {stamp}"


def manifest_rows(manifest_path: Path) -> list[dict[str, Any]]:
    rows: dict[int, dict[str, Any]] = {}
    manifest = load_json(manifest_path)
    for item in manifest:
        index = int(item["index"])
        row = rows.setdefault(index, {})
        role = item["role"]
        if role == "ru":
            row["ru"] = item["source_text"]
            row["ipa"] = item["ipa"]
            row["breakdown"] = item["breakdown"]
        elif role == "en1":
            row["en"] = item["source_text"]
        row.setdefault("audio", {})[role] = item

    ordered = [rows[i] for i in range(1, 201)]
    for i, row in enumerate(ordered, start=1):
        missing = [key for key in ["ru", "en", "ipa", "breakdown"] if key not in row]
        missing += [role for role in TRACK_AUDIO.values() if role not in row["audio"]]
        if missing:
            raise SystemExit(f"Phrase {i} is missing fields: {missing}")
    return ordered


def wrap_plain_text(text: str, max_chars: int) -> str:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\n".join(lines)


def wrap_breakdown(text: str, max_chars: int = 44) -> str:
    chunks = [chunk.strip() for chunk in text.split(";") if chunk.strip()]
    lines: list[str] = []
    current = ""
    for chunk in chunks:
        if len(chunk) > max_chars:
            if current:
                lines.append(current)
                current = ""
            lines.extend(wrap_plain_text(chunk, max_chars).split("\n"))
            continue
        candidate = chunk if not current else f"{current}; {chunk}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = chunk
    if current:
        lines.append(current)
    return "\n".join(lines)


def display_text(field: str, text: str) -> str:
    if field == "breakdown":
        return wrap_breakdown(text, 34)
    if field == "en":
        return wrap_plain_text(text, 18)
    if field == "ru":
        return wrap_plain_text(text, 16)
    if field == "ipa":
        return wrap_plain_text(text, 24)
    return text


def update_text_material(material: dict[str, Any], text: str) -> None:
    content = json.loads(material.get("content") or "{}")
    content["text"] = text
    text_length = len(text)
    for style in content.get("styles", []):
        style["range"] = [0, text_length]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    material["base_content"] = ""


def copy_audio_assets(rows: list[dict[str, Any]], repo_root: Path, draft_dir: Path) -> dict[tuple[int, str], Path]:
    assets: dict[tuple[int, str], Path] = {}
    audio_root = draft_dir / "Resources" / "venga_11labs_audio"
    audio_root.mkdir(parents=True, exist_ok=True)

    for index, row in enumerate(rows, start=1):
        for role, item in row["audio"].items():
            src = repo_root / item["path"]
            if not src.exists():
                raise SystemExit(f"Missing generated audio: {src}")
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


def update_audio_material(material: dict[str, Any], asset_path: Path, slot_us: int) -> int:
    duration_us = slot_us
    pad_audio_to_slot(asset_path, slot_us)
    material["path"] = windows_path(asset_path)
    material["duration"] = duration_us
    material["name"] = asset_path.name
    return duration_us


def load_background_keyframes(repo_root: Path, base_source_us: int, source_duration_us: int, needed: int) -> list[int]:
    csv_path = repo_root / ".codex-tmp" / "venga-old-t-bg-keyframes-20260530.csv"
    if not csv_path.exists():
        return [base_source_us + i * 20 * US for i in range(needed)]
    values: list[int] = []
    min_start = max(0, base_source_us - 5 * US)
    max_start = max(min_start, base_source_us + source_duration_us - 25 * US)
    for line in csv_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            value = round(float(line.split(",", 1)[0]) * US)
        except ValueError:
            continue
        if min_start <= value <= max_start:
            values.append(value)
    if not values:
        return [base_source_us + i * 20 * US for i in range(needed)]
    if len(values) >= needed:
        step = max(1, len(values) // needed)
        return values[::step][:needed]
    return [values[i % len(values)] for i in range(needed)]


def split_background_track(draft: dict[str, Any], repo_root: Path) -> None:
    track = draft["tracks"][0]
    if len(track["segments"]) != 1:
        return
    base = track["segments"][0]
    phrase_segments = draft["tracks"][3]["segments"]
    bg_start = int(base["target_timerange"]["start"])
    bg_end = bg_start + int(base["target_timerange"]["duration"])
    starts = [int(seg["target_timerange"]["start"]) for seg in phrase_segments]
    starts = [start for start in starts if bg_start <= start < bg_end]
    starts = starts or [bg_start]
    if starts[0] > bg_start:
        starts.insert(0, bg_start)
    source_starts = load_background_keyframes(
        repo_root,
        int(base["source_timerange"]["start"]),
        int(base["source_timerange"]["duration"]),
        len(starts),
    )
    segments: list[dict[str, Any]] = []
    for i, start in enumerate(starts):
        next_start = starts[i + 1] if i + 1 < len(starts) else bg_end
        duration = max(1, next_start - start)
        segment = deepcopy(base)
        segment["id"] = str(uuid.uuid4()).upper()
        segment["target_timerange"] = {"start": start, "duration": duration}
        segment["source_timerange"] = {"start": source_starts[i], "duration": duration}
        segments.append(segment)
    track["segments"] = segments


def update_main_timeline(draft: dict[str, Any], rows: list[dict[str, Any]], assets: dict[tuple[int, str], Path], repo_root: Path) -> None:
    text_by_id = {item["id"]: item for item in draft["materials"]["texts"]}
    audio_by_id = {item["id"]: item for item in draft["materials"]["audios"]}
    split_background_track(draft, repo_root)

    for track_index, field in TRACK_TEXT.items():
        segments = draft["tracks"][track_index]["segments"]
        if len(segments) != 200:
            raise SystemExit(f"Text track {track_index} has {len(segments)} segments, expected 200")
        for i, segment in enumerate(segments, start=1):
            update_text_material(text_by_id[segment["material_id"]], display_text(field, rows[i - 1][field]))
            clip = segment.get("clip") or {}
            clip.setdefault("transform", {})
            clip.setdefault("scale", {})
            clip["transform"]["x"] = {3: 0.0, 4: 0.36, 5: 0.0, 6: 0.0}[track_index]
            clip["transform"]["y"] = {3: -0.5555555555555556, 4: -0.23148148148148148, 5: 0.6018518518518519, 6: 0.0925925925925926}[track_index]
            scale = {3: 1.0, 4: 0.9, 5: 1.0, 6: 0.86}[track_index]
            clip["scale"]["x"] = scale
            clip["scale"]["y"] = scale
            segment["clip"] = clip

    for track_index, role in TRACK_AUDIO.items():
        segments = draft["tracks"][track_index]["segments"]
        if len(segments) != 200:
            raise SystemExit(f"Audio track {track_index} has {len(segments)} segments, expected 200")
        for i, segment in enumerate(segments, start=1):
            slot_us = int(segment["target_timerange"]["duration"])
            duration_us = update_audio_material(
                audio_by_id[segment["material_id"]],
                assets[(i, role)],
                slot_us,
            )
            segment["source_timerange"] = {"start": 0, "duration": duration_us}
            segment["target_timerange"]["duration"] = duration_us


def patch_project_identity(draft_dir: Path, draft: dict[str, Any], now_us: int) -> str:
    # Keep the playable timeline id from the working template. CapCut service files
    # are local to the draft folder, while root/draft meta get a fresh project id.
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
            "tm_draft_modified": now_us,
            "draft_timeline_materials_size": folder_size(draft_dir / "Resources"),
            "draft_timeline_materials_size_": folder_size(draft_dir / "Resources"),
            "tm_draft_removed": 0,
        }
    )
    meta.setdefault("tm_draft_create", now_us)
    write_json(meta_path, meta)
    return project_id


def register_root_entry(draft_dir: Path, draft: dict[str, Any], project_id: str, now_us: int) -> dict[str, Any]:
    root = draft_dir.parent
    resources_size = folder_size(draft_dir / "Resources")
    root_meta_path = root / "root_meta_info.json"
    root_meta = load_json(root_meta_path) if root_meta_path.exists() else {"all_draft_store": [], "draft_ids": 0}
    backup_path = root_meta_path.with_suffix(f".json.bak_{time.strftime('%Y%m%d_%H%M%S')}")
    if root_meta_path.exists():
        shutil.copy2(root_meta_path, backup_path)

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
        "draft_root_path": root.as_posix(),
        "draft_timeline_materials_size": resources_size,
        "draft_type": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_create": now_us,
        "tm_draft_modified": now_us,
        "tm_draft_removed": 0,
        "tm_duration": draft["duration"],
    }

    entries = [
        item
        for item in root_meta.get("all_draft_store", [])
        if item.get("draft_name") != draft_dir.name
        and Path(str(item.get("draft_fold_path", ""))).as_posix().casefold() != draft_dir.as_posix().casefold()
        and item.get("draft_id") != project_id
    ]
    root_meta["all_draft_store"] = [entry, *entries]
    root_meta["draft_ids"] = max(int(root_meta.get("draft_ids", 0) or 0), len(root_meta["all_draft_store"]))
    root_meta["root_path"] = root.as_posix()
    write_json(root_meta_path, root_meta)
    return entry


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


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    backup_source = repo_root.parent / "phraseman-backups" / "capcut" / "VENGA OLD T-20260530-122350"
    source_dir = backup_source if backup_source.exists() else capcut_root / SOURCE_DRAFT_NAME
    openai_manifest = repo_root / "exports" / "venga-phrase-packs" / "first-200-a1-everyday-openai-audio" / "tts_manifest.json"
    elevenlabs_manifest = repo_root / "exports" / "venga-phrase-packs" / "first-200-a1-everyday-audio" / "tts_manifest.json"
    manifest_path = openai_manifest if openai_manifest.exists() else elevenlabs_manifest

    if not source_dir.exists():
        raise SystemExit(f"Source draft not found: {source_dir}")
    rows = manifest_rows(manifest_path)
    target_dir = unique_draft_dir(capcut_root, TARGET_DRAFT_NAME)
    shutil.copytree(source_dir, target_dir)

    assets = copy_audio_assets(rows, repo_root, target_dir)
    draft = load_json(target_dir / "draft_content.json")
    update_main_timeline(draft, rows, assets, repo_root)

    now_us = int(time.time() * US)
    project_id = patch_project_identity(target_dir, draft, now_us)

    for rel in ["draft_content.json", "template-2.tmp", "draft_content.json.bak"]:
        path = target_dir / rel
        if path.exists():
            write_json(path, draft)
    timeline_content = target_dir / "Timelines" / draft["id"] / "draft_content.json"
    if timeline_content.exists():
        write_json(timeline_content, draft)

    entry = register_root_entry(target_dir, draft, project_id, now_us)
    missing = collect_missing_paths(draft)
    top_audio_missing = [
        material["path"]
        for material in draft["materials"]["audios"]
        if not Path(material["path"]).exists()
    ]

    report = {
        "draft_name": target_dir.name,
        "draft_dir": str(target_dir),
        "source_dir": str(source_dir),
        "project_id": project_id,
        "timeline_id": draft["id"],
        "duration": draft["duration"],
        "text_tracks": {str(k): len(draft["tracks"][k]["segments"]) for k in TRACK_TEXT},
        "audio_tracks": {str(k): len(draft["tracks"][k]["segments"]) for k in TRACK_AUDIO},
        "copied_audio_files": len(assets),
        "root_entry_name": entry["draft_name"],
        "root_entry_id": entry["draft_id"],
        "top_audio_missing": len(top_audio_missing),
        "all_missing_paths": len(missing),
        "missing_path_samples": missing[:12],
    }
    report_path = repo_root / "exports" / "venga-phrase-packs" / "capcut_project_build_report.json"
    write_json(report_path, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
