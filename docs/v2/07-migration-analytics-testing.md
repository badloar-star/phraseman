# Миграция, аналитика, эксперименты и тестирование V2

**Назначение:** провести V2 от внутреннего prototype до контролируемого пилота, не потеряв legacy-прогресс, не выдав ложные учебные выводы и не удалив существующие функции до подтверждённого паритета.

## 0. Реестр гипотез и числовых решений

Все consequential numbers в документах V2 — пороги, количество элементов, интервалы, доли, цены и caps — обязаны иметь claim label. Пока нет принятого calibration receipt или ограниченного первичного evidence, стартовые значения ниже имеют label `PRODUCT_HYPOTHESIS`: это настройки пилота, а не универсальные нормы обучения. Published release pin-ит exact `decisionRegistryRef {id,version,contentHash}`; изменение числа создаёт новый immutable registry body/hash и не переименовывается задним числом в «доказанную» политику.

| Decision ID | Область стартовой гипотезы | Владелец решения | Основная проверка | Стартовый статус |
|---|---|---|---|---|
| `HYP-V2-001` | 32 эпизода, 4×8, checkpoints 8/16/24/32, 8–9 nodes и заявленная длительность | Product + Curriculum | completion, time/task, DTS-7 | `PRODUCT_HYPOTHESIS / unvalidated` |
| `HYP-V2-002` | content dosage: число новых frames/slots/contrasts, доля/число voice turns и cap `V2_MAX_MANDATORY_LEARNING_RETRIES=2` | Curriculum | independent evidence, overload exits, retry fatigue, DTS-7 | `PRODUCT_HYPOTHESIS / unvalidated` |
| `HYP-V2-003` | completion, independent-mastery и checkpoint cutoffs, включая стартовые 70%/80% | Learning + Analytics | human-reviewed probe validity, false pass/fail, DTS-7 | `PRODUCT_HYPOTHESIS / unvalidated` |
| `HYP-V2-004` | performance stars: 3/slot, 8 slots, 24/episode, 768/season и три award criteria | Product + Learning | comprehension of meaning, retry/grind, access fairness | `PRODUCT_HYPOTHESIS / unvalidated` |
| `HYP-V2-005` | обязательные `encounter_build` + `near_transfer`, local minima, cumulative curve и target 500 | Product + Learning | gate recovery, abandonment, independent evidence, DTS-7 | `PRODUCT_HYPOTHESIS / unvalidated` |
| `HYP-V2-006` | Access Boost: цена, caps, deficit range, два показа recovery и quote TTL | Economy + Analytics | purchase regret, disputes, learn-to-unlock, boost concentration | `PRODUCT_HYPOTHESIS / unvalidated` |
| `HYP-V2-007` | D+3…D+7 delayed-probe window и DTS-7 success policy | Learning + Analytics | return distribution, reliability, sensitivity analysis by day | `PRODUCT_HYPOTHESIS / unvalidated` |
| `HYP-V2-008` | rollout percentages, minimum observation windows и milestone sizes | Release + Analytics | guardrails, power, operational readiness | `PRODUCT_HYPOTHESIS / unvalidated` |

Эта таблица — governance-карта смысла, владельцев и проверок, а не вторая serialization schema. Единственный machine-readable runtime artifact — [`DecisionRegistryBody + DecisionRegistryRecord` из документа 08 §6.2](./08-admin-content-studio-and-mode-authoring.md#62-immutable-decision-registry-artifact). Документ 07 не переопределяет его bytes или поля: experiment/calibration/governance receipts связываются с каждой entry через exact `evidenceRefs`, а SeasonRevision, bundle и manifest используют один и тот же `decisionRegistryRef`.

`Decision ID`, schema/version numbers, episode identifiers и арифметические следствия выбранной политики не являются самостоятельными педагогическими утверждениями. Числа из обязательных accessibility/platform требований получают label `OFFICIAL_STANDARD` только вместе с точной ссылкой на принятый стандарт в release receipt; иначе они также остаются `PRODUCT_HYPOTHESIS`.

Отдельный experiment/decision passport содержит `decisionId`, exact `decisionRegistryRef`, `claimLabel`, `owner`, `scope`, `primaryMetric`, `guardrails`, `baseline`, `reviewAfter`, `status` и ссылки на experiment/calibration receipts. Это governance record, а не часть hashable runtime body. Поля `baseline`, MDE, sample и decision rule заполняются до exposure соответствующего эксперимента; отсутствие этих полей блокирует причинное заявление, но не технический internal preview. После review новый вывод обновляет passport/receipt и, если меняется runtime setting или claim label, создаёт новый `DecisionRegistryBody` version/hash.

## 1. Правила миграции

### 1.1 Adapter-first, не big-bang rewrite

V2 получает собственные contracts и namespace. Legacy остаётся читаемым и запускаемым. Существующие экраны подключаются через adapters, возвращающие нормализованный `ActivityResult`.

```text
legacy content/progress ──read-only──► compatibility adapter
                                           │
V2 episode graph ───────────────────────────┤
                                           ▼
                                  shared activity runtime
                                           │
                                           ▼
                                   v2 progress/evidence
```

Нельзя:

- переименовать старый AsyncStorage key и считать это миграцией;
- превращать legacy `best_score` в новые earned performance stars или `LearningEvidence` без сопоставимого задания;
- одновременно писать один completion в две наградные системы;
- удалять Challenges, legacy Lessons, Personal Plan или Speaking Club entry point в рамках инфраструктурной фазы.

### 1.2 Namespace

Рекомендуемые логические пространства:

```text
v2:progress:{accountScope}:{studyTarget}:{courseId}:{seasonId}
v2:attempts:{accountScope}:{activityId}
v2:review:{accountScope}:{studyTarget}
v2:content-cache:{studyTarget}:{sourceLocale}:{releaseId}:{contentHash}
```

`accountScope` строится через существующий stable identity contract. Anonymous → provider link должен сохранять ownership, а account switch обязан исключать данные предыдущего пользователя.

### 1.3 Как использовать старый прогресс

Пилот использует conservative recognition:

- legacy completion может открыть диагностический shortcut или предложить placement;
- он не создаёт V2 voice evidence;
- он не создаёт V2 checkpoint/independent mastery evidence;
- пользователь может начать с эпизода 1 либо пройти короткий placement;
- после placement система открывает подходящую точку, но назначает review незнакомых V2 chunks;
- исходные legacy значения остаются неизменными.

### 1.4 Миграция границ экзаменов

Legacy checkpoints: 8/18/28/32. V2 chapters: 8/16/24/32. Они не конвертируются 1:1.

| Состояние legacy | V2 действие |
|---|---|
| Нет прогресса | Начать E1 |
| Завершены L1–8 | Предложить placement главы 1; не выдавать checkpoint автоматически |
| Завершены L9–18 | Placement глав 1–2 с обязательными voice/transfer probes |
| Завершены L19–28 | Placement до главы 3; advanced grammar не равна scenario mastery |
| Завершены L29–32 | Полный placement; сохранить признание опыта, но проверить can-do |

### 1.5 Судьба Challenges

В V2 daily challenges логично становятся playlists/side nodes над activity registry. Удаление отдельного legacy режима допускается только отдельным изменением после выполнения всех условий:

- достигнут функциональный паритет;
- старые rewards/storage/export пути либо мигрированы, либо сохранены;
- пользователи предупреждены, если меняется видимый сценарий;
- нет деградации daily engagement guardrails;
- есть rollback;
- владелец продукта отдельно одобрил точное удаление.

## 2. Rollout-флаги

Не нужен один опасный `ENABLE_V2`. Нужен capability manifest:

```ts
interface V2RolloutCapabilities {
  pathVisible: boolean;
  episodeRuntimeEnabled: boolean;
  remoteContentEnabled: boolean;
  voiceShellEnabled: boolean;
  speakingClubCapstoneEnabled: boolean;
  accessBoostPurchaseEnabled: boolean;
  checkpointEnabled: boolean;
  legacyFallbackEnabled: true;
  cohortId: string;
  configRevision: number;
}
```

Инварианты:

- `legacyFallbackEnabled` остаётся `true` весь pilot;
- неизвестная/просроченная config → безопасный control;
- assignment sticky по stable account, не по install session;
- сервер проверяет permissions/price/release независимо от client flag;
- rollout config попадает в diagnostic snapshot, но не содержит персональных данных.

## 3. Этапы rollout

| Этап | Аудитория | Что включено | Условие выхода |
|---|---|---|---|
| R0 Contract lab | разработчики | schemas, validators, pure progression | contract tests зелёные |
| R1 Internal episode 1 | команда | `vertical_slice`: один полный E1 release seam только lab/staging | нет P0/P1 data-loss/audio blockers |
| R2 Internal chapter 1 | команда + тестеры | `chapter_internal`: E1–E8, checkpoint, generator/release | content, accessibility и rollback drill пройдены |
| R3 Closed cohort | 1–5% подходящих новых пользователей | глава 1, legacy fallback | guardrails стабильны минимум полный недельный цикл |
| R4 Controlled pilot | 10–25% | production `full_season`: 32 эпизода, access gates, personal review | заранее заданный объём и duration, без early peeking |
| R5 Candidate default | до 50% | V2 default, legacy доступен | learning primary metric не хуже control, critical guardrails пройдены |
| R6 Migration decision | отдельное одобрение | возможное сворачивание legacy | паритет, поддержка, export и rollback подтверждены |

Все cohort sizes и observation windows в этой таблице относятся к `HYP-V2-008`. Rollout увеличивается не только по crash-free rate: должен пройти хотя бы один matured delayed-learning window и заранее рассчитанный объём анализа.

## 4. Какие решения должна поддержать аналитика

Каждое событие существует ради конкретного решения.

| Вопрос | Решение по данным |
|---|---|
| Ученики понимают следующую цель на карте? | менять hierarchy/unlock explanation |
| Какая активность обучает, а какая только удерживает? | менять состав episode template |
| Voice flow ломается из-за ученика или техники? | улучшать prompt/scorer или audio lifecycle/provider |
| Near-transfer loop улучшает самостоятельное выполнение и последующий delayed transfer? | оставлять/менять two-loop design |
| Stars gate мотивирует или вызывает уход? | менять curve, не подменяя `LearningEvidence` звёздами |
| Access Boost помогает продолжить или становится pay-to-win shortcut? | менять eligibility/price/cap или отключать |
| Speaking Club переносит материал? | менять подготовку, objectives или placement в эпизоде |
| Admin release безопасно доходит до клиента? | блокировать rollout/исправлять delivery seam |

## 5. Canonical event model

Существующий проект уже имеет `trackEvent`, consent gate, governed product event catalog и experiment passport. V2 должен расширить их, а не создать параллельный SDK.

Ключевые точки:

- `app/analytics.ts` — отправка и очередь;
- `app/analytics_consent.ts` — единый consent state;
- `app/product_analytics_event_catalog.ts` и `app/product_analytics_governance.json` — allowlisted events/fields;
- `app/analytics_experiments.ts` — frozen assignment/exposure;
- `functions/src/progress_events.ts` — server idempotency/fingerprint patterns.

### 5.1 События пути

| Event | Когда | Обязательные свойства |
|---|---|---|
| `v2_dts_eligible_assigned` | server заморозил eligible ITT cohort до gate/start | assignment_id, eligibility_policy_version, arm_id, assigned_at_bucket, followup_cutoff_bucket |
| `v2_path_viewed` | карта стала видимой | course_id, season_id, release_id, cohort_id |
| `v2_episode_gate_viewed` | открыт locked/unlocked popover | episode_id, gate_state, earned_access, purchased_access, required_access |
| `v2_episode_started` | первый activity реально начат | episode_id, resume_state, entry_source |
| `v2_episode_completed` | core completion записан | episode_id, duration_bucket, core_nodes_completed, capstone_attempted |
| `v2_episode_independent_mastery_observed` | выполнен versioned independent-mastery contract | episode_id, objective_id, construct_set, evidence_policy_version |
| `v2_episode_durable_evidence_observed` | после D+N получено валидное delayed evidence | episode_id, objective_id, delay_days_bucket, evidence_policy_version |
| `v2_episode_abandoned` | exit после начатой активности | episode_id, activity_id, last_state, elapsed_bucket |
| `v2_checkpoint_completed` | deterministic checkpoint закончен | chapter_id, can_do_met_count, can_do_total, result_band |

### 5.2 События активности

| Event | Назначение | Свойства |
|---|---|---|
| `v2_activity_shown` | denominator экспозиции | activity_type, activity_id, episode_id, renderer_version |
| `v2_activity_started` | реальное начало | input_mode, attempt_index_bucket |
| `v2_activity_attempted` | завершена попытка | outcome, objective_id, construct, phase, validity_status, confidence_band, hint_level, input_source |
| `v2_activity_completed` | completion policy выполнена | performance_stars_best, performance_stars_delta, support_used |
| `v2_learning_evidence_recorded` | принято только assessed immutable observation | objective_id, construct, phase, support_band, context_novelty, outcome_band, policy_version |
| `v2_learning_non_assessment_recorded` | construct не был оценён; это diagnostic, не evidence | objective_id, construct, phase, non_assessment_status, reason_code |
| `v2_activity_skipped` | осознанный skip/fallback | reason_code, accessibility_route |
| `v2_activity_unavailable` | системная недоступность | capability, provider, error_class, offline |

### 5.3 Voice telemetry

Никогда не отправляются raw audio, transcript, target phrase, имя, свободная реплика или acoustic feature vector в product analytics.

Разрешённые категориальные свойства:

- `capture_route`: builtin/bluetooth/wired/unknown;
- `permission_state`;
- `input_source`: voice/text/choice;
- `duration_bucket`;
- `signal_quality_band`;
- `stt_confidence_band`;
- `scorer_capability`: transcript_intelligibility/acoustic_segmental/acoustic_prosody/none;
- `outcome`: pass_confident/needs_work_confident/uncertain/invalid_system;
- `interruption_reason`;
- `retry_count_bucket`;
- `fallback_used`.

### 5.4 Stars и purchase

| Event | Смысл |
|---|---|
| `v2_performance_star_best_updated` | best-per-slot вырос; источник всегда earned performance |
| `v2_access_deficit_viewed` | пользователь понял, чего не хватает |
| `v2_access_boost_offered` | eligibility выполнен и offer видим |
| `v2_access_boost_purchase_started` | server-priced purchase начат |
| `v2_access_boost_purchase_completed` | receipt подтверждён сервером |
| `v2_access_boost_purchase_failed` | reason_class без чувствительных данных |
| `v2_access_boost_consumed` | purchased access применён к конкретному gate |

`mastery` не является допустимым source для purchase event, а purchased access и performance stars не являются допустимыми source для mastery event. Это проверяется типами и server rules, не только дашбордом.

## 6. Метрики пилота

### 6.1 Primary learning metric

**Delayed Transfer Success (DTS-7)** — семейство estimands по новому communicative probe того же `objectiveId/skillId`, без показа целевой фразы до ответа. Окно D+3…D+7 и success policy относятся к `HYP-V2-007` и pin-ятся в release/experiment passport. D+1/D+7/D+21 в review scheduler — cadence доставки: только фактическая попытка внутри pinned D+3…D+7 может создать DTS/durable evidence; доставка вне окна получает `not_assessed_for_window`, а не failure или mastery.

```text
DTS7_ITT = users_with_confident_delayed_transfer_success
           / all_matured_eligible_assignments

DTS7_STARTER = started_users_with_confident_delayed_transfer_success
               / matured_assigned_users_who_started_episode

DTS7_DELIVERED = users_with_confident_delayed_transfer_success
                 / users_to_whom_probe_was_delivered

DTS7_ATTEMPTED = users_with_confident_delayed_transfer_success
                 / users_who_attempted_probe

DTS7_VALID_ATTEMPT = users_with_confident_delayed_transfer_success
                     / users_with_valid_assessable_attempt
```

Primary estimand — `DTS7_ITT`. Eligible cohort и arm замораживаются server-side **до первого влияния варианта**: до gate impression, episode start или другого post-assignment поведения. Assignment сразу фиксирует follow-up cutoff; запись становится matured после него независимо от gate view, старта и возврата. Delayed success всё равно требует D+3…D+7 относительно реальной initial exposure, но никогда не начавший пользователь остаётся в ITT denominator без успеха. `DTS7_STARTER` — отдельный условный estimand, а не переименованный ITT.

Authoritative denominator строится из frozen server assignment ledger, а не из client exposure/event delivery. Аналитическое событие содержит только allowlisted buckets; потерянное client-событие не удаляет назначенного пользователя из ITT cohort.

Условные estimands всегда публикуются рядом, чтобы не спутать learning, retention и надёжность. Обязательны отдельные rates:

- `return_rate`: пользователь вернулся в окно;
- `gate_exposure_rate`: назначенный пользователь увидел соответствующий gate/path variant;
- `episode_start_rate`: назначенный пользователь реально начал эпизод;
- `delivery_rate`: probe реально показан;
- `attempt_rate`: начата содержательная попытка;
- `valid_attempt_rate`: попытка пригодна для заявленного construct;
- `system_abstention_rate`: `UNCERTAIN/INVALID_AUDIO_OR_SYSTEM`;
- `user_nonresponse_rate`: probe показан, но содержательной попытки нет;
- `attrition_rate`: matured eligible assignment не дал наблюдаемого delayed outcome.

Missing-data policy фиксируется до exposure. Primary ITT не исключает отсутствие gate impression/start/return, technical abstention или accessibility route после assignment. Они не называются учебной ошибкой пользователя и получают собственный reason code, но не исчезают из ITT denominator. Для conditional estimands denominator определяется буквальной стадией воронки; post-treatment исключения запрещены. Допустимы только заранее заданные технические исключения вроде QA-аккаунтов, дубликата identity или повреждённого assignment, и они отчётно показываются по arm. Отдельно считаются semantic, listening, recall, spoken, interaction и delayed dimensions; delayed является phase/timing dimension, не construct, и агрегировать dimensions в один score без versioned evidence policy нельзя.

### 6.2 Product secondary metrics

- episode 1 start → core completion;
- chapter 1 completion;
- median active days до E8;
- доля добровольных voice attempts;
- capstone attempt/completion;
- review queue return D+1/D+7;
- average hints/support before success;
- access gate recover-through-learning rate;
- speaking time bucket per active learner;
- content release fetch/cache/fallback rate.

### 6.3 Guardrails

- crash-free/session-freeze rate;
- permission-denied churn;
- `UNCERTAIN + INVALID` rate по device/OS/route/locale;
- median and p95 activity latency;
- AI cost per completed Club mission;
- support/report rate;
- account-switch leakage = 0;
- duplicate rewards/ledger imbalance = 0;
- shard purchase dispute/refund anomaly;
- accessibility completion gap;
- legacy fallback failure rate;
- raw text/audio leakage in analytics = 0.

### 6.4 Диагностические, не success metrics

XP, total taps, total stars shown и session length сами по себе не доказывают обучение. Они используются только для объяснения поведения.

## 7. Experiment protocol

### 7.1 Общий шаблон

```text
Поскольку [наблюдение],
мы считаем, что [одно изменение]
повысит/снизит [одна primary metric]
для [конкретная cohort].
Решение принимается после [precomputed sample + duration],
если [guardrails] не ухудшились сверх заранее заданного порога.
```

До появления baseline нельзя честно вписать фиксированный размер выборки. Для каждого теста заранее фиксируются baseline, minimum detectable effect, alpha/power, sample per arm, полный недельный цикл и maximum duration. Результат не останавливается раньше из-за красивого промежуточного графика.

### 7.2 Приоритетный backlog

| ID | Одна переменная | Control | Variant | Primary | Guardrails |
|---|---|---|---|---|---|
| EXP-V2-01 | форма near-transfer loop | идентичный extra practice | transfer/retrieval в новом контексте | independent probe + DTS-7 | episode completion, frustration exits |
| EXP-V2-02 | объяснение gate | только `N stars needed` | earned/purchased split + recovery CTA | learn-to-unlock rate | purchase regret, abandonment |
| EXP-V2-03 | curve gate | более мягкий cumulative threshold | базовая curve пилота | chapter completion + DTS-7 | evidence dilution, boosts/user |
| EXP-V2-04 | mic interaction | tap start/stop | tap default + optional hold preference | valid voice attempt rate | accidental recordings, accessibility gap |
| EXP-V2-05 | Club placement | отдельная Practice entry | episode capstone после rehearsal | capstone objective success | AI cost, episode abandonment |
| EXP-V2-06 | feedback depth | только общий verdict | verdict + одна actionable cue | next-attempt improvement | time/task, retry fatigue |

Не запускать одновременно тесты, меняющие gate curve и gate copy на одной cohort: эффект нельзя будет атрибутировать.

### 7.3 Assignment и exposure

- assignment server/frozen и sticky;
- exposure отправляется только когда пользователь реально увидел вариант;
- только pre-assignment `pending_fallback` не входит в cohort; после frozen eligible assignment отсутствие exposure/gate/start остаётся в ITT;
- возвращающийся пользователь не меняет arm после reinstall/account link;
- новая версия content release не должна случайно перераздать эксперимент;
- experiment id, config revision и release id входят в exposure payload.

## 8. Тестовая стратегия

### 8.1 Test pyramid

| Слой | Что проверяет | Доля/частота |
|---|---|---|
| Pure unit | schemas, gates, stars, reducers, schedulers, hash, normalization | каждый PR |
| Contract | admin artifact ↔ release ↔ client registry ↔ renderer | каждый PR |
| Component | все shell states, accessibility tree, large text | каждый renderer PR |
| Integration | storage/account/offline/sync/callable/idempotency | каждый вертикальный slice |
| E2E | episode 1, checkpoint, purchase, rollback, account switch | milestone gate |
| Device/manual | микрофон, Bluetooth, calls, background, noisy room, screen reader | release candidate |
| Learning/content QA | can-do, phrase naturalness, difficulty, transfer validity | каждый content release |

### 8.2 Обязательные unit invariants

- один activity даёт максимум три earned performance stars (`HYP-V2-004`);
- `V2_MAX_MANDATORY_LEARNING_RETRIES=2` относится к `HYP-V2-002`; technical retries не расходуют cap, а template/admin не может его увеличить;
- повтор с тем же/хуже результатом не создаёт delta;
- purchased access не меняет `LearningEvidence` или independent/durable mastery fields;
- access deficit не может стать отрицательным;
- gate curve монотонна и не экспоненциальна;
- checkpoint игнорирует purchased access;
- typed fallback не выдаёт voice evidence;
- typing не создаёт spoken evidence, а captioned route не создаёт listening evidence;
- недоступный construct создаёт отдельный `LearningNonAssessment(not_assessed_accessibility)`, а objective projection получает `status:'not_assessed', reason:'accessibility'`, не pass/fail;
- `UNCERTAIN/INVALID` не ухудшает best result;
- `LearningEvidence` всегда assessed; accessibility/system/invalid создают только `LearningNonAssessment`;
- delayed является phase/timing, не construct; independent/delayed/spoken/listening unions отклоняют запрещённые prompt/input/caption/calibration combinations;
- один `opId` purchase/reward создаёт ровно один receipt;
- progress snapshot bounded опубликованными slots/nodes/objective×construct×phase tuples; replay не увеличивает его размер;
- snapshot хранит один best attempt ref на slot, bounded node outcome и максимум best/latest evidence refs на tuple; access/voice/checkpoint/loops только derived;
- одинаковый `opId/observationId` с разным hash уходит в quarantine, а pending outbox удаляется только после acknowledgement;
- старый release не может затереть progress нового release;
- activity result сохраняется по stable `activityId/skillId`, а content text не является identity;
- неизвестный schema version fail-closed с bundled fallback.
- incomplete activity kernel или authoring manifest отсутствует в admin capability catalog;
- изменение approved/published `ModeTemplateVersion` всегда создаёт новую version и не мутирует опубликованный episode; authoring draft при этом использует отдельные `revision/fingerprint`;
- `ActivityInstance` pin-ит точные `templateId`, `templateVersion` и `templateContentHash`;
- clone получает новые IDs, сбрасывает approval и сохраняет provenance исходника;
- server и client одинаково отклоняют unknown kernel/primitive/policy/template version;
- browser preview не может выставить признак runtime-preview-passed.

### 8.3 Voice matrix

| Сценарий | Ожидаемый результат |
|---|---|
| Permission first ask | explanation → system dialog → возврат в Ready; запись не стартует сама |
| Permission denied | доступная инструкция/settings + text/listen fallback |
| Тихий/пустой звук | INVALID, попытка и звёзды не меняются |
| Сильный шум | UNCERTAIN, нейтральный retry |
| TTS ещё играет | mic disabled с понятной причиной |
| Incoming call/alarm | capture отменён нейтрально, ресурсы освобождены |
| Background/navigation | recorder/watchdog/listeners остановлены |
| Bluetooth route change | neutral recovery, новый explicit start |
| STT timeout | local retry/fallback, UI не зависает |
| Duplicate callback | reducer принимает только первый terminal result |
| Offline controlled task | работает локально при наличии bundle |
| Offline AI Club | scripted fallback или return later, core не блокируется |

### 8.4 Accessibility matrix

Проверяются:

- VoiceOver и TalkBack;
- 200% font scale без обрезания и наложений;
- Reduce Motion;
- high contrast и отсутствие color-only meaning;
- Switch Access / external keyboard;
- touch target минимум 44×44, рекомендуемо 48×48;
- порядок focus после feedback;
- альтернативы hold/drag/swipe/timed mode;
- корректный язык TTS/accessibility для L1/L2 текста;
- transcript/caption для аудио, когда это не раскрывает ответ до попытки;
- доступная list-view альтернатива интерактивной сцене.

Accessibility test дополнительно проверяет evidence semantics: typing не засчитывается как spoken construct, caption не засчитывается как listening construct, а недоступное измерение создаёт отдельный `LearningNonAssessment(not_assessed_accessibility)` и objective state `not_assessed/accessibility` без штрафа и ложного mastery claim. Performance/access progress по валидной альтернативной activity policy при этом разрешён.

### 8.5 Content QA

Каждый episode release должен пройти machine gates:

- schema/version/identity;
- все referenced assets/responses существуют;
- 8–9 nodes и ровно один can-do/capstone;
- phrase count/difficulty limits;
- отсутствие дубликатов и answer leakage;
- required modes поддерживаются studyTarget/sourceLocale;
- для primary route и каждой опубликованной accessibility route рассчитан `maxReachablePerformanceStars`; route может выполнить local minimum и cumulative gate без покупки boost;
- сумма достижимых slots учитывает shared `starSlotId`, starless nodes и route-specific scoring caps; недостижимый gate блокирует release;
- voice target не содержит неподдерживаемых символов/длины;
- ни одна critical instruction не зависит только от изображения/цвета;
- checkpoint не вводит новые обязательные chunks;
- delayed probe использует новый surface form/context;
- independent/delayed probe не переиспользует training prompt как доказательство;
- каждый episode artifact содержит support-fading plan, independent probe, delayed probe и валидный prerequisite outcome/exposure DAG;
- safety/privacy flags;
- deterministic snapshot/hash.

Human review проверяет естественность, культурную уместность, реальную выполнимость can-do, качество отвлекающих вариантов и соответствие звукового фокуса L1 профилю.

### 8.6 Admin authoring matrix

Каждая из 17 runtime activity families получает authoring fixture, который проходит один и тот же контракт. Для checkpoint отдельно создаётся episode-level assessment fixture, подтверждающий агрегацию обычных graph nodes, pass policy и deterministic non-AI alternate:

| Проверка | Ожидаемый результат |
|---|---|
| Kernel полностью зарегистрирован | Тип виден в Mode Library |
| Нет validator/evidence/recovery/preview fixture | Тип скрыт, capability endpoint возвращает точную причину |
| Создание шаблона | Draft revision с owner, `baseVersion/proposedVersion` и immutable operation ID |
| Повтор того же operation ID | Идемпотентный replay без второго шаблона |
| Одновременное редактирование | Stale `expectedRevision` отклонён; обе версии можно сравнить |
| Clone template/episode | Новый template ID либо новые episode/activity/node IDs, approval сброшен, source provenance сохранён |
| Изменение исходного текста | Затронутые переводы и downstream reviews становятся stale |
| Удаление используемого шаблона | Запрещено; разрешены deprecate и archive после impact report |
| Добавление activity в graph | Payload-форма соответствует authoring manifest выбранного type/version |
| Reorder/branch | DAG, loops, reachability и star-slot invariants пересчитаны |
| Season composition | Scope-specific refs валидны; production `full_season` содержит 32 exact approved EpisodeRevision refs, 4×8/checkpoints и gate table совпадает с `gatePolicyVersion` |
| Structural preview | Показывается как browser preview, без заявления о runtime parity |
| Device preview | Тот же `PreviewEnvelope` проходит app loader/registry/renderer |
| Неизвестная app capability | Release preflight блокирует activation для целевой cohort |
| Approval/seal/activate | Права, reason, fingerprints, audit и immutable hashes обязательны |
| Rollback | Возвращает прошлый release; drafts/templates не удаляются |

### 8.7 Сквозной E2E Content Studio

Milestone gate выполняет один реальный путь без подмены интерфейса прямыми Firestore writes:

```text
создать ModeTemplate draft
  → заполнить schema-driven форму
  → проверить все обязательные preview scenarios
  → отправить на review
  → одобрить отдельной ролью
  → создать `vertical_slice` SeasonDraft и выбрать immutable gatePolicyVersion
  → создать EpisodeDraft
  → добавить и настроить ActivityInstance
  → собрать graph и star slots
  → открыть browser и device preview
  → пройти deterministic QA и независимый review эпизода
  → закрепить approved EpisodeRevision в новой SeasonRevision
  → проверить `vertical_slice`: только E1, без gate, production activation запрещена
  → одобрить SeasonRevision отдельной ролью
  → seal lesson-bundle.v2
  → activate в staging
  → загрузить тем же app loader
  → создать новую revision
  → rollback на предыдущий release
```

E2E отдельно проверяет keyboard navigation, focus после ошибок, tooltips, один primary CTA на экран, loading/empty/error/dirty states и ширины 375/768/1024/1440 из Admin UI Bible. Ни один шаг не использует сырой JSON как единственный путь выполнения обычной редакторской задачи.

Полная модель authoring и прав определена в [08-admin-content-studio-and-mode-authoring.md](./08-admin-content-studio-and-mode-authoring.md).

## 9. Failure drills до rollout

Команда должна намеренно проверить:

1. release index доступен, один object повреждён;
2. новый release активирован и немедленно откатан;
3. пользователь начал episode на release A и продолжил после B;
4. offline completion синхронизируется дважды;
5. shard purchase request повторяется после timeout;
6. account link/switch во время pending sync;
7. scorer provider недоступен сутки;
8. AI Club quota исчерпана;
9. app background во время записи и во время hash write;
10. remote config недоступен или имеет неизвестную revision.

Для каждого drill фиксируется ожидаемый пользовательский текст, локальное состояние, server state, analytics outcome и rollback action.

## 10. Stop / rollback criteria

Rollout автоматически замораживается, а не «наблюдается дальше», если обнаружено:

- потеря/смешение account progress;
- duplicate shard debit/reward;
- purchased access или performance stars попали в `LearningEvidence`/mastery/checkpoint;
- raw speech/transcript оказался в analytics;
- crash/freeze regression выше заранее принятого guardrail;
- voice invalid rate делает обязательный путь недостижимым для заметного device/locale сегмента;
- release hash mismatch без рабочего fallback;
- недоступность legacy fallback;
- safety regression в AI mission.

Rollback должен отключить capability/release, но не удалять уже записанные receipts/evidence. После исправления replay остаётся идемпотентным.

## 11. Definition of pilot success

Пилот отвечает «да» только если доказаны четыре независимых свойства:

1. **Learning:** delayed transfer выше или не хуже выбранного baseline при достаточной выборке.
2. **Reliability:** voice/content/progress работают в реальных device/offline состояниях.
3. **Operability:** администратор создаёт, проверяет, публикует и откатывает episode без ручного редактирования production-файлов.
4. **Economy fairness:** access boost помогает продолжить, но не покупает `LearningEvidence`/mastery и не вытесняет учебное восстановление.

Высокое число сессий при провале любого из этих четырёх пунктов не является успешным V2.
