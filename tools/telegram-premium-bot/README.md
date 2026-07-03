# Phraseman Premium Telegram Bot

User-facing Telegram bot for manual Premium purchases through Telegram Stars.

## Flow

1. User opens the bot and presses `Оплатить Premium`.
2. Bot asks for the user's nickname in the Phraseman app.
3. User chooses monthly or yearly Premium.
4. Monthly flow creates a recurring Telegram Stars invoice link with `subscription_period: 2592000`.
5. Yearly flow sends a one-time Telegram Stars invoice.
6. All invoices use `currency: "XTR"` and omit `provider_token`.
7. After `successful_payment`, the bot writes the order to `.codex-tmp/telegram-premium-bot/orders.jsonl`.
8. Bot tells the user that Premium activation is manual and may take several hours.
9. If `adminChatId` is configured, the bot sends the admin a pending activation notice.

## Admin Access

There are two ways to enable admin access.

Recommended:

1. Put a private value into `adminSetupCode`.
2. Start the bot.
3. Send `/admin_setup your-code` to the bot from your Telegram account.
4. Use `/admin`.

Manual:

1. Send `/myid` to the bot from your Telegram account.
2. Put the returned id into `adminChatId`.
3. Restart the bot.

Admin commands:

```text
/myid
/orders
/order <telegram_charge_id>
```

`/orders` shows the latest 10 payments:

- payment date
- Phraseman nickname
- monthly/yearly plan
- Stars amount
- Telegram username/id
- Telegram charge id
- manual activation status

`/order <telegram_charge_id>` shows one payment with full details.

After every successful payment, the admin receives a private report with nickname, plan, Stars amount, Telegram user, charge id, and manual activation status.

## User Commands

```text
/start
/premium
/paysupport
/terms
/privacy
```

`/paysupport` opens payment support instructions. `/terms` and `/privacy` return the public legal links.

## Setup

Create a bot in `@BotFather`, then keep the token local.

PowerShell:

```powershell
New-Item -ItemType Directory -Force .codex-tmp/telegram-premium-bot
Copy-Item tools/telegram-premium-bot/config.example.json .codex-tmp/telegram-premium-bot/config.json
notepad .codex-tmp/telegram-premium-bot/config.json
```

Fill:

- `botToken`: token from `@BotFather`
- `adminChatId`: optional Telegram id from `/myid`; enables `/orders` and payment notifications immediately
- `adminSetupCode`: private one-time setup code for `/admin_setup <code>`
- `monthlyStars`: monthly Premium price in Stars
- `yearlyStars`: yearly Premium price in Stars

You can also use environment variables instead of `botToken`:

```powershell
$env:PHRASEMAN_PREMIUM_BOT_TOKEN = "paste-token-here"
$env:PHRASEMAN_PREMIUM_ADMIN_CHAT_ID = "123456789"
$env:PHRASEMAN_PREMIUM_MONTHLY_STARS = "500"
$env:PHRASEMAN_PREMIUM_YEARLY_STARS = "2500"
npm run telegram:premium
```

## 24/7 Firebase Webhook

For production, use the Firebase Function instead of the local polling process.

Set Firebase secrets:

```powershell
firebase functions:secrets:set PHRASEMAN_PREMIUM_BOT_TOKEN
firebase functions:secrets:set PHRASEMAN_PREMIUM_ADMIN_SETUP_CODE
firebase functions:secrets:set PHRASEMAN_PREMIUM_WEBHOOK_SECRET
```

Deploy only the Premium bot webhook:

```powershell
cd functions
npm run deploy:telegram-premium
cd ..
```

Then connect Telegram to the deployed HTTPS URL:

```powershell
$env:PHRASEMAN_PREMIUM_BOT_TOKEN = "paste-token-here"
$env:PHRASEMAN_PREMIUM_WEBHOOK_SECRET = "same-secret-used-in-firebase"
npm run telegram:premium:set-webhook "https://us-central1-YOUR_PROJECT.cloudfunctions.net/telegramPremiumWebhook"
```

After that, the bot works through Firebase 24/7. The local `npm run telegram:premium` process is not needed.

Orders are saved in Firestore:

```text
telegram_premium_orders/{telegram_payment_charge_id}
```

Admin ids are saved in Firestore:

```text
telegram_premium_bot/config.adminUserIds
```

## Orders

Paid orders are appended as JSON lines:

```text
.codex-tmp/telegram-premium-bot/orders.jsonl
```

Each order has:

- `appNickname`
- `plan`
- `planDuration`
- `telegramUserId`
- `telegramUsername`
- `totalAmount`
- `telegramPaymentChargeId`
- `status: "paid_pending_manual_activation"`

Use `telegramPaymentChargeId` for audit/refund tracking.

## Security

Do not commit real bot tokens. If a token was pasted into a shared place, rotate it in `@BotFather`.
