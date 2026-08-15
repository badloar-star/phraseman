# `Учти язык` -- read-only project study

## Scope

This study was performed while CapCut was open. The native draft was never edited,
copied, renamed, or saved. The full per-file inventory is kept in
`.codex-tmp/reports/capcut-uchti-yazyk-file-inventory-20260812.json`.

## Project shape

- Canvas: `1080 x 1920` vertical.
- Total duration: `2070.067` seconds.
- Lesson structure: `60` blocks of `34.5` seconds, each with `5` learning slots.
- Total phrase capacity: `300` slots.
- CapCut Home metadata name: `Учти язык`; the project is visible in Home.

## Native timeline files

| File group | Purpose | Handling rule |
|---|---|---|
| `draft_content.json` | Canonical timeline: tracks, segment timing, material IDs, transforms, text and audio bindings. | Main source of truth; edit only after CapCut is fully closed and a backup exists. |
| `template-2.tmp` | Native mirror of the canonical timeline. | Must receive byte-identical timeline updates. |
| `Timelines/<id>/draft_content.json` | Timeline-local mirror used by CapCut's multi-timeline project container. | Must receive byte-identical timeline updates. |
| `Timelines/<id>/template-2.tmp` | Timeline-local temporary mirror. | Must receive byte-identical timeline updates. |
| `template.json` and `Timelines/<id>/template.json` | Template/project metadata around the timeline. | Preserve unless an explicit template-level change is required. |
| `Timelines/project.json` | Registry mapping the project to main timeline `6A3C09C7-515F-49A5-86B1-20504321F22F`. | Do not change for phrase/audio replacement. |
| `draft_meta_info.json` | CapCut Home-card metadata: visible project name, cover, folder and ID. | Do not change for phrase/audio replacement. |
| `draft_biz_config.json`, `draft_agency_config.json`, `draft_virtual_store.json`, `key_value.json` | CapCut local/project configuration and editor state. | Preserve. |
| `attachment_*.json`, `common_attachment/*`, `Timelines/*/attachment/patch/*` | Editor panels, feature attachments and recovery/patch state. | Preserve. |
| `subdraft/<id>/draft_content.json` and `sub_draft_config.json` | Definitions of reusable compound clips. There are `376` such child drafts. | Preserve their structure and IDs. |
| `Resources/**` | Local imported audio, video, preview frames and compound-composition audio. | New media must be placed here only when future import explicitly begins. |
| `*.bak*` | Existing recovery snapshots. | Preserve; do not reuse as an active timeline. |

## Timeline inventory

| Track | Type | Segments | Current role |
|---:|---|---:|---|
| 0 | video | 0 | Reserved empty video lane. |
| 1 | video | 360 | Main background/video sequence. |
| 2 | adjust | 1 | Global color/adjustment layer. |
| 3 | text | 60 | Per-block `A1` label. |
| 4 | text | 60 | Per-block blank/auxiliary text layer. |
| 5 | text | 120 | Repeated Russian instruction plus `knowlyapps.com`. |
| 6 | text | 60 | Per-block Russian hook: `Учить английский можно проще:`. |
| 7 | video | 300 | Reusable visual/compound-clip layer for each learning position. |
| 8 | text | 300 | Target-language display slot; currently contains the example `YOU GOOD?`. |
| 9 | text | 300 | Pronunciation/IPA display slot; currently contains the French sample `/sa va/`. |
| 10 | text | 300 | Translation/large phrase display slot; currently contains `CA VA ?`. |
| 11 | filter | 1 | Global filter layer. |
| 12 | audio | 120 | Repeated sound-design accents. |
| 13 | audio | 60 | Per-block sound-design layer. |
| 14 | audio | 60 | Per-block voice/audio layer. |
| 15 | audio | 300 | One per learning position; language assignment must be confirmed from the supplied files. |
| 16 | audio | 300 | One per learning position; language assignment must be confirmed from the supplied files. |
| 17 | audio | 300 | Per-position completion sound effect. |

## Verified invariants

- `draft_content.json`, `template-2.tmp`, and the two timeline-local mirrors have
  the same SHA-256 prefix: `4b738546470dc26e`.
- `template.json` and its timeline-local mirror also match:
  `cb464e6797d66e11`.
- The draft has `1,140` audio materials, all resolving to local files.
- The draft has `660` video materials: `360` resolve to local video files and
  `300` are compound-clip-backed materials with no standalone media path.
- Resources contain `906` MP3 files, `303` MP4 files, `293` JPG files and `7` AAC
  files; project data totals about `1.48 GiB` across `2,312` files.

## Future content insertion map

When audio is supplied later, the intended content mapping is:

1. English text -> track `8`.
2. English IPA -> track `9`.
3. Russian direct translation -> track `10`, with manual line breaks only at spaces.
4. Russian and English audio -> the two 300-segment audio tracks only after the
   user identifies the folder-to-track mapping.
5. Do not modify tracks `0-7`, `11-14`, `17`, subdrafts, project registration or
   existing media until the next explicit build step.
