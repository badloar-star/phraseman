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
