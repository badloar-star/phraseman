# Покрытие съёмки r1: 359 строк со статусом pending

Для робота Сверки — **группа (1), одна строка id** (читать только их; команда: `node scripts/parity_batch_shoot.mjs <id…> --guest`, эмулятор Pixel_8, Metro :8081, сервер макетов :8765):

```
cards-002 cards-024 cards-032 cards-038 cards-063 cards-065 cards-067 cards-070 cards-081 spire-002 spire-003 spire-005 spire-009 spire-010 spire-012 spire-015 spire-016 dialogs-011 dialogs-012 dialogs-029 profile-016 profile-017 profile-018 profile-020 profile-021 profile-022 profile-024 paywalls-019 paywalls-021 paywalls-022 paywalls-023 paywalls-024 overlays-campaigns-004 overlays-campaigns-005 overlays-campaigns-007 overlays-campaigns-008 overlays-campaigns-009 overlays-campaigns-010 overlays-campaigns-011 overlays-campaigns-012 overlays-campaigns-014 overlays-campaigns-015 overlays-campaigns-016 overlays-campaigns-017 overlays-campaigns-018 overlays-campaigns-019 overlays-campaigns-020 overlays-campaigns-022 overlays-campaigns-023 overlays-campaigns-024 overlays-campaigns-025 overlays-campaigns-026 cards-section-005 cards-section-006 cards-section-011 cards-section-012 cards-section-015 cards-section-017 cards-section-019 cards-section-020 cards-section-021 cards-section-022 cards-section-023 cards-section-034 cards-section-035 cards-section-036 energy-modes-017 cards-v2-005 cards-v2-006 cards-v2-007 cards-v2-008 cards-v2-009 cards-v2-010 cards-v2-011 cards-v2-012 cards-v2-013 cards-v2-014 cards-v2-017 cards-v2-018 cards-v2-020 cards-v2-021 cards-v2-022 cards-v2-023 cards-v2-024 cards-v2-025 cards-v2-026 cards-v2-027 cards-v2-028 cards-v2-045 cards-v2-046 cards-v2-048 dialogs-gap-002 dialogs-gap-003 dialogs-gap-009 dialogs-gap-010 dialogs-gap-012 dialogs-gap-015 spire-gap-007 cards-gap-001 cards-gap-002 cards-gap-007 cards-gap-008 cards-gap-011 cards-gap-012 cards-gap-018 cards-gap-020 cards-gap-021 cards-gap-030 cards-gap-034 paywall-gap-002 paywall-gap-003 paywall-gap-005 paywall-gap-011 paywall-gap-012 paywall-gap-013 settings-gap-002 settings-gap-003 settings-gap-005 settings-gap-008 settings-gap-009 settings-gap-011 settings-gap-014 settings-gap-015 settings-gap-018 settings-gap-022 settings-gap-024 settings-gap-025 settings-gap-026 settings-gap-028 settings-gap-029 settings-gap-030 settings-gap-031 settings-gap-032 settings-gap-033 settings-gap-035 settings-gap-036
```

Разбор по заданию координатора (12.10, сессия «Макеты»). В реестре у каждой строки pending r1 поставлено `triage.coverage` (`ready` / `link_missing` / `core_switch` / `manual_conditional` / `owner_by_code` / `owner_prod_write` / `owner_blocked`) и `triage.coverage_note`; статусы и число строк (1093) не менялись. Источники: `DEV_LINKS_R1.md` (ссылка и шаги робота, колонка «уникальна»), три части `R1_SHOT_LIST*.md` (группы маршрутов и разделы «Нет пути»), разбор самим `parseLinksDoc` из `scripts/parity_batch_shoot.mjs`. Пути на устройстве не проверялись.

| Группа | Что это | Строк | Кому |
|---|---|---|---|
| **(1) снять сейчас** | есть ссылка и шаги робота, «уникальна: да», шаги разобраны | **136** | Сверка (робот) |
| (2а) ссылки нет, путь есть | путь выведен в shot list (группа маршрута), но в DEV_LINKS_R1 нет ссылки/шагов или «уникальна: нет» | 129 | Дизайн: записать ссылку и шаги |
| (2б) не хватает подмены | состояние достижимо только с новым dev-переключателем | 37 | Ядро: добавить переключатель |
| (2в) только руками | условный путь: сеть, авиарежим, обход, зависит от сервера ИИ | 42 | Сверка вручную |
| (3а) в коде состояния нет | кадр снять нельзя — принять по коду или убрать кадр | 4 | владелец |
| (3б) пишет в прод | путь есть, но шлёт реальную заявку/жалобу/отклик | 6 | владелец: «да» на реальную запись |
| (3в) нужна подготовка вне приложения | серверные коды, названный аккаунт, ИИ | 5 | владелец |
| **Итого** | | **359** | |

Телефон нужен только там, где эмулятор роняет экран (сейчас строки `profile-003…030` со статусом diff, не pending) — в pending таких нет.

## (1) Снять сейчас — 136 строк

По префиксам: cards-v2 24 · settings-gap 21 · overlays-campaigns 20 · cards-section 14 · cards-gap 11 · cards 9 · spire 8 · profile 7 · dialogs-gap 6 · paywall-gap 6 · paywalls 5 · dialogs 3 · energy-modes 1 · spire-gap 1.

Перед прогоном: подтверждение `--guest` (анонимный гость: `pm clear` + онбординг), иначе строки с `cards=demo|empty|…` робот пропускает; перед каждой строкой Metro должен быть `running`. Кадры 1080×2400 без склейки не годятся — прогон сам клеит «образец | приложение».

## (2а) Ссылки нет, но путь есть — 129 строк (Дизайн: записать ссылку и шаги в DEV_LINKS_R1.md)

- **G-A01 · Онбординг как гость (чистая установка) + плашка «3 дня полного доступа»** (1): onboarding-002
- **G-A02 · Гость: «Аккаунт», смена имени, окно удаления** (2): auth-gap-001, auth-gap-010
- **G-A03 · Настройки: главная, Plus-статусы (dev), темы, язык интерфейса, кеш, опрос-заглушка** (1): settings-gap-007. Из них settings-gap-007 — переключатель уже есть, нужна только запись ссылки.
- **G-A04 · Настройки → Уведомления** (3): settings-gap-010, settings-gap-013, settings-gap-027
- **G-A05 · Настройки → Обучение, Приватность, документы, Поддержка** (4): settings-gap-016, settings-gap-017, settings-gap-023, settings-gap-034
- **G-A06 · Plus: «Управление подпиской» и отмена** (3): profile-023, paywalls-020, paywalls-025
- **G-A09 · Язык изучения: шторка, мини-онбординг нового языка, тосты** (5): onboarding-026, onboarding-027, onboarding-028, onboarding-029, settings-gap-020
- **G-A10 · Вход Google новым аккаунтом C, профиль привязан** (4): onboarding-005, auth-gap-002, auth-gap-009, settings-gap-001
- **G-A11 · Выход, вход, смена аккаунта, отказы окна входа** (1): auth-gap-003
- **G-C01 · Чистый гость · авиарежим (офлайн-состояния)** (3): cards-030, cards-section-029, cards-v2-044
- **G-C02 · Чистый гость · онлайн · Free: пустые состояния и свои карточки** (8): cards-022, cards-026, cards-061, cards-064, cards-076, cards-section-038, packs-simple-003, cards-v2-029
- **G-C04 · Демо-аккаунт · Plus on: хаб А, Сохранённые, Мои наборы, редакторы, каталог** (13): cards-020, cards-033, cards-040, cards-066, cards-068, cards-069, cards-071, cards-073, cards-section-008, cards-section-010, cards-section-016, cards-gap-019, cards-gap-027
- **G-C05 · Демо · Plus on · сессии тренировок** (16): cards-section-039, cards-section-042, cards-section-043, cards-section-049, cards-section-050, cards-section-052, cards-v2-031, cards-v2-033, cards-v2-034, cards-v2-035, cards-v2-036, cards-v2-038, cards-v2-039, cards-v2-040, cards-v2-049, cards-v2-050
- **G-C06 · Демо · Plus on · mode b · итоги тренировки (Блиц, 90 с)** (7): cards-section-053, cards-section-054, cards-section-055, cards-v2-041, cards-v2-042, cards-v2-051, cards-v2-052
- **G-C07 · Демо · Free (plus=off): лимиты и платные стены** (2): cards-v2-047, cards-gap-040
- **G-C08 · Free · исчерпанный лимит тренировок (обход через хранилище)** (1): cards-section-056
- **G-C09 · Демо · Plus on · прямые маршруты (служебные состояния)** (2): cards-074, cards-078
- **G-D04 · Диалоги — брифинг, согласие на ИИ, окно «нет энергии»** (2): dialogs-009, dialogs-010
- **G-D05 · Диалоги — сессия (настоящий ИИ, Free, аккаунт №2)** (2): dialogs-013, dialogs-021
- **G-D06 · Диалоги — голосовой ввод (устройство)** (4): dialogs-024, dialogs-025, dialogs-027, dialogs-gap-013
- **G-D08 · Диалоги — завершение и итог (настоящий ИИ)** (5): dialogs-040, dialogs-043, dialogs-044, dialogs-gap-007, dialogs-gap-008
- **G-D09 · Диалоги — память и свободный разговор (Plus/Free)** (7): dialogs-045, dialogs-046, dialogs-gap-001, dialogs-gap-004, dialogs-gap-005, dialogs-gap-006, dialogs-gap-011
- **G-D10 · Диалоги — сессия Plus** (1): dialogs-039
- **G-E01 · Режим энергии Б — классический урок (кадры «Урок»)** (7): energy-modes-002, energy-modes-003, energy-modes-004, energy-modes-005, energy-modes-006, energy-modes-007, energy-modes-008
- **G-E04 · Режим Б — Learning V2 (кадр 011)** (1): energy-modes-011
- **G-E05 · Режим Б — Карточки: тренировка (кадр 012)** (1): energy-modes-012
- **G-E06 · Режим Б — Диалоги и Фраза дня (энергия за ошибки не снимается)** (2): energy-modes-013, energy-modes-014
- **G-E07 · Режим А (первый выпуск)** (2): energy-modes-015, energy-modes-016
- **G-M02 · Друзья — два аккаунта** (11): community-008, community-009, community-012, community-013, community-015, community-017, community-018, community-019, community-021, community-023, community-024
- **G-S01 · Шпиль — превью на моках (самая большая группа, ничего не сервер)** (3): community-002, spire-gap-010, spire-gap-019
- **G-S03 · Шпиль — пилюля «бета» (язык изучения es/de/fr/it)** (1): spire-gap-022
- **G-S04 · Шпиль — настоящий (сервер, аккаунт №2)** (3): spire-gap-012, spire-gap-013, spire-gap-021
- **—** (1): cards-v2-037

## (2б) Не хватает подмены — 37 строк (Ядро: добавить dev-переключатель)

| Переключатель / что подменить | Строки | Число |
|---|---|---|
| `dev_state?switch=not_uploaded\|backup_blocked\|unsaved_cards\|pending_spend\|quarantine\|guard\|slow` | auth-gap-004, auth-gap-005, auth-gap-013, auth-gap-014, auth-gap-015, auth-gap-017, auth-gap-018 | 7 |
| `dev_state?cards=demo_published` | cards-042, cards-049, cards-053, cards-gap-029, cards-gap-031, cards-gap-039 | 6 |
| `dev_state?fail=saved_load\|setup_decks\|recall_load` | cards-077, cards-gap-009 | 2 |
| `error \| dev_friends_fail=add\|search` | community-011, community-016 | 2 |
| `dev_state?paywall=loading\|live\|reference\|failed` | onboarding-paywall-001, onboarding-025 | 2 |
| `dev_state?fail=card_write\|pack_write` | cards-gap-022, cards-gap-035 | 2 |
| `paused \| dev_state?dialogs_paused=1` | dialogs-033 | 1 |
| `dev_friends_hold=add_request` | community-010 | 1 |
| `lookupUserByFriendCode` | community-014 | 1 |
| `study_invite \| dev_state?friend_event=study_invite \| friendsTogetherUiEnabled=false` | community-022 | 1 |
| `dev_state?speech=correct\|wrong` | cards-section-046 | 1 |
| `dev_state?auth=none` | onboarding-006 | 1 |
| `dev_state?greet=<строка>` | onboarding-010 | 1 |
| `dev_state?restore=retired` | auth-gap-008 | 1 |
| `dev_state?delete=fail` | auth-gap-011 | 1 |
| `dev_state?plustransfer=on` | auth-gap-012 | 1 |
| `service \| rate_limited \| plus_daily_cap \| dev_dialog_fail=service\|rate_limited\|plus_daily_cap` | dialogs-gap-016 | 1 |
| `dev_state?hold=hub_loading\|saved_loading\|catalog_loading\|setup_loading\|quota_waiting\|quota_failed\|voices_loading` | cards-gap-003 | 1 |
| `dev_state?train_gate=fail_blitz\|fail_speaking\|fail_swipe_prepare\|fail_swipe_quota` | cards-gap-005 | 1 |
| `в `cards=demo` добавить карточки `source=lesson` с `sourceId` 1–3.` | cards-gap-024 | 1 |
| `dev_state?vip=promo\|referral\|survey\|idea\|tester\|admin\|admin_pro_lifetime\&until=<ms>` | settings-gap-006 | 1 |
| `dev_state?studyfail=on` | settings-gap-021 | 1 |

Самые выгодные просьбы к Ядру (по числу строк): `dev_state?switch=not_uploaded|backup_blocked|unsaved_cards|p` — 7; `dev_state?cards=demo_published` — 6; `dev_state?fail=saved_load|setup_decks|recall_load` — 2; `error | dev_friends_fail=add|search` — 2; `dev_state?paywall=loading|live|reference|failed` — 2.

## (2в) Только руками — 42 строк (Сверка, условия в shot list)

| id | Условие / путь |
|---|---|
| cards-018 | (cond) Реальный чужой набор: каталог → `flashcards-pack-card-<id>` → `pack-preview` (CommunityPackPreview.tsx:196): `pack-preview-title`, `pack-add-<id>`, `pack-like-<id> |
| cards-019 | (cond) Из cards-018: тап `pack-add-<id>` → экран набора «добавлен» (бейдж, социальная строка). Меняет счётчик добавлений реального набора в проде (+1). Дубли: cards-secti |
| cards-043 | (cond) Реальный ролик: `phraseman://dev_state?next=%2Fflashcards_collection%3Fpack%3Dvideo_<videoId>%26preview%3D1` → `video-set-view`, `video-set-hero`, `video-set-title |
| cards-044 | (cond) Тост «Набор ещё не скачан» при открытии чужого набора без данных: демо-каталог → тап `flashcards-pack-card-dev_demo_community_2` (карточек в облаке нет). Для именн |
| cards-050 | (cond) После cards-019: тап `pack-like-<id>` → сердце заполнено, счётчик +1 (пишет лайк в прод). |
| cards-051 | (cond) Добавленный реальный набор → `pack-comments-<id>` → `pack-comments-sheet` (PackCommentsSheet.tsx:753): пустое состояние, если откликов нет. |
| cards-052 | (cond) До добавления: счётчик откликов `pack-comments-<id>` есть, только если у набора уже есть отклики (CommunityPackPreview.tsx:234); открыть шторку — поле ввода заблок |
| cards-055 | (cond) Если у реального набора есть чужие отклики: `pack-comment-more-<id>` → меню «Пожаловаться». |
| cards-057 | (cond) Из cards-055 → «Пожаловаться на отклик» → `report-comment-sheet`; снять и закрыть, не отправлять. |
| cards-072 | (cond) Plus on: набор с ≥10 карточек (через «Отметить несколько» → `fc-create-pack-from-selection`), переключатель «Все», включить авиарежим → `ugc-pack-save` → тост «Наб |
| cards-079 | (cond) `next=%2Fflashcards_speaking_session%3Fdeck%3Dcustom%26size%3Dall` (custom пуст на демо) → `fc-speak-empty` → `fc-speak-pick-decks-empty` → `fc-deck-sheet` (DeckPi |
| cards-082 | (bypass) Тап `video-set-hero` вызывает `Linking.openURL` (VideoPackRow.tsx:75-99): на эмуляторе откроется браузер. Обход: `adb shell pm disable-user --user 0 com.android. |
| dialogs-026 | отпустить: текст встаёт в поле (нужно распознавание речи на эмуляторе) |
| dialogs-028 | `pm revoke RECORD_AUDIO` + удержание → `permission_denied`. «Попытки кончились + PLUS» — нет детерминированного пути |
| dialogs-037 | бот завершил диалог → `dialogue-v2-session-end-veil`, ввод скрыт. Зависит от того, как ИИ ведёт сценарий; вручную только «Завершить» (даёт кадр dialogs-043) |
| dialogs-042 | `dialogue-v2-completion-feedback` раскрыт (только если пройдёт троттлинг отзыва) |
| profile-019 | `plus=on` → `settings-plus-row`; серия скриншотов 0,3 с: `manage-subscription-loading` (УСЛОВНО) |
| overlays-campaigns-006 | тап «Активировать» + серия скриншотов 0,3 с: «Активируем…» (УСЛОВНО; `adb emu network delay umts`) |
| cards-section-013 | (dup) То же, что cards-018. |
| cards-section-014 | (dup) То же, что cards-019. |
| cards-section-018 | (cond) После «Добавить себе» реального набора: тап по плитке карточки → `fc-expanded-card` с нижней строкой «чужой» (`fc-expanded-save`, `fc-expanded-to-pack`; ExpandedCa |
| cards-section-030 | (dup) То же, что cards-043. |
| cards-section-031 | (cond) Реальный ролик → `lingman_video_watch` → «Добавить набор себе» (`lingman-video-watch-pack`) → «Тренировать фразы ролика» → VideoSetView владельца: «В моих наборах» |
| cards-section-040 | (cond) Шторка → Устно (плитка активна только если распознавание речи есть) → старт → ожидание: карточка, микрофон `fc-speak-mic`, `fc-speak-task-recall/repeat`, `fc-speak |
| cards-section-041 | (cond) Из cards-section-040: тап `fc-speak-mic` (запись идёт, панель слушает) — снять в этот момент; остановить повторным тапом. Нужно разрешение на микрофон (его системн |
| onboarding-003 | тап «Войти через Google» при `adb emu network speed gsm`, ждать >8 с (УСЛОВНО) |
| onboarding-004 | авиарежим ВКЛ → тап «Войти через Google» (текст ошибки зависит от кода — УСЛОВНО) |
| onboarding-008 | на сейфе авиарежим ВКЛ → «Продолжить с Google» (УСЛОВНО, текст по коду) |
| cards-v2-015 | (dup) То же, что cards-018. |
| cards-v2-016 | (dup) То же, что cards-019. |
| cards-v2-019 | (dup) То же, что cards-043. |
| cards-v2-032 | (dup) То же, что cards-section-040. |
| auth-gap-016 | в окне смены авиарежим ВКЛ → «Продолжить» → «Прогресс не сохранён» (УСЛОВНО) |
| dialogs-gap-014 | запись и отправка голосом → `dialogue-v2-voice-message-<id>` |
| cards-gap-023 | (cond) «Сохранённые» → ⋮ → чип `fc-saved-content-phrase` («Фразы») → ⋮ → `fc-menu-filter` → список с выбранным «Все» (FlashcardsFilterDropdown). На демо в списке будет гр |
| cards-gap-028 | (cond) Набор из UI (описание = название, ≥10 карточек) + авиарежим → «Открыть сообществу» → тост «Не удалось отправить набор на публикацию.» (сеть падает до сервера; publ |
| cards-gap-032 | (cond) До добавления (cards-018): тап `pack-like-<id>` → тост «лайк — после добавления» (CommunityPackSocialBar.tsx:232-289). |
| cards-gap-033 | (cond) После добавления: авиарежим → тап `pack-like-<id>` → откат сердца + тост «Не получилось поставить лайк» (CommunityPackSocialBar.tsx:259-283); авиарежим выключить. |
| cards-gap-036 | (cond) `dev_state?next=%2Fflashcards_voice_picker` → список голосов `fc-voice-row-*` (Настройки → «Обучение» → голос). На Android имена голосов свои (образец — iOS «Saman |
| cards-gap-038 | (cond) «Только системный (авто)» — если на эмуляторе нет английских TTS-голосов (зависит от образа; проверить в cards-gap-036). |
| settings-gap-012 | мастер ВКЛ → системное «Не разрешать» (или `pm revoke POST_NOTIFICATIONS`) → красная плашка (API 33+) |
| cards-v2-053 | (dup) То же, что cards-section-031. |

## (3) Снять нельзя — что принять по коду, что вынести владельцу

### (3а) В коде такого состояния нет — 4 строк

| id | Что в коде | Рекомендация |
|---|---|---|
| cards-027 | cards-027: На экране настройки тренировки выбора языка набора нет (TrainingSetupV2.tsx). Кнопка `pack-language-picker` есть в шапке каталога сообщества: «Каталог» → тап `pack-language-picker` (PackLan | принять по коду (образец отстал) или убрать кадр; решает владелец |
| cards-060 | cards-060: В коде нет: `shouldGateCreator` всегда false (creator_access.ts:31-36), `fc-editor-skeleton` показывается только на мгновенное чтение карточки при правке. | принять по коду (образец отстал) или убрать кадр; решает владелец |
| overlays-campaigns-013 | `overlays-campaigns-013` — «Неверный формат» промокода: кнопка выключена, сообщения нет. | принять по коду (образец отстал) или убрать кадр; решает владелец |
| overlays-campaigns-021 | `overlays-campaigns-021` — «Неверный формат» кода друга: кнопка выключена до 4 символов, статус `invalid` недостижим. | принять по коду (образец отстал) или убрать кадр; решает владелец |

### (3б) Путь шлёт реальную запись в прод — 6 строк

| id | Рекомендация |
|---|---|
| cards-041 | принять по коду; снимать только с явным «да» владельца на реальную заявку/жалобу/отклик |
| cards-054 | принять по коду; снимать только с явным «да» владельца на реальную заявку/жалобу/отклик |
| cards-056 | принять по коду; снимать только с явным «да» владельца на реальную заявку/жалобу/отклик |
| cards-058 | принять по коду; снимать только с явным «да» владельца на реальную заявку/жалобу/отклик |
| cards-059 | принять по коду; снимать только с явным «да» владельца на реальную заявку/жалобу/отклик |
| cards-gap-025 | принять по коду; снимать только с явным «да» владельца на реальную заявку/жалобу/отклик |

### (3в) Нужна подготовка вне приложения — 5 строк

| id | Что нужно |
|---|---|
| paywalls-008 | серверный ИИ и мягкие допродажи — один показ на этап; реальный вызов ИИ только с разрешением |
| paywalls-009 | серверный ИИ и мягкие допродажи — один показ на этап; реальный вызов ИИ только с разрешением |
| paywalls-010 | серверный ИИ и мягкие допродажи — один показ на этап; реальный вызов ИИ только с разрешением |
| auth-gap-006 | аккаунт, названный владельцем (удаление/восстановление) — снимать только на нём |
| auth-gap-007 | аккаунт, названный владельцем (удаление/восстановление) — снимать только на нём |
