# Экзамен главы v2 и «Мастерская фраз»: карта цветов на токенах тем и контраст во всех темах

Governance-ID: TG-D3CF731F229C

## Outcome
Координатор 25.10: для Learning V2 и Дизайна — карта цветов экрана экзамена главы v2 (прототип PYJfpbH1Upz9KCLngxVyG9) и «Мастерской фраз» (Mgiat3h327LrNzinagLX87) на токенах тем: поле ввода, плашки «Неверно/Верно», полоса прогресса, слабые темы, кнопки с замком/часиками; проверка контраста ≥ 4,5 во всех темах (светлых и тёмных) — таблицей в docs/work/, без кода экранов. Каждый цвет — оттенок текущей темы (замок theme-colors-only).

## Scope
In scope: docs/work/exam-workshop-theme-token-map-2026-10-25.md (карта + таблица контраста), временный скрипт замера в Temp (читает liquidGlassTokens через tsx).
Out of scope: код экранов, токены тем (только если найдено нарушение — отдельной задачей), закрытая тема тёмных сцен.

## Architecture
Роли прототипов → токены liquidGlassTokens(themeId, {level, appearance}); контраст WCAG по каждой паре «текст/фон» для 29 тем × светлая/тёмная × уровни Спокойно/Акцент/Максимум; полупрозрачные фоны сводятся на подложку (карточка или фон экрана).

## Security and privacy
Не касается.

## Technical debt
Таблица — снимок токенов на 25.10; после правки палитры пересчитать тем же скриптом.

## Verification
Скрипт печатает минимум по каждой роли и список нарушений; таблица в документе.

## Rollback
Удалить документ.

## Продолжение: скрипт в scripts/ и замер 12 новых сцен Главной (координатор 25.10)
Governance-ID: TG-D3CF731F229C

Скрипт карты экзамена перенесён из .codex-tmp в scripts/theme_contrast_measure.ts (документ ссылается на новое место). Новый замер: 12 особых сцен Главной (Моменты, components/home/v2/scene, 3a42a7e8f/e3b3c313e) — рисуются той же сценой (белый текст, белая кнопка, полоска рекорда), вечера у них нет. Скрипт scripts/home_scene_special_contrast_measure.ts: 29 тем × светлая/тёмная, фон — верх, низ сцены и пятно света; итог и замены — docs/work/home-scene-special-contrast-2026-10-25.md для Моментов. Код сцен не меняется.

## Продолжение: карта токенов пейвола Plus заранее (координатор 25.10)
Governance-ID: TG-F3587154FDFC

Макеты делают контекстные пейволы по docs/work/research/paywall-research-2026-10-25.md. Заранее: карта токенов пейвола (заголовок, цена, сумма списания, предвыбранный план, кнопка покупки, «Не сейчас», «Восстановить покупки», таймлайн триала) на тех же поверхностях, что текущий PaywallPlus (paywallSheetBg, paywallPlateBg, planRowSelectedPaint), контраст во всех 174 сочетаниях тем. Скрипт scripts/paywall_contrast_measure.ts, документ docs/work/paywall-theme-token-map-2026-10-25.md. Код пейвола не меняется. Требование сторов из исследования (раздел 5): сумма списания не может быть тише триала — в карте она не приглушена.

## Продолжение: замер контраста Пика (координатор 25.10)
Governance-ID: TG-F3587154FDFC

Пик — частый раздел жалоб. Замер во всех темах: сцена Пика (надзаголовок, «Этаж N», строка ступеней, «Комната недели» на стекле, своя строка, ссылка «Все участники»; фон — градиент и свет сцены + затемнение под вкладками spireTopShadeAlpha, день и вечер) и экраны Пика вне сцены на useSpirePalette (задание, итог недели, «Все участники», шторка выхода, верно/неверно), бейдж места на плитке Пика на Главной. Скрипт scripts/spire_contrast_measure.ts, документ docs/work/spire-contrast-2026-10-25.md для Моментов. Код Пика не меняется.

## Продолжение: Сезон и обычные сцены Главной (координатор 25.10)
Governance-ID: TG-F3587154FDFC

Тот же замер для Сезона (обложка, карточки эпизодов, экран урока на токенах, окно эпизода) и обычных сцен Главной (по реальным наборам строк состояний, вечер «серии под угрозой»). Скрипт scripts/season_home_contrast_measure.ts, отчёт docs/work/season-home-contrast-2026-10-25.md. Код не меняется.

## Продолжение: Карточки и Диалоги (координатор 25.10)
Governance-ID: TG-F3587154FDFC

Замер Карточек (хаб, стопка, списки, свайп, видео-наборы, шторки) и Диалогов (хаб, пузыри, подсказки, «Перевести», «Исправить») во всех 174 сочетаниях. Скрипт scripts/cards_dialogs_contrast_measure.ts, отчёт docs/work/cards-dialogs-contrast-2026-10-25.md. Код не меняется.

## Продолжение: экраны занятия Learning V2 (координатор 25.10)
Governance-ID: TG-815E48FCDF54

Замер контраста экранов занятия Learning V2 во всех 174 сочетаниях тем: вступление (роли langText/particle/gloss), ситуация, плитки ответов, блок «Правильно», чипы сборки фразы и «Найди пары», панель разбора, кнопка задания, подвал, карточка нового слова, итог занятия V2DoneScreen. Скрипт scripts/learning_v2_session_contrast_measure.ts, отчёт docs/work/learning-v2-session-contrast-2026-10-25.md. Код занятия не меняется. Затем — роли пейволов «М» и «Д» по карте пейвола, когда Макеты/Дизайн их выпустят.

## Продолжение: свои модули ролей и пейвол «Вариант М» (координатор 25.10)
Governance-ID: TG-815E48FCDF54

1) Свои модули (разрешение координатора): constants/liquidGlassSemanticInk.ts — доводка «верно/неверно» по реальным подложкам занятия (фон экрана, мягкая заливка и 18 % поверх фона и карточки); constants/liquidGlassIntroTextRoles.ts — роли вступления по всем подложкам (плашка ситуации, шторка теории Мастерской, карточка «Скажи так»). Сторожа tests/semantic_ink_surfaces_contrast.test.ts (новый) и tests/intro_text_roles_contrast.test.ts, все 174 сочетания. Экранный код не трогаю — передаю Learning V2.
2) Пейвол «Вариант М», выбранный владельцем: карта токенов и контраст во всех 174 сочетаниях, отдельно график, таблица сравнения, кнопка года. Скрипт scripts/paywall_m_contrast_measure.ts, отчёт docs/work/paywall-m-theme-token-map-2026-10-25.md. Только токены темы, код пейвола не меняется.

## Продолжение: контекстные окна Plus (М) и окно удаления, вариант Б (координатор 25.10)
Governance-ID: TG-91414B46F29E

Outcome: карта токенов и контраст во всех 174 сочетаниях для (1) шести контекстных окон Plus в стиле М (docs/design/v2-app/paywall-m-context.html) и (2) окна удаления, вариант Б (красная кнопка deleteButtonPaint, тихая ссылка «Удалить навсегда сейчас», неактивная кнопка до ввода «УДАЛИТЬ», плашка «Восстановить»). Scope: только скрипты замера в scripts/ и отчёты в docs/work/; код приложения не меняется. Architecture: формулы поверхностей копируются со сторожем исходника, как в scripts/paywall_m_contrast_measure.ts. Security and privacy: данных не касается. Technical debt: копии формул держит сторож строк. Verification: прогон скриптов через tsx, 0 нарушений после замен или явный список. Rollback: удалить два скрипта и два отчёта.

## Продолжение: шапка М по худшему краю градиента (координатор 25.10, по Макетам 41a054a1d)
Governance-ID: TG-EB452124A08E

Outcome: перемерить шапку «Ты на 3-м уроке» пейвола М в 174 сочетаниях по всем краям её градиента (акцент 30 % → плашка, как у выбранного плана) и взять худший край; проверить, что в замере контекстных окон градиентные подложки тоже меряются по всем краям. Scope: scripts/paywall_m_contrast_measure.ts, отчёт docs/work/paywall-m-theme-token-map-2026-10-25.md; код приложения не меняется. Architecture: без изменений, только модель подложки в скрипте. Security and privacy: данных не касается. Technical debt: нет. Verification: прогон скрипта через tsx. Rollback: git revert коммита.

## Продолжение: перемер 12 особых сцен Главной и кнопки «Готовим занятие…» (координатор 25.10)
Governance-ID: TG-F0D751ADFED9

Outcome: после коммитов Моментов e3b3c313e, 3a42a7e8f, a796ac60e, fdd62974d и d6dec448b перемерить во всех 174 сочетаниях надзаголовок (белый), заголовок, подпись, кнопку сцены и иконку на арте сцены — по самой светлой зоне под текстом. Scope: scripts/home_scene_special_contrast_measure.ts и отчёт docs/work/home-scene-special-contrast-2026-10-25.md; код сцены не меняется. Architecture: без изменений, модель фона в скрипте сверяется с HomeSceneStage. Security and privacy: данных не касается. Technical debt: нет. Verification: прогон скрипта через tsx. Rollback: git revert коммита.

## Продолжение: перемер Пика (30dfcf973), занятия (0c3b0c244) и экзамена v2 (759b1b0b6) (координатор 25.10)
Governance-ID: TG-F335B7E04B05

Outcome: подтвердить замером по закоммиченному коду: (1) Пик — свет размером Главной, своя строка 6 %, ник белый, затемнение до шапка+140; особо строка «Комнаты недели» и ник; (2) экраны занятия Learning V2 — «Правильно», чипы верно/неверно, пояснение; (3) экран экзамена v2 — мелкий текст 13 на порог 4,5. Во всех 174 сочетаниях. Scope: scripts/spire_contrast_measure.ts, scripts/learning_v2_session_contrast_measure.ts, scripts/exam_workshop/theme_contrast_measure.ts и дописанные разделы в существующих отчётах docs/work/; код приложения не меняется. Architecture: без изменений, модели сверяются с исходниками. Security and privacy: данных не касается. Technical debt: нет. Verification: прогон скриптов через tsx. Rollback: git revert коммита.

## Продолжение: тосты и всплывашки во всех темах (координатор 25.10)
Governance-ID: TG-F335B7E04B05

Outcome: контраст всех тостов и всплывашек во всех 174 сочетаниях — общий ActionToast (энергия, награды, ошибки сети, «сохранено», подсказки урока, карточка и строка сверху), тост медали (medalToastStyleFromTokens), снекбар удаления Карточек (UndoDeleteSnackbar); отдельно — держит ли подложка контраст при тексте в две строки. Scope: scripts/toast_contrast_measure.ts и отчёт docs/work/toast-contrast-2026-10-25.md; код приложения не меняется. Architecture: формулы подложек копируются со сторожем исходника. Security and privacy: данных не касается. Technical debt: нет. Verification: прогон скрипта через tsx. Rollback: git revert коммита.

## Продолжение: правка подписей тоста медали (координатор 25.10, «делай сам»)
Governance-ID: TG-F335B7E04B05

Outcome: три подписи тоста медали (подпись под названием, подпись ступени без повышения и с повышением) ≥ 4,5 во всех 174 сочетаниях. Scope: components/medalToastThemeStylesFromTokens.ts (доводка legibleOn к text по обоим краям карточки с текстурой), components/medalToastThemeStyles.ts (необязательное поле tierLabelColors), components/MedalToast.tsx (одна строка: подпись ступени из tierLabelColors), tests/medal_toast_text_contrast.test.ts, поправка скрипта и отчёта тостов. Architecture: цвета ступеней Дизайна (theme-exempt) остаются в tierAccents для значка; текст получает отдельное поле. Security and privacy: данных не касается. Technical debt: прежние таблицы по ThemeMode (витрина) остаются без tierLabelColors. Verification: сторож на 174 × 2 края × 6 подписей, соседние тесты медали. Rollback: git revert коммита (OTA).

## Продолжение: перепись цветовых литералов вне токенов (координатор 25.10, только изучение)
Governance-ID: TG-D89032655D7A

Outcome: по правилу владельца «каждый цвет — оттенок текущей темы» найти в app/, components/, modules/ цветовые литералы в стилях, которые не из токенов темы и не помечены theme-exempt с причиной; отчёт: файл · строка · цвет · что на экране · чей модуль (по свежести коммита) · как заменить токеном; сортировка по заметности (Главная, занятие, Пик, Plus первыми). Scope: скрипт поиска scripts/color_literal_census.mjs и отчёт docs/work/color-literal-census-2026-10-25.md; чужие файлы не правлю. Architecture: без изменений. Security and privacy: данных не касается. Technical debt: нет. Verification: прогон скрипта, выборочная проверка строк глазами. Rollback: удалить скрипт и отчёт.

## Продолжение: кэш стиля тоста медали (Ревизор 25.10 к 31b17106b)
Governance-ID: TG-D89032655D7A

Outcome: medalToastStyleFromTokens не пересчитывает 6 вызовов legibleOn на каждом рендере MedalToast. Scope: components/medalToastThemeStylesFromTokens.ts — WeakMap по объекту токенов, как у semanticInk. Architecture: токены темы неизменны и кэшируются, новый объект при смене темы даёт новый стиль. Security and privacy: нет. Technical debt: нет. Verification: medal_toast_text_contrast, lessons_level_tokens_medal_toast_contract, theme_chrome_from_tokens, sage_porcelain_surface_chrome_contract — 38/38. Rollback: git revert коммита (OTA).

## Продолжение: модуль чернил сцены Главной; «Фраза дня» и окно званий (координатор 25.10)
Governance-ID: TG-D89032655D7A

Outcome: (а) модуль HOME_SCENE_INK — постоянные цвета надписей, стекла и кнопки сцены Главной в одном месте по образцу SPIRE_SCENE_INK; замер контраста сцены читает цвета из модуля; подключение в HomeSceneStage / TodaySceneView / HomeScene / HomeV2Header — Моменты. (б) daily_phrase_chrome.ts и (в) окно званий в home.tsx и HomeMistakesLockedSheet — проверены: в приложении не показываются (мёртвый код), правок нет, переданы в уборку. Scope: components/home/v2/scene/home_scene_ink.ts (новый, пока не импортирован), scripts/home_scene_special_contrast_measure.ts, docs/work/color-literal-census-2026-10-25.md. Architecture: цвета сцены не цвета темы — свет сцены, как у Пика. Security and privacy: нет. Technical debt: литералы в компонентах сцены остаются до подключения модуля Моментами. Verification: замер сцены через модуль — 0 нарушений на 58 сценах. Rollback: git revert коммита.

## Продолжение: поправка переписи — старый экран занятия невидим (координатор 25.10)
Governance-ID: TG-35E90C158110

Outcome: в docs/work/color-literal-census-2026-10-25.md пометить MODE_META и #5872FF из app/learning-v2/session/[id].tsx как «невидимо, кандидат на удаление после OTA» (живёт только в LearningV2LegacySessionScreen; английский идёт через learning_v2_direct_session_player_v1.tsx, 0 литералов) и сдвинуть вниз по заметности. Scope: только этот документ. Architecture/Security/Debt: нет. Verification: перечитать раздел. Rollback: git revert.

## Продолжение: перемер пейвола М на закоммиченном коде (координатор 25.10, после 28b693a44 и de97b53fe)
Governance-ID: TG-7D7C943AF657

Outcome: контраст шапки, плашек, графика, таблицы, планов и нижней панели пейвола М по коду components/paywall/m/** во всех 174 сочетаниях, по худшему краю каждого градиента, с новыми размерами (13/16/19) и живыми ru-текстами. Scope: новый scripts/paywall_m_code_contrast_measure.ts (роли читаются из исходника со сторожем), раздел в docs/work/paywall-m-theme-token-map-2026-10-25.md; код пейвола не меняется. Architecture/Security: нет. Technical debt: нет. Verification: прогон скрипта через tsx. Rollback: git revert.

## Продолжение: панель голосового ответа (e8aa1c456) и окна удаления Б на коде (координатор 25.10)
Governance-ID: TG-C420F43734EB

Outcome: (1) контраст подписей и состояний SpeakingPanel (встроенная строка и раскрытая карточка: статус «не расслышал» с причиной, вердикт, подсказка, кнопки микрофона/«Готово»/«Ещё раз»/настройки) во всех 174 сочетаниях через настоящую тему приложения makeLiquidGlassTheme → buildSpeakingPanelTheme; (2) перемер окон удаления Б по коду DeleteAccountVariantBBody, когда 5 · ВХОД закоммитит вёрстку. Scope: скрипты scripts/speaking_panel_contrast_measure.ts и обновление scripts/account_delete_b_contrast_measure.ts, отчёты в docs/work/; код приложения не меняется. Architecture/Security/Debt: нет. Verification: прогон скриптов через tsx. Rollback: git revert.

## Продолжение: перемер сцены Главной после подключения HOME_SCENE_INK (Моменты 5c94a294c)
Governance-ID: TG-060507F050AD

Outcome: закоммитить scripts/home_scene_special_contrast_measure.ts (читает цвета из HOME_SCENE_INK, принимает в HomeSceneStage ссылку на модуль или тот же литерал), перемерить сцену на коде и удалить временный docs/work/home_scene_ink.ts.txt. Scope: скрипт, docs/work/home-scene-special-contrast-2026-10-25.md, удаление .txt. Architecture/Security/Debt: нет. Verification: прогон скрипта. Rollback: git revert.

## Продолжение: классический урок целиком — контраст во всех темах (координатор 25.10, только изучение)
Governance-ID: TG-0168B7B91B85

Outcome: app/lesson1.tsx и его компоненты (плитки слов, ввод, подсказки, итог урока, «Мои ошибки») — пары «цвет текста/значка ↔ подложка» из кода, во всех 174 сочетаниях через makeLiquidGlassTheme; отчёт по местам с заменами на токены и владельцем зоны. Scope: скрипт scripts/lesson1_contrast_measure.ts и отчёт docs/work/lesson1-contrast-2026-10-25.md; код урока не меняется. Architecture/Security/Debt: нет. Verification: прогон скрипта, выборочная сверка пар глазами по коду. Rollback: удалить скрипт и отчёт.

## Продолжение: поправка модели шторки SpeakingPanel (mTheme) и Настройки / Карточки / Друзья (координатор 25.10, только изучение)
Governance-ID: TG-67BC591EB11D

Outcome: (1) в scripts/speaking_panel_contrast_measure.ts раскрытая шторка мерится через подмену mTheme (card = opaqueSheet, textSecond/textMuted = secondary, accent = cta, onAccent = ctaInk), как в коде с HEAD; отчёт speaking-panel поправлен; (2) тем же статическим разбором — Настройки целиком (уведомления, язык, тема, аккаунт), Карточки и наборы (список, просмотр, Сообщество), Друзья и приглашения; отчёт по местам с заменами и владельцем. Scope: скрипты в scripts/, отчёты в docs/work/; код приложения не меняется. Architecture/Security/Debt: нет. Verification: прогон скриптов через tsx. Rollback: git revert.

## Продолжение: правка четырёх мест Карточек и Друзей (координатор 25.10, «чини сам»)
Governance-ID: TG-67BC591EB11D

Outcome: значок микрофона SpeakHoldButton — подпись из пар темы (ctaInk / accentInk, что контрастнее на заливке) вместо #07110A; подпись плашки лимита CollectionGalleryView — legibleOn(secondary → text) по плашке; неактивная «Создать набор» CollectionListView — пара buttonFillDisabled / buttonInkDisabled; молния FriendEventMarker — accentInk на accent. Все файлы перед правкой чистые. Scope: эти 4 файла и сторож tests/zones_contrast_fixes_2026_10_25.test.ts. Architecture: только токены темы, вид прежний. Security/Debt: нет. Verification: сторож на 174 сочетания + соседние тесты Карточек и Друзей, babel-разбор файлов. Rollback: git revert (OTA).

## Продолжение: перемер пейвола М после правки Дизайна 1e3514044
Governance-ID: TG-E44935CA003E

Outcome: обновить scripts/paywall_m_code_contrast_measure.ts под planRowSelectedPaint(g, base?) и фон плашки у выбранного плана, перемерить во всех 174 сочетаниях, дописать раздел в docs/work/paywall-m-theme-token-map-2026-10-25.md. Scope: скрипт и отчёт; код пейвола не меняется. Architecture/Security/Debt: нет. Verification: прогон скрипта. Rollback: git revert.

## Продолжение: Диалоги и Пик тем же разбором (координатор 25.10)
Governance-ID: TG-EF6AFAB94792

Outcome: zone_contrast_measure по Диалогам (список сценариев, диалог, свободный диалог, итог, «Память диалогов») и Пику (экран, комната недели, моменты) во всех 174 сочетаниях; каждого кандидата проверить по коду; живые места при чистых файлах чинить на парах темы со сторожем на 174. Scope: отчёт docs/work/zones-contrast-2026-10-25.md (новый раздел), при правках — затронутые файлы зон и сторож. Architecture/Security/Debt: нет. Verification: скрипт + сторож + соседние тесты. Rollback: git revert.

## Продолжение: исключение онбординга (решение координатора 25.10) и перевод литералов переписи на токены
Governance-ID: TG-EF6AFAB94792

Outcome: (1) онбординг в этом OTA не перекрашивается — в CleanOnboarding.tsx и onboarding_aha/aha_theme.ts шапка theme-exempt с причиной «до выбора темы; перевод на тему по умолчанию — после OTA, через макет владельцу»; сторож tests/onboarding_pre_theme_palette_exemption.test.mjs: исключение только у перечисленных файлов, число цветов в каждом не растёт, новый файл онбординга с литералом цвета ломает сторож (общий сканер пропускает /onboarding/i — дыра закрыта); (2) литералы из docs/work/color-literal-census-2026-10-25.md — в токены темы в свободных файлах, по заметности, со сторожем на 174. Scope: перечисленные файлы, сторожа, отчёт переписи. Architecture: только токены, вид прежний. Security/Debt: онбординг — долг до после OTA, записан. Verification: сторожа + соседние тесты, babel-разбор. Rollback: git revert.
