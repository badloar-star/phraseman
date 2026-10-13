# Task packet: overlays-campaigns-013 (промокод «Неверный формат») — шаги робота для DEV_LINKS_R1 (координатор 13.10 ~13:00)

Governance-ID: TG-2900F1C266BF
Status: Done — запись добавлена; строка попадёт в DEV_LINKS_R1 после смены статуса в реестре (blocked → pending)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

У Сверки нет dev-ссылки на состояние «Неверный формат» экрана промокода. Состояние в приложении уже есть: 93c22d44c, решение владельца п.81(13). Кнопка активна при любом непустом коде, формат проверяется по нажатию ДО сети.

В `scripts/dev_links_r1_steps_auth.py` добавлена запись `overlays-campaigns-013`:
- ввод `AB` (2 знака меньше минимума 3 в `PROMO_CODE_FORMAT`);
- hidekb;
- тап `#promo-code-submit`;
- кадр с плашкой «Проверь код».

## Scope

In scope: одна запись `add(...)` в своём модуле шагов Авторизации.
Out of scope:
- реестр `visual_parity.json` — статус `blocked` у строки снимают Сверка или Макеты, после этого генератор её подхватит (берёт только pending/diff/match);
- код приложения.

## Architecture

Тот же приём, что у overlays-campaigns-006: `tap:#promo-code-input`, `type:…`, `hidekb`, `tap:#promo-code-submit`. Подмены `promo=` не нужно — сеть не вызывается.

## Security and privacy

Только dev-ссылка. Неверный формат отсекается на телефоне, сеть и запись не трогаются.

## Technical debt

- До смены статуса в реестре строки в DEV_LINKS_R1 нет — запись ждёт.

## Verification

Цепочка импортов генератора выполняется без ошибок (rc 0).

## Rollback

`git revert` коммита.
