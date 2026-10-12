# Task packet: английский интерфейс входит в R1 — dev-подмена uiLang=en, строки по сканеру, ссылки «en-проход»

Governance-ID: TG-EB70B2530C62
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, решение владельца п.76: «английский интерфейс входит в R1»)
Related epic/enabler: docs/phraseman-2.0/EN_READINESS_R1.md

## Outcome

1. `dev_state?uiLang=en|off` включает английский интерфейс в dev без глобального `ENGLISH_UI_LOCALE_ENABLED`: только память (ничего не пишется на диск и в облако), в стор-сборке недоступно (заглушка с логом), журнал `[DEV-STATE] uiLang`. Нужно Сверке, чтобы пройти все разделы в en до включения флага.
2. Строки сканера в моих файлах: `components/cards-grid/ZoomBar.tsx` (2 метки журнала), `app/ai_dialog_session.tsx` (3 запасные строки сценария урока без английского). Проверено, что `CardsHubAnimProbe` и `dev_state` — dev-код и в сторе не виден.
3. Набор ссылок «en-проход» в DEV_LINKS_R1.md: Главная, Уроки, Диалоги (хаб, брифинг, сессия, итог), Карточки (хаб, сохранённые, каталог, тренировки), пейволы, Настройки, профиль; все с `uiLang=en&overlays=off`.

## Scope

In scope: app/dev_ui_lang.ts (новый), constants/i18n.ts (ворота en), components/LangContext.tsx (dev-подписка), app/dev_state_fixtures.ts, ZoomBar.tsx, ai_dialog_session.tsx, ai_dialog_scenarios.ts (необязательные поля en), scripts/dev_links_r1_steps_en.py (новый), DEV_LINKS_R1.md, тесты.
Out of scope: сам флаг `ENGLISH_UI_LOCALE_ENABLED` (включает только владелец), перевод остальных 191 строки.

## Architecture

Модуль-флаг в памяти (как dev_animations_off.ts). `isInterfaceLangEnabled('en')` = флаг конфига ИЛИ dev-флаг. Состояние языка в LangContext ставится без записи на диск (`writePeekAppLang` + `setLangState`), событие смены языка рассылается как обычно.

## Security and privacy

Данных пользователя не касается; в облако и на диск язык не пишется, в стор-сборке функция отказывает.

## Technical debt

Pay now: нечем пройти разделы в en до включения флага.

## Verification

Тест-сторож по исходникам и по логике модуля, срез типов, существующие наборы i18n; проход по разделам — за Сверкой.

## Rollback

Откат коммитов.
