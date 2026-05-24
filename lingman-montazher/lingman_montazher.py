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


@dataclass(frozen=True)
class TimelineClip:
    segment_id: str
    source_start: float
    source_end: float
    output_start: float
    output_end: float
    text: str

    @property
    def duration(self) -> float:
        return self.output_end - self.output_start


@dataclass(frozen=True)
class ScreenTextEvent:
    start: float
    end: float
    text: str
    role: str
    position: str
    style: str
    animation: str
    reason: str

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass(frozen=True)
class SfxEvent:
    start: float
    end: float
    sfx_type: str
    volume: float
    reason: str


_WORD_RE = re.compile(r"[^\W_]+", flags=re.UNICODE)
QUOTED_PHRASE_RE = re.compile(
    r"(?:[\"“]([A-Za-z][A-Za-z' -]{2,62}?)[\"”])|"
    r"(?:['‘]([A-Za-z][A-Za-z -]{2,62}?)['’])"
)
CORRECTION_PHRASE_RE = re.compile(
    r"\bnot\s+[A-Za-z][A-Za-z' -]{1,62}?,\s*but\s+"
    r"([A-Za-z][A-Za-z' -]{2,62}?)(?=[.!?,;:]|$)",
    flags=re.IGNORECASE,
)
MARKED_PHRASE_RE = re.compile(
    r"\b(?:the\s+phrase\s+is|phrase\s+is|start\s+with|starts\s+with)\s+"
    r"([A-Za-z][A-Za-z' -]{2,62}?)(?=[.!?,;:]|$)",
    flags=re.IGNORECASE,
)
MEANS_PHRASE_RE = re.compile(
    r"\b([A-Za-z][A-Za-z' -]{2,62}?)\s+means\b",
    flags=re.IGNORECASE,
)
RULE_PHRASE_RE = re.compile(
    r"\b(you\s+need\s+[A-Za-z][A-Za-z' -]{1,48}?)(?=\s+because\b|[.!?,;:]|$)",
    flags=re.IGNORECASE,
)
PRONOUN_BE_PHRASE_RE = re.compile(
    r"\b((?:"
    r"I\s+am|I'm|you\s+are|you're|he\s+is|he's|she\s+is|she's|it\s+is|it's|"
    r"we\s+are|we're|they\s+are|they're"
    r")\s+[A-Za-z][A-Za-z' -]{1,48}?)(?=[.!?,;:]|$)",
    flags=re.IGNORECASE,
)
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
_GENERIC_SCREEN_TEXT_PHRASES = frozenset(
    {
        "but",
        "not",
        "the phrase",
        "the phrase is",
        "today we start",
    }
)


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


def _contains_token_phrase(text_tokens: list[str], marker_tokens: list[str]) -> bool:
    if not marker_tokens or len(marker_tokens) > len(text_tokens):
        return False

    marker_length = len(marker_tokens)
    return any(
        text_tokens[index : index + marker_length] == marker_tokens
        for index in range(len(text_tokens) - marker_length + 1)
    )


def is_reset_segment(segment: TranscriptSegment, preset: DirectorPreset) -> bool:
    text_tokens = _word_tokens(segment.text)
    return any(
        _contains_token_phrase(text_tokens, _word_tokens(marker))
        for marker in preset.reset_markers
    )


def is_complete_take(segment: TranscriptSegment, preset: DirectorPreset) -> bool:
    return (
        segment.word_count >= preset.min_take_words
        and segment.duration >= preset.min_take_duration_seconds
        and not is_reset_segment(segment, preset)
    )


def _take_keys_match(left: str, right: str) -> bool:
    left_tokens = left.split()
    right_tokens = right.split()
    if not left_tokens or not right_tokens:
        return False

    if len(left_tokens) <= len(right_tokens):
        return right_tokens[: len(left_tokens)] == left_tokens
    return left_tokens[: len(right_tokens)] == right_tokens


def _merge_take_group_key(left: str, right: str) -> str:
    if len(right.split()) > len(left.split()):
        return right
    return left


def _latest_complete_take(
    group: Iterable[TranscriptSegment], preset: DirectorPreset
) -> TranscriptSegment | None:
    complete_takes = [
        segment
        for segment in group
        if is_complete_take(segment, preset)
    ]
    if not complete_takes:
        return None

    return max(complete_takes, key=lambda item: (item.start, item.end, item.segment_id))


def group_duplicate_takes(
    segments: Iterable[TranscriptSegment], preset: DirectorPreset
) -> list[list[TranscriptSegment]]:
    candidate_groups: list[list[TranscriptSegment]] = []
    group_keys: list[str] = []

    for segment in sorted(segments, key=lambda item: (item.start, item.end, item.segment_id)):
        if is_reset_segment(segment, preset):
            continue

        key = take_group_key(segment, preset)
        if not key:
            continue

        target_index: int | None = None
        for index in range(len(candidate_groups) - 1, -1, -1):
            if segment.start - candidate_groups[index][-1].start > preset.max_duplicate_gap_seconds:
                continue
            if _take_keys_match(group_keys[index], key):
                target_index = index
                break

        if target_index is None:
            candidate_groups.append([segment])
            group_keys.append(key)
            continue

        candidate_groups[target_index].append(segment)
        group_keys[target_index] = _merge_take_group_key(group_keys[target_index], key)

    selection_groups: list[list[TranscriptSegment]] = []
    for group in candidate_groups:
        latest_complete = _latest_complete_take(group, preset)
        if latest_complete is None:
            continue

        latest_key = (latest_complete.start, latest_complete.end, latest_complete.segment_id)
        selection_group = [
            segment
            for segment in group
            if segment.segment_id == latest_complete.segment_id
            or (segment.start, segment.end, segment.segment_id) < latest_key
        ]
        if len(selection_group) > 1:
            selection_groups.append(selection_group)

    return selection_groups


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

    for previous_segment, segment in zip(kept_segments, kept_segments[1:]):
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


def assemble_timeline(decisions: Iterable[EditDecision]) -> list[TimelineClip]:
    clips: list[TimelineClip] = []

    for decision in decisions:
        if decision.decision_type != "keep":
            continue
        if decision.output_start is None or decision.output_end is None:
            continue
        clips.append(
            TimelineClip(
                segment_id=decision.segment_id,
                source_start=decision.source_start,
                source_end=decision.source_end,
                output_start=decision.output_start,
                output_end=decision.output_end,
                text=decision.text,
            )
        )

    return sorted(clips, key=lambda item: (item.output_start, item.output_end, item.segment_id))


def clean_english_phrase(text: str) -> str:
    phrase = re.sub(r"\s+", " ", text).strip(" .,:;!?\"'")
    lowered = phrase.casefold()

    for prefix in (
        "the phrase is ",
        "phrase is ",
        "start with ",
        "starts with ",
        "with ",
        "not ",
        "but ",
    ):
        if lowered.startswith(prefix):
            return phrase[len(prefix) :].strip(" .,:;!?\"'")

    return phrase


def _english_phrase_tokens(phrase: str) -> list[str]:
    return re.findall(r"[A-Za-z']+", phrase.casefold())


def _looks_like_wrong_correction_fragment(tokens: list[str]) -> bool:
    return len(tokens) == 2 and tokens[0] == "i" and tokens[1] not in {"am", "'m"}


def _is_useful_english_phrase(phrase: str, preset: DirectorPreset) -> bool:
    if not (preset.english_phrase_min_chars <= len(phrase) <= preset.english_phrase_max_chars):
        return False

    tokens = _english_phrase_tokens(phrase)
    if len(tokens) < 2:
        return False

    lowered = " ".join(tokens)
    if lowered in _GENERIC_SCREEN_TEXT_PHRASES:
        return False
    if lowered.startswith("not ") or _looks_like_wrong_correction_fragment(tokens):
        return False

    return True


def _add_unique_phrase(
    phrases: list[str], phrase: str, preset: DirectorPreset, seen: set[str]
) -> None:
    cleaned = clean_english_phrase(phrase)
    if not _is_useful_english_phrase(cleaned, preset):
        return

    key = " ".join(_english_phrase_tokens(cleaned))
    if key in seen:
        return

    seen.add(key)
    phrases.append(cleaned)


def extract_english_phrases(text: str, preset: DirectorPreset) -> list[str]:
    phrases: list[str] = []
    seen: set[str] = set()

    phrase_patterns = (
        (CORRECTION_PHRASE_RE, (1,)),
        (MARKED_PHRASE_RE, (1,)),
        (MEANS_PHRASE_RE, (1,)),
        (RULE_PHRASE_RE, (1,)),
        (PRONOUN_BE_PHRASE_RE, (1,)),
        (QUOTED_PHRASE_RE, (1, 2)),
    )

    for pattern, group_indexes in phrase_patterns:
        for match in pattern.finditer(text):
            for group_index in group_indexes:
                phrase = match.group(group_index)
                if phrase:
                    _add_unique_phrase(phrases, phrase, preset, seen)

    return phrases


def _screen_text_role(clip_text: str) -> str:
    lowered = clip_text.casefold()
    if "not " in lowered and " but " in lowered:
        return "correction"
    if " because " in lowered or lowered.startswith("you need "):
        return "rule"
    if " or " in lowered:
        return "contrast"
    return "phrase"


def select_screen_text_events(
    timeline: list[TimelineClip],
    preset: DirectorPreset,
) -> list[ScreenTextEvent]:
    if not timeline:
        return []

    final_end = max(clip.output_end for clip in timeline)
    events: list[ScreenTextEvent] = []
    last_end = 0.0

    for clip in sorted(timeline, key=lambda item: (item.output_start, item.output_end, item.segment_id)):
        phrases = extract_english_phrases(clip.text, preset)
        if not phrases:
            continue

        start = max(clip.output_start, last_end)
        clip_end = min(clip.output_end, final_end)
        available = clip_end - start
        if available < preset.min_screen_text_duration:
            continue

        duration = min(available, preset.max_screen_text_duration)
        end = min(start + duration, final_end)
        if end - start < preset.min_screen_text_duration:
            continue

        phrase = phrases[0]
        events.append(
            ScreenTextEvent(
                start=round(start, 3),
                end=round(end, 3),
                text=phrase,
                role=_screen_text_role(clip.text),
                position=preset.text_position,
                style=preset.text_style,
                animation=preset.text_animation,
                reason="Selected because the kept clip contains a useful English learning phrase.",
            )
        )
        last_end = end

    return events


def build_sfx_events(
    screen_text_events: Iterable[ScreenTextEvent],
    timeline: list[TimelineClip],
    volume: float = 0.18,
) -> list[SfxEvent]:
    if not timeline:
        return []

    final_end = max(clip.output_end for clip in timeline)
    events: list[SfxEvent] = []

    for text_event in screen_text_events:
        start = min(max(0.0, text_event.start), final_end)
        end = min(start + 0.18, text_event.end, final_end)
        if end <= start:
            continue

        events.append(
            SfxEvent(
                start=round(start, 3),
                end=round(end, 3),
                sfx_type="soft_pop",
                volume=volume,
                reason=f"Accent for screen text: {text_event.text}",
            )
        )

    return events


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


def format_srt_timestamp(seconds: float) -> str:
    milliseconds_total = int(round(seconds * 1000))
    hours, remainder = divmod(milliseconds_total, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    whole_seconds, milliseconds = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{whole_seconds:02d},{milliseconds:03d}"


def write_json(path: Path, payload: object) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_srt(timeline: list[TimelineClip], path: Path) -> None:
    lines: list[str] = []
    for index, clip in enumerate(timeline, start=1):
        lines.extend(
            [
                str(index),
                f"{format_srt_timestamp(clip.output_start)} --> {format_srt_timestamp(clip.output_end)}",
                clip.text,
                "",
            ]
        )

    path.write_text("\n".join(lines), encoding="utf-8")


def write_timeline_csv(path: Path, timeline: list[TimelineClip]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "segment_id",
                "source_start",
                "source_end",
                "output_start",
                "output_end",
                "duration",
                "text",
            ],
        )
        writer.writeheader()
        for clip in timeline:
            writer.writerow(
                {
                    "segment_id": clip.segment_id,
                    "source_start": f"{clip.source_start:.3f}",
                    "source_end": f"{clip.source_end:.3f}",
                    "output_start": f"{clip.output_start:.3f}",
                    "output_end": f"{clip.output_end:.3f}",
                    "duration": f"{clip.duration:.3f}",
                    "text": clip.text,
                }
            )


def write_review_plan(
    output_dir: Path,
    decisions: list[EditDecision],
    screen_text: list[ScreenTextEvent],
    sfx_events: list[SfxEvent],
) -> None:
    selected = [item for item in decisions if item.decision_type == "take_selected"]
    rejected = [item for item in decisions if item.decision_type == "take_rejected"]
    cuts = [
        item
        for item in decisions
        if item.decision_type in {"pause_trimmed", "filler_trimmed"}
    ]
    lines = [
        "# Lingman Montazher Review Plan",
        "",
        "## Selected Take Groups",
        "",
    ]
    lines.extend(
        f"- `{item.segment_id}` {item.source_start:.3f}-{item.source_end:.3f}: {item.text}"
        for item in selected
    )
    if not selected:
        lines.append("- No duplicate take group needed a special latest-take selection.")

    lines.extend(["", "## Rejected Duplicate Takes", ""])
    lines.extend(
        f"- `{item.segment_id}` {item.source_start:.3f}-{item.source_end:.3f}: {item.reason}"
        for item in rejected
    )
    if not rejected:
        lines.append("- No duplicate takes were rejected.")

    lines.extend(["", "## Major Cuts", ""])
    lines.extend(
        f"- `{item.decision_type}` {item.source_start:.3f}-{item.source_end:.3f}: {item.reason}"
        for item in cuts
    )
    if not cuts:
        lines.append("- No major cuts were needed.")

    lines.extend(["", "## Visual Accents", ""])
    lines.extend(
        f"- {event.start:.3f}-{event.end:.3f}: {event.text} ({event.animation})"
        for event in screen_text
    )
    if not screen_text:
        lines.append("- No screen text events were selected.")

    lines.extend(["", "## SFX Accents", ""])
    lines.extend(
        f"- {event.start:.3f}-{event.end:.3f}: {event.sfx_type} at volume {event.volume:.2f}"
        for event in sfx_events
    )
    if not sfx_events:
        lines.append("- No SFX accents were selected.")

    lines.extend(["", "## Known Risks", ""])
    lines.append("- Screen text placement still needs visual review against the source framing.")
    lines.append("- Dry-run packs do not prove ffmpeg renderability or audio balance.")
    lines.extend(["", "## Suggested Manual Review Points", ""])
    lines.append("- Review every rejected duplicate take before rendering a final public upload.")
    lines.append("- Check that on-screen English phrases do not cover the speaker's face.")
    lines.append("- Listen to SFX levels against the voice track before publishing.")
    (output_dir / "review_plan.md").write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )


def quality_lines(
    timeline: list[TimelineClip],
    screen_text: list[ScreenTextEvent],
    decisions: list[EditDecision],
) -> list[str]:
    lines = ["# Lingman Montazher Quality Report", ""]
    if timeline:
        lines.append(f"- Final timeline duration: {timeline[-1].output_end:.3f}s")
    else:
        lines.append("- Final timeline duration: 0.000s")

    lines.append(f"- Kept clips: {len(timeline)}")
    lines.append(f"- Screen text events: {len(screen_text)}")
    lines.append(f"- Edit decisions: {len(decisions)}")

    ordered_screen_text = sorted(screen_text, key=lambda item: (item.start, item.end, item.text))
    overlap_count = sum(
        1
        for previous, current in zip(ordered_screen_text, ordered_screen_text[1:])
        if current.start < previous.end
    )
    lines.append(f"- Screen text overlaps: {overlap_count}")

    invalid_ranges = [
        item
        for item in decisions
        if item.source_end <= item.source_start
    ]
    lines.append(f"- Invalid source ranges: {len(invalid_ranges)}")
    return lines


def write_capcut_project_json(
    output_dir: Path,
    timeline: list[TimelineClip],
    screen_text: list[ScreenTextEvent],
    sfx_events: list[SfxEvent],
    preset: DirectorPreset,
) -> None:
    payload = {
        "schema": "lingman.montazher.capcut_project.v1",
        "canvas": {
            "width": preset.output_width,
            "height": preset.output_height,
            "fps": preset.fps,
        },
        "tracks": {
            "video": [asdict(item) for item in timeline],
            "text": [asdict(item) for item in screen_text],
            "sfx": [asdict(item) for item in sfx_events],
        },
        "montage": {
            "zoom_scale": preset.zoom_scale,
            "text_position": preset.text_position,
            "text_style": preset.text_style,
            "text_animation": preset.text_animation,
        },
    }
    write_json(output_dir / "capcut_project.json", payload)


def file_sha256(path: Path) -> str | None:
    if not path.exists():
        return None

    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_pack(
    *,
    input_video: Path,
    transcript_json: Path,
    output_dir: Path,
    preset_path: Path,
    dry_run: bool,
    render: bool,
) -> dict[str, object]:
    preset = load_preset(preset_path)
    segments = load_transcript(transcript_json)
    decisions = build_edit_decisions(segments, preset)
    timeline = assemble_timeline(decisions)
    screen_text = select_screen_text_events(timeline, preset)
    sfx_events = build_sfx_events(screen_text, timeline, volume=preset.sfx_volume)

    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "edit_decisions.json", [asdict(item) for item in decisions])
    write_json(output_dir / "screen_text.json", [asdict(item) for item in screen_text])
    write_srt(timeline, output_dir / "captions.srt")
    write_timeline_csv(output_dir / "timeline.csv", timeline)
    write_review_plan(output_dir, decisions, screen_text, sfx_events)
    (output_dir / "quality_report.md").write_text(
        "\n".join(quality_lines(timeline, screen_text, decisions)) + "\n",
        encoding="utf-8",
    )
    write_capcut_project_json(output_dir, timeline, screen_text, sfx_events, preset)

    rendered = False
    render_command: list[str] | None = None
    if render and not dry_run:
        render_command = build_ffmpeg_render_command(
            input_video,
            output_dir / "final.mp4",
            timeline,
        )
        run_command(render_command, cwd=output_dir)
        rendered = (output_dir / "final.mp4").exists()

    files = [
        "edit_decisions.json",
        "screen_text.json",
        "captions.srt",
        "timeline.csv",
        "review_plan.md",
        "manifest.json",
        "quality_report.md",
        "capcut_project.json",
    ]
    summary = {
        "name": "lingman_montazher",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "input_video": str(input_video),
        "input_sha256": file_sha256(input_video),
        "transcript_json": str(transcript_json),
        "transcript_sha256": file_sha256(transcript_json),
        "dry_run": dry_run,
        "render_requested": render,
        "rendered": rendered,
        "render_command": render_command,
        "segments": len(segments),
        "timeline_clips": len(timeline),
        "timeline_duration": round(timeline[-1].output_end, 3) if timeline else 0.0,
        "screen_text_events": len(screen_text),
        "sfx_events": len(sfx_events),
        "files": files,
    }
    write_json(output_dir / "manifest.json", summary)
    return summary


def build_ffmpeg_render_command(
    input_video: Path,
    output_video: Path,
    timeline: list[TimelineClip],
) -> list[str]:
    if not timeline:
        raise ValueError("Cannot render an empty timeline.")

    filters: list[str] = []
    concat_inputs: list[str] = []
    for index, clip in enumerate(timeline):
        video_label = f"v{index}"
        audio_label = f"a{index}"
        filters.append(
            f"[0:v]trim=start={clip.source_start:.3f}:end={clip.source_end:.3f},"
            f"setpts=PTS-STARTPTS[{video_label}]"
        )
        filters.append(
            f"[0:a]atrim=start={clip.source_start:.3f}:end={clip.source_end:.3f},"
            f"asetpts=PTS-STARTPTS[{audio_label}]"
        )
        concat_inputs.append(f"[{video_label}][{audio_label}]")

    filter_complex = (
        ";".join(filters)
        + ";"
        + "".join(concat_inputs)
        + f"concat=n={len(timeline)}:v=1:a=1[outv][outa]"
    )
    return [
        "ffmpeg",
        "-y",
        "-i",
        str(input_video),
        "-filter_complex",
        filter_complex,
        "-map",
        "[outv]",
        "-map",
        "[outa]",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        str(output_video),
    ]


def run_command(command: list[str], cwd: Path | None = None) -> None:
    subprocess.run(command, cwd=cwd, check=True)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a director-style Lingman talking-head montage."
    )
    parser.add_argument("--input", required=True, help="Raw input video path.")
    parser.add_argument(
        "--transcript-json",
        required=True,
        help="Timed transcript JSON path.",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Output folder for montage artifacts.",
    )
    parser.add_argument(
        "--preset",
        default=str(Path(__file__).resolve().parent / "presets" / "default_director.json"),
        help="Director preset JSON path.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Write artifacts without rendering final.mp4.",
    )
    parser.add_argument(
        "--render",
        action="store_true",
        help="Run ffmpeg and render final.mp4.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    summary = build_pack(
        input_video=Path(args.input),
        transcript_json=Path(args.transcript_json),
        output_dir=Path(args.output_dir),
        preset_path=Path(args.preset),
        dry_run=bool(args.dry_run),
        render=bool(args.render),
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
