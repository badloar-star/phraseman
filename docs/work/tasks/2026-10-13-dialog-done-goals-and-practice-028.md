# Task packet: итог диалога — карточка целей в образце (D1–D5); practice-028 — перепривязка на «Итог отработки»

Governance-ID: TG-529BC0A61882
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора (проход Дизайна по экранам завершения)
Related epic/enabler: dialogs.html, mistakes-panel.html

## Outcome

1. dialogs.html, done() — кадры итога D1–D5: между плитками счётчиков и строкой монет — карточка «Цели» со списком целей и отметками, как в коде (dialogue-v2-completion-goals; рабочую функцию не убираем).
2. Строка practice-028 перепривязана на mistakes-panel.html «Итог отработки» (вариант Б, одобрен владельцем 04.10), pending до кадра на ru.

## Scope

In scope: docs/design/v2-app/dialogs.html (функция done и её стили), registries/visual_parity.json (practice-028 и строки итога диалога — пометка «образец дорисован»).

Out of scope: код.

## Architecture

No architecture change: образцы и реестр.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: кадры итога диалога в реестре ждут пересъёмки на ru после дорисовки.

## Verification

Кадры D1–D5 сняты playwright и проверены глазами; разметка карточки сверена с кодом dialogue_v2_completion; число строк реестра прежнее.

## Rollback

Откат коммита.
