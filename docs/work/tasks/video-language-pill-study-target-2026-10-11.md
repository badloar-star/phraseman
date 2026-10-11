# Task packet: пилюля языка на вкладке «Видео» открывает выбор ИЗУЧАЕМОГО языка, а не язык интерфейса

Governance-ID: TG-A30B81C181C4
Status: Planned
Owner: сессия «Авторизация» (по поручению координатора 13:45, приоритет №1, баг владельца со скриншотом), исполнитель Opus
Related: решение 5 (video.html); PRF-23 (шторка выбора языка изучения, `components/settings/StudyLanguagePicker.tsx`); D129/D130/D132 (`app/learning_language_surface_readiness.ts` — videos ready для всех 5 языков)

## Outcome
Тап по пилюле языка (флаг + «EN» + шеврон) в шапке вкладки «Видео» открывает выбор изучаемого языка (en/es/fr/de/it), а не `/settings_language` (язык интерфейса). После выбора: `studyTarget` меняется (`setStoredStudyTarget` / `applyStudyLanguageSelection` → `STUDY_TARGET_CHANGED`), лента Видео перезагружается под выбранный язык (`resolvePreferredYoutubeChannel(manifest, studyTarget, …)`), пилюля показывает изучаемый язык. Новый, ещё не начатый язык — тем же путём, что задумано в пикере (`/language_welcome`). Такая же ошибка проверена и исправлена в пилюлях языка «Диалогов» и «Карточек» (если есть).

## Scope
In:
- `app/lingman_videos.tsx` ~578 (`onOpenLanguage`), `components/youtube/YoutubeChannelHeader.tsx` (только если нужно — пилюля уже показывает `studyTarget`).
- Выбор: переиспользовать `components/settings/StudyLanguagePicker.tsx` (логика `applyStudyLanguageSelection`, `getStartedStudyLanguages`) — в шторке по макету PRF-23 (`docs/design/v2-app/*.html`, найти grep'ом по PRF-23 / «язык изучения»). Если макета шторки нет — НЕ придумывать: остановиться и описать (гейт «нет макета → сначала макет»).
- Поиск такой же ошибки: grep по `settings_language`, `onOpenLanguage`, пилюлям языка в Диалогах/Карточках.
- Логи по правилу «сперва логи»: `[VIDEO-LANG-PILL]` — тап, что открыто, выбранный язык, откуда пришёл studyTarget, перезагрузка канала (resolution, channelId).
- Тест: RNTL или source-контракт — пилюля Видео не ведёт на `/settings_language`, а открывает выбор изучаемого языка; выбор меняет studyTarget и канал.
Out: строка «Язык изучения» в Настройках (PRF-23 решение «без тапа» — не трогать без отдельного решения), `app/settings_language.tsx`, таблица готовности языков (D129 — только владелец), сервер.

## Architecture
Без новой архитектуры: шторка/экран выбора → существующий `applyStudyLanguageSelection` → событие `STUDY_TARGET_CHANGED` → `StudyTargetContext.refresh` → `lingman_videos` пересчитывает канал по `studyTarget` (эффект ~216/246). Optimistic UI: пилюля и лента реагируют сразу (контекст обновляется по событию), без спиннера на весь экран; кэш канала по языку — как есть.

## Security and privacy
Нет новых данных: язык изучения уже хранится локально (`study_target_v1`) и синхронизируется как раньше. Политика не меняется.

## Technical debt
- Pay now: неверный маршрут пилюли; немые ранние выходы в пути смены языка — логировать.
- Accept temporarily (владелец — координатор): строка «Язык изучения» в Настройках остаётся без тапа (PRF-23), пока владелец не решит иначе.

## Verification
Новый тест + соседние (по одному, со слотом): тесты `lingman_videos`/`youtube`/`study_target`/`study_language` (найти grep'ом), `learning_language_surface_readiness_guard`. Сверка с макетом PRF-23 (склейку делает Сверка — сообщить, что снять: вкладка Видео → тап по пилюле → шторка → выбор es → лента ES). Ревью до APPROVE.

## Rollback
Отдельный коммит; `git revert`.

## Итог исполнителя (11.10, Opus)

Status: Implemented, ждёт Сверки и ревью. Коммита нет (по поручению).

Изменено:
- `app/lingman_videos.tsx`: импорт шторки (16); состояние `studyLanguageSheetVisible` (130–131); логи `[VIDEO-LANG-PILL]` в `loadCatalog` — ранние выходы, `channel_resolved` (resolution, studyTarget, откуда манифест), `channel_load` (channelId и его источник) (~210–237); эффект смены языка обучения — лог и сброс ролика/фраз/вкладки прежнего канала (264–277); FeatureIntro не всплывает поверх шторки (594); `onOpenLanguage` пилюли — лог тапа + `setStudyLanguageSheetVisible(true)` вместо `router.push('/settings_language')` (602–608); `<StudyLanguageSheet …logTag="[VIDEO-LANG-PILL]">` только во вкладке (693–704).
- `components/settings/StudyLanguageSheet.tsx` (новый): шторка PRF-23 — каркас `FriendsAddSheetShell` (kit `.sheet`: 440 мс cubic-bezier(.2,1,.3,1), затемнение 260, r28, ручка 44×5, заголовок 19/24 + подзаголовок + крестик 35), строки `SettingsGlassRow` (`.card.list-row` 64/r14), флаг 58×40 r10; оптимистичная галочка в кадре тапа.
- `components/settings/StudyLanguagePicker.tsx`: логика выбора вынесена в общий хук `useStudyLanguageSelection` (115) — тот же путь `applyStudyLanguageSelection` → `STUDY_TARGET_CHANGED`, новый язык → `/language_welcome`; добавлены логи каждой ветки, защита от двойного тапа (ref), `catch` с логом и тостом ошибки (раньше `try/finally` без `catch` — немой unhandled rejection) (64 — тексты тоста, 9 языков). Лента-пикер (221) использует тот же хук, вид не менялся.
- `components/friends/FriendsAddSheetShell.tsx`: необязательный render-prop `children({ requestDismiss })` — анимированное закрытие без второй вибрации (56–61, 119–127, 188). Шторка «Добавить друга» не меняется.
- Тесты: новый `tests/video_language_pill_study_target.test.ts` (10/10); `tests/video_liquid_source_contract.test.mjs` — сторож ТРЕБОВАЛ `router.push('/settings_language')` (закреплял баг), переписан на шторку; `tests/interaction_responsiveness_contract.test.ts` — срез обработчика тапа перенаправлен на хук (смысл «тап без await» сохранён).

Макет: `docs/design/v2-app/profile.html` → `studyPicker()`, демо «PRF-23 · выбор языка изучения · шторка». Совпадает: шторка кита, заголовок «Язык изучения», подзаголовок «Прогресс каждого языка хранится отдельно», крестик, список карточек-строк, флаг 58×40, у выбранного «Учу · выбран» + галочка. РАСХОЖДЕНИЯ (нужно решение владельца/координатора, макет устарел относительно решения 30.09 «языки обучения все фри»): в макете 3 языка, у новых — серый флаг, «Новый язык · доступ уточняется» и замок; в приложении 5 языков, новые — цветной флаг, «Новый язык» и шеврон (ведёт на приветствие языка), начатые невыбранные — «Учу» без значка (в макете такого состояния нет). Подзаголовок 16/21 вместо 15/20 (D145, как у «Добавить друга»).

Диалоги и Карточки: такой ошибки нет. В Диалогах пилюли языка нет ни в коде, ни в макете. В Карточках пилюли «EN ⌄» — фильтр языка НАБОРА (`PackLanguagePicker`, D127, cards-states.html «Язык набора»), открывают свой выбор на месте, на `/settings_language` не ведут. Других переходов на `/settings_language`, кроме строки Настроек «Язык интерфейса» и возврата из `language_welcome`, нет.

Проверки: новый тест 10/10; соседние — instant_open_batch 8/8, interaction_responsiveness 6/6, lingman_videos_catalog 8/8, lingman_video_open_seen 1/1, load_gate_config_d154 8/8, navigation_back_video_tab_section 5/5, study_language_picker_canonical_contour 1/1, video_phrases_runtime 11/11, video_player_lifecycle 3/3, video_tab_virtualized_list 4/4, learning_language_surface_readiness_guard 6/6; mjs: video_liquid 2/2, video_tab_liquid_glass 7/7, friends_tab_liquid_glass 9/9, settings_root 10/10, settings_language 5/5, lingman_misc 10/10, video_catalog_virtualization 4/4, youtube_channel_picker 1/1, five_section_intros 5/5. Полная проверка типов — 0 ошибок. Храповик переводов — 814 (без роста). Чужие красные, не от этой правки: gustav_surface_target_switch 4/12 (ждут «только английский в проде», устарели после D129/D130), overlays_runtime_liquid_glass 18/19 (счёт `delayMs: 360` в settings.tsx).

Сверке снять (склейка «макет profile.html#PRF-23 | эмулятор»): вкладка «Видео» → тап по пилюле «🇬🇧 EN ⌄» → шторка открыта (кадр + запись выезда 440 мс) → тап «Español» (если начат — шторка уезжает, тост «Теперь учишь Español», пилюля «ES», лента канала ES; если не начат — экран приветствия языка) → назад, пилюля и лента ES. Отдельно кадр шторки с выбранным ES (галочка), и тап по крестику/фону (закрытие 440 мс).

Риски: при смене языка лента до ответа сети показывает прежний канал (снимок каталога в памяти один на аккаунт) — пометка в ⚡; пилюля Видео теперь единственное место в приложении, где меняется язык обучения (строка в Настройках по-прежнему без тапа, PRF-23).
Governance-ID: TG-37EFA56392B1 — независимое ревью шторки языка изучения, решение по 3 расхождениям с макетом PRF-23, коммит.
Governance-ID: TG-3BD963DD05D5 — REVISE ревью: гонка загрузки каталога (seq), кэш по каналам в памяти, R3–R6, О1 временно по макету (новые языки с замком, без перехода на language_welcome до решения владельца), О4–О8 по макету.

## Итог доработки (REVISE TG-3BD963DD05D5, 11.10, Opus)

Изменено:
- R1 гонка — `app/lingman_videos.tsx`: номер загрузки `loadSeqRef` (146), `const seq = ++loadSeqRef.current` (243); проверка `isCurrentLoad()` после манифеста, после записи предпочтения, в `commit`, после `revalidate`, в `catch` и в `finally` (320); устаревший ответ пишет лог `channel_load_stale seq=… step=… channelId=…` и никуда не попадает. `app/youtube_catalog_client.ts:290,311` — опция `isCurrent`: устаревший ответ не пишется ни в сохранённый снимок, ни через `commit` (лог `[VIDEO-CATALOG] revalidate:stale_dropped`).
- R2 кэш — новый `app/youtube_channel_memory_cache.ts`: снимки по ключу `аккаунт:канал`, не больше 5, вытесняется самый давний; `resolveYoutubeChannelSwitchView` (показанный / из памяти / ожидание). В экране: первый кадр сразу по каналу языка обучения (127), снимок из памяти — мгновенно и уходит в revalidate как `previous` (при той же версии 1 чтение вместо ~154); без снимка — шапка канала по манифесту (`pendingChannel`, 142, 532) и существующий скелетон `youtube-catalog-loading`; RSS-лента канала по умолчанию в это время скрыта (175) и при сбое не подставляется (308).
- О1 — `components/settings/StudyLanguageSheet.tsx`: `STUDY_LANGUAGE_SHEET_OPENS_NEW_LANGUAGES = false` (37) с `// зачем:` про ожидаемое решение владельца; не начатый язык — серый флаг (194), «Новый язык · доступ уточняется» (9 языков), замок lockF кита, тап — лог `select_ignored reason=not_started_locked` (до загрузки списка — `started_unresolved`) и лёгкая вибрация без перехода. Ветка `/language_welcome` в общем хуке сохранена.
- R3 (135): замок на время выезда, лог `select_ignored reason=sheet_dismissing`. R6 (141): тап по выбранному языку закрывает шторку.
- R4: `app/study_languages.ts:131,149` — `applyStudyLanguageSelection` бросает `StudyLanguageSelectionError` с шагом `set_target | mark_started`; хук (`StudyLanguagePicker.tsx:193`) при `mark_started` пишет `switch_partial` и показывает тост успеха (язык уже сменён), ложного тоста ошибки нет.
- R5: `FriendsAddSheetShell.tsx:87` — `backdropO.value = 0` перед открытием. «Добавить друга» не изменилась (раскладка по умолчанию `'friends'`).
- `app/language_welcome.tsx:186–192` — `catch` с логом `[LANGUAGE-WELCOME] resolve_started_apply_failed` и возвратом назад.
- О4/О5: `FriendsAddSheetShell` опция `headerLayout="kit"` (60, 170, 221): по центру, зазор 10, подзаголовок +7. Размер подзаголовка 16/21 оставлен по D145.
- О6: жирность названия 700 — D145 разрешает только обычное и жирное начертания, 650 нет; ближайшее 700.
- О7: галочка и замок — контуры `check`/`lockF` из kit.js через react-native-svg (76, 85): штрих 1.8, скруглённые концы, размеры 20/18. Отдельного компонента значков кита в проекте не было (везде Ionicons).
- О8: выбранный язык первым, остальные — en, es, fr, de, it (`orderStudyLanguageSheetOptions`, 40).

Тесты (по одному, со слотом): video_language_pill_study_target 15/15, новый video_channel_switch_race_cache 6/6 (гонка en→es→en, одно чтение при возврате, шапка без снимка, предел 5 каналов, контракт экрана), interaction_responsiveness 6/6, layout_stability 15/15, lingman_videos_catalog 8/8, study_language_picker_canonical_contour 1/1, youtube_catalog_client 8/8, lingman_video_open_seen 1/1, youtube_catalog_migration 3/3, video_tab_virtualized_list 4/4, instant_open_batch 8/8, load_gate_config_d154 8/8, navigation_back_video_tab_section 5/5; node --test: video_liquid 2/2, friends_tab_liquid_glass 9/9, video_tab_liquid_glass 7/7, lingman_misc 10/10, video_catalog_virtualization 4/4. Полная проверка типов — 0 ошибок. Храповик переводов — 814.

Осталось расходиться с макетом PRF-23: 5 языков вместо 3; начатый невыбранный язык («Учу», справа пусто) — в макете такого состояния нет; подзаголовок 16/21 вместо 15/20 и жирность 700 вместо 650 (D145); на iOS серый флаг не работает (RN поддерживает `filter: grayscale` только на Android) — флаг остаётся цветным, замок и подпись есть.
Governance-ID: TG-1F605A0193D3 — повторное ревью доработки шторки и коммит.
Governance-ID: TG-86A9ACE3B800 — APPROVE повторного ревью; коммит; мелочи N1–N4 на потом.
