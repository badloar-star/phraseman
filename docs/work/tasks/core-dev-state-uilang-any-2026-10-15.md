# Task packet: dev_state?uiLang — любой из 9 языков интерфейса (только dev)

Governance-ID: TG-0D1A00A81003
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: утренняя съёмка 100 кадров (Сверка), координатор 15.10 06:10; app/dev_ui_lang.ts (п.76, 12.10)

## Outcome

Ссылка `dev_state?uiLang=<код>` переключает язык интерфейса на любой из 9 (`ru`, `uk`, `en`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`) или `off`. Сверке не нужно менять язык руками. Действует только в dev-сборке и только в памяти. Журнал: `[DEV-STATE] uiLang=<значение> source=link`.

## Scope

In scope:
- `app/dev_ui_lang.ts`: тип и состояние; `peekDevUiLang`, `isDevUiLangOn`;
- `constants/i18n.ts`: ворота `es` открываются подменой, как `en`;
- `components/LangContext.tsx`: применяет любой язык подмены;
- `app/dev_state_fixtures.ts`: разбор параметра;
- тесты `tests/dev_ui_lang_contract.test.ts`.

Out of scope:
- глобальные флаги языков;
- запись `app_lang`;
- облако.

## Architecture

- Модуль подмены хранит `current: язык | null` вместо `enOn: boolean`.
- `isDevUiLangEnOn()` сохраняет прежний смысл: подмена на `en`.
- Ворота: `en` и `es` открываются, если подмена ровно на этот язык. Остальные 7 языков уже готовы для прода, их ворота не меняются.
- `LangContext` применяет код подмены напрямую. `off` — возвращает сохранённый язык, как раньше.
- Подписка по-прежнему только в dev. В стор-сборке установка отклоняется с логом, геттеры возвращают `false` / `null`.

## Security and privacy

Только память dev-сборки. На диск, в облако и в уведомления ничего не уходит. В стор-сборке не работает (`IS_STORE_RELEASE`).

## Technical debt

- Contain: при dev-подмене на `es` не выполняется сброс языка изучения (`STUDY_TARGET_RESET_LANGS`), который делает обычное переключение. Для съёмки кадров это допустимо. Отмечено.

## Verification

- Тест: подмена на `ru` / `pt-BR` / `es` даёт `peekDevUiLang`.
- Подмена на `es` открывает ворота `es`, на `en` — `en`; `off` закрывает.
- Подписчик получает каждый код.
- В логе есть `source=link`.
- Разбор ссылки принимает 9 кодов и `off`.
- Типы затронутых файлов.

## Rollback

Вернуть прежний тип `'en' | 'off'` и проверки.
