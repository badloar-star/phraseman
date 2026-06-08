---
phase: "ai-dialogue-0"
title: "ИИ-диалоги — Фаза 0: проверка спроса"
created: 2026-06-08
status: ready
autonomous: false
worktree: required  # НЕ master
spec_refs:
  - docs/reports/ai_dialogue_phase0_plan_2026-06-08.md
  - docs/reports/ai_dialogue_system_prompts_2026-06-08.md
  - docs/reports/ai_dialogue_premium_dialog.draft.ts
  - docs/reports/ai_dialogue_ui_mockup_2026-06-08.html
goal: >
  За ~4 дня минимальным кодом проверить гипотезу: юзер 50+ нажмёт карточку
  «Разговор с Филом» и пройдёт сценарный диалог «закажи кофе» до конца,
  если не показывать пустое поле ввода (роль + цель + кнопки-подсказки).
acceptance:
  - AC1 CTR карточки (card_tapped/card_shown) ≥ 15%
  - AC2 completion первого диалога (completed/started) ≥ 50%  # главный тест 50+
  - AC3 доля suggested_tapped среди первых 2 реплик ≥ 40%
  - AC4 crash-free сессий с диалогом ≥ 99%
  - AC5 средний cost/диалог из billing-лога ≤ $0.01
  - AC6 ненулевая конверсия limit_hit → paywall_shown → purchase
antiscope:
  - Никаких recall_drill / free_talk / tutor режимов
  - Никакого голоса (STT/TTS-диалога); только кнопка озвучки реплик
  - Никакого prompt caching / sliding-window
  - НЕ трогать review.tsx, energy-систему, XP на каждое сообщение
  - НЕ добавлять CF в deploy:safe whitelist
---

# Фаза 0 — Исполняемый план

> Эталоны кода (реальные, проверены): CF — `functions/src/pronunciation_scoring.ts`
> (регистрация в `functions/src/index.ts:99`); сессия — `app/trainer_phrases_session.tsx`;
> репорт — `app/trainer_session_report.tsx`; гейтинг — `app/trainer_session.ts`;
> флаги — `app/remote_flags.ts`; SRS — `app/trainer_store.ts:611`; аналитика —
> `app/analytics.ts:98` (`trackEvent`); озвучка — `hooks/use-audio.ts`;
> httpsCallable — образец `app/cloud_sync.ts`.
> ВСЕ юзер-тексты по `PHRASEMAN_BIBLE.md` (gain-framing, «ты», ≤10 слов, глагол в кнопке).

---

## Wave 1 — Бэкенд (CF), независим от клиента

### Task 1.1 — Cloud Function `premiumDialogSend` (урезанная, scenario-only)

<read_first>
- functions/src/pronunciation_scoring.ts   # ЭТАЛОН: onCall, resolveStableUidForAuth, process.env.OPENAI_API_KEY, rate-limit транзакцией
- functions/src/callable_options.ts          # ENFORCE_APP_CHECK, HOT_CALLABLE_OPTIONS
- functions/src/index.ts                      # как регистрируется экспорт функции (стр. ~65, ~99)
- functions/src/auth_identity.ts              # resolveStableUidForAuth
- docs/reports/ai_dialogue_premium_dialog.draft.ts  # черновик целевой функции
- docs/reports/ai_dialogue_system_prompts_2026-06-08.md  # тексты scenario-промпта
</read_first>

**Действия:**
- Создать `functions/src/premium_dialog.ts` по эталону `pronunciation_scoring.ts`.
- Только режим `scenario`. System-промпт (GLOBAL + SCENARIO_BLOCK) — hardcoded в файле, НЕ на клиенте.
- `request.auth.uid` — единственная identity; `resolveStableUidForAuth(db, authUid)`. НЕ принимать stableId из body.
- `enforceRateLimit` (окно 1ч / MAX 60) + `enforceDailyQuota` (free=1, premium=100) — ОБА ДО fetch.
- Модель `gpt-4o-mini`, `max_tokens:200`, `temperature:0.8`. Ключ `process.env.OPENAI_API_KEY` (как pronunciation).
- Billing-лог в коллекцию `premium_dialog_billing` (promptTokens/completionTokens/total/mode/model).
- Ответ: `{ ok, assistantMessage, remainingQuota, model }` — ключ НИКОГДА не возвращать.
- Зарегистрировать экспорт в `functions/src/index.ts` (по образцу `scorePronunciationAttempt`).

<acceptance_criteria>
- `grep -n "request.auth.uid" functions/src/premium_dialog.ts` → присутствует, stableId из body НЕ читается
- `grep -n "process.env.OPENAI_API_KEY" functions/src/premium_dialog.ts` → присутствует (не defineSecret)
- `grep -n "premiumDialogSend" functions/src/index.ts` → экспорт зарегистрирован
- `grep -n "premium_dialog_billing" functions/src/premium_dialog.ts` → billing-лог пишется
- enforceRateLimit И enforceDailyQuota вызываются ДО вызова fetch(OPENAI_CHAT_URL) (проверить порядок строк)
- `cd functions && npm run build` (или tsc) — компилируется без ошибок
- Запуск в Firebase emulator: вызов с валидным auth возвращает assistantMessage; второй вызов free-юзера в тот же день → HttpsError 'dialog_free_limit'
</acceptance_criteria>

**Деплой:** точечно `firebase deploy --only functions:premiumDialogSend`. НЕ трогать `deploy:safe` whitelist. `ENFORCE_APP_CHECK=true` для прода.

---

## Wave 2 — Клиент (зависит от Wave 1: контракт функции)

### Task 2.1 — Гейтинг лимита `dialogs_limit_session.ts`

<read_first>
- app/trainer_session.ts        # ЭТАЛОН: DAILY_FREE_SESSION_KEY, hasUsedFreeSessionToday/markFreeSessionUsed/getFreeSessionsLeftToday, AsyncStorage, getTodayKey UTC
- app/remote_flags.ts           # getFreeTrainerSessionsPerDay, djb2, numFromEnv — образец для нового флага
</read_first>

**Действия:**
- `app/dialogs_limit_session.ts`: `DAILY_FREE_DIALOG_KEY='dialogs_free_session_v1'`, функции
  `hasUsedFreeDialogToday()`, `markFreeDialogUsed()`, `getFreeDialogsLeftToday()` — копия паттерна trainer (UTC-ключ дня).
- `app/remote_flags.ts`: добавить `free_dialogs_per_day` (дефолт 1), `EXPO_PUBLIC_FREE_DIALOGS`,
  getter `getFreeDialogsPerDay()`; флаг `ai_dialog_enabled` (дефолт false).

<acceptance_criteria>
- `grep -n "dialogs_free_session_v1" app/dialogs_limit_session.ts` → ключ задан
- Экспортируются hasUsedFreeDialogToday / markFreeDialogUsed / getFreeDialogsLeftToday
- `grep -n "free_dialogs_per_day\|ai_dialog_enabled" app/remote_flags.ts` → флаги добавлены
- getTodayKey/UTC используется так же, как в trainer_session (не локальное время)
- Новый тест `tests/dialogs_limit_session.test.ts`: первый markFreeDialogUsed → getFreeDialogsLeftToday=0; смена дня → снова 1
</acceptance_criteria>

### Task 2.2 — Экран диалога `ai_dialog_session.tsx`

<read_first>
- app/trainer_phrases_session.tsx     # ЭТАЛОН: state-машина сессии, layout, навигация expo-router
- app/trainer_session_report.tsx       # ЭТАЛОН финального экрана
- app/cloud_sync.ts                     # образец httpsCallable вызова к CF
- hooks/use-audio.ts                    # озвучка реплик (expo-speech)
- contexts/ (ThemeContext)              # крупный шрифт fontSize
- app/dialogs_limit_session.ts          # гейт из Task 2.1
- docs/reports/ai_dialogue_ui_mockup_2026-06-08.html  # точный UI: пузыри, кнопки 🔊/🌐, suggested-replies, recast-строка
</read_first>

**Действия:**
- `app/ai_dialog_session.tsx`: state `messages[]`, вызов `httpsCallable('premiumDialogSend')`.
- UI ровно из макета: крупный шрифт (ThemeContext), пузыри ai/me, кнопка 🔊 (useAudio), кнопка 🌐 перевод,
  recast-строка под репликой ИИ, **2–3 hardcode suggested-reply** под сценарий кофе.
- Перевод реплики: для Фазы 0 — hardcode RU-переводы фиксированных стартовых реплик ИЛИ второй дешёвый вызов (выбрать дешевле).
- При старте: если не premium → `getFreeDialogsLeftToday()`; если 0 → `showPremiumModal('dialog_limit')`, выход. После завершения → `markFreeDialogUsed()`.
- Финальный мини-репорт (статистика реплик/минут) — опционально, можно заглушку.

<acceptance_criteria>
- `grep -n "premiumDialogSend" app/ai_dialog_session.tsx` → вызов функции есть
- `grep -n "getFreeDialogsLeftToday\|markFreeDialogUsed" app/ai_dialog_session.tsx` → гейт подключён
- suggested-reply кнопки рендерятся (≥2), тап вставляет/шлёт текст
- кнопка озвучки вызывает useAudio/expo-speech
- Запуск приложения: первый диалог проходит end-to-end, второй (free) → premium_modal('dialog_limit')
</acceptance_criteria>

### Task 2.3 — Контекст пейвола `'dialog_limit'`

<read_first>
- app/premium_modal.tsx     # прод-пейвол; контексты 'trainer_limit','no_energy' — образец
- PHRASEMAN_BIBLE.md         # gain-framing копий
</read_first>

**Действия:** добавить context-тип `'dialog_limit'` рядом с `'trainer_limit'`; копия по Библии (gain, «ты», ≤10 слов).

<acceptance_criteria>
- `grep -n "dialog_limit" app/premium_modal.tsx` → контекст добавлен
- Копия не содержит «вы», не loss-framing, кнопка с глаголом
</acceptance_criteria>

### Task 2.4 — Карточка входа на Home + сценарий «кофе»

<read_first>
- app/(tabs)/home.tsx        # ~стр.2838 рядом с trainer/PersonalPlanCard — куда вставить карточку
- app/remote_flags.ts         # ai_dialog_enabled
- docs/reports/ai_dialogue_ui_mockup_2026-06-08.html  # вид карточки (экран 1)
</read_first>

**Действия:**
- Карточка «Разговор с Филом» под `if (studyTarget && getFlag('ai_dialog_enabled'))` → роут на `ai_dialog_session?mode=scenario&scenarioId=coffee`.
- Каталог одного сценария inline или `app/ai_dialog_scenarios.ts` (id `coffee`: role/setting/goalRu/goalEn, CEFR A2).

<acceptance_criteria>
- `grep -n "ai_dialog\|Разговор с Филом" app/(tabs)/home.tsx` → карточка есть
- Карточка скрыта при `ai_dialog_enabled=false` (когортный rollout)
- Тап ведёт на ai_dialog_session с params mode=scenario
</acceptance_criteria>

---

## Wave 3 — Аналитика (вплести в Wave 2, выделено для верификации)

### Task 3.1 — События воронки

<read_first>
- app/analytics.ts          # trackEvent (стр.98); паттерн событий
- app/posthog_client.ts      # PostHog (если ключ есть)
</read_first>

**Действия — события:** `ai_dialog_card_shown`, `ai_dialog_card_tapped`, `ai_dialog_started`,
`ai_dialog_message_sent`(№ реплики), `ai_dialog_suggested_tapped` vs typed, `ai_dialog_completed`,
`ai_dialog_abandoned`(№), `ai_dialog_tts_used`, `ai_dialog_translation_used`, `ai_dialog_limit_hit`
→ `paywall_shown('dialog_limit')` → `purchase_*`.

<acceptance_criteria>
- `grep -rn "ai_dialog_card_shown\|ai_dialog_started\|ai_dialog_completed\|ai_dialog_limit_hit" app/` → все ключевые события есть
- Каждое событие проходит через trackEvent (не console.log)
- События AC1/AC2/AC3/AC6 покрыты (card CTR, completion, suggested ratio, limit→paywall→purchase)
</acceptance_criteria>

---

## Verification (выход из фазы)

| AC | Как проверить | Порог |
|---|---|---|
| AC1 | PostHog: card_tapped/card_shown | ≥15% |
| AC2 | PostHog: completed/started | ≥50% |
| AC3 | PostHog: suggested_tapped в первых 2 репликах | ≥40% |
| AC4 | crash-free сессий с диалогом | ≥99% |
| AC5 | `premium_dialog_billing` средний total cost/диалог | ≤$0.01 |
| AC6 | воронка limit_hit→paywall_shown→purchase | >0 |

**Решение:** AC2≥50% & AC1≥15% → GO Фаза 1 (4 режима, caching, recall). AC2<35% → STOP/PIVOT (формат не для 50+).

## Порядок исполнения
Wave 1 (CF) → Wave 2 (клиент, 2.1→2.2→2.3→2.4) → Wave 3 (аналитика, вплести в 2.2/2.4).
Worktree (НЕ master), атомарные коммиты на задачу, копии по Библии.
