# Исключить rntl-only тесты из дефолтного конфига тестов

Governance-ID: TG-21B8FAD30325
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (решение координатора: исключение rntl-only тестов из дефолтного набора, окно 06:00)

## Outcome
В `package.json` в `jest.testPathIgnorePatterns` добавлены ровно те файлы `*.test.tsx`, которые перечислены в `testMatch` конфига `jest.rntl.config.cjs` и НЕ стоят явно в дефолтном `testMatch` (11 явных `.tsx` дефолтного набора идут под дефолтным моком `react-native` намеренно и не трогаются). `npm test` и `npm run test:one` перестают собирать тесты, которым нужна полная среда React Native (например `hybrid_sheet_shell_observer_runtime`, падавший на `Dimensions`), а `npm run test:rntl` / `test:all` продолжают их гонять.

## Scope
Только `package.json`, блок `jest.testPathIgnorePatterns` (общий файл: коммит только моего хунка через `git apply --cached`, `numstat` сверяется в момент коммита). Код приложения и сами тесты не меняются.

## Architecture
Список вычислен из двух `--listTests` (дефолтный и `jest.rntl.config.cjs`): `rntl ∩ default − явные записи дефолтного testMatch`. Дефолтный конфиг мапит `react-native` на 16-строчную заглушку `tests/__mocks__/react-native.js`; rntl-конфиг использует пресет `react-native`.

## Security and privacy
Только конфигурация тестов; данных нет.

## Technical debt
JSON не допускает комментариев рядом с шаблонами: причина записана здесь и в журнале решений (ledger). Новый rntl-only тест надо вписывать и в `testMatch` rntl-конфига, и в `testPathIgnorePatterns` дефолтного (сторож «каждый запись существует» его не проверяет).

## Verification
(1) `jest --listTests` дефолтного конфига до/после: исчезли ровно перечисленные файлы; (2) каждый из них есть в `jest --config jest.rntl.config.cjs --listTests`; (3) `hybrid_sheet_shell_observer_runtime` под `test:rntl`: 2/2.

## Rollback
git revert коммита.

## Дополнение (окно 06:30)
По решению координатора тем же способом исключён `tests/registration_prompt_modal_lifecycle.test.ts` (.ts, rntl-only): в дефолтном списке исчез ровно он, в списке rntl-конфига присутствует, под rntl-конфигом 7/7.
