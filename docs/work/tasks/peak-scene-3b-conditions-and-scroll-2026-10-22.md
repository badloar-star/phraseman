# Task packet: Peak v2 3b conditions — extraction under 400, one status strip, flag-off identity, header fade on scroll (3b-3)

Governance-ID: TG-B2420D2E7E0E
Governance-ID: TG-5FE0C83833F2
Status: Done (3b conditions 113c55ca5, 3b-3 this commit; old tokens 7369bf476)
Owner: 3 · МАКЕТЫ (coordinator conditions 22.10 for Peak v2 3b and step 3b-3)
Related epic/enabler: Peak v2 scene (c83690658, 735052c46, 4709384a8), HomeSceneStatusStrip, TopFadeScrollContext

## Outcome

1. SpireHomeScreen at or below 400 lines by extracting the title block into SpireHomeTitle (strings read by guards stay in the screen); the comment lines joined earlier are restored.
2. One status strip: HomeSceneStatusStrip serves Home and Peak (source prop), SpireSceneStatusStrip is deleted.
3. Flag off = previous look byte for byte in community.tsx and the tabs layout: the header tone comes from a pure function that returns null when SPIRE_SCENE_V2_ENABLED is false; a test proves it.
4. Step 3b-3: the Community header colour fades when Peak scrolls, with the same mechanism as Home (shared TopFadeScroll scrollY, threshold 6, native timing 180/260 ms); Peak reports its scroll to the top mask only (no tab bar collapse) and re-reports its own offset when it becomes active.
5. Old homeSceneTokens(accent) deleted in its own commit (no callers in HEAD).

## Scope

In scope: components/spire/SpireHomeScreen.tsx, components/spire/SpireHomeTitle.tsx (new), components/spire/scene/{SpireScene.tsx, use_spire_scene_top.ts, spire_scene_header_tint.ts, spire_scene_header.ts(x)}, components/home/v2/scene/HomeSceneStatusStrip.tsx, app/(tabs)/community.tsx, app/(tabs)/_layout.tsx, tests; home_scene_tokens.ts + tests/home_scene_state.test.ts for the deletion.
Out of scope: Today/Dialogs screens, Peak data and game logic, foreign uncommitted files.

## Architecture

Header tone = spireSceneHeaderTone({ enabled, onPeak, tint }) (pure, null with the flag off). 3b-3 as built: community.tsx keeps its own tab row code exactly as before 3b-2 and renders SpireSceneHeaderLayer as the last header child; the layer (only while the tone is not null) lays the scene colour, the same tabs in white and the energy over the header with the header's own styles, pointerEvents none and hidden from screen readers. The layer opacity follows the shared TopFadeScroll scrollY like TopFadeMask (threshold 6, 180 ms out, 260 ms back, native driver), so the colour crossfades to the normal tabs underneath with no React re-render on scroll. TopFadeScrollContext gains a read-only isMaskShown() so a layer that appears later starts in the right state. Peak ScrollView reports to topFade.onScrollMaskOnly (no tab bar collapse) only while the scene is on (use_spire_scene_scroll.ts) and re-reports its last offset when Peak shows again. No new reads.

## Security and privacy

No authentication, permissions, personal data or new services are involved: the changes are presentation (header colour, status strip, scroll fade) and a code move inside the Peak screen. No network or storage access is added; the scroll offset lives only in process memory. Privacy policy is not affected.

## Technical debt

- Pay now: duplicated strip removed; joined comments restored; dead token function removed.

## Verification

Babel parse; targeted type check; all tests reading Peak/Community/tabs layout through the slot; new pure tests for the header tone with the flag off; screen line count.

## Rollback

Revert the commits; with the flag off nothing changes by design.
