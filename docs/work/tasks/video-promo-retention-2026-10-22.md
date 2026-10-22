# Task packet: чистка непривязанных заявок «Акция с видео» через 90 дней после конца акции

Governance-ID: TG-1D40D8DAF167
Status: Done (код и тест), НЕ выложено
Owner: Ядро (сессия 1), координатор 22.10: «гигиена данных, не обещание в политике».

## Outcome

Через 90 дней после конца акции (`VIDEO_PROMO_UNTIL` = 2026-12-31 включительно, по UTC−12) в `website_contact_inbox` не остаётся заявок `topic: 'video_promo'`, у которых нет ни почты, ни `promo.resolvedUid`. Такие заявки нельзя привязать к человеку, поэтому удаление аккаунта их не находит.

## Scope

- Новый `functions/src/video_promo_retention.ts`: `videoPromoRetentionCutoffMs()`, `isUnlinkedVideoPromoEntry()`, `cleanupUnlinkedVideoPromoEntries()`.
- Вызов — в существующем `cleanupExpiredAppMessagesCron` (04:00 UTC). Нового планировщика нет.
- Заявки с почтой или с resolvedUid НЕ трогаем: первые уходят при удалении аккаунта по почте, вторые — по resolvedUid (d4fb962fc).

## Architecture

- До даты отсечки — ранний выход: 0 чтений, строка журнала `[VIDEO-PROMO-RETENTION] before_cutoff`.
- После отсечки — один запрос `where('topic','==','video_promo')` страницами по 300, фильтр в коде, удаление пакетом. Однопольный запрос идёт по автоиндексу.
- Отсечка: конец 2026-12-31 по UTC−12 = 2027-01-01T12:00Z, плюс 90 дней.

## Security and privacy

Только удаление. Политику владелец не меняет (решение 22.10), это гигиена данных.

## Technical debt

Дата акции живёт в двух местах (site-config.js и website_contact.ts). Их держит сторож-тест 9 · САЙТ.

## Verification

`video_promo_retention.test.ts`: до отсечки 0 запросов; после — удаляется только заявка без почты и без uid, с почтой и с uid остаются, чужой topic не трогается.

## Rollback

Убрать вызов из крона. Удалённые заявки не восстанавливаются, но по ним уже нельзя было найти человека.
