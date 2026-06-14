# Pre-release scenario audit — Phraseman (2026-06-13)

> **FIX STATUS (2026-06-14):** Fixed & committed on `master` (`91c3e2e7`, `96ff09f4`, `26ed526b`):
> **C1** (plan feedback localized ru/uk/es), **C2** (nameReserve bounded with 15s client timeout in
> `firestore_leaderboard.ts` — does NOT touch the locked onboarding.tsx; onboarding already handles the
> 'error' result), **M1** (mojibake), **M8** (day-comparison localized), **M12** (Privacy/Terms labels
> localized), **M13** (AI free-limit copy), **H4** (referral_enabled→true). 9/10 affected suites pass
> (65/67); tsc has zero new errors in touched files.
> **NOT fixed** — H1/H2/H3 live in `components/onboarding.tsx`, edited in a parallel session (left untouched
> per workflow rules; redo when free).
> **M4 was a FALSE POSITIVE** — the friend-gift sender fallback `L('друг','друг','amigo',…)` is the 8-arg
> `triLang` wrapper, so it DOES localize per language (Polish→`znajomy`); no fix needed.
> **Pre-existing reds (NOT mine):** `leaderboard_identity_and_league_membership_contract` fails 2 assertions
> that pin exact strings another session changed (an import line gained `waitForAnonAuth`; `league_groups.ts`
> has 4 `requireKnownIdentity` vs the test's expected 3); `settings_name_save_contract` fails because another
> session removed `const Row =` from settings.tsx. All three predate this work (verified at `45277093`).


**Method:** 96 user scenarios simulated across 12 spheres by parallel read-only agents that traced
the real code/copy, then HIGH/CRITICAL findings were adversarially re-verified against the source by
a second wave. Branch `master` @ `45277093`. 16 agents, ~1.47M tokens, 678 tool calls.

**Scoring:** negativity (1–5, how bad it feels) × risk (1–5, likelihood × blast radius) = composite (1–25).
- CRITICAL ≥16 · HIGH 9–15 · MEDIUM 4–8 · LOW <4

**Prod-reachability gate (critical context):** In STORE builds only `ru`/`uk` interface languages are
shown (`INTERFACE_LANG_READY_FOR_PROD=['ru','uk']`); `es` UI gated by `SPANISH_UI_LOCALE_ENABLED=false`;
`pt-BR/vi/id/tr/pl` UI is **hidden** in prod. So a missing `vi/tr/pl` *UI* string is NOT user-facing now
(scored low). Learning **content** (quizzes/packs/plans) spans more locales and IS reachable.
`triLang` fallback for an omitted key is **Spanish**, then Russian.

**Counts:** 48 findings — 2 critical · 4 high · 14 medium · 28 low. 1 refuted by verification.

---

## Verified live-build facts (resolved during audit)

- **AI dialog is ON in prod.** `eas.json` `production` profile sets `EXPO_PUBLIC_AI_DIALOG_ENABLED=true`
  (default in code is also `?? true`). So AI-dialog copy/error findings ARE prod-facing.
- **Prices are clean** — all sourced from RevenueCat store strings, never hardcoded; multi-currency parse OK.
- **Purchase / restore / celebration flows** — correct, no data loss.
- **Testimonials** — safe by design: all drafts are `verified:false`, prod uses `includeUnverified=false`,
  block doesn't render, CI-gated. BUT there is a standing `TODO(before release)` — **paywall ships with zero
  testimonials** (lost social proof, not a bug).
- **lesson_complete P0** (ReviewModal vs AchievementNotif collision) — verified FIXED.
- **Distractors** — always exactly 6 options, dedup guaranteed.
- **Yearly preselected** as default on all 3 paywall variants (intended).
- **Deep links / +not-found** — unmatched routes redirect to home, no crash.

---

## CRITICAL (composite ≥16)

### C1 — Personal-plan exercise feedback is hardcoded Russian → Ukrainian users see RU
- **composite 16** (neg 4 × risk 4) · category: missing_text / wrong_language · confidence: high · **independently confirmed**
- `app/personal_plan_exercise.tsx:779–790` — `resultModalTitle`/`resultModalBody` use `explanation?.titleRu`
  and **Russian-literal fallbacks** (`'Еще один заход'`, `'Разберем спокойно'`, `'Так звучит естественно.'`)
  with **no `triLang()` wrapper**. `buildPhraseExplanation()` returns only `titleRu/correctRu/wrongRu`
  (`personal_plan_phrase_explanation.ts:17–21,167–195`).
- **uk is a prod-visible language.** Personal plan is rendered on home (`PersonalPlanHomeRouteCard`), not dev-gated.
- **Impact:** every Ukrainian user, after every plan exercise, reads the explanation/feedback in Russian.
  Core learning surface, just expanded heavily in Ф4.
- **Fix:** add `titleUk/correctUk/wrongUk` (+`es`) to `PhraseExplanation`, populate in `buildPhraseExplanation`,
  wrap title/body in `triLang(lang, {ru, uk, es})`.

### C2 — Name reservation has no client timeout → up to ~70s dead "Продолжить" on flaky network
- **composite ~9–16** (agent scored 16; I downgrade to ~9 HIGH — see nuance) · category: logic_bug/stuck_state · confidence: high · **independently confirmed + corrected**
- `firestore_leaderboard.ts:109–110` calls `httpsCallable('nameReserve')` and `await fn(...)` with **no
  client-side timeout** (unlike `cloud_sync.ts`). The recent H-ENTER fix added timeouts to `signInWithProvider`
  but **not** to `nameReserve`.
- **Correction to agent claim:** it is NOT an infinite freeze. `handleNameDone` (`onboarding.tsx:971–975`)
  wraps the call in try/catch → a thrown/rejected error sets `result='error'` and `setNameBusy(false)` runs
  (line 986). Firebase callable has a ~70s default timeout, so worst case is a **disabled button for up to
  ~70 s with no feedback**, then a proper error message — bad UX, not a permanent hang.
- **Impact:** on first-run with poor connectivity the user taps "Продолжить" and stares at a dead button for
  up to ~70 s. Common on the most fragile path (onboarding, mobile data).
- **Fix:** `Promise.race([reserveName(...), timeout(15_000)])` in `onboarding.tsx:972`, or add a `withTimeout`
  to the `callable()` in `firestore_leaderboard.ts` like `cloud_sync.ts` does.

---

## HIGH (composite 9–15)

### H1 — Onboarding stuck state after crash between name-save and onboarding-done
- **composite 12** (neg 4 × risk 3) · stuck_state · high · verified real
- `app/_layout.tsx:1610` decides re-onboarding from `onboarding_done` ALONE. If the app dies after
  `user_name` is written (`onboarding.tsx:1000–1003`) but before `handleFinishOnboarding` sets
  `onboarding_done` (line 1056/1009), reopen restarts onboarding, the name field is blank, and re-entering
  the same name hits the server reservation → **"Это имя уже занято"**. No code detects this or auto-skips.
- **Impact:** small but real crash window → user can't pass the name step with their own name; must pick a
  different name or wipe app data.
- **Fix:** in `_layout.tsx`, if `onboarding_done` missing AND `user_name` present → treat onboarding as done
  (or prefill the name and skip the reserve on unchanged name).

### H2 — First-run language detection: pt-BR/vi/id/tr/pl device → Russian UI (not their language)
- **composite 9** (neg 3 × risk 3) · logic_bug · high
- `components/onboarding.tsx:571–585` `detectLang()` only accepts a device locale if `isInterfaceLangEnabled(...)`,
  which is false for everything except ru/uk(/es). A Brazilian/Vietnamese/etc. device falls through to **ru**.
- **Impact:** correct-by-policy (those UIs aren't translated yet) but a Brazilian user opening the app sees
  **Russian**, not English/Portuguese — high bounce risk. Consider falling back to **English** or the nearest
  enabled language rather than Russian for non-CIS locales.

### H3 — Onboarding may commit a hidden language to storage
- **composite 9** (neg 3 × risk 3) · logic_bug · high
- Same `detectLang` path can write `app_lang='pt-BR'` to AsyncStorage (`onboarding.tsx:1001`) even though
  Settings hides pt-BR in store builds → possible UI/state inconsistency (stored lang not in the visible picker).
- **Fix:** clamp detected lang through `coerceInterfaceLang()` before persisting.

### H4 — `referral_enabled` defaults OFF in prod
- **composite 9** (neg 3 × risk 3) · logic_bug · high · (known, recurring)
- `app/remote_flags.ts:64` `referral_enabled: false`. Until an admin flips it in Remote Config, the whole
  referral feature is dark (empty referral cards, invite does nothing). Matches the long-standing note that
  this flag must be enabled + invite page deployed before relying on referrals.
- **Action:** decide intentionally — enable in RC for launch, or accept referrals are off at GA.

---

## MEDIUM (composite 4–8) — 14 findings

| # | Finding | File | neg×risk | Note |
|---|---------|------|----------|------|
| M1 | **Mojibake in friend-search "not synced" error** — `a?n no est?`, `n?o est?`, Turkish `hen?z`/`a??p`, Polish `Otw?rz`/`spr?buj`/`urz?dzeniu` (`?` replaced accents) | `app/(tabs)/friends.tsx:1792–1797` | 2×2 | Real source corruption; es/pt/tr/pl UI hidden in prod so not user-visible NOW, but fix the strings — same paste-corruption risk elsewhere (also `_admin_settings_testers.tsx`). |
| M2 | Onboarding crash loses `onboarding_done` → forced re-onboard | `_layout.tsx:1610,1651` | 4×2 | Related to H1; broaden the "already onboarded" signal. |
| M3 | Thank-you screen missing pt-BR/vi/id/tr/pl keys → es/ru fallback | `personal_plan_thank_you.tsx:34–103` | 3×2 | Not prod-visible (langs hidden); fix before enabling those UIs. |
| M4 | Friend-gift sender fallback name hardcoded `'друг'` for all langs | `app/(tabs)/friends.tsx:2844` | 2×3 | uk users with a missing sender name see RU "друг". |
| M5 | Level exam: no client-side weekly XP cap visible (league-break risk) | `level_exam.tsx`, `xp_manager.ts:104–150` | 3×2 | low confidence; verify server enforces the 10000/wk cap (economy-audit item). |
| M6 | Some onboarding strings inconsistent uk/ru | `onboarding.tsx:944–992,1125` | 2×2 | low confidence; spot-check uk error copy. |
| M7 | Emoji/multibyte name passes 20-char JS check but server may reject by byte length → opaque "Имя не проверилось" | `onboarding.tsx:2459`, `settings/profile_name_service.ts:16` | 2×2 | edge case; align client/server length rule. |
| M8 | `planDayComparisonLine()` returns Russian only | `personal_plan_day_comparison.ts:46–48` | 2×2 | uk users see RU "Ты в топ X%". Wrap in triLang. |
| M9 | Arena idle queue-hint interval may show stale counts after backgrounding | `arena_lobby.tsx:519–521` | 2×2 | cosmetic; restart interval on refocus. |
| M10 | iOS clipboard referral attribution: deny → silent no-retry | `referral_clipboard.ts:43–68` | 2×2 | manual entry still works. |
| M11 | Energy-refill success toast missing pt-BR/vi/id/tr/pl → RU fallback | `energy_shard_refill.ts:60–67` | 2×2 | not prod-visible now. |
| M12 | **Privacy Policy / Terms of Use hardcoded English** in Settings | `app/(tabs)/settings.tsx:1053–1064` | 2×2 | **Prod-visible to ru/uk users** — two English menu items. Easy localize. |
| M13 | AI free-dialog limit copy says singular "диалог" but limit is 10/day | `ai_dialog_client.ts:93` | 2×2 | **Prod-facing** (AI dialog is ON). Pluralize. |
| M14 | Flashcards: no visible zero-card guard in sampled code | `flashcards_swipe.tsx`, `_audio.tsx`, `_collection.tsx` | 2×2 | low confidence; confirm empty-deck handling below line 100. |

---

## LOW (composite <4) — 28 findings (selected)

- Spanish gift typo `proteccion`→`protección`, `dia`→`día` (`friend_gifts.ts:71`).
- Turkish referral-ended modal phrasing slightly non-native (`referral_access_ended_modal.tsx:66`).
- Referral entry label "Код друга" could read as friend-code (`referral_code_entry.tsx:241`) — clarify to "код приглашения".
- iOS referral share message lists invite URL twice (`referral_invite_share.ts:150–168`).
- Spanish lesson-9/22 v2 intros contain English text (dev-only; SPANISH_UI off in prod).
- Duplicate `dialog_limit` in `premium_context.ts` union+array (benign, code-quality).
- Diagnostic/arena_join/various toasts define or omit non-prod langs (future-proofing, not user-visible now).
- (full list in raw findings JSON)

---

## Refuted by verification (false positive)

- "All testimonials are unverified → bug" — **NOT a bug.** Intentional safe-default: drafts `verified:false`,
  prod `includeUnverified=false`, block hidden, CI-gated. (Standing TODO to add real testimonials remains.)

---

## Recommended pre-release punch list (by ROI)

1. **C1** — localize personal-plan exercise feedback (uk currently sees Russian). Highest user-facing fix.
2. **C2/H1/M2** — onboarding robustness: client timeout on `nameReserve` + broaden "already onboarded" detection. Protects the funnel entry.
3. **H4** — decide `referral_enabled` for launch (flip in RC or accept off).
4. **H2/H3** — non-CIS device language fallback → English (not Russian); clamp stored lang.
5. **M12/M13** — localize Privacy/Terms labels; pluralize AI dialog limit copy. Quick wins, prod-visible.
6. **M1** — fix the mojibake strings now (cheap), even though hidden, to stop the corruption spreading.

## Clean / no findings
- **S4 Quizzes & thematic packs** — 0 findings (content present, limits correct).
- Pricing, purchase, restore, percentile, winback, lifetime/annual logic — clean.
