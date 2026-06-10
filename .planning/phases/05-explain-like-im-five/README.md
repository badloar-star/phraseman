# Phase 5 — Explain Like I'm Five

**Status:** Planned (not started)
**Created:** 2026-06-09
**Approach:** Clone & extend `premium_dialog.ts`, with core split out for future `ai_content` platform ("A with B-readiness").

> Full locked decisions, security invariants, and validation model: see [CONTEXT.md](./CONTEXT.md).

## Goal

Кнопка «Объясни как для 5-летнего» на любой фразе → bottom-sheet снизу вверх с простым
объяснением в стиле content rules. Глобальный кэш (первый сгенерил → видят все),
gpt-4o-mini, скелетон→полный текст (v1; word-by-word стриминг = инкремент 06). Валидация — **ИИ-судья отдельным вызовом** + эвристика +
кэш вердикта + юзер-репорты как бэкстоп. Все гейты на сервере. Бюджет-предохранитель.

## Success criteria

> **Streaming note:** v1 ships NON-streaming (skeleton-loader → full text on arrival). Word-by-word
> streaming is **increment 06 / fast-follow**, not a v1 criterion — see CONTEXT "Streaming: explicit status".
> `httpsCallable` cannot stream and no existing CF does; the transport is its own chunk.

- Тап на фразе → шторка с понятным объяснением «как для ребёнка» за ≤3 сек (промах) / мгновенно (хит).
- Один вызов ИИ на фразу за всю жизнь продукта (потом кэш). Расход ограничен глобальным бюджетом.
- Невалидированный текст НИКОГДА не попадает в общий кэш (судья fail-closed).
- Клиент не пишет публичный контент (firestore.rules read-only) и не решает «годен/нет».
- Фича скрыта при `EXPO_PUBLIC_EXPLAIN_ENABLED` OFF (когортный rollout).

## Plans (waves)

| Plan | Wave | Depends | What | Auto |
|---|---|---|---|---|
| [01](./01-PLAN.md) | 1 | — | **Core**: cache + budget + gates (separate fns, B-ready). Tests. | ✅ |
| [02](./02-PLAN.md) | 2 | 01 | **CF `explainPhrase`**: orchestrator + AI-judge + provider. Tests. | ✅ |
| [03](./03-PLAN.md) | 2 | 01 | **Client + flags + firestore.rules + reports backstop**. Tests. | ✅ |
| [04](./04-PLAN.md) | 3 | 02,03 | **UI**: bottom-sheet (skeleton→full text, v1 non-streaming), ExplainButton, inject into phrase screens. | ⚠️ needs code recon |
| [05](./05-PLAN.md) | 4 | 02,03,04 | **Deploy** (rules-first, point-to-point, App Check) + README/DEPLOY docs. | ⚠️ prod = human gate |

Plans 02 and 03 can run in parallel (both depend only on 01).

## Key files (new)

```
functions/src/explain/
  explain_cache.ts        ← global cache: hash, read, pending-lock, write-ready/rejected
  explain_budget.ts       ← per-user limiter + GLOBAL daily budget breaker
  explain_gates.ts        ← deterministic input gate + output sanitizer (no AI)
  explain_judge.ts        ← heuristic pre-filter + cheap gpt-4o-mini judge (fail-closed)
  explain_provider.ts     ← thin OpenAI wrapper (provider seam)
  explain_prompts.ts      ← generation + judge prompts (content-rules voice)
  explain_reports.ts      ← submitExplainReport + threshold auto-reject
  README.md               ← B-platform extension guide
functions/src/explain_phrase.ts   ← the onCall CF
app/explain_phrase_client.ts      ← typed callable client
app/explain_phrase_flags.ts       ← env-gated flags (default OFF)
app/explain_phrase_request.ts     ← call hook (v1 non-streaming; streaming = increment 06)
components/ExplainSheet.tsx        ← bottom-sheet UI
components/ExplainButton.tsx       ← flag-gated trigger
```

## Reference (clone, don't reinvent)

`premium_dialog.ts` · `ai_dialog_client.ts` · `ai_dialog_flags.ts` · `client_reports.ts`
(`submitClientReport`) · `ReportErrorButton` · `DailyPhraseCard.tsx`

## Non-negotiable invariants

- App Check enforced · identity via `resolveStableUidForAuth` (never body) ·
  `firestore.rules` cache read-only (Admin SDK writes) · **CF NOT in `deploy:safe`** →
  point-to-point deploy · reuse existing `OPENAI_API_KEY`.

## Future hook (B)

This module is the seed of an `ai_content` platform. Adding the next AI content type
(idea #1 auto-daily-phrase, #11 situational, #12 storytelling) = a new prompt + validator +
fallback over the same reusable gates/cache/budget/judge. See `functions/src/explain/README.md`
after Plan 05.
