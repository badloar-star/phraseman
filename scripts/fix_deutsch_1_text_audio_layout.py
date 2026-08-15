"""Correct DEUTSCH_1 phrase layers and voice sources without touching its source draft."""

from __future__ import annotations

import argparse
import copy
import csv
import hashlib
import json
import re
import shutil
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from mutagen.mp3 import MP3


ROWS = 300
NUMBERED = re.compile(r"^(?P<index>[1-9]\d*)_Chapter_1\.mp3$", re.IGNORECASE)


def fail(message: str) -> None:
    raise RuntimeError(message)


def capcut_running() -> bool:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "@(Get-Process -Name CapCut -ErrorAction SilentlyContinue).Count"],
        check=True, capture_output=True, text=True,
    )
    return int(result.stdout.strip() or "0") > 0


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def audio_files(folder: Path) -> list[Path]:
    found: dict[int, Path] = {}
    for item in folder.iterdir():
        match = NUMBERED.match(item.name) if item.is_file() else None
        if match:
            found[int(match.group("index"))] = item
    if set(found) != set(range(1, ROWS + 1)):
        fail(f"Expected exactly 300 numbered MP3 files in {folder}")
    return [found[index] for index in range(1, ROWS + 1)]


def duration_us(path: Path) -> int:
    return int(round(MP3(path).info.length * 1_000_000))


def wrap(text: str, limit: int = 18) -> str:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        if len(word) > limit:
            fail(f"Unsafe single word wider than {limit} characters: {word}")
        candidate = word if not current else f"{current} {word}"
        if current and len(candidate) > limit:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return "\n".join(lines)


def set_text(material: dict[str, Any], value: str) -> None:
    payload = json.loads(material["content"])
    payload["text"] = value
    for style in payload.get("styles", []):
        if isinstance(style, dict) and "range" in style:
            style["range"] = [0, len(value)]
    material["content"] = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def mirrors(project: Path, draft_id: str) -> list[Path]:
    paths = [project / "draft_content.json", project / "template-2.tmp", project / "Timelines" / draft_id / "draft_content.json", project / "Timelines" / draft_id / "template-2.tmp"]
    if any(not path.is_file() for path in paths):
        fail("A native draft mirror is missing")
    return paths


def ids(track: dict[str, Any], count: int) -> list[str]:
    values = [str(segment.get("material_id") or "") for segment in track["segments"]]
    if len(values) != count or len(set(values)) != count or not all(values):
        fail(f"Expected {count} unique material ids")
    return values


def backup(project: Path, paths: list[Path], root: Path) -> Path:
    target = root / f"DEUTSCH_1.before-text-audio-correction.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    target.mkdir(parents=True, exist_ok=False)
    for source in paths:
        destination = target / source.relative_to(project)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
    return target


def copy_asset(source: Path, destination: Path) -> None:
    if destination.exists():
        if digest(source) != digest(destination):
            fail(f"Refusing to overwrite different asset: {destination}")
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def write_all(paths: list[Path], payload: bytes) -> None:
    for path in paths:
        temporary = path.with_name(f"{path.name}.corrected")
        temporary.write_bytes(payload)
        if temporary.read_bytes() != payload:
            fail(f"Write check failed for {temporary}")
        temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--german-list", type=Path, required=True)
    parser.add_argument("--english-dir", type=Path, required=True)
    parser.add_argument("--backup-root", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if capcut_running():
        fail("CapCut is running; native draft modifications are forbidden")

    project = args.project.resolve()
    root = project / "draft_content.json"
    original = root.read_bytes()
    draft = json.loads(original.decode("utf-8"))
    native_mirrors = mirrors(project, str(draft["id"]))
    if any(path.read_bytes() != original for path in native_mirrors):
        fail("Native draft mirrors differ before correction")
    with args.dataset.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle, delimiter="|"))
    german = [line.strip() for line in args.german_list.read_text(encoding="utf-8-sig").splitlines() if line.strip()]
    english_files = audio_files(args.english_dir.resolve())
    if len(rows) != ROWS or len(german) != ROWS:
        fail("Phrase lists must each have 300 rows")

    tracks = draft["tracks"]
    expected = {5: ("text", 120), 6: ("text", 60), 8: ("text", ROWS), 9: ("text", ROWS), 10: ("text", ROWS), 15: ("audio", ROWS), 16: ("audio", ROWS)}
    for index, (kind, count) in expected.items():
        if tracks[index].get("type") != kind or len(tracks[index].get("segments", [])) != count:
            fail(f"Unexpected track {index}")
    texts = {str(item["id"]): item for item in draft["materials"]["texts"]}
    audios = {str(item["id"]): item for item in draft["materials"]["audios"]}
    upper_ids = ids(tracks[8], ROWS)
    lower_ids = ids(tracks[10], ROWS)
    english_voice_ids = ids(tracks[15], ROWS)

    # Do not touch any timing/position. Only swap which language each existing
    # text layer displays: German uses the original upper styling; English the lower.
    for index, row in enumerate(rows):
        set_text(texts[upper_ids[index]], wrap(german[index]))
        set_text(texts[lower_ids[index]], wrap(row["english"]))

    # Split the former alternating intro helper/url track into independent tracks.
    intro_mix = tracks[5]
    helper_segments = intro_mix["segments"][::2]
    url_segments = intro_mix["segments"][1::2]
    if len(helper_segments) != 60 or len(url_segments) != 60:
        fail("Intro helper/url track is not the expected alternating 60+60 layout")
    intro_mix["segments"] = helper_segments
    intro_mix["name"] = "INTRO INFO"
    intro_mix["is_default_name"] = False
    tracks[6]["name"] = "INTRO HEADLINE"
    tracks[6]["is_default_name"] = False
    url_track = copy.deepcopy(intro_mix)
    url_track["id"] = str(uuid.uuid4()).upper()
    url_track["name"] = "INTRO URL"
    url_track["is_default_name"] = False
    url_track["segments"] = url_segments
    draft["tracks"].append(url_track)

    asset_root = project / "Resources" / "lingman_deutsch_a1_20260813" / "en_real"
    durations = [duration_us(path) for path in english_files]
    for index, (material_id, source, duration) in enumerate(zip(english_voice_ids, english_files, durations), start=1):
        target = asset_root / f"en_{index:03d}.mp3"
        audios[material_id].update({
            "path": f"##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##/Resources/lingman_deutsch_a1_20260813/en_real/{target.name}",
            "name": target.name,
            "duration": duration,
        })
        segment = tracks[15]["segments"][index - 1]
        segment["source_timerange"]["duration"] = duration
        segment["target_timerange"]["duration"] = duration

    # English must still finish before the already-positioned German voice.
    bad_order = [index + 1 for index in range(ROWS) if int(tracks[15]["segments"][index]["target_timerange"]["start"]) + durations[index] > int(tracks[16]["segments"][index]["target_timerange"]["start"])]
    if bad_order:
        fail(f"English audio would overlap German in slots: {bad_order[:8]}")
    payload = json.dumps(draft, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    report = {"status": "dry-run", "upperLanguage": "German", "lowerLanguage": "English", "englishFiles": len(english_files), "introTracks": [5, 6, len(draft["tracks"]) - 1], "payloadBytes": len(payload)}
    if not args.apply:
        print(json.dumps(report, ensure_ascii=False))
        return 0
    saved = backup(project, native_mirrors, args.backup_root.resolve())
    for index, source in enumerate(english_files, start=1):
        copy_asset(source, asset_root / f"en_{index:03d}.mp3")
    write_all(native_mirrors, payload)
    if any(path.read_bytes() != payload for path in native_mirrors):
        fail("Native draft mirrors differ after correction")
    report.update({"status": "applied", "backup": str(saved), "mirrorSha256": hashlib.sha256(payload).hexdigest()})
    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"status": "failed", "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
