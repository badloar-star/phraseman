# Task packet: «Пожаловаться на набор» — нижняя шторка по макету (cards-020)

Governance-ID: TG-EA2516208B0C
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по решению владельца 13.10 09:20 через координатора («как в макете, сразу, до сборки 16.10»)

## Outcome

1. Жалоба на набор сообщества открывается нижней шторкой (образец `docs/design/v2-app/cards-states.html`, `packReport`): заголовок + ✕, шесть причин с радио слева, поле комментария, кнопки «Отмена» / «Отправить жалобу». Вместо окна по центру.
2. Optimistic UI: «Отправить» закрывает шторку сразу, показывает тост «Жалоба отправлена»; лимит 30 с и сбой — тосты; ref-замок от двойного тапа.
3. Журнал `[PACK-REPORT]`: открытие, выбор причины, отправка (причина, длина комментария, язык изучения), ответ и его длительность, тосты, закрытие.

## Scope

In scope: `components/ReportPackModal.tsx` (вид и поток), три сторожа, которые закрепляли старое окно (`tests/pack_sheets_liquid_glass_source_contract.test.mjs`, `tests/cards_precheck_text_fixes_contract.test.ts`, `tests/gustav_community_pack_target_gate.test.ts`), новый сторож шторки.

Out of scope: сервер и `submitPackReport` (без изменений; если сервер не принимает причину/комментарий — не меняем функции, сообщаем координатору и Ядру), действие «Не показывать мне этот набор» (в новом потоке шторка его не показывает — решение владельца вернуть где-либо ещё, сообщено координатору).

## Architecture

Тот же компонент и те же пропсы (`visible`, `packId`, `packTitle`, `authorStableId`, `lang`, `studyTarget`, `onClose`, `onPackHiddenOnDevice`, `motionVariant`), внутри — `HybridSheetShell` (`material="liquid-glass-opaque"`, как у жалобы на отклик) вместо `Modal`/`HybridAlertShell`. Отправка — прежний `submitPackReport(payload)`.

## Security and privacy

Данные те же (причина, комментарий до 500 знаков, id набора и автора, язык изучения) и по тому же пути; Privacy Policy не меняется. Журнал пишет только длину комментария, не текст.

## Technical debt

Contain: «Не показывать мне этот набор» после жалобы убрано из потока (по макету-решению с тостом); возврат — в меню набора, отдельное решение владельца. Параметр `onPackHiddenOnDevice` оставлен для совместимости вызовов.

## Verification

`npm run test:one` по трём правленым сторожам и новому; `node --test` для `.mjs`; кадры Сверки: шторка, выбранная причина, с клавиатурой, тост.

## Rollback

git revert коммита правки.
