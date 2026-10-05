# Task packet: (в) лог эффектов Главной после фиксации — [HOME-EFFECTS]

Governance-ID: TG-17BFA1055E23
Status: In progress (координатор 05.10: «(в) лог эффектов Главной после commit по меткам»)
Owner: сессия 1 · ЯДРО

## Outcome

Пакет 07:26, прогон 1: фиксация Главной +5,6 с → HOME-PAINT +8,1 с; стоянка 2488 мс накрывает рендер и эффекты. Разбить
окно после фиксации: (1) от фиксации (useLayoutEffect, [HOME-RENDER] committedEpochMs) до первого пассивного эффекта
Главной = эффекты дочерних компонентов + планирование; (2) все пассивные эффекты самой Главной (первый → последний
объявленный). loadData уже пишет [PERF-STEPS] home:loadData (dev) — добавить префикс в фильтр пакета.

## Scope

app/(tabs)/home.tsx: два однократных useEffect (первый и последний объявленные в HomeScreen), строка
[HOME-EFFECTS] first_mount {sinceCommitMs, ownPassiveMs}. Вид и поведение не меняются.

## Architecture

Модульные переменные, флаг «один раз за запуск»; без setState.

## Security and privacy

Только длительности.

## Technical debt

Временная трассировка; после диагноза убрать.

## Verification

Сторожа Главной; синтаксис; замер 08:26.

## Rollback

git revert коммита.
