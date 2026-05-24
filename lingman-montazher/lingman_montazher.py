#!/usr/bin/env python3
"""Director-style editing pipeline for Professor Lingman talking-head videos."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
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


@dataclass(frozen=True)
class EditDecision:
    segment_id: str
    decision_type: str
    source_start: float
    source_end: float
    output_start: float | None
    output_end: float | None
    reason: str
    confidence: float
    text: str


_WORD_RE = re.compile(r"[^\W_]+", flags=re.UNICODE)
_CONTENT_STOP_WORDS = frozenset(
    {
        "a",
        "about",
        "am",
        "an",
        "and",
        "are",
        "as",
        "at",
        "be",
        "been",
        "being",
        "but",
        "by",
        "for",
        "from",
        "i",
        "in",
        "is",
        "it",
        "of",
        "on",
        "or",
        "that",
        "the",
        "this",
        "to",
        "was",
        "we",
        "were",
        "with",
        "you",
    }
)
_EXPLANATION_MARKERS = frozenset({"mean", "meaning", "means"})


def _text_from_segment(segment_or_text: TranscriptSegment | str) -> str:
    if isinstance(segment_or_text, TranscriptSegment):
        return segment_or_text.text
    return str(segment_or_text)


def _word_tokens(text: str) -> list[str]:
    return _WORD_RE.findall(text.casefold())


def normalize_text_key(text: str, preset: DirectorPreset) -> str:
    filler_tokens = {
        token
        for filler_word in preset.filler_words
        for token in _word_tokens(filler_word)
    }
    tokens = [
        token
        for token in _word_tokens(text)
        if token not in filler_tokens
    ]
    return " ".join(tokens)


def take_group_key(segment_or_text: TranscriptSegment | str, preset: DirectorPreset) -> str:
    tokens = normalize_text_key(_text_from_segment(segment_or_text), preset).split()
    content_words = [
        token
        for token in tokens
        if token not in _CONTENT_STOP_WORDS and len(token) > 1
    ]
    if content_words:
        for index, token in enumerate(content_words):
            if token in _EXPLANATION_MARKERS and index > 0:
                return " ".join(content_words[: index + 1])
        return " ".join(content_words[:3])
    return " ".join(tokens[:6])


def is_reset_segment(segment: TranscriptSegment, preset: DirectorPreset) -> bool:
    text = segment.text.casefold()
    return any(marker.casefold() in text for marker in preset.reset_markers)


def is_complete_take(segment: TranscriptSegment, preset: DirectorPreset) -> bool:
    return (
        segment.word_count >= preset.min_take_words
        and segment.duration >= preset.min_take_duration_seconds
        and not is_reset_segment(segment, preset)
    )


def group_duplicate_takes(
    segments: Iterable[TranscriptSegment], preset: DirectorPreset
) -> list[list[TranscriptSegment]]:
    candidates_by_key: dict[str, list[TranscriptSegment]] = {}
    for segment in sorted(segments, key=lambda item: (item.start, item.end, item.segment_id)):
        if not is_complete_take(segment, preset):
            continue

        key = take_group_key(segment, preset)
        if key:
            candidates_by_key.setdefault(key, []).append(segment)

    duplicate_groups: list[list[TranscriptSegment]] = []
    for candidates in candidates_by_key.values():
        current_group: list[TranscriptSegment] = []
        for segment in candidates:
            if (
                not current_group
                or segment.start - current_group[-1].start <= preset.max_duplicate_gap_seconds
            ):
                current_group.append(segment)
                continue

            if len(current_group) > 1:
                duplicate_groups.append(current_group)
            current_group = [segment]

        if len(current_group) > 1:
            duplicate_groups.append(current_group)

    return duplicate_groups


def _build_output_ranges(
    kept_segments: list[TranscriptSegment], preset: DirectorPreset
) -> dict[str, tuple[float, float]]:
    output_ranges: dict[str, tuple[float, float]] = {}
    output_cursor = 0.0
    previous_segment: TranscriptSegment | None = None

    for segment in kept_segments:
        if previous_segment is not None:
            source_gap = max(0.0, segment.start - previous_segment.end)
            output_cursor += min(source_gap, preset.intentional_pause_max_seconds)

        output_start = output_cursor
        output_end = output_start + segment.duration
        output_ranges[segment.segment_id] = (output_start, output_end)
        output_cursor = output_end
        previous_segment = segment

    return output_ranges


def build_edit_decisions(
    segments: Iterable[TranscriptSegment], preset: DirectorPreset
) -> list[EditDecision]:
    ordered_segments = sorted(
        segments, key=lambda item: (item.start, item.end, item.segment_id)
    )
    duplicate_groups = group_duplicate_takes(ordered_segments, preset)
    rejected_segment_ids: set[str] = set()

    for group in duplicate_groups:
        latest_segment = max(group, key=lambda item: (item.start, item.end, item.segment_id))
        rejected_segment_ids.update(
            segment.segment_id
            for segment in group
            if segment.segment_id != latest_segment.segment_id
        )

    reset_segment_ids = {
        segment.segment_id
        for segment in ordered_segments
        if is_reset_segment(segment, preset)
    }
    kept_segments = [
        segment
        for segment in ordered_segments
        if segment.segment_id not in rejected_segment_ids
        and segment.segment_id not in reset_segment_ids
    ]
    output_ranges = _build_output_ranges(kept_segments, preset)

    decisions: list[EditDecision] = []

    for previous_segment, segment in zip(ordered_segments, ordered_segments[1:]):
        source_gap = segment.start - previous_segment.end
        if source_gap <= preset.pause_cut_seconds:
            continue

        preserved_gap = min(source_gap, preset.intentional_pause_max_seconds)
        trim_start = previous_segment.end + preserved_gap
        if trim_start >= segment.start:
            continue

        decisions.append(
            EditDecision(
                segment_id=f"{previous_segment.segment_id}->{segment.segment_id}",
                decision_type="pause_trimmed",
                source_start=trim_start,
                source_end=segment.start,
                output_start=None,
                output_end=None,
                reason=(
                    f"trimmed long pause from {source_gap:.2f}s "
                    f"while preserving {preserved_gap:.2f}s"
                ),
                confidence=0.95,
                text="",
            )
        )

    for segment in ordered_segments:
        if segment.segment_id in reset_segment_ids:
            decisions.append(
                EditDecision(
                    segment_id=segment.segment_id,
                    decision_type="filler_trimmed",
                    source_start=segment.start,
                    source_end=segment.end,
                    output_start=None,
                    output_end=None,
                    reason="reset marker detected",
                    confidence=1.0,
                    text=segment.text,
                )
            )

    for group in duplicate_groups:
        latest_segment = max(group, key=lambda item: (item.start, item.end, item.segment_id))
        output_start, output_end = output_ranges.get(latest_segment.segment_id, (None, None))
        decisions.append(
            EditDecision(
                segment_id=latest_segment.segment_id,
                decision_type="take_selected",
                source_start=latest_segment.start,
                source_end=latest_segment.end,
                output_start=output_start,
                output_end=output_end,
                reason="latest complete take selected from duplicate group",
                confidence=0.92,
                text=latest_segment.text,
            )
        )

        for segment in group:
            if segment.segment_id == latest_segment.segment_id:
                continue

            decisions.append(
                EditDecision(
                    segment_id=segment.segment_id,
                    decision_type="take_rejected",
                    source_start=segment.start,
                    source_end=segment.end,
                    output_start=None,
                    output_end=None,
                    reason="earlier duplicate take rejected because latest complete take wins",
                    confidence=0.9,
                    text=segment.text,
                )
            )

    for segment in kept_segments:
        output_start, output_end = output_ranges[segment.segment_id]
        decisions.append(
            EditDecision(
                segment_id=segment.segment_id,
                decision_type="keep",
                source_start=segment.start,
                source_end=segment.end,
                output_start=output_start,
                output_end=output_end,
                reason="kept clip",
                confidence=1.0,
                text=segment.text,
            )
        )

    return sorted(
        decisions,
        key=lambda item: (item.source_start, item.decision_type, item.source_end, item.segment_id),
    )


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

        missing_fields = [field for field in ("start", "end") if field not in item]
        if missing_fields:
            fields = ", ".join(missing_fields)
            raise ValueError(f"segment {index} missing required field(s): {fields}")

        start = float(item["start"])
        end = float(item["end"])
        if not math.isfinite(start) or not math.isfinite(end):
            raise ValueError(f"segment {index} timestamps must be finite")

        if end <= start:
            raise ValueError(f"segment {index} end must be greater than start")

        if not isinstance(item.get("text"), str):
            raise ValueError(f"segment {index} text must be a string")

        text = item["text"]
        if not text.strip():
            raise ValueError(f"segment {index} text must not be empty")

        speaker_value = item.get("speaker")
        if speaker_value is not None and not isinstance(speaker_value, str):
            raise ValueError(f"segment {index} speaker must be a string")

        speaker = speaker_value.strip() if speaker_value is not None else ""
        speaker = speaker or "lingman"
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
