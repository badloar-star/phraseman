# Task packet: «Сегодня» scene matches scenes-compact v.2 to the CSS (rings, «Начать», task rows)

Governance-ID: TG-2DD6A647E12D
Status: Done for items 1–3 (rings, «Начать», rows); items 4–5 wait for the owner via the coordinator
Owner: 3 · МАКЕТЫ (coordinator 22.10 ~14:20, Сверка of 366de369b: light diff 25.9 %, dark 48.2 %)
Related epic/enabler: TG-1669267668FC (scenes 46 %), 366de369b (Today 46 %), 89515f3c9 (poll on Today)

## Outcome

The «Сегодня» scene (TODAY_SCENE_V2_ENABLED) draws what docs/design/v2-app/scenes-compact.html «Сегодня», variant 2 draws:
1. rings — red / green / blue of the mockup (RC #FF6B5B, #3DD6A3, #55A8FF), track at 22 %, stroke 12, gap 4, the round start dot on a
   ring at zero (the mockup's zero-length dash with a round cap), the person's own rank coin 54 in the centre;
2. the main button — short, by its content: ▶ «Начать», height 50, radius 28, padding 24, left-aligned like .cta (flex-start); its
   accessibility label keeps the task it opens;
3. «Задания дня» rows — icon tile 34 (radius 12) + title (+ subtitle) + on the right a green ✓ (#3DD6A3) when done or the counter;
   no left check circle, titles are not dimmed when done; 1 dp separators between rows; panel radius 24.
Success: the next Сверка of the scene shows these three items matching; fonts stay by the owner's D145 scale (16 / 13).

Pending the coordinator / owner (not in this packet until answered): 4) the «Неделя · N из 6 дней» card — the app keeps no per-day
task history (the today-tasks store holds only today), so past days need a new on-device record first; 5) the HUD header instead of
«‹ Сегодня» — /today_tasks has no tab bar, so without a back arrow only the edge swipe / system back leaves the screen.

## Scope

In scope: components/home/v2/today_scene/TodaySceneView.tsx (button, rows, panel), components/streak/moments/TodayRings.tsx and
TodayRingsSlot.tsx (an optional look: ring colours, track opacity, start dot — default unchanged), Today scene strings for «Начать»
(9 languages), the Today scene tests.
Out of scope: the legacy Today screen (flag off), moments m11 and Home (they keep the theme ring colours: the look is opt-in), the week
card data, the header, routing.

## Architecture

View-only. TodayRings gains an optional look prop; without it every current caller draws exactly as before (theme colours, track
0.16, no start dot). The scene passes the mockup look. No data, storage or network change.

## Security and privacy

None: drawing only, no data, permissions, services or storage.

## Technical debt

- Pay now: the scene's left check circles and the full-width task-titled button that diverged from the approved mockup.
- Accept temporarily: items 4 and 5 wait for the owner's answer via the coordinator (owner of the decision: coordinator; review after
  the answer).

## Verification

Types for the touched files; Today scene / rings / typography tests through the slot (tests/*today*, *TodayRings*, typography D145
ratchet); logs [TODAY-SCENE] unchanged; Сверка capture of the scene in light and dark after the commit.

## Rollback

Revert the commit: the scene returns to 366de369b + 89515f3c9.
