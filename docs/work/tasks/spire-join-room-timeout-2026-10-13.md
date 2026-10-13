# Task packet: вход в комнату Шпиля — потолок ожидания callable (аудит «пропала сеть», п.6)

Governance-ID: TG-827D90584604
Status: In progress
Owner: Ядро (сессия 1)
Related: аудит Авторизации 13.10 п.6; список R1 Ядра п.5 (координатор)

## Outcome

- app/spire/spire_net.ts `spireCall`: потолок вызова 18 с (сервер spireJoinRoom — HOT_CALLABLE_OPTIONS, 15 с); раньше ждал
  нативные ~60–70 с, и без кэша комнаты тап «Подняться» висел.
- `spireClassifyNetError`: `deadline-exceeded` → 'offline' (как и «нет сети»): вызывающий отдаёт кэш недели и прежнее понятное
  сообщение. Журнал [SPIRE] call … timeout с мс.

## Scope

In scope: spire_net.ts (+ тест). Out of scope: сервер, очередь отчётов (modules/spire/report_queue.ts).

## Architecture

No architecture change.

## Security and privacy

Нет новых данных.

## Technical debt

- Очередь отчётов Шпиля (flush) зовёт сервер своим путём — её потолок отдельно (если понадобится).

## Verification

Тест классификатора и потолка; точечные тесты Шпиля; babel-проверка.

## Rollback

Откат коммита.
