# Task packet: R1_CODE_DEFECTS — dialogs-030 (поле ввода остаётся приподнятым после отправки), затем проверка топа по коду

Governance-ID: TG-96EFDA349318
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: docs/phraseman-2.0/R1_CODE_DEFECTS_FROM_PARITY.md, components/dialogs/DialogueV2SessionScreen.tsx

## Outcome

1. dialogs-030: после отправки реплики и скрытия клавиатуры поле ввода садится на место (нет пустой полосы ~150 px, плейсхолдер не обрезан). Сначала логи подъёма поля (клавиатура/отступ), потом правка по фактам.
2. Остальные позиции топа-15 «Проверка по коду»: есть ли дефект в HEAD; если код верен — пометка «ждёт пересъёмки», если дефект есть — логи, затем правка.

## Scope

In scope: экран сессии Диалогов, лёгкие правки перечисленных файлов.
Out of scope: dialogs-041 и dialogs-038 (ведёт Ядро), серверные тексты.

## Architecture

No architecture change.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: видимый зазор в самом частом экране Диалогов.

## Verification

Точечные тесты экрана сессии; проверка на эмуляторе по команде координатора; тип-проверка только срезом.

## Rollback

Откат коммитов.
