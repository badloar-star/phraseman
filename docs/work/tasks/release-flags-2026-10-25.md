# Флаги 2.0 и номера сборки для билда 25.10 — таблица

Governance-ID: TG-3C2081A7D511
Governance-ID: TG-48B4AAD20461
Status: Таблица (24.10, 20:10). Один коммит «release 2.0.2 (144) + flags 25.10» — ТОЛЬКО в 08:00 25.10.
Owner: Ядро (сессия 1). Слово владельца: «Включить всё новое» — каждый экран при зелёной Сверке.
Источники: вердикт Сверки `docs/work/tasks/sverka-flags-verdict-2026-10-24.md`, чек-лист Макетов
`docs/work/release/FLAGS_SCREEN_CHECKLIST_2026-10-25.md` (4d10faebb), RUNBOOK Сайта 785062210, решения координатора 24.10.

## Outcome

Один коммит меняет значения флагов и четыре поля номеров в `app.json`. Больше ничего.

## Scope

Только константы флагов и номера. «Вместе»/друзья, тест «Не хочу с начала», экзамен главы — остаются `false`.

## Architecture

Флаги — константы в своих файлах (выбор между `IS_DEV` и `true`); номера — четыре поля `app.json`. Новых модулей нет.
Вспомогательная проверка типов на снимке HEAD — скрипт во временной папке сессии, снимок в C:/Temp/claude/head_check_core через `git archive` (не worktree).

## Security and privacy

Флаги не меняют сбор данных. Экраны «Вместе» и «Не хочу с начала» остаются выключенными. Новых разрешений и сторонних сервисов нет.

## Technical debt

«Сцена» и «Сегодня» обязаны переключаться только парой (Р4) — по коду это два независимых флага; после релиза свести их в один.

## Таблица флагов

| Экран | Флаг | Файл | Сейчас в сторе | В релиз 25.10 | Основание |
|---|---|---|---|---|---|
| Сезоны в «Обучении» | `SEASON_SCENE_V2_ENABLED` | components/learning-v2/season/season_flags.ts | `ENABLE_DEV_TOOLS && !IS_STORE_RELEASE` → выкл | **`true`** | Сверка 🟢 |
| «Слова» | отдельного флага нет (плитка Сезона; `LEARNING_V2_HIDDEN = false`) | app/learning_v2_visibility_switch.ts | виден | без изменений — включается вместе с Сезоном | Сверка 🟢 |
| Башня Пика (сцена) | `SPIRE_SCENE_V2_ENABLED` | components/spire/scene/spire_scene_flag.ts | `IS_DEV` → выкл | **`true`** | Сверка 🟢 |
| Главная «Сцена» | `HOME_SCENE_V2_ENABLED` | components/home/v2/scene/home_scene_flag.ts | `IS_DEV` → выкл | **`true` только вместе с «Сегодня» и только если до 07:30 придёт 🟢 повтора Сверки после Р2** (светлый бар — Макеты); иначе `IS_DEV` | Сверка 🟢 после Р2; Р4 |
| «Сегодня» | `TODAY_SCENE_V2_ENABLED` | components/home/v2/today_scene/today_scene_flag.ts | `IS_DEV` → выкл | **то же решение, что у «Сцены»** — обе вкл или обе выкл (иначе пропадает опрос) | Р4 |
| Чип «Слова» у героя Главной | `HOME_SCENE_WORDS_CHIP_ENABLED` | components/home/v2/scene/HomeScene.tsx | `false` | **`false`** | Замок владельца 22.10: у героя Главной нет вторичных чипов; «Слова» — плиткой Сезона |
| Хаб Диалогов (сцена) | `DIALOGS_SCENE_V2_ENABLED` | components/dialogs/scene/dialogs_scene_flags.ts | `true` | `true` (уже) | — |
| Экзамен главы (карта) | `SEASON_CHAPTER_EXAM_ENABLED` | components/learning-v2/season/season_flags.ts | dev → выкл | **выкл** (как сейчас) | Сверка: не включать; Р1 |
| Старт экзамена главы | `SEASON_CHAPTER_EXAM_START_ENABLED` | там же | **`true` в коде с 51a731aed** (в сторе закрыт родительским `SEASON_CHAPTER_EXAM_ENABLED`) | в коде остаётся `true`; экзамен включается только целиком (оба флага) при 🟢 Сверки, иначе выключается только родительский | решение координатора 24.10: при false в dev пропадут кнопка «Начать экзамен» и строка 6a9e44e16 — Сверке нечего проверять |
| «Вместе» / друзья | `FRIENDS_TOGETHER_UI_ENABLED` | app/friends_together/together_config.ts | `false` | **`false`** | слово владельца |
| Тест «Не хочу с начала» | `LEARNING_V2_PLACEMENT_UI_ENABLED` | components/learning-v2/placement/placement_flags.ts | `false` | **`false`** | слово владельца |
| Кнопка «Теория» | `LEARNING_V2_THEORY_BUTTON_ENABLED` | modules/learning-v2/theory/learning_v2_theory_v1.ts | `false` | `false` | нет в списке Сверки |
| Learning V2 виден | `LEARNING_V2_HIDDEN` | app/learning_v2_visibility_switch.ts | `false` | без изменений | — |
| Продолжить урок V2 на Главной | `HOME_CONTINUE_V2_ENABLED` | app/learning_v2_home_continue_route.ts | вкл | без изменений | — |
| Монеты за тренировку словаря | `LEARNING_V2_DICTIONARY_TRAINING_COINS_ENABLED` | app/learning_v2_dictionary_training_deck_v1.ts | `false` | без изменений | не экран |
| Моменты v3 | `moments_v3` (удалённый) | components/spire/moments/moments_flag.ts | remote_config | без изменений в коде | — |

## Номера сборки (тот же коммит, RUNBOOK раздел 1)

| Поле `app.json` | Сейчас | В релиз |
|---|---|---|
| `expo.version` | 2.0.1 | **2.0.2** |
| `expo.android.versionCode` | 143 | **144** |
| `expo.ios.buildNumber` | "143" | **"144"** |
| `expo.runtimeVersion` | 2.0.0 | **2.0.2** — обязательно |

Проверено 24.10 20:05 (только чтение):
- `runtimeVersion` берётся из `app.json`. `app.config.js` переносит его как есть и не переопределяет. Локальная `android/` (там `1.5.53`) в сборку не попадает: она в `.gitignore`/`.easignore`, а сборка идёт из `git archive`.
- Канал OTA `production` (`eas update:list`): на runtime **2.0.2 заплаток нет** — новая сборка пойдёт со своим JS. На `2.0.0` сейчас две заплатки: «coins queue fix (108b37562 + 92897af3f)» и более свежая «Stories announcements… (5169f85d6)», выложена сутки назад. Если оставить 2.0.0, новая сборка получит последнюю из них и откатит свой JS — отсюда 🔴 за 2.0.2.

## Р5 — «Сцена» и пакет премиум-тем

Пакет премиум-тем в HEAD — a50cfbf18. Сцена в чистом HEAD собирается с ним. Проверка — в списке блокеров (проверка типов приложения на снимке HEAD).
Серверная часть (`premiumThemeEntitlementsGet`, `premiumThemeConditionClaim`, `premiumThemeVideoWatchReport`) в HEAD уже экспортирована из `functions/src/index.ts` и входит в утренний серверный пакет.
Правила `firestore.rules` для неё (защищённое поле `premium_theme_entitlements_v1` в `users` и закрытая `premium_theme_video_watch`) лежат пока незакоммиченной чужой правкой (вперемешку с правилами историй) — их нужно закоммитить до заморозки.

## Verification

После коммита:
- сторожа флагов и вёрстки (`tests/*flag*`, `tests/layout_stability_contract`);
- `release:precheck`;
- сборка типов приложения.

## Rollback

Откат одного коммита (только значения).
