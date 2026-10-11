# Шпиль на всех языках — аудит источников текста

Версия 11.10.2026 · сессия «Макеты» · только чтение кода, ничего не менялось.
Основание: приказ владельца «Шпиль должен быть проверен на всех языках». Для Сверки (снимает 9 языков) и Ядра (моделирует недели и этажи).
Все утверждения — со ссылкой `файл:строка`. Что не проверено — «НЕ ПРОВЕРЕНО».

---

## 0. Три разных «языка» (не путать)

| Ось | Значения | Где решает |
|---|---|---|
| **Язык интерфейса** — «9 языков» Сверки | `ru, uk, en, es, pt-BR, vi, id, tr, pl` | `constants/i18n.ts:16` (`Lang`), `triLang` |
| **Язык изучения** — по нему собирается пакет недели | `en, es, de, fr, it` | `functions/src/spire_progress_contract.ts:42` (`SPIRE_LANGS`) |
| **Язык исходного смысла в заданиях** | **только русский** (`promptRu`, `meaning.ru`) | см. раздел 4 |

Следствие: интерфейс Шпиля полностью 9-язычный, а **содержимое заданий русское для всех 9 языков интерфейса** (кроме украинского подхода «промпт ru» в шаблоне «Найди лишнее»).

**Как `triLang` ведёт себя при дыре** (`constants/i18n.ts:816-830`): ключа нет → `uk`: берёт `uk` как есть; `es`: `es`; прочие: `txt[lang] ?? txt.es`, но если самого ключа `lang` в литерале нет — **показывает `ru`**. Английский интерфейс: `ENGLISH_UI_LOCALE_ENABLED = false` (`app/config.ts:249`) — выбрать `en` в приложении сейчас нельзя, но все словари Шпиля английский уже содержат (ключ `en` есть).

---

## 1. Сводка: источники текста и покрытие языков

Условные: ✅ 9/9 · ⚠️ частично · ❌ нет. «Серверный» = текст приходит/уходит с сервера.

| № | Источник | Файл | Языки | Статус |
|---|---|---|---|---|
| 1 | Основные подписи (заголовок, этаж, Страж, Вершина, зоны, «Ты здесь», «Назад»…) — 24 ключа | `components/spire/spire_strings.ts` | 9/9 | ✅ |
| 2 | Игровой словарь — 77 ключей: тур, ступень, итоги ступени/этажа/недели, нет энергии/сети, правила (8 пунктов), ошибки старта | `components/spire/spire_game_strings.ts` | 9/9 | ✅ |
| 3 | Названия 12 камней-шпилей (клиент) | `modules/spire/tier_names.ts:25-35` | 9/9 | ✅ |
| 4 | Шаблон «Найди лишнее» (подсказка задания) | `components/spire/spire_oddity_prompt.ts:14-24` | 9/9 | ✅ только для 2 известных шаблонов, прочие → общая строка |
| 5 | Метка «бета» у языка | `components/spire/SpireHomeScreen.tsx:228` | 9/9 (inline, 7 из 9 — «beta») | ✅ |
| 6 | Кнопка «Прослушать» | `components/spire/SpireTaskView.tsx:197` | 9/9 (inline) | ✅ |
| 7 | Кнопка жалобы на задание (подпись) | `modules/spire/SpireTaskReportButton.tsx:36` | 9/9 (inline) | ✅ |
| 8 | Вкладка «Сообщество → Шпиль» | `app/(tabs)/community.tsx:74` | 9/9 | ✅ |
| 9 | Плитка на Главной | `app/(tabs)/home.tsx:2208` | 9/9 | ✅, но **имя другое** (см. раздел 5) |
| 10 | Задача дня «Пройти ступени Шпиля» | `modules/today-tasks/today_tasks_view.ts:48` | 9/9 | ✅ |
| 11 | Название в расходе энергии («ступени Шпиля») | `app/energy_activity_titles.ts:85-90` | 9/9 | ✅, имя другое |
| 12 | Тумблер пушей «События Шпиля» | `app/settings_notifications.tsx:362` | 9/9 | ✅ |
| 13 | Сообщение о релизе «Мы добавили Шпиль…» | `app/app_messages.ts:1966-1970` | ru, uk, es, pt-BR, vi, id, tr, pl (8) | ⚠️ **нет `en`** (ключей `ru/uk/es/ptBr/vi/id/tr/pl`) и слово «Spire» вместо локального имени |
| 14 | **Пуш «Итог недели»** (3 исхода) | `functions/src/spire_week_result_push.ts:134-148` | **ru, uk** | ❌ остальные 7 → русский текст |
| 15 | **Пуш «Зона вылета / края зоны»** | `functions/src/spire_zone_warning_push.ts:150-157` | **ru, uk** | ❌ остальные 7 → русский |
| 16 | Имена камней в пушах (серверная копия) | `functions/src/spire_notifications.ts:36-45` | 8 (нет `en`) | ⚠️ `en` → `ru` |
| 17 | Задания недели (текст внутри пакета) | `functions/src/spire_pack_build.ts`, `spire_multilingual_pool.ts`, `tournament_pool_v11_*.ts` | **ru-источник** | ❌ см. раздел 4 |
| 18 | Ответ после ошибки («Правильно: …») | `modules/spire/answer_reveal.ts`, `SpireStepScreen.tsx:129-131` | язык изучения | ✅ (не переводится, это целевая фраза) |
| 19 | Объяснения заданий (`ruleNote`, `wrongOptionReasons`) | `spire_multilingual_pool.ts:187-201,237,265,288` | **ru**, но из пакета вырезаются | ✅ игроку не показываются (`spire_pack_contract.ts` шапка: «вырезанные объяснения») |
| 20 | Ответ админа на жалобу о задании | `functions/src/report_replies.ts:588,611-632` | один язык, выбирает админ/ИИ (по умолчанию `ru`) | ⚠️ НЕ ПРОВЕРЕНО, что админка передаёт `lang` игрока |
| 21 | Никнеймы ботов комнаты | `functions/src/tournament_reddit_bot_names.ts` (через `synthetic_residents.ts:346`) | без перевода, ≈78 из ≈204 имён кириллицей | ⚠️ см. 6 |
| 22 | Тексты превью (dev) — моки Алиса, Марк, «Она работает каждый день» | `components/spire/spire_preview_fixtures.ts:56-274` | только ru | ⚠️ dev-режим, см. раздел 7 |

Проверено автоматически:
- оба клиентских словаря: **101 ключ × 9 значений = 909 строк, пустых нет, наборы `{плейсхолдеров}` во всех языках совпадают** (скрипт `scratchpad/dict_check.cjs`); ни одна строка не совпадает с русской по тексту, кроме общего «Шпиль» (uk);
- все 8 вызовов `triLang` в `components/spire`, `app/spire` и `modules/spire`: 6 — литералы с полным набором из 9 языков, 2 (`spire_oddity_prompt.ts:43,48`) идут через переменную типа `OddityCopy` с теми же 9 обязательными ключами;
- в `components/spire/*.tsx` и `modules/spire/*.tsx` нет JSX-текста и `accessibilityLabel`/`title`/`placeholder` с буквами вне словарей;
- гвард-тесты: `tests/spire_tier_names.test.ts` (12 имён × языки), `tests/spire_oddity_prompt.test.ts`; `tests/spire_game_source_contract.test.mjs` читает `spire_game_strings.ts` только на толщину обводок. **Нет теста**, который бы сверял полноту `spire_strings.ts`/`spire_game_strings.ts` (держит только тип `Nine`, т. е. компиляция), и нет теста на языки пушей.

---

## 2. Клиентские словари: что внутри

**`spire_strings.ts` (24 ключа):** title, untilEnd/dayUnit/hourUnit, friendsWeek, roomWeek, allMembers, climb, floor, guard, summit, aboveClouds, steps/stepsShort, coinsPerFloor, youHere, outOf, passed, lockedTitle («Шпиль откроется чуть позже»), zoneUp/zoneStay/zoneDown, you, back.

**`spire_game_strings.ts` (77 ключей):**
- тур первого входа: skip, next, start, tour1–3 (заголовок+текст) — `{a},{b},{c}…{z}` плейсхолдеры;
- ступень: step, timerPaused, подсказки режимов (guess, gap, odd, build, listenChoose/Build, match), onward, correctIs, mistakeSaved, exitTitle/exitText, continueStep, exit, preparing, retry, hearts, timeLeft;
- пустые состояния и ошибки: packMissing («Задания этой недели ещё готовятся»), packOffline, noIdentity («Не удалось войти в аккаунт»), noTier («Комната недели ещё не загрузилась»), saveFailed, offline, energyIn/climbNoWait/withPlus;
- итоги: stepPassed, oneHigher, noErrors/errorsN, onFloorProgress, higher, stepFailed/failHearts/failTimeout/failBack/failSub, again, later, floorCleared, guardAhead/floorAhead/guardSub, onFloorN, summitSub, aboveCloudsCta, coins;
- итог недели: weekResult, weekUp/weekDown/weekStay (`{stone}`), placeN, newWeekFromOne;
- правила (шторка): rulesTitle, rule1–8 (rule6/7 с числами монет через плейсхолдеры), close, peopleN, rankedBySteps.

Названий этажей **нет**: этаж — число; словами называются только «Страж» (5/10/15), «Вершина» и «Над облаками» (`spire_strings.ts`).

---

## 3. Серверные поля и пуши

### 3.1 Пуши (самое слабое место)
- «Итог недели»: **только `ru` и `uk`** — `byLang` = `{ru, uk}` в трёх ветках, остальное `|| byLang.ru` (`spire_week_result_push.ts:133-150`). Язык берётся из `pushTokenLang || 'ru'` (`spire_week_result_push.ts:110`, у зоны вылета `spire_zone_warning_push.ts:139`).
- «Зона вылета»: аналогично `ru`/`uk` (`spire_zone_warning_push.ts:149-159`).
- **Смесь языков:** имя камня подставляется уже по языку устройства (8 языков, `spire_notifications.ts:36-55`), а шаблон остаётся русским → на pt-BR приходит «Ты поднялся в Granito! Новый шпиль уже ждёт.».
- `en`: в таблице имён камней ключа нет (`SUPPORTED_PUSH_LANGS` = 8 языков, `:28`), `normalizeSpirePushLang` вернёт `ru`.
- Сторож зеркала `spire_notifications_tier_names_mirror.test.ts` сверяет имена камней с клиентом, но **не языки шаблонов**.
- Пуш открывает `/(tabs)/community?section=spire` (`app/notification_tap_handler.ts:33-37`) — вкладка у человека подписана на его языке (п. 8 таблицы).

### 3.2 Поля задач в пакете (`payload`)
| Режим | Поле, которое видит игрок | Источник | Язык |
|---|---|---|---|
| `guess_phrase`, `fill_gap` (es/de/fr/it) | `phrase` = `stem.prefix + ___ + stem.suffix` | целевой язык (`spire_multilingual_pool.ts:129-130`) | язык изучения ✅ |
| то же, если `stem` нет | `phrase` = `promptRu` | `:133` | **ru** |
| `find_oddity` | `phrase` = `promptRu` («Найдите фразу с ошибкой согласования.») | `:133`, `:208` | ru → **заменяется** клиентом на строку интерфейса (`spire_oddity_prompt.ts`) ✅ |
| `translate_build` | `phrase` = `promptRu` («Я уже нахожусь в банке.») + `wordBank` (целевой язык) | `:208` | **ru** ❌ |
| `speed_match` | `items[].prompt` = `tileLeft` (русское значение) + варианты (целевой язык); общий `prompt` = `promptRu`/«Соедините русские значения…» (в игре не показывается: `SpireTaskView.tsx:174-176,205` скрывает фразу для `match`/`timeattack`) | `:276-288` | **ru** ❌ |
| English-пул (v11), `translate_build` | `prompt` = `phrase.meaning.ru` | `tournament_pool_v11_candidates.ts:132` | **ru** ❌ |
| English-пул (v11), `guess_phrase` | `prompt` через `promptFor(proof, phrase.meaning.ru)` | `tournament_pool_v11_guess_phrase.ts:107` | **ru** ❌ |
| English-пул (v11), `speed_match` | пары английское слово ↔ `completedText` (русское значение); общий `prompt` русский | `tournament_pool_v11_candidates.ts:233-248` | **ru** ❌ |
| English-пул (v11), `find_oddity` | `prompt` = «Найдите предложение с грамматической ошибкой.» | `tournament_pool_v11_oddity.ts:240` | ru → заменяется клиентом ✅ |
| `listen_choose`, `listen_build` | фраза произносится голосом телефона на языке изучения; до ответа вместо текста — «Прослушать» (9 языков) | `SpireTaskView.tsx:178-206` | язык изучения ✅ (только `en`, черновик `spire_listen_draft_en.json`) |

Тип источника: `V11SourcePhrase.meaning` = `{ ru: string }` (`tournament_pool_v11_grammar_twins.ts:33`) — других языков смысла в данных нет вообще. Для es/de/fr/it то же самое (`promptRu`, `glossRu` в строках `spire_multilingual_*.json`).

### 3.3 Прочие серверные данные комнаты
- имя участника (`name`) — из профиля игрока или из таблицы ботов, **не переводится** (`spire_residents.ts:393`);
- этаж/ступень/место/камень — числа, перевод целиком на клиенте;
- `config/spire_v1` — только флаги/числа (`spire_config_contract.ts`), текстовых полей, видимых игроку, **нет**;
- итог недели (`spire_week_result_client.ts`) — числа и флаги `promoted/demoted`, тексты собирает клиент (`SpireWeekResultCard.tsx`) ✅.

### 3.4 Админские/модерационные тексты, которые видит игрок
- единственное, что доходит до игрока от админа, — ответ на жалобу о задании (`user_messages`, `report_replies.ts:358`; ИИ-черновик `:588`, `lang` по умолчанию `ru`). Текст на одном языке; выбор языка — на стороне админа. НЕ ПРОВЕРЕНО, подставляет ли админка язык игрока.
- флаги заданий (`admin_spire_task_flag.ts`), инциденты (`spire_task_incident_contract.ts`), конфиг (`admin_spire_config.ts`) игроку не видны.
- после жалобы задание снимается без штрафа — это лог (`use_spire_step_runner.ts:357`), пользовательского текста нет.

---

## 4. Поля «только ru» и какой режим их показывает

| Поле | Режим (study → режим задания) | Видит игрок? | Что видит при интерфейсе ≠ ru |
|---|---|---|---|
| `promptRu` / `phrase` | `translate_build` во всех пяти пулах (en, es, de, fr, it) | **да**, крупная фраза над банком слов (`SpireTaskView.tsx:173-175,210-222`) | русская фраза |
| `promptRu` / `phrase` | `guess_phrase` в English-пуле | да | русская подсказка + английские варианты |
| `items[].prompt` (`tileLeft`) | `speed_match` во всех пулах | да, в шапке пары (`SpireTaskView.tsx:159`) | русское слово/выражение |
| `promptRu` | `find_oddity` | нет — заменяется `localizeSpireOddityPrompt` | строка интерфейса (9 языков) ✅ |
| `promptRu` | `fill_gap`/`guess_phrase` es/de/fr/it | нет — вместо него `stem` (целевой язык) | целевой язык ✅ |
| `ruleNote`, `example`, `wrongOptionReasons` | любой | нет — вырезано из публичного пакета | — |

Вывод для Сверки: на всех интерфейсах кроме ru **в `translate_build` и `speed_match` (и `guess_phrase` в English-пуле) рабочие фразы на русском** — это поведение продукта, а не баг вёрстки. Для uk-пользователя это тоже русский (у `meaning` нет `uk`).

Граница, которую нужно решить владельцу/Ядру: оставить как есть (контент ru-источника) или завести `meaning.uk/es/pt-BR/…`.

---

## 5. Несогласованности имён и терминов

**Имя раздела «Шпиль» по языкам (одно слово — разные переводы):**

| язык | словарь Шпиля, вкладка, тумблер | плитка Главной (`home.tsx:2208`) | расход энергии (`energy_activity_titles.ts`) | задача дня (`today_tasks_view.ts:48`) | сообщение о релизе |
|---|---|---|---|---|---|
| ru | Шпиль | Шпиль | Шпиля | Шпиля | Шпиль |
| uk | Шпиль | Шпиль | Шпиля | Шпиля | Шпиль |
| en | Spire | Spire | Spire | Spire | — (нет ключа) |
| es | Aguja | Aguja | Aguja | Aguja | **Spire** |
| pt-BR | Torre | Torre | Torre | Torre | **Spire** |
| vi | Tháp | **Ngọn tháp** | Tháp | Tháp | **Spire** |
| id | Menara | Menara | Menara | Menara | **Spire** |
| tr | Kule | Kule | Kule | Kule | **Spire** |
| pl | **Wieża** | **Iglica** | **Iglicy** | **Iglicy** | **Spire** |

Худший случай — польский: три разных слова («Wieża» во вкладке/словаре, «Iglica» на Главной, «Iglicy» в задаче дня и расходе энергии).

**«Ступень»:** es — `escalón` (словарь) / `peldaños` (задача дня); остальное согласовано.

**Числа в тексте.** «15 этажей», «30 человек», «10 заданий», «3 сердца», «15%» зашиты в строки тура и правил на всех 9 языках (`spire_game_strings.ts`, tour1–3, rule1–5). Серверные константы (`SPIRE_ZONE_RATIO`, размер комнаты, число заданий) в тексты не подставляются → при изменении цифры нужно править 9 переводов, а теста на согласованность нет.

---

## 6. Плюрали и склонения

Плюралей **нет**: подпись подставляется после числа в любой форме.
- `steps` после числа (`SpirePodium.tsx:55`, `SpireAllMembers.tsx:58`, `SpireWeekResultCard.tsx:30`, `SpireResultPanel.tsx:79`): ru «ступеней», uk «сходинок», pl «stopni», pt-BR «degraus», es «escalones», en «steps». Для 1 (и 2–4 в ru/uk/pl, 21 в ru) форма неверна («1 ступеней», «1 steps», «2 stopni»).
- `peopleN`: ru «{n} человек» верно для любого числа; uk «{n} людей» (1 → «1 людей»); en «{n} people» (1); pl «{n} osób» (2–4 → «osoby»).
- `coins`, `coinsPerFloor`, `dayUnit`/`hourUnit` (`ч`, `д`) — сокращения, ок.
- `errorsN`, `hearts`, `timeLeft` построены с двоеточием/без существительного — ок.
- vi/id/tr без множественного числа — проблемы нет.

Рекомендация для Ядра/Дизайна (не делаю): ICU-плюрали для `steps`/`peopleN` либо безопасные формулировки с двоеточием («Ступеней: {n}»).

---

## 7. Что ждёт Сверку на каждом из 9 языков

Режим съёмки (`dev_spire_preview.tsx`, `spire_preview_fixtures.ts`) — **моки на русском**: имена Алиса/Марк/Дарья…, фраза «Она работает каждый день», варианты «каждый день/иногда/никогда» (`spire_preview_fixtures.ts:56,63-70,203-274`). Следовательно:
- на кадрах Шпиля через превью вся «внутренняя» часть заданий и имена участников будут русскими при любом языке интерфейса; **интерфейсные подписи, камни, правила, итоги, тур, ошибки — переводятся** и отражают реальный продукт;
- реальные задания (живой пакет) тоже русские в `translate_build`/`speed_match` (раздел 4);
- пуши снять нельзя на устройстве через превью; их тексты проверять по таблице (раздел 3.1): ru/uk — свои, остальные семь — русский шаблон с локальным именем камня;
- метка «бета» стоит только у языков изучения es/de/fr/it (`SpireHomeScreen.tsx:92`), у `en` нет — кадры «бета» снимать на изучении es/de/fr/it.

---

## 8. Приоритетный список дыр

| Приоритет | Дыра | Где | Кто |
|---|---|---|---|
| 🔴 | Пуши «Итог недели» и «Зона вылета» — только ru/uk; на 7 остальных русский текст + локальное имя камня | `spire_week_result_push.ts`, `spire_zone_warning_push.ts`, `spire_notifications.ts` | Ядро |
| 🔴 | Задания `translate_build`, `speed_match`, `guess_phrase` (en-пул) показывают русские фразы всем языкам, включая uk | `spire_multilingual_pool.ts`, `tournament_pool_v11_*.ts` | Ядро/Контент (решение владельца) |
| 🟡 | Польское название раздела: Wieża / Iglica / Iglicy | `home.tsx:2208`, `energy_activity_titles.ts:90`, `today_tasks_view.ts:48` | Дизайн/тексты |
| 🟡 | vi: «Tháp» vs «Ngọn tháp» на Главной | `home.tsx:2208` | тексты |
| 🟡 | Сообщение о релизе: «Spire» вместо локального имени, нет `en` | `app_messages.ts:1966-1970` | тексты |
| 🟡 | Нет плюралей: «1 ступеней», «1 steps», «1 людей» | `spire_strings.ts` + 5 экранов | Дизайн |
| 🟡 | Нет теста на полноту словарей Шпиля и на языки пушей | `tests/` | Ядро |
| 🟡 | Числа 15/30/10/3/15% зашиты в 9 переводов тура и правил | `spire_game_strings.ts` | Ядро |
| 🟡 | Серверный ответ админа на жалобу — один язык | `report_replies.ts:588,623` | Админка |
| 🟢 | Никнеймы ботов — ≈38% кириллицей | `tournament_reddit_bot_names.ts` | продуктовое решение |
| 🟢 | Все переводы кроме ru помечены «предложение, носителем не проверены» (`spire_strings.ts:5`, `spire_game_strings.ts:8`, `tier_names.ts:18`) | словари | владелец/носители |

---

## 9. НЕ ПРОВЕРЕНО

- как админка отправляет ответ на жалобу о задании (передаётся ли `lang` игрока);
- язык в `pushTokenLang`: откуда берётся при регистрации токена и обновляется ли при смене языка интерфейса (`app/push_token_registration.ts`);
- реальный английский пул `tournamentTasks` в Firestore — смотрел код сборки и тесты, не живые документы; утверждение «только ru» для него основано на типе `V11SourcePhrase.meaning = {ru}`;
- как выглядят длинные переводы на узких экранах (pl/vi/id/tr длиннее ru) — по словарю ни один не длиннее ru более чем в 1,6 раза, но вёрстка не открывалась;
- содержимое `SpireLockedState`, `SpireExitSheet` и др. сверено только по вызовам словарей, не по рендеру.
