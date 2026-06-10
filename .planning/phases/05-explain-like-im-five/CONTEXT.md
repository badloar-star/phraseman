# Phase 5 — Explain Like I'm Five — Context

**Created:** 2026-06-09
**Milestone:** v1.2 — AI Content (new milestone, see note below)
**Phase numbering:** v1.0 used 1–3, v1.1 reserved 5+; this is **Phase 5**.

> **Milestone note:** This feature is NOT part of Friends MVP (v1.0) or Apple Watch (v1.1).
> It opens a new content-generation track. Treated as standalone phase 5 under a de-facto
> "AI Content" milestone. Roadmap updated to append this phase.

---

## What we're building

A **"Объясни как для 5-летнего"** button on any phrase. Tap → a bottom-sheet slides up
from the bottom showing a dead-simple explanation of that specific phrase, written in the
project's content-rules voice (как для детей, бытовой пример).

Explanations are **globally cached** in Firestore: the first user to request a phrase
triggers generation; the validated result becomes public for **all** users. After that,
the phrase costs **zero** AI calls forever.

---

## Locked decisions (from discussion 2026-06-09)

| Decision point | Choice | Rationale |
|---|---|---|
| **Cache visibility** | Public to all, AFTER auto-validation passes | One bad answer would reach thousands; validate before publishing |
| **Model** | `gpt-4o-mini` | Already wired in `premium_dialog.ts`, secret exists, zero new infra |
| **Generation UX** | Stream tokens to the **triggering** user only | "Wow" effect for the one who waits; cache-readers get full text instantly |
| **Streaming transport** | **Deferred to fast-follow** — v1 ships with skeleton-loader + full-text-on-arrival; streaming is a separate later increment | `httpsCallable` (the cloned client) CANNOT stream, and NO existing CF streams — there is no transport to clone. Building SSE (`onRequest` + `text/event-stream`) is its own chunk. We do NOT block the feature on it; we ship non-streaming, then add streaming as increment 06. See "Streaming: explicit status" below. |
| **Validation** | **Separate AI-judge call** (`max_tokens ~30`, strict JSON `{ok, reason}`) + heuristic pre-filter + cached verdict (incl. reject) | Public content asymmetry: cost ≈ pennies, cost of a public mistake is high. Self-check rejected (author≈judge bias). Heuristic alone misses "smooth nonsense". |
| **Who validates** | **Server (CF) only** — client never decides "good/bad" | phraseman invariant: never trust body; the client would bypass it |
| **Abuse / cost guard** | **Global daily budget breaker** on generations (cache reads are free & unlimited) | Protect the wallet from a viral spike; reads don't call AI |
| **Approach** | Clone & extend `premium_dialog.ts`, with gates/cache/budget in **separate functions** (not inline) — "B-readiness" | Ship fast now; cheap refactor into an `ai_content` platform later (idea #1 auto-daily-phrase, #11, #12 are queued) |

---

## Validation = defense in depth (4 levels, different owners)

| Level | What | Owner | When | AI cost |
|---|---|---|---|---|
| 1 | Input (non-empty, ≤200 chars, not junk) | **Code** (CF, deterministic) | before gen | none |
| 2 | Output format (length, no markdown junk, non-empty) | **Code** (CF) | after gen | none |
| 3 | Meaning/safety (right language, not toxic, on-topic, kid-friendly) | **AI judge** (2nd gpt-4o-mini call) | after gen, before cache write | 1 cheap call |
| 4 | Final oversight (users flag "bad explanation") | **Humans** (reports) → threshold → auto-reject | post-hoc | none |

**Order (the conceptual flow; v1 sends full text, not a live stream — see "Streaming: explicit status"):**
generate (v1: full text to live user; future: stream) → assemble full text → judge → if `ok`
write to **public cache**; if not `ok`, the live user keeps what they already read, but it
**never enters the shared cache** (others get fallback / fresh regen). We risk showing raw text
to one trigger, never to all. The judge protects the *cache*, not the individual.

**Heuristic pre-filter runs BEFORE the judge** (skip judge for obvious garbage = 0 calls);
judge has the final say on what passes the cheap filter. **Reject verdicts are cached** so
spamming a "bad" phrase can't burn budget on re-generation.

Even a perfect judge is probabilistic → **level 4 (reports) is mandatory regardless.**

---

## Streaming: explicit status (do not let this decision vanish)

You chose word-by-word streaming. Reality check from the codebase: the cloned client
`ai_dialog_client.ts` uses `httpsCallable` (single request→response, **cannot** stream), and
**no existing CF streams** (no `text/event-stream` / `res.write` precedent). So streaming is a
real piece of NEW transport work, not a free flag.

**Decision: split it out, don't fake it.**
- **v1 (this phase, plans 01–05):** ship NON-streaming. Trigger user sees a skeleton-loader
  ("👶 готовлю объяснение…") then the full text on arrival. Cache-readers get instant full text.
  This is a complete, shippable UX. The `must_haves` reflect this — no plan asserts "tokens
  arrive incrementally," so the downstream verifier won't false-pass a missing feature.
- **Increment 06 (fast-follow, NOT in this phase):** add an `onRequest` SSE endpoint
  (`text/event-stream`) parallel to the callable, and a client reader that renders chunks for
  the trigger user only. The final assembled text still goes through judge → cache exactly as v1.
  Tracked as a follow-up; create it after Phase 5 lands.

This way the "wow streaming" idea is preserved and owned (increment 06), not silently dropped,
and v1 isn't blocked on transport plumbing.

## Security invariants (phraseman — non-negotiable)

- **App Check** enforced on the CF (`ENFORCE_APP_CHECK` from `callable_options.ts`).
- **Identity from `request.auth.uid`** via `resolveStableUidForAuth(db, authUid)` — NEVER from `body`.
  (This is the project's main bug-class per SECURITY_AUDIT_2026-06-07.)
- **`firestore.rules`**: explanation cache is `allow read: if true; allow write: if false;`
  — only Admin SDK (the CF) writes. The client NEVER writes public content.
- **CF is NOT in `deploy:safe` whitelist** (same as `premiumDialogSend` — note: `onArenaSessionAborted` and `submitClientReport` ARE in the whitelist, so `premiumDialogSend` is the correct not-in-whitelist reference)
  → point-to-point deploy: `firebase deploy --only functions:explainPhrase`. **Must be documented.**
- **Reuse existing `OPENAI_API_KEY`** secret (`defineSecret`) — no new secret.

---

## Reference files (clone/extend, do NOT reinvent)

| Reference | Path | What we copy |
|---|---|---|
| CF gates/quotas/OpenAI | `functions/src/premium_dialog.ts` | Whole skeleton: App Check, identity, tx rate-limit, daily quota, fetch→OpenAI, billing doc |
| CF moderation/reports | `functions/src/client_reports.ts` + `submitClientReport` (line 218) | Report submission pattern, rate doc id, config-by-kind |
| Client | `app/ai_dialog_client.ts` | `httpsCallable` wrapper, App Check init, typed req/resp |
| Flags | `app/ai_dialog_flags.ts` | env-override flags, default OFF, cohort rollout |
| Report button | `ReportErrorButton` (variant `icon-flag`) | VISUAL only — it hardcodes `submitErrorReport`; needs a `reportType`/`onReport` prop or a thin `ExplainReportButton` wrapper calling `submitExplainReport`. NOT reusable as-is. |
| Phrase card | `components/DailyPhraseCard.tsx` | One injection point for the button |
| Content voice | `~/.claude` content rules + project CONTENT_AUDIT | Prompt style: "как для детей", exactly-simple, бытовой пример |

---

## Cost model (sanity)

- Cache HIT (≥99% of traffic): **0 tokens, $0**.
- Cache MISS (once per phrase, ever): **2 calls** — generate (~200 out tokens) + judge (~30 out tokens), both `gpt-4o-mini`.
- Global daily budget breaker caps worst-case spend by construction.
- At scale this is single-digit dollars/month; feels like "personal AI per user".

---

## Out of scope (this phase)

- The generalized `ai_content` platform (that's the future B-refactor; we only leave seams).
- Premium gating (this feature is **free for everyone** — that's why budget breaker matters).
- Other content types (daily-phrase auto-gen, situational translation) — separate phases.
- Claude/Haiku provider (we chose gpt-4o-mini; provider abstraction is a seam, not built).
