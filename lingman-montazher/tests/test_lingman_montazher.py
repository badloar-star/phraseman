import csv
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
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

    def test_srt_timestamp_rounds_to_caption_shape(self):
        self.assertEqual(montazher.format_srt_timestamp(0.0), "00:00:00,000")
        self.assertEqual(montazher.format_srt_timestamp(62.3456), "00:01:02,346")
        self.assertRegex(montazher.format_srt_timestamp(3661.2), r"^\d{2}:\d{2}:\d{2},\d{3}$")

    def test_timeline_csv_writes_header_and_clip_rows(self):
        timeline = [
            montazher.TimelineClip(
                segment_id="seg_0001",
                source_start=0.0,
                source_end=2.25,
                output_start=0.0,
                output_end=2.25,
                text="The phrase is I am ready.",
            ),
            montazher.TimelineClip(
                segment_id="seg_0002",
                source_start=4.0,
                source_end=6.0,
                output_start=2.6,
                output_end=4.6,
                text="I am ready means I am prepared.",
            ),
        ]

        with tempfile.TemporaryDirectory() as tmp:
            csv_path = Path(tmp) / "timeline.csv"

            montazher.write_timeline_csv(csv_path, timeline)

            with csv_path.open(newline="", encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))

        self.assertEqual(
            rows[0].keys(),
            {
                "segment_id",
                "source_start",
                "source_end",
                "output_start",
                "output_end",
                "duration",
                "text",
            },
        )
        self.assertEqual([row["segment_id"] for row in rows], ["seg_0001", "seg_0002"])
        self.assertEqual(rows[0]["duration"], "2.250")
        self.assertEqual(rows[1]["output_start"], "2.600")

    def test_ffmpeg_command_uses_valid_source_ranges_and_codecs(self):
        timeline = [
            montazher.TimelineClip("seg_0001", 0.0, 2.0, 0.0, 2.0, "I am ready."),
            montazher.TimelineClip("seg_0002", 4.0, 6.5, 2.0, 4.5, "This is the second clip."),
        ]

        command = montazher.build_ffmpeg_render_command(Path("raw.mp4"), Path("final.mp4"), timeline)
        command_text = " ".join(command)

        self.assertIn("trim=start=0.000:end=2.000", command_text)
        self.assertIn("atrim=start=0.000:end=2.000", command_text)
        self.assertIn("trim=start=4.000:end=6.500", command_text)
        self.assertIn("atrim=start=4.000:end=6.500", command_text)
        self.assertIn("concat=n=2:v=1:a=1", command_text)
        self.assertIn("[outv]", command)
        self.assertIn("[outa]", command)
        self.assertIn("libx264", command)
        self.assertIn("aac", command)
        self.assertEqual(command[-1], "final.mp4")

    def test_ffmpeg_command_rejects_empty_timeline(self):
        with self.assertRaisesRegex(ValueError, "empty timeline"):
            montazher.build_ffmpeg_render_command(Path("raw.mp4"), Path("final.mp4"), [])

    def test_cli_dry_run_prints_json_summary_without_rendering(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            transcript_path = tmp_path / "transcript.json"
            transcript_path.write_text(
                json.dumps(
                    {
                        "segments": [
                            {"start": 0.0, "end": 2.0, "text": "Today we start with I am ready."},
                            {"start": 4.0, "end": 7.0, "text": "I am ready means I am prepared."},
                        ]
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            output_dir = tmp_path / "out"
            stdout = io.StringIO()

            with redirect_stdout(stdout):
                exit_code = montazher.main(
                    [
                        "--input",
                        str(tmp_path / "raw.mp4"),
                        "--transcript-json",
                        str(transcript_path),
                        "--output-dir",
                        str(output_dir),
                        "--dry-run",
                    ]
                )

            summary = json.loads(stdout.getvalue())
            manifest_exists = (output_dir / "manifest.json").exists()

        self.assertEqual(exit_code, 0)
        self.assertTrue(summary["dry_run"])
        self.assertFalse(summary["render_requested"])
        self.assertFalse(summary["rendered"])
        self.assertIsNone(summary["render_command"])
        self.assertGreater(summary["timeline_clips"], 0)
        self.assertTrue(manifest_exists)

    def test_render_with_relative_paths_uses_absolute_ffmpeg_paths_without_cwd(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            (tmp_path / "raw.mp4").write_bytes(b"placeholder video")
            (tmp_path / "transcript.json").write_text(
                json.dumps(
                    {
                        "segments": [
                            {"start": 0.0, "end": 2.0, "text": "Today we start with I am ready."},
                            {"start": 4.0, "end": 7.0, "text": "I am ready means I am prepared."},
                        ]
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            calls = []

            def fake_run_command(command, cwd=None):
                calls.append((command, cwd))
                Path(command[-1]).write_bytes(b"rendered video")

            original_cwd = Path.cwd()
            original_run_command = montazher.run_command
            try:
                os.chdir(tmp_path)
                montazher.run_command = fake_run_command

                summary = montazher.build_pack(
                    input_video=Path("raw.mp4"),
                    transcript_json=Path("transcript.json"),
                    output_dir=Path("out"),
                    preset_path=ROOT / "presets" / "default_director.json",
                    dry_run=False,
                    render=True,
                )
            finally:
                montazher.run_command = original_run_command
                os.chdir(original_cwd)

        self.assertEqual(len(calls), 1)
        command, cwd = calls[0]
        input_index = command.index("-i") + 1
        self.assertIsNone(cwd)
        self.assertTrue(Path(command[input_index]).is_absolute())
        self.assertTrue(Path(command[-1]).is_absolute())
        self.assertEqual(Path(command[input_index]), tmp_path / "raw.mp4")
        self.assertEqual(Path(command[-1]), tmp_path / "out" / "final.mp4")
        self.assertTrue(summary["rendered"])
        self.assertEqual(summary["input_video"], str(tmp_path / "raw.mp4"))
        self.assertEqual(summary["transcript_json"], str(tmp_path / "transcript.json"))

    def test_dry_run_writes_required_artifacts_with_manifest_and_capcut_schema(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            transcript_path = tmp_path / "transcript.json"
            transcript_path.write_text(
                json.dumps(
                    {
                        "segments": [
                            {"start": 0.0, "end": 2.0, "text": "Today we start with I am ready."},
                            {"start": 4.0, "end": 7.0, "text": "I am ready means I am prepared."},
                            {"start": 9.0, "end": 12.0, "text": "I am ready means I am prepared for action."},
                            {
                                "start": 15.0,
                                "end": 18.0,
                                "text": "You need am because English connects subject and state.",
                            },
                        ]
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            output_dir = tmp_path / "out"
            expected_files = {
                "edit_decisions.json",
                "screen_text.json",
                "captions.srt",
                "timeline.csv",
                "review_plan.md",
                "manifest.json",
                "quality_report.md",
                "capcut_project.json",
            }

            summary = montazher.build_pack(
                input_video=tmp_path / "raw.mp4",
                transcript_json=transcript_path,
                output_dir=output_dir,
                preset_path=ROOT / "presets" / "default_director.json",
                dry_run=True,
                render=False,
            )

            for filename in expected_files:
                self.assertTrue((output_dir / filename).exists(), filename)

            manifest = json.loads((output_dir / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(summary, manifest)
            self.assertEqual(manifest["dry_run"], True)
            self.assertFalse(manifest["rendered"])
            self.assertEqual(manifest["segments"], 4)
            self.assertGreater(manifest["timeline_clips"], 0)
            self.assertGreater(manifest["timeline_duration"], 0.0)
            self.assertGreater(manifest["screen_text_events"], 0)
            self.assertEqual(set(manifest["files"]), expected_files)
            self.assertIsNone(manifest["input_sha256"])
            self.assertRegex(manifest["transcript_sha256"], r"^[0-9a-f]{64}$")

            screen_text = json.loads((output_dir / "screen_text.json").read_text(encoding="utf-8"))
            self.assertEqual(len(screen_text), manifest["screen_text_events"])

            captions = (output_dir / "captions.srt").read_text(encoding="utf-8")
            self.assertRegex(captions, r"1\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n")

            with (output_dir / "timeline.csv").open(newline="", encoding="utf-8") as handle:
                timeline_rows = list(csv.DictReader(handle))
            self.assertEqual(len(timeline_rows), manifest["timeline_clips"])
            self.assertEqual(
                list(timeline_rows[0].keys()),
                ["segment_id", "source_start", "source_end", "output_start", "output_end", "duration", "text"],
            )

            capcut = json.loads((output_dir / "capcut_project.json").read_text(encoding="utf-8"))
            self.assertEqual(capcut["schema"], "lingman.montazher.capcut_project.v1")
            self.assertEqual(set(capcut["tracks"]), {"video", "text", "sfx"})
            self.assertEqual(len(capcut["tracks"]["video"]), manifest["timeline_clips"])
            self.assertEqual(len(capcut["tracks"]["text"]), manifest["screen_text_events"])
            self.assertEqual(len(capcut["tracks"]["sfx"]), manifest["sfx_events"])

            quality_report = (output_dir / "quality_report.md").read_text(encoding="utf-8")
            self.assertIn("- Screen text overlaps: 0", quality_report)

    def test_quality_report_flags_overlapping_screen_text(self):
        timeline = [
            montazher.TimelineClip("seg_0001", 0.0, 4.0, 0.0, 4.0, "I am ready.")
        ]
        screen_text = [
            montazher.ScreenTextEvent(
                0.0,
                2.0,
                "I am ready",
                "phrase",
                "lower_third",
                "style",
                "anim",
                "reason",
            ),
            montazher.ScreenTextEvent(
                1.5,
                3.0,
                "I am prepared",
                "phrase",
                "lower_third",
                "style",
                "anim",
                "reason",
            ),
        ]
        decisions = [
            montazher.EditDecision(
                "seg_0001",
                "keep",
                0.0,
                4.0,
                0.0,
                4.0,
                "Kept",
                0.8,
                "I am ready.",
            )
        ]

        lines = montazher.quality_lines(timeline, screen_text, decisions)

        self.assertIn("- Screen text overlaps: 1", lines)

    def test_quality_report_counts_nested_screen_text_overlaps(self):
        timeline = [
            montazher.TimelineClip("seg_0001", 0.0, 10.0, 0.0, 10.0, "I am ready.")
        ]
        screen_text = [
            montazher.ScreenTextEvent(
                0.0,
                10.0,
                "I am ready",
                "phrase",
                "lower_third",
                "style",
                "anim",
                "reason",
            ),
            montazher.ScreenTextEvent(
                1.0,
                2.0,
                "I am prepared",
                "phrase",
                "lower_third",
                "style",
                "anim",
                "reason",
            ),
            montazher.ScreenTextEvent(
                3.0,
                4.0,
                "I am confident",
                "phrase",
                "lower_third",
                "style",
                "anim",
                "reason",
            ),
        ]
        decisions = [
            montazher.EditDecision(
                "seg_0001",
                "keep",
                0.0,
                10.0,
                0.0,
                10.0,
                "Kept",
                0.8,
                "I am ready.",
            )
        ]

        lines = montazher.quality_lines(timeline, screen_text, decisions)

        self.assertIn("- Screen text overlaps: 2", lines)


if __name__ == "__main__":
    unittest.main()
