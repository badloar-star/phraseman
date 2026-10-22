# Task packet: poll of the day moves to the «Сегодня» screen; Peak scene taller with a large whole tower and tappable parts

Governance-ID: TG-639E700458D3
Status: Done — poll 89515f3c9; Peak tall with tappable avatars, energy and tab fixes in the commit feat(spire): Peak scene tall with a large whole tower
Owner: 3 · МАКЕТЫ (coordinator 22.10 ~13:50, owner's button answers)
Related epic/enabler: 3c68a67b8 (Home by the owner's mockup, poll row removed — 4 · ТЕМЫ), peak-full-tower (TG-D9066484C74E, not committed)

## Outcome

1. Poll of the day (Poll V2: useHomePollV2 + its sheet) is back in the app: it left Home with 3c68a67b8 (Home strictly by the owner's
   mockup) and per the owner's button lives as a row on the «Сегодня» screen (/today_tasks), in that screen's style, same hook, no new
   server requests (the hook's cache as is). Screenshot of «Сегодня» with the poll for 6 · СВЕРКА after the commit.
2. Peak, owner's button «Сцена выше, башня крупнее»: the scene takes almost the whole screen, the tower is visible WHOLE and large (all 15
   floors, crown and glow, podium) at a scale where floor numbers and «+N» read — not smaller than V2; «Комната недели» and the podium go
   below by scrolling; «Играть» stays pinned. Tappable: rival avatars on the tower, prize winners 1–2–3, own coin with place → the friend
   profile sheet 2.0 as in «Друзья» (no new reads); energy ⚡ → energy sheet as on Home; the «Комната недели» card → all members;
   tabs Пик / Друзья / Наборы hit zones aligned with the drawing and ≥ 44 (dead zone at x≈93 of «Друзья»); the offline banner does not
   swallow taps. Kept: Community full-bleed, empty safe_top exceptions, ▶ left, «+N» for long guard words.

## Scope

In scope: app/today_tasks.tsx and the «Сегодня» view components (poll row), Peak scene files (components/spire/scene/*, SpireTower,
SpireTowerSvg, SpireHomeScreen as needed), app/(tabs)/community.tsx tab hit zones, their tests.
Out of scope: Home (4 · ТЕМЫ), the scenes touch bug in the shared shell (5 · ВХОД), server code, the poll's server contract.

## Architecture

Poll: the same hook and sheet, mounted on /today_tasks instead of Home; the hook's cache and network behaviour unchanged (no new reads).
Peak: layout-only change of the scene frame (scale from the tower's whole height at ≥ the V2 scale) and press handlers wired to existing
sheets with data already on the screen.

## Security and privacy

No new data, permissions or services: the poll keeps its existing contract; the profile sheet shows data already loaded for the room.

## Technical debt

- Pay now: the poll is not lost when Home follows the mockup.
- Contain: the poll row on «Сегодня» uses the existing hook API; if the hook keys on Home focus, the trigger moves with the screen (log
  [TODAY-POLL] shows phase and source).

## Verification

Types for the touched files; tests for today_tasks / today scene / poll and the Peak guards (through the slot); logs [TODAY-POLL] and
[SPIRE-LAYOUT]; screenshot request to 6 · СВЕРКА after each commit.

## Rollback

Revert the commits: the poll returns to nowhere (as after 3c68a67b8), the Peak to 301e36d50.
