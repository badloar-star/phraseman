---
phase: 05-explain-like-im-five
plan: 03
type: execute
wave: 2
depends_on: [01]
files_modified:
  - app/explain_phrase_client.ts
  - app/explain_phrase_flags.ts
  - functions/src/explain/explain_reports.ts
  - functions/src/explain/explain_reports.test.ts
  - functions/src/index.ts
  - firestore.rules
autonomous: true
requirements: [EXPLAIN-CLIENT, EXPLAIN-RULES, EXPLAIN-REPORTS]

must_haves:
  truths:
    - "app/explain_phrase_client.ts exposes callExplainPhrase(req) using httpsCallable, copied from ai_dialog_client.ts: calls initFirebaseAppCheckIfAvailable() first, region us-central1. Request {phraseEn, phraseMeaning, lang} where phraseMeaning is the native-language gloss for server fallback (on DailyPhraseCard this is phrase.meaning, NOT a literal 'phraseRu'). The client sends phraseEn raw — the SERVER hashes it; the client never computes phraseHash."
    - "RESPONSE CONTRACT (pinned, single source of truth — both CF and client use it): { ok: true, text: string, status: 'ok'|'rejected'|'exhausted'|'pending', fromCache: boolean }. The CF ALWAYS builds the fallback text (never the client) — fallback = phraseMeaning + a simple example, assembled server-side. status meanings: 'ok' = real explanation (fresh or cached); 'rejected' = judge/report rejected, text is fallback; 'exhausted' = global/user budget hit, text is fallback; 'pending' = another request is generating, text is fallback (v1 shows fallback until the user reopens). The client renders text as-is and never decides quality."
    - "app/explain_phrase_flags.ts is env-gated, default OFF: isExplainEnabled() returns boolFromEnv('EXPO_PUBLIC_EXPLAIN_ENABLED') ?? false, mirroring ai_dialog_flags.ts exactly (cohort rollout)"
    - "firestore.rules adds a match for /phrase_explanations/{phraseHash} with `allow read: if true;` and `allow write: if false;` — only Admin SDK (the CF) writes; the client can read cached explanations directly but NEVER writes them"
    - "firestore.rules for server-only collections explain_global_budget, explain_user_limits, explain_billing, explain_reports: BOTH `allow read: if false;` AND `allow write: if false;` — pure internal CF state, NEVER read by any client (incl. admin via client SDK — admin reads via Admin SDK only). Use `if false`, NOT `isAdmin()`: referral_owners uses isAdmin() because it is admin-panel-queryable; the explain_* internal collections are NOT exposed to admin UI, so `false`. Only phrase_explanations is world-readable (`read: if true; write: if false;`). The acceptance test asserts `read: if false` on all four — copying isAdmin() would fail it."
    - "submitExplainReport CF (explain_reports.ts): ONLY the auth + per-user rate-limit scaffold is copied from submitClientReport (client_reports.ts:218). The report accepts phraseEn from the client and derives phraseHash SERVER-SIDE via the canonical normalizePhrase from plan-01 (client never sends a hash). It writes/updates one report record per phraseHash."
    - "THRESHOLD AUTO-REJECT IS NET-NEW LOGIC, NOT a copied pattern (submitClientReport has no counter/threshold/status-mutation — do not expect to find it there). REPORT_REJECT_THRESHOLD = 5 (distinct reports to auto-reject a cached explanation; chosen to match the report rate-limit max:5 convention in client_reports.ts). In ONE Firestore transaction: increment a per-hash report counter AND, if it reaches REPORT_REJECT_THRESHOLD (5), set phrase_explanations/{phraseHash}.status='rejected'. The increment and the status flip MUST be atomic in the same tx, or concurrent reports race past the threshold. This is backstop level 4 and is mandatory even with the AI judge."
    - "Auto-reject does NOT auto-regenerate: a rejected entry serves fallback until an admin manually resets it to pending. This prevents abusers from forcing expensive regeneration via mass-reporting."
    - "submitExplainReport is exported in index.ts and NOT in deploy:safe whitelist"
  artifacts:
    - path: "app/explain_phrase_client.ts"
      provides: "Typed callable client for explainPhrase + (later) report call"
      exports: ["callExplainPhrase", "ExplainPhraseRequest", "ExplainPhraseResponse"]
    - path: "app/explain_phrase_flags.ts"
      provides: "env-gated feature flags, default OFF"
      exports: ["isExplainEnabled", "EXPLAIN_ENABLED_DEFAULT"]
    - path: "functions/src/explain/explain_reports.ts"
      provides: "submitExplainReport CF: rate-limited report + threshold auto-reject of cache entry"
      exports: ["submitExplainReport", "REPORT_REJECT_THRESHOLD"]
    - path: "functions/src/explain/explain_reports.test.ts"
      provides: "Tests: report rate-limit; per-hash counter increments; threshold flips status to 'rejected' in the SAME tx; concurrent reports do not race past threshold; server derives hash from phraseEn (client hash ignored)"
    - path: "firestore.rules"
      provides: "read-only public cache rule + server-only collections"
  key_links:
    - from: "app/explain_phrase_client.ts:callExplainPhrase"
      to: "app/app_check_init.ts:initFirebaseAppCheckIfAvailable"
      via: "await initFirebaseAppCheckIfAvailable().catch(()=>{}) before httpsCallable (copied from ai_dialog_client)"
      pattern: "initFirebaseAppCheckIfAvailable"
    - from: "firestore.rules"
      to: "Firestore: phrase_explanations/{phraseHash}"
      via: "match block: allow read: if true; allow write: if false;"
      pattern: "phrase_explanations"
    - from: "functions/src/explain/explain_reports.ts:submitExplainReport"
      to: "functions/src/client_reports.ts:submitClientReport"
      via: "copied rate-doc + report-doc pattern, new collection explain_reports"
      pattern: "runTransaction|explain_reports"
    - from: "functions/src/explain/explain_reports.ts:submitExplainReport"
      to: "Firestore: phrase_explanations/{phraseHash}.status"
      via: "on threshold, set status='rejected' (auto-remove from public cache)"
      pattern: "REPORT_REJECT_THRESHOLD|status.*rejected"
---

<objective>
Связать клиент с CF, добавить env-gated флаги (дефолт OFF), закрыть `firestore.rules`
(публичный кэш read-only, остальные коллекции server-only), и реализовать бэкстоп-модерацию:
юзер-репорты с порогом авто-reject из кэша.

Purpose: дать приложению типизированный безопасный канал к `explainPhrase`, гарантировать
инвариант «клиент НИКОГДА не пишет публичный контент», и обеспечить человеческий контроль
(уровень 4) на случай, если ИИ-судья что-то пропустил.
</objective>

<context>
Клиент копируется с `app/ai_dialog_client.ts` (тот же httpsCallable + App Check init).
Флаги — с `app/ai_dialog_flags.ts` (env-override, дефолт false, когортный rollout).
Репорт-CF — из `submitClientReport` (functions/src/client_reports.ts:218) копируется ТОЛЬКО
каркас: auth + per-user rate-doc через транзакцию. ВАЖНО: порог/авто-reject там ОТСУТСТВУЕТ —
это НОВАЯ логика (см. truths), не ищи её в эталоне. Кнопку-репорт (UI) подключает план 04
через `ReportErrorButton`; репорт шлёт phraseEn, хэш считает сервер.

firestore.rules — КРИТИЧНО по инвариантам аудита:
- `phrase_explanations/{phraseHash}`: `read: if true; write: if false;` — клиент может ЧИТАТЬ
  готовый кэш напрямую (быстро, без CF), но писать — только Admin SDK из CF.
- `explain_global_budget`, `explain_user_limits`, `explain_billing`, `explain_reports`:
  `read: if false; write: if false;` (всё пишет/читает сервер) — явно, как у referral_owners.

Порог авто-reject: при достижении REPORT_REJECT_THRESHOLD репортов на phraseHash — статус
кэша → 'rejected' В ТОЙ ЖЕ транзакции, что инкремент счётчика (иначе гонка). Тогда фраза
отдаёт fallback, а не плохой текст. Регенерация (сброс в pending) — только вручную из админки,
чтобы массовые репорты не вынуждали дорогую регенерацию.

ТЕСТИРОВАНИЕ ПРАВИЛ — по факту репо: в проекте НЕТ runtime rules-теста
(`@firebase/rules-unit-testing`/`initializeTestEnvironment` отсутствуют). Единственный механизм —
СТРОКОВЫЙ снэпшот `tests/firestore_rules_security.test.ts` (`readFileSync` + `expect(rules).toContain(...)`).
Поэтому НЕ выдумывать emulator-инфру: добавить в этот же файл `toContain`-проверки на новые
блоки (`phrase_explanations` с `write: if false`, server-only с `read: if false`). ЧЕСТНО
понимать: это проверяет ТЕКСТ правила, а не рантайм-запрет. Рантайм-запрет проверяется руками
в эмуляторе (см. verification), но не блокирует CI.
</context>

<acceptance>
- `npm --prefix functions test` зелёный для explain_reports.test.ts.
- TS клиента компилируется в составе приложения (tsc проекта без новых ошибок).
- `tests/firestore_rules_security.test.ts` дополнен `toContain`-ассертами на ВСЕ блоки:
  `phrase_explanations` имеет `read: if true` И `write: if false`; и КАЖДАЯ из четырёх server-only
  (`explain_global_budget`, `explain_user_limits`, `explain_billing`, `explain_reports`) имеет
  `read: if false` И `write: if false`. Блоки вставлены на ROOT-уровне (не вложены под /users),
  рядом с `referral_owners`/перед catch-all `match /{document=**}`. (Проверка ТЕКСТА — по
  конвенции репо; рантайм-запрет — ручная проверка ниже.)
- Тест порога (functions-тест): 5 (=REPORT_REJECT_THRESHOLD) репортов на один hash в одной tx →
  status='rejected'; параллельные репорты НЕ проскакивают порог (atomicity).
- `isExplainEnabled()` без env возвращает false (фича скрыта по умолчанию).
</acceptance>

<verification>
1. Юнит-тесты репортов (functions-тест с мок/эмулятор admin).
2. Снэпшот-тест правил: `toContain` для новых блоков в firestore_rules_security.test.ts.
3. РУЧНАЯ проверка рантайма в эмуляторе (не CI): клиентская запись в phrase_explanations → deny;
   чтение → allow; запись в explain_global_budget клиентом → deny.
4. Прочитать текущий firestore.rules и вставить match-блоки рядом с аналогичными server-only
   коллекциями (referral_owners/community_seller_inbox/leaderboard), не сломав существующие правила.
5. Подтвердить: клиент не содержит НИКАКОЙ логики «годен/не годен» — только вызов и показ.
</verification>
