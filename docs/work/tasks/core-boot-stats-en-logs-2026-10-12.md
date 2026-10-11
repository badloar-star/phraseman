# Task packet: 20 с на at:stats_en у гостя на холодном старте — только логи

Governance-ID: TG-F5490F05CEC7
Status: In progress (логи; правка — после фактов)
Owner: сессия «1 · Ядро» (координатор 12.10: «сначала логи, без правок»).

## Outcome
Дизайн видел на холодном dev-старте онбординга: `[BOOT-RESTORE-APPLY] totalMs=28900`, `at:stats_en=20335`;
`[FIRST-FRAME] paywall_price_cache_warmup taskMs=21661`. По коду `applyMark('at:X')` пишет время С ПРЕДЫДУЩЕЙ
отметки, то есть `at:stats_en` — это `await import('./stats_daily_breakdown')`, а не сверка статистики. Прогрев цен —
тоже `import('./paywall_price_cache')`. Гипотеза: ленивая подгрузка модулей Metro в dev после перезапуска.
Логи разделяют «загрузка модуля» и «работа»; у сверки — что пришло из облака, что лежит локально, запись или пропуск.

## Scope
In: `app/cloud_sync.ts` (две строки времени вокруг импорта и сверок), `app/stats_daily_breakdown.ts` (вход/итог
сверки, причина в бывшем немом catch), `app/_layout.tsx` (время импорта прогрева цен).
Out: поведение (ранний выход для пустого гостя — предложение после фактов).

## Architecture
Только наблюдение, префиксы `[BOOT-STATS]` и `[PAYWALL]`.

## Security and privacy
В логах только размеры и время, без содержимого.

## Technical debt
Сверка для 'fr' идёт всегда, даже если человек его не учит; пустой гость пишет «{}» в два ключа — кандидат на ранний выход.

## Verification
babel_check; срез типов; лог виден в Metro на холодном старте.

## Rollback
`git revert`.
