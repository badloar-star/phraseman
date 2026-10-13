# Task packet: settings-gap-014/015 — образец «Настройки → Обучение» к умолчаниям кода

Governance-ID: TG-E9F4ADB73971
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: MACETS_DIFF_TRIAGE_R1_2026-10-13.md

## Outcome

Образец settings-gaps-states №14/№15 показывает умолчания нового пользователя из user_settings_store: «Автопроверка» выключена, скорость озвучки 0.9x. Строки реестра settings-gap-014/015 — pending до кадра на ru.

## Scope

In scope: docs/design/v2-app/settings-gaps-states.html (кадры №14/№15), registries/visual_parity.json (две строки).

Out of scope: код.

## Architecture

No architecture change: образец и реестр.

## Security and privacy

Данных пользователей нет.

## Technical debt

None.

## Verification

Кадры сняты playwright и проверены глазами; умолчания сверены с кодом user_settings_store; число строк реестра прежнее.

## Rollback

Откат коммита.
