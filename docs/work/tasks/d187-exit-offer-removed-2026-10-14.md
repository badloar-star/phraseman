# Task packet: D187 — удалить код оффера пробного периода на выходе из пейвола (PM-297, владелец 14.10)

Governance-ID: TG-D6399A51DF21
Governance-ID: TG-03E6814D0757
Governance-ID: TG-24320AACB1C6
Governance-ID: TG-85BACE59AF7F
Status: Тесты (красные) готовы; код — после D186 этапа 1
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Владелец: «Удалить код» (D187). Оффер «Точно уходишь? N дней бесплатно» был выключен на единственном пейволе (`disableExitOffer: true`); поведение для человека не меняется: первый тап «закрыть» закрывает окно, как и сейчас.

До сборки 16.10 (клиент):
- `app/paywall_purchase.ts` — `handleClose` сразу зовёт `doClose`; удалить `exitOffer`, `ExitTrialOfferState`, `EXIT_TRIAL_OFFER_SEEN_KEY`, перехват, параметр `disableExitOffer`;
- `components/paywall/PaywallPlusScreen.tsx` — убрать `disableExitOffer: true`;
- удалить `app/paywall_trial_offer.ts` и `tests/paywall_trial_offer.test.ts`; моки в `paywall_plus_resilient_checkout` и `paywall_purchase_behavior`;
- `app/firebase.ts` — неиспользуемые `logExitTrialOffer*`;
- сторож `paywall_exit_offer_themed_modal_contract` → «оффера нет».

После R1: события `paywall_exit_offer_*` в `app/analytics.ts`, каталоге событий и серверных отчётах (`functions/src/admin_product_analytics.ts`) — вместе с панелью, чтобы не сломать историю отчётов.

## Scope

In scope: перечисленные клиентские файлы и тесты.
Out of scope: аналитика и сервер (после R1), онбординг.

## Architecture

Удаление мёртвой ветки. `handleClose(reason)` → `hapticTap()` + `doClose(reason)`.

## Security and privacy

Меньше хранимых ключей на устройстве (`paywall_exit_trial_offer_seen_v1` больше не пишется).

## Technical debt

- События exit-offer в аналитике остаются до этапа после R1.

## Verification

Сторож D187, наборы пейвола (69 наборов), node-сторожа пейвола.

## Rollback

`git revert` коммита.
