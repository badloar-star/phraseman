# Task packet: public_profiles.isPlus — кольцо Plus без вводного доступа

Governance-ID: TG-E43BF4364462
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: правило владельца 21.10 «вводный 72-часовой доступ кольца не даёт». Найдено Ревизором (🟡): public_profiles.isPremium = isPremiumAccessActive включает isGiftAccessActive.

## Outcome

В сообществе и у друзей кольцо Plus не появляется у новичка в первые 72 часа вводного доступа. У настоящих Plus (покупка, выдача админом, VIP) кольцо есть.

## Scope

- `functions/src/premium_status.ts`: общий `isRealPlusActive(progress, now)` = магазин || админ || VIP, без вводного доступа. Одно правило на сервере.
- `functions/src/public_profile_projection.ts`: новые поля `isPlus` и `plusUntilMs` (срок Plus, 0 = бессрочно). Срок нужен, чтобы истёкший Plus не держал кольцо, пока человек не открыл приложение. `isPremium` НЕ трогаем: его читают другие экраны.
- `functions/src/spire_groups.ts`: `spireIsPlusOf` зовёт общий помощник (поведение то же).
- Тесты: вводный доступ → isPlus=false; покупка, админ, VIP → true; срок.
- Клиентскую часть (кольцо читает isPlus) делает 4 · ТЕМЫ.
- Выкладка — только по утреннему «да» владельца.

## Доработка по Ревизору 22.10 (продление без запуска приложения)

- `functions/src/public_profile_plus_sync.ts`: после успешной денежной записи — отдельная лучшая попытка `update({isPlus, plusUntilMs})` в `public_profiles/{stableUid}`. Только `update`: нет профиля — тихий пропуск (NOT_FOUND), пустой обрывок без имени не создаётся, 0 чтений. Никогда не бросает. Журнал `[PLUS-RING]` без uid.
- Вызов из вебхука RevenueCat (`revenuecat_shards.ts`, после транзакции) и крона истечения (`premium_expiry_cron.ts`, после своей транзакции). В расчёт идёт полный прогресс — текущий плюс патч, — чтобы VIP не терял кольцо.
- `realPlusUntilMs`: `null` — Plus нет, `0` — бессрочно. Правило читателя: `isPlus === true && (plusUntilMs === 0 || plusUntilMs + 72 ч > сейчас)`. Запас 72 ч — на опоздание вебхука продления.
- `functions/scripts/backfill_public_profile_is_plus.ts` — разовая дозапись 237 профилей, `--apply` только по «да».

## Architecture

Проекцию пишет `publicProfileProjectMine`. Приложение зовёт его на каждом старте с причиной `entitlement_change` (`app/_layout.tsx:2701`), такой вызов не пропускается по хэшу. Значит, у существующих документов поле появится само при следующем открытии приложения — массовая дозапись не нужна. Пока поля нет, клиент кольцо не показывает (`isPlus === true`, без запасного чтения устаревшего `isPremium`).

## Security and privacy

Новое поле — производное от уже публичного `isPremium`/`isVip`, к тому же более узкое (без вводного доступа). Новых данных нет. Пишет только сервер.

## Technical debt

Признак «настоящего Plus» на клиенте (`isPremium || isVip || isPro`) и на сервере (`isRealPlusActive`) — два места. Если правило изменится, нужно править оба. Владелец — Ядро.

## Verification

- `public_profile_projection` тесты + новый тест isPlus; `spire_room_plus_flag`.
- Типы по изменённым файлам.
- Счётчик public_profiles с isPremium (только чтение) — оценка охвата.

## Rollback

Ревертнуть коммит. Лишнее поле в документах безвредно: клиент без поля кольцо не показывает.
