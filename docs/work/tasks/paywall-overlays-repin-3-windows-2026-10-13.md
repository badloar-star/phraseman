# Task packet: перепин сторожа overlays_runtime — у пейвола 3 инфо-окна, не 4 (координатор 13.10 ~18:05)

Governance-ID: TG-81E0CB2A0179
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

`tests/overlays_runtime_liquid_glass_source_contract.test.mjs` ждёт 4 вызова `void enqueueThemedBlockingInfoAlert(` в `app/paywall_purchase.ts`, а их 3. Окно «Покупка ждёт подтверждения — родителя или банка» убрано намеренно в 1f874c994 (владелец 13.10): ожидание оплаты теперь показывается тостом.

Сверка по коду, до и после 1f874c994:

| Окно | До | После |
|---|---|---|
| «Покупка ждёт подтверждения» | 190 | убрано, стал тост |
| «Предпросмотр покупки» (dev) | 362 | 357 |
| «Покупка на предыдущем аккаунте» | 1147 | 1154 |
| «Не удалось оформить» (онбординг) | 1509 | 1520 |

Окна выбора (`return enqueueThemedBlockingChoiceAlert(`) — по-прежнему 2. Ничего, кроме окна ожидания, не потеряно.

## Scope

In scope: одно число и комментарий в сторожe.
Out of scope: код пейвола.

## Architecture

`4 → 3`. В комментарии: какие три окна, и почему ожидание ушло в тост.

## Security and privacy

Только тест.

## Technical debt

- Сторож считает вызовы, а не названия окон: подмену одного окна другим он не заметит. Отдельный сторож `overlay_queue_and_pending_alert_contract` проверяет тост ожидания.

## Verification

`node --test tests/overlays_runtime_liquid_glass_source_contract.test.mjs` — все зелёные.

## Rollback

`git revert` коммита.
