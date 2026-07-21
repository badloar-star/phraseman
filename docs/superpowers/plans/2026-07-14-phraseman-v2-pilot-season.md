# Phraseman V2 Pilot Season — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Execution mode:** GSD milestone + TDD, по одному вертикальному срезу. Этот документ является umbrella plan; каждая фаза перед реализацией получает отдельный `/gsd:plan-phase` с учётом актуального состояния ветки.

**Goal:** Выпустить контролируемый пилот Phraseman V2 из 32 сценарных эпизодов с модульными активностями, единым голосовым runtime, performance-star/access экономикой, отдельным learning evidence, админ-генератором, безопасными content releases, legacy fallback и измеримым delayed transfer.

**Architecture:** Новый `modules/learning-v2` содержит domain contracts, progress/evidence reducers, content loader и runtime registry. Expo routes и React Native shells остаются тонкими. Существующие legacy lessons, Personal Plan и Speaking Club подключаются adapters. Backend остаётся server-authoritative для покупок, публикации и синхронизируемого прогресса. Stage-based generator преобразует approved artifacts в versioned course release; клиент проверяет hash и имеет последний валидный/bundled fallback.

**Tech stack:** Expo SDK 54, React Native 0.81, TypeScript strict, Expo Router, AsyncStorage/local-first outbox, Firebase Auth/Firestore/Functions, Admin v2 vanilla JS, Jest/RNTL, focused device/E2E checks.

**Product source of truth:** [`docs/v2/README.md`](../../v2/README.md) и документы `01`–`08` в той же папке.

**Content Studio execution plan:** [`2026-07-14-phraseman-v2-content-studio.md`](./2026-07-14-phraseman-v2-content-studio.md). Его hybrid boundary, authoring contracts, permissions, preview envelope Body/Record, immutable template versions и release gates являются обязательными для Phase 01 и Phase 06; краткие задачи ниже не заменяют dedicated plan.

---

## 0. Правила исполнения

1. Текущая `.planning` принадлежит другому milestone. Не перезаписывать её. После закрытия текущего milestone создать `Phraseman V2 Pilot Season` через `/gsd:new-milestone` либо отдельный GSD workstream.
2. Начать из отдельного `codex/learning-v2-pilot` worktree только после фиксации/переноса текущих пользовательских изменений. Нельзя терять существующий dirty state.
3. Перед каждой фазой выполнить impact analysis: route → state/storage → callable/Firestore → response → UI → analytics.
4. Tests first. Обычный тестовый запуск не пишет source/fixtures/snapshots.
5. Никакой массовой генерации 32 эпизодов до зелёного episode-1 vertical slice и chapter-1 dogfood.
6. Не удалять legacy, Challenges, Personal Plan или текущие Speaking Club routes. Retirement — отдельная поздняя decision phase.
7. Не использовать project OpenAI key для локальной генерации/оценки. Content provider запускается только через существующий production/admin pipeline и его budget/approval controls.
8. Перед изменением Admin прочитать целиком `docs/design/ADMIN_UI_BIBLE.md`.
9. На ярко-зелёных/lime поверхностях использовать только тёмный foreground.
10. Новые generated packs доступны только через loader; не делать статические multi-hundred-KB imports.
11. Все intervals/recorders/listeners/loops gated by focus + AppState и освобождаются на blur/unmount/interruption.
12. После каждого task — focused tests; после каждой phase — code review, verification, decision log и commit.
13. До создания Content Studio namespaces выполнить dedicated Phase 00: inventory legacy direct Firestore access, заменить global admin catch-all и доказать authenticated-admin denial новых paths в emulator. Narrow deny не перекрывает overlapping allow.

## 1. GSD milestone map

| GSD phase | Название | Главный deliverable | Go/no-go |
|---|---|---|---|
| 00 | Security & canonical bytes | rules inventory + body/record/hash redline | admin emulator deny, legacy compatibility и golden vectors зелёные |
| 01 | Contracts & invariants | episode/activity/evidence + Content Studio authoring schemas | одинаковые fixtures валидны client/server/admin |
| 02 | Progress & fair stars | local reducer, outbox, server event receipts, separate purchased-boost ledger и purchase callable | earned access остаётся read-only projection, а purchased access не может стать mastery |
| 03 | Shared activity runtime | registry, scaffold, core shells | неизвестный type fail-safe, accessibility contract зелёный |
| 04 | Unified voice runtime | capture lifecycle + evidence capability | interruption/noise/permission matrix зелёная |
| 05 | P0 activities & adapters | базовые renderers + read-only legacy adapters | результаты нормализованы без изменения legacy storage |
| 06 | Content Studio & delivery seam | Mode Library → Episode Builder → Preview Lab → validation/localization → release → rollback | E1 создаётся и публикуется без ручного редактирования production-файлов |
| 07 | Episode 1 vertical slice | E1 полностью playable | offline/restart/reward/analytics работают |
| 08 | Chapter 1 pilot | E1–E8 + checkpoint | internal dogfood и content QA пройдены |
| 09 | Transfer & personalization | Club capstone + review scheduler | typed/voice evidence разделены |
| 10 | Migration & checkpoints | placement, legacy adapters, E16/E24/E32 | старый прогресс сохранён |
| 11 | Full 32 season | четыре главы в release | 32 graphs прошли gates |
| 12 | Measurement & observability | events, experiments и admin health | delayed window и guardrails измеримы |
| 13 | Controlled rollout | dogfood → closed cohorts → candidate default | stop/rollback gates пройдены |
| 14 | Legacy decision | отдельное решение по Challenges/legacy | только после паритета и одобрения |

Для каждой строки выполнить `/gsd:plan-phase <N>` непосредственно перед кодом, затем аудит фазы и обновление `docs/v2` при изменении решения.

---

## Phase 00 — Security inventory and canonical artifact boundary

Выполнить mandatory Task 0 и contract redline dedicated Content Studio plan до создания Firestore collections/indexes или запуска authoring callables.

**Gate:**

- every legacy direct Admin path имеет explicit inventory/classification и compatibility test;
- global `isAdmin()` catch-all заменён explicit legacy allows либо доказуемым path-excluding predicate;
- authenticated admin direct get/list/create/update/delete всех будущих authoring/projection paths получает deny в emulator;
- ModeTemplate/Episode/Season, concrete eight-entry DecisionRegistry, capability catalog, app-support manifest, preview envelope и season release manifest разделены на hashable Body без self hash и immutable Record;
- client/Functions recompute один exact canonical UTF-8 golden vector и reject body с hash/object/lifecycle/receipt.

---

## Phase 01 — Domain contracts and conformance fixtures

### Task 1.1 — Зафиксировать identity и versioning

**Create:**

- `modules/learning-v2/contracts/identities.ts`
- `modules/learning-v2/contracts/schema_versions.ts`
- `tests/learning_v2_identity_contract.test.ts`

**Test first:**

- допустимые `courseId`, `seasonId`, `episodeId`, `nodeId`, `activityId`, `skillId`, `releaseId`;
- identity не зависит от текста/локализации;
- `activityId` уникален внутри release;
- неизвестная schema version отклоняется;
- release change не переименовывает stable `skillId`.

**Implementation:** pure branded-string validators без React/Firebase imports.

**Verify:**

```powershell
npx jest --runTestsByPath tests/learning_v2_identity_contract.test.ts --no-cache --runInBand
```

**Acceptance:** один документированный identity grammar используется в client fixtures, admin preview и backend tests.

### Task 1.1A — Immutable decision registry artifact

**Create:**

- `modules/learning-v2/policies/decision_registry.ts`
- `functions/src/content_studio/decision_registry.ts`
- `tests/fixtures/learning-v2/content-studio/decision-registry.v1.json`
- `tests/learning_v2_decision_registry.test.ts`
- `functions/src/content_studio/decision_registry.test.ts`

**Contract:** implement exact spec 08 §6.2 `DecisionRegistryBody` with the eight discriminated `HYP-V2-001..008` setting shapes, immutable `DecisionRegistryRecord {ref: VersionRef, object, createdAt}` and resolved pair. Body has no own hash/object/time; `ref.id/version` equal body identity and `ref.contentHash = hashCanonicalBody(body) = object.contentHash`. Storage is immutable and content-addressed. `HYP-V2-006` carries independent `maxBoostsPerGate`, `maxBoostsPerChapter` and `maxBoostsPerSeason` values; none may be inferred from another. Version 1 remains internal-only at `HYP-V2-008` rollout 0% until a powered experiment passport publishes a new registry version.

**Test first:** shared client/Functions fixture and ordered issue-code corpus cover exact eight-key completeness, map-key/decisionId match, finite ranges/fractions, unique increasing ordinals/milestones, derived star/gate totals, hash/object mismatch, missing/unknown setting and forbidden latest-version resolution. Both runtimes must produce the same canonical bytes/hash and the same accept/reject results.

**Acceptance:** Season/manifest/bundle can reference only a validated exact `VersionRef`; no release numeric setting is read from a mutable latest document or free-form Admin field.

### Task 1.2 — Activity, episode и curriculum contracts

**Create:**

- `modules/learning-v2/contracts/activity.ts`
- `modules/learning-v2/contracts/episode.ts`
- `modules/learning-v2/contracts/curriculum.ts`
- `modules/learning-v2/contracts/validation.ts`
- `tests/fixtures/learning-v2/episode-01.valid.json`
- `tests/fixtures/learning-v2/episode.invalid.json`
- `tests/learning_v2_episode_contract.test.ts`

**Contract fields:**

- activity type/version, renderer/scorer/progress/reward policy ids;
- prompt/media/input/fallback capabilities;
- target `skillIds`, `phraseIds`, semantic slots;
- `requiredForCore`, `gateEligible`, `voiceEvidenceOptional` and graph phase `encounter_build | near_transfer | independent_probe | optional_review`;
- phase-correlated typed per-node evidence declarations keyed only by the canonical collision-free `nodeId + objectiveId + skillId + construct + phase + targetKind + targetId` identity; each evidence-bearing node publishes an exact `LearningPedagogicalContextContract` for allowed support/hints plus immutable context/prompt, and only published objective/skill/semantic-slot/critical-constraint IDs are legal;
- episode can-do, graph edges, 8–9 nodes, capstone, exactly two access-required loops (`encounter_build` + immediate `near_transfer`), separate `assessmentNodes.independentProbeNodeIds` and separately scheduled D+N review;
- typed `learningDesign` with per-objective `supportPlan`, code-owned fade/escalation rule refs, an acyclic prerequisite outcome/exposure DAG, `independentProbeRef`, content-hashed `V2DelayedProbeRef` and explicit `delayedWindowPolicyId` resolved under `HYP-V2-007` of the season's exact `decisionRegistryRef: VersionRef`; each Episode owns hash-free delayed-probe definitions that bind a scheduler-only `probeNodeId`, exact ActivityInstance/template, new context/support and delayed-only evidence declarations;
- versioned evidence-policy mastery requirements by objective, construct (`semantic | listening | recall | spoken | interaction`), phase, validity and maximum support; discriminated near/independent/delayed review links;
- locale capability requirements and asset references.

**Test first:**

- graph acyclic and reachable;
- exactly one entry and one capstone;
- no missing edge/node;
- checkpoint introduces no new required skill;
- every checkpoint requirement is `phase='independent_probe'`, matches one exact node evidence declaration, and every critical semantic-slot/constraint ID has one requirement and one targeted repair route; `checkpoint.assessmentNodeIds` are unique, equal the requirement-node set and are a subset of `assessmentNodes.independentProbeNodeIds`; assessed-objective sets match; alternate/reassessment evidence nodes are also independent, while training repair nodes do not enter projection; delayed scheduler tuples are rejected from checkpoint pass/access;
- for every evidence-bearing graph node `node.phase = declaration.phase = pedagogicalContextContract.phase`; optional-review nodes have no declarations. Stable issue codes cover phase/provenance/checkpoint-set mismatch;
- core route remains achievable without voice-specific star;
- every supported accessibility route reaches core completion and every access-required performance-star slot without claiming an unmeasured construct;
- every production outcome is preceded by a valid exposure edge and support fades according to the pinned plan;
- training prompt, independent probe and delayed probe are distinct refs with compatible objective/construct coverage;
- every delayed ref resolves in the exact target EpisodeRevision to one body whose hash recomputes, whose activity/template/declarations match, and whose `probeNodeId` is absent from graph/loops/star slots/checkpoint; string/latest/orphan refs fail closed;
- independent probe is not inside `requiredLoops` and cannot block an ordinary episode access gate; the only exception is an explicit published checkpoint-pass condition derived from independent-only evidence at chapter boundaries (E8→E9, E16→E17, E24→E25; E32 defines final checkpoint status). Same-session `near_transfer` never satisfies delayed/durable evidence; D+N is emitted only by the separate scheduler; nominal D+1/D+7/D+21 review cadence is distinct from the pinned `HYP-V2-007` D+3…D+7 assessable window, and out-of-window delivery is `not_assessed_for_window`, not failure or mastery;
- max two new grammar distinctions and configured phrase limits;
- all referenced ids/assets exist.
- curriculum/season release pins an immutable decision-registry version/hash; every used setting under `HYP-V2-001..008` resolves from that exact body, and a missing ID or hash mismatch fails closed.

**Acceptance:** valid fixture represents E1 from curriculum with actual learning design and no probe-as-gate shortcut; invalid fixture reports stable machine-readable error codes.

### Task 1.3 — Evidence and result contracts

**Create:**

- `modules/learning-v2/contracts/evidence.ts`
- `modules/learning-v2/contracts/attempt.ts`
- `modules/learning-v2/contracts/activity_result.ts`
- `modules/learning-v2/contracts/delayed_probe.ts`
- `tests/learning_v2_evidence_contract.test.ts`
- `tests/learning_v2_attempt_hash_chain.test.ts`
- `tests/learning_v2_attempt_cardinality.test.ts`
- `tests/learning_v2_delayed_probe_contract.test.ts`

**Reuse, do not redefine:** one shared strict contract chain from normative specs 05/06. Registry `sanitizeAttemptBody` accepts only ephemeral submission/evaluator/context input and returns a hash-free `V2AttemptEventBody`; it must never require or fabricate a post-hash `V2AttemptEvent`, `CanonicalAttemptRef` or learning ref. A graph body embeds canonical `V2OutcomeDecision + V2Evidence` and exhaustive phase-correlated terminal `learningTupleDispositions`; a delayed body embeds only exhaustive client candidates, never server timing/system/window resolution. Both contain no learning ref/self hash. Compute `CanonicalAttemptRef` from only that immutable body. Graph materializes directly; delayed server first writes an immutable timing/system receipt with an exhaustive `V2DelayedTerminalTupleResolution` table, then materializes separately hashed `LearningEvidenceBody`/`LearningNonAssessmentBody` records and refs. `V2AttemptEvent` is the non-hashable ledger join envelope over original body/ref, exact graph/receipt materialization basis and those refs. `activity_result.ts`, progress, Admin fixtures and the Functions mirror consume the same schema/version corpus; they must not introduce a shadow `AttemptOutcome`, flatten voice/non-voice variants or duplicate learning-evidence shapes.

Keep evidence kinds distinct: meaning recognition, listening, recall, transcript intelligibility, acoustic segmental, acoustic prosody, communicative objective and delayed transfer.

**Tests:**

- transcript scorer cannot emit acoustic evidence;
- text input cannot emit voice evidence;
- uncertain/invalid result has zero negative learning delta;
- invalid outcome/evidence pairings fail the shared parser in client and Functions conformance tests;
- attempt-body hash is unchanged by learning-ref ordering/presence; compile/schema-negative fixtures reject learning refs or self hash inside the body and any envelope hash;
- registry sanitizer accepts pre-hash ephemeral input and returns only `V2AttemptEventBody`; compile/schema-negative fixtures reject a sanitizer signature that accepts/returns `V2AttemptEvent`, and a separate post-hash joiner refuses missing/mismatched `CanonicalAttemptRef` or materialization basis;
- every `CanonicalRuntimeEvidenceRef` recomputes to the exact sanitized `attemptBody.evidence` hash and the same `CanonicalAttemptRef`; cross-attempt evidence substitution fails closed;
- one attempt contains `0..N` assessed refs and `0..N` non-assessment refs without collapsing them into one opaque single-record field; their combined set is unique and bounded by exact declared `node + objective + skill + construct + phase + target` tuples;
- `LearningEvidenceTupleKey` is created only by shared `buildLearningEvidenceTupleKey` as `letk1.` + base64url of the JCS seven-field array; fixtures prove adversarial delimiter-containing inputs, moved boundaries and tuples differing only by `skillId` cannot collide, while manual join/field omission/alternate encoding is rejected;
- dispositions contain exactly one entry per declaration: missing/duplicate/unknown fails; `met|meets_target→success`, `missed|needs_work→needs_work`; `SKIPPED` requires `no_record/skipped_by_learner` for every declaration and zero learning refs, leaving checkpoint evidence unobserved/incomplete; every other outcome yields assessed or non-assessment ref per tuple;
- attempt phase/context/prompt matches the published context contract and actual support/hints/exposure stays within bounds; near-transfer masquerading as independent fails. Assessed input binding must match the same evidence envelope, evaluator `ran` state and exact calibration receipt+scope; semantic objective outcome without speech-feature observation cannot create spoken/acoustic evidence;
- `attemptBody.evidence.hintsUsed` is the single attempt-wide fact and exactly equals every tuple provenance hint fact; the duplicate body-base field is rejected. Independent/delayed hints `>0`, or evidence `2` disguised as tuple provenance `0`, fail before materialization;
- graph-node attempts may materialize refs after their attempt ref, but a scheduled delayed attempt is a two-phase `V2DelayedAttemptCandidate` with no learning refs/server resolution. Server returns one terminal ack whose exact receipt carries one terminal resolution per candidate/declaration: in-window observed candidate → assessed, outside-window non-skipped candidate → window non-assessment, system failure non-skipped candidate → system non-assessment, and `SKIPPED/no_record` → no ref. Finalized envelope pin-ит that receipt as materialization basis. `protocol_rejected` has no resolution table/finalized event/learning refs. Client time, an offline review without attestation or replay cannot mint durable evidence or leave a valid candidate forever pending;
- ID-only `semanticSlotOutcomes` and `criticalConstraintOutcomes` in voice/non-voice evidence map 1:1 into typed learning bodies; raw values, answers, transcript and PII are rejected;
- `not_assessed_for_window` is legal only for `delayed_probe`, projects to `outside_window`, and creates neither delayed evidence nor mastery/checkpoint success.

### Task 1.4 — Backend conformance mirror

Functions compile only `functions/src`, so avoid a risky workspace refactor in the first slice. Keep canonical fixtures and schema version ids shared by tests; backend has a thin mirrored parser with conformance tests.

**Create:**

- `functions/src/learning_v2/contracts.ts`
- `functions/src/learning_v2/contracts.test.ts`

**Modify:**

- `tests/learning_v2_episode_contract.test.ts` to verify the fixture/error-code manifest expected by both runtimes.

**Acceptance:** client and Functions accept/reject the same checked-in corpus, recompute the same attempt/learning body hashes and reject circular, duplicate, undeclared or over-cardinality refs. Any drift fails CI.

### Task 1.5 — Content Studio authoring contracts before UI/backend work

Выполнить Tasks 1–3 dedicated плана [`2026-07-14-phraseman-v2-content-studio.md`](./2026-07-14-phraseman-v2-content-studio.md) в Phase 01. Task 4 намеренно отложен до появления единственной канонической gate policy в Phase 02.

**Create:**

- `modules/learning-v2/contracts/content_studio.ts`
- `modules/learning-v2/contracts/content_studio_validation.ts`
- `modules/learning-v2/registry/mode_capability_catalog.ts`
- `modules/learning-v2/content/app_support_manifest.ts`
- `modules/learning-v2/authoring/mode_template.ts`
- mirrored Functions contracts/template repository/storage paths and shared conformance corpus named in dedicated Tasks 1–3.

**Required decisions:** separate identities/layers; 17 families and episode-level checkpoint; Activity content vs graph routing/phase and Episode-owned Activity lifecycle; performance-star slots separate from typed learning evidence; actual per-episode learning design, versioned evidence-policy requirements, ordinary-episode non-gating probes and an explicit independent-only checkpoint-pass boundary exception; exact five `PolicyRef {kind,key,version,contentHash}` slots validated across catalog/support manifest; every policy represented as hash-free `PolicyDescriptorBody` plus exact ref/immutable record with `ref.contentHash=hash(body)` and fail-closed body/ref/object conformance; exact SpeechCalibrationReceipt/VoiceDataPolicy body-record refs when required; concrete hash-free eight-entry `DecisionRegistryBody`, immutable `DecisionRegistryRecord/VersionRef`, shared golden corpus and exact Season/manifest/bundle-provenance `decisionRegistryRef` with fail-closed resolution of `HYP-V2-001..008`; ModeTemplate/Episode/Season/capability/support artifacts split into hashable Body, immutable identity/hash/object/provenance Record, mutable head/lifecycle and append-only receipts resolved by subject fingerprint; no artifact record receipt backrefs; `LocalizedContentValue` inside bodies while localization workflow metadata stays in server projections/receipts; preview conditions separate from six renderer states; canonical JSON/hash formulas and 64-hex corpus; exact season refs/gate policy/release scopes; code-owned capability catalog.

**Acceptance:** dedicated Tasks 1–3 pass in full: the same corpus and golden hash vectors pass client/Functions, all hashed bodies reject self hash/object/receipt/localization-workflow metadata, the concrete DecisionRegistry body/ref/record/object and all eight typed settings pass mirrored conformance, immutable records reject receipt IDs/arrays, all 17 families are exhaustive, checkpoint validates separately, incomplete or hash-mismatched five-policy sets fail, actual learning design/probe/accessibility semantics pass, exact pins/body-record/lifecycle semantics pass, and no admin entity can contain executable implementation.

### Phase 01 gate

```powershell
npx jest --runTestsByPath tests/learning_v2_identity_contract.test.ts tests/learning_v2_episode_contract.test.ts tests/learning_v2_evidence_contract.test.ts tests/learning_v2_delayed_probe_contract.test.ts --no-cache --runInBand
npx jest --runTestsByPath tests/learning_v2_content_studio_contract.test.ts tests/learning_v2_content_studio_canonical_json.test.ts tests/learning_v2_decision_registry.test.ts tests/learning_v2_mode_capability_catalog.test.ts tests/learning_v2_mode_template.test.ts --no-cache --runInBand
Push-Location functions; npx jest --runTestsByPath src/learning_v2/contracts.test.ts src/content_studio/contracts.test.ts src/content_studio/canonical_json.test.ts src/content_studio/decision_registry.test.ts src/content_studio/app_support_manifest.test.ts src/content_studio/mode_template_repository.test.ts src/content_studio/storage_paths.test.ts --no-cache --runInBand; Pop-Location
```

---

## Phase 02 — Progress, performance stars and access economy

### Task 2.1 — Pure local progress reducer

**Create:**

- `modules/learning-v2/progress/progress_types.ts`
- `modules/learning-v2/progress/progress_reducer.ts`
- `modules/learning-v2/progress/gate_policy.ts`
- `modules/learning-v2/progress/learning_evidence_policy.ts`
- `modules/learning-v2/progress/checkpoint_projection.ts`
- `tests/learning_v2_progress_reducer.test.ts`
- `tests/learning_v2_gate_policy.test.ts`
- `tests/learning_v2_checkpoint_projection.test.ts`

**Tests first:**

- best-per-node 0–3, never decreases;
- same/worse replay gives delta 0;
- `performanceStarsEarned` is the writable best-performance source projection; `accessStarsEarned` is its read-only 1:1 selector/projection and has no independent ledger, policy, reducer command or write path; `accessStarsPurchased` remains a separate server-authoritative boost ledger;
- one accepted activity event updates best performance once and deterministically rematerializes earned access from the same delta; a tampered/stale access cache is rejected or rebuilt from best performance;
- mastery/learning projection is derived only from typed `learningEvidence`, never from any star sum;
- `learningEvidenceIndex` is bounded by declared full tuples, and `checkpointEvidenceIndex` is a bounded projection of the same refs over exact checkpoint requirements;
- checkpoint pass requires the pinned policy plus assessed success for every critical semantic-slot/constraint tuple; critical `needs_work` selects only declared targeted repair/reassessment, non-assessment selects equivalent alternate, and unobserved remains incomplete;
- out-of-window delayed delivery is `not_assessed_for_window → outside_window`, never failure, delayed evidence, mastery or checkpoint success;
- gate curve exact for E1–E32 and monotonic;
- first-contact and transfer loop cannot farm identical result;
- checkpoint ignores purchased access;
- content release change preserves stable skill evidence;
- legacy fields are never mutated.

**Acceptance:** all formulas are pure/deterministic and match `docs/v2/05-stars-progress-and-mastery.md`; no code path can independently increment, merge or persist `accessStarsEarned` as a second source of truth.

### Task 2.2 — Content Studio season and episode authoring contracts

После зелёного `tests/learning_v2_gate_policy.test.ts` выполнить dedicated Content Studio Task 4. Создать `season_draft.ts`, `episode_draft.ts`, `episode_graph.ts`, их Functions repositories и focused tests. Gate materializer импортирует существующую pure policy/table из `modules/learning-v2/progress/gate_policy.ts`; он не копирует формулу и не создаёт второй threshold catalog.

**Acceptance:** ActivityInstance content отделён от EpisodeGraphNode routing/reward fields; episode clone remaps all graph-owned IDs; SeasonDraft supports exact `vertical_slice`, `chapter_internal` and `full_season` scopes; clone/pin/stale-ref rules pass; scope gates exactly equal the canonical gate-policy output; production accepts only `full_season`.

### Task 2.3 — Account-scoped local store and outbox

**Create:**

- `modules/learning-v2/progress/progress_store.ts`
- `modules/learning-v2/progress/progress_peek_cache.ts`
- `modules/learning-v2/progress/progress_outbox.ts`
- `modules/learning-v2/progress/progress_hydration.ts`
- `tests/learning_v2_progress_storage.test.ts`
- `tests/learning_v2_progress_outbox.test.ts`

**Patterns to reuse:** synchronous first-frame peek cache; account-scoped keys; idempotent mutation ids; bounded cache/TTL.

**Tests:** restart, offline, duplicate enqueue, out-of-order acknowledgement, anonymous→provider link, account switch, corrupt local record, unknown schema; graph attempt body/ref, exhaustive tuple dispositions and each learning body/ref survive atomically without a whole-envelope hash; delayed candidate survives independently without learning refs, shows only pending sync, and applies exactly one terminal `timed_finalized | system_non_assessment_finalized | protocol_rejected` ack under the same account generation; replay cannot grow either bounded evidence index or leave a terminal candidate queued.

**Acceptance:** first render uses last-known real state; no full-screen spinner and no cross-account leakage.

### Task 2.4 — Server progress event

**Create:**

- `functions/src/learning_v2/progress_event.ts`
- `functions/src/learning_v2/progress_event.test.ts`
- `functions/src/learning_v2/attempt_hash_chain.test.ts`

**Modify:**

- `functions/src/index.ts` — export callable;
- `firestore.rules` — server-owned V2 ledger/progress paths;
- `firestore.indexes.json` only if an actual query requires an index.

**Reuse:** fingerprint/idempotency patterns from `functions/src/progress_events.ts`.

**Server invariants:** auth/stable ownership, allowlisted event type, payload cap, immutable component receipts, exact `attemptBodyHash`, exhaustive phase-correlated per-tuple dispositions/provenance/input bindings, separately verified evidence/non-assessment body hashes, `0..N` combined tuple uniqueness/cardinality, atomic best/delta/index update, replay with the same attempt body and component fingerprints accepted, same `opId` with a different attempt-body hash rejected. For `scheduled_delayed_probe`, accept only a candidate without learning refs and return an idempotent terminal ack: valid assignment/launch gets server timing and in/out-window finalized refs; validly bound missing/stale assignment or missing/expired launch gets immutable system-failure receipt, no timing receipt and per-tuple system non-assessment; account/probe/template/declaration/hash substitution gets protocol rejection without learning refs. The server never hashes or deduplicates the `V2AttemptEvent` envelope as one object.

### Task 2.5 — Dedicated Access Boost purchase callable

Do **not** reuse generic `shardsApplyDelta`: price/reason supplied by client is not a valid commerce boundary.

**Create:**

- `functions/src/learning_v2/access_boost_purchase.ts`
- `functions/src/learning_v2/access_boost_purchase.test.ts`
- `modules/learning-v2/progress/access_boost_client.ts`
- `tests/learning_v2_access_boost_client.test.ts`

**Modify:**

- `functions/src/index.ts` — export `purchaseV2AccessBoost`;

**Callable owns:** eligibility, current gate deficit, catalog revision, price, per-episode/per-day cap, shard balance, atomic debit, non-transferable receipt, consumption target and idempotency.

**Abuse tests:** tampered price/deficit/account/episode/release; replay; concurrent double purchase; insufficient shards; gate already opened; stale catalog; purchase after rollback.

**Acceptance:** no client value can create mastery or decide debit amount.

### Task 2.6 — Rules and emulator gate

**Create:**

- `tests/learning_v2_firestore_security.test.ts`
- `functions/src/learning_v2/emulator/access_boost.emulator.test.ts`

**Verify focused:** direct client writes to progress/learning-evidence/purchase receipts denied; server transaction succeeds once; account A cannot read/write B.

### Phase 02 gate

Run only the new focused root/Functions/rules tests plus existing progress-event guards. Perform a manual invariant review: sum of purchase receipts equals debit; performance/access stars remain diagnostics/gates; neither earned nor purchased stars enter the learning-evidence projection; attempt/learning hashes are acyclic; checkpoint pass/repair is reproducible from bounded refs without a writable boolean.

---

## Phase 03 — Activity registry and shared UI shells

**Required skill gate:** before Task 3.0 review and again before Tasks 3.2–3.3 implementation, invoke the already-audited `ui-ux-pro-max`, `emil-design-eng`, and `rn-accessibility-audit`; for React Native motion/audio shells also invoke `animations` and `audio` where applicable. Their recommendations are inputs, not authority: approved reference evidence, project UI Contrast Rule, Performance Bible and accessibility/runtime contracts override generic presets.

### Task 3.0 — Reference Evidence Pack gate

Выполнить dedicated Content Studio Task 5A до `ActivityScaffold`, shells и activity UI. Для каждого selected competitor mode собрать traceable capture ledger (product/version/platform/locale/date/source/rights note), минимум 3–6+ behavior states, motion/accessibility annotations, затем создать оригинальные multi-frame Phraseman wireframes, per-mode contact sheet и distinctiveness matrix. `phraseman-wireframes.md` индексирует каждый sheet; raw competitor captures остаются ignored evidence inputs. Marketing screenshot без first-hand metadata не считается evidence; branded assets/copy/trade dress не копируются.

**Gate:** до реализации показать пользователю 3–6+ frame contact sheet каждого Phase 03/05 mode и записать current `approved | changes_requested` с wireframe revision/hash в `activity-mode-ui-review.json`. `tests/learning_v2_reference_evidence_contract.test.ts` проходит только при current approval; каждый mode mapped к шести PreviewState и отдельным offline/permission/signal/scorer/theme/text-scale conditions. Missing/stale approval или `changes_requested` блокирует только соответствующий mode и его shared-shell dependency.

### Task 3.1 — Registry without React coupling

**Create:**

- `modules/learning-v2/runtime/activity_registry.ts`
- `modules/learning-v2/runtime/activity_runtime.ts`
- `modules/learning-v2/runtime/unsupported_activity.ts`
- `tests/learning_v2_activity_registry.test.ts`

Each registration supplies payload validator, renderer key, exact hash-pinned scoring/evidence/progress/reward/recovery `PolicyRef` compatibility, offline capability and accessibility fallback. Every compatible ref resolves to a catalog `{PolicyDescriptorBody, PolicyRef}` pair whose hash and kind/key/version are recomputed; the immutable policy record/object must pin the same ref.

**Tests:** duplicate type, missing one of five policies, same key/version with different hash, incompatible schema version, unsupported capability, lazy renderer resolution, safe unknown-type error.

### Task 3.2 — Common `ActivityScaffold`

**Create:**

- `components/learning-v2/ActivityScaffold.tsx`
- `components/learning-v2/ActivityHeader.tsx`
- `components/learning-v2/PromptZone.tsx`
- `components/learning-v2/ActionDock.tsx`
- `components/learning-v2/FeedbackSheet.tsx`
- `tests-rntl/learning_v2_activity_scaffold.test.tsx`

**Acceptance:** stable geometry, 44/48 px targets, 200% text, dark foreground on lime, reduced motion, correct focus after feedback, no color-only status.

### Task 3.3 — Six shells

**Create:**

- `components/learning-v2/shells/ChoiceShell.tsx`
- `components/learning-v2/shells/ComposerShell.tsx`
- `components/learning-v2/shells/VoiceActivityShell.tsx`
- `components/learning-v2/shells/StoryPlayerShell.tsx`
- `components/learning-v2/shells/ScenarioShell.tsx`
- `components/learning-v2/shells/ReviewAssessmentShell.tsx`
- focused RNTL tests per shell.

**Rule:** shells render states; activity definitions provide data/policies. Do not put episode-specific content in components.

### Task 3.4 — Thin routes and resume

**Create:**

- `app/learning_v2_episode.tsx`
- `app/learning_v2_activity.tsx`
- `modules/learning-v2/runtime/episode_session.ts`
- `tests/learning_v2_episode_session.test.ts`

**Acceptance:** deep link validation, resume exact node, back/close persistence, no hidden hot screen, unknown release/activity returns recovery UI.

---

## Phase 04 — Unified Voice Activity Shell

### Task 4.1 — Capture lifecycle as a state machine

**Create:**

- `modules/learning-v2/voice/voice_state_machine.ts`
- `modules/learning-v2/voice/voice_capture_controller.ts`
- `modules/learning-v2/voice/audio_route.ts`
- `modules/learning-v2/voice/signal_quality.ts`
- `tests/learning_v2_voice_state_machine.test.ts`

**States:** idle → permission explanation → system permission → ready → recording → quality check → evaluating → four terminal outcomes.

**Tests:** permission result never auto-starts recording; double tap; timeout; background; route change; incoming interruption; TTS collision; duplicate callbacks; cleanup.

### Task 4.2 — Scorer provider capability boundary

**Create:**

- `modules/learning-v2/voice/scorer_provider.ts`
- `modules/learning-v2/voice/transcript_intelligibility_adapter.ts`
- `modules/learning-v2/voice/voice_feedback_copy.ts`
- `tests/learning_v2_voice_evidence_capability.test.ts`

**Reuse:** `scorePronunciationTranscript` only behind `transcript_intelligibility`; copy says «слова распознаны», not phoneme/prosody claims.

**Acceptance:** Sound Lab/acoustic UI remains feature-disabled until benchmarked provider declares capability.

### Task 4.2A — Calibration and voice-data release gates

**Create:**

- `modules/learning-v2/voice/speech_calibration_ref.ts`
- `modules/learning-v2/voice/voice_data_policy_ref.ts`
- `modules/learning-v2/voice/voice_consent_copy_ref.ts`
- `modules/learning-v2/voice/voice_deletion_route_ref.ts`
- `modules/learning-v2/voice/voice_minors_policy_ref.ts`
- `modules/learning-v2/voice/voice_network_egress_ref.ts`
- `modules/learning-v2/voice/voice_network_egress_contract.ts`
- `modules/learning-v2/voice/voice_governance_records.ts`
- `modules/learning-v2/voice/voice_network_egress_support.ts`
- `tests/learning_v2_voice_governance_refs.test.ts`
- `tests/learning_v2_voice_network_activation_gate.test.ts`
- corresponding Functions validators/tests from the Phase 04 GSD plan.

Pin the exact `SpeechCalibrationReceiptBody + Record` for provider/model/config/locale/task type and exact approved `VoiceDataPolicyBody + Record` for any network audio/transcript processing. Policy v2 contains immutable `VoiceConsentCopyRef(copyId/version/locale/contentHash)`, specialized `VoiceDeletionRouteRef` per managed/processor route and exact `VoiceMinorsPolicyRef`; `VoiceNetworkEgressRef` belongs to discriminated `VoiceReleaseRequirements` and typed app/season support manifests, not to the policy body. Implement canonical Body/Record schemas for consent copy, deletion route, minors policy, network egress, classification attestation, guardian consent and eligibility; recompute every referenced body hash and reject string aliases, mutable heads, self-hash fixtures and identity/version/hash mismatch. Acoustic claims cannot release without calibration thresholds/fairness receipt. Network Speaking Club/ASR/scoring cannot activate until Phase 09 deploys the exact provider-agnostic egress body attesting `reservation-consume-settle-reconcile.v1`, terminal provider finality and settlement-bound deletion, both app support manifests plus season release pin the same ref, and adapter inventory proves no direct/public provider entry point.

Until that activation gate passes, `transcript_intelligibility_adapter.ts` is a pure local post-transcript scorer: it may consume an already available transcript but cannot start network recognition/scoring or import a provider SDK/client. `VoiceReleaseRequirements` on-device branch forbids policy/registry/purposes/egress; network branch requires exact policy/registry/non-empty purposes/egress and a deterministic scripted/on-device/non-voice fallback. These are non-waivable Content Studio and release blockers.

**Tests:** false accept/reject/abstention/subgroup gates; provider/config invalidation; policy/copy/route/minors/egress/classification/guardian/eligibility body-record identity+hash mismatch; duplicate consent-copy locale; policy expiry/revoke; compile/schema parity for discriminated requirements; app/season support manifest egress mismatch and legacy lifecycle protocol fail closed; static import failure for direct provider access; network activation fails before Phase 09 egress deployment; scripted offline path remains available.

### Task 4.3 — Accessible capture UI

**Modify:**

- `components/learning-v2/shells/VoiceActivityShell.tsx`

**Create:**

- `components/learning-v2/voice/ReferenceCard.tsx`
- `components/learning-v2/voice/CaptureCard.tsx`
- `components/learning-v2/voice/TranscriptConfirmCard.tsx`
- `components/learning-v2/voice/VoiceFeedbackSheet.tsx`
- `tests-rntl/learning_v2_voice_shell.test.tsx`

**Default:** tap-to-start/tap-to-stop; optional hold preference only. Waveform hidden from accessibility tree; textual timer/status exposed.

### Task 4.4 — Device matrix

Manual verification on at least one iOS and two materially different Android devices:

- built-in/wired/Bluetooth mic;
- quiet/noise/silence;
- permission deny/re-enable;
- TTS→record handoff;
- call/alarm/background/navigation;
- TalkBack/VoiceOver/reduced motion.

Store only concise evidence in ignored `qa-artifacts/learning-v2/voice/`; no raw user speech in committed files.

---

## Phase 05 — P0 activity implementations and legacy adapters

### Task 5.1 — Visual Discovery and Listen & Choose

**Create:**

- `modules/learning-v2/activities/visual_discovery.ts`
- `modules/learning-v2/activities/listen_choose.ts`
- `tests/learning_v2_choice_activities.test.ts`

Render through `ChoiceShell`; missing asset gives text/audio recovery, not wrong answer.

### Task 5.2 — Phrase Builder

**Create:**

- `modules/learning-v2/activities/phrase_builder.ts`
- `tests/learning_v2_phrase_builder.test.ts`

Tap-first; drag optional; correct chunks retained on retry; locale-aware normalization.

### Task 5.3 — Repeat and Quick Response

**Create:**

- `modules/learning-v2/activities/scripted_repeat.ts`
- `modules/learning-v2/activities/quick_spoken_response.ts`
- semantic-slot evaluator tests.

Quick response uses editable transcript confirmation and valid semantic variants; it does not force-align to one sentence.

### Task 5.4 — Scripted Dialogue

**Create:**

- `modules/learning-v2/activities/scripted_dialogue.ts`
- `modules/learning-v2/scenario/scripted_dialogue_runtime.ts`
- `tests/learning_v2_scripted_dialogue.test.ts`

Deterministic, offline-capable, bounded turns, repair branch, no AI dependency.

### Task 5.5 — Existing-mode adapters

**Create:**

- `modules/learning-v2/adapters/legacy_lesson_adapter.ts`
- `modules/learning-v2/adapters/personal_plan_adapter.ts`
- `tests/learning_v2_legacy_adapter.test.ts`
- `tests/learning_v2_personal_plan_adapter.test.ts`

**Read-only integration:** adapters map payload/result; they do not rewrite legacy progress keys or reward events.

---

## Phase 06 — Generator, release and client loader

Phase 06 executes remaining Tasks 5–15 in the dedicated plan; mandatory Task 0, Tasks 1–4 and reference-evidence Task 5A must already be green. Preserve all eight Content subpages and keep Generation Queue, Review Queue and Localization projection distinct.

### Task 6.1 — V2 stage kinds and validators

**Modify:**

- `functions/src/content_factory/stage_contracts.ts`
- `functions/src/content_factory/stage_capabilities.ts`
- `functions/src/content_factory/stage_runner.ts`
- `functions/src/content_factory/generation_plan.ts`
- `functions/src/content_factory/stage_service.ts`
- `functions/src/content_factory/dependency_graph.ts`
- `functions/src/admin_content_stages.ts`
- `functions/src/content_stage_worker.ts`
- `admin/v2/scripts/pages/content-generator.js`
- `admin/v2/scripts/admin-core.js`

**Create:**

- `functions/src/content_factory/v2_episode_artifacts.ts`
- `functions/src/content_factory/v2_episode_artifacts.test.ts`
- `functions/src/content_factory/v2_episode_qa.ts`
- `functions/src/content_factory/v2_episode_qa.test.ts`

**Canonical 13 kinds, split planning:** `buildV2SeasonPlan` creates one season outline, N episode subgraphs and one season QA (N=1/8/32 by scope). `buildV2EpisodeSubgraph` owns episode outline and recipe-aware branches; dialogue/club are 0..1, not unconditional duplicates. Dependencies use the discriminator `stage | published_template | language_profile`, exact content hash/object generation and freshness fingerprint across parser/service/callable/worker. Published template/language profile are prerequisites, never stages. Migrate stage review end-to-end from publish to `content.review`, including server, `content-generator.js`, `admin-core.js` and role tests. Admin shows human Russian labels for all 13 kinds.

**Gates:** graph, phrase limits, naturalness receipt, skill coverage, two access-required loops, separate ordinary-episode non-gating independent probe plus explicit checkpoint-pass boundary contract where applicable, separately scheduled never-gating `delayedProbeRef`/D+N window semantics, versioned evidence policy, prerequisite outcome/exposure DAG, support fading, accessibility-route access-star reachability, source-locale sound profile, assets, safety, content-only approved localization, exact decision-registry ref with all `HYP-V2-001..008` settings resolvable, and deterministic hash.

### Task 6.2 — Admin Content Studio

Read `docs/design/ADMIN_UI_BIBLE.md` first.

**Create/modify exactly as detailed in the dedicated plan:**

- `admin/v2/scripts/pages/content-overview.js`
- `admin/v2/scripts/pages/content-modes.js`
- `admin/v2/scripts/pages/content-episodes.js`
- `admin/v2/scripts/pages/content-generation.js`
- `admin/v2/scripts/pages/content-review.js`
- `admin/v2/scripts/pages/content-localization.js`
- `admin/v2/scripts/pages/content-preview.js`
- `admin/v2/scripts/pages/content-releases.js`
- `admin/v2/scripts/content-studio/capability-client.js`
- `admin/v2/scripts/content-studio/mode-template-state.js`
- `admin/v2/scripts/content-studio/mode-template-controller.js`
- `admin/v2/scripts/content-studio/season-state.js`
- `admin/v2/scripts/content-studio/season-controller.js`
- `admin/v2/scripts/content-studio/episode-state.js`
- `admin/v2/scripts/content-studio/episode-controller.js`
- `admin/v2/scripts/content-studio/review-state.js`
- `admin/v2/scripts/content-studio/localization-state.js`
- `admin/v2/scripts/content-studio/preview-state.js`
- existing Admin router/capability/Firebase action seams.

**Add UI/workflows:**

- Content Overview (`#content`): unfinished drafts, submitted reviews, stale localization, preview blockers, and one continue-last-draft CTA;
- Mode Library (`#content-modes`): create the next immutable `ModeTemplateVersion`, clone, deprecate and localize it over a code-owned kernel capability, with exact version/hash pins;
- Episode Builder (`#content-episodes`): first choose a focused season workspace that pins exact approved EpisodeRevision refs, composes 4×8 chapters, previews the code-owned gate table, and flags stale refs; then open a separate episode detail to configure content-only `ActivityInstance` body/records with Episode-owned lifecycle, independently edit `EpisodeGraphNode`/star-slot/phase/two-loop/assessment-node/capstone/actual-learning-design/evidence-policy/checkpoint contracts, and save either head with expected revision/fingerprint;
- Generation Queue (`#content-generation`): preserve the existing stage queue, pagination, receipts, retry/cancel and correction workflows while adding the canonical 13-stage V2 DAG;
- Review Queue (`#content-review`): server-owned deterministic projection, bounded cursor, transactional lifecycle/append-only receipt update, separate hashable gate receipt, rebuild/consistency receipt, maker-checker and revision-bound waiver;
- Localization (`#content-localization`): content-only localized body values plus server-owned full-SHA workflow projection, source-hash freshness, bounded filter cursor, transactional review and rebuild/consistency;
- Preview Lab (`#content-preview`): hashable envelope Body + Record, six state axis plus conditions, separate one-use iOS/Android platform/build grants, exact route/native-intent cold+warm tests, two real receipts and no progress/performance-star/access-star/shard/reward/analytics writes;
- Release Center (`#content-releases`): exact approved body-record refs, season manifest Body+Record without self hash, server-authoritative environment and season-aware rollout/pause/cohort pointer while preserving four v1 surfaces.

Use only canonical permissions `content.read`, `content.draft.write`, `content.review`, and `content.publish`. Explicit submit/review callables cover ModeTemplate, Season, and Episode; independent reviewer UID and fresh review fingerprint are mandatory before publish/seal.

**Tests:** all dedicated Admin contracts plus explicit Admin Bible DoD test, 13-stage human-label test and E1 Playwright **full fake** lifecycle. Playwright fake receipts never count as device evidence.

### Task 6.3 — Backward-compatible lesson-surface bundle

**Create:**

- `functions/src/content_factory/v2_release_adapter.ts`
- `functions/src/content_factory/v2_release_adapter.test.ts`

**Modify only where integration requires it:**

- `functions/src/content_factory/release_sealing.ts`
- `functions/src/admin_content_release.ts`

Keep `course-release.v1` and its four canonical surfaces intact. Publish V2 as `lesson-bundle.v2` inside `lesson`. Build `V2SeasonReleaseManifestBody` without self hash/object and immutable Record with `manifestHash=hash(body)`. The server-owned pointer keys environment+locale pair+seasonId, pins manifest hash, catalog/rollout revision, cohorts, pause and previous release. Browser cannot select environment. Do not add a fifth surface.

### Task 6.4 — Client release loader and bounded cache

**Create:**

- `modules/learning-v2/content/release_manifest.ts`
- `modules/learning-v2/content/release_client.ts`
- `modules/learning-v2/content/release_loader.ts`
- `modules/learning-v2/content/release_cache.ts`
- `modules/learning-v2/content/bundled_registry.ts`
- `tests/learning_v2_release_loader.test.ts`
- `tests/learning_v2_release_cache.test.ts`

**Cache key:** target + source locale + seasonId + releaseId + manifestHash. Verify manifest body/record and lesson hashes before activation; atomic temp→active promotion; bounded LRU/TTL; last-known-good and bundled E1 fallback.

**Failure tests:** corrupt index/object, partial download, hash mismatch, rollback, offline first launch, started episode across release switch.

### Task 6.5 — E1 author-to-device and controlled rollout gate

Execute Tasks 14–15. Playwright asserts the full fake ModeTemplate→localization→episode→season→manifest→activate→pause→rollback lifecycle, but cannot satisfy device evidence. One preview session issues distinct one-use iOS and Android grants pinned to identical envelope hash/entity fingerprint; pass each token only to its target build. Focused native integration verifies exact route, envelope body hash and no-progress runtime; Maestro records two real receipts. Seal manifest/lesson bundle, activate only lab/staging for E1, then pause/rollback pointer with audit; production must fail.

---

## Phase 07 — Episode 1 vertical slice

### Task 7.1 — Bundled E1 fixture through the real loader

**Create:**

- `modules/learning-v2/content/bundled/en-ru/season-01-episode-01.ts`

Register it lazily in `bundled_registry.ts`. It must implement the eight-node sequence from the curriculum: VD → LC → PB → SL/RP-safe capability → RP → QR → SH-safe subset → SD. Unsupported acoustic claims stay disabled.

### Task 7.2 — Real V2 map state

**Modify carefully (dirty/high-overlap files):**

- `components/LessonsV2TabContent.tsx`
- `app/(tabs)/lessons.tsx`
- `app/config.ts`

Replace static `3 / 8` and hardcoded lesson-1 routes with episode graph/progress selectors. Preserve dev gating first; no production default yet.

**Tests:** extend `tests/lessons_v2_surface_contract.test.ts`; add `tests/learning_v2_path_progress.test.ts`.

### Task 7.3 — Completion, stars and resume

Wire ActivityResult → hash-free attempt body → attempt ref → separately hashed `0..N` learning records/refs → non-hashed outbox envelope → server ack → map. Verify restart offline, best-score replay, tuple/cardinality rejection, no duplicate XP/shards, and purchased/earned visual split.

### Task 7.4 — Analytics event slice

**Modify:**

- `app/analytics.ts`
- `app/product_analytics_governance.json`
- `app/product_analytics_event_catalog.ts`

**Create:**

- `modules/learning-v2/analytics/v2_analytics.ts`
- `tests/learning_v2_analytics_contract.test.ts`

Start only with events required for E1 decisions. No raw text/audio/transcript.

### Phase 07 end-to-end acceptance

Admin-approved E1 is sealed, loaded, hash-checked, played, interrupted/resumed, completed offline, synced once, displayed on the path and rolled back to last-known-good. All eight nodes have accessible failure states.

---

## Phase 08 — Chapter 1 and checkpoint E8

### Task 8.1 — Implement P1 modes required by E2–E8

Add Sound Contrast, Listen & Build, Context Gap, Microstory, Branching Scene and Review orchestrator through existing shells. Sound/Syllable and Shadowing expose only validated capabilities.

**Create per mode:** domain definition + focused unit test; do not create another screen unless storyboard specifies unique state.

### Task 8.2 — Generate/approve E1–E8

Use admin stages one episode at a time, then whole-chapter cross-episode QA:

- phrase/skill coverage;
- no accidental duplicates;
- review returns E1 at E2/E4/E8 as specified;
- sound focus uses `ru → en` profile;
- every capstone uses already introduced material.

После approval E1–E8 создать и независимо review-ить `chapter_internal` SeasonRevision с exact refs E1–E8, checkpoint E8 и семью gate rows из той же канонической gate policy. Она активируется только для internal staging cohort; production остаётся запрещён.

### Task 8.3 — Deterministic checkpoint shell

**Create:**

- `modules/learning-v2/checkpoint/checkpoint_contract.ts`
- `modules/learning-v2/checkpoint/checkpoint_projection.ts`
- `modules/learning-v2/checkpoint/checkpoint_repair_router.ts`
- `tests/learning_v2_checkpoint_e8.test.ts`

Implement E8 without mandatory AI. Its contract declares exact node/objective/skill/construct/`phase='independent_probe'`/target tuples with canonical collision-free keys, both `criticalSemanticSlotIds` and `criticalConstraintIds`, equivalent deterministic routes and one targeted repair/reassessment path per critical target. Voice and non-voice evaluators emit only typed ID outcomes (`met|missed`), never actual slot values, answers or transcript. The bounded `checkpointEvidenceIndex` resolves only separately hashed independent learning refs from the same canonical attempt chain; delayed scheduler records are rejected from this projection and cannot postpone the chapter gate.

**Tests first:** every requirement matches a published node declaration; each critical ID is covered exactly once; pass requires policy success plus assessed success for every critical target; critical `needs_work` routes only to its declared repair then a fresh independent assessment; non-assessment opens an equivalent route without recording fail; unobserved remains incomplete; pause/restart/two-device merge reproduce the same decision; purchased access and stars cannot alter it.

**Acceptance:** familiar shells provide pause/resume and can-do breakdown; no mandatory AI; no writable checkpoint-pass flag, whole-chapter reset or raw content/PII in progress/analytics.

### Task 8.4 — Internal dogfood

Активировать `chapter_internal` только для internal cohort. Minimum scenarios: fresh user, legacy-complete user, denied mic, noisy Android, offline commuter, screen reader, large text, account switch, stale release.

**Exit:** zero P0/P1 data/security/audio blockers; content issues triaged; failure drill recorded; decision whether to proceed to Club integration.

---

## Phase 09 — Speaking Club capstone and Personal Review

### Task 9.1 — Separate input/evidence in Club

**Modify:**

- `app/speaking_club_client.ts`
- `app/speaking_club_session.tsx`
- `functions/src/speaking_club.ts`

Add `inputSource`, editable transcript confirmation, objective evidence separate from target phrase/voice evidence, and account-scoped mission state migration. Episode/template authoring carries canonical discriminated `VoiceReleaseRequirements`: on-device forbids policy/registry/network-purpose/egress fields; network pins exact `VoiceDataPolicyRef`, `activePolicyRegistryKey`, non-empty purposes, exact `VoiceNetworkEgressRef` and optional exact `SpeechCalibrationReceiptRef`. Episode aggregate maps every voice node to one immutable template requirement and canonical-exact matches it; no narrowing, widening or field substitution is allowed. Edited transcript can support semantic evidence but cannot retroactively become acoustic evidence.

### Task 9.1A — Account consent, exact copy and server-owned eligibility

**Modify:**

- `app/speaking_club_client.ts`
- `app/speaking_club_session.tsx`
- `functions/src/index.ts`
- `firestore.rules`
- `firestore.indexes.json`

**Create:**

- `app/voice_privacy_store.ts`
- `app/voice_network_deny_latch.ts`
- `app/voice_consent_mutation_outbox.ts`
- `app/voice_deletion_outbox.ts`
- `modules/learning-v2/voice/voice_privacy_contract.ts`
- `modules/learning-v2/voice/voice_privacy_copy.ts`
- `functions/src/learning_v2/voice_governance_registry.ts`
- `functions/src/learning_v2/voice_consent.ts`
- `functions/src/learning_v2/voice_subject_classification.ts`
- `functions/src/learning_v2/voice_guardian_consent.ts`
- `functions/src/learning_v2/voice_subject_eligibility.ts`
- `tests/learning_v2_voice_consent_account_scope.test.ts`
- `tests/learning_v2_voice_consent_copy_ref.test.ts`
- `tests/learning_v2_voice_consent_outbox.test.ts`
- `tests/learning_v2_voice_subject_eligibility.test.ts`
- `tests/learning_v2_voice_guardian_consent.test.ts`
- `functions/src/learning_v2/voice_consent.test.ts`
- `functions/src/learning_v2/voice_subject_classification.test.ts`
- `functions/src/learning_v2/voice_guardian_consent.test.ts`
- `functions/src/learning_v2/voice_subject_eligibility.test.ts`

Implement account-checked `setVoiceConsent(accept|decline|revoke)` and `getVoiceNetworkEligibility`. Consent is an append-only body/record stream scoped by exact `stableId + accountGeneration + VoiceDataPolicyRef + purpose`; every decision pins the exact `VoiceConsentCopyRef(copyId/version/locale/contentHash)` actually shown. The same transaction advances a server-owned active projection by expected revision/monotonic sequence. Deterministic idempotency returns the original receipt for an identical retry and rejects key reuse with another payload. Copy registry bodies are immutable/content-addressed, locale-unique inside policy and literally expose `Разрешить сетевую обработку`, `Продолжить без неё`, `Отозвать согласие`, `Удалить голосовые данные`, active legal-hold/recheck and queued/processing/retry/completed/SLA-breached states.

`voice_governance_registry.ts` stores and hash-validates the canonical immutable Body/Record pairs for deletion route, minors policy, network egress and every account receipt type; refs never resolve through a mutable latest alias. `voice_subject_classification.ts` accepts no client age/classification: an adapter may issue a short-lived attestation only from an allowlisted authoritative source/issuer declared by the exact `VoiceMinorsPolicyBody`. The attestation stores category plus pseudonymous subject/account binding, never raw birth date or age.

`voice_guardian_consent.ts` implements account-checked grant/revoke as append-only, idempotent immutable receipts using the exact policy issuer/verifier keys, subject binding and expiry; a monotonic active projection handles revoke, expiry and supersession. `voice_subject_eligibility.ts` may issue a short-lived eligibility receipt only from a valid exact classification attestation. `adult` is eligible directly; `minor` requires a non-expired active granted guardian receipt for the same subject/account generation/minors policy. `unknown`, missing/expired/revoked/superseded guardian consent, stale issuer/verifier/hash/account mismatch and client assertion fail closed.

Decline/revoke first persists an account-generation-scoped deny latch, purges local voice/transcript drafts and writes an idempotent consent mutation outbox entry, all before network. Restart/reconnect cannot clear the latch; queued/offline accept never authorizes dispatch. Replay order is `server consent receipt/projection → revoke deletion operation → local acknowledgement`. Account switch isolates latch/outboxes; an old pending intent can replay only after the same authenticated account generation returns.

**Focused tests:** exact copy/route/minors/egress/classification/guardian/eligibility body-record identity+hash validation; accept/decline/revoke append-only history; duplicate/conflicting idempotency; account-generation isolation; unapproved classification source/issuer blocked; adult allowed; minor+active guardian allowed; guardian grant→supersede→revoke/expire projection; minor missing/expired/revoked guardian blocked; unknown blocked; client-asserted age ignored; offline revoke survives restart/reconnect; pending accept never clears deny latch; account switch cannot replay an old generation.

### Task 9.1B — One server voice egress and revoke/dispatch linearization

**Modify:**

- `functions/src/speaking_club.ts`
- `functions/src/index.ts`

**Create:**

- `functions/src/learning_v2/voice_network_authorization.ts`
- `functions/src/learning_v2/voice_network_dispatch_reservation.ts`
- `functions/src/learning_v2/voice_network_dispatch_lifecycle.ts`
- `functions/src/learning_v2/voice_network_egress.ts`
- `functions/src/learning_v2/voice_network_adapter_inventory.ts`
- `functions/src/learning_v2/voice_network_authorization.test.ts`
- `functions/src/learning_v2/voice_network_dispatch_reservation.test.ts`
- `functions/src/learning_v2/voice_network_dispatch_lifecycle.test.ts`
- `functions/src/learning_v2/voice_network_egress.test.ts`
- `tests/learning_v2_voice_network_adapter_inventory.test.ts`
- `tests/speaking_club_voice_privacy_contract.test.ts`

All network audio/transcript work—ASR, speech scoring and Club—must call one provider-agnostic server egress. Provider adapters are private implementation modules importable only by `voice_network_egress.ts`; `speaking_club.ts` delegates the complete dispatch instead of performing a separate check followed by a direct provider call. The inventory test discovers every network adapter/import edge and fails if an app/client/callable or another Functions module can invoke a provider directly. No `network_allowed|required` template activates until the exact deployed `VoiceNetworkEgressRef` matches both app support manifests plus season release manifest, its body attests the safe lifecycle/finality/deletion protocol, and the inventory is clean.

Immediately before dispatch, one server transaction recomputes policy/copy/route/minors/egress hashes, resolves active registry/purpose, checks authenticated account generation, deletion/retention blocks, active accepted consent and server-owned eligibility, then writes a single-use immutable reservation with exact consent receipt sequence, projection revision, processor/deletion route and `dispatchBarrierRevision`. A second compare-and-consume transaction commits immutable `VoiceNetworkDispatchConsumptionRecord` **before** the provider adapter call. The adapter accepts only that in-process consumption and idempotency digest; neither reservation nor consumption is returned as a reusable client bearer token, and lifecycle records contain no raw audio/transcript.

Reservation, consumption and revoke update the same projection/barrier document. Three deterministic interleavings are required: (1) revoke before reservation — no reservation/provider call; (2) reservation exists but revoke wins before consume — immutable `cancelled_before_provider_call` settlement and no provider call; (3) consume wins, then revoke — state remains `consumed_in_flight` until an immutable terminal settlement proves either `provider_request_final_no_artifact` or registers an exact processor target. Provider timeout, worker crash or unknown status is **not** settlement and blocks backend deletion completion while SLA escalation/reconciliation continues. Duplicate consume/settlement with identical bodies is idempotent; a conflicting second consume/settlement fails closed.

**Focused tests:** every network adapter is inventory-covered; direct provider import/call fails; exact egress/support/release ref or lifecycle protocol mismatch blocks activation; policy/purpose/copy/eligibility mismatch blocks before provider; reservation and consumption are single-use and pin exact consent sequence/barrier; revoke-before-reservation and revoke-between-reservation/consume never call provider; consume-before-revoke leaves deletion pending through late settlement; ambiguous timeout cannot settle; duplicate/conflicting consume/settlement; stale client authorization/cache cannot dispatch; fallback preserves progress.

### Task 9.1C — Verified processor deletion and non-terminal legal hold

**Modify:**

- `functions/src/account_delete.ts`
- `functions/src/account_delete_job.ts`
- `functions/src/account_delete_worker.ts`
- `functions/src/index.ts`
- `firestore.rules`
- `firestore.indexes.json`

**Create:**

- `functions/src/learning_v2/voice_deletion_operation.ts`
- `functions/src/learning_v2/voice_deletion_worker.ts`
- `functions/src/learning_v2/voice_deletion_processors.ts`
- `functions/src/learning_v2/voice_retention_obligation.ts`
- `tests/learning_v2_voice_deletion_outbox.test.ts`
- `functions/src/learning_v2/voice_deletion_worker.test.ts`
- `functions/src/learning_v2/voice_retention_obligation.test.ts`

Implement account-checked `requestVoiceDataDeletion` and `getVoiceDataDeletionStatus`. Revoke, explicit deletion and account deletion use the same durable idempotent operation, append-only journal and immutable per-target receipts. Operation inventory pins exact specialized deletion-route refs plus every pre-barrier dispatch reservation. Ordinary targets use provider idempotency derived from `operationId + targetId`; a covered dispatch reservation cannot call deletion before terminal settlement. A no-artifact/cancelled settlement reconciles directly; an artifact settlement derives exact `storageKind='processor_dispatch'` target and deletion idempotency `HMAC(operationId + targetId + settlementRef.contentHash)`. Transient failures receive bounded backoff, and SLA breach escalates while retries continue.

For `storageKind='processor'|'safety_record'|'processor_dispatch'`, any recorded `deleted|not_found|retained_under_legal_hold` provider outcome is invalid without mandatory typed provider proof containing idempotency-key, request and response digests, provider outcome code and provider completion time. A dispatch receipt additionally pins the exact terminal settlement. Any `not_found` observed before settlement is discarded and cannot be reused under the settlement-bound key; late artifact settlement must trigger a fresh deletion call. An optional provider-native receipt digest may supplement but never replace the mandatory response proof. Managed targets use the separate internal receipt branch. A legal-hold receipt opens an obligation and is not terminal for target/operation. Raw external IDs/responses never enter UI, journal or analytics.

`retained_under_legal_hold` opens an immutable `VoiceRetentionObligationRecord` and leaves target/operation non-terminal in `retention_obligation_active`. It stores basis, `retentionUntil` and `nextRecheckAt`; extension writes a new revision linked to the previous obligation. Release or expiry automatically requeues deletion, and the obligation resolves only through a new final `deleted|not_found` receipt. UI may show `Часть данных сохранена по юридическому требованию`, basis/expiry/recheck and `Удаление возобновлено`, but may say `Удалено` only after every ordinary/derived target has a final receipt and every covered dispatch reservation is cancelled-before-call, settled-no-artifact or settlement-bound deleted/not-found. `reserved`, `consumed_in_flight`, ambiguous timeout and artifact-pending-deletion are always non-terminal.

`voice_deletion_outbox.ts` purges local drafts immediately and persists only the minimum account-scoped deletion intent until callable acknowledgement. Existing account deletion invariants remain normative: `deleteAccountAndWipe()` starts cloud deletion in the background, signs out, wipes local data, clears `stable_id` and writes `account_delete_pending_auth_v1` without waiting. Backend job resumes the all-voice operation, reservation reconciliation and retention obligations after auth-user removal.

Firestore rules deny all direct client writes to classification/guardian/consent/eligibility/reservation/consumption/settlement/deletion/journal/retention/provider-proof records; status is exposed only through account-checked callables. Analytics allow only decision category, operation/lifecycle state and latency/SLA/policy-version bands—never account/receipt/provider IDs, raw age, deletion route/proof, audio or transcript.

**Focused tests:** target lease and duplicate worker delivery; missing/optional-only provider proof cannot record external terminal outcome; request/response digest mismatch retries/fails closed; deletion provider is never called before dispatch settlement; early `not_found` is rejected/not cached; `consumed_in_flight`/timeout remains pending and SLA-escalated; late artifact settlement starts deletion and only its settlement-bound receipt can complete; no-artifact settlement reconciles without a fake provider receipt; duplicate/conflicting settlement; retry/backoff/SLA; legal hold opens non-terminal obligation; extension supersedes exact revision; release and expiry requeue; no completion before all final receipts/reconciliations; account delete enqueues once and local exit remains non-blocking; operation survives auth removal; rules deny direct/cross-account access; existing `account_delete_*`, auth pending guard and Speaking Club tests stay green.

### Task 9.2 — Club adapter and performance-star semantics

**Create:**

- `modules/learning-v2/adapters/speaking_club_adapter.ts`
- `tests/learning_v2_speaking_club_adapter.test.ts`

Performance-star candidates: valid completion, communicative objectives, valid voice practice. Text may earn the first two but not voice evidence; progression remains achievable without voice star. Mastery/durable learning is evaluated only from typed immediate/delayed evidence, never the three-star sum.

### Task 9.3 — Offline/scripted fallback

When AI/network/quota unavailable, offer equivalent scripted dialogue or return later; never trap core. AI correction opens after conversation and does not interrupt every turn.

### Task 9.4 — Shared review scheduler

**Create:**

- `modules/learning-v2/review/review_scheduler.ts`
- `modules/learning-v2/review/review_queue_store.ts`
- `modules/learning-v2/review/review_reason.ts`
- `modules/learning-v2/review/delayed_probe_launch.ts`
- `functions/src/learning_v2/review_scheduler.ts`
- `functions/src/learning_v2/review_scheduler.test.ts`
- `tests/learning_v2_delayed_probe_two_phase.test.ts`

**Modify adapters, not duplicate renderers:** Personal Plan requests descriptors from registry. Review schedule supports D+1/D+3–7/D+21, weak evidence, uncertainty exclusion and varied context. Server assignment pin-ит exact initial-exposure attempt/server time, account generation, release, Season/Episode revision, content-hashed delayed definition and HYP-V2-007 window. Launch returns a short-lived immutable receipt; client enqueues only `V2DelayedAttemptCandidate` with hash-pinned client candidates. Server ingestion checks candidate body/ref and phase-correlated provenance against the scheduler-only probe definition, then returns exactly one terminal ack. `timed_finalized` timing receipt contains exhaustive deterministic terminal resolutions; `system_non_assessment_finalized` failure receipt does the same without timing receipt for validly bound missing/stale assignment or missing/expired launch; `protocol_rejected` contains no resolution table/finalized event/learning refs for account/probe/template/declaration/hash substitution. The finalized envelope keeps the original candidate body and pin-ит the exact receipt as materialization basis; it never rewrites the body. Outside-window maps every non-`no_record` candidate only to `LearningNonAssessmentBody{not_assessed_for_window}`; system failure maps every non-`no_record` candidate only to `not_assessed_system`; `SKIPPED/no_record` stays ref-free. Neither negative branch can mint delayed evidence, mastery, DTS or checkpoint pass; every terminal ack idempotently removes the candidate from its exact account-generation outbox.

**Acceptance:** tests cover exact in-window success, D+1/D+21 outside-window, client-clock spoof, missing/stale assignment and expired launch → system non-assessment without timing receipt, definition/template/declaration/hash substitution and stale account generation → terminal protocol rejection without learning refs, offline candidate, duplicate submission/each ack branch, sign-out before ack and server restart. Golden fixtures prove one candidate + one terminal resolution per declaration, original candidate body hash remains unchanged in every branch, receipt/materialization-basis equality, 1:1 resolution→ref mapping, and `SKIPPED/no_record` produces no ref in inside/outside/system cases. No delayed assessed learning ref exists before the server timing receipt; no valid candidate remains permanently `pending_sync`.

---

## Phase 10 — Checkpoints, placement and legacy migration

### Task 10.1 — Placement diagnostic

**Create:**

- `modules/learning-v2/migration/legacy_progress_reader.ts`
- `modules/learning-v2/migration/placement_policy.ts`
- `modules/learning-v2/migration/placement_session.ts`
- tests.

Legacy completion can shorten placement but cannot mint voice/delayed mastery. Map old boundaries 8/18/28/32 to diagnostic recommendations, not automatic V2 checkpoints.

### Task 10.2 — E16/E24/E32 checkpoint contracts

Reuse the E8 checkpoint kernel; do not fork checkpoint reducers. Each E16/E24/E32 contract declares deterministic objective/construct/independent-probe targets, `criticalSemanticSlotIds`, `criticalConstraintIds` (route/allergy/payment/rule), exact alternate coverage and target-specific repair/reassessment. `assessmentNodeIds` must equal the requirement-node set and be a subset of the episode independent list; every primary, equivalent alternate and reassessment node that can supply checkpoint evidence is `phase='independent_probe'` and belongs to that list. Training repair nodes may teach but cannot write checkpoint evidence directly. Separate listening/recall/spoken results resolve from typed learning refs; pause/resume and cross-device merge rebuild the bounded projection. Delayed follow-up remains a separate durable-learning scheduler output, never a checkpoint requirement.

**Tests:** no new material; no duplicate/missing critical target; assessment-node/requirement/objective set equality and independent-subset invariants; training/near-transfer masquerading as checkpoint evidence fails; non-voice alternate preserves objective/semantic/constraint tuples without claiming spoken mastery; `needs_work`, `not_assessed` and `incomplete` remain distinct; `SKIPPED` remains unobserved/incomplete; purchased access cannot pass; an out-of-window delayed ref cannot satisfy any durable requirement.

### Task 10.3 — Daily Challenges side-node adapter

Build an adapter that can schedule current challenge intent through the registry without removing the legacy entry. Compare rewards/storage and analytics for parity.

### Task 10.4 — Migration rehearsal

Test anonymous, signed-in, multi-device, account link, account switch, reinstall, release A→B→rollback, and old app version. Keep a reversible migration provenance record.

---

## Phase 11 — Full 32-episode content release

### Task 11.1 — Chapter-by-chapter generation

Generate in batches 9–16, 17–24, 25–32 only after prior chapter passes dogfood. Never approve a season with per-episode green checks but failed whole-season graph.

### Task 11.2 — Whole-season QA command

**Create:**

- `scripts/learning-v2-validate-release.mjs`
- `tests/learning_v2_release_validator.test.ts`

Default dry-run writes reports only under `.codex-tmp/learning-v2/`. Test invocation is read-only to source.

Build/review one `full_season` SeasonRevision and validate 32 episodes, 4×8 chapters, checkpoints E8/E16/E24/E32, all in-scope gates from the canonical policy, graph connectivity, review spacing, unique ids, asset closure, capability coverage, phrase load, localization and hashes. The production preflight must reject both `vertical_slice` and `chapter_internal` and accept only this approved `full_season` with fresh receipts.

### Task 11.3 — Non-English seam proof

Before claiming easy language scale, produce one small approved episode for a second studyTarget/sourceLocale pair and confirm tokenizer, TTS/STT, sound profile, UI expansion and release manifest. Do not mass-generate a second course.

---

## Phase 12 — Product analytics, experiments and Admin observability

### Task 12.1 — Governed event catalog

Add all events from `docs/v2/07-migration-analytics-testing.md` only with allowlisted categorical fields and consent. Extend existing analytics contract/funnel tests; verify no PII/free text.

### Task 12.2 — Learning metrics projection

**Modify/Create as appropriate:**

- `functions/src/admin_product_analytics.ts`
- `functions/src/admin_product_analytics_learning.test.ts`
- `admin/v2/scripts/pages/product-analytics.js`

Show DTS-7 eligibility/success, episode funnel, voice reliability, gate recovery, boost usage and content-release health. Never label engagement as learning.

### Task 12.3 — Experiment passports

Reuse `app/analytics_experiments.ts`. First experiment only after baseline and power calculation. One variable, frozen assignment, real exposure event, precommitted primary/guardrail/sample/duration. Do not run gate curve and gate copy tests concurrently.

### Task 12.4 — Operational alerts

Alert on duplicate ledger receipt, learning-evidence/star/access invariant, hash mismatch fallback, voice invalid spike by OS/route, raw-field governance violation and unavailable legacy fallback.

---

## Phase 13 — Controlled rollout and release gates

### Task 13.1 — Capability manifest and cohorts

Implement granular rollout capabilities from spec. Unknown config falls back to control; assignment sticky to stable account; diagnostic snapshot records revision.

### Task 13.2 — Performance gate

Run focused existing guards plus new screens:

- freeze-on-blur;
- no new unguarded loops/intervals;
- synchronous last-known first frame;
- no large static content imports;
- below-fold defer where relevant;
- memory/cache eviction;
- navigation underlay/background invariants.

### Task 13.3 — Accessibility and device gate

Run the full matrix in spec on small Android, modern Android, iPhone, large text, screen reader and reduced motion. Record unresolved issues as rollout blockers, not post-launch nice-to-have.

### Task 13.4 — Failure/rollback rehearsal

Execute the ten drills in `07-migration-analytics-testing.md`. Activate and rollback a non-production/canary release. Verify ledger receipts remain auditable while capability disables.

### Task 13.5 — Cohort ramp

R0 lab → R1 internal E1 → R2 internal E1–8 → R3 1–5% → R4 10–25% → R5 candidate default. Each ramp requires a full relevant delayed window and guardrail review; never ramp on session counts alone.

---

## Phase 14 — Explicit legacy/Challenges decision

This phase is intentionally not automatic.

Prepare a parity report covering feature, content, reward, storage, analytics, accessibility, support and rollback. Then owner chooses one:

1. keep both;
2. make V2 default and keep legacy fallback;
3. migrate Challenges into side nodes but preserve history;
4. retire named legacy surface in a separately approved change.

No code deletion is authorized by completion of earlier phases.

---

## Focused verification index

Use narrow commands during tasks; do not run the entire project suite by habit.

```powershell
# Root pure contracts/progress
npx jest --runTestsByPath tests/learning_v2_identity_contract.test.ts tests/learning_v2_episode_contract.test.ts tests/learning_v2_evidence_contract.test.ts tests/learning_v2_attempt_hash_chain.test.ts tests/learning_v2_attempt_cardinality.test.ts tests/learning_v2_delayed_probe_contract.test.ts tests/learning_v2_delayed_probe_two_phase.test.ts tests/learning_v2_progress_reducer.test.ts tests/learning_v2_checkpoint_projection.test.ts tests/learning_v2_gate_policy.test.ts --no-cache --runInBand

# Voice
npx jest --runTestsByPath tests/learning_v2_voice_state_machine.test.ts tests/learning_v2_voice_evidence_capability.test.ts tests/learning_v2_voice_governance_refs.test.ts tests/learning_v2_voice_network_activation_gate.test.ts tests/learning_v2_voice_consent_account_scope.test.ts tests/learning_v2_voice_consent_copy_ref.test.ts tests/learning_v2_voice_consent_outbox.test.ts tests/learning_v2_voice_guardian_consent.test.ts tests/learning_v2_voice_subject_eligibility.test.ts tests/learning_v2_voice_network_adapter_inventory.test.ts tests/learning_v2_voice_deletion_outbox.test.ts tests/speaking_club_voice_privacy_contract.test.ts --no-cache --runInBand

# Release loader
npx jest --runTestsByPath tests/learning_v2_release_loader.test.ts tests/learning_v2_release_cache.test.ts --no-cache --runInBand

# Functions focused
Push-Location functions
npx jest --runTestsByPath src/learning_v2/contracts.test.ts src/learning_v2/progress_event.test.ts src/learning_v2/attempt_hash_chain.test.ts src/learning_v2/access_boost_purchase.test.ts src/learning_v2/voice_consent.test.ts src/learning_v2/voice_subject_classification.test.ts src/learning_v2/voice_guardian_consent.test.ts src/learning_v2/voice_subject_eligibility.test.ts src/learning_v2/voice_network_authorization.test.ts src/learning_v2/voice_network_dispatch_reservation.test.ts src/learning_v2/voice_network_dispatch_lifecycle.test.ts src/learning_v2/voice_network_egress.test.ts src/learning_v2/voice_deletion_worker.test.ts src/learning_v2/voice_retention_obligation.test.ts src/content_factory/v2_episode_artifacts.test.ts src/content_factory/v2_release_adapter.test.ts --no-cache --runInBand
Pop-Location

# Voice privacy rules + existing account-delete invariants
npx jest --runTestsByPath tests/firestore_rules_security.test.ts tests/account_delete_flow_contract.test.ts tests/account_delete_timeout.test.ts tests/account_delete_enqueue_deadline.test.ts tests/auth_provider_stable_link.test.ts tests/stable_id.test.ts tests/auth_identity_anon_relink.test.ts --no-cache --runInBand
Push-Location functions; npx jest --runTestsByPath src/account_delete.test.ts src/account_delete_job.test.ts src/account_delete_worker.test.ts src/account_delete_tombstone_contract.test.ts --no-cache --runInBand; Pop-Location

# Existing narrow regression guards after route/runtime integration
npx jest --runTestsByPath tests/lessons_v2_surface_contract.test.ts tests/perf_freeze_contract.test.ts tests/navigation_back_underlay_contract.test.ts tests/owner_direction_runtime_contract.test.ts --no-cache --runInBand

# Type checks only at milestone gates, not after every documentation/content edit
npx tsc --noEmit --pretty false
Push-Location functions; npx tsc --noEmit --pretty false; Pop-Location
```

RNTL uses the repository's dedicated config/script and should be invoked only for the new shell test files. Firestore emulator suites are phase gates, not every-save tests.

## Per-phase completion packet

Every GSD phase ends with:

- implemented scope and exact files;
- tests run and exact results;
- screenshots/state captures for UI phases;
- content/release ids and hashes for content phases;
- known limitations and inference vs verification;
- performance/accessibility/security impact;
- rollback instruction;
- updated decision log;
- `Находки и предложения` with unimplemented observations.

## Definition of Done for the 32-episode pilot

- 32 versioned episode graphs and four checkpoints validated;
- all required activities have registry, renderer, evidence, progress, reward and fallback policies;
- one Voice Activity Shell owns lifecycle across V2 modes;
- no UI claims acoustic detail unavailable from the active scorer;
- `performanceStarsEarned` is the best-performance source projection; `accessStarsEarned` is a read-only 1:1 projection recomputed from it with no independent ledger/policy/write; `accessStarsPurchased` is a separate server-authoritative boost ledger; mastery uses only typed learning evidence;
- canonical learning integrity is acyclic and shared by client/Functions: hash-free `V2AttemptEventBody` → `CanonicalAttemptRef` → separately hashed `LearningEvidenceBody`/`LearningNonAssessmentBody` → refs; the `V2AttemptEvent` join envelope has no whole-object hash;
- one attempt supports `0..N` assessed/non-assessment refs, with exactly one phase-correlated disposition/provenance/input binding per declared node/objective/skill/construct/phase/target tuple and a collision-free canonical `letk1` key; `SKIPPED` is explicit `no_record`, spoken evidence requires speech-feature/scoped-calibration binding, and `not_assessed_for_window` projects only to `outside_window` and never to delayed evidence/mastery/checkpoint success;
- E1–E32 can be completed without buying and without mandatory AI;
- the canonical 17 `V2ActivityFamily` values are exhaustive; checkpoint remains a typed episode-level contract and never becomes a family/kernel; its bounded ID-only projection covers critical semantic-slot and critical-constraint targets, computes pass/targeted repair/alternate/incomplete without a writable boolean, and ignores purchased access;
- executable kernels, capabilities and the app-support manifest are code-owned, exhaustive and fail-closed; family, `activityTypeKey`, kernel, canonical `PublishedModeTemplateRef {templateId,...}`, activity and graph node stay separate, and admins cannot upload renderer/scorer code;
- every ModeTemplate pins exactly five `PolicyRef {kind,key,version,contentHash}` values; every ref matches a hash-free `PolicyDescriptorBody` and immutable policy record/object; catalog, iOS manifest and Android manifest agree on every exact ref, and body/ref/object or key/version/hash mismatch fails closed;
- ModeTemplate/Episode/Season, concrete eight-entry DecisionRegistry, capability catalog, app-support manifest, preview envelope Body/Record and season release manifest Body/Record use hashable Body without self hash plus immutable Record; DecisionRegistry ref/object/body and all eight typed settings pass shared client/Functions conformance; artifact records contain no receipt backrefs, lifecycle/heads/append-only receipt sets and separate gate receipts stay outside, and client/Functions pass exact golden vectors;
- admin can create, version, clone, deprecate and localize immutable ModeTemplate body-record pairs pinned by `templateId + version + contentHash`; template drafts/heads use separate proposed version/revision/fingerprint;
- admin can create/clone an EpisodeDraft, configure content-only ActivityInstance records whose lifecycle belongs to the Episode, edit/reorder/branch separate EpisodeGraphNode records, preserve typed star-slot/phase/two-loop/ordinary-non-gating-assessment plus checkpoint-boundary exception/capstone/actual-learning-design/evidence-policy/checkpoint contracts, and recover safely from revision/fingerprint conflicts;
- admin can create/clone a SeasonDraft in the existing Episode Builder route and validate exact scope semantics: E1-only `vertical_slice` for lab/staging, E1–E8 `chapter_internal` with checkpoint E8 for internal staging, or production `full_season` with 32 approved EpisodeRevision refs, 4×8 chapters and checkpoints E8/E16/E24/E32; every in-scope gate comes from the same immutable policy and no custom curve is accepted;
- every SeasonRevision, bundle provenance and release manifest pins the same exact `decisionRegistryRef {id,version,contentHash}`; seal recomputes the registry body and resolves all numeric settings `HYP-V2-001..008`, including retry cap, cutoffs, star/gate/boost values, delayed window and rollout;
- all eight canonical Content pages exist under the existing top-level category; Generation Queue and Review Queue remain separate;
- Preview Lab renders six states plus orthogonal conditions from an exact envelope body/hash, issues separate one-use platform/build grants, passes cold/warm route tests, requires fresh iOS+Android receipts and cannot write progress/stars/shards/rewards/analytics;
- deterministic validation maps stable issues to fields/nodes; blockers cannot be waived and validation waivers for waivable warnings are reasoned, audited and bound to one draft revision;
- hashable bodies contain only `LocalizedContentValue`; translations are source-hash-bound, workflow status/reviewer/time lives only in server projection/receipt, and source changes automatically mark it stale;
- Content Studio uses only four permissions; Phase 00 replaced the global admin catch-all, authenticated-admin emulator denies direct read/write to every authoring/projection namespace, and inventoried legacy paths remain explicit until migrated;
- review/localization queues are server-owned projections with deterministic full-SHA IDs, bounded filter cursors, transactional updates, rebuild and consistency receipts;
- ModeTemplate, Season and Episode each have explicit submit plus approve/changes-requested callables; maker-checker identity and fresh review fingerprints are rechecked before publish/seal;
- the generator implements 13 canonical kinds with human labels, typed stage/template/language-profile dependencies and freshness; season plan owns 1+N+1 cardinality while episode subgraphs own per-episode stages;
- release resolution starts from exact Season body-record/lifecycle, verifies pinned hashes and governance refs, builds season manifest body-record, then mutates a server-environment season pointer for stage/pause/cohort/rollback while preserving four v1 surfaces;
- the joint E1 acceptance packet proves the complete lifecycle without manual production-file edits: Playwright covers create → configure → preview-all → validate → localize → review → seal → activate → pause → rollback as a full fake Admin lifecycle, the focused native/runtime integration test covers the real deep-link → `getV2PreviewEnvelope` → loader/registry/renderer/no-progress path, and Android plus iOS internal builds consume distinct one-use grants and record fresh receipts for the same envelope hash and entity fingerprint; no Playwright fake callable is accepted as device-load evidence;
- client hash-verifies, caches with eviction and falls back safely;
- legacy progress/functions remain intact and accessible;
- analytics is consent-aware and contains no raw audio/text;
- voice/acoustic claims require fresh hash-verified SpeechCalibrationReceipt body-record refs; network voice/transcript processing requires approved policy/copy/route/minors/egress body-record refs, authoritative classification plus active guardian consent where applicable, the same exact egress ref in iOS/Android/season manifests, and a verified reservation→consume→terminal settlement→settlement-bound deletion lifecycle. Unresolved dispatch can never let deletion complete; otherwise scripted fallback;
- DTS-7 and guardrails can be computed;
- accessibility, offline, account-switch, interruption and rollback matrices pass;
- rollout decision is based on predeclared learning + reliability + operability + fairness criteria.

## Owner-approved multilingual expansion addendum — 2026-07-19

Learning V2 must support broad language and writing-system expansion from the
contract layer onward. The normative design and non-executable program plan are:

- `docs/superpowers/specs/2026-07-19-learning-v2-multilingual-writing-systems-design.md`;
- `docs/superpowers/plans/2026-07-19-learning-v2-multilingual-writing-systems.md`.

Chinese and Japanese are the first complete special Script Curriculum packs.
Korean, Arabic, Hebrew, Devanagari, Thai, Greek and Cyrillic fixtures must prove
extensibility. Existing 17 activity families do not change implicitly;
Script Curriculum receives an exact typed boundary and construct-honest
evidence. This addendum is planning authority only and does not authorise
implementation or release.
