# Task packet: образец Пика — значок лиги перед «Камень · до конца недели» (по коду SpireWeekSubtitle)

Governance-ID: TG-11D8419E0EBC
Status: In progress
Owner: 3 · МАКЕТЫ (координатор 25.10 по разбору Дизайна, пункт 6а parity-311-triage)

## Outcome

Разбор 311, пункт 6а: в приложении перед «Гранит · до конца недели» значок лиги, в образце spire-gaps-states.html его нет. Это
решение владельца 15.10 (14755a9af, SpireWeekSubtitle) — образец устарел. Привести шапку образца к коду: значок лиги того же
размера и отступа. Пункты 7–10 и моменты — в отчёте parity-311 перенести в «переснять» (код исправлен после кадров).

## Scope

In scope: docs/design/v2-app/spire-gaps-states.html (шапка homeHead), docs/work/parity-311-triage-2026-10-25.md (статус пунктов),
этот пакет. Out of scope: код Пика (молния solidBolt — Дизайн), реестр.

## Architecture

No architecture change. Значок — из того же источника, что башня образца (spire-tower-render / монеты лиг), размер по коду.

## Security and privacy

Макет, данных нет.

## Technical debt

- None known.

## Verification

Страница без ошибок, число телефонов прежнее; значок на месте во всех шапках главного экрана Пика.

## Rollback

Вернуть страницу и отчёт из git.
