"""Correct SPANISH_1 to English-first, Spanish-second without moving text layers."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from mutagen.mp3 import MP3


ROWS = 300


def fail(message: str) -> None:
    raise RuntimeError(message)


def capcut_running() -> bool:
    result = subprocess.run(["powershell", "-NoProfile", "-Command", "@(Get-Process -Name CapCut -ErrorAction SilentlyContinue).Count"], check=True, capture_output=True, text=True)
    return int(result.stdout.strip() or "0") > 0


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def audio_files(folder: Path) -> list[Path]:
    files = {int(path.name.split("_", 1)[0]): path for path in folder.glob("*_Chapter_1.mp3")}
    if set(files) != set(range(1, ROWS + 1)):
        fail(f"Expected numbered 1..{ROWS} audio files")
    return [files[index] for index in range(1, ROWS + 1)]


def duration_us(path: Path) -> int:
    return int(round(MP3(path).info.length * 1_000_000))


def manual_wrap(value: str, max_chars: int = 18) -> str:
    """Wrap only between words; native CapCut wrapping can split a word."""
    words = value.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > max_chars:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return "\n".join(lines)


def set_text(material: dict, value: str) -> None:
    content = json.loads(material["content"])
    content["text"] = value
    for style in content.get("styles", []):
        if isinstance(style, dict) and "range" in style:
            style["range"] = [0, len(value)]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--english-dataset", type=Path, required=True)
    parser.add_argument("--english-dir", type=Path, required=True)
    parser.add_argument("--target-dir", type=Path, required=True)
    parser.add_argument("--target-code", required=True)
    parser.add_argument("--language-name", required=True)
    parser.add_argument("--backup-root", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if capcut_running():
        fail("CapCut is running")
    project = args.project.resolve()
    root = project / "draft_content.json"
    original = root.read_bytes()
    draft = json.loads(original.decode("utf-8"))
    mirrors = [root, project / "template-2.tmp", project / "Timelines" / str(draft["id"]) / "draft_content.json", project / "Timelines" / str(draft["id"]) / "template-2.tmp"]
    if any(not path.is_file() or path.read_bytes() != original for path in mirrors):
        fail("Native mirrors differ before correction")
    with args.english_dataset.open(encoding="utf-8-sig", newline="") as handle:
        english = [row["english"] for row in csv.DictReader(handle, delimiter="|")]
    if len(english) != ROWS:
        fail("English dataset must contain 300 rows")
    files = audio_files(args.english_dir.resolve())
    durations = [duration_us(path) for path in files]
    target_files = audio_files(args.target_dir.resolve())
    target_durations = [duration_us(path) for path in target_files]
    tracks = draft["tracks"]
    if not (tracks[5]["name"] == "INTRO INFO" and len(tracks[5]["segments"]) == 60 and tracks[6]["name"] == "INTRO HEADLINE" and len(tracks[6]["segments"]) == 60 and tracks[18]["name"] == "INTRO URL" and len(tracks[18]["segments"]) == 60):
        fail("Expected separate intro tracks are missing")
    if any(len(tracks[index]["segments"]) != ROWS for index in (8, 10, 15, 16)):
        fail("Expected 300 phrase segments on text/audio tracks")
    texts = {str(item["id"]): item for item in draft["materials"]["texts"]}
    audios = {str(item["id"]): item for item in draft["materials"]["audios"]}
    lower_ids = [str(segment["material_id"]) for segment in tracks[10]["segments"]]
    voice_ids = [str(segment["material_id"]) for segment in tracks[15]["segments"]]
    for index, material_id in enumerate(lower_ids):
        set_text(texts[material_id], manual_wrap(english[index]))
    for segment in tracks[5]["segments"]:
        set_text(texts[str(segment["material_id"])], "Watch it twice\nto remember more.")
    for segment in tracks[6]["segments"]:
        set_text(texts[str(segment["material_id"])], f"Learning {args.language_name}\ncan be easier.")
    asset_base = f"lingman_{args.target_code}_a1_20260813"
    asset_root = project / "Resources" / asset_base / "en"
    target_asset_root = project / "Resources" / asset_base / args.target_code
    russian_window_ends = [int(segment["target_timerange"]["start"]) + int(segment["target_timerange"]["duration"]) for segment in tracks[10]["segments"]]
    target_starts = [int(segment["target_timerange"]["start"]) for segment in tracks[16]["segments"]]
    errors: list[str] = []
    for index, (material_id, source, duration) in enumerate(zip(voice_ids, files, durations)):
        target = asset_root / f"en_{index + 1:03d}.mp3"
        audios[material_id].update({"path": f"##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##/Resources/{asset_base}/en/{target.name}", "name": target.name, "duration": duration})
        en_segment = tracks[15]["segments"][index]
        en_start = int(en_segment["target_timerange"]["start"])
        en_segment["source_timerange"]["duration"] = duration
        en_segment["target_timerange"]["duration"] = duration
        target_material = audios[str(tracks[16]["segments"][index]["material_id"])]
        target_path = target_asset_root / f"{args.target_code}_{index + 1:03d}.mp3"
        target_duration = target_durations[index]
        target_material.update({"path": f"##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##/Resources/{asset_base}/{args.target_code}/{target_path.name}", "name": target_path.name, "duration": target_duration})
        target_segment = tracks[16]["segments"][index]
        target_segment["source_timerange"]["duration"] = target_duration
        target_segment["target_timerange"]["duration"] = target_duration
        earliest_target = en_start + duration + 150_000
        latest_target = russian_window_ends[index] - target_duration
        target_start = min(target_starts[index], latest_target)
        if target_start < earliest_target:
            errors.append(str(index + 1))
        else:
            target_segment["target_timerange"]["start"] = target_start
    if errors:
        fail(f"English then {args.language_name} cannot fit in phrase slots: {errors[:10]}")
    payload = json.dumps(draft, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    summary = {"status": "dry-run", "english": ROWS, "target": ROWS, "headline": f"Learning {args.language_name} can be easier.", "info": "Watch it twice to remember more."}
    if not args.apply:
        print(json.dumps(summary, ensure_ascii=False))
        return 0
    destination = args.backup_root.resolve() / f"{project.name}.before-english-{args.target_code}-correction.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    destination.mkdir(parents=True, exist_ok=False)
    for source in mirrors:
        target = destination / source.relative_to(project)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    for index, source in enumerate(files, start=1):
        target = asset_root / f"en_{index:03d}.mp3"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    for index, source in enumerate(target_files, start=1):
        target = target_asset_root / f"{args.target_code}_{index:03d}.mp3"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    for path in mirrors:
        temporary = path.with_name(f"{path.name}.english-spanish-new")
        temporary.write_bytes(payload)
        temporary.replace(path)
    if any(path.read_bytes() != payload for path in mirrors):
        fail("Native mirrors differ after correction")
    summary.update({"status": "applied", "backup": str(destination), "mirrorSha256": sha256(root)})
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"status": "failed", "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
