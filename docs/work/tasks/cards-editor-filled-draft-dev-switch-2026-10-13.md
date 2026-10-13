# Task packet: dev-переключатель cardsdraft=filled — новая карточка с заполненными полями без клавиатуры (Макеты cards-061, 13.10)

Governance-ID: TG-4D01A412C1FD
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по просьбе Макетов (cards-061 → «съёмка»)

## Outcome

Ссылка `dev_state?cardsdraft=filled&next=/flashcards_card_editor?create=1…` открывает редактор новой карточки с заполненными полями «Layover / пересадка» без клавиатуры и фокуса: кадр сходится с образцом cards-v2 №24 (живое превью с лицом карточки, «Добавить» активна). Только dev-сборка; в стор-сборке — заглушка.

## Scope

In scope: `app/dev_cards_state.ts` (переключатель), `store_release_stubs/dev_state/dev_cards_state_stub.ts` (заглушка), `app/dev_state_fixtures.ts` (параметр ссылки), `app/flashcards_card_editor.tsx` (стартовые значения полей только в режиме создания), сторож.

Out of scope: логика сохранения, превью, клавиатурный reveal полей, настоящие черновики пользователя.

## Architecture

По образцу `packdraft`: модульная переменная в памяти процесса, геттер `getDevCardDraft()` возвращает поля или null (вне dev всегда null). Редактор берёт стартовые значения из геттера только при `create=1`; пользовательские данные и хранилище не затрагиваются.

## Security and privacy

Данных пользователя не касается; значения — демо-слова. В стор-сборке подмена недоступна (заглушка, STORE-STUBS-GATE).

## Technical debt

Contain: после ручного ввода пользователем подмена не перезаписывает значения (задаёт только стартовые).

## Verification

Точечные прогоны сторожа переключателя, `tests/store_release_dev_state_stubs.test.ts` и `node scripts/store_release_stubs_gate.mjs` под светофором.

## Rollback

git revert коммита.
