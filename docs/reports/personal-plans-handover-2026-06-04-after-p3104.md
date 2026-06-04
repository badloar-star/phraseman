# Personal Plans Handover - after P3.104

Date: 2026-06-04  
Project: Phraseman  
Feature: Personal Plans / Персональные планы  
Current milestone: after P3.104 audio approval evidence packet

## Главная Цель

Довести фичу "Персональные планы" до 100% production-ready состояния, не ломая и не удаляя существующую функциональность.

Самое важное правило: не считать scaffold, draft, candidate, dry-run, preflight, handoff или generated evidence production-ready. Готовность можно повышать только через реальные live assets, реальные source registrations, реальные approvals, реальные runtime flows и свежие проверки.

## Текущий Процент Готовности

- Overall estimated feature progress: 76%.
- Gavan materials / final quiz evidence: 95%.
- Audio / pronunciation: 58%.
- Verification: 98%.
- UI / live route: 59%.

Эти проценты не означают production release. Они отражают прогресс по слоям. Live release всё ещё заблокирован.

## Текущее Состояние Одной Строкой

Personal Plans имеет сильную non-live evidence chain для Gavan Week 1: materials, export packets, final quiz candidates, route preflight, signed-approval handoff, audio approval evidence packet. Но live production route, quiz source registration, approved audio assets, pronunciation scoring и final UI/runtime smoke всё ещё не закрыты.

## Что Уже Сделано До P3.104

### P3.97S-P3.100

- Broad Personal Plans Jest был стабилизирован.
- Day 7 material candidate и material export packet добавлены.
- Live route implementation preflight расширен material evidence.
- Проверки доходили до broad Personal Plans и TypeScript green.

### P3.101 Signed Approval Handoff Packet

Добавлено:

- `tools/personal_plan_gavan_week1_signed_approval_handoff_packet.ts`
- `tests/personal_plan_gavan_week1_signed_approval_handoff_packet.test.ts`
- `docs/reports/personal-plans-p3101-signed-approval-handoff-packet-2026-06-04.md`

Суть:

- Handoff создан для human review.
- Approval не принят.
- `approvalStillMissing: true`.
- `readyForLive: false`.
- Route registration false.
- Handoff не разрешает production edits.

### P3.102 Final Quiz Candidate Packet

Добавлено:

- `tools/personal_plan_gavan_week1_final_quiz_candidate_packet.ts`
- `tests/personal_plan_gavan_week1_final_quiz_candidate_packet.test.ts`
- `docs/reports/personal-plans-p3102-final-quiz-candidate-packet-2026-06-04.md`

Суть:

- Создано 7 non-live quiz candidates.
- Всего 70 candidate questions.
- Каждый день имеет 10 questions.
- Есть `choice` и `typing` input modes.
- Есть RU/UK/ES readiness.
- Quizzes не зарегистрированы в production quiz source.
- `readyForLive: false`.
- `quizSourceEdited: false`.
- `routeRegistered: false`.
- Blocker: `missing_signature:product_copy`.

### P3.103 Final Quiz Evidence In Route Preflight And Handoff

Добавлено/изменено:

- `tests/personal_plan_gavan_week1_live_route_final_quiz_evidence_preflight.test.ts`
- `tools/personal_plan_gavan_week1_live_route_implementation_preflight.ts`
- `tools/personal_plan_gavan_week1_signed_approval_handoff_packet.ts`
- `tests/personal_plan_gavan_week1_signed_approval_handoff_packet.test.ts`
- `tests/personal_plan_gavan_week1_final_quiz_candidate_packet.test.ts`
- `docs/reports/personal-plans-p3103-final-quiz-evidence-handoff-2026-06-04.md`

Суть:

- Final quiz candidate packet стал видимым внутри route preflight.
- Handoff теперь требует final quiz candidate evidence.
- Preflight содержит:
  - expected quiz candidates: 7;
  - provided quiz candidates;
  - total questions: 70;
  - ten-question quiz count: 7;
  - registered quiz count: 0;
  - playable quiz count: 0;
  - coverage ready quiz count: 7;
  - ready for route review only как non-live evidence.
- Handoff readiness блокируется, если final quiz candidate evidence отсутствует или неполное.
- Production quiz registration всё ещё закрыт.

### P3.104 Audio Approval Evidence Packet

Добавлено:

- `tools/personal_plan_gavan_week1_audio_approval_evidence_packet.ts`
- `tests/personal_plan_gavan_week1_audio_approval_evidence_packet.test.ts`
- `docs/reports/personal-plans-p3104-audio-approval-evidence-packet-2026-06-04.md`

Также обновлены:

- `docs/personal-plans-implementation-checklist.md`
- `docs/personal-plans-killer-feature-audit.md`
- `docs/personal-plans-product-excellence-audit.md`

Суть:

- Создан non-live audio approval evidence packet.
- Он связывает:
  - Gavan Week 1 audio generation plan;
  - generated audio asset validation;
  - approval report evidence.
- Текущее честное состояние:
  - expected generation jobs: 10;
  - generated assets: 0;
  - generated blockers: 10;
  - missing generated files: 10;
  - approved audio assets: 0;
  - production-ready audio assets: 0.
- Packet явно держит:
  - `readyForLive: false`;
  - `audioProductionReady: false`;
  - `audioApprovalReady: false`;
  - `approvalStillMissing: true`;
  - `approvalMayBeInferred: false`;
  - `audioGenerationAllowedInThisPass: false`;
  - `audioAssetRegistrationAllowed: false`;
  - `pronunciationReadinessMayBeInferred: false`;
  - `sourceWritesUsed: false`;
  - `phaseWriteTargets: []`.
- Fake final audio claims отклоняются.
- Mismatched generated-asset summaries отклоняются.
- Writer разрешает только `.codex-tmp` и `docs/reports`.
- Никакие live audio files, runtime registry, scoring, navigation или UI flows не изменены в P3.104.

## Важный TypeScript Блокер, Закрытый Во Время P3.104

Финальный `npx tsc --noEmit --pretty false` после audio work поймал unrelated compass theme token drift. Были минимально исправлены существующие UI references:

- `components/QuizTimeoutModal.tsx`
  - `COMPASS_RICH.hairlineCream` -> `COMPASS_RICH.hairlineStrong`
- `components/NoEnergyModal.tsx`
  - `COMPASS_RICH.hairlineCream` -> `COMPASS_RICH.hairlineStrong`
  - `COMPASS_RICH.champagneHi` -> `COMPASS_RICH.cream`
- `app/phrase_analytics_screen.tsx`
  - добавлены локальные `themeMode`, `isCompassTheme`, `rowRadius` там, где они уже использовались;
  - `COMPASS_RICH.hairlineCream` -> `COMPASS_RICH.hairlineStrong`
  - `COMPASS_RICH.champagneHi` -> `COMPASS_RICH.cream`
  - `COMPASS_RICH.charcoalSunken` -> `COMPASS_RICH.charcoalSoft`

Эти изменения нужны, чтобы общий TypeScript gate был зелёный. Они не являются Personal Plans product progress, но важны для compile readiness.

## Последние Проверки

### P3.104 TDD Red

Command:

```powershell
npx jest tests/personal_plan_gavan_week1_audio_approval_evidence_packet.test.ts --runInBand
```

Результат:

- Failed expected.
- Причина: `tools/personal_plan_gavan_week1_audio_approval_evidence_packet` ещё не существовал.
- Это был корректный red phase.

### P3.104 Focused Green

Command:

```powershell
npx jest tests/personal_plan_gavan_week1_audio_approval_evidence_packet.test.ts --runInBand
```

Результат:

- 1 suite passed.
- 6 tests passed.

### Related Audio Green

Command:

```powershell
npx jest tests/personal_plan_gavan_week1_audio_approval_evidence_packet.test.ts tests/personal_plan_gavan_week1_audio_generation_plan.test.ts tests/personal_plan_audio_generated_assets.test.ts tests/personal_plan_audio_approval_report.test.ts tests/personal_plan_audio_approval_gate.test.ts tests/personal_plan_audio_asset_readiness.test.ts tests/personal_plan_audio_requirement_manifest.test.ts tests/personal_plan_audio_generation_jobs.test.ts --runInBand
```

Результат:

- 8 suites passed.
- 27 tests passed.

### Broad Personal Plans Green

Command:

```powershell
npx jest --runInBand --testPathPattern=tests/personal_plan
```

Результат:

- 186 suites passed.
- 1170 tests passed.

Important note:

```powershell
npx jest tests/personal_plan*.test.ts --runInBand
```

не сработал из-за Windows/Jest pattern parsing и вернул `No tests found`. Это не test failure. Правильный broad command в текущей среде:

```powershell
npx jest --runInBand --testPathPattern=tests/personal_plan
```

### TypeScript Green

Command:

```powershell
npx tsc --noEmit --pretty false
```

Результат:

- Final pass passed после минимальных compass token fixes.

### Related UI Smoke After TypeScript Fixes

Command:

```powershell
npx jest tests/no_energy_modal_locale_runtime.test.ts tests/phrase_analytics_screen_locale.test.ts --runInBand
```

Результат:

- 2 suites passed.
- 4 tests passed.

### Known External Smoke Failures

Следующие failures были замечены в дополнительных smoke попытках, но они не вызваны P3.104 audio packet:

- `tests/gustav_personal_practice_target_isolation.test.ts`
  - ожидает старую literal source string в `trainer_smart_session`.
- `tests/onboarding_graphite_app_connection.test.ts`
  - ожидает старую onboarding graphite theme/asset wiring.

Их нельзя смешивать с P3.104. Если их чинить, это отдельный pass.

## Что Нельзя Заявлять Готовым

Запрещено говорить, что Personal Plans полностью готов, пока не закрыты следующие production blockers:

- Нет signed approval для live route.
- Нет production route registration.
- Final quiz candidates не зарегистрированы в `app/personal_plan_quizzes.ts`.
- Audio assets не сгенерированы/не предоставлены.
- Audio assets не approved.
- Audio registry не содержит approved final assets.
- Pronunciation scoring/recording readiness не доказана реальными scoring contracts/assets.
- Maestro/e2e runtime smoke не закрыт для production-like flow.
- UI/live route не доказан как final user flow.

## Текущие Главные Блокеры

### Blocker 1: Missing Signed Approval

Status:

- Handoff exists.
- Approval missing.
- Live edits remain blocked.

Impact:

- Нельзя регистрировать route как production.
- Нельзя писать live quiz source registration.
- Нельзя считать Gavan Week 1 route production-ready.

Safe next action:

- Либо получить реальную signed approval, либо продолжать non-live evidence work.

### Blocker 2: Audio Assets Missing

Status:

- Generation plan exists.
- Expected jobs: 10.
- Generated assets: 0.
- Missing generated-file blockers: 10.
- Approved assets: 0.

Impact:

- Listening blocks не могут быть production-certified.
- Audio approval cannot pass.
- Pronunciation readiness cannot be inferred.

Safe next action:

- Produce or provide the 10 expected MP3 assets.
- Validate generated audio files.
- Build explicit approval records.
- Only then consider registration.

### Blocker 3: Pronunciation Readiness Missing

Status:

- Contracts/readiness tests exist.
- Real scoring/recording readiness is not proven for Gavan Week 1 production.

Impact:

- Pronunciation exercises cannot be called production-ready.

Safe next action:

- Build pronunciation evidence packet or scoring readiness gate after audio assets are handled.

### Blocker 4: Final Quiz Source Not Registered

Status:

- 7 candidate quizzes exist.
- 70 candidate questions exist.
- Quiz source untouched.
- Route registration false.

Impact:

- Candidates are review artifacts, not playable production quizzes.

Safe next action:

- After signed approval, register quiz source in a separate guarded task.

### Blocker 5: UI / Runtime / Maestro Not Final

Status:

- Runtime contracts are broad-tested.
- Production-like Maestro/e2e smoke for full Personal Plans flow is not closed in this handover.

Impact:

- User-facing flow cannot be called fully production-ready.

Safe next action:

- After live route/audio/quiz registration work, run Maestro/e2e smoke.

## Recommended Next Big Pass

The next prompt should not do one tiny microtask. It should do a large but coherent chunk:

1. Freshly analyze P3.104 and current audio state.
2. Produce or validate real Gavan Week 1 generated audio assets if assets are available or generation is explicitly allowed.
3. If audio generation is not allowed/possible, build the next evidence layer that prepares exact generation/approval inputs and blocks fake readiness.
4. Run focused audio tests.
5. Run related personal_plan audio tests.
6. Run broad Personal Plans Jest.
7. Run TypeScript.
8. Update report/checklist/audits/graph.

Do not register audio assets as final unless explicit approval records exist.

## Concrete Prompt For Next Session

```text
Продолжай работу по фиче “Персональные планы” в проекте Phraseman после P3.104.

Главная цель: довести Personal Plans до 100% production-ready, не ломая и не удаляя существующую функциональность.

Текущий handover: docs/reports/personal-plans-handover-2026-06-04-after-p3104.md

Сначала прочитай:
- docs/reports/personal-plans-handover-2026-06-04-after-p3104.md
- docs/reports/personal-plans-p3104-audio-approval-evidence-packet-2026-06-04.md
- docs/personal-plans-implementation-checklist.md
- tools/personal_plan_gavan_week1_audio_approval_evidence_packet.ts
- tests/personal_plan_gavan_week1_audio_approval_evidence_packet.test.ts
- app/personal_plan_audio_generation_jobs.ts
- app/personal_plan_audio_generated_assets.ts
- app/personal_plan_audio_approval_report.ts
- app/personal_plan_audio_approval_gate.ts
- app/personal_plan_audio_asset_readiness.ts

Работай большим объёмом за проход, не одной микрозадачей. Но держи работу в одном связном направлении.

Приоритет следующего большого шага:
1. Audio approval / generated assets readiness для Gavan Week 1.
2. Если реальные MP3 assets доступны или generation explicitly allowed, подготовь/проверь 10 expected MP3 assets, затем запусти generated assets validation и explicit approval gate.
3. Если реальные assets недоступны, создай следующий non-live artifact, который точно фиксирует generation/approval inputs, expected asset paths, approval checklist и blockers, не делая fake readiness.

Обязательные правила:
- Не считать generated audio approved audio.
- Не считать placeholders production-ready.
- Не считать pronunciation readiness готовой без real scoring/recording evidence.
- Не регистрировать live audio assets без explicit approval records.
- Не менять runtime/UI/navigation/storage/source contracts без отдельной причины и тестов.
- Не удалять существующую функциональность.

TDD:
- Сначала добавь/обнови тест.
- Убедись в red phase, если новая логика отсутствует.
- Затем реализуй.
- Затем запусти focused tests.

Проверки после реализации:
- focused Jest по новой области;
- related audio/personal_plan Jest;
- npx jest --runInBand --testPathPattern=tests/personal_plan
- npx tsc --noEmit --pretty false
- Maestro/e2e только если менялся UI/runtime или есть готовый flow для проверки.

После прохода обнови:
- docs/reports/ новым report;
- docs/personal-plans-implementation-checklist.md;
- docs/personal-plans-killer-feature-audit.md;
- docs/personal-plans-product-excellence-audit.md;
- progress graph HTML, если он существует; если отсутствует, восстанови его из handover процентов.

В финальном ответе обязательно покажи:
- что сделал;
- какие файлы изменил;
- какие проверки реально запускал;
- какие blockers остались;
- проценты по слоям;
- следующий конкретный крупный шаг.
```

## Suggested Progress Graph Values After P3.104

If `.codex-tmp/personal-plans-progress/personal-plans-master-graph.html` is missing, recreate it with these current values:

- Overall estimated feature progress: 76%.
- Gavan materials / final quiz evidence: 95%.
- Audio / pronunciation: 58%.
- Verification: 98%.
- UI / live route: 59%.

Graph note:

- P3.104 added a reviewer-ready audio approval evidence packet.
- Current audio evidence is still blocked: 10 expected MP3 jobs, 0 generated assets, 10 blockers, 0 approved assets.
- Next step is real MP3 generation/validation plus explicit approval records.

## Files To Be Careful With

Do not casually edit these live/source areas unless the selected task explicitly requires it and tests are added:

- `app/personal_plan_catalog.ts`
- `app/personal_plan_quizzes.ts`
- `app/personal_plan.tsx`
- `app/personal_plan_state.ts`
- `app/personal_plan_navigation.ts`
- `app/personal_plan_*runtime*`
- `assets/audio/**`
- `components/**`
- navigation/storage contracts
- existing tests outside the active task

## Safe Artifact Roots

Writers for evidence/reports should stay under:

- `.codex-tmp`
- `docs/reports`

Do not write generated fixtures into app source, tests, assets, root config, or live registries unless the user explicitly asks for that production step and the task has tests.

## Final State

The project is in a good evidence-heavy state, but still not production complete. The most valuable next movement is audio: either produce/validate the 10 real MP3 assets and approval records, or create the exact next non-live bridge artifact that makes that production step deterministic and auditable.
