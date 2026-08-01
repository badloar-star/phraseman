# Аудит промежуточных состояний UI — 2026-07-27

Прогон по приложению: где не хватает состояний загрузки, пустоты, ошибки, офлайна,
подтверждений и тостов. Только чтение, ни один файл не менялся.

Покрыто ~55 экранов и компонентов: вкладки, учебное ядро, флешкарты, ИИ-диалоги,
денежные экраны, личный план, онбординг/вход, глобальные оверлеи и тосты.

> **Макеты всех недостающих состояний:** [docs/v2/mockups/24-missing-states.html](docs/v2/mockups/24-missing-states.html)
> — 29 экранов, 61 кадр. Стиль, тайминги и spring-кривые перенесены из эталона
> Learning V2 (`23-modals-states.html`). Под каждым кадром указан файл и строка
> находки из этого отчёта.

---

## 1. КРИТИЧНО — пользователь застревает или теряет деньги/прогресс

### 1.1 Три экрана навсегда застревают на скелетоне при сбое загрузки
Общий класс бага: async-загрузка без `try/catch`, поэтому `setLoading(false)` /
`setView(...)` не вызывается никогда. Ошибки нет, кнопки «повторить» нет, выхода нет.

| Файл | Строка | Что происходит |
|---|---|---|
| [review.tsx:869](app/review.tsx:869) | `itemsPromise.then(due => {...})` — **нет `.catch()`** | Отвалился `getDueItems`/`getTrainerItems` → «Работа над ошибками» висит на скелетоне |
| [personal_plan_complete.tsx:50](app/personal_plan_complete.tsx:50) | `void (async () => { ... })()` без `try/catch` | Экран завершения плана — вечный скелетон, `view` остаётся `null` |
| [personal_plan_stats_screen.tsx:173](app/personal_plan_stats_screen.tsx:173) | `const load = useCallback(async () => {...})` без `try/catch` | Статистика плана — вечный скелетон |

Что должно быть: `.catch()` → error-состояние с текстом и кнопкой «Повторить»
(эталон уже есть — `TrainerErrorView` в [TrainerLoadStates.tsx](components/TrainerLoadStates.tsx)).

### 1.2 Тренажёр слов может «зависнуть» посреди сессии
[trainer_words_session.tsx:408](app/trainer_words_session.tsx:408) —
`await markTrainerResult(...)` **не обёрнут в try/catch**. Карточка улетает по свайпу,
запись падает (нет сети) → исключение прерывает функцию, и `setCurrent(next)` / `setDone(true)`
(строки 422–436) не выполняются. Карточка ушла, следующая не пришла, сообщения нет.
В соседнем `trainer_phrases_session.tsx` тот же вызов обёрнут корректно.

### 1.3 Награда за достижение может провалиться молча
[achievements_screen.tsx:1163](app/achievements_screen.tsx:1163):
```ts
onShardClaimed(achievement.id);              // оптимистично «выдали»
void claimAchievementShardReward(achievement.id).finally(() => {...});  // нет .catch()
```
Нет `.catch()` → при отказе сервера отката нет и сообщения нет: пользователь уверен,
что жемчужина начислена. Плюс на кнопке нет busy-состояния — во время запроса она
выглядит мёртвой (guard молчаливый, через `useRef`).

### 1.4 Смена плана подписки падает беззвучно
[manage_subscription.tsx:322](app/manage_subscription.tsx:322) — в `catch` только
`trackEvent('change_plan_failed')`, **никакого сообщения пользователю**. Спиннер
останавливается, и человек не знает: план сменился, не сменился, надо ли повторить.
Это платёжный флоу — молчание здесь самое дорогое.

### 1.5 Кнопка покупки билета не делает ничего
[tournament_tickets.tsx:104](app/tournament_tickets.tsx:104):
```tsx
<Cta ghost disabled={!canBuy}>Купить 1 🎟 за {TICKET_GEM_PRICE} жемчужин</Cta>
```
**Нет `onPress`.** Баланс захардкожен (`useState(3)` / `useState(124)`, строки 36–37,
рядом `TODO(server)`). Экран доступен как маршрут и выглядит как рабочая покупка.

### 1.6 Ошибка ИИ подмешивается в диалог как ответ собеседника
[ai_companion_session.tsx:145](app/ai_companion_session.tsx:145) — текст ошибки
пушится в `messages` с `role: 'assistant'`. Последствия: нет кнопки «Повторить»;
ошибка навсегда остаётся в переписке; она попадает в `buildHistory()` и уходит
обратно в ИИ как контекст. В соседнем `ai_dialog_session.tsx` сделано правильно —
отдельная системная плашка + retry. Это готовый образец для переноса.

### 1.7 Прогресс по урокам проглатывается молча
[lessons.tsx:913](app/(tabs)/lessons.tsx:913) — `catch { /* ignore */ }` вокруг
единственной загрузки прогресса/баллов/разблокировок. Сбой → нули вместо прогресса,
без объяснения и без retry.

### 1.8 Настройки: переключатели без отката
- [settings.tsx:1439](app/(tabs)/settings.tsx:1439) — `AsyncStorage.setItem('haptics_tap', ...)`
  без `await` и без `.catch()`: тумблер показывает одно, сохранено другое.
- [settings.tsx:372](app/(tabs)/settings.tsx:372) — `toggleNotifications`: оптимистично
  меняет состояние, при ошибке отката нет, только лог.
- [settings.tsx:813](app/(tabs)/settings.tsx:813) — `const [, setNameChangeNotice] = useState(...)`:
  геттер отброшен, плашка нигде не рендерится. Сервер отклонил ник → имя молча
  откатывается без единого слова.

### 1.9 Статистика личного плана без активного плана — тупик
[personal_plan_stats_screen.tsx:284](app/personal_plan_stats_screen.tsx:284) — пустое
состояние без единой кнопки: некуда идти, нечего создать.

### 1.10 Коллекция флешкарт: первый холодный запуск — пустота
[flashcards_collection.tsx:455](app/flashcards_collection.tsx:455) + рендер на 1594 —
`if (!loading && cards.length === 0)` показывает онбординг, а ветки `loading` нет вовсе:
пока грузится, `FlashList` рендерится пустым. Пользователь не отличает «грузится» от
«карточек нет». Прямое нарушение Performance Bible проекта.

### 1.11 Турниры не показывают обрыв связи
[tournaments.tsx:173](app/(tabs)/tournaments.tsx:173) — хук `useTournamentRoom` отдаёт
`status: 'idle'|'loading'|'ready'|'offline'|'error'` и `retry()`, экран берёт только `room`.
Подписка оборвалась → таймер продолжает тикать локально к нулю, создавая иллюзию, что всё живо.

### 1.12 Личный план: режим «вспомни фразу» — тупик при сбое
[personal_plan_exercise.tsx:1860](app/personal_plan_exercise.tsx:1860) — `.catch(() => setRecallItems([]))`
приводит к тому же экрану «Режим пока не готов», что и реально отсутствующий контент.
Ни загрузки, ни ошибки, ни retry — выход только «назад».

### 1.13 Урок слов: сеть упала = «пустой урок»
[lesson_words.tsx:3584](app/lesson_words.tsx:3584) — `.catch(() => setFrenchRemoteWords([]))`.
Хуже того, пустой список запускает ветку «всё выучено» → экран поздравляет со 100%,
которых не было.

---

## 2. СРЕДНЕ — заметно ухудшает опыт, но не ломает

**Загрузка без скелетона (нарушение собственного стандарта проекта)**
- [flashcards_arena.tsx:544](app/flashcards_arena.tsx:544) — полноэкранный `ActivityIndicator`.
- [lesson_words.tsx:3232, 3713, 3733](app/lesson_words.tsx:3232) — три места «текст на пустом фоне», прыжок вёрстки.
- [CleanOnboarding.tsx:1544](components/CleanOnboarding.tsx:1544) — полноэкранный спиннер как первый кадр онбординга.
- [flashcards_swipe.tsx:2466](app/flashcards_swipe.tsx:2466) — иконка в рамке вместо скелетона списка наборов.
- [lessons.tsx:878](app/(tabs)/lessons.tsx:878) — карточки стартуют с нулей, потом прыжок.

**Ошибка неотличима от пустоты**
- [friends.tsx:1417](app/(tabs)/friends.tsx:1417) — лента активности: `catch {}` → «Пока нет активности».
- [top_helpers.tsx:157](app/top_helpers.tsx:157) — `catch { }` → «Пока никого в топе», retry нет.
- [tournaments.tsx:145](app/(tabs)/tournaments.tsx:145) — таймаут → `{ slots: [] }` → «Скоро откроем».
- [personal_plan_theory.tsx:50](app/personal_plan_theory.tsx:50) — оба `.catch()` дают одно пустое состояние.

**Мёртвые/непоказываемые состояния ошибок**
- [friends.tsx:2027](app/(tabs)/friends.tsx:2027) — `friendCodeLoadError` заводится, обновляется, есть `retryFriendCode` — но нигде не рендерится.
- [InGameToast.tsx:41](components/InGameToast.tsx:41) — `void type;`: проп `'error' | 'info'` принимается и игнорируется, ошибка и инфо выглядят одинаково.

**Нет офлайн-реакции**
- [friends.tsx](app/(tabs)/friends.tsx) — ноль упоминаний `NetInfo`/`subscribeNetStatus`: «нет сети» и «сервер ответил ошибкой» неразличимы.

**Нет подтверждения на необратимое**
- [coin_exchange.tsx:137](app/coin_exchange.tsx:137) — обмен монет на звёзды односторонний, `ThemedConfirmModal` не используется.

**Ошибка без сообщения**
- [club_screen.tsx:1008](app/club_screen.tsx:1008) — сундук лиги: откат есть, тоста нет.
- [personal_plan_complete.tsx:88](app/personal_plan_complete.tsx:88) — `catch { setStarting(false) }` без сообщения.
- [settings.tsx:1022](app/(tabs)/settings.tsx:1022) — очистка кеша: успех через Alert, ошибка — никак.
- [manage_subscription.tsx:344](app/manage_subscription.tsx:344) — `Linking.openURL(...).catch(() => {})`: стор не открылся — тишина.

**Прерывание сессии**
- [diagnostic_test.tsx:1706](app/diagnostic_test.tsx:1706) — «назад» посреди теста: энергия уже списана (строка 1052), прогресс в памяти, подтверждения нет.
- Тренажёры фраз/слов — нет `AppState`, состояние сессии не персистится (для сравнения: `flashcards_swipe` и `lesson1` сохраняют).

**Нет pull-to-refresh** — `lessons`, `tournaments`, лента активности `friends`.

**Ожидание ИИ без предохранителя** — в обоих чатах нет клиентского таймаута вокруг
`callPremiumDialogSend`; при зависании SDK «печатает…» крутится бесконечно.

---

## 3. МЕЛОЧЬ

- [lesson1.tsx:1692](app/lesson1.tsx:1692) — кнопка «Далее» без синхронного ref-guard (у `checkAnswer` он есть).
- [lesson1.tsx:997](app/lesson1.tsx:997) — урок с нулём фраз = вечный скелетон вместо пустого состояния.
- [trainer_words_session.tsx](app/trainer_words_session.tsx) — кнопки ✓/✕ без «уже свайпнуто» флага.
- [flashcards_audio.tsx:614](app/flashcards_audio.tsx:614) — ошибка озвучки = обычное завершение, пользователь не узнает.
- [CleanOnboarding.tsx:1233](components/CleanOnboarding.tsx:1233) — отмена входа Google/Apple молча (в `RegistrationPromptModal` сделано правильно).
- [ideas_submit.tsx](app/ideas_submit.tsx) — черновик идеи (до 2000 знаков) не сохраняется.
- [language_welcome.tsx:239](app/language_welcome.tsx:239) — пустой `<View/>` при невалидном target.
- [UpdateModal.tsx](components/UpdateModal.tsx) — отключён, но остался вторым «обновите приложение» рядом с `ForceUpdateGate`.

---

## 4. Инфраструктура состояний — системные выводы

**Офлайн-баннер** смонтирован ровно один раз глобально — [_layout.tsx:3274](app/_layout.tsx:3274).
Это правильно. Но он **не проходит через `OverlayArbiter`** и живёт на голом `zIndex: 9999`,
конкурируя за верхнюю полосу с `MaintenanceGate` (тоже 9999, тоже верхний баннер).

**Единого механизма тостов нет — их пять параллельных:**
1. `action_toast` через шину событий — ~138 вызовов в 42 файлах (это де-факто стандарт);
2. `AchievementToast` — через React Context;
3. `DailyTaskRewardToast` — собственные топики событий;
4. `CoachToast` — локальный `useState`, продублирован в 4 экранах;
5. `MedalToast` / `InGameToast` — по одной точке вызова, недоступны извне.

Автор новой фичи вынужден угадывать, какой из пяти использовать.

**Арбитр оверлеев** ([overlay_arbiter_core.ts](components/overlay_arbiter_core.ts)) сделан
добротно: один активный слот, приоритеты, вотчдог 15 с против «залипания», пауза 360 мс
между нативными модалками. Но участие в нём добровольное — `OfflineBanner`, `MedalToast`,
`InGameToast`, `MaintenanceGate` и `ForceUpdateGate` его не используют.

**ErrorBoundary** накрывает всё приложение ([_layout.tsx:3330](app/_layout.tsx:3330)) плюс
отдельно `trainer.tsx`. Тяжёлые экраны (арена, флешкарты, экзамен, диагностика, клуб)
своей границы не имеют — их краш роняет весь интерфейс. Кнопка «Повторить» лишь сбрасывает
флаг ошибки: если состояние сломано устойчиво, ошибка возвращается мгновенно.

---

## 5. Что уже сделано образцово (брать за эталон)

- **Оптимистичные траты с откатом:** `shards_shop`, `daily_tasks_screen` (рероллы и клейм трио),
  `club_screen` (групповой буст), `referrals` (спин рулетки), `streak_stats` (заморозка).
- **Ошибки с классификацией и retry:** `ai_dialog_session` (разбор кода ошибки, локализованный
  текст, кнопка повтора только там, где повтор осмыслен), `promo_code_entry` (покрыты все статусы сервера).
- **Загрузка/ошибка/пустота честно разделены:** `lesson1`, `trainer_phrases_session`,
  `diagnostic_test`, `flashcards_audio`, `pack_opening`.
- **Защита от гонок:** `survey_screen` (`requestActiveRef` + `attemptIdRef` — поздний ответ
  не затирает свежий), `flashcards_swipe` (`settlingRef` + страховочный таймер 260 мс).
- **Восстановление после прерывания:** `flashcards_swipe` (черновик сессии + выбор
  «продолжить / заново»), `lesson1` (сквозной write-through в AsyncStorage),
  `flashcards_arena` (сохранение забега при размонтировании).
- **Удаление с отменой:** `flashcards_collection` (5-секундный undo, перечитывает диск,
  чтобы не стереть остальные карточки).
- **Синхронная гидрация без спиннеров:** `home`, `account_details`, `lesson_menu`.

---

## 6. Предлагаемый порядок работ

**Волна 1 (риск для пользователя, ~точечные правки):**
1.1 три вечных скелетона · 1.2 зависание тренажёра слов · 1.3 награда достижения ·
1.4 молчание при смене подписки · 1.5 мёртвая кнопка билета · 1.6 ошибка ИИ в диалоге ·
1.8 переключатели настроек.

**Волна 2 (правда вместо тишины):** отличить «ошибку» от «пусто» там, где сейчас одинаково
(лента друзей, топ помощников, расписание турниров, теория плана, урок слов); показать
`friendCodeLoadError`; починить `void type` в `InGameToast`; статус подписки на комнату турнира.

**Волна 3 (единообразие):** скелетоны вместо спиннеров и голого текста; выбрать `action_toast`
единственным стандартом тостов и свести к нему остальные; подключить офлайн-баннер и гейты
к арбитру оверлеев; добавить локальные `ErrorBoundary` на тяжёлые экраны; pull-to-refresh
там, где данные не realtime.
