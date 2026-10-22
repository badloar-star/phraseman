# Task packet: dev route for the Home «Scene» hero states, lock of home-scene-states.html, code tokens vs etalon

Governance-ID: TG-9B3059C03E80
Governance-ID: TG-02C0E42932DA
Governance-ID: TG-9D2F2D778411
Status: In progress
Owner: 3 · МАКЕТЫ (requests from 0 · КООРДИНАТОР, 22.10)
Related epic/enabler: Home «Scene» (variant A), task packets home-scene-implementation-2026-10-21.md, home-scene-dark-themes-and-wiring-2026-10-22.md

## Outcome

1. «Сверка» can open any of the ten Home «Scene» hero states by link on the emulator:
   /dev_home_scene_preview?state=newbie|continue|streak_risk|day_done|no_energy|offline|exam_ready|streak_lost|welcome_back|all_done&theme=<id>&appearance=dark|light&plus=1.
   The state is not forced: a fixture of phone facts goes through the real pickHomeSceneState, so the priority is exercised too.
   Today only newbie and continue can be reproduced without tampering; success = all ten render and the route log shows requested == decided (or names why not, e.g. Plus has no «no energy»).
2. home-scene-states.html (3b52e133f, owner 22.10: «твой вариант самый лучший … по яркости сцены») is under the approved-etalon lock.
3. Code colours of the Scene (home_scene_tokens) are compared with the etalon for all 23 themes: dark = 30 % accent over background, seam >= 1.34, light «Сумерки» as approved; any mismatch fixed with a 23-theme test.

## Scope

In scope: app/dev_home_scene_preview.tsx (new dev route), components/home/v2/scene/home_scene_preview_fixtures.ts (new), HomeScene.tsx split into facts collector + HomeSceneView (same render, same log), HomeSceneEnergy.tsx (export the static view), a contract test for the preview; lock script + APPROVED note; home_scene_tokens.ts + test only if the comparison shows a mismatch.

Out of scope: Home screen wiring (app/(tabs)/home.tsx has foreign uncommitted edits — not touched), hero art registry (4 · ТЕМЫ), release flag HOME_SCENE_V2_ENABLED.

## Architecture

HomeScene keeps its props and behaviour: it reads phone facts (NetInfo, personal progress, clock) and calls pickHomeSceneState; rendering moves to HomeSceneView(decision, …). The dev route builds the same HomeSceneInput from fixtures, calls the same pickHomeSceneState and renders HomeSceneView with statusTint=false (the Home status strip is not touched from the preview). Theme/appearance only in process memory via app/dev_appearance_override.ts, restored on leave. In release (IS_STORE_RELEASE or !ENABLE_DEV_TOOLS) the route redirects to Home, like /dev_season_preview.

## Security and privacy

No new data, no network, no storage writes: fixtures are static, the header bell/avatar in the preview are static stand-ins (no inbox/stories reads). Route unreachable in store builds. Privacy policy not affected.

## Technical debt

- Contain: preview header is a static stand-in for the bell and avatar — documented in the route header; exit when Home header gets a pure view.
- Pay now: Scene render logic is not duplicated in the preview (shared HomeSceneView).

## Verification

Babel parse of changed .tsx; targeted type check of the scene files + route (through the slot); unit tests for home scene state/tokens and the new preview contract test (through the slot); route log [DEV-STATE] home_scene_preview shows requested/decided for each state. Lock: lock update script + hash check. Tokens: node comparison of code tokens vs etalon numbers for 23 themes x 2 appearances.

## Rollback

Revert the commits: the route and fixtures are dev-only files; HomeScene split is behaviour-preserving and revertible in one commit. Lock: revert the lock commit.
