# Task packet: окно Plus «магазин недоступен» — выход вместо тупика

Governance-ID: TG-6A84BE492966
Governance-ID: TG-81B619EF7680
Governance-ID: TG-C1802C38BF9D
Status: In progress (исправления по итогам прогона тестов: обращение в поддержку заменяет пейвол, а не открывается поверх; тексты вынесены в `components/paywall/duo/paywall_store_off_copy.ts`)
Owner: сессия Claude «аудит мотивации к покупке Plus», 2026-11-11
Related epic/enabler: макет `docs/work/mockups/paywall-store-unavailable-2026-11-11/index.html` (владелец 11.11: «Делать оба варианта», затем «Да, делай»)

## Outcome

Когда магазин на устройстве ответил «недоступен», окно Plus больше не тупик. Вместо двух кнопок-тарифов с примерной
ценой человек видит выход: на Android — «Оплатить через Telegram» (открывает @PhrasemanPremiumBot) и «У меня есть
код»; на iPhone — «Написать в поддержку» и «У меня есть код». Успех: в журнале `[PAYWALL-STOREOFF]` есть нажатия;
доля таких окон, закончившихся активацией кода, больше нуля.

## Scope

In scope:
- новый `components/paywall/duo/PaywallDuoStoreOff.tsx` — две кнопки и строка под ними, тексты на 9 языках;
- `components/paywall/PaywallPlusScreen.tsx` — ветка «магазин недоступен» на первом экране, нижняя кнопка покупки скрыта;
- `components/paywall/PaywallPlus.tsx` — необязательный проп `hideFine` у нижней панели (строка про списание в этой ветке не нужна);
- сторож `tests/paywall_store_unavailable_window_2026_11_11.test.ts`.

Out of scope: логика покупки и определения причины (`app/paywall_purchase.ts` не меняется); окно «Не видим твой Plus»;
окно онбординга; новые события аналитики (см. долг).

## Architecture

Ветка включается одним условием: окно «Два пути» и `storeUnavailableReason === 'billing_unavailable'` — причину уже
выясняет хук покупки. Кнопки ничего не покупают: Telegram открывается внешней ссылкой без uid и других данных в адресе,
код — существующим `openPromoCodeFromPaywall`, поддержка — существующим маршрутом `/support_report`. Кнопка кода видна
только при включённых промокодах (`getPaywallControlVisibility().promoVisible`).

Платформа: Telegram — только Android. Google с 02.08.2022 не требует своего биллинга для платежей пользователей из
России; у Apple упоминание стороннего способа оплаты в приложении вне США — нарушение 3.1.1, поэтому на iPhone бота нет.

## Security and privacy

В ссылке на бота нет идентификаторов пользователя. Новых данных приложение не собирает. Оплата в боте идёт вне
приложения — стоит проверить, что политика конфиденциальности упоминает оплату через Telegram (пометка владельцу).

## Technical debt

- Accept temporarily: нажатия пишутся только в журнал `[PAYWALL-STOREOFF]`, события аналитики нет — новое событие
  требует правок каталога событий, серверного отчёта и их сторожей. Владелец — эта сессия; exit — отдельная правка
  «событие paywall_store_off_action» после проверки окна на устройстве.
- Contain: Android без сервисов Google за пределами России тоже увидит кнопку Telegram; правило Google про Россию
  на них не распространяется. Риск ограничен тем, что у таких устройств нет Play-биллинга вовсе.

## Verification

`npm run test:one -- tests/paywall_store_unavailable_window_2026_11_11.test.ts` плюс существующие тесты окна Plus,
которые читают `PaywallPlusScreen.tsx` и `PaywallPlus.tsx`. На устройстве: dev-состояние окна с причиной
`billing_unavailable`, склейка «макет | эмулятор».

## Rollback

`git revert` коммита: окно вернётся к кнопкам-тарифам и строке «Магазин недоступен на этом устройстве».
