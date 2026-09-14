"""Expand an approved CapCut template around replacement WAV durations.

Unlike BUILD_TIMELINE.py, this script never constructs a new lesson layout.
It keeps every original track, segment, ID, order, transform, animation,
effect, font and material count.  It merely applies one monotonic time-warp to
the original layout: the gaps remain the same, while each existing speech slot
grows to its real German WAV duration.  All existing text, images and SFX move
together with that warp.
"""

from __future__ import annotations

import argparse
import bisect
import copy
import json
import re
import shutil
import uuid
import wave
from pathlib import Path


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write(path: Path, data: dict) -> None:
    temp = path.with_name(f"{path.name}.new-{uuid.uuid4().hex}")
    temp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temp.replace(path)


def wav_duration_us(path: Path) -> int:
    with wave.open(str(path), "rb") as value:
        return round(value.getnframes() * 1_000_000 / value.getframerate())


def material_lookup(draft: dict) -> dict[str, dict]:
    return {item["id"]: item for item in draft["materials"]["audios"]}


def speech_destination(track_name: str, desc: str, old_path: str, root: Path) -> Path | None:
    """Return the approved German WAV for one existing template speech slot.

    ``None`` marks template-owned sound design; it stays untouched apart from
    the global position shift.  No slots are added and none are removed.
    """
    if track_name == "P2_12_TIMER_BEEPS_150" or not desc:
        return None
    match = re.search(r"(?:[\\/])(\d{3})\.wav$", old_path, re.I)
    if not match:
        return None
    index = match.group(1)
    if track_name == "01_RUSSIAN_PHRASES" or track_name == "P2_09_RUSSIAN_AUDIO_50":
        folder = "1"
    elif track_name == "03_ES_VOICE_2":
        folder = "3"
    elif track_name in {"05_EXPLANATIONS_AUDIO"}:
        folder = "5"
    elif track_name == "P2_10_FEMALE_ES_AUDIO_50" or track_name == "P3_08_FEMALE_LISTES_AUDIO_50":
        folder = "4"
    elif track_name in {"P2_11_MALE_ES_AUDIO_50", "P3_09_MALE_CHECK_AUDIO_50"}:
        folder = "2"
    elif track_name == "P2_13_SECTION_INTRO_AUDIO":
        return root / "7" / "007.wav"
    elif track_name == "P3_10_SECTION_INTRO_AUDIO":
        return root / "7" / "008.wav"
    elif "EN_VOICE_1" in desc or "FINAL_AUDIO_ONLY_REPLAY" in desc:
        folder = "2"
    elif "EN_VOICE_3" in desc:
        folder = "4"
    else:
        return None
    return root / folder / f"{index}.wav"


def timewarp(points: list[tuple[int, int]]):
    old = [item[0] for item in points]

    def transform(value: int) -> int:
        index = bisect.bisect_right(old, value) - 1
        if index < 0:
            return value
        if index >= len(points) - 1:
            return points[-1][1] + (value - points[-1][0])
        old_a, new_a = points[index]
        old_b, new_b = points[index + 1]
        return new_a + round((value - old_a) * (new_b - new_a) / (old_b - old_a))

    return transform


def assert_structure(before: dict, after: dict) -> None:
    assert len(before["tracks"]) == len(after["tracks"])
    for before_track, after_track in zip(before["tracks"], after["tracks"]):
        assert before_track["id"] == after_track["id"]
        assert before_track["name"] == after_track["name"]
        assert before_track["type"] == after_track["type"]
        assert len(before_track["segments"]) == len(after_track["segments"])
        for before_segment, after_segment in zip(before_track["segments"], after_track["segments"]):
            assert before_segment["id"] == after_segment["id"]
            assert before_segment["material_id"] == after_segment["material_id"]
            for key in set(before_segment) | set(after_segment):
                if key in {"target_timerange", "source_timerange"}:
                    continue
                assert before_segment.get(key) == after_segment.get(key), f"Unexpected segment change: {before_segment['id']}:{key}"


def process(draft: dict, root: Path) -> dict:
    before = copy.deepcopy(draft)
    audio = material_lookup(draft)
    speech: list[tuple[int, int, dict, dict, Path]] = []
    untouched_audio = 0
    for track in draft["tracks"]:
        if track["type"] != "audio":
            continue
        for segment in track["segments"]:
            material = audio[segment["material_id"]]
            destination = speech_destination(track["name"], segment.get("desc", ""), material.get("path", ""), root)
            if destination is None:
                untouched_audio += 1
                continue
            if not destination.is_file():
                raise ValueError(f"Missing approved WAV: {destination}")
            timerange = segment["target_timerange"]
            speech.append((timerange["start"], timerange["start"] + timerange["duration"], segment, material, destination))
    speech.sort(key=lambda item: item[0])
    if not speech:
        raise ValueError("No existing speech slots found")
    if any(next_item[0] < current[1] for current, next_item in zip(speech, speech[1:])):
        raise ValueError("Template speech slots overlap; refusing to guess an elastic schedule")

    # Preserve every original pause between speech clips.  Only speech itself
    # grows/shrinks to the real voice duration.
    anchors: list[tuple[int, int]] = [(0, 0)]
    previous_old_end = 0
    previous_new_end = 0
    for old_start, old_end, segment, material, destination in speech:
        new_start = previous_new_end + (old_start - previous_old_end)
        new_end = new_start + wav_duration_us(destination)
        anchors.extend(((old_start, new_start), (old_end, new_end)))
        previous_old_end, previous_new_end = old_end, new_end
        material["path"] = destination.as_posix()
        material["name"] = destination.name
        material["material_name"] = destination.name
        material["duration"] = new_end - new_start
    anchors.append((before["duration"], previous_new_end + (before["duration"] - previous_old_end)))
    transform = timewarp(anchors)

    # Move every existing segment by one common time map.  This retains the
    # exact visual/audio relationship and leaves the segment list untouched.
    for track in draft["tracks"]:
        for segment in track["segments"]:
            timerange = segment["target_timerange"]
            old_start = timerange["start"]
            old_end = old_start + timerange["duration"]
            new_start, new_end = transform(old_start), transform(old_end)
            if new_end <= new_start:
                raise ValueError(f"Non-monotonic segment: {segment['id']}")
            timerange["start"] = new_start
            timerange["duration"] = new_end - new_start
    # Audio source ranges must be long enough for the clip CapCut plays.
    for _, _, segment, material, _ in speech:
        segment["source_timerange"] = {"start": 0, "duration": material["duration"]}
        segment["target_timerange"]["duration"] = material["duration"]
    draft["duration"] = transform(before["duration"])
    assert_structure(before, draft)
    return {
        "tracks_preserved": len(draft["tracks"]),
        "segments_preserved": sum(len(track["segments"]) for track in draft["tracks"]),
        "existing_speech_slots_retimed": len(speech),
        "template_sound_design_segments_untouched": untouched_audio,
        "new_segments_created": 0,
        "new_duration_us": draft["duration"],
        "unsupported_extra_narration_slots": [1, 2, 3, 4, 5, 6, 9],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--destination", required=True, type=Path)
    parser.add_argument("--de-root", required=True, type=Path)
    args = parser.parse_args()
    if args.destination.exists():
        raise SystemExit(f"Refusing to overwrite: {args.destination}")
    source = args.source.resolve()
    draft = read(source / "draft_content.json")
    result = process(draft, args.de_root.resolve())
    shutil.copytree(source, args.destination)
    for relative in (Path("draft_content.json"), Path("Timelines") / draft["id"] / "draft_content.json", Path("Timelines") / draft["id"] / "draft_content.json.bak", Path("Timelines") / draft["id"] / "template-2.tmp"):
        write(args.destination / relative, draft)
    (args.destination / "ELASTIC_RETIME_REPORT.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=True))


if __name__ == "__main__":
    main()
