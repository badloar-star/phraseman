# PM-231 — аудит платных AI-запросов

Дата: 2026-09-30. Read-only аудит (Sonnet), ключевые места перепроверены выборочно.
Провайдер один — OpenAI через голый `fetch`; ключи только `defineSecret` на сервере.

## Вердикты

- **A1 (idempotency/cache/timeout/rate limit/max output) — PARTIAL.** Лимиты и квоты есть у
  диалогов (60/ч, Free 30/мес D111, Plus 300/сутки D123), explain*, mistake_explain; кэш/идемпотентность
  у explain*, mistake_explain, translate, tournament_audio, Dialogue V2 (turnId/claim).
- **A2 (клиенты не передают секреты) — MET.** В `app/ components/ modules/ hooks/` нет `sk-…`,
  `api.openai.com`, AI-ключей; `Authorization: Bearer` только с Firebase ID token
  (`app/ai_dialog_stream_client.ts`, `app/learning_v2_completion_callable_fetch.ts`);
  `EXPO_PUBLIC_*` в eas.json — булевы флаги.
- **A3 (расходы видны по operation) — PARTIAL.** Billing-коллекции + `openAiBudgetDashboard`
  есть, но Dialogue V2 (freeform/text/complete), mistake_hub_advice и часть админ-функций не пишут usage.

## Дыры по денежному риску (к исправлению)

1. `mistake_hub_advice.ts` — `day/lang/studyTarget` берутся из тела запроса (:92-105, кэш :167):
   любой вошедший обходит «раз в день», нет лимита/rate-limit/billing. Фикс: день с сервера,
   free-кап/rate-limit до вызова, billing-запись.
2. Нет fetch-тайм-аута на пользовательских платных вызовах: `premium_dialog.ts:1265, :1757`,
   `premium_dialog_stream.ts:463` (+ upstream не отменяется при обрыве клиента),
   `premium_dialog_review.ts:732`, `mistake_explain.ts:496`. Фикс: `AbortSignal.timeout(...)`,
   для стрима `req.on('close', abort)`.
3. `premium_dialog_review.ts:691` — Free получает текстовый разбор с лимитом только 60/ч
   (до 1440/сутки × 900 токенов). Фикс: суточный free-кап 3–5.
4. `video_phrases.ts:460` (админ) — нет `max_tokens` и тайм-аута, вход до 500 000 знаков.
5. `admin_asset_studio.ts:166` — нет тайм-аута; `admin_director_digest_audio.ts` — без кэша и капа.
6. Plus-путь `mistake_explain.ts` — без суточного потолка (40/ч × gpt-4.1 × до 3 попыток).
7. Dialogue V2 (`dialogue_v2_freeform_openai_transport.ts`, `dialogue_v2_turn_production_callable.ts`,
   `dialogue_v2_session_complete_callable.ts`) — usage не пишется в billing.
8. `premium_dialog_review.ts:796` — `.catch(()=>{})` молча теряет billing-запись.
9. Админ-функции без usage: admin_translate, digests, report_replies, user_ideas, feedback_summary.

Не задеплоены / мертвы: MAX (`functions-max`, `max_*`), `weeklyReviewGenerate`, `statsInsightsGenerate`.
Все правки серверные — деплой после релиза (D91).
