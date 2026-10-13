# Task packet: ожидание теста про отступ экрана-гейта диалогов (194 → 150)

Governance-ID: TG-269D48E65FA8
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по замечанию координатора 13.10

## Outcome

`tests/r1_diff_two_plus_cards_dialogs_contract.test.ts` закреплял `paddingTop: 194` у `gateBody`; после `b807e552d` (мой коммит: шапку с «назад» считали дважды, верно 150 по `.gate { margin-top: 150px }` образца, замер dialogs-033: значок на 296 dp при 246 в образце) тест красный. Ожидание обновляется до 150 со ссылкой на замер.

## Scope

In scope: одна строка ожидания и комментарий в этом тесте.

Out of scope: код `DialogueGlassKit.tsx` (уже в `b807e552d`).

## Architecture

Только тест. Новый контракт `tests/dialogs_gate_top_offset_contract.test.ts` уже закрепляет 150.

## Security and privacy

Не затрагивается.

## Technical debt

Contain: два теста закрепляют одно число (этот и `dialogs_gate_top_offset_contract`); при следующем изменении отступа гейта править оба, ссылка на замер dialogs-033 оставлена в комментарии.

## Verification

`npm run test:one -- tests/r1_diff_two_plus_cards_dialogs_contract.test.ts` (один процесс, под светофором).

## Rollback

git revert коммита.
