# Task packet: пометка match-строк, держащихся на образце, нарисованном с приложения

Governance-ID: TG-9E3454B16ABA
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

У каждой match-строки, чей образец нарисован или переделан с приложения/кода за ночь 11–12.10 и не утверждён владельцем отдельно, проставлено triage.basis="mockup_from_app" и тег в sverka_verdict «[образец нарисован с приложения, ждёт подтверждения владельца]». match по утверждённым образцам (cards-013, mistakes-panel-002) не помечаются. Даются два числа: match всего и match по утверждённым образцам.

## Scope

In scope: registries/visual_parity.json (поля triage.basis и sverka_verdict у match-строк по id).

Out of scope: статусы, evidence, код приложения, образцы.

## Architecture

No architecture change: реестр.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: после утверждения владельцем пометка снимается пересчётом.

## Verification

Число строк реестра прежнее; статусы не менялись.

## Rollback

Откат коммита.
