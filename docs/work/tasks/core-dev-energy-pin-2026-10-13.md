# Task packet: dev-подмена энергии для робота держится до сброса (energy-modes-003/007/017)

Governance-ID: TG-47DF698A3442
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10; журналы evidence/parity/_runs/2026-10-12T23-57-49…/energy-modes-003.log, …19-28-09…/energy-modes-007.log

## Outcome

`dev_state?energy=N` пишет energy_state, но на кадре энергия 5. Журнал: подмена «ок», затем «перечитывание энергии → потолок».
energy_state — ключ аккаунта: на свежей установке смена/сброс аккаунта стирает его, загрузка видит пустой ключ и ставит
полный бак (5). Теперь подмена держится в памяти до перезапуска: если ключ пуст — загрузка берёт подмену; маршрут dev_state
ждёт перечитывания энергии дольше (12 с, если подменяется энергия), значение в контексте пишется в журнал [DEV-STATE].
Плюс aiConsent=denied (dialogs-010) — отдельным разделом ниже, когда дойдёт.

## Scope

In scope: aiConsent=denied — app/dev_ai_consent.ts (режим denied, только память), app/ai_dialog_consent.ts (гейт отвечает «отказ»), app/dev_state_fixtures.ts (разбор denied). Энергия: app/dev_energy_tools.ts (закреп подмены в памяти), components/EnergyContext.tsx (readAndRecoverState: пустой ключ +
закреп → подмена, только __DEV__), app/dev_state.tsx (потолок и журнал). Out of scope: боевая логика энергии, сервер.

## Architecture

No architecture change. В релизе peekDevEnergyPinRaw() всегда null — ветка мёртвая.

## Security and privacy

Только dev-сборка; данных не касается.

## Technical debt

- Фильтр журнала робота (scripts/parity_batch_shoot.mjs FRAME_LOG_RX) не пропускает [ENERGY-*] — поэтому новые строки идут под [DEV-STATE].

## Verification

Тест-контракт dev-закрепа; робот: energy-modes-003/007 — в журнале «[DEV-STATE] энергия в контексте = N».

## Rollback

Откат коммита.
