# Task packet: PM-220 — способ измерения навигации и тренировок ([NAV-PAINT]) + команда ворот navpaint

Governance-ID: TG-9B87F538EA2D
Status: Done (метод измерения); числовые бюджеты — после baseline на устройствах (владелец)
Owner: 1 · Ядро; очередь координатора, п.5 (PM-220)

## Outcome
По реестру 04.10 у сценариев «навигация» и «тренировка» не было метода измерения (A2). Теперь:
- `app/nav_paint_trace.ts`: при каждой смене маршрута (кроме первого — его меряет [HOME-PAINT]) одна строка
  `[NAV-PAINT] group=<tab|screen|training> route=<путь> ms=<от смены маршрута до второго кадра>`; release-видимая
  (console.warn — release вырезает log/info/debug).
- Группа training — маршруты уроков/сессий/экзаменов/тренировок (тот же образец, что PHONE_STATE_BUSY_ROUTE_RE).
- `scripts/pm220_perf_gates.mjs navpaint <logcat>`: медиана/p90 по группам; бюджеты `navPaint.groups.*` в
  config/perf-budgets.json — null до baseline (команда честно возвращает 2 «нет бюджета», а не «ОК»).

## Scope
app/nav_paint_trace.ts (новый), app/_layout.tsx (одна строка вызова), scripts/pm220_perf_gates.mjs,
config/perf-budgets.json (секция navPaint), tests/pm220_nav_paint.test.mjs.

## Architecture
Без setState и ре-рендеров: сравнение пути в рендере корня через ref + два requestAnimationFrame + один console.warn.
Сеть/Firestore не трогаются.

## Security and privacy
В лог — только путь экрана (без параметров и идентификаторов) и миллисекунды.

## Technical debt
Метрика начинается со смены маршрута в корне, а не с касания (касание → смена маршрута не входит); для
регрессионных ворот это достаточно, абсолютное «тап → кадр» требует нативного замера.

## Verification
Юнит-тесты разбора и групп (node:test); tsc по _layout и модулю; прогон на эмуляторе — по запросу.

## Rollback
Откат коммита.
