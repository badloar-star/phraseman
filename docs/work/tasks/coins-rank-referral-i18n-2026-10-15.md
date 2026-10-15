# Task packet: R54 — экраны монет и ранга на 9 языках, числа по языку, «крути награду» в рефералах; R51 — проверка итальянских диалогов

Governance-ID: TG-3D917322D16D
Status: In progress
Owner: сессия «Специалист по переводам» (координатор 15.10, реестр release-ledger R51/R54)
Related epic/enabler: аудит кнопок docs/work/tasks/button-audit-dialogs-mistakes-progress-2026-10-15.md

## Outcome

На экранах «Монеты» (`runes_wallet`) и «Повысить ранг» (`coin_rank`) все подписи и тосты — на языке интерфейса (9 языков, без
английского запасного), числа разделяются по правилам языка («1,180» en, «1.180» es/pt/tr/id/vi, «1 180» ru/uk/pl), «Не хватает
1 монеты / 21 монеты / 5 монет». В рефералах вместо запрещённого «крути награду» — «забирай награду» на 9 языках.
R51: ответ координатору — есть ли контент итальянских диалогов (итог: нет).

## Scope

In scope: `app/runes_wallet.tsx`, `app/coin_rank.tsx`, `app/referrals.tsx` (только тексты и форматирование чисел), новый
`app/coin_number_format.ts` (формат числа по языку) + тест. Out of scope: логика повышения ранга и кошелька, диалоги (R51 — только проверка).

## Architecture

No architecture change: функции `formatCoins` в двух экранах начинают принимать язык интерфейса и берут локаль из общей таблицы.

## Security and privacy

Не применимо.

## Technical debt

- Тексты экранов монет/ранга живут внутри экранов (не в таблице строк) — Accept temporarily: владелец — Дизайн, вынос в `*_strings.ts`
  после выпуска 20.10; переводчик держит все 9 языков полными.

## Verification

Тест формата чисел и склонения; тесты coin_rank/runes_wallet/referrals; сторожа i18n — через slot.sh.

## Rollback

`git revert` коммита.
