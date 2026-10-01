# Task packet: личное избранное видео и счётчик уникальных сохранений (PM-111/112/113)

Governance-ID: TG-1D4634882D5A
Governance-ID: TG-C13B00747E74
Status: In progress
Owner: сессия «пачка 3, E10 видео» (2026-10-01)
Related epic/enabler: E10 (PM-111, PM-112, PM-113), решение владельца D19

## Outcome

Человек сохраняет ролик в личное избранное и убирает его; список принадлежит аккаунту, переживает
повторный вход и не виден другим. У ролика есть число уникальных текущих сохранений, которое клиент
не может подделать. Успех: тесты логики, правил и серверного пересчёта зелёные; UI подключает сессия
«Дизайн» по описанному API.

## Scope

In scope: `app/video_favorites_core.ts` (чистая логика), `app/video_favorites.ts` (локально-первый
стор + запись связи в Firestore), `app/video_save_counts.ts` (чтение агрегата с кэшем 6 ч),
`functions/src/video_save_counts.ts` (callable пересчёта агрегата через count()), правила Firestore
для `users/{uid}/video_favorites/{videoId}` и `video_save_counts/public`, индекс collection group,
тесты.

Out of scope: экраны и кнопки (зона «Дизайн»), деплой правил/функций/индексов, классификация новой
подколлекции в инвентаре переноса accounts v2 (решение владельца), правка privacy policy.

## Architecture

Связь «пользователь ↔ ролик» = документ `users/{stableUid}/video_favorites/{videoId}` (id = videoId:
один пользователь учитывается один раз). Клиент пишет/удаляет только свой документ (правила).
Агрегат = `count()` по collection group `video_favorites` с `videoId == X`, считает сервер и кладёт в
`video_save_counts/public` (клиенту запись запрещена). Пересчёт ленивый: только для роликов, которые
кто-то смотрел, и не чаще раза в 6 ч на ролик. Удаление аккаунта рекурсивно сносит `users/{uid}` —
связи исчезают, следующий пересчёт уменьшает агрегат. Realtime-слушателей нет.

## Security and privacy

Запись связи — только владельцу (`personalEconomyOwnerMatchesAuth`), форма документа зафиксирована
правилами. Агрегат — только сервер. Callable требует вход, ограничивает 100 id за вызов.
Новые личные данные: список сохранённых роликов аккаунта — требует строки в privacy policy до релиза.

## Technical debt

- Contain: инвентарь accounts v2 не знает подколлекцию `video_favorites` (классифицирует как
  hold/unknown). Выход: решение владельца о судьбе подколлекции при переносе.
- Accept temporarily: агрегат отстаёт до 6 ч (отмеченная eventual consistency, PM-113-A3); своё
  нажатие видно сразу через поправку ±1.

## Verification

`npm run test:one -- tests/video_favorites.test.ts tests/video_save_counts_client.test.ts
tests/video_favorites_rules_contract.test.ts`; functions: `src/video_save_counts.test.ts`.
Эмуляторная проверка правил и прод-проверка — после деплоя (владелец).

## Rollback

Новые модули никем не вызываются до подключения UI. Откат = не деплоить callable/правила или
убрать вызовы из UI; данные пользователей не теряются (связи остаются в его документе).
