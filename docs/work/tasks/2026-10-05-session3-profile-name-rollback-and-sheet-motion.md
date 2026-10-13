# Task packet: плашка отката имени и движение двух шторок по kit.css

Governance-ID: TG-882E28EEC1E2
Status: In progress
Owner: сессия 3 (макеты владельца)
Related epic/enabler: Motion п.8 (AGENTS.md), baseline config/motion-hybrid-baseline.json

## Outcome

1. Экран «Аккаунт»: при отказе в смене имени человек видит причину и «Прежнее имя восстановлено.» по макету OR-NAME-*; откат пишет [NAME-CHANGE] в лог (уже закоммичено: baaf622a3).
2. Шторки «Мои ошибки» (PanelSheet) и «Режим тренировки» (FlashcardsTrainingModeSheet) двигаются по числам kit.css из KIT_MOTION: 440 мс cubic-bezier(.2,1,.3,1) в обе стороны, затемнение 260 мс. Вид не меняется. Сторож motion_hybrid_contract зелёный без исключений для этих двух файлов.

## Scope

In scope: components/mistakes-panel/PanelSheet.tsx, app/flashcards/FlashcardsTrainingModeSheet.tsx, config/motion-hybrid-baseline.json (убрать два файла из awaiting), tests/flashcards_training_mode_sheet_compact_source_contract.test.mjs; для п.1 — app/account_details.tsx, components/account/NicknameEditModal.tsx, тест плашки.

Out of scope: логика смены имени, тексты, вид шторок, мёртвый код смены имени в settings.tsx, остальные «ждущие» файлы baseline.

## Architecture

No architecture change: движение берёт числа из существующего словаря KIT_MOTION; Modal шторки тренировки остаётся, но больше не использует системный slide — монтируется, пока шторка не доиграла уход (как в KitSheetModal). Барьер перехода после закрытия сдвигается на длительность ухода.

## Security and privacy

Данных не касается: ни полей, ни сервисов, ни разрешений. Privacy policy не затронута. В лог причин отката имя не пишется.

## Technical debt

Pay now: два файла уходят из awaiting baseline. Contain: недостижимая смена имени в settings.tsx остаётся — решение за владельцем/Ядром.

## Verification

Тесты по одному через светофор: motion_hybrid_contract (+overlay/rollout/runtime), flashcards_training_mode_sheet_compact (node), fc_train_early_tap_contract, тест плашки отката; на телефоне — выезд шторки 440 мс, переход в тренировку после закрытия.

## Rollback

Откат коммита; данные пользователя не затрагиваются.

## Addendum 2026-10-05: окно OR-ACCOUNT-SWITCH-UNSYNCED-BACKUP (overlays-runtime 038)

Scope: app/(tabs)/settings.tsx, одна точка — окно «Можно выбрать аккаунт» после выхода без синхронизации. По макету: одна кнопка «Продолжить», значок закладки, тот же заголовок и текст. Вызов showInfoAlert заменяется на enqueueThemedBlockingInfoAlert с подписью кнопки и значком; логика выхода, деньги и удаление аккаунта не трогаются. Данных и разрешений нет. Откат — один коммит. Проверка: контрактный тест источника + тесты очереди окон.

## Addendum: D145

Строка «Прежнее имя восстановлено.» в app/account_details.tsx: размер текста 12 заменён на 13 (предохранитель D145 не пускает новые размеры кроме 16 и 13), тест плашки обновлён. Данных нет, откат — один коммит.

## Addendum: два красных теста ошибок (координатор 05.10)

Scope: tests/mistake_hide.test.ts (второе скрытие), tests/mistake_text_integrity_source_contract.test.mjs (строка fixedRow); при необходимости app/mistake_hide.ts и components/mistake-practice/MistakeSessionFinale.tsx. Сначала диагноз по фактам (запуск и чтение кода), потом правка либо кода, либо теста с объяснением. Реестр mistake_local_hidden от Ядра не ломать. Данных и разрешений не касается; новых полей и сервисов нет. Откат — один коммит. Проверка: оба теста зелёные по одному через светофор.

## Addendum: сторож home_v2_today_text_integrity (координатор 05.10)

Scope: только тест tests/home_v2_today_text_integrity*.test.* — привести к текущей Главной, если он охраняет снятый вид; код Главной не трогается. Если сторож не относится к моему участку — сообщить координатору. Данных и разрешений нет, откат — один коммит. Проверка: сторож зелёный, по одному через светофор.

## Addendum 2026-10-11: макеты «Видео» и «Наборы сообщества» (docs/design/v2-app)

Scope: docs/design/v2-app/video-redesign.html (починить белую страницу без стилей), docs/design/v2-app/community-redesign.html (владелец отверг все три варианта как копию текущего — нужны принципиально другие концепции). Только макеты в docs, код приложения не меняется. Данных, разрешений и сторонних сервисов нет; откат — удаление/откат файлов. Проверка: страницы открываются по ссылке без сервера и показывают все экраны.

## Addendum 2026-10-11 (2): плашки наборов сообщества

Владелец уточнил: наборы остаются КОМПАКТНЫМИ ПЛАШКАМИ списком (как на скриншоте), нужно только сделать плашку красивее и удобнее. Scope: docs/design/v2-app/community-redesign.html — три варианта плашки (плитка-счётчик, «билет», с превью слов) × 4 экрана; код приложения не меняется, данных и разрешений нет, откат — откат файла.

## Addendum 2026-10-11 (3): макет контекстных пейволлов

Scope: docs/design/v2-app/paywall-context-redesign.html (3 варианта × состояния по всем входам + «Цена недоступна — повторить») и docs/design/v2-app/paywall-context-texts.md (таблица коротких текстов ru для согласования владельцем ДО коммита кода). Только макет и тексты в docs; код приложения не меняется. Данных, разрешений, платёжных вызовов нет (цены в макете примерные). Откат — удаление двух файлов.

## Addendum 2026-10-11 (4): фраза выхода в макете диалогов, карточка участников, гейт паритета

Scope: docs/design/v2-app/dialogs.html (фраза выхода «Переписка не сохранится…», убрать карточку участников в брифинге — решения владельца), scripts/visual_parity_gate.mjs + tests/visual_parity_gate.test.mjs (синхронизация с отметками Сверки «match»), проверка (без правки) docs/phraseman-2.0/registries/visual_parity.json — не показывает ли match 0 при проверенных экранах; реестр и evidence не правлю. Данных и разрешений нет; откат — откат файлов.

## Addendum 2026-10-11 (5): макеты экранов релиза без макета (приказ владельца через координатора)

Scope: docs/design/v2-app/*.html — по одному HTML на группу из docs/phraseman-2.0/OWNER_MOCKUP_NEEDED_2026-10-10.md (11 групп / 94 состояния; начало — группа 1: пейволл Plus цена/покупка, paywalls-011…018 кроме 017), плюс запись пути макета в docs/phraseman-2.0/registries/visual_parity.json (mockup/mockup_pinned, статус no_mockup → pending) — разрешено приказом владельца. Код приложения не меняется; тексты — реальные ru из кода, картинок не выдумываю. Данных, разрешений, платёжных вызовов нет. Откат — откат коммитов группы.
