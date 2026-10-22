# Task packet: Peak v2 parity after the first capture: Play icon on the left, tower and resident coins without overlaps, podium stays V2

Governance-ID: TG-961117FDB709
Governance-ID: TG-6A9091D94E3D
Governance-ID: TG-15F6F730351B
Status: Done (grid, label cut, play icon, font scale 1.3 edge cases; coordinator confirmed the podium stays V2)
Owner: 3 · МАКЕТЫ (coordinator 22.10 after the Sverka capture pk_side_1..5)
Related epic/enabler: Peak v2 scene (c83690658, 735052c46, 4709384a8, 113c55ca5, 47a048d8b); etalon docs/design/v2-app/peak-scene-v2.html block p2b (V2, approved 22.10)

## Outcome

The Peak scene in the app matches the approved V2 etalon (block p2b) where the first capture showed real differences:
1. The pinned "Play" button shows the play triangle on the left of the word, as in the etalon dock (both variants), not an arrow on the right.
2. The tower and the rival coins next to its floors do not overlap the podium, the floor labels or each other on 360-430 dp wide phones.
3. The podium stays the approved V2 (classic 2-1-3, equal blocks, leader coins standing on the blocks). The capture compared against block p2a (V1 "steps to the tower", rejected by the owner 22.10); the coordinator is informed and the podium is not rebuilt to V1 without the owner's word.

## Scope

In scope: components/spire/SpireClimbDock.tsx (scene button icon), components/spire/scene/SpireScene.tsx and SpireScenePodium.tsx (positions only), tests/spire_scene_contract.test.ts.

Out of scope: Peak game logic and data, Firestore reads, the Season screen (moved to 2 · ДИЗАЙН), the old Peak look with the scene flag off.

## Architecture

No architecture change: layout constants and one icon inside the existing scene components behind SPIRE_SCENE_V2_ENABLED. Positions are computed from the window width so the grid holds from 360 to 430 dp.

## Security and privacy

No authentication, permissions, personal data, child data or new services: presentation only. No network or storage access is added.

## Technical debt

- Pay now: the scene button and tower placement follow the etalon numbers instead of ad hoc offsets.

## Verification

Babel parse of touched files; targeted type check and all Peak, Community and tabs layout guards through the slot; contract test asserts the play icon on the left in scene mode and the non-overlap geometry; etalon block p2b captured headless for comparison.

## Rollback

Revert the commits; with SPIRE_SCENE_V2_ENABLED off the old Peak is unchanged.
