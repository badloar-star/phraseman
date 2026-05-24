import json
import sys
import tempfile
import unittest
from dataclasses import asdict
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

    def test_transcript_loader_maps_valid_segments(self):
        with tempfile.TemporaryDirectory() as tmp:
            transcript_path = Path(tmp) / "transcript.json"
            transcript_path.write_text(
                json.dumps(
                    {
                        "segments": [
                            {"start": 0.0, "end": 2.0, "text": "Hello, today we start.", "speaker": "lingman"},
                            {"start": 2.4, "end": 5.0, "text": "I am ready means Я готов.", "speaker": "student"},
                        ]
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            segments = montazher.load_transcript(transcript_path)

        self.assertEqual(len(segments), 2)
        self.assertEqual(segments[0].segment_id, "seg_0001")
        self.assertEqual(segments[1].segment_id, "seg_0002")
        self.assertAlmostEqual(segments[1].duration, 2.6)
        self.assertEqual(segments[1].speaker, "student")

    def test_transcript_loader_rejects_invalid_ranges(self):
        with tempfile.TemporaryDirectory() as tmp:
            transcript_path = Path(tmp) / "bad_transcript.json"
            transcript_path.write_text(
                json.dumps({"segments": [{"start": 3.0, "end": 2.0, "text": "Broken"}]}),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "end must be greater than start"):
                montazher.load_transcript(transcript_path)

    def test_transcript_loader_defaults_blank_speaker_and_counts_words(self):
        with tempfile.TemporaryDirectory() as tmp:
            transcript_path = Path(tmp) / "transcript.json"
            transcript_path.write_text(
                json.dumps({"segments": [{"start": 1.0, "end": 3.0, "text": "I'm ready, Я готов.", "speaker": " "}]}),
                encoding="utf-8",
            )

            segments = montazher.load_transcript(transcript_path)

        self.assertEqual(segments[0].speaker, "lingman")
        self.assertEqual(segments[0].word_count, 4)

    def test_transcript_loader_requires_segments_list(self):
        with tempfile.TemporaryDirectory() as tmp:
            transcript_path = Path(tmp) / "bad_transcript.json"
            transcript_path.write_text(json.dumps({"segments": {}}), encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "segments must be a list"):
                montazher.load_transcript(transcript_path)

    def test_transcript_loader_rejects_empty_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            transcript_path = Path(tmp) / "bad_transcript.json"
            transcript_path.write_text(
                json.dumps({"segments": [{"start": 1.0, "end": 2.0, "text": " "}]}),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "text must not be empty"):
                montazher.load_transcript(transcript_path)

    def test_transcript_loader_rejects_non_finite_timestamps(self):
        bad_segments = [
            {"start": float("nan"), "end": 2.0, "text": "Broken"},
            {"start": 1.0, "end": float("inf"), "text": "Broken"},
        ]

        for bad_segment in bad_segments:
            with self.subTest(bad_segment=bad_segment):
                with tempfile.TemporaryDirectory() as tmp:
                    transcript_path = Path(tmp) / "bad_transcript.json"
                    transcript_path.write_text(
                        json.dumps({"segments": [bad_segment]}),
                        encoding="utf-8",
                    )

                    with self.assertRaisesRegex(ValueError, "finite"):
                        montazher.load_transcript(transcript_path)

    def test_transcript_loader_rejects_non_string_text(self):
        for bad_text in (["Broken"], None):
            with self.subTest(bad_text=bad_text):
                with tempfile.TemporaryDirectory() as tmp:
                    transcript_path = Path(tmp) / "bad_transcript.json"
                    transcript_path.write_text(
                        json.dumps({"segments": [{"start": 1.0, "end": 2.0, "text": bad_text}]}),
                        encoding="utf-8",
                    )

                    with self.assertRaisesRegex(ValueError, "text must be a string"):
                        montazher.load_transcript(transcript_path)

    def test_transcript_loader_rejects_non_string_speaker(self):
        for bad_speaker in ({}, [], 123):
            with self.subTest(bad_speaker=bad_speaker):
                with tempfile.TemporaryDirectory() as tmp:
                    transcript_path = Path(tmp) / "bad_transcript.json"
                    transcript_path.write_text(
                        json.dumps(
                            {"segments": [{"start": 1.0, "end": 2.0, "text": "Broken", "speaker": bad_speaker}]}
                        ),
                        encoding="utf-8",
                    )

                    with self.assertRaisesRegex(ValueError, "speaker must be a string"):
                        montazher.load_transcript(transcript_path)

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

        kept = [item.segment_id for item in decisions if item.decision_type == "keep"]
        self.assertEqual(kept, ["seg_0003"])
        json.dumps([asdict(item) for item in decisions])

    def test_later_complete_take_rejects_false_start_attempt(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")
        segments = [
            montazher.TranscriptSegment("seg_0001", 0.0, 0.8, "I am ready means"),
            montazher.TranscriptSegment("seg_0002", 3.0, 6.0, "I am ready means I am prepared now."),
        ]

        decisions = montazher.build_edit_decisions(segments, preset)

        self.assertFalse(montazher.is_complete_take(segments[0], preset))
        self.assertTrue(montazher.is_complete_take(segments[1], preset))
        self.assertEqual(
            [item.segment_id for item in decisions if item.decision_type == "take_selected"],
            ["seg_0002"],
        )
        self.assertEqual(
            [item.segment_id for item in decisions if item.decision_type == "take_rejected"],
            ["seg_0001"],
        )
        self.assertEqual(
            [item.segment_id for item in decisions if item.decision_type == "keep"],
            ["seg_0002"],
        )

    def test_reset_marker_uses_token_boundary_phrase_matching(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")
        segments = [
            montazher.TranscriptSegment("seg_0001", 0.0, 0.6, "wrong take!"),
            montazher.TranscriptSegment(
                "seg_0002",
                2.0,
                5.0,
                "The wrong takeaway is that I am ready means I am prepared.",
            ),
        ]

        decisions = montazher.build_edit_decisions(segments, preset)

        self.assertTrue(montazher.is_reset_segment(segments[0], preset))
        self.assertFalse(montazher.is_reset_segment(segments[1], preset))
        self.assertEqual(
            [item.segment_id for item in decisions if item.decision_type == "filler_trimmed"],
            ["seg_0001"],
        )
        self.assertEqual(
            [item.segment_id for item in decisions if item.decision_type == "keep"],
            ["seg_0002"],
        )

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
        self.assertEqual(
            [item.segment_id for item in decisions if item.decision_type == "keep"],
            ["seg_0001", "seg_0003"],
        )

    def test_pause_trim_uses_kept_timeline_after_reset_cut(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")
        segments = [
            montazher.TranscriptSegment("seg_0001", 0.0, 2.0, "Today we start with I am ready."),
            montazher.TranscriptSegment("seg_0002", 4.0, 4.8, "заново"),
            montazher.TranscriptSegment("seg_0003", 7.0, 9.0, "I am ready means Я готов."),
        ]

        decisions = montazher.build_edit_decisions(segments, preset)
        pause_trimmed = [item for item in decisions if item.decision_type == "pause_trimmed"]

        self.assertEqual([item.segment_id for item in pause_trimmed], ["seg_0001->seg_0003"])
        self.assertAlmostEqual(pause_trimmed[0].source_start, 3.6)
        self.assertAlmostEqual(pause_trimmed[0].source_end, 7.0)
        self.assertEqual(
            [item.segment_id for item in decisions if item.decision_type == "keep"],
            ["seg_0001", "seg_0003"],
        )

    def test_assemble_timeline_uses_only_keep_decisions_sorted_by_output(self):
        decisions = [
            montazher.EditDecision(
                segment_id="seg_rejected",
                decision_type="take_rejected",
                source_start=0.0,
                source_end=1.0,
                output_start=None,
                output_end=None,
                reason="earlier duplicate",
                confidence=0.9,
                text="Not this one.",
            ),
            montazher.EditDecision(
                segment_id="seg_0002",
                decision_type="keep",
                source_start=5.0,
                source_end=7.0,
                output_start=2.0,
                output_end=4.0,
                reason="kept clip",
                confidence=1.0,
                text="Second kept clip.",
            ),
            montazher.EditDecision(
                segment_id="seg_0001",
                decision_type="keep",
                source_start=1.0,
                source_end=2.5,
                output_start=0.0,
                output_end=1.5,
                reason="kept clip",
                confidence=1.0,
                text="First kept clip.",
            ),
        ]

        timeline = montazher.assemble_timeline(decisions)

        self.assertEqual([clip.segment_id for clip in timeline], ["seg_0001", "seg_0002"])
        self.assertEqual([(clip.output_start, clip.output_end) for clip in timeline], [(0.0, 1.5), (2.0, 4.0)])
        self.assertAlmostEqual(timeline[0].duration, 1.5)
        self.assertEqual(timeline[1].source_start, 5.0)
        json.dumps([asdict(clip) for clip in timeline])

    def test_screen_text_selects_english_phrases_with_readable_duration(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")
        segments = [
            montazher.TranscriptSegment("seg_0001", 0.0, 2.5, "The phrase is I am ready."),
            montazher.TranscriptSegment("seg_0002", 3.0, 5.0, "Not I ready, but I am ready."),
        ]

        timeline = montazher.assemble_timeline(montazher.build_edit_decisions(segments, preset))
        events = montazher.select_screen_text_events(timeline, preset)

        self.assertGreaterEqual(len(events), 2)
        self.assertEqual([event.text for event in events[:2]], ["I am ready", "I am ready"])
        self.assertTrue(all(event.duration >= preset.min_screen_text_duration for event in events))
        self.assertTrue(all(event.start >= 0.0 for event in events))
        self.assertTrue(all(event.end <= timeline[-1].output_end for event in events))
        self.assertTrue(all(current.start >= previous.end for previous, current in zip(events, events[1:])))
        self.assertTrue(all(event.position == preset.text_position for event in events))
        self.assertTrue(all(event.style == preset.text_style for event in events))
        self.assertTrue(all(event.animation == preset.text_animation for event in events))
        self.assertTrue(all(event.role in {"phrase", "correction"} for event in events))
        json.dumps([asdict(event) for event in events])

    def test_screen_text_selects_full_standalone_pronoun_be_phrase(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")
        timeline = [
            montazher.TimelineClip(
                segment_id="seg_0001",
                source_start=0.0,
                source_end=2.0,
                output_start=0.0,
                output_end=2.0,
                text="I am ready.",
            )
        ]

        events = montazher.select_screen_text_events(timeline, preset)

        self.assertEqual([event.text for event in events], ["I am ready"])
        self.assertTrue(all(event.duration >= preset.min_screen_text_duration for event in events))
        self.assertTrue(all(0.0 <= event.start < event.end <= timeline[-1].output_end for event in events))

    def test_screen_text_ignores_unmarked_explanatory_narration(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")
        timeline = [
            montazher.TimelineClip(
                segment_id="seg_0001",
                source_start=0.0,
                source_end=5.0,
                output_start=0.0,
                output_end=5.0,
                text="This is a normal explanatory sentence with many words but no quoted phrase.",
            )
        ]

        events = montazher.select_screen_text_events(timeline, preset)

        self.assertEqual(events, [])

    def test_sfx_events_are_inside_timeline(self):
        preset = montazher.load_preset(ROOT / "presets" / "default_director.json")
        segments = [
            montazher.TranscriptSegment("seg_0001", 0.0, 2.0, "I am ready means I am prepared."),
            montazher.TranscriptSegment(
                "seg_0002",
                4.0,
                6.0,
                "You need am because English connects subject and state.",
            ),
        ]

        timeline = montazher.assemble_timeline(montazher.build_edit_decisions(segments, preset))
        screen_text = montazher.select_screen_text_events(timeline, preset)
        sfx = montazher.build_sfx_events(screen_text, timeline, volume=preset.sfx_volume)

        self.assertTrue(sfx)
        final_end = timeline[-1].output_end
        self.assertEqual(len(sfx), len(screen_text))
        self.assertTrue(all(0 <= event.start < event.end <= final_end for event in sfx))
        self.assertTrue(all(event.sfx_type == "soft_pop" for event in sfx))
        self.assertTrue(all(event.volume == preset.sfx_volume for event in sfx))
        self.assertTrue(all(event.end - event.start <= 0.18 for event in sfx))
        json.dumps([asdict(event) for event in sfx])


if __name__ == "__main__":
    unittest.main()
