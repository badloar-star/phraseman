# Task packet: награда за репорт — замок от двойного тапа; старые «+1» скрыты (аудит Ядра adc40dad2)

Governance-ID: TG-90A323694CFA
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10)

## Outcome

(б) components/NotificationCenterButton.tsx `claimReportReward`: от двойного тапа защищал только state `claimingMessageId`, который
обновляется после рендера — второй тап в том же кадре проходил. Добавлен синхронный `claimLockRef` (Set id сообщения), снимается в finally;
повторный тап пишет `[REPORT-REWARD] claim tap ignored reason=lock`.
(в) components/AppMessagesInbox.tsx: старая награда «+1 жемчужина» за репорт (поле `reportReply.coins`, формат до наборов наград) по D70/D104
ничего не начисляет — кнопка показывала «Получено» впустую. Решение координатора: честный интерфейс — «+N» и карточка с кнопкой скрыты,
начисления не трогаем. Современные награды рисует NotificationCenterButton (не затронуты). Сторожа приведены к новому поведению с пояснением.

## Scope

In scope: два компонента, тесты app_messages_inbox_liquid_glass_source_contract, app_messages_read_persistence_ui_contract,
report_reply_notification_center_contract (если нужно).
Out of scope: app/app_messages.ts (функция старой выдачи остаётся — её вызывает очередь досылки).

## Architecture

Замок — Set в useRef, как optimisticReportClaimIdsRef во входящих.

## Security and privacy

Начисления и сервер не меняются; старое «забрано» больше не ставится по кнопке, которой нет (награды за ним не было).

## Technical debt

- Contain: нет.

## Verification

Тесты трёх сторожей + синтаксис; проверка непереведённых строк.

## Rollback

Откат коммита.
