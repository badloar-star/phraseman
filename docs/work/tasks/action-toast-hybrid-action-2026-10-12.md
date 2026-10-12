# Task packet: ActionToast — кнопка действия в гибридной карточке

Governance-ID: TG-0A2B39432265
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, находка Макетов 7976ddef6)
Related epic/enabler: components/ActionToast.tsx, app/events.ts (action_toast.action), app/flashcards_card_editor.tsx, app/manage_subscription.tsx

## Outcome

Тост с `action` показывает кнопку действия и в гибридной карточке (она по умолчанию): раньше действие рисовалось только при `motionVariant: 'classic'`, из-за чего «Повторить» у ошибки сохранения карточки и действие в тосте управления подпиской были невидимы. Чинится в самом ActionToast, не в каждом вызове. Тост с действием держится дольше обычного, чтобы успеть нажать.

## Scope

In scope: `components/ActionToast.tsx` (гибридная карточка + выбор действия + срок показа), тест на кнопку в гибридном варианте, проверка всех вызовов с action.
Out of scope: вызовы с action (их всего два — менять не нужно), UndoSnackbar, тосты layout `top_line` (по макету без кнопки).

## Architecture

No architecture change: гибридная карточка получает те же `actionLabel`/`onActionPress`, что классическая; один и тот же handleActionPress (защита от двойного тапа, лог).

## Security and privacy

Данных не касается.

## Technical debt

Pay now: недоступное действие в тосте ошибки — человек видит сбой и не может повторить.

## Verification

Тест: тост с action в гибридном варианте → кнопка `action-toast-action` есть и вызывает onPress один раз; без action — кнопки нет и тост сквозной; top_line без кнопки. Контракты action_toast_* и motion_hybrid_*.

## Rollback

Откат коммита.
