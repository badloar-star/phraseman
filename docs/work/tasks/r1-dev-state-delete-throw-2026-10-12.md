# Task packet: dev_state?delete=throw — окно «Удаление не завершилось» по макету (auth-gap-011)

Governance-ID: TG-D8EE1F90FA15
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10 вечер, п.3 «ДА, но последним»; спецификация Ядра)
Related epic/enabler: съёмка R1 auth-gap-011: текст макета «Удаление не завершилось. Проверь интернет…» есть только в catch
DeleteAccountConfirmModal; нынешний delete=fail даёт другой текст; робот не умеет вводить «УДАЛИТЬ» кириллицей.

## Outcome

`delete=throw`: beginAccountDeletion первой строкой бросает `dev_delete_throw` — ДО отмены отложенного входа, замков, записи и сети.
Кнопка «Удалить» без ввода слова подтверждения — ТОЛЬКО при dev-флаге удаления (delete=fail|throw) через геттер
`isDevDeleteConfirmBypass()`; в стор-сборке заглушка всегда false — ввод обязателен всегда (тест-сторож).

## Scope

In scope: app/dev_account_state.ts (+ заглушка), app/auth_provider.ts (beginAccountDeletion), components/DeleteAccountConfirmModal.tsx
(условие совпадения слова), app/dev_state_fixtures.ts (delete=throw), тест-сторож, шаги auth-gap-011.
Out of scope: настоящая логика удаления (без флага не меняется).

## Architecture

Как delete=fail: флаг в памяти dev_account_state, хук первым в beginAccountDeletion; стор — заглушка «нет подмены».

## Security and privacy

Удаление при флаге недостижимо (исключение до любого шага); выход/смена при флаге отказывают (общее охранное условие).
Обход ввода слова — только dev и только при флаге удаления; в стор-сборке невозможен (заглушка + сторож).

## Technical debt

- Contain: dev-инструмент съёмки.

## Verification

Тест-сторож: стор-заглушка isDevDeleteConfirmBypass()=false; совпадение слова в модалке зависит от обхода ТОЛЬКО через этот геттер;
throw стоит первой строкой beginAccountDeletion. Точечно: dev_account_state, stubs, тесты окна удаления.

## Rollback

Откат коммита.
