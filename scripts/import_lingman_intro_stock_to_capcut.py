"""Safely import the verified 60-clip Lingman intro pack into the native draft."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import shutil
import subprocess
from pathlib import Path


PROJECT = Path(r"C:\Users\badlo\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\Учти язык")
INTRO_SOURCE = Path(r"C:\Users\badlo\Desktop\LINGMAN_INTRO_60_9x16")
BACKUP_ROOT = Path(r"C:\appsprojects\phraseman\.codex-tmp\capcut-backups")
INTRO_TRACK_INDEX = 1
INTRO_SEGMENT_INDICES = tuple(range(0, 360, 6))
MICROSECONDS = 2_633_333


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def draft_paths() -> list[Path]:
    timeline = PROJECT / "Timelines" / "6A3C09C7-515F-49A5-86B1-20504321F22F"
    return [
        PROJECT / "draft_content.json",
        PROJECT / "template-2.tmp",
        timeline / "draft_content.json",
        timeline / "template-2.tmp",
    ]


def capcut_is_running() -> bool:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "@(Get-Process CapCut* -ErrorAction SilentlyContinue).Count"],
        text=True,
        capture_output=True,
        check=True,
    )
    return int(result.stdout.strip() or "0") > 0


def source_files() -> list[Path]:
    files = [INTRO_SOURCE / f"{index:03d}.mp4" for index in range(1, 61)]
    missing = [path.name for path in files if not path.is_file()]
    if missing:
        raise RuntimeError(f"missing intro clips: {', '.join(missing)}")
    return files


def validate_source_pack(files: list[Path]) -> None:
    manifest = json.loads((INTRO_SOURCE / "manifest.json").read_text(encoding="utf-8-sig"))
    entries = manifest.get("items", manifest.get("clips", []))
    sources = {str(entry.get("source_asset_id") or entry.get("sourcePageUrl") or entry.get("source_page")) for entry in entries}
    if len(entries) != 60 or len(sources) != 60:
        raise RuntimeError("intro manifest does not contain 60 unique stock sources")
    for path in files:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name,codec_type,width,height", "-of", "json", str(path)],
            text=True,
            capture_output=True,
        )
        if result.returncode:
            raise RuntimeError(f"unreadable intro clip: {path.name}")
        info = json.loads(result.stdout)
        streams = info["streams"]
        video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
        if not video or video.get("codec_name") != "h264" or video.get("width") != 1080 or video.get("height") != 1920:
            raise RuntimeError(f"intro clip has the wrong video format: {path.name}")
        if any(stream.get("codec_type") == "audio" for stream in streams):
            raise RuntimeError(f"intro clip unexpectedly has audio: {path.name}")
        if not 2.58 <= float(info["format"]["duration"]) <= 2.68:
            raise RuntimeError(f"intro clip has the wrong duration: {path.name}")


def load_and_validate_draft(paths: list[Path]) -> dict:
    payloads = [path.read_bytes() for path in paths]
    if len({hashlib.sha256(payload).hexdigest() for payload in payloads}) != 1:
        raise RuntimeError("native draft mirrors are not byte-identical before import")
    draft = json.loads(payloads[0].decode("utf-8"))
    track = draft["tracks"][INTRO_TRACK_INDEX]
    if track.get("type") != "video" or len(track.get("segments", [])) != 360:
        raise RuntimeError("the expected 360-slot main video track was not found")
    materials = {material["id"]: material for material in draft["materials"]["videos"]}
    intro_ids = [track["segments"][index]["material_id"] for index in INTRO_SEGMENT_INDICES]
    if len(set(intro_ids)) != 60:
        raise RuntimeError("intro slots do not have 60 independent material IDs")
    if any(materials[material_id].get("path", "").endswith(".mp4") is False for material_id in intro_ids):
        raise RuntimeError("an intro material is missing its original media path")
    for index in INTRO_SEGMENT_INDICES:
        segment = track["segments"][index]
        if segment["target_timerange"]["duration"] != MICROSECONDS:
            raise RuntimeError(f"intro slot {index + 1} has unexpected timing")
    return draft


def apply_intro_paths(draft: dict, copied_files: list[Path]) -> None:
    track = draft["tracks"][INTRO_TRACK_INDEX]
    materials = {material["id"]: material for material in draft["materials"]["videos"]}
    for number, segment_index in enumerate(INTRO_SEGMENT_INDICES, start=1):
        segment = track["segments"][segment_index]
        material = materials[segment["material_id"]]
        target = copied_files[number - 1]
        material["path"] = target.as_posix()
        material["media_path"] = ""
        material["material_name"] = target.name
        material["material_url"] = ""
        # The old recovery.mp4 local ID would force CapCut to reuse its cached frame.
        material["local_material_id"] = ""
        material["duration"] = MICROSECONDS
        material["width"] = 1080
        material["height"] = 1920
        material["has_audio"] = False
        segment["source_timerange"] = {"start": 0, "duration": MICROSECONDS}


def backup(paths: list[Path]) -> Path:
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    destination = BACKUP_ROOT / f"Учти язык.before-intro-stock-import.{stamp}"
    destination.mkdir(parents=True)
    for source in paths:
        relative = source.relative_to(PROJECT)
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    return destination


def write_mirrors(paths: list[Path], draft: dict) -> None:
    encoded = json.dumps(draft, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    for path in paths:
        temporary = path.with_suffix(path.suffix + ".lingman-tmp")
        temporary.write_bytes(encoded)
        temporary.replace(path)
    if len({sha256(path) for path in paths}) != 1:
        raise RuntimeError("native draft mirrors diverged after import")


def final_gate(paths: list[Path], copied_files: list[Path]) -> None:
    draft = json.loads(paths[0].read_text(encoding="utf-8"))
    track = draft["tracks"][INTRO_TRACK_INDEX]
    materials = {material["id"]: material for material in draft["materials"]["videos"]}
    expected_paths = [path.as_posix() for path in copied_files]
    actual_paths = [materials[track["segments"][index]["material_id"]]["path"] for index in INTRO_SEGMENT_INDICES]
    if actual_paths != expected_paths:
        raise RuntimeError("intro slots do not map one-to-one to the imported clips")
    if any(materials[track["segments"][index]["material_id"]].get("local_material_id") for index in INTRO_SEGMENT_INDICES):
        raise RuntimeError("an intro material still points to an old local-media cache")
    if any(track["segments"][index]["target_timerange"]["duration"] != MICROSECONDS for index in INTRO_SEGMENT_INDICES):
        raise RuntimeError("an intro timing changed")
    if len({sha256(path) for path in paths}) != 1:
        raise RuntimeError("draft mirrors are not byte-identical")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if capcut_is_running():
        raise RuntimeError("CapCut is running; native draft import is forbidden")
    files = source_files()
    validate_source_pack(files)
    paths = draft_paths()
    if not all(path.exists() for path in paths):
        raise RuntimeError("one or more required native draft mirrors are missing")
    draft = load_and_validate_draft(paths)
    destination = PROJECT / "Resources" / "lingman_intro_stock_20260813"
    copied_files = [destination / path.name for path in files]
    print(json.dumps({"dryRun": not args.apply, "capcutRunning": False, "introSlots": [index + 1 for index in INTRO_SEGMENT_INDICES], "files": len(files), "destination": str(destination)}, ensure_ascii=False))
    if not args.apply:
        return
    backup_path = backup(paths)
    destination.mkdir(parents=True, exist_ok=True)
    for source, target in zip(files, copied_files, strict=True):
        if not target.exists() or sha256(source) != sha256(target):
            shutil.copy2(source, target)
    shutil.copy2(INTRO_SOURCE / "manifest.json", destination / "manifest.json")
    apply_intro_paths(draft, copied_files)
    write_mirrors(paths, draft)
    final_gate(paths, copied_files)
    print(json.dumps({"applied": True, "backup": str(backup_path), "imported": len(copied_files), "mirrors": len(paths)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
