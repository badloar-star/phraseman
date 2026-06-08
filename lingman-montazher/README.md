# Lingman Montazher

Lingman Montazher is the local review and editing workspace for Professor Lingman talking-head YouTube lessons.

This first slice is the **Review Desk**: a browser page for checking the edit plan before any heavy render step.

## Run The Review Desk

```powershell
python lingman-montazher/server.py --port 4179
```

Open:

```text
http://localhost:4179/review-desk/
```

Open this Review Desk URL when you want the editor, timeline, screen text rows, and manual decision controls.
Direct `/runs/...mp4` links open only the rendered video file in the browser.

The page loads `../data/sample-review.json` by default. You can also import a manifest JSON and attach a local raw video file from the toolbar. When the custom server is running, attached videos are copied into `lingman-montazher/input/` so the automation can inspect and process them.

## Manifest Contract

The review desk expects a JSON file with:

- `project`: title, source file, duration, frame rate, resolution;
- `editDecisions`: clips with source/output ranges, decision, reason, and confidence;
- `screenText`: overlay text events with timing, role, position, style, and reason;
- `quality`: review warnings and checks.

Run the guard:

```powershell
python -m unittest discover -s lingman-montazher/tests
```

## Maximum Pipeline Shape

The high-quality path is now:

1. `ffprobe` / ffmpeg logs describe media facts, loudness, pauses, and clap-like spikes.
2. Whisper-like transcript artifacts describe speech context and exact English phrase candidates.
3. OpenCV vision sampling is supported when `opencv-python` is installed; without it the analysis records a clear `vision.status` instead of guessing.
4. `build_multimodal_edl.py` combines audio, transcript, optional vision, retake groups, energy shifts, selected cuts, screen text, SFX, music policy, and B-roll policy into a canonical EDL JSON.
5. CapCut export consumes that plan as editable tracks. Remotion should consume the same EDL later as a deterministic renderer, not as the editor that decides what to cut.

Reference CapCut projects can be inspected and used as style sources. For example, `УРОК 3` provides compact white/green lesson text, native `Slide Left` / `Slide Right` text animations, section SFX/music cues, and jump-cut reframing patterns.

Generate analysis and EDL for the current concrete video without MP4 rendering:

```powershell
ffmpeg -hide_banner -nostats `
  -i lingman-montazher/input/current-video.mp4 `
  -vn `
  -af "astats=metadata=1:reset=10,ametadata=print:file=lingman-montazher/runs/20260524-0915-concrete-video/source-energy-astats-025.log" `
  -f null NUL

python lingman-montazher/tools/build_multimodal_edl.py `
  --manifest lingman-montazher/runs/20260524-0915-concrete-video/director-pass-v6-manifest.json `
  --transcript lingman-montazher/runs/20260524-0915-concrete-video/transcript-full-ggml-small-max28.ndjson `
  --source-video lingman-montazher/input/current-video.mp4 `
  --silence-log lingman-montazher/runs/20260524-0915-concrete-video/source-silencedetect-n35d025.log `
  --energy-log lingman-montazher/runs/20260524-0915-concrete-video/source-energy-astats-025.log `
  --out-analysis lingman-montazher/runs/20260524-0915-concrete-video/multimodal-analysis-v1.json `
  --out-edl lingman-montazher/runs/20260524-0915-concrete-video/multimodal-edl-v1.json
```

Extract a compact style profile from a CapCut draft:

```powershell
python lingman-montazher/tools/extract_capcut_reference_style.py `
  --draft "УРОК 3" `
  --out lingman-montazher/runs/20260524-0915-concrete-video/reference-style-urok-3.json
```

Export an editable CapCut draft using the reference text style and native CapCut text animation:

```powershell
python lingman-montazher/tools/export_capcut_draft.py `
  --manifest lingman-montazher/runs/20260524-0915-concrete-video/director-pass-v8-reference-style-manifest.json `
  --source-video lingman-montazher/input/current-video.mp4 `
  --out-dir lingman-montazher/runs/20260524-0915-concrete-video `
  --draft-name LINGMAN_MONTAZHER_UROK3_STYLE_NATIVE_0525 `
  --reference-draft-name "УРОК 3" `
  --reference-text-style native
```

If CapCut is already open and does not refresh the Projects list, close CapCut completely and register the draft at the top of `root_meta_info.json`:

```powershell
python lingman-montazher/tools/register_capcut_draft.py --draft LINGMAN_OPEN_THIS_0525
```

## CLI Pipeline (v1)

In addition to the Review Desk, a one-shot CLI accepts one raw camera file and one transcript JSON file with timed segments:

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

### Dry Run

```powershell
python lingman-montazher/lingman_montazher.py --input raw.mp4 --transcript-json transcript.json --output-dir lingman-montazher/outputs/demo --dry-run
```

Dry run writes all timeline, review, captions, screen text, manifest, and CapCut JSON artifacts without requiring ffmpeg or a real video file.

### Render

```powershell
python lingman-montazher/lingman_montazher.py --input raw.mp4 --transcript-json transcript.json --output-dir lingman-montazher/outputs/demo --render
```

Render mode requires ffmpeg and a real input file with video and audio streams.

### Outputs

- `edit_decisions.json`
- `screen_text.json`
- `captions.srt`
- `timeline.csv`
- `review_plan.md`
- `manifest.json`
- `quality_report.md`
- `capcut_project.json`

### Verification

```powershell
python -m unittest lingman-montazher/tests/test_lingman_montazher.py -v
python -m unittest lingman-scenarist-pipeline/tests/test_capcut_phrase_factory.py -v
python -m py_compile lingman-montazher/lingman_montazher.py
```

The Montazher tests verify transcript loading, latest-take selection, pause trimming, screen text timing, SFX timing, dry-run outputs, ffmpeg command planning, and quality report overlap detection.

## Why This Shape

The browser is the shared visual surface, while VS Code remains the workshop for the automation logic. The important boundary is that analysis and editorial decisions live in JSON first; CapCut and Remotion are exporters of that plan.
