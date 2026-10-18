# Полноэкранные состояния-ошибки — опись (Ревизор, 18.10 ~08:00)

Запрос координатора 07:47. Владелец, увидев «Диалоги недоступны»: «такого не должно быть» (правило 01.10 — экранов-ошибок нигде).

- Это только опись, правок в коде нет.
- Источник — чтение кода на HEAD.
- Обозначения: **yes** — весь экран; **whole-tab** — вся вкладка; **sheet body** — тело шторки.
- Всё достижимо в сторовой сборке, если не сказано иное.

## Диалоги
- `app/dialogue_v2_briefing.tsx:315` (экран 118–141) — «Диалоги недоступны», облако, «Назад».
  - Когда: model не построился. **yes**
- `app/dialogue_v2_session.tsx:807` — «Диалоги недоступны», облако, «Назад».
  - Когда: `!model || !model.unlocked`, в том числе диалог закрыт рангом. **yes**
- `app/dialogue_v2_session.tsx:771` — «Диалоги на паузе / Собеседники сейчас недоступны. Загляни чуть позже.», облако.
  - Когда: сервер ответил reason `paused` (стр. 594). **yes**
- `app/dialogue_v2_freeform.tsx:437` — «Не удалось продолжить разговор», облако, «Повторить».
  - Когда: `unavailable` после тихих повторов старта (стр. 177). **yes**
- `components/dialogs/DialogueV2CatalogueContainer.tsx:285–330` (текст `DialogueV2HubNotices.tsx:66`) — «Диалоги на этом языке ещё проверяются», замок, «К урокам».
  - Когда: язык не поддержан или 0 сценариев. **whole-tab**
- Старые экраны. В сторе они уводят на Главную (`useOrphanDialogRouteRedirect`) и видны только в dev:
  - `app/ai_dialog_briefing.tsx:49` — «Диалог не найден»;
  - `app/ai_dialog_briefing.tsx:217` — «Диалоги для этого языка пока недоступны»;
  - `app/ai_dialog_briefing.tsx:238` — «Этот диалог пока закрыт»;
  - `app/ai_dialog_session.tsx:2170` и `app/ai_dialog_session.tsx:3720`;
  - `app/ai_companion_session.tsx:349`.

## Карточки / Наборы
- `app/flashcards/SavedCollectionStates.tsx:96–140` (вызов `flashcards_collection.tsx:1707`) — «Сейчас недоступно / Проверь интернет / Попробовать снова», облако.
  - Когда: `loadError && (gate.exhausted || deviceOffline)`. **whole-tab**
- `app/flashcards/PackOpenFailedView.tsx:35` (вызов `flashcards_collection.tsx:1541`) — «Не удалось загрузить / Проверь интернет / Повторить», облако.
  - Когда: `deeplinkCardsState === 'failed'`. **yes**
- `app/flashcards/TrainingSetupV2.tsx:254` — «Сейчас недоступно / Проверь интернет», облако.
  - Когда: статус `unavailable` (`flashcards_training_setup.tsx:742–750`). **yes**
- `app/flashcards/TrainingSetupV2.tsx:257` — «Режим недоступен».
  - Когда: режим не задан или `loadErrorKind` не `load`. **yes**
- `app/flashcards_swipe.tsx:4399` — «Нет карточек для тренировки» + текст ошибки, облако.
  - Когда: `showQuickNoCards` при `loadError`. **yes**
- `app/flashcards_blitz_session.tsx:1313` — «Тренировка не открылась. Попробуй ещё раз.» + «Попробовать снова», облако.
  - Когда: `quotaUnavailable` — отказ квоты или энергии либо сработал watchdog. **yes**
- `app/flashcards_speaking_session.tsx:1520` — то же.
  - Когда: `quotaUnavailable`. **yes**
- `app/flashcards_speaking_session.tsx:1463` — «Распознавание речи не работает на этом устройстве».
  - Когда: `speechNa`. **yes**
- `app/flashcards_recall_session.tsx:930` — «Сейчас недоступно / Попробовать снова».
  - Когда: `!activeCard && loadExhausted`. **yes**
- `app/flashcards/MyPacksV2.tsx:251` (условие `flashcards_my_packs.tsx:891`) — «Сейчас недоступно / Повторить».
  - Когда: 0 наборов, загрузка не `ready`, ворота исчерпаны. **yes**
- `app/flashcards/FlashcardsCategoryHub.tsx:1022–1035` — «Нет сети», облако.
  - Когда: каталог сообщества пуст и `communityOffline`. **whole-tab**
- `app/flashcards_video_packs.tsx:541` (внутри вкладки Видео) — «Сейчас недоступно / Проверь интернет / Попробовать снова».
  - Когда: `branch === 'error'`. **whole-tab**
- `app/flashcards_card_editor.tsx:688` — «Карточка не найдена / Назад».
  - Когда: `notFound`, в том числе сбой загрузки. **yes**
- `app/pack_opening.tsx:597` — «Сейчас недоступно», «Не удалось открыть набор…» или «Набор не найден» + «Назад».
  - Когда: `error || !pack`. **yes**
- `app/community_pack_create.tsx:1063` — «Набор недоступен для редактирования».
  - Когда: `isEditMode && loadErr`. **yes**
- `app/community_pack_create.tsx:1043` — «Создание наборов пока недоступно.»
  - Когда: `!canUse`. **yes**
- `app/community_packs/PackCommentsSheet.tsx:919` — «Не удалось загрузить комментарии / Повторить».
  - Когда: пусто и `loadFailed`. **sheet body**

## Видео
- `app/lingman_videos.tsx:838` — «Не удалось загрузить каталог…», облако, «Повторить».
  - Когда: `catalogExhausted && !catalog && !snapshot`. **whole-tab**
- `app/lingman_videos.tsx:749` (вызовы :835, :861) — «На этом языке пока нет роликов / Повторить».
  - Когда: нет канала языка или 0 роликов. **whole-tab**
- `app/lingman_playlist.tsx:141` — «Плейлист грузится дольше обычного / Повторить».
  - Когда: `view === 'slow'`. **yes**
- `app/lingman_playlist.tsx:148` — «В этом плейлисте пока нет роликов / Повторить».
  - Когда: `videosSettledEmpty`. **yes**

## Пик / Шпиль
- `components/spire/SpireHomeScreen.tsx:266, 269, 270` (`SpireLockedState.tsx`) — «Пик откроется чуть позже», при офлайн-конфиге «Нет интернета».
  - Когда: язык не ru/uk, конфиг выключен или не читается, комната `paused` без кэша. **whole-tab**

## Обучение V2 и уроки
- `components/learning-v2/LearningV2SessionUnavailable.tsx:69` (вызовы `learning_v2_direct_session_player_v1.tsx:2659`, `:2741`) — «Сессия недоступна / Материал занятия не собрался…», облако, «Назад».
  - Когда: нет координат маршрута или пусты `run`/`runSummary`/`readyHandle`. **yes**
- `app/learning-v2/session/[id].tsx:1308` — голый текст «Сессия недоступна».
  - Когда: старый путь, `!session` или нет intro. **yes**
- `components/level-exam/LevelExamV2.tsx:454` — «Зачёт пока недоступен / Экзамен не открылся…», замок.
  - Когда: `blocked` / `identityUnavailable` / `contentUnavailable`. **yes**
- `app/diagnostic_test.tsx:1438` — «Сейчас недоступно / Попробовать снова».
  - Когда: `questionsUnavailable`. **yes**
- `app/lesson1.tsx:4096` — «Не удалось загрузить французский урок / Повторить».
  - Когда: `frenchLessonRemoteFailed`. **yes**
- `app/lesson1.tsx:4128` — «Французский пакет не загружен…».
  - Когда: `frenchLessonSourceGateBlocked`. **yes**
- `app/lesson_irregular_verbs.tsx:735` — «Тренировка не открылась. Вернись к уроку…», без кнопки.
  - Когда: `!activeVerb`. **yes**
- `app/mistake_practice_session.tsx:1441` — «Сейчас недоступно / Попробовать снова».
  - Когда: `loadError`. **yes**
- `app/mistakes_hub.tsx:261` — «Сейчас недоступно / Проверь интернет».
  - Когда: `mode === 'failed'`. **yes**
- `app/mistake_detail.tsx:221` — «Эта ошибка больше не отслеживается».
  - Когда: `detail === 'missing'`. **yes**
- `app/streak_stats.tsx:2383` — «Сейчас недоступно / Попробовать снова».
  - Когда: `!statsReady && statsUnavailable`. **whole-tab**
- Французские заглушки «…ещё готовится»: `app/diagnostic_test.tsx:807`, `app/exam.tsx:366`, `app/level_exam.tsx:548`.
  - Когда: только `fr` при закрытом gate. **yes**
- `app/exam.tsx:1011` — «Экзамен недоступен».
  - Когда: замок по прогрессу, это не ошибка. **yes**

## Пейвол / Магазин
- Полноэкранных нет.

## Друзья / Сообщество
- `components/friends/FriendsEmptyState.tsx:77` (`friends.tsx:2419`, `:2480`) — «Связь пропала / Список сохранён на устройстве…», облако, «Повторить».
  - Когда: `friendsListError` при пустом списке. **whole-tab**

## Профиль / Настройки
- Полноэкранных нет.

## Глобальные
- `components/ErrorBoundary.tsx:38` (render :164, `_layout.tsx:4052`) — «Что-то пошло не так / Попробовать снова».
  - Когда: исключение при отрисовке. **yes**
- `app/_layout.tsx:3934` — «Аккаунт заблокирован / Проверить снова».
  - Когда: `isBanned`. **yes**
- `components/MaintenanceGate.tsx:135` — «Технические работы».
  - Когда: remote-config. **yes**
- `components/PhoneStateRecoveryScreen.tsx:87` — «Восстанавливаем сохранение».
  - Когда: идёт восстановление сохранения. **yes**
- `components/ForceUpdateGate.tsx:193` — окно «пора обновить».
  - Когда: требуется обновление. Это не ошибка, но окно блокирует. **yes**
- `app/+not-found.tsx` — только перенаправление на Главную, экрана нет.

## Не на весь экран, но со словом «недоступно» (для справки)
- `app/flashcards/SavedTopCommunityPacks.tsx:238`
- `app/flashcards_swipe.tsx:3695`
- `app/(tabs)/lessons.tsx:3691`, `:6296`
- `app/dialogue_v2_completion.tsx:552`
- `app/ai_dialog_client.ts:237` — старый путь.
- `components/paywall/PaywallPlus.tsx:279` — «Магазин недоступен на этом устройстве».
- `components/spire/SpireHomeScreen.tsx:308`
- `components/spire/SpireClimbDock.tsx:101`
- `components/spire/SpireResultPanel.tsx:54`
- `components/profile-card/profile_card_copy.ts:80`

## После релиза — не начато (сессия «Моменты», стоп-план 18.10 08:17)
Задача от Координатора 08:00/08:22, не начата до стопа — правок в коде нет:
- Карточки, режимы тренировки: `flashcards_swipe.tsx:4399`, blitz `:1313`, speaking `:1520/:1463`, recall `:930` — замена экранов-ошибок по `C:/Temp/claude/no_error_screens_rule.txt`.
- Видео: `lingman_videos.tsx:838/:749`, `lingman_playlist.tsx:141/:148` — вместо ошибки показывать кэш.
- 💸 `app/youtube_catalog_client.ts` (≈154 чтения на загрузку каталога): кэш на диске 24 ч, сеть только при пустом/устаревшем кэше или по явному обновлению, журнал `[COST-CUT] youtube_catalog hit/miss/age`. Делать вместе с Видео — это одно место.
