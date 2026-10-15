# Автостарт записи после ожидания доступа — только для tap, не для удержания (Ревизор, 15.10)

Governance-ID: TG-022C6790661C

## Outcome
Ревизор по ebacc519e: у микрофонов с удержанием (lesson1 onPressIn/Out; старый курс, interaction "hold") автостарт после подтверждения Plus срабатывал, когда палец уже отпущен, и запись висела до тишины или потолка. Для hold-взаимодействий `onProceed` не передаётся — остаётся только подсказка «Проверяем подписку…» (как в «Моих ошибках»); автостарт — только для tap.

## Scope
`app/lesson1.tsx` (убрать onProceed и ссылку на старт удержания), `app/learning-v2/session/[id].tsx` (onProceed только при `interaction === "tap"`), сторож `tests/button_audit_design_fixes_contract.test.ts`.

## Architecture
Общий gate `useVoiceAttemptGate` не меняется: `canStartAttempt(onProceed?)`; хост решает, передавать ли автостарт.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Гистерезис компактного этажа (включать при окне < 180, выключать при > 196) — вместе с включением флага, если понадобится.

## Verification
Сторож по исходникам; тесты гейтов голоса.

## Rollback
Откат коммита.
