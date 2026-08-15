"""Build ITALIAN_1 as a Russian-first, Italian-second native CapCut draft."""

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


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


ROWS = 300
NUMBERED = re.compile(r"^(?P<index>[1-9]\d*)_Chapter_1\.mp3$", re.IGNORECASE)
HEADLINE = "Учить итальянский\nможно проще:"


def fail(message: str) -> None:
    raise RuntimeError(message)


def capcut_running() -> bool:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "@(Get-Process -Name CapCut -ErrorAction SilentlyContinue).Count"],
        check=True, capture_output=True, text=True,
    )
    return int(result.stdout.strip() or "0") > 0


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def numbered_audio(directory: Path) -> list[Path]:
    files: dict[int, Path] = {}
    for path in directory.iterdir():
        match = NUMBERED.match(path.name) if path.is_file() else None
        if match:
            files[int(match.group("index"))] = path
    if set(files) != set(range(1, ROWS + 1)):
        fail(f"Expected exactly 300 numbered MP3 files in {directory}")
    return [files[index] for index in range(1, ROWS + 1)]


def duration_us(path: Path) -> int:
    return int(round(MP3(path).info.length * 1_000_000))


def text_value(material: dict[str, Any]) -> str:
    return str(json.loads(material["content"])["text"])


def set_text(material: dict[str, Any], value: str) -> None:
    content = json.loads(material["content"])
    content["text"] = value
    for style in content.get("styles", []):
        if isinstance(style, dict) and "range" in style:
            style["range"] = [0, len(value)]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))


def wrap(text: str, limit: int = 18) -> str:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        if len(word) > limit:
            fail(f"Word does not fit in the source text box: {word}")
        candidate = word if not current else f"{current} {word}"
        if current and len(candidate) > limit:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return "\n".join(lines)


def mirrors(project: Path, draft_id: str) -> list[Path]:
    result = [project / "draft_content.json", project / "template-2.tmp", project / "Timelines" / draft_id / "draft_content.json", project / "Timelines" / draft_id / "template-2.tmp"]
    if any(not path.is_file() for path in result):
        fail("A native CapCut mirror is missing")
    return result


def ids(track: dict[str, Any], count: int) -> list[str]:
    result = [str(segment.get("material_id") or "") for segment in track["segments"]]
    if len(result) != count or len(set(result)) != count or not all(result):
        fail(f"Expected {count} unique material ids")
    return result


def copy_asset(source: Path, target: Path) -> None:
    if target.exists():
        if sha256(source) != sha256(target):
            fail(f"Refusing to overwrite different asset: {target}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def backup(project: Path, paths: list[Path], root: Path) -> Path:
    destination = root / f"ITALIAN_1.before-build.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    destination.mkdir(parents=True, exist_ok=False)
    for source in paths:
        target = destination / source.relative_to(project)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    return destination


def write_mirrors(paths: list[Path], payload: bytes) -> None:
    for path in paths:
        temporary = path.with_name(f"{path.name}.italian-new")
        temporary.write_bytes(payload)
        if temporary.read_bytes() != payload:
            fail(f"Temporary write validation failed: {temporary}")
        temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--italian-list", type=Path, required=True)
    parser.add_argument("--russian-dir", type=Path, required=True)
    parser.add_argument("--italian-dir", type=Path, required=True)
    parser.add_argument("--intro", type=Path, required=True)
    parser.add_argument("--backup-root", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if capcut_running():
        fail("CapCut is running; native draft edits are forbidden")
    project = args.project.resolve()
    root = project / "draft_content.json"
    original = root.read_bytes()
    draft = json.loads(original.decode("utf-8"))
    native_mirrors = mirrors(project, str(draft["id"]))
    if any(path.read_bytes() != original for path in native_mirrors):
        fail("Native mirrors differ before the Italian build")
    italian = [line.strip() for line in args.italian_list.read_text(encoding="utf-8-sig").splitlines() if line.strip()]
    if len(italian) != ROWS:
        fail("Italian source must contain exactly 300 rows")
    russian_files = numbered_audio(args.russian_dir.resolve())
    italian_files = numbered_audio(args.italian_dir.resolve())
    if not args.intro.is_file():
        fail("Russian intro file is missing")
    russian_durations = [duration_us(path) for path in russian_files]
    italian_durations = [duration_us(path) for path in italian_files]
    intro_duration = duration_us(args.intro)

    tracks = draft["tracks"]
    contract = {5: ("text", 120), 6: ("text", 60), 8: ("text", ROWS), 9: ("text", ROWS), 10: ("text", ROWS), 14: ("audio", 60), 15: ("audio", ROWS), 16: ("audio", ROWS)}
    for index, (kind, count) in contract.items():
        if tracks[index].get("type") != kind or len(tracks[index].get("segments", [])) != count:
            fail(f"Unexpected track {index}")
    texts = {str(item["id"]): item for item in draft["materials"]["texts"]}
    audios = {str(item["id"]): item for item in draft["materials"]["audios"]}
    italian_text_ids = ids(tracks[8], ROWS)
    phonetic_text_ids = ids(tracks[9], ROWS)
    russian_text_ids = ids(tracks[10], ROWS)
    intro_headline_ids = ids(tracks[6], 60)
    intro_audio_ids = ids(tracks[14], 60)
    russian_audio_ids = ids(tracks[15], ROWS)
    italian_audio_ids = ids(tracks[16], ROWS)

    # Russian is already the first on-screen layer and first voice timing.
    # Keep all phrase transforms and time ranges intact; replace only the
    # second language content and its audio source.
    for index, material_id in enumerate(italian_text_ids):
        set_text(texts[material_id], wrap(italian[index]))
    for material_id in phonetic_text_ids:
        # English IPA must never appear beneath Italian text. Keep the native
        # layer for future Italian IPA, but hide it rather than mislabel words.
        texts[material_id]["content"] = json.dumps({"text": "", "styles": []}, ensure_ascii=False, separators=(",", ":"))
    for material_id in intro_headline_ids:
        set_text(texts[material_id], HEADLINE)

    # Keep the intro information and URL in Russian but place them on their
    # own editable tracks, following the established draft rule.
    helper_track = tracks[5]
    helper_segments = helper_track["segments"][::2]
    url_segments = helper_track["segments"][1::2]
    if len(helper_segments) != 60 or len(url_segments) != 60:
        fail("Unexpected intro helper/url segment layout")
    helper_track["segments"] = helper_segments
    helper_track["name"] = "INTRO INFO"
    helper_track["is_default_name"] = False
    tracks[6]["name"] = "INTRO HEADLINE"
    tracks[6]["is_default_name"] = False
    url_track = copy.deepcopy(helper_track)
    url_track["id"] = str(uuid.uuid4()).upper()
    url_track["name"] = "INTRO URL"
    url_track["segments"] = url_segments
    draft["tracks"].append(url_track)

    assets = project / "Resources" / "lingman_italian_a1_20260813"
    intro_path = "##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##/Resources/lingman_italian_a1_20260813/intro/intro_ru.mp3"
    for material_id in intro_audio_ids:
        audios[material_id].update({"path": intro_path, "name": "intro_ru.mp3", "duration": intro_duration})
    for segment in tracks[14]["segments"]:
        segment["source_timerange"]["duration"] = intro_duration
        segment["target_timerange"]["duration"] = intro_duration
    for index in range(ROWS):
        ru_target = assets / "ru" / f"ru_{index + 1:03d}.mp3"
        it_target = assets / "it" / f"it_{index + 1:03d}.mp3"
        audios[russian_audio_ids[index]].update({"path": f"##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##/Resources/lingman_italian_a1_20260813/ru/{ru_target.name}", "name": ru_target.name, "duration": russian_durations[index]})
        audios[italian_audio_ids[index]].update({"path": f"##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##/Resources/lingman_italian_a1_20260813/it/{it_target.name}", "name": it_target.name, "duration": italian_durations[index]})
        for segment, duration in ((tracks[15]["segments"][index], russian_durations[index]), (tracks[16]["segments"][index], italian_durations[index])):
            segment["source_timerange"]["duration"] = duration
            segment["target_timerange"]["duration"] = duration

    # Every Russian phrase must finish before its Italian answer starts, and
    # Italian must end before the next Russian phrase / intro boundary.
    russian_starts = [int(segment["target_timerange"]["start"]) for segment in tracks[15]["segments"]]
    italian_starts = [int(segment["target_timerange"]["start"]) for segment in tracks[16]["segments"]]
    russian_windows = [int(segment["target_timerange"]["start"]) + int(segment["target_timerange"]["duration"]) for segment in tracks[10]["segments"]]
    errors: list[str] = []
    for index in range(ROWS):
        earliest = russian_starts[index] + russian_durations[index] + 150_000
        latest = russian_windows[index] - italian_durations[index]
        start = min(italian_starts[index], latest)
        if start < earliest:
            errors.append(f"Italian cannot fit after Russian at {index + 1}")
            continue
        tracks[16]["segments"][index]["target_timerange"]["start"] = start
        italian_starts[index] = start
    if errors:
        fail("Voice timing gate failed: " + "; ".join(errors[:6]))
    payload = json.dumps(draft, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    report = {"status": "dry-run", "russian": len(russian_files), "italian": len(italian_files), "introDurationUs": intro_duration, "headline": HEADLINE, "phraseTextTimingsPreserved": True, "introTracks": [5, 6, len(draft["tracks"]) - 1]}
    if not args.apply:
        print(json.dumps(report, ensure_ascii=False))
        return 0
    saved = backup(project, native_mirrors, args.backup_root.resolve())
    copy_asset(args.intro, assets / "intro" / "intro_ru.mp3")
    for index, source in enumerate(russian_files, start=1):
        copy_asset(source, assets / "ru" / f"ru_{index:03d}.mp3")
    for index, source in enumerate(italian_files, start=1):
        copy_asset(source, assets / "it" / f"it_{index:03d}.mp3")
    write_mirrors(native_mirrors, payload)
    if any(path.read_bytes() != payload for path in native_mirrors):
        fail("Native mirrors differ after Italian build")
    report.update({"status": "applied", "backup": str(saved), "mirrorSha256": hashlib.sha256(payload).hexdigest()})
    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"status": "failed", "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
