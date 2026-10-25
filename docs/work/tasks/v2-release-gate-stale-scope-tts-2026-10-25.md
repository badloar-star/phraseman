# Task packet: Learning V2 release gate — stale 441 scope and recorded-audio receipts

Governance-ID: TG-E5B82329BC44
Governance-ID: TG-FDE157FA279D (follow-up: memory note on dirty-tree precheck attribution)
Status: In progress
Owner: Learning V2 session (by coordinator request 25.10 ~07:30)
Related epic/enabler: release:precheck before build 2.0.2

## Outcome

`npm run release:precheck` stops refusing on `scripts/learning_v2_release_parity_gate.mjs` for two reasons that no longer
describe the app, while every real check of that gate stays blocking.

Facts from the precheck log 25.10 07:35:
- `English release identity scope: BLOCKED (source=1509, canonical=1509, app-copy=1509, 3204 differences)` — all three
  roots agree on 1509 sessions; the gate compares them with a hand-written table of 441 sessions (l01–l07 ×56, l08 ×49)
  from the owner's word 17.10. The release catalog grew past it on 18.10 (61cb83a0f, 441 → 450) and later to 1509 (l01–l27).
- `source/release semantic parity: BLOCKED (SOURCE_SESSION_SCOPE_INVALID)` — the same stale table, the checker never ran.
- `release quality evidence: BLOCKED (461/18311 audio targets verified, 13738 AUDIO_EVIDENCE_UNVERIFIED)` — receipts are
  looked up in the recorded-mp3 manifest `assets/audio/learning-v2/factory-production-v1/manifest.json`; owner 22.10:
  lessons speak only with the phone voice (TTS), recorded lesson audio left the app in 74b488a48.

## Scope

In scope: `scripts/learning_v2_release_parity_gate.mjs` (expected scope from the factory manifest, audio receipts →
advisory), its tests.

Out of scope: content of lessons (Codex, l23–l27 untouched), the visual parity gate (separate owner), ceiling value.

## Architecture

Expected English scope = session identities listed in `factory_native_manifest_v1.generated.ts` (what the app ships),
so source = canonical = app copy = shipped catalog is still enforced. Audio receipt issues are advisory only when they
are the ONLY quality issues; any other quality issue still blocks.

## Security and privacy

None: build-time script, no user data.

## Technical debt

Contain: recorded-audio evidence code stays (tests use it) but no longer blocks; exit — remove it with the old audio
pipeline when the owner confirms TTS-only is final for 2.x.

## Verification

Gate tests (node --test) green; `node scripts/learning_v2_release_parity_gate.mjs` exit 0; release:precheck shows
V2 gate passed.

## Rollback

Revert the commit; the gate returns to the 441 table and recorded-audio receipts.

## Follow-up 25.10 (Ревизор по d924fb4c8, координатор после выпуска 2.0.2)

- Храповик-пол объёма: `ENGLISH_RELEASE_SCOPE_FLOOR = { sessions: 1509, lastLesson: 27 }` — каталог меньше 1509 или без
  любого урока l01–l27 даёт EXPECTED_SCOPE_BELOW_FLOOR / EXPECTED_SCOPE_LESSON_MISSING (в составе и в смысловой сверке).
- Полнота TTS: у каждой аудио-цели единственный непустой текст, иначе TTS_TEXT_MISSING — блок, не справка. Замер выпуска:
  18311/18311 целей с текстом.
- Проверка: гейт exit 0; node --test 5 файлов гейта 43/43.
