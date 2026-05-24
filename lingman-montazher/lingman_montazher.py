#!/usr/bin/env python3
"""Director-style editing pipeline for Professor Lingman talking-head videos."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class DirectorPreset:
    name: str
    pause_cut_seconds: float
    intentional_pause_max_seconds: float
    min_take_words: int
    min_take_duration_seconds: float
    max_duplicate_gap_seconds: float
    filler_words: tuple[str, ...]
    reset_markers: tuple[str, ...]
    english_phrase_min_chars: int
    english_phrase_max_chars: int
    min_screen_text_duration: float
    max_screen_text_duration: float
    text_position: str
    text_style: str
    text_animation: str
    sfx_volume: float
    zoom_scale: float
    output_width: int
    output_height: int
    fps: int


@dataclass(frozen=True)
class TranscriptSegment:
    segment_id: str
    start: float
    end: float
    text: str
    speaker: str = "lingman"

    @property
    def duration(self) -> float:
        return self.end - self.start

    @property
    def word_count(self) -> int:
        return len(re.findall(r"[\w']+", self.text, flags=re.UNICODE))


def load_preset(path: Path) -> DirectorPreset:
    data = json.loads(path.read_text(encoding="utf-8"))
    return DirectorPreset(
        name=str(data["name"]),
        pause_cut_seconds=float(data["pause_cut_seconds"]),
        intentional_pause_max_seconds=float(data["intentional_pause_max_seconds"]),
        min_take_words=int(data["min_take_words"]),
        min_take_duration_seconds=float(data["min_take_duration_seconds"]),
        max_duplicate_gap_seconds=float(data["max_duplicate_gap_seconds"]),
        filler_words=tuple(str(item) for item in data["filler_words"]),
        reset_markers=tuple(str(item) for item in data["reset_markers"]),
        english_phrase_min_chars=int(data["english_phrase_min_chars"]),
        english_phrase_max_chars=int(data["english_phrase_max_chars"]),
        min_screen_text_duration=float(data["min_screen_text_duration"]),
        max_screen_text_duration=float(data["max_screen_text_duration"]),
        text_position=str(data["text_position"]),
        text_style=str(data["text_style"]),
        text_animation=str(data["text_animation"]),
        sfx_volume=float(data["sfx_volume"]),
        zoom_scale=float(data["zoom_scale"]),
        output_width=int(data["output_width"]),
        output_height=int(data["output_height"]),
        fps=int(data["fps"]),
    )


def load_transcript(path: Path) -> list[TranscriptSegment]:
    data = json.loads(path.read_text(encoding="utf-8"))
    segment_data = data.get("segments") if isinstance(data, dict) else None
    if not isinstance(segment_data, list):
        raise ValueError("segments must be a list")

    segments: list[TranscriptSegment] = []
    for index, item in enumerate(segment_data, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"segment {index} must be an object")

        missing_fields = [field for field in ("start", "end", "text") if field not in item]
        if missing_fields:
            fields = ", ".join(missing_fields)
            raise ValueError(f"segment {index} missing required field(s): {fields}")

        start = float(item["start"])
        end = float(item["end"])
        if end <= start:
            raise ValueError(f"segment {index} end must be greater than start")

        text = str(item["text"])
        if not text.strip():
            raise ValueError(f"segment {index} text must not be empty")

        speaker = str(item.get("speaker", "")).strip() or "lingman"
        segments.append(
            TranscriptSegment(
                segment_id=f"seg_{index:04d}",
                start=start,
                end=end,
                text=text,
                speaker=speaker,
            )
        )

    return segments
