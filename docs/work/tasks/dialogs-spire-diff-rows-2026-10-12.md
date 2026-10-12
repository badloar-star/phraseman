# Task packet: Диалоги (36 diff) и Шпиль (34 diff) — свежий кадр чинить, старый — b_reshoot

Governance-ID: TG-22378F8248F8
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: docs/phraseman-2.0/R1_DIFF_ONE_FIX.md

## Outcome

1. Диалоги: свежий кадр у 2 строк (dialogs-gap-002/003 — решения уже даны: красная «Очистить память» — разрушительное действие, масштаб кадра), 34 — старше кода → b_reshoot.
2. Шпиль: свежий кадр у 8 строк; доказанная причина одна — флажок «пожаловаться» залитый Ionicons `flag`, в макетах kit.js контурный → `flag-outline`. Остальное: состояние превью, приказ 01.10 (энергия без капсулы), «Тень» для Шпиля (Темы), данные превью.

## Scope

In scope: components/ReportErrorButton.tsx (значок icon-flag), тест. Out of scope: вёрстка Шпиля (Темы).

## Architecture

No architecture change: имя значка.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: значок не совпадает с макетами.

## Verification

Тест-сторож, 5 наборов (54 теста) зелёные.

## Rollback

Откат коммита.
