# Task packet: охранный restoreFromCloud в проверке Plus — раз в 30 мин вместо 5, ожидание не дольше 5 с (смета Firebase п.10, 13.10)

Governance-ID: TG-19E7DC22531D
Status: Done — тесты 2+29 и 38 смежных зелёные
Owner: 5 · АВТОРИЗАЦИЯ (Ядро: «premium_guard.ts свободен, п.10 твой; TTL 30 мин»)

## Outcome

1. `refreshPremiumAccessFromCloudIfNeeded` (`app/premium_guard.ts`) — полное `cloudSync.restoreFromCloud()` у человека без Plus запускается не чаще раза в **30 мин**, а не каждые 5 мин. Сейчас это ведро чтений Firestore на каждую проверку Plus у бесплатного пользователя.
2. Вызывающий (`getVerifiedPremiumAccessStatus`, в том числе `addFlashcard` внутри замка записи карточек, см. аудит «пропала сеть») ждёт облако **не дольше 5 с**. Дальше решение принимается по локальным данным, а обновление доезжает фоном (тот же in-flight промис, повторного запроса нет).
3. Журнал `[PREMIUM-CLOUD]`: пропуск по сроку (возраст и срок), запуск, итог с мс, срабатывание потолка.

## Scope

In scope: `app/premium_guard.ts` (константа срока, потолок ожидания, журнал); тест `tests/premium_guard_cloud_refresh_ttl.test.ts`.
Out of scope: кэши RevenueCat и VIP (их срок 5 мин остаётся: это вызовы RevenueCat, а не Firestore) и слушатель access_projection.

## Architecture

Отдельная константа `CLOUD_ACCESS_REFRESH_TTL_MS = 30 мин`, без изменения общего `CACHE_TTL_MS`. Потолок — `Promise.race` с таймером 5 с вокруг уже существующего in-flight промиса. По потолку возвращаем `false` («облако не обновило»), так что дальше идёт обычная ветка проверки копии подарка. Доступ, купленный на другом устройстве, по-прежнему приходит слушателем access_projection (Ядро).

## Security and privacy

Решение «нет доступа» по-прежнему fail-closed: потолок не выдаёт Plus, только не ждёт. Новых данных не собирается.

## Technical debt

- Если слушатель access_projection отключён, восстановление VIP/подарка через охранный путь у бесплатного пользователя может опоздать до 30 мин (было 5).

## Verification

- новый тест: второй вызов внутри 30 мин не зовёт restoreFromCloud, после 30 мин зовёт; зависший restore не держит вызов дольше потолка;
- `tests/premium_guard.test.ts` зелёный;
- точечный tsc по файлу.

## Rollback

`git revert` коммита.
