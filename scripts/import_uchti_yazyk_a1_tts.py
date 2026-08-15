"""Safely place a numbered 300+300 ElevenLabs pack into the UCHTI YAZYK draft.

The importer deliberately changes only the three phrase text tracks and their
two voice tracks. It keeps the native CapCut mirrors byte-identical, backs up
the four mirrors before an apply run, and refuses to run while CapCut is open.
"""

from __future__ import annotations

import argparse
import csv
import copy
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


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


EXPECTED_ROWS = 300
RU_TRACK_INDEX = 15
EN_TRACK_INDEX = 16
EN_TEXT_TRACK_INDEX = 8
IPA_TEXT_TRACK_INDEX = 9
RU_TEXT_TRACK_INDEX = 10
NUMBERED_MP3 = re.compile(r"^(?P<index>[1-9]\d*)_Chapter_1\.mp3$", re.IGNORECASE)


def fail(message: str) -> None:
    raise RuntimeError(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def capcut_is_running() -> bool:
    command = "@(Get-Process -Name CapCut -ErrorAction SilentlyContinue).Count"
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", command],
        check=True,
        capture_output=True,
        text=True,
    )
    return int(result.stdout.strip() or "0") > 0


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle, delimiter="|"))
    required = {"index", "english", "ipa", "russian"}
    if not rows or not required.issubset(rows[0]):
        fail(f"Dataset must contain columns: {', '.join(sorted(required))}")
    if len(rows) != EXPECTED_ROWS:
        fail(f"Dataset must contain {EXPECTED_ROWS} rows, found {len(rows)}")
    for expected, row in enumerate(rows, start=1):
        try:
            actual = int(row["index"])
        except ValueError as error:
            raise RuntimeError(f"Dataset row {expected} has an invalid index") from error
        if actual != expected:
            fail(f"Dataset index sequence must be 1..{EXPECTED_ROWS}; row {expected} is {actual}")
        for field in ("english", "ipa", "russian"):
            if not row[field].strip():
                fail(f"Dataset row {expected} has an empty {field} value")
    return rows


def numbered_audio_files(directory: Path) -> list[Path]:
    if not directory.is_dir():
        fail(f"Audio directory does not exist: {directory}")
    by_index: dict[int, Path] = {}
    for path in directory.iterdir():
        if not path.is_file():
            continue
        match = NUMBERED_MP3.match(path.name)
        if not match:
            continue
        index = int(match.group("index"))
        if index in by_index:
            fail(f"Duplicate numbered audio file {index} in {directory}")
        by_index[index] = path
    expected = set(range(1, EXPECTED_ROWS + 1))
    if set(by_index) != expected:
        missing = sorted(expected - set(by_index))
        extra = sorted(set(by_index) - expected)
        fail(f"{directory} must contain exactly 1..{EXPECTED_ROWS}; missing={missing[:8]}, extra={extra[:8]}")
    return [by_index[index] for index in range(1, EXPECTED_ROWS + 1)]


def duration_us(path: Path) -> int:
    try:
        value = int(round(MP3(path).info.length * 1_000_000))
    except Exception as error:
        raise RuntimeError(f"Cannot read MP3 duration: {path}") from error
    if value <= 0:
        fail(f"Non-positive MP3 duration: {path}")
    return value


def manual_wrap(text: str, max_chars: int) -> str:
    """Insert only whole-word breaks. A word is never split under any condition."""
    words = text.split()
    if not words:
        fail("Cannot wrap an empty text value")
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if current and len(candidate) > max_chars:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return "\n".join(lines)


def set_text_content(content: str, text: str) -> str:
    try:
        payload = json.loads(content)
    except json.JSONDecodeError as error:
        raise RuntimeError("Text material content is not valid JSON") from error
    payload["text"] = text
    for style in payload.get("styles", []):
        if isinstance(style, dict) and "range" in style:
            style["range"] = [0, len(text)]
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def mirror_paths(project: Path, draft_id: str) -> list[Path]:
    paths = [
        project / "draft_content.json",
        project / "template-2.tmp",
        project / "Timelines" / draft_id / "draft_content.json",
        project / "Timelines" / draft_id / "template-2.tmp",
    ]
    missing = [str(path) for path in paths if not path.is_file()]
    if missing:
        fail(f"Required native draft mirrors are missing: {missing}")
    return paths


def load_native_draft(project: Path) -> tuple[dict[str, Any], list[Path], bytes]:
    root = project / "draft_content.json"
    if not root.is_file():
        fail(f"CapCut draft is missing: {root}")
    root_bytes = root.read_bytes()
    try:
        draft = json.loads(root_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Cannot parse {root}") from error
    draft_id = str(draft.get("id") or "")
    if not draft_id:
        fail("Draft content has no id")
    mirrors = mirror_paths(project, draft_id)
    mismatched = [str(path) for path in mirrors if path.read_bytes() != root_bytes]
    if mismatched:
        fail(f"Native draft mirrors differ before import: {mismatched}")
    return draft, mirrors, root_bytes


def expected_track(draft: dict[str, Any], index: int, kind: str, segments: int) -> dict[str, Any]:
    tracks = draft.get("tracks")
    if not isinstance(tracks, list) or len(tracks) <= index:
        fail(f"Track {index} is missing")
    track = tracks[index]
    if track.get("type") != kind or len(track.get("segments", [])) != segments:
        fail(f"Track {index} must be {kind} with {segments} segments")
    return track


def material_map(draft: dict[str, Any], bucket: str) -> dict[str, dict[str, Any]]:
    values = draft.get("materials", {}).get(bucket)
    if not isinstance(values, list):
        fail(f"Draft has no materials.{bucket} array")
    mapped = {str(item.get("id")): item for item in values if item.get("id")}
    if len(mapped) != len(values):
        fail(f"Duplicate or missing ids in materials.{bucket}")
    return mapped


def target_material_ids(track: dict[str, Any]) -> list[str]:
    ids = [str(segment.get("material_id") or "") for segment in track["segments"]]
    if len(ids) != EXPECTED_ROWS or len(set(ids)) != EXPECTED_ROWS or not all(ids):
        fail("Target track must reference 300 unique material ids")
    return ids


def audio_interval_overlaps(draft: dict[str, Any], ru_track: dict[str, Any], en_track: dict[str, Any]) -> list[str]:
    intervals: list[tuple[int, int, str]] = []
    for label, track in (("ru", ru_track), ("en", en_track)):
        for index, segment in enumerate(track["segments"], start=1):
            timerange = segment.get("target_timerange", {})
            start = int(timerange.get("start", -1))
            duration = int(timerange.get("duration", -1))
            if start < 0 or duration <= 0:
                return [f"{label} slot {index} has invalid timerange"]
            intervals.append((start, start + duration, f"{label} slot {index}"))
    intervals.sort(key=lambda item: (item[0], item[1]))
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


def allowed_change_snapshot(
    draft: dict[str, Any],
    text_ids: set[str],
    audio_ids: set[str],
    audio_tracks: tuple[dict[str, Any], dict[str, Any]],
) -> str:
    """Erase permitted fields and serialize so all other native fields are guarded."""
    snapshot = copy.deepcopy(draft)
    for material in snapshot["materials"]["texts"]:
        if str(material.get("id")) in text_ids:
            material["content"] = "__PERMITTED_TEXT_CHANGE__"
    for material in snapshot["materials"]["audios"]:
        if str(material.get("id")) in audio_ids:
            for field in ("path", "name", "duration"):
                material[field] = "__PERMITTED_AUDIO_CHANGE__"
    for track in audio_tracks:
        index = snapshot["tracks"].index(track)
        for segment in snapshot["tracks"][index]["segments"]:
            for range_name in ("source_timerange", "target_timerange"):
                segment[range_name]["duration"] = "__PERMITTED_DURATION_CHANGE__"
    return json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def copy_asset(source: Path, destination: Path) -> None:
    if destination.exists():
        if sha256(source) != sha256(destination):
            fail(f"Existing asset differs and will not be overwritten: {destination}")
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def atomic_write(path: Path, data: bytes) -> None:
    temporary = path.with_name(f"{path.name}.a1-tts-new")
    temporary.write_bytes(data)
    if temporary.read_bytes() != data:
        fail(f"Post-write mismatch for temporary draft file {temporary}")
    temporary.replace(path)


def create_backup(paths: list[Path], project: Path, backup_root: Path) -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    destination = backup_root / f"Учти язык.A1-TTS-before-import.{stamp}"
    destination.mkdir(parents=True, exist_ok=False)
    records = []
    for source in paths:
        relative = source.relative_to(project)
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        records.append({"relative": relative.as_posix(), "sha256": sha256(source), "bytes": source.stat().st_size})
    (destination / "manifest.json").write_text(
        json.dumps({"project": str(project), "files": records}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return destination


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--ru-dir", type=Path, required=True)
    parser.add_argument("--en-dir", type=Path, required=True)
    parser.add_argument("--backup-root", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    project = args.project.resolve()
    rows = read_rows(args.dataset.resolve())
    ru_files = numbered_audio_files(args.ru_dir.resolve())
    en_files = numbered_audio_files(args.en_dir.resolve())
    ru_durations = [duration_us(path) for path in ru_files]
    en_durations = [duration_us(path) for path in en_files]
    if capcut_is_running():
        fail("CapCut is running. Close it completely before modifying a native draft.")

    draft, mirrors, original_bytes = load_native_draft(project)
    ru_track = expected_track(draft, RU_TRACK_INDEX, "audio", EXPECTED_ROWS)
    en_track = expected_track(draft, EN_TRACK_INDEX, "audio", EXPECTED_ROWS)
    en_text_track = expected_track(draft, EN_TEXT_TRACK_INDEX, "text", EXPECTED_ROWS)
    ipa_text_track = expected_track(draft, IPA_TEXT_TRACK_INDEX, "text", EXPECTED_ROWS)
    ru_text_track = expected_track(draft, RU_TEXT_TRACK_INDEX, "text", EXPECTED_ROWS)
    texts = material_map(draft, "texts")
    audios = material_map(draft, "audios")

    en_text_ids = target_material_ids(en_text_track)
    ipa_text_ids = target_material_ids(ipa_text_track)
    ru_text_ids = target_material_ids(ru_text_track)
    ru_audio_ids = target_material_ids(ru_track)
    en_audio_ids = target_material_ids(en_track)
    for material_id in en_text_ids + ipa_text_ids + ru_text_ids:
        if material_id not in texts:
            fail(f"Missing text material {material_id}")
    for material_id in ru_audio_ids + en_audio_ids:
        if material_id not in audios:
            fail(f"Missing audio material {material_id}")

    text_ids = set(en_text_ids + ipa_text_ids + ru_text_ids)
    audio_ids = set(ru_audio_ids + en_audio_ids)
    if len(text_ids) != 900 or len(audio_ids) != 600:
        fail("Text or audio target material ids overlap unexpectedly")
    before_snapshot = allowed_change_snapshot(draft, text_ids, audio_ids, (ru_track, en_track))

    assets_root = project / "Resources" / "lingman_a1_tts_20260812"
    targets: list[tuple[Path, Path, int, str, dict[str, str]]] = []
    for index, row in enumerate(rows):
        ru_target = assets_root / "ru" / f"ru_{index + 1:03d}.mp3"
        en_target = assets_root / "en" / f"en_{index + 1:03d}.mp3"
        targets.extend(
            [
                (ru_files[index], ru_target, ru_durations[index], "ru", row),
                (en_files[index], en_target, en_durations[index], "en", row),
            ]
        )

    for index, row in enumerate(rows):
        texts[en_text_ids[index]]["content"] = set_text_content(
            texts[en_text_ids[index]]["content"], manual_wrap(row["english"].strip(), 18)
        )
        texts[ipa_text_ids[index]]["content"] = set_text_content(
            texts[ipa_text_ids[index]]["content"], manual_wrap(row["ipa"].strip(), 20)
        )
        texts[ru_text_ids[index]]["content"] = set_text_content(
            texts[ru_text_ids[index]]["content"], manual_wrap(row["russian"].strip(), 15)
        )

        for material_id, target, duration in (
            (ru_audio_ids[index], targets[index * 2][1], ru_durations[index]),
            (en_audio_ids[index], targets[index * 2 + 1][1], en_durations[index]),
        ):
            material = audios[material_id]
            material["path"] = target.as_posix()
            material["name"] = target.name
            material["duration"] = duration

        for segment, duration in (
            (ru_track["segments"][index], ru_durations[index]),
            (en_track["segments"][index], en_durations[index]),
        ):
            segment["source_timerange"]["duration"] = duration
            segment["target_timerange"]["duration"] = duration

    after_snapshot = allowed_change_snapshot(draft, text_ids, audio_ids, (ru_track, en_track))
    if before_snapshot != after_snapshot:
        fail("Native guard failed: the import would change fields outside text/audio replacements")

    overlaps = audio_interval_overlaps(draft, ru_track, en_track)
    if overlaps:
        fail(f"Voice overlap gate failed: {overlaps[:8]}")

    payload = json.dumps(draft, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    summary = {
        "status": "dry-run",
        "project": str(project),
        "rows": len(rows),
        "ru_audio": len(ru_files),
        "en_audio": len(en_files),
        "ru_max_duration_us": max(ru_durations),
        "en_max_duration_us": max(en_durations),
        "mirrors": [str(path) for path in mirrors],
        "new_payload_bytes": len(payload),
        "manual_wrap": {"english_max_chars": 18, "ipa_max_chars": 20, "russian_max_chars": 15},
    }
    if not args.apply:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0

    if capcut_is_running():
        fail("CapCut started during validation. The draft was not modified.")
    backup = create_backup(mirrors, project, args.backup_root.resolve())
    try:
        for source, target, _duration, _language, _row in targets:
            copy_asset(source, target)
        for path in mirrors:
            atomic_write(path, payload)
    except Exception:
        for path in mirrors:
            atomic_write(path, original_bytes)
        raise

    mismatched = [str(path) for path in mirrors if path.read_bytes() != payload]
    if mismatched:
        fail(f"Post-write native mirror mismatch: {mismatched}")
    summary.update(
        {
            "status": "applied",
            "backup": str(backup),
            "assets_root": str(assets_root),
            "mirror_sha256": hashlib.sha256(payload).hexdigest(),
        }
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({"status": "failed", "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
