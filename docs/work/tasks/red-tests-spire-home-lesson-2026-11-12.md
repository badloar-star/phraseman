# Task packet: четыре красных проверки (Пик, отметки «Продолжить», анимации урока)

Governance-ID: TG-D6FB4F4B74C9
Status: In progress
Owner: сессия Claude (U20), задача координатора 12.11 по разбору сессии Elevate
Related epic/enabler: none

## Outcome

Четыре проверки снова отражают намеренное поведение; ошибки кода исправлены в коде, сторожа не ослаблены. Для каждой
назван коммит, который её сломал.

## Scope

In scope:
- `tests/spire_dev_solve_button.test.ts` — проверка таймеров раннера ступени (606a71aaa убрал автопереход и таймеры);
- `app/home_continue_mark.ts` — чтение меток через общий построитель ключей (d8a0a685a заменил его ручным списком);
- `tests/lesson_runtime_animation_contract.test.ts` / `app/lesson1.tsx` — по итогам разбора.

Out of scope: `components/spire/SpireAllMembers.tsx` — размер 18 внесён 3acb12e13 «1 в 1» по утверждённому владельцем
макету; перевод на шкалу 16 сломает утверждённый вид — отложено на утро (решение владельца). Файлы с чужими
несохранёнными правками.

## Architecture

No architecture change: чтение меток «Продолжить» берёт ключи тем же построителем `homeContinueMarkKeys`, что общее
стирание аккаунта и аварийная копия; значения — по имени вида.

## Security and privacy

Проверено: стирание меток при смене/удалении аккаунта происходит — подписчик `onAccountOwnerChanged` снимает
`homeContinueMarkKeys` всех языков, общая опись `accountOwnedStorageKeysFrom` содержит все метки (первая проверка
теста зелёная). Правка касается только чтения, стирание не меняется.

## Technical debt

- Accept temporarily: внешкальный размер 18 в «Все участники» (owner: владелец, утро 12.11) — решение: макет или шкала.

## Verification

- `npm run test:one -- tests/home_continue_marks_account_wipe.test.ts tests/home_continue_places_contract.test.ts`;
- `npm run test:one -- tests/spire_dev_solve_button.test.ts tests/lesson_runtime_animation_contract.test.ts`;
- `node --test tests/spire_design_layer_contract.test.mjs` (ожидаемо красный до решения по макету).

## Rollback

`git revert` коммитов задачи; данные пользователей не затрагиваются.
