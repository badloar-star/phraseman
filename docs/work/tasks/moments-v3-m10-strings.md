# m10 «Итог урока — цепная реакция»: новые строки

Источник — эталон `docs/design/v2-app/engagement-moments-v3-all.html`, блок `result3`. Код — `components/completion/done_chain_strings.ts`.

Переводы на все языки, кроме RU, — черновики, носитель их не проверял (TODO-i18n). Вместо заглушек «= ru» стоит черновик: иначе в англоязычном интерфейсе была бы русская строка. Переводчик меняет только значения.

| ключ | ru | en (черновик) |
|---|---|---|
| streak | Серия — {n} {dn} | Streak — {n} {dn} |
| counted | сегодня засчитан | today counts |
| pending | сегодня ещё нет | not yet today |

- `{n}` — число дней.
- `{dn}` — слово «день» в нужной форме. Его даёт `streakDayWord` из `components/streak/moments/streak_moments_strings.ts`.

Новыми строками не считаются, они уже есть в коде:

- «Урок пройден», «верно / ошибок / точность», «+N монет», кнопки — итог урока `app/lesson_complete.tsx` и `V2DoneScreen`;
- «Пройти урок» — задачи «Сегодня» `modules/today-tasks/today_tasks_view.ts`.
