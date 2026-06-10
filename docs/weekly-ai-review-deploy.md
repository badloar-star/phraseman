# Weekly AI Review — deploy & verification checklist

Feature: раз в неделю (premium) / раз в 2 недели (free) пользователь в разделе
«Аналитика ошибок» (Моя практика) получает от ИИ живой разбор своих ошибок,
того что даётся хорошо, и рекомендации — только из уже существующих,
доступных по гейту персональных микро-уроков.

Branch: `feat/weekly-ai-review` (worktree `C:/appsprojects/phraseman-weekly-ai`).
НЕ смержено в master. Родитель — content/mitap-week1-6 (HEAD a1583324).

## Что добавлено

### Cloud Function (Node)
- `functions/src/weekly_review.ts` — `weeklyReviewGenerate` (onCall).
  - Клон паттерна `premium_dialog.ts`: `defineSecret(OPENAI_API_KEY)`,
    `resolveStableUidForAuth(db, authUid)` (uid из auth, НЕ из body), лимиты
    ДО платного вызова.
  - Оконная квота: premium = 7 дней, free = 14 дней (`weekly_review_quotas`).
  - Rate-limit: 10/час (`weekly_review_rate_limits`).
  - Модель `gpt-4o-mini`, `response_format: json_object`.
  - Два рубежа защиты гейта: клиент шлёт уже отфильтрованные рекомендации;
    сервер (`parseAndGuardResult`) ре-валидирует их против allowlist брифинга —
    ИИ не может вернуть неавторизованный урок даже при галлюцинации.
  - Биллинг-лог: `weekly_review_billing`.
- Зарегистрирована в `functions/src/index.ts` (require + exports).

### App (React Native)
- `app/weekly_review_briefing.ts` — чистый сборщик брифинга (НЕ тянет Firebase;
  effort-числа приходят аргументом).
- `app/weekly_review_client.ts` — кэш (AsyncStorage), локальный гейт частоты,
  вызов CF, маппинг ошибок. Поставляет effort (streak/XP/время) в builder.
- `app/weekly_review_category_labels.ts` — подписи частей речи (data layer).
- `app/personal_practice_lesson_router.ts` — вынесено из экрана:
  `chooseDiagnosisForCategory` + `chooseAvailableDiagnosisForCategory` (gate).
- `app/WeeklyReviewCard.tsx` — UI-карточка (premium полная / free усечённая+тизер).
- `app/phrase_analytics_screen.tsx` — вставлена карточка (free над пейволом,
  premium над summary); переключён на импорт router'а.
- `app/target_storage_keys.ts` — добавлен `weeklyReviewStorageKey`.

## Тесты (все зелёные)
- `tests/weekly_review_briefing.test.ts` — 5 тестов, включая security-инвариант
  «для French рекомендаций ноль».
- `functions/src/weekly_review.test.ts` — 8 тестов: allowlist-guard отбрасывает
  выдуманные id, берёт label из брифинга, sanitize бьёт враждебный вход.

## Деплой (point-to-point — НЕ в deploy:safe, как premiumDialogSend)

1. Убедиться, что секрет задан:
   `firebase functions:secrets:access OPENAI_API_KEY`
   (тот же секрет, что у premium_dialog — отдельно задавать не нужно).
2. Собрать и задеплоить ТОЛЬКО эту функцию:
   ```
   cd functions
   npm run build
   firebase deploy --only functions:weeklyReviewGenerate
   ```
3. App Check: функция уважает `ENFORCE_APP_CHECK` (env). На проде — как у
   остальных callable.

## Ручная проверка после деплоя (эмулятор / устройство)
- Англ. (en) премиум, накопить ≥5 ошибок → открыть Аналитику → карточка
  «Разбор недели» с текстом + кликабельные уроки → тап ведёт в /problem_coach.
- Free на en → усечённый разбор (1 абзац) + тизер «Полный разбор в Premium».
- French (fr) → карточки нет (source-gate), аналитика как раньше.
- Повторное открытие до истечения окна → тот же кэш, без нового вызова CF.

## Открытые TODO (унаследованы от эталона)
- `isPremium` приходит с клиента (как в premium_dialog). Phase 1: подтверждать
  premium на сервере через RevenueCat shard.
