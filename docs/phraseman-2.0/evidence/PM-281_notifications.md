# PM-281 — Шпиль: пуши понедельника и воскресенья

## Что сделано

Два пуша, ровно как решил владелец («Пуши: понедельник (итог + новый шпиль),
воскресенье (у края зоны). Больше ничего.»):

- **Понедельник** — `functions/src/spire_week_result_push.ts`. Вызывается
  ИЗНУТРИ `spireFinalizeCron` (`functions/src/spire_finalize_cron.ts`) СТРОГО
  после `await flush()`, отдельного крона нет — кандидаты собираются попутно
  из уже идущего по комнатам цикла (тот же приём, что у
  `tournament_start_push`). Провал отправки не роняет крон (try/catch,
  итог недели уже записан — пуш не источник истины).
- **Воскресенье** — `functions/src/spire_zone_warning_push.ts`, отдельный крон
  `spireZoneWarningCron` (`every sunday 20:00 UTC`, зарегистрирован в
  `functions/src/index.ts`). Читает только открытые комнаты текущей недели,
  границу зоны считает той же функцией (`spireLiveZoneSize` +
  `compareSpireStanding` из `spire_finalize_core.ts`), что и итог понедельника
  — экран, боты и оба пуша видят одну границу.

Общее: `functions/src/spire_notifications.ts` — имена шпилей на 8 локалях
(зеркалит `modules/spire/tier_names.ts`, сторож
`spire_notifications_tier_names_mirror.test.ts`), валидация Expo-токена,
чанкование по 100 (лимит Expo Push API), отправка через Expo Push API.
Категория уведомлений — `pushPrefs.league` (Шпиль заменяет Лигу, отдельного
тумблера нет — как у турниров).

## Экономия (PM-281-A2)

- Ни одного нового скана `users/` или `spire_groups/` сверх уже идущего.
  Понедельничный пуш использует данные, уже поднятые `spireFinalizeCron` для
  подведения итогов; воскресный — одну постраничную выборку открытых комнат
  текущей недели (`.select('members')`, страницы по 200).
- Токены докупаются ОДНИМ `db.getAll(...)` на весь список кандидатов, чанками
  по 300, а не `.get()` на каждого.
- Частота: 1 раз в неделю на каждый пуш (понедельник — внутри уже идущего
  крона, воскресенье — отдельный лёгкий крон раз в неделю). Никаких таймеров
  раз в N минут.

## Проверено

- `functions/src/spire_notifications.test.ts` — 11 тестов (нормализация языка,
  имена/клемпинг tier на всех 8 локалях, валидация Expo-токена, чанкование).
- `functions/src/spire_notifications_tier_names_mirror.test.ts` — сторож
  зеркала имён камней между сервером и `modules/spire/tier_names.ts`.
- `functions/src/spire_week_result_push.test.ts` — 10 тестов: отбор
  кандидата (токен/pushPrefs.league/pustой uiLang), три исхода текста
  (повышение/понижение/без изменений, T30/T33), сборка Expo-сообщения.
- `functions/src/spire_zone_warning_push.test.ts` — 18 тестов:
  `spireZoneEdgeStatuses` (граница зоны, margin=1, приоритет повышения над
  понижением при пересечении — T25, нулевые ступени не считаются краем,
  комната меньше zoneSize не даёт статусов), отбор кандидата, тексты без
  обещания исхода, `spireCurrentWeekIdForWarning`.
- Весь набор `spire_*` вместе: **153/153 зелёные** (13 test suites), без
  регрессий в остальных файлах Шпиля.
- Полный `functions/` typecheck — 0 новых ошибок (только предсуществующий
  долг в `modules/learning-v2/content/source/*`, не относящийся к Шпилю).

## Файлы

- `functions/src/spire_notifications.ts` (+`.test.ts`,
  `_tier_names_mirror.test.ts`)
- `functions/src/spire_week_result_push.ts` (+`.test.ts`)
- `functions/src/spire_zone_warning_push.ts` (+`.test.ts`)
- `functions/src/spire_finalize_cron.ts` — добавлен вызов понедельничного пуша
- `functions/src/index.ts` — экспорт `spireZoneWarningCron`
