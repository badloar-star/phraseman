# Task packet: overlays-campaigns-013 — blocked → pending (шаги робота готовы)

Governance-ID: TG-348C9BBB0D41
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

Строка реестра overlays-campaigns-013 (промокод «Неверный формат») переходит из blocked в pending: у Авторизации готовы шаги робота (5160819e5), Сверка снимает кадр.

## Scope

In scope: registries/visual_parity.json — одна строка overlays-campaigns-013.

Out of scope: код, образцы, кадры.

## Architecture

No architecture change: реестр.

## Security and privacy

Данных пользователей нет.

## Technical debt

None.

## Verification

Число строк реестра прежнее; коммит меняет только эту строку; гейт visual_parity_gate считает.

## Rollback

Откат коммита.
