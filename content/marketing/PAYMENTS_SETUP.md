# PAYMENTS_SETUP — подключение оплаты и аналитики воронки /start/ (пошагово)

> Для владельца. Код уже написан и задеплоится командами ниже. Осталось завести
> аккаунты сервисов, взять 4 ключа, вписать 2 публичных ID — и воронка принимает деньги.
> Порядок именно такой: сначала ключи → потом деплой (деплой функций спросит секреты).

---

## Что уже готово в коде

- Квиз+пейвол: `knowly-www/start/` (страница https://knowlyapps.com/start/ после деплоя хостинга).
- Функции оплаты: `functions/src/web_checkout.ts` → `webCheckoutCreate`, `stripeWebhook`,
  `paypalOrderCreate`, `paypalOrderCapture` (+ экспорт в `functions/src/index.ts`).
- Заказы: Firestore `web_premium_orders`. После оплаты статус `paid_pending_manual_activation`
  и **уведомление в Telegram всем админам премиум-бота** (тем же, кто получает Stars-заявки).
  Активация — вручную, как для Telegram-заявок.

---

## Шаг 1. Stripe — оплата картами (~20 минут)

1. **Регистрация**: https://dashboard.stripe.com/register
   Тип аккаунта — Individual/Company; страна юрлица — Ireland (Maksym Babiev).
   Активировать приём платежей: заполнить бизнес-профиль и счёт для выплат
   (Dashboard → Settings → Business settings → укажет сам, чего не хватает).
2. **Секретный ключ**: https://dashboard.stripe.com/apikeys
   → «Secret key» → Reveal → скопировать `sk_live_...`
   (Для теста: переключатель **Test mode** справа сверху → там ключ `sk_test_...`.)
3. **Вебхук**: https://dashboard.stripe.com/webhooks → **Add endpoint**
   - Endpoint URL: `https://us-central1-phraseman-ea0b3.cloudfunctions.net/stripeWebhook`
   - Events: выбрать ровно два — `checkout.session.completed` и
     `checkout.session.async_payment_succeeded`
   - Создать → открыть эндпоинт → **Signing secret** → Reveal → скопировать `whsec_...`
4. Тестовая карта (в Test mode): `4242 4242 4242 4242`, любые дата/CVC.

Итог шага: два значения — `sk_live_...` (STRIPE_SECRET_KEY) и `whsec_...` (STRIPE_WEBHOOK_SECRET).

## Шаг 2. PayPal (~15 минут)

1. **Бизнес-аккаунт**: https://www.paypal.com/bizsignup/ (если ещё нет).
2. **Приложение API**: https://developer.paypal.com/dashboard/applications/live
   (вход тем же PayPal-аккаунтом) → **Create App** → имя «Phraseman Web» →
   скопировать **Client ID** и **Secret**.
3. **Client ID вписать в сайт** (он публичный): файл
   `knowly-www/assets/site-config.js` → поле `paypalClientId: ''` → вставить ID.
   Пока поле пустое — кнопки PayPal на пейволе просто скрыты (карта работает независимо).
4. Для теста: то же самое на вкладке **Sandbox**
   (https://developer.paypal.com/dashboard/applications/sandbox) + в Firestore
   `web_checkout/config` поставить `paypalLive: false` (см. шаг 5). Не забыть вернуть.

Итог шага: `Client ID` (PAYPAL_CLIENT_ID, он же в site-config.js) и `Secret` (PAYPAL_CLIENT_SECRET).

## Шаг 3. Секреты в Firebase (5 минут)

В терминале (каждая команда попросит вставить значение):

```powershell
cd C:\appsprojects\phraseman
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set PAYPAL_CLIENT_ID
firebase functions:secrets:set PAYPAL_CLIENT_SECRET
```

Проверить: `firebase functions:secrets:access STRIPE_SECRET_KEY`

## Шаг 4. Деплой (5 минут)

```powershell
cd C:\appsprojects\phraseman
firebase deploy --only functions:webCheckoutCreate,functions:stripeWebhook,functions:paypalOrderCreate,functions:paypalOrderCapture,functions:siteStatsTrack
firebase deploy --only hosting:knowlywww
```

После этого https://knowlyapps.com/start/ живая и принимает оплату.

## Шаг 5. Цены (по желанию, 5 минут)

Дефолт: месяц $9.99 / год $49.99 / навсегда $99.99. Менять В ДВУХ местах:

1. **Сервер (что реально спишется)**: Firestore-консоль
   https://console.firebase.google.com/project/phraseman-ea0b3/firestore/data/~2Fweb_checkout~2Fconfig
   — создать документ `web_checkout/config` (если нет):
   ```
   priceCents: { monthly: 999, yearly: 4999, lifetime: 9999 }   (map, числа в центах)
   currency: "usd"
   paypalLive: true
   ```
2. **Витрина (что видно на пейволе)**: `knowly-www/assets/site-config.js` → `webPrices`
   → передеплоить хостинг.

## Шаг 6. Meta Pixel — ретаргетинг (10 минут, можно позже)

1. https://business.facebook.com/events_manager2 → **Connect data sources → Web →
   Meta Pixel** → создать → скопировать **Pixel ID** (число).
2. Вписать в `knowly-www/assets/site-config.js` → `metaPixelId: ''` → передеплоить хостинг.
3. Пиксель сам начнёт слать события: PageView, ViewContent (старт квиза),
   CompleteRegistration (квиз пройден), InitiateCheckout (клик оплаты), Purchase (страница «спасибо»).
4. Реклама потом: https://adsmanager.facebook.com/ → аудитория «взаимодействовали
   с аккаунтом 90 дней» → кампания Conversions → цель Purchase → на /start/.

## Шаг 7. Проверка перед запуском трафика (10 минут)

1. В Stripe включить **Test mode**, временно поставить тестовые `sk_test_`/`whsec_` секреты
   (или проверить сразу на живой карте с минимальной ценой — и сделать refund).
2. Пройти квиз на https://knowlyapps.com/start/ → оплатить.
3. Убедиться: попал на /start/thanks/ ✅; в Firestore появился `web_premium_orders/...`
   со статусом `paid_pending_manual_activation` ✅; в Telegram пришло «💳 Новая ВЕБ-оплата» ✅.
4. Активировать премиум вручную (админка, как для Telegram-заявок) и вернуть live-ключи.

## Где что смотреть потом

| Что | Где |
|---|---|
| Заказы и их статусы | Firestore → `web_premium_orders` (внутри: email, ник, тариф, UTM ролика) |
| Ошибки оплат | Firestore → `web_checkout_dead_letter`; логи: https://console.firebase.google.com/project/phraseman-ea0b3/functions/logs |
| Воронка (просмотры→квиз→пейвол→оплата) | Firestore → `site_stats` (поля quiz_starts, quiz_completes, paywall_views, checkout_clicks, purchase_thanks) |
| Платежи/возвраты Stripe | https://dashboard.stripe.com/payments |
| Платежи/возвраты PayPal | https://www.paypal.com/activities/ |

Возврат за 7 дней (обещание на пейволе): Stripe → платёж → Refund; PayPal → транзакция → Refund.
