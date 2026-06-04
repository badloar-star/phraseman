# Telegram Phraseman Bot Operations

## Что уже работает

- Бот принимает ник пользователя в Phraseman перед выбором периода.
- Пользователь выбирает месяц или год.
- После успешного события от Telegram бот сообщает, что активация выполняется вручную и может занять несколько часов.
- Запись появляется в админке в разделе `Тестеры`.
- Раздел `Тестеры` скрыт за admin-claim и не показывает в интерфейсе слова про оплату, цены, деньги, звезды или Premium.
- Клик по нику в `Тестеры` открывает родную карточку пользователя из вкладки `Пользователи`.

## Где смотреть заявки

Открой:

```text
https://phraseman-ea0b3.web.app/testers.html
```

Если аккаунт не имеет `admin: true`, страница не покажет данные.

## Что видно в `Тестеры`

- Ник в Phraseman.
- Период: месяц или год.
- Статус ручной обработки.
- Дата записи.
- Технический ID записи.

Данные о сумме и платежных формулировках намеренно не выводятся в интерфейсе этого раздела.

## Как открыть карточку пользователя

1. Открой `Тестеры`.
2. Нажми на ник.
3. Админка откроет `index.html?openUser=<uid>`.
4. Основная вкладка `Пользователи` загрузит users и откроет обычную карточку через `openDetail(uid)`.

## Как проверить, что бот онлайн

Webhook должен быть привязан к Firebase Function:

```text
https://us-central1-phraseman-ea0b3.cloudfunctions.net/telegramPremiumWebhook
```

Если пользователь может открыть бота, ввести ник и получить выбор периода, значит webhook отвечает.

## Что делать после новой заявки

1. Проверить запись в `Тестеры`.
2. Нажать на ник и открыть карточку пользователя.
3. Сверить ник/UID.
4. Вручную активировать нужный период в рабочем процессе Phraseman.
5. Не менять Firestore-запись из клиентской админки: правила запрещают клиентские writes для этой коллекции.

## Безопасность токена

Токен бота не должен храниться в файлах проекта. Он должен жить только в Firebase Secret:

```text
PHRASEMAN_PREMIUM_BOT_TOKEN
```

Если токен был отправлен в чат или попал в чужой доступ, безопасный порядок такой:

1. Перевыпустить токен через BotFather.
2. Обновить Firebase Secret `PHRASEMAN_PREMIUM_BOT_TOKEN`.
3. Перезадеплоить функцию `telegramPremiumWebhook`.
4. Заново установить Telegram webhook на Firebase Function URL.
5. Проверить, что бот отвечает.

## Команды проверки

```powershell
npx jest --runTestsByPath tests/telegram_premium_bot_core.test.ts tests/telegram_testers_admin_contract.test.ts --no-cache
npx tsc -p functions/tsconfig.json
```

## Команда деплоя админки

Обычный способ:

```powershell
firebase deploy --only hosting:admin
```

Если Windows не запускает `firebase` через PATH, используй прямой путь:

```powershell
$firebaseCmd = Join-Path $env:APPDATA 'npm\firebase.cmd'
& $firebaseCmd deploy --only hosting:admin
```
