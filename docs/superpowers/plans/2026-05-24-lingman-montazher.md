# Lingman Montazher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a director-style Lingman video editing pipeline that turns one long talking-head recording plus a timed transcript into reviewable edit decisions, screen text, captions, and optional rendered video.

**Architecture:** Create a new isolated Python pipeline under `lingman-montazher/` so no existing Phraseman app or Lingman scenarist behavior is removed. The first implementation uses a transcript JSON input for deterministic tests, then layers take selection, pause cutting, screen text, exports, quality checks, and optional ffmpeg command execution. Shared ideas from `lingman-scenarist-pipeline/capcut_phrase_factory.py` are reused by copying small utility patterns such as timestamp formatting and JSON/CSV export shape.

**Tech Stack:** Python 3 standard library, `unittest`, ffmpeg/ffprobe command-line integration, JSON/CSV/SRT/Markdown artifacts.

---

## Scope Check

The spec describes one pipeline with multiple internal agents, not independent products. This plan keeps v1 focused on a working, testable director pipeline:

- Transcript input is `--transcript-json`, not an external transcription API.
- The render step is optional and isolated behind `--render`.
- No B-roll search, no YouTube publishing, and no edits to the React Native app.

## File Map

- Create: `lingman-montazher/README.md`
  - User-facing usage, input transcript schema, dry-run command, render command, output list.
- Create: `lingman-montazher/lingman_montazher.py`
  - All v1 pipeline logic: models, preset loading, transcript loading, take selection, pause/filler cuts, timeline assembly, screen text selection, exporters, quality checks, CLI.
- Create: `lingman-montazher/presets/default_director.json`
  - Director thresholds, style presets, SFX defaults, render settings.
- Create: `lingman-montazher/tests/test_lingman_montazher.py`
  - Unit tests for the pipeline and dry-run outputs.
- Modify: none outside the new `lingman-montazher/` folder for implementation.

## Verification Commands

Use these commands throughout the tasks:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
python -m unittest lingman-scenarist-pipeline/tests/test_capcut_phrase_factory.py -v
python -m py_compile lingman-montazher/lingman_montazher.py
```

---

### Task 1: Scaffold The Pipeline And Preset

**Files:**
- Create: `lingman-montazher/README.md`
- Create: `lingman-montazher/presets/default_director.json`
- Create: `lingman-montazher/lingman_montazher.py`
- Create: `lingman-montazher/tests/test_lingman_montazher.py`

- [ ] **Step 1: Create the failing scaffold test**

Add this file:

```python
# lingman-montazher/tests/test_lingman_montazher.py
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import lingman_montazher as montazher


class LingmanMontazherTests(unittest.TestCase):
    def test_default_preset_loads_director_thresholds(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")

        self.assertEqual(preset.name, "lingman_director_default")
        self.assertAlmostEqual(preset.pause_cut_seconds, 0.75)
        self.assertAlmostEqual(preset.intentional_pause_max_seconds, 1.6)
        self.assertEqual(preset.min_take_words, 5)
        self.assertEqual(preset.text_position, "lower_third")
        self.assertGreaterEqual(preset.min_screen_text_duration, 1.2)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the scaffold test and verify it fails**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py::LingmanMontazherTests.test_default_preset_loads_director_thresholds -v
```

Expected: FAIL because `lingman-montazher/lingman_montazher.py` does not exist or `load_preset` is not defined.

- [ ] **Step 3: Add the default director preset**

Add this file:

```json
{
  "name": "lingman_director_default",
  "pause_cut_seconds": 0.75,
  "intentional_pause_max_seconds": 1.6,
  "min_take_words": 5,
  "min_take_duration_seconds": 1.2,
  "max_duplicate_gap_seconds": 240.0,
  "filler_words": [
    "ээ",
    "эм",
    "ну",
    "типа",
    "как бы",
    "uh",
    "um",
    "erm"
  ],
  "reset_markers": [
    "стоп",
    "заново",
    "еще раз",
    "перезапишу",
    "давай еще раз",
    "не то",
    "wrong take"
  ],
  "english_phrase_min_chars": 4,
  "english_phrase_max_chars": 64,
  "min_screen_text_duration": 1.2,
  "max_screen_text_duration": 3.8,
  "text_position": "lower_third",
  "text_style": "high_contrast_phrase",
  "text_animation": "kinetic_pop_220ms",
  "sfx_volume": 0.18,
  "zoom_scale": 1.035,
  "output_width": 1920,
  "output_height": 1080,
  "fps": 30
}
```

- [ ] **Step 4: Add the minimal preset loader implementation**

Add this file:

```python
# lingman-montazher/lingman_montazher.py
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
```

- [ ] **Step 5: Add the first README**

Add this file:

```markdown
# Lingman Montazher

Director-style editing pipeline for Professor Lingman talking-head YouTube lessons.

## v1 Input

The first implementation accepts one raw camera file and one transcript JSON file with timed segments:

```json
{
  "segments": [
    {
      "start": 0.0,
      "end": 4.2,
      "text": "Today we talk about I am ready.",
      "speaker": "lingman"
    }
  ]
}
```

## Dry Run

```powershell
python lingman-montazher/lingman_montazher.py --input raw.mp4 --transcript-json transcript.json --output-dir lingman-montazher/outputs/demo --dry-run
```

## Outputs

- `edit_decisions.json`
- `screen_text.json`
- `captions.srt`
- `timeline.csv`
- `review_plan.md`
- `manifest.json`
- `quality_report.md`
- `capcut_project.json`

Use `--render` to ask ffmpeg to render `final.mp4` when the local machine has ffmpeg installed and the input file exists.
```

- [ ] **Step 6: Run the scaffold test and verify it passes**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
```

Expected: PASS for `test_default_preset_loads_director_thresholds`.

- [ ] **Step 7: Commit the scaffold**

Run:

```powershell
git add -- lingman-montazher/README.md lingman-montazher/lingman_montazher.py lingman-montazher/presets/default_director.json lingman-montazher/tests/test_lingman_montazher.py
git commit -m "feat: scaffold Lingman Montazher pipeline"
```

---

### Task 2: Load Transcript Segments And Validate Time Ranges

**Files:**
- Modify: `lingman-montazher/lingman_montazher.py`
- Modify: `lingman-montazher/tests/test_lingman_montazher.py`

- [ ] **Step 1: Add failing transcript loader tests**

Append these tests inside `LingmanMontazherTests`:

```python
    def test_transcript_loader_maps_valid_segments(self):
        with tempfile.TemporaryDirectory() as tmp:
            transcript_path = Path(tmp) / "transcript.json"
            transcript_path.write_text(
                json.dumps(
                    {
                        "segments": [
                            {"start": 0.0, "end": 2.0, "text": "Hello, today we start.", "speaker": "lingman"},
                            {"start": 2.4, "end": 5.0, "text": "I am ready means Я готов.", "speaker": "lingman"},
                        ]
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            segments = montazher.load_transcript(transcript_path)

        self.assertEqual(len(segments), 2)
        self.assertEqual(segments[0].segment_id, "seg_0001")
        self.assertAlmostEqual(segments[1].duration, 2.6)
        self.assertEqual(segments[1].speaker, "lingman")

    def test_transcript_loader_rejects_invalid_ranges(self):
        with tempfile.TemporaryDirectory() as tmp:
            transcript_path = Path(tmp) / "bad_transcript.json"
            transcript_path.write_text(
                json.dumps({"segments": [{"start": 3.0, "end": 2.0, "text": "Broken"}]}),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "end must be greater than start"):
                montazher.load_transcript(transcript_path)
```

- [ ] **Step 2: Run transcript loader tests and verify they fail**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
```

Expected: FAIL because `load_transcript` and `TranscriptSegment` are not defined.

- [ ] **Step 3: Add transcript models and loader**

Append this code after `DirectorPreset`:

```python
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
```

Append this code after `load_preset`:

```python
def load_transcript(path: Path) -> list[TranscriptSegment]:
    data = json.loads(path.read_text(encoding="utf-8"))
    raw_segments = data.get("segments")
    if not isinstance(raw_segments, list):
        raise ValueError("Transcript JSON must contain a segments list.")

    segments: list[TranscriptSegment] = []
    for index, item in enumerate(raw_segments, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Transcript segment {index} must be an object.")
        start = float(item["start"])
        end = float(item["end"])
        if end <= start:
            raise ValueError(f"Transcript segment {index} end must be greater than start.")
        text = str(item.get("text", "")).strip()
        if not text:
            raise ValueError(f"Transcript segment {index} text must not be empty.")
        speaker = str(item.get("speaker", "lingman")).strip() or "lingman"
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
```

- [ ] **Step 4: Run transcript loader tests and verify they pass**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit transcript loading**

Run:

```powershell
git add -- lingman-montazher/lingman_montazher.py lingman-montazher/tests/test_lingman_montazher.py
git commit -m "feat: load Lingman timed transcripts"
```

---

### Task 3: Select Latest Complete Takes And Cut Bad Segments

**Files:**
- Modify: `lingman-montazher/lingman_montazher.py`
- Modify: `lingman-montazher/tests/test_lingman_montazher.py`

- [ ] **Step 1: Add failing take selection and cut tests**

Append these tests inside `LingmanMontazherTests`:

```python
    def test_latest_complete_take_wins_for_duplicate_explanation(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")
        segments = [
            montazher.TranscriptSegment("seg_0001", 0.0, 3.0, "I am ready means I am prepared."),
            montazher.TranscriptSegment("seg_0002", 5.0, 7.0, "стоп не то"),
            montazher.TranscriptSegment("seg_0003", 9.0, 13.0, "I am ready means I am prepared for the action."),
        ]

        decisions = montazher.build_edit_decisions(segments, preset)
        selected = [item for item in decisions if item.decision_type == "take_selected"]
        rejected = [item for item in decisions if item.decision_type == "take_rejected"]

        self.assertEqual([item.segment_id for item in selected], ["seg_0003"])
        self.assertEqual([item.segment_id for item in rejected], ["seg_0001"])
        self.assertIn("latest complete take", selected[0].reason)

    def test_reset_marker_and_long_gap_are_cut(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")
        segments = [
            montazher.TranscriptSegment("seg_0001", 0.0, 2.0, "Today we start with I am ready."),
            montazher.TranscriptSegment("seg_0002", 4.2, 5.0, "заново"),
            montazher.TranscriptSegment("seg_0003", 8.0, 10.0, "I am ready means Я готов."),
        ]

        decisions = montazher.build_edit_decisions(segments, preset)
        cut_types = [item.decision_type for item in decisions]

        self.assertIn("pause_trimmed", cut_types)
        self.assertIn("filler_trimmed", cut_types)
        self.assertTrue(any(item.segment_id == "seg_0002" for item in decisions if item.decision_type == "filler_trimmed"))
```

- [ ] **Step 2: Run the new tests and verify they fail**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
```

Expected: FAIL because `build_edit_decisions` and `EditDecision` are not defined.

- [ ] **Step 3: Add edit decision data model and text helpers**

Append this code after `TranscriptSegment`:

```python
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


def normalize_text_key(text: str, preset: DirectorPreset) -> str:
    lowered = text.lower()
    lowered = re.sub(r"[^\w\s']+", " ", lowered, flags=re.UNICODE)
    words = [word for word in lowered.split() if word not in preset.filler_words]
    return " ".join(words)


def take_group_key(text: str, preset: DirectorPreset) -> str:
    words = normalize_text_key(text, preset).split()
    content_words = [word for word in words if len(word) > 2]
    return " ".join(content_words[:6])


def is_reset_segment(segment: TranscriptSegment, preset: DirectorPreset) -> bool:
    lowered = segment.text.lower()
    return any(marker in lowered for marker in preset.reset_markers)


def is_complete_take(segment: TranscriptSegment, preset: DirectorPreset) -> bool:
    return (
        segment.word_count >= preset.min_take_words
        and segment.duration >= preset.min_take_duration_seconds
        and not is_reset_segment(segment, preset)
    )
```

- [ ] **Step 4: Add take selection and pause trimming**

Append this code after the helper functions:

```python
def group_duplicate_takes(
    segments: Iterable[TranscriptSegment],
    preset: DirectorPreset,
) -> dict[str, list[TranscriptSegment]]:
    groups: dict[str, list[TranscriptSegment]] = {}
    for segment in segments:
        if not is_complete_take(segment, preset):
            continue
        key = take_group_key(segment.text, preset)
        if not key:
            continue
        groups.setdefault(key, []).append(segment)
    return {key: items for key, items in groups.items() if len(items) > 1}


def build_edit_decisions(
    segments: list[TranscriptSegment],
    preset: DirectorPreset,
) -> list[EditDecision]:
    decisions: list[EditDecision] = []
    duplicate_groups = group_duplicate_takes(segments, preset)
    selected_segment_ids: set[str] = set()
    rejected_segment_ids: set[str] = set()

    for group_segments in duplicate_groups.values():
        latest = max(group_segments, key=lambda item: item.start)
        selected_segment_ids.add(latest.segment_id)
        for segment in group_segments:
            if segment.segment_id == latest.segment_id:
                decisions.append(
                    EditDecision(
                        segment_id=segment.segment_id,
                        decision_type="take_selected",
                        source_start=segment.start,
                        source_end=segment.end,
                        output_start=None,
                        output_end=None,
                        reason="Selected because it is the latest complete take in a repeated explanation group.",
                        confidence=0.86,
                        text=segment.text,
                    )
                )
            else:
                rejected_segment_ids.add(segment.segment_id)
                decisions.append(
                    EditDecision(
                        segment_id=segment.segment_id,
                        decision_type="take_rejected",
                        source_start=segment.start,
                        source_end=segment.end,
                        output_start=None,
                        output_end=None,
                        reason="Rejected because a later complete take repeats the same explanation more recently.",
                        confidence=0.82,
                        text=segment.text,
                    )
                )

    output_cursor = 0.0
    previous_kept_end: float | None = None
    for segment in segments:
        if previous_kept_end is not None:
            gap = segment.start - previous_kept_end
            if gap > preset.pause_cut_seconds:
                kept_pause = min(gap, preset.intentional_pause_max_seconds)
                trimmed = max(0.0, gap - kept_pause)
                if trimmed > 0:
                    decisions.append(
                        EditDecision(
                            segment_id=f"gap_after_{previous_kept_end:.3f}",
                            decision_type="pause_trimmed",
                            source_start=previous_kept_end,
                            source_end=segment.start,
                            output_start=output_cursor,
                            output_end=output_cursor + kept_pause,
                            reason=f"Trimmed {trimmed:.3f}s from a {gap:.3f}s pause while preserving {kept_pause:.3f}s for teaching rhythm.",
                            confidence=0.9,
                            text="",
                        )
                    )
                    output_cursor += kept_pause

        if is_reset_segment(segment, preset):
            decisions.append(
                EditDecision(
                    segment_id=segment.segment_id,
                    decision_type="filler_trimmed",
                    source_start=segment.start,
                    source_end=segment.end,
                    output_start=None,
                    output_end=None,
                    reason="Removed because the segment contains a reset marker.",
                    confidence=0.93,
                    text=segment.text,
                )
            )
            continue

        if segment.segment_id in rejected_segment_ids:
            previous_kept_end = segment.end
            continue

        output_start = output_cursor
        output_end = output_start + segment.duration
        output_cursor = output_end
        decisions.append(
            EditDecision(
                segment_id=segment.segment_id,
                decision_type="keep",
                source_start=segment.start,
                source_end=segment.end,
                output_start=output_start,
                output_end=output_end,
                reason="Kept as part of the assembled lesson.",
                confidence=0.78 if segment.segment_id not in selected_segment_ids else 0.88,
                text=segment.text,
            )
        )
        previous_kept_end = segment.end

    return sorted(decisions, key=lambda item: (item.source_start, item.decision_type))
```

- [ ] **Step 5: Run take and cut tests**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit take selection**

Run:

```powershell
git add -- lingman-montazher/lingman_montazher.py lingman-montazher/tests/test_lingman_montazher.py
git commit -m "feat: select latest Lingman takes"
```

---

### Task 4: Assemble Timeline, Screen Text, Captions, And SFX Events

**Files:**
- Modify: `lingman-montazher/lingman_montazher.py`
- Modify: `lingman-montazher/tests/test_lingman_montazher.py`

- [ ] **Step 1: Add failing timeline and screen text tests**

Append these tests inside `LingmanMontazherTests`:

```python
    def test_screen_text_selects_english_phrases_with_readable_duration(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")
        segments = [
            montazher.TranscriptSegment("seg_0001", 0.0, 2.5, "The phrase is I am ready. Это значит я готов."),
            montazher.TranscriptSegment("seg_0002", 3.0, 5.0, "Not I ready, but I am ready."),
        ]
        decisions = montazher.build_edit_decisions(segments, preset)
        timeline = montazher.assemble_timeline(decisions)
        events = montazher.select_screen_text_events(timeline, preset)

        self.assertGreaterEqual(len(events), 2)
        self.assertTrue(any(event.text == "I am ready" for event in events))
        self.assertTrue(all(event.duration >= preset.min_screen_text_duration for event in events))
        self.assertTrue(all(event.position == "lower_third" for event in events))

    def test_sfx_events_are_inside_timeline(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")
        segments = [
            montazher.TranscriptSegment("seg_0001", 0.0, 2.0, "I am ready means Я готов."),
            montazher.TranscriptSegment("seg_0002", 4.0, 6.0, "You need am because English connects subject and state."),
        ]
        timeline = montazher.assemble_timeline(montazher.build_edit_decisions(segments, preset))
        screen_text = montazher.select_screen_text_events(timeline, preset)
        sfx = montazher.build_sfx_events(screen_text, timeline)

        self.assertTrue(sfx)
        final_end = timeline[-1].output_end
        self.assertTrue(all(0 <= event.start < event.end <= final_end for event in sfx))
```

- [ ] **Step 2: Run timeline tests and verify they fail**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
```

Expected: FAIL because timeline and screen text functions are not defined.

- [ ] **Step 3: Add timeline, screen text, and SFX models**

Append this code after `EditDecision`:

```python
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
```

- [ ] **Step 4: Add timeline assembly and English phrase extraction**

Append this code after `build_edit_decisions`:

```python
ENGLISH_PHRASE_RE = re.compile(r"\b[A-Za-z][A-Za-z' -]{2,62}[A-Za-z]\b")


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
    return sorted(clips, key=lambda item: item.output_start)


def clean_english_phrase(text: str) -> str:
    phrase = re.sub(r"\s+", " ", text).strip(" .,:;!?\"'“”")
    stop_prefixes = ("the phrase is ", "not ", "but ")
    lowered = phrase.lower()
    for prefix in stop_prefixes:
        if lowered.startswith(prefix):
            return phrase[len(prefix):].strip(" .,:;!?\"'“”")
    return phrase


def extract_english_phrases(text: str, preset: DirectorPreset) -> list[str]:
    phrases: list[str] = []
    for match in ENGLISH_PHRASE_RE.finditer(text):
        phrase = clean_english_phrase(match.group(0))
        if not (preset.english_phrase_min_chars <= len(phrase) <= preset.english_phrase_max_chars):
            continue
        if phrase.lower() in {"today we start", "the phrase is", "not i ready", "but i am ready"}:
            continue
        if phrase not in phrases:
            phrases.append(phrase)
    return phrases
```

- [ ] **Step 5: Add screen text and SFX event builders**

Append this code after `extract_english_phrases`:

```python
def select_screen_text_events(
    timeline: list[TimelineClip],
    preset: DirectorPreset,
) -> list[ScreenTextEvent]:
    events: list[ScreenTextEvent] = []
    last_end = -1.0
    for clip in timeline:
        phrases = extract_english_phrases(clip.text, preset)
        if not phrases:
            continue
        phrase = phrases[0]
        start = max(clip.output_start, last_end + 0.12)
        dwell = min(max(clip.duration, preset.min_screen_text_duration), preset.max_screen_text_duration)
        end = min(start + dwell, clip.output_end + 0.8)
        if end - start < preset.min_screen_text_duration:
            end = start + preset.min_screen_text_duration
        events.append(
            ScreenTextEvent(
                start=round(start, 3),
                end=round(end, 3),
                text=phrase,
                role="phrase",
                position=preset.text_position,
                style=preset.text_style,
                animation=preset.text_animation,
                reason="Selected because the segment contains a readable English learning phrase.",
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
    final_end = timeline[-1].output_end
    events: list[SfxEvent] = []
    for text_event in screen_text_events:
        start = max(0.0, text_event.start)
        end = min(final_end, start + 0.18)
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
```

- [ ] **Step 6: Run timeline and screen text tests**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
```

Expected: PASS.

- [ ] **Step 7: Commit timeline and screen text**

Run:

```powershell
git add -- lingman-montazher/lingman_montazher.py lingman-montazher/tests/test_lingman_montazher.py
git commit -m "feat: build Lingman edit timeline"
```

---

### Task 5: Export JSON, CSV, SRT, Review Plan, Manifest, And CapCut JSON

**Files:**
- Modify: `lingman-montazher/lingman_montazher.py`
- Modify: `lingman-montazher/tests/test_lingman_montazher.py`

- [ ] **Step 1: Add failing dry-run artifact test**

Append this test inside `LingmanMontazherTests`:

```python
    def test_dry_run_writes_required_artifacts(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            transcript_path = tmp_path / "transcript.json"
            transcript_path.write_text(
                json.dumps(
                    {
                        "segments": [
                            {"start": 0.0, "end": 2.0, "text": "Today we start with I am ready."},
                            {"start": 4.0, "end": 7.0, "text": "I am ready means Я готов."},
                            {"start": 9.0, "end": 12.0, "text": "I am ready means Я готов for the action."},
                        ]
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            output_dir = tmp_path / "out"

            summary = montazher.build_pack(
                input_video=tmp_path / "raw.mp4",
                transcript_json=transcript_path,
                output_dir=output_dir,
                preset_path=ROOT / "presets" / "default_director.json",
                dry_run=True,
                render=False,
            )

            self.assertTrue((output_dir / "edit_decisions.json").exists())
            self.assertTrue((output_dir / "screen_text.json").exists())
            self.assertTrue((output_dir / "captions.srt").exists())
            self.assertTrue((output_dir / "timeline.csv").exists())
            self.assertTrue((output_dir / "review_plan.md").exists())
            self.assertTrue((output_dir / "manifest.json").exists())
            self.assertTrue((output_dir / "quality_report.md").exists())
            self.assertTrue((output_dir / "capcut_project.json").exists())
            self.assertEqual(summary["dry_run"], True)
            self.assertGreater(summary["screen_text_events"], 0)
```

- [ ] **Step 2: Run artifact test and verify it fails**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
```

Expected: FAIL because exporter functions and `build_pack` are not defined.

- [ ] **Step 3: Add timestamp and export helpers**

Append this code after `build_sfx_events`:

```python
def format_srt_timestamp(seconds: float) -> str:
    milliseconds_total = int(round(seconds * 1000))
    hours, remainder = divmod(milliseconds_total, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    whole_seconds, milliseconds = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{whole_seconds:02d},{milliseconds:03d}"


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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
            fieldnames=["segment_id", "source_start", "source_end", "output_start", "output_end", "duration", "text"],
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
```

- [ ] **Step 4: Add review, manifest, quality, and CapCut JSON writers**

Append this code after `write_timeline_csv`:

```python
def write_review_plan(
    output_dir: Path,
    decisions: list[EditDecision],
    screen_text: list[ScreenTextEvent],
    sfx_events: list[SfxEvent],
) -> None:
    selected = [item for item in decisions if item.decision_type == "take_selected"]
    rejected = [item for item in decisions if item.decision_type == "take_rejected"]
    cuts = [item for item in decisions if item.decision_type in {"pause_trimmed", "filler_trimmed"}]
    lines = [
        "# Lingman Montazher Review Plan",
        "",
        "## Selected Take Groups",
        "",
    ]
    lines.extend(f"- `{item.segment_id}` {item.source_start:.3f}-{item.source_end:.3f}: {item.text}" for item in selected)
    if not selected:
        lines.append("- No duplicate take group needed a special latest-take selection.")
    lines.extend(["", "## Rejected Duplicate Takes", ""])
    lines.extend(f"- `{item.segment_id}` {item.source_start:.3f}-{item.source_end:.3f}: {item.reason}" for item in rejected)
    if not rejected:
        lines.append("- No duplicate takes were rejected.")
    lines.extend(["", "## Major Cuts", ""])
    lines.extend(f"- `{item.decision_type}` {item.source_start:.3f}-{item.source_end:.3f}: {item.reason}" for item in cuts)
    if not cuts:
        lines.append("- No major cuts were needed.")
    lines.extend(["", "## Visual Accents", ""])
    lines.extend(f"- {event.start:.3f}-{event.end:.3f}: {event.text} ({event.animation})" for event in screen_text)
    if not screen_text:
        lines.append("- No screen text events were selected.")
    lines.extend(["", "## SFX Accents", ""])
    lines.extend(f"- {event.start:.3f}-{event.end:.3f}: {event.sfx_type} at volume {event.volume:.2f}" for event in sfx_events)
    if not sfx_events:
        lines.append("- No SFX accents were selected.")
    lines.extend(["", "## Suggested Manual Review Points", ""])
    lines.append("- Review every rejected duplicate take before rendering a final public upload.")
    lines.append("- Check that on-screen English phrases do not cover the speaker's face.")
    lines.append("- Listen to SFX levels against the voice track before publishing.")
    (output_dir / "review_plan.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def quality_lines(timeline: list[TimelineClip], screen_text: list[ScreenTextEvent], decisions: list[EditDecision]) -> list[str]:
    lines = ["# Lingman Montazher Quality Report", ""]
    if timeline:
        lines.append(f"- Final timeline duration: {timeline[-1].output_end:.3f}s")
    else:
        lines.append("- Final timeline duration: 0.000s")
    lines.append(f"- Kept clips: {len(timeline)}")
    lines.append(f"- Screen text events: {len(screen_text)}")
    lines.append(f"- Edit decisions: {len(decisions)}")
    overlap_count = 0
    for previous, current in zip(screen_text, screen_text[1:]):
        if current.start < previous.end:
            overlap_count += 1
    lines.append(f"- Screen text overlaps: {overlap_count}")
    invalid_ranges = [item for item in decisions if item.source_end <= item.source_start]
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
        "canvas": {"width": preset.output_width, "height": preset.output_height, "fps": preset.fps},
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
```

- [ ] **Step 5: Add file hashing and `build_pack` orchestration**

Append this code after `write_capcut_project_json`:

```python
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
    (output_dir / "quality_report.md").write_text("\n".join(quality_lines(timeline, screen_text, decisions)) + "\n", encoding="utf-8")
    write_capcut_project_json(output_dir, timeline, screen_text, sfx_events, preset)

    rendered = False
    render_command: list[str] | None = None
    if render and not dry_run:
        render_command = build_ffmpeg_render_command(input_video, output_dir / "final.mp4", timeline)
        run_command(render_command, cwd=output_dir)
        rendered = (output_dir / "final.mp4").exists()

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
        "screen_text_events": len(screen_text),
        "sfx_events": len(sfx_events),
        "files": [
            "edit_decisions.json",
            "screen_text.json",
            "captions.srt",
            "timeline.csv",
            "review_plan.md",
            "manifest.json",
            "quality_report.md",
            "capcut_project.json",
        ],
    }
    write_json(output_dir / "manifest.json", summary)
    return summary
```

- [ ] **Step 6: Add temporary render function names so tests can import**

Append this code after `build_pack`; Task 6 replaces the command body with full ffmpeg planning:

```python
def build_ffmpeg_render_command(input_video: Path, output_video: Path, timeline: list[TimelineClip]) -> list[str]:
    if not timeline:
        raise ValueError("Cannot render an empty timeline.")
    return [
        "ffmpeg",
        "-y",
        "-i",
        str(input_video),
        "-c",
        "copy",
        str(output_video),
    ]


def run_command(command: list[str], cwd: Path | None = None) -> None:
    subprocess.run(command, cwd=cwd, check=True)
```

- [ ] **Step 7: Run dry-run artifact tests**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
```

Expected: PASS.

- [ ] **Step 8: Commit artifact exports**

Run:

```powershell
git add -- lingman-montazher/lingman_montazher.py lingman-montazher/tests/test_lingman_montazher.py
git commit -m "feat: export Lingman montage artifacts"
```

---

### Task 6: Add ffmpeg Render Command Planning And CLI

**Files:**
- Modify: `lingman-montazher/lingman_montazher.py`
- Modify: `lingman-montazher/tests/test_lingman_montazher.py`
- Modify: `lingman-montazher/README.md`

- [ ] **Step 1: Add failing ffmpeg command test**

Append this test inside `LingmanMontazherTests`:

```python
    def test_ffmpeg_command_uses_valid_source_ranges(self):
        timeline = [
            montazher.TimelineClip("seg_0001", 0.0, 2.0, 0.0, 2.0, "I am ready."),
            montazher.TimelineClip("seg_0002", 4.0, 6.5, 2.0, 4.5, "This is the second clip."),
        ]

        command = montazher.build_ffmpeg_render_command(Path("raw.mp4"), Path("final.mp4"), timeline)
        command_text = " ".join(command)

        self.assertIn("trim=start=0.000:end=2.000", command_text)
        self.assertIn("trim=start=4.000:end=6.500", command_text)
        self.assertIn("concat=n=2:v=1:a=1", command_text)
        self.assertEqual(command[-1], "final.mp4")
```

- [ ] **Step 2: Run ffmpeg command test and verify it fails**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py::LingmanMontazherTests.test_ffmpeg_command_uses_valid_source_ranges -v
```

Expected: FAIL because `build_ffmpeg_render_command` still returns the temporary copy command.

- [ ] **Step 3: Replace ffmpeg command builder**

Replace `build_ffmpeg_render_command` with:

```python
def build_ffmpeg_render_command(input_video: Path, output_video: Path, timeline: list[TimelineClip]) -> list[str]:
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

    filter_complex = ";".join(filters) + ";" + "".join(concat_inputs) + f"concat=n={len(timeline)}:v=1:a=1[outv][outa]"
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
```

- [ ] **Step 4: Add CLI parser and main**

Append this code at the end of `lingman_montazher.py`:

```python
def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a director-style Lingman talking-head montage.")
    parser.add_argument("--input", required=True, help="Raw input video path.")
    parser.add_argument("--transcript-json", required=True, help="Timed transcript JSON path.")
    parser.add_argument("--output-dir", required=True, help="Output folder for montage artifacts.")
    parser.add_argument(
        "--preset",
        default=str(Path(__file__).resolve().parent / "presets" / "default_director.json"),
        help="Director preset JSON path.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Write artifacts without rendering final.mp4.")
    parser.add_argument("--render", action="store_true", help="Run ffmpeg and render final.mp4.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
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
```

- [ ] **Step 5: Update README commands**

Replace the dry-run section in `README.md` with:

```markdown
## Dry Run

```powershell
python lingman-montazher/lingman_montazher.py --input raw.mp4 --transcript-json transcript.json --output-dir lingman-montazher/outputs/demo --dry-run
```

Dry run writes all timeline, review, captions, screen text, manifest, and CapCut JSON artifacts without requiring ffmpeg or a real video file.

## Render

```powershell
python lingman-montazher/lingman_montazher.py --input raw.mp4 --transcript-json transcript.json --output-dir lingman-montazher/outputs/demo --render
```

Render mode requires ffmpeg and a real input file with video and audio streams.
```

- [ ] **Step 6: Run ffmpeg and CLI tests**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
python -m py_compile lingman-montazher/lingman_montazher.py
```

Expected: PASS and no compile errors.

- [ ] **Step 7: Commit CLI and render planning**

Run:

```powershell
git add -- lingman-montazher/lingman_montazher.py lingman-montazher/tests/test_lingman_montazher.py lingman-montazher/README.md
git commit -m "feat: add Lingman montage CLI"
```

---

### Task 7: Add Quality Checks And A Real Dry-Run Fixture

**Files:**
- Modify: `lingman-montazher/lingman_montazher.py`
- Modify: `lingman-montazher/tests/test_lingman_montazher.py`
- Create: `lingman-montazher/examples/demo_transcript.json`

- [ ] **Step 1: Add failing quality test**

Append this test inside `LingmanMontazherTests`:

```python
    def test_quality_report_flags_overlapping_screen_text(self):
        timeline = [montazher.TimelineClip("seg_0001", 0.0, 4.0, 0.0, 4.0, "I am ready.")]
        screen_text = [
            montazher.ScreenTextEvent(0.0, 2.0, "I am ready", "phrase", "lower_third", "style", "anim", "reason"),
            montazher.ScreenTextEvent(1.5, 3.0, "I am prepared", "phrase", "lower_third", "style", "anim", "reason"),
        ]
        decisions = [
            montazher.EditDecision("seg_0001", "keep", 0.0, 4.0, 0.0, 4.0, "Kept", 0.8, "I am ready.")
        ]

        lines = montazher.quality_lines(timeline, screen_text, decisions)

        self.assertIn("- Screen text overlaps: 1", lines)
```

- [ ] **Step 2: Run quality test**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py::LingmanMontazherTests.test_quality_report_flags_overlapping_screen_text -v
```

Expected: PASS if Task 5 already added overlap counting. If it fails, replace `quality_lines` with the Task 5 version exactly.

- [ ] **Step 3: Add demo transcript fixture**

Add this file:

```json
{
  "segments": [
    {
      "start": 0.0,
      "end": 2.2,
      "text": "Сегодня разберем фразу I am ready.",
      "speaker": "lingman"
    },
    {
      "start": 4.5,
      "end": 6.0,
      "text": "стоп, заново",
      "speaker": "lingman"
    },
    {
      "start": 8.0,
      "end": 11.4,
      "text": "Сегодня разберем фразу I am ready, потому что в английском нельзя сказать I ready.",
      "speaker": "lingman"
    },
    {
      "start": 13.0,
      "end": 16.5,
      "text": "I am ready значит я готов, и am здесь соединяет человека и состояние.",
      "speaker": "lingman"
    }
  ]
}
```

- [ ] **Step 4: Run a real dry run from the CLI**

Run:

```powershell
python lingman-montazher/lingman_montazher.py --input lingman-montazher/examples/raw-placeholder.mp4 --transcript-json lingman-montazher/examples/demo_transcript.json --output-dir lingman-montazher/outputs/demo --dry-run
```

Expected: command exits 0 and prints JSON summary with `"dry_run": true`, `"timeline_clips"` greater than 0, and `"screen_text_events"` greater than 0.

- [ ] **Step 5: Inspect generated artifacts**

Run:

```powershell
Get-ChildItem lingman-montazher\outputs\demo | Select-Object -ExpandProperty Name
```

Expected files:

```text
captions.srt
capcut_project.json
edit_decisions.json
manifest.json
quality_report.md
review_plan.md
screen_text.json
timeline.csv
```

- [ ] **Step 6: Commit fixture and quality pass**

Run:

```powershell
git add -- lingman-montazher/lingman_montazher.py lingman-montazher/tests/test_lingman_montazher.py lingman-montazher/examples/demo_transcript.json
git commit -m "test: add Lingman Montazher dry-run fixture"
```

---

### Task 8: Final Verification And Compatibility Check

**Files:**
- Modify: `lingman-montazher/README.md`

- [ ] **Step 1: Add final README verification section**

Append this to `README.md`:

```markdown
## Verification

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
python -m unittest lingman-scenarist-pipeline/tests/test_capcut_phrase_factory.py -v
python -m py_compile lingman-montazher/lingman_montazher.py
```

The Montazher tests verify transcript loading, latest-take selection, pause trimming, screen text timing, SFX timing, dry-run outputs, ffmpeg command planning, and quality report overlap detection.
```

- [ ] **Step 2: Run new pipeline tests**

Run:

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
```

Expected: PASS.

- [ ] **Step 3: Run existing Lingman CapCut tests**

Run:

```powershell
python -m unittest lingman-scenarist-pipeline/tests/test_capcut_phrase_factory.py -v
```

Expected: PASS. If this fails because of a pre-existing environment dependency, record the exact failure in the final implementation note and do not modify `lingman-scenarist-pipeline` unless the failure is caused by this work.

- [ ] **Step 4: Compile the new Python module**

Run:

```powershell
python -m py_compile lingman-montazher/lingman_montazher.py
```

Expected: no output and exit code 0.

- [ ] **Step 5: Check worktree only contains intended new pipeline changes**

Run:

```powershell
git status --short lingman-montazher docs\superpowers\plans\2026-05-24-lingman-montazher.md
```

Expected: only `lingman-montazher/` files if implementation changes are uncommitted, or no output if all implementation commits are complete.

- [ ] **Step 6: Commit README verification**

Run:

```powershell
git add -- lingman-montazher/README.md
git commit -m "docs: document Lingman Montazher verification"
```

## Plan Self-Review

Spec coverage:

- One long raw recording is represented by `--input`.
- Transcript-based editing is represented by `--transcript-json`.
- Latest complete take selection is implemented in Task 3.
- Pause and reset trimming are implemented in Task 3.
- Lesson continuity is covered in v1 through review artifacts, kept timeline, and quality reporting.
- Screen text, motion metadata, and SFX metadata are implemented in Tasks 4 and 5.
- ffmpeg render planning is implemented in Task 6.
- Reviewability is covered by `edit_decisions.json`, `review_plan.md`, `quality_report.md`, `timeline.csv`, and `manifest.json`.
- Existing Lingman behavior is protected by Task 8 compatibility tests.

Placeholder scan:

- The plan uses concrete file paths, commands, test code, and implementation code.
- No task depends on an undefined function after its implementation step.
- v1 choices are explicit: transcript JSON first, optional ffmpeg render, no B-roll search.

Type consistency:

- `DirectorPreset`, `TranscriptSegment`, `EditDecision`, `TimelineClip`, `ScreenTextEvent`, and `SfxEvent` names are consistent across tests and implementation.
- `build_pack`, `build_edit_decisions`, `assemble_timeline`, `select_screen_text_events`, and `build_ffmpeg_render_command` signatures are consistent across tasks.
