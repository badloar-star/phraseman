---
phase: 05-explain-like-im-five
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - functions/src/explain/explain_gates.ts
  - functions/src/explain/explain_cache.ts
  - functions/src/explain/explain_budget.ts
  - functions/src/explain/explain_gates.test.ts
  - functions/src/explain/explain_cache.test.ts
  - functions/src/explain/explain_budget.test.ts
autonomous: true
requirements: [EXPLAIN-CORE]

must_haves:
  truths:
    - "phraseHash is deterministic: sha256(normalize(phraseEn)).slice(0,40), where normalize = trim + toLowerCase + collapse whitespace; 'Hello!' and 'hello ' collapse to the SAME hash modulo punctuation policy"
    - "Explanation cache doc lives at phrase_explanations/{phraseHash} with status field one of 'pending'|'ready'|'rejected', AND a schemaVersion:1 field (B-readiness: lets a future ai_content migration version-check on read and treat unversioned/old docs as v1, matching the schemaVersion pattern already used in personal_plan_day_runtime_persistence_contract.ts)"
    - "readCachedExplanation() returns {status,text,...} for 'ready'/'rejected'/'pending'; returns null when doc absent"
    - "CONSTANTS (explicit values — acceptance tests are unwritable without them): LOCK_TTL_MS = 30000 (30s, slightly above the 30s CF timeout so a crashed generation's lock becomes stale right after the request that held it dies); GLOBAL_DAILY_CAP = 100 (new phrases generated per UTC day across the WHOLE product — at ~230 tokens/miss ≈ $0.02 per 100 misses; daily reset = circuit breaker against a viral spike); USER_DAILY_GEN_CAP = 20 (per-user new generations per UTC day — free-for-all feature, so a moderate ceiling that allows casual use but blocks single-account spam-DoS). All three exported as named constants so tests parameterize them."
    - "claimPendingLock() uses a transaction: if doc absent OR (status=='pending' AND now - createdAtMs > LOCK_TTL_MS) it sets status='pending' WITH createdAtMs=now and returns true (caller generates); if 'ready'/'rejected'/fresh-pending it returns false (caller serves cache/fallback). The pending doc MUST store createdAtMs so staleness is computable. RECOVERY: Firestore does not auto-expire the lock — a stale pending is simply re-claimable by the NEXT request after LOCK_TTL_MS; document that an admin can also manually reset a stuck doc."
    - "enforceUserGenLimit() is a transaction-based per-user limiter copied from premium_dialog.enforceRateLimit/enforceDailyQuota. CRITICAL: it MUST use admin.firestore().runTransaction() to atomically CHECK-AND-INCREMENT the daily count in ONE tx (mirroring enforceDailyQuota at premium_dialog.ts:119-141), so two concurrent calls from one user cannot both pass the check before either increments. Window rate-limit AND daily cap (USER_DAILY_GEN_CAP); throws HttpsError('resource-exhausted', ...) when exceeded."
    - "enforceGlobalBudget() uses runTransaction() to atomically check-and-increment explain_global_budget/{YYYY-MM-DD}.genCount and throws HttpsError('resource-exhausted','explain_global_budget') when it would exceed GLOBAL_DAILY_CAP — checked AFTER per-user limit (so an abuser hits their own cap first), BEFORE any OpenAI call. (Do NOT increment-then-read outside a tx — that races.)"
    - "All limiter/cache writes use admin.firestore() server-side only; no client path; doc ids derived from authUid+stableUid hash exactly like premium_dialog.docId()"
    - "Day boundary uses startOfNextUtcDay() (UTC), identical to premium_dialog, so resets align with the rest of the app"
  artifacts:
    - path: "functions/src/explain/explain_cache.ts"
      provides: "Global explanation cache: hashing, read, pending-lock claim, write-ready, write-rejected"
      exports: ["EXPLAIN_COLLECTION", "phraseHashFor", "normalizePhrase", "readCachedExplanation", "claimPendingLock", "writeReadyExplanation", "writeRejectedExplanation", "CachedExplanation"]
    - path: "functions/src/explain/explain_budget.ts"
      provides: "Per-user generation limiter + global daily budget breaker (separate fns for B-readiness)"
      exports: ["enforceUserGenLimit", "enforceGlobalBudget", "GLOBAL_DAILY_CAP", "USER_DAILY_GEN_CAP"]
    - path: "functions/src/explain/explain_gates.ts"
      provides: "Deterministic input gate + output sanitizer (no AI), with PINNED numeric thresholds. validateExplainInput: phraseEn required, 1..MAX_PHRASE_LEN (=200) chars; phraseMeaning required non-empty string ≤MAX_MEANING_LEN (=500) chars UTF-8 (it feeds the fallback — undefined/5000-char must be rejected → generic fallback). Heuristic pre-filter for the judge stage: MIN_OUTPUT_LEN=5 (shorter ⇒ too_short), empty = trimmed length 0, and a LANGUAGE-AWARE wrong-script check: wrongScriptRatio(text, lang) — the output must be predominantly in the EXPECTED script for `lang` (Cyrillic for ru/uk, Latin for en/es, …), reject if >MAX_WRONG_SCRIPT_RATIO (=0.40) of letters are outside the expected script. CRITICAL: do NOT hardcode 'non-Latin = bad' — a valid Russian explanation is mostly Cyrillic and must PASS. sanitizeExplanationOutput strips markdown/stage-directions, enforces non-empty."
      exports: ["validateExplainInput", "sanitizeExplanationOutput", "wrongScriptRatio", "expectedScriptFor", "MAX_PHRASE_LEN", "MAX_MEANING_LEN", "MIN_OUTPUT_LEN", "MAX_WRONG_SCRIPT_RATIO", "ExplainInput"]
    - path: "functions/src/explain/explain_cache.test.ts"
      provides: "Tests: hash stability/normalization, read states, pending-lock race + staleness"
    - path: "functions/src/explain/explain_budget.test.ts"
      provides: "Tests: per-user window+daily cap, global budget increment + cap throw, UTC reset"
    - path: "functions/src/explain/explain_gates.test.ts"
      provides: "Tests: input rejects empty/too-long/junk; output sanitizer strips markdown, enforces non-empty"
  key_links:
    - from: "functions/src/explain/explain_budget.ts:enforceUserGenLimit"
      to: "functions/src/premium_dialog.ts:enforceRateLimit"
      via: "copied transaction pattern (windowStartMs/count) — same shape, new collection"
      pattern: "runTransaction"
    - from: "functions/src/explain/explain_budget.ts:enforceGlobalBudget"
      to: "Firestore: explain_global_budget/{YYYY-MM-DD}"
      via: "runTransaction: read genCount, throw if >= GLOBAL_DAILY_CAP, else set genCount+1 — all in one tx (NOT increment-then-read, which races)"
      pattern: "explain_global_budget|runTransaction"
    - from: "functions/src/explain/explain_cache.ts:claimPendingLock"
      to: "Firestore: phrase_explanations/{phraseHash}"
      via: "transaction: set status='pending' only if absent or stale"
      pattern: "phrase_explanations|claimPendingLock"
---

<objective>
Построить переиспользуемое ЯДРО фичи (без CF-эндпоинта и без OpenAI ещё): глобальный кэш
объяснений, per-user лимитер генераций и глобальный бюджет-предохранитель, плюс
детерминированные гейты входа/выхода. Всё вынесено в отдельные функции/файлы под
`functions/src/explain/` — это «задел под B»: позже переедет в `ai_content/core` без смены сигнатур.

Purpose: отделить дорогую и опасную часть (вызовы ИИ) от дешёвой и детерминированной
(гейты, кэш, лимиты), чтобы CF-точка в плане 02 была тонкой и полностью протестированной.
</objective>

<context>
Эталон — `functions/src/premium_dialog.ts`. Из него ДОСЛОВНО переиспользуются:
- `docId(prefix, authUid, stableUid)` — sha256 id (скопировать в budget).
- `startOfNextUtcDay(now)` — граница суток UTC.
- `enforceRateLimit` (окно) и `enforceDailyQuota` (дневной cap) — паттерн транзакции.

НОВОЕ по сравнению с premium_dialog:
- Глобальный кэш `phrase_explanations/{phraseHash}` (у диалогов кэша нет — каждый вызов платный).
- `pending`-lock: два юзера тапнули одну фразу одновременно → генерит только первый, второй
  ждёт/читает. Защита от двойной оплаты.
- Глобальный бюджет-предохранитель — у диалогов его нет (там премиум-гейт держит расход).
- Статус `rejected` кэшируется — спам «плохой» фразы не жжёт бюджет.

normalizePhrase политика пунктуации: trim → toLowerCase → схлопнуть пробелы. Решение по
финальной пунктуации (срезать `!?.,` в конце или нет) ЗАФИКСИРОВАТЬ в тесте hash-стабильности —
важно, чтобы «Hello!» и «Hello» давали один кэш (иначе дубли вызовов). Рекомендую срезать
trailing-пунктуацию для агрессивной дедупликации.
</context>

<acceptance>
- `npm --prefix functions test` зелёный для трёх новых *.test.ts.
- `claimPendingLock` доказанно атомарен: тест с двумя последовательными claim на пустой doc →
  первый true, второй false. Pending-doc содержит createdAtMs.
- `enforceGlobalBudget` на (GLOBAL_DAILY_CAP+1)=101-м вызове бросает `resource-exhausted`.
- `enforceUserGenLimit` на (USER_DAILY_GEN_CAP+1)=21-м вызове одного юзера за UTC-сутки бросает
  `resource-exhausted`; ДВА быстрых последовательных вызова одного юзера — первый проходит,
  второй инкрементирует поверх (доказывает atomic check+increment в одной tx, не check-only).
- Stale-pending (now - createdAtMs > LOCK_TTL_MS=30000) повторно захватывается следующим запросом;
  fresh-pending (моложе TTL) — НЕ захватывается (claim возвращает false).
- `validateExplainInput`: пустой/200+-символьный phraseEn → reject; undefined/500+-символьный
  phraseMeaning → reject (на generic fallback).
- TS компилируется: `npm --prefix functions run build` (или tsc) без новых ошибок.
</acceptance>

<verification>
1. Юнит-тесты (Firestore emulator или мок admin, как в существующих functions/*.test.ts).
2. Проверить, что нормализация даёт один hash для регистра/пробелов/пунктуации (table-driven тест).
3. Проверить порядок: per-user limit бросает РАНЬШЕ, чем трогается глобальный счётчик
   (иначе абьюзер крутит глобальный бюджет, не упираясь в свой лимит).
</verification>
