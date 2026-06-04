from __future__ import annotations

import unittest
import tempfile
import json
from pathlib import Path

from lingman_montazher_test_import import load_validator


ROOT = Path(__file__).resolve().parents[1]
validator = load_validator(ROOT / "tools" / "validate_review_manifest.py")
builder = load_validator(ROOT / "tools" / "build_silence_review_manifest.py")
director = load_validator(ROOT / "tools" / "build_director_pass.py")
renderer = load_validator(ROOT / "tools" / "render_director_pass.py")
multimodal = load_validator(ROOT / "tools" / "build_multimodal_edl.py")
style_extractor = load_validator(ROOT / "tools" / "extract_capcut_reference_style.py")


class ReviewManifestTest(unittest.TestCase):
    def test_sample_manifest_is_valid(self) -> None:
        manifest = validator.load_manifest(ROOT / "data" / "sample-review.json")

        errors = validator.validate_manifest(manifest)

        self.assertEqual([], errors)

    def test_rejects_backwards_source_range(self) -> None:
        manifest = validator.load_manifest(ROOT / "data" / "sample-review.json")
        manifest["editDecisions"][0]["sourceEnd"] = manifest["editDecisions"][0]["sourceStart"]

        errors = validator.validate_manifest(manifest)

        self.assertIn("editDecisions[0] source range must increase", errors)

    def test_rejects_too_short_screen_text(self) -> None:
        manifest = validator.load_manifest(ROOT / "data" / "sample-review.json")
        manifest["screenText"][0]["end"] = manifest["screenText"][0]["start"] + 0.4

        errors = validator.validate_manifest(manifest)

        self.assertIn("screenText[0] must stay visible for at least 1.2 seconds", errors)

    def test_tail_warning_targets_real_tail_cut_id(self) -> None:
        probe = {
            "streams": [
                {
                    "codec_type": "video",
                    "avg_frame_rate": "30/1",
                    "width": 1920,
                    "height": 1080,
                }
            ],
            "format": {"duration": "50.0"},
        }
        silence_log = "\n".join(
            [
                "[silencedetect] silence_start: 5.0",
                "[silencedetect] silence_end: 7.0 | silence_duration: 2.0",
                "[silencedetect] silence_start: 10.0",
                "[silencedetect] silence_end: 50.0 | silence_duration: 40.0",
            ]
        )

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            probe_path = tmp_path / "ffprobe.json"
            silence_path = tmp_path / "silence.log"
            probe_path.write_text(json.dumps(probe), encoding="utf-8")
            silence_path.write_text(silence_log, encoding="utf-8")

            manifest = builder.build_manifest(
                probe_path,
                silence_path,
                "raw.mp4",
                cut_threshold=1.2,
            )

        self.assertEqual(manifest["quality"]["warnings"][0]["targetId"], "cut_002")

    def test_whisper_ndjson_loader_accepts_unescaped_quotes(self) -> None:
        dirty_line = '{"start":26957,"end":29837,"text":"фраза получается "She is ready"."}'

        with tempfile.TemporaryDirectory() as tmp:
            transcript_path = Path(tmp) / "transcript.ndjson"
            transcript_path.write_text(dirty_line + "\n", encoding="utf-8")

            items = director.load_transcript_ndjson(transcript_path)

        self.assertEqual(1, len(items))
        self.assertEqual(26.957, items[0].start)
        self.assertEqual(29.837, items[0].end)
        self.assertIn('"She is ready"', items[0].text)

    def test_renderer_builds_zoom_and_subtitle_graph(self) -> None:
        manifest = {
            "editDecisions": [
                {
                    "id": "clip_001",
                    "sourceStart": 1.0,
                    "sourceEnd": 3.5,
                    "decision": "take_selected",
                }
            ],
            "motionEffects": [{"targetId": "clip_001", "zoom": 1.065}],
        }

        graph = renderer.build_filter_graph(manifest, Path("screen-text.ass"))

        self.assertIn("scale=2046:1150", graph)
        self.assertIn("crop=1920:1080", graph)
        self.assertIn("subtitles=filename='screen-text.ass'", graph)
        self.assertIn("[acat]anull[aout]", graph)

    def test_director_does_not_reject_unavailable_transcripts_as_duplicates(self) -> None:
        decisions = [
            {
                "id": "clip_001",
                "sourceStart": 0.0,
                "sourceEnd": 12.0,
                "decision": "keep",
                "transcript": "Transcript unavailable for this clip.",
            },
            {
                "id": "clip_002",
                "sourceStart": 15.0,
                "sourceEnd": 27.0,
                "decision": "keep",
                "transcript": "Transcript unavailable for this clip.",
            },
        ]

        rejected = director.retake_candidates(decisions)

        self.assertEqual(set(), rejected)

    def test_screen_text_promotes_ready_correction(self) -> None:
        decisions = [
            {
                "id": "clip_001",
                "sourceStart": 0.0,
                "sourceEnd": 5.0,
                "outputStart": 0.0,
                "outputEnd": 5.0,
                "decision": "keep",
                "transcript": "Например: She ready. А правильно She is ready.",
            }
        ]

        events = director.build_screen_text(decisions)

        self.assertEqual("correction", events[0]["role"])
        self.assertEqual("She ready -> She is ready", events[0]["text"])

    def test_contextual_reset_marker_does_not_treat_snachala_as_restart(self) -> None:
        self.assertFalse(director.has_reset_marker("Сначала проверьте am, is или are."))
        self.assertTrue(director.has_reset_marker("Стоп, давай заново."))

    def test_timed_phrase_uses_phrase_position_inside_transcript_item(self) -> None:
        item = director.TranscriptItem(
            start=10.0,
            end=14.0,
            text='Сейчас нормальная фраза получается "She is ready".',
        )

        phrases = director.extract_timed_phrases(item)

        self.assertEqual("She is ready", phrases[0].text)
        self.assertGreater(phrases[0].source_start, 12.0)

    def test_source_to_output_maps_after_micro_cuts(self) -> None:
        decisions = [
            {
                "decision": "keep",
                "sourceStart": 10.0,
                "sourceEnd": 20.0,
                "outputStart": 3.0,
                "outputEnd": 13.0,
            }
        ]

        self.assertEqual(7.5, director.source_to_output_time(decisions, 14.5))

    def test_renderer_side_panel_pads_video_for_phrase_column(self) -> None:
        manifest = {
            "editDecisions": [
                {
                    "id": "clip_001",
                    "sourceStart": 1.0,
                    "sourceEnd": 3.5,
                    "decision": "keep",
                }
            ],
            "motionEffects": [{"targetId": "clip_001", "zoom": 1.0}],
        }

        graph = renderer.build_filter_graph(manifest, Path("screen-text.ass"), layout="side-panel", include_sfx=True)

        self.assertIn("crop=1440:1080", graph)
        self.assertIn("pad=1920:1080:0:0:black", graph)
        self.assertIn("amix=inputs=2", graph)

    def test_contextual_text_drops_component_when_full_phrase_is_nearby(self) -> None:
        events = [
            {
                "id": "text_001",
                "start": 10.0,
                "end": 11.3,
                "text": "I am here",
                "role": "phrase",
            },
            {
                "id": "text_002",
                "start": 10.8,
                "end": 12.0,
                "text": "am",
                "role": "phrase",
            },
        ]

        filtered = director.filter_contextual_screen_text(events)

        self.assertEqual(1, len(filtered))
        self.assertEqual("I am here", filtered[0]["text"])

    def test_astats_metadata_parser_builds_energy_windows_and_spikes(self) -> None:
        astats_log = "\n".join(
            [
                "frame:0    pts:0       pts_time:0.000",
                "lavfi.astats.Overall.RMS_level=-24.0",
                "lavfi.astats.Overall.Peak_level=-3.0",
                "lavfi.astats.Overall.Max_difference=0.16",
                "frame:1    pts:12000   pts_time:0.250",
                "lavfi.astats.Overall.RMS_level=-31.0",
                "lavfi.astats.Overall.Peak_level=-12.0",
                "lavfi.astats.Overall.Max_difference=0.02",
            ]
        )

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "astats.log"
            path.write_text(astats_log, encoding="utf-8")

            windows = multimodal.parse_astats_metadata(path)
            spikes = multimodal.detect_sync_spikes(windows)

        self.assertEqual(2, len(windows))
        self.assertEqual(-24.0, windows[0]["rmsLevel"])
        self.assertEqual(-3.0, windows[0]["peakLevel"])
        self.assertEqual(0.25, windows[0]["duration"])
        self.assertEqual(1, len(spikes))

    def test_multimodal_take_groups_mark_latest_variant(self) -> None:
        chunks = [
            multimodal.SpeechChunk(
                start=10.0,
                end=16.0,
                text="She ready is wrong. The correct phrase is she is ready.",
                transcript_ids=[0],
            ),
            multimodal.SpeechChunk(
                start=25.0,
                end=31.0,
                text="She ready is wrong. The correct phrase is she is ready.",
                transcript_ids=[1],
            ),
        ]

        groups = multimodal.build_take_groups(chunks, director)

        self.assertEqual(1, len(groups))
        self.assertEqual("reject_earlier_variant", groups[0]["members"][0]["role"])
        self.assertEqual("keep_latest_variant", groups[0]["members"][1]["role"])

    def test_multimodal_edl_keeps_capcut_editable_and_remotion_render_only(self) -> None:
        manifest = {
            "project": {
                "title": "Professor Lingman",
                "sourceFile": "input/current-video.mp4",
                "duration": 20.0,
                "editedDuration": 4.0,
            },
            "editDecisions": [
                {
                    "id": "clip_001",
                    "sourceStart": 10.0,
                    "sourceEnd": 14.0,
                    "outputStart": 0.0,
                    "outputEnd": 4.0,
                    "decision": "take_selected",
                    "transcript": "She is ready.",
                }
            ],
            "screenText": [
                {
                    "id": "text_001",
                    "start": 1.0,
                    "end": 2.6,
                    "text": "She is ready",
                    "role": "phrase",
                    "sfxVariant": 0,
                }
            ],
            "motionEffects": [],
        }
        analysis = {
            "audio": {"silenceRanges": []},
            "speech": {"takeGroups": []},
            "emotionEnergy": {"segments": [{"sourceStart": 10.0, "sourceEnd": 14.0, "score": 0.7}]},
            "artifacts": {},
        }

        edl = multimodal.build_edl(manifest, analysis)

        self.assertTrue(edl["exporters"]["capcut"]["editableProject"])
        self.assertTrue(edl["exporters"]["capcut"]["default"])
        self.assertFalse(edl["exporters"]["remotion"]["finalMp4Export"])
        self.assertFalse(edl["timeline"]["screenText"][0]["capcutPolicy"]["manualKeyframes"])

    def test_reference_style_extractor_reads_text_content_json(self) -> None:
        material = {
            "content": json.dumps({"text": "She is ready", "styles": []}),
            "font_size": 5.0,
            "text_color": "#FFFFFF",
            "line_max_width": 0.82,
        }

        summary = style_extractor.material_summary(material)

        self.assertEqual("She is ready", summary["text"])
        self.assertEqual(5.0, summary["fontSize"])


if __name__ == "__main__":
    unittest.main()
