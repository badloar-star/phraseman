# Task packet: красный r1_diff_two_plus_cards_dialogs_contract (cards-070) + порядок ключей в тесте подмен монет

Governance-ID: TG-949E484232DB
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (генератор ссылок; координатор 13.10)

## Outcome

- Тест ждал `add('cards-070', ['tap:#ugc-pack-save'], EMPTY_PLUS, CREATE,`; в scripts/dev_links_r1_steps.py:101 сейчас
  `EMPTY_PLUS + '&fail=publish_error'` — правка dc9b10b85 (12.10 19:26, сторож записи в прод Ядра 69a4230ba): тап «Создать набор» без подмены
  мог дойти до сети. Ссылка верна, ожидание устарело — обновлено с комментарием «зачем». dialogs-001/003/005/006 — совпадают, не трогались.
- tests/dev_coins_errorscreen_appmessage.test.ts: ожидаемый порядок ключей после sort() — 'coins' < 'coinupgrade' (s < u); поведение подмен верно.

## Scope

In scope: два теста. Out of scope: ссылки (верны).

## Architecture

Нет изменений кода.

## Security and privacy

Подмена fail=publish_error остаётся — запись в прод недостижима.

## Technical debt

- Contain: нет.

## Verification

Оба теста jest зелёные.

## Rollback

Откат коммита.
