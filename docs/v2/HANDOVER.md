# Phraseman Learning V2 — мастер-хендовер

**Последнее обновление:** 2026-07-15, Europe/Dublin  
**Статус цели:** active  
**Текущая стадия:** планирование и нормативные спецификации завершены; Content Studio Task 0, Firebase CLI reproducibility, umbrella Phase 01 / Task 1.1 identity/versioning и Task 1.1A immutable DecisionRegistry закрыты отдельными локальными коммитами, узкими тестами и двумя независимыми финальными PASS-аудитами
**Точный следующий крупный шаг:** выполнить umbrella Phase 01 / Task 1.2 — canonical activity/episode/curriculum contracts; после него строго 1.3 evidence/result → 1.4 backend mirror и только затем dedicated Content Studio Tasks 1–3
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
| 01 | 1.1 identity/versioning → 1.1A immutable DecisionRegistry → 1.2 activity/episode/curriculum → 1.3 evidence/result → 1.4 backend mirror → 1.5 Content Studio Tasks 1–3 | Shared client/Functions corpus, stable issue codes, no shadow contracts, 17 families, immutable ModeTemplate | **В работе:** Tasks 1.1 и 1.1A закрыты; ближайший код — Task 1.2 contracts |
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

### 6.6 Phase 01 / Task 1.1 identity и versioning

Task закрыт двумя отдельными коммитами:

- `77cf617afb4a33e75a830dfc9d78d133e4f928c2` — `feat: define Learning V2 identity contracts`;
- `362b65e7af4ea0b1db34f13007686f4e6e91d180` — `test: harden Learning V2 purity guard`.

Созданы ровно три плановых файла:

| Файл | Назначение |
|---|---|
| `modules/learning-v2/contracts/identities.ts` | Exact ID grammar, семь distinct branded types, `is*`/`parse*`, stable error codes и release-scoped activity duplicate assertion |
| `modules/learning-v2/contracts/schema_versions.ts` | Code-owned per-kind allowlist девяти поддержанных V2 schema versions и fail-closed parser |
| `tests/learning_v2_identity_contract.test.ts` | Runtime boundaries, compile-time brand guards, localization/release invariants, schema conformance и AST purity guard |

Канонический ID-контракт:

- один exact allowlist `^[A-Za-z0-9._-]{1,160}$` для `courseId`, `seasonId`, `episodeId`, `nodeId`, `activityId`, `skillId`, `releaseId`;
- исходная строка не trim-ится, не lower-case-ится и не Unicode-normalize-ится; сравнение case-sensitive и byte-for-byte;
- лексика общая, но TypeScript brands разные: `NodeId` нельзя присвоить `ActivityId`;
- обязательные префиксы, lowercase-only и запрет leading/repeated punctuation намеренно не добавлены: это было бы уже несовместимым правилом сверх нормативного server allowlist;
- `activityId` обязан быть уникален внутри одного release, но та же stable identity разрешена по одному разу в разных releases;
- `skillId` не принимает release как parser input и не переименовывается при смене release;
- title/translation не входят в identity и не могут её менять.

Поддержанный schema registry по entity kind:

| Kind | Exact accepted version |
|---|---|
| `modeTemplateRuntime` | `v2-mode-template.v1` |
| `delayedProbeDefinition` | `v2-delayed-probe-definition.v1` |
| `attemptBody` | `v2-attempt-body.v1` |
| `attemptRef` | `v2-attempt-ref.v1` |
| `attemptEnvelope` | `v2-attempt-envelope.v1` |
| `delayedAttemptCandidate` | `v2-delayed-attempt-candidate.v1` |
| `delayedAttemptAck` | `v2-delayed-attempt-ack.v2` |
| `publishedSeason` | `v2-season.v1` |
| `lessonBundle` | `lesson-bundle.v2` |

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

| Файл | Назначение и важные границы |
|---|---|
| `modules/learning-v2/policies/decision_registry.ts` | Shared/mobile readonly types, strict validator/resolver, canonical JSON v1, portable pure-JavaScript SHA-256 и content-addressed object-path formula; Node `crypto` запрещён purity test-ом |
| `functions/src/content_studio/decision_registry.ts` | Поведенчески идентичный Functions validator/resolver; отличается только использованием `createHash('sha256')`, потому что deployable Functions `tsconfig` не может импортировать root `modules/**` |
| `tests/fixtures/learning-v2/content-studio/decision-registry.v1.json` | Один shared conformance corpus: baseline v1, согласованные nonbaseline v2 и calibrated v3, named invalid mutations, runtime-invalid canonical values и frozen ordered issue expectations |
| `tests/learning_v2_decision_registry.test.ts` | Root/mobile corpus, canonical/hash/path, fail-closed validation, issue metadata, Unicode/array boundaries и Node-crypto purity guard |
| `functions/src/content_studio/decision_registry.test.ts` | Тот же corpus и те же assertions в Functions runtime; отличается только fixture/import path и отсутствием mobile-only purity test |

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
