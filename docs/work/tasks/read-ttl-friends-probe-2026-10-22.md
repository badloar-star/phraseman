# Task packet: №45 шаг 6 — «Друзья» без лишних чтений (кэш 30 мин + проба уведомлений вместо полного списка)

Governance-ID: TG-0638F79B1B57
Status: В работе
Owner: 5 · ВХОД И АККАУНТ (поручение координатора 21.10; список — 11 · Ревизор, пункты 1–2)

## Outcome

Решение владельца 21.10 (№45): сократить чтения Firestore «Друзей» в следующую сборку. Сейчас каждый фокус вкладки:
список друзей limit(500) и заявки limit(200), если прошло ≥ 30 с (FRIENDS_REALTIME_REPLACEMENT_TTL_MS), плюс полный список
уведомлений до 20 (refreshUserNotificationsOnce minIntervalMs 30 с). Прежнее правило владельца 17.10 «друзья мгновенно»
сохраняется другим способом: о новой заявке и принятии вкладка узнаёт пробой «последнее уведомление» (1 чтение, не чаще
раза в минуту) и сразу перечитывает друзей и заявки.

## Scope

- app/firestore_friend_requests.ts: срок кэша друзей и заявок 30 мин; invalidateFriendsSocialReadCaches(reason) —
  сброс кэша по событию дружбы; журнал [READ-TTL] (из кэша / из сети, возраст, причина). Свои add/accept/decline/delete
  уже сбрасывают кэш (invalidateFriendReadCaches) — без изменений.
- app/(tabs)/friends.tsx (только свой кусок, в файле чужие правки): фокус вкладки → probeUserNotificationsHead вместо полного
  списка; новое уведомление friend_request/friend_accepted → сброс кэша + friendsAccountStore.retry() + одноразовое чтение заявок.
- tests/friends_realtime_d66_contract.test.ts — новое правило.

## Architecture

Optimistic UI не меняется: свои действия правят список локально (pendingFriendOps) и сбрасывают кэш. Вход на вкладку
показывает кэш сразу (stale-while-revalidate), сеть — только по сроку 30 мин или по событию дружбы.

## Security and privacy

Новых данных нет. В журнал — без uid (friendTag уже хэширует).

## Technical debt

Изменения профиля друга (имя) приходят не позже 30 мин (профили и так кэшируются 30 мин). Пункты 3–7 Ревизора — отдельно.

## Verification

Точечные тесты друзей/уведомлений через светофор; разбор .tsx сборщиком.

## Rollback

`git revert <hash>`.
