# Task packet: Peak scene without floor numbers; Dialogs «choose» mockup v2; Today week card data

Governance-ID: TG-3E4DD900AAA3
Status: In progress
Owner: 3 · МАКЕТЫ (coordinator 22.10 ~14:40, owner's words)
Related epic/enabler: a07d547a1 (Peak tall), 34b0caae2 (dialogs-scene-choose v1), TG-2DD6A647E12D (Today parity)

## Outcome

1. Peak scene: owner «НОМЕРА ЭТАЖЕЙ УБЕРИ» — floor numbers are not drawn on the scene at any screen size; everything else as in
   a07d547a1 (the old Peak window outside the scene keeps its numbers). A guard asserts no numbers on the scene.
2. Dialogs: owner on dialogs-scene-choose — the carousel is interesting, but the first look must not be «куча всего»; keep the current
   app scene on top, put a calm carousel of dialog cards below so dialogs can be seen and chosen. New mockup
   docs/design/v2-app/dialogs-scene-choose-v2.html: top = the app's Dialogs scene 1:1, bottom = 2–3 carousel density variants, each
   «first look → choosing → started», both themes, real data only, the whole screen visible without scrolling on 390×844.
3. Today (after 1–2): «Неделя · N из 6 дней» — variant A: the finished day's ring values are kept on the phone (7 last days, own key, no
   network), drawn as mini rings in the week card.

## Scope

In scope: components/spire/SpireTowerSvg.tsx / SpireTower.tsx (scene-only flag), Peak scene tests; the new mockup HTML; for item 3
modules/today-tasks (only if no foreign uncommitted changes there), the Today week card, the account wipe list for the new key.
Out of scope: the Today header (wait for the owner), Home, the Dialogs app code, the Peak window outside the scene.

## Architecture

1: a view flag through the existing scene path (SpireScene → SpireTower → SpireTowerSvg), default off. 2: a static mockup, no app code.
3: a small on-device history written at the existing day rollover of the today-tasks store; read once for the week card.

## Security and privacy

1–2: none. 3: on-device copy of the person's own daily task progress (3 numbers per day, 7 days), per account, wiped with the account
data; no network, no new service — covered by the existing on-device progress storage in the privacy policy (to be re-checked when 3
is built).

## Technical debt

- Pay now: item 1 removes the 6–8 dp numbers the owner called unreadable.
- Accept temporarily: the Today header waits for the owner (owner of the decision: coordinator).

## Verification

1: tests/spire_scene_contract (no-number flag), the Peak scene tests through the slot, git diff --cached shows only own hunks (the
5 · ВХОД [SCENE-TOUCH] trace stays out). 2: headless capture of every frame, light and dark, 390×844. 3: unit tests of the history
store and the week card, account isolation test.

## Rollback

Revert each commit; item 1 returns the numbers of a07d547a1.
