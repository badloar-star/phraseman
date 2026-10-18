# Опись полноэкранных экранов-ошибок на HEAD 4a2975acf (18.10 ~10:55, Сверка; код не правила)

Основание: docs/work/tasks/fullscreen-error-states-2026-10-18.md (коммит 1f301272d, 45 мест). Метод: чтение кода на HEAD по каждому месту (условие показа и что рисуется сейчас), журнал причины [NO-ERROR-SCREEN]. Кадров на эмуляторе не снималось (эмулятор у Авторизации) — вердикт «по коду».

Обозначения: ✅ убрано (экран заменён спокойным пустым состоянием, скелетом или тихим уходом); ⏳ осталось (файл:строка); 🔒 едет после релиза по R166 (release-ledger-2026-10-15.md, строка R166: «экраны-ошибки тренировок Карточек и Видео, кэш youtube»; релиза сегодня нет — R167). ✅🔒 = в коде уже сделано (7ac005ecf, 09:17), но в релиз попадёт после. ➖ = не ошибка (замок, язык, экзамен по прогрессу) — оставлено намеренно.

| № | Место из описи | Было | Статус | Что на HEAD (файл:строка) |
|---|---|---|---|---|
| 1 | app/dialogue_v2_briefing.tsx:315 | «Диалоги недоступны», «Назад» | ✅ | DialogueHubRedirect (тихо в хаб), :311–324, причины unsupported_target / no_model |
| 2 | app/dialogue_v2_session.tsx:807 | «Диалоги недоступны» (в т.ч. закрыт рангом) | ✅ | DialogueHubRedirect reason=locked / no_model, :830–845 |
| 3 | app/dialogue_v2_session.tsx:771 | «Диалоги на паузе» | ✅ | DialogueHubRedirect reason=paused, :803–815 |
| 4 | app/dialogue_v2_freeform.tsx:437 | «Не удалось продолжить разговор» | ✅ | после тихих повторов DialogueHubRedirect reason=start_failed, :485–497 |
| 5 | components/dialogs/DialogueV2CatalogueContainer.tsx:285–330 (HubNotices:66) | «Диалоги на этом языке ещё проверяются», замок, «К урокам» | ➖🔒 | остаётся спокойная карточка языка внутри хаба (gateHub, :296–306, :326) — не экран-ошибка, решение D129/D130; пункт «карточка ещё проверяются» вынесен в R166 |
| 6 | app/ai_dialog_briefing.tsx:49 | «Диалог не найден» | ✅ | MissingDialogueScreen = пустой фон + useSilentLeave (ba006b94b), :53–58 |
| 7 | app/ai_dialog_briefing.tsx:217, :238 | «Диалоги недоступны» / «Этот диалог пока закрыт» | ✅ (стор), ⏳ (dev) | сироты: useOrphanDialogRouteRedirect → в сторе уход на Главную (:64–65); экран рисуется только в dev (:205–228) |
| 8 | app/ai_dialog_session.tsx:2170, :3720; app/ai_companion_session.tsx:349 | то же | ✅ (стор), ⏳ (dev) | orphan_dialog_route_redirect.ts: в сторе blocked=true → return null (ai_dialog_session:3718–3719, ai_companion_session:701–702); в dev видны ai_dialog_session:2170 и ai_companion_session:349 |
| 9 | app/flashcards/SavedCollectionStates.tsx:96–140 | «Сейчас недоступно / Попробовать снова» | ✅ | тихо: скелет → SavedCollectionEmpty («Пока пусто»), без кнопки, :74–89; журнал [CARDS-LOAD] state:render |
| 10 | app/flashcards/PackOpenFailedView.tsx:35 | «Не удалось загрузить / Повторить» | ✅ | QuietEmptyState + «Назад», тихий повтор через useLoadGate, :16–30 |
| 11 | app/flashcards/TrainingSetupV2.tsx:254 | «Сейчас недоступно / Проверь интернет» | ✅ | QuietEmptyState reason=setup_decks_exhausted, :254–258 |
| 12 | app/flashcards/TrainingSetupV2.tsx:257 | «Режим недоступен» | ✅ | QuietLeave (тихий возврат), :259 |
| 13 | app/flashcards_swipe.tsx:4399 | «Нет карточек…» + текст ошибки | ✅🔒 | при loadError — useSilentLeave prepare_failed, :4439; без ошибки остаётся обычное «Нет карточек для тренировки» (не ошибка) |
| 14 | app/flashcards_blitz_session.tsx:1313 | «Тренировка не открылась» + «Попробовать снова» | ✅🔒 | автоповторы, затем useSilentLeave quota_unavailable_after_retries, :1313–1322 |
| 15 | app/flashcards_speaking_session.tsx:1520 | то же | ✅🔒 | useSilentLeave после повторов, :1415 |
| 16 | app/flashcards_speaking_session.tsx:1463 | «Распознавание речи не работает» | ✅🔒 | useSilentLeave speech_recognition_unavailable_on_device, :1416 (текст остался только в комментариях) |
| 17 | app/flashcards_recall_session.tsx:930 | «Сейчас недоступно / Попробовать снова» | ✅🔒 | useSilentLeave при loadExhausted без карточки, :344 |
| 18 | app/flashcards/MyPacksV2.tsx:251 | «Сейчас недоступно / Повторить» | ✅ | QuietEmptyState reason=load_exhausted, :253 (1f6dbee61) |
| 19 | app/flashcards/FlashcardsCategoryHub.tsx:1022–1035 | «Нет сети» | ✅ | catalogOfflineEmpty → спокойное пустое [NO-ERROR-SCREEN] community_offline_empty, :519–524 (3f0a5d7f4); отдельное состояние «Нет сети» по макету e4e4149d0 остаётся — решение Макетов |
| 20 | app/flashcards_video_packs.tsx:541 | «Сейчас недоступно / Проверь интернет» | ✅🔒 | branch error → logNoErrorScreen quiet_empty, :526 |
| 21 | app/flashcards_card_editor.tsx:688 | «Карточка не найдена / Назад» | ✅ | тихие повторы + QuietLeave, :211–222, :707 (1f6dbee61) |
| 22 | app/pack_opening.tsx:597 | «Сейчас недоступно / Набор не найден» + «Назад» | ✅ | QuietLeave + повторы, :428, :617; тексты ошибок в setError (:465, :498) больше не рисуются |
| 23 | app/community_pack_create.tsx:1063 | «Набор недоступен для редактирования» | ✅ | тихие повторы + QuietLeave, :461 |
| 24 | app/community_pack_create.tsx:1043 | «Создание наборов пока недоступно» | ✅ | canUse = true константой (:355) — ветка мертва |
| 25 | app/community_packs/PackCommentsSheet.tsx:919 | «Не удалось загрузить комментарии / Повторить» (тело шторки) | ✅ | commentsLoadFailedEmpty → тихий повтор + quiet_empty, :212–223 (3f0a5d7f4) |
| 26 | app/lingman_videos.tsx:838 | «Не удалось загрузить каталог…» + «Повторить» | ✅🔒 | «Пока пусто · Обновим, как появится связь» (quietEmptyTitle / quietEmptyDetail), :838–852; журнал [NO-ERROR-SCREEN] lingman_videos |
| 27 | app/lingman_videos.tsx:749 (вызовы :835, :861) | «На этом языке пока нет роликов / Повторить» | ✅🔒 | noVideosPanel без кнопки (плитка + текст, обновление потягиванием), :759–768; текст — состояние языка, не ошибка |
| 28 | app/lingman_playlist.tsx:141 | «Плейлист грузится дольше обычного / Повторить» | ✅🔒 | slowView → «Пока пусто · Обновим…», тихий повтор при возврате в приложение, :80–95 |
| 29 | app/lingman_playlist.tsx:148 | «В этом плейлисте пока нет роликов / Повторить» | ✅🔒 | то же (videosSettledEmpty), без «Повторить» |
| 30 | components/spire/SpireHomeScreen.tsx:266, 269, 270 (SpireLockedState) | «Пик откроется чуть позже» / «Нет интернета» | ⏳ | components/spire/SpireHomeScreen.tsx:266 (язык не ru/uk), :269 (не unlocked: конфиг выключен или не прочитан), :270 (paused без кэша) всё ещё рисуют SpireLockedState на всю вкладку; офлайн-вариант (prop offline) в этих трёх вызовах не передаётся. Языковой замок — решение, но :269 и :270 при сбое или паузе — экран-заглушка |
| 31 | components/learning-v2/LearningV2SessionUnavailable.tsx:69 | «Сессия недоступна…» + «Назад» | ✅ | silentExit = !retry → onClose() после первого кадра, вид только в авторском превью, :49–62 (46f7b20cf) |
| 32 | app/learning-v2/session/[id].tsx:1308 | голый «Сессия недоступна» | ✅ | [NO-ERROR-SCREEN] learning_v2_session_route, :1316 (b3cd64124) |
| 33 | components/level-exam/LevelExamV2.tsx:454 | «Зачёт пока недоступен» | ✅ (ошибки), ➖ (замок) | при identity, content или ошибке доступа — useSilentLeave, :452–457; экран «Зачёт пока недоступен» остаётся только для замка Plus или уровня (после :458) — не ошибка |
| 34 | app/diagnostic_test.tsx:1438 | «Сейчас недоступно / Попробовать снова» | ✅ | useSilentLeave questions_unavailable_after_retries, :1412 |
| 35 | app/lesson1.tsx:4096 | «Не удалось загрузить французский урок» | ✅ | useSilentLeave на frenchLessonRemoteFailed, :4079–4090 |
| 36 | app/lesson1.tsx:4128 | «Французский пакет не загружен…» | ✅ | то же (frenchLessonSourceGateBlocked), :4080–4107 |
| 37 | app/lesson_irregular_verbs.tsx:735 | «Тренировка не открылась…» без кнопки | ✅ | useSilentLeave irregularSilentLeave, :677, :742 |
| 38 | app/mistake_practice_session.tsx:1441 | «Сейчас недоступно / Попробовать снова» | ✅ | useSilentLeave, :1418; при ошибке рисуется пустая рамка, :1447–1450 |
| 39 | app/mistakes_hub.tsx:261 | «Сейчас недоступно / Проверь интернет» | ✅ | режим failed → calm_empty + повторы [NO-ERROR-SCREEN] mistakes_hub, :137–143 |
| 40 | app/mistake_detail.tsx:221 | «Эта ошибка больше не отслеживается» | ✅ | useSilentLeave при detail missing, :178 |
| 41 | app/streak_stats.tsx:2383 | «Сейчас недоступно / Попробовать снова» | ✅ | «Пока пусто · Обновим, как появится связь» + повторы [NO-ERROR-SCREEN] streak_stats, :2148–2180, :2412 |
| 42 | app/diagnostic_test.tsx:807, app/exam.tsx:366, app/level_exam.tsx:548 | французские «…ещё готовится» | ✅ | useSilentLeave french_gate_closed: diagnostic :1412, exam :867, level_exam :954 |
| 43 | app/exam.tsx:1011 (рядом :1014) | «Экзамен недоступен» (замок по прогрессу) | ➖ | замок по прогрессу, не ошибка; текст остаётся, exam.tsx:1014 |
| 44 | components/friends/FriendsEmptyState.tsx:77 (friends.tsx:2419, :2480) | «Связь пропала / Список сохранён…» + «Повторить» | ✅ | тихое пустое состояние «Учиться вместе приятнее / Добавить друга», error только для журнала [NO-ERROR-SCREEN] friends_tab, :16–28 |
| 45a | components/ErrorBoundary.tsx:38 (render :164, _layout.tsx:4161) | «Что-то пошло не так / Попробовать снова» | ⏳ | components/ErrorBoundary.tsx:45–47 (getDerivedStateFromError :110, render :164) — экран при исключении отрисовки остаётся; убрать целиком нельзя (приложение не может нарисовать сломанное дерево), возможен только мягкий автоперезапуск экрана — решение координатора |
| 45b | app/_layout.tsx:3934 (по HEAD :4046) | «Аккаунт заблокирован / Проверить снова» | ⏳ | app/_layout.tsx:4046 (isBanned) — серверный бан, не ошибка загрузки; оставить по смыслу или решить отдельно |
| 45c | components/MaintenanceGate.tsx:135 (по HEAD :123) | «Технические работы» | ⏳ | components/MaintenanceGate.tsx:123 — remote-config, блокирующее окно (не ошибка, управляется сервером) |
| 45d | components/PhoneStateRecoveryScreen.tsx:87 (по HEAD :48) | «Восстанавливаем сохранение» | ⏳ | components/PhoneStateRecoveryScreen.tsx:48 — идущий процесс восстановления, не ошибка (но полноэкранный) |
| 45e | components/ForceUpdateGate.tsx:193 (по HEAD :198) | окно «пора обновить» | ➖ | components/ForceUpdateGate.tsx:198 — не ошибка, блокирует по кампании или версии |
| 45f | app/+not-found.tsx | перенаправление на Главную | ✅ | экрана нет (только redirect) |

## Итог

- ✅ убрано: 38 из 45 мест (из них ✅🔒 — 13: тренировки Карточек, Видео и плейлисты, видео-наборы — по R166 уезжают в релиз позже; в коде уже есть с 7ac005ecf).
- ➖ не ошибка, оставлено намеренно: 4 (карточка языка Диалогов №5, «Зачёт пока недоступен» как замок №33, «Экзамен недоступен» №43, окно обновления №45e).
- ⏳ осталось: Пик (SpireHomeScreen.tsx:266, :269, :270 — SpireLockedState на всю вкладку) и четыре глобальных: ErrorBoundary.tsx:45–47, _layout.tsx:4046 («Аккаунт заблокирован»), MaintenanceGate.tsx:123, PhoneStateRecoveryScreen.tsx:48.
- Старые диалоги (№7, №8): в сторе уходят на Главную; в dev экраны рисуются — человека не касается.
- Раздел описи «со словом недоступно, но не на весь экран (для справки)» не проверялся.
