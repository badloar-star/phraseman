# Ядро · сторож «назад» из идущей сессии диалога — в хаб (решение координатора 26.10)

Governance-ID: TG-8E7AE405717D
Status: Done
Owner: 1 · ЯДРО

## Outcome
Решение координатора (владелец может вернуть): «назад» из идущей сессии Диалогов 2.0 ведёт в хаб, как сейчас. Брифинг
означал бы повторную трату энергии. Причина записана в `INTENTIONALLY_UNREGISTERED`, отдельная проверка краснеет, если у
сессии появится роль раздела или хоть один выход `safeRouterBack` перестанет вести в `/ai_dialog_home`.

## Scope
In scope: `tests/back_nav_registry_contract.test.ts`. Поведение экрана не меняется.

## Architecture
Без изменений.

## Security and privacy
Не затрагивает данные.

## Technical debt
Новой нет. Если владелец вернёт «назад на брифинг», сторож надо переписать в том же коммите, что и поведение.

## Verification
`tests/back_nav_registry_contract.test.ts` 4/4.

## Rollback
Откат коммита.
