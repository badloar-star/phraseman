# Task packet: dev-состояния пейвола для съёмки — ошибка до checkout (paywalls-012), чистка хвостов окон между кадрами (paywalls-015/016/018)

Governance-ID: TG-B96F565C823E
Status: Done
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: app/dev_paywall_state.ts, app/paywall_purchase.ts (dev-эффект), docs/phraseman-2.0/registries/visual_parity.json (paywalls-012/015/016/018)

## Outcome

Сверка снимает четыре состояния без настоящего магазина, только из памяти процесса, в стор-сборке вырезано: (012) `store_unreachable` — цены магазина, под кнопкой «Попробуй через минуту» и тост «Не удалось связаться с магазином. Попробуй позже.»; (016) `status_unknown` — тост «Покупка пока не найдена…» (уже есть); (018) `store_promo` — блок «Скидка действует сейчас» (уже есть); (015) `unknown_outcome` — окно «Статус покупки не подтверждён» с двумя кнопками (уже есть). Все четыре задаются `premium_modal?…&_dev_state=<имя>`, а тосты ещё и `dev_state?toast=<имя>`. Причина испорченных кадров 015/016/018 — окно «Покупка ждёт подтверждения» оставалось в очереди блокирующих окон от прошлого dev-состояния и перекрывало следующее; теперь при входе в dev-состояние и при выходе из него очередь очищается.

## Scope

In scope: `app/dev_paywall_state.ts` (состояние), `app/paywall_purchase.ts` (общий тост, dev-эффект), `app/themed_blocking_alert_queue.ts` (очистка очереди), `app/dev_state_fixtures.ts` (вид тоста для `dev_state?toast=`), тесты.
Out of scope: настоящая покупка, цены, entitlement, вид пейвола.

## Architecture

No architecture change: ещё одно значение в списке dev-состояний, один общий тост вместо дубля строки, функция очистки очереди окон (dev-путь).

## Security and privacy

Данных нет; в стор-сборке `parseDevPaywallState` всегда null, очистка очереди зовётся только при активном dev-состоянии.

## Technical debt

Pay now: Сверка теряла кадры из-за хвоста окна.

## Verification

Тесты `dev_paywall_state`, паритет стор-заглушек, контракт общего тоста, срез типов при памяти.

## Rollback

Откат коммита.
