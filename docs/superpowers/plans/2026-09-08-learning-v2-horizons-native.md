# Learning V2 Horizons — native implementation

Owner approved the standalone Horizons prototype and requested native integration, then an app-wide design/motion opportunity inventory. Root is the sole writer in the current checkout; preserve other working changes.

## Scope and acceptance

- [x] Shared native palette, SVG relief/portal/medal artwork and seven chapter routes from the approved prototype. No WebView or image-generation dependency.
- [x] Horizons entry and eight-node chapter map in `app/(tabs)/lessons.tsx`, fed by existing catalog and accordion projection. All 32 lessons browsable; existing access handler, preview flags, energy gate, wallet, dictionary and legacy tabs preserved.
- [x] Premium ordinary start sheet with energy badge, swipe/back/close and reduced motion; visually distinct checkpoint entrance.
- [x] Native completion scene in the direct player with actual session runes, stars and completed-interaction data. No grant, debit, storage schema or canonical-content changes. Continue is immediately usable; no automatic dismissal before the reward can be read.
- [x] Focused behavioral checks for chapter coordinates, no malformed SVG, real reward display and replay/lifecycle; focused transpile/type/lint plus native-compatible visual preview where available.
- [x] Independent read-only review; fix findings. Preserve all unrelated dirty source.
- [x] After integration, inspect main app surfaces and write prioritized design/motion inventory with source references and implementation suggestions.

## Current authority

Blueprint gate PASS: 32/224/1792, fingerprint `bb53181a104f8476761eef548949b0f978a0fd2f0caacdb239ad70c5cbb1845c`, owner approved. Authoring preflight PASS: no LOCKED, CURRENT 1 DRAFT, FORBIDDEN 2–56. ON TRACK: this task changes presentation only, not authored lessons. Owner approval of Horizons supersedes the old brief auto-dismiss finale for these presentation surfaces; activity-mode contracts remain unchanged.

## Implementation sequence

1. Add `components/learning-v2/horizons/{model,art,copy}.ts`; validate bounded indices, seven routes and XML. Run `npx tsx tests/learning_v2_horizons_presentation_gate.ts` RED before implementation, GREEN afterwards.
2. Add shared native artwork/motion components and `LearningV2Horizons.tsx`. Use existing `LearningV2MapNode` for access/press/completion, actual row states and star projection. Route all presses to `handleLearningV2SessionPress`.
3. Add native results and start presentation; keep energy and persistence barriers in their existing owners. Pass actual `sessionRunes`, `finaleStars`, interaction counts and elapsed duration into presentation. Keep preview data isolated.
4. Run focused RNTL and existing map contracts under repository semaphore for heavy commands; no full-project typecheck or build. Record any device verification limits explicitly.
5. Read-only review and inventory; update this checklist and V2 handover with actual evidence. No deploy/push/release requested.

## Verification receipt — 2026-09-08

- Focused RNTL/map checks: 4 suites, 25 tests PASS. Includes canonical current/locked callbacks, 8-node chapters, dictionary scoping, actual supplied rune values, repeat without navigation, reduced-motion dismissal and stale-close prevention.
- Focused TypeScript project includes both changed app entry files and their imports, the sheet and Horizons components: PASS under the repository semaphore with 2 GB heap cap.
- New components + sheet ESLint: 7 files, 0 errors, 0 warnings. The existing lessons file has two pre-existing text-integrity lint errors also reproduced from HEAD; they are not waived.
- Geometry/XML/locale gate: PASS (7 distinct routes, 14 SVGs, chapter boundaries and nonempty copy in 9 interface locales). Existing map dictionary integration gate: PASS.
- Runtime lifecycle ratchet: the new repeating artwork is registered with active/reduced-motion cancellation ownership. The global guard still reports 8 unrelated existing findings in other components; no guard was weakened.
- Independent review repaired dictionary/CTA overlap by relocating the same dictionary control to the map header, scrollability of checkpoint entry, stale close callbacks, reduced-motion swipe and screen-reader star grouping.
- React Native Web browser harness renders the actual new components; 375px and 320px viewports have no horizontal overflow, nodes49–56 visible in chapter7, Continue fits within the viewport. Result and rune-help layout checked, including zero and reduced motion. Browser-only focus/safe-area/haptics adapters and demonstration data were used. Native TextInput count-up is checked behaviorally through its supplied value; its device animation is not proven by this browser harness.
- No connected ADB device and no running Metro instance were available. No APK/iOS build, physical-device motion proof, deployment, push or content-authoring status change.
- App-wide next-design inventory: docs/design/APP_DESIGN_MOTION_OPPORTUNITIES_2026-09-08.ru.md.

### Canonical rune receipt review

The existing commit for English lesson1/session1 returns the canonical receipt, which may differ from this replay’s HUD score. The finale now reads `appliedReceipt.amountSubunits / WALLET_SUBUNITS_PER_STAR` after the existing commit. Only status `applied` displays a new `+` credit. `replayed`/`aliased` display the prior confirmed amount as previously credited, with no plus sign. Other existing direct-player branches have no durable rune commit, so their HUD score is explicitly labelled as practice/uncredited; authoring preview is labelled separately. No additional credit path, operation schema, grant or storage change was introduced. Two additional RNTL cases and the receipt-binding source gate protect this display distinction.

Independent critical receipt reviewer: binding correct, no actionable P0/P1/P2 code finding, fresh source-binding gate PASS. Formal independent verification remained HOLD: its composite-gate attempt hit a React Native Flow parse error and its RNTL rerun hit Watchman startup failure. Root’s focused RNTL command explicitly uses --watchman=false and passed25tests; focused integration types passed. No global all-gates-PASS claim. Reviewer’s remaining semaphore slot was released; temporary browser server stopped.
