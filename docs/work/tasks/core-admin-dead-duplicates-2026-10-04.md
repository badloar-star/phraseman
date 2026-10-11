# Task packet: админка — убрать мёртвые ранние копии функций; документ генератора про admin/v2

Governance-ID: TG-94EA8E61CB15
Status: Done
Owner: сессия 1 · ЯДРО (координатор 04.10)
Related epic/enabler: очистка админки после 2.0 (d9b5dfe31)

## Outcome

В admin/v2/legacy.html у loadUgcPurchases / renderUgcPurchases / renderPremiumList остаётся по одной
живой версии (поздняя, которая и работает сейчас: последнее присваивание window.* побеждает); сторож
single_runtime_owners требует ровно одну. docs/v2/GENERATOR_DELIVERY_CONTRACT.md говорит правду:
admin/v2 — живая админка.

## Scope

In scope: admin/v2/legacy.html (удаление ранних мёртвых копий), tests/admin_legacy_single_runtime_owners_contract.test.ts,
docs/v2/GENERATOR_DELIVERY_CONTRACT.md. Out of scope: «Студия курса» (вопрос владельцу), прочая логика админки.

## Architecture

Без изменения поведения: удаляются только определения, которые перезаписываются более поздним
присваиванием той же window-функции до первого вызова (проверяется, что ранняя копия не вызывается
между своим и поздним объявлением).

## Security and privacy

Нет. Вход в админку не затрагивается (guard_admin_login).

## Technical debt

Pay now: дубли владельцев, маскирующие, какая версия живая.

## Verification

Разбор скриптов админки (vm), guard_admin_login.mjs, сторожа single_runtime_owners / d2 / premium_grant
пачками по 3 с --runInBand.

## Rollback

git revert.
