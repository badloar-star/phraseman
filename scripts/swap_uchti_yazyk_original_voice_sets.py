"""Restore the two original 300-file voice sets and swap their two slots only.

The first import used the correct two source batches. The user reported that
they were placed in reverse language slots, so this script intentionally:
  * puts the first EN3 batch in the Russian voice slot (track 15), then
  * puts the first RU1 batch in the English voice slot (track 16).

No text, IPA, video, effect, track start, or other material field may change.
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


RU_TRACK_INDEX = 15
EN_TRACK_INDEX = 16


def audio_track(draft: dict[str, Any], index: int) -> dict[str, Any]:
    try:
        track = draft["tracks"][index]
    except (KeyError, IndexError) as error:
        raise RuntimeError(f"Audio track {index} is missing") from error
    if track.get("type") != "audio" or len(track.get("segments", [])) != EXPECTED_ROWS:
        fail(f"Track {index} must be audio with {EXPECTED_ROWS} segments")
    return track


def allowed_snapshot(draft: dict[str, Any], editable_ids: set[str]) -> str:
    snapshot = copy.deepcopy(draft)
    for material in snapshot["materials"]["audios"]:
        if str(material.get("id")) in editable_ids:
            for field in ("path", "name", "duration"):
                material[field] = "__PERMITTED_VOICE_SWAP__"
    for track_index in (RU_TRACK_INDEX, EN_TRACK_INDEX):
        for segment in snapshot["tracks"][track_index]["segments"]:
            for timerange in ("source_timerange", "target_timerange"):
                segment[timerange]["duration"] = "__PERMITTED_VOICE_SWAP__"
    return json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def replace_track(
    track: dict[str, Any],
    ids: list[str],
    materials: dict[str, dict[str, Any]],
    sources: list[Path],
    targets: list[Path],
) -> None:
    for index, material_id in enumerate(ids):
        duration = duration_us(sources[index])
        material = materials[material_id]
        material["path"] = targets[index].as_posix()
        material["name"] = targets[index].name
        material["duration"] = duration
        segment = track["segments"][index]
        segment["source_timerange"]["duration"] = duration
        segment["target_timerange"]["duration"] = duration


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--first-en3-dir", type=Path, required=True)
    parser.add_argument("--first-ru1-dir", type=Path, required=True)
    parser.add_argument("--backup-root", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    project = args.project.resolve()
    first_en3 = numbered_audio_files(args.first_en3_dir.resolve())
    first_ru1 = numbered_audio_files(args.first_ru1_dir.resolve())
    if capcut_is_running():
        fail("CapCut is running. Close it completely before modifying a native draft.")

    draft, mirrors, original_bytes = load_native_draft(project)
    ru_track = audio_track(draft, RU_TRACK_INDEX)
    en_track = audio_track(draft, EN_TRACK_INDEX)
    materials = material_map(draft, "audios")
    ru_ids = target_material_ids(ru_track)
    en_ids = target_material_ids(en_track)
    editable_ids = set(ru_ids + en_ids)
    if len(editable_ids) != 600 or any(item not in materials for item in editable_ids):
        fail("The two target voice tracks must reference 600 distinct audio materials")
    before = allowed_snapshot(draft, editable_ids)

    assets = project / "Resources" / "lingman_a1_tts_20260812_original_sets_swapped"
    ru_targets = [assets / "ru" / f"ru_from_first_en3_{index:03d}.mp3" for index in range(1, EXPECTED_ROWS + 1)]
    en_targets = [assets / "en" / f"en_from_first_ru1_{index:03d}.mp3" for index in range(1, EXPECTED_ROWS + 1)]
    replace_track(ru_track, ru_ids, materials, first_en3, ru_targets)
    replace_track(en_track, en_ids, materials, first_ru1, en_targets)

    if before != allowed_snapshot(draft, editable_ids):
        fail("Native guard failed: the swap would change fields outside two voice tracks")
    overlaps = audio_interval_overlaps(draft, ru_track, en_track)
    if overlaps:
        fail(f"Voice overlap gate failed: {overlaps[:8]}")

    payload = json.dumps(draft, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    summary = {
        "status": "dry-run",
        "russian_slot_source": "first EN3 batch",
        "english_slot_source": "first RU1 batch",
        "russian_audio": len(first_en3),
        "english_audio": len(first_ru1),
        "text_changed": 0,
        "mirrors": len(mirrors),
        "assets_root": str(assets),
    }
    if not args.apply:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0

    if capcut_is_running():
        fail("CapCut started during validation. The draft was not modified.")
    backup = create_backup(mirrors, project, args.backup_root.resolve())
    try:
        for source, target in zip(first_en3, ru_targets, strict=True):
            copy_asset(source, target)
        for source, target in zip(first_ru1, en_targets, strict=True):
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
