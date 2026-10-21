# «Друзья» — сверка текстов «Серии вдвоём» на 9 языках (Переводчик → 8 · МОМЕНТЫ)

Governance-ID: TG-28A4FF0AE9DC
Status: Ready for 8 · МОМЕНТЫ
Owner: «10 · ПЕРЕВОДЧИК» (тексты); вставка — 8 · МОМЕНТЫ (`app/friends_together/pair_copy.ts` у них, не закоммичен)

## Что сверено

`app/friends_together/pair_copy.ts` — «Серия вдвоём» и шторка друга. В коде пока НЕТ строк для:
«Урок вместе», «Дуэль», «Итог недели», «Фраза дня вдвоём», подарок энергии «5 → 8 сверх запаса».
Их переведу, когда ключи появятся (пусть Моменты положат ru-черновик в файл — сверю тем же днём).

## 1. Род друга: «занимался(ась)» → без рода (D188, и скобки читаются как анкета)

Род друга неизвестен, поэтому вместо глагола прошедшего времени — безличная форма:

| ключ | ru | uk | pl |
|---|---|---|---|
| friend_pending | Сегодня ещё без занятия | Сьогодні ще без заняття | Dziś jeszcze bez nauki |
| me_pending | Занятие сделано · ждёт тебя | Заняття зроблено · чекає на тебе | Nauka zrobiona · czeka na ciebie |
| pairHomeSub | Занятие сделано · {N} дня подряд | Заняття зроблено · {N} дні поспіль | Nauka zrobiona · {N} dni z rzędu |
| pairDoneFriendPending | {Имя}: сегодня ещё без занятия | {Ім'я}: сьогодні ще без заняття | {Imię}: dziś jeszcze bez nauki |

(en/es/pt-BR/vi/id/tr — родом не страдают, их строки верны.)

## 2. «Позвать» — не «позвонить»

В es и vi «Llamar» / «Gọi» читается как телефонный звонок. В en «Call» — тоже звонок.

| ключ | en | es | vi |
|---|---|---|---|
| call | Nudge | Avisar | Rủ |
| called | Nudged | Avisado | Đã rủ |
| alreadyCalled | Nudged today | Ya avisado | Đã rủ hôm nay |
| callToStudy | Nudge to study | Invitar a estudiar | Rủ cùng học |
| callRestart | Nudge · start again | Avisar · empezar de nuevo | Rủ · bắt đầu lại |

pt-BR «Chamar» (в Бразилии = позвать), id «Ajak», tr «Çağır», pl «Zawołaj» — верны.

## 3. «Пять отправлено»

- es: «Choca esos cinco enviado» — несогласовано → **Choque de manos enviado**
- pt-BR: «Toca aqui enviado» — несогласовано → **Toque enviado**

## 4. Дни недели, pt-BR

«Se Te Qa Qi Sx Sá Do» — таких сокращений в Бразилии нет. Если влезает 3 буквы — **Seg Ter Qua Qui Sex Sáb Dom**;
если только одна — **S T Q Q S S D** (так в бразильских календарях). Остальные 8 языков верны.

## Верно без правок

Подписи `both_today`, `none_today`, `broken`, `quietHours`, `queued`, `waitsYou`, `openCard`, `menu`, `pairBroken`,
`offlineSaved`, дни подряд, «лучшая N», заголовки Главной/финала/вехи, тело вехи — на всех 9 языках.
Склонение ru/uk по числу (`slavic`) — верно, включая 11–14.

## Scope / Architecture / Security and privacy

Только тексты. Без логики. Данные не затрагиваются.

## Technical debt

- Переводы не проверены носителями.

## Verification

Моменты после вставки: `babel.parseSync` файла и свои тесты (после «142 tsc готов»).

## Rollback

Удалить файл.
