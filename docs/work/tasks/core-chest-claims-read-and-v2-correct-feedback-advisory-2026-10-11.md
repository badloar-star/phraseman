# Task packet: чтение сундука «Вместе» для 1.6.x + отклик на правильный ответ — справка, а не блок ворот V2

Governance-ID: TG-40EB7A140976
Status: In progress
Owner: сессия «1 · Ядро» (решения координатора 11.10: «ВЕРНИ» 4 строки чтения `friends_chest_claims`; P4 — вариант (а),
снять требование с ворот выпуска Learning V2, фабрику не трогать)

## Outcome
1. `firestore.rules`: блок `users/{uid}/friends_chest_claims/{weekKey}` — только чтение владельцем, запись запрещена — до
   `min_app_version ≥ 2.0`. Сборка 1.6.24 читает его (`app/friends_together/together_store.ts:254`).
2. `scripts/learning_v2_release_parity_gate.mjs`: нет отдельного отклика на правильный ответ → справка (`advisories`),
   не блок. Плеер этот отклик не показывает, а фабрика раскладывает `choiceFeedback` по неверным вариантам по порядку.
3. Handoff Codex: P4 снят с релиза.

## Scope
In: `firestore.rules` (один блок), сторож PM-170, ворота паритета V2 и их тест, handoff.
Out: выкладка правил (координатор), фабрика `factory_native` и контент курса (Codex).

## Architecture
Правило — точная копия блока из сборки 1.6.24 (`af76518ac`), без изменения смысла. Ворота: новое поле результата
`advisories`, `ready` по-прежнему считается только по `issues`.

## Security and privacy
Чтение только своего документа (`canonicalUserMatchesAuth`), запись клиенту запрещена — как в 1.6.24. Новых данных нет.

## Technical debt
- Pay now: правило, которое удалили раньше, чем ушли клиенты 1.6.x.
- Contain: удалить блок после `min_app_version ≥ 2.0` (сторож PM-170 это напоминает).

## Verification
Сторож PM-170, тест ворот паритета (node), прогон ворот на рабочем дереве.

## Rollback
`git revert` каждого коммита.
