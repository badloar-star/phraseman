# Task packet: тест имени темы в Настройках + аудит хвостов «Шпиль → Пик» (Темы, 13.10)

Governance-ID: TG-E995D5F03285
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: R1_BACKLOG_13_16 №32

## Outcome

1. Тест settings_effective_theme_label_contract зелёный без правки боевого кода (7c88a69cc).
2. Во всём, что видит человек (словари, «Что нового», тексты пушей в клиенте, шторки, пустые состояния, подписи доступности), нет старых имён раздела «Шпиль» на 9 языках; сторож-тест не даёт им вернуться. Находки в functions — списком Ядру к 17.10.

## Scope

In scope: tests/settings_effective_theme_label_contract.test.mjs; строки интерфейса клиента (app, components, constants, modules), новый тест-сторож tests/spire_old_names_guard.test.ts.

Out of scope: functions/**, админка (только список находок), имена ключей, маршрутов, testID и файлов spire_* (владелец 13.10: не менять).

## Architecture

No architecture change: правятся только пользовательские строки и тесты; ключи, маршруты и структура остаются.

## Security and privacy

Данных, прав и сети не затрагивает; тексты пушей на сервере не выкладываются, только перечень.

## Technical debt

Contain: сторож-тест со списком допустимых вхождений (комментарии не считаются); исключения — только осознанно, с причиной в самом тесте.

## Verification

Точечный прогон тестов через слот светофора; сторож ловит старое имя в строковых литералах и JSX-тексте.

## Rollback

git revert коммита с правками строк; боевая логика не менялась.
Governance-ID: TG-C28D4E87F4C8
Governance-ID: TG-C792A77BABDB
