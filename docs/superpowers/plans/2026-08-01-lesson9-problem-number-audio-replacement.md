# Lesson 9 Problem Number Audio Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace lesson 9's ambiguous `question/questions` pair with an explicit `problem/problems` pair in every supported lesson surface and replace the two stale English audio clips.

**Architecture:** Treat `lesson9_phrase_3` and `lesson9_phrase_4` as stable identities while changing their multilingual content. Remove the temporary grammatical-number UI because the new translations encode number directly. Let the existing audio-sync pipeline detect the text drift, regenerate only those two IDs, overwrite their existing Storage objects, and rebuild the normalized runtime map.

**Tech Stack:** TypeScript, React Native, Jest, Node.js audio maintenance scripts, OpenAI `/v1/audio/speech`, Firebase Storage/Hosting.

---

### Task 1: Lock the approved lesson content with regression tests

**Files:**
- Modify: `tests/lesson_phrases_regression.test.ts`
- Modify: `tests/lesson_intro_screens_locale.test.ts`
- Modify: `tests/bug_report_content_regression.test.ts`
- Modify: `tests/lesson_screen_bootstrap.test.ts`

- [ ] **Step 1: Replace the temporary badge assertions with exact phrase assertions**

Assert that `lesson9_phrase_3` and `lesson9_phrase_4` contain exactly:

```ts
expect(singular).toMatchObject({
  english: 'Is there a problem?',
  russian: 'Есть проблема?',
  ukrainian: 'Є проблема?',
  spanish: '¿Hay un problema?',
});
expect(plural).toMatchObject({
  english: 'Are there problems?',
  russian: 'Есть проблемы?',
  ukrainian: 'Є проблеми?',
  spanish: '¿Hay problemas?',
});
```

Also assert the expected English and Spanish token surfaces and the absence of `targetGrammarNumber`.

- [ ] **Step 2: Update intro-screen expectations and assert the badge implementation is absent**

Use the new English keys and translated values in the intro test. Replace the badge-preservation and badge-rendering tests with source guards that reject `targetGrammarNumber`, `lessonGrammarNumberLabel`, and `lesson1-grammar-number-hint`.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
npx jest tests/lesson_phrases_regression.test.ts tests/lesson_intro_screens_locale.test.ts tests/bug_report_content_regression.test.ts tests/lesson_screen_bootstrap.test.ts --runInBand
```

Expected: the new lesson 9 assertions fail because production data still contains `question/questions` and the badge metadata/UI still exists. Unrelated pre-existing failures in whole source-contract files must be separated with named-test runs rather than hidden.

### Task 2: Replace content and remove the rejected badge approach

**Files:**
- Modify: `app/lesson_data_9_16_phrases_es.gen.ts`
- Modify: `tools/replace_lesson9.py`
- Modify: `app/lesson_intro_screens_lesson9_v2.ts`
- Modify: `app/lesson_help_theory_data.tsx`
- Modify: `app/lesson_data_types.ts`
- Modify: `app/phrase_target_utils.ts`
- Modify: `app/lesson1.tsx`
- Modify: `tools/prompt007_es_phrase_words.ts`

- [ ] **Step 1: Replace the two lesson records and token arrays**

Keep IDs stable and set the four language strings to the approved matrix. Update Spanish tokens to `¿ / Hay / un / problema / ?` and `¿ / Hay / problemas / ?`; update English tokens to `Is / there / a / problem` and `Are / there / problems`, preserving the file's existing distractor structure.

- [ ] **Step 2: Keep the lesson maintenance source aligned**

Apply the same phrase, translation, and token changes in `tools/replace_lesson9.py` so a later regeneration cannot restore the old pair.

- [ ] **Step 3: Update lesson 9 teaching surfaces**

Replace only lesson 9 examples that teach the changed pair in `app/lesson_intro_screens_lesson9_v2.ts` and `app/lesson_help_theory_data.tsx`. Do not alter unrelated examples where asking about questions is the intended vocabulary.

- [ ] **Step 4: Remove temporary grammatical-number plumbing**

Delete `LessonTargetGrammarNumber`, `targetGrammarNumber`, `LESSON_GRAMMAR_NUMBER_LABELS`, `lessonGrammarNumberLabel`, generator serialization, and the `lesson1-grammar-number-hint` render/styles/imports. Preserve all unrelated user edits in those dirty files.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the four focused Jest files or, where a file has a known unrelated source-contract failure, run the named changed tests with `-t`. Expected: every changed assertion passes.

### Task 3: Update prepared report replies and preview

**Files:**
- Modify: `replies.json`
- Modify: `admin/v2/legacy.html`

- [ ] **Step 1: Make the two Ukrainian replies describe the actual fix**

Use wording equivalent to:

```text
Ми замінили неоднозначні фрази на «Є проблема?» та «Є проблеми?», де однина й множина відрізняються без додаткового контексту.
```

Preserve report IDs, shard awards, resolution metadata, every other prepared reply, and unrelated admin edits.

- [ ] **Step 2: Dry-run the reply payload**

Run the repository's `reply_to_reports.mjs` dry-run command for `replies.json`. Expected: valid payload with no Firestore writes, notifications, status changes, or awards.

- [ ] **Step 3: Run focused admin preview contracts**

Run the existing prepared-reply and single-surface contract tests. Expected: both pass.

- [ ] **Step 4: Deploy and verify only the admin Hosting target**

Run `npm run hosting:admin`, then fetch the live `legacy.html` and confirm both report IDs contain the new wording. Do not invoke `reply_to_reports.mjs --send`.

### Task 4: Regenerate and replace the two audio clips

**Files:**
- Modify: `.codex-tmp/tts-voicing/audio_url_map.json`
- Modify: `app/phrase_audio_url_map.generated.ts`
- Generated/overwritten remotely: `phrase-audio/lesson/lesson9_phrase_3.mp3`
- Generated/overwritten remotely: `phrase-audio/lesson/lesson9_phrase_4.mp3`

- [ ] **Step 1: Run the audio-sync dry-run**

Run:

```powershell
node scripts/regen_phrase_audio_storage.mjs
```

Expected: exactly `lesson9_phrase_3` and `lesson9_phrase_4` are reported as stale-text drift for this change.

- [ ] **Step 2: Generate and upload with narrow guards**

In one PowerShell process, set `PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1` and `PHRASEMAN_ALLOW_UPLOAD=1`, then run `node scripts/regen_phrase_audio_storage.mjs --apply`. The script must read only `OPENAI_TTS_API_KEY`, generate two clips, validate them with ffmpeg, overwrite the same two Storage object paths, patch canonical metadata, and rebuild the runtime map.

- [ ] **Step 3: Verify audio content and mapping**

Run the audio audit again. Assert zero drift for both IDs, new normalized keys `is there a problem?` and `are there problems?`, no old normalized keys for the two IDs, and unchanged Storage URLs/object names.

### Task 5: Final verification and review

**Files:**
- Review all modified files listed above.

- [ ] **Step 1: Run targeted content, lesson, audio, and admin gates fresh**

Capture exit codes and pass/fail counts. Do not claim whole-project health from targeted gates.

- [ ] **Step 2: Inspect the scoped diff**

Confirm no unrelated dirty work was overwritten, no old badge code remains, and only the intended lesson 9 examples changed.

- [ ] **Step 3: Request TypeScript review**

Have the TypeScript reviewer inspect the scoped TS/TSX diff for type safety, UI regressions, token integrity, and accidental changes. Resolve any findings and rerun affected gates.

- [ ] **Step 4: Report exact evidence**

Report the changed phrase matrix, the two overwritten audio IDs, admin preview URL, fresh test counts, and any known unrelated failures without claiming they were fixed.
