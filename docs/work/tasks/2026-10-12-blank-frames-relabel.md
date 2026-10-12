# Task packet: пустые кадры помечаются «[кадр пустой — пересъёмка]»

Governance-ID: TG-030912079F4A
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

В строках реестра, где кадр приложения пустой или чёрный (cards-062, cards-gap-026, dialogs-031, dialogs-034), пометка заменена на «[кадр пустой — пересъёмка]» (не дефект кода), как просил координатор. Мера успеха: число строк реестра прежнее, статусы не меняются.

## Scope

In scope: registries/visual_parity.json (diffs четырёх строк по id).

Out of scope: код приложения; образцы.

## Architecture

No architecture change: реестр.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: экраны, остающиеся пустыми дольше 3 с, пойдут отдельным списком как возможная белая или чёрная вспышка.

## Verification

Число строк реестра прежнее; в diffs четырёх строк есть новая пометка.

## Rollback

Откат коммита.
