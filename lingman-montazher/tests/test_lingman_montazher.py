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


if __name__ == "__main__":
    unittest.main()
