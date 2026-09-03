#!/usr/bin/env python3
"""Align a compound's numbered-list arrows to phrase cadence and reuse it.

Only the selected outer compound track is replaced.  The timing of its 30
placements stays untouched; every placement points at the repaired first
compound so the same verified arrow animation is used throughout the project.
"""

from __future__ import annotations

import argparse
import copy
import datetime as dt
import json
import shutil
import sys
from pathlib import Path


ARROW = "→"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft", type=Path, required=True)
    parser.add_argument("--compound-track", type=int, default=1)
    parser.add_argument("--phrase-audio-track", type=int, default=24)
    parser.add_argument("--phrase-count", type=int, default=20)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def by_id(items: list[dict]) -> dict[str, dict]:
    return {item["id"]: item for item in items if item.get("id")}


def compound_for_first_segment(data: dict, track_index: int) -> tuple[dict, dict, dict]:
    outer_track = data["tracks"][track_index]
    if outer_track.get("type") != "video" or not outer_track.get("segments"):
        raise RuntimeError(f"Track {track_index} is not a populated compound-video track.")
    first_segment = outer_track["segments"][0]
    draft_refs = by_id(data["materials"].get("drafts", []))
    compound_ref = next((ref for ref in first_segment.get("extra_material_refs", []) if ref in draft_refs), None)
    if compound_ref is None:
        raise RuntimeError("The first outer segment does not reference a compound draft.")
    compound_entry = draft_refs[compound_ref]
    if compound_entry.get("type") != "combination" or not isinstance(compound_entry.get("draft"), dict):
        raise RuntimeError("The referenced material is not an editable compound draft.")
    return outer_track, first_segment, compound_entry["draft"]


def phrase_cadence_us(data: dict, audio_track_index: int, phrase_count: int) -> tuple[int, int]:
    audio_segments = sorted(
        data["tracks"][audio_track_index].get("segments", []),
        key=lambda segment: segment["target_timerange"]["start"],
    )
    if len(audio_segments) < phrase_count:
        raise RuntimeError("Not enough phrase audio segments to determine cadence.")
    starts = [segment["target_timerange"]["start"] for segment in audio_segments[:phrase_count]]
    intervals = [right - left for left, right in zip(starts, starts[1:])]
    if not intervals or len(set(intervals)) != 1:
        raise RuntimeError("Phrase audio is not on one uniform cadence; refusing to retime arrows.")
    return starts[0], intervals[0]


def arrow_segments(compound: dict) -> list[dict]:
    texts = by_id(compound["materials"].get("texts", []))
    arrows: list[dict] = []
    for track in compound["tracks"]:
        for segment in track.get("segments", []):
            material = texts.get(segment.get("material_id"))
            if material and ARROW in material.get("content", ""):
                arrows.append(segment)
    if len(arrows) != 2:
        raise RuntimeError(f"Expected exactly two layered arrow segments, found {len(arrows)}.")
    return arrows


def retime_keyframes(keyframes: list[dict], cadence_us: int, phrase_count: int) -> tuple[list[dict], int]:
    expected_count = 1 + 2 * (phrase_count - 1)
    if len(keyframes) != expected_count:
        raise RuntimeError(f"Unexpected arrow keyframe count {len(keyframes)} (expected {expected_count}).")
    old_cadence = keyframes[2]["time_offset"]
    frame_lead = old_cadence - keyframes[1]["time_offset"]
    if old_cadence <= 0 or frame_lead <= 0:
        raise RuntimeError("Cannot determine the one-frame arrow transition boundary.")
    positions = [copy.deepcopy(keyframes[0]["values"])]
    positions.extend(copy.deepcopy(keyframes[index]["values"]) for index in range(2, len(keyframes), 2))
    if len(positions) != phrase_count:
        raise RuntimeError("Arrow positions do not match phrase count.")

    updated: list[dict] = [copy.deepcopy(keyframes[0])]
    updated[0]["time_offset"] = 0
    updated[0]["values"] = positions[0]
    for phrase_index in range(1, phrase_count):
        hold = copy.deepcopy(keyframes[2 * phrase_index - 1])
        move = copy.deepcopy(keyframes[2 * phrase_index])
        hold["time_offset"] = phrase_index * cadence_us - frame_lead
        hold["values"] = positions[phrase_index - 1]
        move["time_offset"] = phrase_index * cadence_us
        move["values"] = positions[phrase_index]
        updated.extend((hold, move))
    return updated, old_cadence


def repair_first_compound(compound: dict, cadence_us: int, phrase_count: int) -> tuple[int, int]:
    original_cadence: int | None = None
    repaired = 0
    for arrow in arrow_segments(compound):
        for keyframe_group in arrow.get("common_keyframes", []):
            if keyframe_group.get("property_type") not in {"KFTypePositionX", "KFTypePositionY"}:
                continue
            updated, old = retime_keyframes(keyframe_group.get("keyframe_list", []), cadence_us, phrase_count)
            if original_cadence is None:
                original_cadence = old
            elif original_cadence != old:
                raise RuntimeError("Arrow layers disagree on their original cadence.")
            keyframe_group["keyframe_list"] = updated
            repaired += 1
    if repaired != 4 or original_cadence is None:
        raise RuntimeError("Expected X/Y keyframes on both arrow layers.")
    return original_cadence, repaired


def clone_first_compound(outer_track: dict, first: dict) -> int:
    first_duration = first["target_timerange"]["duration"]
    replaced = 0
    for segment in outer_track["segments"][1:]:
        # CapCut distributes a 30 fps fractional microsecond over consecutive
        # blocks, so equivalent 92.866...s placements differ by one microsecond.
        # Keep each placement's existing target duration rather than alter the
        # project timeline; anything larger is a real incompatibility.
        if abs(segment["target_timerange"]["duration"] - first_duration) > 1:
            raise RuntimeError("Outer compound clips have incompatible durations; no replacement made.")
        segment_id = segment["id"]
        placement = copy.deepcopy(segment["target_timerange"])
        segment.clear()
        segment.update(copy.deepcopy(first))
        segment["id"] = segment_id
        segment["target_timerange"] = placement
        replaced += 1
    return replaced


def validate(data: dict, outer_track: dict, first: dict, compound: dict,
             cadence_us: int, phrase_count: int, expected_count: int) -> None:
    if len(outer_track["segments"]) != expected_count:
        raise RuntimeError("Compound track segment count changed unexpectedly.")
    for segment in outer_track["segments"]:
        if segment["material_id"] != first["material_id"]:
            raise RuntimeError("A compound placement does not use the repaired first material.")
        if segment.get("extra_material_refs") != first.get("extra_material_refs"):
            raise RuntimeError("A compound placement does not point at the repaired first draft.")
    for arrow in arrow_segments(compound):
        for group in arrow.get("common_keyframes", []):
            if group.get("property_type") in {"KFTypePositionX", "KFTypePositionY"}:
                frames = group["keyframe_list"]
                moves = [frames[index]["time_offset"] for index in range(2, len(frames), 2)]
                expected = [index * cadence_us for index in range(1, phrase_count)]
                if moves != expected:
                    raise RuntimeError("Repaired arrow keyframes do not match phrase cadence.")


def main() -> int:
    args = parse_args()
    draft_path = args.draft.resolve()
    data = json.loads(draft_path.read_text(encoding="utf-8"))
    outer_track, first, compound = compound_for_first_segment(data, args.compound_track)
    phrase_start, cadence_us = phrase_cadence_us(data, args.phrase_audio_track, args.phrase_count)
    arrows = arrow_segments(compound)
    if any(arrow["target_timerange"]["start"] != phrase_start for arrow in arrows):
        raise RuntimeError("First arrow does not begin with the first phrase; refusing to guess an offset.")

    # Dry run is the reproducible failing-case proof: it reports 3.0s versus 4.5s.
    probe = copy.deepcopy(compound)
    old_cadence, _ = repair_first_compound(probe, cadence_us, args.phrase_count)
    print(f"arrow_old_cadence_us={old_cadence} phrase_cadence_us={cadence_us}")
    print(f"compound_placements={len(outer_track['segments'])} will_replace={len(outer_track['segments']) - 1}")
    if old_cadence == cadence_us:
        raise RuntimeError("Arrow is already aligned; refusing a redundant rewrite.")
    if args.dry_run:
        return 0

    repair_first_compound(compound, cadence_us, args.phrase_count)
    clone_first_compound(outer_track, first)
    validate(data, outer_track, first, compound, cadence_us, args.phrase_count, len(outer_track["segments"]))

    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = draft_path.with_name(f"draft_content.before_arrow_compound_fix_{stamp}.json")
    shutil.copy2(draft_path, backup_path)
    temporary = draft_path.with_suffix(".json.arrow-pending")
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(draft_path)
    print(f"written={draft_path}")
    print(f"backup={backup_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
