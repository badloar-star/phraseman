# Phraseman Learning V2 — мастер-хендовер

**Последнее обновление:** 2026-07-22, Europe/Dublin
**Статус цели:** active  
**Текущая стадия:** E1 content-compiler Task 0 завершён локальным коммитом `cd95d4336`; versioned Episode-v2/SessionSet на 12 обязательных сессий прошёл финальный gate 426/426, fresh spec PASS и fresh adversarial PASS; runtime SessionSet resolver остаётся явно отложенным
**Точный следующий крупный шаг:** выполнить Task 0A — отделить farmable optional-practice access stars от performance/checkpoint/mastery; затем строго Tasks 1–8 language profile → content items → compiler → optional practice → diminishing rewards → Content Factory prerequisite → Functions/QA → E1 proof
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

| Фаза | Содержание и точный порядок                                                                                                                                                   | Gate / результат                                                                                                    | Статус на 2026-07-15                                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 00   | Security inventory, legacy direct-access classification, удаление broad-admin OR bypass, server-only V2 paths, canonical Body/Record/hash boundary                            | Emulator deny для будущих authoring paths; legacy compatibility; одинаковые canonical bytes/hash                    | **Security slice закрыт.** Content Studio Task 0 и reproducible local CLI зелёные; canonical artifact contracts продолжаются в Phase 01 |
| 01   | 1.1 identity/versioning → 1.1A immutable DecisionRegistry → 1.2 activity/episode/curriculum → 1.3 evidence/result → 1.4 backend mirror → 1.5 Content Studio Tasks 1–3         | Shared client/Functions corpus, stable issue codes, no shadow contracts, 17 families, immutable ModeTemplate        | **В работе:** Tasks 1.1 и 1.1A закрыты; ближайший код — Task 1.2 contracts                                                              |
| 02   | 2.1 pure reducer/gate policy → 2.2 Content Studio Task 4 → 2.3 account store/outbox → 2.4 server event → 2.5 Access Boost callable → 2.6 rules/emulator                       | Idempotent local-first progress; performance/access/evidence physically separated; offline/restart safe             | Не начато                                                                                                                               |
| 03   | 3.0 competitor reference-evidence pack + owner UI approval → 3.1 registry → 3.2 ActivityScaffold → 3.3 six shells → 3.4 thin routes/resume                                    | One registry, one scaffold, six accessible shells; UI evidence approved before production work                      | Заблокировано до Task 5A/reference pack                                                                                                 |
| 04   | 4.1 capture state machine → 4.2 scorer boundary → 4.2A calibration/privacy gates → 4.3 accessible capture UI → 4.4 device matrix                                              | Voice never deadlocks; scorer claims match measured construct; fallback/privacy/device gates pass                   | Не начато                                                                                                                               |
| 05   | 5.1 Visual Discovery + Listen & Choose → 5.2 Phrase Builder → 5.3 Repeat + Quick Response → 5.4 Scripted Dialogue → 5.5 legacy adapters                                       | P0 learning loop runs through shared contracts; old modes adapt without duplication                                 | Не начато                                                                                                                               |
| 06   | 6.1 V2 stages/validators → 6.2 Admin Content Studio → 6.3 lesson-bundle seam → 6.4 loader/cache → 6.5 Content Studio Tasks 14–15                                              | E1 authored, previewed, sealed, activated and rolled back in lab/staging; production E1 release must still fail     | Не начато                                                                                                                               |
| 07   | 7.1 E1 fixture through real loader → 7.2 real map state → 7.3 completion/stars/resume → 7.4 analytics                                                                         | Один полный пользовательский vertical slice проходит offline/restart/fallback                                       | Не начато                                                                                                                               |
| 08   | 8.1 P1 modes → 8.2 E1–E8 generation/approval → 8.3 deterministic E8 checkpoint → 8.4 dogfood                                                                                  | Chapter 1 готов для закрытого пилота; scoring/UX/generator исправлены по данным                                     | Не начато                                                                                                                               |
| 09   | 9.1 Club evidence split → 9.1A consent/copy/eligibility → 9.1B one server egress → 9.1C verified deletion/legal hold → 9.2 Club adapter → 9.3 fallback → 9.4 review scheduler | Club — capstone, not teacher; network voice governed; scripted fallback and shared review work                      | Не начато                                                                                                                               |
| 10   | 10.1 placement → 10.2 E16/E24/E32 checkpoints → 10.3 Challenges side-node adapter → 10.4 migration rehearsal                                                                  | Existing progress preserved; placement/checkpoints deterministic; no forced legacy deletion                         | Не начато                                                                                                                               |
| 11   | 11.1 chapter-by-chapter generation → 11.2 whole-season QA → 11.3 non-English seam proof                                                                                       | Все 32 graphs pass schema/content/localization/release gates; один второй язык proves seam                          | Не начато                                                                                                                               |
| 12   | 12.1 governed events → 12.2 learning projections → 12.3 experiment passports → 12.4 operational alerts                                                                        | Completion, independent evidence, delayed evidence, voice health and economy measurable without false causal claims | Не начато                                                                                                                               |
| 13   | 13.1 manifests/cohorts → 13.2 performance → 13.3 accessibility/devices → 13.4 rollback drills → 13.5 R0–R5 ramp                                                               | Dogfood → closed cohorts → candidate default; stop/rollback gates and delayed windows mature                        | Не начато                                                                                                                               |
| 14   | Explicit owner decision: keep both, make V2 default with fallback, migrate Challenges, or retire specifically named legacy surfaces                                           | No deletion without parity, data and separate explicit approval                                                     | Не начато; намеренно последнее                                                                                                          |

Каждую фазу перед кодом нужно детализировать отдельным GSD phase plan, не стирая текущую `.planning`: она относится к другому milestone. V2 должен получить отдельный milestone/workstream.

### 2.3 Полный вложенный маршрут Content Studio 0–15

| Task | Что создаётся                                                                               | Зависимость / interlock                                                | Статус                                                                                       |
| ---- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 0    | Direct-access inventory, explicit Firestore allows/denies, emulator matrix                  | До любых новых authoring collections/callables                         | **Закрыто локально:** Task 0 + exact local CLI, 351 emulator и 61 root/static guards зелёные |
| 1    | Shared authoring contracts, canonical JSON/hash, eight-entry DecisionRegistry               | Umbrella Phase 01; выполнять только после GREEN umbrella Tasks 1.1–1.4 | Следующий внутри Content Studio после 1.1–1.4                                                |
| 2    | Code-owned capability catalog и app-support manifests                                       | После Task 1; umbrella Phase 01                                        | Не начато                                                                                    |
| 3    | Immutable ModeTemplate versions, clone/deprecate/localization                               | После Task 2; umbrella Phase 01                                        | Не начато                                                                                    |
| 4    | ActivityInstance, EpisodeDraft/graph, SeasonDraft/revisions                                 | Только после единой green gate policy из Phase 02                      | Не начато                                                                                    |
| 5    | Callables, roles, permissions, indexes, Storage, audit, optimistic concurrency              | До Admin UI                                                            | Не начато                                                                                    |
| 5A   | Competitor evidence ledger, screenshots/contact sheets, original wireframes, owner approval | Обязательный gate до Phase 03/production UI                            | Не начато                                                                                    |
| 6    | Admin IA и shared wizard shell                                                              | Читать Admin UI Bible; после 5A                                        | Не начато                                                                                    |
| 7    | Mode Library wizard                                                                         | После 1–6                                                              | Не начато                                                                                    |
| 8    | Episode Builder, graph editor и season workspace                                            | После Task 4/permissions/shell                                         | Не начато                                                                                    |
| 9    | PreviewEnvelope Body/Record и real-device Preview Lab                                       | Нельзя подменять mock preview                                          | Не начато                                                                                    |
| 10   | Validation receipts, review projections и revision-bound waivers                            | Receipts append-only, no record backrefs                               | Не начато                                                                                    |
| 11   | Translator workflow для templates/episodes                                                  | Workflow metadata вне hashable content bodies                          | Не начато                                                                                    |
| 12   | V2 13-stage generation DAG                                                                  | Делегировать существующему stage engine, не создавать второй queue     | Не начато                                                                                    |
| 13   | `lesson-bundle.v2`, sealing, activation, rollback                                           | Immutable/content-addressed releases                                   | Не начато                                                                                    |
| 14   | E1 author-to-device end-to-end gate                                                         | Lab/staging only                                                       | Не начато                                                                                    |
| 15   | Content Studio infrastructure rollout controls                                              | Это не product cohort rollout Phase 13                                 | Не начато                                                                                    |

Точный код и тесты каждого Task находятся в `2026-07-14-phraseman-v2-content-studio.md`. Не заменять их пересказом из таблицы.

### 2.4 Точный ближайший исполнимый маршрут

1. Подтвердить, что 14-path canonical package уже tracked в pilot worktree: docs-only commit source `0b94c9749`, cherry-pick commit `a09f57da2`; `git ls-files --error-unmatch ...` должен вернуть все 14 paths.
2. **Выполнено:** воспроизводимость Task 0 закрыта focused commits `abce49e1f` + `fd450e763`; exact local `firebase-tools@15.23.0`, clean `npm ci`, 351 emulator и 61 combined root/static tests подтверждены.
3. Не смешивать с этим восстановление общего Functions build: девять текущих TypeScript ошибок доказанно существовали в parent commit; для них нужен отдельный baseline-fix task/commit.
4. **Выполнено:** umbrella Phase 01 / Task 1.1 реализован test-first commits `77cf617af` + `362b65e7a`: identity grammar, семь branded ID, release-scoped activity uniqueness и fail-closed schema versions без React/Firebase imports.
5. **Выполнено:** Task 1.1A immutable DecisionRegistry закрыт policy commit `fac37e8da` и implementation commit `a4245ccc1`; shared corpus, portable client SHA, Functions Node crypto, immutable exact refs и fail-closed validation дали финальные `87/87 + 86/86`.
6. **Точный следующий код:** выполнить 1.2 activity/episode/curriculum contracts, затем 1.3 evidence/result → 1.4 backend conformance mirror.
7. Только после этого выполнять dedicated Content Studio Tasks 1–3. Task 1 импортирует canonical episode/evidence types и не должен создавать их shadow/reduced copies.
8. После каждого numbered task обновлять этот хендовер точным commit, RED/GREEN выводом, файлами, findings и следующим зависимым шагом.

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

| Путь                                                               | Роль                                                                                      | Когда читать                              |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| `docs/v2/HANDOVER.md`                                              | Текущее состояние, exact next step, ветки, проверки, риски                                | В начале и конце каждой V2-сессии         |
| `docs/v2/README.md`                                                | Главный продуктовый индекс и утверждённая архитектура                                     | Всегда перед работой                      |
| `docs/v2/00-research-and-skill-audit.md`                           | Provenance research/skills; не runtime authority                                          | Перед новым research/design решением      |
| `docs/v2/01-current-state-audit.md`                                | Что реально уже есть: legacy, Lessons V2 prototype, plans, voice, Club, generators        | Перед интеграцией/миграцией               |
| `docs/v2/02-competitor-and-learning-evidence.md`                   | Rosetta/Duolingo/ELSA/EWA, learning evidence, P0/P1/P2 и UI reference protocol            | Перед выбором activity/UI pattern         |
| `docs/v2/03-learning-architecture-and-curriculum.md`               | Учебный source of truth и E1–E32                                                          | Для contracts/content/episode work        |
| `docs/v2/04-activity-catalog-and-storyboards.md`                   | ActivityScaffold, six shells, voice shell, 14 storyboards, states/motion/accessibility    | Перед UI/runtime activity work            |
| `docs/v2/05-stars-progress-and-mastery.md`                         | Нормативные stars/access/evidence/gates/offline contracts                                 | Для progress, economy, purchase и gates   |
| `docs/v2/06-runtime-content-admin-and-release.md`                  | Нормативные runtime/evidence/voice/release/loader contracts                               | Для client/backend/release work           |
| `docs/v2/07-migration-analytics-testing.md`                        | Adapter-first migration, flags, events, experiments, test matrix и rollback               | Для rollout/telemetry/migration           |
| `docs/v2/08-admin-content-studio-and-mode-authoring.md`            | Одобренная нормативная Content Studio spec и единственная machine schema DecisionRegistry | Для любого authoring/Admin/generator work |
| `docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md`   | Umbrella GSD/TDD implementation plan                                                      | Всегда; читать текущую фазу полностью     |
| `docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md` | Вложенный точный TDD-план генератора/Studio                                               | Всегда при Task 0–15                      |
| `docs/design/ADMIN_UI_BIBLE.md`                                    | Единственный UI source of truth для Admin                                                 | Перед изменением Admin UI/navigation      |

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
- Firebase CLI reproducibility commit: `abce49e1fb52fc5356cb0a0996f60fa4934b19d7`
- Firebase CLI security-pin follow-up: `fd450e763d94b19b1bfcc995d797899fae3f3c9c`
- Task 1.1 identity/versioning implementation: `77cf617afb4a33e75a830dfc9d78d133e4f928c2`
- Task 1.1 purity-guard quality fix: `362b65e7af4ea0b1db34f13007686f4e6e91d180`
- DecisionRegistry normative policy amendment: `fac37e8da6c68653ca03034b2306461c2431ed83`
- Task 1.1A immutable DecisionRegistry: `a4245ccc1693a45711a41e678c5660a339755b17`
- Canonical docs/handover persistence commit in pilot: `a09f57da2d2442d114202bb3d52bf58abe917bb1`
- Source docs-only commit in main: `0b94c974938f0e157dec45b1c4031bd1c89dd90c`
- Parent/common base: `96d2568fbbe958a96e3c68156a7bcf1abce5d3a0`
- Последний implementation commit subject: `feat: add immutable V2 DecisionRegistry`
- Состояние после свежей проверки: чистое.
- Upstream/remote branch: отсутствует.
- Deploy: не выполнялся.
- Push: не выполнялся.
- Task 0/1.1/1.1A остаются в изолированной pilot-ветке и не переносились в основной checkout.

### 6.2 Что изменено в commit

| Файл                                                                        | Фактическое назначение                                                                                                                               |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/reports/learning-v2/content-studio-direct-access-inventory.md`        | 241-строчная инвентаризация legacy namespaces, V2/server-only paths, RED/GREEN, compatibility и deploy limits                                        |
| `firestore.rules`                                                           | Удалён global `isAdmin()` catch-all; сохранены минимальные explicit legacy operations; добавлены 18 explicit V2 deny roots и финальная deny boundary |
| `functions/jest.config.js`                                                  | Emulator-only тест исключён из обычного Functions Jest discovery                                                                                     |
| `functions/jest.emulator.config.js`                                         | Dedicated config выбирает только emulator suite                                                                                                      |
| `functions/package.json`                                                    | Dedicated emulator-команда и exact dev-only `firebase-tools@15.23.0`                                                                                 |
| `functions/package-lock.json`                                               | Воспроизводимое дерево testing dependencies и локального Firebase CLI                                                                                |
| `functions/src/content_studio/emulator/v2_authoring_rules.emulator.test.ts` | 32 server-only collections × operations, 78 legacy namespaces, nested/dynamic cases, matchmaking exception                                           |
| `tests/firestore_rules_security.test.ts`                                    | Semantic rules guards против broad recursive, sibling/wrapper OR, duplicate/generic wildcard и formatting bypass                                     |

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

npx jest --runTestsByPath tests/functions_firebase_cli_reproducibility_contract.test.ts tests/firestore_rules_security.test.ts --no-cache --runInBand
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
- Независимый review не нашёл новой функциональной регрессии в rules/test isolation. Последующий reproducibility audit открыл P2: `firebase` CLI брался из глобального окружения. P2 закрыт двумя focused commits: первый закрепил обнаруженную `15.15.0`, второй test-first обновил pin до latest `15.23.0` после security review; оба раза повторены clean install, local binary и security gates.

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

## 7. Незакрытые замечания, blockers и честные ограничения

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

Основной checkout на момент свежего аудита 2026-07-15:

- path: `C:\appsprojects\phraseman`;
- branch: `codex/release-integrated-20260715`;
- HEAD: `f324651b7709535e5bc951ff905f620dffb44fe5`;
- свежий `git status --short` снова показал множество чужих tracked/generated/untracked изменений в Admin, Functions build output, app, docs и конфигурации; старый снимок 673 entries больше не использовать как текущий счётчик, потому что main изменяется параллельно;
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

README содержит безопасные defaults для vertical map, видимости 32 titles, tap-to-talk, qualitative pronunciation feedback, Club placement, AI optionality, 6–10 chunks и KPI delayed transfer. Machine-readable DecisionRegistry v1 теперь существует и все `HYP-V2-001..008` маркированы `PRODUCT_HYPOTHESIS / unvalidated`; это не превращает гипотезы в доказанные нормы. Перед UI polish/rollout всё ещё нужны calibration/experiment receipts и новые immutable registry versions.

### 7.7 Старые документы не помечены superseded

Без banners будущая сессия может ошибочно выбрать 8–16 episodes, 32 отдельные Club missions, hold-to-talk, 90% transcript threshold или старый R10B authoring UI. До массовой работы стоит добавить scope/supersession banners без удаления истории.

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

### 8.6 Следующие contract tasks до Content Studio

- **1.2:** canonical activity, episode, curriculum, checkpoint, independent/delayed-probe and graph contracts.
- **1.3:** attempt, result, evidence, non-assessment, cardinality and delayed materialization contracts.
- **1.4:** thin Functions parser/mirror over the same fixtures and stable issue codes.

Только после GREEN этих задач начинается dedicated Content Studio block.

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
ec8ebed296a8d61e27a8ede1eae9510f8fcbae3a, canonical package a09f57da2d2442d114202bb3d52bf58abe917bb1,
identity contracts 77cf617afb4a33e75a830dfc9d78d133e4f928c2 и purity fix 362b65e7af4ea0b1db34f13007686f4e6e91d180.
DecisionRegistry policy amendment fac37e8da6c68653ca03034b2306461c2431ed83 и
Task 1.1A implementation a4245ccc1693a45711a41e678c5660a339755b17 также обязательны.
Канонические 14 paths уже tracked. Firebase CLI P2 закрыт commits abce49e1f + fd450e763;
не меняй pin без 351+61 gates. Task 1.1 даёт 47/47, Task 1.1A — 87/87 root
и 86/86 Functions, два финальных review PASS. Выполни umbrella Phase 01 / Task 1.2
строго test-first: activity.ts, episode.ts, curriculum.ts, validation.ts, valid E1 и invalid
fixtures, один episode contract test. Не создавай Functions mirror раньше Task 1.4 и не
дублируй evidence types, которые Task 1.3 обязан импортировать. Затем выполняй
1.3 → 1.4 и только после них dedicated
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
- 351 emulator и 61 combined reproducibility/static tests зелёные;
- firebase-tools pin закрыт на latest exact `15.23.0`; time-bounded dev-only audit exception описан в §7.1; общий baseline Functions build остаётся открытым;
- Task 1.1 identity/versioning закрыт commits `77cf617af` + `362b65e7a`; behavioral RED `35/3`, quality RED `5/42`, final `47/47`, spec PASS и quality APPROVED;
- Task 1.1A DecisionRegistry закрыт commits `fac37e8da` + `a4245ccc1`; первоначальный GREEN `55/54`, расширенные adversarial RED/исправления, финальный GREEN `87/87 root + 86/86 Functions`, два post-fix review PASS;
- все 11 V2 docs, оба плана и AGENTS protocol сохранены docs-only commit и присутствуют в clean pilot worktree;
- exact next implementation — umbrella Phase 01 / Task 1.2 activity/episode/curriculum contracts; Content Studio Task 1 идёт только после 1.2–1.4;
- UI, mass generation, production rollout и legacy retirement сейчас запрещены порядком зависимостей.

---

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

## 12.74 Immutable binding hardening and independent review findings

The next RED/GREEN slice corrected three concrete boundary defects: the immutable Episode Firestore document path now follows the normative `<draftId>__r<revision>` identity; the resolver always checks the exact content-addressed Storage path (even when a custom validator is absent) and checks body `draftId/episodeId/revision/ordinal/chapterId` against the pinned ref; and Firestore-backed Season transactions expose `tx.get` read contexts so EpisodeRevision and DecisionRegistry reads can participate in the same transaction snapshot instead of using unrelated `db.get()` calls. The production resolver now requires the normative `episode-authoring-body.v1` top-level shape, while the runtime `v2-episode-contract.v1` validator remains separately available.

Fresh focused evidence after this slice: Functions **4 suites / 8 tests PASS** and targeted strict TypeScript **PASS**. The independent reviews still classify the full Task 2.2 acceptance as **NOT PASS** for three remaining P1s: nested canonical authoring-body validation and complete body↔record identity, actual Storage byte download/re-hash (the current adapter checks metadata hash/generation only and still treats the Firestore body as the body source), and callable-level emulator/integration invocation with seeded EpisodeRevision/DecisionRegistry/App Check/owner/CAS assertions. These are not hidden or waived. The large unrelated formatting churn in `decision_registry.ts` was explicitly reverted; only the required `sha256Utf8` export remains as a minimal diff. No Admin files were changed.

**Exact next executable task:** add a verified immutable Storage reader that downloads canonical bytes, recomputes the hash, parses the authoring body, and returns it separately from the Firestore record; then add RED tests for nested graph/activity/voice/delayed/checkpoint validation and callable invocation against seeded emulator documents. Do not mark Task 2.2 complete or begin Task 2.3 until fresh spec and adversarial reviews report no P1.

## 12.75 Storage-body source and transaction snapshot implementation

The implementation now carries a transaction read context into both EpisodeRevision and DecisionRegistry resolvers, uses the normative draft-based Firestore revision key, enforces body identity against the pinned Episode ref, and makes the default Storage reader download and parse the canonical object body rather than returning the Firestore body as authoritative. Focused verification after the changes is **4 suites / 9 tests PASS**, targeted strict TypeScript **PASS**, and `git diff --check` **PASS**. The current work is intentionally still uncommitted because the independent reviewers found remaining schema/release blockers.

The EpisodeDraft and SeasonDraft transaction repositories also now construct their persisted draft records from server-owned schema/identity/status fields (`status: draft`) instead of spreading caller-supplied record metadata.

Remaining blockers are explicit: the authoring-body validator is still shallow for nested activity/graph/voice/delayed/checkpoint contracts; the in-memory authoring records and resolver shape are not yet aligned to the normative nested `record.object`/provenance envelope; raw downloaded-byte hash verification needs an explicit contract/test; callable emulator invocation with seeded records/App Check/owner/CAS is absent; and the draft repository still needs server construction/rejection of forged record status/identity instead of spreading caller-supplied record fields. No Admin files were changed.

**Exact next executable task:** write RED tests for canonical nested `record.object`/provenance and forged draft-record status/identity, implement server-owned record construction plus raw-byte canonical hash verification, then build the exported-callable emulator harness. Fresh spec and adversarial reviews must be rerun before any commit or Task 2.3 transition.

## 12.76 Nested-shape and raw-byte RED/GREEN slice

Added RED coverage for an empty nested graph shell and for raw downloaded bytes whose hash differs from the pinned content hash. The validator now rejects empty graph/loop/assessment/capstone/mastery/voice shells; ordinary episodes may omit the normative optional `checkpointContract`. `verifyCanonicalEpisodeObjectBytes` checks the downloaded serialized bytes, parses JSON, and verifies the canonical body hash. The Firestore Storage reader receives the expected hash and uses this verified body as the returned artifact body. Server-owned draft record construction remains in place.

Fresh focused evidence: Functions **4 suites / 10 tests PASS**, targeted strict TypeScript **PASS**, and `git diff --check` **PASS**. Fresh spec review remains **NOT PASS**: the validator is still not a full nested canonical validator; the resolver artifact is not yet the normative `{body, record, lifecycle}` with nested `record.object/provenance/byteSize`; byte-length/non-UTF-8 and transaction-scoped Storage evidence are not yet proven; and callable-level emulator invocation with Auth/App Check/owner/CAS remains absent. No Admin files were changed and no release/deploy was performed.

**Exact next executable task:** introduce the typed canonical EpisodeRevision record/lifecycle envelope and a strict nested validator (or a documented shared canonical validator adapter), then add the seeded exported-callable emulator harness. Keep Task 2.2 partial until both fresh reviewers report no P1.

## 12.77 Identity and authorization hardening review

The latest bounded fixes also reject EpisodeDraft identity mutation (`episodeId/seasonId/ordinal/chapterId` must stay bound to the current head), reject cross-season Episode bodies when pinning a Season, construct draft records server-side, and require `auth.token.admin === true` rather than accepting truthy non-boolean claims. Focused Functions verification is now **4 suites / 11 tests PASS** with targeted strict TypeScript **PASS**.

Fresh independent reviews remain **NOT PASS**. The normative blockers are now enumerated precisely: the flat resolver artifact must become `{body, record, lifecycle}` with nested `record.object` (`byteSize`, generation, hash, path), provenance and createdAt; the Episode and Season authoring bodies need their complete canonical fields and deep nested validation; DecisionRegistry needs the same immutable body/record/object verification; first-save/init and exported-callable emulator coverage are missing; and raw-byte malformed UTF-8/byte-size cases still need explicit evidence. No Admin files were changed and no commit/release was made.

**Exact next executable task:** add canonical shared `EpisodeRevisionRecord`/`EpisodeLifecycleHead` adapters and strict body/Season schema validators with RED fixtures, then implement the first-save callable/emulator harness. Do not transition to Task 2.3 or claim Task 2.2 complete while these P1s remain.

## 12.67 Resolver hardening and server-owned boundary evidence

The immutable EpisodeRevision artifact contract now includes the fetched body and immutable Storage generation; the resolver recomputes `hashCanonicalBody(artifact.body)` and rejects metadata-only or hash-poisoned artifacts. The Season transaction adapter now requires a resolvable DecisionRegistry for `full_season` saves and resolves all pinned EpisodeRevision refs before compare-and-set. Existing `firestore.rules` already has explicit `allow read, write: if false` blocks for the V2 authoring/revision/lifecycle/review collections; the emulator contract lists these server-only collections.

Fresh focused verification after this hardening: root **2 suites / 4 tests PASS**; Functions authoring/transaction matrix **4 suites / 5 tests PASS**; strict targeted TypeScript **PASS**. This still does not prove production callable wiring, Storage generation reads, or full canonical Episode validation, so Task 2.2 remains partial and uncommitted.

**Exact next executable task:** inspect and connect the real Functions callable/export and Storage/Admin SDK transaction path, reusing the existing server-only Firestore rules; add the callable and emulator RED tests before implementation. Do not touch Admin UI artifacts in this session.

## 12.78 First-save and identity boundary slice

The authoring callable envelope now permits the explicit create-only pair `expectedRevision: 0` plus an empty fingerprint. EpisodeDraft and SeasonDraft transaction repositories both expose idempotent `createIfAbsent` paths for missing heads; updates still require the existing owner/CAS head. Episode first-save validates the draft shape, persisted records are server-constructed with `status: draft`, Episode identity mutation is rejected, cross-season Episode pins are rejected, and admin authorization requires boolean `admin === true`.

Latest bounded evidence: Functions **5 suites / 13 tests PASS**, targeted strict TypeScript **PASS**, and the prior Firestore rules emulator remains **351/351 PASS**. Fresh reviews still classify full Task 2.2 as **NOT PASS**: canonical `{body, record, lifecycle}` plus nested `record.object/provenance/byteSize` is not implemented; Season/DecisionRegistry deep schemas remain incomplete; callable emulator Auth/App Check/owner/CAS invocation is missing; raw-byte UTF-8/byte-size evidence is incomplete; and first-save needs end-to-end callable coverage. No Admin files changed, no deploy/release occurred, and no commit was created while P1s remain.

**Exact next executable task:** implement canonical nested EpisodeRevision/Season/DecisionRegistry record adapters with RED fixtures, then run exported Episode and Season create/update callables through the emulator with seeded immutable Storage/Firestore records.

## 12.79 Canonical envelope and first-save hardening

Production EpisodeRevision resolution now requires the canonical Firestore envelope with `body`, `record.schemaVersion = episode-authoring-record.v1`, nested content-addressed `record.object` including `byteSize`, typed lifecycle head, non-empty provenance creator/timestamp, matching record/lifecycle identity, exact object path, and matching content hash. The resolver maps this canonical record to its internal pinned view only after the Storage reader returns the expected body/hash/generation/byteSize. Raw byte decoding is fatal for malformed UTF-8. First-save Season creation now performs the same immutable EpisodeRevision and full-season DecisionRegistry resolution as updates before `createIfAbsent`.

Fresh focused evidence: Functions **5 suites / 17 tests PASS**, targeted strict TypeScript **PASS**. The independent reviews still leave P1s: nested Episode/Activity/voice/delayed/checkpoint validation is not yet the full canonical runtime validator; DecisionRegistry resolver still needs strict record/object/Storage verification; byte-size and generation-pinned read need full emulator evidence; and exported callable invocation with seeded Firestore/Storage/Auth/App Check/CAS is still absent. The canonical envelope adapter is therefore bounded and uncommitted; no Admin files, deployment, or release changed.

**Exact next executable task:** reuse the existing strict DecisionRegistry validator/storage resolver, add full nested canonical Episode validator delegation and malformed/byte-size tests, then implement the seeded exported-callable emulator harness.

## 12.80 Envelope regression fix and review status

The canonical envelope slice now has regression coverage for a flat record rejection, nested `record.object` path/hash/generation/byteSize, provenance creator/timestamp, lifecycle identity, fatal malformed UTF-8, and first-save Season immutable-ref/DecisionRegistry checks. A fresh spec review caught and the writer fixed a TDZ bug in envelope validation before any commit. Current focused verification is **5 suites / 17 tests PASS** with targeted strict TypeScript **PASS**.

The slice remains **NOT PASS** for production: nested canonical Episode/Activity/voice/delayed/checkpoint validation is still a shallow adapter; DecisionRegistry resolver still needs the existing strict validator plus immutable Storage body/object verification; lifecycle enum/provenance exactness and byte-size/generation-pinned reads need completion; and no exported callable emulator invocation with seeded Auth/App Check/CAS exists. The canonical body/record/lifecycle split is represented at the adapter boundary but not yet fully enforced in the persisted production schema. No Admin files, deploy, or release changed.

**Exact next executable task:** wire `validateDecisionRegistry`/immutable resolver into the Firestore DecisionRegistry path, replace shallow Episode validation with the canonical nested validator adapter, then add the seeded callable emulator integration and lifecycle transition tests.

## 12.81 Strict DecisionRegistry adapter

The Firestore DecisionRegistry resolver now calls the existing strict `validateDecisionRegistry` implementation and rejects malformed/raw-cast documents. Added RED/GREEN coverage for a forged registry document. Current focused Functions evidence is **5 suites / 18 tests PASS**, targeted strict TypeScript **PASS**. This closes the raw-cast acceptance defect for the Firestore document shape, but does not yet prove a Storage-backed DecisionRegistry object read/generation pin or the full callable emulator path.

The remaining P1s are explicit: authoring Episode nested validation is still shallower than the canonical Activity/graph/voice/delayed/checkpoint contracts; DecisionRegistry Storage bytes/generation still need a production reader; first-save/callable Auth/App Check/CAS needs seeded emulator evidence; lifecycle/provenance exact-key and timestamp contracts need tightening; and generation-pinned download must be added to avoid metadata/download races. No Admin files changed, no deploy/release, no commit while review-gate remains open.

**Exact next executable task:** add the immutable DecisionRegistry Storage reader with strict byte/hash/generation binding, then implement the seeded callable emulator harness and rerun fresh spec/red-team reviews.

## 12.82 DecisionRegistry ref binding review

The Firestore DecisionRegistry adapter now additionally compares the validated record ref (`id/version/contentHash`) to the caller’s pinned ref before returning it. Focused verification remains **5 suites / 18 tests PASS** and targeted strict TypeScript **PASS**.

Fresh independent reviews still report the unresolved production blockers: DecisionRegistry canonical Storage bytes/generation are not read or pinned; Episode metadata/download is not generation-preconditioned; the authoring Episode nested validator remains shallow; and no exported callable emulator evidence exists for Auth/App Check/owner/CAS/create/update/replay. Task 2.2 remains partial and uncommitted; Admin and release surfaces remain untouched.

**Exact next executable task:** implement shared immutable-object readers for Episode and DecisionRegistry with fatal UTF-8, canonical hash, exact byte size, and generation preconditions, then build the seeded callable emulator harness.

## 12.83 Shared immutable Storage reader and metadata binding

### Mission and user intent

Продолжить утверждённый Learning V2 до полного релиза: speaking-first 32-эпизодный сезон с разделёнными звёздами и доступом, Speaking Club как capstone, Personal Review, диалоги, масштабируемые Content Studio и локализация; сохранить legacy до Phase 14 и оставлять подробный самодостаточный handover для каждой следующей сессии. В этом срезе закрывается только integrity-boundary для immutable Episode/DecisionRegistry объектов; весь V2 ещё не завершён.

### Authority and precedence

Приоритет: explicit owner instruction и `AGENTS.md`; затем этот handover; `docs/v2/README.md`; normative `docs/v2/00`–`08`; планы `2026-07-14-phraseman-v2-pilot-season.md` и `2026-07-14-phraseman-v2-content-studio.md`; затем код и тесты как evidence. Админские untracked-артефакты принадлежат другой сессии и не изменялись. Нерешённый конфликт остаётся: §08 требует canonical body только в immutable Storage, тогда как текущий Firestore envelope ещё требует дублирующий `body`.

### Full phase/task status

| Scope | Status | Evidence / exact gate |
|---|---|---|
| Phase 00–01, Task 1.2C | DONE/recorded | Prior handover evidence; no changes in this slice |
| Phase 02–05: curriculum, voice, stars/access, runtime | PARTIAL | Prior bounded commits; full pilot/release gates not closed |
| Phase 06–13: integrations, QA, rollout | NOT STARTED/PARTIAL | Callable emulator, deep schema, rollout evidence missing |
| Phase 14 legacy decision | NOT STARTED | Legacy must remain preserved |
| Content Studio Tasks 0–1 | DONE/recorded | Existing authoring seams |
| Content Studio Tasks 2.1–2.2 | PARTIAL / IN PROGRESS | 6 focused suites / 21 tests pass; reviewers still report P1 |
| Content Studio Tasks 2.3–15 | NOT STARTED | Blocked by Task 2.2 acceptance gate |

### What changed in this slice

Added `functions/src/content_studio/immutable_object_reader.ts`. It reads Storage metadata, requires the pinned generation and metadata hash, downloads with `{ ifGenerationMatch: expectedGeneration }`, checks exact byte size, fatal UTF-8, raw SHA-256, JSON parsing, and canonical-body hash. Episode and DecisionRegistry Firestore resolvers now use this common reader; DecisionRegistry additionally compares returned content hash, generation, and byte size against its pinned record before revalidating the Storage body. Added negative/positive tests in `immutable_object_reader.test.ts` and updated Episode reader expectations. No Admin file, Firestore data, deployment, or release was touched.

### Verification evidence

- RED/review finding: metadata-then-unconditioned-download race and missing DecisionRegistry Storage read were reproduced by two independent reviewers.
- GREEN command, cwd `functions`: `npx jest --runInBand src/content_studio/immutable_object_reader.test.ts src/content_studio/episode_revision_resolver.test.ts src/content_studio/firestore_authoring_store.test.ts src/content_studio/authoring_transaction_repository.test.ts src/content_studio/season_authoring_transaction_repository.test.ts src/admin_content_studio_authoring.test.ts` → **6 suites / 21 tests PASS**.
- Targeted TypeScript, same cwd: `npx tsc --noEmit --strict --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck src/content_studio/immutable_object_reader.ts src/content_studio/episode_revision_resolver.ts src/content_studio/firestore_authoring_store.ts src/content_studio/authoring_transaction_repository.ts src/content_studio/season_authoring_transaction_repository.ts src/admin_content_studio_authoring.ts` → **PASS**.
- `git diff --check` → **PASS** before the latest test-only addition.
- Spec reviewer: core reader binding PASS; remaining P1 callable emulator, deep Episode schema, body-only Storage split.
- Adversarial reviewer: core race/hash/generation binding PASS; remaining P1 callable emulator and persisted body split; metadata comparison was then added.

### Repository state and preservation

Worktree: `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`; branch `codex/learning-v2-pilot`; HEAD `23c71a117`; changes are uncommitted because Task 2.2 still has P1 findings. Main checkout is `C:\appsprojects\phraseman` and remains untouched. Preserve these pre-existing/out-of-scope untracked Admin files: `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md`, `tests/admin_v2_lesson_stage_transfer_contract.test.ts`. This session added the reader and its test; do not stage Admin files.

### Open findings and failed approaches

The initial shared-reader implementation failed targeted TypeScript because Firebase metadata uses `string | number` and nullable custom metadata; the interface was widened to match the SDK. The first test fixture also failed tuple typing and was corrected. Full `functions/tsc` remains noisy with unrelated pre-existing missing modules in `src/index.ts`; only the strict targeted command above is valid evidence. Open P1s: exported callable emulator flow with Auth/App Check/owner/CAS/create/update/replay; complete nested Episode Activity/Graph/Learning/Voice/Delayed/Checkpoint validation; and strict body-only Storage envelope split. P2s: exact-key/ISO provenance/lifecycle validation and additional negative reader cases.

### Invariants

Do not use the project OpenAI key; do not edit Admin transfer files; do not remove legacy; do not write Firestore, deploy, publish, or release; keep one writer and read-only reviewers; preserve local-first, auth/App Check, owner/CAS, privacy, accessibility, performance, and immutable hash/generation invariants. A passing unit matrix does not authorize Task 2.3.

### Exact next executable task packet

**Task 2.2 continuation — seeded callable emulator and canonical contract closure.** First add RED tests that call the exported Episode/Season authoring callables through the emulator with seeded Firestore/Storage records and Auth/App Check/owner/CAS/create/update/replay assertions. In parallel, add adversarial malformed nested Episode body fixtures and decide (per §08) whether the Firestore envelope must reject `body` and store it only in Storage. Modify only the Content Studio callable/resolver/validator tests and the exact connected implementation files. Non-goals: Admin UI transfer, stars economy, legacy removal, deploy/release.

Acceptance requires: callable integration proves auth/App Check/owner/CAS and first-save/update/replay; nested canonical validator rejects malformed graph/activity/voice/delayed/checkpoint data; persisted envelope matches body-only Storage contract; immutable reader tests cover metadata hash, generation, byte size, UTF-8, raw/canonical hash and precondition failure; focused Jest, targeted strict TypeScript, emulator rules, fresh spec review, and fresh adversarial review all pass with no P1. Intended commit subject after the gate: `feat(v2): prove content studio callable lifecycle`.

### Startup commands for next session

```powershell
Set-Location 'C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot'
git status --short
git branch --show-current
git rev-parse HEAD
git worktree list
Get-Content -Raw -Encoding UTF8 docs/v2/HANDOVER.md
Get-Content -Raw -Encoding UTF8 docs/v2/README.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md
Set-Location functions
npx jest --runInBand src/content_studio/immutable_object_reader.test.ts src/content_studio/firestore_authoring_store.test.ts
```

### Final state declaration

Verified complete in this slice: shared immutable reader, generation-preconditioned download, metadata/content hash/byte-size checks, fatal UTF-8, raw/canonical hash checks, Episode/DecisionRegistry wiring, 6 suites/21 tests, targeted strict TypeScript. Partial: Task 2.2 and all downstream V2 phases. Unverified: callable emulator lifecycle, deep nested schema, body-only Storage persistence, rollout/release. No commit, push, deploy, or release was made. Exact next action is the Task 2.2 callable/nested-schema RED packet above; keep the global V2 goal active.

## 12.84 Exported authoring callable emulator lifecycle

### Mission and authority

Цель программы не меняется: довести speaking-first Learning V2 до 32 эпизодов, звёзд/доступа, Speaking Club capstone, Personal Review, диалогов, Content Studio, генератора и локализации, rollout/release, сохранив legacy до Phase 14 и передавая следующей сессии полный handover. Авторитеты и порядок прежние: `AGENTS.md` → этот handover → `docs/v2/README.md` → normative `docs/v2/00`–`08` → оба плана 2026-07-14 → код/тесты. Админский перенос остаётся отдельной сессией.

### Phase/task status table

| Scope | Status | Evidence |
|---|---|---|
| Phase 00–01 / Task 1.2C | DONE/recorded | Prior handover, unchanged here |
| Phase 02–05 (curriculum, voice, stars/access, runtime) | PARTIAL | Existing bounded work; pilot gates remain |
| Phase 06–13 (integration, QA, rollout) | NOT STARTED/PARTIAL | Callable slice now has emulator evidence; full release not proven |
| Phase 14 legacy decision | NOT STARTED | Legacy preserved |
| Content Studio Tasks 0–1 | DONE/recorded | Existing seams |
| Task 2.1 | PARTIAL | Authoring boundary and repositories exist |
| Task 2.2 | IN PROGRESS / PARTIAL | Exported Episode callable emulator: 2 tests pass; P1 schema/body split remains |
| Tasks 2.3–15 | NOT STARTED | Depend on Task 2.2 closure |

### Changes and verification

`functions/src/content_studio/emulator/v2_authoring_callables.emulator.test.ts` now runs the real exported `adminSaveV2EpisodeDraft.run` against Firestore Emulator: first-create, CAS update, stale replay rejection, persisted owner, and direct client-read denial. `functions/package.json` adds `test:emulator:v2-authoring-callables`. `admin_content_studio_callables.ts` now derives `enforceAppCheck` from the shared `ENFORCE_APP_CHECK` policy instead of hard-coding it. The callable-boundary unit test now covers create/update/replay preconditions.

Evidence:

- `npm run test:emulator:v2-authoring-callables` (cwd `functions`) → **1 suite / 2 tests PASS**; emulator started and stopped successfully. This invokes the exported callable `.run` with auth context and real Firestore emulator transactions; it does not yet prove an HTTP client App Check token exchange.
- `npm run test:emulator:v2-authoring-rules` → **1 suite / 351 tests PASS**; direct client writes/reads remain denied for server-only authoring collections.
- Focused Jest boundary matrix → **6 suites / 16 tests PASS**.
- Targeted strict TypeScript including callable emulator test → **PASS**.
- `git diff --check` → **PASS**.

The first emulator attempt failed because the test used the wrong relative import, attempted a rules-protected read for server verification, and returned a `RulesTestEnvironment` callback value; all three were corrected. No production data, deployment, or Admin artifact was changed. Current branch/worktree remain `codex/learning-v2-pilot` / `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`, HEAD `23c71a117`, with changes uncommitted while P1s remain. Preserve untracked `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

### Remaining P1 and invariants

This is stronger callable evidence, but Task 2.2 is still **NOT PASS**: the emulator calls `.run` directly, so an actual HTTP/App Check rejection path is still unverified; Season callable with seeded immutable Episode/DecisionRegistry objects is not covered; nested Episode canonical validation is shallow; and the Firestore envelope still requires duplicated `body` despite the body-only-in-Storage rule. Do not remove legacy, edit Admin transfer files, use the project OpenAI key, write production Firestore, deploy, or release.

### Exact next executable task

**Task 2.2 continuation:** add HTTP-level callable emulator coverage (or an explicit callable protocol harness) proving missing/invalid App Check rejection and valid token acceptance, then seed immutable EpisodeRevision and DecisionRegistry Storage/Firestore records and run `adminSaveV2SeasonDraft` create/update/replay. In the same bounded slice, add RED fixtures for malformed nested graph/activity/voice/delayed/checkpoint bodies and enforce the body-only Storage envelope split. Required gates: focused Jest, both emulator commands, targeted strict TypeScript, fresh spec/adversarial reviews with no P1. Intended commit: `test(v2): prove authoring callable security lifecycle`.

### Startup commands and final state

```powershell
Set-Location 'C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot'
git status --short
git branch --show-current
git rev-parse HEAD
Get-Content -Raw -Encoding UTF8 docs/v2/HANDOVER.md
Set-Location functions
npm run test:emulator:v2-authoring-callables
npm run test:emulator:v2-authoring-rules
npx jest --runInBand src/admin_content_studio_authoring.test.ts src/admin_content_studio_callables.test.ts
```

Verified: exported Episode callable emulator lifecycle and Firestore server-only rules. Partial/unverified: HTTP App Check, Season callable immutable refs, deep nested schema, body-only persistence, downstream V2 phases and release. No commit/push/deploy/release. Keep global goal active.

## 12.85 Callable security correction and release seam

The callable slice was adversarially rechecked. The review proved that v2 `.run()` invokes the handler directly and therefore cannot prove transport-level App Check; the test evidence is explicitly limited to handler/Auth/CAS/Firestore behavior. Production wiring was corrected to fail closed: `admin_content_studio_callables.ts` now enables App Check unless `ENFORCE_APP_CHECK_CONTENT_STUDIO=false` is an explicit local/dev override. Added exported-boundary tests for missing auth and non-editor roles. Added `deploy:safe:v2-authoring` so the two exported V2 authoring callables have an explicit safe deployment seam; no deployment was executed.

Latest evidence: `npm run test:emulator:v2-authoring-callables` → **1 suite / 3 tests PASS**; focused callable unit tests → **2 suites / 6 tests PASS**; targeted strict TypeScript for callable and emulator test → **PASS**; `git diff --check` → **PASS**. Remaining P1s are unchanged and explicit: no HTTP Functions/App Check transport test, no Season callable with seeded immutable EpisodeRevision/DecisionRegistry Storage, shallow nested Episode validator, and Firestore body duplication versus the body-only-in-Storage contract. The new deploy script is not a release approval. Worktree remains uncommitted at HEAD `23c71a117`; Admin files remain untouched.

**Exact next executable task:** start Firestore + Storage + Functions emulator (or an equivalent HTTP callable harness), submit missing/invalid/valid App Check cases, seed immutable EpisodeRevision and DecisionRegistry objects, and run `adminSaveV2SeasonDraft` create/update/replay. Then close nested-schema/body-only RED/GREEN and rerun both independent reviews. Do not deploy or advance Task 2.3 until all P1s are closed.

## 12.86 Release guard for authoring App Check

The final review found that an explicit production `ENFORCE_APP_CHECK_CONTENT_STUDIO=false` could still disable the fail-closed authoring policy. Added `scripts/assert_v2_authoring_release_config.mjs`; `deploy:safe:v2-authoring` now runs this guard before build/deploy and exits non-zero on that override. The reusable `createAdminSaveV2DraftCallable` helper was aligned to the same fail-closed expression, so future reuse cannot silently reopen App Check.

Evidence: default guard prints `V2 authoring release config: App Check fail-closed`; the same command with `ENFORCE_APP_CHECK_CONTENT_STUDIO=false` prints the refusal and exits `1`; focused callable tests are **2 suites / 7 tests PASS**; targeted strict TypeScript and `git diff --check` PASS. A real `npm run build`/deploy remains **not PASS** because the repository currently reports **9** pre-existing missing-module/export errors in `functions/src/index.ts`; this is a release blocker, not hidden by the new script. No deploy or production mutation occurred.

Task 2.2 remains partial: `.run()` is not HTTP App Check evidence; Season + Storage/DecisionRegistry lifecycle and deep nested schema/body-only envelope are still open P1s. Exact next task is unchanged from 12.85: run a Functions/Storage-capable HTTP callable harness, seed Season immutable objects, close schema split, then fresh reviews. Preserve Admin untracked files and do not commit while P1s remain.

## 12.87 Season callable with real Storage Emulator object

Added `functions/src/content_studio/emulator/v2_authoring_season_callables.emulator.test.ts`. It starts Firestore and Storage emulators, seeds canonical EpisodeRevision bytes with content-addressed path, metadata hash, generation, and byte size, seeds the matching Firestore envelope, and invokes the exported `adminSaveV2SeasonDraft.run` for a vertical-slice Season. This proves the Season repository actually resolves the immutable Episode body through Storage before creating the Season head. Added `test:emulator:v2-authoring-season` using `--only firestore,storage`.

Evidence: `npm run test:emulator:v2-authoring-season` → **1 suite / 1 test PASS**; focused Functions matrix → **6 suites / 17 tests PASS**; targeted strict TypeScript including both emulator tests → **PASS**; `git diff --check` → **PASS**. The first run exposed a default-admin-app initialization defect in the fixture; it was corrected and rerun successfully. Emulator emitted only known Java metadata/network warnings; no source or production data was changed.

This closes the previously missing Season + immutable Episode Storage unit/emulator seam, but not the full Task 2.2 gate. `.run()` still bypasses deployed HTTP callable transport/App Check token validation; DecisionRegistry Storage is not seeded because vertical-slice composition does not require the registry; no Season update/replay or wrong-owner case is covered; nested Episode validation remains shallow; and persisted Firestore envelopes still duplicate `body` contrary to the body-only-in-Storage normative split. Full `npm run build` remains blocked by the nine pre-existing `functions/src/index.ts` errors recorded in 12.86. No commit, deploy, or release.

**Exact next executable task:** add a Functions-emulator HTTP protocol harness (or a documented equivalent) for missing/invalid/valid App Check, then extend the Storage test to `full_season` with seeded DecisionRegistry bytes and Season create/update/stale replay/wrong-owner cases. In parallel close nested schema and body-only envelope RED/GREEN. Fresh spec/adversarial reviews must report no P1 before Task 2.3 or any release action.

## 12.88 Canonical Episode revision fingerprint binding

The normative fingerprint formula from §08 is now encoded as `episodeRevisionFingerprint`: `sha256(canonicalJsonV1({ schemaVersion: 'authoring-revision-fingerprint.v1', entityType: 'episode', entityId: draftId, revision, contentHash }))`. `validateEpisodeRevisionEnvelope` rejects a regex-valid but forged `record.revisionFingerprint`; the Storage/Season emulator fixture and Firestore resolver fixture now use the canonical value. Targeted strict TypeScript passed and the Firestore+Storage Season emulator rerun passed **1 suite / 1 test**.

This closes a concrete stale-pin bypass, but the bounded Task 2.2 gate remains open: injected fake resolvers and draft records still need a broader canonical fingerprint migration, HTTP App Check transport is unverified, full-season DecisionRegistry/Season update-replay-owner cases are missing, nested Episode validation is shallow, and the Firestore body-only Storage split is unresolved. No commit, deploy, or release; Admin artifacts remain untouched.

**Exact next executable task:** migrate all remaining authoring revision fixtures/constructors to the normative fingerprint helper, add a negative forged-fingerprint RED test, then extend the emulator harness to full-season DecisionRegistry and Season CAS/owner/replay. Keep the HTTP App Check and deep-schema P1s explicit.

## 12.89 Fingerprint trust-boundary closure

The shared `assertExactImmutableEpisodeRevision` now recomputes the canonical Episode revision fingerprint as well as comparing it to the pinned ref. This closes the injected/miswired-resolver bypass identified by adversarial review. Synthetic repository fixtures were migrated to `episodeRevisionFingerprint`; a RED test rejects a regex-valid forged envelope fingerprint. Focused resolver/Season/Firestore evidence is **3 suites / 13 tests PASS**, targeted strict TypeScript PASS, and the Firestore+Storage Season emulator rerun is **1 suite / 1 test PASS**.

Remaining P1s are unchanged: HTTP transport/App Check, full-season DecisionRegistry and Season update/replay/owner coverage, deep nested Episode schema, body-only Storage envelope, and full build's nine pre-existing index errors. Do not claim Task 2.2 or release completion. No commit/deploy/release; Admin transfer files remain untouched.

**Exact next executable task:** migrate any remaining authoring constructors to the canonical fingerprint helper, then extend the Storage emulator fixture to full-season DecisionRegistry and Season CAS/owner/replay before tackling HTTP App Check transport and deep schema validation.

## 12.90 Fingerprint review residual

Fresh independent reviews confirm the canonical fingerprint formula and forged-envelope rejection. The positive revision constraint (`revision >= 1`) is now enforced by the Episode envelope validator. Focused resolver/Season/Firestore tests remain green after this correction.

One trust-boundary P1 remains deliberately open: `ImmutableEpisodeRevisionArtifact.record` and `.lifecycle` are optional, so an injected/miswired resolver can return a flat hash-valid artifact without canonical provenance/lifecycle envelope and still pass `assertExactImmutableEpisodeRevision`. Production Firestore wiring supplies the envelope, but the shared assertion must be hardened before treating Task 2.2 as complete. Deep nested schema, HTTP App Check, full-season DecisionRegistry/Season lifecycle, and body-only Storage split remain open as recorded above. No commit/release/deploy.

**Exact next executable task:** make the immutable artifact record/lifecycle mandatory at the shared assertion boundary, add RED coverage for a flat injected artifact, then migrate the remaining fixtures and continue full-season/HTTP harness work.

## 12.91 Mandatory immutable envelope at shared assertion boundary

`assertExactImmutableEpisodeRevision` now requires both `record` and `lifecycle` and revalidates the complete canonical `{ body, record, lifecycle }` envelope with `validateEpisodeRevisionEnvelope`. A flat injected resolver artifact is rejected by a new RED regression test. The Season repository fake fixture was upgraded with canonical record/object/provenance/lifecycle fields rather than bypassing the boundary.

Evidence: focused matrix **7 suites / 26 tests PASS**; Firestore+Storage Season emulator **1 suite / 1 test PASS**; targeted strict TypeScript **PASS**; `git diff --check` **PASS**. Reviewers confirmed the fingerprint formula and envelope binding; no commit, deploy, or release was made.

Remaining P1s: HTTP App Check transport; full-season DecisionRegistry and Season update/replay/owner coverage; deep nested Episode validation; body-only Storage persistence; and the nine pre-existing full-build errors. Synthetic root-level test fixtures remain intentionally bounded fake seams and are not production evidence. Admin transfer artifacts remain untouched.

**Exact next executable task:** add full-season DecisionRegistry immutable Storage seed and Season create/update/stale replay/wrong-owner emulator cases, then implement the HTTP callable/App Check harness. Keep schema/body-only blockers explicit and do not advance Task 2.3.

## 12.92 Cross-binding of immutable envelope and pinned ref

The shared Episode assertion now fail-closes not only on envelope presence but also on cross-object consistency: `record` identity/hash/fingerprint must equal the pinned ref; `record.object` path/content hash/generation must equal the returned artifact and body hash; lifecycle identity/fingerprint must equal the ref; lifecycle status must be `approved`. Added a RED regression where a self-validating envelope for another entity is returned alongside a correct top-level artifact; it is rejected as `season_episode_revision_envelope_mismatch`.

Evidence: resolver/Season/Firestore focused subset **3 suites / 15 tests PASS**; Season Firestore+Storage emulator **1 suite / 1 test PASS**; targeted strict TypeScript and `git diff --check` PASS. Fresh reviews are pending for this exact cross-binding change. No commit, deploy, or release.

Remaining P1s: HTTP App Check transport, full-season DecisionRegistry and Season update/replay/owner cases, deep nested Episode schema, body-only Storage persistence, and nine pre-existing full-build errors. Keep synthetic root fixtures clearly bounded; do not claim full V2 completion or advance Task 2.3.

**Exact next executable task:** after review, extend the emulator to full-season DecisionRegistry and Season CAS/owner/replay; then build the HTTP callable transport harness and close nested schema/body-only Storage contracts.

## 12.93 Full-season DecisionRegistry and Season CAS evidence

### Mission and user intent

The global objective is unchanged: complete Learning V2 from the approved plans through the 32-episode speaking-first season, stars/access, voice activities, Speaking Club capstone, Personal Review, dialogs, scalable Content Studio/generator/localization, integration, rollout and release gates, while preserving legacy until the explicit Phase 14 decision. This bounded slice closes only the full-season immutable-reference and authoring transaction evidence; it does not claim Task 2.2 or V2 completion.

### Authority and precedence

Explicit owner instruction and `AGENTS.md` remain first; then this living handover; `docs/v2/README.md`; normative `docs/v2/00`-`08`; the two approved 2026-07-14 plans; then implementation/tests as evidence. The separate Admin transfer artifacts are owned by another session and were not edited.

### Full phase/task status

| Scope | Status | Evidence |
|---|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded | Prior handover evidence; untouched in this slice |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL | Existing bounded work; full pilot/release gates remain open |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL | Full-season authoring evidence improved; release/device gates absent |
| Phase 14 legacy decision | NOT STARTED | Legacy remains preserved |
| Content Studio Tasks 0-1 | DONE/recorded | Existing seams |
| Task 2.1 | PARTIAL | Authoring boundary/repositories exist |
| Task 2.2 | PARTIAL / IN PROGRESS | Full-season happy path is proven; HTTP App Check and deep canonical schema remain P1 |
| Tasks 2.3-15 | NOT STARTED | Must follow Task 2.2 acceptance gate |

### What changed

`functions/src/content_studio/emulator/v2_authoring_season_callables.emulator.test.ts` now seeds 32 unique Episode immutable objects and Firestore envelopes, a canonical DecisionRegistry body/record plus Storage object, and exercises `adminSaveV2SeasonDraft.run` first-save, CAS update, wrong-owner rejection and stale replay rejection. The test also verifies persisted owner. The fixture uses canonical path/hash/generation/byte-size/fingerprint wiring, but intentionally shallow Episode bodies; it is not deep schema evidence. No Admin file, production Firestore, deployment, release, or legacy behavior was changed.

### Verification evidence

- Focused Functions Jest: `npx jest --runInBand src/admin_content_studio_authoring.test.ts src/admin_content_studio_callables.test.ts src/content_studio/immutable_object_reader.test.ts src/content_studio/episode_revision_resolver.test.ts src/content_studio/firestore_authoring_store.test.ts src/content_studio/authoring_transaction_repository.test.ts src/content_studio/season_authoring_transaction_repository.test.ts --no-cache` -> **7 suites / 27 tests PASS**.
- Season + Firestore/Storage emulator: `npm run test:emulator:v2-authoring-season` -> **1 suite / 2 tests PASS**. The first historical attempt had a temporary occupied port; the clean rerun passed. Known Java deprecation warnings and Jest open-handle warning remain environmental cleanup findings, not ignored failures.
- Episode callable Firestore emulator: `npm run test:emulator:v2-authoring-callables` -> **1 suite / 3 tests PASS**.
- Targeted strict TypeScript covering readers, resolvers, repositories, callables and both emulator tests -> **PASS**.
- `git diff --check` -> **PASS**.
- Fresh spec review and adversarial review -> **no P0**; both agree the full-season claims above are supported and identify the same P1 gaps.

### Open findings and failed approaches

P1: exported `.run()` bypasses HTTP callable transport and therefore does not prove missing/invalid/valid App Check token behavior; all 32 Episode fixture bodies are shallow and do not prove nested Graph/Activity/Learning/Voice/Delayed/Checkpoint canonical validation. Additional robustness gaps are negative DecisionRegistry Storage cases (forged path/hash/generation/malformed bytes), concurrent transaction collision, and a post-update persisted snapshot assertion. A prior combined command had truncated output, so commands were rerun separately; no source repair was hidden behind that truncation. Full Functions build still has the nine pre-existing `src/index.ts` missing-module/export errors recorded in earlier sections.

### Repository, preservation, and release state

Worktree: `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`; branch `codex/learning-v2-pilot`; HEAD `23c71a117`; changes remain uncommitted while P1 acceptance is open. Main checkout `C:\appsprojects\phraseman` remains untouched. Preserve untracked `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`; do not stage them. No push, deploy, publish, Firestore production write, release activation, or Admin transfer occurred.

### Invariants

Keep one implementation writer and read-only reviewers; do not use the project OpenAI key; preserve legacy until Phase 14; keep App Check fail-closed in production; preserve owner/CAS/idempotency, immutable hash/generation/byte-size, privacy, accessibility, offline/performance, and no-progress preview invariants. A passing emulator happy path cannot close a transport, schema, migration, or release gate.

### Exact next executable task

**Task 2.2 continuation: HTTP callable/App Check and canonical Episode closure.** First add RED coverage through an HTTP callable protocol harness (or an explicitly equivalent emulator transport) for missing, invalid, and valid App Check, keeping `.run()` tests labelled handler-only. Then add malformed nested Episode fixtures and enforce the canonical `Graph`/`Activity`/`Learning`/`Voice`/`Delayed`/`Checkpoint` validator contract; add negative DecisionRegistry Storage cases and assert a persisted post-update Season snapshot. Re-run focused Jest, both authoring emulators, targeted strict TypeScript, rules/security gates, and fresh spec/adversarial reviews. Do not advance Task 2.3 or commit until no P1 remains.

### Startup commands

```powershell
Set-Location 'C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot'
git status --short --branch
git rev-parse HEAD
git worktree list
Get-Content -Raw -Encoding UTF8 docs/v2/HANDOVER.md
Get-Content -Raw -Encoding UTF8 docs/v2/README.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md
Set-Location functions
npm run test:emulator:v2-authoring-season
npx jest --runInBand src/content_studio/episode_revision_resolver.test.ts src/content_studio/season_authoring_transaction_repository.test.ts
```

### State declaration

Verified in this slice: 32-object full-season DecisionRegistry/Season Storage resolution, owner/CAS/update/replay behavior, focused unit matrix, callable emulator baseline, targeted TypeScript and diff gate. Partial/unverified: Task 2.2, HTTP App Check, deep nested schema, negative Storage tamper cases, body-only Storage persistence, all downstream V2 phases, device evidence, rollout and release. Keep the global V2 goal active.

## 12.94 Nested graph boundary and registry tamper RED/GREEN

### Mission and status

The global V2 mission and phase order are unchanged. This continuation strengthens the immutable Episode boundary and DecisionRegistry evidence without advancing Task 2.2 or removing legacy. Task 2.2 remains partial until transport-level App Check and the complete canonical nested Episode contract are proven.

### Changes

`validateEpisodeRevisionArtifactBody` now requires `graph.capstoneNodeId`, validates every graph node's required nested fields and exact allowed keys, and delegates graph connectivity/activity-reference checks to the existing `validateEpisodeGraph` contract. The Season emulator fixture now supplies the minimum structurally valid graph/activity fields instead of relying on a node-id-only shell. The full-season emulator additionally asserts the persisted Season document after CAS update (`record.revision === 2` and owner unchanged). `firestore_authoring_store.test.ts` adds negative DecisionRegistry Storage metadata-generation and canonical-body-hash cases. No Admin transfer files, production data, deploy, or release changed.

### RED/GREEN and verification evidence

- RED: new resolver test initially received `true` for a graph node containing only `nodeId`/`activityId`; this reproduced the shallow nested acceptance.
- GREEN: after the graph boundary wiring and fixture repair, resolver suite -> **11 tests PASS**.
- Focused Functions matrix -> **7 suites / 30 tests PASS**.
- Season Firestore+Storage emulator -> **1 suite / 2 tests PASS**.
- Targeted strict TypeScript over readers/resolvers/repositories/callables/emulator tests -> **PASS**.
- `git diff --check` -> **PASS** before the handover append.
- Fresh spec/adversarial reviews for this exact change are requested and must be recorded before treating this slice as reviewed.

### Remaining findings

P1 remains for HTTP callable/App Check transport: exported `.run()` tests prove handler/Auth/CAS behavior only and do not exercise deployed callable protocol or token rejection. P1 also remains for the full canonical nested Episode contract beyond graph structure (Activity payload/capabilities/requirements/targets/tags, Learning/Voice/Delayed/Checkpoint semantics and exact-key/provenance contracts). Negative DecisionRegistry metadata/hash cases are now covered, but concurrent transaction collision and malformed UTF-8/JSON through the real Storage reader still need explicit emulator cases. The body-only-in-Storage persistence split is still unresolved. Jest reports an open-handle warning after emulator shutdown; this is recorded as cleanup work, not suppressed.

### Exact next executable task

Build the HTTP callable/App Check protocol harness first: RED for missing, invalid and valid App Check, with explicit proof that production options remain fail-closed. Then extend the canonical Episode adapter from graph structure to nested Activity/Learning/Voice/Delayed/Checkpoint validation using the normative validator contracts, with malformed fixtures for each branch. Add real Storage negative bytes and a concurrent Season CAS collision case. Re-run all focused/emulator/type/security gates and fresh reviews; do not commit or advance Task 2.3 while any P1 remains.

### Full phase/task table

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS; graph boundary strengthened |
| Tasks 2.3-15 | NOT STARTED; predecessor gate open |

### Repository and release state

Worktree remains `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`, branch `codex/learning-v2-pilot`, HEAD `23c71a117`; changes are uncommitted pending P1 closure. Main checkout remains untouched. Preserve untracked `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`. No push/deploy/publish/production Firestore write/release activation occurred. Keep one writer, read-only reviewers, App Check fail-closed, immutable generation/hash/byte-size, owner/CAS/idempotency, privacy/accessibility/performance and legacy-preservation invariants.

## 12.95 Activity nested shape tightening

### Mission and status

The global V2 objective remains active. This slice further closes canonical authoring-body shape without claiming full Activity/Voice/Delayed/Checkpoint semantic validation or HTTP transport proof.

### Changes and RED/GREEN

The Episode artifact validator now permits all normative optional graph-node fields (`pedagogicalContextContract`, `starSlotId`, `fallback`, `transferFromNodeId`, `variedSemanticSlotIds`) and rejects unknown node keys. It now validates ActivityInstance exact top-level keys plus nested `templateRef`, capabilities, requirements/fallback, targets and tags key sets/types/enums; payload remains JSON data validated by the surrounding canonical byte/hash path. The 32-episode emulator fixture was upgraded with a structurally valid ActivityInstance and graph node. Existing malformed graph RED remains green after the change.

Evidence: focused Functions matrix **7 suites / 30 tests PASS**; Episode resolver **11 tests PASS**; Season Firestore+Storage emulator **1 suite / 2 tests PASS**; targeted strict TypeScript **PASS**; root `git diff --check` **PASS**. Fresh adversarial review reports no P0 and confirms the fixture now satisfies the structural minimum.

### Remaining P1 and next task

P1 remains for semantic/deep validation of Voice, delayed probes, assessment, learning/mastery, checkpoint and policy references; current Activity nested validation still does not prove every enum/value relationship. P1 remains for HTTP callable/App Check transport, real Storage malformed UTF-8/JSON/missing-object and concurrent CAS collision cases, and body-only Storage persistence. Next exact task: add RED fixtures for those nested contracts and a callable protocol harness for missing/invalid/valid App Check, then run the full focused/emulator/security/review packet. Do not commit or advance Task 2.3 until all P1 are closed.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish or production write. Preserve the two untracked Admin-transfer artifacts and keep the global goal active.

## 12.96 Concurrent CAS and malformed-edge fail-closed guard

### Mission and status

The global Learning V2 objective remains active and unchanged. This bounded continuation strengthens authoring integrity only; it does not advance Task 2.2 to PASS or touch Admin transfer work.

### Changes and RED/GREEN

The full-season emulator now submits two identical Season updates concurrently from the same CAS head and asserts exactly one successful revision-2 write and one stale rejection, then checks the persisted revision and owner. A new resolver RED test demonstrated that a `null` graph edge caused a runtime `TypeError` inside `validateEpisodeGraph`; the Episode artifact validator now validates every edge's exact keys, string endpoints and allowed condition before delegation and returns `false` instead of throwing. This is a fail-closed malformed-artifact guard.

Evidence: Season Firestore+Storage emulator **1 suite / 2 tests PASS**; resolver + Firestore store subset **2 suites / 17 tests PASS**; targeted strict TypeScript **PASS**; root `git diff --check` remains green. Fresh adversarial review confirms the concurrent CAS assertion and identifies no P0.

### Remaining P1 and exact next task

P1 remains for HTTP callable/App Check transport; full Voice/Delayed/Assessment/Learning/Mastery/Checkpoint semantics and policy-reference relationships; real emulator malformed UTF-8/JSON/missing-object/wrong-generation cases; body-only Storage persistence; and cleanup of the emulator open-handle warning. The injected-reader DecisionRegistry negatives are useful unit evidence but are not a substitute for real Storage tamper evidence. Next task: implement the callable protocol harness (missing/invalid/valid App Check) and add real Storage tamper fixtures, then rerun all gates and independent reviews. Do not commit or advance Task 2.3 while any P1 remains.

### Full phase/task status, repository and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`, branch `codex/learning-v2-pilot`, HEAD `23c71a117`; all current changes remain uncommitted pending P1 closure. Main checkout is untouched. No push/deploy/publish/production Firestore write/release occurred. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 12.97 CAS loser reason and Activity enum/array tightening

### Mission and status

The full V2 mission remains active. This continuation only strengthens the bounded authoring integrity slice; Task 2.2 remains partial and no legacy or Admin-transfer functionality was removed or edited.

### Changes and evidence

The concurrent Season emulator assertion now requires the losing Promise to contain `authoring_revision_stale`, not merely any rejection. The immutable Episode validator now constrains Activity family to `V2_ACTIVITY_FAMILIES`, checks non-empty string elements in targets/tags, and validates supported modality values. The malformed graph-edge fail-closed guard remains in place. Focused resolver/Firestore tests: **2 suites / 17 tests PASS**; targeted strict TypeScript: **PASS**; Season emulator after the concurrent change: **1 suite / 2 tests PASS**; root `git diff --check`: **PASS**.

### Remaining P1 and exact next task

P1 remains for genuine HTTP callable/App Check transport (all current callable tests still invoke `.run()`), complete semantic/recursive validation of Activity payload, optional graph subfields, Voice, delayed probes, assessment, learning/mastery, checkpoint and policy references, real Storage malformed UTF-8/JSON/missing-object cases, and body-only Storage persistence. The next executable task is the protocol harness plus real Storage tamper fixtures. Do not commit or advance Task 2.3 while these P1 findings remain.

### Full status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD: `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`. No commit, push, deploy, publish, production write or release activation. Preserve both untracked Admin-transfer artifacts and keep one writer plus read-only reviewers.

## 12.98 Real Storage tamper and persisted CAS integrity evidence

### Mission and status

The complete Learning V2 objective remains active. This slice improves Task 2.2 evidence only; it does not claim HTTP transport, full semantic Episode validation, body-only Storage persistence, or downstream phase completion.

### Changes

The Season Firestore+Storage emulator now exercises the real Storage emulator reader against: an overwritten object with an old pinned generation (rejected), malformed UTF-8 bytes (rejected), and valid-UTF8 malformed JSON (rejected). The concurrent full-season CAS test now verifies exactly one winner, exactly one `authoring_revision_stale` loser, persisted revision/owner, and persisted winning fingerprint/contentHash consistency. No Admin transfer file, production data, deployment or release was touched.

### Evidence

- `npm run test:emulator:v2-authoring-season` -> **1 suite / 3 tests PASS** (32 Episode objects + DecisionRegistry full-season path, concurrent CAS, real Storage tamper).
- Resolver/Firestore focused subset -> **2 suites / 17 tests PASS**.
- Targeted strict TypeScript for the emulator test -> **PASS**.
- Root `git diff --check` -> **PASS**.
- Fresh spec and adversarial reviews -> **no P0**; both confirm the real tamper and CAS claims.

### Remaining P1 and next executable task

P1 remains for the actual HTTP callable/App Check protocol (all current callable checks still use handler-only `.run()`), complete semantic/recursive validation of Voice, Delayed, Assessment, Learning/Mastery, Checkpoint and policy relationships, and the normative body-only-in-Storage persistence split. One additional Storage evidence case remains: missing object through the resolver/callable path. The exact next task is an HTTP protocol harness for missing/invalid/valid App Check plus resolver-level missing-object and metadata/byte-size negative cases. Do not commit or advance Task 2.3 until the P1 gate is closed.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.59 Current checkpoint — CAS proof, focused matrix, and remaining blockers

This is the latest handover checkpoint and must be read after the historical sections above. The full Learning V2 objective remains active; legacy behavior remains preserved and no release or production mutation occurred.

### Verified in this session

- `npm run test:emulator:v2-episode-lifecycle` — **1 suite / 1 test PASS**. It covers submit, validation/localization/review/gate evidence, maker-checker rejection, concurrent approval CAS (exactly one winner), content-hash-bound active pin, archive protection, exact operation-envelope rejection, idempotent replay, and stale revision rejection.
- Focused Content Studio matrix — **22 suites / 112 tests PASS**.
- Targeted strict TypeScript for Firestore lifecycle/store and lifecycle emulator — **PASS**.
- `git diff --check` — **PASS** (only normal line-ending warnings).
- Fresh spec review confirms the bounded CAS/contentHash/exact-operation closures; it also confirms that these are not full release evidence.

### Open P1/P2 items before this lifecycle/content-studio slice can be promoted

1. Active Season pin still scans inline Season documents and does not yet read a canonical immutable Season record/body from Storage with hash, generation, byte-size, and exact envelope validation.
2. Lifecycle transport App Check/Auth is not proven end-to-end; the current emulator callable test disables enforcement and the HTTP harness is a debug-token harness.
3. Generic Episode resolver and authoring resolver share the same path; approved-only runtime behavior is guaranteed by `assertExactImmutableEpisodeRevision`, not by a separate resolver API.
4. Legacy nested Episode `{record,lifecycle}` and synthetic record-only validation remain compatibility paths without an explicit opt-in.
5. Submit does not yet resolve the immutable artifact and bind submitter/expected draft ownership before creating lifecycle state; review-queue projection is also not yet proven.
6. Receipt interfaces and persisted operation records need canonical receipt IDs/body-record completeness and nested exact-key closure.

### Exact next executable task

Implement canonical Season pin validation and its RED/GREEN emulator fixtures. The writer must use the existing immutable object reader and Season draft contracts, require exact record/body hash bindings and approved/released lifecycle status, and reject malformed, tampered, content-hash-mismatched, and missing-object pins. Then add a transport-level lifecycle App Check/Auth fixture if the current emulator setup supports it. Re-run the lifecycle emulator, ContentGate Storage emulator, authoring HTTP App Check harness, focused 22-suite matrix, targeted TypeScript, and append the resulting counts here. Do not begin runtime/stars/curriculum UI work until this predecessor contract gate is closed.

### Worktree and release state

Worktree: `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`; branch `codex/learning-v2-pilot`; HEAD remains `23c71a117` at the last recorded handover. No commit, push, deploy, publish, Firestore production write, or release activation. Preserve untracked `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.58 Lifecycle CAS and active-pin negative closure

### Mission and status

The complete Learning V2 objective remains active. This bounded slice strengthens the server-owned Episode lifecycle transition boundary; it does not claim the curriculum, runtime, stars/access economy, voice-mode catalog, Admin Content Studio generator, rollout, or release complete.

### Changes

- Firestore lifecycle `compareAndSetLifecycle` now reads the current lifecycle inside the same transaction and explicitly rejects a missing or mismatched `expectedRevision` with `episode_lifecycle_stale`; it no longer ignores the CAS argument.
- Active-season pin matching now requires the full Episode revision identity, including `contentHash`, in addition to episode id, revision, and revision fingerprint. The pin still must have an approved/released season lifecycle projection.
- Lifecycle operation records now have exact top-level key closure (`lifecycle` and `requestFingerprint` only); an unexpected field is rejected as `episode_lifecycle_operation_invalid`.
- The emulator lifecycle test now runs two concurrent approval contenders. Exactly one succeeds and one loses the transaction race; the same test also exercises the unexpected-field operation rejection. A 30-second test timeout is explicit because Firestore transaction retries are real emulator work.

### RED/GREEN evidence

`npm run test:emulator:v2-episode-lifecycle` — **1 suite / 1 test PASS**, including submit, validation/localization/review/gate receipts, maker-checker rejection, concurrent CAS race, content-hash-bound active pin, archive guard, exact operation envelope rejection, idempotent replay, and stale archive rejection. The emulator prints the known Java Unsafe deprecation warning and exits with the existing Jest open-handle warning after a successful run.

### Remaining findings

The resolver's generic `resolve` and authoring resolver still share the same artifact reader; approved-only runtime use is enforced by `assertExactImmutableEpisodeRevision`, not by the resolver method alone. The lifecycle emulator invokes callable `.run()` with App Check disabled; transport-level production App Check/Auth evidence remains a separate gate. Active-pin validation still needs a canonical Season immutable envelope/body-hash verification before it can be treated as cryptographic pin proof. `readOperation` now closes top-level keys but nested lifecycle exact-key validation remains delegated to the lifecycle validator. No commit, push, deploy, production write, or legacy removal occurred.

### Full phase/task status

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

### Exact next executable task

Add canonical Season immutable pin validation (record-only envelope, Storage object hash/generation/byte-size, approved lifecycle status) and a transport-level lifecycle App Check/Auth emulator harness. Then rerun the focused lifecycle, rules, ContentGate Storage, HTTP App Check, and Content Studio unit matrices; record all counts here before starting the next Content Studio task.

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve both untracked Admin-transfer artifacts.

## 13.48 Lifecycle verification checkpoint

After the Episode lifecycle additions, the complete focused Content Studio matrix is **21 suites / 106 tests PASS**. The lifecycle+authoring+callable subset is **3 suites / 13 tests PASS**. `git diff --check` is PASS. The rules emulator initially exceeded the external timeout because a stale Firestore emulator process remained on port 8080. After stopping that test-owned process, the rerun completed: **1 suite / 406 tests PASS**. Permission-denied warnings are the expected negative assertions. This closes the rules-matrix verification for the current deny-only collections, but not the full callable lifecycle emulator flow.

The next executable task is to make the Episode lifecycle emulator flow deterministic (or isolate its emulator ports/process lifecycle), then add submit/maker-checker/malformed-operation coverage. Preserve the current unit evidence and do not mark Task 2.2 complete.

## 13.49 Submit path and independent lifecycle review

Added `EpisodeLifecycleTransitionRepository.submit`, a strict submit parser, and `adminSubmitV2EpisodeRevision`; a previously uninitialized revision can now receive a server-owned `needs_review` lifecycle head with idempotent operation/audit evidence. Action-specific parsers now require receipt IDs only for approval and reject them for changes/archive. The Firestore lifecycle adapter now targets the separate `content_episode_lifecycle` collection for new lifecycle writes rather than updating the immutable revision document.

Verification: lifecycle repository **1 suite / 5 tests PASS**; full focused matrix remains **21 suites / 106 tests PASS**; targeted strict TypeScript over lifecycle/parser/callable/adapter **PASS**; rules emulator **1 suite / 406 tests PASS**. A fresh independent spec/adversarial review remains **NOT PASS** and identified release-blocking gaps: lifecycle resolver still has compatibility assumptions around nested historical envelopes; maker-checker actor binding is absent; pre-approval upstream receipts can deadlock on approved-only resolver behavior; ContentGateReceipt lacks immutable record/object verification; receipt IDs are not append-only-safe; active Season pin query is provisional; and no real lifecycle callable emulator flow exists. These findings are recorded, not waived.

Exact next executable task: split the Episode resolver into immutable record + separate lifecycle reads while preserving legacy fixture compatibility, then add the real submit→receipt-gate→approve emulator flow with same-actor rejection and append-only receipt IDs. Do not mark Task 2.2 complete.

## 13.50 Record/lifecycle split progress and review findings

The resolver now accepts the canonical body-less `{record}` index plus a separate `content_episode_lifecycle/{draftId}__r{revision}` projection and reads both through the same transaction context. Historical `{record,lifecycle}` fixtures remain accepted for compatibility. `createLifecycle` now uses a transaction create on the separate lifecycle document, and review/validation parsers reject unknown top-level fields. Unit evidence remains green: lifecycle/authoring subset **2 suites / 11 tests PASS** and targeted TypeScript for resolver/adapter remains **PASS**.

This is still partial. The fresh independent review confirms the remaining release blockers: legacy envelope must become explicit opt-in; record validation should no longer synthesize a fake lifecycle; a deliberate pre-approval resolver API is needed; the lifecycle union/draft semantics need alignment; maker-checker and append-only receipt identity are missing; ContentGateReceipt still lacks immutable record/object verification; Season pin scanning is provisional; and a real callable emulator flow is absent. The latest rules evidence remains **1 suite / 406 tests PASS**, and the full focused matrix after the latest changes is **21 suites / 107 tests PASS**.

Exact next task: add explicit `resolveForAuthoring` versus approved-only runtime resolution, direct record-only validation and lifecycle binding checks, then write the emulator RED/GREEN flow. No commit, deploy, push, release, or legacy removal.

## 13.51 Explicit authoring resolver seam

Added an explicit optional `resolveForAuthoring` resolver method and switched server-owned validation, localization, review, and voice stores to use it when available. This documents and preserves the distinction between pre-approval evidence reads and the approved-only `assertExactImmutableEpisodeRevision` Season/runtime path. The Firestore resolver now has a shared artifact read path that supports canonical record-only indexes plus the separate lifecycle projection; the record-only validator has a dedicated positive/negative test.

Evidence: Episode resolver + Firestore adapter tests **2 suites / 42 tests PASS**; targeted strict TypeScript **PASS**. Full Content Studio matrix after this bounded seam is **21 suites / 108 tests PASS**. This remains partial: legacy envelope opt-in, direct record validator extraction, lifecycle binding/error semantics, maker-checker, append-only receipt IDs, immutable gate records, Season pin correctness, and callable emulator flow remain open.

## 13.52 Receipt append-only identity and maker-checker seam

Receipt identifiers are now type-scoped and operation-scoped (`validation`, `localization`, `review`, `voice` plus the idempotency key), so repeated evidence events for the same Episode revision no longer collide across kinds or overwrite an earlier append-only receipt. Episode review receipts now persist `reviewerId`; the lifecycle approval repository reads that actor through a server-owned store seam and rejects missing reviewer identity or self-approval (`episode_maker_checker_self_review`). The generic receipt reader accepts the optional reviewer field while retaining strict required subject/hash/status checks.

Focused receipt/lifecycle reader tests: **3 suites / 11 tests PASS**; targeted strict TypeScript for receipt/lifecycle/adapter modules: **PASS**. This is a seam, not complete maker-checker evidence: a valid gate-backed approval and same-actor emulator assertion still need to be added. Immutable ContentGateReceipt records, Season pin safety, and full callable emulator flow remain open.

## 13.53 ContentGate body/record envelope seam

ContentGate issuance now composes a typed `content-gate-receipt-record.v1` alongside the gate body, with receipt hash and object binding metadata. The Firestore adapter persists `{body, record}` and the server-owned gate reader accepts the envelope only when the record hash matches the canonical body hash and its object content hash matches the receipt hash; bare historical body documents remain readable for compatibility. Focused gate/reader/repository tests: **3 suites / 13 tests PASS**; targeted strict TypeScript: **PASS**.

This is deliberately not release-complete immutable Storage evidence: the current record uses a pending object-generation marker and does not yet write/read canonical gate bytes from Storage. The next gate task must add the real immutable object writer/reader and reject stale/missing generation/byte-size metadata before lifecycle approval. Full focused matrix after this seam is **22 suites / 110 tests PASS**; emulator lifecycle flow remains open.

## 13.54 ContentGate immutable object-writer seam

Replaced the pending-only path with a server-owned `ContentGateObjectWriter` seam. The production Firestore adapter canonicalizes the gate body, writes UTF-8 JSON to Firebase Storage, reads the resulting object generation, and returns generation/byte-size/content-hash metadata before the record is persisted. The repository now fails closed when the writer returns a mismatched hash, zero byte size, or missing generation. Unit fallback remains test-only for in-memory stores. Gate repository tests: **1 suite / 3 tests PASS**; targeted strict TypeScript: **PASS**.

This still requires a real Storage emulator test proving bytes can be read back and tampering/generation mismatch is rejected by the gate reader. The immutable record is now produced only after the writer seam succeeds. Full focused matrix after this seam: **22 suites / 111 tests PASS**; full release evidence and lifecycle emulator remain open.

## 13.55 ContentGate Storage emulator proof

Added `v2_content_gate_storage.emulator.test.ts` and the `test:emulator:v2-content-gate-storage` command. Against real Firestore + Storage emulators, the test seeds validation/localization/review evidence, issues a gate through the adapter, verifies persisted record hash and Storage generation/byte-size, reads canonical bytes back, then tampers with the object and proves the read-back hash no longer matches the immutable record. Evidence: **1 suite / 1 test PASS**. The emulator reports a Jest open-handle warning after success; cleanup currently exits successfully but this warning remains a release-hygiene item. The full focused unit matrix is now **22 suites / 112 tests PASS**.

The full lifecycle callable emulator (submit → evidence → gate → approval → archive, App Check/Auth and maker-checker) is still not implemented. No production Storage/Firestore writes were made.

## 13.56 Episode lifecycle emulator proof

Added `v2_episode_lifecycle.emulator.test.ts` and `test:emulator:v2-episode-lifecycle`. Against Firestore + Storage emulators it seeds a canonical Episode body/record, invokes the exported callables for submit, validation, localization, review, and ContentGate issuance, rejects self-approval by the review actor, then approves with a distinct reviewer and archives the Episode. It verifies the separate lifecycle projection is created and gate evidence is persisted through Storage. Evidence: **1 suite / 1 test PASS**. Jest still reports an open-handle warning after successful emulator cleanup, so this is strong functional evidence but not yet a clean release gate.

The emulator uses the explicit local App Check override for direct `.run()` invocation; transport-level App Check remains covered only by the separate HTTP harness. Active Season pin blocking and malformed-operation/CAS race cases still require additional emulator cases.

## 13.57 Lifecycle negative emulator evidence

Extended the lifecycle emulator scenario with a separate `content_season_revisions` body plus `content_season_lifecycle` approval projection. Archive is now proven to reject an active exact Episode pin, then succeed after the pin projection is removed. The same run also proves idempotency-key conflict rejection when the archived operation key is reused with a different reason. Evidence remains **1 suite / 1 test PASS** (with the known Jest open-handle warning after emulator shutdown). This closes the current active-pin and replay-conflict cases, but not a true concurrent CAS race or malformed persisted-operation corruption fixture.

The same emulator now includes both malformed persisted-operation rejection and stale lifecycle-revision rejection; rerun evidence: **1 suite / 1 test PASS**. The separate transport-level App Check harness also passes **1 suite / 2 tests** (missing App Check rejected, valid App Check accepted). The open-handle warning remains the only cleanup defect in the lifecycle emulator process; it does not change the assertions' exit code.

## 13.47 Episode lifecycle transition slice

Added the first server-owned Episode lifecycle transition layer. `EpisodeLifecycleTransitionRepository` now supports `needs_review → changes_requested`, `needs_review → approved`, and `approved → archived`, with strict identity checks, lifecycle-revision CAS preconditions, idempotent replay/fingerprint protection, server-owned approval-gate resolution, non-empty change reasons, audit writes, and an active-Season-pin archive guard. Added strict `validateEpisodeLifecycleHead`, Firestore transaction adapter, deny-only lifecycle audit/operation rules, lifecycle request parser, and callable exports for approve, request-changes, and archive. The immutable Episode revision record is not mutated; the adapter updates only its lifecycle projection.

RED/GREEN evidence: lifecycle repository **1 suite / 4 tests PASS**; lifecycle + authoring + callable subset **3 suites / 13 tests PASS**; targeted strict TypeScript for lifecycle, adapter, parser and callables **PASS** except the known repository-wide missing legacy exports when compiling `src/index.ts`; root `git diff --check` **PASS**. The full focused matrix must be re-run after this slice, and an emulator callable flow still remains required before this task can be marked complete.

Open lifecycle gaps: submit-to-`needs_review` callable, maker-checker actor separation, full Firestore emulator flow with real receipt gate, malformed operation fixture, and robust active Season pin query against the final immutable Season lifecycle schema. Do not claim Episode lifecycle complete or archive safety release-ready yet.

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.46 Voice dependency resolver seam

Added a server-owned `VoiceDependencyReader` seam and `resolveVoiceDependencies`. When configured for a voice receipt, the repository now resolves immutable calibration, data-policy, and network-egress records and fails closed on missing/hash/identity/status/expiry mismatches, missing required network purposes, stale calibration/policy, or unsafe egress protocols/direct-provider calls. The resolver intentionally does not add account consent, eligibility, reservation, or settlement data; those remain runtime-only.

RED/GREEN evidence: **1 suite / 3 tests PASS** for exact dependency acceptance, missing purpose rejection, and unsafe egress rejection; existing voice/callable tests remain **2 suites / 4 tests PASS**; full focused Content Studio matrix is now **20 suites / 102 tests PASS**. Targeted strict TypeScript for resolver/repository: **PASS**.

This is a seam, not the final release gate: Firestore immutable dependency adapters, registry-entry identity/expiry checks, supporting consent/deletion/minors reference resolution, and exact calibration-scope matching still remain. Episode lifecycle transitions/pinning, curriculum/runtime, stars/access, modes, QA, rollout and release gates remain open.

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.45 Focused receipt matrix and external voice dependency audit

### Mission and status

The complete Learning V2 objective remains active. This slice re-ran the post-voice Content Studio matrix and audited the normative external voice dependencies before implementing their resolver. No release, legacy removal, deploy, commit, or push was performed.

### Verification evidence

- Focused Content Studio matrix: **19 suites / 99 tests PASS**.
- Targeted strict TypeScript over all touched receipt, semantic-bridge, resolver, callable, and lifecycle modules with `--skipLibCheck`: **PASS**. A plain strict invocation still hits the repository's unrelated duplicate DOM/WebCodecs declarations; this is an environment baseline and not a touched-module error.
- Canonical Episode oracle remains **1 suite / 317 tests PASS**.
- Rules emulator remains **1 suite / 396 tests PASS** after the voice receipt and operation deny-only collections.
- `git diff --check` remains the required next hygiene check after the next patch.

### External voice dependency findings

The normative schemas are in Content Studio §3.2 and the shared activity contracts. Voice receipt issuance currently checks only the intrinsic governance shape. It does not yet resolve or cryptographically bind the immutable `SpeechCalibrationReceipt`, `VoiceDataPolicy`, and `VoiceNetworkEgress` records. The next bounded RED/GREEN packet must add a server-owned dependency reader that checks record identity, canonical body hash, approved/deployed status, expiry/environment, policy registry-key and purpose coverage, deletion/minors references, and the required egress protocol literals. Do not invent runtime consent/reservation fields in the content-studio layer.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.29 Operation proof and maker-checker permission boundary

The malformed idempotency-operation RED/GREEN proof is now complete: the Firestore emulator has **1 suite / 3 tests PASS**, including rejection of an existing malformed operation. Publish fingerprints include actor identity and the complete receipt-ID payload; altered receipt IDs are rejected as key reuse. Lifecycle request parsing now rejects unknown top-level fields and validates replacement IDs with the same path-safe token rule as primary IDs.

Content lifecycle permissions now distinguish publication from review. A `content_reviewer` role and `content.review` permission were added; publish remains guarded by `content.publish`, while deprecate is guarded by `content.review`. Focused permission/callable/authoring tests: **4 suites / 17 tests PASS**.

The lifecycle still lacks the required `deprecated → archived` transition and its open-Episode-draft guard. Replacement records also need the full immutable Storage-bound resolver rather than the minimal ref/hash read. Keep Task 2.2 partial.

## 13.30 Archive transition and authoring-only template status gate

Added the guarded `deprecated → archived` lifecycle transition to the repository and callable surface. Archive requires the current lifecycle to be `deprecated`, checks an idempotent operation record, queries for any unsealed Episode draft whose ActivityInstance pins the exact template ref, appends an audit event, and replays the original result for an exact idempotency key. A reviewer may perform deprecation/archive through the new `content_reviewer` role and `content.review`; publication remains restricted to `content.publish`.

The default Firestore ModeTemplate resolver now accepts only `published` templates for new authoring. Historical readers can opt into deprecated templates explicitly. Shared lifecycle validation rejects replacement metadata on archived heads. Focused repository/authoring/callable/store tests: **4 suites / 34 tests PASS**; targeted strict TypeScript: **PASS**.

Open work remains: full immutable Storage-bound replacement resolution, transaction-scoped template reads during Season saves, archive emulator coverage with real open-draft documents, and the wider Episode semantic/runtime/curriculum phases. Task 2.2 remains partial.

## 13.31 Archive emulator proof and current verification

The lifecycle emulator now covers four cases: publish/idempotent replay, deprecate with a published replacement, malformed-operation rejection, and archive blocking on an open Episode draft followed by successful archive plus replay after draft closure. Result: **1 suite / 4 tests PASS**; the existing Jest open-handle warning remains a test-hygiene follow-up.

The expanded focused matrix (admin roles/permissions, authoring/callables, immutable readers, Episode/DecisionRegistry envelopes, lifecycle receipts/transitions/repository, and transaction repositories) is **14 suites / 89 tests PASS**. Targeted strict TypeScript passes. No commit, deploy, push, production write, or legacy removal.

The remaining release-critical gaps are full immutable Storage-bound replacement resolution, transaction-scoped template resolution during Season saves, and the broad Episode semantic/curriculum/runtime/stars/voice/Admin/release phases.

Correction to 13.28: the malformed-operation emulator proof is no longer pending; it is included in 13.31's **1 suite / 4 tests PASS** lifecycle run. The open-handle warning is still recorded as test hygiene debt.

## 13.34 Canonical Episode oracle baseline

The existing canonical Learning V2 Episode contract suite was rerun as the semantic oracle: **1 suite / 317 tests PASS**. It covers graph phases/loops, delayed-probe hash and binding, checkpoint boundary/sets, mastery evidence, eight star slots/accessibility reachability, voice fallback, localization and policy relationships. This is strong canonical-layer evidence, but it does not yet prove the authoring-body to canonical adapter or the Storage-bound Episode resolver; those remain the next semantic workstream and no release claim is made from this oracle alone.

## 13.35 Authoring-to-canonical Episode semantic bridge

Added `episode_authoring_semantics.ts`, a loss-intolerant adapter from `episode-authoring-body.v1` to the shared `v2-episode-contract.v1` validator. It refuses to guess or drop canonical projection fields (`episodeKind`, timing, objective/skill/grammar/sound/asset sets and accessibility routes), maps `activityInstances` to canonical `activities`, and forwards the result to the existing semantic validator. A canonical E1 fixture adapted into authoring shape is accepted; missing accessibility projection and delayed-probe hash mutation are rejected. Result: **1 suite / 3 tests PASS**; resolver + bridge subset: **2 suites / 24 tests PASS**; targeted TypeScript: **PASS**.

The bridge is exposed as an approval-time semantic gate but is not yet wired into a complete Episode review/publish callable. Dependency-resolved policy/voice receipt checks and migration of real authoring fixtures remain open; do not claim Episode semantic completion.

## 13.36 Replacement record envelope hardening

The lifecycle adapter's replacement-record read now requires the complete immutable ModeTemplate record envelope: exact top-level keys, canonical Storage object path, matching content hash, non-empty generation/byte size, provenance creator/timestamp, and record identity matching the requested template/version. The lifecycle emulator replacement fixture was upgraded accordingly. Store/repository subset: **2 suites / 25 tests PASS**; lifecycle Firestore emulator remains **1 suite / 4 tests PASS**; targeted TypeScript: **PASS**.

The adapter still does not read and hash-verify the replacement Storage bytes itself; that final body-level check and a concurrent race proof remain open.

## 13.37 Current focused matrix after semantic bridge

Focused V2 Content Studio matrix now includes the authoring semantic bridge and permission boundary: **15 suites / 92 tests PASS**. The canonical Episode oracle remains **317 tests PASS**. Targeted TypeScript and `git diff --check` remain clean. This is still an intermediate foundation milestone; no commit, deploy, release activation, or legacy removal was performed.

## 13.38 Semantic bridge scope boundary

The bridge is intentionally pure and loss-intolerant, but the current repository still has no complete Episode review/approval callable that consumes it. Existing shallow draft/Storage tests remain compatibility tests and must not be mistaken for semantic approval evidence. The next implementation slice is to add the server-owned Episode review gate, bind fresh semantic/localization/voice receipts to the exact Episode subject, and only then route approval/pinning through that gate.

## 13.39 Server-owned Episode semantic review callable

Added `adminValidateV2EpisodeRevision`: it requires the `content.review` maker-checker permission, parses a strict immutable Episode revision reference, reads the approved artifact through the server-owned Firestore/Storage resolver with a published-only ModeTemplate resolver, and runs the authoring-to-canonical semantic bridge. The callable is exported from `functions/src/index.ts`; malformed path IDs are rejected before any read. Focused authoring/callable tests: **2 suites / 9 tests PASS**; targeted TypeScript: **PASS**.

This is a semantic review gate, not yet an approval receipt writer or lifecycle transition. Fresh validation/localization/voice receipts and Episode approval/pinning integration remain open.

## 13.40 Server-owned Episode review receipt

Added `EpisodeReviewRepository` and `adminReviewV2EpisodeRevision`. The repository reads the immutable artifact server-side, runs the canonical semantic bridge, rejects invalid content before any write, creates an exact Episode-subject review receipt, and records an idempotent operation. Reusing a key with a changed actor/ref/status/reason is rejected. The callable is reviewer-only and exported from the Functions index. The new operation collection is deny-only in Firestore rules.

Evidence: repository + authoring/callable tests **3 suites / 11 tests PASS**; targeted TypeScript **PASS**. This is the review receipt layer only: validation/localization/voice receipts, gate receipt composition and Episode lifecycle/pinning still remain open.

Rules emulator after adding the Episode review operation collection: **1 suite / 371 tests PASS**. Permission-denied warnings are expected negative assertions; no direct client access was opened.

The shared approval-gate validator and Firestore reader now accept both `mode_template` and `episode` subjects, while preserving exact same-subject, status and receipt-hash checks. Transition/reader tests: **2 suites / 12 tests PASS**. This generalizes the gate contract but does not yet create validation/localization/voice receipts automatically.

## 13.41 ContentGateReceipt issuer

Added `ContentGateReceiptRepository` and reviewer/publisher-safe callable `adminIssueV2ContentGate`. It reads validation, localization and review receipts by server-owned IDs, requires exact subject equality and statuses, pins all three receipt hashes into a separate `content-gate-receipt-body.v1`, and persists an idempotent operation. It supports both Episode and ModeTemplate subjects. The operation collection is deny-only in Firestore rules.

Evidence: gate repository + authoring/callable tests **3 suites / 11 tests PASS**; rules emulator **1 suite / 376 tests PASS**; targeted TypeScript **PASS**. This closes gate receipt composition, but does not yet advance Episode lifecycle/pinning or create upstream validation/localization/voice receipts automatically.

## 13.42 Server-owned Episode validation receipt

Added `EpisodeValidationRepository` and `adminIssueV2EpisodeValidationReceipt`. It reads the immutable Episode artifact through the server-owned resolver, runs the loss-intolerant canonical semantic bridge, writes a `passed` validation receipt only after success, and records an idempotent operation. The validation operation collection is deny-only in Firestore rules. Focused repository/authoring/callable tests: **3 suites / 11 tests PASS**; targeted TypeScript: **PASS**.

Localization and voice-governance receipts still need their own evidence writers; the gate issuer now has a real validation receipt source but the complete upstream receipt set and Episode lifecycle/pinning transition remain open.

Rules emulator after adding validation operations: **1 suite / 381 tests PASS**. Expected permission-denied warnings remain negative assertions.

## 13.43 Server-owned Episode localization receipt

Added `EpisodeLocalizationRepository` and `adminIssueV2EpisodeLocalizationReceipt`. It uses the same immutable semantic bridge, writes an `approved` localization receipt only after the complete canonical Episode/localization contract passes, and stores a separate idempotency operation. Validation and localization operation collections are deny-only. Localization repository + validation repository + callable tests: **3 suites / 6 tests PASS**; rules emulator: **1 suite / 386 tests PASS**; targeted TypeScript: **PASS**.

The remaining upstream evidence gap is voice-governance/calibration/policy receipt issuance, followed by Episode lifecycle/pinning transition and full release-gate wiring.

## 13.44 Voice governance receipt

Exported the shared `validateVoiceReleaseRequirementsShape` helper and added `EpisodeVoiceGovernanceRepository` plus `adminIssueV2EpisodeVoiceReceipt`. Voice review now fails closed on malformed on-device/network requirements, missing policy/egress/purpose fields, duplicate task/purpose values, or invalid calibration refs; successful evidence produces an `approved` voice receipt with idempotent operation. Voice receipt and operation collections are deny-only. Voice repository + callable tests: **2 suites / 4 tests PASS**; rules emulator: **1 suite / 396 tests PASS**; targeted TypeScript: **PASS**.

The receipt currently validates the intrinsic voice-governance shape; external calibration/policy/egress record resolution and Episode lifecycle/pinning remain open.

The complete focused Content Studio matrix including the Episode review repository is now **16 suites / 94 tests PASS**. Targeted strict TypeScript and `git diff --check` remain PASS.

## 13.33 Transaction seam verification

After introducing the context-aware ModeTemplate resolver, the Episode/Season/callable transaction subset is **4 suites / 28 tests PASS** and targeted strict TypeScript remains PASS. This confirms existing Season saves still resolve approved Episode dependencies through the transaction read context. A true concurrent deprecate-vs-save emulator race and full immutable replacement resolver are still required before release evidence can claim race safety.

## 13.32 Transaction-scoped ModeTemplate resolution seam

`resolveModeTemplate` now accepts the same optional Firestore read context as Episode revision resolution. `createFirestoreModeTemplateResolver` uses that context for both the immutable version record and lifecycle head, and `FirestoreSeasonDraftRepository` wraps the resolver with the active transaction context before validating pinned Episode revisions. This closes the prior non-transactional read seam for Season saves. Targeted strict TypeScript passes.

The default resolver remains authoring-safe (`published` only); historical deprecated reads require an explicit option. Full replacement-record Storage validation and a concurrency RED/GREEN emulator race test remain open.

## 13.28 Malformed idempotency operation fail-closed behavior

The Firestore lifecycle adapter now rejects an existing operation document unless it has a string request fingerprint and a lifecycle head that passes the shared strict lifecycle validator. A malformed persisted operation can no longer be treated as a missing operation and silently retried. Targeted strict TypeScript passed, and the full focused Content Studio matrix remains **12 suites / 80 tests PASS**. A dedicated emulator fixture for a malformed operation is still the next RED/GREEN proof to add before this subtask is considered fully closed.

## 13.26 Idempotent ModeTemplate lifecycle proof and verification

### Mission and status

The complete Learning V2 objective remains active. This slice hardens the ModeTemplate publish/deprecate transition against duplicate requests and records the verification evidence; it does not claim the full V2 pilot, Content Studio, or release complete.

### Changes and RED/GREEN

Lifecycle requests now require an idempotency key. The repository fingerprints the action/ref/revision/reason (and replacement for deprecation), replays an exact prior operation without a second write, and rejects reuse of the same key for a different request. The Firestore adapter persists operation records in a server-only collection using the transaction boundary. The repository narrowing was made explicit for the strict TypeScript compiler.

Evidence:

- Firestore lifecycle emulator: **1 suite / 2 tests PASS**. It proves publish idempotent replay/audit behavior and deprecation with a resolved published replacement. Jest reports an open-handle warning after completion; the suite exits successfully and this remains a follow-up cleanup item, not a release claim.
- Focused Content Studio matrix: **12 suites / 80 tests PASS**.
- Lifecycle transition subset after the compiler fix: **3 suites / 15 tests PASS**.
- Targeted strict TypeScript over all touched lifecycle, resolver, callable, and shared-contract modules: **PASS**.
- Full Functions `tsc --noEmit`: **BASELINE FAIL**, limited to pre-existing missing/unexported modules referenced by `functions/src/index.ts`; no touched V2 module appears in the error list.
- Root `git diff --check`: **PASS** (only Git's LF/CRLF normalization warnings).

No commit, push, deploy, production write, release activation, or legacy removal was performed. The separate Admin-transfer artifacts remain preserved.

### Remaining P1 and exact next task

Task 2.2 remains partial/in progress. Remaining work includes validating the full target lifecycle state during deprecation replacement resolution (not only the target record/hash), malformed operation fail-closed behavior, deep Episode semantic contracts, and the later curriculum/runtime/stars/access/voice/QA/release phases. Exact next executable task: add a Firestore adapter fixture that reads and requires the replacement lifecycle head to be `published`, then add the malformed-operation RED/GREEN case and re-run the lifecycle emulator plus focused matrix.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; there is no commit, push, deploy, production write, or release activation.

## 13.27 Replacement lifecycle fail-closed hardening

### Mission and status

The complete Learning V2 objective remains active. This slice closes the specific replacement-target gap identified in 13.26; it is still only a Content Studio foundation increment.

### Changes and RED/GREEN

Deprecation now resolves both the replacement record and its lifecycle head, and requires the target lifecycle to be `published` with the same content hash before accepting the replacement. An existing record without a published lifecycle is therefore rejected. The unit MemoryStore fixture now models per-template lifecycle heads, and the Firestore emulator fixture seeds the published replacement lifecycle explicitly.

Evidence:

- Lifecycle repository unit test: **1 suite / 4 tests PASS**.
- Firestore lifecycle emulator: **1 suite / 2 tests PASS**. The suite still reports Jest's post-test open-handle warning; emulator exits successfully.
- Targeted strict TypeScript for repository/Firestore adapter: **PASS**.

### Remaining P1 and exact next task

Malformed persisted operation records still need a fail-closed RED/GREEN fixture and adapter behavior. Deep Episode semantic contracts and all later V2 curriculum/runtime/stars/access/voice/QA/release phases remain open. Exact next executable task: make malformed idempotency-operation documents an explicit error (not a missing operation), add its emulator/unit proof, then re-run the full focused Content Studio matrix.

## 13.15 ModeTemplate published lifecycle resolver

### Mission and status

The complete V2 objective remains active. This slice makes immutable ModeTemplate resolution lifecycle-aware: a valid body and record are insufficient unless the separate server-owned lifecycle head proves the exact template version/hash is currently published or deprecated.

### RED/GREEN changes

Added `modeTemplateLifecycleDocumentPath` and lifecycle-head resolution in `createFirestoreModeTemplateResolver`. The resolver now requires the exact lifecycle envelope (`v2-mode-template-lifecycle.v1`), exact template/version/hash binding, non-empty reason/audit fields, positive lifecycle revision, and accepts only `published` or `deprecated`; missing, approved, archived, draft, hidden, extra-field, or replacement-ref-shape mismatches fail closed. Deprecated versions remain resolvable for already-pinned immutable consumers; archived/approved versions do not become runtime inputs.

Evidence: ModeTemplate/Firestore suite **1 suite / 18 tests PASS**; full focused Functions matrix **8 suites / 55 tests PASS**; targeted strict TypeScript **PASS**. No commit, deploy, publish, production write, or release activation.

### Remaining P1/P2 and exact next task

Lifecycle receipt/audit append-only subject verification is still separate and not yet resolved by this bounded head check. Asset refs remain unresolved cross-object. LearningDesign is still an adapter pending a complete Episode fixture; delayed probe context/evidence, mastery, checkpoint, voice policy, localization and release-gate relations remain open. Exact next task: add lifecycle receipt subject-fingerprint/replacement binding RED tests, then migrate one complete normative Episode body and wire `validateEpisodeLearningDesignShape` into the Episode resolver.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; preserve both untracked Admin-transfer artifacts. Exact next startup: read this handover and the four authoritative V2 documents, rerun the 8-suite matrix, then implement only lifecycle receipt subject binding before Episode learningDesign wiring.

## 13.16 Episode learningDesign validator wired

### Mission and status

The complete V2 objective remains active. This slice moves `EpisodeLearningDesign` from an unused adapter into the default immutable Episode body validator while preserving the existing strict structural and legacy-compatibility boundaries.

### RED/GREEN changes

`validateEpisodeRevisionArtifactBody` now calls `validateEpisodeLearningDesignShape` after the graph, mastery and voice structural checks. The resolver test's valid normative ActivityInstance fixture now carries an explicit primary outcome, objective, support plan, prerequisite list, independent probe, delayed probe hash ref and HYP-V2-007 window policy; malformed/empty learningDesign bodies remain fail-closed. This is wiring evidence for the current authoring-body schema, not yet proof that the complete `v2-episode-contract.v1` corpus is accepted end-to-end.

Evidence: Episode resolver suite **1 suite / 21 tests PASS**; full focused Functions matrix **8 suites / 55 tests PASS**; targeted strict TypeScript **PASS**; `git diff --check` **PASS** (only CRLF normalization warnings). No commit/deploy/release.

### Remaining P1/P2 and exact next task

Lifecycle append-only gate/review receipt subject binding is still not implemented. The complete normative fixture's `v2-episode-contract.v1` body is not yet migrated through the immutable Episode resolver; current resolver tests still use `episode-authoring-body.v1`. Delayed probe declarations, mastery/checkpoint relations, voice policy/asset cross-object resolution, localization projections and release gates remain incomplete. Exact next task: create a complete Episode resolver fixture from `tests/fixtures/learning-v2/episode-01.valid.json`, add schema adapter/strict body validation without weakening authoring checks, and then add receipt subject-fingerprint RED/GREEN.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; preserve both untracked Admin-transfer artifacts. Exact next startup: read this handover and the four authoritative V2 documents, inspect the episode fixture's full body schema, then implement only the complete Episode resolver fixture/adapter slice.

## 13.17 ModeTemplate provenance and deprecation semantics correction

Independent Sol review found two lifecycle-contract gaps and they were closed before advancing. ModeTemplate record provenance now accepts the normative optional `basedOn` and `generator` shapes (while rejecting unknown/malformed nested fields). Lifecycle deprecation now requires exactly one explicit replacement route: a valid `replacementRef` or `noReplacement: true`; published heads reject deprecation-only metadata. Invalid statuses and deprecated-without-decision are covered by RED/GREEN tests.

Evidence after correction: Firestore resolver **1 suite / 19 tests PASS**; full focused Functions matrix **8 suites / 56 tests PASS**; targeted strict TypeScript **PASS**. Remaining P1/P2: replacement-ref existence/hash/self-reference, append-only review/validation receipt gate, full `v2-episode-contract.v1` resolver migration, and deep Episode cross-object policy checks. No commit/deploy/release.

## 13.19 Shared ModeTemplate lifecycle contract

Added `ModeTemplateLifecycleHead` to the shared activity contract and exported `validateModeTemplateLifecycleHead`. The Firestore resolver now invokes the shared validator in addition to its Storage/Firestore binding checks. The shared contract enforces exact keys, lifecycle fields, replacement-vs-`noReplacement` XOR, rejects `published` deprecation metadata including `noReplacement: false`, and rejects self-replacement. The resolver and shared corpus now agree on the lifecycle schema.

Evidence: Firestore resolver/shared lifecycle suite **1 suite / 20 tests PASS**; full focused Functions matrix **8 suites / 57 tests PASS**; targeted strict TypeScript **PASS**; `git diff --check` **PASS** with only line-ending warnings. Remaining: replacement target existence, append-only review/validation/gate receipts, complete Episode fixture migration and downstream V2 phases. No commit/deploy/release.

## 13.20 Shared Content Studio receipt subject/gate contracts

Added shared `ContentReceiptSubject`, `ContentGateReceiptBody` and `ContentGateReceiptRecord` types, plus strict `validateContentReceiptSubject` and `validateContentGateReceiptBody`. The validator enforces exact entity identity/revision/fingerprint, receipt hash fields, gate kind, evaluator/timestamp, optional iOS/Android preview hashes, and unknown/malformed field rejection. This is contract/RED-GREEN evidence only: it does not yet claim that a publish transition has loaded and cross-checked all append-only receipts.

Evidence: new receipt contract suite **1 suite / 7 tests PASS**; expanded focused matrix **9 suites / 64 tests PASS**; targeted strict TypeScript **PASS**; `git diff --check` **PASS**. No commit/deploy/release.

Exact next task: add a bounded transition validator that cross-checks a ModeTemplate lifecycle change against fresh validation/review/gate receipt subjects and replacement target refs, then add resolver/callable integration tests.

## 13.21 ModeTemplate approval transition validator

Added `mode_template_transition.ts` with two explicit server-side seams: `validateModeTemplateApprovalGate` cross-checks exact same-subject validation, localization and review evidence against an approval `ContentGateReceiptBody` and its pinned receipt hashes; `validateModeTemplateReplacementTarget` requires a resolved published replacement and rejects self-reference, invalid hashes/versions and non-published targets. The immutable ModeTemplate record and lifecycle head remain free of receipt IDs/backreferences.

Evidence: transition suite **1 suite / 7 tests PASS**; expanded focused matrix **10 suites / 71 tests PASS**; targeted strict TypeScript **PASS**; `git diff --check` **PASS** with only line-ending warnings. This is a pure transition-validator slice; callable wiring and actual append-only Firestore receipt reads remain next.

Exact next task: integrate the transition validator into the publish/deprecate callable path using server-owned receipt readers and add Firestore emulator tests for stale subjects, missing target records, maker-checker/review status and idempotent lifecycle updates.

## 13.22 Server-owned ModeTemplate receipt reader seam

Added `mode_template_transition_reader.ts`, a server-owned Firestore document reader seam for the four normative receipt collections (`content_studio_validation_receipts`, `content_studio_localization_receipts`, `content_studio_review_receipts`, `content_studio_gate_receipts`). It loads receipt evidence by server-side IDs, validates exact receipt shapes, rejects missing documents, stale subject fingerprints and forged gate hashes, then delegates to the pure transition validator. Client-supplied receipt bodies are not trusted and immutable records remain unchanged.

Evidence: reader suite **1 suite / 4 tests PASS**; expanded focused matrix **11 suites / 75 tests PASS**; targeted strict TypeScript **PASS**; `git diff --check` **PASS** with only line-ending warnings. This is a read/validation seam, not yet a callable mutation or Firestore transaction.

Exact next task: wire the reader and transition validator into the actual Content Studio publish/deprecate callable/repository, add target lifecycle resolution and idempotent transaction/emulator tests, then proceed to full Episode fixture migration.

## 13.23 Guarded ModeTemplate lifecycle repository

Added `ModeTemplateLifecycleTransitionRepository` as the first mutation seam around the server-owned reader. `publish` requires the current exact approved lifecycle, expected lifecycle revision (CAS), a fresh server-loaded approval gate, then writes only the next lifecycle projection and an append-only audit event. `deprecate` requires a published current version, CAS, a resolved published replacement or explicit `noReplacement`, and appends the audit event. Missing receipts, stale revisions and unresolved replacement targets fail closed; immutable template bodies/records are untouched.

Evidence: repository suite **1 suite / 3 tests PASS**; expanded focused matrix **12 suites / 78 tests PASS**; targeted strict TypeScript **PASS**; `git diff --check` **PASS** with only line-ending warnings. This is a repository seam with in-memory RED/GREEN evidence; actual Firestore adapter and public callable wiring remain open.

Exact next task: implement the Firestore transaction adapter and guarded `adminPublishV2ModeTemplate`/deprecate callable using this repository, then run emulator tests for CAS collision, audit append and idempotent replay.

## 13.24 Firestore adapter and guarded ModeTemplate callables

Added `createFirestoreModeTemplateLifecycleStore`, including transaction-scoped lifecycle/record/receipt reads, CAS lifecycle update and append-only audit path. Added strict `requireContentPublisher` and `parseV2ModeTemplateLifecycleRequest`, plus guarded `adminPublishV2ModeTemplate` and `adminDeprecateV2ModeTemplate` callables. Publish requires receipt IDs and forbids replacement metadata; deprecate requires exactly one replacement choice. Both route through the lifecycle repository and App Check callable boundary.

Evidence: callable/parser + repository checks **2 suites / 9 tests PASS**; expanded focused matrix **12 suites / 79 tests PASS**; targeted strict TypeScript **PASS**; `git diff --check` **PASS** with only line-ending warnings. Emulator transaction coverage for the actual Firebase adapter, audit persistence and idempotent replay remains open; no deploy or production write.

## 13.25 Firestore emulator proof for ModeTemplate lifecycle callables

Added `v2_mode_template_lifecycle.emulator.test.ts` and the reusable `test:emulator:v2-mode-template-lifecycle` script. The isolated Firestore emulator seeds immutable template metadata, approved/published lifecycle heads and four server-owned receipt collections, then proves: publish requires the exact receipt gate, advances lifecycle revision, appends audit, and rejects stale replay; deprecate resolves a published replacement and appends the second lifecycle transition. The test uses the actual `adminPublishV2ModeTemplate` and `adminDeprecateV2ModeTemplate` callable handlers.

Evidence: Firestore emulator **1 suite / 2 tests PASS**; focused unit matrix remains **12 suites / 79 tests PASS**; targeted strict TypeScript **PASS**. Emulator output reported only Jest's existing open-handle warning after successful teardown; no production write/deploy.

Exact next task: add stronger idempotency-key replay semantics and rules-level audit immutability checks, then migrate one complete normative Episode fixture through the resolver.

Exact next task: add Firestore emulator tests for the new publish/deprecate callables and adapter (receipt collection reads, CAS collision, audit append, replay/idempotency), then begin complete Episode fixture migration.

## 13.18 ModeTemplate lifecycle hardening

Added further fail-closed checks identified by the independent review: positive safe-integer immutable object byte size; non-empty lifecycle reason/auditor/timestamp fields; replacement refs require non-empty IDs, positive versions, lowercase SHA-256 content hashes, and cannot self-reference. The resolver still does not claim target replacement existence or append-only receipt verification; those remain explicit release-transition responsibilities. Firestore suite remains **19 tests PASS** and targeted strict TypeScript remains **PASS**.

## 13.14 Review correction: ModeTemplate provenance envelope

Independent Sol review found a P1: the strict ModeTemplate record envelope had omitted the normative `provenance` and top-level `createdAt` fields. This is corrected before advancing: the resolver now requires exact record keys including `provenance`/`createdAt`, exact provenance keys `createdBy`/`createdAt`, and non-empty string values; the happy-path fixture now carries those fields. Firestore resolver evidence remains **1 suite / 13 tests PASS** and targeted strict TypeScript remains **PASS**. The independent reviewer also confirmed P0=0; remaining P1s are lifecycle head/receipt enforcement and deeper cross-object semantic checks. Do not call this slice complete beyond the stated evidence.

## 13.13 ModeTemplate immutable envelope closure

### Mission and status

The complete V2 objective remains active. This slice closes strict top-level and nested object-envelope validation for the immutable ModeTemplate Firestore index before its Storage body is resolved.

### RED/GREEN changes

`createFirestoreModeTemplateResolver` now requires the exact record keys `schemaVersion`, `templateId`, `version`, `contentHash`, `object` and the exact object keys `objectPath`, `contentHash`, `objectGeneration`, `byteSize`; unknown fields fail closed. Added a regression test covering extra fields in both envelopes. The shared semantic validator, canonical Storage hash/generation/byte-size binding, and complete normative fixture remain active.

Evidence: Firestore resolver suite **1 suite / 13 tests PASS**; targeted strict TypeScript **PASS**. No commit, deploy, publish, or production write.

### Remaining P1/P2 and exact next task

Published lifecycle receipt/status is not yet loaded or enforced by the ModeTemplate resolver. Asset refs remain unresolved cross-object. LearningDesign is still an adapter pending full Episode fixture migration; delayed probe context/evidence, mastery, checkpoint and voice policy relations remain open. Exact next task: define the lifecycle head/receipt contract from existing Content Studio schemas, add stale/non-published RED fixtures, then wire the learningDesign validator into a complete normative Episode body.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; preserve both untracked Admin-transfer artifacts. Exact next startup: read this handover plus the four authoritative V2 documents, run the focused resolver tests, then implement only the lifecycle RED/GREEN slice above.

## 13.12 Shared ModeTemplate validator wired to Storage resolver

### Mission and status

The complete V2 objective remains active. This slice wires the canonical shared ModeTemplate semantic validator into the immutable Firestore+Storage resolver and replaces the resolver's skeletal happy-path body with the repository's complete normative corpus template.

### RED/GREEN changes

`createFirestoreModeTemplateResolver` now rejects any body that fails `validateModeTemplateArtifactBody`, after exact record/ref/path/generation/hash/byte-size checks. The happy-path test loads the first complete template from `tests/fixtures/learning-v2/episode-01.valid.json`, computes its canonical byte size, and verifies the real allowlist. Existing malformed authoring metadata remains rejected. This closes the prior gap where only a local subset of the template contract was checked.

Evidence:

- Full focused Functions matrix: **8 suites / 49 tests PASS**.
- ModeTemplate/Firestore subset: **12 tests PASS**.
- Targeted strict TypeScript including shared validator: **PASS**.
- `git diff --check`: **PASS**.

### Remaining P1/P2 and exact next task

Published lifecycle receipt/status is not yet loaded or enforced by the ModeTemplate resolver. Asset refs remain unresolved cross-object. LearningDesign is still an adapter pending full Episode fixture migration; delayed probe context/evidence, mastery, checkpoint and voice policy relations remain open. Exact next task: add lifecycle head/receipt record fixtures and reject non-published/stale template versions, then wire the learningDesign validator into a complete normative Episode body.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.11 Complete normative ModeTemplate corpus evidence

### Mission and status

The full V2 objective remains active. This slice proves that the newly exposed canonical ModeTemplate validator accepts the repository's existing complete normative corpus, so the next resolver wiring task can use real content rather than skeletal examples.

### RED/GREEN changes

Added a focused corpus test loading `tests/fixtures/learning-v2/episode-01.valid.json` and validating every dependency template through `validateModeTemplateArtifactBody`. The corpus contains the full policies, kernel, learner copy, fixtures, compatibility and learning-contract references required by §08. The prior malformed-body test remains RED/GREEN evidence for fail-closed behavior.

Evidence:

- Full focused Functions matrix: **8 suites / 49 tests PASS**.
- Firestore/ModeTemplate subset: **12 tests PASS**.
- Targeted strict TypeScript: **PASS**.
- `git diff --check`: **PASS**.

### Remaining P1/P2 and exact next task

The complete shared ModeTemplate validator is exposed and proven against real corpus data, but the Firestore resolver still uses its bounded local checks and has not yet invoked the full adapter; lifecycle receipt/published-state validation is also open. Exact next task: replace the resolver's local body check with `validateModeTemplateArtifactBody`, migrate its happy-path fixture to one corpus template, and add lifecycle mismatch rejection. LearningDesign remains an adapter pending full Episode fixture migration; delayed/learning/mastery/checkpoint/voice policy semantics remain open.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.10 LearningDesign prerequisite/support semantic packet

### Mission and status

The complete V2 objective remains active. This bounded slice adds a canonical structural-semantic validator for the normative `EpisodeLearningDesign` contract without yet forcing skeletal emulator bodies through it.

### RED/GREEN changes

Added `validateEpisodeLearningDesignShape`, requiring exact keys for primary outcome, objective list, prerequisite edges, support plan, independent probe, delayed probe ref and delayed window policy. It validates prerequisite source kind/state, objective/source IDs, support level, fade/escalation rule IDs and delayed ref hash. Tests cover a valid design, invalid required state and malformed delayed ref.

Evidence:

- Full focused Functions matrix: **8 suites / 48 tests PASS**.
- Episode validator suite: **21 tests PASS**.
- Targeted strict TypeScript: **PASS**.
- `git diff --check`: **PASS**.

### Remaining P1/P2 and exact next task

The new validator is currently an explicit adapter and not yet wired into `validateEpisodeRevisionArtifactBody`; skeletal pilot fixtures must first be migrated to complete learningDesign and ModeTemplate bodies. It also does not yet prove prerequisite acyclicity, objective existence, evidence-policy refs, delayed window registry binding, mastery requirements, checkpoint material or voice governance. Exact next task: migrate one complete normative Episode fixture, wire this validator, and add cross-field learning/mastery/checkpoint RED/GREEN without weakening legacy behavior.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.09 Shared ModeTemplate semantic-validator adapter

### Mission and status

The complete V2 objective remains active. This slice exposes the existing canonical ModeTemplate semantic validator as a reusable adapter for immutable Content Studio resolvers, avoiding a second weakened schema implementation.

### RED/GREEN changes

Added `validateModeTemplateArtifactBody` in `modules/learning-v2/contracts/validation.ts`, delegating to the existing full `validateTemplateArtifactBodyShape` contract and returning the standard `V2ContractValidationResult`. Added a focused test proving malformed template bodies fail through the public adapter. The current Firestore resolver still performs its bounded identity/authoring checks; wiring the full adapter into the resolver is intentionally the next task because current emulator fixtures are skeletal and must first be upgraded to complete normative ModeTemplate bodies.

Evidence:

- Full focused Functions matrix: **8 suites / 47 tests PASS**.
- Episode + Firestore subset: **2 suites / 31 tests PASS**.
- Targeted strict TypeScript including shared validation module: **PASS**.
- `git diff --check`: **PASS**.

### Remaining P1/P2 and exact next task

Full ModeTemplate semantic adapter is exposed but not yet wired into the resolver; lifecycle receipt validation is also open. Exact next task: build a complete normative ModeTemplate fixture (policies, kernel, copy, fixtures, compatibility, learning refs), wire `validateModeTemplateArtifactBody` into the Firestore resolver, and add valid/invalid semantic and lifecycle tests. Delayed probe context/evidence, learningDesign/mastery/checkpoint/voice relationships and asset refs remain open. Do not claim Task 2.2 complete.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.08 ModeTemplate authoring metadata hardening

### Mission and status

The full V2 objective remains active. This slice hardens the immutable ModeTemplate resolver so an approved Episode cannot obtain an allowlist from malformed authoring metadata.

### RED/GREEN changes

The resolver now requires the complete `authoring` shape (`editableFieldPaths`, `requiredFieldPaths`, `defaultValues`, `allowedOverridePaths`), rejects unknown authoring keys, and requires the path arrays to contain strings. Added a RED/GREEN Firestore-level test for malformed authoring metadata while preserving the valid published-template resolver test. This is in addition to the prior exact template ref, Storage generation/hash/byte-size, empty-override, and delayed-probe structural gates.

Evidence:

- Full focused Functions matrix: **8 suites / 46 tests PASS**.
- Firestore resolver subset: **10 tests PASS**.
- Targeted strict TypeScript: **PASS**.
- `git diff --check`: **PASS**.

### Remaining P1/P2 and exact next task

The ModeTemplate resolver still does not invoke the complete shared semantic validator or lifecycle receipt validator; delayed probe context/declarations remain structural rather than canonical; learningDesign/mastery/checkpoint/voice policy links and asset cross-object refs remain open. Exact next task: adapt the shared ModeTemplate validator to the immutable resolver body, add published lifecycle acceptance/rejection fixtures, then deepen delayed-probe semantics. Do not advance Task 2.3 or claim Task 2.2 complete.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.07 Default ModeTemplate Storage resolver and delayed-probe shape gate

### Mission and status

The complete V2 objective remains active. This slice closes the two concrete Sol-review P1s around template pins: empty overrides can no longer bypass template resolution, and the production Season callable now wires a Firestore+Storage ModeTemplate resolver. It also begins the delayed-probe contract gate.

### RED/GREEN changes

The Sol review reproduced a forged/nonexistent template accepted with empty overrides and confirmed that the callable had no production resolver. `assertEpisodeModeTemplateOverrides` now resolves every normative activity template, even when `overrides` is empty, compares `templateId/version/contentHash` field-by-field, and checks every override path. Added `createFirestoreModeTemplateResolver` with the normative `content_mode_template_versions/{templateId}__v{version}` index, content-addressed Storage path, generation/hash/byte-size checks, body schema/template identity and `authoring.allowedOverridePaths`. `adminSaveV2SeasonDraft` now wires this resolver into the Episode resolver. Added a delayed-probe structural gate: exact ref/body envelope, target Episode/probe binding, activity binding, non-empty declarations and `phase='delayed_probe'` are required.

Evidence:

- Full focused Functions matrix: **8 suites / 45 tests PASS**.
- Episode + Firestore resolver subset: **2 suites / 29 tests PASS**.
- Targeted strict TypeScript: **PASS**.
- `git diff --check`: **PASS**.
- Sol independent review initially found P0=0/P1=2/P2=2; both P1 bypasses are addressed. Luna verification remains green on the validator/tsc path.

### Remaining P1/P2 and exact next task

ModeTemplate resolver currently validates the required body/record fields but does not yet run the complete shared ModeTemplate semantic validator or published lifecycle receipt check. Asset refs remain unresolved cross-object. Delayed probe pedagogical context/evidence declarations are only structural; learningDesign/mastery/checkpoint/voice policy relationships remain open. Exact next task: use canonical shared validators for ModeTemplate body and delayed declaration/context semantics, then add learningDesign/mastery/checkpoint RED/GREEN. Production App Check invalid-token evidence and timestamp/object-generation format gates remain open.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.06 ModeTemplate resolver seam and override allowlist gate

### Mission and status

The complete V2 objective remains active. This bounded slice adds the missing cross-object seam required by §08: Episode activity overrides cannot be trusted from the Episode body alone; they must be checked against the exact published ModeTemplate ref and its immutable `authoring.allowedOverridePaths`.

### RED/GREEN changes

Added `ImmutableEpisodeRevisionResolver.resolveModeTemplate` as an optional server-side seam and extracted `assertEpisodeModeTemplateOverrides`. A normative activity with non-empty overrides now fails closed when no template resolver is wired; a resolver must return the exact same template ref and every override key must be allowlisted. Tests cover missing resolver, allowed path and forbidden path. `createFirestoreEpisodeRevisionResolver` accepts the seam without changing the default immutable Storage reader or mutable draft behavior. Empty overrides remain valid without a template lookup.

Evidence:

- Full focused Functions matrix: **8 suites / 43 tests PASS**.
- Episode validator/override suite: **19 tests PASS**.
- Targeted strict TypeScript: **PASS**.
- `git diff --check`: **PASS**.
- Independent Luna verification previously confirmed validator/tsc; a new Sol spec review is in progress for this seam.

### Remaining P1/P2 and exact next task

The seam is currently injectable and not yet backed by a concrete immutable ModeTemplate Storage resolver in production. Asset object refs also need cross-object resolution. Deep delayed-probe, learningDesign, mastery, checkpoint, voice governance and policy validation remain open, as do timestamp/object-generation formats and production App Check evidence. Exact next task after Sol verdict: wire the default ModeTemplate resolver to the same generation/hash-pinned Storage path discipline, then add RED/GREEN for delayed and checkpoint contract dependencies. Do not claim Task 2.2 complete.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.05 Normative ActivityInstance hash and strict-shape closure

### Mission and status

The complete V2 objective remains active. This slice advances Task 2.2's Episode body contract: normative `ActivityInstanceArtifactBody` is now the only accepted activity shape inside an EpisodeRevision body, and its payload hash/template reference are checked structurally. Existing mutable draft semantics and legacy app behavior outside the approved immutable Episode contract remain preserved.

### RED/GREEN changes

The independent Sol review identified three P1s: forged `templateRef`, forged `payloadHash`, and acceptance of the older resolved-runtime activity shape. RED tests were added for forged payload hash and incomplete normative fields. GREEN now requires the normative schema marker, exact template ref (`templateId/version/contentHash`), canonical `hashCanonicalBody(payload)` equality, exact localization/tags/assets/overrides structure, and parent Episode binding. The 32-season emulator fixture was migrated to the normative activity body shape; the legacy alternate activity shape is no longer accepted by the EpisodeRevision validator.

Evidence:

- Full focused Functions matrix: **8 suites / 42 tests PASS**.
- Episode validator: **1 suite / 18 tests PASS**.
- Targeted strict TypeScript: **PASS**.
- `git diff --check`: **PASS**.
- Sol spec review: initial verdict P0=0/P1=3/P2=1; all three reported P1s were addressed in this slice (payload hash, template ref, legacy shape rejection). Luna verification worker independently confirmed the validator tests and strict tsc.

### Remaining P1/P2 and exact next task

Still open: `overrides` must be checked against the pinned ModeTemplate `authoring.allowedOverridePaths` (the Episode body carries only a ref, so resolver-level template loading is required); asset object refs need cross-object Storage resolution; delayed probe definitions, learningDesign, mastery, checkpoint, voice governance and policy relationships still need canonical deep validators; timestamps/object-generation format and production App Check evidence remain open. Exact next task: introduce a bounded template resolver seam and RED/GREEN tests for override allowlists, then continue with delayed/learning/checkpoint contracts. Do not claim Task 2.2 complete yet.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.04 Structural normative ActivityInstance body gate

### Mission and status

The full V2 objective remains active. This bounded slice adds a second, explicit validation branch for the normative §08 `ActivityInstanceArtifactBody` shape without silently rewriting the existing runtime-compatible activity projection used by current fixtures. It is a structural gate only; deep payload semantics, voice policy resolution and full Episode contract closure remain open.

### RED/GREEN changes

Added RED coverage for a `v2-activity-instance-body.v1` activity missing `payloadHash` and `localization`, then GREEN validation for the complete normative shape: exact top-level fields, parent Episode binding, template ref, family, revision/seconds, payload hash format, content units, overrides, tags/modalities, localization/source hashes, and asset/object refs. Unknown nested keys fail closed. A complete normative activity fixture is accepted; malformed one is rejected. Existing activities without the normative schema marker remain on the current compatibility path and are not treated as approved §08 artifacts.

Evidence:

- Full focused Functions matrix: **8 suites / 41 tests PASS**.
- Episode validator suite: **1 suite / 17 tests PASS**.
- Targeted strict TypeScript: **PASS**.
- `git diff --check`: **PASS**.
- Model-confirmed Luna verification worker: **1 suite / 17 tests PASS; strict tsc PASS; no source changes**.
- Sol spec-review worker is still completing the independent §08 comparison; no release claim is made before its verdict.

### Remaining P1/P2 and exact next task

This does not yet validate payload schema/content hashes, allowable `overrides` against the pinned ModeTemplate authoring contract, deep VoiceReleaseRequirements, delayed probe definitions, learningDesign/mastery/checkpoint semantics, or cross-object ref resolution. The compatibility path also remains intentionally separate and must be migrated or retired only under the approved Phase 14 decision. Exact next task: consume the Sol review verdict, add RED/GREEN for payloadHash recomputation and template override allowlists, then proceed to delayed/learning/checkpoint contracts.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 13.03 Strict Episode envelope/provenance and resolver failure fixtures

### Mission and status

The full Learning V2 objective remains active. This bounded task strengthens the approved immutable Episode index contract and closes the previously identified resolver-fixture gap. It does not claim deep Episode body semantics, App Check production verification, Task 2.2 completion, or any later V2 phase.

### RED/GREEN changes

RED first reproduced acceptance of unknown keys. The Episode envelope validator now fail-closes unknown keys at the full envelope, record, object, lifecycle, and provenance levels. Normative optional `EntityProvenance.basedOn` and `EntityProvenance.generator` are accepted only with their exact nested shapes and hash/integer/string constraints; valid clone/generated provenance is covered by a GREEN test. A resolver-level fixture now proves that a Storage reader returning a mismatched pinned generation is rejected with `season_episode_object_generation_invalid`; missing/reader-error propagation remains covered as well.

Evidence:

- Full focused Functions matrix: **8 suites / 39 tests PASS**.
- Episode resolver + Firestore store subset: **2 suites / 23 tests PASS**.
- Targeted strict TypeScript: **PASS**.
- `git diff --check`: **PASS** (only normal CRLF conversion warnings).
- Fresh read-only spec/adversarial reviews: **no P0**; the two earlier review findings (optional provenance and true metadata mismatch fixture) are addressed.
- Separate Orbit worker threads were launched for the spec review (`gpt-5.6-sol`, high) and deterministic verification (`gpt-5.6-luna`, medium); their receipts are recorded by the Codex app, not inferred from labels.

### Remaining P1/P2 and exact next task

Still open: complete §08 ActivityInstanceArtifactBody and deep Voice/Delayed/Learning/Mastery/Checkpoint/policy semantic validation; enforce strict ISO timestamp/object-generation formats where the normative contract requires them; decide whether to duplicate body-hash validation inside the resolver or keep the injected reader seam bounded by the production `assertExactImmutableEpisodeRevision` wrapper; and obtain invalid-token/production App Check evidence. These are not silently marked complete. The exact next task is to write RED cases for the deep nested activity contracts and timestamp/generation formats, then implement only the approved contract slice with independent reviews.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.

## 12.99 HTTP wrapper no-token gate and complete reader tamper packet

### Mission and status

The complete Learning V2 objective remains active. This slice adds transport-wrapper and Storage evidence but explicitly does not claim App Check enforcement closure or Task 2.2 completion.

### Changes and evidence

The Season emulator tamper test now covers real Storage wrong-generation, malformed UTF-8, malformed valid-UTF8 JSON, and deleted-object rejection. The callable contract test invokes the exported HTTP wrapper itself (not `.run()`) with a valid callable-shaped POST but both Auth and App Check absent; it receives HTTP 401 `UNAUTHENTICATED`. The runtime log records `{app: "MISSING", auth: "MISSING"}`. Focused Functions matrix is **7 suites / 32 tests PASS**; Season emulator is **1 suite / 3 tests PASS**; targeted strict TypeScript and root `git diff --check` are **PASS**. Fresh spec review confirms these exact claims; no P0 found.

### Critical limitation and next task

The no-token HTTP test proves wrapper-level unauthenticated behavior only. It does **not** prove App Check enforcement independently because Auth is also missing, and there is no authenticated request with missing/invalid App Check or valid App Check acceptance. This remains P1, along with deep semantic Episode validation and body-only Storage persistence. Next exact task: create an authenticated callable protocol harness with missing/invalid/valid App Check cases (or document a verified equivalent emulator token path), then close canonical nested contracts and body-only persistence. Do not commit or advance Task 2.3 while P1 remains.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD: `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve both untracked Admin-transfer artifacts.

## 13.00 Debug HTTP App Check transport harness (bounded evidence)

### Mission and status

The full V2 goal remains active. This slice adds a deliberately isolated debug-token HTTP wrapper harness; it is not production cryptographic token evidence and does not close the remaining semantic schema or body-only Storage P1s.

### Changes and evidence

Added `functions/src/content_studio/emulator/v2_authoring_http_appcheck.emulator.test.ts` and package script `test:emulator:v2-authoring-http`. The harness sets Firebase debug-only `skipTokenVerification`, invokes the exported callable as an HTTP handler (not `.run()`), and proves two branches: Auth-valid + App Check missing -> `401 UNAUTHENTICATED`; debug Auth-valid + debug App Check-valid -> transport passes and the empty payload reaches the handler -> `400 INVALID_ARGUMENT`. Logger evidence records `auth: VALID` with `app: MISSING` and then `auth: VALID` with `app: VALID`. Module environment variables are restored in `afterAll`; the script is intentionally isolated from the ordinary Jest matrix.

Verification: `npm run test:emulator:v2-authoring-http` -> **1 suite / 2 tests PASS**; focused Functions matrix -> **7 suites / 32 tests PASS**; targeted strict TypeScript -> **PASS**; root `git diff --check` -> **PASS**. Fresh spec/adversarial reviews report no P0.

### Explicit limitations and next task

This proves callable wrapper sequencing under Firebase debug harness only. It does not prove production cryptographic App Check, deployed Functions emulator HTTP, or an invalid-token rejection: debug `skipTokenVerification` accepts fabricated `alg:none` tokens. Keep invalid App Check as an open transport/release P1. Body-only immutable Storage persistence is also still open: authoring repositories persist `candidate.body` inline in Firestore, while §08 requires approved immutable artifact bodies to live in Storage. Deep semantic validation of Voice/Delayed/Assessment/Learning/Mastery/Checkpoint and policy relationships remains open. Next exact task: add a real Functions-emulator HTTP path with Auth/App Check token verification or a formally accepted test seam, then design the body-only migration and nested-contract RED/GREEN. Do not commit or advance Task 2.3 while P1 remains.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve both untracked Admin-transfer artifacts; do not use this debug harness as release evidence.

## 13.01 Approved Episode body-only Storage split

### Mission and status

The complete V2 objective remains active. This slice closes the body-duplication issue for the **approved EpisodeRevision index path only**; mutable EpisodeDraft bodies remain inline by design and are not being conflated with approved immutable artifacts.

### Changes and RED/GREEN

Added `validateEpisodeRevisionRecordEnvelope`, which requires the Firestore revision document to contain only the record+lifecycle envelope (an own `body` key is rejected). `createFirestoreEpisodeRevisionResolver` now validates that body-less envelope, initializes its internal artifact body as undefined, and obtains the canonical body exclusively from pinned Storage bytes after path/hash/generation/byte-size checks. Updated the Season emulator's 32 Episode envelopes and the focused Firestore fixture to be body-less. Strengthened the RED test with a fully valid record/lifecycle plus an extra inline body, so the rejection is not caused by malformed provenance. DecisionRegistry still uses its existing `{body, record}` validator and remains a separate body-only P1 if §08's Storage-only rule is applied globally.

Evidence: resolver + Firestore tests **2 suites / 18 tests PASS**; Season Firestore+Storage emulator **1 suite / 3 tests PASS**; full focused matrix **7 suites / 33 tests PASS**; targeted strict TypeScript **PASS**; root `git diff --check` **PASS**. Fresh reviews confirm the Episode body-only claim and report no P0.

### Remaining P1 and exact next task

P1 remains for DecisionRegistry body-only persistence (if the global artifact rule applies), exact-key rejection for extra record/lifecycle fields, resolver-level missing-object/metadata/byte-size negative cases, invalid/production App Check token verification, and deep semantic Episode contracts. Next task: add strict record/lifecycle exact-key validation and resolver-level Storage failure fixtures, then decide and implement the DecisionRegistry body-only adapter without touching mutable draft semantics. Do not commit or advance Task 2.3 while these P1 findings remain.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve both untracked Admin-transfer artifacts.

## 13.02 Approved Episode + DecisionRegistry body-only Storage split

### Mission and status

The complete Learning V2 objective remains active. This bounded slice closes the approved immutable-artifact body split for both EpisodeRevision and DecisionRegistry index envelopes. It does not change mutable EpisodeDraft/SeasonDraft documents, which intentionally retain candidate bodies, and it does not claim Task 2.2 or the full V2 release complete.

### Changes and RED/GREEN

Added `validateDecisionRegistryRecord`, a strict body-less Firestore record-envelope validator with exact top-level keys and strict nested `ref`/`object` keys. A valid record plus an own inline `body` key is rejected. The Firestore DecisionRegistry resolver now validates only the body-less record, reads the canonical body from pinned Storage, checks path/hash/generation/byte-size bindings, and then performs the full body+record validation. The Season emulator now seeds the DecisionRegistry index without `body`, alongside 32 body-less EpisodeRevision indexes; the canonical bodies remain in Storage.

Evidence:

- DecisionRegistry corpus + resolver subset: **3 suites / 92 tests PASS**.
- Full focused Functions matrix: **8 suites / 34 tests PASS**.
- Season Firestore+Storage emulator on isolated alternate ports: **1 suite / 3 tests PASS** (32 Episode objects, DecisionRegistry path, concurrent season CAS, and Storage tamper cases).
- Targeted strict TypeScript: **PASS**.
- Root `git diff --check`: **PASS**.
- Fresh spec/adversarial reviews: **no P0**; both confirm the body-only split for Episode and DecisionRegistry.

The alternate emulator configuration was temporary and removed; no Admin-transfer file, production data, deployment, push, commit, or release activation was performed.

### Remaining P1 and exact next task

The remaining bounded P1s are: deep recursive/semantic Episode validation for Voice, Delayed, Assessment, Learning/Mastery, Checkpoint and policy relationships; exact-key closure for Episode record/lifecycle nested envelopes; resolver-level missing-object and metadata/byte-size negative fixtures where not yet covered; and production/invalid-token App Check evidence (the current HTTP harness is debug-only and accepts fabricated debug tokens). The injected object-reader seam remains test-only evidence, not a replacement for deployed Storage cryptography.

Exact next executable task: add the missing resolver-level Storage failure fixtures and strict Episode envelope key checks, then build the semantic nested-contract RED/GREEN packet. Keep mutable draft bodies unchanged. Do not commit or advance Task 2.3 while these P1 findings remain.

### Full phase/task status and release state

| Scope | Status |
|---|---|
| Phase 00-01 / Task 1.2C | DONE/recorded |
| Phase 02-05 curriculum, voice, stars/access, runtime | PARTIAL |
| Phase 06-13 integration, QA, rollout | NOT STARTED/PARTIAL |
| Phase 14 legacy decision | NOT STARTED; legacy preserved |
| Content Studio Tasks 0-1 | DONE/recorded |
| Task 2.1 | PARTIAL |
| Task 2.2 | PARTIAL / IN PROGRESS |
| Tasks 2.3-15 | NOT STARTED |

Worktree/branch/HEAD remain `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot` / `codex/learning-v2-pilot` / `23c71a117`; no commit, push, deploy, publish, production write or release activation. Preserve `docs/v2/ADMIN_FOUNDATION_TRANSFER_MANIFEST.md` and `tests/admin_v2_lesson_stage_transfer_contract.test.ts`.
## 13.60 Latest execution checkpoint

This is the latest EOF handover entry. The complete Learning V2 objective remains active; legacy behavior is preserved and no commit, push, deploy, production write, or release activation occurred.

Verified in the current bounded slice: lifecycle emulator **1 suite / 1 test PASS** (submit, evidence receipts, maker-checker, concurrent CAS winner, content-hash active pin, archive guard, exact operation envelope, idempotent replay, stale revision); focused Content Studio matrix **22 suites / 112 tests PASS**; targeted strict TypeScript **PASS**; `git diff --check` **PASS**. Fresh spec review confirms these closures but does not treat them as full release proof.

Open blockers: canonical immutable Season Storage envelope/body-hash validation for active pins; transport-level lifecycle App Check/Auth proof; explicit approved-only resolver separation; legacy envelope opt-in and true record-only validation; server-owned submit artifact/ownership binding and review-queue projection; canonical receipt IDs/body-record completeness and nested operation exact-key closure.

Exact next executable task: implement canonical Season pin validation with RED/GREEN emulator fixtures for missing object, tampered bytes, generation/byte-size mismatch, content-hash mismatch, wrong lifecycle status, and valid approved/released pin. Then add lifecycle transport App Check/Auth coverage where supported, rerun lifecycle/ContentGate/HTTP/unit/TypeScript gates, and append fresh counts. Do not advance to runtime, stars, curriculum UI, or release work until this predecessor contract gate is closed.

Worktree: `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`; branch `codex/learning-v2-pilot`; recorded HEAD `23c71a117`. Preserve untracked Admin-transfer artifacts.

## 13.61 Season immutable pin body/record validator slice

Bounded implementation completed without commit. The normative target was the exact approved SeasonRevision pin: hashable Season body, immutable record, recomputed `contentHash` and revision `fingerprint`, approved/released status, and exact approved EpisodeRevision refs. Added `validateSeasonImmutablePin` and `assertSeasonImmutablePin` to `modules/learning-v2/authoring/season_draft.ts`; the validator is fail-closed, rejects extra keys, identity/hash/fingerprint/status tampering, malformed refs, and invalid Season composition. `hasActiveSeasonPin` in `functions/src/content_studio/firestore_authoring_store.ts` now ignores a matching Firestore pin unless this validator accepts `{body,record}` and the separate Season lifecycle is approved/released. The lifecycle emulator fixture now uses a complete vertical-slice Season body/record rather than a forged minimal object.

RED: `Push-Location functions; npx jest --runTestsByPath src/content_studio/season_immutable_pin.test.ts --no-cache --runInBand; Pop-Location` failed with missing `validateSeasonImmutablePin` export. GREEN: the same command **1 suite / 6 tests PASS**. `npm run test:emulator:v2-episode-lifecycle` **1 suite / 1 test PASS**. Targeted strict TypeScript for `season_draft.ts`, the Firestore adapter, and the new test **PASS**. No commit, push, deploy, production write, or release activation.

This closes only the Firestore Season body/record binding. It does **not** yet prove a canonical Season Storage object, generation/byte-size verification, or a strict Season lifecycle envelope. Exact next executable task remains the Storage-backed Season envelope/body-hash RED/GREEN set (missing object, tampered bytes, generation/byte-size mismatch, wrong lifecycle status, valid approved/released pin), followed by transport lifecycle App Check/Auth evidence. Legacy behavior remains preserved.
## 13.62 Verification after Season pin validator

The strict Firestore Season body/record pin validator is now included in the focused regression set. `npx jest --runInBand --no-cache` over the 23 Content Studio suites completed **23 suites / 118 tests PASS**. The new `season_immutable_pin.test.ts` contributes **1 suite / 6 tests PASS**; the lifecycle emulator and targeted strict TypeScript remain green from the same bounded slice. This is still not Storage-backed Season proof: `SeasonDraftRecord` does not yet carry the canonical immutable object reference required by spec 08, and `hasActiveSeasonPin` still reads the inline Firestore body. Next task is to add the separate `SeasonRevisionRecord`/object reader seam without changing mutable draft semantics, then prove missing/tampered/generation/byte-size failures in the emulator. No commit, push, deploy, production write, or release activation occurred; legacy remains preserved.
## 13.63 SeasonRevision Storage resolver seam

Added a separate `SeasonRevisionRecord`/`SeasonLifecycleHead`/`SeasonRevisionEnvelope` contract in `modules/learning-v2/authoring/season_revision.ts`, preserving the mutable `SeasonDraft` contract. The envelope validator binds body hash, revision fingerprint, object hash metadata, and lifecycle identity/status with exact-key fail-closed checks. Added `resolveImmutableSeasonRevision` plus an injected `SeasonRevisionObjectReader` seam in `functions/src/content_studio/season_revision_resolver.ts`; the resolver reads separate revision/lifecycle documents, then reads the pinned canonical object and rejects a tampered body. The Storage adapter is shaped around the existing immutable canonical object reader.

RED/GREEN: new envelope/resolver packet initially lacked the contract export; after implementation `npx jest --runInBand --no-cache src/content_studio/season_revision_envelope.test.ts src/content_studio/season_revision_resolver.test.ts` passes **2 suites / 6 tests**. Targeted strict TypeScript for the new contract, resolver, and tests passes. This is a resolver seam and contract proof, not yet production wiring: `hasActiveSeasonPin` still uses the older inline Firestore body path, and the Season lifecycle adapter still needs strict direct-head schema validation. No commit, push, deploy, production write, or legacy removal.

Exact next task: wire `resolveImmutableSeasonRevision` into the lifecycle active-pin check through a transaction-safe, retry-safe reader path; seed canonical Season Storage bytes and body-less Firestore record/lifecycle documents in the emulator; prove missing-object, hash, generation, byte-size, wrong-status, and valid approved/released cases. Then rerun the 23-suite matrix and independent adversarial review before moving to runtime/stars.
## 13.64 Canonical Season pin wired into lifecycle guard

`createFirestoreEpisodeLifecycleStore` now accepts/creates a Storage-backed Season object reader and, for body-less `content_season_revisions` records, resolves the separate Season lifecycle plus pinned canonical object before checking Episode refs. Malformed or missing canonical objects fail closed; the older mutable/draft-shaped fixture remains supported only as a compatibility path. The lifecycle emulator now seeds a body-less canonical Season record, Storage bytes with content-hash metadata and generation/byte-size bindings, an approved direct lifecycle head, and proves archive is rejected while that canonical pin is active. The resolver unwraps `{record}` Firestore documents correctly.

Evidence: `npm run test:emulator:v2-episode-lifecycle` — **1 suite / 1 test PASS** including the new canonical Storage pin path. Season resolver/envelope unit packet — **2 suites / 10 tests PASS**, including tampered body and propagated missing/hash/generation/byte-size failures. Targeted strict TypeScript for the store/resolver/contract — **PASS**. One earlier RED exposed that Firestore body-less documents wrap the record; the resolver was corrected before GREEN. No commit, deploy, production write, or legacy removal.

Remaining: the default canonical Season path is now wired, but the compatibility inline-body path and unbounded collection scan remain; strict lifecycle projection/indexing, App Check transport evidence, submit ownership/queue, and full V2 runtime/curriculum/stars work are still open. Exact next task: add negative emulator cases for wrong Season lifecycle status and Storage generation/byte-size tampering through the active-pin guard, then run fresh adversarial review.
## 13.65 Season pin metadata and active-status correction

The Season resolver now compares the object reader's returned `contentHash`, `objectGeneration`, and `byteSize` against the Firestore record, failing with `season_revision_object_metadata_invalid` on drift. The lifecycle active-pin branch now treats only `approved` Season lifecycle as active; `archived` is historical and must not block Episode archive, while `released` is not part of the normative SeasonLifecycleHead union and is not accepted implicitly. Resolver tests cover returned metadata drift plus reader-thrown missing/hash/generation/byte-size errors.

Evidence: Season envelope/resolver/pin tests — **3 suites / 19 tests PASS**; targeted TypeScript after the status correction — **PASS**. Fresh independent review found remaining P1s: active-pin lookup still performs an unbounded collection scan and Storage reads inside a Firestore transaction; the inline legacy body path remains; canonical Season body validation is still structural rather than full composition/DecisionRegistry/cardinality validation; lifecycle transport App Check/Auth is not proven. These are recorded, not hidden. No commit, deploy, production write, or legacy removal.

Exact next task: add full semantic SeasonRevision body validation (scope, chapters, gates, DecisionRegistry ref and cardinality), then replace the unbounded scan with a server-owned bounded pin index or prevalidated projection. Add archived/wrong-status emulator evidence and rerun the release-critical review before moving to stars/runtime.
## 13.66 Canonical Season path, metadata, and semantic pin checks

Closed the latest reviewer findings in the Season pin seam. `seasonRevisionObjectPath` now enforces the normative content-addressed path `content-studio/seasons/<sha256(draftId)>/r<revision>/<contentHash>.json`; the resolver compares returned Storage metadata (`contentHash`, generation, byte size) against the immutable record; the active lifecycle guard only treats `approved` Season heads as active; and canonical Season bodies now require release scope, Episode refs, cardinality (1/8/32), approved ref identity/hashes, chapters/gates arrays, gate policy version, and DecisionRegistry ref structure. The emulator fixture was updated to the canonical hashed path and complete vertical-slice body.

Evidence: canonical Season resolver/envelope tests **2 suites / 13 tests PASS**; lifecycle emulator **1 suite / 1 test PASS** after the body ref approval field and canonical path fixes; targeted strict TypeScript **PASS**. The review's earlier stale findings about path/metadata/archived status are now corrected. Remaining P1s are the unbounded collection scan/Storage reads inside Firestore transactions, inline legacy fallback, full deep DecisionRegistry/composition semantics, malformed-active-pin fail-closed policy, and transport-level App Check/Auth proof. No commit, deploy, production write, or legacy removal.

Exact next task: make active Season pin lookup bounded and server-owned (indexed by Episode identity or prevalidated projection), and choose explicit behavior for malformed active canonical pins (block archive versus ignore only marked legacy). Add archived/wrong-status and forged-path emulator cases, then run fresh adversarial review and the full focused matrix.
## 13.67 Focused regression after canonical Season integration

The expanded Content Studio regression matrix now passes **25 suites / 131 tests**. It includes the existing 22-suite matrix, Season immutable pin tests, SeasonRevision envelope tests, and Storage resolver tests. Lifecycle emulator remains **1 suite / 1 test PASS**. No unrelated files were removed and no release state changed. The full V2 objective remains active; next gate is bounded active-pin indexing and explicit malformed-pin behavior.
## 13.68 Bounded Season pin index

Added `seasonEpisodePinIndexDocumentPath` and a server-owned exact lookup in `hasActiveSeasonPin`. When an index projection exists, the lifecycle transaction resolves only the indexed SeasonRevision and its pinned Storage object; malformed index/canonical data fails closed. The older collection scan remains only as a compatibility fallback for legacy inline pins. The lifecycle emulator now seeds and removes the exact Episode→Season pin index and still proves archive rejection for the canonical approved Season.

Evidence: `npm run test:emulator:v2-episode-lifecycle` — **1 suite / 1 test PASS**; prior focused Content Studio matrix remains **25 suites / 131 tests PASS**; `git diff --check` and targeted strict TypeScript remain required before handoff. Fresh review should specifically inspect index creation/update ownership, stale index invalidation, transaction retry behavior, and malformed-index fail-closed semantics. No commit, deploy, production write, or legacy removal.

Exact next task: add server-owned index write/update in Season approval/release transactions, stale-index and archived/wrong-status emulator cases, and Firestore Rules deny coverage for client writes to `content_season_episode_pins`. Then rerun the full focused matrix and adversarial review.
## 13.69 Pin-index security gate

Added the server-only `content_season_episode_pins` collection to Firestore rules and the authoring rules emulator corpus. Client direct operations remain denied; rules emulator passes **1 suite / 411 tests**. The exact index is now read before the compatibility collection scan, and the lifecycle emulator proves the indexed canonical Season pin blocks archive (**1 suite / 1 test PASS**). Index creation/update is not yet wired into Season approval/release transactions, so the projection is currently an explicit server-owned seam rather than a complete production index lifecycle.

Exact next task: write/update/delete the pin index transactionally with Season lifecycle approval/archive, add stale-index and archived/wrong-status cases, and then run the full 25-suite matrix plus fresh adversarial review. Do not claim bounded production lookup until index freshness and ownership are proven.
## 13.70 Server-owned pin projection builder

Added `buildApprovedSeasonPinIndexEntries` and tests for exact Episode-keyed index entries, non-approved suppression, and missing Season identity rejection. This freezes the projection shape before wiring it into Season approval/release transactions. Unit evidence: **1 suite / 3 tests PASS**. The builder is intentionally pure and does not write Firestore; no client or production write path was added. Lifecycle emulator and rules gates remain green from 13.68–13.69.

Exact next task: add the server transaction writer around this projection (create/update approved entries, delete entries on archive/replacement, reject stale Season revision) and invoke it from the actual Season lifecycle approval path. Until that exists, the index remains a tested seam, not a complete lifecycle feature.
## 13.71 Exact pin-index envelope and projection operations

Strengthened the pin-index seam with `season-episode-pin-index.v1`, exact key closure, Episode identity/path/content-hash binding, Season revision fingerprint, lifecycle revision, and a pure transaction operation that deletes prior paths before setting the next projection. The Firestore lifecycle adapter now rejects a malformed or mis-keyed indexed entry fail-closed before resolving its Season object. Emulator fixtures use the complete index envelope.

Evidence: store/index unit packet **2 suites / 24 tests PASS**; lifecycle emulator **1 suite / 1 test PASS**; targeted strict TypeScript **PASS**. Independent review confirms the index envelope and malformed-index fail-closed behavior. The remaining P1 is unchanged: no actual Season approval/archive caller writes this projection, so index freshness and stale cleanup are not yet production-proven. Inline fallback and transaction scan remain compatibility behavior.

Exact next task: add a server-owned Season lifecycle transition repository/callable that uses `applySeasonPinIndexProjection` in the same transaction as approved/archive lifecycle changes; add stale revision, replacement, archive cleanup, and missing-index tests. Keep legacy fallback behind an explicit compatibility flag once the canonical writer is live.
## 13.72 Server-side Season lifecycle/index transaction seam

Added `SeasonLifecycleTransitionRepository` with explicit approve/archive transitions, expected lifecycle-revision CAS, canonical SeasonRevision read, and pin-index projection. Approval writes approved Episode-keyed entries; archive clears entries through a transaction-owned query. Added `createFirestoreSeasonLifecycleTransitionStore` with server-only lifecycle compare-and-set, index writes, and indexed cleanup. The pure index validator/projection now carries `season-episode-pin-index.v1`, exact key binding, and lifecycle revision.

Evidence: lifecycle/index repository tests **2 suites / 7 tests PASS**; targeted strict TypeScript for the repository, Firestore adapter, and index contract **PASS**. This is the first server transaction writer seam; it is not yet exposed by an Admin callable or invoked by the existing `adminSaveV2SeasonDraft` path. No commit, deploy, production write, or legacy removal.

Exact next task: add authenticated Season lifecycle callables (submit/review/approve/archive) around this repository, wire them into `functions/src/index.ts`, and add emulator proof that approval creates the index and archive deletes it under stale-CAS protection. Then run rules, lifecycle, Content Studio matrix, and independent adversarial review.
## 13.73 Authenticated Season lifecycle callables and emulator proof

Added strict `parseV2SeasonLifecycleRequest`, authenticated `adminApproveV2SeasonRevision` and `adminArchiveV2SeasonRevision` callables, and exported them from `functions/src/index.ts`. The callables use `requireContentReviewer`, `SeasonLifecycleTransitionRepository`, the Firestore Season lifecycle adapter, and the server-owned pin projection. The lifecycle emulator now performs canonical Season `needs_review → approved` through the callable, verifies Episode archive is blocked by the generated index, then archives the Season through the callable and verifies the index cleanup permits Episode archive. A transaction read/write ordering RED was exposed when cleanup queried after a write; the repository/adapter ordering was corrected before GREEN.

Evidence: `npm run test:emulator:v2-episode-lifecycle` — **1 suite / 1 test PASS**; Season callable/parser contract — **1 suite / 3 tests PASS**; Season lifecycle/index repository — **2 suites / 7 tests PASS**; targeted strict TypeScript — **PASS**. No commit, deploy, production write, or legacy removal.

Remaining: authenticated Season callables now exist, but full Admin integration, maker-checker/receipt governance for Season approval, index stale-revision replacement, malformed-index policy, and broad V2 runtime/curriculum/stars/voice work remain. Exact next task: add stale-CAS, wrong-role, replacement revision, and index cleanup emulator cases; then run fresh adversarial review and the full Content Studio matrix.
## 13.74 Full focused matrix after Season callable wiring

The expanded Content Studio matrix now passes **28 suites / 141 tests**, including Season lifecycle/index repository, strict SeasonRevision resolver, parser/callable export contracts, and all previously green Content Studio contracts. Lifecycle emulator remains **1 suite / 1 test PASS**. No production deployment or commit occurred. The next review must decide whether Season lifecycle maker-checker and receipt requirements are sufficient for the normative release gate; current callables use reviewer role and CAS but do not yet issue a dedicated Season approval receipt.
## 13.75 — Season lifecycle governance packet (2026-07-17)

Mission: continue the approved Orbit V2 pilot-season plan as a server-owned, body-only, auditable learning pipeline: canonical Season revisions in Storage, strict lifecycle transitions, indexed Episode pins, maker-checker authorization, and reproducible RED/GREEN evidence. Legacy behavior remains preserved; this worktree is not a release.

Authoritative documents and precedence: `docs/v2/HANDOVER.md` (living record), `docs/v2/README.md`, `docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md`, `docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md`, repository `AGENTS.md`, and the Orbit V2 skill. Normative contracts and existing security/performance rules take precedence over convenience. No production deploy, commit, push, or release activation was performed.

Completed in this slice:

- Season lifecycle requests now require exact `seasonRevisionId`, positive CAS revision, bounded `reason`, and an idempotency key; unknown/missing fields fail closed.
- Season approval/archival repository operations carry the reason and idempotency key and reject invalid operation envelopes.
- Season approval enforces maker-checker: the reviewer cannot equal the lifecycle author (`season_maker_checker_self_review`).
- Season approval receipt uses the supplied human reason instead of a synthetic reason.
- Authenticated Season callables pass the complete operation envelope through to the repository.
- Emulator coverage proves wrong role, self-review rejection, stale archive CAS, successful approval, indexed pin blocking, and cleanup on archive.
- Focused Content Studio matrix: **29 suites / 217 tests PASS**.
- Season governance unit packet: **4 suites / 13 tests PASS**.
- Firestore + Storage Episode/Season lifecycle emulator: **1 suite / 1 test PASS**.
- Firestore rules deny-only emulator: **1 suite / 411 tests PASS** (expected permission-denied warnings are part of deny coverage).
- Targeted strict TypeScript: **PASS** for Season parser/callables/repository/adapter/receipt surface.
- `git diff --check`: **PASS**; only normal LF→CRLF warnings were emitted by Git status.

Changed files in this slice and purpose: `functions/src/admin_content_studio_authoring.ts` (strict Season request envelope), `functions/src/admin_content_studio_callables.ts` (forward operation metadata), `functions/src/content_studio/season_lifecycle_transition_repository.ts` (maker-checker and receipt reason), `functions/src/content_studio/season_lifecycle_callable_contract.test.ts`, `functions/src/content_studio/season_lifecycle_transition_repository.test.ts`, and `functions/src/content_studio/emulator/v2_episode_lifecycle.emulator.test.ts` (RED/GREEN authorization/CAS assertions). Existing dirty and untracked user/project changes remain preserved.

RED/GREEN history: the first emulator run exposed that the stale fixture still used the old incomplete Season request envelope; the fixture was corrected to include reason/idempotency metadata and to test stale archive at a valid positive revision. Re-run then passed. No source-write test bypass was used.

Still partial / not complete: Season approval does not yet atomically persist a durable operation/audit record or replay response; the Firestore adapter still needs strict lifecycle-envelope validation and an explicit expected-revision check; replacement Seasons need orphan-index cleanup/reconciliation tests; index fingerprint must be compared to the resolved canonical Season fingerprint; malformed index/inline-body/DecisionRegistry deep-validation cases remain; Season approval still needs the full validation/localization/voice/content-gate receipt prerequisite chain; canonical runtime resolver migration and bounded index maintenance remain open. These are P1/P2 gates, so this session must not claim Phase 16 or the full V2 plan complete.

Exact next executable task: add a server-owned Season operation receipt/audit collection with idempotent replay, then add RED/GREEN tests for malformed lifecycle/index envelopes, wrong Season fingerprint, replacement/orphan index cleanup, and strict adapter CAS. Files: `functions/src/content_studio/season_lifecycle_transition_repository.ts`, `functions/src/content_studio/firestore_authoring_store.ts`, `functions/src/content_studio/season_pin_index_repository.ts`, the Season emulator tests, and the corresponding module contract tests. Commands: run the focused Content Studio matrix, `npm run test:emulator:v2-episode-lifecycle`, `npm run test:emulator:v2-authoring-rules`, targeted strict `tsc`, and `git diff --check`. Acceptance: replaying the same idempotency key returns the same persisted result without a second transition; changed payload is rejected; malformed/stale/orphan index cannot silently unblock an Episode archive; all tests remain green.

Startup for the next session: `Set-Location 'C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot'; git status --short --branch; Get-Content docs/v2/HANDOVER.md -Tail 140; npx jest --runInBand --no-cache src/content_studio --testPathIgnorePatterns=emulator`.
## 13.76 — Season lifecycle idempotent replay (2026-07-17)

Added a server-owned Season lifecycle operation seam matching the already-proven Episode pattern. `SeasonLifecycleTransitionStore` now reads/creates operation records; the repository fingerprints action, Season identity, target, expected revision, reason, and actor; identical replay returns the original lifecycle without a second transition, while reusing the key with changed input fails `idempotency_key_reused`. Firestore persists operations under `content_season_lifecycle_operations/{idempotencyKey}`. Added a unit test covering both replay and changed-payload rejection.

Evidence after the change: focused Content Studio matrix **29 suites / 218 tests PASS**; Season repository/callable packet **2 suites / 7 tests PASS**; Episode+Season Firestore/Storage lifecycle emulator **1 suite / 1 test PASS**; targeted strict TypeScript **PASS**; no deploy/commit/push/release. The deny-only rules result remains **1 suite / 411 tests PASS** from the immediately preceding unchanged-rules run.

Still open: adapter-side strict lifecycle envelope validation and explicit expected-revision enforcement, durable audit event separate from idempotency operation, Season prerequisite receipts (validation/localization/voice/content gate), replacement/orphan index reconciliation and fingerprint cross-check, deep DecisionRegistry validation, and all later runtime/curriculum/stars/access/voice/Admin generator/rollout phases. This remains partial and cannot be called a completed V2 phase.

Next executable task remains: add and test strict adapter/CAS and malformed-index/lifecycle behavior, then wire the full Season evidence gate before advancing to curriculum/runtime work. Preserve the exact startup commands and test matrix from §13.75.
## 13.77 — Strict Season lifecycle envelope/CAS (2026-07-17)

The Season lifecycle adapter now validates a strict exact-key `SeasonLifecycleHead` before returning Firestore data, caches the validated observed revision inside the transaction adapter, and rejects unobserved or mismatched expected-revision CAS before issuing `transaction.update`. The repository also compares the persisted lifecycle identity/status/revision against the canonical SeasonRevision envelope before any receipt, pin-index, or operation write. A negative unit test proves divergent canonical identity produces `season_lifecycle_identity_mismatch` with no side effects. Season idempotency operation reads now require the exact two-key envelope plus a valid lifecycle head.

Evidence: **29 suites / 219 tests PASS** for the focused Content Studio matrix; lifecycle Firestore/Storage emulator **1 suite / 1 test PASS**; targeted strict TypeScript **PASS**; `git diff --check` remains clean apart from Git line-ending warnings. No deploy, commit, push, production write, or legacy removal.

Still open and explicitly not complete: orphan/replacement pin-index reconciliation and canonical fingerprint cross-check; full Season validation/localization/voice/content-gate evidence prerequisites; deep DecisionRegistry and nested Episode semantics; production App Check proof; canonical runtime migration; curriculum, stars/access, voice/Speaking Club, Admin generator, 32-episode content, rollout and release gates.

Exact next executable task: add a focused adapter/emulator contract for malformed Season lifecycle and malformed Season operation documents, then implement server-owned replacement/orphan index reconciliation without silently unblocking an Episode archive. After GREEN, repeat the Content Studio matrix, lifecycle and rules emulators, strict TypeScript, and independent spec/adversarial review before advancing to the Season evidence gate.
## 13.78 — Strict Season operation envelope (2026-07-17)

Added `validateSeasonLifecycleOperationEnvelope` and wired it into the Firestore Season adapter. Operation records now require exactly a 64-hex request fingerprint and a lifecycle field; the adapter additionally validates the nested lifecycle head. Unit coverage proves extra fields and malformed fingerprints fail closed. Focused repository test packet is **1 suite / 6 tests PASS** and targeted strict TypeScript is **PASS**.

This closes only the operation-envelope seam. It does not close replacement/orphan index cleanup, Season evidence prerequisites, or later V2 phases. Next task remains malformed lifecycle/operation emulator coverage plus server-owned replacement-index reconciliation, followed by fresh independent reviews.
## 13.79 — Season pin identity hardening (2026-07-17)

Hardened the approved Season pin projection: the writer now rejects non-64-hex Season fingerprints, and indexed archive checks compare the stored index fingerprint with the resolved canonical Season record fingerprint before treating the pin as valid. A negative projection test covers the malformed fingerprint. The focused Season repository/index packet is **2 suites / 11 tests PASS** and targeted strict TypeScript is **PASS**.

This is still not orphan/replacement reconciliation: old Episode-keyed documents can survive a Season replacement because the current adapter clears by Season ID only. The next required RED/GREEN is explicit replacement cleanup/orphan detection with two Seasons and no silent archive unblock.
## 13.80 — Shared pin-index validator seam (2026-07-17)

Moved the Episode-keyed Season pin path into `season_pin_index_paths.ts` and made the Firestore lifecycle adapter consume the shared `validateSeasonPinIndexEntry` instead of a divergent local validator. This removes the duplicate envelope rules and avoids a circular import by keeping path construction separate. Focused Season/index/resolver tests: **3 suites / 19 tests PASS**; targeted strict TypeScript: **PASS**.

The index still needs server-owned replacement/orphan reconciliation; this change only guarantees that the reader and writer share one envelope validator. No deploy, commit, push, production write, or legacy removal.
## 13.81 — Replacement/index reconciliation transaction (2026-07-17)

Added a server-owned `clearPinIndexForSeason` transaction operation. Season approval removes stale pin rows belonging to older revisions of the same `seasonId` before writing the new projection; Season archive removes all rows for that season, including the current revision. The implementation resolves each indexed Season lifecycle before deletion, so pins from unrelated seasons are preserved. A Firestore transaction-ordering RED was found when cleanup ran after receipt writes; cleanup was moved before every write, and the lifecycle emulator is green again.

Evidence: lifecycle Firestore/Storage emulator **1 suite / 1 test PASS** after the ordering fix; Season repository unit suite **1 suite / 6 tests PASS**; focused Content Studio matrix and strict TypeScript must be rerun after this final reconciliation change. The prior failed run was not hidden: it exposed the write-before-read ordering and the archive keep-current bug, both corrected.

Remaining P1: explicit two-season replacement/orphan fixture, canonical fingerprint mismatch telemetry/audit, full Season evidence prerequisites, and all subsequent V2 phases. No deploy/commit/push/release.
## 13.82 — Reconciliation verification checkpoint (2026-07-17)

After the replacement cleanup ordering fix, final deterministic checks for this slice are green: focused Content Studio **29 suites / 221 tests PASS**, targeted strict TypeScript **PASS**, and `git diff --check` reports no whitespace errors (only normal CRLF warnings). The lifecycle emulator remains **1 suite / 1 test PASS** from the immediate post-fix run. This checkpoint is still partial: the two-season replacement fixture and full Season evidence gate are not yet closed, and no release claim is allowed.

Exact next executable task: add the two-season/orphan emulator fixture and prove unrelated-season pins survive while same-season stale rows are removed; then rerun all four gates and obtain fresh spec/adversarial reviews. Only after that may the execution move to Task 2.3A (account-scoped progress store/outbox/hydration), as required by the Phase 02 audit.
## 13.83 — Two-season orphan/replacement emulator proof (2026-07-17)

Extended the lifecycle emulator with two additional server-owned pin rows: one stale orphan belonging to an older revision of the same `seasonId`, and one active pin belonging to a different season. Archiving the current Season now proves the same-season orphan is deleted while the unrelated season pin survives. Two transaction-ordering REDs were exposed while adding this fixture (writes interleaved with lifecycle reads); cleanup now collects deletions after completing all reads, and the final emulator run is green.

Evidence: `npm run test:emulator:v2-episode-lifecycle` **1 suite / 1 test PASS**. This is stronger replacement evidence, but the implementation still uses a maintenance-time collection scan and does not yet provide an audit record for orphan deletion. No deploy/commit/push/release.

Exact next task: add the orphan-cleanup audit/operation receipt and then proceed to the Phase 02 Task 2.3A local progress store/outbox/hydration RED packet identified by the independent audit. Do not start runtime/UI before that persistence gate is green.
## 13.84 — Pin cleanup audit receipt (2026-07-17)

Season approval/archive cleanup now writes a server-owned `season-pin-cleanup-audit.v1` document keyed by the same idempotency operation, recording season identity, target, actor, and reason. The audit write is ordered after all transaction reads and before lifecycle/index writes; two RED runs caught and fixed read-after-write ordering for archive and multi-season cleanup. The two-season orphan fixture remains green: same-season stale rows are removed and unrelated-season rows survive.

Evidence: lifecycle Firestore/Storage emulator **1 suite / 1 test PASS**; Season repository unit tests **1 suite / 6 tests PASS**; no release/deploy/commit/push. The cleanup audit is a bounded governance record, not a complete Season evidence gate.

Exact next executable task: begin Phase 02 Task 2.3A test-first account-scoped progress persistence (`progress_store`, synchronous peek cache, outbox, hydration) with restart/offline/idempotency/account-generation/corrupt-schema/delayed-terminal cases. Do not build runtime/UI before this gate.
## 13.85 — Phase 02 Task 2.3A progress persistence RED/GREEN (2026-07-17)

Started the next approved bounded task by adding account-scoped local progress persistence seams:

- `progress_store.ts`: versioned, account-keyed AsyncStorage envelope, corrupt/unknown-schema fail-closed loading, size bound, local-first save, and synchronous peek access.
- `progress_peek_cache.ts`: bounded eight-account, five-minute cache with eviction.
- `progress_outbox.ts`: account-scoped idempotent mutation queue capped at 128 items, generation filtering, and one-way terminal delayed acknowledgement.
- `progress_hydration.ts`: snapshot plus pending-mutation hydration without a full-screen loading contract.
- root tests for restart/peek, corruption/account isolation, hydration, duplicate enqueue, terminal replay protection, and stale generation purge.

Evidence: **2 suites / 5 tests PASS**, targeted strict TypeScript **PASS**, `git diff --check` **PASS** (only line-ending warnings). This is the first persistence slice, not the complete Task 2.3 acceptance: canonical attempt/evidence atomicity, delayed candidate terminal payload validation, account-generation transition integration, and bounded index cardinality still need RED/GREEN coverage.

Exact next executable task: strengthen the store/outbox contracts with account-generation transition hooks, atomic graph/delayed payload fixtures, out-of-order acknowledgements, and bounded evidence-index replay tests; then obtain independent spec/adversarial review before proceeding to Task 2.4 server progress events. Runtime/UI remains explicitly blocked until this persistence gate is complete.
## 13.86 — Task 2.3A account isolation and delayed candidate guard (2026-07-17)

Strengthened the new local persistence packet with explicit account-wipe isolation, Account A/B outbox separation, one-way terminal acknowledgement (a second terminal result cannot overwrite the first), and a delayed-candidate guard that rejects learning/evidence refs before server finalization. Evidence now stands at **2 suites / 7 tests PASS** for storage/outbox and targeted strict TypeScript **PASS**.

Still open for Task 2.3A: atomic graph-attempt/evidence payload fixture validation, exhaustive tuple disposition preservation, out-of-order acknowledgement handling with durable terminal records, and integration with the existing account-generation transition lock. Do not advance to the server progress callable or runtime UI until those cases are green.
## 13.87 — Cross-surface verification after Task 2.3A start (2026-07-17)

Verification after the persistence additions: the focused Phase 02/root packet is **7 suites / 49 tests PASS** (including the new storage/outbox suites); the Content Studio matrix remains **29 suites / 221 tests PASS**; `git diff --check` has no whitespace errors. The lifecycle emulator was green immediately before the latest audit-receipt-only wiring and must be rerun in the next deterministic gate. Strict TypeScript for the new progress modules passed in the preceding focused command.

An independent Task 2.3A review is pending. Until that review and the required account-generation/atomic evidence cases are green, Task 2.3A remains partial and no runtime/UI work is authorized.
## 13.88 — Task 2.3A generation/identity hardening (2026-07-17)

Repaired the P1 findings from the independent review:

- storage and outbox keys now use the normative `v2:progress:v1:<accountScopeHash>:g<generation>` / `v2:outbox:v1:<accountScopeHash>:g<generation>` form;
- scope hash and generation are validated on load/save/clear/enqueue/acknowledge, with injectable current-generation guards;
- peek cache is generation-scoped through the key;
- snapshots require the matching accountScopeHash and the core bounded progress collections/schema fields;
- hydrate exposes only pending mutations from the active generation;
- delayed learning-reference rejection scans nested payload JSON;
- outbox payloads are capped at 64 KiB and malformed terminal statuses are ignored;
- `persistProgressMutation` journals the outbox intent before saving the snapshot, leaving a durable retry intent if the second write fails.

Current Task 2.3A packet: **2 suites / 11 tests PASS**, targeted strict TypeScript **PASS**. A fresh independent review must now confirm these fixes; no runtime/UI or Task 2.4 transition yet.
## 13.89 — Mandatory generation guard and bounded outbox (2026-07-17)

Closed the remaining Task 2.3A P1 identified by review: `createProgressStore`, `createProgressOutbox`, `hydrateProgress`, `persistProgressFirst`, and `persistProgressMutation` now require an explicit current-generation guard; there is no default no-op guard. Stale generation cannot load/save/clear/enqueue/acknowledge through these APIs. Outbox writes now enforce both per-payload and total serialized-byte caps, and unserializable payloads return a typed error. Added tests for stale mutation rejection and circular payload failure.

Current focused persistence evidence: **2 suites / 13 tests PASS**; strict TypeScript **PASS**. A fresh adversarial review is pending. Remaining likely work is replacing shallow snapshot validation with the canonical progress snapshot validator and proving guard behavior through the complete hydrate/mutation path.
## 13.90 — Task 2.3A guarded read paths and canonical snapshot validator (2026-07-17)

Closed the remaining read-path P1: `peek`, `outbox.list`, `purgeStaleGeneration`, and `hydrateProgress` now require and check the active generation guard before reading or mutating storage/cache. Exported `assertProgressSnapshot` from the reducer and reused it in the local store, replacing the earlier shallow shape check with the canonical reducer validator. Added guard-read tests and outbox byte/error tests.

Evidence: **2 suites / 15 tests PASS**; targeted strict TypeScript **PASS**. Fresh independent review is pending after this final change. The `:gN` suffix is deliberate session isolation layered on the normative account-scope-hash namespace; account-generation guard remains mandatory and is not inferred from the key.
## 13.91 — Progress namespace dimensions (2026-07-17)

Closed the remaining key-semantics P1 by including all normative progress namespace dimensions in `ProgressAccountScope` and both storage/outbox keys: account-scope hash, season, study target, source locale, plus the guarded generation suffix. Snapshot load now requires the same dimensions, so multiple seasons/targets cannot overwrite one another. Focused persistence tests remain **2 suites / 15 tests PASS** and strict TypeScript **PASS**.

The remaining P2 is boundary depth: the reducer validator is reused, but immutable Episode-pinned membership/cardinality still belongs to the server progress-event boundary. Task 2.3A is nearing completion; fresh review and a final full Phase 02 gate are still required.
## 13.92 — Task 2.3A accepted; transition to Task 2.4 (2026-07-17)

Independent adversarial review accepted Task 2.3A on the reviewed surface. GREEN evidence: **2 suites / 15 tests PASS**; generation guards cover every read/write path; canonical `assertProgressSnapshot` is reused; keys isolate account hash, season, target, source locale and generation; outbox is idempotent and bounded; corrupt/stale data fails closed; nested delayed learning refs are rejected; journal-before-snapshot is durable. The `:gN` suffix is an explicit migration policy: an old generation is intentionally not auto-hydrated or merged.

Task 2.3A is complete as a bounded persistence task, but the overall Phase 02 gate is not complete. Its remaining server-side acceptance is Task 2.4: authenticated/App Check progress callable, canonical attempt/evidence validation, account/season/episode pinning, opId/hash-chain idempotency, atomic server transaction, delayed terminal acknowledgements, Firestore rules and account-isolation emulator proof.

Exact next executable task: create `functions/src/learning_v2/progress_event.ts` and its tests first with RED cases for missing/invalid auth/App Check, hash mismatch, account/season/episode substitution, duplicate/out-of-order events, and delayed candidates containing learning refs; then implement the server-owned transaction and rules/emulator gate. Do not start runtime/UI or claim Phase 02 complete until Task 2.4 and Task 2.6 pass.

## 13.93 — Task 2.4 pure progress-event seam RED/GREEN (2026-07-17)

Started Task 2.4 test-first with a pure server progress-event contract:
`parseProgressEventRequest` requires the exact scoped request envelope, sanitizes the
hash-free attempt body, and verifies the canonical attempt reference; post-hash
fields and forged references fail closed. `applyProgressEvent` uses an abstract
transaction store to prove idempotent replay, conflicting idempotency-key reuse,
and opId reuse with a different body hash. A RED run exposed a caller bug where
the validator result object was treated as a boolean; the guard now checks
`.ok`, and the focused test is green.

Evidence: Functions Jest `1 suite / 2 tests PASS`; targeted strict TypeScript for
`functions/src/learning_v2/progress_event.ts` **PASS**. This is only the pure
contract seam. Authentication/App Check, immutable Episode/Season pin lookup,
server-owned Firestore transaction, delayed terminal adjudication, rules, and
emulator account-isolation proof are still not implemented. No deploy, commit,
push, production write, or legacy removal.

Exact next executable task: extend the request with canonical Episode revision
identity and server-known Season membership, add callable auth/App Check guards,
then implement the Firestore transaction adapter and negative emulator cases.
Rerun the pure Functions test plus strict TypeScript before wiring exports. Keep
Phase 02 and the global V2 goal open.

## 13.94 — Task 2.4 request pin shape strengthened (2026-07-17)

The pure progress-event request now requires a canonical `seasonRevisionId` and
the complete approved `episodeRevisionRef` (draft, episode, revision,
revisionFingerprint, contentHash, ordinal, chapter, approval status). The request
fingerprint includes both immutable pin dimensions, so changing the Season or
Episode ref cannot replay an old idempotency key. The parser still treats these
values as untrusted claims; server resolvers must compare them to the immutable
Season and Episode records before the transaction writes anything.

Evidence: Functions Jest `1 suite / 2 tests PASS`; targeted strict TypeScript
**PASS**. Independent review confirmed the required next boundary: resolve the
canonical Season and Episode inside the server transaction, compare Episode
membership/cardinality, derive account identity from authenticated UID, and deny
client writes to the new V2 collections by default. No callable/export/rules or
emulator implementation has been added yet; Task 2.4 and Phase 02 remain partial.

Exact next executable task: implement the authenticated/App Check callable and
Firestore transaction adapter with all reads before writes, using
`resolveStableUidForAuth`, `resolveImmutableSeasonRevision`, and
`assertExactImmutableEpisodeRevision`; add negative tests for account, Season,
Episode, revision, and fingerprint substitution before wiring the export.

## 13.95 — Task 2.4 immutable pin parser tests (2026-07-17)

Added a third pure-contract test covering malformed Season revision IDs,
non-approved Episode refs, and invalid content hashes. The parser now provides a
strict fail-closed boundary before any server resolver or Firestore write is
called. This confirms the request shape is ready for the server-owned resolver;
it does **not** treat client-supplied immutable refs as trusted evidence.

Evidence: Functions Jest `1 suite / 3 tests PASS`; targeted strict TypeScript
**PASS**. The broader Phase 02 packet remains **7 suites / 56 tests PASS**.
Task 2.4 is still partial: callable auth/App Check, stable identity binding,
canonical Season/Episode resolution, atomic progress/evidence/star mutation,
delayed adjudication, rules, and emulator isolation are outstanding.

Exact next executable task: implement the server resolver-backed transaction
adapter and callable guard, then add emulator tests for missing auth/App Check,
cross-account scope, Season/Episode substitution, stale revision, duplicate and
out-of-order events, and delayed terminal failure/success. Do not export or
deploy until those tests are green.

## 13.96 — Season membership comparison seam (2026-07-17)

Added `assertEpisodeRevisionPinnedToSeason`, a pure exact-membership check that
compares Episode identity, revision, and the complete immutable ref fingerprint
against the Season's pinned `episodeRevisionRefs`. Tests cover both a modified
content hash and an Episode substitution; both fail closed. This helper is
intentionally not a trust boundary by itself: the Season and Episode arrays
must be loaded and validated from server-owned immutable records inside the
upcoming transaction.

Evidence: Functions Jest `1 suite / 4 tests PASS`; targeted strict TypeScript
**PASS**. Task 2.4 remains partial and no callable/export/deploy has been added.

Exact next executable task: wire this comparison into a Firestore transaction
after resolving canonical Season and Episode records, bind the account scope to
authenticated stable identity, and add App Check/auth/rules emulator negatives.

## 13.97 — Server account-scope comparison seam (2026-07-17)

Added `assertProgressAccountScope`, a fail-closed pure boundary requiring the
client-provided scope hash to equal the server-derived canonical account scope
hash. Tests cover the matching hash, cross-account substitution, and malformed
server hash. This is deliberately only a comparison helper; it does not derive
identity and cannot replace `resolveStableUidForAuth` in the callable.

Evidence: Functions Jest `1 suite / 5 tests PASS`; targeted strict TypeScript
**PASS**. Task 2.4 is still partial: the callable must authenticate the request,
resolve stable identity, derive the expected hash server-side, resolve immutable
Season/Episode records in one transaction, and only then call this helper.

Exact next executable task: create the callable authorization adapter with
`onCall` App Check options and `resolveStableUidForAuth`, then provide a
Firestore transaction implementation whose operation/attempt paths include the
canonical account and Season/Episode pin dimensions.

## 13.98 — Task 2.4 authenticated callable boundary (2026-07-17)

Added the bounded auth/App Check adapter in
`functions/src/learning_v2/progress_event_callable.ts` with focused tests. The
callable options fail closed for App Check unless an explicit local/test
override is set. Requests require a bounded Firebase Auth UID; stable identity
is resolved server-side through `resolveStableUidForAuth` with link repair
disabled, and the executor receives only that server-derived stable UID. The
handler parses the canonical progress request before downstream execution and
never invokes authorization or execution for unauthenticated input. The
callable factory is intentionally not exported from `functions/src/index.ts`
yet, because the transactional Firestore store is not wired.

Evidence: Functions combined focused packet `2 suites / 10 tests PASS`;
targeted strict TypeScript for the callable adapter **PASS**. A RED fixture
caught a seven-character idempotency key; it was corrected to the contract's
minimum eight characters. No deploy, commit, push, or production write.

Task 2.4 remains partial: account-scope hash comparison must be applied after
stable identity derivation, immutable Season/Episode resolution must happen in
the transaction, and snapshot/evidence/stars, delayed terminal adjudication,
Firestore rules, and emulator isolation are still outstanding.

Exact next executable task: implement the Firestore transaction adapter with
all canonical reads before writes, use the resolver APIs and membership helper,
then add callable integration and rules/emulator negative cases before adding
the index export.

## 13.99 — Transaction seam requires canonical pin validation (2026-07-17)

Strengthened the abstract `ProgressEventStore` contract: every transaction must
implement `validatePinnedScope` and `applyProgressEvent` invokes it immediately
after parsing, before reading idempotency or attempt state and before any write.
This prevents a future adapter from accidentally treating client-supplied
Season/Episode refs as trusted after only syntactic validation. The current fake
store explicitly models the server validation seam; the real implementation
still has to resolve immutable records and compare membership inside Firestore.

Evidence: Functions combined progress packet `2 suites / 10 tests PASS`; strict
TypeScript for both progress-event modules **PASS**. No index export, Firestore
write, rules change, deploy, commit, or push.

Exact next executable task: implement `validatePinnedScope` in a Firestore
transaction adapter using `resolveImmutableSeasonRevision`,
`createFirestoreEpisodeRevisionResolver`, and `assertExactImmutableEpisodeRevision`;
then prove reads-before-writes, account isolation, stale pin rejection, and
idempotent replay in an emulator before exporting the callable.

## 14.00 — Firestore progress transaction adapter skeleton (2026-07-17)

Added `functions/src/learning_v2/firestore_progress_event_store.ts`. The adapter
now has an explicit transaction-only boundary, resolves the immutable Season
revision and approved Episode revision before allowing operation/attempt reads,
checks the server-derived account scope hash, compares exact Season membership,
and binds operation/attempt document paths to the canonical Season revision and
Episode identity. All current progress-event reads happen before the two writes.
The callable remains unexported until snapshot/evidence/star mutation and delayed
terminal adjudication are part of the same server transaction.

Evidence: progress-event, callable, and adapter unit packet **3 suites / 11
tests PASS**. Targeted TypeScript reports no error in the new adapter; the
command still surfaces a pre-existing unrelated error in
`content_studio/episode_lifecycle_transition_repository.ts:66` (`reason` union
narrowing). No deploy, commit, push, or production write.

Task 2.4 remains partial. The adapter still needs a real emulator fixture with
canonical Season/Episode documents and Storage objects, account isolation rules,
snapshot/evidence/star writes, delayed terminal handling, and callable export
only after those gates pass.

Exact next executable task: build the deterministic emulator fixture and RED
cases for forged Season/Episode refs, cross-account scope, stale revisions,
duplicate/out-of-order operations, and transaction read-before-write ordering;
then make the adapter GREEN against the emulator.

## 14.02 — Adversarial review: identity and replay hardening (2026-07-17)

The independent adversarial review found two P1 risks in the transaction
prototype: the account scope was only an opaque caller option, and malformed
stored operations could be replayed as accepted. The first is now hardened:
the adapter requires server-derived `stableUid` plus `accountGeneration` and
derives the scope hash internally with the versioned
`v2-progress-account-scope.v1` hash. The second is fixed by validating the exact
operation envelope, request fingerprint, attempt hash, and canonical attempt
ref before replay. Replay is checked before fresh pin validation so an immutable
previous receipt can be returned after a later archive without creating a new
mutation.

Evidence: focused packet **3 suites / 13 tests PASS**. No deploy, commit, push,
or production write. The review also confirmed that Task 2.4 is not complete:
the current ledger still lacks canonical evidence/non-assessment materialization,
bounded snapshot/index updates, derived stars/access deltas, delayed terminal
receipts, and the required cloud path/account document model. These remain open
P1 work, not hidden assumptions.

Exact next executable task: add the server-owned evidence materializer and
atomic progress snapshot/star/access delta contract to the transaction store,
with replay keyed by canonical attempt/component fingerprints; then add the
emulator fixture and rules isolation tests before exporting the callable.

## 14.03 — Adversarial bounds and path hardening (2026-07-17)

Repaired the next confirmed adversarial findings. Progress request parsing now
rejects unsafe Season/Episode resolver identifiers (preventing path traversal or
multi-segment aliasing), enforces a 64 KiB attempt payload cap, and limits the
large tuple/delayed-candidate arrays before canonical sanitization. The malformed
operation replay test is green, and account scope is derived from stable UID plus
generation rather than accepted as an opaque server option.

Evidence: focused packet **3 suites / 14 tests PASS**. The independent review
still reports unresolved P1 requirements: canonical evidence/non-assessment
materialization, bounded snapshot/index updates, derived stars/access deltas,
delayed terminal receipts, same-opId cross-key replay suppression, self-
describing account/generation ledger records, and Firestore rules/emulator
proof. These are explicitly open; Task 2.4 is not complete and callable remains
unexported.

Exact next executable task: define and test the server-owned evidence mutation
envelope (including component fingerprint, tuple cardinality, star/access delta,
and bounded snapshot index), then implement it atomically in the transaction
adapter before adding emulator fixtures and rules.

## 14.04 — Separate evidence materialization contract (2026-07-17)

Added `progress_event_evidence.ts` with a server-owned
`v2-progress-evidence-bundle.v1` seam. It validates each typed learning or
non-assessment body against the exact source attempt, enforces bounded body
counts, rejects duplicate tuple materialization across both categories, hashes
each body separately, and emits a deterministic component fingerprint. This
matches the plan's rule that the V2 attempt envelope itself is not hashed as a
single learning-evidence object.

Evidence: expanded focused packet **4 suites / 16 tests PASS**. The contract is
not yet wired into Firestore writes; stars/access deltas, bounded snapshot/index
projection, delayed terminal receipts, same-opId cross-key suppression, and
rules/emulator proof remain open P1 work. No deploy, commit, push, or production
write.

Exact next executable task: add the evidence bundle and canonical component
fingerprint to the transaction operation contract, then implement atomic
account-scoped evidence/index/star/access writes with replay tests.

## 14.05 — Operation ledger component fingerprint (2026-07-17)

Extended `v2-progress-event-operation.v1` with a required 64-hex
`componentFingerprint`. New operations derive the initial fingerprint from the
canonical attempt ref; the subsequent evidence bundle is the planned source for
the full component fingerprint once it is wired into the request. Replay
validation now requires this field, preventing a partial or malformed ledger
record from being returned as a successful receipt.

Evidence: focused packet remains **4 suites / 16 tests PASS**. This is a ledger
contract increment, not completion of atomic evidence/star/access mutation.
No deploy, commit, push, or production write.

## 14.31 — Server-owned score resolver seam (2026-07-17)

Added `functions/src/learning_v2/server_score_resolver.ts` and its focused
contract tests. `resolveServerScore` accepts only a Functions-side evaluator,
canonical attempt ref, exact activity/slot/compatibility identity, pinned
scoring-policy ref, result code, and materialized evidence fingerprint. It
returns hash-pinned `v2-server-score-resolution.v1`; positive scores are
rejected for `UNCERTAIN`, `INVALID_AUDIO_OR_SYSTEM`, and `SKIPPED`, and any
tampered hash or context mismatch fails closed. Added
`deriveProgressProjectionFromServerScore` and a transaction-plan seam that
ignores client candidate stars when a trusted resolution is present; without
that resolution, positive client projections remain rejected.

`ProgressEventStore` now has optional `resolveServerProjection` called only
after canonical Season/Episode pin validation. The Firestore adapter exposes an
optional server callback receiving request, canonical attempt/evidence, pinned
Episode artifact, and current best slot score; it validates the returned
resolution before deriving the effective projection. Replay ordering remains
unchanged, and no resolver means the existing zero-only fail-closed behavior.

Evidence: focused score/progress packet **5 suites / 20 tests PASS**; focused
Functions typecheck reports no errors in the changed score/progress files (the
repository still has unrelated pre-existing `src/index.ts` missing-module and
missing-export errors). No callable export, deploy, commit, push, or production
write. This seam is provisional until a real versioned scoring-policy resolver
is wired and its emulator proof covers first-write, improvement, replay,
lower-score no-op, and forged-client-delta cases.

## 14.27 — Server account binding for progress callable (2026-07-17)

The default progress authorization seam now resolves the canonical stable UID,
reads the server-owned account generation from `users/{stableUid}` (accepting
the legacy `generation` field only as a compatibility read), checks
`account_deletion_tombstones/{stableUid}`, and returns a strict binding. The
handler recomputes the account scope hash and rejects a mismatched request.
Injected string authorizers remain available only for focused tests; the
production default returns the binding object.

Evidence: callable-focused **1 suite / 7 tests PASS**; complete progress packet
**7 suites / 30 tests PASS**. The positive-star path remains intentionally
fail-closed until a server-owned scorer is wired. App Check transport proof,
production configuration guard, real progress Firestore/Storage emulator, and
callable export remain open. No deploy, commit, push, or production write.

## 14.24 — Progress negative integration cases and security review (2026-07-17)

The progress adapter integration coverage now includes three fail-closed cases:
an archived Season rejects a new mutation before writes, a mismatched account
scope is rejected before canonical resolution, and a substituted Episode
artifact is rejected before writes. The settled replay rule remains unchanged:
an already recorded immutable operation may be returned as a duplicate after a
later archive; changing that would require an owner decision because it would
alter the recorded §14.02 contract.

Evidence: the integration file is **1 suite / 4 tests PASS** and the combined
progress packet is **7 suites / 26 tests PASS**.

An independent security/accessibility review found P1 blockers before exposing
the callable: client-controlled star candidate/delta data must not mint server
rewards; callable authorization must bind the server account generation and
deletion-tombstone state; and user progress paths must not collide through the
`safe(stableUid)` replacement strategy. P2 gates remain transport-level App
Check emulator proof plus a production guard against disabling App Check,
stable error mapping in Admin callables, and accessibility contracts when V2
screens are introduced. No deploy, commit, push, or production write.

## 14.25 — Focused progress packet rerun (2026-07-17)

Reran the current seven-suite progress packet after the rules and integration
changes: **7 suites / 23 tests PASS** before the three new negative cases were
added. The rules emulator remains **1 suite / 425 tests PASS**. The next close
step is to add the P1 RED tests and repair server-owned projection/account path
binding before any callable export.

## 14.23 — Focused progress packet rerun (2026-07-17)

Reran the complete current progress adapter packet after the rules change:
`npx jest --config jest.config.js --runTestsByPath
src/learning_v2/progress_event.test.ts
src/learning_v2/progress_event_callable.test.ts
src/learning_v2/progress_event_evidence.test.ts
src/learning_v2/progress_event_projection.test.ts
src/learning_v2/progress_event_transaction_plan.test.ts
src/learning_v2/firestore_progress_event_store.test.ts
src/learning_v2/firestore_progress_event_store.integration.test.ts
--runInBand --no-cache` — **7 suites / 23 tests PASS**.

This confirms the local schema, evidence materialization, projection, callable
auth/AppCheck adapter, transaction ordering, and adapter integration double
remain green. It does not replace the required live Firestore/Storage progress
emulator or the remaining snapshot, delayed-receipt, curriculum, admin, and
release gates. No deploy, commit, push, or production write.

## 14.26 — P1 progress isolation guard (2026-07-17)

The progress transaction plan now fails closed when a client submits a positive
performance/access-star delta that has not been produced by a trusted server
scorer. This intentionally blocks positive first-write claims until the scorer
is wired; it prevents the current callable from minting rewards from client
fields. Two focused rejection cases cover first-write and improvement claims.

Evidence/projection paths now use the canonical server-derived account scope
hash (stable UID plus account generation), not a character-replacing UID path.
An integration case proves `a/b` and `a_b` cannot collide. The evidence record
also stores the scope hash for self-description.

Evidence: focused progress packet **7 suites / 28 tests PASS**; adapter
integration **1 suite / 5 tests PASS**; `git diff --check` clean. A literal
pre-fix RED run was not captured, so this guard remains provisional until a
reproducible RED/GREEN record and server-owned scorer are added. Callable
generation/tombstone binding and App Check transport proof remain open. No
deploy, commit, push, or production write.

Exact next executable task: carry the typed evidence bundle through the request
and transaction, persist its separately hashed refs and bounded index under the
server-derived account, and apply deterministic star/access deltas exactly once.

## 14.06 — Same-attempt cross-key suppression (2026-07-17)

Hardened `applyProgressEvent` against duplicate side effects when the same
`opId` and attempt hash arrive under a different idempotency key. The attempt
ledger now returns an idempotent duplicate result immediately instead of
creating a second operation record; a differing body hash still rejects with
`v2_progress_attempt_op_reused`. This is the first explicit replay guard for
the plan's same-attempt/same-component requirement, pending the full evidence
component receipt.

Evidence: focused packet **4 suites / 17 tests PASS**. Atomic evidence refs,
bounded snapshot/index, star/access deltas, delayed terminal receipts, rules,
and emulator proof remain open. No deploy, commit, push, or production write.

Exact next executable task: extend the request with the typed evidence bundle,
materialize and persist its refs in the same transaction, and derive/apply
best-star/access projections without allowing purchased access to enter mastery.

## 14.07 — Evidence bundle wired into progress-event request (2026-07-17)

The typed evidence bundle is now required in `ProgressEventRequest`, validated
against the canonical attempt ref during parsing, and materialized again inside
`applyProgressEvent`. Its deterministic component fingerprint participates in
the request fingerprint and is persisted in the operation envelope. A request
cannot submit an attempt without an explicit (possibly empty) evidence/non-
assessment bundle, and a bundle for another attempt is rejected before any
ledger read/write.

Evidence: focused packet **4 suites / 17 tests PASS**. The Firestore adapter has
not yet persisted the materialized refs or applied star/access projections;
delayed receipts, cloud account document model, rules, and emulator proof remain
open. No deploy, commit, push, or production write.

Exact next executable task: extend `ProgressEventStore` with an atomic
`writeEvidenceMaterialization`/snapshot projection contract, persist the refs
under the server-derived account and immutable pin dimensions, and apply
deterministic earned-star/access deltas exactly once.

## 14.08 — Evidence refs enter the transaction write set (2026-07-17)

Extended `ProgressEventStore` with mandatory
`writeEvidenceMaterialization(request, materialized)`. `applyProgressEvent` now
materializes and writes typed evidence/non-assessment refs before creating the
operation receipt, so a successful ledger cannot exist without the corresponding
component materialization. The Firestore adapter writes self-describing refs
under `users/{stableUid}/v2_progress/{seasonRevisionId}/episodes/{episodeId}/evidence/{tupleKey}`
with account generation, immutable pin, and component fingerprint metadata.
Calls outside a transaction fail closed; focused tests cover that boundary.

Evidence: focused packet **4 suites / 17 tests PASS**. Snapshot/index projection,
best-star/access deltas, delayed terminal receipts, collision-safe evidence
replay, rules, and emulator proof remain open. No deploy, commit, push, or
production write.

Exact next executable task: add bounded snapshot/index reads and deterministic
earned-star/access delta application to the same transaction, with duplicate
materialization replay and purchased-access/mastery separation tests.

## 14.09 — Deterministic star/access projection enters transaction (2026-07-17)

Added the server request projection (`starSlotId`, previous best, candidate
stars, activity and compatibility identity) and reused the existing pure
`applyBestPerformanceStars` formula. The parser rejects invalid slot/activity
identity and star ranges; the derived projection always has
`accessStarsPurchasedDelta: 0`, keeping purchased boosts outside earned-star and
mastery evidence. `applyProgressEvent` now writes the projection after evidence
materialization and before the operation receipt. The Firestore adapter stores a
self-describing slot projection under the same account/Season/Episode scope.

Evidence: focused packet **4 suites / 17 tests PASS**. A RED TypeScript cast
failure was fixed before GREEN. Snapshot/index merge semantics, duplicate-safe
projection reads, delayed receipts, rules, and emulator proof remain open; no
callable export, deploy, commit, or production write.

Exact next executable task: replace projection `create` with bounded
read/compare/update semantics for best-score replay, add snapshot/index
materialization and purchased-access separation tests, then run the emulator
transaction gate.

## 14.10 — Best-score compare/update semantics (2026-07-17)

Replaced the unconditional slot-projection create path with a transaction read
and compare/update rule. Existing best stars at or above the candidate produce a
no-op; only a strictly better `0..3` score replaces the projection. Invalid
stored best-score state fails closed. The pure helper
`shouldApplyProgressProjection` covers first write, improvement, replay/no-op,
and malformed state; the projection still carries `accessStarsPurchasedDelta: 0`.

Evidence: expanded focused packet **5 suites / 19 tests PASS**. This closes only
best-score replay semantics. A full bounded snapshot/index merge, materialized
evidence replay read, delayed terminal path, Firestore rules, and emulator
transaction proof remain open. No deploy, commit, push, or production write.

Exact next executable task: add account-scoped bounded snapshot/index documents
to the transaction read/write set and prove that duplicate materialization and
lower-score retries cannot grow the index or award a second delta.

## 14.11 — Firestore transaction read-before-write ordering correction (2026-07-17)

The compare/update projection read was initially invoked after attempt/evidence
writes, which would violate Firestore transaction ordering. The call order is
now corrected: projection read/compare/update runs immediately after all
canonical validation and idempotency reads, before attempt and evidence writes.
The focused packet remains **5 suites / 19 tests PASS**.

This correction does not close snapshot/index growth, evidence replay reads,
delayed terminal receipts, rules, or emulator proof. No deploy, commit, push, or
production write.

Exact next executable task: add bounded evidence-index reads before the write
set, then write snapshot/index and projection in one deterministic transaction
with duplicate and lower-score retry fixtures.

## 14.12 — Bounded evidence-index merge contract (2026-07-17)

Added `mergeProgressEvidenceIndex`. It merges typed materialization refs by
tuple key, treats an identical body hash as an idempotent no-op, rejects a
conflicting body hash, and fails closed when the bounded index limit is invalid
or exceeded. This is the deterministic pure operation the Firestore transaction
will use after its read phase; it prevents replay from growing the index.

Evidence: expanded focused packet **5 suites / 20 tests PASS**. The merge is not
yet wired into a cloud snapshot document, and the transaction still needs a
true all-reads-before-writes preparation phase for evidence and projection.
Stars/access, delayed receipts, rules, emulator proof, and callable export
remain open. No deploy, commit, push, or production write.

Exact next executable task: introduce the transaction preparation seam that
reads existing bounded evidence index and best-score projection before any
write, applies these pure merges, then commits evidence refs, snapshot/index,
projection and operation atomically.

## 14.13 — Pure transaction preparation plan (2026-07-17)

Added `prepareProgressTransactionPlan`, which combines the two deterministic
read-phase decisions: bounded evidence-index merge and best-score projection
comparison. It returns the next bounded index, whether a strictly better star
projection should be written, the projection itself, and the evidence component
fingerprint. This is deliberately pure and does not perform Firestore writes;
the adapter can now consume one plan after reading existing state, then commit a
single write set.

Evidence: expanded focused packet **6 suites / 21 tests PASS**. The plan is not
yet wired into the Firestore adapter, whose current methods still perform their
own reads. Snapshot document schema, delayed terminal receipts, rules,
emulator proof, and callable export remain open. No deploy, commit, push, or
production write.

Exact next executable task: refactor the Firestore adapter into explicit
prepare/read and commit/write phases using this plan, then add emulator tests
for duplicate evidence, lower-score retry, bounded index overflow, and
all-reads-before-writes ordering.

## 14.14 — Firestore adapter prepare/commit split (2026-07-17)

The adapter now exposes `prepareTransactionPlan` and keeps a transaction-local
plan. It reads the existing slot projection and each incoming evidence ref
before any write, runs the pure bounded merge/best-score decision, and records
which evidence keys already exist. Commit methods then only write the prepared
projection/evidence/attempt/operation set; they no longer perform projection
reads after writes. Existing evidence keys are skipped, and an unprepared
commit fails closed with `progress_transaction_plan_required`.

Evidence: focused packet **6 suites / 21 tests PASS**. The split is implemented
but still lacks a live Firestore emulator fixture, bounded snapshot document,
delayed terminal path, rules isolation, and callable export. No deploy,
commit, push, or production write.

Exact next executable task: add the emulator fixture with immutable Season and
Episode Storage objects, invoke the prepared transaction twice, and prove
duplicate evidence and lower-score retries produce no second refs/delta while
all reads precede writes.

## 14.15 — Existing projection update correctness (2026-07-17)

Closed a transaction detail in the prepare/commit split: when a prepared plan
improves an existing slot projection, the commit now uses `transaction.set`
with replacement; only a first projection uses `transaction.create`. This
prevents a valid higher-score retry from colliding with the existing document,
while equal/lower scores remain no-op. Focused packet remains **6 suites / 21
tests PASS**.

The live emulator proof, bounded snapshot/index document, delayed terminal
receipts, rules, and callable export remain outstanding. No deploy, commit,
push, or production write.

## 14.01 — Canonical resolved-pin adjudication seam (2026-07-17)

Extracted and tested `assertResolvedProgressPins`. The transaction adapter now
adjudicates the resolved Season envelope and resolved immutable Episode artifact
together: Season must be approved and match the requested Season ID, its pinned
Episode membership must match exactly, and the resolved Episode must be approved
with matching identity, revision, content hash, and revision fingerprint. This
keeps syntactic request parsing separate from server-owned canonical evidence.

Evidence: progress-event, callable, and Firestore adapter packet **3 suites / 12
tests PASS**. Targeted TypeScript has no error in the new V2 progress files; the
command still reports the pre-existing unrelated lifecycle union-narrowing error
at `content_studio/episode_lifecycle_transition_repository.ts:66`. No deploy,
commit, push, or production write.

Task 2.4 remains partial. The next required evidence is a Firebase emulator
fixture with real immutable Season/Episode documents and Storage objects,
negative cross-account/pin tests, idempotent replay and out-of-order behavior,
and rules denial coverage. Only after that can the callable be exported.

## 14.16 — Phase 02 regression checkpoint (2026-07-17)

Re-ran the broader existing Phase 02/root guard packet after the transaction
prepare/commit refactor. All **7 suites / 56 tests PASS**: local progress
storage/outbox, reducer, checkpoint projection, evidence policy, attempt hash
chain, and access boost policy. This confirms the new server seams did not
regress the already-proven local reducer and economy formulas.

The global Phase 02 gate is still open because the server emulator, cloud
snapshot/index, delayed terminal, rules, and callable export requirements are
not yet satisfied.

## 14.18 — Existing lifecycle emulator regression (2026-07-17)

Ran the real Firestore/Storage emulator lifecycle gate after the progress
transaction refactor:
`npm run test:emulator:v2-episode-lifecycle` — **1 suite / 1 test PASS**.
The emulator still proves canonical Season/Episode approval, pin replacement,
orphan cleanup, and unrelated-season preservation. The Java runtime emitted its
known deprecated `sun.misc.Unsafe` warning, but the script exited successfully.

This is a regression checkpoint, not the new progress-event emulator gate. The
dedicated progress fixture with account isolation, evidence/index replay,
snapshot/star/access writes, delayed terminal receipts, and rules denial is
still required. No deploy, commit, push, or production write.

## 14.19 — Progress adapter transaction integration double (2026-07-17)

Added `firestore_progress_event_store.integration.test.ts` with mocked canonical
Season/Episode resolvers and a Firebase transaction-shaped double. It exercises
the real adapter wiring and `applyProgressEvent` together: canonical pin reads,
operation/attempt reads, projection/evidence index reads, then the projection,
attempt, evidence, and operation write set. The test initially exposed a real
ordering bug: replay lookup required `pinnedRequest` before pin validation. The
operation ledger path was moved to an account-scoped key that can be read before
fresh pin validation; canonical Season/Episode validation still gates all new
mutations.

Evidence: combined progress packet **7 suites / 23 tests PASS**. This is a
transaction integration double, not the Firebase emulator with real immutable
Storage objects. Snapshot schema, delayed terminal receipts, rules isolation,
and callable export remain open. No deploy, commit, push, or production write.

Exact next executable task: run the same adapter flow against Firestore/Storage
emulators with real canonical artifacts, then add cross-account and archived-
Season replay cases before exporting the callable.

## 14.20 — Operation path keeps Season dimension before pin validation (2026-07-17)

The integration test exposed and the follow-up review corrected a path tradeoff:
operation replay must be readable before fresh pin validation, but its ledger
path must still include the immutable Season dimension. `readOperation` now
accepts the request's `seasonRevisionId` as a non-trusted path hint, while the
adapter validates the canonical Season/Episode before any new mutation. The
Firestore operation path is again account + Season revision + idempotency key;
the operation envelope remains self-describing and replay validation remains
strict.

Evidence: combined progress packet **7 suites / 23 tests PASS**. The real
Firestore/Storage progress emulator, snapshot schema, delayed receipts, rules,
and callable export remain open. No deploy, commit, push, or production write.

## 14.21 — Rules denial regression for progress ledgers (2026-07-17)

Added the new top-level V2 progress operation and attempt ledgers to the
server-only rules corpus and reran the Firestore rules emulator:
`npm run test:emulator:v2-authoring-rules` — **1 suite / 421 tests PASS**.
The emulator logs expected `PERMISSION_DENIED` responses for client writes;
these are the intended deny-only assertions, not test failures.

This closes only the direct rules regression for the ledger collections. Nested
account progress paths, real progress transaction writes, snapshot/index,
delayed terminal receipts, and callable export still require dedicated proof.
No deploy, commit, push, or production write.

## 14.17 — Prepare-before-write contract test (2026-07-17)

Added an explicit event-order test around `applyProgressEvent`: canonical
validation, operation/attempt reads, and `prepareTransactionPlan` must occur
before projection, attempt, evidence, and operation writes. The fake store now
records the sequence, making a future read-after-write regression fail in the
focused contract packet rather than only in a Firestore emulator.

Evidence: focused packet **6 suites / 22 tests PASS**. This is a deterministic
ordering guard, not the required live emulator proof; snapshot/index cloud
schema, delayed receipts, rules, and callable export remain open.

## 14.22 — Nested progress-path rules denial (2026-07-17)

Added client-denial coverage for nested account progress evidence documents
under `users/{stableUid}/v2_progress/{seasonRevisionId}/episodes/{episodeId}/evidence/{tupleKey}`.
The test covers get/create/update/delete, so client SDK access cannot bypass
the server-only progress ledger boundary through a deeper path.

Evidence: `npm run test:emulator:v2-authoring-rules` — **1 suite / 425 tests
PASS**. The emulator's `PERMISSION_DENIED` log lines are expected by the
deny-only assertions. Real progress transaction emulation, snapshot/index,
delayed terminal receipts, callable export, and the full curriculum/admin
integration remain open. No deploy, commit, push, or production write.

## 14.31 — Exact next task after live emulator (2026-07-17)

The live transaction gate is green. The next bounded task is the
server-owned scoring seam: derive a canonical performance-star candidate from
the pinned Episode activity policy and validated attempt/evidence result, then
compute the best-score delta against the transaction's stored slot. The client
must no longer be able to submit `candidateStars`, `performanceStarsDelta`, or
`accessStarsEarnedDelta` as authoritative values. Until this resolver exists,
positive claims remain fail-closed by design. Required proof is RED/GREEN for
first-write positive score, improvement, replay, lower-score no-op, and a forged
client delta; then rerun the live emulator and the 7-suite packet. No callable
export or release gate may advance on the current fail-closed placeholder.

## 14.29 — Live progress Firestore/Storage emulator gate (2026-07-17)

Added and ran `npm run test:emulator:v2-progress`. The test creates canonical
immutable Episode and Season records plus content-addressed Storage objects,
resolves them through the real adapter, writes zero-star scoped projections,
attempt/evidence/operation records for two accounts, verifies the account paths
are distinct, denies direct client writes through Rules, and rejects a new
mutation after the Season is archived without creating its operation ledger
entry.

Evidence: **1 suite / 2 tests PASS** in the real Firestore/Storage emulators.
The command initially exposed and fixed three real fixture/adapter issues:
the named test app did not satisfy the adapter's default Storage lookup, the
Season lifecycle document was incorrectly nested instead of separate, and the
second account reused the first attempt's evidence ref. The final fixture uses
the strict episode body validator; no validation bypass remains.

The emulator emits the expected `PERMISSION_DENIED` log for the Rules denial
assertion and the known Java `sun.misc.Unsafe` warning. No deploy, commit, push,
or production write.

## 14.30 — Post-emulator regression packet (2026-07-17)

After the live emulator fixture was repaired, the focused local progress packet
was rerun at **7 suites / 30 tests PASS**, the generator plan at **1 suite / 5
tests PASS**, and the Firestore Rules emulator at **1 suite / 425 tests PASS**.
The live progress emulator remains **1 suite / 2 tests PASS**. No deploy,
commit, push, or production write.

## 14.28 — Current exact next executable task (2026-07-17)

The next task is a real Firestore/Storage emulator proof for the progress
transaction adapter. It must create canonical immutable Season and Episode
revision records plus Storage objects, submit one valid zero-star evidence
event, verify operation/attempt/evidence/projection writes, prove account-A
isolation from account-B, deny client reads/writes through Firestore Rules, and
prove archived/new-mutation rejection. It must not weaken the settled replay
rule from §14.02. The required command is a dedicated `functions` emulator
script with Firestore and Storage, followed by the 7-suite progress packet,
rules emulator, `git diff --check`, and a fresh security review. Only after
that gate can the callable export and the server-owned scorer be advanced.

Current verified state: progress packet **7 suites / 30 tests PASS**, callable
focused **1 suite / 7 tests PASS**, generator DAG **1 suite / 5 tests PASS**,
rules emulator **1 suite / 425 tests PASS**. No deploy, commit, push, or
production write. Preserve all dirty/untracked V2 worktree files.

## 14.23 — Admin generator V2 plan foundation (2026-07-17)

Audited the current Admin Content Factory. Its UI remains the legacy
`language-factory` route rendered inline by `admin/v2/scripts/admin-core.js`;
there is no separate V2 generation route, stage DAG, or ModeTemplate/
ActivityInstance/Episode/Season localization flow wired into the admin yet.

Added a bounded, pure planning slice in
`functions/src/content_factory/generation_plan.ts`: V2 scope cardinalities are
fixed to vertical slice=1, chapter internal=8, full season=32; all thirteen
canonical V2 stage kinds are represented; `buildV2SeasonPlan` creates a
deterministic season/episode DAG; and `buildV2EpisodeSubgraph` adds optional
dialogue and Speaking Club branches without touching Firestore or generating
content. Duplicate IDs, unknown recipes, invalid scope, and wrong cardinality
fail closed. Legacy generation planning remains unchanged.

Evidence: `Push-Location functions; npx jest --runTestsByPath
src/content_factory/generation_plan.test.ts --no-cache --runInBand; Pop-Location`
— **1 suite / 5 tests PASS**. Functions typecheck remains blocked by unrelated
pre-existing missing modules/exports in `src/index.ts` (`arena_timing_observability`,
`admin_monthly_decision_pack`, `admin_content_stages`, and related exports).
No deploy, commit, push, or production write.
## 14.32 — Server-owned scoring policy wiring (2026-07-17)

Orbit V2 remains active and Phase 02 remains partial. The immutable pinned Episode now resolves the exact activity, star slot, template hash and scoring-policy ref; a missing code-owned evaluator fails closed, and client candidate stars cannot award progress.

Status: policy resolver **4 suites / 20 tests PASS**; full progress packet **8 suites / 35 tests PASS**; live progress emulator **1 suite / 2 tests PASS**; authoring Rules emulator **1 suite / 425 tests PASS**; generator DAG **1 suite / 5 tests PASS**; access callable **3 suites / 19 tests PASS**. No deploy, commit or push.

Exact next task: add a reviewed code-owned scoring-policy catalog with immutable hash/version lookup and deterministic pilot evaluators, then run the complete Phase 02 access-boost + progress emulator packet. Unknown policy, forged client fields, replay instability, or earned/purchased-star leakage into LearningEvidence must fail closed. Do not start runtime/UI or claim Phase 02 complete before this gate.

Startup: read the four V2 source documents and this handover, rerun the focused policy/progress tests plus `npm run test:emulator:v2-progress` and `npm run test:emulator:v2-authoring-rules` from the isolated learning-v2-pilot worktree.
## 14.33 — Code-owned scoring policy catalog (2026-07-17)

The fail-closed scorer now has a concrete catalog seam. `server_score_policy_catalog.ts` stores an immutable body hash/ref and exposes deterministic pilot evaluators for all eight normalized result codes. Lookup requires exact policy id/version/hash and a non-empty evidence fingerprint; unknown, duplicate or mismatched policies fail closed. The resolver ignores client candidate fields and produces a stable decision hash for replay.

Verification: catalog + evaluator + resolver **3 suites / 11 tests PASS**; prior progress packet **8 suites / 35 tests PASS**; progress emulator **1 suite / 2 tests PASS**; authoring rules emulator **1 suite / 425 tests PASS**; generator **1 suite / 5 tests PASS**; access callable **3 suites / 19 tests PASS**. `git diff --check` reports only normal CRLF warnings. No commit, push, deploy or production OpenAI API use.

Remaining blocker: wire this catalog into the real callable's production dependency graph and prove a first-write/improvement/replay/lower-score path end-to-end with an immutable ModeTemplate fixture. Then close the Phase 02 Access Boost emulator/rules packet. Runtime/UI/voice/curriculum work remains gated until these proofs pass.
## 14.34 — Production progress callable factory (2026-07-17)

Added a bounded server-only production factory in `functions/src/learning_v2/progress_event_callable.ts`. It derives the stable account binding and generation from authorization, constructs the Firestore transactional store, injects the code-owned pilot policy catalog, and calls `applyProgressEvent`. The endpoint is intentionally not exported from `index.ts` yet, so no unconfigured callable is deployed. Positive client star claims remain fail-closed without an immutable template reader; zero-star evidence can still be accepted.

Verification: callable + progress + catalog **3 suites / 23 tests PASS**; the broader scorer/store packet remains **5 suites / 23 tests PASS**; no commit, push or deploy. Exact next task: add a realistic immutable ModeTemplate artifact fixture to the live emulator and prove first-write/improvement/replay/lower-score end-to-end, then complete the Access Boost emulator/rules gate.
## 14.35 — Progress emulator regression after callable wiring (2026-07-17)

Reran the real Firestore/Storage progress emulator after the production callable factory and default scoring catalog changes. Result: **1 suite / 2 tests PASS**. The Rules `PERMISSION_DENIED` line and Java `sun.misc.Unsafe` warning are expected; Jest reports an existing open-handle warning after successful completion and requires a later cleanup pass. No deploy, commit or push.

The next gate remains unchanged: add an immutable ModeTemplate fixture plus real catalog wiring to the emulator and prove positive first-write, improvement, replay and lower-score behavior, then run the Access Boost emulator/rules packet.
## 14.36 — Access Boost real emulator/rules gate (2026-07-17)

Added `functions/src/learning_v2/emulator/access_boost.emulator.test.ts` and the `test:emulator:v2-access-boost` script. The real Firestore emulator proves one server purchase, replay idempotency, concurrent identical requests (one spend plus one replay), insufficient balance, stale account generation, A/B binding isolation, and direct client Rules denial for shards, gate receipts, ledger and public quote paths.

Verification: **1 suite / 5 tests PASS**. Expected `PERMISSION_DENIED` and rules expression-limit warnings come only from negative assertions; Rules were not weakened. Phase 02 now has explicit progress emulator **1/2**, Access Boost emulator **1/5**, authoring Rules emulator **1/425**. Remaining Phase 02 work is the realistic immutable ModeTemplate positive-scoring fixture and final combined gate packet.
## 14.37 — Positive scoring emulator follow-up (2026-07-17)

The dedicated positive-scoring emulator subtask was attempted but did not produce a validated fixture in this session; no unverified changes were retained. Existing progress emulator remains intentionally zero-star because its strict fixture has no ModeTemplate scoring artifact. The exact next executable task is still to add a content-addressed immutable ModeTemplate fixture, pass `scoringTemplates` plus `PILOT_SCORING_POLICY_CATALOG` to the real Firestore progress store, and prove first-write/improvement/replay/lower-score/forged-client behavior. Until that packet passes, positive production star awards and Phase 02 closure remain blocked.
## 14.38 — Positive fixture red/rollback (2026-07-17)

An attempted positive-score fixture was rejected by the strict Episode body contract before any write; the temporary test changes were removed rather than weakening validation. The canonical progress emulator is restored and green: **1 suite / 2 tests PASS**. This is a real remaining blocker, not a waived check: the next implementation must use a contract-valid ActivityInstance/Graph/StarSlot/ModeTemplate artifact and then demonstrate trusted positive scoring end-to-end.
## 14.39 — Regression packet after positive-fixture rollback (2026-07-17)

The strict-invalid positive fixture was removed; the focused server packet is green again: **8 suites / 39 tests PASS** (catalog, policy evaluator/resolver, callable, progress, transaction plan, Firestore store and integration). `git diff --check` has no content errors. Live progress remains **1 suite / 2 tests PASS** and Access Boost **1 suite / 5 tests PASS**. Positive scoring emulator evidence is still open and must not be inferred from these pure tests.
## 14.40 — Positive scoring fixture remains open (2026-07-17)

The attempted in-emulator positive scoring extension was rolled back after the strict contract rejected the mutated minimal body; the canonical zero-star emulator is green again (**1 suite / 2 tests PASS**). No validator or security rule was weakened. The server scoring catalog and callable seams remain covered by pure tests, but end-to-end positive first-write/improvement/replay/lower-score evidence is still missing and Phase 02 remains partial.
## 14.41 - Admin V2 generation contract slice (2026-07-17)
Added pure contract `functions/src/content_factory/v2_admin_generation_contract.ts`: strict V2 generation request parsing, immutable ModeTemplate bindings per episode, deterministic 13-stage DAG reuse, and per-target-locale localization tasks. Legacy generator/UI remain untouched.

RED initially failed because the module was absent; GREEN `npx jest --runTestsByPath src/content_factory/v2_admin_generation_contract.test.ts src/content_factory/generation_plan.test.ts --no-cache --runInBand` = **2 suites / 8 tests PASS**; `git diff --check` has no content errors.

Next: wire the pure seam into a server-authoritative draft-generation callable with `content.draft.write`, idempotency/audit, and emulator denial/replay/stale-pin proofs.

## 14.42 - Server-authoritative V2 generation queue callable (2026-07-17)

Implemented `functions/src/admin_v2_generation.ts` and `functions/src/admin_v2_generation.test.ts`. `adminCreateV2GenerationPlan` (with the explicit `adminQueueV2GenerationPlan` alias) now requires the canonical `content.draft.write` permission, parses the exact `v2-admin-generation-request.v1` envelope, resolves every pinned ModeTemplate through the immutable published resolver, and rejects missing, deprecated, replaced, or hash-mismatched pins with `v2_generation_template_pin_stale`. The callable creates one queued V2 job, canonical stage documents, locale tasks, an idempotency operation record, and an `admin_log` audit record in one Firestore transaction. A matching retry replays without duplicate writes; a reused idempotency key with a different fingerprint is rejected. No client-supplied scorer, capability, renderer, or executable code is accepted because the request contract is exact-field and immutable-template based; legacy generation queue/callables remain untouched. Both callables are exported from `functions/src/index.ts`.

RED/GREEN: the new focused suite initially failed at the missing callable seam, then `Push-Location functions; npx jest --runTestsByPath src/admin_v2_generation.test.ts src/content_factory/v2_admin_generation_contract.test.ts --no-cache --runInBand; Pop-Location` passed **2 suites / 6 tests**. `git diff --check` remains clean for content. The focused tests cover permission denial, stale pin denial, first queue, deterministic replay, idempotency collision, stage/localization/audit cardinality. A real Firestore emulator callable packet is not claimed here because the immutable Storage-backed ModeTemplate fixture is still a separate open gate; the next integration task should run this callable against that fixture and direct Rules denial.

## 14.42 - React-independent activity registry (2026-07-17)

Completed bounded Phase 03 Task 3.1 groundwork without touching UI, voice,
Speaking Club or legacy routes. Added `modules/learning-v2/runtime/activity_registry.ts`,
`activity_runtime.ts` and `unsupported_activity.ts`. The registry validates a
unique activity type, kernel/schema/renderer boundary, all five exact
hash-pinned policy refs, canonical policy-body hash, immutable policy record and
object pin, family/kernel compatibility, optional complete-catalog ambiguity,
runtime microphone/speech/network capability and lazy renderer resolution.
Unknown activity types fail with a typed recovery error; React is not imported.

RED: before the runtime files existed,
`npx jest --runTestsByPath tests/learning_v2_activity_registry.test.ts --no-cache --runInBand`
failed at TypeScript module resolution (`TS2307`, 0 tests). GREEN: the same
command now passes **1 suite / 6 tests** covering duplicate activity, missing or
hash-drifted policy, same key/version with different hash, descriptor/record
pin mismatch, unsupported capability and lazy renderer/unknown-type recovery.
`git diff --check` has no content errors (only normal CRLF warnings). No commit,
push, deploy or production write.

This does not close Task 3.0 reference-evidence approval, nor Tasks 3.2-3.4
(`ActivityScaffold`, six shells, routes/resume). Phase 02 positive scoring
emulator remains the execution gate before runtime/UI rollout.
## 14.43 — Admin callable + registry regression packet (2026-07-17)

Current focused verification after the Admin V2 queue callable and React-independent activity registry additions: **5 Functions suites / 20 tests PASS** for the admin callable, admin generation contract/DAG and existing authoring callables; **1 root suite / 6 tests PASS** for the activity registry. `git diff --check` has no content errors. The callable is server-authoritative, idempotent and permission-gated; the registry is lazy, hash-pinned and capability fail-closed. Real Admin emulator proof and Phase 02 positive scoring emulator remain open.

## 14.44 - Admin generation callable emulator proof (2026-07-17)

Added `functions/src/content_factory/emulator/v2_generation_plan.emulator.test.ts`
and `test:emulator:v2-generation-plan` in `functions/package.json`. The test
loads the canonical `tests/fixtures/learning-v2/episode-01.valid.json`
ModeTemplate, writes its exact canonical bytes to the Storage emulator with an
immutable generation/hash, and seeds matching published Firestore version and
lifecycle records. It proves direct client writes and reads of
`content_v2_generation_jobs` are denied, unauthenticated callers are rejected,
missing/hash-drifted/archived template pins fail closed, and a valid editor
request creates one queued job with 13 unique stages, one localization task,
one operation and one audit record. A byte-for-byte replay returns
`replayed: true` without adding jobs, stages, operations or audits.

GREEN: `Push-Location functions; npm run test:emulator:v2-generation-plan;
Pop-Location` - **1 suite / 2 tests PASS**. Expected Rules `PERMISSION_DENIED`
and Java `sun.misc.Unsafe` warnings are emitted only by negative assertions.
No Rules, production callable or legacy generator behavior was weakened; no
commit, push, deploy or production API use. Positive progress scoring and
later runtime/UI/curriculum phases remain open.
## 14.45 — Admin generation emulator verification (2026-07-17)

Reran the real Firestore/Storage Admin V2 generation emulator after callable wiring. The packet proves direct client read/write denial, auth and stale/missing/archived ModeTemplate rejection, one queued job with 13 unique stages and localization task, operation/audit creation, and idempotent replay without duplicates. Result: **1 suite / 2 tests PASS**. Expected `PERMISSION_DENIED` and Java warnings are negative-test/runtime noise; no Rules weakening, deploy or commit. Positive scoring emulator remains the separate Phase 02 blocker.
## 14.46 — Competitor UX evidence ledger (2026-07-17)

Applied the `competitor-ux-evidence` protocol and created `docs/v2/REFERENCE_EVIDENCE_LEDGER.md`. It records traceable official sources for Duolingo sound/voice practice, Rosetta Stone speech recognition, ELSA word/sentence/speech analysis, a minimum state matrix, provisional adopt/adapt/reject decisions and the evidence approval gate. No competitor assets or UI were copied. The ledger is explicitly provisional: lawful first-hand captures, six-frame original Phraseman wireframes and owner approval are still required before Tasks 3.2–3.4 UI implementation.
## 14.47 — Positive scoring emulator closed (2026-07-17)

Closed the Phase 02 positive scoring gate in the real Firestore/Storage progress emulator. The strict Episode fixture now has a contract-valid gated star slot and content-addressed immutable ModeTemplate policy; the store resolves canonical `activityInstances` (the previous scorer adapter only looked for legacy `activities`, which was fixed at the server boundary). The emulator proves first write `1`, improvement to `3` with delta `2`, replay idempotency, lower-score no-op, and forged client candidate `3` being ignored in favor of the server policy.

Verification: `npm run test:emulator:v2-progress` → **1 suite / 2 tests PASS**; focused server packet remains **8 suites / 39 tests PASS**. No validator or Rules weakening, no commit/deploy/push. Phase 02 positive scoring is no longer open; the remaining Phase 02 release task is the combined packet/manual invariant audit.
## 14.48 — Phase 02 combined emulator packet (2026-07-17)

Ran the complete bounded Phase 02 emulator packet after closing positive scoring: progress/Storage **1 suite / 2 tests PASS**, Access Boost **1 suite / 5 tests PASS**, and authoring Rules **1 suite / 425 tests PASS**. Expected `PERMISSION_DENIED`, Java warnings and Jest open-handle notices are from emulator negative assertions/shutdown; all commands exited successfully. The packet covers server-owned stars, access purchase separation, replay/concurrency, account generation/isolation, client-write denial and authoring security. No commit, deploy or push.
## 14.49 — Phase 02 root pure packet audit (2026-07-17)

Ran the normative root pure-contract command from the umbrella plan. **9 of 10 existing suites passed / 407 tests passed**; the listed `tests/learning_v2_delayed_probe_two_phase.test.ts` path does not exist in the current worktree, so that command cannot be claimed fully green. The existing delayed-probe contract suite passes. This is a plan/test-manifest drift finding to reconcile before declaring the full Phase 02 release packet complete; no substitute test was invented.

## 14.50 - Phase 02 root pure packet closed (2026-07-17)

Added the missing normative two-phase delayed-probe contract test at
`tests/learning_v2_delayed_probe_two_phase.test.ts`. It uses the real
`createProgressOutbox` API and proves that a delayed candidate remains pending
until one terminal timing acknowledgement, repeated terminal acknowledgement
is idempotent, and a system failure produces `not_assessed_system` without
mastery credit.

Focused GREEN: **1 suite / 2 tests PASS**. The complete normative root packet
now passes **10 suites / 409 tests**. This closes the previously open Phase 02
test-manifest drift. No production behavior, Rules or legacy flow was weakened;
no commit, push or deploy was performed.

## 14.51 - Phase 02 server delayed-ingestion gap (2026-07-17)

Независимый аудит подтвердил, что pure-контракты, local outbox и эмуляторы
зелёные, но release acceptance Task 2.4/2.6 пока не закрыт: `functions/src/learning_v2/progress_event.ts`
ещё не dispatch-ит `scheduled_delayed_probe` в server-authoritative delayed
runtime. Поэтому отсутствует production-boundary доказательство assignment/
launch binding, terminal timed/system/protocol acknowledgement, stale/expired,
substitution и out-of-window веток с запретом evidence до receipt. Phase 02
остаётся `in_progress`; отдельная задача `/root/v2_delayed_ingestion` выполняет
этот bounded integration slice с focused tests и emulator proof.

## 14.52 - Server delayed-probe ingestion slice (2026-07-17)

Added `functions/src/learning_v2/delayed_probe_ingestion.ts` with a server-only
terminal ingestion seam. It derives and checks the account-generation scope,
validates the hash-bound client candidate against server expected tuple keys,
resolves timing/system/protocol outcome only through a server decision callback,
creates exactly one immutable terminal receipt record, and replays an existing
record without changing it. The seam has no evidence/projection write path;
pre-receipt delayed candidates therefore cannot materialize LearningEvidence.
`progress_event.ts` now explicitly rejects delayed evidence bundles before a
terminal receipt (`delayed_evidence_requires_terminal_receipt`).

Focused GREEN: `Push-Location functions; npx jest --config jest.config.js
--runTestsByPath src/learning_v2/delayed_probe_ingestion.test.ts
src/learning_v2/progress_event.test.ts --no-cache --runInBand; Pop-Location`
-> **2 suites / 14 tests PASS**. Coverage includes
one-ack timing replay, system non-assessment finalization, account-scope and
candidate-hash/substitution rejection. This is a pure server-boundary slice;
Firestore callable wiring and a real emulator test remain open, so Phase 02 is
not claimed complete. No Rules weakening, commit, push or deploy.

## 14.53 - V2 generation stage lifecycle seam (2026-07-17)

Выполнен узкий slice Phase 04 без создания второй очереди и без вызова OpenAI.
Добавлены `functions/src/content_factory/v2_stage_lifecycle.ts` и
`v2_stage_lifecycle.test.ts`. Pure-модуль принимает сохранённые stage records:
queued-стадия runnable только после успешных зависимостей; running-стадия может
быть повторно захвачена только после истечения аренды; failed-стадия не
повторяется после `maxAttempts`. `start` выдаёт bounded 10-минутную аренду и
увеличивает attempts, `succeed`/`fail` очищают аренду. Firestore-транзакции,
leases и запись артефактов остаются ответственностью существующего worker;
legacy generation queue не менялась.

В server-authoritative V2 queue callable добавлены `attempts: 0` и
`maxAttempts: 3` в отдельные `content_v2_generation_stages` документы.
Immutable `job.plan` не переписывается; emulator проверяет именно persisted
stage body.

RED: до реализации focused Jest завершался `TS2307: Cannot find module
'./v2_stage_lifecycle'` (0 tests). GREEN: lifecycle suite — **1 suite / 4
tests PASS**; admin callable regression — **2 suites / 7 tests PASS**. Первый
emulator run выявил ошибочную проверку DAG-плана вместо stage document; после
исправления `npm run test:emulator:v2-generation-plan` дал **1 suite / 2 tests
PASS**. Ожидаемые `PERMISSION_DENIED`, Java `Unsafe` и Jest open-handle
уведомления относятся к negative assertions/shutdown. No commit, push, deploy
or production API use.

Следующий шаг: присоединить pure lifecycle seam к существующему
`content_factory_worker` через транзакционный claim/lease adapter и отдельный
emulator RED/GREEN для dependency ordering, stale lease и retry exhaustion.
Новый queue/worker создавать нельзя; до server-boundary proof lifecycle не
считать завершённым.
## 14.55 - Server-bound delayed callable and emulator packet (2026-07-17)

Закрыт bounded integration slice, отмеченный в §14.51. Существующий
`functions/src/learning_v2_delayed_callable.ts` теперь использует тот же
server-derived auth anchor и `accountGeneration`, что и обычный V2 progress
callable (`createProgressEventAuthorization`). Поля `stableId` и поколения в
legacy request envelope сохранены для совместимости, но больше не являются
источником истины: несовпадение с серверной привязкой отклоняется. Callable
получил fail-closed App Check, регион и таймауты; legacy graph envelope и
существующий adapter не переписывались.

Добавлен `test:emulator:v2-delayed-runtime` и расширен
`functions/src/content_studio/emulator/v2_delayed_runtime.emulator.test.ts`.
Реальный Firestore emulator теперь доказывает: server assignment/launch
binding, один terminal timing receipt и idempotent replay, stale assignment,
expired launch, out-of-window non-assessment timing, provenance/probe
substitution rejection, а также отсутствие evidence/projection в terminal
receipt phase. Rules остаются закрытыми для прямого client access.

GREEN: `Push-Location functions; npm run test:emulator:v2-delayed-runtime;
Pop-Location` -> **1 suite / 2 tests PASS**; прежние delayed callable/adapter
contracts -> **2 suites / 8 tests PASS**. Первый запуск выявил только ошибочный
`Transaction.create` в emulator fixture; заменён на supported `transaction.set`
без изменения production logic. No commit, push, deploy or production API use.

Следующий точный шаг: присоединить terminal receipt к post-receipt
`ProgressEventRequest` builder/store path и добавить отдельный emulator RED/GREEN
для materialized delayed LearningEvidence после receipt; до этого Phase 02
остаётся `in_progress`, несмотря на зелёный ingestion/callable packet.

## 14.54 - Transactional V2 stage claim/lease adapter (2026-07-17)

Добавлен `functions/src/content_factory/v2_stage_claim_adapter.ts`: существующий
`content_factory_worker` получает транзакционный claim/lease seam поверх уже
существующей коллекции `content_v2_generation_stages`; новая очередь не создавалась.
Адаптер атомарно проверяет зависимости, повторно захватывает только истёкший lease,
увеличивает attempts в пределах maxAttempts и защищает finish lease-токеном/worker ID.
Тонкие wrapper-экспорты добавлены в `content_factory_worker.ts`, legacy callable не
переписывался.

Добавлены `functions/src/content_factory/emulator/v2_stage_claim_adapter.emulator.test.ts`
и npm-скрипт `test:emulator:v2-stage-claim`. Реальный Firestore emulator proof:
**1 suite / 3 tests PASS** — dependency ordering, stale lease takeover с отказом
старого worker, retry exhaustion. Pure lifecycle + worker regression:
**2 suites / 7 tests PASS**. No new queue, Rules/API/legacy weakening, commit,
deploy or push. Это закрывает только claim/lease proof; полный provider → artifact
→ release worker pipeline остаётся открытым.

## 14.56 - Phase 03 Task 3.0 evidence-gate audit (2026-07-17)

Проведён bounded-аудит reference pack для Phase 03 Task 3.0 в
`docs/v2/REFERENCE_EVIDENCE_LEDGER.md`. Ledger содержит пять выбранных voice-first
паттернов и 11 обязательных состояний (entry/locked, instruction, idle, active,
processing, correct, partial, hint/fallback, permission/offline/error,
completion/reward, exit/resume), а также traceable official source URLs для
Duolingo, Rosetta Stone и ELSA. Это только Tier B/official evidence: raw competitor
screenshots, first-hand captures и copied assets в репозитории отсутствуют.

Добавлен чистый contract test `tests/learning_v2_reference_evidence_contract.test.ts`.
Он блокирует ложное повышение статуса в `approved`, требует lawful first-hand
capture с account/device metadata и проверяет наличие original Phraseman
wireframe/contact-sheet, motion/audio/accessibility, offline/permission/
interruption/resume, distinctiveness review и owner decision gates. GREEN:
`npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts
--no-cache --runInBand` -> **1 suite / 3 tests PASS**.

Task 3.0 остаётся **provisional / approval required**. Точные недостающие
артефакты: (1) dated first-hand capture ledger с platform/build, locale, course
level, subscription, capture date, source/provenance и rights/use note; (2) минимум
один оригинальный Phraseman six-frame contact sheet на каждый из пяти выбранных
режимов; (3) motion/audio/accessibility и interruption/offline/permission/resume
annotations; (4) distinctiveness review; (5) владелец продукта должен утвердить
конкретную wireframe revision/hash в approval record. До появления всего пакета
Tasks 3.2–3.4 и production UI остаются заблокированы; legacy routes не менялись.
No commit, push, deploy or production API use.

## 14.57 - Post-receipt delayed materialization seam (2026-07-17)

## 14.58 - Large completion audit and current release blockers (2026-07-17)

Проведён read-only аудит утверждённых umbrella и Content Studio планов по
текущему worktree/HEAD `23c71a117`. Расширенный root contract packet зелёный:
**19 suites / 530 tests PASS**; это подтверждает canonical identity,
DecisionRegistry, activity/episode/curriculum validation, evidence/attempt,
delayed contracts, progress storage/outbox, activity registry и fail-closed
reference-evidence gate.

Аудит не разрешает объявить цель завершённой. Доказанные partial/open области:

- Phase 01 Task 1.4 backend client/Functions conformance mirror ещё не доказан;
- Phase 02 требует approved-episode `createFirestoreProgressEventStore` transaction
  E2E с конечными projection/index paths;
- Phase 03 Task 3.0 provisional: отсутствуют lawful first-hand captures,
  пять оригинальных six-frame contact sheets, annotations, distinctiveness review
  и owner approval/hash; Tasks 3.2–3.4 не начаты;
- Phase 04–05 voice runtime, P0 shells и режимы не начаты;
- Phase 06–15 generator artifact/release pipeline, E1 device slice, 32 production
  episodes, Speaking Club adapter, checkpoints, analytics, rollout/device gates
  и Phase 14 owner decision не завершены.

P0 release blockers: нет user-ready V2 UI/E1 author-to-device, нет 32-episode
production release и нет rollout/device evidence. P1 next task remains the
real approved-episode delayed store transaction E2E; no commit, push, deploy or
production API use was performed.

Закрыт следующий bounded blocker из §14.55. В `functions/src/learning_v2/delayed_probe_ingestion.ts`
добавлен server-only `materializeDelayedTerminalEvidence`: он строит LearningEvidence и
non-assessment bodies только из hash-bound candidate + immutable terminal receipt. До receipt
bundle не строится; `SKIPPED`/`no_record` остаётся без ref. Для timing inside создаётся ровно
одна assessed запись на одну terminal resolution, для out-of-window — только
`not_assessed_for_window`, для system failure — только `not_assessed_system`; mastery/star
projection из timing/failure receipt не создаётся.

`ProgressEventRequest` теперь принимает необязательный `terminalReceipt` только для delayed
attempt. `parseProgressEventRequest` проверяет receipt hash и canonical attempt ref, сверяет
материализированный bundle с server builder и отклоняет evidence без receipt или подменённый
bundle. Добавлен `buildPostReceiptProgressEventRequest`; legacy graph envelope и его path не
изменялись. Это подключает второй phase к существующему `applyProgressEvent`/store seam, но
полный production Firestore callable E2E с реальным approved episode остаётся отдельным gate.

RED/GREEN: `functions/src/learning_v2/delayed_probe_ingestion.test.ts` -> **1 suite / 3 tests
PASS** (receipt hash, 1:1 tuple mapping, skipped ref-free). Добавлен отдельный emulator
`functions/src/learning_v2/emulator/delayed_materialization.emulator.test.ts` и script
`npm run test:emulator:v2-delayed-materialization`; Firebase Firestore emulator -> **1 suite /
1 test PASS**: no evidence before receipt, receipt/materialization hash equality, one-to-one
mapping and persisted materialized refs. Existing delayed ingestion/progress regression -> **2
suites / 14 tests PASS**. No commit, push, deploy or production API use.

Точный следующий шаг: собрать approved-episode fixture для post-receipt `applyProgressEvent`
через настоящий `createFirestoreProgressEventStore` и emulator transaction, чтобы подтвердить
не только builder/Firestore materialization record, но и конечные projection/index paths;
затем повторить Phase 02 combined packet. До этого Phase 02 остаётся `in_progress`.

## 14.59 - Phase 02 combined packet after delayed store E2E (2026-07-17)

Повторён полный bounded Phase 02 emulator packet после approved-episode
transaction E2E: `test:emulator:v2-progress` **1 suite / 2 tests PASS**,
`test:emulator:v2-access-boost` **1 suite / 5 tests PASS**,
`test:emulator:v2-authoring-rules` **1 suite / 425 tests PASS** и
`test:emulator:v2-delayed-progress` **1 suite / 1 test PASS**. Ожидаемые
`PERMISSION_DENIED`, Java Unsafe и Jest open-handle сообщения относятся к
negative assertions и shutdown; команды завершились успешно. Production
callable/device gates всё ещё не закрыты.

## 14.61 - Large audit: Content Studio acceptance remains open (2026-07-17)

Запущен read-only финальный Content Studio packet из утверждённого плана.
Результат: **6 suites / 99 tests PASS**, но **23 заявленных suites отсутствуют**
(canonical authoring contracts, capability/mode template, preview envelope и
route/no-progress, E1 contract/integration, rollout/release and several Admin
stage/artifact/season-bundle gates). Это прямой acceptance-gap, а не устаревшая
таблица. Content Studio Tasks 6–15 и E1 author-to-device поэтому остаются
partial/not-started; нельзя объявлять generator или 32-episode release готовыми.

## 14.62 - Phase 01 Task 1.4 backend conformance mirror verified (2026-07-17)

Проверен существующий Functions-side adapter
`functions/src/learning_v2/contracts.ts` и его corpus test
`functions/src/learning_v2/contracts.test.ts`. Это не shadow schema: adapter
реэкспортирует canonical modules, validators, canonical JSON/hash, attempt и
evidence materialization refs, а также публикует фиксированный schema/hash
manifest. RED/GREEN focused command:
`npx jest --config functions/jest.config.js --runTestsByPath functions/src/learning_v2/contracts.test.ts --no-cache --runInBand`
-> **1 suite / 85 tests PASS**. Valid episode package, canonical hashes и весь
invalid corpus дают тот же issue-code/path результат, что и root validator.
Task 1.4 bounded mirror доказан; production callable/release gates остаются
отдельными задачами.

## 14.63 - Real Firestore post-receipt delayed progress E2E (2026-07-17)

## 14.64 - Current Content Studio regression pass (2026-07-17)

## 14.65 - Current Functions Learning V2 regression pass (2026-07-17)

## 14.66 - Additive lesson-bundle.v2 release contract (2026-07-17)

## 14.67 - Client published-release loader/cache slice (2026-07-18)

Mission: продолжаем Learning V2 к пилотному 32-episode season: канонический content/release seam, server-authoritative progress and stars/access, voice modes, Content Studio generator, device delivery, rollout и final release evidence. Legacy surface не удаляется до Phase 14 owner decision.

Изменения: shared `modules/learning-v2/content/release_manifest.ts` теперь содержит published-view type, cache-key builder и `validatePublishedV2SeasonManifest`; `release_cache.ts` реализует bounded TTL/LRU LKG cache; `release_loader.ts` делает network-first load, validate-before-cache и LKG fallback. Functions adapter реэкспортирует shared contract. Тест `tests/learning_v2_release_loader.test.ts` проверяет drift rejection, bounded cache/LKG и non-caching invalid response.

RED был compile-level (отсутствовали cache/loader exports). GREEN: `npx jest --runTestsByPath tests/learning_v2_release_loader.test.ts functions/src/content_factory/v2_release_adapter.test.ts --no-cache --runInBand` -> root **1 suite / 3 tests PASS**; Functions adapter ранее **1 suite / 4 tests PASS**. `git diff --check` без whitespace errors.

Status: canonical release mirror — bounded completed; client loader/cache — bounded completed, production wiring open; Phase 02 — in_progress; voice/Speaking Club V2 — not started; Content Studio Tasks 6-15/E1 — partial; UI evidence/owner approval — provisional; rollout/release — not started.

Worktree `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`, branch `codex/learning-v2-pilot`, HEAD `23c71a1178fee3c1621e35d9a03919b5f80bd47a`; no commit/push/deploy/API use. Preserve all dirty/untracked V2 files.

Exact next task in a fresh session: run `git status --short`, verify the four mandatory V2 documents, independently review production progress callable exposure and account-generation binding before any `functions/src/index.ts` export. Decide whether `createProgressEventProductionCallable` can be exported; if yes, add emulator callable transport tests for auth anchor, account generation, replay and forged scope; if no, record exact blocker. Re-run combined Phase 02 emulator packet and append counts. Do not mark Phase 02 complete while callable/device/release evidence is open.

Startup: `Set-Location C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`; `Get-Content docs/v2/HANDOVER.md -Tail 180`; `npx jest --runTestsByPath tests/learning_v2_release_loader.test.ts --no-cache --runInBand`; `git status --short`.

### Находки и предложения
Loader/cache is safe as a pure offline seam but is not connected to a production pointer or UI. Close callable auth review, then author-to-device delivery, then approved voice-first UI. Keep release bodies immutable and cache keys hash-bound; never cache unvalidated network payloads.

Добавлен bounded pure adapter
`functions/src/content_factory/v2_release_adapter.ts` и его тест
`v2_release_adapter.test.ts`. Он не создаёт пятую CourseRelease surface и не
меняет `course-release.v1`: описывает hash-external
`V2SeasonReleaseManifestBody/Record`, server-bound environment pointer,
ios/android support pair, full-season 32-unit guard, rollout states/pause
reason и same-scope rollback target. Self hash/object/record metadata в body
запрещены; `manifestHash` вычисляется только от canonical body.

GREEN: **1 suite / 4 tests PASS**. Это additive contract seam; approved season
resolution, artifact materialization, Admin release callable, client loader,
device receipts и rollout gates остаются открытыми.

Широкий content-factory packet `npx jest --config jest.config.js
src/content_factory --no-cache --runInBand` зелёный: **29 suites / 91 tests
PASS**. Включены artifact storage/repository, release sealing/review/surface,
generation plan, Admin stage lifecycle/claim и course-release contracts. Это
подтверждает reusable infrastructure, но не доказывает V2 lesson-bundle
activation/rollback через Admin UI или E1 device delivery.

Широкий bounded Functions runtime packet `npx jest --config jest.config.js
src/learning_v2 --no-cache --runInBand` зелёный: **18 suites / 162 tests PASS**.
Он покрывает progress event/store/projection/evidence, server scoring/catalog,
delayed callable/ingestion/materialization и conformance seams. Это не закрывает
native UI/device, App Check transport in production, rollout или release gates.

Выполнен широкий, но ограниченный каталогом Functions Content Studio:
`Push-Location functions; npx jest --config jest.config.js src/content_studio
--no-cache --runInBand; Pop-Location` -> **29 suites / 221 tests PASS**.
Это сильнее старого manifest-аудита (который ссылался на отсутствующие имена
части исторических suites), но не заменяет E1 author-to-device, preview lab,
lesson-bundle release или rollout gates. Legacy authoring paths не удалялись,
Rules и production API не ослаблялись.

Закрыт bounded следующий шаг из §14.57. Добавлен
`functions/src/learning_v2/emulator/delayed_progress_event.emulator.test.ts` и
npm-команда `test:emulator:v2-delayed-progress`. Тест поднимает реальные
Firestore + Storage emulators, записывает approved immutable Episode revision и
approved Season revision с canonical bytes/object metadata, затем создаёт
`createFirestoreProgressEventStore` с настоящими season/episode readers.

Проверенный сценарий: до terminal receipt account-scoped evidence и projection
paths отсутствуют; server-only `ingestDelayedProbeTerminal` создаёт один
terminal timing receipt и второй вызов возвращает тот же документ как replay;
receipt сохраняется отдельно в `learning_v2_timing_receipts`; только после этого
`buildPostReceiptProgressEventRequest` строит bundle из receipt и
`applyProgressEvent` выполняет настоящую Firestore transaction. Проверены
конечные account-scoped пути `users/{scope}/v2_progress/.../evidence`,
`.../slots`, progress operation и attempt index; evidence содержит exact
receipt-derived tuple/sourceAttempt. Повторный `applyProgressEvent` возвращает
`duplicate: true` и не создаёт вторую запись.

Отдельно проверен forged pre-receipt bundle: `applyProgressEvent` отклоняет его
с `delayed_evidence_requires_terminal_receipt`, причём до этой ошибки не
появляется ни evidence, ни операция, ни projection.

GREEN:
`Push-Location functions; npm run test:emulator:v2-delayed-progress;
Pop-Location` -> **1 suite / 1 test PASS** (реальные Firestore/Storage
emulators). Первый RED был compile-level: discriminated-union receipt не давал
доступ к `timingReceiptId`; тест исправлен явным `kind === "timing"` guard,
затем GREEN повторён npm-командой. Ожидаемое Java `Unsafe` предупреждение и
Jest open-handle notice относятся к завершению emulator process. No Rules
weakening, commit, push, deploy or production API use.

Phase 02 всё ещё **in_progress**: этот slice доказывает store transaction и
конечные пути, но production callable wiring/device evidence и общий combined
release packet ещё не закрыты.

Точный следующий executable task: повторить combined Phase 02 packet
(`test:emulator:v2-progress`, `test:emulator:v2-access-boost`,
`test:emulator:v2-authoring-rules`, плюс `test:emulator:v2-delayed-progress`),
затем провести independent review callable auth/account binding и обновить
этот handover точными counts; Phase 02 не переводить в completed при открытом
production callable или Rules/device finding.

## 14.68 - Production progress callable exposure review: export blocked (2026-07-18)

The requested critical review was completed before retaining any `functions/src/index.ts` export. A temporary local callable-wrapper test and deployment export were removed after independent review identified P1 findings. No progress callable is exported, deployed, or reachable from `functions/src/index.ts`; no commit, push, deploy, production Firestore write, or OpenAI API use occurred.

Independent reviewer verdict: **FAIL / not production-ready**.

- **P1 TOCTOU:** authorization resolves `auth_links`, reads account generation, and checks the deletion tombstone before the progress transaction. The transaction only compares a supplied scope hash; it does not re-read the anchor, current generation, or tombstone. A deletion/generation advance can race an already authorized progress write.
- **P1 anchor fallback:** `resolveStableUidForAuth(..., { requireKnownIdentity: false, repairLinks: false })` permits direct-user/provider-query/raw-auth-UID fallback without a live `auth_links/{authUid}` anchor. This does not meet the canonical provider-anchor invariant.
- **P1 transport evidence:** the discarded test invoked `(callable as any).run(...)` and started only Firestore. It was a callable runtime wrapper, not Functions-emulator network transport, so it could not prove endpoint routing, Firebase Auth token verification, or App Check enforcement.
- **P2 configuration:** `ENFORCE_APP_CHECK_V2_PROGRESS=false` can disable App Check without a production-environment guard.

Verified but insufficient facts: the parser accepts no client `stableUid` or generation fields, forged `accountScopeHash` is rejected against a server-derived binding, and replay is structurally idempotent inside the store.

RED/GREEN record for the discarded exposure attempt:

- RED: `Push-Location functions; npm run test:emulator:v2-progress-callable; Pop-Location` failed because the asserted production export was absent. The first test fixture also revealed a local replay-fixture defect (new memory store per call), corrected before evidence collection.
- The local wrapper command then passed **1 suite / 3 tests**, but it is explicitly not retained as callable transport evidence or a release gate.
- Focused contract command `npx jest --config jest.config.js --runTestsByPath src/learning_v2/progress_event_callable.test.ts --no-cache --runInBand` passed **1 suite / 9 tests**. A broader `npx tsc --noEmit` is blocked by pre-existing unrelated `functions/src/index.ts` missing-module/export errors (`arena_timing_observability`, `admin_monthly_decision_pack`, and several `admin_content_*` symbols), not this unexported callable slice.
- `git diff --check` passed after removal.

Combined Phase 02 emulator packet repeated successfully from `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot\functions`:

- `npm run test:emulator:v2-progress` -> **1 suite / 2 tests PASS**.
- `npm run test:emulator:v2-access-boost` -> **1 suite / 5 tests PASS**.
- `npm run test:emulator:v2-authoring-rules` -> **1 suite / 425 tests PASS**.
- `npm run test:emulator:v2-delayed-progress` -> **1 suite / 1 test PASS**.

Expected negative `PERMISSION_DENIED`, Java Unsafe, and Jest open-handle shutdown messages appeared in existing emulator suites; every command exited 0. Phase 02 remains **IN PROGRESS**; callable/device/release gates are open.

Exact next executable task: critical TDD repair of the unexported progress-callable binding. Freeze one packet that (1) defines whether anonymous identity uses an explicit reviewed anchor or is rejected, (2) moves auth-link -> stable UID, live account generation, and tombstone absence into the same Firestore transaction that reads/replays/writes progress, and (3) makes App Check fail closed outside explicit emulator-only configuration. Add failing transaction race/anchor-fallback tests, then a real Functions-emulator network transport suite (not `.run`) covering missing, invalid, and valid Firebase Auth/App Check plus anchor, generation advance, replay, and forged scope. Export from `index.ts` only after fresh independent spec and adversarial reviews PASS, focused gates, and true transport evidence. Do not weaken Rules, remove legacy behavior, commit unrelated dirty work, push, deploy, or use project OpenAI credentials.

## 14.69 - Phase 02 P2 parser boundary PASS and non-production App Check provisioning (2026-07-18)

Bounded P2 repair is independently reviewed **PASS** with no actionable P0/P1/P2 findings. `parseProgressEventRequest` is the only code inside the error-normalization boundary: an ordinary parser error becomes `HttpsError('invalid-argument')`, while an existing `HttpsError` is preserved. Authorization, identity, scope validation, and executor/Firestore errors remain outside the catch and are not masked.

Evidence: focused callable unit suite -> **1 suite / 17 tests PASS**; combined parser/callable unit packet -> **2 suites / 29 tests PASS**; isolated Functions-emulator HTTP transport -> TypeScript compile PASS and **1 suite / 4 tests PASS**, including malformed body -> HTTP 400 `INVALID_ARGUMENT`; `git diff --check` -> PASS. The transport suite deliberately uses unsigned emulator tokens and proves routing/error serialization only, not cryptographic Firebase Auth or App Check verification. `functions/src/index.ts` still has no progress-callable export; Rules and legacy surfaces were not changed.

To close the remaining real App Check transport gate, an explicitly non-production disposable project was created: `phraseman-v2-ac-test-20260718` (project number `769668545998`, display `phraseman-v2-appcheck-test0718`). It contains one disposable Web app `1:769668545998:web:25995981f84ad912e27f9f` and one App Check debug-token resource. No billing link, callable deploy, production-project change, source edit, or secret output occurred. The debug token is stored only DPAPI-encrypted outside the repository. The current blocker is debug-token exchange HTTP 403; investigate API-key/service configuration without printing any secret or performing paid/production mutation.

Exact next task: finish the isolated non-production App Check exchange/readiness check. If authentic valid/invalid/missing App Check tokens can be obtained, use one critical writer to deploy only a dedicated disposable test callable, collect authenticated HTTP evidence, then delete that callable. Otherwise record the precise cloud configuration blocker. Do not export the production progress callable until this gate and its fresh verification pass.

## 14.70 - Real disposable-project App Check transport proof and cleanup (2026-07-18)

Mission remains unchanged: deliver the modular server-deliverable 32-episode Learning V2 pilot with speaking-first progression, separate earned performance/mastery evidence from purchased access, integrate Speaking Club as a capstone, Personal Review and dialogs through the same graph, provide immutable Content Studio authoring/release/rollback and language scaling, and preserve every legacy surface until measured parity plus the explicit Phase 14 owner decision. Handover evidence must remain sufficient for a zero-context continuation.

Authority remains, in order: current owner instruction; system/developer and `AGENTS.md`; this handover; `docs/v2/README.md`; normative `docs/v2/00`-`08`; umbrella and Content Studio plans dated 2026-07-14; live Git/test/cloud evidence. No normative conflict was introduced in this packet.

### Verified outcomes

- Disposable Firebase project only: `phraseman-v2-ac-test-20260718` (`769668545998`), never production. Billing was already linked and re-verified by the preceding recovery task before this packet.
- Isolated test source compiled with `npx tsc --project functions/tsconfig.v2-progress-transport.json --pretty false`; `functions/src/index.ts` remained unmodified and does not export the progress callable.
- `firebase deploy --config firebase.v2-progress-transport.json --project phraseman-v2-ac-test-20260718 --only functions:v2ProgressTransport --non-interactive` created exactly `v2ProgressTransport(us-central1)`. Firebase CLI returned exit 1 only after the function was successfully created because the Artifact Registry cleanup policy was not yet configured; this was a cleanup-policy failure, not a function deployment failure.
- Identity Platform was initialized only in the disposable project. Anonymous Auth was temporarily enabled solely to mint one genuine Firebase Auth ID token, then restored to disabled. The temporary Auth user was deleted.
- A fresh UUID4 App Check debug secret was registered only in the disposable Web app, exchanged successfully for an authentic App Check JWT, used for the proof, and revoked. The older orphaned debug-token resource from the failed session was also revoked. No secret was printed or committed.
- Real HTTPS callable results with the same authentic Firebase Auth token and malformed `{data:{}}` body: missing App Check -> HTTP 401 `UNAUTHENTICATED`; invalid App Check -> HTTP 401 `UNAUTHENTICATED`; authentic App Check -> HTTP 400 `INVALID_ARGUMENT`, proving the verified token reached the handler/parser boundary.
- Cleanup: `firebase functions:delete v2ProgressTransport --project phraseman-v2-ac-test-20260718 --region us-central1 --force` succeeded; final `remainingFunctions=0`, `remainingDebugTokens=0`, anonymous Auth `false`. Artifact Registry policy deletes images older than one day.
- Combined Phase 02 emulator packet was repeated from `functions`: `test:emulator:v2-progress` 2/2 PASS; `test:emulator:v2-access-boost` 5/5 PASS; `test:emulator:v2-authoring-rules` 425/425 PASS; `test:emulator:v2-delayed-progress` 1/1 PASS. Total: **433 tests PASS**, all commands exit 0. Logs: `functions/.codex-tmp/phase02-combined-20260718-recovery/`.
- Phase 10.1A was not duplicated. Fresh root command `npx jest --runTestsByPath tests/learning_v2_legacy_placement_policy.test.ts --no-cache --runInBand` -> **1 suite / 3 tests PASS**. Environment still had 52 `node.exe`; the test completed in 40.068 s and emitted only the existing forced-exit/open-handle notice. Independent review remains open.

### Failed/corrected approaches

- Initial Cloud Functions deploy enabled the required disposable-project APIs and created the function, but ended nonzero because no artifact cleanup policy existed. Correction: execute the network proof, delete the function, then install a one-day cleanup policy on `gcf-artifacts`.
- Anonymous Auth signup initially returned HTTP 400 because Identity Platform had not been initialized. Correction: initialize Auth only in the disposable project, enable anonymous sign-in temporarily, delete the test user, and restore the original disabled state.
- The original debug secret from the failed session was not recoverable from task state. Correction: create a fresh short-lived token without printing it, use it in memory, revoke it, and revoke the orphaned prior resource.

### Current phase status (evidence-based, not a release claim)

| Phase | Status | Exact gate |
|---|---|---|
| 00 Security boundary | DONE | prior emulator deny/allow and canonical boundary evidence |
| 01 Domain contracts | DONE | canonical contracts + Functions mirror verified |
| 02 Progress/access | IN PROGRESS (~85%) | real App Check transport PASS; fresh spec/adversarial review, production export decision, device/release evidence still open |
| 03 UI evidence/shells | BLOCKED (~10%) | lawful first-hand captures, five six-frame contact sheets, distinctiveness review, owner approval/hash |
| 04 Voice | BLOCKED (~5%) | waits for Phase 02 and approved Phase 03 evidence; no acoustic claims |
| 05 P0 activities | PARTIAL (~5%) | adapter inventory exists; renderers/shells/evidence integration open |
| 06 Content delivery | PARTIAL (~10%) | loader/authoring seams exist; author-to-device E1 waits for Phase 02 closure |
| 07 E1 slice | BLOCKED (~5%) | waits for Content Studio delivery and device evidence |
| 08 P1/E1-E8 | BLOCKED (~5%) | waits for E1 release and chapter gate |
| 09 Speaking Club | BLOCKED (~5%) | waits for voice/E1 evidence and capstone governance |
| 10 Placement/migration | IN PROGRESS (~10%) | 10.1A pure recommendation policy 3/3 PASS; fresh independent review and all write/migration gates open |
| 11 Full pilot content | BLOCKED (~5%) | no generation before author-to-device gate |
| 12 Telemetry | NOT STARTED (~5%) | waits for runtime/content event surfaces |
| 13 Rollout | NOT STARTED (~5%) | device, accessibility, rollback and staged release gates open |
| 14 Legacy decision | BLOCKED (~5%) | parity evidence and explicit owner decision absent; legacy preserved |

### Content Studio task status

| Task | Status | Gate |
|---|---|---|
| 0 Security boundary | DONE | prior security inventory/emulator matrix |
| 1 Shared contracts/hash corpus | DONE | canonical corpus and hashes |
| 2 Capability catalog/manifests | PARTIAL | contract seams exist; full app-support closure open |
| 3 ModeTemplate lifecycle/localization | PARTIAL | repository/emulator slices exist; UI/release integration open |
| 4 Episode/season authoring | PARTIAL | backend authoring slices exist; E1 complete graph not released |
| 5 Guarded callables/roles/storage | PARTIAL | focused seams pass; final production integration/review open |
| 5A UI evidence | BLOCKED | lawful captures and owner approval/hash missing |
| 6 Admin IA shell | NOT STARTED | approved V2 Studio shell gate open |
| 7 Mode Library UI | NOT STARTED | waits for 5A/6 |
| 8 Episode Builder UI | NOT STARTED | waits for 5A/6 and authoring closure |
| 9 Preview Lab | NOT STARTED | route/no-progress/device preview gates open |
| 10 Validation/waivers | PARTIAL | validators exist; maker-checker UI/release gate open |
| 11 Localization workflow | PARTIAL | repository contracts exist; end-to-end workflow open |
| 12 Generation DAG | PARTIAL | stage lifecycle/claim seams pass; provider-to-artifact pipeline open |
| 13 Seal/release/rollback | PARTIAL | additive manifest/loader seams pass; activation/rollback proof open |
| 14 E1 end-to-end | BLOCKED | waits for Phase 02 review/export decision and device delivery |
| 15 Rollout | NOT STARTED | waits for E1 and R0-R5 evidence |

### Repository/release state

- Worktree: `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`; branch `codex/learning-v2-pilot`; HEAD `23c71a1178fee3c1621e35d9a03919b5f80bd47a`.
- Existing large dirty/untracked V2 work remains preserved. This packet changed only this handover plus ignored `.codex-tmp` build/log artifacts; it did not stage, commit, push, modify production, deploy a production function, change Rules, or remove legacy behavior.
- The disposable test function was deployed and then deleted. There is no live V2 progress endpoint in either disposable or production projects.

### Exact next executable task

**Phase 02 review/export gate.** Run a fresh independent spec/security review of the retained callable/store diff and the redacted cloud evidence above. Review `functions/src/learning_v2/progress_event_callable.ts`, `functions/src/learning_v2/firestore_progress_event_store.ts`, their focused tests, `firebase.v2-progress-transport.json`, and the test-only transport entry. Confirm: strict `auth_links/{authUid}` anchor; same-transaction re-read of anchor/live generation/tombstone before replay/write; forged scope rejection; App Check fail-closed outside explicit demo emulator; no client-controlled stable UID/generation; no production `index.ts` export; temporary-cloud cleanup complete. A P0/P1/P2 finding returns to RED. If and only if fresh spec and adversarial reviews PASS, freeze the production export/device packet; do not export or deploy in the review task itself. Independently review Phase 10.1A pure placement policy before any migration/write task.

Startup/verification:

```powershell
Set-Location 'C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot'
git status --short
git branch --show-current
git rev-parse HEAD
git worktree list
Get-Content -Raw -Encoding UTF8 docs/v2/HANDOVER.md
Get-Content -Raw -Encoding UTF8 docs/v2/README.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md
npx jest --runTestsByPath tests/learning_v2_legacy_placement_policy.test.ts --no-cache --runInBand
Push-Location functions
npx jest --config jest.config.js --runTestsByPath src/learning_v2/progress_event_callable.test.ts src/learning_v2/firestore_progress_event_store.integration.test.ts --no-cache --runInBand
Pop-Location
```

No new owner decision is required for this review packet. Stop before production export/deploy, any Firestore write outside emulators, any legacy removal, or any migration write.

## 14.71 - Phase 03 lawful reference-evidence readiness gate (2026-07-18)

### Mission and current owner instruction

Learning V2 remains a modular, server-deliverable 32-episode speaking-first
pilot with separate performance/mastery evidence and purchased access,
Speaking Club as a capstone, Personal Review and dialogs inside the same graph,
immutable Content Studio authoring/release/rollback, language scaling, and
legacy preservation until measured parity plus the explicit Phase 14 owner
decision. This delegated slice was limited to **Phase 03 lawful learning
evidence readiness**: keep capture and approval validation read-only and exact,
without generating, downloading, recording, or otherwise acquiring external
content.

Authority order remains: the current owner instruction; system/developer and
`AGENTS.md`; this handover; `docs/v2/README.md`; normative `docs/v2/00`-`08`;
the two 2026-07-14 implementation plans; then live Git and test evidence.
`orbit-v2`, `competitor-ux-evidence`, `ui-ux-pro-max`,
`emil-design-eng`, `rn-accessibility-audit`, and
`verification-before-completion` were read and applied as advisory/governance
inputs. Project UI Contrast, Performance, accessibility, legal-capture,
legacy-preservation, and API-firewall rules override generic presets.

### What changed and why

- Added `docs/v2/reference-evidence/activity-mode-capture-ledger.json` with the
  exact five selected mode IDs and empty capture arrays. It records
  `capture_required`; no source or observation was fabricated.
- Added `docs/v2/reference-evidence/activity-mode-ui-review.json` with the same
  exact mode set and an empty decision list. Silence is not approval.
- Added `activity-mode-patterns.md` and `phraseman-wireframes.md` as readiness
  indexes. They define the exact six `PreviewState` values, orthogonal
  conditions, shared-shell dependencies, distinctiveness/accessibility
  boundaries, and visibly mark every contact sheet/revision/hash as missing.
- Added pure read-only
  `modules/learning-v2/reference-evidence/reference_evidence_gate.ts`. It
  requires for every mode: Tier-A lawful current capture metadata; an actual
  ignored raw artifact under the bounded `qa-artifacts` root with matching
  SHA-256; at least prompt, active, and feedback/recovery state evidence; an
  original Phraseman contact sheet; current `approved` owner record; at least
  six frames; all six canonical preview states; the complete independent
  condition axes; distinctiveness notes; zero competitor-asset dependencies;
  and exact current sheet hash. Missing capture, sheet, and approval are
  reported independently per mode.
- Replaced the pre-existing untracked phrase-only contract test with a
  structural fail-closed test. The normal guard proves the current pack cannot
  be promoted by prose. Setting
  `PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL=1` activates the exact approval gate.
- Preserved the pre-existing untracked
  `docs/v2/REFERENCE_EVIDENCE_LEDGER.md`; its Tier-B official-source notes
  remain provisional corroboration and do not satisfy Tier-A capture.

Session-owned hashes before this handover append:

| Path | SHA-256 |
|---|---|
| `docs/v2/reference-evidence/activity-mode-capture-ledger.json` | `e49c1a1823c90523c4e3e8456717772017f9bd41c5d3341a99f95c00e7de8082` |
| `docs/v2/reference-evidence/activity-mode-ui-review.json` | `235259786f01942c5e317bb5dc79cd76b23607cc4e76529de51cda91482c2524` |
| `docs/v2/reference-evidence/activity-mode-patterns.md` | `fd9b9575f7de4d5a09ac654608235b6f8f2af4005e81ed8fcf168b215ee14cc6` |
| `docs/v2/reference-evidence/phraseman-wireframes.md` | `e97a362aee822286992011ca6526043dcbf4b41a6a43a8295faadddb48448cd1` |
| `modules/learning-v2/reference-evidence/reference_evidence_gate.ts` | `8fd27d1bd454b12363207eff2160e3b2b7cb2901b5184447007f1f88191145b8` |
| `tests/learning_v2_reference_evidence_contract.test.ts` | `6345eca392884e2a67ccae8c71a95abcd143b29187d1b6743c2126f762096c76` |

### Fresh RED/GREEN and final evidence

Working directory for every command:
`C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`.

- Normal fail-closed guard:
  `npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand`
  -> **1 suite PASS; 3 tests PASS; 1 strict test SKIPPED**.
- Exact current approval gate:
  `$env:PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL='1'; npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand`
  -> **expected FAIL; 1 suite / 4 tests; 3 PASS, 1 FAIL**. The failure contains
  exactly **15 expected blockers**: lawful first-hand capture, original contact
  sheet, and current owner approval for each of five modes. No extra
  schema/mode-set blocker appeared.
- Focused strict TypeScript:
  `npx tsc --noEmit --strict --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck modules/learning-v2/reference-evidence/reference_evidence_gate.ts`
  -> **PASS**.
- Scoped `git diff --check` over the Phase 03 files plus handover -> **PASS**;
  only the existing CRLF conversion warning for this handover was printed.

The first version of the checker stopped after a missing contact sheet and
therefore hid the independent approval blocker. That approach was corrected:
all three blockers are now reported for every mode in one deterministic run.
No test or script wrote source during execution.

### Repository, ownership, and release state

- Worktree:
  `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`.
- Branch: `codex/learning-v2-pilot`.
- HEAD: `23c71a1178fee3c1621e35d9a03919b5f80bd47a`.
- No upstream was resolved by the fresh upstream query; no ahead/behind claim
  is made.
- Fresh `git status --short`: **114 entries** total, **29 tracked modified** and
  **85 untracked**. The large pre-existing dirty V2 worktree was preserved.
  This slice owns only the six Phase 03 files listed above plus this appended
  handover section. `REFERENCE_EVIDENCE_LEDGER.md` and the original untracked
  test path pre-existed; the ledger was preserved and the test was hardened in
  place.
- Nothing was staged or committed. No push, deploy, production callable
  export, Rules change, Firestore write, external capture, image generation,
  OpenAI API use, or legacy change occurred.

### Evidence-based phase status

| Phase | Status | Exact exit gate |
|---|---|---|
| 00 Security boundary | DONE | Prior canonical/emulator deny-allow evidence |
| 01 Domain contracts | DONE | Prior canonical corpus and Functions mirror |
| 02 Progress/access | IN PROGRESS (~85%) | Review/export/device/release gates remain open |
| 03 UI evidence/shells | BLOCKED / readiness hardened (~12%) | Strict gate has 15 expected blockers; no lawful captures, five sheets, or approvals |
| 04 Voice | BLOCKED (~5%) | Waits for Phase 02 and approved Phase 03 evidence |
| 05 P0 activities | PARTIAL (~5%) | Registry/adapters only; production shells/renderers blocked |
| 06 Content delivery | PARTIAL (~10%) | Author-to-device E1 remains open |
| 07 E1 vertical slice | BLOCKED (~5%) | Content/device/release predecessors open |
| 08 P1 and E1-E8 | BLOCKED (~5%) | Waits for E1/chapter gate |
| 09 Speaking Club capstone | BLOCKED (~5%) | Voice/E1/evidence governance open |
| 10 Placement/migration | IN PROGRESS (~10%) | Pure policy exists; independent review/write gates open |
| 11 Full pilot content | BLOCKED (~5%) | No generation before author-to-device gate |
| 12 Telemetry/experiments | NOT STARTED (~5%) | Runtime event surfaces not released |
| 13 Rollout | NOT STARTED (~5%) | Device/accessibility/rollback/R0-R5 evidence open |
| 14 Legacy decision | BLOCKED (~5%) | Parity evidence and explicit owner decision absent |

### Content Studio task status

| Task | Status | Exact gate |
|---|---|---|
| 0 | DONE | Prior security boundary |
| 1 | DONE | Shared canonical contracts/hash corpus |
| 2 | PARTIAL | App-support manifest closure open |
| 3 | PARTIAL | ModeTemplate lifecycle/UI/release integration open |
| 4 | PARTIAL | Episode/season authoring not released E2E |
| 5 | PARTIAL | Final production integration/review open |
| 5A | BLOCKED / readiness hardened | 15 strict blockers; no external evidence acquired |
| 6 | NOT STARTED | Waits for approved 5A and Admin Bible gate |
| 7 | NOT STARTED | Waits for 5A/6 |
| 8 | NOT STARTED | Waits for 5A/6 and authoring closure |
| 9 | NOT STARTED | Preview/device/no-progress gates open |
| 10 | PARTIAL | Validators exist; maker-checker UI/release open |
| 11 | PARTIAL | Localization repositories exist; E2E open |
| 12 | PARTIAL | Generation DAG seams exist; provider/artifact path open |
| 13 | PARTIAL | Manifest/loader seams exist; activation/rollback open |
| 14 | BLOCKED | E1 author-to-device predecessors open |
| 15 | NOT STARTED | Waits for E1 and staged rollout evidence |

### Exact next executable task packet

**Phase 03 Task 3.0 / Content Studio Task 5A — lawful capture ingestion and
approval preparation.** It is next only when the owner supplies or explicitly
authorizes collection of a lawful first-hand capture package. Until then,
stop: do not browse, download, record, generate, infer, or fabricate missing
evidence.

Files to read: this handover, the four mandatory V2 sources,
`docs/v2/04-activity-catalog-and-storyboards.md`,
`docs/v2/08-admin-content-studio-and-mode-authoring.md`, the four canonical
`docs/v2/reference-evidence/*` files, the read-only gate, and its test. Inputs
must stay ignored under
`qa-artifacts/learning-v2/reference-evidence/<product>/<mode>/`.

For each mode, validate product/activity, platform/device/OS, build, locale,
level, subscription/account state, capture date/method, provenance,
rights/use note, researcher, untouched raw hash, redacted derivative, and
state coverage. Then, in a separately authorized design task, create original
Phraseman sheets; run distinctiveness plus accessibility review; show every
sheet to the owner; and record `approved | changes_requested` with exact
revision/hash. Never copy competitor assets/copy/trade dress, infer acoustic
claims, or treat Tier-B marketing material as Tier-A evidence.

RED/acceptance command:

```powershell
$env:PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL='1'
npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand
Remove-Item Env:PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL
```

Expected now: the exact 15 blockers above. Expected after lawful capture,
original design, and explicit owner review: **1 suite / 4 tests PASS**, zero
blockers, hashes current, and no competitor asset dependency. Required fresh
spec/distinctiveness/accessibility review remains open because this session
was not authorized to create or approve UI. Intended future commit subject
after the strict gate and independent reviews pass:
`docs: add approved V2 activity reference evidence`.

Stop/escalate on missing rights metadata, personal data without a lawful
redaction path, version mixing, raw-path escape, hash drift, fewer than six
frames, missing condition coverage, `changes_requested`, owner silence,
competitor trade-dress dependency, or any request to weaken the gate.

### Startup commands

```powershell
Set-Location 'C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot'
git status --short
git branch --show-current
git rev-parse HEAD
git worktree list
Get-Content -Raw -Encoding UTF8 docs/v2/HANDOVER.md
Get-Content -Raw -Encoding UTF8 docs/v2/README.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md
Get-Content -Raw -Encoding UTF8 docs/v2/reference-evidence/activity-mode-capture-ledger.json
Get-Content -Raw -Encoding UTF8 docs/v2/reference-evidence/activity-mode-ui-review.json
npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand
$env:PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL='1'
npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand
Remove-Item Env:PHRASEMAN_REQUIRE_V2_REFERENCE_APPROVAL
```

### Final state declaration

Verified complete in this slice: canonical empty readiness records, exact
five-mode scope, read-only fail-closed validation, independent per-mode
capture/sheet/approval blockers, scoped TypeScript, and whitespace checks.
Partial: Phase 03 Task 3.0 / Task 5A. Unverified and intentionally absent:
lawful Tier-A captures, original Phraseman sheets, device accessibility,
distinctiveness approval, and owner decisions. Push/deploy/release state:
none. The next action belongs to the owner/evidence custodian: provide or
explicitly authorize lawful first-hand inputs; no agent should acquire them
implicitly.

## 15.2 — Phase 10.1B placement provenance owner-decision brief (2026-07-18)

### Mission and user intent

Продолжить Learning V2 как модульный server-deliverable пилот из 32 эпизодов
со speaking-first progression, раздельными performance/access/mastery
сущностями, Speaking Club capstone, Personal Review, dialogs и Content Studio,
с возможностью новых языков и сохранением всех legacy-путей до Phase 14.
Текущий запрос ограничен Phase 10: сохранить уже прошедшую pure policy 10.1A и
подготовить только решение владельца для 10.1B provenance, без persistent
migration writes.

### Выполнено и проверено

- Создан
  `docs/v2/PHASE_10_1B_PLACEMENT_PROVENANCE_OWNER_DECISION.md`.
- Рекомендуемый вариант A: account-scoped reconciled post-restore snapshot,
  completion по валидному `best_score > 0` или `pass_count >= 1`, только
  contiguous L1…LN, ambiguity fail-closed в manual review, минимизированная
  provenance без raw account IDs/ответов.
- Варианты B/C оставлены владельцу; A не считается утверждённым без явного
  ответа.
- Fresh gate:
  `npx jest --runTestsByPath tests/learning_v2_legacy_placement_policy.test.ts --no-cache --runInBand`
  → **1 suite / 4 tests PASS**, snapshots 0, exit 0. Существующее forced-exit/
  open-handle предупреждение не изменило зелёный результат.
- Код 10.1A, fixtures, Rules, Functions, callable exports и production state не
  изменялись. Persistent migration writes не выполнялись.

### Полный статус фаз 00–14

| Phase | Status | Exact gate |
|---|---|---|
| 00 Security boundary | DONE | prior emulator deny/allow and canonical boundary evidence |
| 01 Domain contracts | DONE | canonical contracts + Functions mirror verified |
| 02 Progress/access | IN PROGRESS (~85%) | fresh reviews, production export decision and device/release evidence open |
| 03 UI evidence/shells | BLOCKED (~10%) | lawful captures, contact sheets, distinctiveness and owner approval/hash missing |
| 04 Voice | BLOCKED (~5%) | waits for Phase 02 and approved Phase 03 evidence |
| 05 P0 activities | PARTIAL (~5%) | renderers/shells/evidence integration open |
| 06 Content delivery | PARTIAL (~10%) | author-to-device E1 open |
| 07 E1 slice | BLOCKED (~5%) | waits for delivery and device evidence |
| 08 P1/E1–E8 | BLOCKED (~5%) | waits for E1 release and chapter gate |
| 09 Speaking Club | BLOCKED (~5%) | waits for voice/E1 evidence and governance |
| 10 Placement/migration | IN PROGRESS (~12%) | 10.1A 4/4 PASS; 10.1B brief prepared, owner decision and all write gates open |
| 11 Full pilot content | BLOCKED (~5%) | author-to-device gate not closed |
| 12 Telemetry | NOT STARTED (~5%) | waits for runtime/content event surfaces |
| 13 Rollout | NOT STARTED (~5%) | device, accessibility, rollback and release gates open |
| 14 Legacy decision | BLOCKED (~5%) | parity evidence and explicit owner decision absent |

### Content Studio tasks 0–15

| Task | Status | Gate |
|---|---|---|
| 0 Security boundary | DONE | prior inventory/emulator matrix |
| 1 Shared contracts/hash corpus | DONE | canonical corpus and hashes |
| 2 Capability catalog/manifests | PARTIAL | full app-support closure open |
| 3 ModeTemplate lifecycle/localization | PARTIAL | UI/release integration open |
| 4 Episode/season authoring | PARTIAL | E1 graph not released |
| 5 Guarded callables/roles/storage | PARTIAL | final integration/review open |
| 5A UI evidence | BLOCKED | lawful captures and owner approval/hash missing |
| 6 Admin IA shell | NOT STARTED | approved shell gate open |
| 7 Mode Library UI | NOT STARTED | waits for 5A/6 |
| 8 Episode Builder UI | NOT STARTED | waits for 5A/6 and authoring closure |
| 9 Preview Lab | NOT STARTED | route/no-progress/device gates open |
| 10 Validation/waivers | PARTIAL | maker-checker UI/release gate open |
| 11 Localization workflow | PARTIAL | end-to-end workflow open |
| 12 Generation DAG | PARTIAL | provider-to-artifact pipeline open |
| 13 Seal/release/rollback | PARTIAL | activation/rollback proof open |
| 14 E1 end-to-end | BLOCKED | waits for Phase 02/device delivery |
| 15 Rollout | NOT STARTED | waits for E1 and R0–R5 evidence |

### Repository, preservation and release state

- Worktree:
  `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`.
- Branch `codex/learning-v2-pilot`; HEAD
  `23c71a1178fee3c1621e35d9a03919b5f80bd47a`.
- Большой ранее существовавший dirty/untracked V2 набор сохранён. Эта сессия
  добавила только decision brief и этот append-only handover section.
- Ничего не staged/committed/pushed/deployed/released. Firestore/production/API
  writes отсутствуют. Rules и production callable exports не менялись.

### Exact next executable task

**Owner gate DEC-V2-10.1B-LEGACY-PLACEMENT-PROVENANCE.** Владелец читает brief и
явно утверждает A либо выбирает B/C с перечисленными отклонениями. До ответа не
создавать `legacy_progress_reader.ts`, `placement_session.ts`, provenance
storage, Firestore schema, Rules или callable. После утверждения заморозить
отдельный read-only RED/GREEN packet; persistent migration writes остаются вне
scope. Intended future commit subject после отдельной реализации:
`feat(v2): add guarded legacy placement reader`.

### Startup commands

```powershell
Set-Location 'C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot'
git status --short
git branch --show-current
git rev-parse HEAD
git worktree list
Get-Content -Raw -Encoding UTF8 docs/v2/HANDOVER.md
Get-Content -Raw -Encoding UTF8 docs/v2/README.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md
Get-Content -Raw -Encoding UTF8 docs/v2/PHASE_10_1B_PLACEMENT_PROVENANCE_OWNER_DECISION.md
npx jest --runTestsByPath tests/learning_v2_legacy_placement_policy.test.ts --no-cache --runInBand
```

### Final state declaration

Verified: brief создан, 10.1A 4/4 PASS, migration/production writes отсутствуют.
Partial: 10.1B ожидает owner decision. Unverified: будущий reader/session,
persistent provenance, rehearsal и rollout. Push/deploy/release: отсутствуют.
Exact next action: владелец утверждает A либо выбирает B/C.

## 15.3 — Phase 02 retained cleanup receipt и superseding review status (2026-07-18)

### Миссия и границы текущего пакета

Миссия Learning V2 не меняется: построить модульный server-deliverable
speaking-first пилот из 32 эпизодов с раздельными performance/access/mastery
сущностями, Speaking Club как capstone, Personal Review и dialogs в едином
графе, безопасным Content Studio authoring/release/rollback, масштабированием
на новые языки и сохранением всех legacy-путей до измеренного паритета и
явного решения владельца в Phase 14. Этот пакет только сохраняет
структурированную redacted-аттестацию уже выполненной проверки disposable
App Check и согласует более свежие Phase 02 review/verification факты. Он не
запрашивает provider заново и не разрешает production export/deploy.

Authority order остаётся прежним: текущая инструкция владельца;
system/developer и `AGENTS.md`; этот append-only handover; `docs/v2/README.md`;
normative `docs/v2/00`–`08`; два implementation plan от 2026-07-14; затем
живые Git/test evidence. Эта секция supersede-ит только устаревший review
status Phase 02 в §14.70 и §15.2; исторические записи не переписаны.

### Что изменено

- Добавлен retained receipt
  `docs/v2/evidence/phase-02/2026-07-18-disposable-app-check-cleanup-receipt.v1.json`.
  SHA-256:
  `ab912ecc92e31c58bc30523e37bf51137833b5e6a7279602c511be589d630090`.
- Receipt использует только факты §14.70: disposable project
  `phraseman-v2-ac-test-20260718` / `769668545998`, `us-central1`,
  `v2ProgressTransport`, outcomes `401/401/400`, завершённый cleanup
  `0/0/0/false` и one-day artifact policy.
- `evidenceBasis` равен
  `retained_sanitized_handover_attestation`;
  `freshProviderQueryPerformed=false`. Точное время cleanup не сохранено в
  §14.70, поэтому receipt честно хранит `attestedOn=2026-07-18` и
  `timePrecision=day`, не выдумывая timestamp.
- Production boundary полностью отрицательная:
  `projectTouched=false`, `functionDeployed=false`,
  `firestoreWritten=false`, `rulesChanged=false`,
  `indexesChanged=false`, `callableExported=false`.
- Receipt не содержит JWT, App Check debug secret, API key, authorization
  header, Firebase Auth UID, email, billing details, DPAPI ciphertext или raw
  command output. Категории перечислены только как явно omitted.
- Добавлен read-only guard
  `tests/learning_v2_phase02_disposable_cleanup_receipt.test.ts`, SHA-256:
  `16797196bcd184d10271e215b5429990c5c4ef77c2fabb8624be6dabf19bb24a`.

### RED/GREEN и свежие review/verification факты

- RED:
  `npx jest --runTestsByPath tests/learning_v2_phase02_disposable_cleanup_receipt.test.ts --no-cache --runInBand`
  → **1 suite FAIL / 5 tests FAIL**, ожидаемая причина для всех пяти:
  `ENOENT` до создания receipt.
- GREEN: та же команда → **1 suite / 5 tests PASS**, snapshots 0, exit 0.
- Fresh deploy-guard rerun:
  `npx jest --runTestsByPath tests/learning_v2_progress_transport_deploy_guard.test.ts --no-cache --runInBand`
  → **1 suite / 15 tests PASS**, snapshots 0, exit 0. Guard отклоняет
  отсутствие explicit project, production/default project, aliases,
  prefix/suffix/demo targets и caller overrides; harness остаётся вне
  production `functions/src/index.ts`.
- Более свежий retained spec-review packet подтверждён **PASS**:
  `functions/.codex-tmp/fresh-spec-review-phase02-unit-20260718.log` →
  **3 suites / 45 tests PASS**.
- Более свежий independent verifier summary подтверждён **PASS**:
  `functions/.codex-tmp/t1v-fresh-phase02-status.txt` → unit
  **6 suites / 96 tests**, progress emulator **1/2**, delayed emulator
  **1/1**, transport targeted TypeScript exit 0, path identity **1/2**,
  deletion identity **3/18**, production static path scan PASS.
- Источники выше являются retained sanitized/local summaries. В этом пакете
  не выполнялись cloud query, deploy, Firestore write, Auth mutation,
  billing/API operation или secret recovery.

### Полный статус фаз 00–14

| Phase | Status | Exact gate |
|---|---|---|
| 00 Security boundary | DONE | prior emulator deny/allow and canonical boundary evidence |
| 01 Domain contracts | DONE | canonical contracts + Functions mirror verified |
| 02 Progress/access | IN PROGRESS (~88%) | fresh verifier/spec and deploy guard PASS; retained cleanup receipt PASS; fresh adversarial/export decision, production export, device and release evidence remain open |
| 03 UI evidence/shells | BLOCKED (~10%) | lawful captures, contact sheets, distinctiveness and owner approval/hash missing |
| 04 Voice | BLOCKED (~5%) | waits for Phase 02 and approved Phase 03 evidence |
| 05 P0 activities | PARTIAL (~5%) | renderers/shells/evidence integration open |
| 06 Content delivery | PARTIAL (~10%) | author-to-device E1 open |
| 07 E1 slice | BLOCKED (~5%) | waits for delivery and device evidence |
| 08 P1/E1–E8 | BLOCKED (~5%) | waits for E1 release and chapter gate |
| 09 Speaking Club | BLOCKED (~5%) | waits for voice/E1 evidence and governance |
| 10 Placement/migration | IN PROGRESS (~12%) | 10.1A 4/4 PASS; 10.1B owner decision and all write gates open |
| 11 Full pilot content | BLOCKED (~5%) | author-to-device gate not closed |
| 12 Telemetry | NOT STARTED (~5%) | waits for runtime/content event surfaces |
| 13 Rollout | NOT STARTED (~5%) | device, accessibility, rollback and release gates open |
| 14 Legacy decision | BLOCKED (~5%) | parity evidence and explicit owner decision absent; legacy preserved |

### Content Studio tasks 0–15

| Task | Status | Gate |
|---|---|---|
| 0 Security boundary | DONE | prior inventory/emulator matrix |
| 1 Shared contracts/hash corpus | DONE | canonical corpus and hashes |
| 2 Capability catalog/manifests | PARTIAL | full app-support closure open |
| 3 ModeTemplate lifecycle/localization | PARTIAL | UI/release integration open |
| 4 Episode/season authoring | PARTIAL | E1 graph not released |
| 5 Guarded callables/roles/storage | PARTIAL | final integration/adversarial/export review open |
| 5A UI evidence | BLOCKED | lawful captures and owner approval/hash missing |
| 6 Admin IA shell | NOT STARTED | approved shell gate open |
| 7 Mode Library UI | NOT STARTED | waits for 5A/6 |
| 8 Episode Builder UI | NOT STARTED | waits for 5A/6 and authoring closure |
| 9 Preview Lab | NOT STARTED | route/no-progress/device gates open |
| 10 Validation/waivers | PARTIAL | maker-checker UI/release gate open |
| 11 Localization workflow | PARTIAL | end-to-end workflow open |
| 12 Generation DAG | PARTIAL | provider-to-artifact pipeline open |
| 13 Seal/release/rollback | PARTIAL | activation/rollback proof open |
| 14 E1 end-to-end | BLOCKED | waits for Phase 02/device delivery |
| 15 Rollout | NOT STARTED | waits for E1 and R0–R5 evidence |

### Repository, preservation и release state

- Worktree:
  `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`; branch
  `codex/learning-v2-pilot`; HEAD
  `23c71a1178fee3c1621e35d9a03919b5f80bd47a`.
- Большой ранее существовавший dirty/untracked V2 набор сохранён. Этот
  bounded packet владеет только receipt, его focused test и этой append-only
  секцией HANDOVER. Rules, indexes, `functions/src/index.ts`, Firebase config
  и остальные source/test paths не редактировались этим packet.
- Ничего не staged/committed/pushed/deployed/released. Ни disposable, ни
  production callable сейчас не экспортирован и не оставлен live. Production
  Firestore/Auth/config state не изменялся.

### Exact next executable task

**Phase 02 fresh adversarial/export-decision gate (read-only first).**
Fresh independent critical reviewer читает:

- `functions/src/learning_v2/progress_event_callable.ts`;
- `functions/src/learning_v2/firestore_progress_event_store.ts`;
- их focused unit/integration/emulator tests;
- `scripts/deploy_v2_progress_transport.mjs`;
- `firebase.v2-progress-transport.json`;
- test-only transport entry;
- новый retained cleanup receipt и его guard.

Reviewer обязан отдельно подтвердить strict `auth_links/{authUid}` anchor,
same-transaction re-read anchor/live generation/tombstone, forged-scope
rejection, App Check fail-closed behavior, отсутствие client-controlled
stable UID/generation, отсутствие production export и непротиворечивость
retained cleanup evidence. Любой P0/P1/P2 возвращает packet в RED. Только
после fresh adversarial PASS можно заморозить отдельный production
export/device task packet с собственным RED, explicit owner authorization на
любой deploy и rollback plan. В следующем read-only review нельзя менять
`functions/src/index.ts`, Rules/indexes/Firebase config, писать Firestore,
deploy-ить, push-ить или считать Phase 02 завершённой.

Startup:

```powershell
Set-Location 'C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot'
git status --short
git branch --show-current
git rev-parse HEAD
Get-Content -Raw -Encoding UTF8 docs/v2/HANDOVER.md
Get-Content -Raw -Encoding UTF8 docs/v2/README.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md
Get-Content -Raw -Encoding UTF8 docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md
Get-Content -Raw -Encoding UTF8 docs/v2/evidence/phase-02/2026-07-18-disposable-app-check-cleanup-receipt.v1.json
npx jest --runTestsByPath tests/learning_v2_phase02_disposable_cleanup_receipt.test.ts tests/learning_v2_progress_transport_deploy_guard.test.ts --no-cache --runInBand
```

### Final state declaration

Verified в этом packet: retained redacted receipt, точный allowlisted schema,
TDD RED→GREEN, receipt secret-value guard и fresh deploy guard. Подтверждены
более свежие retained spec/verifier PASS summaries. Partial: Phase 02; fresh
adversarial/export decision, production export, device/release evidence
остаются открыты. Push/deploy/release: отсутствуют.

### Находки и предложения

- Точное cleanup-время не было сохранено в §14.70; дневная точность явно
  записана и не должна молча повышаться до timestamp.
- После adversarial PASS стоит сделать receipt обязательным input будущего
  production export gate, но не превращать retained attestation в fresh cloud
  evidence.
## 15.4 — Per-mode readiness для Reference Evidence Pack (2026-07-18, superseding)

### Миссия, авторитет и границы

Миссия Learning V2 остаётся прежней: построить модульный, server-deliverable speaking-first
пилот из 32 эпизодов с безопасным Content Studio и без удаления legacy-путей до явного решения
владельца. Этот узкий пакет добавляет только диагностическую готовность каждого из пяти выбранных
режимов в Reference Evidence Pack; он не является одобрением evidence, UI, release или Phase 03.

Приоритет источников: текущая инструкция владельца; system/developer и `AGENTS.md`; этот
append-only handover; `docs/v2/README.md`; нормативные `docs/v2/00`–`08`; планы Pilot Season и
Content Studio от 2026-07-14; затем проверяемые Git/test evidence. Эта секция supersede-ит только
статус готовности gate для Task 3.0/5A, не переписывая историю.

### Изменение и доказательства

- Три изменённых пути этого пакета: ранее untracked
  `modules/learning-v2/reference-evidence/reference_evidence_gate.ts` (тип и fail-closed
  per-mode readiness), ранее untracked
  `tests/learning_v2_reference_evidence_contract.test.ts` (temp-root RED/GREEN contracts) и
  этот append-only раздел `docs/v2/HANDOVER.md` (воспроизводимая передача статуса/границ).
- Baseline SHA-256 до редактирования: gate
  `8FD27D1BD454B12363207EFF2160E3B2B7CB2901B5184447007F1F88191145B8`; contract
  `6345ECA392884E2A67CCAE8C71A95ABCD143B29187D1B6743C2126F762096C76`.
- Добавлены `ReferenceEvidenceModeResult` и `modeResults`, строго ключевые по пяти exact selected
  IDs. Aggregate `ready`, плоский `blockers`, их строки и порядок сохранены; aggregate остаётся
  fail-closed.
- RED: `npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand`
  завершился exit 1 с шестью TS2339: `modeResults` отсутствовал; до запуска тестов не было source
  реализации. Отдельный RED P1 воспроизвёл лишний режим в общем ledger: aggregate был blocked,
  но все five modeResults ошибочно были ready.
- P1 review repair: общий structural blocker (отсутствующий/некорректный shared JSON либо mismatch
  selected tuple) теперь suppress-ит readiness всех пяти, не добавляя/не переставляя flat blocker
  codes и не приписывая shared blocker локальному массиву режима.
- Финальный GREEN той же focused Jest-команды: 1 suite, 9 PASS, 1 intentional strict-evidence skip,
  0 failed. Jest скомпилировал оба TypeScript файла; scoped trailing-whitespace check прошёл.
- Реальный текущий pack по-прежнему ожидаемо blocked: 15 mode-local blockers (по три для каждого
  режима: lawful first-hand capture, contact sheet и current owner approval). Нет captures,
  contact sheets, approvals, hash-verified owner decision или runtime/Admin consumer.

### Статус фаз и задач

| Область | Статус | Точный gate |
|---|---|---|
| Phase 03 UI evidence/shells | BLOCKED (~10%) | per-mode диагностика готова; lawful evidence и approval отсутствуют |
| Phase 05 P0 activities | PARTIAL (~5%) | renderers/shell/evidence integration открыты |
| Content Studio Task 5A | BLOCKED | каждый mode блокируется своими тремя evidence/approval условиями; release-ready aggregate false |
| Pilot Task 3.0 | PARTIAL / gate implemented | dependency может читаться per-mode, но UI нельзя начинать без ready конкретного mode |

### Состояние worktree и точный следующий шаг

Worktree `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`, branch
`codex/learning-v2-pilot`, HEAD `23c71a1178fee3c1621e35d9a03919b5f80bd47a`. Весь существующий
dirty/untracked набор сохранён. Ничего не staged/committed/pushed/deployed/released/exported; нет
Firestore, Rules/indexes, production, API или runtime consumer изменений.

Следующая исполнимая задача начинается с owner/evidence-custodian gate: он явно выбирает и
авторизует ровно один ID из `sound-discrimination`, `guided-phrase-pronunciation`,
`prompted-translation-by-voice`, `contextual-dialogue-mission`, `speaking-club-mission`. Только после
этого для выбранного ID выполнить **Task 5A, Step 1–4**, без UI реализации: собрать lawful first-hand
capture ledger и raw ignored inputs; подготовить оригинальные 3–6+ frame contact sheet,
`phraseman-wireframes.md` и distinctiveness matrix; показать их владельцу и записать current
`approved | changes_requested` с revision/hash. Acceptance: у выбранного ID есть traceable lawful
capture, sheet, все шесть PreviewState и требуемые conditions, а решение current и hash-свежее.
Expected output после `approved`: только `modeResults[выбранный ID].ready === true`; остальные четыре
и aggregate `ready` остаются false, пока не закрыты их собственные evidence. Затем выполнить
`npx jest --runTestsByPath tests/learning_v2_reference_evidence_contract.test.ts --no-cache --runInBand`.
Никаких captures, approval, Rules/indexes, production/export/deploy/push без отдельной авторизации.

### Находки и предложения

- Shared structural errors намеренно делают все per-mode readiness false даже при пустых локальных
  blockers: причина видна в aggregate flat blockers, а локальные списки сохраняют обратную совместимость.
- Нужен явный владелец для first-hand evidence и review; молчание или Markdown-заявление не являются
  approval.

## 15.5 — Owner decision: complete but replaceable Codex frontend (2026-07-18)

### Решение владельца

Владелец уточнил архитектурную границу Learning V2: Codex реализует не только
headless core, но и полный рабочий React Native/Admin frontend. Этот frontend
не является заглушкой и должен проходить функциональные, accessibility,
performance, offline/recovery и device-preview gates. Позже Kimi может
полностью переработать presentation-слой, но не имеет права менять learning
contracts, runtime state machines, scoring/evidence/progress/access,
persistence/outbox, voice/permission lifecycle, analytics semantics,
PreviewEnvelope, release loader или backend behavior ради визуального
редизайна.

В visual companion владелец выбрал первым mode
`sound-discrimination`. Это не считается approval отсутствующего contact sheet:
lawful first-hand capture, оригинальный Phraseman contact sheet,
distinctiveness/accessibility review и current hash-bound owner approval
остаются обязательным Task 3.0/5A gate.

### Новый нормативный дизайн

Создан
`docs/superpowers/specs/2026-07-18-learning-v2-replaceable-frontend-design.md`.
Документ фиксирует:

- React-free stable core;
- frozen typed UI port `immutable ViewModel + typed command dispatch`;
- отдельный replaceable React Native/Admin presentation layer;
- обязательное удаление `resolveRenderer(): unknown` из core registry и
  перенос lazy component resolution в UI-owned registry;
- thin stable routes без graph/gate/progress logic;
- полный quality contract для Codex baseline UI и будущего Kimi redesign;
- machine-readable per-mode Kimi handoff packet;
- behavioral/accessibility parity вместо pixel equality;
- первый вертикальный порядок для `sound-discrimination`.

Generic `ui-ux-pro-max` recommendations не являются источником истины:
brand, approved reference evidence, UI Contrast Rule, Performance Bible и
accessibility contracts имеют приоритет.

### Статус и ограничения

- Phase 03 остаётся `BLOCKED / readiness hardened`: 15 lawful
  capture/contact-sheet/approval blockers ещё открыты.
- Phase 05 остаётся `PARTIAL`: baseline renderer и shells ещё не реализованы.
- Ни один mode пока нельзя открыть вручную в приложении.
- Dev/Mode Lab отложен до появления хотя бы одного настоящего renderer.
- Production export/deploy/release, Rules/index changes, push и legacy removal
  не выполнялись.
- Большой существующий dirty/untracked V2 worktree сохранён.

### Точный следующий gate

Перед implementation plan владелец проверяет и утверждает дизайн-документ
`docs/superpowers/specs/2026-07-18-learning-v2-replaceable-frontend-design.md`.
После approval создать отдельный executable plan для первого вертикального
среза:

1. Task 5A evidence/approval для `sound-discrimination`;
2. React-free UI port и import-boundary RED tests;
3. renderer-registry decoupling;
4. headless presenter/controller + canonical fixtures;
5. полноценный Codex Choice/Voice UI на frozen port;
6. PreviewEnvelope no-progress integration;
7. spec/accessibility/quality/device reviews;
8. Kimi handoff packet.

До утверждения документа не начинать frontend implementation. Если owner
меняет границу Kimi/Codex, сначала обновить дизайн и этот handover.

### Находки и предложения

- `components/LessonsV2TabContent.tsx` остаётся hardcoded dev prototype и не
  считается V2 runtime/frontend foundation.
- `activity_registry.ts` с `resolveRenderer(): unknown` — первый технический
  долг, который нужно закрыть до shared-shell fan-out.

## 15.6 — Multilingual writing systems and Kimi K3 handoff (2026-07-19)

### Owner intent and decision

The owner approved a universal multilingual architecture rather than ordinary
translation-only support. Learning V2, Admin V2 generation and app presentation
must support complex writing systems from the beginning. Chinese and Japanese
are the first complete special packs. Korean, Arabic, Hebrew, Devanagari, Thai,
Greek and Cyrillic profiles prove expansion without rewriting the core.

This is documentation/planning authority only. The owner explicitly requested
no implementation in this step.

### New normative documents

- `docs/superpowers/specs/2026-07-19-learning-v2-multilingual-writing-systems-design.md`
  defines language pairs, ScriptProfile, Script Curriculum, special modes,
  Chinese/Japanese scope, expansion fixtures, Admin generation and gates.
- `docs/superpowers/plans/2026-07-19-learning-v2-multilingual-writing-systems.md`
  defines the non-executable workstream and dependency order.
- `docs/v2/frontend-handoff/kimi-k3/README.md`
- `docs/v2/frontend-handoff/kimi-k3/KIMI_K3_MASTER_BRIEF.md`
- `docs/v2/frontend-handoff/kimi-k3/KIMI_K3_PROMPTS.md`
- `docs/v2/frontend-handoff/kimi-k3/KIMI_K3_DELIVERY_CONTRACT.md`
  form the zero-context Kimi visual/frontend package.

The pilot, Content Studio and replaceable-frontend documents contain
cross-references to this decision.

### Kimi/Codex boundary

Kimi K3 is selected for native-vision frontend work, browser mockups, motion,
responsive layouts and visual QA. It returns an isolated runnable prototype,
manifest, exact files/hashes, screenshots, contact sheets, videos and Codex
import map. Kimi may not own learning contracts, evidence/scoring, progress,
access, persistence, Firebase/Functions, security or release.

### Preserved state

- No app/Admin/Functions/test source was implemented for this decision.
- No OpenAI or Kimi API was called.
- No production, deploy, push, Rules/index or legacy mutation occurred.
- Existing dirty/untracked worktrees remain preserved.
- The previously interrupted ORBIT child sessions remain stopped.

### Exact next executable documentation gate

The owner gives the files under `docs/v2/frontend-handoff/kimi-k3/` and the
required design inputs to Kimi K3. Kimi runs Prompts 0–5 sequentially and
returns the delivery root required by `KIMI_K3_DELIVERY_CONTRACT.md`.

Codex then performs a read-only intake:

1. verify manifest/file SHA coverage;
2. run the local browser preview;
3. inspect every contact sheet/video;
4. audit prohibited imports/writes and business logic;
5. map accepted presentation files to frozen ports;
6. create a separate owner-approved implementation packet before importing.

No Phraseman source implementation begins from this handover alone.

### Находки и предложения

- Current localization contracts are useful but insufficient for complex
  writing systems; Script Curriculum must be a separate typed subsystem.
- The Kimi package should be used in a fresh K3 session with native vision and
  browser preview enabled.

### One-file Kimi handoff update

The canonical owner-facing handoff is now
`docs/v2/frontend-handoff/KIMI_K3_COMPLETE_HANDOFF.md`. It embeds the complete
brief, execution phases, browser-preview requirements, QA gates and delivery
contract. The owner only needs to give Kimi this single document. The split
files under `docs/v2/frontend-handoff/kimi-k3/` remain supporting records and
are not required for the handoff.

## 15.7 — Content generator and optional-practice owner decision (2026-07-22)

### Mission

The owner approved a simple Admin generation experience backed by a strict
multilingual compiler and review pipeline. The product shape remains 32
communicative units, twelve required micro-sessions per unit and up to two
adaptive sessions. Content is generated language-natively from a certified
LanguageProfile and `can do` graph, not by translating one English phrase list
or generating twelve unrelated session batches.

### New authority

`docs/superpowers/specs/2026-07-22-learning-v2-content-generation-and-optional-practice-design.md`
records the approved product direction:

- eight reusable UI engines and fourteen pedagogic modes;
- structured phrase/content objects compiled into sequenced sessions;
- language-profile, independent-QA, exception-review and immutable-release gates;
- scoped generation E1 -> E1–E8 -> E1–E32 rather than one unchecked batch;
- dedicated Script Curriculum packs for Chinese, Japanese, Korean, RTL and
  future writing systems;
- one or two dynamic optional practice nodes per unit, initially Quick Speak,
  Echo & Rhythm and Listen & Respond;
- unlimited optional star earning with deterministic diminishing rewards for
  repeating the same easy material;
- strict separation of economy stars, access and learning mastery.

### Completed / partial / not started

| Item | Status | Evidence / closing step |
|---|---|---|
| Owner product direction | complete | Owner explicitly approved the generator vision and no-hard-cap reward decision on 2026-07-22. |
| Normative design record | complete | New specification above. |
| Exact reward/decay numbers | not started | Must be pinned as pilot hypotheses with tests and telemetry. |
| Admin/runtime implementation | not started | Requires a separate approved implementation plan. |
| Kimi V5 intake | partial | External prototype remains under read-only monitoring; do not import until its final package stabilises and passes intake. |

### Preserved state

- This decision changes documentation only.
- No app, Admin, Functions, Rules, indexes, content or tests were changed.
- No API generation, deploy, push or production action occurred.
- Existing dirty worktrees and the external Kimi working folder remain untouched.

### Exact next executable task

After the owner reviews this written specification, create a TDD implementation
plan that reconciles it with the existing pilot-season, Content Studio and
multilingual writing-system plans. The first implementation packet must remain
E1-only and define the typed LanguageProfile/content-item/session-compiler
contracts plus deterministic validation and reward/mastery separation before
any bulk content generation or UI import.

Acceptance criteria for the planning task:

1. no duplicate curriculum or release authority;
2. exact dependency order and one-writer file ownership;
3. E1 -> E1–E8 -> E1–E32 gates remain intact;
4. optional practice cannot block progress or mint mastery;
5. reward decay values remain explicit hypotheses until approved;
6. Kimi presentation intake is a separate reviewed packet.

### Находки и предложения

- The one-button Admin experience is an orchestration UI, not permission to
  remove quality gates.
- A small native-review certification step per new language is still required;
  AI disagreement checks reduce its scope but cannot honestly replace it.
- Map extensibility should use generic optional slots and a capability registry,
  not hard-coded one-off nodes.

## 15.8 — Owner cardinality decision: 32 units × 12 sessions (2026-07-22)

The owner explicitly confirmed that Learning V2 is a several-week full course,
not a short 32-session path. The approved target is 32 units with twelve
required micro-sessions per unit, each normally 7–9 cards and 2.5–4 minutes.
The expected core cadence is 3–5 sessions per day over approximately 12–16
weeks, with optional speech practice remaining available beyond the core path.

### Contract consequence

The current canonical `v2-episode-contract.v1` E1 is approximately 12 minutes
with 10 activities, 9 graph nodes and 8 performance-star slots. It cannot be
silently treated as the approved twelve-session unit. Preserve v1 as a readable
legacy/internal artifact and introduce an explicit v2 Episode/unit contract
that pins a versioned child SessionSet containing exactly twelve required
sessions. Existing 32 Episode identities remain stable internal unit identities;
the season cardinality remains 32 rather than expanding to 384 Episode records.

Farmable optional-practice stars may add to cumulative access under a versioned
diminishing-reward policy, but must not update best performance slots, satisfy
the local performance minimum, write checkpoint evidence or mint mastery.

### Plan and exact next task

`docs/superpowers/plans/2026-07-22-learning-v2-e1-content-compiler.md`
is the implementation plan. Its first writer packet is the cross-contract
SessionSet/Episode-v2 migration, followed by star-source separation, language
profile/content contracts, the twelve-session compiler and E1-only QA proof.

No implementation, Admin UI, Kimi import, Rules/index change, deployment or
production action has been authorised by this documentation update alone.

### Находки и предложения

- Keep one stable 32-unit map; do not expose 384 top-level nodes.
- Unit progress should summarise twelve child sessions while optional practice
  remains visually secondary and non-blocking.
- The legacy E1 fixture is regression evidence, not the new product target.

## 15.9 — Task 0 complete: versioned twelve-session unit contract (2026-07-22)

### Mission

Learning V2 remains a server-deliverable 32-unit course. Each stable unit identity
now has an explicit v2 contract that points to a versioned child SessionSet with
exactly twelve required micro-sessions. The legacy Episode-v1 artifact remains
readable and unchanged. Optional practice stays outside required progression and
cannot write performance or mastery. The next packet separates farmable access
stars before language-profile, multilingual content, compiler, QA, Admin or UI
work begins.

### Owner intent and normative precedence

- Owner-approved course shape: 32 units x 12 required sessions, normally 7-9
  cards and 150-240 seconds per session, three zones of four sessions, normally
  3-5 sessions per day over approximately 12-16 weeks.
- Optional practice may remain repeatable and may later mint diminishing access
  stars, but it is never required for progress and never proves mastery.
- Normative order for this packet:
  1. `AGENTS.md` and this living handover;
  2. `docs/v2/README.md`;
  3. the two 2026-07-14 V2 plans;
  4. `docs/superpowers/specs/2026-07-22-learning-v2-content-generation-and-optional-practice-design.md`;
  5. `docs/superpowers/plans/2026-07-22-learning-v2-e1-content-compiler.md`.

### Git and workspace receipt

- Worktree: `C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot`
- Branch: `prod-snapshot/learning-v2-pilot-20260721`
- Task start HEAD: `e47a3ea815a3fa8fcecb1ebaa87ce29a96bd1a97`
- Task 0 implementation commit:
  `cd95d4336ba7c68ad00d224bd3f50157640e8f5e`
  (`feat: version V2 units with twelve sessions`)
- Upstream: none configured.
- Main checkout `C:\appsprojects\phraseman` was already dirty (213 paths were
  observed during the boundary audit). It was not edited, cleaned, staged or
  used for this packet.
- Push, deploy, release, Rules/index changes, Admin changes, production writes,
  OpenAI API use and Kimi-package mutation: none.

### Files in the atomic Task 0 commit

| File | Purpose |
|---|---|
| `modules/learning-v2/contracts/session.ts` | New exact `v2-session-set.v1` body, required sessions/cards/zones, optional slots, canonical hostile-input boundary and duplicate guards. |
| `modules/learning-v2/contracts/identities.ts` | Branded `SessionId` parsing and identity validation. |
| `modules/learning-v2/contracts/episode.ts` | Explicit Episode-v1/Episode-v2 union and exact `sessionSetRef`; v1 remains readable. |
| `modules/learning-v2/contracts/validation.ts` | Standalone/package v1-v2 dispatch, v2 30-48 minute aggregate, deterministic issue ordering and fail-closed canonical validation. |
| `tests/support/learning_v2_session_builders.ts` | Frozen legacy/v2/SessionSet builders; v2 ref uses the real canonical SessionSet body hash. |
| `tests/learning_v2_session_contract.test.ts` | Twelve-session cardinality, zones, duration, cards, families, optional separation, uniqueness and hostile-input tests. |
| `tests/learning_v2_episode_contract.test.ts` | Legacy regression, v2 ref/duration/package parity, malformed-container and hostile-priority tests. |

The legacy fixture `tests/fixtures/learning-v2/episode-01.valid.json` remained
byte-identical to HEAD (`git blob 47c4d68404eb013bc022ff57c97bc1cc9c0f3efb`).

### RED, repair and GREEN evidence

1. Baseline before Task 0: 3 suites, 330/330 tests PASS.
2. Initial RED: session + episode suites failed to compile (2 suites failed,
   0 tests) because SessionSet, SessionId and Episode-v2 did not exist.
3. The first GREEN exposed a package/standalone gap: valid Episode-v2 was
   accepted standalone but rejected by the authoritative package path.
4. Fresh reviews then closed these concrete failures without widening scope:
   canonical SessionSet hostile-input handling; required-container preflight;
   package-v1/v2 diagnostic parity; global card/optional-slot/capability
   uniqueness; canonical SessionSet ref hash; missing/undefined/accessor/proxy
   priority; and compound-invalid issue ordering.
5. One proposed package-v1 `phraseFrames:null` defect was disproved rather than
   patched: the exact two-case package regression passed because
   `validatePackageShape` already returned `field_type_invalid` at the exact
   path.
6. Final deterministic gate:

```powershell
npx jest --runTestsByPath tests/learning_v2_identity_contract.test.ts tests/learning_v2_session_contract.test.ts tests/learning_v2_episode_contract.test.ts tests/learning_v2_attempt_cardinality.test.ts tests/learning_v2_evidence_contract.test.ts --no-cache --runInBand
```

Result: 5/5 suites, 426/426 tests PASS, 0 snapshots. Episode suite: 358/358
PASS. Hostile/compound focused gates PASS. Prettier on the exact seven files
PASS. `git diff --check` PASS. Final fresh spec review: P0/P1/P2 = 0/0/0.
Final fresh adversarial review: P0/P1/P2 = 0/0/0. No hash race was observed.
Jest still prints the pre-existing force-exit/open-handles advisory; it is not a
test failure and no source change was made for it.

### Current phase status (00-14)

| Phase | Status after Task 0 | Remaining gate |
|---|---|---|
| 00 Security boundary | Complete for the recorded packet | Preserve existing time-bounded audit/release evidence. |
| 01 Domain contracts | Partial: original contracts complete; twelve-session Task 0 complete | Task 0A, then compiler Tasks 1-8. |
| 02 Progress and access | Partial | Separate optional-practice access stars from performance/mastery. |
| 03 UI reference and shells | Blocked/partial | Owner-approved lawful captures and later app-map packet. |
| 04 Voice platform | Partial | Device/privacy/acoustic evidence remains open. |
| 05 Activity families | Partial | Do not implement more UI modes in this compiler packet. |
| 06 Content delivery | Partial | Language profile, content items, compiler, Functions adapter and QA. |
| 07 E1 vertical slice | Blocked | Requires Tasks 0A-8 plus device/accessibility evidence. |
| 08 P1/E1-E8 | Not started | Depends on E1 vertical slice. |
| 09 Speaking Club | Not started | Depends on frozen graph/content contracts. |
| 10 Placement/migration | Blocked on owner provenance decision | No migration in this packet. |
| 11 Full pilot | Not started | Validator and E1 artifacts still absent until Tasks 1-8. |
| 12 Telemetry/experiments | Not started | Later privacy-conscious packet. |
| 13 Rollout | Not started | No deploy/release action authorised. |
| 14 Legacy decision | Not started | Legacy remains intact until explicit owner decision. |

### E1 content-compiler task table

| Task | Status | Exact outcome/gate |
|---|---|---|
| 0 Versioned unit-to-session migration | COMPLETE | Commit `cd95d4336`; 426/426; spec and red-team PASS. |
| 0A Star-source separation | NEXT / NOT STARTED | Optional practice adds cumulative access only. |
| 1 Immutable LanguageProfile | Not started | Requires Task 0A. |
| 2 Structured language-native content items | Not started | Requires LanguageProfile. |
| 3 Deterministic twelve-session compiler | Not started | Requires Tasks 1-2. |
| 4 Generic optional-practice slots | Not started | No UI coupling. |
| 5 Diminishing unlimited rewards | Not started | Versioned, no hard cap, no mastery output. |
| 6 Content Factory language-profile prerequisite | Not started | No fourteenth stage kind. |
| 7 Functions adapter and blocking E1 QA | Not started | This is where exact SessionSet ref-to-body/hash resolution closes. |
| 8 E1 source fixture and vertical-slice proof | Not started | Preserve legacy E1 fixture. |

### Product, security, privacy and accessibility invariants

- The twelve required sessions are exactly ordinals 1-12: four `understand`,
  four `use`, four `master`; each is 150-240 seconds, 7-9 cards and 3-4
  distinct registered activity families.
- Optional slots are outside the twelve, at most two, globally unambiguous,
  `requiredForProgress:false` and `canWriteMastery:false`.
- Episode-v1 retains its original contract and legacy policy. Episode-v2 uses
  aggregate 30-48 minutes and an exact lowercase SHA-256 SessionSet ref.
- This packet validates the ref and its test-builder hash. Runtime
  `sessionSetRef -> body` lookup and body-hash resolution are deliberately not
  claimed; Task 7 must close them fail-closed.
- Hostile getters, proxies, symbols, non-enumerable keys, cycles, exotic
  prototypes and other non-canonical inputs fail closed without invoking code.
- Purchased/farmed access never proves performance, checkpoint evidence or
  mastery. Task 0A makes the source separation explicit.
- No production export, contact-sheet waiver, Admin bypass, Rules/index change,
  deployment, push or legacy deletion occurred.

### Exact next executable task: Task 0A

Files:

- modify `modules/learning-v2/contracts/stars.ts`;
- modify `tests/learning_v2_gate_policy.test.ts`;
- create `tests/learning_v2_star_source_separation.test.ts`.

RED:

```powershell
npx jest --runTestsByPath tests/learning_v2_star_source_separation.test.ts tests/learning_v2_gate_policy.test.ts --no-cache --runInBand
```

Expected RED: source-labelled access projection does not exist and optional
practice separation is not yet proven.

GREEN:

```powershell
npx jest --runTestsByPath tests/learning_v2_star_source_separation.test.ts tests/learning_v2_gate_policy.test.ts tests/learning_v2_learning_evidence_policy.test.ts --no-cache --runInBand
```

Acceptance criteria:

- exact source labels: `performance`, `optional_practice`, `purchase`;
- only `performance` may update best-by-slot performance;
- optional practice may add idempotent cumulative access but exposes neither
  `performanceStarsDelta` nor `mastered`;
- optional practice cannot satisfy `localPerformanceMinimum`, checkpoint
  evidence or mastery;
- one writer, fresh spec review, fresh adversarial review, final deterministic
  gate, atomic commit and another exhaustive handover update.

Startup:

```powershell
Set-Location C:\Users\badlo\codex-worktrees\phraseman\learning-v2-pilot
git status --short --branch
git log -3 --oneline
```

### Findings and proposals

- Do not begin Task 1 or any Admin/UI/Kimi import before Task 0A is fully closed.
- Keep the runtime SessionSet resolver visibly deferred; never present ref-shape
  validation as loaded-body validation.
- Investigate the Jest open-handles advisory in a separate bounded diagnostic
  packet only; it did not invalidate Task 0.

## 15.10 — Task 0A closed; Kimi K3 delivery location pointer (2026-07-25)

### Task 0A commit

Star-source separation is committed as `47c61b453`
(`feat: separate V2 practice star sources`) on
`prod-snapshot/learning-v2-pilot-20260721`. Final gate before commit:
`learning_v2_star_source_separation` + `learning_v2_gate_policy` +
`learning_v2_learning_evidence_policy`, 46/46 tests PASS, worktree clean.
The next writer packet is Task 1 (LanguageProfile contract) of
`docs/superpowers/plans/2026-07-22-learning-v2-e1-content-compiler.md`.

### Kimi K3 frontend delivery — where it actually lives

The accepted Kimi V5 delivery is NOT inside this repository. Do not conclude
"mockups not created" from repository search alone; the wireframe index in
`docs/v2/reference-evidence/phraseman-wireframes.md` tracks a different
artifact class (first-hand Phraseman contact sheets) and remains `not_created`.

- Primary copy (Kimi workspace, working copy for further Kimi iterations):
  `C:\Users\badlo\Documents\kimi\workspace\kimi-delivery\learning-v2-frontend\20260719-0858-k3\`
- Backup snapshot (2026-07-25, 684 files / 49.87 MB, without `node_modules`,
  SHA-256 spot-check 8/8 against `handoff/file-sha256.json`):
  `C:\appsprojects\phraseman-backups\kimi-learning-v2-frontend-20260719-0858-k3\`
- Intake status: accepted 2026-07-22 as presentation reference and selective
  component source only — see `handoff/CODEX_INTAKE_REPORT_20260722.md` inside
  the delivery. Rebinding to frozen ViewModels and typed commands remains
  mandatory before any production import.
- Local preview: `npx http-server source/dist -p 4173` →
  `http://localhost:4173` (standalone single file:
  `source/dist/phraseman-v2-lab-standalone.html`).

### Findings and proposals

- Refresh the backup snapshot after any further Kimi iteration; the snapshot
  does not track the Kimi workspace automatically.
- The V5 "final reference" resolution offered by Kimi is still pending an
  explicit owner decision; V5 remains a candidate until recorded here.

## 15.11 — E1 Content Compiler packet complete: Tasks 1-8 (2026-07-25)

### Outcome

All remaining tasks of
`docs/superpowers/plans/2026-07-22-learning-v2-e1-content-compiler.md` are
implemented, verified and committed. The packet is closed. Commits, in order,
on `prod-snapshot/learning-v2-pilot-20260721`:

- `28e93f26b` feat: define V2 language profiles (Task 1)
- `c839fd61f` feat: validate V2 content items (Task 2)
- `488a36974` feat: compile V2 required sessions (Task 3)
- `b343ce9c5` feat: define V2 optional practice slots (Task 4)
- `a62cb8ee9` feat: project optional practice rewards (Task 5)
- `be5852d20` feat: pin V2 generation language profile (Task 6)
- `051ceef8c` feat: compile and validate V2 episode content (Task 7)
- Task 8 commit: this handover update + `e1-content-source.json` fixture +
  `tests/learning_v2_e1_content_compiler.test.ts`.

### Verification evidence (final joint packet, 2026-07-25)

- Root: 13 suites / **460 tests PASS** (language profile, content item,
  session compiler, optional practice, reward, E1 vertical slice, episode
  contract, gate policy, evidence policy, session contract, star source
  separation, attempt cardinality, evidence contract).
- Functions: 4 suites / **22 tests PASS** (generation contract, generation
  plan incl. exact thirteen-kind regression, compilation adapter, content QA).
- `tsc --noEmit` (root): zero errors in `modules/learning-v2/**`,
  `tests/learning_v2*`, `tests/support/learning_v2*`. Pre-existing snapshot
  debt remains in app/components/survey tests (unrelated, untouched).
- `tsc --noEmit` (functions): zero errors outside the pre-existing
  `src/index.ts` snapshot debt (missing sibling modules on this branch).

### Contract highlights beyond the plan sketch

- All validators are fail-closed with deep-frozen, caller-detached normalized
  bodies (immutability rule).
- The compiler is deterministic and order-independent (internal sort by
  `contentItemId`), emits canonical session sets that pass
  `validateV2SessionSet` byte-for-byte after stripping the session-level
  `support` view field, and never reuses a promptId across the unit.
- QA additionally blocks: duplicate card ids, foreign-episode optional
  templates, unsupported optional families; unused bank items surface as
  warnings, never blocks.
- The Functions adapter takes an injected async profile resolver (no direct
  Firestore reads in pure code), verifies resolver-ref identity, recomputes
  the canonical body hash and refuses on any mismatch.
- Fixture hashes are real `hashCanonicalBody` values, proven in-test.

### Deliberately NOT done here (later packets)

Admin V2 one-button orchestration, exception review, live device preview
(packet 2); app map/session UI, dynamic optional speech nodes, Kimi
presentation import (packet 3). No Rules, indexes, deploy configuration or
production pointers were touched. No production reward numbers were chosen —
the fixture reward policy is keyed `optional-practice-test-policy`.
