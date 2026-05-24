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

## Why This Shape

The first version is deliberately dependency-light. The browser is the shared visual surface, while VS Code remains the workshop for the automation logic. Remotion and ffmpeg can be added after the review manifest proves comfortable to inspect and edit.
