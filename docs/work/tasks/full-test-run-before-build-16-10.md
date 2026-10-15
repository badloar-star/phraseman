# Task packet: полный прогон jest перед сборкой 16.10 и разбор красных по владельцам

Governance-ID: TG-47A4A8F1C4A8
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: поручение координатора 15.10 — сводка к 08:00; прогон по слоту, `--maxWorkers=1`, `NODE_OPTIONS=--max-old-space-size=1536`, свободной памяти < 2 ГБ — ждать

## Outcome

Таблица красных наборов основного jest и рендер-конфига на HEAD после коммитов 07:00, разделённая на «наши, этой ночи», «наши старые» и «Codex/V2»; наши ночные красные чинятся по одному или передаются владельцу зоны.

## Scope

In scope: скрипты прогона и разбора вне репозитория (`C:/Temp/claude/work`), правки ночных красных в моих файлах.

Out of scope: чужие наборы курса (Learning V2, Gustav, Dialogue V2) — только список.

## Architecture

No architecture change.

## Security and privacy

Нет затрагиваемых данных.

## Technical debt

Contain: красные «Codex/V2» уходят владельцам списком; ослаблять сторожей нельзя.

## Verification

Итог прогона: «Test Suites: N passed / N failed» без «failed to run» вне списка; для чинимых — повторный точечный прогон «N passed».

## Rollback

git revert коммитов правок.
