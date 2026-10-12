# Task packet: перемонтаж каркаса табов на холодном старте (Главная монтируется дважды), R1 скорость

Governance-ID: TG-8CC7545930E5
Governance-ID: TG-E8EE42166FE7
Governance-ID: TG-4A8EB14C6874
Governance-ID: TG-6C2566ED4C9C
Governance-ID: TG-74C25639E7B2
Governance-ID: TG-17A83C977FD9
Governance-ID: TG-A7B148B10BB8
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, вечер)
Related epic/enabler: docs/phraseman-2.0/R1_PERF_FIRST_FRAME.md

## Outcome

Каркас табов (tabs_layout → tab_scaffold → Главная) монтируется на холодном старте ОДИН раз; первый кадр Главной не откладывается из-за повторного рендера всего каркаса. Причина найдена по журналам [PERF-R1-MOUNT] (Сверка), а не по догадке.

## Scope

In scope: app/(tabs)/_layout.tsx, ярус над ним (причина перемонтажа найдётся по журналу), app/perf_r1_probe.ts (трассировка), тесты, R1_PERF_FIRST_FRAME.md. Пакет закрывает также сообщения о покупке (коммит fa6648f02 уже сделан).
Out of scope: данные Уроков (Ядро), серверные функции.

## Architecture

Не меняется: правка точечная в месте, которое пересоздаёт дерево (ключ/смена типа/условный рендер).

## Security and privacy

Данных пользователя не касается.

## Technical debt

Pay now: двойной монтаж каркаса удваивает работу холодного старта.

## Verification

Журналы [PERF-R1-MOUNT] до/после на той же debug-сборке, сторожа табов/перфа, срез типов.

## Rollback

Откат коммита.
