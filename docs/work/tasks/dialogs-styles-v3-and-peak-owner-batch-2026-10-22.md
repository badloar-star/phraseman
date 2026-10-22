# Task packet: Dialogs «5 radically new styles» mockup (v3); then the owner's Peak batch; then Today rings in theme shades

Governance-ID: TG-110070F4C93E
Status: In progress
Owner: 3 · МАКЕТЫ (coordinator 22.10 ~15:10, owner's words relayed)
Related epic/enabler: 8c48481f0 (dialogs-scene-choose-v2), a07d547a1 / 8321305c7 (Peak scene), 767196a6f (Today rings RC)

## Outcome

1. Owner on dialogs-scene-choose-v2: «ЛЕНТА НЕ ПОДХОДИТ! ДАВАЙ 5 КАРДИНАЛЬНО НОВЫХ СТИЛЕЙ». docs/design/v2-app/dialogs-styles-v3.html: five
   whole-screen ideas for choosing a dialogue (not carousel variations), each «first look → choosing → started»; the whole screen fits
   390×844 without scrolling; it is clear at once what to pick and how to start; V2 buttons of one style; «назад» in the common place;
   ONLY the current theme's colours and shades (owner law 22.10: «ЦВЕТА ДОЛЖНЫ БЫТЬ СТРОГО ЦВЕТАМИ И ОТТЕНКАМИ ТЕКУЩЕЙ ТЕМЫ») with a
   switcher of three app themes, tokens taken from the app; no textures; real data (76 dialogues, partners, ranks, 18 of 30).
2. Peak (owner batch): no «+10 за ступень / этаж» chips on the scene, no coloured ring around the own coin (own coin ×1.1 with a soft
   theme glow), no «НАД ОБЛАКАМИ», no clouds behind the tower (one scene background), stars spread over the whole scene to the edges
   (theme shade, deterministic), every person on the scene opens the player card, the common «назад» when the Peak is opened above the
   tabs, the tower visible while «Ищем комнату…» (logs of why it was hidden), the tower and scene palette in theme shades.
3. Today rings and the week card in theme shades from 4 · ТЕМЫ tokens (todayRing / todayRingTrack / todayRingDone) after their commit.

## Scope

In scope: the new mockup page; components/spire/** scene files, spire_scene_palette.ts, tower skins (scene use), tests; Today scene rings.
Out of scope: Home, the emulator (owner: «НЕ ТРОГАТЬ ЭМУЛЯТОР»), the Dialogs app code until the owner picks a style.

## Architecture

1: static mockup; colours from liquidGlassTokens / dialogsSceneColors of three themes computed with tsx. 2–3: view changes behind the
existing scene flags; colours only from theme tokens.

## Security and privacy

None: design page and drawing changes; no data, permissions or services.

## Technical debt

- Pay now: fixed colours (RC rings, scene literals) the owner rejected.
- Contain: tower_skins literals — repaint for the scene via theme shades; other users of the skins (moments, week card) checked by
  guards.

## Verification

1: headless capture of every frame in three themes, no page errors, phones not overlapping. 2–3: types + Peak / Today guards through
the slot, numstat only own hunks.

## Rollback

Delete the page; revert the Peak / Today commits.
