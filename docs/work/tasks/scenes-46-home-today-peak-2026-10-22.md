# Task packet: owner's choice 22.10 — all scenes at 46 % (scenes-compact.html variant 2), new Home order, Peak full-bleed

Governance-ID: TG-1669267668FC
Status: In progress
Owner: 3 · МАКЕТЫ (coordinator 22.10: owner decisions «делай СЕЙЧАС»)
Related epic/enabler: scenes-compact.html (4837c9b9e) variant 2; Home scene, Today scene, Peak scene; full-bleed scheme eab9aa35d

## Outcome

1. Home (behind HOME_SCENE_V2_ENABLED): scene 392 of 844 including the status bar (46 %), numbers of variant 2 (header 8 below the clock, hero 160 at 52, title 30/36, button 50, chips 34/17/.16, Today panel overlaps 22); header pills 36; order scene → Today card → one row of four equal tiles (Lessons, Cards, Dialogs, Peak) without scrolling → phrase of the day; no video block. Flag off — previous Home.
2. Today scene at 46 %.
3. Peak scene at 46 % and full-bleed: Community joins fullBleedPages when SPIRE_SCENE_V2_ENABLED, header pushed by useTabTopBleedInset(); dev_spire_scene_preview too; removed from the safe_top_one_canvas_contract exceptions.
4. tests/render_cause_probe.test.tsx follows the current Home snapshot fields (poll moved to the Today row in 4ee8c2585).

## Scope

In scope: app/(tabs)/home.tsx, components/home/v2/scene/{HomeScene,HomeSceneStage}.tsx, components/home/v2/HomeV2Header.tsx, components/home/v2/HomeV2FeatureTiles.tsx, the Today scene files, components/spire/scene/*, app/(tabs)/_layout.tsx, app/(tabs)/community.tsx, app/dev_spire_scene_preview.tsx and the guards that pin these numbers.
Out of scope: data loading, texts, the old Home and old Peak with the flags off.

## Architecture

No architecture change: layout numbers behind the existing scene flags; the full-bleed scheme reuses TabTopBleedContext from eab9aa35d.

## Security and privacy

No data, permissions or services: presentation only; no new reads.

## Technical debt

- Accept temporarily: the Home video list still loads for the hidden rail when the scene is on (owner 3 · МАКЕТЫ; next step: skip loading behind the same flag after checking the Video tab badge use).

## Verification

Babel parse, targeted type check and all guards reading these files through the slot; Sverka capture against scenes-compact.html variant 2.

## Rollback

Revert the commits; with the scene flags off nothing changes.
