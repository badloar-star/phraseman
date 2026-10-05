# Task packet: сторож overlays-runtime — окна пейвола после 65(а): 3 информационных + 1 выбор

Governance-ID: TG-CFC9C365C2F1
Status: In progress (координатор 05.10: «обнови сторож под новое окно-выбор»)
Owner: сессия 1 · ЯДРО

## Outcome

После d677a328e окно «Статус покупки не подтверждён» стало окном выбора (enqueueThemedBlockingChoiceAlert), и сторож
overlays_runtime_liquid_glass_source_contract, считавший 4 вызова enqueueThemedBlockingInfoAlert, упал на 3≠4.
Сторож теперь считает 3 информационных окна и 1 окно выбора — оба идут через ту же очередь стеклянных окон.
Проверка «нет нативного Alert» остаётся.

## Scope

tests/overlays_runtime_liquid_glass_source_contract.test.mjs — одна проверка.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Сторож считает вызовы по строке. Новое окно в пейволе снова потребует правки числа — так задумано, это и есть
сигнал «проверь, что окно стеклянное».

## Verification

node --test сторожа: зелёный.

## Rollback

git revert коммита.
