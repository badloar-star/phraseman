---
phase: 05-explain-like-im-five
plan: 02
type: execute
wave: 2
depends_on: [01]
files_modified:
  - functions/src/explain/explain_prompts.ts
  - functions/src/explain/explain_judge.ts
  - functions/src/explain/explain_provider.ts
  - functions/src/explain_phrase.ts
  - functions/src/explain/explain_judge.test.ts
  - functions/src/explain_phrase.test.ts
  - functions/src/index.ts
autonomous: true
requirements: [EXPLAIN-CF, EXPLAIN-JUDGE]

must_haves:
  truths:
    - "explainPhrase is an onCall CF with onCall options copied from premiumDialogSend: region us-central1, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds 30, memory 512MiB, maxInstances 20, secrets [OPENAI_API_KEY]"
    - "CF rejects unauthenticated: if !request.auth?.uid throw HttpsError('unauthenticated','auth_required') — identity resolved via resolveStableUidForAuth(db, authUid), NEVER from request.data"
    - "Flow order is exactly: appcheck/auth → validateExplainInput → readCachedExplanation → (ready ⇒ return text, 0 AI calls) → (rejected ⇒ return fallback, no regen) → enforceUserGenLimit → enforceGlobalBudget → claimPendingLock → generate → sanitize → JUDGE → writeReady|writeRejected → return"
    - "The AI judge (explain_judge.ts) is a SEPARATE gpt-4o-mini call with max_tokens ~30, temperature 0, a strict-JSON system prompt; parses {ok:boolean, reason:string}; on parse failure judge VERDICT defaults to ok:false (fail-closed, never publish unparseable). JUDGE_SYSTEM_PROMPT must constrain reason to a FIXED ENUM (one of: too_short, empty, non_target_language, toxic, off_topic, incoherent, ok) and explicitly forbid echoing the phrase, the user, or any PII — reason is written to explain_billing (server-only) so an echoed phrase = log leak + prompt-injection vector. A prompt-injected phrase must NOT change the reason away from the enum."
    - "Heuristic pre-filter (in explain_judge.ts or explain_gates) runs BEFORE the judge call: if obvious garbage (wrong-script ratio, empty, too short) ⇒ skip judge, treat as rejected (0 judge tokens)"
    - "On judge ok:true ⇒ writeReadyExplanation(hash, text, meta) makes it public; on ok:false ⇒ writeRejectedExplanation(hash, reason); the live caller ALWAYS receives the generated text in the response regardless of verdict (it only gates the shared cache, not the trigger user)"
    - "Generation prompt: buildExplainPrompt(phraseEn, phraseMeaning, lang) takes lang explicitly. It encodes the content-rules voice: explain THIS phrase простыми словами как для ребёнка, with one бытовой пример, max ~60 words, output plain text only (no markdown, no stage directions) — mirrors GLOBAL_RULES style from premium_dialog. LANGUAGE: a PROMPT_LANGUAGES map declares which of the app's languages have a localized instruction; the explanation is written in `lang`; an unknown/unsupported lang falls back to 'ru' (mirroring the bundleLang fallback in i18n.ts). v1 supported set is at minimum ru + en; document the table and the fallback explicitly."
    - "The heuristic wrong-script check uses wrongScriptRatio(text, lang) from plan-01 (language-aware, NOT Latin-only): it verifies the explanation is in the EXPECTED script for `lang` (Cyrillic for ru — a Russian explanation must PASS, not be rejected). Pass `lang` into the pre-filter so valid non-English explanations are never falsely rejected."
    - "Every cache MISS writes a billing doc (explain_billing collection) with stableUid, phraseHash, promptTokens/completionTokens for BOTH generation and judge calls, model, verdict, createdAtMs — same shape as premium_dialog BILLING_COLLECTION"
    - "explainPhrase is exported in functions/src/index.ts and is NOT added to any deploy:safe whitelist — deployed point-to-point"
  artifacts:
    - path: "functions/src/explain_phrase.ts"
      provides: "The onCall CF orchestrating the full gated flow using plan-01 core + judge + provider"
      exports: ["explainPhrase"]
    - path: "functions/src/explain/explain_judge.ts"
      provides: "AI-judge: heuristic pre-filter + cheap gpt-4o-mini classification call returning a fail-closed verdict"
      exports: ["judgeExplanation", "heuristicPreFilter", "JudgeVerdict"]
    - path: "functions/src/explain/explain_provider.ts"
      provides: "Thin OpenAI chat wrapper (B-readiness seam: one place to swap provider later)"
      exports: ["openAiChat", "OpenAiChatResult"]
    - path: "functions/src/explain/explain_prompts.ts"
      provides: "Generation + judge system prompts in content-rules voice; buildExplainPrompt(phraseEn, phraseMeaning, lang) + PROMPT_LANGUAGES map + JUDGE_SYSTEM_PROMPT (enum reason, no-PII-echo)"
      exports: ["buildExplainPrompt", "PROMPT_LANGUAGES", "JUDGE_SYSTEM_PROMPT"]
    - path: "functions/src/explain_phrase.test.ts"
      provides: "Tests: cache-hit short-circuits (0 calls), rejected short-circuits, full miss path, verdict gating, body-uid is ignored, status enum on each path (ok/rejected/exhausted/pending), CF builds fallback"
    - path: "functions/src/explain/explain_judge.test.ts"
      provides: "Tests: judge parses JSON, fail-closed on garbage JSON, heuristic skips judge for wrong-script, on/off verdicts, MULTILINGUAL (a valid ru/Cyrillic explanation is NOT rejected as wrong-script; buildExplainPrompt(lang=uk) targets Ukrainian; unknown lang → ru), prompt-injected phrase keeps reason within the enum (no echo)"
  key_links:
    - from: "functions/src/explain_phrase.ts:explainPhrase"
      to: "functions/src/auth_identity.ts:resolveStableUidForAuth"
      via: "await resolveStableUidForAuth(db, request.auth.uid) — identity NOT from data"
      pattern: "resolveStableUidForAuth"
    - from: "functions/src/explain_phrase.ts:explainPhrase"
      to: "functions/src/callable_options.ts:ENFORCE_APP_CHECK"
      via: "enforceAppCheck: ENFORCE_APP_CHECK in onCall options"
      pattern: "ENFORCE_APP_CHECK|enforceAppCheck"
    - from: "functions/src/explain_phrase.ts:explainPhrase"
      to: "functions/src/explain/explain_cache.ts:claimPendingLock"
      via: "guard generation behind the pending lock"
      pattern: "claimPendingLock"
    - from: "functions/src/explain_phrase.ts:explainPhrase"
      to: "functions/src/explain/explain_judge.ts:judgeExplanation"
      via: "judge the generated text before writeReadyExplanation"
      pattern: "judgeExplanation"
    - from: "functions/src/index.ts"
      to: "functions/src/explain_phrase.ts:explainPhrase"
      via: "require + exports.explainPhrase = explainPhrase"
      pattern: "explainPhrase"
---

<objective>
Собрать сам Cloud Function `explainPhrase` — тонкий оркестратор поверх ядра из плана 01,
плюс ИИ-судья отдельным дешёвым вызовом и обёртка-провайдер OpenAI. Это сердце фичи:
полный путь «гейты → кэш → бюджет → генерация → судья → запись/отклонение».

Purpose: один защищённый эндпоинт, который при кэш-хите стоит $0, при промахе делает ровно
2 дешёвых вызова (генерация + судья), и НИКОГДА не публикует невалидированный текст в общий кэш.
</objective>

<context>
Эталон — `premiumDialogSend` (functions/src/premium_dialog.ts:185+). Копируем onCall-опции,
проверку auth, `resolveStableUidForAuth`, паттерн fetch→OpenAI, запись billing-дока.

КЛЮЧЕВОЕ ОТЛИЧИЕ от диалогов — порядок и кэш:
1. Сначала ЧИТАЕМ кэш. `ready` → отдать текст, выйти (0 вызовов). `rejected` → fallback, выйти.
2. Только на промахе — лимиты (per-user → global budget), затем pending-lock.
3. Генерация — собрать ПОЛНЫЙ текст (v1 без стриминга; стриминг = отдельный инкремент 06,
   см. CONTEXT «Streaming: explicit status». CF возвращает готовый текст в ответе callable).
4. sanitize (план 01) → **судья** (отдельный вызов) → запись.

СУДЬЯ (explain_judge.ts):
- Сначала `heuristicPreFilter` (дёшево, без ИИ): доля «не того» алфавита, пустота, длина.
  Явный мусор → verdict ok:false БЕЗ вызова судьи (экономим токены).
- Иначе — вызов gpt-4o-mini, system = JUDGE_SYSTEM_PROMPT, max_tokens ~30, temperature 0.
  Просим СТРОГО JSON `{"ok":bool,"reason":string}`. ВАЖНО (из памяти проекта): в кодбейзе
  `response_format: json_object` НЕ используется нигде — НЕ полагаться на него как на готовый
  паттерн. Либо ввести его самому (gpt-4o-mini поддерживает), либо парсить текст fail-closed.
  Рекомендую json_object + fail-closed парсинг как двойная защита.
- Парсинг fail-closed: не распарсилось / нет `ok` → считаем ok:false. НИКОГДА не публикуем
  то, в чём не уверены. (Публичный кэш — цена ошибки высокая.)

FALLBACK (когда не генерим/reject/budget): простой текст из данных фразы, который клиент
передал (phraseMeaning + «Например: …»). НЕ вызывает ИИ. CF строит fallback (не клиент);
форма и enum status — в контракте ответа плана 03 (клиент шлёт phraseMeaning для fallback).

ВАЖНО про verdict-гейт: живой юзер ВСЕГДА получает сгенерированный текст в ответе CF, даже
если судья сказал ok:false. Судья защищает ОБЩИЙ кэш (writeReady не вызовется), а не этого юзера.
Так мы рискуем показать сырое только триггеру, никогда — всем.
</context>

<acceptance>
- `npm --prefix functions test` зелёный: explain_phrase.test.ts + explain_judge.test.ts.
- Тест «body-uid игнорируется»: передать в request.data поле uid/stableId ≠ auth.uid →
  идентичность берётся из auth, не из body (закрытие главного класса багов аудита).
- Тест «cache ready ⇒ 0 OpenAI вызовов»: мок провайдера НЕ вызван.
- Тест «judge garbage JSON ⇒ rejected»: непарсящийся ответ судьи → writeRejected, не writeReady.
- `explainPhrase` присутствует в index.ts exports; grep подтверждает.
- Подтвердить отсутствие в deploy:safe (если в репо есть скрипт/конфиг whitelist — проверить).
</acceptance>

<verification>
1. Юнит-тесты с мок-провайдером (не жечь реальный OpenAI в CI).
2. Ручной прогон в Firestore emulator: первый вызов фразы → pending → ready; второй вызов той же
   фразы → мгновенный ready без обращения к провайдеру.
3. Проверить billing-доки: на промахе ровно 2 записи токенов (gen + judge).
4. Прочитать `functions/src/callable_options.ts` чтобы убедиться, что ENFORCE_APP_CHECK
   импортируется именно так, как в premium_dialog.
</verification>
