# Task packet: релизный пол — аудит «видимого недоделанного»

Governance-ID: TG-62B331E703A3
Status: Done (аудит по коду; без эмулятора)
Owner: сессия «2 · Дизайн» (поручение координатора 10.10)
Related epic/enabler: релизный пол, docs/phraseman-2.0/PORT_READY_GATE.md

## Outcome

Таблица «где / что видно / как скрыть» по всему, что пользователь может увидеть в релизной сборке, но что выглядит незаконченным. Очевидное — исправлено (см. «Исправлено»), спорное — с рекомендацией.

## Scope

In scope: app/, components/ (без Learning V2, Шпиля, файлов Codex, макетов). Только чтение + мелкие правки.
Out of scope: Learning V2 (`app/learning-v2/**`, `*learning_v2*`), Шпиль, макеты, логика.

## Architecture

Как скрыты dev-маршруты в стор-сборке (проверено по коду):
- `router.ctx.js` (EXPO_PUBLIC_STORE_RELEASE=1) вырезает из роутера: `_admin_*`, `pos_analytics_audit`, `_motion_showcase`, `_phone_state_sqlcipher_smoke`, `flashcards_market_dev`, `vip_survey_dev_auth`, а также ВСЕ `*learning[_-]v2*.tsx`.
- Конфиг сборщика (файл `metro.config.js` в корне) подменяет те же модули заглушкой `_store_release_dev_module_stub.tsx` и физически блокирует `dev-emulator-login`, `dev-account-v2-ios-proof` (без EXPO_PUBLIC_FIREBASE_EMULATOR_HOST / ACCOUNT_V2_IOS_PROOF).
- `ENABLE_DEV_TOOLS` (app/config.ts) гасится в стор-сборке `!IS_STORE_RELEASE`; `DEV_CONTENT_UNLOCK` — сторож dev_content_unlock_prod_guard.

## Security and privacy

Не затрагивает данные.

## Technical debt

Contain: одна найденная дыра закрыта, остальное — в таблице.

## Verification

Чтение кода + AST/регэксп-сканы (скрипты в C:/Temp/claude/colors/: visible_scan.js, rowscan.js, tapscan.js). Проверка типов и тесты не запускались (память ПК); правка гейта — три строки.

## Rollback

`git revert` коммита с гейтом `_dev_cancel_flow_preview`.

## Результат аудита

### Исправлено

| Где | Что было видно | Что сделано |
|---|---|---|
| `app/_dev_cancel_flow_preview.tsx` (маршрут `/_dev_cancel_flow_preview`) | Витрина сценариев отписки («только DEV»), без гейта; не входила в список исключений стор-сборки (router.ctx.js / конфиг сборщика) → открывалась по прямой ссылке и в релизе | Внешний слой-гейт: `if (!__DEV__) return <Redirect href="/(tabs)/home" />`; экран стал внутренним компонентом, в релизе не монтируется |

### Проверено — скрыто корректно (действий не требуется)

| Где | Что это | Чем скрыто |
|---|---|---|
| `app/v2_kit_preview.tsx` | Витрина кита 2.0 | `if (!__DEV__) Redirect` |
| `app/dialogue_v2_visual_fixture.tsx` | Фикстура диалогов | `Redirect` вне dev |
| `app/motion_showcase.tsx`, `app/pos_analytics_audit.tsx` | Витрины/аудит | production-safe гейты + исключены router.ctx.js |
| `app/flashcards_audio.tsx`, `app/shards_shop.tsx`, `app/premium_modal_v2.tsx`, `app/(tabs)/arena.tsx`, `journal.tsx`, `lessons_list.tsx` | Старые URL | редирект / пустой якорь (D83), экрана нет |
| Настройки → «Dev Hub» (settings.tsx:1460) | Dev-пульт | `ENABLE_DEV_TOOLS` |
| Друзья → «DEV: боты Вместе» (friends.tsx:2138) | Панель ботов | `ENABLE_DEV_TOOLS` |
| Достижения → «DEV: все» (achievements_screen.tsx:1279) | Переключатель | `ENABLE_DEV_TOOLS` |
| Серия → «Dev: случайные графики» (streak_stats.tsx:2665) | Генератор данных | `ENABLE_DEV_TOOLS` |
| Уроки → «Dev: язык обучения» (lessons.tsx:5127) | Переключатель языка | `__DEV__ && ENABLE_DEV_STUDY_TARGET_LANG` |
| Урок 1 → «DEV: grammar hint» (lesson1.tsx:1774) | Подсказка | `__DEV__` |
| Список карточек → «DEV: показать подсказку» (CollectionListView.tsx:650) | Сброс подсказки | `IS_EXPO_GO` |
| Карточка → «DEV PACK» (FlashcardListItem.tsx:795,953) | Бейдж | `DEV_CONTENT_UNLOCK` (сторож prod_guard) |
| Регистрация → «DEBUG: cancelled» (RegistrationPromptModal.tsx:1108) | Строка ошибки | внутри `if (__DEV__)` |
| `onPress={() => {}}` в ReportPackModal/ReportUserModal | Обёртка «остановить всплытие» | не кнопки |
| `mistakes_hub.tsx:313` `onPress={() => undefined}` | Кнопка «Отработать» в состоянии загрузки | `disabled` |
| Строки настроек без `onPress` (settings.tsx:1015/1161, account_details.tsx:315/323, settings_language.tsx:110) | Информационные строки | шеврон `›` рисуется только при `onPress` (SettingsGlassRows.tsx) |
| Шпиль (Сообщество → третий сегмент) | Вкладка | `useSpireTabEnabled` (remote `spire_tab_enabled`, по умолчанию false; при битом кэше — скрыт); `renderSection('spire')` только при `spireVisible`; `?section=spire` при закрытом флаге возвращает на «Друзья»; второй замок `config.enabled` (SpireLockedState) на экране Шпиля. Отдельных маршрутов у Шпиля нет (`app/spire/` — только клиенты) |

### Видимые тексты «скоро / готовится»

| Где | Что видно | Когда показывается | Рекомендация |
|---|---|---|---|
| `lesson_menu.tsx:853,1120,1308–1345` («Скоро», «Этот урок пока готовится», «Словарь … скоро появится») | Окно «Скоро» | только для не-английского курса (D129/D130: раздел включает владелец, таблица `learning_language_surface_readiness.ts`) | Оставить: честный отказ вместо пустого экрана; в английском курсе не достижимо |
| `lesson_help.tsx:353` («Теория для урока N скоро появится») | Текст-заглушка | если для урока нет теории (в английском курсе 1–32 теория есть) | Оставить как защитный fallback |
| `LevelExamV2.tsx:460` («Экзамен для этого языка пока готовится. Энергия не списана») | Сообщение | не-английский язык | Оставить |
| `vocabulary_target_gate.ts:133` («Английский словарь скрыт в режиме French…») | Сообщение | French-режим | Оставить |
| `lessons.tsx:5650` («Этот курс находится в разработке») | Подпись | только dev-сборка (`learningV2LockedNoticeVisible`) | Оставить |
| `AppMessageAnnouncementModal.tsx:38` («Мы готовим для тебя кое-что новое… Скоро расскажем больше») | Тизер | только если в кампании админки пустой текст (fallback) | Оставить; следить, чтобы кампании всегда имели текст |
| `MaintenanceGate.tsx:34` («Идут технические работы. Скоро вернёмся») | Экран техработ | по флагу | Оставить (файл Codex) |
| `YoutubePremiereHero.tsx:69` («Скоро премьера») | Карточка премьеры | есть реальная запланированная премьера | Оставить |
| `streak_stats.tsx:2535`, `phrase_analytics.ts:938`, `explain_phrase_request.ts:204`, `mistake_explain_fallback.ts:68` («появится позже / после пары дней») | Пустые состояния данных | нет данных | Оставить: объяснение пустого состояния |

### Спорное — решение координатора

| Где | Что наблюдаю | Рекомендация |
|---|---|---|
| `router.ctx.js` (стор-режим) вырезает ВСЕ `*learning[_-]v2*.tsx` (с релиза 1.6.15, 31.08), а `lessons.tsx:3604` открывает `/learning-v2/session/[id]` | Если «Новые уроки» доступны в стор-сборке, маршрут будет not-found. По коду кнопка в релизе заблокирована («только дев-сборка», `learningV2LockedNoticeVisible`), но память проекта говорит, что Learning V2 для английского «реально включён» | Координатору сверить с релизным срезом: либо V2 в стор-сборке осознанно закрыт (тогда всё верно), либо regex надо сузить до `authoring_preview\|modes_showcase`. Файлы Codex/Learning V2 не трогал |
| `app/voice_equalizer.tsx`, `app/TabContext.tsx`, `app/TabSlider.tsx` | Не экраны, а компоненты, лежащие в `app/` → превращаются в «маршруты» (по прямой ссылке откроют пустой/странный экран) | Низкий риск; когда будет окно — вынести в `components/` или добавить в исключения router.ctx.js |
| `app/diagnostic_test.tsx`, `app/settings_edu.tsx` | Реальные экраны, доступны из «Уроки → определить уровень» и «Настройки → Обучение» | Оставить |

## Итог

Единственная дыра (`/_dev_cancel_flow_preview` без гейта) закрыта. Остальные dev-входы закрыты флагами/`__DEV__`/исключением из стор-бандла. Спорный пункт один — правило `learning[_-]v2` в router.ctx.js (для координатора).
