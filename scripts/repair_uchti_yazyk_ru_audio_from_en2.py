"""Replace only the Russian voice track in the UCHTI YAZYK native CapCut draft.

This correction exists because the user's EN2 export is the Russian 300-file
set. It is intentionally narrower than the initial importer: no text, IPA,
English audio, timing starts, backgrounds, or effects may change.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

from import_uchti_yazyk_a1_tts import (
    EXPECTED_ROWS,
    RU_TRACK_INDEX,
    atomic_write,
    audio_interval_overlaps,
    capcut_is_running,
    copy_asset,
    create_backup,
    duration_us,
    fail,
    load_native_draft,
    material_map,
    numbered_audio_files,
    target_material_ids,
)


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


EN_TRACK_INDEX = 16


def expected_audio_track(draft: dict[str, Any], index: int) -> dict[str, Any]:
    track = draft.get("tracks", [])[index]
    if track.get("type") != "audio" or len(track.get("segments", [])) != EXPECTED_ROWS:
        fail(f"Track {index} must be an audio track with {EXPECTED_ROWS} segments")
    return track


def allowed_snapshot(draft: dict[str, Any], audio_ids: set[str]) -> str:
    snapshot = copy.deepcopy(draft)
    for material in snapshot["materials"]["audios"]:
        if str(material.get("id")) in audio_ids:
            for field in ("path", "name", "duration"):
                material[field] = "__PERMITTED_RU_AUDIO_CHANGE__"
    for segment in snapshot["tracks"][RU_TRACK_INDEX]["segments"]:
        for timerange in ("source_timerange", "target_timerange"):
            segment[timerange]["duration"] = "__PERMITTED_RU_AUDIO_CHANGE__"
    return json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--en2-ru-dir", type=Path, required=True)
    parser.add_argument("--backup-root", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    project = args.project.resolve()
    source_files = numbered_audio_files(args.en2_ru_dir.resolve())
    source_durations = [duration_us(path) for path in source_files]
    if capcut_is_running():
        fail("CapCut is running. Close it completely before modifying a native draft.")

    draft, mirrors, original_bytes = load_native_draft(project)
    ru_track = expected_audio_track(draft, RU_TRACK_INDEX)
    en_track = expected_audio_track(draft, EN_TRACK_INDEX)
    audios = material_map(draft, "audios")
    ru_ids = target_material_ids(ru_track)
    if any(material_id not in audios for material_id in ru_ids):
        fail("Russian audio track references a missing material")
    before_snapshot = allowed_snapshot(draft, set(ru_ids))

    asset_root = project / "Resources" / "lingman_a1_tts_20260812_en2_russian_fix" / "ru"
    targets = [asset_root / f"ru_en2_{index:03d}.mp3" for index in range(1, EXPECTED_ROWS + 1)]
    for index, material_id in enumerate(ru_ids):
        material = audios[material_id]
        material["path"] = targets[index].as_posix()
        material["name"] = targets[index].name
        material["duration"] = source_durations[index]
        segment = ru_track["segments"][index]
        segment["source_timerange"]["duration"] = source_durations[index]
        segment["target_timerange"]["duration"] = source_durations[index]

    if before_snapshot != allowed_snapshot(draft, set(ru_ids)):
        fail("Native guard failed: this repair would change fields outside the Russian audio track")
    overlaps = audio_interval_overlaps(draft, ru_track, en_track)
    if overlaps:
        fail(f"Voice overlap gate failed: {overlaps[:8]}")

    payload = json.dumps(draft, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    summary = {
        "status": "dry-run",
        "russian_audio": len(source_files),
        "english_audio_changed": 0,
        "text_changed": 0,
        "ru_max_duration_us": max(source_durations),
        "mirrors": len(mirrors),
        "asset_root": str(asset_root),
    }
    if not args.apply:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0

    if capcut_is_running():
        fail("CapCut started during validation. The draft was not modified.")
    backup = create_backup(mirrors, project, args.backup_root.resolve())
    try:
        for source, target in zip(source_files, targets, strict=True):
            copy_asset(source, target)
        for mirror in mirrors:
            atomic_write(mirror, payload)
    except Exception:
        for mirror in mirrors:
            atomic_write(mirror, original_bytes)
        raise

    mismatched = [str(mirror) for mirror in mirrors if mirror.read_bytes() != payload]
    if mismatched:
        fail(f"Post-write native mirror mismatch: {mismatched}")
    summary.update(
        {
            "status": "applied",
            "backup": str(backup),
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
