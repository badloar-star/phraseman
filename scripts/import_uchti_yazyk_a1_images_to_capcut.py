"""Replace the 300 lesson-video materials with their verified A1 still images."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image


PROJECT = Path(r"C:\Users\badlo\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\Учти язык")
SOURCE = Path(r"C:\Users\badlo\Desktop\A1_RU_300_3D_9x16")
BACKUP_ROOT = Path(r"C:\appsprojects\phraseman\.codex-tmp\capcut-backups")
TRACK_INDEX = 1
INTRO_SEGMENTS = set(range(0, 360, 6))
LESSON_SEGMENTS = [index for index in range(360) if index not in INTRO_SEGMENTS]
PHOTO_SOURCE_DURATION = 10_800_000_000


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def capcut_is_running() -> bool:
    result = subprocess.run(["powershell", "-NoProfile", "-Command", "@(Get-Process CapCut* -ErrorAction SilentlyContinue).Count"], text=True, capture_output=True, check=True)
    return int(result.stdout.strip() or "0") > 0


def mirror_paths() -> list[Path]:
    timeline = PROJECT / "Timelines" / "6A3C09C7-515F-49A5-86B1-20504321F22F"
    return [PROJECT / "draft_content.json", PROJECT / "template-2.tmp", timeline / "draft_content.json", timeline / "template-2.tmp"]


def source_files() -> list[Path]:
    files = [SOURCE / f"{number:03d}.png" for number in range(1, 301)]
    missing = [path.name for path in files if not path.is_file()]
    if missing:
        raise RuntimeError(f"missing A1 images: {', '.join(missing)}")
    for path in files:
        with Image.open(path) as image:
            if image.size != (1080, 1920):
                raise RuntimeError(f"wrong image size: {path.name}")
    return files


def load_draft(paths: list[Path]) -> dict:
    payloads = [path.read_bytes() for path in paths]
    if len({hashlib.sha256(payload).hexdigest() for payload in payloads}) != 1:
        raise RuntimeError("native draft mirrors differ before image import")
    draft = json.loads(payloads[0].decode("utf-8"))
    track = draft["tracks"][TRACK_INDEX]
    if track.get("type") != "video" or len(track.get("segments", [])) != 360:
        raise RuntimeError("expected main 360-slot video track is unavailable")
    materials = {material["id"]: material for material in draft["materials"]["videos"]}
    lesson_ids = [track["segments"][index]["material_id"] for index in LESSON_SEGMENTS]
    if len(set(lesson_ids)) != 300:
        raise RuntimeError("lesson slots do not have independent materials")
    if any(materials[material_id].get("type") not in {"video", "photo"} for material_id in lesson_ids):
        raise RuntimeError("unexpected material type on lesson track")
    return draft


def backup(paths: list[Path]) -> Path:
    destination = BACKUP_ROOT / f"Учти язык.before-a1-image-import.{dt.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    destination.mkdir(parents=True)
    for source in paths:
        target = destination / source.relative_to(PROJECT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    return destination


def apply_images(draft: dict, copied: list[Path]) -> None:
    track = draft["tracks"][TRACK_INDEX]
    materials = {material["id"]: material for material in draft["materials"]["videos"]}
    for phrase_number, segment_index in enumerate(LESSON_SEGMENTS, start=1):
        segment = track["segments"][segment_index]
        material = materials[segment["material_id"]]
        image = copied[phrase_number - 1]
        material["type"] = "photo"
        material["path"] = image.as_posix()
        material["media_path"] = ""
        material["material_name"] = image.name
        material["material_url"] = ""
        material["local_material_id"] = ""
        material["duration"] = PHOTO_SOURCE_DURATION
        material["width"] = 1080
        material["height"] = 1920
        material["has_audio"] = False
        segment["source_timerange"] = {"start": 0, "duration": segment["target_timerange"]["duration"]}


def write_mirrors(paths: list[Path], draft: dict) -> None:
    encoded = json.dumps(draft, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    for path in paths:
        temp = path.with_suffix(path.suffix + ".image-import-tmp")
        temp.write_bytes(encoded)
        temp.replace(path)
    if len({sha256(path) for path in paths}) != 1:
        raise RuntimeError("native draft mirrors differ after image import")


def verify(draft_before: dict, paths: list[Path], copied: list[Path]) -> None:
    draft = json.loads(paths[0].read_text(encoding="utf-8"))
    before_track = draft_before["tracks"][TRACK_INDEX]
    after_track = draft["tracks"][TRACK_INDEX]
    before_materials = {material["id"]: material for material in draft_before["materials"]["videos"]}
    after_materials = {material["id"]: material for material in draft["materials"]["videos"]}
    lesson_ids = {after_track["segments"][index]["material_id"] for index in LESSON_SEGMENTS}
    changed = {material_id for material_id in after_materials if after_materials[material_id] != before_materials[material_id]}
    if changed != lesson_ids:
        raise RuntimeError("materials outside the 300 lesson slots were changed")
    if any(draft["tracks"][index] != draft_before["tracks"][index] for index in range(len(draft["tracks"])) if index != TRACK_INDEX):
        raise RuntimeError("a non-video track changed")
    if any(after_track["segments"][index] != before_track["segments"][index] for index in INTRO_SEGMENTS):
        raise RuntimeError("an intro segment changed")
    expected = [image.as_posix() for image in copied]
    actual = [after_materials[after_track["segments"][index]["material_id"]]["path"] for index in LESSON_SEGMENTS]
    if actual != expected:
        raise RuntimeError("images are not mapped one-to-one to lesson slots")
    if any(after_materials[after_track["segments"][index]["material_id"]].get("type") != "photo" for index in LESSON_SEGMENTS):
        raise RuntimeError("a lesson material was not converted to a CapCut photo")
    if len({sha256(path) for path in paths}) != 1:
        raise RuntimeError("native mirrors diverged during verification")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if capcut_is_running():
        raise RuntimeError("CapCut is running; native draft edits are forbidden")
    files = source_files()
    paths = mirror_paths()
    if not all(path.is_file() for path in paths):
        raise RuntimeError("a required native draft mirror is missing")
    draft = load_draft(paths)
    destination = PROJECT / "Resources" / "lingman_a1_scenes_300_20260813"
    copied = [destination / path.name for path in files]
    print(json.dumps({"dryRun": not args.apply, "capcutRunning": False, "lessonSlots": len(LESSON_SEGMENTS), "sourceImages": len(files), "destination": str(destination)}, ensure_ascii=False))
    if not args.apply:
        return
    backup_path = backup(paths)
    destination.mkdir(parents=True, exist_ok=True)
    for source, target in zip(files, copied, strict=True):
        if not target.exists() or sha256(source) != sha256(target):
            shutil.copy2(source, target)
    apply_images(draft, copied)
    write_mirrors(paths, draft)
    verify(load_draft_from_backup(backup_path), paths, copied)
    print(json.dumps({"applied": True, "backup": str(backup_path), "imported": len(copied), "mirrors": len(paths)}, ensure_ascii=False))


def load_draft_from_backup(backup: Path) -> dict:
    return json.loads((backup / "draft_content.json").read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
