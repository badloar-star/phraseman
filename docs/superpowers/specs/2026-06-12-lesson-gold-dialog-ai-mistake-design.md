# Lesson Gold Dialog And AI Mistake Design

## Goal

Add a gold-unlocked lesson dialog inside the lesson menu and a smart AI mistake card that explains the user's specific error, while preserving daily AI limits and the existing Phraseman tone.

## Product Shape

The first release covers lessons 18 and 20. These two lessons are a good pilot because their phrase counts were just audited and fixed to 50. The feature should be expandable lesson by lesson without forcing all 32 dialogs to ship at once.

The lesson menu gets a new row named `Диалог`. The row is visible even when locked, but greyed out. It unlocks only when the lesson has a gold result with all 50 lesson cells completed. Tapping a locked row shows a short Phraseman-style hint:

> Пройди урок на золото. Диалог откроется после 50 фраз.

When unlocked, the row opens the existing AI dialog session with a lesson-specific scenario. The dialog itself reuses the existing `ai_dialog_session.tsx`, `ai_dialog_client.ts`, `dialogs_limit_session.ts`, and server callable `premiumDialogSend` instead of introducing a second chat engine.

## UX Rules

- Keep the row in the existing lesson menu list, not as a marketing card.
- Use an Ionicons chat icon, not emoji.
- Minimum touch target stays at least 44px.
- Locked state uses lower opacity plus a lock icon, but remains tappable so the hint is discoverable.
- Copy follows `PHRASEMAN_BIBLE.md`: short, human, direct, no corporate language.
- The row label is `Диалог`.
- The unlocked subtitle is concrete: `Сцена из фраз урока`.
- The locked subtitle is concrete: `Откроется после золота`.

## Existing AI Dialog Reuse

The app already has:

- `app/ai_dialog_flags.ts` with `EXPO_PUBLIC_AI_DIALOG_ENABLED` and `FREE_DIALOGS_PER_DAY_DEFAULT`.
- `app/dialogs_limit_session.ts` with a client-side free dialog gate.
- `app/ai_dialog_session.tsx` with scenario chat UI, TTS, analytics, and paywall handling.
- `functions/src/premium_dialog.ts` with server-side rate limiting, daily quota, billing, model config, App Check, and OpenAI proxying.

The lesson dialog should extend this system instead of bypassing it. Lesson-specific scenarios should be routeable by `scenarioId` but hidden from the generic `ai_dialog_home` catalog unless intentionally exposed later.

## Lesson Scenario Data

Add lesson-specific metadata to `DialogScenario`:

- `sourceLessonId?: number`
- `hiddenFromHome?: boolean`
- `requiredPhraseIds?: string[]`

Add two pilot scenarios:

- `lesson18_restaurant_table`
  - lesson: 18
  - title: `Столик в ресторане`
  - role: `a polite restaurant host`
  - setting: `a casual restaurant entrance`
  - goal: reserve a table, confirm time, and answer a short follow-up
  - required phrases include `lesson18_phrase_31`

- `lesson20_lost_bag`
  - lesson: 20
  - title: `Потерянная сумка`
  - role: `a helpful lost-and-found worker`
  - setting: `a lost-and-found desk`
  - goal: say what you have, where the bag was, and confirm the option
  - required phrases include `lesson20_phrase_1`

These scenarios are not free-form content generators. They are prompts built from verified lesson phrases and should remain short, practical, and beginner-safe.

## Gold Gate

The lesson menu already loads `progress`, `score`, and medal helpers. The dialog unlock condition is:

```ts
const lessonDialogUnlocked = progress >= 50 && getMedalTier(score) === 'gold';
```

If the lesson is locked by normal course rules, the primary lock behavior remains unchanged. The dialog row is a lesson-menu row only; it does not unlock a locked lesson.

## AI Daily Limits

Lesson dialogs must use the existing dialog limits:

- Client UX gate: `getFreeDialogsLeftToday()` / `markFreeDialogUsed()`.
- Server source of truth: `premiumDialogSend.enforceDailyQuota`.
- Free cap remains `FREE_DAILY_CAP = 1` on the server.
- Premium cap remains `PREMIUM_DAILY_CAP = 100` on the server.
- Existing rate limit remains `MAX_PER_WINDOW = 60`.

The client gate is only a friendly UX guard; the server quota remains mandatory. A cache hit does not exist for live dialog turns, so every successful AI dialog turn can count against the existing dialog quota exactly as it does today.

## Smart AI Mistake Card

The mistake feature is separate from the dialog feature because it answers a different user need. It appears inside the lesson after a wrong answer, near the existing explanation area.

The card must explain the user's actual mistake, not a generic hardcoded rule. The request payload must include:

- `lessonId`
- `phraseId`
- `targetAnswer`
- `userAnswer`
- `selectedWrongWord` when available
- `expectedWord` when available
- `studyTarget`
- `interfaceLang`

The server prompt must explicitly say:

- Explain only the mismatch between `userAnswer` and `targetAnswer`.
- If `selectedWrongWord` and `expectedWord` are present, focus on that pair.
- Do not invent a different error.
- If the answer is too ambiguous, say what the correct answer is and give one short contrast.
- Output plain text only.

## AI Mistake Limits

The mistake card needs its own smaller quota because it can be triggered after many wrong answers.

Client:

- `FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT = 3`
- local key: `ai_mistake_explain_session_v1`
- show remaining count in the smart card CTA
- do not decrement locally until the callable returns `ok: true`

Server:

- new callable `explainMistake`
- collection: `mistake_explain_quotas`
- free daily cap: 3
- premium daily cap: 30
- rate collection: `mistake_explain_rate_limits`
- billing collection: `mistake_explain_billing`
- App Check and auth required by the same pattern as `premiumDialogSend` and `explainPhrase`
- do not call OpenAI when quota is exhausted, request is invalid, or input is too long

Safety:

- truncate user input before prompt construction
- never log full user answer beyond existing billing metadata
- return friendly fallback on provider failure
- no raw provider errors in UI
- no markdown, no emojis, no multi-paragraph lectures

## Testing Strategy

Use TDD. Add tests before implementation.

Client tests:

- Lesson dialog row exists in `lesson_menu.tsx`.
- Locked hint text exists and row remains tappable.
- Unlock condition requires both `progress >= 50` and `getMedalTier(score) === 'gold'`.
- Lesson scenarios reference existing phrase ids.
- Home dialog catalog still shows only the existing 20 public scenarios.
- AI mistake client limit defaults to 3 and resets by date.
- Smart card source uses `selectedWrongWord`, `expectedWord`, `userAnswer`, and `targetAnswer`.

Function tests:

- `explainMistake` rejects unauthenticated calls.
- `explainMistake` rejects missing phrase/user/target fields before quota/OpenAI.
- Daily quota blocks the fourth free request.
- Provider is not called on quota exhaustion.
- Prompt contains the user answer, target answer, selected wrong word, and expected word.
- Response is plain text and truncated to UI-safe length.

## Rollout

This is a small, gated rollout:

1. Add lesson dialog row and two hidden lesson scenarios.
2. Reuse existing AI dialog screen and server quota.
3. Add AI mistake card behind a small daily limit.
4. Run targeted Jest and lesson section audit.
5. Expand scenarios only after QA confirms lesson 18 and 20 feel useful.

