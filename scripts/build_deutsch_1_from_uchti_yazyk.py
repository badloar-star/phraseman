"""Build the German-language copy of the UCHTI YAZYK CapCut draft safely."""

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
from datetime import datetime
from pathlib import Path
from typing import Any

from mutagen.mp3 import MP3


EXPECTED_ROWS = 300
NUMBERED_MP3 = re.compile(r"^(?P<index>[1-9]\d*)_Chapter_1\.mp3$", re.IGNORECASE)
INTRO_TEXT = "Learn German with Professor Lingman's method."
INTRO_HELPER_TEXT = "Watch this video\ntwice for better\nretention."


def fail(message: str) -> None:
    raise RuntimeError(message)


def capcut_is_running() -> bool:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "@(Get-Process -Name CapCut -ErrorAction SilentlyContinue).Count"],
        check=True,
        capture_output=True,
        text=True,
    )
    return int(result.stdout.strip() or "0") > 0


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def duration_us(path: Path) -> int:
    value = int(round(MP3(path).info.length * 1_000_000))
    if value <= 0:
        fail(f"Non-positive MP3 duration: {path}")
    return value


def numbered_audio_files(directory: Path) -> list[Path]:
    by_index: dict[int, Path] = {}
    for path in directory.iterdir():
        if not path.is_file():
            continue
        match = NUMBERED_MP3.match(path.name)
        if match:
            by_index[int(match.group("index"))] = path
    expected = set(range(1, EXPECTED_ROWS + 1))
    if set(by_index) != expected:
        fail(f"Expected numbered MP3 files 1..{EXPECTED_ROWS} in {directory}")
    return [by_index[index] for index in range(1, EXPECTED_ROWS + 1)]


def manual_wrap(text: str, max_chars: int) -> str:
    words = text.split()
    if not words:
        fail("Cannot wrap empty text")
    lines: list[str] = []
    current = ""
    for word in words:
        if len(word) > max_chars:
            fail(f"Word exceeds the safe text width ({max_chars}): {word}")
        candidate = word if not current else f"{current} {word}"
        if current and len(candidate) > max_chars:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return "\n".join(lines)


def text_value(material: dict[str, Any]) -> str:
    return str(json.loads(material["content"])["text"])


def set_text_value(material: dict[str, Any], value: str) -> None:
    payload = json.loads(material["content"])
    payload["text"] = value
    for style in payload.get("styles", []):
        if isinstance(style, dict) and "range" in style:
            style["range"] = [0, len(value)]
    material["content"] = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def mirror_paths(project: Path, draft_id: str) -> list[Path]:
    paths = [
        project / "draft_content.json",
        project / "template-2.tmp",
        project / "Timelines" / draft_id / "draft_content.json",
        project / "Timelines" / draft_id / "template-2.tmp",
    ]
    if any(not path.is_file() for path in paths):
        fail("One or more native CapCut draft mirrors are missing")
    return paths


def segment_ids(track: dict[str, Any], expected: int) -> list[str]:
    ids = [str(segment.get("material_id") or "") for segment in track.get("segments", [])]
    if len(ids) != expected or len(set(ids)) != expected or not all(ids):
        fail(f"Track must contain {expected} unique material ids")
    return ids


def scrub_allowed_changes(draft: dict[str, Any], text_ids: set[str], audio_ids: set[str]) -> str:
    snapshot = copy.deepcopy(draft)
    for material in snapshot["materials"]["texts"]:
        if str(material.get("id")) in text_ids:
            material["content"] = "__PERMITTED_TEXT_CHANGE__"
    for material in snapshot["materials"]["audios"]:
        if str(material.get("id")) in audio_ids:
            for field in ("path", "name", "duration"):
                material[field] = "__PERMITTED_AUDIO_CHANGE__"
    for index in (14, 15, 16):
        for segment in snapshot["tracks"][index]["segments"]:
            segment["source_timerange"] = "__PERMITTED_TIMERANGE_CHANGE__"
            segment["target_timerange"] = "__PERMITTED_TIMERANGE_CHANGE__"
    return json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def intervals_overlap(tracks: list[dict[str, Any]]) -> list[str]:
    intervals: list[tuple[int, int, str]] = []
    for track_index, track in enumerate(tracks):
        for item_index, segment in enumerate(track["segments"], start=1):
            timerange = segment["target_timerange"]
            start = int(timerange["start"])
            end = start + int(timerange["duration"])
            intervals.append((start, end, f"voice track {track_index}, slot {item_index}"))
    intervals.sort()
    overlaps: list[str] = []
    active_end = -1
    active_label = ""
    for start, end, label in intervals:
        if start < active_end:
            overlaps.append(f"{active_label} overlaps {label}")
        if end > active_end:
            active_end = end
            active_label = label
    return overlaps


def copy_asset(source: Path, target: Path) -> None:
    if target.exists():
        if sha256(source) != sha256(target):
            fail(f"Refusing to overwrite different asset: {target}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def write_mirrors(paths: list[Path], payload: bytes) -> None:
    for path in paths:
        temporary = path.with_name(f"{path.name}.deutsch-new")
        temporary.write_bytes(payload)
        if temporary.read_bytes() != payload:
            fail(f"Temporary write verification failed: {temporary}")
        temporary.replace(path)


def create_backup(paths: list[Path], project: Path, backup_root: Path) -> Path:
    destination = backup_root / f"DEUTSCH_1.before-language-swap.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    destination.mkdir(parents=True, exist_ok=False)
    for source in paths:
        target = destination / source.relative_to(project)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    return destination


def mirrors_differ_only_by_update_time(root: dict[str, Any], mirrors: list[Path]) -> bool:
    for path in mirrors[1:]:
        candidate = json.loads(path.read_text(encoding="utf-8"))
        reference = copy.deepcopy(root)
        candidate.pop("update_time", None)
        reference.pop("update_time", None)
        if candidate != reference:
            return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--german-list", type=Path, required=True)
    parser.add_argument("--english-dir", type=Path, required=True)
    parser.add_argument("--german-dir", type=Path, required=True)
    parser.add_argument("--intro", type=Path, required=True)
    parser.add_argument("--backup-root", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if capcut_is_running():
        fail("CapCut is running; native draft changes are forbidden")

    project = args.project.resolve()
    draft_path = project / "draft_content.json"
    original_bytes = draft_path.read_bytes()
    draft = json.loads(original_bytes.decode("utf-8"))
    mirrors = mirror_paths(project, str(draft["id"]))
    prewrite_backup: Path | None = None
    if any(path.read_bytes() != original_bytes for path in mirrors):
        if not mirrors_differ_only_by_update_time(draft, mirrors):
            fail("Native draft mirrors differ before the language swap")
        if not args.apply:
            fail("Native mirrors need normalization; rerun the verified build with --apply")
        prewrite_backup = create_backup(mirrors, project, args.backup_root.resolve())
        write_mirrors(mirrors, original_bytes)
    with args.dataset.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle, delimiter="|"))
    german = [line.strip() for line in args.german_list.read_text(encoding="utf-8-sig").splitlines() if line.strip()]
    if len(rows) != EXPECTED_ROWS or len(german) != EXPECTED_ROWS:
        fail("Both phrase lists must contain exactly 300 rows")
    english_files = numbered_audio_files(args.english_dir.resolve())
    german_files = numbered_audio_files(args.german_dir.resolve())
    if not args.intro.is_file():
        fail("Intro audio file is missing")

    tracks = draft["tracks"]
    required = {5: ("text", 120), 6: ("text", 60), 8: ("text", 300), 9: ("text", 300), 10: ("text", 300), 14: ("audio", 60), 15: ("audio", 300), 16: ("audio", 300)}
    for index, (kind, count) in required.items():
        if tracks[index].get("type") != kind or len(tracks[index].get("segments", [])) != count:
            fail(f"Unexpected {kind} track {index}; expected {count} segments")
    texts = {str(item["id"]): item for item in draft["materials"]["texts"]}
    audios = {str(item["id"]): item for item in draft["materials"]["audios"]}
    intro_helper_ids = segment_ids(tracks[5], 120)
    intro_text_ids = segment_ids(tracks[6], 60)
    english_text_ids = segment_ids(tracks[8], 300)
    ipa_text_ids = segment_ids(tracks[9], 300)
    german_text_ids = segment_ids(tracks[10], 300)
    intro_audio_ids = segment_ids(tracks[14], 60)
    first_voice_ids = segment_ids(tracks[15], 300)
    second_voice_ids = segment_ids(tracks[16], 300)
    existing_english = [" ".join(text_value(texts[item_id]).split()) for item_id in english_text_ids]
    if existing_english != [row["english"] for row in rows]:
        fail("English source text does not match the approved 300-row dataset")

    text_ids = set(intro_helper_ids + intro_text_ids + english_text_ids + ipa_text_ids + german_text_ids)
    audio_ids = set(intro_audio_ids + first_voice_ids + second_voice_ids)
    before = scrub_allowed_changes(draft, text_ids, audio_ids)
    english_durations = [duration_us(path) for path in english_files]
    german_durations = [duration_us(path) for path in german_files]
    intro_duration = duration_us(args.intro)
    asset_root = project / "Resources" / "lingman_deutsch_a1_20260813"

    for item_id in intro_helper_ids[::2]:
        set_text_value(texts[item_id], INTRO_HELPER_TEXT)
    for item_id in intro_text_ids:
        set_text_value(texts[item_id], manual_wrap("Learning German can be easier.", 18))
    for index, item_id in enumerate(german_text_ids):
        set_text_value(texts[item_id], manual_wrap(german[index], 18))

    for item_id in intro_audio_ids:
        material = audios[item_id]
        target = asset_root / "intro" / "intro_en.mp3"
        material.update({"path": f"##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##/Resources/lingman_deutsch_a1_20260813/intro/intro_en.mp3", "name": target.name, "duration": intro_duration})
    for segment in tracks[14]["segments"]:
        segment["source_timerange"]["duration"] = intro_duration
        segment["target_timerange"]["duration"] = intro_duration

    first_voice_starts = [int(segment["target_timerange"]["start"]) for segment in tracks[15]["segments"]]
    original_second_voice_starts = [int(segment["target_timerange"]["start"]) for segment in tracks[16]["segments"]]
    original_german_ends = [
        int(segment["target_timerange"]["start"]) + int(segment["target_timerange"]["duration"])
        for segment in tracks[10]["segments"]
    ]
    second_voice_starts: list[int] = []
    for index, (first_start, preferred_start, english_duration, german_duration) in enumerate(
        zip(first_voice_starts, original_second_voice_starts, english_durations, german_durations)
    ):
        # The original translation window ends at the next phrase or at the
        # next intro. It is the hard boundary for this phrase cycle.
        boundary = original_german_ends[index]
        earliest = first_start + english_duration + 300_000
        latest = boundary - german_duration
        second_start = min(preferred_start, latest)
        if second_start < earliest:
            fail(f"Phrase {index + 1} cannot fit English then German without cutting a voice")
        second_voice_starts.append(second_start)

    for index, (english_file, german_file) in enumerate(zip(english_files, german_files), start=1):
        en_target = asset_root / "en" / f"en_{index:03d}.mp3"
        de_target = asset_root / "de" / f"de_{index:03d}.mp3"
        first_material = audios[first_voice_ids[index - 1]]
        second_material = audios[second_voice_ids[index - 1]]
        first_material.update({"path": f"##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##/Resources/lingman_deutsch_a1_20260813/en/{en_target.name}", "name": en_target.name, "duration": english_durations[index - 1]})
        second_material.update({"path": f"##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##/Resources/lingman_deutsch_a1_20260813/de/{de_target.name}", "name": de_target.name, "duration": german_durations[index - 1]})
        for segment, duration in ((tracks[15]["segments"][index - 1], english_durations[index - 1]), (tracks[16]["segments"][index - 1], german_durations[index - 1])):
            segment["source_timerange"]["duration"] = duration
            segment["target_timerange"]["duration"] = duration
        tracks[16]["segments"][index - 1]["target_timerange"]["start"] = second_voice_starts[index - 1]

    after = scrub_allowed_changes(draft, text_ids, audio_ids)
    if before != after:
        fail("Native guard failed: a field outside the authorized swap would change")
    overlaps = intervals_overlap([tracks[14], tracks[15], tracks[16]])
    if overlaps:
        fail(f"Voice overlap gate failed: {overlaps[:4]}")
    payload = json.dumps(draft, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    summary = {"status": "dry-run", "project": str(project), "english": len(english_files), "german": len(german_files), "introDurationUs": intro_duration, "englishMaxUs": max(english_durations), "germanMaxUs": max(german_durations), "mirrors": len(mirrors), "payloadBytes": len(payload)}
    if not args.apply:
        print(json.dumps(summary, ensure_ascii=False))
        return 0
    backup = prewrite_backup or create_backup(mirrors, project, args.backup_root.resolve())
    for source, target in [(args.intro, asset_root / "intro" / "intro_en.mp3")]:
        copy_asset(source, target)
    for index, source in enumerate(english_files, start=1):
        copy_asset(source, asset_root / "en" / f"en_{index:03d}.mp3")
    for index, source in enumerate(german_files, start=1):
        copy_asset(source, asset_root / "de" / f"de_{index:03d}.mp3")
    write_mirrors(mirrors, payload)
    if any(path.read_bytes() != payload for path in mirrors):
        fail("Native draft mirrors differ after write")
    summary.update({"status": "applied", "backup": str(backup), "mirrorSha256": hashlib.sha256(payload).hexdigest()})
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"status": "failed", "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
