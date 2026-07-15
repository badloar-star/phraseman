# Phraseman Learning V2 — мастер-хендовер

**Последнее обновление:** 2026-07-15, Europe/Dublin  
**Статус цели:** active  
**Текущая стадия:** планирование и нормативные спецификации завершены; Content Studio Task 0 и его Firebase CLI reproducibility follow-up закрыты локальными коммитами и проверены; начинается umbrella Phase 01
**Точный следующий крупный шаг:** выполнить umbrella Phase 01 / Task 1.1 — identity и versioning; после него строго 1.1A → 1.2 → 1.3 → 1.4 и только после появления canonical episode/evidence contracts переходить к dedicated Content Studio Tasks 1–3
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
| 00 | Security inventory, legacy direct-access classification, удаление broad-admin OR bypass, server-only V2 paths, canonical Body/Record/hash boundary | Emulator deny для будущих authoring paths; legacy compatibility; одинаковые canonical bytes/hash | **Security slice закрыт.** Content Studio Task 0 и reproducible local CLI зелёные; canonical artifact contracts продолжаются в Phase 01 |
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
| 0 | Direct-access inventory, explicit Firestore allows/denies, emulator matrix | До любых новых authoring collections/callables | **Закрыто локально:** Task 0 + exact local CLI, 351 emulator и 61 root/static guards зелёные |
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
2. **Выполнено:** воспроизводимость Task 0 закрыта focused commits `abce49e1f` + `fd450e763`; exact local `firebase-tools@15.23.0`, clean `npm ci`, 351 emulator и 61 combined root/static tests подтверждены.
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
- Firebase CLI reproducibility commit: `abce49e1fb52fc5356cb0a0996f60fa4934b19d7`
- Firebase CLI security-pin follow-up: `fd450e763d94b19b1bfcc995d797899fae3f3c9c`
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
| `functions/package.json` | Dedicated emulator-команда и exact dev-only `firebase-tools@15.23.0` |
| `functions/package-lock.json` | Воспроизводимое дерево testing dependencies и локального Firebase CLI |
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

npx jest --runTestsByPath tests/functions_firebase_cli_reproducibility_contract.test.ts tests/firestore_rules_security.test.ts --no-cache --runInBand
# PASS: 2 suites, 61/61 tests
```

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

### 8.5 Выполненный prerequisite: воспроизводимый Firebase CLI

Prerequisite закрыт commits `abce49e1f` и `fd450e763`. Фактически выполненные команды:

```powershell
Push-Location functions
npm install --save-dev --save-exact firebase-tools@15.23.0
git diff -- package.json package-lock.json
npm ci
.\node_modules\.bin\firebase.cmd --version
npm run test:emulator:v2-authoring-rules
Pop-Location
npx jest --runTestsByPath tests/functions_firebase_cli_reproducibility_contract.test.ts tests/firestore_rules_security.test.ts --no-cache --runInBand
```

Получено: diff содержит manifest/lock/focused contract, `npm ci` с нуля восстанавливает dependency tree, local binary печатает `15.23.0`, emulator suite даёт 351/351, combined root suites — 61/61. Остаточное dev-only audit-исключение и запрет автоматического downgrade описаны в §7.1; они не блокируют pure Task 1.1.

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
Канонические 14 paths уже tracked. Firebase CLI P2 закрыт commits abce49e1f + fd450e763;
не меняй pin без 351+61 gates. Выполни umbrella Phase 01 / Task 1.1 строго test-first:
identity grammar и schema versions без
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
- 351 emulator и 61 combined reproducibility/static tests зелёные;
- firebase-tools pin закрыт на latest exact `15.23.0`; time-bounded dev-only audit exception описан в §7.1; общий baseline Functions build остаётся открытым;
- все 11 V2 docs, оба плана и AGENTS protocol сохранены docs-only commit и присутствуют в clean pilot worktree;
- exact next implementation — umbrella Phase 01 / Task 1.1 identity and versioning; Content Studio Task 1 идёт только после 1.1A–1.4;
- UI, mass generation, production rollout и legacy retirement сейчас запрещены порядком зависимостей.
