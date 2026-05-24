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


if __name__ == "__main__":
    unittest.main()
