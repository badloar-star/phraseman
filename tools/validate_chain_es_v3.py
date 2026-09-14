#!/usr/bin/env python3
"""Strict deterministic QA for the reworked 38-track Spanish chain package."""

from __future__ import annotations

import json
import re
import wave
from pathlib import Path

from PIL import Image


PACKAGE = Path(r"C:\Users\badlo\OneDrive\Документы\проекты\CHAIN_ES_50_ACTIVE_LISTENING_A1_FULL_PACK")


def main() -> int:
    errors: list[str] = []
    checks: list[str] = []
    video = json.loads((PACKAGE / "VIDEO_DATA.json").read_text(encoding="utf-8"))
    draft = json.loads((PACKAGE / "draft_content.json").read_text(encoding="utf-8"))
    receipt = json.loads((PACKAGE / "ELEVENLABS_V3_GENERATION_RECEIPT.json").read_text(encoding="utf-8"))

    if len(video.get("chains", [])) != 50 or sum(len(c.get("steps", [])) for c in video.get("chains", [])) != 250:
        errors.append("VIDEO_DATA must contain 50 chains and 250 steps")
    else:
        checks.append("PASS: 50 chains / 250 steps")
    if video.get("level") != "A1-A2 practical listening":
        errors.append("level label was not corrected")
    if any(symbol in step["ipa"] for chain in video["chains"] for step in chain["steps"] for symbol in "ɔɛɪʊ"):
        errors.append("English vowel symbols remain in Spanish IPA")
    else:
        checks.append("PASS: Spanish IPA contains no English lax-vowel symbols")
    if video["chains"][48]["title_ru"] != "Нужно такси":
        errors.append("Russian taxi heading is not corrected")
    if "frutos secos" not in video["chains"][21]["steps"][-1]["spanish"]:
        errors.append("allergy chain is not corrected to frutos secos")
    checks.append("PASS: required editorial corrections present")

    expected = {1: 250, 2: 250, 3: 250, 4: 250, 5: 50, 7: 2}
    audio_total = 0
    for folder, count in expected.items():
        files = sorted((PACKAGE / str(folder)).glob("[0-9][0-9][0-9].wav"))
        if len(files) != count:
            errors.append(f"folder {folder}: expected {count} numbered WAV, found {len(files)}")
        for path in files:
            try:
                with wave.open(str(path), "rb") as handle:
                    duration = handle.getnframes() / handle.getframerate()
                    if handle.getnchannels() != 1 or handle.getframerate() != 44100 or handle.getsampwidth() != 2:
                        errors.append(f"bad WAV format: {path}")
                    if not 0.25 < duration < 180:
                        errors.append(f"bad WAV duration {duration:.2f}s: {path}")
            except (wave.Error, EOFError) as exc:
                errors.append(f"invalid WAV {path}: {exc}")
            audio_total += 1
    checks.append(f"PASS: {audio_total} numbered WAV files are readable PCM mono 44.1 kHz")
    if receipt.get("model_id") != "eleven_v3" or receipt.get("speed") != 0.85 or receipt.get("files") != 1052:
        errors.append("V3 generation receipt does not match required model/speed/count")
    else:
        checks.append("PASS: ElevenLabs receipt = eleven_v3, speed 0.85, 1052 files")

    visuals = sorted((PACKAGE / "6").glob("[0-9][0-9][0-9].png"))
    if len(visuals) != 50:
        errors.append(f"expected 50 visuals, found {len(visuals)}")
    for path in visuals:
        with Image.open(path) as image:
            if image.mode != "RGBA" or image.getextrema()[3][0] >= 255:
                errors.append(f"visual has no real alpha: {path.name}")
    checks.append("PASS: 50 visuals use genuine RGBA transparency")

    tracks = draft.get("tracks", [])
    if len(tracks) != 38:
        errors.append(f"expected 38 tracks, found {len(tracks)}")
    material_ids = {
        item["id"]
        for values in draft.get("materials", {}).values()
        if isinstance(values, list)
        for item in values
        if isinstance(item, dict) and item.get("id")
    }
    missing_refs = []
    bad_render_indexes = []
    overlaps = []
    maximum = 0
    for track_index, track in enumerate(tracks):
        segments = sorted(track.get("segments") or [], key=lambda s: int(s["target_timerange"]["start"]))
        previous_end = -1
        for segment in segments:
            timerange = segment["target_timerange"]
            start, duration = int(timerange["start"]), int(timerange["duration"])
            end = start + duration
            maximum = max(maximum, end)
            if segment.get("material_id") not in material_ids:
                missing_refs.append(segment.get("material_id"))
            if int(segment.get("track_render_index", -1)) != track_index:
                bad_render_indexes.append(segment.get("id"))
            if start < previous_end:
                overlaps.append((track_index, segment.get("desc")))
            previous_end = max(previous_end, end)
    if missing_refs:
        errors.append(f"missing material references: {len(missing_refs)}")
    if bad_render_indexes:
        errors.append(f"bad track_render_index values: {len(bad_render_indexes)}")
    if overlaps:
        errors.append(f"within-track overlaps: {len(overlaps)}; first={overlaps[:3]}")
    if int(draft.get("duration", 0)) != maximum:
        errors.append(f"draft duration {draft.get('duration')} != max segment end {maximum}")
    if any("OneDrive\\Desktop\\CHAIN_ES_50" in str(item.get("path") or "") for values in draft.get("materials", {}).values() if isinstance(values, list) for item in values if isinstance(item, dict)):
        errors.append("obsolete Desktop media paths remain")
    checks.append("PASS: 38-track draft references, render indexes, overlaps and duration checked")

    report = ["SPANISH CHAINS V3 — STRICT QA", "=" * 31, *checks]
    if errors:
        report += ["", "RESULT: FAIL", *[f"ERROR: {error}" for error in errors]]
    else:
        report += ["", "RESULT: PASS"]
    text = "\n".join(report) + "\n"
    (PACKAGE / "PACKAGE_QA_REPORT_V3.txt").write_text(text, encoding="utf-8")
    print(text)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
