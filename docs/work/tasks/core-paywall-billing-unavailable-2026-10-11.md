# Task packet: цены в окне Plus — «магазин недоступен» без 17 с ожидания, предпросмотр цен в dev

Governance-ID: TG-1142EAB573EF
Status: In progress
Owner: сессия «1 · Ядро» (владелец: «РАЗБЕРИСЬ ПОЧЕМУ ЦЕНЫ НЕ ПОКАЗЫВАЮТСЯ В ПРИЛОЖЕНИИ — ИСПРАВЬ ЭТО»; диагноз координатора по логу)

## Outcome
Диагноз (лог [PAYWALL] координатора): на эмуляторе без Google Play (образ google_apis) RevenueCat getOfferings падает
100% попыток с PurchaseNotAllowedError / BILLING_UNAVAILABLE «Billing service unavailable on device». Ключ goog_ валиден,
на телефоне с Play цены приходят (€39,99 / €7,99). Релизной поломки нет, но:
1. Ошибка «магазин недоступен» больше не повторяется 1/3/8 с (окно ждало до 17–22 с) — сразу состояние ошибки
   с причиной `billing_unavailable`; повторы остаются только для тайм-аутов и сети.
2. Хук отдаёт причину (`storeUnavailableReason: 'billing_unavailable' | 'network' | null`), чтобы окно различало
   «Магазин недоступен на этом устройстве» и «Проверь интернет».
3. Только в dev-сборке (`__DEV__ && !IS_STORE_RELEASE`) и только при `billing_unavailable` — предпросмотр цен
   (`previewPrices: true`, те же DEV_PREVIEW_* цены, что у DEV_IAP_BYPASS); кнопка покупки магазин не зовёт, а
   показывает «предпросмотр цен». В стор-сборке ветки нет (сторож).
4. Кэш последних реальных цен уже показывается, пока магазин не ответил (resilientCheckout) — проверено, без изменений.
5. Образ эмулятора с Play Store и тестовый аккаунт — Эмулятор/владелец (пароли не вводим).

## Scope
In: новый `app/paywall_billing_unavailable.ts` (чистый классификатор), `app/paywall_purchase.ts` (ветка в загрузке цен,
предпросмотр, отказ магазину на тапе в предпросмотре), тест-сторож. Out: вёрстка текстов ошибки (Дизайн), RevenueCat-ключи.

## Architecture
Классификатор смотрит код RevenueCat (PURCHASE_NOT_ALLOWED), readableErrorCode и текст (BILLING_UNAVAILABLE /
«Billing service unavailable»). Решение «предпросмотр» — чистая функция от (isDev, isStoreRelease, причина).

## Security and privacy
Новых данных нет. Предпросмотр не выдаёт доступ и не идёт в магазин.

## Technical debt
- Pay now: окно ждало 17–22 с на заведомо недоступном магазине и показывало пустые плитки.
- Contain: тексты «Магазин недоступен» / «Проверь интернет» — Дизайн по отдаваемой причине.

## Verification
Тест классификатора и решения предпросмотра (включая «в стор-сборке — никогда»); тесты пейвола; точечный typecheck.

## Rollback
Отдельный коммит; `git revert`.
