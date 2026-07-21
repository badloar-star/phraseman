# Phraseman Learning V2 — мастер-хендовер

**Последнее обновление:** 2026-07-15, Europe/Dublin  
**Статус цели:** active  
**Текущая стадия:** планирование и нормативные спецификации завершены; реализация начата с security inventory; umbrella Phase 00 ещё не закрыта полностью  
**Точный следующий крупный шаг:** закрыть замечание о незакреплённом Firebase CLI отдельным focused commit, повторить 351 + 60 security gates, затем выполнить umbrella Phase 01 / Task 1.1 — identity и versioning; после него строго 1.1A → 1.2 → 1.3 → 1.4 и только после появления canonical episode/evidence contracts переходить к dedicated Content Studio Tasks 1–3  
**Назначение файла:** это живой центр управления между сессиями. Он не заменяет подробные спецификации и TDD-планы, а сообщает следующей сессии, что прочитать, что уже доказано, что не сделано и какой именно шаг выполнять дальше.

---

## 0. Обязательный старт каждой следующей V2-сессии

Следующая сессия не должна начинать код, UI, генерацию контента или рефакторинг по памяти. Она обязана выполнить этот порядок:

1. Прочитать корневой `AGENTS.md` и этот файл полностью.
2. Прочитать `docs/v2/README.md` как основной продуктовый вход.
3. Прочитать оба исполняемых плана полностью:
   - `docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md`;
   - `docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md`.
4. Для текущей задачи прочитать соответствующую нормативную спецификацию из `docs/v2/01`–`08`; не использовать краткий пересказ из хендовера вместо точного контракта.
5. Если задача затрагивает Admin UI, до любых изменений прочитать `docs/design/ADMIN_UI_BIBLE.md`.
6. Проверить активную цель задачи и Git-состояние обоих checkout:

```powershell
git -C C:\appsprojects\phraseman status --short --branch
git -C C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot status --short --branch
git -C C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot log -3 --oneline
```

7. Убедиться, что пользовательские изменения в основном checkout не перезаписываются. Основной checkout сильно грязный; V2-код вести в изолированном worktree или в другом явно согласованном безопасном worktree.
8. Перед реализацией назвать пользователю текущую фазу, точную задачу, acceptance criteria и узкие проверки.
9. Работать test-first там, где это предписано планом: сначала подтверждённый RED, затем минимальная реализация, затем GREEN и независимая проверка.
10. Перед завершением, сменой сессии или compaction обновить этот файл фактическими commit/test/blocker данными. Фразы вроде «продолжить дальше» недостаточно.

### Приоритет источников при расхождении

1. `AGENTS.md`, правила безопасности, приватности, удаления данных и Admin UI Bible.
2. Нормативные V2-спецификации `docs/v2/05`, `06`, `08` для своих областей.
3. Каноническая учебная архитектура и curriculum в `docs/v2/03`–`04`.
4. Два плана 2026-07-14 для порядка реализации и точных TDD-шагов.
5. Этот хендовер для текущего состояния и маршрута продолжения.
6. Старые/legacy/experimental документы — только как контекст; они не могут переопределять V2.

Если краткий umbrella-план и dedicated Content Studio plan описывают одну область с разной детализацией, более детальный Content Studio plan обязателен внутри соответствующей umbrella-фазы. Если старый Speaking Club, Lessons V2 prototype или generator-документ конфликтует с `docs/v2`, выигрывает канонический V2-набор.

---

## 1. Что именно потребовал владелец продукта

Нужно не отдельное голосовое упражнение и не косметический Lessons V2 prototype, а единая следующая версия обучения Phraseman:

- пилотный сезон из **32 эпизодов**, чтобы проверить учебную последовательность, звёздные ворота, удержание, качество распознавания речи, генератор и выпуск контента до масштабирования на сотни эпизодов;
- Duolingo-like ясная карта и постепенное открытие уроков, но с естественными фразами и заметно большим количеством речи;
- отобранные лучшие учебные механики из Duolingo, Rosetta Stone, EWA/EULA, ELSA, текущего Phraseman и текущего Speaking Club — не механическое копирование всех режимов и не копирование чужого визуального оформления;
- последовательность «понять контекст → услышать и различить → собрать/вспомнить → сказать с поддержкой → быстро ответить → пройти диалог/миссию → вернуться к материалу позже»;
- отдельная сильная голосовая ветка внутри того же движка, а не ещё один изолированный продукт;
- Speaking Club встроить как подготовленный transfer/capstone после обучения материалу, а не использовать как первый способ познакомиться с новой фразой;
- диалоги, scripted routes и ограниченное ветвление; AI не должен быть обязательным для core completion;
- Personal Plan превратить в общий scheduler повторения над теми же activity contracts, а не поддерживать второй мир контента;
- звёзды сохранять и использовать для открытия следующих эпизодов; поздние ворота требуют больше, а повторное качественное прохождение предыдущего материала должно иметь смысл;
- разрешить покупку только **access boost** за shards, но не продавать mastery, LearningEvidence, checkpoint-pass, pronunciation claim или ложное доказательство знания;
- множество режимов должно быть модульным: новый язык, новый урок и новый экземпляр активности создаются через Admin Content Studio из зарегистрированных kernels/templates;
- Admin Content Studio должен создавать ModeTemplate, ActivityInstance, Episode и Season, показывать preview, валидацию, локализацию, approvals, immutable release, rollback и реальное состояние поддержки версий приложения;
- совершенно новая механика сначала пишется и тестируется в приложении как code-owned kernel; администратор не загружает произвольный JavaScript, renderer или scorer;
- для каждого выбранного режима до production UI собрать несколько проверяемых референсных кадров, описать состояния, motion, расположение контролов и затем сделать оригинальный интерфейс Phraseman;
- legacy не удалять и не скрывать как побочный эффект. Он остаётся fallback до доказанного паритета, данных rollout и отдельного решения владельца;
- режим Challenges не развивать как отдельный параллельный контентный мир; позднее он может стать side-node/adaptor, но удаление возможно только в Phase 14 после отдельного одобрения;
- использовать GSD/TDD, фазовые acceptance gates, тесты после каждого внедрения, реальные UI/device проверки и очень подробные хендоверы.

Уточнение названия от владельца: имелось в виду **EULA**, не «Biola». Research-документ также анализирует EWA; не превращать это в новое название продукта.

---

## 2. План в трёх представлениях

### 2.1 План одной фразой

Сначала защищаем данные и фиксируем одинаковые контракты client/Functions, затем строим честный progress/star/access ledger и модульный runtime, после этого — единый voice shell и лучшие P0-режимы, затем Admin Content Studio и реальный E1 author-to-device vertical slice, потом восемь эпизодов и checkpoint, Speaking Club/personal review, оставшиеся главы, аналитику и осторожный rollout; legacy обсуждается только последним отдельным решением.

### 2.2 Полный umbrella-маршрут 00–14

| Фаза | Содержание и точный порядок | Gate / результат | Статус на 2026-07-15 |
|---|---|---|---|
| 00 | Security inventory, legacy direct-access classification, удаление broad-admin OR bypass, server-only V2 paths, canonical Body/Record/hash boundary | Emulator deny для будущих authoring paths; legacy compatibility; одинаковые canonical bytes/hash | **В работе.** Content Studio Task 0 закоммичен локально и зелёный; canonical artifact contracts ещё не реализованы; Firebase CLI не закреплён |
| 01 | 1.1 identity/versioning → 1.1A immutable DecisionRegistry → 1.2 activity/episode/curriculum → 1.3 evidence/result → 1.4 backend mirror → 1.5 Content Studio Tasks 1–3 | Shared client/Functions corpus, stable issue codes, no shadow contracts, 17 families, immutable ModeTemplate | Не начато; ближайший код — umbrella Task 1.1 |
| 02 | 2.1 pure reducer/gate policy → 2.2 Content Studio Task 4 → 2.3 account store/outbox → 2.4 server event → 2.5 Access Boost callable → 2.6 rules/emulator | Idempotent local-first progress; performance/access/evidence physically separated; offline/restart safe | Не начато |
| 03 | 3.0 competitor reference-evidence pack + owner UI approval → 3.1 registry → 3.2 ActivityScaffold → 3.3 six shells → 3.4 thin routes/resume | One registry, one scaffold, six accessible shells; UI evidence approved before production work | Заблокировано до Task 5A/reference pack |
| 04 | 4.1 capture state machine → 4.2 scorer boundary → 4.2A calibration/privacy gates → 4.3 accessible capture UI → 4.4 device matrix | Voice never deadlocks; scorer claims match measured construct; fallback/privacy/device gates pass | Не начато |
| 05 | 5.1 Visual Discovery + Listen & Choose → 5.2 Phrase Builder → 5.3 Repeat + Quick Response → 5.4 Scripted Dialogue → 5.5 legacy adapters | P0 learning loop runs through shared contracts; old modes adapt without duplication | Не начато |
| 06 | 6.1 V2 stages/validators → 6.2 Admin Content Studio → 6.3 lesson-bundle seam → 6.4 loader/cache → 6.5 Content Studio Tasks 14–15 | E1 authored, previewed, sealed, activated and rolled back in lab/staging; production E1 release must still fail | Не начато |
| 07 | 7.1 E1 fixture through real loader → 7.2 real map state → 7.3 completion/stars/resume → 7.4 analytics | Один полный пользовательский vertical slice проходит offline/restart/fallback | Не начато |
| 08 | 8.1 P1 modes → 8.2 E1–E8 generation/approval → 8.3 deterministic E8 checkpoint → 8.4 dogfood | Chapter 1 готов для закрытого пилота; scoring/UX/generator исправлены по данным | Не начато |
| 09 | 9.1 Club evidence split → 9.1A consent/copy/eligibility → 9.1B one server egress → 9.1C verified deletion/legal hold → 9.2 Club adapter → 9.3 fallback → 9.4 review scheduler | Club — capstone, not teacher; network voice governed; scripted fallback and shared review work | Не начато |
| 10 | 10.1 placement → 10.2 E16/E24/E32 checkpoints → 10.3 Challenges side-node adapter → 10.4 migration rehearsal | Existing progress preserved; placement/checkpoints deterministic; no forced legacy deletion | Не начато |
| 11 | 11.1 chapter-by-chapter generation → 11.2 whole-season QA → 11.3 non-English seam proof | Все 32 graphs pass schema/content/localization/release gates; один второй язык proves seam | Не начато |
| 12 | 12.1 governed events → 12.2 learning projections → 12.3 experiment passports → 12.4 operational alerts | Completion, independent evidence, delayed evidence, voice health and economy measurable without false causal claims | Не начато |
| 13 | 13.1 manifests/cohorts → 13.2 performance → 13.3 accessibility/devices → 13.4 rollback drills → 13.5 R0–R5 ramp | Dogfood → closed cohorts → candidate default; stop/rollback gates and delayed windows mature | Не начато |
| 14 | Explicit owner decision: keep both, make V2 default with fallback, migrate Challenges, or retire specifically named legacy surfaces | No deletion without parity, data and separate explicit approval | Не начато; намеренно последнее |

Каждую фазу перед кодом нужно детализировать отдельным GSD phase plan, не стирая текущую `.planning`: она относится к другому milestone. V2 должен получить отдельный milestone/workstream.

### 2.3 Полный вложенный маршрут Content Studio 0–15

| Task | Что создаётся | Зависимость / interlock | Статус |
|---|---|---|---|
| 0 | Direct-access inventory, explicit Firestore allows/denies, emulator matrix | До любых новых authoring collections/callables | **Локальный commit готов; один P2 follow-up открыт** |
| 1 | Shared authoring contracts, canonical JSON/hash, eight-entry DecisionRegistry | Umbrella Phase 01; выполнять только после GREEN umbrella Tasks 1.1–1.4 | Следующий внутри Content Studio после 1.1–1.4 |
| 2 | Code-owned capability catalog и app-support manifests | После Task 1; umbrella Phase 01 | Не начато |
| 3 | Immutable ModeTemplate versions, clone/deprecate/localization | После Task 2; umbrella Phase 01 | Не начато |
| 4 | ActivityInstance, EpisodeDraft/graph, SeasonDraft/revisions | Только после единой green gate policy из Phase 02 | Не начато |
| 5 | Callables, roles, permissions, indexes, Storage, audit, optimistic concurrency | До Admin UI | Не начато |
| 5A | Competitor evidence ledger, screenshots/contact sheets, original wireframes, owner approval | Обязательный gate до Phase 03/production UI | Не начато |
| 6 | Admin IA и shared wizard shell | Читать Admin UI Bible; после 5A | Не начато |
| 7 | Mode Library wizard | После 1–6 | Не начато |
| 8 | Episode Builder, graph editor и season workspace | После Task 4/permissions/shell | Не начато |
| 9 | PreviewEnvelope Body/Record и real-device Preview Lab | Нельзя подменять mock preview | Не начато |
| 10 | Validation receipts, review projections и revision-bound waivers | Receipts append-only, no record backrefs | Не начато |
| 11 | Translator workflow для templates/episodes | Workflow metadata вне hashable content bodies | Не начато |
| 12 | V2 13-stage generation DAG | Делегировать существующему stage engine, не создавать второй queue | Не начато |
| 13 | `lesson-bundle.v2`, sealing, activation, rollback | Immutable/content-addressed releases | Не начато |
| 14 | E1 author-to-device end-to-end gate | Lab/staging only | Не начато |
| 15 | Content Studio infrastructure rollout controls | Это не product cohort rollout Phase 13 | Не начато |

Точный код и тесты каждого Task находятся в `2026-07-14-phraseman-v2-content-studio.md`. Не заменять их пересказом из таблицы.

### 2.4 Точный ближайший исполнимый маршрут

1. Подтвердить, что 14-path canonical package уже tracked в pilot worktree: docs-only commit source `0b94c9749`, cherry-pick commit `a09f57da2`; `git ls-files --error-unmatch ...` должен вернуть все 14 paths.
2. Исправить воспроизводимость Task 0 отдельным focused change: закрепить `firebase-tools@15.15.0`, подтвердить вызов локального binary и повторить 351 emulator + 60 static tests.
3. Не смешивать с этим восстановление общего Functions build: девять текущих TypeScript ошибок доказанно существовали в parent commit; для них нужен отдельный baseline-fix task/commit.
4. Выполнить umbrella Phase 01 / Task 1.1 test-first: identity grammar и schema versions без React/Firebase imports.
5. Затем выполнить в утверждённом порядке 1.1A DecisionRegistry → 1.2 activity/episode/curriculum → 1.3 evidence/result → 1.4 backend conformance mirror.
6. Только после этого выполнять dedicated Content Studio Tasks 1–3. Task 1 импортирует canonical episode/evidence types и не должен создавать их shadow/reduced copies.
7. После каждого numbered task обновлять этот хендовер точным commit, RED/GREEN выводом, файлами, findings и следующим зависимым шагом.

---

## 3. Каноническая продуктовая архитектура

### 3.1 Один движок, разные учебные роли

- **Activity kernel** — code-owned исполняемая механика с renderer/scorer/progress/reward/recovery capabilities.
- **ModeTemplate** — immutable versioned конфигурация разрешённого kernel и пяти hash-pinned policy slots.
- **ActivityInstance** — конкретное упражнение с контентом внутри эпизода.
- **Graph node** — место ActivityInstance в маршруте, включая phase, обязательность, fallback, evidence declaration и star slot.
- **EpisodeRevision** — immutable учебный graph с can-do objective, scenario, фразами, двумя access-required loops, capstone и отдельными assessment/review links.
- **SeasonRevision** — exact pins на approved episode revisions, decision registry и gate policy; scope бывает vertical-slice, chapter-internal или full-season.
- **Course release/bundle** — content-addressed immutable deliverable с app-support manifest, activation head и rollback.

Admin может конфигурировать только возможности, которые уже существуют в capability catalog. Он не может загружать код, придумывать произвольный scorer, ослаблять evidence policy или вводить незарегистрированный числовой threshold.

### 3.2 Учебный цикл внутри эпизода

1. Encounter/Visual Discovery — смысл и ситуация.
2. Notice/Listen — распознавание реплики, звука, формы или намерения.
3. Build/Recall — сборка и самостоятельное извлечение фразы.
4. Controlled Speak — модель, запись, честная обратная связь.
5. Quick Response — короткий ответ без полного текста.
6. Dialogue/Transfer — scripted dialogue, branching scene или prepared Speaking Club mission.
7. Independent probe — отдельная оценка без обучающей подсказки; обычный episode access не должен зависеть от неё.
8. Delayed review/probe — scheduler-owned D+N возврат; nominal delivery D+1/D+7/D+21 не равна assessable durable window HYP-V2-007.

Два access-required loops — encounter/build и immediate near-transfer. Independent evidence и durable evidence не подменяются completion или звёздами. Исключение: явно опубликованный independent-only checkpoint pass на границе главы.

### 3.3 Семнадцать runtime activity families и checkpoint

1. Visual Discovery.
2. Listen & Choose.
3. Sound Contrast.
4. Sound/Syllable Lab.
5. Repeat & Compare.
6. Phrase Builder.
7. Listen & Build / Dictation.
8. Context Gap.
9. Quick Spoken Response.
10. Shadowing.
11. Describe Scene.
12. Microstory / Radio.
13. Branching Adventure.
14. Scripted Dialogue.
15. Speaking Club Mission.
16. Personalized Review.
17. Speed Match — optional practice.

Checkpoint — не восемнадцатая family и не отдельный scorer. Это episode-level assessment contract над обычными ActivityInstances: objectives, required semantic slots, critical constraints, independent evidence, deterministic alternate and repair routes.

### 3.4 Роль Speaking Club, Rosetta-like метода и диалогов

- Rosetta-like visual/context discovery хорошо вводит новый смысл и вызывает controlled speech, но само по себе не доказывает свободный перенос.
- Speaking Club силён как transfer/capstone, потому что требует удерживать цель разговора и реагировать, но плох как первый encounter с новым материалом.
- Scripted Dialogue соединяет controlled practice и transfer и обеспечивает детерминированный offline/non-AI маршрут.
- Branching/AI routes добавляются только после подготовки и всегда имеют core-compatible fallback.
- Поэтому это не конкурирующие продукты. Они являются разными фазами одного episode graph.

### 3.5 Звёзды, доступ и mastery

Нельзя хранить одну универсальную «звезду» со всеми значениями. Контракты разделяют:

- `performanceStarsEarned` — награда за качество выполнения разрешённых star slots;
- `accessStarsEarned` — read-only проекция заработанных access-единиц;
- `accessStarsPurchased` — отдельный append-only ledger Access Boost за shards;
- `LearningEvidence` — assessed доказательство конкретного construct/objective;
- `LearningNonAssessment` — честное объяснение, почему construct не оценён;
- `voiceBadge`/voice evidence — отдельная квалификация, только если измерение действительно её поддерживает.

Покупка может помочь открыть контент, но не может:

- выдать performance star;
- закрыть required learning loop;
- пройти checkpoint;
- создать semantic/listening/spoken/acoustic/durable evidence;
- изменить pronunciation analytics;
- выдать mastery или CEFR claim.

Все текущие числа и HYP-V2-001…008 — продуктовые гипотезы, пока не валидированные причинным экспериментом. Admin выбирает только immutable зарегистрированную policy/version, а не вводит произвольное число.

---

## 4. Канонические 32 эпизода пилота

### Глава 1 — начать разговор

1. **Hello, I’m…**
2. **Who’s this? What’s that?**
3. **My people, my things**
4. **What I like and want**
5. **My ordinary day**
6. **When and how often?**
7. **Can you help me?**
8. **Checkpoint: First day here**

### Глава 2 — повседневная жизнь

9. **My home and neighborhood**
10. **At the shop**
11. **What’s happening now?**
12. **Yesterday: where and what**
13. **My weekend story**
14. **I don’t feel well**
15. **Let’s make a plan**
16. **Checkpoint: Weekend with a friend**

### Глава 3 — поездка и поддержание общения

17. **At the station or airport**
18. **Checking in**
19. **A meal that works for me**
20. **Which one is better?**
21. **Have you ever…?**
22. **Rules and permission**
23. **Keep the conversation going**
24. **Checkpoint: Travel day goes wrong**

### Глава 4 — более самостоятельная речь

25. **My work or study day**
26. **What happened while…?**
27. **Solve a service problem**
28. **If this happens…**
29. **The person or place I mean**
30. **Messages and what people said**
31. **My story and next step**
32. **Final Checkpoint: One independent day**

Полные objectives, фразы, activity order, grammar limits, capstones и evidence expectations находятся только в `docs/v2/03-learning-architecture-and-curriculum.md`. Не генерировать все 32 до работающего E1 vertical slice и не обещать CEFR certification.

---

## 5. Карта документов и обязательный порядок чтения

| Путь | Роль | Когда читать |
|---|---|---|
| `docs/v2/HANDOVER.md` | Текущее состояние, exact next step, ветки, проверки, риски | В начале и конце каждой V2-сессии |
| `docs/v2/README.md` | Главный продуктовый индекс и утверждённая архитектура | Всегда перед работой |
| `docs/v2/00-research-and-skill-audit.md` | Provenance research/skills; не runtime authority | Перед новым research/design решением |
| `docs/v2/01-current-state-audit.md` | Что реально уже есть: legacy, Lessons V2 prototype, plans, voice, Club, generators | Перед интеграцией/миграцией |
| `docs/v2/02-competitor-and-learning-evidence.md` | Rosetta/Duolingo/ELSA/EWA, learning evidence, P0/P1/P2 и UI reference protocol | Перед выбором activity/UI pattern |
| `docs/v2/03-learning-architecture-and-curriculum.md` | Учебный source of truth и E1–E32 | Для contracts/content/episode work |
| `docs/v2/04-activity-catalog-and-storyboards.md` | ActivityScaffold, six shells, voice shell, 14 storyboards, states/motion/accessibility | Перед UI/runtime activity work |
| `docs/v2/05-stars-progress-and-mastery.md` | Нормативные stars/access/evidence/gates/offline contracts | Для progress, economy, purchase и gates |
| `docs/v2/06-runtime-content-admin-and-release.md` | Нормативные runtime/evidence/voice/release/loader contracts | Для client/backend/release work |
| `docs/v2/07-migration-analytics-testing.md` | Adapter-first migration, flags, events, experiments, test matrix и rollback | Для rollout/telemetry/migration |
| `docs/v2/08-admin-content-studio-and-mode-authoring.md` | Одобренная нормативная Content Studio spec и единственная machine schema DecisionRegistry | Для любого authoring/Admin/generator work |
| `docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md` | Umbrella GSD/TDD implementation plan | Всегда; читать текущую фазу полностью |
| `docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md` | Вложенный точный TDD-план генератора/Studio | Всегда при Task 0–15 |
| `docs/design/ADMIN_UI_BIBLE.md` | Единственный UI source of truth для Admin | Перед изменением Admin UI/navigation |

### Смежные документы, которые нельзя принять за канон

- `docs/superpowers/plans/2026-07-10-lessons-v2-experimental-surface.md` — dev-only визуальный prototype, не production engine plan.
- `docs/superpowers/specs/2026-07-10-living-lesson-journey-design.md` — precursor с 8–16 episodes; superseded каноническими 32/4×8.
- `specs/speaking-club.md` — legacy Club vision с 32 Club missions, hold-to-talk и numeric/acoustic assumptions; для V2 не нормативен.
- `docs/superpowers/specs/2026-06-10-speaking-mode-polish-design.md` — legacy transcript threshold; не V2 mastery/acoustic evidence policy.
- `docs/superpowers/specs/2026-07-04-speaking-word-drill-design.md` — полезный legacy UI context, не canonical V2 scorer.
- `docs/superpowers/plans/2026-07-12-admin-v2-content-generation-platform.md` — существующий stage/generation foundation Releases 0–7; сохранять и переиспользовать.
- `docs/superpowers/plans/2026-07-13-admin-content-generator-improvements-r8-r12.md` — hardening существующего генератора; не заменяет V2 authoring spec.
- `docs/superpowers/specs/2026-07-13-admin-content-studio-r10b-design.md` — старый generator UX; название Content Studio не делает его V2 authority.

Правило интеграции генератора: существующая Generation Queue остаётся одной реализацией выполнения. Новые V2 authoring entities и stage adapters делегируют ей; не создавать второй конкурирующий queue/worker.

---

## 6. Фактически выполненная реализация

### 6.1 Изолированный worktree и commit

- Worktree: `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`
- Branch: `codex/learning-v2-pilot`
- Branch tip: этот файл сам входит в последующий handover commit, поэтому не хранит невозможный self-referential HEAD; следующая сессия обязана выполнить `git rev-parse HEAD` и записать результат в датированный session snapshot.
- Task 0 implementation commit: `ec8ebed296a8d61e27a8ede1eae9510f8fcbae3a`
- Canonical docs/handover persistence commit in pilot: `a09f57da2d2442d114202bb3d52bf58abe917bb1`
- Source docs-only commit in main: `0b94c974938f0e157dec45b1c4031bd1c89dd90c`
- Parent/common base: `96d2568fbbe958a96e3c68156a7bcf1abce5d3a0`
- Commit subject: `security: isolate Content Studio authoring paths`
- Состояние после свежей проверки: чистое.
- Upstream/remote branch: отсутствует.
- Deploy: не выполнялся.
- Push: не выполнялся.
- Task 0 не входит в основной checkout.

### 6.2 Что изменено в commit

| Файл | Фактическое назначение |
|---|---|
| `docs/reports/learning-v2/content-studio-direct-access-inventory.md` | 241-строчная инвентаризация legacy namespaces, V2/server-only paths, RED/GREEN, compatibility и deploy limits |
| `firestore.rules` | Удалён global `isAdmin()` catch-all; сохранены минимальные explicit legacy operations; добавлены 18 explicit V2 deny roots и финальная deny boundary |
| `functions/jest.config.js` | Emulator-only тест исключён из обычного Functions Jest discovery |
| `functions/jest.emulator.config.js` | Dedicated config выбирает только emulator suite |
| `functions/package.json` | Добавлена dedicated emulator-команда и testing dependencies; остаётся вопрос о `firebase-tools` |
| `functions/package-lock.json` | Lock новых test dependencies |
| `functions/src/content_studio/emulator/v2_authoring_rules.emulator.test.ts` | 32 server-only collections × operations, 78 legacy namespaces, nested/dynamic cases, matchmaking exception |
| `tests/firestore_rules_security.test.ts` | Semantic rules guards против broad recursive, sibling/wrapper OR, duplicate/generic wildcard и formatting bypass |

Commit содержит 8 файлов, 2611 добавлений и 17 удалений.

### 6.3 Доказанный RED/GREEN

Записанный initial RED:

- 160 deny-проверок упали из-за broad admin catch-all;
- итог initial run: `160 failed, 23 passed, 183 total`;
- отдельный RED обнаружил, что admin-get чужой `matchmaking_queue` неожиданно разрешён.

Финальный и свежеповторённый GREEN:

```powershell
npm --prefix functions run test:emulator:v2-authoring-rules
# PASS: 1 suite, 351/351 tests

npx jest --runTestsByPath tests/firestore_rules_security.test.ts --no-cache --runInBand
# PASS: 1 suite, 60/60 tests
```

Default Functions Jest discovery содержит 123 test paths и не подхватывает emulator suite. Dedicated config обнаруживает ровно один emulator suite. `PERMISSION_DENIED` warnings внутри emulator output ожидаемы для `assertFails`.

### 6.4 Что Task 0 не делал

- не создавал production Firestore collections/documents/indexes;
- не добавлял authoring callables или Admin UI;
- не развёртывал Rules, Functions или Hosting;
- не менял production data;
- не реализовывал V2 contracts, episodes, stars, voice shell или Content Studio;
- не переносил канонические plan/spec файлы в worktree;
- не удалял legacy paths или UI.

### 6.5 Что не сработало и как это было диагностировано

- Initial emulator run правильно стал RED: broad `isAdmin()` catch-all разрешал все 160 будущих server-only операций. Исправление — explicit legacy capabilities и deny-by-default boundary, а не строковый фильтр по названиям paths.
- Первая compatibility-гипотеза для `matchmaking_queue` была слишком широкой: admin-get чужого документа неожиданно проходил. Матрица показала, что сохранять нужно только реально используемые update/delete/list операции; arbitrary get остался deny.
- Два параллельных emulator run временно столкнулись на порту `8080`. Проверка процессов подтвердила test-process contention, а не дефект rules; повторный одиночный запуск прошёл 351/351 и не оставил listener/log process.
- Full Functions compile остаётся RED по девяти pre-existing ошибкам. Сравнение parent/HEAD доказало, что Task 0 их не создавал; их нельзя «исправить» добавлением случайных untracked main-файлов без отдельного provenance audit.
- Независимый review не нашёл новой функциональной регрессии в rules/test isolation, но последующий reproducibility audit открыл P2: `firebase` CLI берётся из глобального окружения. Поэтому Task 0 отмечен как локально функционально зелёный, но не полностью handoff-ready.

---

## 7. Незакрытые замечания, blockers и честные ограничения

### 7.1 P2: Firebase CLI не закреплён

`functions/package.json` запускает команду `firebase`, но `firebase-tools` не присутствует в `devDependencies`. Локальный проход использовал глобальный:

```text
C:\Users\badlo\AppData\Roaming\npm\firebase.ps1
firebase-tools 15.15.0
```

На чистой машине/CI после одного `npm ci --prefix functions` тест может упасть с `firebase: command not found`. Нельзя называть Task 0 полностью handoff-ready, пока это не исправлено и не проверено чистым resolution path.

### 7.2 Общий Functions build красный по pre-existing причинам

Команда:

```powershell
.\functions\node_modules\.bin\tsc.cmd --noEmit --project .\functions\tsconfig.json --pretty false
```

возвращает 9 ошибок, существовавших и в parent:

Отсутствуют шесть modules:

- `content_factory/arena_timing_observability.ts`;
- `admin_monthly_decision_pack.ts`;
- `admin_content_stages.ts`;
- `admin_content_stage_bulk.ts`;
- `admin_content_stage_edits.ts`;
- `content_stage_worker.ts`.

Отсутствуют три exports:

- `adminUpdateArenaConvergenceConfig`;
- `adminGetContentFactoryRolloutMetrics`;
- `adminGetArenaConvergenceStatus`.

`functions/src/index.ts` идентичен в parent и Task 0 HEAD, а перечисленные modules отсутствуют в обоих деревьях. Это не regression Task 0. В сильно грязном основном checkout часть этих файлов существует untracked; нельзя просто копировать их без аудита происхождения.

### 7.3 Канон сохранён Git; исторический риск закрыт и должен перепроверяться

На pre-persistence аудите README + `00`–`08` (десять исходных V2-файлов), новый `HANDOVER.md` и оба плана 2026-07-14 имели статус `??` в основном checkout. В pilot worktree их не было вообще. Риск закрыт отдельным docs-only commit `0b94c974938f0e157dec45b1c4031bd1c89dd90c`, содержащим ровно 14 paths: `AGENTS.md`, 11 Markdown-файлов `docs/v2` и два плана 2026-07-14. Он перенесён в pilot-ветку как `a09f57da2d2442d114202bb3d52bf58abe917bb1`. Следующая сессия всё равно должна подтвердить наличие через команды ниже, а не доверять тексту:

```powershell
git ls-files --error-unmatch AGENTS.md docs/v2/HANDOVER.md docs/v2/README.md docs/v2/00-research-and-skill-audit.md docs/v2/01-current-state-audit.md docs/v2/02-competitor-and-learning-evidence.md docs/v2/03-learning-architecture-and-curriculum.md docs/v2/04-activity-catalog-and-storyboards.md docs/v2/05-stars-progress-and-mastery.md docs/v2/06-runtime-content-admin-and-release.md docs/v2/07-migration-analytics-testing.md docs/v2/08-admin-content-studio-and-mode-authoring.md docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md
git status --short --branch
```

Ожидается: первая команда печатает все 14 paths и имеет exit 0; вторая не показывает эти документы как untracked/modified.

Основной checkout на момент свежего аудита:

- path: `C:\appsprojects\phraseman`;
- branch: `codex/release-integrated-20260715`;
- HEAD после docs-only persistence: `0b94c974938f0e157dec45b1c4031bd1c89dd90c`;
- snapshot 2026-07-15 после docs-only persistence: `git status --porcelain=v1 -uall` показал 673 entries — 135 tracked и 538 untracked; main изменяется параллельно, поэтому это диагностический снимок, а не постоянный счётчик;
- из Task 0 paths пересекается `functions/package.json`, поэтому blind cherry-pick опасен.

Никакие чужие/пользовательские изменения не удалять, не reset-ить и не перезаписывать. Canonical docs уже перенесены отдельным commit; дальнейший V2-код вести в pilot worktree и не собирать в него случайные dirty-main файлы.

### 7.4 Отдельный V2 milestone/workstream не создан

Текущая `.planning/ROADMAP.md` относится к другому milestone. Не заменять её. Для V2 создать отдельный GSD milestone/workstream после сохранения канонических документов.

### 7.5 Reference Evidence Pack отсутствует

Не готовы:

- `docs/v2/reference-evidence/activity-mode-patterns.md`;
- `docs/v2/reference-evidence/phraseman-wireframes.md`;
- evidence ledger;
- competitor screenshots/contact sheets;
- `activity-mode-ui-review.json`;
- owner UI approval.

Это не блокирует contracts, progress reducer и security work, но блокирует production UI фазы 03/05 и Admin UI Task 6–9.

### 7.6 Product defaults ещё не owner decisions

README содержит безопасные defaults для vertical map, видимости 32 titles, tap-to-talk, qualitative pronunciation feedback, Club placement, AI optionality, 6–10 chunks и KPI delayed transfer. Они позволяют писать contracts, но перед UI polish/rollout нужен immutable decision log/registry. Все `HYP-V2-001..008` пока `PRODUCT_HYPOTHESIS / unvalidated`.

### 7.7 Старые документы не помечены superseded

Без banners будущая сессия может ошибочно выбрать 8–16 episodes, 32 отдельные Club missions, hold-to-talk, 90% transcript threshold или старый R10B authoring UI. До массовой работы стоит добавить scope/supersession banners без удаления истории.

---

## 8. Exact next task — Phase 01 / Task 1.1 identity and versioning

### 8.1 Почему именно Task 1.1

Dedicated Content Studio Task 1 использует canonical episode, checkpoint, evidence, delayed-probe, template-ref и voice-governance contracts. По umbrella-плану эти основания создаются в Tasks 1.1–1.4. Начать Content Studio Task 1 раньше означало бы либо broken imports, либо запрещённые shadow/reduced copies. Поэтому точный порядок зависимостей такой:

`Task 1.1 identity/versioning → Task 1.1A DecisionRegistry → Task 1.2 activity/episode/curriculum → Task 1.3 evidence/result → Task 1.4 Functions mirror → dedicated Content Studio Tasks 1–3`.

### 8.2 Файлы точного следующего task

- `modules/learning-v2/contracts/identities.ts`
- `modules/learning-v2/contracts/schema_versions.ts`
- `tests/learning_v2_identity_contract.test.ts`

### 8.3 Test-first порядок Task 1.1

1. Прочитать umbrella Phase 01 / Task 1.1 и identity/version references в specs 06/08.
2. Написать failing tests для допустимых `courseId`, `seasonId`, `episodeId`, `nodeId`, `activityId`, `skillId`, `releaseId`.
3. Зафиксировать, что identity не зависит от текста или локализации.
4. Зафиксировать уникальность `activityId` внутри release.
5. Зафиксировать reject неизвестной schema version.
6. Зафиксировать, что новый release не переименовывает stable `skillId`.
7. Запустить тест и сохранить настоящий RED из-за отсутствующих validators, а не из-за config/import failure.
8. Реализовать pure branded-string validators и schema-version registry без React/Firebase imports.
9. Повторить focused test, `git diff --check` и независимый review.
10. Обновить этот хендовер и только затем переходить к Task 1.1A.

### 8.4 Точная команда Task 1.1 gate

```powershell
npx jest --runTestsByPath tests/learning_v2_identity_contract.test.ts --no-cache --runInBand
```

Ожидаемый RED: tests загружаются, но validators/schema registry отсутствуют.  
Ожидаемый GREEN: suite PASS; documented identity grammar одинаково пригодна для client fixtures, Admin preview и backend tests.

### 8.5 Immediate prerequisite: закрепить Firebase CLI

В pilot worktree выполнить отдельным focused change:

```powershell
Push-Location functions
npm install --save-dev --save-exact firebase-tools@15.15.0
git diff -- package.json package-lock.json
npm ci
.\node_modules\.bin\firebase.cmd --version
npm run test:emulator:v2-authoring-rules
Pop-Location
npx jest --runTestsByPath tests/firestore_rules_security.test.ts --no-cache --runInBand
```

Ожидается: diff содержит только exact devDependency/lock изменения, `npm ci` с нуля восстанавливает dependency tree, local binary печатает `15.15.0`, emulator suite даёт 351/351, static suite — 60/60. Перед изменением проверить текущий `functions/package.json`, потому что в грязном main этот файл имеет несвязанные изменения; работать в pilot worktree. Если `npm ci` падает, reproducibility task остаётся RED и к Task 1.1 переходить нельзя.

### 8.6 Следующие contract tasks до Content Studio

- **1.1A:** immutable all-eight DecisionRegistry body/record/ref/object и shared client/Functions corpus.
- **1.2:** canonical activity, episode, curriculum, checkpoint, independent/delayed-probe and graph contracts.
- **1.3:** attempt, result, evidence, non-assessment, cardinality and delayed materialization contracts.
- **1.4:** thin Functions parser/mirror over the same fixtures and stable issue codes.

Только после GREEN этих задач начинается следующий блок.

### 8.7 Будущий dedicated Content Studio Task 1

Его цель — сделать один одинаковый authoring contract для client/Admin и Functions: immutable hashable Body, separate Record/head/lifecycle/receipts, exact canonical bytes, SHA-256 и stable issue codes, переиспользуя уже созданные canonical runtime types.

Файлы, которые dedicated plan требует создать:

Client/shared:

- `modules/learning-v2/contracts/content_studio.ts`
- `modules/learning-v2/contracts/content_studio_validation.ts`
- `modules/learning-v2/contracts/content_studio_canonical_json.ts`
- `modules/learning-v2/policies/decision_registry.ts`

Functions mirror:

- `functions/src/content_studio/contracts.ts`
- `functions/src/content_studio/canonical_json.ts`
- `functions/src/content_studio/decision_registry.ts`
- `functions/src/content_studio/contracts.test.ts`
- `functions/src/content_studio/canonical_json.test.ts`
- `functions/src/content_studio/decision_registry.test.ts`

Fixtures/root tests:

- `tests/fixtures/learning-v2/content-studio/contract-corpus.json`
- `tests/fixtures/learning-v2/content-studio/hash-golden-vectors.json`
- `tests/fixtures/learning-v2/content-studio/decision-registry.v1.json`
- `tests/learning_v2_content_studio_contract.test.ts`
- `tests/learning_v2_content_studio_canonical_json.test.ts`
- `tests/learning_v2_decision_registry.test.ts`

Test-first порядок будущего Content Studio Task 1:

1. Прочитать dedicated plan Task 1 и `docs/v2/08` sections 6–10.5 полностью.
2. Импортировать уже созданные canonical episode/evidence types из umbrella Tasks 1.2–1.3; нельзя создавать shadow/reduced copies.
3. Написать shared corpus с valid/invalid ModeTemplate, ActivityInstance, EpisodeDraft/Revision, SeasonDraft/Revision, localization projection, delayed probe, preview state/conditions и DecisionRegistry.
4. Написать golden vector canonical bytes/hash и одинаковые ordered issue-code expectations для client и Functions.
5. Запустить tests и сохранить ожидаемый RED; ошибка должна быть из-за отсутствующей реализации, а не broken import/config.
6. Реализовать strict types/parsers и `canonicalJsonV1` в обоих runtime с одинаковым поведением: JCS key ordering, NFC precondition, strict JSON values, 64 lowercase hex SHA-256.
7. Body не содержит собственные hash/object/time/lifecycle/receipt/localization-workflow metadata. Immutable Record не содержит receipt backrefs.
8. DecisionRegistry содержит ровно восемь discriminated decisions, exact map-key/decisionId, validated ranges/ordinals/derived totals и immutable `VersionRef`/Storage object match.
9. Проверить phase/evidence/probe/accessibility invariants и canonical imports, перечисленные в exact plan; не сокращать acceptance ради скорости.
10. Запустить оба набора и сравнить accepted fixture IDs и issue-code arrays.
11. Запустить `git diff --check`, focused type/tests и независимое review.
12. Commit только Task 1 scope с subject `feat: define V2 Content Studio contracts`.

Точная команда его GREEN gate:

```powershell
npx jest --runTestsByPath tests/learning_v2_content_studio_contract.test.ts tests/learning_v2_content_studio_canonical_json.test.ts tests/learning_v2_decision_registry.test.ts --no-cache --runInBand
Push-Location functions
npx jest --runTestsByPath src/content_studio/contracts.test.ts src/content_studio/canonical_json.test.ts src/content_studio/decision_registry.test.ts --no-cache --runInBand
Pop-Location
```

Ожидается: обе suites PASS и сообщают идентичные accepted fixture IDs и ordered issue-code arrays.

Dedicated Task 1 считается завершённым только если:

- клиент и Functions дают одинаковые canonical bytes/hash;
- unknown/omitted fields fail closed;
- issue codes стабильны и отсортированы одинаково;
- ModeTemplate/Episode/Season имеют distinct bodies/records/heads;
- ActivityInstance lifecycle принадлежит Episode, а не создаёт третью lifecycle model;
- localization content отделён от workflow status;
- delayed probe ref hash recomputes и scheduler node не попадает в graph/loops/stars/checkpoint;
- independent probe не находится в ordinary access-required loops;
- stars/voice-turn count не создают mastery/evidence;
- все восемь решений присутствуют и exact hash/object match проходит;
- нет self-hash, receipt backrefs или free-form executable Admin fields;
- fixture corpus реально используется обоими runtime tests;
- хендовер обновлён commit/test evidence и exact Task 2.

---

## 9. То, что не следует делать следующей сессии

- Не начинать рисовать production activities до Reference Evidence Pack и owner review.
- Не генерировать сразу 32 episodes; сначала E1 author-to-device vertical slice, затем E1–E8.
- Не делать Speaking Club отдельной новой course line; это capstone adapter внутри episode graph.
- Не выдавать transcript similarity за acoustic pronunciation evidence.
- Не делать numeric 0–100 pronunciation threshold gate без calibration/fairness receipts.
- Не продавать mastery/checkpoint/performance stars; только отдельный Access Boost ledger.
- Не позволять Admin вводить произвольные policy numbers, JavaScript, renderer/scorer или remote executable code.
- Не создавать второй generation queue/worker рядом с существующим.
- Не связывать release с mutable latest docs; только exact version/hash refs.
- Не помещать receipt IDs обратно в immutable artifact records.
- Не использовать client time как durable delayed evidence.
- Не делать network/AI обязательным для core completion.
- Не удалять Challenges, legacy lessons, current Speaking Club или Personal Plan без Phase 14 decision.
- Не ослаблять Firestore rules/tests, чтобы новый код «прошёл».
- Не запускать broad suites и bulk generators без необходимости; использовать узкие gates.
- Не использовать project OpenAI API для research/content/chat/images/transcription: действует Phraseman Codex firewall.
- Не cherry-pick’ить Task 0 вслепую в грязный main, особенно из-за пересечения `functions/package.json`.
- Не перезаписывать `docs/HANDOVER.md`: он относится к старому Personal Plans rework.
- Не перезаписывать текущую `.planning/ROADMAP.md`: она относится к другому milestone.

---

## 10. Обязательная форма обновления этого хендовера

Перед окончанием каждой V2-сессии следующая сессия должна обновить как минимум:

1. дату и точный текущий stage;
2. цель сессии и выполненный numbered Task;
3. план в трёх видах: mission, phase/task status, exact next step;
4. paths/branch/worktree/HEAD/base/upstream;
5. список изменённых файлов и зачем каждый изменён;
6. RED evidence, GREEN evidence и exact commands;
7. что проверено фактически, что только выведено логически, что не проверено;
8. failed attempts и почему они были отвергнуты;
9. open findings с severity и owner;
10. dirty/untracked/user changes, которые были сохранены;
11. deploy/push/release state;
12. точные первые команды следующей сессии и ожидаемый результат;
13. список документов, решения в которых изменились;
14. новые расхождения со старым каноном;
15. `Находки и предложения` как отдельный раздел в пользовательском отчёте.

Хендовер не считается сильным, если он говорит только «Task N готов», «тесты прошли» или «дальше Task N+1» без commit, paths, commands, counts, blockers и acceptance criteria.

### Шаблон copy/paste для следующей сессии

```text
Продолжай активную цель Phraseman Learning V2. Сначала полностью прочитай AGENTS.md,
docs/v2/HANDOVER.md, docs/v2/README.md и оба плана 2026-07-14. Не меняй грязный main.
Проверь два checkout и сохрани чужие изменения. Текущий код: worktree
C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot, branch codex/learning-v2-pilot,
Определи текущий HEAD через git rev-parse HEAD; обязательная история содержит Task 0
ec8ebed296a8d61e27a8ede1eae9510f8fcbae3a и canonical package a09f57da2d2442d114202bb3d52bf58abe917bb1.
Канонические 14 paths уже tracked. Сначала закрой P2 firebase-tools, затем выполни
umbrella Phase 01 / Task 1.1 строго test-first: identity grammar и schema versions без
React/Firebase. Затем выполняй 1.1A → 1.2 → 1.3 → 1.4 и только после них dedicated
Content Studio Tasks 1–3. Не начинай UI и не удаляй legacy. После каждого GREEN и
независимой проверки обновляй мастер-хендовер всеми файлами, командами, counts,
commit и exact dependency-aware next task.
```

---

## 11. Краткая контрольная точка для быстрого восстановления

Если времени мало, минимально правильное понимание такое:

- цель — единый Learning V2 на 32 episodes, не отдельный voice mini-app;
- 17 families + episode-level checkpoint, six UI shells, one voice shell;
- Rosetta-like context teaches, scripted modes bridge, Speaking Club transfers;
- performance/access/purchased access/evidence физически разделены;
- Admin authoring only over code-owned kernels and immutable exact refs;
- Task 0 security commit существует только локально в отдельном clean worktree;
- 351 emulator и 60 static tests зелёные;
- firebase-tools pin и baseline Functions build остаются открыты;
- все 11 V2 docs, оба плана и AGENTS protocol сохранены docs-only commit и присутствуют в clean pilot worktree;
- exact next implementation — umbrella Phase 01 / Task 1.1 identity and versioning; Content Studio Task 1 идёт только после 1.1A–1.4;
- UI, mass generation, production rollout и legacy retirement сейчас запрещены порядком зависимостей.
## 14.32 — Server-owned scoring policy wiring (2026-07-17)

### Mission (one paragraph)
Orbit V2 continues the approved Learning V2 pilot: keep progress server-authoritative, bind every result to the immutable Season/Episode/Activity/Template/Policy pins, award performance stars only from a trusted evaluator, and preserve the separation between earned access, purchased access boosts, and learning evidence. This section records the completed policy-resolution seam and the exact next executable task; it does not mark Phase 02 complete.

### Full phase/task status

| Phase/task | Status | Evidence / remaining work |
|---|---|---|
| 02.1 pure reducer/gate policy | Completed/provisional | Existing focused policy and adversarial suites remain green. |
| 02.2–02.3 Content Studio + account-scoped local persistence | Completed bounded slices | Existing focused tests green; release/runtime integration remains later. |
| 02.4 server progress event | Partial, hardened | Auth/generation/tombstone binding, canonical scope hash, immutable pin checks, idempotency, evidence/projection transaction and real emulator proof are present. The positive star path is allowed only with a trusted server resolution. |
| 02.4 server score resolver | Partial/provisional | `server_score_resolver.ts` and `server_score_policy_evaluator.ts` now hash-pin result, activity, slot, compatibility key, template and scoring policy; forged client candidate stars are ignored. |
| 02.5 Access Boost purchase | Existing bounded callable slice | Existing adapter/callable/production tests pass; exact Phase 02 emulator/rules inclusion and final gate review remain open. |
| 02.6 rules/emulator gate | Partial | Authoring rules emulator: 1 suite / 425 tests PASS. Progress emulator: 1 suite / 2 tests PASS. Access-boost emulator gate still needs explicit final inclusion in the Phase 02 packet. |
| 03+ runtime, voice modes, Speaking Club, curriculum, Content Studio generator, 32-episode pilot | Not started as implementation gate | Must follow reference-evidence/UI approvals and remain modular/server-delivery compatible. |

### Changes in this task

- Added `functions/src/learning_v2/server_score_policy_evaluator.ts` and its tests.
- The resolver extracts the exact activity and star-slot relationship from the already pinned immutable Episode, verifies the immutable template identity/hash, then requires a code-owned evaluator for the exact scoring policy reference.
- Added the optional `scoringTemplates` + `scoringPolicies` fallback to `firestore_progress_event_store.ts`; an explicit trusted Functions callback still has priority.
- Missing executable policy fails closed with `v2_server_score_policy_missing`; no client-supplied candidate stars, policy ref, or slot metadata can award stars.

### Verification

- Policy evaluator + resolver + progress/store packet: **4 suites / 20 tests PASS** (latest command includes policy evaluator, server resolver, progress event and Firestore store tests).
- Full progress packet: **8 suites / 35 tests PASS**.
- Live Firestore/Storage progress emulator: **1 suite / 2 tests PASS**.
- Authoring rules emulator: **1 suite / 425 tests PASS**.
- Generator DAG slice: **1 suite / 5 tests PASS**.
- Access callable bounded packet: **3 suites / 19 tests PASS**.
- `git diff --check`: PASS (only normal CRLF conversion warnings).
- Full Functions build remains blocked by pre-existing unrelated missing modules/exports; no new errors are attributed to this scorer seam.

### Open blocker / exact next executable task

The decision registry currently stores policy descriptors, not executable scoring formulas. Therefore production positive star awards remain intentionally fail-closed until a reviewed, code-owned evaluator catalog is registered for each pilot scoring policy and covered by an immutable policy-ref integration test. The next task is: create that catalog seam and its RED/GREEN tests, then run the complete Phase 02 access-boost + progress emulator packet. Files: `functions/src/learning_v2/server_score_policy_catalog.ts`, focused tests, and the callable/store wiring only. Acceptance: exact policy hash/version lookup, deterministic score for every pilot result code, unknown policy rejection, no client-field influence, replay stability, and no earned/purchased star leakage into LearningEvidence. Do not begin UI/runtime work or claim Phase 02 complete before this gate.

### Startup commands for the next session

```powershell
Set-Location C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot
Get-Content docs/v2/HANDOVER.md -Tail 180
Push-Location functions
npx jest --config jest.config.js --runTestsByPath src/learning_v2/server_score_policy_evaluator.test.ts src/learning_v2/server_score_resolver.test.ts src/learning_v2/progress_event.test.ts src/learning_v2/firestore_progress_event_store.test.ts --runInBand --no-cache
npm run test:emulator:v2-progress
npm run test:emulator:v2-authoring-rules
Pop-Location
```

No commit, push, deploy, or production OpenAI API use was performed. Preserve all existing dirty/untracked user changes and generated `functions/lib` output.

## 14.33 — Quiz/Arena retirement leak closure (2026-07-18)

### Mission

Закрыть только оставшиеся живые Quiz/Arena-зависимости после утверждённого retirement: убрать сетевые запросы, возвращаемые lifetime-поля, публичные карточные поля, UI и генераторные ожидания, сохранив остальные статистические блоки, generic challenges, исторические ключи/tombstones и account-deletion cleanup. Это maintenance-приложение к Learning V2, а не разрешение на удаление других legacy-функций и не изменение очередности основных V2 фаз.

### Full phase/task status

| Phase/task | Status | Evidence / remaining work |
|---|---|---|
| Learning V2 Phase 01–02 | Unchanged from §14.32 | Эта сессия не меняла V2 identity, progress, access, policy или authoring contracts. |
| Learning V2 Phase 03+ | Not started / unchanged | Runtime/UI/curriculum/release порядок не расширялся. |
| Quiz/Arena live stats/query retirement | Completed, provisional pending fresh review | Полный decommission contract: 1 suite / 11 tests PASS; статические живые совпадения в ограниченном контуре отсутствуют. |
| Public profile and player-card retirement | Completed, provisional pending fresh review | `public_profiles` продолжает синхронизировать слова/фразы/дни; `arena_profiles` больше не читается и не пишется. |
| Stats Insights client/server contract | Completed, provisional pending fresh review | Client 1/4 PASS; Functions insights 1/20 PASS; retired untrusted fields отбрасываются. |
| Product analytics / Content Factory stale expectations | Completed | Registry + activity + Gustav packet: 3 suites / 23 tests PASS; Functions insights + worker packet: 2 suites / 23 tests PASS. |
| Release/deploy/migration | Not performed | По задаче запрещены deploy, push, commit и destructive cleanup; старые Firestore-поля физически не мигрировались. |

### Changed files and purpose

- `app/stats_daily_breakdown.ts`: удалены активный Firestore/Arena history query и dev-only retired totals; исторические daily metric keys оставлены для чтения старого локального состояния.
- `app/lifetime_profile_stats.ts`: удалены Quiz aggregation и Arena profile query/returned fields; остальные lifetime totals сохранены.
- `app/streak_stats.tsx`: удалены только Quiz/Arena lifetime rows и dev chart seeds.
- `app/public_profile_snapshot.ts`: удалены `cardArena*` payload и запись зеркала в `arena_profiles`; текущий stable-link fail-closed wrapper сохранён.
- `components/PlayerProfileModal.tsx`: удалены чтение `arena_profiles`, Arena win-rate/rank/season UI и соответствующее состояние; leaderboard XP, friendship, profile-card и локальные multiplier paths сохранены.
- `app/stats_insights_client.ts`, `functions/src/stats_insights.ts`: lifetime briefing теперь содержит только words/phrases/daysActive; prompt/local copy не упоминают Quiz/Arena.
- `admin/v2/scripts/admin-capabilities.js`: удалены только stale Quiz/Arena capability denylist fragments.
- `tests/quiz_arena_decommission_contract.test.ts`, `tests/gustav_quiz_target_isolation.test.ts`, `tests/activity_365_analytics.test.ts`, `tests/product_analytics_screen_registry.test.ts`, `tests/stats_insights_client_copy.test.ts`, `tests/firebase_cost_controls_contract.test.ts`, `functions/src/stats_insights.test.ts`, `functions/src/content_factory_worker.test.ts`: обновлены focused guards под утверждённый retired contract с сохранением historical storage compatibility.

### RED / GREEN evidence

- RED: `tests/quiz_arena_decommission_contract.test.ts -t "does not query..."` сначала упал на Firestore import/query, затем на `cardArenaWins`.
- RED: `tests/stats_insights_client_copy.test.ts` не компилировался, пока client briefing требовал `quizzes`/`arenaWins`.
- RED: старые registry/worker expectations требовали `/arena_game` и `surface: 'quiz'`, хотя production уже fail-closed.
- GREEN:
  - `npx jest tests/quiz_arena_decommission_contract.test.ts --runInBand` → 1 suite / 11 tests PASS.
  - root stats design packet (`stats_selected_design_contract`, `stats_surface_composition`, `stats_learning_insights`, `stats_primary_metric`, `stats_year_preview_contract`) → 5 suites / 25 tests PASS.
  - `npx jest tests/stats_insights_client_copy.test.ts --runInBand` → 1/4 PASS.
  - `npx jest tests/product_analytics_screen_registry.test.ts tests/gustav_quiz_target_isolation.test.ts tests/activity_365_analytics.test.ts --runInBand` → 3/23 PASS.
  - Functions `npx jest src/stats_insights.test.ts src/content_factory_worker.test.ts --runInBand` → 2/23 PASS; final insights-only rerun → 1/20 PASS.
  - `npx jest tests/streak_stats_practice_balance.test.ts tests/streak_stats_i18n.test.ts --runInBand` → 2/32 PASS.
  - Focused public profile cost contract and PlayerProfileModal close contract → each selected test PASS.
  - `node --check admin/v2/scripts/admin-capabilities.js` and scoped `git diff --check` → PASS (CRLF warnings only).
  - Scoped static `rg` for active queries/returned fields → `NO_ACTIVE_RETIREMENT_MATCHES`.

### Failed checks, residual uncertainty, and preserved state

- Focused TypeScript project no longer reports missing retired Quiz/Arena fields. It still fails on pre-existing unrelated errors in `account_delete_quarantine.ts`, `daily_tasks.ts`, current `streak_stats.tsx` nullable values, and `ActivityHeatmap365.tsx`.
- Full `player_profile_modal_close.test.ts` has one unrelated failure in `app/club_screen.tsx` (expects two `streak: currentUserStreak` occurrences, current file has one); the modal close test itself passes.
- Broad `firebase_cost_controls_contract.test.ts` remains stale in unrelated deleted community/Arena files and admin/App Check expectations; the directly affected public-profile assertion was updated and its selected test passes.
- `startup_cloud_identity_recovery.test.ts` is blocked at compile time by the unrelated `daily_tasks.ts` nullable error.
- Existing stored `cardArena*` fields are not migrated/deleted; the live client no longer writes or reads them. Historical account-deletion paths, rules tombstones, daily metric keys and target storage helpers remain intact.
- Worktree: `C:\appsprojects\phraseman`; branch `codex/release-integrated-20260715`; HEAD `d0df1b05fbb27bee54b486a23b28d77823faae8b`; upstream none; merge-base with `origin/main` was not resolved. The worktree was already heavily dirty; unrelated tracked/untracked user changes were preserved.
- No commit, push, deploy, release, rollback, destructive cleanup, Firestore write, or project OpenAI API use was performed.

### Exact next executable task

Fresh read-only critical review of only the files listed above. Acceptance: confirm no active Quiz/Arena Firestore read/write or returned lifetime field remains; confirm generic challenges, historical deletion/tombstones and non-retired profile/stats behavior remain; rerun the full 11-test decommission contract, the 5-suite stats design packet, the 3-suite registry/activity packet, and the 2-suite Functions packet. Expected result: all deterministic retirement gates PASS; unrelated baseline failures remain explicitly separate. Do not deploy, push, commit, migrate old documents, or broaden cleanup without owner authorization.

### Startup commands

```powershell
Set-Location C:\appsprojects\phraseman
git status --short
npx jest tests/quiz_arena_decommission_contract.test.ts --runInBand
npx jest tests/stats_selected_design_contract.test.ts tests/stats_surface_composition.test.ts tests/stats_learning_insights.test.ts tests/stats_primary_metric.test.ts tests/stats_year_preview_contract.test.ts --runInBand
npx jest tests/product_analytics_screen_registry.test.ts tests/gustav_quiz_target_isolation.test.ts tests/activity_365_analytics.test.ts tests/stats_insights_client_copy.test.ts --runInBand
Push-Location functions
npx jest src/stats_insights.test.ts src/content_factory_worker.test.ts --runInBand
Pop-Location
```

## 14.34 — Economy redesign: Coins/Stars exchange contract (2026-07-20, docs only)

### Mission (one paragraph)

Владелец утвердил новую экономику Phraseman (`docs/plans/2026-07-20-coins-stars-economy-plan.ru.md`): валюта «Осколки» переименована в «Монеты» (миграция 1:1), access stars стали расходуемым кошельком (урок/экзамен открывается один раз явным действием «Открыть за N звёзд», повторы бесплатны), начисление звёзд — per-exercise (3/2/1 по ошибкам, идеальный повтор +1, кап 10/сутки), Access Boost упразднён и заменён серверной односторонней биржей «монеты → звёзды» с динамическим суточным курсом в коридоре 60–100 (±10%/сутки), энергия полностью удалена из обучения. Эта сессия — docs-only: переработан нормативный контракт `docs/v2/05-stars-progress-and-mastery.md`; код, тесты и прочие документы не менялись.

### Full phase/task status

| Phase/task | Status | Evidence / remaining work |
|---|---|---|
| Нормативный V2-контракт экономики (doc 05) | Обновлён | §1–2 (роли ресурсов), §3.4/3.6 (per-exercise начисление, HYP-V2-009), §5.1/5.3/5.5/5.6 (spend-on-unlock, цены HYP-V2-010, миграция), §6 [SUPERSEDED Access Boost] + §6Б (биржа, HYP-V2-011) + §6В (энергия удалена), §7–12 (snapshot, offline, UI, edge cases, тесты, acceptance). |
| HYP-V2-004/005/006 | Частично superseded, не удалены | HYP-V2-004: критерии 3/2/1 пересмотрены в HYP-V2-009; HYP-V2-005: cumulative curve superseded ценами HYP-V2-010 (target 500 сохранён); HYP-V2-006: Access Boost superseded биржей HYP-V2-011; добавлен HYP-V2-012 (кап повторов 10/сутки). DecisionRegistry в doc 08 и реестр гипотез в doc 07 пока НЕ обновлены — отдельная docs-задача. |
| Реализация (сервер, приложение, Admin V2) | Не начата | См. exact next tasks ниже. |
| Learning V2 Phase 01–02 | Unchanged | Эта сессия не меняла identity/progress/evidence код. |

### Changes in this session (docs only)

- `docs/v2/05-stars-progress-and-mastery.md`: экономическая модель переписана под план 2026-07-20; все заменённые части помечены `[SUPERSEDED 2026-07-20]`, текст Access Boost сохранён как историческая норма и источник миграционных инвариантов. Добавлены: §3.6 per-exercise начисление и Duolingo error-flow (shake+вибрация ≤300 мс, без «провала урока»); §5.6 миграция (проекция→кошелёк, Access Boost→биржа с сохранением серверных записей, shards→coins 1:1); §6Б биржа с API-контрактом `getCoinExchangeQuote`/`getCoinExchangeHistory`/`exchangeCoinsForStars`/`adminSetCoinExchangeRate`, серверными инвариантами и cloud paths; §6Б.5 серверная операция unlock; §6В удаление энергии из обучения.
- `docs/v2/HANDOVER.md`: эта запись.

### Verification

- Docs-only сессия: тесты не запускались (изменены только .md файлы). Код, тесты, конфиги, `docs/v2/07` и `docs/v2/08` намеренно не тронуты.

### Contradictions / открытые вопросы для решения владельца

1. Точные цены unlock уроков/экзаменов не зафиксированы ни в плане, ни в doc 05 (ориентир 30/50 при 8 заданиях) — фиксировать после утверждения числа заданий в уроке V2.
2. Минимальная оценка для зачёта урока при открытии следующего — открытый вопрос плана №3; doc 05 сохраняет local minimum 14/15/16/17 как `HYP-V2-005`.
3. Энергия в соревновательных режимах (арена): удалить полностью или оставить локально — открытый вопрос плана №4; doc 05 назначает только «удалена из обучения».
4. Старая cumulative таблица порогов и `evaluateGate` сохранены как superseded; при реализации миграции нужно решение владельца о стартовом балансе кошелька (план предлагает = зафиксированной проекции).
5. Реестр гипотез (doc 07 §0) и DecisionRegistry schema (doc 08 §6.2) ещё ссылаются на HYP-V2-004/005/006 без новых HYP-V2-009–012 — требуется отдельное docs-обновление (в этой сессии не выполнялось, чтобы не трогать другие docs).

### Exact next executable tasks (implementation)

1. **Server exchange engine** (`functions/`): `v2_economy` collections, callables `getCoinExchangeQuote`, `getCoinExchangeHistory`, `exchangeCoinsForStars` (идемпотентность `coin_exchange_{opId}`, transaction), scheduled суточный пересчёт курса (±10%, коридор 60–100, дрейф к базе, audit), `adminSetCoinExchangeRate` с audit log. RED/GREEN: `functions/src/v2_coin_exchange.test.ts`, `v2_coin_exchange_rate_job.test.ts`. Acceptance: односторонность, коридор, идемпотентность, no client-side rate.
2. **Server star wallet + unlock** (`functions/`): `v2_star_wallet`, `v2_star_journal` (per-exercise grants, кап 10/сутки), callable unlock «Открыть за N звёзд» с проверкой условий §5.1. Тесты: `v2_star_unlock.test.ts`, `v2_star_journal.test.ts`.
3. **Shards→Coins migration 1:1**: балансы, ledger, RevenueCat offering/product IDs, UI/локали/аналитика rename; `accessStarsEarned` проекция → стартовый баланс `accessStarsWallet`; Access Boost записи заморозить (grandfathered, без новых).
4. **App exchange screen («Биржа»)**: quote/history UI, обмен по `opId`, обязательный disclaimer «Монеты ускоряют доступ к урокам, но не повышают оценку и не подтверждают знание»; карта с «Открыть за N звёзд» и балансом кошелька.
5. **Admin V2 coin center**: ручной override курса с reason+audit, просмотр истории курса/объёмов; перед изменениями Admin UI прочитать `docs/design/ADMIN_UI_BIBLE.md`.
6. **Reward catalog changes**: обнулить все монетные earn-источники кроме +1 монеты за подтверждённый полезный репорт (таблица §7 плана); серверные дневные капы на монеты удалить, капы только на звёзды.
7. **Asset wiring**: 5 иконок монет (тёмное золото/гравировка/зелёная эмаль) — «wire first, generate second»: static `require()` слоты, обрезка метки «AI生成», webp q~70, VoiceOver/TalkBack тексты.
8. **Docs follow-up**: обновить реестр гипотез в `docs/v2/07` и DecisionRegistry в `docs/v2/08` записями HYP-V2-009–012 с пометками superseded для HYP-V2-004/005/006.

### Startup commands for the next session

```powershell
Set-Location C:\appsprojects\phraseman
git status --short --branch
Get-Content docs/plans/2026-07-20-coins-stars-economy-plan.ru.md
Get-Content docs/v2/05-stars-progress-and-mastery.md   # §1, 3.6, 5.6, 6Б, 6В
Get-Content docs/v2/HANDOVER.md -Tail 90
```

No commit, push, deploy, code change, test run, Firestore write, or OpenAI API use was performed in this docs-only session. All dirty/untracked user changes preserved.

---

## Разделы, перенесённые из codex/learning-v2-pilot (merge 2026-07-21)

> Ниже — секции хендовера из ветки codex/learning-v2-pilot, отсутствовавшие в нашей (более новой экономической ревизии) версии. Сохранены дословно при слиянии.

# PASS: 2 suites, 61/61 tests
```

## 12.21 ORBIT Admin Acceleration — 2026-07-16

User intent: ускорить перенос админки в V2 без разрушения legacy. Запущены две реальные read-only сессии: Sol High `019f6ae1-792f-7440-9a49-233d6714f2f2` (migration audit) и Luna Medium `019f6ae1-94d3-73a1-a733-b18524b2b531` (first-slice inventory). Writer направлен в существующий V2 worktree через Terra Medium `019f6ad2-b4a5-7193-b007-019798331930`.

Verified audit result: fastest safe slice is one lesson-stage Content Studio path only: server capability read, single-stage create, generation/retry, bounded cursor-paginated list, immutable preview, manual approve/reject. Reuse `admin/v2/scripts/admin-core.js`, `admin/v2/scripts/pages/content-generator.js`, `admin/v2/scripts/content-factory/{controller,state,stage-renderers}.js`, `admin/v2/scripts/admin-firebase.js`, `functions/src/admin_content_stages.ts`, `functions/src/content_stage_worker.ts`, and callable exports. Exclude bulk/range, Arena, flashcards, Challenge, release sealing/activation/rollback, runtime consumer migration, and legacy deletion/redirect changes.

Evidence: Admin Content Studio/UI contracts 26 passed; backend-focused suites 108 passed; inspected Admin modules pass `node --check`. Known unrelated baseline remains `tests/admin_v2_migration_coverage.test.ts`: expected 441 legacy buttons, received 400. Do not alter legacy behavior to hide that mismatch. Main checkout `C:\\appsprojects\\phraseman` is dirty and read-only; V2 worktree remains the only writer worktree. No deploy or production write performed.

Exact next executable task: Terra must run the named focused Admin/UI and Functions suites first, add RED only for a real missing contract, implement only the single-stage draft/preview/review seam, run GREEN plus syntax/diff/secret checks, and make one bounded commit or report no-op. After that, Luna verifies and Sol High reviews. Rollback is additive feature-flag/navigation fallback to legacy; no destructive data migration.

## 12.14 — Task 1.2C scheduler/prerequisite hardening (2026-07-16)

Mission: continue the global Orbit V2 plan by closing independently reproduced release-time contract gaps before Task 1.3. This slice remains partial; runtime, stars economy, 32-episode content, voice modes, Speaking Club, Admin Content Studio, rollout, and Phase 14 legacy decision are not complete.

Completed in commit `870e39a04`: delayed scheduler IDs now use one namespace across graph/assessment/loops/stars/checkpoints/delayed probes; checkpoint alternate nodes cannot alias primaries or duplicate another alternate; outcome prerequisites must resolve to a published episode and local objective; locale tags are non-empty; capability keys are non-empty and unique. RED/GREEN adversarial tests cover the changes.

Verification: focused Jest `289/289` PASS; strict focused TypeScript `tsc` PASS; Prettier PASS; `git diff --check` PASS; staged secret scan PASS. Only validation/test files were committed. Handover is intentionally uncommitted; no push/deploy/release performed; legacy behavior preserved.

Independent spec/red-team reviews remain NOT PASS. Open items: exact checkpoint nine-node package coverage, alternate evidence-tuple equivalence, deep locale closure, capability/platform closure, capstone fallback reachability, support-bound enforcement, and required primary accessibility route. Do not mark Task 1.2C complete.

Exact next executable task: add RED tests for checkpoint alternate tuple equivalence and checkpoint package node-count rejection (8/10 nodes), implement minimal validator fixes, run focused Jest/strict tsc/Prettier/diff/secret gates, update this handover, and request fresh independent reviews before Task 1.3.

Startup:

```powershell
Set-Location C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot
git status --short --branch
git log -5 --oneline
npx jest --runTestsByPath tests/learning_v2_episode_contract.test.ts --no-cache --runInBand
```

## 12.42 ORBIT V2 execution update — Phase 02 star/access pure projection slice

### Миссия одним абзацем

Продолжить утверждённый Learning V2 до полного пилота из 32 эпизодов: после canonical episode/evidence/runtime-контрактов построить честный progress/star/access слой, затем voice/runtime, curriculum, Speaking Club, Content Studio delivery, rollout и release gates, сохраняя legacy до отдельного решения Phase 14. Перенос админки выполняется другой сессией; этот worktree не меняет Admin implementation, navigation или generator.

### Статус фаз и задач

| Область                                                                    | Статус                                    | Доказательство / примечание                                                                                           |
| -------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Phase 00–01 identity, DecisionRegistry, episode/evidence/runtime contracts | Частично завершено / bounded slices green | История коммитов и focused suites в предыдущих секциях handover; full V2 acceptance ещё не заявлен                    |
| Delayed probe receipts/runtime and Firestore ownership                     | Завершён bounded pure/runtime slice       | `d59efb9fd` и предыдущие commits; root 6 suites/33 tests, Functions 2 suites/8 tests, emulator 2 suites/6 tests green |
| Phase 02 performance/access stars                                          | Начат; pure projection slice завершён     | `da95faca5`: best-per-slot delta, 8 slots/24 cap, pilot curve, local minima, scoped boost gate semantics              |
| Progress reducer/outbox/server economy/purchase/refund                     | Не начато                                 | Следующий основной workstream                                                                                         |
| Shared activity/voice runtime, P0 modes, Speaking Club/dialogs             | Не начато в этой bounded slice            | Legacy не менялся                                                                                                     |
| 32-episode content/curriculum delivery                                     | Не начато                                 | Contracts существуют, content authoring/delivery ещё впереди                                                          |
| Admin Content Studio transfer/generator                                    | Отдельная сессия владельца                | Не изменять и не включать в этот worktree                                                                             |
| Rollout, analytics, Phase 14 legacy decision                               | Не начато                                 | Требуют предыдущих фаз и gates                                                                                        |

### Что изменено

- `modules/learning-v2/contracts/stars.ts` — pure TypeScript projection: `applyBestPerformanceStars`, `sumBestPerformanceStars`, `cumulativeAccessRequirement`, `localPerformanceMinimum`, `evaluateV2Gate`; purchased access может влиять только на gate после loops/local performance/checkpoint.
- `tests/v2_star_best_semantics.test.ts` — RED/GREEN best-per-slot, positive delta, 8×3 cap and invalid-input cases.
- `tests/v2_gate_curve.test.ts` — published episode 2–32 cumulative curve and chapter minima.
- `tests/v2_gate_access_separation.test.ts` — earned vs earned-plus-boost and proof that boost cannot replace required loops, local performance or checkpoint.
- `docs/v2/HANDOVER.md` — this living handover update; intentionally remains uncommitted.
- Preserved unrelated untracked Admin artifacts: `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`; neither is part of this task.

### RED/GREEN and verification

- RED: before implementation, all three new suites failed because `modules/learning-v2/contracts/stars.ts` did not exist.
- GREEN: `npx jest --runTestsByPath tests/v2_star_best_semantics.test.ts tests/v2_gate_curve.test.ts tests/v2_gate_access_separation.test.ts --no-cache --runInBand` → **3 suites / 9 tests PASS**.
- Strict targeted TypeScript: `npx tsc --noEmit --target ES2020 --module commonjs --moduleResolution node --strict --esModuleInterop --skipLibCheck modules/learning-v2/contracts/stars.ts tests/v2_star_best_semantics.test.ts tests/v2_gate_curve.test.ts tests/v2_gate_access_separation.test.ts` → PASS.
- Commit: `da95faca5` (`feat(v2): add pure star and gate projections`). No push/deploy.
- Full Functions build remains red only on pre-existing unrelated Admin imports/exports documented earlier; no Admin workaround was applied.
- Fresh adversarial review requested from `task12_final_redteam_adjudication`; result must be recorded before treating this bounded slice as fully adjudicated.

### Нормативные инварианты, которые сохранены

`performanceStarsEarned` и derived `accessStarsEarned` не являются `LearningEvidence` или mastery. Access Boost не создаёт evidence, voice claim, checkpoint pass, achievement или league result. Already-open/grandfathered gates remain open. Legacy behavior remains untouched. No client clock, Firestore, UI, Admin or OpenAI API was added.

### Точный следующий исполняемый шаг

**Task 2.1 — RED/GREEN progress projection contract.**

Files to inspect first: `docs/v2/05-stars-progress-and-mastery.md` §§3.4, 5.5, 6.3–7.3, existing `modules/learning-v2/contracts/activity_result.ts`, `modules/learning-v2/contracts/evidence.ts`, and current V2 tests. Then add a pure progress contract (no UI/Firebase) covering stable `starSlotId` best-result replacement, derived access total, monotonic unlocked gates, account-scoped snapshot shape, and exclusion of purchased access from performance/evidence/mastery projections.

Acceptance criteria:

1. hostile RED tests fail before implementation and cover duplicate/replay, lower-score replay, slot identity change, purchased boost leakage, negative/overflow values and already-open gate monotonicity;
2. GREEN implementation is pure, bounded, integer-validated, and has no Admin/legacy deletion or new independent write source for `accessStarsEarned`;
3. focused Jest, strict targeted `tsc`, diff check and fresh adversarial review pass;
4. update this handover with exact counts, commit, findings, and next task before moving to server economy/outbox.

Startup commands for the next session:

```powershell
Set-Location C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot
git status --short --branch
git log -5 --oneline
npx jest --runTestsByPath tests/v2_star_best_semantics.test.ts tests/v2_gate_curve.test.ts tests/v2_gate_access_separation.test.ts --no-cache --runInBand
Get-Content -Raw -Encoding UTF8 docs/v2/05-stars-progress-and-mastery.md
```

## 12.43 Star/access adversarial adjudication and bounded repair

Fresh read-only red-team review completed for the star/access slice. Initial result was `PASS` for the core separation with two P2 specification gaps. The capability-fallback gap is now closed in `198b85f0c` (`fix(v2): require capability fallback for gates`): `GateInput` explicitly carries `capabilityFallbackComplete`, and a purchased boost cannot bypass it. Focused matrix remains **3 suites / 9 tests PASS** plus strict targeted TypeScript PASS.

The second P2 is intentionally not hidden: HYP-V2-006 purchase eligibility, quote TTL, deficit `1..3`, gate/chapter/season caps, double-block recovery impression and server-authoritative spend belong to the next server-economy contract, not this pure evaluator. Until that contract exists, arbitrary `purchasedAccessAppliedToThisGate` must never be wired directly to a client or callable. The partial-progress `sumBestPerformanceStars` behavior (0–8 slots) is retained because progress snapshots may be incomplete; published episode exact-eight validation remains the Episode/Content Studio gate.

Current bounded evidence: `da95faca5` plus `198b85f0c`; no Admin files changed, no deployment/push. The full global objective remains active and this slice is not a Phase 02 completion claim.

## 12.44 Phase 02 Access Boost policy slice

Добавлен отдельный pure-контракт `modules/learning-v2/contracts/access_boost.ts` в коммите `19d7094cc` (`feat(v2): add access boost eligibility policy`). Он не списывает shards и не открывает gate: только проверяет условия, которые quote/purchase transaction обязана повторно проверить на сервере. Проверяются loops, capability fallback, local performance, checkpoint, минимум двух честных блокировок, recovery review impression, server quote, deficit `1..3`, gate/chapter/season caps и полная стоимость по immutable policy.

RED/GREEN: отсутствующий модуль дал подтверждённый RED; после реализации `npx jest --runTestsByPath tests/v2_access_boost_policy.test.ts --no-cache --runInBand` → **1 suite / 10 tests PASS**; strict targeted `tsc` → PASS. `Admin` implementation не изменялась. Adversarial review запрошен отдельно; до его результата slice считается provisional, а не завершением Phase 02.

Точный следующий шаг после review: добавить pure quote-envelope contract (`quoteId`, stable/account binding, release/policy pin, expiry, deficit, cost) и RED/GREEN на stale quote, policy mismatch, owner mismatch и expected-cost mismatch; затем только после этого переходить к Functions transaction adapter. Общий `shardsApplyDelta` не использовать как authority покупки.

## 12.45 Access Boost hardening and quote envelope

Red-team review выявил P1 type-confusion и cumulative-counter gaps в Access Boost policy. Они закрыты в `790007e66` (`fix(v2): harden access boost policy inputs`): все boolean flags проверяются как boolean, counters обязаны сохранять `gate ≤ chapter ≤ season`, policy и итоговая стоимость ограничены safe integers. Focused policy suite теперь **1/12 tests PASS**, strict targeted `tsc` PASS.

Затем создан pure quote-binding контракт в `df3de6986` (`feat(v2): add access quote binding contract`): `validateAccessQuoteForPurchase` проверяет exact quote/owner/season/gate/release/policy/cost binding, arithmetic `deficit × unitPrice`, safe integers и expiry до любого server spend. RED отсутствующего модуля был закрыт GREEN: **1 suite / 7 tests PASS**, strict targeted `tsc` PASS. Quote не резервирует и не списывает shards; это остаётся server transaction responsibility. Admin implementation не менялась.

Открытый bounded risk: quote contract пока pure и не заменяет authoritative Functions transaction, App Check/Auth, idempotency, balance check, Firestore transaction или immutable policy lookup. Следующий исполняемый шаг — RED/GREEN Functions adapter/callable с transaction replay/collision, stale quote, owner/account-generation, insufficient balance, exact policy and single gate receipt; перед ним повторно прочитать §6.2–6.4 и связанные identity/account invariants.

## 12.46 Functions transaction adapter for Access Boost

В `808f062ee` добавлен `functions/src/learning_v2_access_adapter.ts` и его focused test. Адаптер выполняет pure repository transaction: проверяет operation identity/fingerprint/account generation, загружает authoritative quote, gate и account, повторно валидирует quote и HYP-V2-006 policy, проверяет баланс, атомарно обновляет shards и gate counters, создаёт receipt/operation и возвращает тот же receipt при replay. Несовпадение fingerprint, owner/release/policy/generation, stale quote и insufficient balance отклоняются до записи. Это Functions-domain adapter, не Admin UI и не общий `shardsApplyDelta`.

Параллельно закрыты P2 quote findings в `access_quote.ts`: forged deficit `>3`, отрицательное время, whitespace-only IDs и `null` runtime input теперь fail-closed. Evidence: `npm test -- --runInBand src/learning_v2_access_adapter.test.ts` → **1 suite / 4 tests PASS**; root quote+policy matrix → **2 suites / 20 tests PASS**; targeted strict TypeScript для adapter и pure quote/policy → PASS. No deploy/push.

Ограничение: callable export, Auth/App Check, real Firestore emulator, immutable DecisionRegistry lookup and refund operation ещё не сделаны. Следующий exact task — RED/GREEN callable wrapper + Firestore emulator transaction tests, затем independent adversarial review; Admin transfer remains owned by the other session.

Дополнительный repair `3692e7b72` привязал `request.opId` к server operation id до чтения денежных данных. После исправления adapter matrix: **1 suite / 5 tests PASS**, targeted strict TypeScript PASS. Это закрывает возможность повторно использовать один transaction envelope с другим operation id.

## 12.47 Callable boundary and adversarial adapter repairs

Свежий adversarial review адаптера нашёл два P1 и один P2. Они закрыты в `14385d965` (`feat(v2): add access callable boundary and hardening`):

- уже открытый gate теперь отклоняется до списания (`access_gate_already_unlocked`);
- authoritative `account.shards` и `balanceAfter` обязаны быть safe non-negative integers;
- malformed stable identity и отрицательное server time fail-closed;
- добавлен `functions/src/learning_v2_access_callable.ts` с RED/GREEN-нормализацией входа и точным auth UID binding; production export ещё не подключён, пока не выбран immutable policy registry read path.

Evidence: Functions matrix `2 suites / 13 tests PASS` (`learning_v2_access_adapter`, `learning_v2_access_callable`), strict targeted TypeScript PASS. Admin implementation не менялась. Следующий шаг: подключить callable к реальному Firestore repository и immutable `DecisionRegistry` policy document, затем emulator-тесты concurrent purchase/replay/insufficient balance/stale quote.

## 12.48 Firestore repository seam and strict callable numbers

В `78eadd2a2` добавлен whitelisted Firestore seam: `firestoreV2AccessPath` разрешает только V2 operations/quotes/gates/ledger и `users/{stableId}`, а `makeFirestoreV2AccessRepository` адаптирует настоящий Firestore transaction к pure adapter. Callable normalizer больше не приводит строки/boolean к числам: `accountGeneration` и `expectedCostShards` принимаются только как safe number. После этого Functions matrix: **2 suites / 15 tests PASS**, strict targeted TypeScript PASS.

Открыто только подключение к immutable DecisionRegistry и реальный callable export/emulator; Admin transfer по-прежнему принадлежит другой сессии.

## 12.49 Immutable Access Boost policy projection

Коммит `bee4423cb` добавил `accessBoostPolicyFromRegistry` и focused test. Цена, gate/chapter/season caps, eligible deficit, recovery impression и quote TTL теперь извлекаются из exact `HYP-V2-006` immutable registry body/ref; version/hash binding проверяется до использования. Fixture-based RED/GREEN: **1 suite / 2 tests PASS**, strict TypeScript (ES2022) PASS. Это устраняет риск скрытой числовой policy в callable; Firestore resolver ещё должен загрузить и валидировать этот exact artifact без mutable `latest`.

## 12.50 Server pinned DecisionRegistry resolver

Коммит `9ee60d374` добавил `functions/src/learning_v2_decision_registry_resolver.ts`. Resolver получает только exact `{id, version, contentHash}`, строит content-addressed object path `content-studio/decision-registries/<sha256(id)>/v<version>/<hash>.json`, загружает artifact через injected storage seam, прогоняет общий strict `resolveDecisionRegistry`, сверяет body/record/ref и возвращает Access Boost policy. Mutable `latest`, hash mismatch, malformed artifact и missing object fail-closed.

Evidence: **1 suite / 2 tests PASS**, strict targeted TypeScript (ES2022) PASS. Adversarial review запрошен. Следующий шаг — связать этот resolver с published season/gate record и callable, затем emulator transaction tests; Admin transfer остаётся в другой сессии.

## 12.51 Firestore emulator proof for Access Boost transaction

Коммит `f74d8ff24` добавил `functions/src/content_studio/emulator/v2_access_purchase_runtime.emulator.test.ts` и адаптировал Firestore seam к server/client transaction APIs (`create/update` для Admin SDK, `set` fallback для rules-unit Firestore). Реальный Firestore emulator теперь доказывает:

- первый purchase атомарно списывает 6 shards, открывает только scoped gate и создаёт ledger receipt;
- повтор того же `opId` возвращает тот же receipt и не списывает повторно;
- insufficient balance не пишет gate, receipt, operation или новый баланс.

Evidence: emulator command на `demo-phraseman-rules` → **1 suite / 2 tests PASS**; strict targeted TypeScript ES2022 → PASS. Это первый реальный persistence gate для Phase 02; production callable export и concurrent transaction race test всё ещё впереди.

## 12.52 Concurrent Firestore purchase proof

Коммит `a24c6bb98` добавил concurrent emulator case. Два одинаковых transaction вызова с одним `opId` дают ровно один non-replayed purchase и один replay; итоговый balance уменьшается один раз. Обновлённая команда emulator: **1 suite / 3 tests PASS** (persistence/replay, insufficient balance with no partial writes, concurrent one-spend). Production callable и immutable registry resolver ещё не wired into deployed export.

## 12.53 Path-safety and user-scoped ledger repair

Fresh adversarial review нашёл P1/P2 в Firestore seam: прямой adapter мог пропустить `/`, пустые или malformed path segments, а ledger/gate были top-level вместо нормативных `users/{stableUid}/v2_access_ledger/{opId}` и `users/{stableUid}/v2_gate_receipts/{season__gate}`. Коммит `dea426be4` закрывает оба пункта: whitelist теперь проверяет каждый segment, operation/gate/ledger стали user-scoped, quote остаётся отдельным server collection, emulator seed/assertions обновлены.

Resolver errors также нормализованы: missing download → `artifact_unavailable`, invalid JSON/registry → `artifact_invalid`, malformed ref → `ref_invalid`. Evidence: Firestore emulator **1 suite / 3 tests PASS**, strict targeted TypeScript PASS. Production callable export и policy loading из published gate record остаются следующим шагом.

После path-safety repair unit fixtures были выровнены на user-scoped gate key в `0abddeac9`. Adapter + resolver Functions matrix теперь **2 suites / 8 tests PASS**, strict TypeScript PASS; emulator остаётся **1 suite / 3 tests PASS**. В worktree намеренно остаются только handover и два чужих untracked Admin-аудит артефакта.

## 12.54 Callable orchestration boundary

Коммит `1fd5cbe32` добавил `executeV2AccessPurchaseCallable` и `createV2AccessPurchaseCallable`: auth UID проверяется до server time/policy resolution; strict normalized input хэшируется server-side; policy приходит только через injected resolver; затем вызывается transaction adapter и возвращается authoritative receipt/replay. Это orchestration seam, а не клиентская write-команда и не общий shards delta.

Evidence: Functions callable suite **1 suite / 10 tests PASS**, targeted strict TypeScript PASS. Factory ещё не экспортирована как production function, потому что ей требуется wired resolver опубликованного season/gate registry ref; это следующий integration task, не завершение Phase 02.

## 12.28 ORBIT V2 execution update — evidence materialization hardening

**Scope boundary:** Admin transfer is owned by a separate session. This slice changed no Admin files, no Functions, no runtime UI, and no deployment state.

**Completed commit:** `bce395fe7` (`fix(v2): harden evidence materialization validation`) on `codex/learning-v2-pilot` in `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`.

**What changed:** `modules/learning-v2/contracts/evidence.ts` now validates exact body keys, tuple identity, phase/provenance equality, support bounds, construct-to-route compatibility, strict runtime evidence hashes, full canonical source-attempt equality, server-attested delayed timing receipts, and terminal non-assessment reason/receipt branches. Materialization now validates the body before recomputing its canonical hash. `tests/learning_v2_evidence_materialization_contract.test.ts` adds hostile route/hash/tamper/system-receipt cases.

**RED/GREEN and verification:** focused evidence suite is `4/4`; combined attempt-hash, attempt-cardinality, delayed-probe, and evidence suites are `4 suites / 24 tests`, all green. Strict focused TypeScript compilation, Prettier, and `git diff --check` passed. The only remaining worktree changes are the intentionally uncommitted handover plus separate historical Admin manifest/RED test; they must not be staged here.

**Reviewer status:** the previous independent review’s P1 findings for evidence validation are addressed in this bounded slice. A fresh independent review is still required before declaring Task 1.3 complete.

**Exact next executable task:** run a fresh spec/adversarial review of `bce395fe7`; if PASS, implement the next pure Task 1.3 contract in `modules/learning-v2/contracts/delayed_probe.ts` and its focused test only. Acceptance: terminal delayed receipt branches are exhaustive, candidate-to-resolution cardinality and source binding are exact, protocol rejection cannot emit learning refs, and the four focused suites remain green. Do not touch Admin or start runtime/Functions until evidence and delayed terminal contracts are independently adjudicated.

## 12.29 ORBIT V2 execution update — evidence adjudication follow-ups and envelope gate

The independent review of `bce395fe7` was **NOT PASS** and identified exact ref-schema validation and irrelevant receipt-field leakage. Those findings were closed in `18af9f405` (`fix(v2): close evidence ref schema branches`): evidence/non-assessment refs now reject unknown keys and require strict IDs, tuple keys, hashes, and canonical attempt refs; terminal non-assessment branches reject receipt fields belonging to another branch.

The next pure delayed slice is committed as `2d99f767e` (`fix(v2): harden delayed terminal resolution`). Client candidates now reject terminal/server-owned fields, invalid tuple keys, duplicate tuple keys, and terminal dispositions; resolution is exhaustive for inside-window, outside-window, system-failure, and preserves `no_record` without creating a learning result. Invalid windows fail closed. Focused evidence + delayed suites: `2/2 suites, 6/6 tests`; strict TypeScript and Prettier passed.

Envelope integrity follow-up is committed as `dc210c63a` (`fix(v2): validate attempt envelope materialization refs`). `validateAttemptEventEnvelope` now rejects unknown envelope/ref keys, malformed refs, mismatched source attempts, duplicate tuple keys, and invalid materialization basis kinds; builder applies the same ref/basis gate. The same focused suites remain green.

**Open review limitations:** receipt references are still opaque non-empty IDs because the current pure contract has no receipt-body/hash input; binding them to immutable receipt bodies belongs to the next runtime/Functions contract and must not be silently claimed here. Provenance context/prompt binding to published Episode declarations also remains a runtime/content-resolution concern, not proven by these pure validators.

**Exact next executable task:** obtain fresh independent spec/adversarial review of commits `18af9f405`, `2d99f767e`, and `dc210c63a` together. If no P1/P2 remains in the pure contract boundary, implement the server-owned delayed timing/failure receipt contract with exact resolution cardinality, candidate hash binding, protocol-rejection/no-learning-ref invariant, and receipt-body hash validation. Admin remains a separate session and must not be edited here.

## 12.30 ORBIT V2 execution update — receipt contracts and envelope basis binding

The fresh adversarial review found one P1 in the envelope validator: basis kind was not bound to graph versus delayed attempt surface. This is closed in `26e86946b` (`fix(v2): bind envelope basis to attempt surface`); validator now rejects graph attempts with delayed basis, delayed attempts with graph basis, and graph basis refs that differ from envelope attempt ref. Ref and basis allow-list checks were tightened as part of the same bounded fix.

Server-owned receipt contracts are now added in `6e801d21e` (`feat(v2): add delayed receipt hash contracts`), with `modules/learning-v2/contracts/delayed_receipts.ts` and focused tests. Timing and failure receipt bodies have canonical content-hash refs, strict body/ref schemas, exact candidate tuple cardinality, immutable attempt/assignment/launch/probe references, inside/outside/system terminal resolution branches, and protocol rejection with no resolution table. Focused receipt + evidence suites: `2 suites / 6 tests`, strict TypeScript and Prettier pass.

**Known limitations:** the receipt contract validates ref shape and canonical body hash but does not yet resolve assignment/launch/probe bodies against published Episode content or account-generation state. That belongs to the runtime/Functions integration phase. Delayed candidate validator still needs alignment with the full canonical `attemptBody + attemptRef` candidate envelope and expected declaration set; do not claim delayed runtime complete.

**Exact next executable task:** update delayed candidate validation to the normative `V2DelayedAttemptCandidate{attemptBody,attemptRef}` shape, bind its delayed candidate tuples to the server receipt’s exact declared set, and add RED/GREEN tests for unknown tuple, candidate hash mismatch, and one-to-one resolution. Then request fresh independent spec/adversarial review across all Task 1.3 pure contracts. Admin remains separate and untouched.

## 12.31 ORBIT V2 execution update — canonical delayed candidate envelope

The delayed candidate slice is now committed as `c71814c1b` (`fix(v2): align delayed candidates with canonical attempts`). `validateDelayedAttemptCandidate` accepts only the normative `{schemaVersion, attemptBody, attemptRef}` envelope, sanitizes and verifies the scheduled-delayed attempt body/ref hash, derives canonical tuple keys from exact candidate bindings, enforces zero hints and unique candidate tuples, and can compare against an expected server declaration set. Terminal resolution derives disposition from candidate outcome and preserves `no_record`; it cannot accept client terminal receipts or arbitrary tuple strings.

RED/GREEN coverage now includes canonical candidate shape, forbidden receipt fields, attempt-hash mismatch, unknown expected tuple, and outside-window mapping. Combined pure Task 1.3 suites: `5 suites / 27 tests`, all green; strict TypeScript, Prettier, and diff-check passed.

**Exact next executable task:** request fresh independent spec/adversarial review of `18af9f405`, `2d99f767e`, `dc210c63a`, `26e86946b`, `6e801d21e`, and `c71814c1b`. If PASS, begin the runtime/Functions delayed receipt integration: validate assignment/launch/probe/account-generation bindings against published content, create immutable timing/failure receipt records, and ensure finalized envelopes can only materialize refs from exact receipt resolutions. Admin remains a separate session.

## 12.32 ORBIT V2 execution update — receipt semantics and server adjudicator

The latest adversarial review found P1 receipt semantic gaps: timing receipts could claim the wrong terminal disposition for their window, system failure receipts could contain assessed outcomes, and validators did not bind receipt attempts to the candidate ref. These are closed in `adbbf37ed` (`fix(v2): bind delayed receipt semantics`): exact ref schemas now use exact key counts, expected tuple keys must be unique/canonical, receipt attempt refs must equal the candidate attempt ref, and inside/outside/system terminal dispositions are enforced.

The first server-owned pure adjudicator is committed as `9e5ae36a3` (`feat(v2): add delayed runtime adjudicator`). `adjudicateDelayedCandidate` validates the canonical delayed candidate against the expected declaration set, emits hash-pinned timing receipts for inside/outside windows, emits system-failure receipts with non-skipped system resolutions, and emits protocol-rejection receipts with no resolution table. Focused receipt/runtime suites: `2 suites / 4 tests`; strict TypeScript and Prettier passed.

**Boundary:** this is a pure server decision module, not yet a deployed callable or Firestore transaction. Assignment/launch/probe/account-generation/content binding still must be performed by the Functions integration layer before calling this adjudicator.

**Exact next executable task:** request fresh spec/adversarial review of `adbbf37ed` and `9e5ae36a3`, then add a Functions-side adapter with transaction/idempotency semantics: load immutable assignment/launch/probe records, compare canonical refs and account generation, call the adjudicator exactly once per candidate, persist immutable receipt body/ref, and reject replay/mismatch without learning refs. Admin remains separate.

## 12.33 ORBIT V2 execution update — Functions delayed receipt adapter

Functions adapter is committed as `b3a99770a` (`feat(v2): add functions delayed receipt adapter`) in `functions/src/learning_v2_delayed_adapter.ts`. It uses a transaction-shaped repository interface to load immutable assignment/launch records, compare stable identity/account generation/canonical refs/probe refs, select system or protocol failure on missing/mismatch, call the pure adjudicator, persist the immutable receipt and idempotency operation atomically, replay the same fingerprint safely, and reject an operation replay with a different fingerprint.

Focused adapter tests: `3/3 PASS`. Targeted Functions TypeScript compilation of the adapter: PASS. Full Functions build remains red on pre-existing unrelated Admin imports/exports (`arena_timing_observability`, `admin_monthly_decision_pack`, `admin_content_stages`, etc.); no Admin files were changed to mask that failure. Generated `functions/lib/functions` and `functions/lib/modules` output was removed and not committed.

**Boundary:** adapter is not yet exported as a callable from `functions/src/index.ts`, and Firestore production collection/security-rule/index wiring is still pending. This is intentional until the pure/runtime review passes.

**Exact next executable task:** fresh independent review of `adbbf37ed`, `9e5ae36a3`, and `b3a99770a`; then wire the adapter to the real callable with auth/account-generation checks, Firestore transaction implementation, collection paths, security rules, and emulator tests. Admin transfer remains another session.

## 12.34 ORBIT V2 execution update — callable and server-window wiring

`f7b30f272` (`feat(v2): expose delayed receipt callable`) adds `functions/src/learning_v2_delayed_callable.ts`, exports `finalizeLearningV2DelayedCandidate` from `functions/src/index.ts`, and adds callable input tests. The callable requires auth, binds `stableId` to the authenticated UID, computes the idempotency fingerprint server-side, uses server time for `acceptedAtServer`/window classification, and maps the transaction adapter to Firestore collection paths. The adapter now derives inside/outside/system/launch-expired decisions from immutable assignment/launch window data when `nowMs` is present; caller-provided timing decisions are not trusted in that path.

Targeted Functions tests: `2 suites / 6 tests`, all green. Targeted strict TypeScript for callable/adapter: PASS. Full Functions build remains blocked by pre-existing missing Admin imports/exports and was not “fixed” by changing Admin code.

**Remaining production gates:** Firestore rules/indexes for `learning_v2_assignments`, `learning_v2_launches`, receipt collections and operation documents; emulator transaction/replay tests; callable deployment smoke test; assignment body/content hash and account-generation resolver integration. These are now the next runtime phase, not complete claims.

**Exact next executable task:** independent adversarial review of `adbbf37ed`, `9e5ae36a3`, `b3a99770a`, and `f7b30f272`; then add the narrow Firestore security/rules contract and emulator-like transaction tests, preserving legacy paths. Admin remains a different session.

## 12.35 ORBIT V2 execution update — Firestore ownership gate and fail-closed binding

Review residual P2s were closed in `c5718eb19` (`fix(v2): fail closed delayed binding and rules`). The Functions adapter now validates operation/fingerprint/stable/account identity before constructing an idempotency key and fails closed when the immutable assignment binding is unavailable instead of trusting caller-supplied expected tuple keys.

`firestore.rules` now has explicit deny-only blocks for `learning_v2_assignments`, `learning_v2_launches`, `learning_v2_timing_receipts`, `learning_v2_failure_receipts`, and `learning_v2_receipt_operations`; clients must use the callable and Admin SDK writes remain server-side. Static rules contract: `6/6 PASS`. Functions adapter + callable tests: `2 suites / 6 tests PASS`; targeted strict TypeScript and diff-check pass.

**Remaining runtime gates:** real Firestore emulator transaction tests, production assignment/content-hash resolver, composite indexes if query paths require them, and deployment smoke test. Full Functions build remains independently red on pre-existing Admin imports/exports; no Admin changes were made.

**Exact next executable task:** add emulator-backed (or repository-equivalent concurrency) tests for two simultaneous finalizations, receipt-create collision, replay after receipt persistence, and protocol mismatch; then perform fresh adversarial review of `c5718eb19` and callable wiring. Admin remains a separate session.

## 12.36 ORBIT V2 execution update — transaction collision/replay coverage

`6ba9998aa` (`test(v2): cover delayed transaction collisions`) adds adapter concurrency contracts: two simultaneous finalizations cannot duplicate a receipt, the transaction collision is surfaced for the non-retrying fake repository, and a completed receipt remains replayable. Combined callable/adapter tests: `2 suites / 8 tests PASS`; targeted strict TypeScript passes.

This harness deliberately models the repository boundary; production Firestore transaction retry behavior still requires emulator verification. No Admin files were changed.

**Exact next executable task:** run the real Firestore emulator rules/transaction suite (or add the project’s existing emulator harness) for assignment/launch ownership, receipt immutability, operation replay, concurrent finalization and mismatch rejection. Then request fresh adversarial review of `c5718eb19` and `6ba9998aa` before moving to stars/access and runtime learning projection.

## 12.37 ORBIT V2 execution update — Firestore emulator ownership proof

`16e051741` (`test(v2): verify delayed firestore ownership`) adds an emulator-backed rules test for all five delayed collections. Authenticated client get/list/create operations are denied for assignments, launches, timing receipts, failure receipts, and receipt operations. Command executed successfully:

`npx firebase emulators:exec --config ../firebase.json --only firestore --project demo-phraseman-rules --log-verbosity QUIET "npx jest --config jest.emulator.config.js --runTestsByPath src/content_studio/emulator/v2_delayed_rules.emulator.test.ts --no-cache --runInBand"`

Result: `1 suite / 5 tests PASS`; Firestore emulator started and shut down cleanly. Permission-denied warnings are expected evidence for the negative assertions.

**Remaining emulator/runtime gap:** this test proves direct client ownership denial only. It does not yet seed Admin SDK assignment/launch documents or invoke the callable against the emulator for transaction/replay/receipt persistence. Those are the next runtime tests; no Admin implementation was changed.

**Exact next executable task:** build an emulator-backed callable smoke harness that seeds immutable assignment/launch records with Admin SDK, invokes `finalizeLearningV2DelayedCandidate` twice, asserts one receipt and replay, checks mismatch rejection and receipt immutability, then run a fresh adversarial review. Admin remains another session.

## 12.38 ORBIT V2 execution update — Firestore transaction persistence

`7e23202db` (`test(v2): verify delayed firestore persistence`) adds an emulator-backed transaction test using rules-disabled server context to seed immutable assignment/launch records, run the actual `DelayedReceiptRepository` against Firestore transactions, finalize twice, verify first-write/replay behavior, and inspect the persisted timing receipt content hash.

Command and result: `firebase emulators:exec` with Firestore and the focused Jest path completed successfully; `1 suite / 1 test PASS`. Combined delayed rules + persistence emulator evidence is now `2 suites / 6 tests PASS` across the two emulator commands. This is persistence/adapter proof; the deployed callable network path still requires a Functions emulator build that is currently blocked by unrelated missing Admin source modules.

**Remaining runtime gates:** callable network smoke, assignment/probe content-hash resolver, receipt immutability update rejection, concurrent Firestore transaction retry, and release integration. No Admin implementation was changed.

**Exact next executable task:** extend the emulator persistence test with receipt update rejection, mismatched assignment/probe rejection, and concurrent finalization; then run fresh adversarial review before starting stars/access projection. Admin remains a separate session.

## 12.39 ORBIT V2 execution update — emulator mismatch and concurrency

`459cfd43b` (`test(v2): cover emulator mismatch and concurrency`) extends the real Firestore emulator persistence test. It now asserts a probe content-hash mismatch produces a protocol-rejection receipt, two concurrent finalizations of the same operation converge through Firestore transaction retry to one non-replayed result plus one replay, and only one concurrent timing receipt exists.

Emulator command completed successfully: `1 suite / 1 test PASS` (the test contains seed, replay, mismatch, concurrency and receipt persistence assertions). Rules ownership emulator remains `1 suite / 5 tests PASS`.

**Remaining runtime gates:** callable network smoke, explicit client update/delete immutability assertions for receipts, assignment/probe content-hash resolver against published Episode content, and release integration. Admin remains another session.

**Exact next executable task:** add authenticated emulator assertions that receipt update/delete and operation reads/writes fail, then run the full bounded V2 contract + Functions + emulator matrix and request fresh adversarial review before beginning stars/access projection.

## 12.40 ORBIT V2 execution update — Firestore immutability rules

`d59efb9fd` (`test(v2): prove delayed firestore immutability`) extends the emulator rules test from read/list/create to update/delete for every delayed server-owned collection. The command completed successfully with `1 suite / 5 tests PASS`; permission-denied warnings are expected negative evidence. The runtime persistence emulator remains green with seed, replay, mismatch, concurrency, and hash assertions.

**Exact next executable task:** run the bounded matrix (pure contracts, Functions adapter/callable, rules static contract, rules emulator, persistence emulator), capture counts, and request a fresh adversarial review of the complete delayed runtime slice before moving to stars/access projection. Admin remains separate.

## 12.41 ORBIT V2 execution update — bounded delayed runtime matrix

Bounded matrix completed on current HEAD:

- root pure/rules contracts: `6 suites / 33 tests PASS`;
- Functions adapter/callable: `2 suites / 8 tests PASS`;
- Firestore emulator rules + persistence: `2 suites / 6 tests PASS`.

The combined emulator command used the real Firestore emulator and completed successfully. No Admin files were changed. This proves the delayed runtime boundary (canonical candidate → server adjudication → transaction persistence/replay → client-denied collections) but does not prove callable network deployment or content resolver integration.

**Exact next executable task:** request fresh adversarial/spec review of the complete delayed slice and then begin the next approved V2 phase: stars/access projection contract, ensuring delayed/system/protocol branches cannot award mastery or durable stars and legacy reward paths remain intact.

## 12.26 ORBIT V2 execution update — Task 1.3 attempt boundary

Admin transfer is explicitly out of scope for this session and remains owned by a separate session. The V2 worktree is `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`, branch `codex/learning-v2-pilot`, HEAD `de291288f` (`fix(v2): harden canonical attempt body`). Main checkout remains untouched.

Task 1.3 bounded slice completed in commit `de291288f`. Only `modules/learning-v2/contracts/attempt.ts` and `tests/learning_v2_attempt_hash_chain.test.ts` changed in that commit. It adds fail-closed rejection of post-hash fields (`learningEvidenceRefs`, `learningNonAssessmentRefs`, `attemptBodyHash`, `canonicalAttemptRef`), typed attempt outcome/evidence/provenance/input binding, graph/delayed discriminated surfaces, and canonical body/ref conformance using the exact canonical body hash.

Verification: focused Jest `3 suites / 8 tests passed`; strict ES2022 TypeScript passed; Prettier check passed; `git diff --check` passed. The working tree still intentionally contains only the pre-existing dirty `docs/v2/HANDOVER.md` plus untracked Admin audit artifacts; do not stage those Admin files.

Task 1.3 is still **partial**, not complete. Remaining pure-contract work: strengthen graph disposition enum/duplicate/cardinality and provenance semantics; implement typed evidence/result bodies and non-hashed event envelope; separate delayed client candidate from immutable server terminal receipt with exhaustive validation, protocol rejection, exact 1:1 resolution and materialization refs. Runtime, Functions, Admin and deployment remain not started in this session.

Exact next executable task: add RED tests for graph disposition/provenance/cardinality and delayed terminal receipt separation, then implement only the pure contract modules/tests, run focused Jest, strict ES2022 `tsc`, Prettier, and diff-check, obtain independent spec/adversarial review, and update this handover before the next bounded commit.

## 12.27 ORBIT V2 execution update — Task 1.3 delayed/graph separation

Bounded commit `c515d4fd7` (`fix(v2): separate delayed attempt candidates`) is complete. Only `modules/learning-v2/contracts/attempt.ts` and `tests/learning_v2_attempt_hash_chain.test.ts` changed. Delayed attempts now have a separate typed `V2DelayedAttemptEventBody` with client-only candidates; graph attempts retain tuple dispositions. Delayed server-owned fields and terminal dispositions are rejected, graph/delayed provenance phases are checked, and operation IDs/hint counts receive fail-closed validation.

Verification: focused Jest `3 suites / 11 tests passed`; strict ES2022 TypeScript, Prettier, and `git diff --check` passed. Admin/runtime/Functions remain untouched. Dirty handover and untracked Admin audit artifacts remain intentionally outside commits.

This slice is still provisional pending independent review. Task 1.3 remains partial: graph tuple declaration semantics, typed evidence/result bodies, non-hashed event envelope, delayed immutable terminal receipt, exact 1:1 resolution/materialization, and full exact-body conformance are still open. Do not start runtime, Functions, Admin implementation, or deployment until those pure contracts pass independent review.

Independent Luna review: **NOT PASS**. The surface/phase split is accepted, but a P1 remains: delayed candidates lack canonical learning-tuple identity/binding, so exhaustive candidate-to-declaration and later 1:1 resolution cannot be proven. Graph disposition runtime shape/cardinality/uniqueness and nested forbidden-field rejection are also open (P2/P1 boundary-hardening). Exact next task is the bounded tuple-binding and recursive fail-closed validation slice, followed by fresh independent review.

Bounded commit `17bfd8d7f` (`fix(v2): bind delayed candidates to evidence tuples`) implements that next slice. It adds canonical delayed candidate tuple binding, strict tuple/disposition validation with duplicate/cardinality rejection, and recursive rejection of nested learning refs/self-hash fields. Focused verification remains green at `3 suites / 14 tests`, with strict ES2022 TypeScript, Prettier, and diff-check passing. Independent review is pending; Task 1.3 remains partial until that gate and the remaining evidence/result/receipt contracts are closed.

Independent Luna review: **NOT PASS**. The binding and graph-shape gaps are closed, but delayed candidate IDs/tuple bindings are not yet unique (P1). Direct-call hardening for `validateGraphTupleDispositions`, nested delayed server-owned fields, and deep immutability remain P2. Exact next task: reject duplicate delayed IDs/tuple keys and harden the direct graph validator with RED/GREEN tests.

Bounded commit `91a4c4dd2` (`fix(v2): harden attempt tuple uniqueness`) is complete. It rejects duplicate delayed candidate IDs and tuple keys, makes direct graph disposition validation return fail-closed results for malformed/duplicate input, and recursively blocks delayed server-owned fields. Focused verification: `3 suites / 17 tests`, strict ES2022 TypeScript, Prettier, and diff-check all pass. Independent review is pending; Task 1.3 remains partial.

Independent Luna review: **NOT PASS**, but no P1 remains. Remaining P2: `validateGraphTupleDispositions` accepts arbitrary result codes and allows `skipped_by_learner` reason on non-`SKIPPED` outcomes. Exact next task is to close these allowlist/semantic combinations with RED/GREEN; deep immutability and runtime sanitization inside `buildCanonicalAttemptRef` remain explicitly tracked omissions.

Bounded commit `81a4a2c11` (`fix(v2): validate graph disposition outcomes`) is complete. It centralizes the V2 result-code allowlist and rejects `skipped_by_learner` outside `SKIPPED`. Verification: `3 suites / 18 tests`, strict ES2022 TypeScript, Prettier, and diff-check pass. The attempt ref builder was intentionally not expanded in this slice; runtime sanitization/deep immutability remain open.

Independent Luna review: **NOT PASS**, with no P1. Remaining P2 are strict exact-schema rejection of unknown fields, deep immutability after canonicalization, and runtime validation inside `buildCanonicalAttemptRef` itself. Exact next task: close these three body/hash-boundary properties with RED/GREEN before moving to evidence/result/receipt contracts.

Bounded commit `05c1bf3ae` (`fix(v2): freeze canonical attempt bodies`) closes that boundary in the pure contract layer: exact allowlists reject unknown body/nested fields, canonical bodies are cloned and deeply frozen, and `buildCanonicalAttemptRef` sanitizes raw input before hashing. Focused verification: `3 suites / 20 tests`, strict ES2022 TypeScript, Prettier, and diff-check pass. Independent final review is pending.

Independent Luna final review: **PASS**, with no P1/P2 in the bounded attempt-contract scope. Task 1.3 attempt-body/hash boundary is now adjudicated and may proceed. Next executable task is the pure evidence/result/materialization contract slice: typed `LearningEvidenceBody` and `LearningNonAssessmentBody` refs/bases plus the non-hashed `V2AttemptEvent` join envelope; delayed terminal receipt remains separate. Runtime, Functions and Admin remain out of scope.

Bounded commit `ffc98cf0b` (`feat(v2): add evidence materialization contracts`) adds typed evidence/non-assessment bodies, separate body hashes/refs, exact source-attempt/tuple materialization validation, and a non-hashed attempt-event envelope validator. Focused verification: 4 suites / 23 tests, strict ES2022 TypeScript, Prettier and diff-check pass. Independent review is pending; this slice is provisional and does not implement delayed terminal receipts or runtime materializers.

Independent Luna review: **NOT PASS** with P1 findings. The baseline bodies lack typed pedagogical provenance/timing/input-route restrictions; non-assessment branches are not phase-specific; ref builders and envelope validation are not fail-closed enough and do not enforce ref/cardinality/basis invariants. Exact next task is a pure contract hardening slice for discriminated body validation and component-level envelope/ref/cardinality checks. Runtime, Functions and Admin remain out of scope.

Bounded commit `2acade5e0` (`fix(v2): harden evidence envelope contracts`) adds the envelope builder, exact attempt/basis matching, ref hash/tuple uniqueness checks, and typed ref validators. Focused verification: 4 suites / 22 tests, strict ES2022 TypeScript, Prettier and diff-check pass. Independent review is pending; phase-specific body validation and delayed receipt contracts remain open.

Independent Luna review: **NOT PASS**, P1 remains. Evidence/non-assessment bodies still lack phase-specific provenance/timing/input-route contracts and runtime body validation; refs are hashed without validating body conformance; envelope validation cannot prove body↔ref correspondence or delayed receipt branch conformance. Next exact task: add discriminated provenance/timing validators and make ref builders fail-closed before hashing. Runtime/Functions/Admin remain out of scope.

Bounded commit `6fed66264` (`fix(v2): validate evidence provenance branches`) adds phase/provenance/route/timing fields, body validators, and fail-closed ref-builder guards. Focused evidence suite: 3 tests pass; strict TypeScript and Prettier pass. Independent review is pending; envelope body/ref proof and delayed receipt-specific branches remain open.

Independent Luna review: **NOT PASS**, P1 remains. Validators are still permissive on phase/construct/route/timing, delayed receipt branches, exact source-attempt equality, unknown keys, and materialization re-validation. Exact next task is the fail-closed validator hardening slice; no runtime, Functions or Admin changes.

## 12.24 ORBIT V2 execution update — Task 1.2C fallback/accessibility closure

Эта сессия не переносит Admin Content Studio: перенос админки выполняется отдельной пользовательской сессией. В текущем V2 worktree изменены только Episode/Validation contracts и их focused tests.

Mission: закрыть P1 из свежего независимого ревью — capstone fallback должен быть deterministic/scripted, offline-capable и non-voice core-equivalent; delayed accessibility alternate должен разрешаться в существующую безопасную activity; checkpoint evidence tuple key должен строиться единственным canonical builder.

Authoritative result: commit `67bb32af0` (`fix(v2): enforce fallback and delayed accessibility contracts`) в `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`, branch `codex/learning-v2-pilot`. Изменены только `modules/learning-v2/contracts/validation.ts` и `tests/learning_v2_episode_contract.test.ts`; Admin/runtime не затронуты.

RED/GREEN evidence:

- RED: hostile cases воспроизводили отсутствие capstone capability checks, отсутствие delayed accessibility binding validation и ручную tuple serialization.
- GREEN: `npx jest --runTestsByPath tests/learning_v2_episode_contract.test.ts tests/learning_v2_evidence_contract.test.ts --no-cache --runInBand` — **314/314 passed**.
- `npx prettier --check modules/learning-v2/contracts/validation.ts tests/learning_v2_episode_contract.test.ts` — PASS.
- `git diff --check` — PASS.
- Полный focused Task 1.2C corpus ранее проходил `310/310`; свежий bounded slice расширил его до 314 тестов.

Remaining independent-review P2: platform support-manifest/minAppVersion closure remains deferred to release/manifest work; no fresh independent PASS was obtained after this commit. Task 1.2C therefore remains provisional until a new spec/adversarial review confirms the P1 closure and classifies the remaining P2.

Exact next executable task: run a fresh read-only spec reviewer and adversarial reviewer against commit `67bb32af0`, then either record PASS and start Task 1.3 evidence/result contracts or record exact remaining P1/P2 and add the next bounded RED/GREEN slice. Do not touch Admin in this session.

Startup commands:

```powershell
Set-Location C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot
git status --short --branch
git rev-parse HEAD
npx jest --runTestsByPath tests/learning_v2_episode_contract.test.ts tests/learning_v2_evidence_contract.test.ts --no-cache --runInBand
```

## 12.25 ORBIT V2 execution update — capability/semantic adversarial repair

Fresh adversarial review after `67bb32af0` identified two P1 gaps: self-declared fallback flags could mask voice/network-required capabilities, and delayed accessibility alternates were not proven non-aliasing or semantically/evidence equivalent. These are now addressed in bounded commit `63a61cd12` (`fix(v2): validate fallback capability equivalence`).

Changed production/test scope: only `modules/learning-v2/contracts/validation.ts` and `tests/learning_v2_episode_contract.test.ts`; no Admin, runtime, Firebase, or docs were included in the commit. The validator now rejects capstone and delayed accessibility alternates with required microphone, speech recognition, or network capability; rejects delayed self-alias; compares semantic targets and evidence declarations with the delayed primary; and retains a positive equivalent-alternate path.

Evidence: RED `306 passed / 8 failed`; GREEN episode `314/314`; episode+evidence `323/323`; strict focused TypeScript passed with ES2022 target/lib (ES2020 failure is the pre-existing `Array.prototype.at` baseline); Prettier and `git diff --check` passed. The commit is bounded and present at HEAD `63a61cd12`.

Adjudication status: the earlier independent Luna review was PASS for Task 1.2C with P2s (platform support manifest/minAppVersion, delayed semantic equivalence, locale allowlist). A final Sol adversarial review of `63a61cd12` was requested but had not yet returned at handover time. Therefore Task 1.2C is **provisional, not complete**, and Task 1.3 must wait for that final PASS or another independent review confirming no P1.

Exact next executable task: obtain a read-only adversarial PASS against `63a61cd12`; if PASS, begin Task 1.3 evidence/result contracts with RED/GREEN and keep platform support-manifest/minAppVersion as an explicit later release-boundary P2. Do not modify Admin in this session.

Post-commit Luna adjudication returned `NOT PASS` only for a remaining **P2**: delayed accessibility equivalence currently compares skill/phrase/semantic targets and declaration membership, but not exact objective IDs, critical-constraint coverage, or full declaration shape/cardinality. Capability rejection and self-alias rejection both PASS. Focused local verification independently confirms `323/323` tests, Prettier, and diff-check. Keep Task 1.3 paused until this P2 is either closed with an explicit contract or formally deferred by the Task 1.2C owner; do not silently treat the provisional slice as complete.

The P2 parity repair is now committed as `e4c5ad516` (`fix(v2): enforce delayed alternate evidence parity`). It adds RED cases for objective/critical/evidence-shape mismatch, then compares the delayed definition with the graph evidence node bound to the alternate activity. Final gates before commit: episode suite `317/317`, combined episode+evidence focused `326` tests, strict ES2022 TypeScript, and `git diff --check` all passed. Only `validation.ts` and `tests/learning_v2_episode_contract.test.ts` were committed; Admin/runtime/docs remained outside the code commit.

Exact next executable task: obtain final independent PASS against `e4c5ad516`; if PASS, mark Task 1.2C complete/provisionally release-ready with platform support-manifest/minAppVersion as explicit later P2, then begin Task 1.3 evidence/result contracts. If NOT PASS, record the exact bounded finding and continue RED/GREEN. Do not touch Admin in this session.

Final adjudication: Luna read-only review returned **PASS** for `e4c5ad516`. It confirms exact objective parity, critical-constraint coverage, canonical evidence declaration signature/cardinality parity, self-alias rejection, and unsafe capability rejection. No P1/P2 remain in the requested Task 1.2C scope. Task 1.2C is complete; platform support-manifest/minAppVersion remains an explicit later release-boundary P2. Next executable task is Task 1.3 evidence/result contracts. Admin remains owned by a separate session.

Task 1.3 is now in progress in the same V2 worktree. Initial bounded slice is limited to pure contract modules `attempt.ts`, `activity_result.ts`, `delayed_probe.ts`, and `evidence.ts` as needed, plus focused hash-chain/cardinality/delayed tests. Runtime, Functions, Admin, and release wiring are intentionally deferred until this contract slice is independently verified.

Task 1.3 bounded commit `5fdeb9971` (`feat(v2): add attempt and delayed contract boundary`) is now present. It adds pure `attempt.ts`, `activity_result.ts`, and `delayed_probe.ts` contracts plus three focused suites. RED was confirmed on missing contracts; GREEN is 3/3 suites and 3/3 tests. Strict ES2022 contract TypeScript, Prettier, and `git diff --check` passed. The slice intentionally does not yet implement the full normative input/evaluator/provenance model, canonical runtime-evidence binding, complete delayed terminal receipts, or client/Functions conformance.

Exact next executable task: consume the independent review of `5fdeb9971`, then extend Task 1.3 with those omitted normative fields and materialization boundaries test-first. Do not start runtime/Functions/Admin wiring until the pure contract corpus is complete and independently PASS.

## 12.22 ORBIT Admin Acceleration — 2026-07-16

User intent: ускорить перенос админки в V2 без разрушения legacy. Real worker receipts: Sol High `019f6ae1-792f-7440-9a49-233d6714f2f2` (migration audit), Luna Medium `019f6ae1-94d3-73a1-a733-b18524b2b531` (first-slice inventory), Terra Medium `019f6ad2-b4a5-7193-b007-019798331930` (single writer, implementation pending).

Verified safe first slice: one lesson-stage Content Studio path only — capability read, single-stage create, generation/retry, bounded cursor-paginated list, immutable preview, manual approve/reject. Reuse existing admin V2 pages/controllers and `functions/src/admin_content_stages.ts` / `content_stage_worker.ts`. Exclude bulk/range, Arena, flashcards, Challenge, release sealing/activation/rollback, runtime migration, and legacy deletion or redirect changes.

Evidence: Admin/UI contracts 26 passed; backend-focused suites 108 passed; inspected Admin modules passed `node --check`. Known unrelated baseline: migration inventory expects 441 legacy buttons but detects 400; do not change legacy behavior to hide it. Main checkout is dirty/read-only; V2 worktree is the only writer; no deploy or production write.

Exact next task: Terra runs focused Admin/UI and Functions suites, adds RED only for a real missing contract, implements only the single-stage draft/preview/review seam, runs GREEN plus syntax/diff/secret checks, and makes one bounded commit or reports no-op. Then Luna verifies and Sol High reviews. Rollback remains additive feature-flag/navigation fallback to legacy; no destructive migration.

## 12.23 Admin acceleration blocker (2026-07-16)

Terra Medium completed the requested bounded writer audit with no code change. The V2 worktree does not contain the reusable Content Studio foundation files required for the first slice: `admin/v2/scripts/pages/content-generator.js`, `admin/v2/scripts/content-factory/{controller,state,stage-renderers}.js`, `functions/src/admin_content_stages.ts`, and `functions/src/content_stage_worker.ts`. They exist only on another history branch, so creating a parallel implementation would violate the reuse boundary. Focused migration coverage passed 6/6 in this worktree; the previously reported 441/400 mismatch was not reproduced here. The audit board check is blocked by missing ignored input `.codex-tmp/admin-audit/legacy-buttons.json`.

Exact next task: Sol High must identify the exact foundation commit(s) and dependency closure on the source branch, with a read-only cherry-pick packet. No cherry-pick is allowed until file scope, conflicts, tests, and legacy preservation are independently verified.

The resulting provenance packet is preserved in `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md`. It records `5781aa82`, `43ba949e`, `445ccaac`, and `0dd8149f`, their scopes, dependency closure, exclusion rules, focused first slice, and rollback. The packet concludes that no direct cherry-pick is safe; the next writer must perform a surgical extraction with RED/GREEN contracts.

Terra then added `tests/admin_v2_lesson_stage_transfer_contract.test.ts` as a RED guard. The measured source closure is 71 files (66 backend + 5 UI), or 73 including surgical `admin-core.js`/`admin-firebase.js` integration, and it reaches excluded Arena/flashcard/quiz-release modules. The 20-file limit was exceeded, so no code was copied and no pseudo-foundation was committed. Exact next task: design a new code-owned generic stage boundary with an explicit exclusion test, then implement that boundary in a separate bounded slice.

RED evidence: `npx jest --runTestsByPath tests/admin_v2_lesson_stage_transfer_contract.test.ts --no-cache --runInBand` fails at the missing `admin/v2/scripts/pages/content-generator.js`, as intended. This RED test remains an uncommitted guard; no GREEN implementation exists yet.

Sol High design result: replace the 71-file snapshot closure with a code-owned operational kernel capped at 18 files. The kernel knows only immutable object refs, execution state, review and audit; it registers one adapter, `lesson_draft_v1`. The adapter may use existing generation/artifact primitives but must not import Arena, flashcard, quiz/challenge, release, runtime, or define Episode/Evidence/star/mastery types. Review uses `content.review` (not `content.publish`), maker-checker, revision/idempotency, immutable retry artifacts, and legacy fallback. Terra has been assigned the bounded RED/GREEN implementation; if the 18-file cap is exceeded, it must stop without a pseudo-foundation.

## 12.15 — checkpoint evidence tuple closure (2026-07-16)

Commit `3c12cf5ef` adds declaration-level equivalence checks between every checkpoint primary and deterministic alternate evidence tuple. The test context now publishes alternate declarations, and a mismatched alternate skill/construct/target is rejected. Focused Jest is `290/290`; strict focused `tsc`, Prettier, diff check, and staged secret scan pass. No push/deploy/release; handover remains uncommitted.

The next exact task is still checkpoint package node-count RED/GREEN (8/10 must fail, 9 must pass), followed by fresh independent spec/red-team review. Task 1.2C remains partial and the global Orbit V2 goal remains active.

## 12.17 — checkpoint nine-node blueprint (2026-07-16)

Commit `f989fc8e5` moves the checkpoint node-count rule to the package boundary and requires exactly nine graph nodes for every checkpoint ordinal. A RED package mutation with eight nodes now fails before deeper checkpoint traversal; the valid vertical slice remains green. Focused Jest: `292/292`; strict focused tsc, Prettier, diff check, and staged secret scan: PASS. No push/deploy/release; handover remains uncommitted.

Next executable task: run fresh independent spec/red-team review of the complete Task 1.2C slice. If no P1/P2 remains, begin Task 1.3 evidence/result contracts; otherwise add only the reproducing RED/GREEN fixes and update this handover.

## 12.18 — locale, exposure, capability, and visible-checkpoint closure (2026-07-16)

Commit `4bbe9fcd3` adds exact locale-set validation across learner-visible Episode localized values, requires exposure before same-episode assessed prerequisite outcomes, and hardens the fixture identity to a coherent single-locale E1 slice for the new closure test. Commit `bbc982db2` requires checkpoint nodes to be nine visible nodes (not merely nine total) and requires curriculum capability keys to exactly match capabilities used by episode and delayed activities.

Focused Jest is now `295/295`; strict focused tsc, Prettier, diff check, and staged secret scan pass. Fresh spec/red-team audits still identify support-plan bounds, canonical checkpoint `evidenceTupleKeys`, and capstone fallback reachability as remaining gaps. No push/deploy/release; handover remains uncommitted.

Exact next executable task: add RED/GREEN support-plan-to-node-bound validation and canonical checkpoint tuple-key validation, then request fresh review again before Task 1.3. Task 1.2C and the global Orbit V2 goal remain active.

## 12.19 — support bounds and canonical checkpoint keys (2026-07-16)

Commit `562e211e1` validates each objective support plan against matching encounter-node `allowedSupportLevels`, with a RED mutation proving an unsupported initial model is rejected. Commit `a702a9992` derives checkpoint alternate `evidenceTupleKeys` from the exact seven-field declaration tuple and rejects arbitrary attacker keys. Focused Jest: `297/297`; strict focused tsc, Prettier, diff check, and staged secret scan: PASS.

Task 1.2C is now ready for another independent adjudication. Remaining medium concerns include capstone deterministic fallback reachability/one-to-one semantics and production-grade capability manifest/platform intersection. No push/deploy/release; handover remains uncommitted. If fresh audit is clean, next task is Task 1.3 evidence/result contracts.

## 12.20 — first real ORBIT worker and Task 1.3 evidence identity slice (2026-07-16)

The user explicitly authorized user-visible model workers. Routing receipts: Terra Medium `019f6ad2-b4a5-7193-b007-019798331930`, Luna Medium `019f6ad2-ed4a-7220-bc0b-603bf568e77c`, and Sol High `019f6ad3-58f5-7d92-8255-54f344217ee0`. Generic collaboration agents are not treated as model switches.

Terra produced bounded commit `c7447063864e01ea6b5b8c107f7efbad60c021e3` (`feat: add V2 evidence tuple identity`). Only `modules/learning-v2/contracts/evidence.ts` and `tests/learning_v2_evidence_contract.test.ts` changed. The module defines the seven-field identity and sole `letk1.` JCS/base64url builder, without attempt envelopes, learning refs, materialization, backend, or UI.

Worker RED: missing module (`TS2307`). Worker GREEN: 9/9. Root verification: combined Episode + Evidence Jest `306/306` PASS; strict focused TypeScript PASS; Prettier PASS; diff check PASS. Full root TypeScript remains a pre-existing unrelated baseline failure. Handover is the only dirty tracked file; no push/deploy/production mutation.

Exact next task: complete Sol High review, then continue Task 1.3 with Terra’s next bounded slice (`attempt.ts` pre-hash `V2AttemptEventBody`/`CanonicalAttemptRef` boundary and hash-chain tests), keeping materialization/backend out of that slice.

## 12.16 — primary accessibility route closure (2026-07-16)

Commit `3b31b60dd` requires every episode accessibility route set to contain an explicit `routeKind: "primary"`; an accessibility-only set now fails closed. Focused Jest is `291/291`; strict focused tsc, Prettier, diff check, and staged secret scan pass. No push/deploy/release. Handover remains uncommitted.

Exact next task remains checkpoint node-count RED/GREEN and fresh spec/red-team review. Task 1.2C and the global Orbit V2 goal are still active.

Default Functions Jest discovery содержит 123 test paths и не подхватывает emulator suite. Dedicated config обнаруживает ровно один emulator suite. `PERMISSION_DENIED` warnings внутри emulator output ожидаемы для `assertFails`. Clean `npm ci` завершился exit 0, а `functions/node_modules/.bin/firebase.cmd --version` вернул `15.23.0`.

### 6.6 Phase 01 / Task 1.1 identity и versioning

Task закрыт двумя отдельными коммитами:

- `77cf617afb4a33e75a830dfc9d78d133e4f928c2` — `feat: define Learning V2 identity contracts`;
- `362b65e7af4ea0b1db34f13007686f4e6e91d180` — `test: harden Learning V2 purity guard`.

Созданы ровно три плановых файла:

| Файл                                               | Назначение                                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `modules/learning-v2/contracts/identities.ts`      | Exact ID grammar, семь distinct branded types, `is*`/`parse*`, stable error codes и release-scoped activity duplicate assertion |
| `modules/learning-v2/contracts/schema_versions.ts` | Code-owned per-kind allowlist девяти поддержанных V2 schema versions и fail-closed parser                                       |
| `tests/learning_v2_identity_contract.test.ts`      | Runtime boundaries, compile-time brand guards, localization/release invariants, schema conformance и AST purity guard           |

Канонический ID-контракт:

- один exact allowlist `^[A-Za-z0-9._-]{1,160}$` для `courseId`, `seasonId`, `episodeId`, `nodeId`, `activityId`, `skillId`, `releaseId`;
- исходная строка не trim-ится, не lower-case-ится и не Unicode-normalize-ится; сравнение case-sensitive и byte-for-byte;
- лексика общая, но TypeScript brands разные: `NodeId` нельзя присвоить `ActivityId`;
- обязательные префиксы, lowercase-only и запрет leading/repeated punctuation намеренно не добавлены: это было бы уже несовместимым правилом сверх нормативного server allowlist;
- `activityId` обязан быть уникален внутри одного release, но та же stable identity разрешена по одному разу в разных releases;
- `skillId` не принимает release как parser input и не переименовывается при смене release;
- title/translation не входят в identity и не могут её менять.

Поддержанный schema registry по entity kind:

| Kind                      | Exact accepted version            |
| ------------------------- | --------------------------------- |
| `modeTemplateRuntime`     | `v2-mode-template.v1`             |
| `delayedProbeDefinition`  | `v2-delayed-probe-definition.v1`  |
| `attemptBody`             | `v2-attempt-body.v1`              |
| `attemptRef`              | `v2-attempt-ref.v1`               |
| `attemptEnvelope`         | `v2-attempt-envelope.v1`          |
| `delayedAttemptCandidate` | `v2-delayed-attempt-candidate.v1` |
| `delayedAttemptAck`       | `v2-delayed-attempt-ack.v2`       |
| `publishedSeason`         | `v2-season.v1`                    |
| `lessonBundle`            | `lesson-bundle.v2`                |

Лексически корректная неизвестная версия и известная версия другого kind отклоняются. `CourseRelease` намеренно не включён: в legacy есть несогласованность `course-release.v1` против `course-release-v1`, которую нельзя молча канонизировать этим task. При появлении второй поддержанной версии одного kind single-current-value map нужно расширить отдельным immutable supported-versions registry, не меняя старую identity.

TDD evidence:

```text
Initial import RED: TS2307 для ещё отсутствующих modules; не использован как acceptance RED.
Behavioral RED после минимальных typed stubs: 35 failed / 3 passed.
First GREEN: 38/38.
Quality P2 RED для пропущенных import syntaxes: 5 failed / 42 passed.
Final GREEN после TypeScript AST guard: 47/47, 1 suite.
```

AST guard теперь обнаруживает static/from и side-effect imports, export-from, import-equals, dynamic `import()`, `require`, `require.resolve` и `module.require`; блокирует React/Firebase package families и не срабатывает на benign internal imports. Spec review дал PASS. Первый quality review запросил этот P2 fix; post-fix review дал APPROVED, P0–P2 не осталось. `git diff --check`, targeted TypeScript brand check и staged secret scan прошли. Свежий root rerun 2026-07-15: `47/47 PASS`; Jest напечатал общий force-exit warning без test failure. Push/deploy не выполнялись.

### 6.7 Phase 01 / Task 1.1A immutable DecisionRegistry

Task закрыт двумя последовательными коммитами:

- `fac37e8da6c68653ca03034b2306461c2431ed83` — `docs: complete V2 decision registry policy`; синхронизировал spec 08 и оба execution plan до первого опубликованного registry artifact;
- `a4245ccc1693a45711a41e678c5660a339755b17` — `feat: add immutable V2 DecisionRegistry`; содержит ровно пять implementation/test paths и не включает этот хендовер.

Ровно пять файлов implementation commit:

| Файл                                                                  | Назначение и важные границы                                                                                                                                                                        |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/learning-v2/policies/decision_registry.ts`                   | Shared/mobile readonly types, strict validator/resolver, canonical JSON v1, portable pure-JavaScript SHA-256 и content-addressed object-path formula; Node `crypto` запрещён purity test-ом        |
| `functions/src/content_studio/decision_registry.ts`                   | Поведенчески идентичный Functions validator/resolver; отличается только использованием `createHash('sha256')`, потому что deployable Functions `tsconfig` не может импортировать root `modules/**` |
| `tests/fixtures/learning-v2/content-studio/decision-registry.v1.json` | Один shared conformance corpus: baseline v1, согласованные nonbaseline v2 и calibrated v3, named invalid mutations, runtime-invalid canonical values и frozen ordered issue expectations           |
| `tests/learning_v2_decision_registry.test.ts`                         | Root/mobile corpus, canonical/hash/path, fail-closed validation, issue metadata, Unicode/array boundaries и Node-crypto purity guard                                                               |
| `functions/src/content_studio/decision_registry.test.ts`              | Тот же corpus и те же assertions в Functions runtime; отличается только fixture/import path и отсутствием mobile-only purity test                                                                  |

Нормативная policy-поправка до code commit зафиксировала:

- `HYP-V2-006` сериализует независимые `maxBoostsPerGate`, `maxBoostsPerChapter`, `maxBoostsPerSeason`; baseline `3/3/12`, price `3`, deficit `1..3`, recovery `2`, quote TTL `300`;
- `HYP-V2-008` version 1 допускает только один internal milestone `0% / 0h / 0 assignments`; ненулевой rollout требует новой immutable registry version;
- `HYP-V2-002`: frames `8..10`, semantic slots `12..18`, sound contrasts `0..1`, voice turns `3..10`, retries `2`;
- `HYP-V2-003`: completion `0.70`, independent mastery `0.80`, provisional checkpoint cutoffs `ep-08/16/24/32 = 0.80`;
- `HYP-V2-007`: exact success policy `dts-7.independent-transfer-success.v1` и window `dts-7.d3-d7.v1`;
- ordinary `targetEpisodeMinutes=12..18` не задаёт duration checkpoint/review episodes;
- эти значения остаются `PRODUCT_HYPOTHESIS`, а generic validator принимает другие согласованные immutable versions.

Pinned corpus facts:

- schema: `decision-registry-conformance-corpus.v1`;
- golden canonical JSON: `{"schemaVersion":"hash-golden-vector.v1","value":"Phraseman V2","version":1}`;
- golden SHA-256: `12ac7b1d9d7c2c06fc88a1b99abfc42f1c21fa48dc8e6c9cea88c639c1291160`, UTF-8 bytes `76`;
- registry-id SHA-256: `82912547a29a8e9bb7e8cc7459709d91d409c9af9e689233515b28060c0ea79f`;
- baseline v1 body SHA/bytes: `1258d89600563b394431ff77180d93f1b4489d1b57d5f871a85f5d99724e294a` / `4488`;
- nonbaseline v2 body SHA/bytes: `bfd7e0df2483a713580ed5f5b355ce84301fcbe02355a8a91db4182211d5fb37` / `3007`;
- calibrated v3 body SHA/bytes: `cf8ea91a451ca2530c92403ef1e1996ccdab0c12e5196518a9a45f5ef56ac577` / `4611`;
- baseline содержит documented local E1–E32 curve, cumulative E2–E32 access curve и season target `500`.

Финальный контракт фактически проверяет:

- body schema/id/version и ровно восемь decisions `HYP-V2-001..008`; key равен `decisionId`, unknown/missing fields fail closed;
- body не содержит self-hash/object/time/lifecycle/receipt metadata;
- exact immutable record ref, lowercase 64-hex body hash, object hash/path/generation/byteSize и normalized millisecond ISO timestamp;
- mutable `latest` запрещён; integrity не проверяется каскадом после уже найденной semantic/structural ошибки;
- canonical strings обязаны быть NFC и без lone surrogates; non-JSON values, non-finite, `-0`, sparse/subclass/accessor/non-enumerable arrays, cycles, `Date`, `Map`, function, symbol и BigInt отклоняются;
- integers обязаны быть safe integers; huge chapter count не создаёт giant `Array.from` и не вызывает RangeError/OOM;
- exact checkpoint IDs следуют HYP001 ordinals; star totals, local/cumulative curves и все три boost caps согласованы и достижимы;
- rollout percentages/minima возрастают; non-object milestone fail closed; version 1 остаётся exact internal-only;
- issue order детерминирован code-rank + raw UTF-16 path, duplicate same-code issues не теряются; каждый issue и thrown validation error содержит `severity:'blocking'`, `waivable:false`.

Полная TDD/аудит-хронология:

1. Initial RED: оба test files не компилировались с `TS2307`, потому что два runtime modules ещё отсутствовали.
2. Первый минимальный GREEN: root `55/55`, Functions `54/54`.
3. Первый independent spec/quality audit вернул NOT PASS. Были добавлены adversarial shared cases; один ранний root run дал `9 failed / 60 passed`. Functions также дал множественный RED по metadata/taxonomy/safe integers/huge count/rollout/date/dedupe; точный первый Functions count не сохранялся надёжно и здесь намеренно не выдумывается.
4. Исправлены exact checkpoint IDs, nondecreasing curves, three-cap reachability, rollout minima, blocker metadata, canonical error mapping, safe allocation, safe integers, millisecond dates, deterministic duplicate-preserving sort, strict arrays, fail-open `null` ranges/evidence/record, issue taxonomy, Unicode byte-length и owner bounds.
5. Промежуточные gates росли до root `82/82`, затем root `85/85` и Functions `84/84` после последних input/body/record type cases.
6. Post-fix reviewer воспроизвёл P1: `rolloutMilestones:[null]` проходил semantic validation. Shared `invalid.008.milestone_type` сначала дал root `1 failed / 85 passed` и Functions `1 failed / 84 passed`, затем explicit `decision_registry_setting_invalid`; GREEN стал `86/86 + 85/85`.
7. Финальный spec reviewer воспроизвёл P1: registry version 1 разрешал добавить `1%`. Shared `invalid.008.v1_nonzero_rollout` сначала дал root `1 failed / 86 passed` и Functions `1 failed / 85 passed`; version-specific exact `0/0/0` invariant дал финальный GREEN `87/87 + 86/86`.
8. Оба независимых post-fix re-review дали `PASS`; оставшихся P0–P2 не найдено. Один reviewer дополнительно сравнил validation sections byte-for-byte и проверил canonical/SHA parity на 1000 случайных JSON values и пяти boundary strings.

Точные финальные команды и доказательства:

```powershell
npx jest --runTestsByPath tests/learning_v2_decision_registry.test.ts --no-cache --runInBand --silent

# PASS: 1 suite, 87/87

Push-Location functions
npx jest --runTestsByPath src/content_studio/decision_registry.test.ts --no-cache --runInBand --silent
Pop-Location

# PASS: 1 suite, 86/86

git diff --cached --check

# PASS, no output

npm run scan:secrets:staged

# PASS, exit 0
```

Root Jest продолжает печатать общий `Force exiting Jest` warning, но suite имеет exit 0 и `87/87`; это не скрывалось и не трактовалось как test failure. Broad root suite и полный Functions build не запускались: правила проекта требуют узкие gates, а общий Functions build уже имеет девять доказанно pre-existing ошибок из §7.2.

Неудачная попытка и восстановление:

- при сведении двух runtime implementations одна попытка передала весь source через ограниченный shell-output channel; output был усечён, в Functions file попал marker truncation, и focused suite немедленно обнаружил это как `58 failed / 26 passed`;
- повреждённая версия не коммитилась и не использовалась как evidence; Functions source был заново собран через безопасные 100-line chunks с `apply_patch`, после чего diff доказал, что реализации отличаются только SHA backend;
- это не следует повторять: большие source files нельзя переносить через один ограниченный tool-output. Для будущего extraction создать buildable shared package/adapters отдельной задачей, сохранив fixture/hashes/public behavior.

Факты против выводов:

- **Фактически проверено:** два runtime corpus, exact hashes/bytes/paths, all named invalid/runtime cases, parity, staged whitespace/secret gates, exact five-file commit, два независимых финальных PASS.
- **Выведено из архитектуры, но ещё не production-проверено:** будущий Content Studio сможет переиспользовать эти refs без изменения hash после extraction; это обязан доказать dedicated Task 1.
- **Не проверялось и не заявляется готовым:** Firestore persistence/callables, Admin UI, production deploy, real-device lesson loading, Episode/Season refs и rollout cohorts.
- Project OpenAI API не использовался. Push, deploy, release и изменения production data не выполнялись.

---

### 7.1 Закрытый P2 и ограниченное security-исключение Firebase CLI

Исходный дефект закрыт: `functions/package.json`, lockfile и root contract закрепляют exact `firebase-tools@15.23.0`; npm script разрешает binary из `functions/node_modules/.bin`, clean `npm ci` и локальная версия проверены. RED первого контракта был `Expected 15.15.0 / Received undefined`; RED security follow-up — `Expected 15.23.0 / Received 15.15.0`. Финальные gates: emulator `351/351`, reproducibility + static `61/61`.

Остаётся **time-bounded P2 security exception**:

- scope: только devDependency Firebase CLI и local rules-emulator workflow; пакет не импортируется production Functions runtime и не входит в мобильный клиент;
- exact pin: latest на момент проверки `15.23.0`, с поддержкой Node 20/22/24;
- известный остаток: `npm audit` всё ещё агрегирует moderate transitive paths через `@google-cloud/pubsub`/`@opentelemetry/core` и `gaxios`/`uuid`; общий репозиторный Functions audit остаётся `19` (`1 low / 15 moderate / 3 high`) и включает отдельные pre-existing production dependencies;
- npm предлагает semver-major downgrade Firebase CLI до `14.23.0`, а не безопасное обновление latest; автоматически применять его нельзя;
- owner: `build/security`;
- review-by: **2026-08-15** или раньше при новом `firebase-tools` release/advisory;
- follow-up: отдельная dependency-security задача должна перепроверить latest CLI и разнести dev-only и production advisory paths; не смешивать её с Learning V2 contracts;
- запрещено запускать `npm audit fix`, менять major/downgрейдить CLI или обновлять lock «для очистки отчёта» без повторных clean `npm ci`, local version, emulator `351/351` и root/static `61/61` gates.

### 7.8 Монетизация и энергия — owner discussion 2026-07-15, V2-решение ещё не принято

Для legacy-режима владелец подтвердил два продуктовых требования: отдельный бесплатный 72-часовой `intro_full_access` нужно отключить, при этом магазинный trial остаётся трёхдневным; успешная покупка должна вернуть пользователя точно в заблокированный урок, сразу восстановить полный запас энергии и открыть выбранный план. Обсуждаемый, но ещё не реализованный free-envelope: три сильных бесплатных урока вместо восьми, один квиз и одна тренировка в день. Порог уроков, связанный paywall copy, soft-upsell trigger и Remote Config должны меняться одной согласованной версией, потому что сейчас часть legacy copy/trigger всё ещё предполагает восемь уроков.

По legacy energy рабочая рекомендация для отдельного решения: не наказывать ошибки более длинным cooldown одновременно с ужесточением free-envelope; сначала оставить восстановление `+1 / 10 минут`, а затем отдельно проверить вариант `20 минут`. Рост максимального запаса предлагается ограничить значениями `5` до уровня 49 и `6` с уровня 50, не отнимая уже заработанные слоты у существующих пользователей без отдельного migration/owner decision. Это пока продуктовая рекомендация, а не утверждённый V2 contract или изменение конфигурации.

Для Learning V2 текущий канон по-прежнему требует, чтобы E1–E32 были завершаемы без покупки, а прогресс определялся stars/gates/evidence. Обсуждаемая альтернатива — отдельный коммерческий `content_access_gate` (например, E1–E3 free, E4–E32 Plus), который не заменяет mastery/checkpoint/evidence. Legacy energy не предлагается тратить внутри core V2 episodes и тем более за ошибки: иначе возникает двойной барьер `commercial access + learning gate`. Альтернатива конфликтует с действующим каноном и не может попасть в код, DecisionRegistry или rollout без явного owner approval и согласованного обновления нормативных документов. Exact next implementation task остаётся Task 1.2; эта дискуссия его не расширяет и production UI/config не меняет.

---

## 8. Выполненная Task 1.1A — immutable DecisionRegistry и её исходный execution contract

### 8.1 Почему именно Task 1.1A

Task 1.1 создал стабильные ID/version boundaries. Task 1.1A добавила единственный immutable machine-readable источник всех числовых решений `HYP-V2-001..008`, без которого Task 1.2 не мог pin-ить delayed-window policy, season shape или gate/star settings. Исторический execution contract ниже сохраняется как доказуемая инструкция и acceptance record. Порядок теперь:

`Task 1.1A DecisionRegistry (DONE) → Task 1.2 activity/episode/curriculum (NEXT) → Task 1.3 evidence/result → Task 1.4 Functions mirror → dedicated Content Studio Tasks 1–3`.

### 8.2 Ровно пять файлов Task 1.1A

- `modules/learning-v2/policies/decision_registry.ts`;
- `functions/src/content_studio/decision_registry.ts`;
- `tests/fixtures/learning-v2/content-studio/decision-registry.v1.json`;
- `tests/learning_v2_decision_registry.test.ts`;
- `functions/src/content_studio/decision_registry.test.ts`.

Не создавать пока `content_studio.ts`, Episode/Evidence shadow types, Admin UI, Firestore persistence или mutable `latest` document. Dedicated canonical-json/contracts files относятся к последующему Content Studio Task 1. Если Task 1.1A вынужден временно держать portable canonical serializer/hasher внутри двух перечисленных modules, bytes и public behavior обязаны быть зафиксированы shared corpus; later extraction не имеет права менять hash. Shared/mobile module не должен импортировать Node-only `crypto`.

### 8.3 Exact contract, который должен стать GREEN

- `DecisionRegistryBody` имеет schema `v2-decision-registry-body.v1`, literal `registryId='phraseman-v2-product-decisions'`, positive integer `version` и ровно восемь keyed entries `HYP-V2-001..008` с discriminated settings из spec 08 §6.2.
- Каждый map key равен `entry.decisionId`; unknown/missing decision, setting или field отклоняется strict parser-ом. Parser не удаляет неизвестные поля перед hash.
- Body не содержит собственного `contentHash`, object metadata, timestamp, lifecycle или receipt backrefs.
- `DecisionRegistryRecord` имеет schema `v2-decision-registry-record.v1`, exact `VersionRef`, `ImmutableObjectRef` и ISO `createdAt`; mutable `latest`, string-only ref и numeric browser fields запрещены.
- Accepted pair требует `record.ref.id === body.registryId`, `record.ref.version === body.version`, `record.ref.contentHash === hashCanonicalBody(body) === record.object.contentHash`.
- `record.object.objectPath` имеет exact content-addressed форму `content-studio/decision-registries/<sha256(registryId)>/v<version>/<contentHash>.json`; hash — 64 lowercase hex, generation непустой, byte size positive integer.
- Canonical JSON использует JCS/RFC 8785 key ordering/number serialization, UTF-8 без BOM/whitespace, сохраняет array order и отклоняет non-NFC strings, `undefined`, sparse arrays, non-finite, `-0`, `Date`, `Map`, functions, symbols и BigInt.
- Client и Functions читают один JSON corpus, получают одинаковые canonical bytes/SHA-256, accepted fixture IDs и ordered issue-code arrays. Нельзя импортировать root/mobile code из Functions или Functions code из client для искусственного «совпадения».
- Numeric ranges конечны и `min <= max`; counts/caps/versions/ordinals/days/hours/assignments — целые в допустимом неотрицательном/положительном диапазоне; fractions/cutoffs — `[0,1]`.
- Ordinal, day и rollout milestone arrays уникальны и строго возрастают. Rollout percent допускает только `0|1|5|10|25|50|100`.
- `HYP-V2-001`: season/chapter/episode/checkpoint shape арифметически согласован.
- `HYP-V2-004`: `maxStarsPerEpisode = maxStarsPerSlot × gateEligibleSlotsPerEpisode`, а `maxStarsPerSeason = maxStarsPerEpisode × seasonEpisodeCount`.
- `HYP-V2-005`: required loop tuple exact `['encounter_build','near_transfer']`; local/cumulative curve ordinals unique/increasing, values reachable/nondecreasing и согласованы с season/star budget; стартовый corpus отражает documented 32-episode curve и target 500.
- `HYP-V2-006`: четыре независимых economy-значения `accessBoostPriceShards/maxBoostsPerGate/maxBoostsPerChapter/maxBoostsPerSeason`; старт `3/3/3/12`, deficit `1..3`, два recovery-показа и quote TTL 300 секунд. Chapter/season caps никогда не выводятся из gate cap.
- `HYP-V2-007`: только allowlisted exact `delayedWindowPolicyId='dts-7.d3-d7.v1'`, assessable D+3…D+7, unique increasing post-season cadence и stable success-policy ID; произвольный window ID — non-waivable blocker.
- `HYP-V2-008`: milestones unique/increasing, finite, с разрешёнными percentages и meaningful observation/assignment minima. Живой version 1 содержит только internal-safe `0%/0h/0 assignments`; любое ненулевое значение требует новой registry version после baseline/MDE/alpha/power/sample решения.
- Все issue codes стабильны, детерминированно отсортированы и одинаковы в двух runtime. Resolver не читает mutable latest и не принимает сокращённые/fake hashes.

### 8.4 Test-first порядок Task 1.1A

1. Полностью прочитать umbrella Task 1.1A, spec 08 §6–6.2 и governance defaults в docs 03/05/07; не выводить settings из старого legacy UI.
2. Сначала создать shared JSON corpus: один valid resolved pair плюс именованные invalid cases/expected ordered issue codes. Все hashes — 64 lowercase hex; valid hash должен быть рассчитан из exact canonical body, не записан произвольной заглушкой.
3. Написать root и Functions tests, которые независимо читают один fixture, сравнивают accepted IDs, issue arrays, canonical bytes/hash и exact object path.
4. В RED обязательно покрыть: missing/extra decision, map-key mismatch, unknown/missing setting/field, non-finite/range/fraction, duplicate/unsorted ordinal и milestone, derived star/season/gate mismatch, self-hash/body metadata, ref id/version/hash mismatch, object hash/path mismatch, malformed generation/byteSize/time и forbidden latest resolution.
5. Запустить обе suites и сохранить behavioral RED из-за отсутствующего resolver/validator, а не broken config или два разных fixture formats.
6. Реализовать exact readonly types, strict parsers, canonical bytes/hash, deterministic issue ordering и resolved-pair validation отдельно в client и Functions.
7. Повторить shared corpus в обоих runtime и доказать одинаковые accepted fixture IDs, issue-code arrays и golden hash.
8. Запустить `git diff --check`, focused type/tests, staged secret scan, независимый spec review, затем отдельный quality review; каждый P0–P2 исправить test-first и re-review.
9. Commit только пять файлов с subject `feat: add immutable V2 DecisionRegistry`.
10. Обновить этот хендовер RED/GREEN/counts/commits/findings и только затем начать Task 1.2.

### 8.4.1 Нормативная поправка перед RED

Cross-document audit обнаружил, что документ 05 требовал Access Boost caps `3/3/12` на gate/chapter/season, документ 07 относил все caps к `HYP-V2-006`, а первоначальная schema 08 сериализовала только `maxBoostsPerGate`. До первого опубликованного artifact в schema 08 добавлены `maxBoostsPerChapter` и `maxBoostsPerSeason`; версия `v1` сохранена, потому что опубликованного несовместимого body/hash не существует. Оба execution plan обновлены тем же invariant.

Pilot version 1 фиксирует `PRODUCT_HYPOTHESIS`, а не универсальные нормы: HYP002 использует frames `8..10`, slots `12..18`, sound contrasts `0..1`, voice turns `3..10`, retries `2`; HYP003 — `0.70/0.80` и provisional checkpoint cutoffs `ep-08/16/24/32 = 0.80`; HYP007 — `dts-7.independent-transfer-success.v1`; HYP008 — только 0% internal milestone. Generic validator обязан принять согласованный nonbaseline corpus и не hardcode-ить эти числа. `targetEpisodeMinutes=12..18` относится только к обычным эпизодам, не к checkpoint/review duration.

Canonical/hash seam на Task 1.1A осознанно provisional: root/mobile не импортирует Node crypto, Functions использует Node SHA-256, оба runtime независимо вычисляют те же bytes/hash по одному corpus. Из-за `functions/tsconfig` нельзя deployably импортировать root `modules/**` без отдельной package/build boundary; dedicated Content Studio Task 1 извлекает canonical contract в общий buildable package/adapters без изменения fixture, public behavior или уже вычисленных hashes.

### 8.5 Точные Task 1.1A gates

```powershell
npx jest --runTestsByPath tests/learning_v2_decision_registry.test.ts --no-cache --runInBand
Push-Location functions
npx jest --runTestsByPath src/content_studio/decision_registry.test.ts --no-cache --runInBand
Pop-Location
```

Ожидаемый GREEN: обе suites проходят один shared corpus, дают byte-identical canonical body/hash, одинаковые ordered issue codes и fail-closed отклоняют mutable/latest или hash/object mismatch.

## 12. Exact next task — Phase 01 / Task 1.2 activity, episode и curriculum contracts

### 12.1 Почему следующий шаг именно Task 1.2

Identity/version grammar и exact immutable DecisionRegistry уже существуют. Следующий dependency — один canonical runtime contract для Activity, Episode graph и Curriculum/Season, который свяжет стабильные IDs с учебной архитектурой E1–E32. Без него:

- Task 1.3 не может привязать attempt/evidence к exact node/objective/skill/phase/target tuples;
- Task 1.4 не может зеркалировать client corpus в Functions;
- dedicated Content Studio Task 1 не может импортировать canonical Episode/DelayedProbe/Checkpoint types и начнёт создавать опасные shadow copies;
- progress/gate reducer Phase 02 не будет знать, какие loops, star slots, checkpoint requirements и accessibility routes действительно опубликованы.

Dependency order нельзя менять:

`1.1 identity (DONE) → 1.1A DecisionRegistry (DONE) → 1.2 Activity/Episode/Curriculum (NEXT) → 1.3 Attempt/Evidence/Delayed Results → 1.4 Functions conformance mirror → 1.5 dedicated Content Studio Tasks 1–3`.

Task 1.2 — pure contract slice. Она не создаёт экран, renderer, scorer, Firestore path, Cloud Function, Admin form, generator stage, progress reducer или реальные 32 episode payloads.

### 12.2 Обязательное чтение до первого изменения

Следующая сессия должна полностью прочитать:

1. корневой `AGENTS.md` и этот хендовер;
2. `docs/v2/README.md`;
3. `docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md`, минимум Phase 01 и полностью Task 1.2, но лучше весь план;
4. `docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md`, минимум contract/import interlocks Tasks 1–4;
5. `docs/v2/03-learning-architecture-and-curriculum.md` как curriculum/E1–E32 authority;
6. `docs/v2/04-activity-catalog-and-storyboards.md` для family/shell boundaries без начала UI;
7. `docs/v2/05-stars-progress-and-mastery.md` для loops/star/access/checkpoint separation;
8. `docs/v2/06-runtime-content-admin-and-release.md` для canonical activity/episode/evidence/delayed definitions;
9. `docs/v2/08-admin-content-studio-and-mode-authoring.md` только для будущих import/identity boundaries; не реализовывать Studio сейчас.

Если эти документы расходятся, применять priority из §0. Старые Speaking Club/experimental Lessons V2 specs не могут ослабить canonical V2.

### 12.3 Ровно семь плановых файлов

Создать:

- `modules/learning-v2/contracts/activity.ts`;
- `modules/learning-v2/contracts/episode.ts`;
- `modules/learning-v2/contracts/curriculum.ts`;
- `modules/learning-v2/contracts/validation.ts`;
- `tests/fixtures/learning-v2/episode-01.valid.json`;
- `tests/fixtures/learning-v2/episode.invalid.json`;
- `tests/learning_v2_episode_contract.test.ts`.

Не создавать в Task 1.2:

- `functions/src/learning_v2/contracts.ts` или Functions tests — это Task 1.4;
- `evidence.ts`, `attempt.ts`, `activity_result.ts`, `delayed_probe.ts` — это Task 1.3;
- Content Studio `content_studio.ts`, ModeTemplate, repositories, Firestore rules/callables или Admin UI — это последующие Tasks;
- второй canonical JSON/SHA algorithm. Если нужен hash delayed-probe body/ref, переиспользовать уже зафиксированные bytes/hash semantics Task 1.1A и не менять их golden vectors;
- real lesson content beyond минимального E1 conformance fixture;
- legacy adapters, Challenges migration или Speaking Club UI.

Если реализация объективно требует восьмой файл или изменение existing identity/schema registry, остановиться и доказать dependency по plan/spec до расширения scope; не делать скрытую правку.

### 12.4 Canonical Activity contract

`activity.ts` должен задать readonly, discriminated, JSON-safe contracts как минимум для:

- exact schema/type/version и distinct stable `activityId`, `nodeId`, `skillId`, `phraseId`/semantic-slot refs;
- canonical `V2ActivityInstance` boundary: `activityId`, `progressCompatibilityKey`, family, `activityTypeKey`, exact `kernelVersion`, exact `PublishedModeTemplateRef {templateId,version,contentHash}`, `payloadSchemaVersion`, `estimatedSeconds`, content-unit IDs, capabilities/tags и payload;
- renderer является частью code-owned kernel, а не удалённой policy. Resolved template/kernel compatibility chain обязана pin-ить ровно пять hash-addressed policy refs `evidence | scoring | progress | reward | recovery`; missing/mismatched kind/key/version/hash fail closed;
- prompt/media/input requirements и deterministic scripted/offline fallback capabilities;
- target skill/phrase/semantic-slot IDs;
- content-only Activity definition отдельно от graph-owned route/reward/phase fields;
- bounded voice/network capability declarations без заявления acoustic evidence из transcript-only scorer;
- no lifecycle/status, no star award, no gate flag и no graph edges внутри content-only Activity.

Не создавать shadow `ActivityInstance` authoring record из spec 08: Task 1.2 определяет runtime contract, а authoring aggregate появится после canonical imports в dedicated Content Studio.

### 12.5 Canonical Episode contract

`episode.ts` и `validation.ts` должны выразить и проверять:

- episode identity, ordinal/chapter, localized can-do objective, scenario, phrase frames, semantic slots, sound/grammar load и asset refs;
- directed acyclic graph с node count внутри resolved `HYP-V2-001.visibleNodeCount` для ordinary episode (baseline v1: `8–9`) и deterministic checkpoint blueprint (текущий pilot: `9` nodes), ровно один entry и один capstone, reachability всех required nodes, отсутствие dangling edges/dead ends;
- graph node владеет `requiredForCore`, `gateEligible`, `voiceEvidenceOptional`, phase, fallback/alternate, star slot и evidence/context declarations; Activity content этими полями не владеет;
- phases: `encounter_build | near_transfer | independent_probe | optional_review`; delayed probe остаётся scheduler-owned и не является graph node;
- ровно два access-required loops: `encounter_build` и immediate `near_transfer`;
- ordinary independent probe находится только в `assessmentNodes.independentProbeNodeIds`, не входит в required loops и не блокирует ordinary access;
- chapter checkpoint — единственное явное исключение: independent-only pass condition может быть required на границе E8→E9, E16→E17, E24→E25; E32 задаёт final checkpoint status;
- число unique gate-eligible performance-star slots и cap на slot обязаны совпадать с exact resolved `HYP-V2-004` выбранной registry version (baseline v1: `8 × 3`); alternate/fallback nodes разделяют исходный `starSlotId` и не создают новый slot. `gateEligible` ортогонален learning phase: нельзя объявлять independent/optional node starless только из-за phase. Starless node типом имеет `maxStars:0` и не имеет `starSlotId`; scheduler-owned delayed probe вообще не является graph node;
- `V2NodeEvidenceDeclaration` использует collision-free exact tuple `nodeId + objectiveId + skillId + construct + phase + targetKind + targetId`; declaration phase совпадает с node и `LearningPedagogicalContextContract.phase`;
- context contract ограничивает support/hints и pin-ит immutable context/prompt; optional review не создаёт assessed declarations;
- `EpisodeLearningDesign`: primary outcome, objectives, acyclic prerequisite exposure/outcome edges, support plan, code-owned fade/escalation refs, independent probe ref, content-hashed delayed probe ref и exact delayed-window policy ID;
- mastery requirements versioned по objective/construct/phase/validity/outcome/max support; performance stars, completion и voice-turn count не являются evidence;
- hash-free delayed-probe definition body + exact content-hashed ref + resolved pair; scheduler-only `probeNodeId` отсутствует в graph, loops, star slots и checkpoint, а activity/template/context/declarations совпадают byte-for-byte;
- review links discriminated: `optional_review` либо scheduler-owned `delayed_probe`; nominal D+1/D+7/D+21 cadence не подменяет pinned assessable D+3…D+7 window;
- `V2CheckpointContract`: requirements только `independent_probe`, exact declared evidence tuples, unique assessment node set, exact objective-set equality, critical semantic-slot/constraint coverage, deterministic alternates, targeted repair/reassessment; delayed tuples запрещены;
- checkpoint не вводит новый required skill, phrase/lexicon, grammar distinction, semantic slot или critical constraint: всё required checkpoint material обязано быть подмножеством ранее опубликованного taught/exposed curriculum scope;
- accessibility routes достигают core completion и всех access-required performance-star slots без ложного evidence claim;
- core route остаётся достижим без voice-specific star и без обязательной сети/AI;
- max two new grammar distinctions и phrase-load bounds из curriculum authority;
- all referenced IDs/assets resolve; unknown/missing fields fail closed.

Task 1.2 может определить declaration/context/checkpoint/delayed-ref shapes, необходимые Episode contract. Task 1.3 обязан импортировать их и добавить attempt/evidence materialization; он не должен объявлять второй несовместимый tuple или delayed-probe shape.

### 12.6 Canonical Curriculum contract

`curriculum.ts` должен закрепить scope-dependent season projection:

- `vertical_slice` содержит только E1 и используется для lab/staging contract fixture;
- `chapter_internal` содержит E1–E8 и checkpoint E8 для internal staging;
- только `full_season` содержит все 32 episodes, четыре главы по восемь и checkpoints E8/E16/E24/E32; production-ready validation обязана отклонять два меньших scope;
- stable episode refs и checkpoint ordinals обязаны точно соответствовать выбранному scope, без hole/duplicate/out-of-scope ref;
- immutable exact `decisionRegistryRef {id,version,contentHash}`; validator обязан resolve-ить pair через Task 1.1A и fail closed при missing ID/version/hash/object mismatch;
- все используемые HYP settings разрешаются из exact pinned body, не из mutable latest и не из free-form number;
- prerequisite/outcome progression и chapter boundaries без cycle/orphan episode;
- ordinary episode vs checkpoint semantics; 12–18 minutes applies only ordinary episodes;
- locale/capability/asset closure как requirements, но без генерации переводов или media;
- no production release pointer, activation state, receipts или mutable lifecycle в curriculum body.

Valid fixture должен представлять реальный минимальный E1 contract из canonical curriculum, а не абстрактный игрушечный graph. Его season/curriculum envelope имеет scope `vertical_slice`, exact E1 ref и exact DecisionRegistry pin; он не обязан притворяться `full_season`. Отдельные validation cases обязаны доказать `vertical_slice=E1`, `chapter_internal=E1…E8 + E8 checkpoint` и `full_season=32/4×8 + E8/E16/E24/E32`.

### 12.7 Обязательный test-first порядок

1. Проверить clean pilot HEAD и наличие commits `77cf617af`, `362b65e7a`, `fac37e8da`, `a4245ccc1`.
2. Прочитать документы §12.2 и выписать invariant matrix: identity, graph, phases/loops, evidence declaration, delayed ref, checkpoint, accessibility, curriculum/registry pin.
3. Сначала создать `episode-01.valid.json` и named invalid corpus в `episode.invalid.json`; hashes/refs должны быть настоящими, не `abc` и не shortened placeholders.
4. Написать `tests/learning_v2_episode_contract.test.ts`, который импортирует ещё отсутствующие modules и проверяет stable ordered machine issue codes.
5. Запустить focused suite и сохранить RED. Допустим initial `TS2307`, но acceptance RED должен быть behavioral после minimal typed stubs, а не broken Jest config/fixture path.
6. Реализовать минимальные readonly types и strict parsers без React, React Native, Expo, Firebase, Admin или Functions imports.
7. В strict parser отклонять unknown/omitted fields до hash; не sanitize/strip input. Сортировка issues должна быть deterministic и duplicate-preserving.
8. Реализовать cross-contract graph/checkpoint/delayed/curriculum invariants только после базовой structural validity, чтобы malformed subtree не вызывал cascade, throw, giant allocation или fail-open.
9. Добавлять каждый найденный reviewer defect сначала в shared invalid fixture, подтверждать RED, затем исправлять.
10. Запустить focused GREEN, `git diff --check`, staged secret scan, независимый spec review и независимый quality/adversarial review.
11. Исправить все P0–P2 test-first и получить post-fix PASS.
12. Commit только Task 1.2 scope с рекомендуемым subject `feat: define Learning V2 episode contracts`.
13. Обновить этот хендовер exact RED/GREEN counts, commit, files, failed attempts/findings и полным Task 1.3 handoff.

### 12.8 Минимальная обязательная invalid matrix

Общий fixture/test должен покрыть как минимум:

- unknown/missing schema/body/activity/node/edge/loop/assessment field;
- wrong branded ID kind, duplicate activity/node/star-slot/tuple IDs, missing referenced ID/asset;
- graph cycle, second entry/capstone, unreachable required node, dangling edge и dead end;
- Activity content, который незаконно содержит phase/gate/star/edge/lifecycle implementation;
- phase mismatch между node/declaration/context; optional review с assessed declaration;
- missing/extra/duplicate required loop, independent probe inside ordinary required loop, delayed probe inside graph/gate/star/checkpoint;
- graph node count не совпадает с resolved ordinary/checkpoint contract; число unique gate-eligible slots, per-slot cap или derived totals не совпадают с resolved `HYP-V2-004` (baseline `8 × 3`); fallback/alternate mint-ит новый slot; starless node имеет ненулевой max/slot; либо graph ошибочно выводит eligibility только из phase;
- core/access-star route, доступный только через unsupported voice/network path;
- checkpoint requirement не independent, undeclared tuple, node-set/objective-set mismatch, missing critical slot/constraint, invalid alternate/repair route или новый required skill/phrase/grammar/semantic-slot/constraint, которого не было в taught/exposed scope;
- delayed ref hash mismatch, string/latest ref, orphan activity/template/context/declaration, reused graph node ID;
- prerequisite cycle, production outcome without exposure, invalid support fade/escalation ref;
- more than two new grammar distinctions и phrase-load overflow;
- scope cardinality mismatch (`vertical_slice` не E1, `chapter_internal` не E1–E8/E8, `full_season` не 32/4×8), wrong checkpoint ordinal, duplicate/missing/out-of-scope episode, mutable/latest DecisionRegistry ref или registry hash mismatch;
- Episode/review-link schema, которое содержит result/materialization fields или объявляет performance star/voice turn/completion источником mastery/evidence;
- D+1/D+7/D+21 review link, который сам сериализует durable-success/outcome/evidence claim. Terminal window resolution и `not_assessed_for_window` проверяются только в Task 1.3.

Каждый invalid case должен ожидать stable issue code; cases с двумя одинаковыми code на разных paths обязаны сохранять оба issues и deterministic path order.

### 12.9 Точный focused gate

```powershell
Set-Location C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot
npx jest --runTestsByPath tests/learning_v2_episode_contract.test.ts --no-cache --runInBand
git diff --check

git add -- modules/learning-v2/contracts/activity.ts modules/learning-v2/contracts/episode.ts modules/learning-v2/contracts/curriculum.ts modules/learning-v2/contracts/validation.ts tests/fixtures/learning-v2/episode-01.valid.json tests/fixtures/learning-v2/episode.invalid.json tests/learning_v2_episode_contract.test.ts
git diff --cached --name-only
git diff --cached --check
npm run scan:secrets:staged
```

Functions suite в Task 1.2 не добавлять. После Task 1.3, Task 1.4 создаст `functions/src/learning_v2/contracts.ts` и общий client/Functions conformance gate.

### 12.10 Definition of Done Task 1.2

Task завершён только если:

- valid E1 fixture принят как exact `vertical_slice`; separate cases доказывают `chapter_internal` и `full_season=32/4×8`, все с exact DecisionRegistry ref;
- invalid corpus даёт stable deterministic issues без throw/fail-open/cascade;
- graph acyclic/reachable, one entry/capstone, two loops и independent/delayed separation доказаны тестами;
- checkpoint/declaration/context/delayed-ref set equality, critical coverage и no-new-required-material invariant доказаны;
- accessibility/offline route достигает core и access-star slots;
- node count соответствует resolved ordinary/checkpoint contract; star-slot count/cap/totals соответствуют exact resolved `HYP-V2-004` (baseline v1 `8 × 3`), fallback делит slot, а starless union означает `maxStars:0` без `starSlotId` независимо от phase;
- Episode schema не содержит evidence/result materialization и не объявляет stars/completion/voice-turn count источником mastery; actual materialization/outside-window semantics остаются Task 1.3;
- source files остаются pure и не импортируют UI/Firebase/Functions;
- independent spec и adversarial review имеют PASS без P0–P2;
- commit содержит только согласованный scope, push/deploy не выполняются без отдельной команды;
- хендовер обновлён и следующий шаг назван `Task 1.3 evidence and result contracts`, не Content Studio UI.

### 12.11 Точные первые команды следующей сессии

```powershell
Set-Location C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot
git -C C:\appsprojects\phraseman status --short --branch
git status --short --branch
git rev-parse HEAD
git log -6 --oneline
git show --stat --oneline a4245ccc1693a45711a41e678c5660a339755b17
git ls-files --error-unmatch AGENTS.md docs/v2/HANDOVER.md docs/v2/README.md docs/v2/00-research-and-skill-audit.md docs/v2/01-current-state-audit.md docs/v2/02-competitor-and-learning-evidence.md docs/v2/03-learning-architecture-and-curriculum.md docs/v2/04-activity-catalog-and-storyboards.md docs/v2/05-stars-progress-and-mastery.md docs/v2/06-runtime-content-admin-and-release.md docs/v2/07-migration-analytics-testing.md docs/v2/08-admin-content-studio-and-mode-authoring.md docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md

Get-Content -Raw -Encoding UTF8 AGENTS.md
Get-Content -Raw -Encoding UTF8 docs/v2/HANDOVER.md
Get-Content -Raw -Encoding UTF8 docs/v2/README.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md
Get-Content -Raw -Encoding UTF8 docs/v2/03-learning-architecture-and-curriculum.md
Get-Content -Raw -Encoding UTF8 docs/v2/04-activity-catalog-and-storyboards.md
Get-Content -Raw -Encoding UTF8 docs/v2/05-stars-progress-and-mastery.md
Get-Content -Raw -Encoding UTF8 docs/v2/06-runtime-content-admin-and-release.md
Get-Content -Raw -Encoding UTF8 docs/v2/08-admin-content-studio-and-mode-authoring.md

rg -n "Task 1.2|V2Activity|Episode|V2CheckpointContract|V2DelayedProbe|LearningPedagogicalContextContract|decisionRegistryRef" docs/v2 docs/superpowers/plans modules/learning-v2 tests -g "!docs/reports/**"
```

Ожидаемый стартовый Git-state после handover commit: branch `codex/learning-v2-pilot`, clean worktree, no upstream, история содержит `a4245ccc1` и последующий docs-only handover commit. Основной checkout `C:\appsprojects\phraseman` остаётся грязным и не должен меняться.

## 12.13 ORBIT V2 execution update — Task 1.2C progress

После `4e0f7ff79` выполнены ещё два bounded repair commit: `8c9dba1de` (`fix: close V2 curriculum material and asset contracts`) и `dda897faf` (`fix: validate V2 prerequisite support states`). Focused contract suite теперь `271/271`; strict focused TypeScript, Prettier, diff-check и staged secret scan проходят. Добавлены exact closure текущего episode ref против material полей Episode, exact asset closure, запрет неизвестных prerequisite `kind`/`requiredState` и неподдерживаемого `initialSupport`.

Глобальная цель ORBIT V2 остаётся активной. Task 1.2C всё ещё partial: независимый аудит продолжает требовать exact locale coverage, code-owned support refs, objective/construct coverage между independent и delayed probes, delayed binding/schedule closure, checkpoint blueprint/evidence tuple equivalence, accessibility route completeness и capstone closure. Следующий executable slice — добавить RED/GREEN на эти оставшиеся P1, затем свежий Spec Reviewer и Adversarial Reviewer; только после PASS переходить к Task 1.3.

Дополнительно закрыт code-owned support slice в `1cf2eaebd` (`fix: enforce code-owned V2 support rules`): неизвестные prerequisite states, unsupported initial support и attacker-controlled fade/escalation IDs теперь блокируются. Focused suite: `272/272`; strict focused `tsc`, Prettier, diff-check и staged secret scan: PASS.

Закрыт также independent/delayed coverage slice в `acd9627b3` (`fix: align V2 independent and delayed coverage`): objective+construct coverage этих двух probe surfaces теперь обязана совпадать; focused suite: `273/273`, остальные узкие проверки PASS.

Закрыт delayed schedule slice в `bdd4a9536` (`fix: close V2 delayed probe schedule`): delayed probe обязан иметь ровно одну review link, target episode должен совпадать, а missing/duplicate schedule теперь fail-closed. Focused suite: `276/276`; strict focused `tsc`, Prettier, diff-check и staged secret scan: PASS.

Закрыт checkpoint route-membership slice в `bd3a9f161` (`fix: close V2 checkpoint route membership`): primary/alternate/reassessment nodes, поставляющие checkpoint evidence, теперь обязаны присутствовать в `assessmentNodes.independentProbeNodeIds` с соответствующей фазой. Focused suite: `277/277`; strict focused `tsc`, Prettier, diff-check и staged secret scan: PASS.

Закрыт accessibility core-route slice в `6b6f52beb` (`fix: require V2 accessibility core route`): пустой список accessibility routes теперь блокируется как `accessibility_route_missing`; valid E1 сохраняет offline/core route. Focused suite: `278/278`; strict focused `tsc`, Prettier, diff-check и staged secret scan: PASS.

Закрыт capstone closure slice в `7d63e1f2a` (`fix: enforce V2 capstone closure`): required semantic slots, critical constraints и primary capstone node теперь проверяются exact-set against episode/graph contracts. Добавлены RED-кейсы на неполный slot set и неверный primary node. Focused suite: `280/280`; strict focused `tsc`, Prettier, diff-check и staged secret scan: PASS.

Закрыт curriculum locale slice в `880f27625` (`fix: validate V2 curriculum locale closure`): study target и learner source locale теперь непустые и типизированные, `requiredLocales` не может быть пустым/дублированным и обязан включать обе identity locale. Focused suite: `283/283`; strict focused `tsc`, Prettier, diff-check и staged secret scan: PASS.

## 12.12 ORBIT V2 execution update — Task 1.2 contract commit

**Фактическое состояние:** Task 1.2 закоммичен в `4e0f7ff79` (`feat: define Learning V2 episode contracts`) в worktree `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`, branch `codex/learning-v2-pilot`, после базового commit `127ae1b9e`. В commit попали ровно семь Task 1.2 файлов: четыре pure contract modules, два JSON fixture/corpus файла, один focused Jest contract. `docs/v2/HANDOVER.md` остаётся незакоммиченным документом в worktree и не включался в Task 1.2 commit.

**Mission:** закрепить канонический Episode/Curriculum/Activity/Validation contract для E1, со строгими hash/graph/checkpoint/delayed/curriculum границами, а затем перейти к Task 1.3 evidence/result contracts. Legacy, Functions, Admin UI, runtime rollout и Content Studio UI не менялись.

**RED/GREEN evidence:** исходный focused corpus был `263/263`. Гарданизация добавила RED для дублированных chapter IDs, duplicate prerequisite episode IDs и duplicate delayed-probe definitions; каждый кейс демонстрировал fail-open до правки. После минимальных проверок итоговый focused Jest: `266/266`; strict focused `tsc`: PASS; Prettier check: PASS; `git diff --cached --check`: PASS; `npm run scan:secrets:staged`: PASS.

**Independent audit findings retained for next repair slice:**

- P1: checkpoint `introducedMaterial` может ввести новый required material; нужен RED/GREEN на exact checkpoint closure.
- P1: curriculum asset/capability/material closure проверяет только missing dependencies, но не exact equality/coverage; locale/identity closure также неполная.
- P1: prerequisite DAG/exposure не покрывает same-episode outcome edges; support refs доверяют attacker-controlled dependency IDs; independent/delayed objective coverage не связана.
- P1: delayed ref не замыкается ровно в одно полное определение и не проверяет полную binding/schedule/coverage closure; scheduler namespace нужно расширить за пределы graph nodes.
- P1: checkpoint 9-node blueprint, alternate evidence tuple equivalence, accessibility route completeness и exact capstone closure не подтверждены полностью.

**Exact next executable task:** Task 1.2C — close the remaining audited P1 contract gaps test-first. Start by adding RED cases for checkpoint material/asset-capability-material equality/locale closure and prerequisite support ownership; then repair only `modules/learning-v2/contracts/validation.ts` and the focused fixture/test corpus. Acceptance: all new hostile cases fail before repair and pass after repair; existing `266/266` remains green; strict focused `tsc`, Prettier, diff boundary, and secret scan stay green; fresh spec and adversarial review report no P1/P2 in the bounded slice. Do not start Task 1.3, Functions, Admin, deployment, or Content Studio UI until this slice is adjudicated.

**Startup commands:**

```powershell
Set-Location C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot
git status --short --branch
git log -3 --oneline
npx jest --runTestsByPath tests/learning_v2_episode_contract.test.ts --no-cache --runInBand
```

## 12.55 Production access purchase callable

The production seam is now wired in the V2 worktree (Admin remains owned by another session). `functions/src/learning_v2_access_production_callable.ts` exposes `finalizeLearningV2AccessPurchase` with Firebase App Check enforcement, authenticates before parsing, reads the user-scoped gate receipt, requires its pinned DecisionRegistry reference, downloads the content-addressed artifact from Storage, resolves the exact pinned access policy, and delegates the authoritative purchase to the Firestore transaction adapter. The adapter re-checks the same registry reference inside the transaction to close the gate/policy TOCTOU window. `functions/src/index.ts` exports the callable.

The callable boundary maps expected domain failures to stable HTTPS errors, preserves idempotent replay receipts, and keeps all user/account/path validation server-side. A TypeScript narrowing fix made the adapter compile under the repository's strict configuration without changing behavior.

Evidence: production/callable matrix **4 suites / 21 tests PASS**; targeted strict TypeScript for production callable, callable orchestration, and adapter **PASS**. The prior Firestore emulator purchase matrix remains **1 suite / 3 tests PASS**. Full Functions build is still not a valid V2 gate because the repository has unrelated pre-existing Admin missing-module/duplicate-export errors; Admin files were not touched here.

**Exact next executable task:** run a fresh independent red-team/spec adjudication of this production callable slice. If no P1/P2 remains, commit the callable wiring and begin the Phase 02 progress-snapshot/outbox reducer slice. Acceptance: snapshot/outbox state is account-scoped and idempotent, replay-safe, offline/local-first compatible, and covered by RED/GREEN tests; do not alter Admin or remove legacy behavior.

## 12.56 Phase 02 Task 2.1 pure progress contracts — partial, uncommitted

The next V2 implementation slice has started in the isolated worktree; Admin remains outside scope. Added pure modules under `modules/learning-v2/progress/`: `progress_types.ts`, `progress_reducer.ts`, `gate_policy.ts`, `learning_evidence_policy.ts`, and `checkpoint_projection.ts`, plus focused root tests for reducer, gate policy, checkpoint projection, and evidence-policy branch handling.

The current bounded behavior now proves: best-performance stars are monotonic 0–3; earned access is derived from the same delta rather than stored as an independent field; canonical-shaped attempt refs and an explicit reducer context are required; slot identity is checked against a published catalog with an eight-slot-per-episode cap; replay hashes are account-snapshot indexed and conflicting op IDs fail closed; learning refs are bounded to assessed/non-assessment projections; technical/uncertain/invalid evidence retries without learning evidence; outside-window uses the pinned reason; gate targets are restricted to E2–E32 and the exact 31 threshold vector is tested; checkpoint `repair_required` requires a declared repair route; legacy fields are preserved.

Evidence: RED was first reproduced by the missing progress modules and then by TypeScript/union errors during implementation. Current GREEN matrix is **4 suites / 13 tests PASS**; strict targeted TypeScript with ES2022 target is **PASS**. No commit has been made for this slice because the fresh spec review still has open acceptance findings around full body↔ref materialization binding, checkpoint index wiring to the pinned Episode contract, complete declared-node/loop outcome semantics, and the exact persisted snapshot schema. These are explicitly partial, not completed.

**Exact next executable task:** close the remaining Task 2.1 P1 findings test-first: require validated body/ref materialization tokens (not shape-only refs), wire checkpoint projection through the pinned contract and bounded snapshot index, validate declared node/outcome/loop semantics, and add replay/conflict/per-episode catalog regression cases. Then run a fresh spec review and adversarial review before any commit. Do not start Task 2.2 or touch Admin until Task 2.1 receives PASS.

## 12.57 Task 2.1 adversarial checkpoint — still partial

The bounded Task 2.1 slice was hardened after review: reducer context now binds expected account/season, canonical attempt refs are strict own-key/hash shapes, processed attempt identities no longer evict old tombstones (the reducer fails closed when the bounded local index is full), and a `passed` checkpoint mutation requires an evidence ref. Focused GREEN remains **4 suites / 13 tests PASS** and strict targeted TypeScript remains **PASS**.

Fresh adversarial review still returns **NOT PASS** for Task 2.1 acceptance. Open P1/P2 items are explicit: snapshot validation must fully validate checkpoint/gate maps and key↔ref binding; body↔materialization-ref validation must be based on an immutable body/ref token rather than shape-only data; checkpoint writes must be produced only by a complete pinned checkpoint projection (critical tuple sets, declared repair/alternate routes, delayed/outside-window/no-record handling); node outcomes still need declared-node/activity/compatibility/result-policy binding; and all bounded indexes require exact cardinality contracts. No commit is allowed for this slice until those findings are closed and independently reviewed.

**Exact next executable task:** add the immutable evidence/checkpoint materialization token and pinned Episode/Checkpoint context to the reducer, validate all existing snapshot maps before reduction, reject forged node/checkpoint projections, and add adversarial RED tests for cross-account scope, forged pass, malformed refs, key mismatch, replay conflict and index overflow. Then run fresh spec and red-team reviews before committing Task 2.1.

## 12.58 Task 2.1 ledger/snapshot separation hardening

The replay identity index was removed from `ProgressSnapshot` after review because the canonical first-frame snapshot must stay bounded and cannot become a second attempt-history source of truth. `ProgressReducerContext` now receives the account-scoped durable attempt index (outbox/cloud ledger seam), while each reduction returns an `attemptLedgerEntry` for the caller to persist atomically. This removes the previous 256-attempt hard stop from the snapshot path. The reducer also validates persisted checkpoint/gate maps, key↔tuple binding, account/season scope, node catalog identity, and requires an assessed-success evidence binding for a `passed` checkpoint.

Focused GREEN remains **4 suites / 15 tests PASS**; strict targeted TypeScript and Prettier are **PASS**. The slice is still not committed: the remaining review gate is full pinned CheckpointContract/loop semantics and a fresh independent adjudication of the body/ref token boundary. Admin files remain untouched.

**Exact next executable task:** make the reducer context consume the full immutable Episode/Checkpoint contract (critical tuple set, exact assessment node/objective set, repair/reassessment and equivalent alternate routes), derive required-loop completion from declared node outcomes, add RED tests for persisted node/checkpoint poisoning and tuple mismatch, then obtain fresh spec and red-team PASS before the Task 2.1 commit.

## 12.59 Pinned checkpoint context and durable replay seam

The reducer no longer stores attempt replay history in the first-frame snapshot. Replay identity is supplied by the durable account-scoped context ledger, and the pure result returns the ledger entry for atomic outbox/cloud persistence. The reducer context now requires a pinned checkpoint contract with exact tuple, critical, repair, and alternate sets; checkpoint writes reject unknown/critical/repair/alternate mismatches. `passed` additionally requires an assessed-success binding.

Evidence: **4 suites / 15 tests PASS**, strict targeted TypeScript and Prettier **PASS**. The Task 2.1 slice remains uncommitted pending fresh independent review. Remaining expected review focus is exact full Episode contract parity (including loop-node derivation and restore-time membership validation) and the final immutable body/ref proof.

**Exact next executable task:** run fresh spec and adversarial reviews against the entire current Task 2.1 slice. If both report no P1, commit only the progress modules/tests/handover; otherwise add only reproducing RED/GREEN fixes. Admin files remain excluded.

## 12.60 Full checkpoint projection contract and loop derivation

`projectCheckpointEvidence` now requires a full pinned contract rather than accepting an empty/default contract. Requirements must explicitly declare `independent_probe`, assessment node, objective, and critical semantic-slot/constraint membership; tuple/node/objective sets are compared exactly. The reducer context likewise requires exact checkpoint tuple/critical/repair/alternate sets. A pure `deriveRequiredLoopsComplete` projection now derives encounter-build and near-transfer loop completion from accepted declared node outcomes instead of trusting a caller boolean.

Evidence remains **4 suites / 15 tests PASS**, strict ES2022 TypeScript and Prettier **PASS**. The Task 2.1 slice is still uncommitted until a fresh review confirms that checkpoint non-assessment/delayed branches and persisted node/checkpoint maps are fail-closed under the full pinned contract.

**Exact next executable task:** run the fresh spec and adversarial reviews now; if a P1 remains, add only its reproducing RED/GREEN case. If both PASS, perform the bounded Task 2.1 commit and begin Task 2.2 authoring contracts.

## 12.61 Restore-poisoning closure for required loops

`deriveRequiredLoopsComplete` now fail-closes on account/season mismatch, validates the restored snapshot, checks every required node against the pinned node catalog, requires a strict full outcome shape, and requires the node's canonical attempt ref/hash to exist in the durable account-scoped attempt ledger. A forged restored `CORRECT` outcome without a matching ledger entry therefore cannot satisfy the required-loop gate. The checkpoint reducer also distinguishes assessed refs from non-assessment refs and validates branch-specific body hashes.

Evidence: focused matrix **4 suites / 16 tests PASS**; targeted strict TypeScript and Prettier **PASS**. Fresh spec/red-team adjudication is still required before commit; the worktree remains intentionally uncommitted and Admin artifacts remain untracked/untouched.

**Exact next executable task:** obtain fresh independent reviews of the current files. If no P1 remains, commit Task 2.1 as one bounded change and update the phase table; otherwise address only the reproducing finding.

## 12.62 Task 2.1 committed — transition to Task 2.2

Commit `f59dfc4f7` (`feat(v2): add pure progress and checkpoint projections`) contains only the five pure progress modules, four focused test files, and this handover. Fresh spec and adversarial reviews report **no P0/P1**. Verification at commit boundary: **4 suites / 16 tests PASS**, strict targeted TypeScript **PASS**, Prettier **PASS**, `git diff --check` **PASS**. Remaining P2 hygiene items are recorded, not silently treated as resolved: canonical route IDs, typed projection refs, derived-only gate wrapper, catalog-aware standalone access derivation, exact evidence selector policy/version, and schema alignment.

Admin transfer artifacts remain untracked and are intentionally excluded from this commit. The V2 worktree remains `codex/learning-v2-pilot`; legacy behavior remains preserved.

**Exact next executable task:** begin approved Phase 02 / Task 2.2 Content Studio authoring contracts: create `season_draft.ts`, `episode_draft.ts`, `episode_graph.ts`, Functions repositories and focused tests. Reuse `gate_policy.ts` as the single threshold source; do not copy its formulas. Acceptance: ActivityInstance is separate from EpisodeGraphNode routing/reward fields; clone remaps graph IDs; scopes are exactly `vertical_slice`, `chapter_internal`, `full_season`; stale refs and production scope gates fail closed. Start with RED and do not touch Admin UI in this writer session.

## 12.63 Task 2.2 authoring contracts — GREEN bounded slice, review pending

The current isolated V2 worktree contains a RED-first implementation for the bounded authoring slice. Added pure graph operations (`add/remove/connect/disconnect`, DAG/reachability and activity/graph separation checks), episode draft creation/mutation/clone with optimistic revision/fingerprint checks, graph-ID remapping and clone provenance, and season draft operations for the three approved scopes. Season gate materialization imports the existing `modules/learning-v2/progress/gate_policy.ts`; it does not copy threshold formulas. Added in-memory Functions repositories with stale-head rejection and focused repository tests, plus the full-season contract fixture. No Admin file was changed; the two Admin transfer artifacts remain untracked and excluded.

RED evidence: before the implementation, both root authoring suites failed with module-not-found for the missing authoring modules. GREEN evidence after implementation and hardening: root **2 suites / 4 tests PASS**; Functions **2 suites / 2 tests PASS**; strict targeted TypeScript over all five implementation modules **PASS**; Prettier and `git diff --check` **PASS**. The Functions project-wide TypeScript command still reports pre-existing unrelated missing-module/export errors in `functions/src/index.ts`; it is not evidence for this bounded slice and was not modified.

This slice is **partial until fresh reviews finish**. Known review focus is canonical Episode field/validator parity, exact immutable DecisionRegistry body/hash verification, complete season topology/release references, clone remapping of all nested graph-owned references, and production repository persistence beyond the in-memory seam. No commit has been made yet.

**Exact next executable task:** consume the fresh spec and adversarial review results. If a P1 remains, add only its reproducing RED/GREEN test and fix; otherwise run the final focused matrix, commit only the Task 2.2 authoring/repository/fixture/test files, and record the commit plus exact next Task 2.3 in this handover. Admin files remain excluded.

## 12.64 Task 2.2 hostile hardening — focused GREEN, not accepted as complete

The current slice added hostile regressions and fixes for canonical gate equality, full-season composition/checkpoints, production scope validation, non-empty DecisionRegistry resolution, optional authoritative EpisodeRevision resolver, ActivityInstance graph-field separation, graph fallback/evidence phase checks, exact eight-slot checks when the canonical star contract is present, required-loop/assessment/delayed-probe separation, mutator identity immutability, repository hash recomputation, and recursive clone reference remapping. Fresh red-team/spec review now reports no P0, and the focused matrix is green: root **2 suites / 4 tests PASS**, Functions **2 suites / 2 tests PASS**, strict targeted TypeScript **PASS**, Prettier **PASS**, `git diff --check` **PASS**.

This remains **not accepted as a completed Task 2.2**. Open P1 findings are explicit: the Functions layer is still an in-memory adapter rather than the production Firestore atomic body/record/head repository with auth/ownership and default-deny write boundary; production eligibility does not resolve every pinned EpisodeRevision artifact and full canonical Episode contract; EpisodeDraft/Graph fields still need the complete strict canonical aggregate (voice/localization/delayed/checkpoint/policy refs rather than optional unknowns); and clone/reference remapping needs typed canonical ownership rather than heuristic fallback. No commit has been made for this slice. Admin transfer artifacts remain untracked and excluded.

**Exact next executable task:** write RED tests for the first remaining P1 cluster—authoritative EpisodeRevision resolver plus production repository transaction/ownership—and implement the smallest injected Firestore transaction seam that recomputes body/hash/object identity and fails closed on stale or unauthorized writes. Then run fresh reviews again before any Task 2.2 commit. Do not begin Task 2.3 or modify Admin until this acceptance gate closes.

## 12.65 Transaction seam RED/GREEN — still partial

Added `authoring_transaction_repository.ts` and its focused test as the first server-side seam: an injected transaction store now checks owner identity, draft identity, optimistic revision/fingerprint, validates the candidate body, and recomputes the immutable body hash/fingerprint before compare-and-set. This is intentionally an adapter boundary, not a claim that Firebase production wiring is complete. Focused repository test and strict TypeScript for the new seam pass. The Task 2.2 acceptance remains open until an actual Functions Firestore implementation, authoritative EpisodeRevision resolver, and complete canonical Episode aggregate are wired and reviewed.

**Exact next executable task:** add the corresponding SeasonDraft transaction adapter and authoritative immutable EpisodeRevision lookup contract, then run hostile tests proving hash-conflict, stale-head, owner, missing-artifact, and production full-season rejection. Keep Admin artifacts excluded.

## 12.66 Authoritative EpisodeRevision and Season transaction seam — GREEN adapter, production wiring pending

Added `episode_revision_resolver.ts` with exact metadata comparison plus body-hash and immutable object-generation checks, and `season_authoring_transaction_repository.ts` with owner boundary, optimistic CAS, exact EpisodeRevision resolution, body/record hash recomputation, and mandatory DecisionRegistry resolution for `full_season`. Added hostile tests for missing artifacts, exact artifacts, owner/stale behavior, and record-hash poisoning.

Verification: Functions focused matrix **3 suites / 3 tests PASS**; root authoring matrix **2 suites / 4 tests PASS**; strict targeted TypeScript for the new resolver/transaction seam **PASS**; Prettier and diff checks **PASS**. The implementation is still an injected transaction adapter, not yet wired to the project’s real Firestore callable, storage generation reads, auth roles, security rules, or canonical Episode validator. Therefore Task 2.2 remains partial and no commit is claimed.

**Exact next executable task:** bind the adapter to the real Functions callable/repository and Firestore rules after inspecting the existing content-studio storage/auth conventions; add RED tests for callable ownership, default-deny direct writes, immutable Storage generation, DecisionRegistry body resolution, and full canonical Episode validation. Admin UI remains out of this writer session.

## 12.68 Bounded authoring/transaction slice — ready for limited commit

The pure authoring plus injected transaction slice is now internally green and independently red-team-reviewed with no P0/P1 for that bounded scope. It is ready to be committed separately from the still-open production/canonical work. Evidence at this boundary: root **2 suites / 4 tests PASS**, Functions **4 suites / 5 tests PASS**, strict targeted TypeScript **PASS**, Prettier **PASS**, `git diff --check` **PASS**. This does **not** close the umbrella Task 2.2 acceptance: the next production callable, real Firestore/Admin SDK repository, canonical Episode aggregate validator, and typed immutable Storage object binding remain open.

**Exact next executable task after the bounded commit:** write RED tests for `adminSaveV2EpisodeDraft`/`adminSaveV2SeasonDraft` callable authorization, direct-write denial, transaction replay/conflict, and full canonical Episode/DecisionRegistry resolution; then wire the real callable/export without touching Admin UI.

## 12.69 Bounded authoring seam committed

Commit `2169adecb` (`feat(v2): add bounded season and episode authoring seam`) contains the pure graph/episode/season authoring modules, focused root/Functions tests, injected episode/season transaction adapters, immutable EpisodeRevision resolver seam, fixture, and this handover. Commit boundary evidence: root **2 suites / 4 tests PASS**, Functions **4 suites / 5 tests PASS**, strict targeted TypeScript **PASS**, Prettier **PASS**, `git diff --check` **PASS**. Admin transfer artifacts remain untracked and excluded.

The commit is intentionally bounded/partial. It does not claim full Task 2.2: real callable/export and Admin SDK wiring, canonical Episode aggregate validation, typed Storage object path/generation pinning, and release/review lifecycle remain open.

**Exact next executable task:** write RED tests for callable authorization and lifecycle (`adminSaveV2EpisodeDraft`, `adminSaveV2SeasonDraft`), direct Firestore-write denial, transaction replay/conflict, canonical Episode/DecisionRegistry resolution, then implement/export the real Functions boundary. Preserve legacy and do not modify Admin UI in this writer session.

## 12.70 Callable boundary RED/GREEN foundation

Added `admin_content_studio_authoring.ts` with strict mutation-envelope parsing, `content.draft.write` role enforcement, authorization-before-repository handling, and a callable factory that applies the existing region/App Check policy. Focused tests cover malformed envelopes, unauthorised roles, dependency non-invocation on denial, and successful forwarding. Verification: **1 Functions suite / 3 tests PASS**, strict targeted TypeScript **PASS**, Prettier/diff checks **PASS**.

This is only the callable foundation; concrete `adminSaveV2EpisodeDraft`/`adminSaveV2SeasonDraft` exports are not wired yet because their real Firestore/Admin SDK repositories and canonical Episode resolver still need to be connected. Admin UI remains untouched.

**Exact next executable task:** create the real Firestore-backed dependency factory, export both named callables through `functions/src/index.ts`, and add emulator RED tests for direct-write denial, owner/auth claims, stale CAS, immutable object generation, and DecisionRegistry/Episode resolution.

## 12.71 Firestore-backed callable wiring — implementation slice

Added `firestore_authoring_store.ts` with explicit V2 draft/revision/DecisionRegistry paths, Admin SDK transaction adapters, immutable EpisodeRevision resolver, and DecisionRegistry resolver. Added `admin_content_studio_callables.ts` and exported `adminSaveV2EpisodeDraft`/`adminSaveV2SeasonDraft` from `functions/src/index.ts`. Both endpoints enforce App Check, require admin `content.draft.write`, parse the mutation envelope, and perform server-side CAS through the Firestore adapters. Focused tests cover storage paths, callable exports, auth parser, and transaction seams; standalone strict TypeScript checks pass.

This is still an implementation slice, not a release claim. The next required evidence is emulator-backed direct-write denial and callable invocation with real Firestore documents, including exact immutable object generation and full canonical Episode/DecisionRegistry fixtures. Existing project-wide Functions `tsc` remains contaminated by unrelated pre-existing missing exports/modules in `functions/src/index.ts`; the new files compile in the targeted strict gate.

**Exact next executable task:** add emulator RED/GREEN coverage for the two exported callables and real server-only collections, then strengthen canonical Episode body validation and object-path/generation pinning before release review.

## 12.72 Firestore authoring security evidence

The existing emulator contract was executed through the project script `npm run test:emulator:v2-authoring-rules`: **1 suite / 351 tests PASS**. This includes direct admin get/list/create/update/delete denial across the V2 server-only authoring, revision, lifecycle, review, localization, preview, and manifest collections while preserving the legacy admin inventory. The new callable/path adapters and exports also pass their focused tests and targeted strict TypeScript checks.

The emulator result proves Firestore rules, not callable lifecycle correctness. Remaining open work is canonical Episode body validation, exact Storage object path/generation pinning, callable invocation against seeded emulator documents, and release/review lifecycle receipts. No Admin UI files were changed.

**Exact next executable task:** add callable-level emulator/integration tests with seeded immutable EpisodeRevision and DecisionRegistry documents, then make the resolver validate the canonical Episode contract before allowing a full-season save.

## 12.73 Production resolver canonical Episode gate

Added the shared `validateV2EpisodeContract` entry point, which enforces the canonical Episode top-level key set, schema version, required collection/object shapes, and the existing deep Episode contract rules. The Firestore immutable-revision resolver now supplies this validator to the season transaction boundary; a hash-matching arbitrary body is rejected with `season_episode_body_contract_invalid`. Focused evidence: Functions **3 suites / 5 tests PASS** and targeted strict TypeScript **PASS**. The validator has direct regression coverage for unknown fields and missing canonical structure.

This remains a partial Task 2.2 slice: the resolver still needs explicit Storage object-path/generation binding (not only a non-empty generation), seeded emulator invocation of both exported callables, and release/review receipt coverage. Injected test resolvers without `validateBody` remain compatible for bounded legacy tests; production Firestore wiring is fail-closed through the canonical validator.

**Exact next executable task:** create a callable integration harness against seeded emulator documents, assert auth/App Check/owner/CAS behavior through the exported endpoints, and add explicit immutable object-path + generation equality to the EpisodeRevision artifact contract.

## 12.67 Resolver hardening and server-owned boundary evidence

The immutable EpisodeRevision artifact contract now includes the fetched body and immutable Storage generation; the resolver recomputes `hashCanonicalBody(artifact.body)` and rejects metadata-only or hash-poisoned artifacts. The Season transaction adapter now requires a resolvable DecisionRegistry for `full_season` saves and resolves all pinned EpisodeRevision refs before compare-and-set. Existing `firestore.rules` already has explicit `allow read, write: if false` blocks for the V2 authoring/revision/lifecycle/review collections; the emulator contract lists these server-only collections.

Fresh focused verification after this hardening: root **2 suites / 4 tests PASS**; Functions authoring/transaction matrix **4 suites / 5 tests PASS**; strict targeted TypeScript **PASS**. This still does not prove production callable wiring, Storage generation reads, or full canonical Episode validation, so Task 2.2 remains partial and uncommitted.

**Exact next executable task:** inspect and connect the real Functions callable/export and Storage/Admin SDK transaction path, reusing the existing server-only Firestore rules; add the callable and emulator RED tests before implementation. Do not touch Admin UI artifacts in this session.

