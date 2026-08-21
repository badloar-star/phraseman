# Новая система «Ошибки» — план реализации

> **Для исполнителя:** выполнять по порядку в текущем checkout через TDD. Для
> исполнения использовать skill `executing-plans`, перед каждым утверждением о
> готовности — `verification-before-completion`. Новый branch/worktree не создавать:
> владелец этого не просил, а правила проекта это запрещают.

**Цель:** полностью удалить старую «Мою практику» вместе с Trainer/old Review,
SM-2, старыми очередями, ключами и тестами; построить с нуля Plus-раздел
«Ошибки», который собирает объективные ошибки, сразу делает их доступными для
адаптивной отработки и использует совместимые механики уроков и Арены.

**Нормативный источник:**
`docs/plans/2026-08-20-mistake-practice-design.ru.md`. При расхождении этого
плана со спецификацией побеждает спецификация.

**Архитектура:** append-only локальный журнал событий является источником
истины. Чистая проекция вычисляет состояние ошибки, scheduler формирует
очередь, а Exercise Mode Registry подбирает совместимую механику урока или
Арены по capability, не по экрану-источнику. React Native UI, облачная
синхронизация, энергия, Plus и награды подключаются через тонкие адаптеры.
Старые данные не мигрируются.

**Стек:** TypeScript, React Native/Expo Router, AsyncStorage, Jest/RNTL,
существующие premium/energy/cloud/economy контракты, `HybridSheetShell`,
`constants/motionHybrid.ts`.

## Неподвижные границы

- Сохранить в `app/lesson1.tsx` красный feedback, правильный ответ,
  объяснение, `errorQueueRef`, `ERROR_REPLAY_DELAY_ANSWERS = 2`,
  `questionsSinceErrorRef` и обязательный повтор внутри урока.
- Сохранить обязательные encounter/retrieval/check циклы Learning V2. Новый
  loop — только дополнительная необязательная Plus-ветка.
- Не редактировать защищённые файлы Арены ради этой функции. Разрешены только
  read-only импорты публичных контрактов или новый адаптер вне `modules/arena/**`.
- Из Арены брать механику задания, но не matchmaking, соперника, competitive
  timer, rating, match stars, серверный verdict или Arena rewards.
- Plus ограничивает запуск отработки, но сбор ошибок идёт у всех пользователей.
- Обычный неверный ответ вызывает стандартный `spendOne()`. Существующий
  `isUnlimited` для Plus/tester остаётся авторитетным; неопределённый voice
  verdict энергию не тратит.
- Не возрождать удалённую глобальную Daily Tasks. Дневную цель добавлять только
  внутрь Personal Plan.
- Звезда начисляется только атомарным идемпотентным событием существующего
  wallet journal; прямое изменение баланса запрещено.
- Текущий checkout грязный. Перед каждой правкой повторно читать актуальную
  версию файла и сохранять пользовательские изменения, особенно в
  `app/(tabs)/home.tsx`, `app/_layout.tsx`, `app/cloud_sync.ts`,
  `app/trainer_store.ts`, Learning V2 и Arena.

---

## Task 1. Исполняемые границы сохранения и удаления

**Files:**

- Create: `tests/mistake_practice_preservation_contract.test.ts`
- Create: `tests/mistake_practice_legacy_inventory_contract.test.ts`
- Read: `app/lesson1.tsx`
- Read: `app/learning-v2/lesson/[id].tsx`
- Read: `____АРЕНА_НЕ_ОТКАТЫВАТЬ____.md`

- [ ] В preservation-контракте проверить наличие локальной очереди урока,
  задержки в два задания, красного результата, правильного ответа и объяснения.
- [ ] Проверить, что доступность этих механизмов не зависит от premium gate и
  не импортирует новый mistake-practice scheduler.
- [ ] Зафиксировать обязательные Learning V2 циклы и то, что error loop не
  заменяет обязательный road item.
- [ ] В legacy inventory перечислить точные старые маршруты, модули, storage
  keys и импорты. На этом шаге тест ожидаемо GREEN и служит списком удаления.

Команда:

```powershell
npx jest --runTestsByPath tests/mistake_practice_preservation_contract.test.ts tests/mistake_practice_legacy_inventory_contract.test.ts --no-cache --runInBand
```

Критерий: оба теста GREEN до начала удаления. Этот gate запускать после каждого
крупного этапа.

## Task 2. Чистые контракты и стабильная идентичность ошибки

**Files:**

- Create: `modules/mistake-practice/contracts.ts`
- Create: `modules/mistake-practice/identity.ts`
- Create: `tests/mistake_practice_identity.test.ts`
- Reuse: `modules/learning-v2/policies/decision_registry.ts`

- [ ] Сначала написать RED-тесты: одинаковый canonical content + facet даёт
  одинаковый `mistakeId`; разные target language, content object или facet —
  разные id; порядок полей не влияет на hash.
- [ ] Определить типы без React Native и AsyncStorage:

```ts
export type MistakeFacet =
  | 'meaning'
  | 'form'
  | 'word_order'
  | 'missing_token'
  | 'listening'
  | 'pronunciation';

export type MistakeEventType =
  | 'captured'
  | 'hint_used'
  | 'practice_answered'
  | 'hidden'
  | 'restored'
  | 'correction_rewarded';

export interface MistakeEvent {
  eventId: string;
  mistakeId: string;
  cycleId: string;
  type: MistakeEventType;
  occurredAtMs: number;
  studyTarget: 'en' | 'fr';
  payload: Record<string, unknown>;
}
```

- [ ] Для canonical hash переиспользовать Metro-safe `canonicalJsonV1` и
  `sha256Utf8`, не добавляя Node `crypto` в runtime bundle.
- [ ] Identity строить из версии схемы, study target, стабильного id/канона
  учебного объекта и конкретного error facet; не включать время, экран или
  случайный session id.
- [ ] Сделать unsupported/неполный source явным результатом `not_capturable`,
  а не случайным идентификатором.

Команда RED/GREEN:

```powershell
npx jest --runTestsByPath tests/mistake_practice_identity.test.ts --no-cache --runInBand
```

## Task 3. Проекция жизненного цикла и адаптивный scheduler

**Files:**

- Create: `modules/mistake-practice/projection.ts`
- Create: `modules/mistake-practice/scheduler.ts`
- Create: `tests/mistake_practice_projection.test.ts`
- Create: `tests/mistake_practice_scheduler.test.ts`

- [ ] RED-тестами покрыть: первая объективная ошибка сразу становится active;
  hint — слабый сигнал, но не самостоятельная ошибка; три независимых
  правильных ответа в три разных дня и минимум в двух типах задания переводят
  active → corrected.
- [ ] В один календарный день учитывать не более одного qualifying correct на
  ошибку. Recognition/choice/`speed_match` не могут завершить исправление без
  последующего production режима с меньшей поддержкой.
- [ ] Новая объективная ошибка для corrected или hidden создаёт новый `cycleId`
  и возвращает её в короткий цикл.
- [ ] Hidden хранить в проекции и поддержать undo через событие `restored`.
- [ ] Scheduler сортирует failed-in-session → overdue/oldest → остальные due,
  не повторяет один и тот же mode без необходимости и делает ошибку доступной
  сразу, без ожидания часов.
- [ ] После неверного ответа вернуть элемент через 2–4 задания; максимум два
  дополнительных показа. После третьей неудачи прекратить давление, показать
  объяснение и назначить короткий следующий интервал.
- [ ] Проверить устойчивость к повторным eventId, изменённому порядку событий,
  clock skew и пустому журналу.

Команда:

```powershell
npx jest --runTestsByPath tests/mistake_practice_projection.test.ts tests/mistake_practice_scheduler.test.ts --no-cache --runInBand
```

## Task 4. Новый event store, account scope и облачный merge

**Risk:** критическая граница account/privacy/cloud. Исполнение этого task —
одним writer уровня `economy-critical`; отдельная read-only проверка после GREEN.

**Files:**

- Create: `app/mistake_practice_store.ts`
- Create: `app/mistake_practice_cloud_merge.ts`
- Create: `tests/mistake_practice_store.test.ts`
- Create: `tests/mistake_practice_cloud_merge.test.ts`
- Create: `tests/mistake_practice_account_isolation.test.ts`
- Modify: `app/target_storage_keys.ts`
- Modify: `app/cloud_sync.ts`
- Inspect: `app/auth_provider.ts`
- Inspect: `functions/src/jarvis/*_firestore_fetcher.ts`
- Modify if read contract changes: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] Ввести target/account-scoped ключи
  `mistake_practice_events_v1`, `mistake_practice_projection_v1`,
  `mistake_practice_session_v1`, `mistake_practice_prefs_v1` через существующий
  key factory, а не строковые литералы по приложению.
- [ ] Append делать идемпотентным по `eventId`; проекцию считать производным
  cache, который всегда можно удалить и пересобрать.
- [ ] Cloud merge = union событий по `eventId` + детерминированная сортировка.
  Ни timestamp/LWW, ни серверная проекция не могут стереть локальное событие.
- [ ] При account switch/delete очистить новые ключи тем же безопасным
  lifecycle, что и остальные account-scoped данные. Не менять двухфазную
  семантику удаления аккаунта.
- [ ] Проверить offline append, retry, два устройства, logout/login, смену
  study target и восстановление после повреждённого projection cache.
- [ ] Поискать чтение схемы Джарвисом. Если читает — обновить fetcher и таблицу
  контракта в том же change; если не читает — оставить production fetchers без
  изменений и всё равно запустить guard.

Команды:

```powershell
npx jest --runTestsByPath tests/mistake_practice_store.test.ts tests/mistake_practice_cloud_merge.test.ts tests/mistake_practice_account_isolation.test.ts --no-cache --runInBand
npx jest --runTestsByPath functions/src/jarvis/jarvis_data_contract_guard.test.ts --no-cache --runInBand
```

## Task 5. Exercise Mode Registry уроков и Арены

**Files:**

- Create: `modules/mistake-practice/exercise_mode_registry.ts`
- Create: `modules/mistake-practice/exercise_builders.ts`
- Create: `tests/mistake_practice_exercise_registry.test.ts`
- Create: `tests/mistake_practice_arena_boundary.test.ts`
- Read only: `modules/arena/contract.ts`
- Read only: `modules/arena/task_adapter.ts`

- [ ] Начать с RED-матрицы `facet × material capability × mode`.
- [ ] Реестр поддерживает lesson mechanics: choice/meaning, fill-gap, ordered
  tokens, typing, listening и scripted speech.
- [ ] Реестр поддерживает Arena mechanics: `guess_phrase`, `fill_gap`,
  `find_oddity`, `translate_build`, `speed_match`.
- [ ] Строить локальное задание из canonical mistake material. Не использовать
  конкурентный `ArenaPublicTask` как источник истины: в публичной задаче Арены
  намеренно нет правильного ответа.
- [ ] При полезности переиспользовать только public presentation contract
  `ArenaQuestionView`/чистый renderer adapter. Не редактировать
  `modules/arena/**`, `components/arena/**`, `app/arena*`.
- [ ] Выбор mode учитывать facet, наличие аудио, допустимость typing/voice,
  предыдущие режимы и уровень поддержки. При недоступном voice выбрать другой
  совместимый режим без потери учебной цели.
- [ ] Boundary-тест запрещает импорты Arena matchmaking, opponent, timer,
  rating, wallet/rewards, network verdict и Cloud Functions в новой системе.

Команда:

```powershell
npx jest --runTestsByPath tests/mistake_practice_exercise_registry.test.ts tests/mistake_practice_arena_boundary.test.ts --no-cache --runInBand
```

## Task 6. Единый capture adapter и подключение источников

**Files:**

- Create: `app/mistake_practice_capture.ts`
- Create: `tests/mistake_practice_capture.test.ts`
- Modify: `app/lesson1.tsx`
- Modify: objectively checked Cards session files found by targeted `rg`
- Modify: `app/lesson_words.tsx`
- Modify: `app/lesson_irregular_verbs.tsx`
- Modify: `app/diagnostic_test.tsx`
- Modify: `app/level_exam.tsx`
- Modify: `app/exam.tsx`
- Modify: relevant Learning V2 answer boundary outside immutable content source
- Modify: Personal Plan objective submission boundary if it is active at
  implementation time

- [ ] Определить один вход:

```ts
export type CaptureResult =
  | { kind: 'captured'; mistakeId: string; eventId: string }
  | { kind: 'ignored'; reason: 'correct' | 'subjective' | 'technical' | 'cancelled' | 'unsupported' };

export function captureObjectiveAttempt(attempt: ObjectiveAttempt): Promise<CaptureResult>;
```

- [ ] RED-тестами проверить objective wrong, hint signal, correct, self-rated,
  mic/permission/network error, cancel/skip и неопределённый voice verdict.
- [ ] Подключать capture рядом с уже вычисленным authoritative verdict, не
  дублировать проверку ответа в новом модуле.
- [ ] Записывать ошибку сразу, но не навигировать и не вмешиваться в текущую
  локальную очередь урока.
- [ ] Защитить от двойной записи одного attempt при rerender/retry стабильным
  attempt event id.
- [ ] Для каждого source добавить focused integration test. Сначала один
  типичный урок, затем Cards, exam, Learning V2 и остальные источники.

Команды:

```powershell
npx jest --runTestsByPath tests/mistake_practice_capture.test.ts tests/mistake_practice_preservation_contract.test.ts --no-cache --runInBand
```

Затем запускать только найденные focused source-тесты, по одному файлу, чтобы не
поднимать весь Jest suite.

## Task 7. Session builder и runtime отработки

**Files:**

- Create: `modules/mistake-practice/session.ts`
- Create: `app/mistake_practice_session_store.ts`
- Create: `tests/mistake_practice_session.test.ts`
- Create: `tests/mistake_practice_session_resume.test.ts`

- [ ] RED-тестами закрепить длины 5/10/15/Все; недоступные размеры disabled;
  «Все» ограничено 30; запуск невозможен при числе совместимых active ошибок <5.
- [ ] Единственная настройка — длина. Все подходящие письменные и голосовые режимы
  адаптивно смешиваются; переключателя voice-only нет.
- [ ] Session snapshot хранит selected mistake ids, generated exercise ids,
  cursor, requeue counters и answered attempt ids, чтобы app restart не
  дублировал награды/ответы.
- [ ] На ошибке: показать корректирующий feedback и вернуть через 2–4 задания.
  На третьей неудаче завершить item на сегодня с объяснением.
- [ ] На правильном ответе соблюдать support fading: comprehension → hinted
  production → independent production. В подходящем материале typing обязателен.
- [ ] После resume пересчитать доступность против event journal, но сохранить
  уже показанные позиции и идемпотентность ответов.

Команда:

```powershell
npx jest --runTestsByPath tests/mistake_practice_session.test.ts tests/mistake_practice_session_resume.test.ts --no-cache --runInBand
```

## Task 8. Вход из «Карточек» и утверждённый setup sheet A

**Files:**

- Modify: `app/flashcards/tabbar_state.ts`
- Modify: `app/flashcards/FlashcardsTabBar.tsx`
- Create: `components/mistake-practice/MistakePracticeSetupSheet.tsx`
- Create: `tests/mistake_practice_flashcards_entry.test.tsx`
- Create: `tests/mistake_practice_setup_sheet.test.tsx`
- Reuse: `components/modal_fx/HybridSheetShell.tsx`
- Reuse: `constants/motionHybrid.ts`

- [ ] Добавить `errors` в тип и метаданные левого menu таббара Карточек, не
  создавая отдельный нижний tab.
- [ ] Пункт показывает точное число active ошибок. Для non-Plus рядом Plus
  badge; нажатие открывает существующий paywall, но сбор и число сохраняются.
- [ ] Для Plus открыть один bottom sheet: заголовок «Ошибки», серые кнопки 5/10/15/Все и CTA
  «Начать». Отдельных разделов «слова» и
  «фразы» нет, advanced filters нет.
- [ ] Если active <5, все кнопки запуска серые без поясняющего микротекста. Если
  ошибок, например, 8 — 5 доступно, 10/15/Все следуют правилам spec.
- [ ] Sheet строить через `HybridSheetShell`, motion numbers брать только из
  `constants/motionHybrid.ts`, соблюдать Reduce Motion, focus order,
  accessibility labels и touch targets.
- [ ] На lime CTA использовать тёмный foreground, не белый.
- [ ] Сверить production sheet с выбранным макетом A:
  `.codex-tmp/error-system-mockups/index.html`.

Команда:

```powershell
npx jest --runTestsByPath tests/mistake_practice_flashcards_entry.test.tsx tests/mistake_practice_setup_sheet.test.tsx tests/motion_hybrid_contract.test.ts --no-cache --runInBand
```

## Task 9. Экран сессии, feedback, voice и энергия

**Files:**

- Create: `app/mistake_practice_session.tsx`
- Create: `components/mistake-practice/MistakePracticeQuestion.tsx`
- Create: `components/mistake-practice/MistakePracticeFeedback.tsx`
- Create: `components/mistake-practice/MistakePracticeSessionSummary.tsx`
- Create: `tests/mistake_practice_runtime.test.tsx`
- Create: `tests/mistake_practice_voice_energy.test.tsx`
- Modify: `app/_layout.tsx`
- Reuse: `components/EnergyContext.tsx`

- [ ] Зарегистрировать только новый session route; setup остаётся sheet внутри
  Cards surface.
- [ ] Renderer переключается по registry output и не содержит своей модели
  scheduling/correction.
- [ ] Для неверного объективного ответа вызвать стандартный `spendOne()` и
  записать attempt event. При `isUnlimited` контекст сам не уменьшает энергию.
- [ ] Voice состояния: permission, recording, processing, no speech,
  unavailable, objective pass/fail. Только объективный fail тратит энергию и
  пишет ошибку.
- [ ] При недоступном микрофоне объяснить проблему и предложить включить доступ
  или сменить режим; не засчитывать fail.
- [ ] Feedback показывает правильный ответ и краткое объяснение, поддерживает
  immediate adaptive requeue, но не использует старый Trainer/SRS.
- [ ] Summary: отработано, исправлено, XP, звёзды; скрытие ошибки с confirmation
  и undo доступно из контекстного действия, не отдельным разделом.

Команда:

```powershell
npx jest --runTestsByPath tests/mistake_practice_runtime.test.tsx tests/mistake_practice_voice_energy.test.tsx --no-cache --runInBand
```

## Task 10. Необязательный error loop в Learning V2

**Files:**

- Create: `components/mistake-practice/MistakePracticeLoopNode.tsx`
- Create: `tests/learning_v2_mistake_loop.test.tsx`
- Modify: `app/learning-v2/lesson/[id].tsx`

- [ ] Вычислять только active ошибки текущего lesson id; не смешивать глобальную
  очередь.
- [ ] При >=5 совместимых ошибках и Plus добавить ненумерованную side branch
  «Ошибки». При <5 удалить её немедленно из проекции карты.
- [ ] Loop необязателен, не блокирует progression, не заменяет authored road
  items и использует тот же session engine/registry.
- [ ] Для non-Plus при том же пороге показать locked Plus presentation loop;
  тап открывает существующий paywall и не запускает сессию. Если действующий
  product gate решит не показывать locked presentation, основной Cards entry
  всё равно показывает накопленное число и Plus badge.
- [ ] Проверить recompute после capture, исправления, hide, смены lesson и
  восстановления приложения.

Команда:

```powershell
npx jest --runTestsByPath tests/learning_v2_mistake_loop.test.tsx tests/mistake_practice_preservation_contract.test.ts --no-cache --runInBand
```

## Task 11. XP, звезда, достижения и Personal Plan

**Risk:** wallet/economy — критическая зона. Реализация награды одним
`economy-critical` writer, затем fresh read-only `economy-reviewer`.

**Files:**

- Create: `app/mistake_practice_rewards.ts`
- Create: `tests/mistake_practice_rewards.test.ts`
- Modify: appropriate immutable Learning V2 star wallet adapter, selected after
  reading current wallet ownership
- Modify: `app/achievements.ts`
- Modify: `tests/achievements.test.ts`
- Modify: active Personal Plan goal/progress files selected from current runtime
- Create: `tests/personal_plan_mistake_goal.test.ts`
- Inspect: `firestore.rules`
- Modify if schema changes: `firestore.rules`
- Modify if schema changes: `tests/firestore_rules_security.test.ts`
- Modify if schema changes: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] XP начислять за независимые ответы и completion существующим
  идемпотентным XP ledger, не за recognition spam.
- [ ] Ровно одна звезда при переходе active → corrected в конкретном `cycleId`.
  Idempotency key включает `mistakeId + cycleId + reward version`.
- [ ] Reward event и grant должны образовать одну replay-safe операцию. Retry
  возвращает тот же receipt и не начисляет вторую звезду.
- [ ] Не импортировать `app/arena_star_wallet.tsx` как аренную награду. Выбрать
  персональный immutable wallet contract Learning V2 или общий approved adapter.
- [ ] Заменить старые Trainer/Active Recall достижения новыми достижениями
  «Ошибок»; старые counters не переносить.
- [ ] Добавить цель отработки ошибок внутрь активного Personal Plan. Не создавать
  global daily task, route или storage key удалённой Daily Tasks.
- [ ] Если меняются коллекции/поля: в том же task обновить Firestore Rules,
  Jarvis fetcher (если читает) и contract guard.

Команды:

```powershell
npx jest --runTestsByPath tests/mistake_practice_rewards.test.ts tests/achievements.test.ts tests/personal_plan_mistake_goal.test.ts --no-cache --runInBand
npx jest --runTestsByPath tests/firestore_rules_security.test.ts functions/src/jarvis/jarvis_data_contract_guard.test.ts --no-cache --runInBand
```

## Task 12. Перевод аналитики и диагностических потребителей

**Files:**

- Create: `app/mistake_practice_insights.ts`
- Create: `tests/mistake_practice_insights.test.ts`
- Modify: `app/weekly_review_snapshot.ts`
- Modify: `app/weekly_review_analytics.ts`
- Modify: `app/problem_coach.tsx`
- Modify: phrase analytics/diagnosis readers found by
  `rg "mistake_log|active_recall|trainer_store"`
- Preserve: `app/ai_mistake_explain_client.ts`,
  `app/use_mistake_explain.ts` and ordinary lesson explanation flow

- [ ] Создать read-only projection API для frequent facets, weak spots,
  active/corrected counts и weekly window.
- [ ] Перевести weekly review, problem coach и диагностику с `mistake_log` на
  новую проекцию, не удаляя их самостоятельную функциональность.
- [ ] Для каждого consumer сначала добавить characterization test старого
  полезного результата, затем заменить data source и оставить тест GREEN.
- [ ] Удалять только входы, которые вели на `/trainer` или `/review`; заменить
  действие на открытие Cards Errors sheet либо neutral insight без мёртвой
  навигации.
- [ ] Не удалять `ai_mistake_explain_client`/`use_mistake_explain`: это
  объяснение обычного урока, а не собственность старого SRS.

Команда:

```powershell
npx jest --runTestsByPath tests/mistake_practice_insights.test.ts tests/weekly_review_snapshot.test.ts tests/weekly_review_analytics.test.ts --no-cache --runInBand
```

## Task 13. Главная: убрать «Практику», оставить две широкие плитки

**Files:**

- Modify: `app/(tabs)/home.tsx`
- Modify: `app/home_menu_icons.ts`
- Create: `tests/home_primary_tiles_without_practice.test.tsx`
- Modify or remove after reference audit: old practice-specific bundled assets

- [ ] RED-тестом закрепить отсутствие плитки/CTA «Практика» и наличие двух
  широких основных плиток «Уроки» и «Карточки».
- [ ] Удалить home prefetch/snapshot imports старого Trainer.
- [ ] Сохранить все несвязанные текущие изменения Home; не восстанавливать
  старую версию файла из Git.
- [ ] Перед удалением каждого asset выполнить literal basename search в
  `app/components/constants/hooks/contexts/lib/modules`; удалить только файл с
  нулём ссылок после удаления slot mapping.
- [ ] Проверить темы, narrow/wide layouts, accessibility order и lime contrast.

Команда:

```powershell
npx jest --runTestsByPath tests/home_primary_tiles_without_practice.test.tsx tests/onboarding_graphite_trainer_theme_assets.test.ts --no-cache --runInBand
```

Если второй старый тест относится только к удалённому asset contract, заменить
его новым home asset test и удалить старый тест в Task 14.

## Task 14. Полное удаление старой «Моей практики»

**Files to delete after consumers are GREEN:**

- Delete: `app/active_recall.ts`
- Delete: `app/trainer_store.ts`
- Delete: `app/mistake_log.ts`
- Delete: `app/trainer.tsx`
- Delete: `app/review.tsx`
- Delete: `app/trainer_words_session.tsx`
- Delete: `app/trainer_phrases_session.tsx`
- Delete: `app/trainer_session.ts`
- Delete: `app/trainer_session_navigation.ts`
- Delete: `app/trainer_session_report.tsx`
- Delete: `app/trainer_practice_hall.ts`
- Delete: `app/trainer_practice_persist.ts`
- Delete: `app/trainer_practice_prefetch.ts`
- Delete: `app/trainer_fill_gap_options.ts`
- Delete if no broader owner: `app/trainer_target_gate.ts`
- Delete: `components/PracticeHallTrendChart.tsx`
- Delete: `components/TrainerLoadStates.tsx`
- Delete: `components/trainer_load_copy.ts`
- Delete: `constants/trainerThemeIcons.ts`
- Modify: `app/_layout.tsx`
- Modify: `app/cloud_sync.ts`
- Modify: `app/target_storage_keys.ts`
- Modify: `app/achievements.ts`
- Modify: all remaining import consumers located by exact `rg`
- Delete: tests whose sole subject is the deleted Trainer/SM-2/old Review
- Rewrite: `tests/mistake_practice_legacy_inventory_contract.test.ts` into a
  permanent full-removal guard

- [ ] До удаления получить свежий точный список:

```powershell
rg -n "active_recall|trainer_store|mistake_log|/trainer|/review|trainer_practice|PracticeHall|TrainerLoad" app components constants hooks contexts lib modules tests --glob '!modules/arena/**'
```

- [ ] Удалить route registration и background prime/prefetch старого Trainer.
- [ ] Удалить старые storage factories/keys, cloud lists и achievement counters.
- [ ] Старую историю не импортировать. На первом запуске новой версии
  однократно удалить legacy keys через версионированный cleanup marker; cleanup
  идемпотентен и не трогает новую систему.
- [ ] Удалить только тесты, проверяющие удалённую реализацию. Любой тест
  полезного consumer сначала перевести на новый projection.
- [ ] Permanent guard должен падать при возвращении старых файлов, маршрутов,
  storage strings, imports, home text и регистраций.
- [ ] Проверить, что ни один старый документ не объявляет «Практику» действующей
  главной поверхностью; исторические документы пометить superseded, не искажать
  их историю.
- [ ] После удаления выполнить `rg` выше: допустимы только permanent guard,
  migration cleanup constants и явно помеченные historical docs.

Команды:

```powershell
npx jest --runTestsByPath tests/mistake_practice_legacy_inventory_contract.test.ts tests/mistake_practice_preservation_contract.test.ts --no-cache --runInBand
```

## Task 15. Фокусная интеграционная проверка и handover

**Files:**

- Create: `tests/mistake_practice_end_to_end_contract.test.ts` (Jest config matches `*.test.ts`)
- Create: `tests/mistake_practice_runtime_journey.test.ts`
- Create: `tests/learning_v2_mistake_loop_account_switch.test.ts`
- Modify: `docs/plans/2026-08-20-mistake-practice-design.ru.md` only if an
  owner-approved design decision changed during implementation
- Create: `docs/plans/2026-08-20-mistake-practice-handover.ru.md`

- [ ] E2E contract: objective error in lesson → immediate active count → lesson
  local retry still occurs → Cards Errors sheet → 5-item session → adaptive
  requeue → corrected after multi-day qualifying history → exactly one star.
- [ ] Отдельные ветки: non-Plus paywall; <5 disabled; voice unavailable;
  Learning V2 current-lesson loop; offline append + cloud retry; account switch.
- [ ] Запустить все новые тесты одной bounded командой, затем узкие guards
  затронутых областей. Полный project suite/typecheck не запускать автоматически
  без отдельной необходимости; рабочее дерево содержит много несвязанных работ.
- [ ] Проверить motion, accessibility, contrast, target/account isolation,
  Firestore/Jarvis contract и отсутствие Arena protected edits.
- [ ] Сделать source-only review diff. Не включать unrelated user changes и не
  генерировать `functions/lib` вручную, если focused build этого не требует.
- [ ] В handover записать команды, точные PASS counts, непройденные проверки,
  новые keys/schema, cleanup behavior и визуальные поверхности.

Основная команда:

```powershell
$mistakeTests = (Get-ChildItem -LiteralPath tests -Filter 'mistake_practice*.test.ts').FullName
npx jest --runInBand --forceExit --no-cache --runTestsByPath $mistakeTests tests/learning_v2_mistake_loop.test.ts tests/learning_v2_mistake_loop_account_switch.test.ts tests/home_primary_tiles_without_practice.test.ts tests/monetization_copy_contract.test.ts tests/gustav_feature_parity_matrix.test.ts
```

## Финальные acceptance criteria

- «Моя практика», Trainer, old Review, SM-2, `active_recall_items`,
  `trainer_store_v1` и `mistake_log_v1` отсутствуют в runtime и UI.
- Обычная обязательная отработка ошибки внутри урока работает как раньше и не
  зависит от Plus.
- Все объективные источники пишут в один новый идемпотентный журнал; технические
  и неопределённые voice ошибки не записываются.
- «Ошибки» доступны через левое меню таббара Карточек; setup — один sheet A;
  слова и фразы смешаны; запуск от пяти ошибок.
- Сессия поддерживает 5/10/15/Все (max 30) и единую adaptive mixed-очередь,
  requeue 2–4, максимум две дополнительные попытки и multi-day correction.
- Registry использует совместимые lesson/Arena mechanics, но ни одну
  конкурентную систему Арены.
- Learning V2 loop появляется только для Plus и только при пяти ошибках текущего
  урока; остаётся необязательным.
- XP и звезда идемпотентны; звезда выдаётся ровно один раз на correction cycle;
  прямого balance write нет.
- Cloud merge не теряет offline events; account/study-target isolation доказана.
- Weekly review, диагностика и аналитика читают новую проекцию; объяснение
  ошибки обычного урока сохранено.
- Главная содержит две широкие плитки «Уроки» и «Карточки» и не содержит
  «Практику».
- Permanent removal guard не позволяет старой системе вернуться.

## Порядок поставки

1. Tasks 1–5: фундамент и чистая логика без UI.
2. Tasks 6–10: capture, сессия, Cards и Learning V2.
3. Tasks 11–12: награды и потребители с критическими review gates.
4. Tasks 13–14: переключение UI и окончательное удаление legacy.
5. Task 15: интеграция, проверка и handover.

Не делать частичный production rollout, в котором старая и новая долгосрочные
очереди одновременно пишут одну попытку. До финального переключения новая запись
может находиться за локальным implementation flag; после переключения legacy
writers удаляются в том же change set.
