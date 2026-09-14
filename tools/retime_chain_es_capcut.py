#!/usr/bin/env python3
"""Relink and retime the 38-track CapCut draft to the new V3 WAV files."""

from __future__ import annotations

import bisect
import copy
import json
import re
import shutil
import wave
from datetime import datetime
from pathlib import Path


PACKAGE = Path(r"C:\Users\badlo\OneDrive\Документы\проекты\CHAIN_ES_50_ACTIVE_LISTENING_A1_FULL_PACK")
DRAFT = PACKAGE / "draft_content.json"
FPS = 30
FRAME = 1_000_000 / FPS


def frame_floor(value: int) -> int:
    return max(round(FRAME), int(value // FRAME) * round(FRAME))


def wav_duration_us(path: Path) -> int:
    with wave.open(str(path), "rb") as handle:
        return int(round(handle.getnframes() * 1_000_000 / handle.getframerate()))


def media_for(desc: str) -> tuple[Path, int] | None:
    match = re.search(r"FILE_(\d{3})", desc)
    if not match or "TIMER_" in desc:
        return None
    number = int(match.group(1))
    if "SECTION_INTRO_AUDIO" in desc:
        return PACKAGE / "7" / f"{number:03d}.wav", 7
    if "EXPLANATION_AUDIO" in desc:
        return PACKAGE / "5" / f"{number:03d}.wav", 5
    if " RU " in f" {desc} ":
        return PACKAGE / "1" / f"{number:03d}.wav", 1
    if "EN_VOICE_3" in desc:
        return PACKAGE / "4" / f"{number:03d}.wav", 4
    if "EN_VOICE_2" in desc:
        return PACKAGE / "3" / f"{number:03d}.wav", 3
    if "EN_VOICE_1" in desc or "FINAL_AUDIO_ONLY_REPLAY" in desc:
        return PACKAGE / "2" / f"{number:03d}.wav", 2
    return None


def update_text_material(material: dict, text: str) -> None:
    try:
        content = json.loads(material.get("content") or "{}")
    except json.JSONDecodeError:
        return
    content["text"] = text
    byte_end = len(text.encode("utf-16-le"))
    for style in content.get("styles") or []:
        if isinstance(style.get("range"), list) and len(style["range"]) == 2:
            style["range"] = [0, byte_end]
    material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))


def main() -> int:
    if not DRAFT.exists():
        raise RuntimeError("draft_content.json is missing")
    backup = DRAFT.with_name(f"draft_content.before_v3_retime_{datetime.now():%Y%m%d_%H%M%S}.json")
    shutil.copy2(DRAFT, backup)
    data = json.loads(DRAFT.read_text(encoding="utf-8"))
    video = json.loads((PACKAGE / "VIDEO_DATA.json").read_text(encoding="utf-8"))
    chains = {int(chain["chain"]): chain for chain in video["chains"]}
    materials = {
        item["id"]: item
        for values in data.get("materials", {}).values()
        if isinstance(values, list)
        for item in values
        if isinstance(item, dict) and item.get("id")
    }

    primary = []
    audio_lookup = {}
    for track in data["tracks"]:
        if track.get("type") != "audio":
            continue
        for segment in track.get("segments") or []:
            desc = str(segment.get("desc") or "")
            media = media_for(desc)
            if media is None:
                continue
            path, _folder = media
            if not path.exists():
                raise RuntimeError(f"Missing generated audio: {path}")
            old = copy.deepcopy(segment["target_timerange"])
            duration = frame_floor(wav_duration_us(path))
            primary.append((int(old["start"]), int(old["duration"]), duration, segment, path))
    primary.sort(key=lambda item: item[0])
    for left, right in zip(primary, primary[1:]):
        if left[0] + left[1] > right[0]:
            raise RuntimeError(f"Primary audio overlaps before retime: {left[3].get('desc')} / {right[3].get('desc')}")

    events = []
    previous_old_end = None
    previous_new_end = None
    for old_start, old_duration, new_duration, segment, path in primary:
        if previous_old_end is None:
            new_start = old_start
        else:
            gap = old_start - previous_old_end
            new_start = previous_new_end + gap
        events.append((old_start, old_start + old_duration, new_start, new_start + new_duration))
        audio_lookup[id(segment)] = (new_start, new_duration, path)
        previous_old_end = old_start + old_duration
        previous_new_end = new_start + new_duration

    old_starts = [item[0] for item in events]

    def warp(moment: int) -> int:
        index = bisect.bisect_right(old_starts, moment) - 1
        if index < 0:
            return moment
        old_start, old_end, new_start, new_end = events[index]
        if moment < old_end and old_end > old_start:
            ratio = (moment - old_start) / (old_end - old_start)
            return int(round(new_start + ratio * (new_end - new_start)))
        return moment + (new_end - old_end)

    for track_index, track in enumerate(data["tracks"]):
        for segment in track.get("segments") or []:
            old_range = segment.get("target_timerange") or {}
            old_start = int(old_range.get("start", 0))
            old_end = old_start + int(old_range.get("duration", 0))
            if id(segment) in audio_lookup:
                new_start, new_duration, path = audio_lookup[id(segment)]
                segment["target_timerange"] = {"start": new_start, "duration": new_duration}
                segment["source_timerange"] = {"start": 0, "duration": new_duration}
                material = materials[segment["material_id"]]
                material["path"] = str(path)
                material["name"] = path.name
                material["duration"] = wav_duration_us(path)
            else:
                new_start, new_end = warp(old_start), warp(old_end)
                segment["target_timerange"] = {"start": new_start, "duration": max(round(FRAME), new_end - new_start)}
            segment["track_render_index"] = track_index

            desc = str(segment.get("desc") or "")
            material = materials.get(segment.get("material_id"))
            if not material or track.get("type") != "text":
                continue
            step_match = re.search(r"P(\d{3}) S(\d{2}) (RU_TEXT|EN_IPA|EN_TEXT)$", desc)
            if step_match:
                chain_no, step_no, kind = int(step_match.group(1)), int(step_match.group(2)), step_match.group(3)
                step = chains[chain_no]["steps"][step_no - 1]
                text = {"RU_TEXT": step["russian"], "EN_IPA": step["ipa"], "EN_TEXT": step["spanish"]}[kind]
                update_text_material(material, text)
            exp_match = re.search(r"P(\d{3}) EXPLANATION_FULL_SCREEN", desc)
            if exp_match:
                update_text_material(material, chains[int(exp_match.group(1))]["explanation_ru"])
            active_match = re.search(r"P[23] I\d{3} CH(\d{3}) (RU_PROMPT|IPA_ANSWER|EN_ANSWER)", desc)
            if active_match:
                chain_no, kind = int(active_match.group(1)), active_match.group(2)
                step = chains[chain_no]["steps"][-1]
                text = {"RU_PROMPT": step["russian"], "IPA_ANSWER": step["ipa"], "EN_ANSWER": step["spanish"]}[kind]
                update_text_material(material, text)

    # Relink every package-local visual and audio path away from the obsolete Desktop copy.
    for material in materials.values():
        path_text = str(material.get("path") or "")
        match = re.search(r"CHAIN_ES_50_ACTIVE_LISTENING_A1_FULL_PACK[\\/](.+)$", path_text, flags=re.I)
        if match:
            candidate = PACKAGE / Path(match.group(1).replace("\\", "/"))
            if candidate.exists():
                material["path"] = str(candidate)

    maximum = max(
        int(segment["target_timerange"]["start"]) + int(segment["target_timerange"]["duration"])
        for track in data["tracks"]
        for segment in track.get("segments") or []
    )
    data["duration"] = maximum
    temp = DRAFT.with_suffix(".json.tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temp.replace(DRAFT)
    print(f"TIMELINE_READY tracks={len(data['tracks'])} primary_audio={len(primary)} duration_us={maximum} backup={backup.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
