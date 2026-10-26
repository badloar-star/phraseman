# CODEX: звук в Learning V2 — что найдено и что доделать (19.10)

## Симптомы (владелец, TestFlight + dev-iPhone)
1. Фраза в задании или карточке слова звучит ~0,5 с и обрывается.
2. Под иконкой звука висит «Звучит…», «озвучить ещё раз» не нажимается.
3. После сворачивания в трей и возврата звука в приложении нет вообще.
4. listen_choose: «Нажми, чтобы послушать» не нажимается (будто это не кнопка). Случилось на 2-м уроке, на 1-м не было.
5. Беззвучный режим iPhone ни при чём: озвучка обязана звучать и при нём.

## Причины по логам [V2-AUDIO-TRACE] (.expo/metro-console.log)
- **A. Двойной старт.** Эффект в `app/learning_v2_direct_session_player_v1.tsx` (~стр. 957, `audioRequest && audioStatus.isLoaded`) срабатывает дважды: первый раз на устаревшем `isLoaded`, второй после загрузки. Второй `playFromStart` заново брал аренду, арбитр отзывал первую, revoke делал `player.pause()`, и фраза гасла на 0,47 с из 1,49 с.
- **B. «Звучит…» навсегда.** Если плеер остановился без `didJustFinish` (pause/revoke), состояние оставалось `playing`.
- **C. После фона всё виснет.** Видно `managed:play_from_start`, а `managed:played` нет. Цепочка `transitionTail` в `app/audio_session_coordinator.ts` ждёт нативный `setAudioModeAsync`, который после фона не отвечает, поэтому `whenSpokenAudioReady` и все следующие озвучки ждут вечно. Аудиосессию iOS при возврате никто не активирует.
- **D. listen_choose.** Скорее всего та же причина C: нажатие идёт через тот же путь `playLocalAudio`/managed-плеер и висит. После правки C проверить; если не нажимается и после неё — трассировать обработчик кнопки (disabled, или pointerEvents пока state=playing).

## Что УЖЕ сделано (не закоммичено, в рабочем дереве)
1. `hooks/use_managed_spoken_audio_player.ts`:
   - если живая аренда уже есть (`claimRef.current.isCurrent()`), повторный `playFromStart` не перезахватывает её, а делает `seekTo(0)` и `play()` (лечит A);
   - `stop(reason?)` пишет причину;
   - временные логи `[V2-AUDIO-TRACE] managed:*`.
2. `app/learning_v2_direct_session_player_v1.tsx`:
   - в эффекте статуса `localAudioPlayback`, если `state === "playing"`, а плеер не играет и нет `didJustFinish`, ставится `idle` (лечит B);
   - на `stop_current_audio` (в `dispatchNewWordEvent`) добавлен `setLocalAudioPlayback(null)`;
   - временные логи `[V2-AUDIO-TRACE] status` и `play_local_audio`.
3. `app/audio_session_coordinator.ts`:
   - `setAudioModeAsync` гонится с таймаутом 1500 мс; при таймауте пишется лог `[SOUND-AUDIT] audio_mode:timeout` и цепочка идёт дальше (лечит C);
   - запоминается `lastRequestedMode`;
   - НОВАЯ функция `reactivateAudioSessionOnForeground()`: вызывает `setIsAudioActiveAsync(true)` и заново применяет последний режим.

## Что ДОДЕЛАТЬ
1. **Подключить** `reactivateAudioSessionOnForeground()` в `app/_layout.tsx`, в обработчике AppState `'active'` (~стр. 1693, рядом с `stopAllAudioOwnersOnResume()` / `releaseStaleAudioActivity`). Вызывать ПОСЛЕ них. Импорт из `./audio_session_coordinator`. **Это ещё не сделано.**
2. Желательно добавить таймаут (~2 с) на `whenSpokenAudioReady(claim)` и на `player.seekTo(0)` в хуке. Если не дождались, писать лог и всё равно делать `play()`, чтобы ни одна озвучка не могла повиснуть навсегда.
3. Проверить, что `stopAllAudioOwnersOnResume()` при возврате снимает зависшие аренды и сбрасывает `localAudioPlayback` (иначе «Звучит…» висит после фона).
4. Проверить типы (`tsc` только один на ПК, мало RAM) и прогнать jest по аудио (`--maxWorkers=1`).
5. Прогнать на dev-iPhone: урок 1 и урок 2, карточка нового слова, «озвучить ещё раз», listen_choose «Нажми, чтобы послушать», затем свернуть, развернуть и проверить ещё раз. Также проверить в беззвучном режиме (SPOKEN_AUDIO_MODE должен иметь `playsInSilentMode: true`).
6. После подтверждения убрать временные `[V2-AUDIO-TRACE]`. Логи в catch и ранних выходах оставить. Коммит через safe_commit (без timeout, фоном).
7. Новый билд EAS (iOS 136 и далее) с этими правками.

## Отдельно открыто
- TestFlight 134/135 на другом iPhone сразу показывает «Что-то пошло не так». Причина неизвестна; нужен Crashlytics (вход владельца) или сборка, которая показывает текст ошибки.

## Добавлено 19.10 (координатор, вторая часть)
СДЕЛАНО, не закоммичено (в этих файлах есть и чужие правки — коммитить вместе):
- `modules/learning-v2/modes/listen_choose_mode_v1.tsx`, `listen_build_dictation_mode_v1.tsx`:
  - кольцо-Svg поверх большой круглой кнопки обёрнуто в `<View pointerEvents="none">`. На iOS корневой Svg игнорировал pointerEvents и съедал нажатие — повтор озвучки был невозможен;
  - иконка всегда `volume-high` (динамик);
  - кольцо заполняется за `fillMs = learningV2RingFillMsForPhraseV1(текст)` вместо фиксированных 1500 мс.
- `modules/learning-v2/modes/mode_motion_tokens_v1.ts`: новая функция `learningV2RingFillMsForPhraseV1`: слова × 420 мс + 300, в пределах 900…8000.

ОТКРЫТО (владелец просил быстро, у меня кончились токены):
1. **«Пиликалки» при правильном ответе в Learning V2 — убрать.** В коде уроков V2 прямых звуков нет: `correct` заглушён в `modules/sound_v2/legacy_bridge.ts` (MUTED_SOUND_V2_EVENTS), `fk.correct()` немой. Кандидаты: `components/session_attempts/SessionAttemptsHud.tsx` (`pm.hearts.restored` / `pm.hearts.lost`), `ComboRing` (lightning). Нужен лог `[SOUND-AUDIT]`/soundDirector на iPhone: какое событие звучит в момент верного ответа. Его и выключить.
2. **В начале урока иногда снимается сердечко.** Проверить, где списывается попытка при старте сессии (session_attempts domain и вход в урок V2). Лог: кто и когда уменьшает remaining (стек вызова).
3. **Монеты прилетели на главной в счётчик, а число не изменилось.** Анимация полёта есть, а начисление (или обновление счётчика) не прошло. Проверить: пишется ли награда в кошелёк (локально и в сервер), подписан ли счётчик на главной на свежее значение, и не затирает ли его поздний ответ сервера (last-write-guard). Сначала логи `[COINS-AWARD]`: сумма, источник, до/после, ответ сервера.

## МОНЕТЫ ЗА ЗАНЯТИЕ V2 — ПРИЧИНА НАЙДЕНА ПО ЛОГУ (19.10 12:55)
- Лог: `[COINS-AWARD] finish:eligibility {"targetLanguage":"en","canEarnSessionRunes":true,"hasReadyHandle":true}` → через 8 с `commit:ok {"status":"applied","amountSubunits":590000}`. Затем `[COIN-PILL] home wallet_cache value 513`, то есть баланс тот же.
- **Причина:** `commitLearningV2SessionRuneRewardCompositeV1` (`app/learning_v2_owner_repository_runtime.ts`) пишет в КОШЕЛЁК КУРСА (`learning_v2_wallet_balance_store`, подъединицы, 10000 за руну). Счётчики Главной и Уроков с 23.08 читают ОБЩИЙ кошелёк `readUnifiedLevelSpinStars` (`app/level_spin_star_grants.ts`, `progress.stars`). Туда кошелёк курса НЕ входит вообще: в файле нет ни одного упоминания learning_v2/walletState. Монеты за занятие V2 начисляются в кошелёк, которого пользователь не видит и не может потратить.
- **Что сделать:** после `commit:ok` (status applied) зачислить те же руны в общий кошелёк через единственного писателя `level_spin_star_grants.ts`. Путь как у практики: `commitPracticeRuneGrantLocally` / `practice_rune_settlement.ts`, идемпотентно по operationId = id квитанции курса, чтобы повтор не начислил дважды. Либо сделать так, чтобы `readUnifiedLevelSpinStars` учитывал кошелёк курса (но тогда и траты должны из него списывать). Решение экономическое — нужен советник (Opus) и тест `tests/economy_constitution_contract.test.ts`.
- **10 с нуля на экране завершения:** финал ждёт `await commitSessionRuneReward()` (~8 с, монтирование репозитория). Показывать сумму сразу из `runeReward` (кандидат знает amountSubunits), а квитанцию подтверждать фоном.
- Сердечко в начале занятия: ИСПРАВЛЕНО (`clearSessionAttemptsState` при finish в V2-плеере).
