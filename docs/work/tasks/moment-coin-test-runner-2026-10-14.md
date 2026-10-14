# Task packet: сторож moment_coin_contract красный под основным раннером тестов (координатор 14.10)

Governance-ID: TG-66113044E1BE
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

`tests/moment_coin_contract.test.tsx` — рендерный тест MomentCoin, вписан поимённо в `jest.rntl.config.cjs` (preset react-native, настоящий модуль RN): там 22/22.

Основной раннер (`npm run test:one`, свип координатора) тоже подхватывает этот `.tsx`. У него `react-native` подменён упрощённой заглушкой без StyleSheet → «Test suite failed to run: StyleSheet.create».

Починка без ослабления проверок:
- набор запускается там, где у него настоящий React Native (рендер-конфиг);
- основной раннер его не берёт — так же, как остальные поимённые рендер-тесты из того же списка.

Как именно — по факту конфигурации основного раннера (testMatch / testPathIgnorePatterns). Сначала смотрим, как исключены соседние рендер-тесты.

## Scope

In scope: конфигурация исключения или сам тест. Проверки внутри теста не меняются.

## Architecture

Один источник правды — список рендер-тестов в `jest.rntl.config.cjs`.

## Security and privacy

Не касается.

## Technical debt

- Новых долгов нет.
- Два раннера с разной подменой react-native — известная особенность репозитория. Рендер-тесты обязаны жить только в списке `jest.rntl.config.cjs`.

## Verification

- `npm run test:one -- tests/moment_coin_contract.test.tsx` не падает (набор не берётся или проходит).
- Рендер-конфиг 22/22.

## Rollback

`git revert`.
