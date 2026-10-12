# Task packet: pt-BR/vi/id/tr/pl видят русский там, где в словаре нет их ключа — замер, страховка en, отчёт

Governance-ID: TG-D21335E9E208
Status: Done (testID окон — отдельным коммитом; legacyRuUk/bundleLang — решение координатора)
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10, 🔴 вне очереди)
Related epic/enabler: R1, языки интерфейса INTERFACE_LANG_READY_FOR_PROD (pt-BR, vi, id, tr, pl видимы в выпуске)

## Outcome

`triLang` требует только ru/uk/es; для pt-BR/vi/id/tr/pl при отсутствии их ключа отдаёт РУССКИЙ. Таких словарей в app/components ~2700.
(1) Замер по 5 языкам с разбивкой по разделам R1 (Главная, Карточки, Диалоги, Шпиль, Настройки, пейволы, онбординг, энергия) —
docs/phraseman-2.0/I18N_FALLBACK_5LANG_R1.md. (2) Страховка в triLang и родственных помощниках выбора: для pt-BR/vi/id/tr/pl без своего
ключа — en, если он есть; ru только последним; журнал [I18N-FALLBACK] раз на ключ. ru/uk/es — без изменений. (3) Остаток: сколько мест
и после страховки уходит в ru (нет ни своего языка, ни en) — кандидаты на перевод. Плюс testID кнопок общих окон
(GlassAlertDialog/ThemedChoiceModal: #glass-alert-action-N; «Продолжить» в смене аккаунта) — для английского прохода.

## Scope

In scope: `constants/i18n.ts` (triLang и другие помощники выбора языка в нём), временный скрипт замера, отчёт, тесты;
`components/v2/GlassAlertDialog.tsx`, ThemedChoiceModal, `app/(tabs)/settings.tsx` — только testID (Дизайн предупреждён).

Out of scope: перевод самих строк (по отчёту — отдельно), en-логика (ENGLISH_UI_LOCALE_ENABLED) не меняется.

## Architecture

Порядок выбора в triLang для pt-BR/vi/id/tr/pl: свой ключ → en (если есть) → ru (как раньше, последним). Для ru/uk/es и en —
прежний код. Инвариант: ни один существующий перевод не меняется; меняется только то, что раньше было русским.

## Security and privacy

Тексты интерфейса; данные не затрагиваются.

## Technical debt

- Contain: остаток «ни своего, ни en» — отчёт с разбивкой по разделам; кандидаты на перевод.

## Verification

- jest: тесты triLang (pt-BR без ключа → en; без en → ru; ru/uk/es/en — прежнее), существующие тесты i18n.
- Замер до/после в отчёте.

## Rollback

`git revert`; выбор возвращается к прежнему (ru для недостающих ключей).
