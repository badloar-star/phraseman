# Ядро · пуш «серия ждёт» без обещания урока (Переводчик 7398140e4, координатор 26.10)

Governance-ID: TG-7CB1C129810F
Governance-ID: TG-084C490427E0
Status: In progress
Owner: 1 · ЯДРО

## Outcome
Серверный пуш `streak_at_risk` (`functions/src/re_engage_push.ts`) уходит всем курсам, включая es/fr/de/it. На 6 языках он
обещал «урок» — у этих курсов вкладка «Уроки» скрыта (D129/D130). Тело заменено нейтральным текстом Переводчика ×9
(«Пара минут сегодня — и серия растёт.»). Заголовок «🔥 Серия N дней ждёт тебя» не меняется.

## Правда ли новый текст (проверено по коду)
- **Телефон** засчитывает день только за учебное действие:
  - `STREAK_DAY_ACTIVITY_KINDS` = `lesson`, `cards`, `mistakes`, `dialog`, `spire_steps` (`app/streak_day_signal.ts:25`);
  - `classifyStreakTouch`: остальное, включая открытие приложения и видео, — пассивная сверка, день не засчитан;
  - зовут его `touchStreakForToday` (`app/hall_of_fame_utils.ts:176`) и `recordTodayTaskActivity`
    (`modules/today-tasks/today_tasks_store.ts:458`).
- **Сервер** двигает серию на любом событии прогресса: `applyDailyStreak` в `applyProgressEvent`
  (`functions/src/progress_events.ts:705`) — урок, диалог, экзамен, слова, ошибки, задания плана.
- **Итог.** Несколько минут карточек, диалога, «Моих ошибок» или ступеней Пика двигают серию у любого курса — текст правдив.
  Видео и простое открытие серию не двигают; текст их и не обещает.

## Scope
In scope: тела `STREAK_AT_RISK_COPY` ×9, сторож в `functions/src/re_engage_push.test.ts`, строка в
`docs/work/release/server-deploy-pack-2026-10-26.md`.
Out of scope: `app/` (пакет OTA 7116bc581 собран), заголовки, `inactive_return` / `inactive_long` (урок не обещают).

## Architecture
Без изменений.

## Security and privacy
Не затрагивает данные.

## Technical debt
Новой нет. Пока функции не выложены, на бою уходит старый текст с «уроком».

## Verification
Тест: тело `streak_at_risk` на 9 языках не содержит слов «урок / lesson / lección / lição / pelajaran / ders / lekcja / bài»;
существующие тесты пушей; проверка типов functions. Выкладка — только по «да» владельца.

## Rollback
Откат коммита и выкладка `reEngagePushCron` из HEAD.
