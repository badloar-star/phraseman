# Task packet: premium_guard — проверка кэша до чтения хранилища ([COLD-START-IO])

Governance-ID: TG-9CEE5FF5FBFF
Governance-ID: TG-18FE43BED533
Status: Done — тесты premium_guard 29/29, telegram_premium_guarded_admin_surface 6/6
Owner: Ядро (продолжение сокращения IO старта по [COLD-START-IO])

## Outcome
`getVerifiedRealPremiumStatus` делал multiGet из 7 ключей ДО проверки 5-минутного кэша, хотя при попадании в кэш значения не использовались (кроме tester_no_premium). Теперь: флаг тестера через общий `readTesterFlags` (в store-сборке — без хранилища), затем кэш, и только при промахе — multiGet остальных 6 ключей.

## Scope
app/premium_guard.ts (одна функция), tests/premium_guard.test.ts при необходимости.

## Architecture
Порядок решений сохранён: «Снять премиум» → кэш → вычисление. Значения хранилища при попадании в кэш и раньше игнорировались.

## Security and privacy
Без изменения данных. В store-сборке устаревший флаг тестера и раньше игнорировался (resolveTesterNoPremiumOverride → false).

## Technical debt
Принято: в store-сборке старый флаг tester_no_premium больше не стирается из этой функции (он и так игнорируется).

## Verification
tests/premium_guard.test.ts точечно; тайпчек.

## Rollback
git revert.
