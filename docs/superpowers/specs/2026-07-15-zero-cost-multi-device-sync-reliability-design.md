# Межустройственная синхронизация при буквальном нулевом приросте Firebase-операций

**Дата:** 2026-07-15
**Статус:** десятая редакция после cost-, regression-, race-, downstream-, cache-, target-, freeze-, React-scheduling- и boot-scheduling-аудитов; ожидает письменной приёмки владельца до плана реализации.

## Решение

При буквальном требовании «ни одной дополнительной Firebase-операции» безопасный релиз намеренно узкий:

1. из уже загруженного при холодном старте `users/{uid}` синхронно извлекается только серверный максимум `exam best_pct` для зачётов A1/A2/B1/B2 в `en` и `fr`;
2. значения публикуются только в ограниченный overlay в памяти текущего процесса;
3. карточки зачётов во вкладке «Уроки» синхронно показывают `max(local best_pct, session overlay)`;
4. overlay никогда не пишется в AsyncStorage, migration snapshot, outbox или Firebase;
5. публикация overlay не уведомляет React; значение читается только при уже существующем render фактической активации вкладки.

Релиз не добавляет Firebase listeners, polling, FCM, новые Firestore reads/writes, callable-функции, Firebase Auth-вызовы, timers, retries, документы, коллекции, Rules, boot AsyncStorage calls или новые async boundaries.

`best_score` и `passed` исключены после downstream-аудита. Их локальное изменение способно автоматически пересчитать `unlocked_lessons`, после чего следующий существующий sync получает другой patch и может выполнить новую оплачиваемую запись.

## Честная граница результата

Релиз исправляет одну доказуемо cost-neutral часть жалобы: если телефон A уже доставил серверу более высокий лучший процент зачёта, телефон B после следующего безопасного холодного запуска покажет правильную лучшую медаль в карточке зачёта при открытии вкладки «Уроки».

Overlay намеренно недолговечен и только визуален:

- он живёт только в памяти процесса;
- он не меняет результат или I/O `saveExamProgress()`;
- он не изменяет medal/reward UI текущей новой попытки на экране зачёта;
- незавершённый edge-drag preview может показывать ранее отрисованный кадр до фактической активации Lessons;
- после завершения процесса следующий online cold start строит его заново из уже существующего Firestore read;
- offline restart не обещает значение, которое никогда не было записано локально прежним кодом.

Релиз не обещает:

- realtime/foreground-обновление уже открытого телефона;
- доставку события, которое телефон A ещё не отправил существующим progress-event/outbox путём;
- синхронизацию уроков, незавершённых клеток, факта сдачи зачёта, доступов, текущего результата, числа прохождений, XP или наград;
- автоматический выход другого устройства;
- durable local copy cloud `best_pct`.

Это не полная межустройственная синхронизация прогресса. Это максимальный подтверждённый объём, который одновременно сохраняет существующую архитектуру и не добавляет Firebase-операций.

## Неприкосновенные инварианты

- Не удалять, не отключать и не заменять существующие возможности.
- Не менять XP Manager, общий/недельный XP, streak, shards, энергию, награды, achievements, Premium/VIP, RevenueCat, покупки, лиги, Arena, дедупликацию, event IDs/fingerprints и server ledger.
- Не менять `saveExamProgress()`, `loadExamMedalInfo()`, `syncToCloud()`, `runSyncNow()`, `doSyncToCloud()`, `forceNow`, `pendingSync`, `syncInFlight`, пятиминутный debounce, фоновую задержку 1,8 секунды и их call sites.
- Не менять Functions, Firestore Rules, индексы, коллекции, документы и Firebase request payload.
- Не менять порядок или число boot AsyncStorage calls и не добавлять ожидание на network-critical пути coordinator.
- Не менять существующий `cloud_profile_hydrated` event и не подписывать на него overlay.
- Не добавлять foreground/reconnect restore.
- Не блокировать первый кадр ожиданием Firestore, App Check или другой сети.
- Сохранить account-generation, stable-ID и account-switch/delete guards.
- Ошибка reducer/peek означает legacy-поведение без retry и без durable partial-mode; ошибка privacy listener/shell закрывает добавленный overlay fail-closed cover, потому что fail-open мог бы оставить пиксели старого owner.

## Точное определение нулевого прироста

Для одного и того же начального состояния, расписания и сетевого результата до и после патча должны совпадать:

- количество и порядок `users.get/set/update`;
- количество и порядок `arena_profiles.get/set/update`;
- каждый callable по имени и payload;
- Firebase Auth-вызовы;
- попытки существующих progress, migration, daily-task, report-reply, shard-delta и shard-grant очередей;
- document paths, identity, типы запросов и request payload;
- зависимые от Rules `get()/exists()` чтения;
- границы решений, зависящих от `Date.now()`, пятиминутного debounce и фоновых 1,8 секунды.

Разрешены только:

- синхронная обработка уже загруженного `doc.data()`;
- bounded process-memory values;
- один closed-by-default process-memory tab-activity scalar, который обновляется только существующими tab/router callbacks и не имеет subscribers;
- один phase-filtered local account-generation listener только для privacy cover при настоящем account switch; initial adoption и same-stable refresh не вызывают React update;
- чистый render-time `max` для экзаменационной медали;
- нейтральный privacy cover без mount/unmount дочернего Lessons tree.

`after <= baseline` недостаточно: нельзя убрать существующую recovery-попытку или изменить payload. Требуется равенство Firebase trace. Если реализация меняет число, тип, порядок или payload Firebase-запросов в сравнительных fixtures, релиз останавливается.

## Подтверждённые факты текущего кода

### Сетевой lifecycle намеренно остаётся прежним

Background handler ждёт 1,8 секунды и затем вызывает обычный sync с пятиминутным debounce. Boot-очереди и `syncToCloud` начинаются после `hydrate.then`. Даже новый awaited local write внутри restore способен сдвинуть debounce boundary, поэтому overlay не выполняет I/O, не создаёт Promise и не добавляет `await`.

### `best_pct` server-owned и монотонен

- Сервер хранит максимум лучшего процента зачёта.
- `saveExamProgress()` локально хранит `max(previousBest, currentPct)`.
- `isServerOwnedProgressKey()` исключает `best_pct` из клиентского `users/{uid}.progress` patch для `en` и `fr`.
- Production UI consumer `best_pct` — лучшая экзаменационная медаль во вкладке Lessons.
- `best_pct` не участвует в `unlocked_lessons`, `premium_course_level`, exam availability, rewards или progress-event payload текущей попытки.

Session-only render max не меняет AsyncStorage и поэтому не может попасть в более поздний `progressMigrateSnapshot` payload даже при отсутствии локального migration marker.

### Почему `best_score` и `passed` исключены

Эти значения монотонны на сервере, но имеют автоматические локальные последствия:

- `recomputeEarnedUnlocks()` пересчитывает root `unlocked_lessons` из `best_score/passed`;
- root `unlocked_lessons` входит в client sync keys, но не отфильтрован как server-owned;
- Rules запрещают его client write;
- `tryUnlockLevelExam()` и `tryUnlockLingmanExam()` могут создать derived local keys;
- нормализация `passed` из `'true'` в `'1'` меняет эти же derived решения.

Контрпример cost-аудита: cloud `best_score` пересекает порог 2,5 → post-boot `premium_deactivated` пишет новый `unlocked_lessons` → следующий background sync получает patch, которого не было в baseline. Поэтому `best_score/passed` остаются вне релиза.

### Найденный существующий cache-риск отделён от overlay

`lastSnapshotByTarget` и `lessonsUiSessionCacheByTarget` сейчас ключуются только target и могут пережить account switch. Попытка исправить это remount-границей добавляла boot `multiGet` при initial identity adoption и в transitioning phase. Поэтому десятая редакция не меняет эти caches и не утверждает, что исправила общий account-cache bug. Overlay никогда не записывается в эти caches, поэтому новый код не расширяет существующий риск.

Общий account-cache bug вынесен в отдельное owner decision после этого релиза: его fix требует собственного lifecycle/I/O trace и не может быть подмешан в cost-neutral medal overlay.

## Строгий allowlist

Разрешены только восемь scalar keys:

- `en`: `level_exam_{A1|A2|B1|B2}_best_pct`;
- `fr`: соответствующие target-scoped `level_exams_v2::fr::*_best_pct`.

Каждый ключ обязан одновременно:

1. входить в существующий restore-набор;
2. возвращать `true` из `isServerOwnedProgressKey()`;
3. соответствовать target `en/fr` и уровню A1/A2/B1/B2;
4. оканчиваться только на `best_pct`.

Статический test падает при расширении allowlist без отдельного owner review.

Явно запрещены `best_score`, `passed`, `pct`, `pass_count`, `progress`, `unlocked_lessons`, `available`, `attempt_count`, `medal_tier`, `cellIndex`, `completed_at`, achievements, XP, purchases, rewards, leagues и Arena.

## Валидация и session store

Cloud `best_pct` принимается только как целое число 0–100: либо number, либо десятичная строка, полностью совпадающая с `^(0|[1-9]\d{0,2})$`. Неизвестный target/level/field, boolean, пустое значение, лишние символы, NaN, Infinity, дробь и выход за диапазон отклоняются.

Store содержит:

- ровно один `ownerStableId`;
- максимум восемь значений `studyTarget|level → bestPct`;
- никаких listeners, subscribers, Promise, timers или revision-driven React updates.

Рядом хранится отдельный tab-activity gate со значениями `unknown | safe_home | unsafe` и optional pending target. Default — `unknown` (overlay publication запрещена). Gate не хранит пользовательские данные и не имеет listener.

Правила ownership:

- публикация захватывает current active generation/UID, но ownership хранится по stable UID, а не по номеру generation;
- active → active refresh того же stable UID сохраняет overlay;
- при `phase !== active` или другом current stable UID `peek` возвращает отсутствие значения;
- публикация для другого stable UID атомарно заменяет прежнего owner и все восемь slots;
- A overlay не виден B; возврат к тому же A в рамках процесса может снова использовать A overlay, пока другой owner его не заменил;
- отдельный account-generation listener для clear не добавляется: discard выполняется лениво через current identity check.

Публикация snapshot атомарна в одном JS turn: повторно проверяются generation/UID/AppState/safe path, после чего без `await`, Promise, timer, native call, callback notification или другого JS yield обновляются только owner/values.

Store никогда:

- не пишет AsyncStorage;
- не добавляется в `progressPatch` или migration snapshot;
- не ставит `pendingSync`;
- не меняет `LAST_SYNC_SNAPSHOT_KEY`;
- не запускает retry, timer, callable или Firebase write;
- не создаёт app event.

## Cold-only режим и guards

`restoreFromCloudDetailed()` получает необязательный cold-only option. По умолчанию поведение полностью legacy. Option передают только два boot coordinator call site в `app/_layout.tsx`.

Auth-, Premium-, nickname- и другие restore call sites не передают option.

Перед синхронной публикацией overlay одновременно должны выполниться условия:

1. существующий `users/{uid}.get()` успешно вернул документ;
2. legacy `applyRestoreFromUserDoc` завершился своим прежним результатом;
3. account generation и stable UID всё ещё совпадают и находятся в active phase;
4. `root.progressServerAuthoritative === true` уже присутствует в загруженном документе;
5. приложение активно;
6. live safe-path callback читает актуальный `pathnameRef.current`: разрешены только корень/главная вкладка; lesson, exam, lessons tab, deep link и неизвестный путь закрывают guard;
7. live tab-activity gate уже инициализирован как `safe_home`, active/pending target не Lessons и не иной unsafe tab; pathname сам по себе недостаточен;
8. allowlist/reducer получил хотя бы одно valid cloud value.

Закрытый guard означает skip до следующего безопасного холодного старта. Retry/defer отсутствует. Ни один guard не обращается к Firebase или AsyncStorage.

`progress_server_snapshot_migrated_v1` специально не читается: новый `getItem` изменил бы boot scheduling. Это безопасно только потому, что overlay остаётся render-only и никогда не входит в local storage или migration payload.

## Network-critical путь остаётся прежним

- `restoreFromCloudDetailed()` не получает нового `await` или native I/O.
- `applyRestoreFromUserDoc()` полностью выполняет legacy restore до публикации overlay.
- `hasMeaningfulLocalAccountData()` остаётся на прежнем месте и видит тот же AsyncStorage state.
- `shouldSync` вычисляется прежним кодом из прежних данных.
- существующий `cloud_profile_hydrated` эмитится в прежней точке и не получает overlay listener.
- post-hydration queues, `syncToCloud`, premium events и background sync запускаются в прежнем порядке.

Extraction/publication не вызывает `Date.now()`, не планирует microtask/macrotask, не уведомляет React и не выполняет setState.

Отдельный characterization test фиксирует, что Promise resolution order, fake-timer time, coordinator result и Firebase/Auth/AsyncStorage/native-storage I/O traces совпадают baseline. Обычный RN UI commit privacy cover проверяется отдельно и не считается storage/network trace.

## UI-применение overlay

### `app/(tabs)/lessons.tsx`

В месте расчёта каждой exam medal непосредственно во время render используется:

`getExamMedalTier(max(currentTargetStateBestPct, peekCurrentOverlay(studyTarget, level)))`.

Правила:

- один ref хранит target, которому принадлежит текущий `examBestPcts` state; initializer получает текущий `lessonCacheTarget`, а успешный существующий current-target `loadScores()` обновляет ref непосредственно перед прежними setters;
- `currentTargetStateBestPct` равен существующему state value только если ref совпадает с current `lessonCacheTarget`; на первом render после en ↔ fr старое target-значение даёт 0 и не может победить правильный overlay;
- весь остальной Lessons state и его UI остаются baseline;
- overlay peek требует current active stable UID и exact study target/level;
- overlay не записывается в module/session cache;
- `loadScores()`, его Promise reuse, state setters, effects и AsyncStorage calls не меняются;
- необязательный `overlayIdentityEpoch` prop используется только для принудительного render genuine account transition и не участвует в state/I/O/effects;
- исключение/невалидный ответ helper означает `overlayBest = 0` и чистое legacy rendering;
- `saveExamProgress()`, `loadExamMedalInfo()` и `level_exam.tsx` не меняются.

### `app/(tabs)/_layout.tsx`

Новая privacy shell располагается над существующим `TabPane`/`react-freeze`, но не меняет React `key` дочернего Lessons tree и не подписывается на overlay store.

Shell:

1. render фиксирует baseline account token, а `useLayoutEffect` выполняет gap-free sequence `render-captured token → subscribeAccountGeneration → capture/reconcile after`; cleanup удаляет subscription;
2. initial `uninitialized → active` adoption и active → active refresh того же stable UID только обновляют ref: `setState`, remount и read не выполняются;
3. только `active → transitioning`, different-stable activation или другой настоящий owner transition увеличивает локальный `identityEpoch`;
4. callback сам ловит ошибки; transition-reducer/setup/reconcile error устанавливает sticky `privacyFailClosed`, увеличивает epoch и включает cover, а не возвращает старый overlay в legacy view;
5. epoch передаётся обычным prop через Lessons deferred wrapper, чтобы active child перечитал current-owner overlay без remount;
6. если Lessons не является фактически активной вкладкой — frozen или живой сосед Home/Arena — и identity epoch вырос, shell рисует поверх его области непрозрачный нейтральный theme-background cover;
7. при `cover=true` protected child container одновременно получает `accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"` и `pointerEvents="none"`, а верхний непрозрачный cover — `pointerEvents="auto"`; VoiceOver/TalkBack и касания не достигают child старого owner;
8. при следующей фактической активации Lessons в одном commit снимает cover, accessibility/pointer isolation, размораживает child и передаёт новый epoch; `peek` уже не может вернуть overlay прежнего owner; при `privacyFailClosed` cover не снимается;
9. не подписывается на overlay publication, не выполняет I/O и не использует timer/app event;
10. overlay publication сама по себе не вызывает render: существующий tab tap/completed-swipe render читает значение; незавершённый native edge-drag остаётся baseline и может показывать старый preview.

Тот же файл поддерживает tab-activity gate без React state:

- initial layout reconciliation записывает current logical/physical owner;
- `handleTabChange`, `handleSwipeStart`, `handleSwipeComplete` и router reconciliation синхронно помечают target до соответствующего `setState`/отложенного `router.navigate`;
- tab activation/pending Lessons всегда даёт `unsafe` до последнего activation render;
- unmount возвращает gate в `unknown`;
- ни одна запись gate не уведомляет listener и не планирует работу.

Privacy cover нужен только для A → B: frozen pixels с новым A overlay не должны расширять существующий cache leak. Для same-account cloud hydration cover не включается; после завершённого перехода на Lessons существующий render показывает current overlay, ждать `useEffect`/`loadScores()` не нужно.

Общий account-switch cache bug не объявляется исправленным: shell гарантирует только, что добавленный этим релизом overlay A не показывается B.

## Порядок cold restore

1. Сохраняются существующие `ensureAnonUser`, `ensureStableAuthLink` и единственный `users/{uid}.get()`.
2. Внутри `withRestoreApplicationLock` полностью выполняется legacy `applyRestoreFromUserDoc` без нового option-dependent I/O.
3. После legacy restore повторно проверяются generation/UID, `progressServerAuthoritative`, active AppState и live safe path.
4. Из уже загруженного `doc.data()` синхронно валидируются только восемь `best_pct` keys.
5. Только если pathname и live tab-activity gate оба safe, без yield публикуется bounded session overlay; cloud module не вызывает React/Firebase/native API.
6. Restore возвращает тот же status/applied result, что baseline.
7. Coordinator прежним вызовом проверяет `hasMeaningfulLocalAccountData`, эмитит прежний `cloud_profile_hydrated` и возвращает прежний `shouldSync`.
8. Все очереди и Firebase lifecycle продолжаются как раньше.
9. При будущей фактической активации Lessons существующий tab render показывает overlay без storage reload.

Ошибка шагов 3–5 сохраняет legacy restore и ничего не планирует.

## Пользовательские сценарии

### Телефон A

Зачёт и progress event сохраняются/отправляются текущим кодом. Firebase lifecycle, XP и награды не меняются.

### Телефон B, безопасный холодный старт

Существующее чтение `users/{uid}` уже содержит серверный `best_pct`. Session overlay принимает valid cloud максимум. При раскрытии «Уроков» пользователь видит правильную лучшую медаль. Firebase и AsyncStorage calls не добавляются.

### Следующий зачёт на B

Зачёт полностью работает прежним кодом. Его local write, pass count, rewards и event payload не используют overlay. После возврата в Lessons session overlay продолжает показывать больший cloud maximum.

### Уже открытый B или старт через lesson/exam/deep link

Нового чтения нет. Safe-path guard пропускает overlay; возможна попытка на следующем безопасном cold start.

### Same-stable auth refresh

Новая generation того же active stable UID не удаляет overlay. Auth restore остаётся legacy, а Lessons продолжает видеть значения того же owner.

### Account A → B

При transitioning/different stable UID `peek` немедленно возвращает no overlay. Overlay-значения A не применяются B. Существующий общий Lessons cache bug не считается исправленным и тестируется отдельно перед будущим cache-релизом.

## Тестовая стратегия

### Characterization до production-кода

Фиксируются:

- network/Firebase trace cold boot, auth restore и premium restore;
- точный порядок coordinator: restore → `hasMeaningfulLocalAccountData` → event → outcome;
- boot AsyncStorage call count/order/payload;
- background 1,8 секунды, пятиминутный debounce и `forceNow`;
- progress migration marker-present/marker-missing payload;
- empty/non-empty progress diff и recovery queues;
- request payload и server-owned filter;
- account-generation/restore lock;
- текущие `saveExamProgress` I/O/result и `saveExamProgress → registerXP`;
- hidden Lessons premount/freeze/tab-activation и genuine account-transition lifecycle;
- post-boot premium events и следующий background sync.

### RED-тесты

1. Default `restoreFromCloudDetailed()` полностью legacy; cold-only option есть только в двух boot call sites.
2. Allowlist содержит ровно восемь server-owned `best_pct` keys.
3. Valid cloud number/string 0–100 принимается; malformed/boolean/fraction/out-of-range отклоняется.
4. `best_score/passed/progress/pct/pass_count/unlocked/available` и protected domains не попадают в overlay.
5. Missing `progressServerAuthoritative`, stale generation, inactive app, unsafe live path, `unknown/unsafe` tab gate или pending Lessons отключает overlay.
6. Cold option не добавляет AsyncStorage/Firebase call, Promise, timer, app event или новый `await`.
7. Coordinator `hasMeaningfulLocalAccountData`, `shouldSync` и `cloud_profile_hydrated` до/после совпадают по порядку и результату.
8. Marker-missing + pending progress event: exam save и следующий `progressMigrateSnapshot` payload byte-identical baseline.
9. `saveExamProgress()`, `loadExamMedalInfo()` и `level_exam.tsx` source/I/O/results byte-identical baseline.
10. Store содержит максимум восемь slots; malformed publish no-op; different owner replaces all slots.
11. Active → active same stable generation сохраняет overlay; transitioning/different stable скрывает его; store не имеет listener/I/O.
12. Render medal использует exact target/level/current owner и fallback 0 при helper error.
13. При en-state 90 → переключении на fr до async load локальная часть medal равна 0, а valid fr-overlay 60 даёт 60; EN 90 не появляется в первом FR render.
14. Overlay не попадает в Lessons caches или state setters; `loadScores()`/multiGet count baseline.
15. Activation commit → deferred pathname update: tab gate уже `unsafe`, поэтому завершившийся в этом окне restore не публикует overlay после последнего render.
16. Existing safe tap/completed-swipe render показывает ранее опубликованный current overlay до effects; незавершённый edge-drag не получает нового callback.
17. Initial `uninitialized → active` adoption и same-stable refresh не вызывают shell `setState`, не remount’ят Lessons и не добавляют `multiGet`.
18. Gap fixtures `render → layout effect`, `capture → subscribe` и `subscribe → reconcile` закрываются render-captured baseline + reconcile-after-subscribe без пропущенного A → B.
19. Genuine A → transitioning → B меняет только identity prop/cover, не child key; active child rerисовывает `peek`, hidden frozen и hidden-unfrozen neighbor визуально/accessibility/pointer закрыты до следующей активации.
20. Cover скрывает descendants от VoiceOver/TalkBack, блокирует касания child и в том же safe activation commit восстанавливает accessibility/pointer behavior current-owner tree.
21. Fault injection listener/setup/reconcile после отрисованного A overlay включает sticky fail-closed cover и не оставляет A pixels/tree интерактивными.
22. Overlay A не применяется B; same-owner A refresh не теряет overlay; account-transition Firebase/Auth call trace совпадает baseline.
23. `premium_activated`, `premium_deactivated`, `recomputeEarnedUnlocks` и следующий background/5-minute sync имеют baseline Firebase trace/payload.
24. Ошибка reducer/peek даёт legacy render; privacy-shell error даёт fail-closed cover; retry/durable state не создаются.

### Comparative Firebase trace

Baseline и patch запускаются с одинаковыми fake timers и точкой завершения:

- 0 мс, 500 мс, 1 799 мс, 1 800 мс и обе стороны пятиминутной границы;
- внешний sync trigger между прежней и любой потенциально сдвинутой boundary;
- process termination сразу после restore;
- cold boot, auth restore, premium refresh;
- marker present/missing, pending/empty progress queue;
- in-flight `forceNow`;
- restore success/failure/stale generation;
- authoritative/non-authoritative cloud doc;
- safe/unsafe route;
- unknown/safe/unsafe/pending tab gate и activation-before-deferred-pathname race;
- same-stable generation refresh и account switch A → B → A;
- hidden Lessons premount до initial identity activation;
- post-boot premium events и следующий background sync.

Acceptance — точное равенство Firebase API count, call order и payload, отсутствие новых boot native-storage calls и неизменный `saveExamProgress` trace. Process-memory/UI effects проверяются отдельно.

### Узкий regression gate

- cloud restore/merge;
- boot restore coordinator;
- account generation/transition;
- auth stable-link и account deletion contracts;
- progress migration/event/outbox;
- XP Manager registration;
- shards/pending queues;
- Premium/VIP/owned restore;
- achievements, leagues и Arena;
- exam medal/target isolation;
- Lessons activation render/freeze/account privacy cover без изменения cache loader;
- `firebase_cost_controls_contract`;
- `owner_direction_runtime_contract`;
- performance freeze/navigation guards.

Широкий Jest suite автоматически не запускается.

## Допустимые production-файлы

- `app/cloud_sync.ts` — cold-only synchronous allowlist/extraction без изменения outbound paths или awaits;
- `app/_layout.tsx` — cold option и live safe-path/AppState callback в двух boot coordinators;
- новый `app/exam_best_pct_overlay.ts` — bounded stable-owner process-memory max store и closed-by-default tab-activity scalar без I/O, timers, callbacks и events;
- `app/(tabs)/lessons.tsx` — target-scoped render-time max, один target-owner ref и optional identity render prop, без cache/new state/I/O изменений;
- `app/(tabs)/_layout.tsx` — phase-filtered account privacy cover/identity prop над `react-freeze`, без overlay subscription, child key или remount;
- связанные тесты в `tests/`.

Не меняются `level_exam.tsx`, `medal_utils.ts`, `lessons_tab_state.ts`, `auth_provider.ts`, `premium_guard.ts`, `progress_events_client.ts`, `events.ts`, `lesson_lock_system.ts`, XP/reward/purchase/league/Arena модули, Functions и Rules.

Общий рабочий каталог содержит пользовательские изменения. Реализация обязана перечитать их актуальные версии и накладывать минимальные patches; замена файлов версиями из чистого worktree запрещена.

## Rollout и rollback

- Только мобильная сборка; Firebase deploy отсутствует.
- До интеграции обязательны RED/GREEN evidence, exact Firebase/boot-storage trace, diff review и два независимых аудита без открытых P0/P1.
- Новой схемы AsyncStorage, миграции, queue и server cleanup нет.
- Rollback удаляет только client patch; persistent overlay data отсутствует.
- Новая Firebase-аналитика не добавляется.
- Сборку после письменной приёмки делает владелец.

## Вне этого релиза

### General Lessons account-cache isolation

Module/session caches ключуются только target и могут показать старый snapshot после account switch. Наивный remount fix добавляет local reads при boot/transition и противоречит текущему нулевому trace. Нужна отдельная спецификация с phase-aware privacy cover, caller-safe stale cancellation для `speaking_club_home.tsx`, exact target/account state identity и собственным local/Firebase scheduling gate.

### `best_score` и `passed`

Полная синхронизация этих полей требует отдельного решения для downstream `unlocked_lessons` и других derived writers. Нельзя молча добавить root `unlocked_lessons` в server-owned filter: это изменит request payload, может превратить denied mixed write в successful billed write и открыть следующую Arena attempt.

### Формат `passed`

Основные consumers ждут `'1'`, но legacy restore merge способен записать `'true'`. Это реальный bug, однако его исправление меняет unlock/access downstream и не входит в доказуемо cost-neutral релиз.

### Немонотонные поля

`progress`, `pct` и `pass_count` имеют несовместимые client/server semantics. Их max/union merge способен воскресить старую попытку или выдать лишнюю награду.

### Исходящая delivery-гарантия

Фоновый timer иногда не успевает, а `forceNow` во время in-flight не запускает немедленный повтор. Исправление может увеличить фактические Firebase-операции, поэтому оно не входит в релиз.

### Durable local overlay

Запись cloud `best_pct` в AsyncStorage способна изменить последующий `progressMigrateSnapshot` payload на телефоне без migration marker. Она запрещена в этом релизе даже внутри существующего exam save.

### Account deletion Rules

Подготовленные общие `exists()`-проверки delete marker могут добавить billed Rules reads. Их deploy остаётся остановленным до отдельного cost-neutral решения.

### Arena mirror

`doSyncToCloud()` пытается писать `arena_profiles/{authUid}`, тогда как Rules выглядят запрещающими client write. Нельзя убирать, разрешать или обходить попытку без отдельного production trace и authority-решения.

### Root `unlocked_lessons`

Server engine и Rules считают root key server-owned, но client filter его не исключает. Исправление filter меняет payload/cost и требует отдельного решения владельца.

## Критерии приёмки

1. Добавленных Firebase operations/call sites/listeners/timers/Rules/Functions/payload нет.
2. Добавленных boot AsyncStorage calls или async boundaries нет.
3. Comparative fixtures показывают точное равенство Firebase trace, включая migration/debounce/background/post-premium границы.
4. Reducer затрагивает только восемь `best_pct` keys и только process memory.
5. Overlay никогда не входит в AsyncStorage, cache snapshot, migration payload или save path.
6. `best_score`, `passed` и derived unlock/access keys byte-identical baseline.
7. Existing coordinator order, `shouldSync` и `cloud_profile_hydrated` byte-identical baseline.
8. Первый safe render после фактической активации Lessons применяет current-owner/current-target overlay max; при A → B добавленный A-overlay закрыт privacy cover, исключён из accessibility tree и недоступен для касаний, а baseline cache state этим релизом не переопределяется.
9. Initial identity adoption и account transitions не remount’ят Lessons и не добавляют local reads.
10. Pathname/tab activation race закрыта live tab gate без subscriber; unknown/unsafe state всегда skip.
11. Auth/premium/nickname restore полностью legacy; same-stable auth refresh не теряет overlay.
12. XP, rewards, achievements, purchases, shards, leagues, Arena, exam save и progress events не изменены production-кодом.
13. Первый app frame не ждёт сеть и не получает новый spinner/layout shift.
14. Diff ограничен утверждёнными production-файлами и связанными тестами.
15. Независимые cost/regression reviews не имеют открытых P0/P1.
16. Серверный deploy отсутствует.
