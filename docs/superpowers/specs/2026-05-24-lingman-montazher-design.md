# Lingman Montazher Design

Date: 2026-05-24

Status: approved design direction, pending implementation plan

## Summary

Lingman Montazher is a director-style video editing pipeline for Professor Lingman talking-head YouTube lessons. It is based on the existing local Lingman/CapCut/ffmpeg video factory, but it changes the job from generated phrase-pack assembly to automated editing of a recorded camera video.

The selected product direction is option 3: a full director agent. The pipeline should not only remove pauses. It should understand the lesson flow, select the latest useful takes, add educational screen text, place tasteful motion and sound accents, and output a video that feels like a complete YouTube lesson rather than a rough splice.

## Source Context

Existing reusable base:

- `lingman-scenarist-pipeline/capcut_phrase_factory.py`
- `lingman-scenarist-pipeline/tests/test_capcut_phrase_factory.py`
- `exports/youtube-video-factory/YOUTUBE_SCENARIO_ENGINE.md`
- `lingman-scenarist-pipeline/LINGMAN_MASTER_PROMPT.md`
- `lingman-scenarist-pipeline/LINGMAN_AGENT_OFFICE_PIPELINE.md`

The current executable base already includes ffmpeg rendering, audio probing, subtitles, ASS styling, SFX mixing, timeline CSV output, CapCut project JSON, native CapCut draft support, and manifest/readme generation. Lingman Montazher should copy and adapt that foundation instead of starting from scratch.

## Goals

- Accept one long raw talking-head recording as the default input.
- Detect pauses, filler, restarts, false starts, duplicate takes, and repeated explanations.
- Prefer the latest complete take when the speaker re-records a section.
- Preserve the pedagogical continuity of the lesson.
- Add strong but readable on-screen English text for key moments.
- Add jump cuts, zoom cuts, kinetic typography, and SFX when they improve pace or clarity.
- Produce a reviewable edit plan before or alongside the rendered output.
- Keep all decisions inspectable so the user can trust and correct the pipeline.

## Non-Goals For v1

- No fully autonomous publishing to YouTube.
- No claims that the AI selection is always correct without review.
- No heavy B-roll search pipeline in the first implementation.
- No deletion of existing Lingman scenarist behavior.
- No dependency on a specific GUI editor as the only output path.

## Inputs

Primary input:

- `raw.mp4`: one continuous camera recording.

Optional inputs:

- `script.txt`: intended teleprompter or outline, if available.
- `lesson_notes.md`: topic, target phrases, and visual emphasis hints.
- `brand_preset.json`: text style, colors, SFX levels, zoom rules, output format.
- `.env.local`: API keys or model configuration for transcription.

## Outputs

Required outputs:

- `final.mp4`: rendered edited video.
- `edit_decisions.json`: machine-readable edit decision list.
- `review_plan.md`: human-readable explanation of cuts, take choices, and visual accents.
- `captions.srt`: clean subtitles.
- `screen_text.json`: selected on-screen phrases with timings and styles.
- `manifest.json`: run summary, input hashes, duration, and generated files.

Preferred outputs:

- `preview.mp4`: quick lower-cost render.
- `capcut_project.json`: editable project-source JSON.
- `timeline.csv`: flattened cut and media timeline.
- `quality_report.md`: continuity, pacing, subtitles, and visual-readability checks.

## Pipeline Architecture

### 1. Intake And Media Probe

The pipeline validates the input file, reads video/audio metadata, records duration, checks frame rate and resolution, and creates a stable run folder. It should hash the input so decisions can be traced back to the exact source recording.

### 2. Transcript Agent

The transcript layer produces word-level or segment-level timestamps. It normalizes filler, repeated starts, long pauses, and obvious non-lesson noise without destroying the original transcript. The raw transcript and cleaned transcript should both be saved.

### 3. Take Selector

The take selector groups semantically similar attempts. A repeated section is treated as a take group. The default rule is:

If the speaker records a concept multiple times, the latest complete take wins.

The selector should still flag exceptions when an earlier take looks materially better, more complete, or less broken than the latest one. Those exceptions go into `review_plan.md`.

### 4. Silence Cutter

The silence cutter removes dead air, long thinking pauses, obvious resets, and pre/post mistake gaps. It should not remove intentional pedagogical pauses that help a viewer process an English example. Cut thresholds should be configurable by preset.

### 5. Lesson Continuity Agent

This layer checks whether the assembled lesson still has a coherent flow:

- hook or opening thought;
- explanation;
- English examples;
- Russian explanation around the examples;
- Phraseman or practice bridge if present;
- payoff or close.

If a selected cut creates a meaning gap, the pipeline should either keep the needed bridge or flag the issue for review.

### 6. Screen Text Director

The screen text layer selects only high-value moments:

- exact English phrases;
- corrected mistakes;
- contrast pairs;
- one-sentence rules;
- micro-test options;
- Phraseman practice mission, if spoken.

The text must be short, readable, and timed to the spoken beat. It should not cover the speaker's face unless a preset explicitly allows center overlays.

### 7. Motion Director

The motion layer applies restrained YouTube editing:

- jump cuts after removed pauses;
- subtle zoom-in for emphasis;
- reset zoom after emphasis;
- kinetic typography for key English phrases;
- quick text entrance and exit animations.

Design principle from `ui-ux-pro-max`: video-first plus micro-interactions. Animations should usually be 150-300ms, use transform/opacity-style motion, and serve readability. The lesson is the hero, not the effect.

### 8. Sound Designer

The sound layer adds quiet accents:

- soft whoosh for larger text reveals;
- click/pop for small phrase emphasis;
- light transition sound on important jump cuts only;
- optional bed or ambience only if it does not fight the voice.

SFX volume must be conservative by default. Voice clarity wins.

### 9. Renderer And Exporter

The renderer builds the final cut through ffmpeg first. CapCut JSON should remain an editable sidecar output where possible. The output should keep the original camera quality as much as practical while ensuring YouTube-ready audio and subtitles.

### 10. Final QA

The final QA checks:

- final video exists and has nonzero duration;
- audio is present;
- captions cover the main speech;
- no generated text extends beyond screen bounds;
- screen text has readable dwell time;
- edit decisions reference valid source time ranges;
- rendered duration is shorter than raw duration unless the raw file was already clean;
- no large unexpected silent gaps remain.

## Data Contracts

### `edit_decisions.json`

Each decision should include:

- source start and end;
- output start and end;
- decision type: keep, cut, take_selected, take_rejected, pause_trimmed, filler_trimmed, visual_added, sfx_added;
- reason;
- confidence;
- related transcript text.

### `screen_text.json`

Each screen text event should include:

- start and end;
- text;
- role: phrase, correction, rule, contrast, micro_test, cta;
- position preset;
- style preset;
- animation preset;
- reason.

### `review_plan.md`

The review plan should be readable by a human editor and include:

- selected take groups;
- rejected duplicate takes;
- major cuts;
- visual accents;
- SFX accents;
- known risks;
- suggested manual review points.

## Visual System

Default visual tone:

- serious educational YouTube, not a children's app;
- high contrast text;
- large English phrases;
- restrained kinetic typography;
- no clutter around the face;
- no random decorative effects.

Recommended default overlay:

- white or near-white text;
- dark translucent backing only when the camera image needs contrast;
- accent color for corrections or key grammar contrast;
- short motion on entrance, stable reading hold, clean exit.

The UI/UX principle is clarity before spectacle: the viewer must read the English phrase instantly.

## Error Handling

- If transcription fails, stop with a clear error and keep media probe artifacts.
- If take selection confidence is low, create a review-only plan instead of pretending the final cut is reliable.
- If ffmpeg render fails, keep all intermediate timelines and command logs.
- If CapCut draft generation fails, still produce `final.mp4`, `edit_decisions.json`, and `review_plan.md`.
- If no meaningful cuts are found, report that the raw file appears already clean instead of forcing edits.

## Testing Strategy

Focused tests should cover:

- transcript segments map to valid source time ranges;
- pause detection keeps intentional short teaching pauses;
- latest-take selection chooses the final complete duplicate by default;
- earlier-take exception can be flagged without silently overriding the default;
- screen text events do not overlap incoherently;
- SFX events stay within the final timeline;
- generated SRT timestamps are valid;
- dry-run mode produces JSON, CSV, SRT, and review artifacts without API keys;
- ffmpeg command construction can be validated without rendering a large video.

## Implementation Shape

Create a new isolated pipeline folder, likely:

```text
lingman-montazher/
```

Suggested files:

```text
lingman-montazher/
  README.md
  lingman_montazher.py
  presets/
    default_director.json
  tests/
    test_lingman_montazher.py
```

The implementation should preserve existing Lingman scenarist files. Shared code can be copied first and factored later only if duplication becomes painful.

## Acceptance Criteria

- A dry run can process a mocked transcript and produce `edit_decisions.json`, `screen_text.json`, `captions.srt`, `timeline.csv`, `review_plan.md`, and `manifest.json`.
- The latest complete take is selected when duplicate takes are present.
- Long pauses and obvious false starts are removed in the edit decision list.
- Key English phrases are selected for screen text with readable durations.
- The output format is understandable without opening the code.
- Existing `lingman-scenarist-pipeline` tests still pass.
- The implementation does not modify or remove existing Phraseman app functionality.

## Open Decisions For Implementation

These are implementation choices, not design blockers:

- transcription backend: local Whisper, API transcription, or pluggable provider;
- whether v1 renders full `final.mp4` immediately or starts with dry-run plus preview;
- exact default pause thresholds;
- exact SFX asset source;
- exact CapCut draft template mapping.

The design assumes these choices can be configured by preset.

## Self-Review

- No placeholder requirements remain.
- Scope is focused on one new pipeline, not a broad publishing platform.
- The design preserves existing Lingman and app behavior.
- The selected option 3 is reflected in the architecture through director agents.
- Outputs are inspectable, so automation can be reviewed instead of blindly trusted.
