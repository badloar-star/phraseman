# Agent Office: безопасное подключение Telegram approvals

Этот runbook относится только к входящему webhook `agentOfficeTelegramWebhook`.
Он переиспользует существующий бот и secret `ADMIN_ALERT_BOT_TOKEN`, но **не**
доверяет редактируемому из браузера `admin_config/alerts.chatId`. Полномочия
approval привязаны к отдельному server secret, конкретному владельцу, Telegram
user/chat, одноразовому nonce, версии и хешу рекомендации и ревизии kill switch.

Функция выключена по умолчанию. До выполнения всех пунктов ниже она должна
возвращать `404` и не читать Firestore/не обращаться к Telegram Bot API.

## Перед включением

1. В BotFather используйте того же бота, токен которого уже находится в
   `ADMIN_ALERT_BOT_TOKEN`. Не создавайте копию токена в исходниках, `.env`,
   документации, истории shell или логах.
2. Получите и перепроверьте числовые Telegram ID владельца:
   `ownerTelegramUserId` и ID **личного** чата `ownerTelegramChatId`. Групповые
   и channel callbacks обработчик не принимает.
3. Сопоставьте владельца с реальным Firebase UID, у которого custom claims
   `admin: true` и `adminRole: "owner"`. Запишите его как `ownerUid`.
4. Сгенерируйте криптографически случайный webhook secret длиной не менее
   32 символов из `A-Z`, `a-z`, `0-9`, `_`, `-`. Не используйте bot token или
   approval nonce в качестве webhook secret.
5. Интерактивно создайте/обновите Secret Manager value:

   ```powershell
   firebase functions:secrets:set AGENT_OFFICE_TELEGRAM_CONFIG
   ```

   Значение — одна JSON-структура с точными ключами (подставляется только в
   защищённом терминале, не копируется в issue/чат/commit):

   ```json
   {
     "webhookSecret": "<secret>",
     "ownerUid": "<firebase-owner-uid>",
     "ownerTelegramUserId": "<telegram-user-id>",
     "ownerTelegramChatId": "<private-chat-id>"
   }
   ```

6. Убедитесь, что `agent_office_control/global` существует, его schema валидна,
   `killSwitchEnabled` имеет ожидаемое значение, а номер `revision` известен
   сервису, который выпускает approval-токены.
7. Publisher рекомендации должен перед показом кнопок атомарно создать отдельный
   документ `agent_telegram_tokens/{sha256(nonce)}` для каждой разрешённой
   операции. Сырой nonce хранится только в callback data (`ao1:a:<nonce>` или
   `ao1:r:<nonce>`); документ строго связывает его с owner/chat/user, case и
   recommendation revision/hash, control revision и TTL не более 10 минут.
   Клиентам Firestore коллекция закрыта rules. В этот W3 publisher не входит.

## Проверка и развёртывание после отдельного security review

Из `functions/`:

```powershell
npm test -- --runInBand src/agent_office/telegram_approvals.test.ts src/agent_office/telegram_transport.test.ts src/agent_office/telegram_webhook_contract.test.ts src/agent_office/ledger.test.ts src/agent_office/contracts.test.ts src/agent_office/firestore_rules.test.ts
npm run build
```

После зелёных gates и отдельного critical review задайте для production Functions
parameter `AGENT_OFFICE_TELEGRAM_ENABLED=true` в защищённой project-specific
Functions environment-конфигурации. Затем единственная разрешённая команда
deploy для этой части:

```powershell
firebase deploy --only functions:agentOfficeTelegramWebhook
```

Deploy не регистрирует webhook автоматически. После получения HTTPS URL вызовите
Bot API `setWebhook` из защищённой среды: URL — адрес функции, `secret_token` —
тот же `webhookSecret`, `allowed_updates` — только `["callback_query"]`. Не
передавайте bot token в аргументах командной строки и не печатайте request URL,
headers или body. Проверьте `getWebhookInfo` тем же защищённым способом.

## Smoke-check и rollback

- Неверный/missing secret должен давать `401` без Firestore и Bot API вызовов.
- Callback другого user/chat должен давать нейтральный `200 ignored` без чтения
  токена и без исходящего ответа.
- Валидный callback должен создать ровно один immutable approval/audit, изменить
  case и употребить nonce в одной transaction; повтор того же Telegram update
  должен быть idempotent.
- Stale/revised/expired/revoked token или включённый kill switch не должны иметь
  side effects и не должны вызывать Telegram API.
- Ответ callback содержит только фиксированный текст без UID, chat ID, case,
  recommendation, nonce или upstream error details.

Для аварийной остановки сначала включите существующий Agent Office kill switch.
Для полного отключения установите `AGENT_OFFICE_TELEGRAM_ENABLED=false` и
удалите webhook через Bot API из защищённой среды. Ротация bot token затрагивает
и существующие admin alerts; ротация `AGENT_OFFICE_TELEGRAM_CONFIG` — только
approval webhook.
