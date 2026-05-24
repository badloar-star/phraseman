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

Dry run writes all timeline, review, captions, screen text, manifest, and CapCut JSON artifacts without requiring ffmpeg or a real video file.

## Render

```powershell
python lingman-montazher/lingman_montazher.py --input raw.mp4 --transcript-json transcript.json --output-dir lingman-montazher/outputs/demo --render
```

Render mode requires ffmpeg and a real input file with video and audio streams.

## Outputs

- `edit_decisions.json`
- `screen_text.json`
- `captions.srt`
- `timeline.csv`
- `review_plan.md`
- `manifest.json`
- `quality_report.md`
- `capcut_project.json`

## Verification

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
python -m unittest lingman-scenarist-pipeline/tests/test_capcut_phrase_factory.py -v
python -m py_compile lingman-montazher/lingman_montazher.py
```

The Montazher tests verify transcript loading, latest-take selection, pause trimming, screen text timing, SFX timing, dry-run outputs, ffmpeg command planning, and quality report overlap detection.
