# Task packet: охранный restoreFromCloud — неудача не закрывает повтор на 30 мин (ревью Ядра 88f20e7b7, 13.10)

Governance-ID: TG-38D409390C4A
Status: Done — тесты 32/32
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

В `refreshPremiumAccessFromCloudIfNeeded` (`app/premium_guard.ts`) метка `_lastCloudAccessRefreshTime` ставится в начале попытки. Поэтому неудачный restore (сеть, ошибка) закрывал повтор на полные 30 мин.

Теперь при ошибке метка сдвигается так, чтобы повтор был разрешён через **2 мин**: `now − TTL + 2 мин`. Успех держит прежние 30 мин.

## Scope

In scope: catch-ветка `refreshPremiumAccessFromCloudIfNeeded`; тест в `tests/premium_guard_cloud_refresh_ttl.test.ts`.
Out of scope: остальная логика доступа.

## Architecture

В catch, если поколение аккаунта текущее: `_lastCloudAccessRefreshTime = Date.now() - CLOUD_ACCESS_REFRESH_TTL_MS + CLOUD_ACCESS_REFRESH_FAILED_RETRY_MS`. Журнал `[PREMIUM-CLOUD]` пишет, когда будет повтор.

## Security and privacy

Fail-closed не меняется.

## Technical debt

- Офлайн-человек без Plus при проверках доступа будет пробовать облако раз в 2 мин (одно чтение облака на попытку, офлайн оно падает быстро и стоит 0 чтений).

## Verification

Тест: restore бросает ошибку → через 1 мин повтора нет, через 2,5 мин есть. Прежние тесты зелёные.

## Rollback

`git revert` коммита.
