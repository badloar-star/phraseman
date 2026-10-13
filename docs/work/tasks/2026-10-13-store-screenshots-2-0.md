# Task packet: скриншоты магазинов 2.0 — кадры, подписи на 9 языках, рамки (запас R1 №6)

Governance-ID: TG-3A7FB1DF38D3
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: R1_BACKLOG_13_16.md №6

## Outcome

Готовый к съёмке сценарий скриншотов App Store / Google Play для 2.0: 7 кадров (сначала бесплатное, без пейвола), подписи-результаты на ru/uk/en/es/pt-BR/vi/id/tr/pl, страница рамок 1290×2796 и 1080×1920 с проверкой длины подписи и режимом экспорта; спека для Сверки и владельца.

## Scope

In scope: docs/design/v2-app/store-screenshots.html, docs/design/v2-app/store/captions.js, docs/design/v2-app/store/src/*.png (заготовки из образцов), docs/design/v2-app/previews/store-screenshots-*.jpg, docs/phraseman-2.0/STORE_SCREENSHOTS_2_0.md.

Out of scope: код приложения, заливка в магазины, тексты описания (ASO_STORE_LISTING.md), съёмка на эмуляторе (Сверка).

## Architecture

No architecture change: образцы и документация. Данные кадров — один файл captions.js, из него страница и спека.

## Security and privacy

Данных пользователей нет. На кадрах — тестовые данные; заявление «приложение слышит произношение» сверять с privacy policy перед заливкой (чек-лист ASO).

## Technical debt

Contain: заготовки экранов — образцы; заменяются кадрами Сверки в store/shots/<язык>/.

## Verification

Страница открывается без ошибок консоли на 9 языках × 2 магазина; подписи ≤ 3 строк (проверка playwright); превью ru-ios и en-play.

## Rollback

Откат коммита.
