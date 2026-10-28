# Task packet: цвет сцены везде от текущей темы (SCENE-THEME)

Governance-ID: TG-9DF9403314D1
Status: In progress
Owner: 4 · ТЕМЫ
Related epic/enabler: баг владельца «тема серая, а сцена в уроках фиолетовая»; задача координатора 28.10

## Outcome

Все экраны со сценой (Главная, Пик, уроки Learning V2, диалоги, карточки, наборы, онбординг, приветствие языка) берут цвета сцены
из одной функции от текущей темы; при серой теме «Затмение» (graphite) нигде нет фиолетового. На каждом экране лог [SCENE-THEME].
Guard-тест: экраны со сценой не держат литералов цвета сцены.

## Scope

In scope: инвентаризация источников цвета сцен; подключение экранов к единому источнику; логи; guard-тест.
Out of scope: новые цвета сцен (рисует сессия Макеты, не одобрены); файлы, изменённые Codex (SpireHomeScreen, _layout, paywall, stories) — описывать фикс и передавать координатору.

## Architecture

Единый источник — функции токенов сцены от темы (homeSceneTokensForTheme и соседи); экраны не держат своих палитр. Детали — по итогам инвентаризации.

## Security and privacy

Не касается данных пользователей: только цвета.

## Technical debt

Contain: хардкод фиолетового в сценах заменяется токенами; позднее — единый тест-сторож.

## Verification

Логи [SCENE-THEME]; снимки Сверки до/после (3 темы × светлая/тёмная × экраны сцен); guard-тест и профильные тесты точечно.

## Rollback

git revert коммитов правки.

## Роли грамматики и панель опроса от темы (продолжение, 28.10)

Governance-ID: TG-C0015AB320F9

Outcome: цвета ролей грамматики (разбор теории, интро урока) и панели награды опроса — оттенки/сдвиги тона от акцента ТЕКУЩЕЙ темы вместо фиолетового #6D28D9/#C4B5FD; текст >= 4,5:1 на карточке, роли различимы между собой (OKLab); guard по всем темам.
Scope: components/lesson_help_theory_ui.tsx, components/lesson_intro_rich.tsx, components/survey/SurveyRewardPanel.tsx, новый чистый модуль палитры ролей, guard-тест. Architecture/Security/Debt/Verification/Rollback — как выше (цвета, данные не затронуты; откат — revert).

## Значки плеера Learning V2 (28.10)

Governance-ID: TG-D7699E1469EE

Outcome: значки «прослушать» и микрофона в плеере урока видны (>= 3:1 к фону) на всех 23 темах x светлое/тёмное; цвета — токены темы; guard по всем темам.
Scope: измерение, правка значков через токены темы (только если файл свободен от чужих правок), guard-тест. Architecture/Security/Debt/Verification/Rollback — как в этом пакете выше (цвета, данные не затронуты; откат — revert).

## Аудит литералов цвета по приложению (28.10)

Governance-ID: TG-58E5D60892EF

Outcome: свежая перепись литералов цвета в app/** и components/** (без токенов/палитр, dev, тестов), таблица «файл → цвет → что это → чем заменить», список файлов с чужими незакоммиченными правками для Codex, затем замена по разделам (только свободные файлы) и ratchet-тест «новые литералы не добавляются».
Scope: скрипты чтения (scripts/color_literal_census.mjs, сводка), документ docs/work/color-audit-2026-10-28.md, config/*-baseline.json, guard-тест; правки экранов — пакетами после согласования таблицы с координатором. Файлы с чужими правками не трогаются.
Architecture/Security/Debt/Verification/Rollback — как в этом пакете выше (цвета, данные не затронуты; откат — revert).

## Аудит цвета — пакеты замены (продолжение, 28.10)

Governance-ID: TG-253713A85C76

Outcome: пакеты замены литералов цвета токенами темы по таблице docs/work/color-audit-2026-10-28.md (пакет 1 «Фраза дня» сделан; пакет 2 — оформление YouTube Lingman, части речи, окно обновления, панель ошибок; затем карточки, мёртвое).
Scope: только свободные файлы (без чужих незакоммиченных правок), каждый пакет — отдельный коммит с guard-тестом и обновлением базы ratchet. Architecture/Security/Debt/Verification/Rollback — как выше (цвета, данные не затронуты; откат — revert).

## Аудит цвета — решения владельца (28.10, вечер)

Governance-ID: TG-D55E9DA26232

Outcome: по решениям владельца через координатора — (B) theme-exempt с конкретной причиной для арта/коллекционного; «Теория» — оттенки акцента текущей темы, не своя палитра (снять замок «у каждой темы свой цвет», если есть в OWNER_LOCKS); онбординг — цвета темы по умолчанию (после выбора темы перекрашивается); CleanOnboarding.tsx (Codex) — правка списком; карточки — статусы/источники из токенов темы; мёртвый premiumMemberStyles.ts удалить.
Scope: только свободные файлы; чужие незакоммиченные не трогаются. Architecture/Security/Debt/Verification/Rollback — как выше (цвета, данные не затронуты; откат — revert).

## Аудит цвета — вторая очередь решений (28.10, поздно вечером)

Governance-ID: TG-4BAF7F1B8977

Outcome: (1) цвета статусов карточек — theme-exempt «статус = смысл» (решение владельца: оставить светофор); (2) удаление кластера components/ui (v2_theme, V2Countdown, v2_sheet и др.) вместе с режимом sound_contrast_mode_v1 и двумя тестами одним коммитом после проверки импортёров и маршрутов; (3) удаление таблицы medalToastThemeStyles, пропа themeMode и правка двух контрактных тестов.
Scope: перечисленные файлы и тесты; Learning V2 предупреждается до удаления режима. Architecture/Security/Debt/Verification/Rollback — как выше (цвета; откат — revert коммита).

## Удаление кластера components/ui и режима sound_contrast (28.10)

Governance-ID: TG-5B567834B897

Outcome: удалить components/ui/{v2_theme,v2_ui,V2Fx,V2Countdown,v2_sheet,PrimaryButton} и удалённый режим modules/learning-v2/modes/sound_contrast_mode_v1.tsx одним коммитом; поправить tests/learning_v2_arena_visual_primitives_gate.ts и tests/sage_porcelain_real_device_visibility_contract.test.ts; Learning V2 уже убрал зависимость из своего теста (b060eebbc, 27e2e9943).
Scope: только перечисленные файлы. Architecture/Security/Debt/Verification/Rollback — как выше (цвета, мёртвый код; откат — revert).
