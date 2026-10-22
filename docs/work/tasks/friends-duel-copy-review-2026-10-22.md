# Task packet: «Дуэль на 5 фраз» — вычитка 9 языков (Переводчик → 8 · МОМЕНТЫ)

Governance-ID: TG-4244EC0AAD40
Status: Done
Owner: «10 · ПЕРЕВОДЧИК» (поручение координатора 22.10; фича за выключателем, не к этому выпуску)

## Outcome

`app/friends_together/duel_copy.ts` (62bb58140). ru не трогал (его точные строки сторожит
`tests/friends_duel_copy.test.ts`).

Исправлено:
- **«Без энергии»** в en/es/pt-BR/id/tr/pl читалось как «у тебя кончилась энергия», а смысл — «дуэль энергию не тратит»:
  en «Costs no energy», es «No gasta energía», pt-BR «Não gasta energia», id «Tidak pakai energi», tr «Enerji gerekmez»,
  pl «Nie zużywa energii». (vi «Không tốn năng lượng» уже было верно.)
- **tr** вызов назывался «davet» (приглашение): «düello daveti», «günde üç düello», «Bugün zaten üç düello başlattın»;
  строка итога была собрана неестественно («5'te 4, karşı 3») → «sen 4/5, arkadaşın 3/5», по времени так же;
  «Derse çağır» → «Oturuma çağır» — занятие в приложении «Oturum» (как в «Уроке вместе»).
- **en** «точнее и быстрее» без сравнения → «faster and more accurately than your friend»; лимит → «You’ve sent three
  challenges today».
- **id** «Kamu jalan dulu» (jalan = идти пешком) → «Kamu main duluan» (ход в игре).
- **vi** «Sẽ báo kết quả» без подлежащего → «Mình sẽ báo kết quả cho bạn».
- **pl** «Wygrał znajomy» — глагол мужского рода, а род друга неизвестен → «Wygrana znajomego».

Верно без правок: uk, остальное es/pt-BR/vi/id/pl, «Позже», «Дуэль — когда учите один язык» на всех языках.

## Scope

In scope: строки в `duel_copy.ts`, кроме ru. Out of scope: логика дуэли, шторки, ru.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Не проверено носителями.
- Тест текстов не запускал (нужен слот); правки ru не касаются, кириллицу в другие языки не вносят — сторож держится.

## Verification

`babel.parseSync` файла.

## Rollback

`git revert <коммит>`.
