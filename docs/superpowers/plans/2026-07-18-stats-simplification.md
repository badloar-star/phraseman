# План: упрощение статистики и активные бонусы

## Этап 1 — переместить недельные бонусы

**Файлы:** `app/streak_stats.tsx`, `app/level_gifts_inventory.tsx`, тесты статистики.

1. Убрать активную поверхность бонусов из статистики.
2. Показать `TodaysBoonStrip` в отдельной секции «Бонус дня», ниже добавить отдельную сводку «Активные множители», затем — секцию «Подарки».
3. Обновить композиционный контракт: после главной карточки сразу достижения и сравнение.

**Приёмка:** недельный бонус имеет одно постоянное место и сохраняет подробности по тапу.

## Этап 2 — сделать историю честной для нового пользователя

**Файлы:** `app/streak_stats.tsx`, `components/ActivityHeatmap365.tsx`, тесты годового превью.

1. Сохранить пользовательское представление `365 дней` и сохранённый ключ.
2. До 365 наблюдаемых дней показывать компактную сетку с первого занятия и подпись `N из 365 дней`.
3. С 365 днями показывать полный календарь без отдельных подписей месяцев; месячный просмотр открывается по тапу.

**Приёмка:** новая история не выглядит как почти полностью пустой год.

## Этап 3 — верификация

**Команды:**

`npx jest tests/stats_surface_composition.test.ts tests/stats_selected_design_contract.test.ts tests/stats_year_preview_contract.test.ts --runInBand`

`git diff --check -- app/streak_stats.tsx app/level_gifts_inventory.tsx components/ActivityHeatmap365.tsx tests/stats_surface_composition.test.ts tests/stats_selected_design_contract.test.ts tests/stats_year_preview_contract.test.ts`

**Приёмка:** целевые проверки проходят, в diff нет пробельных ошибок.
