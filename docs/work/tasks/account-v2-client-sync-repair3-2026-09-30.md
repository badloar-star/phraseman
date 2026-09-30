# Task packet: Account V2 — клиентский пакет синхронизации, ремонт №3 (условный HOLD безопасности)

Governance-ID: TG-085BF4F55515
Status: In progress
Owner: Claude session (Account V2, /loop)

## Outcome

3-е ревью: SPEC APPROVE, SECURITY HOLD условный.
- P2-1: отрицательная оценка возраста — доказанно ложная; решать по второй: `expire = (serverOld && localOld) || (serverOld && localAge < 0) || (localOld && serverAge < 0)`; тест «часы на год вперёд при постановке, исправлены, прошло 171 сут → истекло»; остаточный риск (часы вперёд < 170 сут) — в TEMP; предложение серверной защиты (отказ операций со временем старше 170 сут по часам сервера) — записать как следующий шаг.
- P2-2: комментарии «повтор безопасен» в errors.ts, account_sync_transport.ts, firestore_port.ts — переписать под правило двух оценок и оговорку.
- P3-1: повреждённая/пропавшая запись из `later:<id>` — пропускать с логом `outbox_later_entry_dropped`, markResolved не падает навсегда.
- P3-2: потолок списка `later:<id>` (200 последних id) + слияние без квадратичности.

## Scope

In scope: modules/account-session-v2/account_sync_outbox*.ts, account_sync_transport.ts (комментарий), tests/account_sync_repair2_v2.test.ts (+ новый тест-файл при необходимости), functions/src/accounts_v2_adapter/errors.ts и firestore_port.ts (только комментарии), паритет если меняется текст сверки. Out of scope: подключение к app, деплой, commit.

## Architecture

Без изменения модели.

## Security and privacy

Сужает окно двойного применения.

## Technical debt

Accept temporarily: серверная проверка возраста операции — следующий шаг.

## Verification

RED→GREEN; мутации; tests/account_sync*_v2; functions src/accounts_v2_; строгая проверка типов; eslint; подтверждающее ревью.

## Rollback

Копия `.tmp_client_sync_backup4/`.
