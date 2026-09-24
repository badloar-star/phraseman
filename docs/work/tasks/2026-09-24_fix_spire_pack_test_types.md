# Task packet: починка типа в тесте PM-272 (spire_pack_contract.test.ts)

Governance-ID: TG-58EF04E124F5

## Outcome
`spire_pack_contract.test.ts` не компилируется (TS2345, `tags: readonly []` не подходит под `TournamentTask.tags: string[]`) — тест-сьют падает целиком, 0 тестов запускается. Агент PM-272 проверял код через самодельную замену тест-раннера (tsx в scratchpad), которая не ловит ошибки строгого TypeScript. Починить тест, чтобы он реально запускался через jest.

## Scope
In scope: functions/src/spire_pack_contract.test.ts — только тип вспомогательной функции makePool.
Out of scope: сам spire_pack_contract.ts (продакшен-код), другие тесты.

## Architecture
Без изменений — только тип тестового хелпера.

## Security and privacy
Нет влияния на безопасность/приватность: правка меняет только тип вспомогательного объекта в тестовом файле (данные полностью синтетические, не связаны с реальными пользователями), не затрагивает аутентификацию, права доступа или обработку персональных данных.

## Technical debt
Нет нового — устраняет существующее (нерабочий тест).

## Verification
npm run test:one / jest functions/ на spire_pack_contract.test.ts должен пройти зелёным после правки.

## Rollback
Откатить правку типа, если появится другая причина ошибки.
