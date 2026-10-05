# Task packet: 65(б) — окно отказа удаления аккаунта: «Закрыть» / «Повторить»

Governance-ID: TG-1662040212BE
Status: In progress (решено по рекомендации, владелец 11:10; координатор: «65(б): 039 — повтор удаления, да»; макет
overlays-runtime OR-ACCOUNT-DELETE-PRECOMMIT-REJECTED — «retry allowed», кнопки «Закрыть» (тихая) и «Повторить»)
Owner: сессия 1 · ЯДРО

## Outcome

Оба окна отказа в DeleteAccountConfirmModal — `beginAccountDeletion` вернул !ok (замок не записан) или бросил —
показывались с одной кнопкой «OK». Это отказы ДО точки невозврата: аккаунт и данные не изменены. Теперь у окна две
кнопки: «Закрыть» (ничего не делаем) и «Повторить». «Повторить» запускает удаление заново без повторного ввода
слова-подтверждения: человек его уже ввёл, а окно удаления к этому моменту закрыто, и поле сброшено.

## Scope

components/DeleteAccountConfirmModal.tsx: enqueueInfoAlert → enqueueThemedBlockingChoiceAlert с двумя действиями;
одноразовый флаг повтора (ref), который снимает проверку слова на ОДИН вызов; ref на актуальный handleConfirmDelete;
лог выбора [ACCOUNT-DELETE-UI]. Тест-сторож в tests/account_delete_flow_contract.test.ts.

## Architecture

Сигнатура showInfoAlert и порядок «закрыть окно → зазор 360 мс → алерт» не меняются (сторож regex). Успешный путь
не трогаем: на нём по-прежнему ни одного алерта. Повтор идёт тем же handleConfirmDelete — защита deleteInFlightRef
и deleting от двойного тапа действует и для него.

## Security and privacy

Не затрагивает сбор данных. Повтор не обходит подтверждение: флаг ставится ТОЛЬКО кнопкой окна отказа, которое
возникает только после введённого слова, и сгорает на первом же вызове.

## Technical debt

Конфликт правил записан в отчёте координатору: память владельца 22.09 «не показывать окон о провале удаления»
против макета 04.10, где окно отказа с «Повторить» есть. Само окно отказа существовало и до этой задачи. Кнопка
повтора только убирает лишний путь «открыть настройки → ввести слово заново».

## Verification

Сторожа удаления: account_delete_flow_contract, account_delete_immediate_onboarding_contract,
account_modals_liquid_glass_source_contract, account_delete_modal_layout_contract; синтаксис; полная проверка типов.

## Rollback

git revert коммита.
