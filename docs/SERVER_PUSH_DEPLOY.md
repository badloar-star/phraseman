# Серверные push (возврат пропавших юзеров) — деплой и проверка

## Что сделано

Локальные уведомления планировались только при открытии приложения — пропавший
на 3+ дня юзер был недостижим. Теперь сервер сам шлёт push в закрытое приложение.

**Канал:** Expo Push API (тот же, что уже используется в арене). Доставляет через
FCM (Android) / APNs (iOS). Новых нативных зависимостей НЕ добавлено.

**Триггеры (v1):**
- `streak_at_risk` — есть серия ≥ 3 дня, сегодня не заходил (>20ч, но < суток).
- `inactive_return` — не заходил 3–14 дней.

Анти-спам: один и тот же юзер не получает push чаще раза в 2 дня.
Cron: ежедневно в **10:00 UTC**.

## Файлы

| Слой | Файл |
|------|------|
| Клиент: запись токена | `app/push_token_registration.ts` |
| Клиент: вызов при старте | `app/_layout.tsx` (блок `if (notifEnabled === 'true')`) |
| Сервер: логика + отправка | `functions/src/re_engage_push.ts` |
| Сервер: cron | `functions/src/index.ts` → `reEngagePushCron` |
| Тесты | `functions/src/re_engage_push.test.ts` (31 тест) |

Поле токена в Firestore: `users/{stableId}.expoPushToken` (+ `pushTokenLang`,
`pushTokenPlatform`, `pushTokenUpdatedAt`). Firestore rules уже разрешают юзеру
писать своё поле — **менять rules не нужно**.

## Шаги деплоя (делает разработчик — мне недоступны deploy и build)

### 1. Сервер — задеплоить cron

```bash
cd functions
npm run build          # tsc → lib/  (должно пройти без ошибок)
firebase deploy --only functions:reEngagePushCron
```

После деплоя cron появится в Firebase Console → Functions, расписание `0 10 * * *`.

### 2. Клиент — пересобрать приложение

Регистрация токена — это JS-код, но он использует expo-notifications (уже в
проекте). Достаточно обычной сборки:

```bash
eas build --platform android --profile production   # и/или ios
```

Expo Go НЕ подойдёт для проверки push — нужен dev-client или production build.

## Как проверить, что работает

### A. Токен записывается (клиент)
1. Установи свежий build на устройство, выдай разрешение на уведомления.
2. Firebase Console → Firestore → `users/{твой stableId}` →
   должно появиться поле `expoPushToken: ExponentPushToken[...]`.

### B. Push доставляется (быстрый ручной тест, без ожидания cron)
Возьми свой `expoPushToken` из Firestore и отправь тестовый push:

```bash
curl -H "Content-Type: application/json" -X POST https://exp.host/--/api/v2/push/send -d '{
  "to": "ExponentPushToken[ВСТАВЬ_СВОЙ]",
  "title": "🔥 Серия под угрозой!",
  "body": "Один урок сегодня — и цепочка цела.",
  "sound": "default"
}'
```

Закрой приложение полностью → push должен прийти в шторку. Это подтверждает
весь канал доставки (токен + Expo + FCM/APNs).

### C. Cron-логика (на сервере)
Запусти cron вручную из Firebase Console (Functions → reEngagePushCron →
Test / «Run now») или дождись 10:00 UTC. В логах функции будет строка вида:

```
reEngagePushCron {"scanned":1234,"candidates":42,"sent":42,"failedChunks":0}
```

- `scanned` — сколько юзеров просмотрено
- `candidates` — сколько подошло под триггеры
- `sent` — сколько push отправлено
- `failedChunks` — сбои пачек (должно быть 0)

### D. Проверить отбор без реальной отправки
Для отладки порогов можно временно понизить `INACTIVE_MIN_DAYS` в
`re_engage_push.ts`, задеплоить, прогнать, вернуть обратно.

## Безопасность / приватность

- Токен пишет сам юзер в свой документ (rules это уже разрешают, чужой документ
  недоступен).
- При отключении уведомлений / смене аккаунта вызови
  `clearPushTokenForServerPush()` — токен удаляется, сервер перестаёт слать.
- Серверный cron работает через Admin SDK (обходит rules) — это штатно для
  бэкенд-задач.

## Что можно добавить потом (не в этой версии)

- Триггеры «активность друзей» и «обогнали в лиге» (инфраструктура та же —
  добавляется новый `reason` + текст + источник данных).
- Тихие часы по таймзоне юзера (сейчас cron шлёт в 10:00 UTC всем; для точных
  локальных тихих часов нужно хранить таймзону юзера).
- Обработка `DeviceNotRegistered` из ответа Expo — чистка мёртвых токенов
  (сейчас просто считаем `failedChunks`).
