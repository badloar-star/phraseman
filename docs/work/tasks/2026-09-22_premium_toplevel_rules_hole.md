# Task packet: закрыть топ-уровневую дыру premium/premiumExpiry в firestore.rules

Governance-ID: TG-D0C9CC1690C2
Status: In progress
Owner: сессия Claude Opus 5, 2026-09-22
Related epic/enabler: none (перенос подготовленного фикса a5d789275 из ветки claude/nice-almeida-93b29b)

## Outcome

Клиент физически не может записать себе `users/{uid}.premium` / `.premiumExpiry`.
Успех измеряется регрессионным тестом в `tests/firestore_rules_security.test.ts`,
который падает при снятом гарде (проверено мутацией).

Выгодоприобретатель — владелец: сегодня цена ошибки мала (единственный вызывающий
`isPremiumActive` — сегментация пушей), но любой будущий вызывающий унаследовал бы
обход пейволла, то есть прямую потерю денег.

## Scope

In scope:
- `firestore.rules` — новая функция `hasNoTopLevelPremiumWrites()` и её включение в
  цепочку `allow update` для `match /users/{userId}`.
- `tests/firestore_rules_security.test.ts` — регрессионный тест.

Out of scope:
- Create-вариант гарда. В текущем дереве `allow create: if false` — гард был бы
  мёртвым кодом (именно поэтому коммит-источник переносится адаптированно, а не целиком).
- Комментарий-предупреждение в `functions/src/admin_push_jobs.ts` из коммита-источника
  переносится как документирующая часть той же правки.
- Мёртвая `newDocHasNoPremiumWrites()` (firestore.rules:885) — вынесена в отдельный
  вопрос владельцу, не трогается в этой задаче.
- Сторож писем активации (`3d3f7a824`) — отдельная задача, требует деплоя.

## Architecture

Границы не меняются. Правила Firestore остаются вторым рубежом поверх серверной
авторитетности: подписку по-прежнему выдаёт только Admin SDK через callable.
Инвариант, который закрепляется: **топ-уровневое legacy-зеркало подписки —
server-owned**, как уже закреплено для shard-полей и server-identity.

Проверено, что легальных клиентских писателей нет: `app/cloud_sync.ts:3713-3718`
шлёт фиксированный whitelist топ-уровневых полей (`user_avatar`,
`user_avatar_frame`, `updatedAt`, `last_active_at`, `created_at`, плюс
`firebaseAuthUid` отдельно); `premium`/`premiumExpiry` в него не входят.

Гард пропускает `isAdmin()` — админ-панель пишет через клиентский SDK, запирать её
нельзя (тот же приём, что в `hasNoShardWrites()`).

## Security and privacy

Authorization: сужается — клиент теряет возможность писать два поля, которые
управляют платным доступом. Это единственный эффект.

Персональных данных, детских данных, секретов, новых сторонних сервисов правка не
касается — Privacy Policy обновления не требует.

Класс уязвимости: privilege escalation через клиентскую запись. `isPremiumActive`
(`functions/src/admin_push_jobs.ts:181`) считает премиум активным при плане без срока:
`expiresAt = 0` → `expired = false` → `hasPlan && !expired` = `true`, то есть
«премиум навсегда» от записи `{premium:'monthly'}`.

## Technical debt

- **Pay now:** сама дыра — закрывается в этой задаче.
- **Contain:** `isPremiumActive` остаётся небезопасной по форме; переносится
  комментарий-предупреждение, направляющий будущего вызывающего к каноническому
  `resolvePremiumAccess` (`functions/src/premium_status`). Выход: любая новая выдача
  платного доступа обязана идти через `resolvePremiumAccess`.
- **Accept temporarily:** мёртвая `newDocHasNoPremiumWrites()` (firestore.rules:885).
  Владелец: владелец проекта. Решение ждёт ответа; потолок вреда — нулевой
  (недостижимый код), риск — ложное ощущение защиты при будущем открытии `create`.

## Verification

- `npx jest tests/firestore_rules_security.test.ts --runInBand --watchman=false` — PASS.
- Мутационная проверка: временно убрать `&& hasNoTopLevelPremiumWrites()` из цепочки
  `allow update` → тест обязан УПАСТЬ; вернуть → PASS. Обе стороны фиксируются в отчёте.
- `npx jest tests/fc_deck_selection.test.ts --runInBand --watchman=false` и
  `tests/fc_deck_options_local_packs_contract.test.ts` — не связаны с правкой, но
  проверяют, что чистка копий вернула работоспособность прогона тестов.

## Rollback

Правка чисто ограничительная и не мигрирует данные. Откат — убрать
`&& hasNoTopLevelPremiumWrites()` из `allow update` и передеплоить правила; уже
выданные подписки не затрагиваются, потому что их пишет Admin SDK в обход правил.
