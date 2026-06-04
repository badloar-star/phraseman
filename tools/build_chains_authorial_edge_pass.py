#!/usr/bin/env python3
"""Build/apply the Chains authorial explanation pass with one Edge TTS voice."""

from __future__ import annotations

import argparse
import asyncio
import copy
import hashlib
import json
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any

import edge_tts

from build_chains_authorial_explanation_pass import (
    ASSETS_DIR,
    CHAINS_PATH,
    CONTENT_PATH,
    DRAFT_DIR,
    DRAFT_NAME,
    LIVE_AUDIO_DIR,
    LIVE_TIMED_PATH,
    META_PATH,
    RESOURCE_AUDIO_DIR,
    RESOURCE_BG_DIR,
    SCREEN_BG_PATH,
    STAGED_TIMED_PATH,
    TMP_PATH,
    US,
    authorial_voiceover,
    backup_project,
    capcut_is_open,
    current_slots,
    ffprobe_duration,
    fit_mp3_to_slot,
    font_size,
    generate_screensaver,
    material_by_id,
    read_json,
    validate_voiceovers,
    write_compact_json,
    write_json,
)


EDGE_DIR = ASSETS_DIR / "audio_authorial_edge_one_voice"
EDGE_META_DIR = ASSETS_DIR / "alignments_authorial_edge_one_voice"
EDGE_VOICE = "ru-RU-DmitryNeural"
EDGE_RATE = "-6%"


def gid() -> str:
    return str(uuid.uuid4()).upper()


async def edge_tts_with_boundaries(text: str, audio_path: Path, meta_path: Path) -> dict[str, Any]:
    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    if audio_path.exists() and audio_path.stat().st_size > 4096 and meta_path.exists():
        meta = read_json(meta_path)
        if meta.get("text_hash") == text_hash:
            return meta
    audio_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(text, EDGE_VOICE, rate=EDGE_RATE)
    boundaries: list[dict[str, Any]] = []
    audio = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            boundaries.append(
                {
                    "offset": int(chunk.get("offset", 0)),
                    "duration": int(chunk.get("duration", 0)),
                    "text": str(chunk.get("text", "")),
                }
            )
    audio_path.write_bytes(bytes(audio))
    meta = {"voice": EDGE_VOICE, "rate": EDGE_RATE, "text_hash": text_hash, "words": boundaries}
    write_json(meta_path, meta)
    return meta


def build_texts() -> list[dict[str, Any]]:
    chains = read_json(CHAINS_PATH)
    drafts = [
        {
            "chain_index": chain["index"],
            "half": chain["half"],
            "voiceover": authorial_voiceover(chain),
            "foreign_final": chain["foreign_steps"][-1],
            "russian_final": chain["russian_steps"][-1],
            "tts_provider": "edge_authorial_one_voice",
        }
        for chain in chains
    ]
    errors = validate_voiceovers(drafts)
    write_json(ASSETS_DIR / "authorial_explanation_texts.json", drafts)
    write_json(ASSETS_DIR / "authorial_explanation_validation.json", {"errors": errors, "count": len(drafts)})
    if errors:
        raise RuntimeError("authorial validation failed: " + "; ".join(errors[:20]))
    return drafts


def is_orphan_token(word: str) -> bool:
    cleaned = word.strip(".,!?;:«»()[]{}—-–")
    return len(cleaned) <= 1


def wrap_two_lines(words: list[str], max_words_per_line: int = 9) -> str:
    if len(words) <= max_words_per_line:
        return " ".join(words)
    min_line_words = 3 if len(words) >= 6 else 2
    best_split = None
    for split in range(min(max_words_per_line, len(words) - min_line_words), min_line_words - 1, -1):
        left = words[:split]
        right = words[split:]
        if len(left) > max_words_per_line or len(right) > max_words_per_line:
            continue
        if len(right) == 1 or is_orphan_token(right[0]):
            continue
        best_split = split
        break
    if best_split is None:
        for split in range(min_line_words, len(words) - min_line_words + 1):
            left = words[:split]
            right = words[split:]
            if len(left) <= max_words_per_line and len(right) <= max_words_per_line and len(right) > 1 and not is_orphan_token(right[0]):
                best_split = split
                break
    if best_split is None:
        best_split = min(max_words_per_line, len(words) - 1)
    return " ".join(words[:best_split]) + "\n" + " ".join(words[best_split:])


def word_blocks_from_text(
    text: str,
    target_sec: float,
    raw_sec: float,
    meta: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    # Strict word-reveal captions: every new on-screen state starts exactly at
    # the spoken word boundary. Previous words in the current page remain on
    # screen; the text grows left-to-right/top-to-bottom instead of climbing
    # from separate lower tracks.
    import re

    matches = list(re.finditer(r"\S+", text))
    source_words = [match.group(0) for match in matches]
    if not source_words:
        return []

    raw_boundaries = list((meta or {}).get("words") or [])
    scale = target_sec / raw_sec if raw_sec > 0 else 1.0
    timed_words: list[dict[str, Any]] = []
    if len(raw_boundaries) >= len(source_words):
        for index, word in enumerate(source_words):
            boundary = raw_boundaries[index]
            start = max(0.0, float(boundary.get("offset", 0)) / 10_000_000.0 * scale)
            duration = max(0.08, float(boundary.get("duration", 0)) / 10_000_000.0 * scale)
            timed_words.append({"word": word, "start_sec": start, "end_sec": min(target_sec, start + duration)})
    else:
        for index, word in enumerate(source_words):
            start = target_sec * index / max(1, len(source_words))
            end = target_sec * (index + 1) / max(1, len(source_words))
            timed_words.append({"word": word, "start_sec": start, "end_sec": end})

    blocks: list[dict[str, Any]] = []
    page_size = 14
    for index, timed_word in enumerate(timed_words):
        page_start = (index // page_size) * page_size
        if page_start > 0 and is_orphan_token(timed_words[page_start]["word"]):
            page_start -= 1
        page_words = [item["word"] for item in timed_words[page_start : index + 1]]
        start = float(timed_word["start_sec"])
        if index + 1 < len(timed_words):
            end = float(timed_words[index + 1]["start_sec"])
        else:
            end = target_sec
        if end <= start:
            end = min(target_sec, start + 0.12)
        display_text = wrap_two_lines(page_words)
        blocks.append(
            {
                "text": display_text,
                "anchor_words": timed_word["word"],
                "start_sec": round(max(0.0, start), 3),
                "end_sec": round(min(target_sec, end), 3),
                "alignment_source": "authorial_transcript_edge_word_exact_reveal",
            }
        )
    return blocks


async def build_assets() -> dict[str, Any]:
    texts = build_texts()
    slots = current_slots()
    staged: list[dict[str, Any]] = []
    for index, item in enumerate(texts, start=1):
        raw_audio = EDGE_DIR / f"{index:02d}_authorial_raw.mp3"
        meta_path = EDGE_META_DIR / f"{index:02d}_edge_words.json"
        meta = await edge_tts_with_boundaries(item["voiceover"], raw_audio, meta_path)
        raw_sec = ffprobe_duration(raw_audio)
        target_sec = slots[index - 1]
        fitted_audio = EDGE_DIR / f"{index:02d}_explanation.mp3"
        fit = fit_mp3_to_slot(raw_audio, fitted_audio, target_sec)
        blocks = word_blocks_from_text(item["voiceover"], target_sec, raw_sec, meta)
        staged.append(
            {
                **item,
                "audio_path": str(fitted_audio),
                "raw_audio_path": str(raw_audio),
                "alignment_path": str(meta_path),
                "duration_sec": round(target_sec, 3),
                "raw_duration_sec": round(raw_sec, 3),
                "fit": fit,
                "timed_blocks": blocks,
                "screen_blocks": [{"text": block["text"], "anchor_words": block["anchor_words"]} for block in blocks],
            }
        )
        print(f"[authorial-edge] {index:02d}/50 raw={raw_sec:.2f}s target={target_sec:.2f}s blocks={len(blocks)}", flush=True)
        write_json(STAGED_TIMED_PATH, staged)
    bg = generate_screensaver()
    report = {
        "items": len(staged),
        "voice": EDGE_VOICE,
        "rate": EDGE_RATE,
        "timed_path": str(STAGED_TIMED_PATH),
        "screensaver": str(bg),
        "validation": "passed",
    }
    write_json(ASSETS_DIR / "authorial_explanation_assets_report.json", report)
    return report


def make_text_material(template: dict[str, Any], text: str, size: float) -> dict[str, Any]:
    mat = copy.deepcopy(template)
    mat["id"] = gid()
    mat["base_content"] = text
    mat["font_size"] = size
    mat["text_size"] = max(18, int(size * 4.2))
    mat["line_spacing"] = 0.02
    mat["background_alpha"] = 0.0
    content = json.loads(mat["content"])
    content["text"] = text
    for style in content.get("styles", []):
        style["range"] = [0, len(text)]
        style["size"] = size
        fill = style.setdefault("fill", {}).setdefault("content", {}).setdefault("solid", {})
        fill["color"] = [1, 1, 1]
    mat["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    return mat


def clone_track(template: dict[str, Any], name: str, segments: list[dict[str, Any]]) -> dict[str, Any]:
    track = copy.deepcopy(template)
    track["id"] = gid()
    track["name"] = name
    track["is_default_name"] = False
    track["segments"] = segments
    return track


def update_audio_and_bg_materials(draft: dict[str, Any], timed: list[dict[str, Any]]) -> None:
    audio_track = next(t for t in draft["tracks"] if t.get("name") == "CODEx construction explanation UNIQUE VO")
    bg_track = next(t for t in draft["tracks"] if t.get("name") == "CODEx construction explanation SCREENSAVER")
    audio_by_id = {m.get("id"): m for m in draft.get("materials", {}).get("audios", [])}
    video_by_id = {m.get("id"): m for m in draft.get("materials", {}).get("videos", [])}
    RESOURCE_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    RESOURCE_BG_DIR.mkdir(parents=True, exist_ok=True)
    resource_bg = RESOURCE_BG_DIR / SCREEN_BG_PATH.name
    shutil.copy2(SCREEN_BG_PATH, resource_bg)
    LIVE_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    for index, (audio_segment, bg_segment, item) in enumerate(zip(audio_track["segments"], bg_track["segments"], timed), start=1):
        live_audio = LIVE_AUDIO_DIR / f"{index:02d}_explanation.mp3"
        shutil.copy2(item["audio_path"], live_audio)
        shutil.copy2(live_audio, RESOURCE_AUDIO_DIR / live_audio.name)
        duration_us = int(audio_segment["target_timerange"]["duration"])
        audio_material = audio_by_id.get(audio_segment["material_id"])
        if audio_material:
            audio_material["duration"] = duration_us
            audio_material["name"] = live_audio.name
            audio_material["path"] = str(RESOURCE_AUDIO_DIR / live_audio.name)
            audio_material["wave_points"] = []
        video_material = video_by_id.get(bg_segment["material_id"])
        if video_material:
            video_material["path"] = str(resource_bg)
            video_material["name"] = SCREEN_BG_PATH.name
            video_material["duration"] = 60 * US
        bg_segment["is_loop"] = True
        if isinstance(bg_segment.get("source_timerange"), dict):
            bg_segment["source_timerange"]["start"] = 0
            bg_segment["source_timerange"]["duration"] = min(60 * US, int(bg_segment["target_timerange"]["duration"]))


def rebuild_transcript_tracks(draft: dict[str, Any], timed: list[dict[str, Any]]) -> int:
    tracks = draft["tracks"]
    bg_track = next(t for t in tracks if t.get("name") == "CODEx construction explanation SCREENSAVER")
    removed: list[dict[str, Any]] = []
    kept: list[dict[str, Any]] = []
    for track in tracks:
        name = str(track.get("name", ""))
        if name == "CODEx construction explanation TIMED TEXT" or name.startswith("CODEx construction explanation PERSISTENT TEXT LINE ") or name.startswith("CODEx construction explanation TRANSCRIPT LINE "):
            removed.append(track)
        else:
            kept.append(track)
    if not removed:
        raise RuntimeError("No previous explanation text track found to use as template.")
    draft["tracks"] = kept
    template_track = removed[0]
    template_segment = template_track["segments"][0]
    template_material = material_by_id(draft["materials"], template_segment["material_id"])
    if template_material is None:
        raise RuntimeError("Text template material not found.")
    reveal_segments: list[dict[str, Any]] = []
    for exp_index, item in enumerate(timed):
        bg_range = bg_track["segments"][exp_index]["target_timerange"]
        window_start = int(bg_range["start"])
        window_end = window_start + int(bg_range["duration"])
        blocks = item.get("timed_blocks", [])
        for block in blocks:
            start = window_start + int(round(float(block.get("start_sec", 0)) * US))
            end = min(window_end - 120_000, window_start + int(round(float(block.get("end_sec", 0)) * US)))
            if end <= start:
                end = min(window_end - 120_000, start + 120_000)
            text = str(block.get("text", "")).strip()
            material = make_text_material(template_material, text, font_size(text))
            draft["materials"].setdefault("texts", []).append(material)
            segment = copy.deepcopy(template_segment)
            segment["id"] = gid()
            segment["material_id"] = material["id"]
            segment["target_timerange"] = {"start": start, "duration": end - start}
            segment["source_timerange"] = None
            segment["visible"] = True
            segment["clip"]["transform"] = {"x": 0.0, "y": 0.0}
            segment["clip"]["scale"] = {"x": 1.0, "y": 1.0}
            reveal_segments.append(segment)
    reveal_segments.sort(key=lambda s: int(s["target_timerange"]["start"]))
    draft["tracks"].append(clone_track(template_track, "CODEx construction explanation TRANSCRIPT LINE 1 WORD REVEAL", reveal_segments))
    return len(reveal_segments)


def apply_to_draft() -> dict[str, Any]:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close CapCut before applying authorial edge explanations.")
    timed = read_json(STAGED_TIMED_PATH)
    backup = backup_project("backup-before-authorial-edge-explanations")
    draft = read_json(CONTENT_PATH)
    update_audio_and_bg_materials(draft, timed)
    transcript_segments = rebuild_transcript_tracks(draft, timed)
    write_compact_json(CONTENT_PATH, draft)
    if TMP_PATH.exists():
        write_compact_json(TMP_PATH, draft)
    meta = read_json(META_PATH)
    meta["tm_duration"] = draft["duration"]
    write_compact_json(META_PATH, meta)
    write_json(LIVE_TIMED_PATH, timed)
    report = {
        "backup": str(backup),
        "timed_explanations": len(timed),
        "transcript_segments": transcript_segments,
        "screensaver": str(SCREEN_BG_PATH),
    }
    write_json(ASSETS_DIR / "authorial_explanation_apply_report.json", report)
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    result = {"build": asyncio.run(build_assets())}
    if args.apply:
        result["apply"] = apply_to_draft()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
