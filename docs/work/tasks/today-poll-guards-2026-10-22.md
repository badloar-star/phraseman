# Task packet: poll guards follow the poll's new home (Home without the scene, «Сегодня» with it)

Governance-ID: TG-069CE8B230B6
Status: In progress
Owner: 3 · МАКЕТЫ (coordinator 22.10; continues today-poll-and-peak-tall-2026-10-22, TG-639E700458D3)
Related epic/enabler: 3c68a67b8 (Home by mockup — poll row only without the scene flag), today_tasks poll row

## Outcome

Three guards about the poll and the survey on Home (home_poll_v2_contract, home_startup_stability, home_survey_sheet_contract) are red on
HEAD since 3c68a67b8 changed `homeTodayRowSource === 'poll_v2' ? {` to `… && !HOME_SCENE_V2_ENABLED ? {`. They now state the owner's rule:
the poll row is on Home only without the scene flag; with the new Home it lives on «Сегодня» (/today_tasks) with the same hook and sheet.

## Scope

In scope: the three test files (expected strings), plus the poll-on-Today guard already added.
Out of scope: home.tsx code (4 · ТЕМЫ), the survey campaign logic (5 · ВХОД), back_glyph_contract red on the chapter exam screen (not mine).

## Architecture

No architecture change: test expectations follow the code.

## Security and privacy

None: tests only.

## Technical debt

- Pay now: guards red on HEAD since 3c68a67b8 are brought in line with the owner's decision.

## Verification

The three guards + today_poll_on_today_screen_2026_10_22 + today_* tests green through the slot.

## Rollback

Revert the commit.
