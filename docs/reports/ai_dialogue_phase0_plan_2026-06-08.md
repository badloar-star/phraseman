# ИИ-диалоги — Фаза 0: проверка спроса (PLAN)

> Дата: 2026-06-08. Цель фазы: за 3–5 дней минимальным кодом проверить, что аудитория 50+ ВООБЩЕ хочет говорить с ИИ и доходит до конца первого диалога. Если спрос/completion низкие — чинить UX до масштабирования, НЕ строить полный MVP.
> Спутники: [audit](./ai_dialogue_feature_audit_2026-06-08.md) · [промпты](./ai_dialogue_system_prompts_2026-06-08.md) · [CF-черновик](./ai_dialogue_premium_dialog.draft.ts) · [UI](./ai_dialogue_ui_mockup_2026-06-08.html)

## Гипотеза, которую проверяем

> «50+ русскоязычный новичок захочет нажать карточку ‘Разговор с Филом’ и пройдёт сценарный диалог до конца, если ему не показывать пустое поле ввода, а дать роль, цель и кнопки-подсказки.»

Если гипотеза неверна — никакой объём LLM-качества фичу не спасёт. Поэтому Фаза 0 меряет **поведение**, а не качество модели.

## Что строим (минимум)

**ОДИН режим — `scenario`, ОДИН сценарий — «Закажи кофе».** Без recall/free/tutor. Без голоса. Без полной CF (caching/sliding-window — потом).

### Бэкенд (1 функция, ~1 день)
- `functions/src/premium_dialog.ts` — урезанная версия [черновика](./ai_dialogue_premium_dialog.draft.ts):
  - `onCall`, эталон `pronunciation_scoring.ts` (тот же `resolveStableUidForAuth`, `process.env.OPENAI_API_KEY`, `ENFORCE_APP_CHECK`).
  - Только `scenario`-промпт (hardcoded, на сервере).
  - `enforceRateLimit` (антифлуд) + `enforceDailyQuota` (free=1, premium=100).
  - Billing-лог в `premium_dialog_billing`.
  - **НЕ** в `deploy:safe` whitelist — деплоить точечно, проверить в emulator (правило проекта).
  - Модель `gpt-4o-mini`, `max_tokens:200`.

### Клиент (~2 дня)
- `app/ai_dialog_session.tsx` — чат-экран по паттерну `trainer_phrases_session.tsx`:
  - state `messages[]`, `httpsCallable('premiumDialogSend')`.
  - UI ровно из [макета](./ai_dialogue_ui_mockup_2026-06-08.html): крупный шрифт (из `ThemeContext`), пузыри, кнопки 🔊/🌐, recast-строка, **2–3 suggested-reply кнопки** (для Фазы 0 — hardcode-набор под сценарий кофе, без генерации).
  - Озвучка реплик через `useAudio()`/expo-speech (готово).
  - Перевод по тапу — для Фазы 0 можно слать второй дешёвый вызов «переведи на русский» ИЛИ hardcode-переводы реплик (если сценарий фиксированный — дешевле).
  - Финальный мини-репорт (статистика + 1–2 ошибки — опционально, можно отложить).
- `app/dialogs_limit_session.ts` — копия паттерна `trainer_session.ts`: `DAILY_FREE_DIALOG_KEY='dialogs_free_session_v1'`, `hasUsedFreeDialogToday/markFreeDialogUsed/getFreeDialogsLeftToday`.
- `app/remote_flags.ts` — `free_dialogs_per_day` (дефолт 1) + `EXPO_PUBLIC_FREE_DIALOGS` + getter (по образцу `getFreeTrainerSessionsPerDay`). Сама фича за флагом `ai_dialog_enabled` (дефолт false → включаем когортно).
- `app/(tabs)/home.tsx` (~стр.2838) — карточка «Разговор с Филом» под `if (studyTarget && getFlag('ai_dialog_enabled'))`.
- `app/premium_modal.tsx` — новый context `'dialog_limit'` (копий по Библии, gain-framing).

### Аналитика (вплести сразу, иначе фаза бессмысленна)
Через `analytics.ts` / PostHog (паттерн из premium-conversion работы):
- `ai_dialog_card_shown`, `ai_dialog_card_tapped` (CTR карточки).
- `ai_dialog_started`, `ai_dialog_message_sent` (с № реплики), `ai_dialog_suggested_tapped` vs typed.
- `ai_dialog_completed` (дошёл до цели), `ai_dialog_abandoned` (с № реплики обрыва).
- `ai_dialog_tts_used`, `ai_dialog_translation_used`.
- `ai_dialog_limit_hit` → `paywall_shown('dialog_limit')` → `purchase_*` (воронка конверсии).

## Acceptance-критерии (выход из Фазы 0)

| # | Критерий | Метрика | Порог «зелёный» |
|---|---|---|---|
| AC1 | Карточку замечают и жмут | CTR `card_tapped/card_shown` | ≥ 15% |
| AC2 | **Главный тест 50+:** доходят до конца первого диалога | `completed/started` | ≥ 50% |
| AC3 | Кнопки-подсказки реально снимают паралич | доля `suggested_tapped` среди первых 2 реплик | ≥ 40% (значит без них был бы ступор) |
| AC4 | Фича не ломает прод | crash-free сессий с диалогом | ≥ 99% |
| AC5 | Экономика подтверждается на реальных данных | средний cost/диалог из billing-лога | ≤ $0.01 |
| AC6 | Есть сигнал монетизации | `limit_hit → paywall_shown → purchase` | хоть какая-то ненулевая конверсия |

**Решение по результатам:**
- AC2 ≥ 50% + AC1 ≥ 15% → **GO на Фазу 1** (полный текстовый MVP: 4 режима, caching, recall-интеграция).
- AC2 < 50% но AC3 высокий → UX рабочий, но вход слабый: усилить карточку/онбординг, повторить.
- AC2 < 35% → **STOP/PIVOT**: аудитория 50+ не идёт в чат. Пересмотреть формат (может, голос-first или гайд-режим без свободного ввода вообще).

## Чего НЕ делаем в Фазе 0 (явный антискоуп)

- Никаких recall/free_talk/tutor режимов.
- Никакого голоса (STT/TTS-диалога) — только кнопка озвучки реплик.
- Никакого prompt caching / sliding-window (один короткий сценарий — не нужно).
- Не трогаем `review.tsx`, energy-систему, XP на каждое сообщение.
- Не добавляем CF в `deploy:safe` whitelist.

## Риски Фазы 0 и митигация

| Риск | Митигация |
|---|---|
| Ключ/абуз | rate-limit + daily quota ДО fetch; billing-алерт; `ENFORCE_APP_CHECK=true` в проде |
| stableId-impersonation | строго `request.auth.uid` + `resolveStableUidForAuth` (эталон) |
| Сломать прод деплоем | emulator-тест, точечный деплой функции, фича за remote-флагом (когортный rollout) |
| Копии не по Библии | весь юзер-текст gain-framing, «ты», ≤10 слов, глагол в кнопке (PHRASEMAN_BIBLE.md) |
| Премиум-проверка на клиенте обходится | серверная квота — независимый источник правды; TODO: подтверждать премиум серверно через RevenueCat shard |

## Оценка усилий

| Блок | ~Время |
|---|---|
| CF `premium_dialog.ts` (урезанная) + emulator-тест | 1 день |
| `ai_dialog_session.tsx` + UI из макета | 1.5 дня |
| Гейтинг (`dialogs_limit_session`, remote_flags, premium_modal context) | 0.5 дня |
| Карточка на home + аналитика-события | 0.5 дня |
| Прогон, флаг, когортный rollout | 0.5 дня |
| **Итого** | **~4 дня** |

## Следующий шаг

Запустить `/gsd:plan-phase` с этим документом как входом → получить PLAN.md с задачами и verification-loop, затем `/gsd:execute-phase`. Реализацию вести в worktree (НЕ master), коммиты атомарные (правила проекта).
