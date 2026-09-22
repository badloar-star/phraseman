# Вычистить замеры производительности из клиента

Governance-ID: TG-42BB77105699

## Outcome

Владелец: «приложение невероятно сильно лагает, всё тормозит, на самых сильных
устройствах, все разделы, и в релизе и в деве». Прямое указание: «никаких
замеров, никаких логов, всё удалить».

Результат: из клиента удалена вся инфраструктура замеров производительности,
которая выполняется в обычном пути пользователя. В первую очередь —
`probeStorageGrowth`, который делал ПОЛНЫЙ скан индекса AsyncStorage
(`getAllKeys`) на КАЖДОЙ смене раздела, то есть ровно в тот момент, когда
владелец чувствует заминку.

## Scope

Удаляется:
- `app/perf_release_probe.ts` целиком (255 строк) — `countScreenRender`,
  `measureRelease`, `probeStorageGrowth`, `resetReleasePerfCounters`.

Снимаются вызовы:
- `app/_layout.tsx:1163` — `probeStorageGrowth(pathname)` на каждой смене
  раздела (полный `getAllKeys`), вместе с его `useEffect` и импортом.
- `app/(tabs)/home.tsx:706` — `countScreenRender('home')` в теле компонента,
  то есть на КАЖДЫЙ рендер Главной.
- `app/(tabs)/home.tsx:2884` — `measureRelease('home:loadData')` и склейка
  двух замеров в одну «ручку» `step`; остаётся только дев-замер `perfSteps`.
- `app/club_screen.tsx:433` — `countScreenRender('league')` в теле компонента.

НЕ трогаем в этой правке:
- `app/tap_latency_trace.ts` — в релизе уже выключен
  (`__DEV__ || EXPO_PUBLIC_TAP_LATENCY_TRACE === '1'`), в проде не выполняется.
- `console.warn`/`console.error` — правило владельца «логи в catch и на ранних
  выходах остаются НАВСЕГДА»; `console.log/info/debug` уже вырезает babel.
- Остальные 59 вызовов `getAllKeys` — это рабочая логика (реестры операций,
  очереди), а не замеры. Разбираются отдельной задачей.

## Architecture

`perf_release_probe` писал через `DebugLogger.error(..., 'warning')`, то есть
в AsyncStorage — замер о медленном хранилище сам писал в хранилище. В Firestore
не уходил, стоимости бэкенда не создавал.

После удаления путь смены раздела не выполняет никакой работы с хранилищем;
рендер Главной и Лиги не вызывает счётчиков.

## Security and privacy

Влияния нет: модуль хранил только числа и имена шагов, ничего о пользователе,
в сеть не отправлял. Privacy policy не затрагивается.

## Technical debt

Удаление снимает долг, а не создаёт. Диагностика на будущее остаётся: дев-замер
`perfSteps`, `tap_latency_trace` под флагом, `console.warn/error` в catch.

## Verification

- `grep -rn "perf_release_probe\|countScreenRender\|measureRelease\|probeStorageGrowth" app/ modules/ components/` → пусто.
- `npm run typecheck` — без новых ошибок относительно базовой линии.
- Точечные тесты затронутых экранов.

## Rollback

`git revert` коммита. Модуль самодостаточен, внешних потребителей, кроме трёх
снятых вызовов, не имел.
