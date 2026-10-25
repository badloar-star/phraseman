# Task packet: вычитка утренних текстов 25.10 — тост монет Ядра, удаление одной ошибки, плашка «Нет связи» (Переводчик)

Governance-ID: TG-7ECEB7953702
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Координатор 25.10, до 08:30:
- **eed18ada2** (Learning V2) — `failedOne`, `busy` в `app/mistake_clear_all_copy.ts`: 9 языков, `failedOne` слово в слово из моего
  черновика, `busy` естественный; ru/uk на «ты». Правок нет.
- **a2a3505ef** (5 · ВХОД) — `stripOffline`/`stripService`: мои строки из 08328d174 дословно, одна строка на 360 dp. Правок нет.
- **b6e2837f4** (Ядро) — тост `coins_saving` в `app/coin_spend_gap.ts`. ru/uk/vi/pl верны. Правки:
  - en «Your coins are still being saved — you need a connection, try again in a minute» → «Your coins are still saving — connect
    to the internet and try again in a minute» (без канцелярского «you need a connection»);
  - es «…inténtalo en un minuto» → «…inténtalo de nuevo en un minuto»;
  - pt-BR «…tente em um minuto» → «…tente de novo em um minuto»;
  - id «…coba lagi sebentar lagi» → «…coba lagi dalam semenit» (двойное «lagi», и «минута» как в остальных языках);
  - tr «…bir dakika sonra dene» → «…bir dakika sonra tekrar dene».
  Тост (`components/ActionToast.tsx`) без ограничения строк — длина не режется.

## Scope

In scope: 5 строк `COINS_SAVING_TEXT`. Out of scope: логика `coin_spend_gap`, ru/uk.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Если тосту когда-нибудь дадут `numberOfLines`, самая длинная строка — en/pt-BR (~80 знаков) — потребует короткой формы.

## Verification

Разбор файла babel; тесты `coin_spend_gap` текстов не проверяют дословно (поиск по тестам).

## Rollback

`git revert <коммит>`.
