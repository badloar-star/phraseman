# Spire Multilingual Admin Control Design

Date: 2026-09-26

## Goal

Turn the existing read-only `Arena Content` admin tab into the operational
control surface for the preserved ES/FR/DE content pools used by Spire. Arena
runtime is not restored, no language is enabled, and no deployment is made.

## Chosen approach

Extend the existing tab and reuse the existing protected callables:

- `adminArenaContentStatus` and `adminArenaContentValidate` for bundled manifest
  state;
- `adminSpirePackBuild` for an explicit weekly pack build;
- `adminSpireTaskFlagList`, `adminSpireTaskFlagAdd`, and
  `adminSpireTaskFlagRemove` for emergency task exclusion.

No new backend endpoint is required. This keeps the change isolated to
`admin/v2/legacy.html` and avoids conflicting with the PhraseMan 2.0 backend
work.

## Information architecture

The tab is renamed **Контент Spire** and contains three ordered work areas:

1. **Language readiness** — target selector, 4,000/4,000 counts, manifest
   integrity, review readiness, exact block reason, and immutable hashes.
2. **Weekly pack build** — optional ISO week, tier selector, safe normal build,
   and an explicitly confirmed force rebuild. The current selected language is
   the only language sent by default.
3. **Removed tasks** — list current flags for the selected language, add a task
   ID with a required reason, and restore it after confirmation.

## Safety and states

- Opening the tab performs read-only status and flag-list calls only.
- A normal build never overwrites an existing pack; force rebuild requires an
  explicit confirmation explaining that the pack hash can change.
- Current `BLOCK` manifests remain blocked and the exact reason is displayed.
- Every mutation has disabled/loading state, inline result, and error recovery.
- Language changes refresh both manifest projection and the flag list.
- No control activates a manifest, enables a language, or changes Arena.

## Visual direction

Follow the existing dark/light admin product register: one system font,
restrained semantic colors, 44 px controls, visible keyboard focus, tonal
sections without decorative animation, and a single-column collapse below
760 px. Status is communicated by text as well as color.

## Acceptance criteria

- The navigation and section title say `Контент Spire`, not `Arena Content`.
- ES/FR/DE status loads from the existing manifest callable.
- The selected language can be built for a week/tier through
  `adminSpirePackBuild`, with force confirmation.
- Flags can be listed, added with a reason, and removed with confirmation.
- Exact server results and `unavailableLangs` reasons remain visible.
- Static contract tests, Functions tests/build, HTML syntax checks, and a
  browser inspection pass.

