# Task packet: новая freemium-модель Phraseman — аудит и внедрение без master-флага

Governance-ID: TG-828CFA2E26CC
Status: In progress
Owner: сессия Claude (запрос владельца 2026-09-13)
Related epic/enabler: Revenue VNext (Epic 0–7 из `docs/superpowers/plans/2026-09-12-revenue-model-vnext-program.md`)

## Outcome

Обычный аккаунт получает честные дневные лимиты (карточные тренировки, голосовая
практика, ИИ-диалог), Plus снимает лимиты, жемчужины покупают «дневной пропуск»
сверх лимита. Пейвол показывается контекстно после исчерпания, в существующем
дизайне A–G, с текстом «дневной лимит» вместо ложного «только в Plus». Статистика
обычного аккаунта: уровень/опыт, серия и последние достижения наверху; всё
остальное — целиком за существующим замком `StatsPremiumBlur`, без `PlusBadge`.
DEV Hub показывает все 37 контекстов и варианты A–G + онбординг. HTML Revenue Lab
содержит полную матрицу, симуляцию 500×500 и тепловые карты (modeled estimates).
Успех: контрактные тесты зелёные, ни один русский текст не содержит «Free»,
Personal Plan отсутствует в sales copy для новых пользователей.

## Scope

In scope:
- `app/paywall_entry_contract.ts` — новые source (`ai_dialog_daily_limit`, `lesson_speaking`, `flashcards_speak_hold`, `stats_locked_card`).
- `app/paywall_copy.ts` — правда о дневных лимитах в `dialog_limit`, `speaking`, `flashcard_training`, `ai_voice_input` (все 9 локалей).
- `app/revenue_daily_quota.ts` (новый) — общая дневная квота по чекам PhoneState для `speaking_attempts` + учёт «дневного пропуска».
- `app/ai_dialog_daily_quota.ts` (новый) — клиентское зеркало серверной дневной квоты реплик.
- `app/quota_day_pass.ts` (новый) + `app/economy/client_shard_semantic_reducer.ts` + `app/shards_system.ts` (reason) — композитная покупка пропуска за жемчужины.
- Экраны: `components/SpeakingButton.tsx`, `app/lesson1.tsx`, `app/flashcards/SpeakHoldButton.tsx`, `app/ai_dialog_session.tsx`, `components/DialogsTabContent.tsx`, `app/streak_stats.tsx`, `components/StatsPremiumBlur.tsx`, `components/dev/DevHubSheet.tsx`.
- Сервер: `functions/src/premium_dialog.ts`, `functions/src/premium_dialog_stream.ts` — гейт `gate_ai_dialog_premium=true` означает «дневной кап бесплатных реплик», а не полный отказ (деплой — отдельное решение владельца).
- Тесты: новые контракты + обновление устаревших (`ai_dialog_lifetime_gate_contract`, `ai_dialog_paywall_truth_contract`, `stats_selected_design_contract`).
- Документы: `docs/monetization/*` (аудит, Revenue Lab HTML, реестр долга).

Out of scope: Max AI Tutor (исключён полностью), визуальный дизайн пейволов A–G и онбординга, Learning V2, удаление legacy Max paywall в DEV Hub, деплой функций, изменение цен подписки.

## Architecture

Текущая граница: `useFeatureAccess(feature)` = Plus ∨ флаг «Фри» ∨ boon; при `false` экраны уводят на пейвол без лимита. Карточные тренировки уже считают 3 старта/день по чекам PhoneState (`revenue_quota_access.ts`).

Целевая граница: тот же принцип для голосовой практики (3 попытки/день) и диалогов (дневной кап реплик, сервер — источник истины, клиент — зеркало). `gate_<feature>_premium=true` = «дневной лимит», `false` = безлимит для всех (прецедент Epic 2A). Никакого master-флага: каждая фича использует свой существующий remote-флаг + entitlement.

Поток: экран → `usePremium()` (accessResolved/hasPremiumAccess) → preview квоты (чеки PhoneState / зеркало AsyncStorage) → действие сразу (optimistic) → consume в фоне под замком аккаунта → при `exhausted` → `/premium_modal` с контекстом и source → аналитика `paywall_shown`. Сеть влияет только на синхронизацию.

Инварианты: клиентская авторитетность (Economy Constitution), одна композитная операция «дебет + grant» для пропуска, идемпотентность по `operationId`/`receiptId`, Plus никогда не считается, `unavailable` ≠ `exhausted` (не открывает пейвол).

Решение по конфликту: контракт `ai_dialog_lifetime_gate_contract` фиксировал «диалоги только в Plus» (отмена пожизненного триала 08.2026). Новое ТЗ владельца прямо требует дневной лимит; контракт обновляется на новую истину (запрет пожизненного счётчика сохраняется), решение помечено в отчёте 🔴 для подтверждения владельцем.

## Security and privacy

Персональные данные не добавляются. Чеки квот — опаковые значения под уже поддержанным фактом `attempt` PhoneState (схема без изменений, правила Firestore и Jarvis не затрагиваются — как в Epic 2A). Серверный гейт диалогов по-прежнему проверяет подписку на сервере; клиентские флаги недоверенные. Дневной кап реплик защищает бюджет OpenAI (админ-конфиг `freeDailyReplies`). Privacy Policy не меняется: новых сервисов/разрешений нет.

## Technical debt

- Pay now: ложный copy «только в Plus» для лимитированных фич; PlusBadge поверх замка статистики; отсутствие source у пейвола статистики; дублирование гейта прямого Blitz (закрыто в Epic 2A, добавлен регресс).
- Contain: ядро дневной квоты существует в двух модулях (`revenue_quota_access.ts` карточки и `revenue_daily_quota.ts` голос) — RVTD-026, выход: единый параметризованный модуль после стабилизации Epic 2A.
- Accept temporarily: серверные изменения гейта диалогов ждут деплоя (RVTD-027, владелец, до релиза клиента); кросс-устройственный overshoot квот (RVTD-019 уже открыт).

## Verification

- Узкие jest под слотом светофора: контракты пейвола/контекстов, DEV Hub, копи, статистика, квоты голоса/диалога, пропуск за жемчужины, Blitz direct route.
- `git diff --check`, точечный ESLint по изменённым файлам.
- Ручная проверка владельцем: обычный аккаунт → 4-я тренировка/голосовая попытка → пейвол «дневной лимит»; DEV Hub → раздел «Пейволы» → выбор контекста → A–G.

## Rollback

Клиент: правки обратимы `git revert`; чеки квот — иммутабельные факты, их наличие безвредно для старого кода (игнорируются). Купленный пропуск — локальный grant с paidKey; откат кода не отбирает уже выданный результат. Сервер: до деплоя поведение прежнее (полный отказ обычному аккаунту → клиент показывает пейвол на первой отправке).
