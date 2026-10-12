# Task packet: заглушка стор-сборки dev_account_state — недостающие экспорты namecheck; коммит overlays=off

Governance-ID: TG-17ACE6B70861
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: store_release_stubs/dev_state/dev_account_state_stub.ts, app/dev_account_state.ts, tests/store_release_dev_state_stubs.test.ts, app/dev_overlays_off.ts

## Outcome

1. Заглушка dev_account_state экспортирует те же имена, что настоящий модуль (DEV_NAME_CHECKS, getDevNameCheck, добавлены коммитом 85812a2a3) — стор-сборка не падает на недостающем экспорте.
2. После зелёных проверок коммит overlays=off + onboarding=done с отметкой времени + подсказка/плашка «Удалено» + hold=dialog_language_gate + генератор ссылок.

## Scope

In scope: одна заглушка, коммит ранее подготовленных правок.
Out of scope: DEV_LINKS_R1.md / реестр / BINDINGS (у Макетов).

## Architecture

No architecture change: заглушка возвращает «нет подмены», как остальные.

## Security and privacy

Данных не касается; в стор-сборке подмены невозможны.

## Technical debt

Pay now: расхождение заглушки ломает именно стор-сборку, а не dev.

## Verification

tests/store_release_dev_state_stubs.test.ts, остальные проверки пакета overlays.

## Rollback

Откат коммита.
