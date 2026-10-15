# Task packet: сторож EOL — чтение исходников в 21 тесте через normalizeEol

Governance-ID: TG-8DDA52BD27DE
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: поручение координатора 15.10 — одним коммитом, кроме `learning_v2_plan_b_gates` (Codex); `source_guard_eol_normalized_contract` красный из-за 22 тестов

## Outcome

`tests/source_guard_eol_normalized_contract.test.ts` зелёный (кроме файлов Codex): тесты, сверяющие исходник с многострочным литералом, читают файл через `normalizeEol` (`tests/helpers/read_source.ts` / `read_source_esm.mjs`), поэтому не краснеют на ПК с CRLF в рабочей копии. Поведение тестов не меняется.

## Scope

In scope: только файлы в `tests/` из списка сторожа (21 файл), механическая обёртка `readFileSync(..., 'utf8')` в `normalizeEol(...)` + импорт.

Out of scope: `tests/learning_v2_plan_b_gates.test.mjs` (Codex), любой код приложения.

## Architecture

No architecture change: готовый помощник `normalizeEol`.

## Security and privacy

Только тесты.

## Technical debt

Pay now: 21 тест мимо помощника. Файлы, где у другой сессии есть незакоммиченные правки, пропускаются и называются в отчёте.

## Verification

Сторож `source_guard_eol_normalized_contract` + каждый затронутый тест — «N passed» не хуже, чем до правки (результаты до/после сравниваются по списку).

## Rollback

git revert коммита.
