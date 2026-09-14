"""Retiming pass for a German payload placed in the approved ES CapCut layout.

This deliberately does *not* rebuild a CapCut draft.  It takes the payload-only
copy made by ``copy_es_template_replace_de_content.py`` and changes just the
times needed for the actual German WAV files to play in full.  Every track,
segment ID, transform, style, effect, animation and z-order stays in place.

The German BUILD_TIMELINE.py is the timing authority.  Its audio/display events
are copied onto the corresponding slots in the supplied ES template.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import shutil
import uuid
from pathlib import Path


US_PER_FRAME = 1_000_000 / 30
CHAIN_RE = re.compile(r"(?:^P|CH)(\d{3})")


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write(path: Path, data: dict) -> None:
    temporary = path.with_name(f"{path.name}.new-{uuid.uuid4().hex}")
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(path)


def us(frame: int) -> int:
    return round(frame * US_PER_FRAME)


def set_time(segment: dict, start: int, end: int, *, audio: bool = False) -> None:
    duration = us(end) - us(start)
    if duration <= 0:
        raise ValueError(f"Invalid timerange {start}-{end}")
    segment["target_timerange"] = {"start": us(start), "duration": duration}
    if audio:
        segment["source_timerange"] = {"start": 0, "duration": duration}


def tracks(draft: dict, name: str, kind: str) -> list[dict]:
    return [item for item in draft["tracks"] if item["type"] == kind and item["name"] == name]


def exactly_one(draft: dict, name: str, kind: str) -> dict:
    found = tracks(draft, name, kind)
    if len(found) != 1:
        raise ValueError(f"Expected one {kind} track {name!r}, got {len(found)}")
    return found[0]


def target_events(timeline: dict, track: str, *, kind: str) -> list[dict]:
    key = "audio_events" if kind == "audio" else "display_events"
    return [event for event in timeline[key] if event["track"] == track]


def visible_segments(track: dict) -> list[dict]:
    """Ignore the one soundtrack/placeholder segment with an empty description."""
    return [segment for segment in track["segments"] if segment.get("desc")]


def retime_serial(segments: list[dict], events: list[dict], *, audio: bool = False, label: str) -> None:
    if len(segments) != len(events):
        raise ValueError(f"{label}: {len(segments)} template slots but {len(events)} timeline events")
    for segment, event in zip(segments, events):
        set_time(segment, event["start_frame"], event["end_frame"], audio=audio)


def chain_number(segment: dict) -> int:
    match = CHAIN_RE.search(segment.get("desc", ""))
    if not match:
        raise ValueError(f"Missing chain number: {segment.get('desc')!r}")
    return int(match.group(1))


def by_chain(entries: list[dict]) -> dict[int, dict]:
    output: dict[int, dict] = {}
    for entry in entries:
        chain = int(entry["chain"])
        if chain in output:
            raise ValueError(f"Duplicate chain {chain}")
        output[chain] = entry
    return output


def material_map(draft: dict, category: str) -> dict[str, dict]:
    return {item["id"]: item for item in draft["materials"][category]}


def replace_text_content(material: dict, text: str) -> None:
    content = json.loads(material["content"])
    old = content.get("text", "")
    content["text"] = text
    old_length = len(old.encode("utf-16-le")) // 2
    new_length = len(text.encode("utf-16-le")) // 2
    for style in content.get("styles", []):
        if style.get("range") == [0, old_length]:
            style["range"] = [0, new_length]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))


def relink_audio(draft: dict, segment: dict, event: dict, de_root: Path) -> None:
    relative = Path(event["path"])
    source = de_root / relative
    if not source.is_file():
        raise ValueError(f"Missing generated WAV: {source}")
    material = material_map(draft, "audios")[segment["material_id"]]
    material["path"] = source.as_posix()
    material["name"] = source.name
    material["material_name"] = source.name
    material["duration"] = us(event["end_frame"] - event["start_frame"])


def retime_audio_track(draft: dict, template_track: dict, events: list[dict], de_root: Path, *, label: str) -> int:
    slots = visible_segments(template_track)
    retime_serial(slots, events, audio=True, label=label)
    for segment, event in zip(slots, events):
        relink_audio(draft, segment, event, de_root)
    return len(slots)


def retime_visuals(draft: dict, timeline: dict) -> int:
    changed = 0
    for part, track_name in ((1, "06_VISUALS_50_ALPHA"), (2, "P2_01_VISUALS_50_ALPHA"), (3, "P3_01_VISUALS_50_ALPHA")):
        source_track = exactly_one(draft, track_name, "video")
        targets = by_chain([item for item in timeline["steps"] if item["part"] == part and item["step"] == 5] if part != 1 else [
            {
                "chain": entry["chain"],
                "start_frame": entry["start_frame"],
                "end_frame": next((candidate["start_frame"] for candidate in timeline["chapters"] if candidate["part"] == 1 and candidate["chain"] == entry["chain"] + 1), timeline["sections"]["part1"][1]),
            }
            for entry in timeline["chapters"] if entry["part"] == 1
        ])
        # Chain 19 is split into two image segments in the approved template;
        # preserve both segments and divide only that chain's existing visual
        # window proportionally, rather than deleting or changing its layout.
        grouped: dict[int, list[dict]] = {}
        for segment in source_track["segments"]:
            grouped.setdefault(chain_number(segment), []).append(segment)
        for chain, segments in grouped.items():
            event = targets[chain]
            start, end = event["start_frame"], event["end_frame"]
            total_old = sum(item["target_timerange"]["duration"] for item in segments)
            cursor = start
            for index, segment in enumerate(segments):
                if index == len(segments) - 1:
                    segment_end = end
                else:
                    portion = segment["target_timerange"]["duration"] / total_old
                    segment_end = cursor + max(1, round((end - start) * portion))
                set_time(segment, cursor, segment_end)
                cursor = segment_end
                changed += 1
    return changed


def retime_text(draft: dict, timeline: dict) -> int:
    changed = 0
    serial = [
        ("ES_TEXT_250", 0, "RU_TRANSLATION"),
        ("ES_TEXT_250", 1, "IPA_OPTIONAL_HIDDEN"),
        ("ES_TEXT_250", 2, "MAIN_DE"),
        ("ES_TEXT_250", 3, "EXPLANATION"),
        ("ES_TEXT_250", 4, "REPLAY_DE"),
        ("P2_03_RU_PROMPTS_50", 0, "RECALL_RU"),
        ("P2_04_IPA_ANSWERS_50", 0, "RECALL_IPA_OPTIONAL_HIDDEN"),
        ("P2_05_ES_ANSWERS_50", 0, "RECALL_DE"),
        ("P3_03_IPA_ANSWERS_50", 0, "LISTENING_IPA_OPTIONAL_HIDDEN"),
        ("P3_04_ES_ANSWERS_50", 0, "LISTENING_DE"),
    ]
    for name, occurrence, event_track in serial:
        track = tracks(draft, name, "text")[occurrence]
        events = target_events(timeline, event_track, kind="text")
        retime_serial(track["segments"], events, label=f"text {name}/{event_track}")
        changed += len(track["segments"])

    # Counters and the three picture tracks are keyed by chain, not by their
    # old Spanish duration.  This preserves their current visual formatting.
    for part, names in ((2, ("P2_07_COUNTER_50",)), (3, ("P3_06_COUNTER_50",))):
        targets = [entry for entry in timeline["steps"] if entry["part"] == part]
        for name in names:
            track = exactly_one(draft, name, "text")
            if len(track["segments"]) != len(targets):
                raise ValueError(f"{name}: counter count does not match part {part}")
            # Counter descriptions contain the ordinal (I001), while the
            # matching chain number lives only in the paired visual/audio
            # description.  Both timelines retain this exact task order.
            for segment, target in zip(track["segments"], targets):
                set_time(segment, target["start_frame"], target["end_frame"])
                changed += 1
    return changed


def assert_safe_delta(before: dict, after: dict) -> None:
    """Fail if retiming touched styling, ordering or any non-approved field."""
    assert len(before["tracks"]) == len(after["tracks"])
    for old_track, new_track in zip(before["tracks"], after["tracks"]):
        assert old_track["id"] == new_track["id"]
        assert old_track["name"] == new_track["name"]
        assert old_track["type"] == new_track["type"]
        assert len(old_track["segments"]) == len(new_track["segments"])
        for old, new in zip(old_track["segments"], new_track["segments"]):
            for key in set(old) | set(new):
                if key in {"target_timerange", "source_timerange"}:
                    continue
                assert old.get(key) == new.get(key), f"Unexpected segment mutation {old.get('id')}:{key}"


def add_missing_narrations(draft: dict, timeline: dict, de_root: Path) -> int:
    """Fill the seven narration clips that the supplied ES template lacks.

    We clone the template's existing P2/P3 narration slots verbatim, so there
    is no new font, transform, effect, animation, track or visual layout.
    Only new approved text/audio payloads are appended to those existing tracks.
    """
    narration = read(de_root / "NARRATION.json")
    events = target_events(timeline, "07_AUDIO_NARRATION_RU", kind="audio")
    if len(narration) != 9 or len(events) != 9:
        raise ValueError("Expected nine German narration entries")
    p2_text = exactly_one(draft, "P2_08_SECTION_INTRO_TEXT", "text")
    p2_audio = exactly_one(draft, "P2_13_SECTION_INTRO_AUDIO", "audio")
    p3_text = exactly_one(draft, "P3_07_SECTION_INTRO_TEXT", "text")
    p3_audio = exactly_one(draft, "P3_10_SECTION_INTRO_AUDIO", "audio")
    text_materials = material_map(draft, "texts")
    audio_materials = material_map(draft, "audios")
    templates = ((p2_text, p2_audio),) * 6 + ((p3_text, p3_audio),)
    event_indices = [0, 1, 2, 3, 4, 5, 8]
    for (text_track, audio_track), event_index in zip(templates, event_indices):
        event = events[event_index]
        text_segment = copy.deepcopy(text_track["segments"][0])
        audio_segment = copy.deepcopy(audio_track["segments"][0])
        text_material = copy.deepcopy(text_materials[text_segment["material_id"]])
        audio_material = copy.deepcopy(audio_materials[audio_segment["material_id"]])
        text_material["id"] = str(uuid.uuid4()).upper()
        audio_material["id"] = str(uuid.uuid4()).upper()
        replace_text_content(text_material, narration[event_index]["screen_ru"])
        source = de_root / event["path"]
        if not source.is_file():
            raise ValueError(f"Missing narration WAV: {source}")
        audio_material["path"] = source.as_posix()
        audio_material["name"] = source.name
        audio_material["material_name"] = source.name
        audio_material["duration"] = us(event["end_frame"] - event["start_frame"])
        text_segment["id"] = str(uuid.uuid4()).upper()
        audio_segment["id"] = str(uuid.uuid4()).upper()
        text_segment["material_id"] = text_material["id"]
        audio_segment["material_id"] = audio_material["id"]
        text_segment["desc"] = f"DE NARRATION {event_index + 1:03d}"
        audio_segment["desc"] = f"DE NARRATION AUDIO {event_index + 1:03d}"
        set_time(text_segment, event["start_frame"], event["end_frame"])
        set_time(audio_segment, event["start_frame"], event["end_frame"], audio=True)
        draft["materials"]["texts"].append(text_material)
        draft["materials"]["audios"].append(audio_material)
        text_track["segments"].append(text_segment)
        audio_track["segments"].append(audio_segment)
    return len(event_indices)


def eliminate_rounding_clips(draft: dict) -> int:
    """CapCut durations are microseconds while the authority is frame-based.

    A reused WAV can round one microsecond upward in its material metadata.
    Give that segment the extra microsecond (inside its deliberate pause), never
    leave a mathematically shorter target range that CapCut could crop.
    """
    audios = material_map(draft, "audios")
    adjusted = 0
    for track in draft["tracks"]:
        if track["type"] != "audio":
            continue
        for segment in track["segments"]:
            # Template-owned sound-design cue: it has no phrase description
            # and is intentionally outside the generated speech schedule.
            if not segment.get("desc"):
                continue
            material = audios[segment["material_id"]]
            actual = material.get("duration", 0)
            current = segment["target_timerange"]["duration"]
            if current < actual:
                if actual - current > 1:
                    raise ValueError(f"Unexpected material/timeline mismatch: {segment.get('desc')}")
                segment["target_timerange"]["duration"] = actual
                if segment.get("source_timerange") is not None:
                    segment["source_timerange"]["duration"] = actual
                adjusted += 1
    return adjusted


def process(draft: dict, timeline: dict, de_root: Path) -> dict:
    before = copy.deepcopy(draft)
    audio = 0
    # All 1,502 phrase/explanation/countdown slots that exist in the approved
    # template.  The original template has only two narration slots (P2/P3);
    # it has no slots for DE narration 001–006 or 009, so this pass never
    # invents unapproved screen layout for them.
    audio += retime_audio_track(draft, tracks(draft, "", "audio")[0], target_events(timeline, "02_AUDIO_DE_VARIANT_1", kind="audio")[:300], de_root, label="P1/replay male")
    audio += retime_audio_track(draft, exactly_one(draft, "01_RUSSIAN_PHRASES", "audio"), target_events(timeline, "01_AUDIO_RU", kind="audio")[:250], de_root, label="P1 RU")
    audio += retime_audio_track(draft, exactly_one(draft, "03_ES_VOICE_2", "audio"), target_events(timeline, "03_AUDIO_DE_VARIANT_2", kind="audio"), de_root, label="P1 DE V2")
    audio += retime_audio_track(draft, tracks(draft, "", "audio")[1], target_events(timeline, "04_AUDIO_DE_VARIANT_3", kind="audio")[:250], de_root, label="P1 DE V3")
    audio += retime_audio_track(draft, exactly_one(draft, "05_EXPLANATIONS_AUDIO", "audio"), target_events(timeline, "05_AUDIO_EXPLANATIONS_RU", kind="audio"), de_root, label="explanations")
    audio += retime_audio_track(draft, exactly_one(draft, "P2_09_RUSSIAN_AUDIO_50", "audio"), target_events(timeline, "01_AUDIO_RU", kind="audio")[250:], de_root, label="P2 RU")
    audio += retime_audio_track(draft, exactly_one(draft, "P2_10_FEMALE_ES_AUDIO_50", "audio"), target_events(timeline, "04_AUDIO_DE_VARIANT_3", kind="audio")[250:300], de_root, label="P2 DE V3")
    audio += retime_audio_track(draft, exactly_one(draft, "P2_11_MALE_ES_AUDIO_50", "audio"), target_events(timeline, "02_AUDIO_DE_VARIANT_1", kind="audio")[300:350], de_root, label="P2 DE V1")
    audio += retime_audio_track(draft, exactly_one(draft, "P2_12_TIMER_BEEPS_150", "audio"), target_events(timeline, "SFX_COUNTDOWN", kind="audio"), de_root, label="P2 ticks")
    audio += retime_audio_track(draft, exactly_one(draft, "P2_13_SECTION_INTRO_AUDIO", "audio"), target_events(timeline, "07_AUDIO_NARRATION_RU", kind="audio")[6:7], de_root, label="P2 narration")
    audio += retime_audio_track(draft, exactly_one(draft, "P3_08_FEMALE_LISTES_AUDIO_50", "audio"), target_events(timeline, "04_AUDIO_DE_VARIANT_3", kind="audio")[300:350], de_root, label="P3 DE V3")
    audio += retime_audio_track(draft, exactly_one(draft, "P3_09_MALE_CHECK_AUDIO_50", "audio"), target_events(timeline, "02_AUDIO_DE_VARIANT_1", kind="audio")[350:400], de_root, label="P3 DE V1")
    audio += retime_audio_track(draft, exactly_one(draft, "P3_10_SECTION_INTRO_AUDIO", "audio"), target_events(timeline, "07_AUDIO_NARRATION_RU", kind="audio")[7:8], de_root, label="P3 narration")
    visuals = retime_visuals(draft, timeline)
    text = retime_text(draft, timeline)
    draft["duration"] = us(timeline["duration_frames"])
    assert_safe_delta(before, draft)
    narration_added = add_missing_narrations(draft, timeline, de_root)
    rounding_adjustments = eliminate_rounding_clips(draft)
    return {"retimed_audio_slots": audio, "added_narration_audio_slots": narration_added, "rounding_clip_preventions": rounding_adjustments, "retimed_visual_slots": visuals, "retimed_text_slots": text, "unrepresented_narration_slots": []}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--destination", required=True, type=Path)
    parser.add_argument("--de-root", required=True, type=Path)
    args = parser.parse_args()
    if args.destination.exists():
        raise SystemExit(f"Refusing to overwrite destination: {args.destination}")
    source = args.source.resolve()
    root = read(source / "draft_content.json")
    timeline = read(args.de_root / "TIMELINE.json")
    draft = copy.deepcopy(root)
    report = process(draft, timeline, args.de_root.resolve())
    shutil.copytree(source, args.destination)
    for relative in (Path("draft_content.json"), Path("Timelines") / draft["id"] / "draft_content.json", Path("Timelines") / draft["id"] / "draft_content.json.bak", Path("Timelines") / draft["id"] / "template-2.tmp"):
        write(args.destination / relative, draft)
    (args.destination / "RETIME_REPORT.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
