# live_theme_contract: видимых тем 29 (23 + 6 премиум) и ночная сетка на премиум-темах

Governance-ID: TG-6E0D6F29CD83

## Outcome
Координатор 25.10: премиум-темы видимые (выбор тем, награды за достижения) — реестр LIQUID_GLASS_THEME_IDS = 29; перевести сторож на 29. Прогнать ночную сетку контраста (61d31a160) на 6 премиум-темах и дописать в отчёт.

## Scope
In scope: `tests/live_theme_contract.test.ts` (число тем), отчёт `docs/work/tasks/night-elements-contrast-2026-10-24.md`.
Out of scope: состав реестра и токены.

## Architecture
Число 29 в сторожe; комментарий объясняет состав (23 + 6 премиум).

## Security and privacy
Данных не касается.

## Technical debt
Нет.

## Verification
npm run test:one -- tests/live_theme_contract.test.ts; сетка — разовый скрипт.

## Rollback
Откатить коммит.
