# Task packet: единый источник цветов сцены (Глубокое небо / светлое А)

Governance-ID: TG-676E8E88FA35
Status: In progress (шаг 1 — инвентаризация; закрытие дефекта чёрных пятен светлых grad_* в Диалогах — отдельным коммитом)
Owner: сессия «4 · ТЕМЫ»
Related epic/enabler: вердикт владельца 29.10 «Тёмная тема везде — глубокое небо, светлая — тон темы ярче и глубже, все экраны»

## Outcome

Все экраны со сценой берут цвета из одной функции scenePalette(themeId, appearance, screen), перенесённой 1:1 из JS-эталона Макетов; тёмное — «Глубокое небо», светлое — стратегия А; нет свечений из прозрачного чёрного; на каждом экране лог [SCENE-THEME]; гейт соответствия снимков Сверки эталонным кадрам с порогом в OWNER_LOCKS.

## Scope

In scope: инвентаризация мест расчёта цвета сцены; затем scenePalette и перевод экранов (Главная, Диалоги, Сезон/обложки, приветствие языка, aha, Пик — после проверки git status, файлы Codex через патч в handover); тесты; запись в OWNER_LOCKS.

Out of scope: стили сцен, «вечер», карточки — их владелец не выбирал.

## Architecture

Сейчас цвет сцены считается в нескольких местах (home_scene_tokens, dialogs_scene_tokens, season_art, language_welcome_palette, aha_theme, Пик). Целевое состояние — одна чистая функция без React и тонкие адаптеры; расчёт по эталону docs/design/v2-app/scene-approved-2026-10-29.md.

## Security and privacy

Данные не затрагиваются.

## Technical debt

Pay now: разрозненные расчёты цвета сцены сводятся к одному источнику.

## Verification

Тесты на все темы × оформления; кадры Сверки против эталонных (геометрия и средняя разница); сторож «нет слоёв из прозрачного чёрного».

## Rollback

git revert коммитов шага.

## Сторож тёмного у grad_* (замечание Ревизора к ac9573883, 29.10)

Governance-ID: TG-19F24F5D526D

Outcome: tests/dialogs_scene_light_grad_glow.test.ts проверяет и тёмное оформление grad_*: glowRight/glowLeft равны bgGlow[0]/[1], glowBottom null — тёмное не уедет молча.
Scope: один тест; коммит — вместе со следующим шагом (scenePalette), где сторож перепишется под «Глубокое небо». Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 1: чистая функция scenePalette (Главная и Диалоги), перенос 1:1 из JS макета

Governance-ID: TG-676E8E88FA35

Outcome: components/scene/scene_palette.ts — scenePalette(themeId, appearance, screen): светлое = стратегия А (scenePal макета), тёмное = «Глубокое небо» (STYLES.sky из scene-styles.js на палитре paletteOf); тест tests/scene_palette_parity.test.ts прогоняет код макета (vm) и сравнивает числа на всех темах × оформлениях, разница 0.
Scope: новый чистый модуль и тест; экраны пока не переключаются (шаг 2). Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 1б: страж «Глубокого неба» ближе к эталону, патч для файлов Пика у Codex, геометрия света Диалогов

Governance-ID: TG-ADB191E4E3C3

Outcome: страж контраста «Глубокого неба» в scenePalette считает те же строки пикселей, что guardSky эталона (квантование по слоям и звёзды), и сверяется в parity-тесте с manifest.json; в docs/work/handover/ лежит патч/инструкция для файлов Пика, занятых Codex, и описание геометрии света Диалогов против Главной. Экраны на функцию не переводятся до зелёного parity.
Scope: components/scene/scene_palette.ts, tests/scene_palette_parity.test.ts, документ в docs/work/handover/. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 2: Главная и Диалоги берут цвет сцены из scenePalette

Governance-ID: TG-ADB191E4E3C3

Outcome: общий слой components/scene/SceneBackdrop.tsx рисует утверждённую сцену (тёмное «Глубокое небо», светлое «А») по результату scenePalette; HomeSceneStage и DialogsSceneBackdrop рисуют фон им; цвета шапки/статус-бара Главной берут верх из той же палитры; палитра и 70 звёзд считаются один раз на (тема, оформление, экран, размер) — кэш модуля; вечер Главной = обычное «небо» (владелец выбрал «Небо + тёплый край», эталон придёт); светлые Диалоги — надписи и кнопки как в тёмном оформлении; лог [SCENE-THEME] с временем первого кадра.
Scope: components/scene/*, HomeSceneStage.tsx, HomeScene.tsx, dialogs scene (DialogsSceneBackdrop, dialogs_scene_tokens, use_dialogs_scene_theme), тесты. Пик, Сезон, остальные — следующими шагами. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 3: Сезон, обложки уроков, приветствие языка и aha берут цвет сцены из scenePalette

Governance-ID: TG-4E9514E039CC

Outcome: обложки Сезона/уроков, экран выбора языка и онбординг «aha» берут цвета фона только из scenePalette (тёмное «Глубокое небо», светлое «А»); по коммиту на экран; в каждом — лог [SCENE-THEME] с темой, оформлением, режимом и итоговыми цветами. Красный safe_top_one_canvas_contract (CommunityPackCheckScene, Codex) — в записку Codex, не чиню. Затем проект строки OWNER_LOCKS — координатору текстом.
Scope: components/learning-v2/season/*, app/language_welcome*, components/onboarding_aha/*, тесты читателей. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 3б: сторожа по замечанию Ревизора (холостой тест тёмного, белый ≥ 4,6 на зоне текста)

Governance-ID: TG-8FBAAFBB274F

Outcome: (1) tests/dialogs_scene_light_grad_glow.test.ts проверяет scenePalette «Глубокое небо» для всех grad_*, а не равенство bgGlow; (2) tests/scene_palette_parity.test.ts гарантирует «белый ≥ 4,6 на зоне текста Диалогов» на 29 темах × 2 оформления (мера — та же, что у стража: худшая строка зоны текста), для чего scene_palette.ts отдаёт sceneTextZoneWhiteContrast.
Scope: components/scene/scene_palette.ts (новая функция), два теста. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 3в: вкладка «Уроки» на scenePalette и лог положения иконок-героев Главной (слово владельца 29.10)

Governance-ID: TG-190D92B77BE9

Outcome: (1) сначала лог [SCENE-THEME] home:icons {x, y, size, sceneW, sceneH, источник} — выяснить, сдвинул ли иконки героя коммит 1e1613865 (фон SceneBackdrop против раскладки героя); отчёт координатору ДО правки; (2) вкладка «Уроки» берёт фон из scenePalette (после Сезона).
Scope: HomeSceneStage.tsx (лог), далее по результату. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 3г: приветствие языка берёт фон из scenePalette

Governance-ID: TG-190D92B77BE9

Outcome: экран выбора языка рисует фон слоем SceneBackdropFill (scenePalette, экран home), а top/bottom его палитры — из той же функции; лог [SCENE-THEME] language_welcome. Коммит на экран. Затем aha — отдельным коммитом.
Scope: app/language_welcome_palette.ts, app/language_welcome.tsx, тесты-читатели. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 4: вечер Главной «Небо + тёплый край» подключён

Governance-ID: TG-6217288ECA94

Outcome: вечерняя Главная (после 20:00, серия под угрозой) рисует утверждённое владельцем «Небо + тёплый край» (тёмное и светлое) из scenePalette: тёплый свет справа внизу оттенка темы, без красного и углей. Сторожа: parity + single_source + новый тест «вечер: тёплый край у всех тем, белый ≥ 4,6 на зоне текста».
Scope: scene_palette.ts (scenePaletteCached с вечером), HomeSceneStage.tsx, тест. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 5: Пик — scenePalette в SpireScene и рекорд этажа целиком (клиент + сервер)

Governance-ID: TG-46DE5C5EB96F

Outcome: (1) фон Пика (SpireScene/SpireScenePedestal/backdrop) берёт цвета из scenePalette («Глубокое небо» / «А»); (2) «Рекорд этажа» — одна фича, клиент и сервер: SpireFloorRecord, SpireRecordAttempt, spire_record_copy (9 языков), shared/spire_floor_records, серверная функция spireFloorRecords + тесты; вход в рекорд на клиенте за флагом SPIRE_FLOOR_RECORD_ENABLED, выключен по умолчанию, пока Ядро не выложит сервер; (3) политика конфиденциальности сверена с показом «Ваш / Участник» и лучших результатов комнаты.
Scope: components/spire/{SpireHomeScreen,scene/SpireScene,scene/SpireScenePedestal,scene/spire_scene_backdrop*,SpireFloorRecord,SpireRecordAttempt,spire_record_copy}, app/spire/spire_floor_record_flag.ts, shared/spire_floor_records.ts, functions/src/spire_floor_records*.ts, тесты. Не берём: achievements, no_energy_sheet, report_store, spire_week_result_client (другие хозяева). Architecture/Security/Debt/Verification/Rollback — как выше; серверный коммит — после слияния 13f66f310, экспорт в index.ts — Ядро.

## Шаг 6: перепин сторожа обложки Сезона

Governance-ID: TG-48746D462B6B

Outcome: tests/season_wire_contract.test.ts проверяет новое утверждённое поведение обложки (SceneBackdropFill из scenePalette на всю обложку) вместо старых градиентов heroArt; проверка не слабее — слой обязан заполнять всю обложку, старых градиентов нет.
Scope: один тест. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 7: экран Пика ≤ 400 строк (tests/spire_scene_contract)

Governance-ID: TG-7EBBC7226ED9

Outcome: components/spire/SpireHomeScreen.tsx снова ≤ 400 строк без ослабления теста: вход в рекорд этажа вынесен в components/spire/spire_record_slot.tsx (флаг + карточка), экран зовёт одну функцию. На HEAD тест зелёный (399 строк) — красный только в рабочей копии из-за встроенной карточки рекорда; чинится вместе с коммитом рекорда.
Scope: SpireHomeScreen.tsx, новый spire_record_slot.tsx, тесты spire_floor_record_flag. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 8: перепин tests/spire_scene_contract (overScene у Сообщества)

Governance-ID: TG-B7552D855F06

Outcome: tests/spire_scene_contract.test.ts:148 следует за реальным условием шапки Сообщества на HEAD: поверх сцены — раздел «Наборы» (своя сцена) ИЛИ «Пик» при флаге сцены и готовой сцене. Условие изменено сводным коммитом a82a3b220 (наборы со сценой); тест не ослаблен — проверяются обе части условия.
Scope: один тест. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 9: типы SpireHomeScreen (pre-push)

Governance-ID: TG-D78ABC5EFA9F

Outcome: TS2322 в components/spire/SpireHomeScreen.tsx: в spireRecordSlot вместо булева preview передан объект превью (или null); передаётся !!preview. Типы рабочего дерева сходятся.
Scope: одно выражение. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 10: линт text-integrity/no-unsafe-text-truncation (129 ошибок в HEAD) + react/display-name в spire_record_slot

Governance-ID: TG-33D2AC612B0D

Outcome: правило no-unsafe-text-truncation (tools/eslint-rules/no-unsafe-text-truncation) не находит нарушений: текст не обрезается молча — перенос/вёрстка либо явная разрешённая обрезка (ClampedText / допустимый маркер), никакого adjustsFontSizeToFit; внешний вид не меняется (где меняется — сверка со снимками). Коммит частями по экранам. Заодно react/display-name в components/spire/spire_record_slot.tsx:28.
Scope: файлы из C:/Temp/claude/coord/lint.txt. Architecture/Security/Debt/Verification/Rollback — как выше (откат — revert по экрану).

## Шаг 11: «обрезана верхняя часть сцены, НИГДЕ!» — жёсткий край сцены и тёмная сцена в светлой теме (слово владельца со скрином)

Governance-ID: TG-CF505DDA12AA

Outcome: на всех экранах со сценой (начиная с «Карточки → Все сохранённые») сцена не обрывается жёсткой горизонтальной линией — плавно уходит в фон; цвет сцены только из scenePalette по теме и оформлению (светлое «А», тёмное «Глубокое небо»); лог [SCENE-EDGE] (экран, высота блока сцены, высота экрана, тема, палитра и её источник) сначала; сторож: ни один экран со сценой не задаёт ей фиксированную высоту с жёстким краем.
Scope: app/flashcards_collection.tsx и прочие экраны со сценой (опись по homeSceneTokensForTheme / своим градиентам), новый сторож. Строка замка OWNER_LOCKS — через координатора. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 12: нижний край сцены — скругление как у верхних углов карточки «Сегодня» (слово владельца 29.10)

Governance-ID: TG-5C3EC70A330D

Outcome: на всех экранах со сценой нижний край скруглён тем же радиусом, что верхние углы карточки «Сегодня»; найти, почему на Главной в светлой «А» край выглядит ровным (клип/overflow/перекрытие карточкой/отдельная ветка); сторож «у сцены всегда скруглён нижний край с тем же радиусом»; строка замка — координатору.
Scope: HomeSceneStage/HomeScene/Dialogs/Season/Peak сцены, новый сторож. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 13: краска сцены не ложится на иконки + скругление низа (одним заходом, слово владельца 29.10)

Governance-ID: TG-64E9CD942871

Outcome: слои цвета сцены (градиент, свет, затемнение низа, тёплый край) лежат ПОД иконками на Главной, в Диалогах, Сезоне и Пике; иконки рисуются последними в своих цветах; лог [SCENE-LAYERS] (порядок слоёв, zIndex, opacity/цвет слоя над иконкой) сначала; сторож «иконки идут после слоёв цвета»; плюс скругление нижнего края сцены как у верхних углов карточки «Сегодня».
Scope: HomeSceneStage, DialogsSceneStage, SeasonCourseView, SpireScene, сторож. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 14: карточка «Сегодня» начинается под краем сцены с зазором — скругление 32 dp видно целиком (факт Макетов, слово владельца)

Governance-ID: TG-23926752E1CA

Outcome: на Главной (и по тому же принципу в Диалогах, Сезоне, Пике) всё, что идёт ниже сцены, начинается ПОД её нижним краем с зазором, а не заезжает на неё; нижнее скругление сцены видно целиком, как верхние углы карточки; проверка логом [SCENE-EDGE] (sceneH против y карточки); сторож «ниже сцены ничего не заезжает на неё». Плавного перехода нет (владелец отменил).
Scope: home_scene_fit.ts, HomeSceneStage.tsx (константа перекрытия), HomeScene.tsx (отрицательный отступ), тесты раскладки; Диалоги/Сезон/Пик — проверка и такая же правка. Architecture/Security/Debt/Verification/Rollback — как выше (откат — revert).

## Шаг 15: сцена — отдельный объёмный блок на прежнем месте (срочное уточнение владельца 29.10)

Governance-ID: TG-AAF933D63050

Outcome: нижний край сцены остаётся ТАМ, ГДЕ БЫЛ раньше (не поднимается из-за отмены наезда карточки); сцена — отдельный объёмный блок со скруглением низа 28 dp; карточка «Сегодня» и всё ниже начинается ПОД сценой с видимым зазором; объём — тонкая тень или мягкий переход тона по краю (цвета из темы, без обводки; 1px полупрозрачная разрешена); одинаково в тёмной и светлой «А» на всех экранах со сценой; сторож: перекрытия нет, зазор есть, радиус низа 28.
Scope: home_scene_fit, HomeSceneStage/HomeScene, Диалоги, «Сегодня», Сезон, Пик, тесты. Architecture/Security/Debt/Verification/Rollback — как выше.

## Шаг 16: сцена — резкий край, тень как у отдельного блока, мерцающие звёзды в тёмных темах (срочно, слово владельца 29.10)

Governance-ID: TG-2C1CAE7E24C5

Outcome: сцена кончается там же, где раньше; нижний край резкий, углы скруглены (28 dp), без плавного перехода и фейда; под блоком заметная тень (приподнят над фоном); карточка «Сегодня» ниже с зазором; в тёмных темах внутри сцены звёзды неба мерцают на UI-треде (при «Убрать анимации» статичны), в светлой «А» та же форма и тень без звёзд.
Scope: components/scene/SceneBackdrop.tsx, новый components/scene/SceneStarTwinkle.tsx, обёртки сцен с тенью (HomeSceneStage, DialogsSceneStage, SeasonCourseView, TodaySceneView; Пик — после кандидата), общий помощник тени, сторож tests/scene_bottom_edge_contract.test.ts и новый тест мерцания.
Architecture: тень рисуется внешней обёрткой без overflow hidden (iOS shadow*, Android elevation и фон нижнего тона), содержимое клипается внутренней обёрткой с радиусом 28; мерцание — Reanimated shared value на звезду, 14 из 70 звёзд, без setState в кадрах; цвета из scenePalette.
Security and privacy: данные не собираются и не передаются, политика не затрагивается.
Technical debt: старое затемнение низа сцены остаётся внутри блока (нужно стражу контраста текста); при необходимости убрать фейд в фон на краю — отдельно; Пик в этот коммит не входит.
Verification: tests/scene_bottom_edge_contract, scene_star_twinkle_contract, home_scene_fit, dialogs_scene_hero_space, scene_layers_under_icons, scene_palette_parity; проверка типов по затронутым файлам; кадры «до/после» от Сверки.
Rollback: git revert коммита; звёзды Svg возвращаются сами.

## Шаг 17: [HERO-TINT] — журнал краски на иконках героя (сперва логи, правка после кандидата)

Governance-ID: TG-1503390F1A90

Outcome: в журнале видно, какой слой героя красится, каким цветом и с какой непрозрачностью (слой accent в ThemedArtLayers красится tintColor темы), чтобы по фактам решить, как оставить иконки поверх сцены своими цветами; поведение экрана не меняется.
Scope: components/theme/ThemedArtLayers.tsx (одна строка журнала на смену ключа, dev). Правка окраски за флагом — отдельным шагом после хеша кандидата.
Architecture: журнал в существующем эффекте слоя accent, без новых состояний и перерисовок.
Security and privacy: данных не собирает, политика не затрагивается.
Technical debt: журнал dev-only (в релизе console вырезается); для устройства владельца понадобится запись через журнал обращений.
Verification: синтаксис файла, тесты ThemedArtLayers.
Rollback: git revert коммита.

## Шаг 18: тень сцены без Android-elevation (замечание Ревизора: соседи сцены могут уйти под elevation 12)

Governance-ID: TG-121CD46A4D81

Outcome: тень блока сцены рисуется свойством boxShadow (одинаково на iOS и Android, как тени карточек V2), без elevation, поэтому порядок наложения соседей (шапка, «Назад», пилюли) не меняется.
Scope: components/scene/SceneBlockShadow.tsx, сторож tests/scene_shadow_and_stars_contract.test.ts.
Architecture: elevation и shadow* убраны, вместо них style.boxShadow с цветом чёрного и прозрачностью по теме.
Security and privacy: данных не касается.
Technical debt: сила тени подбирается по кадрам Сверки.
Verification: тесты scene_shadow_and_stars_contract и scene_bottom_edge_contract, проверка синтаксиса, кадры Pixel от Сверки.
Rollback: git revert коммита.

## Шаг 19: темы за награды — вернуть их собственные сцены; высота сцены Главной = «Уроки»; тёмная сцена — звёздное небо без затемнения низа (слова владельца 29.10, КОД В РАБОЧЕМ ДЕРЕВЕ, коммит только после одобрения макета)

Governance-ID: TG-F118CA58549B
Governance-ID: TG-2F4173BEDFFE
Governance-ID: TG-D53A4C0FCEE3

Outcome: (1) у шести тем за награды (olive, signal_lime, storm_violet, titanium, horizon, gravity_blue) сцена Главной снова своя из premiumThemeVisualSpec, как на da0a435e3, с их PremiumThemeMotion, без общих звёзд неба; обычные темы остаются на «Глубоком небе»; (2) высота сцены Главной равна высоте сцены «Уроки» (Сезон) на любом окне и шрифте; (3) в тёмных темах нет затемнения низа, звёзды по всей сцене.
Scope: HomeScene.tsx (токены), HomeSceneStage.tsx (фон премиум-тем), home_scene_fit.ts, SceneBackdrop/scene_palette (затемнение и звёзды), DialogsSceneStage, сторожа, журнал [SCENE-SOURCE] и [SCENE-EDGE].
Architecture: премиум-тема выбирается по isPremiumSceneTheme; фон = LinearGradient токенов + свет края, остальное по 2.0.3; общая форма (радиус 28, тень, зазор) для всех.
Security and privacy: данные не затрагиваются.
Technical debt: исключение из вердикта 29.10 для 6 тем фиксируется в OWNER_LOCKS через координатора.
Verification: тесты на 6 тем (цвета сцены = premiumThemeVisualSpec, звёзд нет, PremiumThemeMotion на месте), сторож высоты Главная=Уроки, кадры «2.0.3 / сейчас / после».
Rollback: git revert коммита.

## Шаг 20: герой на сцене Главной — крупный, как в утверждённом эталоне, текст поверх (слово владельца 29.10, код в рабочем дереве до выбора на макете)

Governance-ID: TG-F118CA58549B

Outcome: герой Главной 160 dp (эталон approved/scene, HERO_HOME) вместо вписанного 140 dp у самого края; справа 20, по центру сцены по вертикали, не ужимается под текст; слои фон → герой → текст, читаемость текста держит собственная тень текста. Журнал [HERO-SIZE] показывает размер героя и долю высоты сцены.
Scope: HomeSceneStage.tsx (размер, место, отключение маски/вписывания, тень текста), сторож.
Architecture: константы HERO и отступы в одном месте, маска и вписывание отключены флагом HERO_OVER_TEXT; логика homeSceneHeroFade остаётся нетронутой.
Security and privacy: данные не затрагиваются.
Technical debt: мёртвые ветви маски героя удалить после одобрения макета.
Verification: тесты сцены, замер в журнале, кадры «было / эталон / сейчас».
Rollback: git revert коммита.

## Шаг 21: выбор владельца на макете — высота 412, тёмная сцена без затемнения низа, герой 280, звёзды по всей сцене (в это обновление)

Governance-ID: TG-91AEF961FCC3

Outcome: общая высота сцены Главной и «Уроков» 412 dp; у тёмного неба нет затемнения низа (вариант «а»); герой Главной 280 dp, справа 20, по центру сцены, текст поверх с мягкой тенью; звёзды по всей сцене (70 палитры + 102 нижних), мерцает каждая 8-я. Темы за награды не трогаются (721a3597c).
Scope: scene_hero_height.ts, home_scene_fit.ts, HomeSceneStage.tsx, SceneBackdrop.tsx, SceneStarTwinkle.tsx, SeasonCourseView.tsx (через константу), тесты-сторожа.
Architecture: одна общая константа высоты, флаги SCENE_DARK_BOTTOM_GUARD=false и HERO_OVER_TEXT=true, мерцание на UI-треде (Reanimated).
Security and privacy: данные не затрагиваются.
Technical debt: мёртвые ветви маски героя и поле контраста внизу тёмной сцены (≈3,0–3,3:1) — решение владельца; убрать ветви позже.
Verification: тесты высоты, сцены, героя, звёзд, parity; кадры Сверки.
Rollback: git revert коммита.

## Шаг 22: новое слово владельца — край сцены заходит под карточку «Сегодня», герой 200 на прежнем месте, «горизонт глубже» без полосы (КОД В ДЕРЕВЕ, НЕ коммитить до одобрения макета)

Governance-ID: TG-91AEF961FCC3

Outcome: нижний край сцены Главной заходит под карточку «Сегодня» (под её заголовок, карточка поверх сцены, наезд 44 dp), общая высота 412; герой 200 dp на прежнем месте 2.0.3 (справа −14, под шапкой); тёмное небо темнее у горизонта в самих цветах, без полосы и затемнения снизу; звёзды по всей сцене.
Scope: HomeSceneStage.tsx, HomeScene.tsx (через константу), home_scene_fit.ts, SceneBackdrop.tsx, сторожа края и героя.
Architecture: константы HOME_SCENE_PANEL_OVERLAP(_DP)=44, HERO=200, HERO_RIGHT=−14; остановки неба умножены на (1−a) вместо чёрного градиента.
Security and privacy: данные не затрагиваются.
Technical debt: контраст белого текста внизу тёмной сцены проверить по кадрам.
Verification: тесты края/героя/сцены, parity, кадры Сверки.
Rollback: git revert коммита.

## Шаг 23: убрать любое затемнение низа сцены везде (слово владельца 29.10: «вся сцена без затемнения внизу, эти 20 % убрать немедленно»)

Governance-ID: TG-53049A531AAD
Governance-ID: TG-F7F380D61A30

Outcome: нижние ~20 % сцены не темнее середины ни слоем, ни градиентом, ни в цветах неба — на Главной, в Диалогах, «Сегодня», Сезоне/«Уроках», Пике, в тёмных темах и светлой «А»; удалены scrim, виньетка, страж низа, затемняющий хвост градиента; читаемость текста держит тень текста.
Scope: SceneBackdrop.tsx (небо и светлая сцена), DialogsSceneStage.tsx, TodaySceneView.tsx, помощник scene_flat_bottom.ts, сторож. Темы за награды (721a3597c) не меняются.
Architecture: остановки неба ниже горизонта заменены тоном середины (между серединой и горизонтом); светлый градиент уходит в тон середины на половине пути; чёрных наложений внизу нет.
Security and privacy: данные не затрагиваются.
Technical debt: контраст белого текста внизу сцены ниже прежнего (замер по пикселям в отчёте), проверка по кадрам; тесты палитры, считающие контраст стража, описывают палитру, а не экран.
Verification: сторож отсутствия слоёв, замер яркости низа и середины до/после, тесты сцены, кадры Сверки.
Rollback: git revert коммита.

## Шаг 24: вся тёмная сцена — ровный сине-серый тон верха неба (слово владельца 29.10: «ВСЯ СЦЕНА ВОТ ТАКОГО ЦВЕТА ЦЕЛИКОМ»)

Governance-ID: TG-4901F2F8EB93

Outcome: в тёмной теме фон сцены от шапки до нижнего края — один тон (между серединой и горизонтом неба своей темы, около #516583 у графита), без вертикального потемнения; допустим лёгкий диагональный перелив (светлее слева) и звёзды по всей сцене; полосы дымки у горизонта нет.
Scope: components/scene/SceneBackdrop.tsx (небо), сторож scene_no_bottom_darkening_contract.
Architecture: все остановки вертикального градиента равны тону T = mix(mid, hor, 0.25) из палитры темы; солнечный свет сверху остаётся, дымка отключена флагом SCENE_HAZE_BAND=false; диагональный светлый перелив — белый слой прозрачностью до 0,07.
Security and privacy: данные не затрагиваются.
Technical debt: контраст белого текста по всей сцене ниже прежнего, держится тенью текста.
Verification: сторож (низ ≥ середины, остановки равны), тесты сцены, кадр Сверки.
Rollback: git revert коммита.

## Шаг 25: геометрия сцены и герой без окраски/свечения (слово владельца 29.10: «сначала исправить геометрию! убрать наложение цвета на иконку и свечения вокруг иконки»)

Governance-ID: TG-7B9465A00FD4

Outcome: герой Главной рисуется своими цветами арта (слой accent не красится), вокруг героя нет ореола; сцена на всю ширину, нижние углы одинаково скруглены, без тёмных краёв: цвета шапки, рамки с тенью и верха/низа сцены равны единому тону неба.
Scope: ThemedArtLayers.tsx (параметр tintAccent), HomeSceneStage.tsx (без окраски, без halo), scene_palette.ts (sceneTopHex/BottomHex = тон неба для тёмных), SceneBackdrop.tsx, сторож.
Architecture: tintAccent=false только у героя Главной (плитки и «Сегодня» красятся как раньше); ореол sceneHalo и его Rect удалены; рамка с тенью берёт тон сцены, а не тёмный низ палитры.
Security and privacy: данные не затрагиваются.
Technical debt: свет края у наград-тем (sceneLight) оставлен как у них на бою.
Verification: сторож (нет tintColor у героя, нет halo), тесты сцены, кадр Сверки.
Rollback: git revert коммита.

## Шаг 26: макет v10 одобрен владельцем — карточка «Сегодня» на прежнем месте, сцена растёт вниз до края под её заголовком (выпуск)

Governance-ID: TG-BBE376C619DD

Outcome: высота сцены Главной и «Уроков» 448 dp (верх карточки «Сегодня» y=404 как раньше: 392 + зазор 12; край сцены на 44 dp ниже, под заголовком карточки); всё остальное одобренного v10: ровный тон неба по таблице, звёзды в тёмных, светлая без scrim и звёзд, герой 200 без окраски и ореола, углы 28, тень блока, наградные темы со своим фоном.
Scope: scene_hero_height.ts и тесты высоты/края; коммит всей накопленной в дереве правки сцены (SceneBackdrop, SceneStarTwinkle, SceneBlockShadow, HomeSceneStage, HomeScene, home_scene_fit, Диалоги, «Сегодня», Сезон, ThemedArtLayers, scene_palette, сторожа).
Architecture: одна константа высоты 448 = 404 (место карточки) + 44 (заголовок карточки); наезд 44 dp, зазор 0.
Security and privacy: данные не затрагиваются.
Technical debt: контраст белого текста внизу тёмной сцены ниже прежнего (держится тенью текста); копии героя 512 растянуты ≈1,2×; Пик и перевод «Сегодня» на scenePalette — отдельно.
Verification: тесты сцены, parity, сторожа; кадры Сверки.
Rollback: git revert коммита.
