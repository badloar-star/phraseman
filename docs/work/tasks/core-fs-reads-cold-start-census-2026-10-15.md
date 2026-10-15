# Task packet: перепись чтений Firestore на холодном старте ([FS-READS])

Governance-ID: TG-A51A5DB0258C
Governance-ID: TG-B8310613BB70
Governance-ID: TG-D8F50E3FC737
Бета-тест 15.10 (координатор 13:30), части Ядра:
- А1 мёртвые переходы;
- А2 мёртвые кнопки: `scripts/audit_dead_buttons.mjs`;
- А6 ошибки в логах.
Найдено в А2: стрелка «назад» в ветке загрузки блица Карточек без обработчика — неактивна, на iOS из зависшей загрузки не выйти.
Исправлено: тот же `leave`, что в соседних ветках.
Координатор 13:12: контракт D70/D78 `server_never_writes_personal_shards` красный на `functions/src/legacy_bonus_convert.ts`.
Это чтение `data?.shards` для одноразового пересчёта D195; записи нет, сторож записей чист. Сделано точечное исключение только
на чтение (с причиной) и отдельный тест «legacy_bonus_convert не пишет shards».
Попутно (координатор 13:05): сверка сегодняшних решений владельца с 03_DECISIONS. Не хватало четырёх строк — дописаны D197–D200:
- сторис 17.10;
- 15 занятий V2;
- окно «Встречайте 2.0»;
- 11×А сверки r1.
Стор-бандл репетиции (HEAD 1754b7bd6) проверен: маркеров `[FS-READS]` 0, контрольная строка `STORY-EVENTS` 1.
Status: In progress
Owner: Ядро (сессия 1)
Related: задача координатора 15.10 ~12:58 (правило Firebase-экономии); параллельно Авторизация меряет [BOOT-TIMING].

## Outcome

Таблица для гостя и вошедшего: сколько документов читается от запуска до интерактивной Главной и в первые 60 с.
Для каждой строки:
- кем читается (функция и коллекция);
- повторы в одной сессии;
- onSnapshot-слушатели, живущие дольше нужного.

Затем — список того, что можно убрать или кэшировать раз в N часов без риска.

## Scope

- Новый `app/dev_firestore_read_counter.ts` — только `__DEV__`.
- Новый `app/dev_firestore_read_counter_boot.ts`.
- Подключение — одна строка в `index.js` рядом с `firebase_emulator_dev_boot`.
- Боевой код не меняется.

## Architecture

- В dev подменяются `get` и `onSnapshot` у `FirestoreDocumentReference.prototype` и `FirestoreQuery.prototype` (RNFB 21.14).
- Покрываются все пути: модульные функции, старый стиль и динамический импорт.
- Считаются только чтения с сервера: `metadata.fromCache === false`.
  - get — 1 на документ, пустой запрос = 1;
  - слушатель: первый снимок — размер, дальше — `docChanges`.
- Сводка выводится в 10, 30 и 60 с: по коллекциям и вызывающим, плюс живые слушатели.
- В релизе ветка вырезается константным свёртыванием Metro (как у `firebase_emulator_dev_boot`).

## Security and privacy

- В журнал идут пути коллекций и имена функций, без содержимого документов.
- id документа заменяется на `{id}`, uid в журнал не попадает.

## Technical debt

Временный инструмент диагностики. После переписи можно оставить выключенным за флагом или удалить отдельным коммитом.

## Verification

- Тест подмены на заглушечных классах.
- Проверка, что стор-бандл не содержит маркера `[FS-READS]` (гейт `STORE-BUNDLE-DEV`).

## Rollback

Удалить строку в `index.js` и оба файла.
Бета-тест Б16 (координатор 13:35): dev `notif=<тип>` — имитация тапа по пушу через ТОТ ЖЕ разбор, что у настоящего тапа.
Тело слушателя `app/notification_tap_handler.ts` вынесено в `routeTap`; в `__DEV__` регистрируется для `simulateNotificationTapForDev`.
Б19: аудит «нет сети» на Главной, в уроке и в Карточках.
Governance-ID: TG-A49D5753A084
Governance-ID: TG-C4E151EA6C55
Governance-ID: TG-B36C8BBE02C4
Координатор 14:05:
- удаление набора без сети — тост «Нет интернета» вместо общего; тест «удаление А не крутит кнопку у Б»;
- сторожа обводок и типографики D145 по modules/learning-v2/modes/mode_feedback_v1 (файл Codex из пакета V2) — исключение с причиной и строка в записку Codex.
Governance-ID: TG-30E267C088F9
Governance-ID: TG-C1CFC3D6FE3C
🔴 Ревизор 14:20: параллельные гидрации счётчика голоса складывали диск дважды (после d29e970e5) — 1→2, 2→4.
Фикс: одно общее чтение диска на процесс; отдельный счётчик списаний ДО гидрации, учитывается ровно один раз;
смена владельца отбрасывает старое чтение.
🟡 Пока доступ не выяснен, попытки ждут в памяти: Plus — отбросить, Free — засчитать.
Governance-ID: TG-FCDF025FA9CE
Сторожа V2 (координатор 14:25):
- `learning_v2_speaking_ui_parity_contract`: окно поиска testID 800 → 2400 знаков — пропсы D194/D196 сдвинули testID; кнопка на месте.
- `learning_v2_scripted_repeat_player_lifecycle.test.tsx` — неотслеживаемый файл Codex: голый `__DEV__` в тестовом окружении; это Codex.
Governance-ID: TG-AF51AF9B5D44
Governance-ID: TG-04289FE4E25C
Governance-ID: TG-FE79B7317CB0
Governance-ID: TG-B5BD19696D52
Governance-ID: TG-94C2AE2FB9EC
P5 (координатор 14:35): микрофон слова в SpeakingPanel без лимита, но недостижим — все 4 живых хоста inline, SpeakingButton (modal) без импортёров.
До сборки: журнал [VOICE-LIMIT] word_mic_start в recordWordSystem и startWordHold. Гейт — после релиза.
R1-c (координатор): доступ неизвестен дольше 8 с с запуска — для лимита голоса считаем Free; PremiumContext не трогаем (рискованно до сборки).
R1-a: Диалоги V2 — списание и проверка через общий путь. R1-b: отложенные попытки чистятся при смене владельца.

### C1 — нативные окна Главной в NATIVE_MODAL_KEYS (15.10, 14:47)
- spireWeekMoment (SpireWeekMomentHost `<Modal>`), welcomeBack и coinRankEnough (`<Modal>`-обёртки в home.tsx) добавлены в
  NATIVE_MODAL_KEYS; неверные комментарии «в дереве, не <Modal>» исправлены.
- Лог `[OVERLAY-ARB] handoff {from,to,fromNative,toNative,delayMs}` в OverlayArbiter на каждую передачу слота.
- Сторож tests/overlay_native_modal_keys_contract.test.ts: три хост-окна + общий скан components/ (useOverlayVisible + <Modal>).
- Попутно 084db1b62: dev `notif=<тип>` имитирует тап после перехода на next (Сверка Б16: replace закрывал пейвол).
Governance-ID: TG-6CAAC140D121

### R1-a (хук) + ИИ-диалог «одна попытка на удержание» (15.10, 14:53)
Governance-ID: TG-6CAAC140D121
- Диалоги V2 переведены на useVoiceAttemptGate({surface:'dialogs', source:'dialogue_v2_session'}) — как dialogue_v2_freeform:
  ключ попытки, отложенное списание, пейвол ai_voice_input с защитой от двойного тапа и paywall_shown.
- ai_dialog_session: commitAttemptOnce на сессию захвата (флаг attemptCommitted), лог `[VOICE-LIMIT] ai_dialog engine_{start|result}`
  {session, engineStartEvents, alreadyCommitted}; первый result при удержании тоже списывает (OEM без 'start').
- Сторож tests/ai_dialog_voice_attempt_once_contract.test.ts; dialogue_v2_voice_daily_limit переведён на хук.
- Проверка: голос 22/22, пейвол-реестр + use_voice_attempt_gate 24/24.
- Откат: git revert коммита; поведение вернётся к своей ветке Диалогов и списанию на каждый 'start'.
Governance-ID: TG-73D5A0A95166
Governance-ID: TG-42CB307E020D
Governance-ID: TG-771014A4ECD6

### R1-c-2 + старый микрофон курса (15.10, 15:13)
- Старый экран learning-v2/session/[id] достижим внешней ссылкой без runtimeMode=direct_v1 у не-английского языка
  (вкладка Уроков всегда шлёт direct_v1) → микрофон закрыт useVoiceAttemptGate(course_v2). Сторож learning_v2_legacy_mic_gate_contract.
- R1-c-2 (Ревизор): окно 8 с отсчитывается от начала текущего ожидания (сброс при смене владельца и при переходе
  «доступ известен → снова неизвестен»); в запасном режиме попытки в памяти, входят в лимит, на диск — только по настоящему
  ответу (Plus — отброс). Тесты голоса 30/30, смежные 37/37, типы 0.

### п.2 RESTORE поздний + п.3 FS-READS дубль восстановления (15.10, 15:23)
- auth_provider: позднее restoreFromCloud (после потолка 20 с) → restored+текущий → `[SIGNIN] restore_late_applied` +
  cloud_profile_hydrated; иначе `restore_late_skipped`. Плавных счётчиков на Главной нет вовсе → Дизайну (анимация по kit 650 мс).
- FS-READS по журналам Сверки (B11v2b, B16r3, первые 30 с): users/{id} ×3 и flashcard_pages ×4 (en,fr,en,fr).
  Причина — два полных восстановления: загрузочное (_layout, syncMissingDocument=false, ~20 с) и охранное премиума
  (premium_guard → restoreFromCloud, syncMissingDocument=true) поверх него. [BOOT-RESTORE-STEP] ×2 в 47.037/47.042.
- Починка: cloud_sync держит идущее восстановление и время последнего удачного; premium_guard присоединяется к идущему
  (`[PREMIUM-CLOUD] restore joined_in_flight_boot_restore`) или пропускает при удачном < 30 мин (`skipped reason=recent_restore`).
  Ожидание: −1 users/{id} и −2 flashcard_pages (+ mistake_* и прочие чтения второго прохода) на каждом старте.
- config ×2 в этих журналах не воспроизвёлся (нет строк config) — держу под наблюдением.
- Тесты: premium_guard + ttl (+2 новых) 33/33, cloud_restore_* + boot_restore_defer зелёные; late-restore 133/133.
