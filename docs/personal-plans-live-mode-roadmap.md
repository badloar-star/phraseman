# Personal Plans Live Mode Roadmap

## Current Truth

Personal Plans must be built mode-first. A day is not product-ready just because it has cards and copy. A day is ready only when every task opens a real exercise mode, records attempts, explains answers, and affects progress honestly.

## Live Status

| Mode | Status | What It Does Now | Next Gate |
| --- | --- | --- | --- |
| `linked_lesson_slice` | live | Opens the normal lesson shell and counts only required phrases. | Keep tied to exact lesson phrase IDs. |
| `plan_phrase_lesson` | live via lesson shell | Uses approved plan phrases with the existing phrase builder. | Keep no correct-word highlighting during plan practice. |
| `plan_missing_word` | live MVP | Opens `/personal_plan_exercise`, asks for one missing word, stores attempts, explains after answer. | Add to more days and feed wrong attempts into daily carryover. |
| `plan_phrase_recall` | standalone MVP | Opens `/personal_plan_exercise`, shows wrong/skipped attempts from the current `planInstanceId` first, then day phrases, asks the user to type the full phrase without choice hints, and counts only correct answers. | Add richer recall scheduling across days and feed resolved/unresolved recall into analytics. |
| `plan_quiz` | live | Opens a dedicated 10-question quiz by `planQuizId`. | Add per-day quiz passport for every day. |
| `plan_choose_natural_phrase` | live MVP | Opens `/personal_plan_exercise`, asks the user to choose the phrase that matches the meaning, stores attempts, explains after answer. | Add to Gavan Day 2 once Day 2 content is authored. |
| `plan_listen_choose` | in-app audio MVP | Opens `/personal_plan_exercise`, builds listening choices, records attempts only when approved audio is present, and plays approved remote audio through `expo-audio` with `downloadFirst`. Missing audio shows a blocker instead of fake playback. | Add approved audio assets for real plan content and polish waveform/progress feedback. |
| `plan_listen_build` | in-app audio word-bank MVP | Opens `/personal_plan_exercise`, plays only approved remote audio, asks the user to assemble the heard phrase from words, and records only correct full phrases as progress. Missing audio shows the same blocker as listen-choose. | Add approved audio assets, richer distractor rules, and per-word timing feedback after the audio pipeline is real. |
| `plan_pronunciation_repeat` | recording MVP | Opens `/personal_plan_exercise`, asks the user to record the phrase, requires playback before completion, stores safe recording metadata, and avoids fake scoring claims. | Add a real ASR/scoring adapter after recording quality gates, then switch selected tasks to scored practice. |

## Audio Gate

Listening modes now have a shared audio requirement manifest. It scans every `plan_listen_choose` and `plan_listen_build` block, checks the linked `PlanAudioAsset`, and reports production-ready versus production-blocked audio. Placeholder audio remains valid for authoring, but it blocks release until an approved final asset with `assetId`, `uri`, `durationMs`, `voiceId`, `provider`, and `finalAssetReady` exists.

## Audio Generation Queue

Gavan week 1 now has a dry-run audio generation plan at `.codex-tmp/personal-plans/gavan-week1-audio-generation-plan.json`. It builds deterministic OpenAI audio jobs from the audio manifest without calling the API and without claiming generated assets exist. The dry run now creates one job per content unit: 10 jobs for Gavan week 1. Each job has a stable `expectedAssetId`, `outputPath`, source block, phrase text, provider, and voice id, so every phrase can be generated, reviewed, replaced, cached, and approved independently.

Next production-quality step: add a real audio worker that writes generated files, probes duration, records generated `PlanAudioAsset` metadata, and keeps release blocked until a separate approval gate promotes each asset to approved/final.

There is also a generated-asset inspector at `.codex-tmp/personal-plans/gavan-week1-generated-audio-assets.json`. It reads the 10 jobs, checks whether the generated files exist, probes duration with `ffprobe`, and converts only valid files into `generated` non-final `PlanAudioAsset` metadata. In the current repository state it correctly reports `0` assets and `10` blockers because the real mp3 files have not been generated yet.

The OpenAI audio worker is now available as a safe CLI: `npx tsx tools/personal_plan_gavan_week1_generate_openai_audio.ts`. Without flags it is dry-run only and writes `.codex-tmp/personal-plans/gavan-week1-openai-audio-generation-dry-run.json`. Real generation requires explicit `--execute` plus `OPENAI_API_KEY`; `--limit=N` can generate a small batch first. Generated files still become only `generated` assets after the inspector step, never approved/final.

Audio approval now has a separate pure gate. It promotes only valid `generated` assets to `approved` and `finalAssetReady: true` when each asset has an explicit reviewer id, ISO approval timestamp, and checksum over stable audio metadata. The gate blocks partial approval, unknown asset ids, invalid reviewer metadata, generated-file drift after review, invalid audio readiness, and tampered approved outputs.

Gavan week 1 also has a reviewer-facing audio approval report at `.codex-tmp/personal-plans/gavan-week1-audio-approval-report.json`, produced by `npx tsx tools/personal_plan_gavan_week1_audio_approval_report.ts`. It never self-approves; it reports which generated files are ready for human audio review, which generation blockers remain, and which approval records would be needed. In the current repo state it correctly reports `0` ready for review and `10` blocked.

## Gavan Week 1 Mode Order

### Day 1: Short Calm Answers

Goal: answer with very short, general phrases without personal data.

Order:
1. `linked_lesson_slice`: lesson 1, exact phrases for `I am / you are / it is`.
2. `plan_phrase_lesson`: five general short replies.
3. `plan_missing_word`: insert one missing word from already introduced phrases.
4. `plan_quiz`: 10 questions from the same day material.

### Day 2: Ask To Repeat And Slow Down

Goal: ask for repetition or slower speech.

Order:
1. `linked_lesson_slice`: lesson prerequisite.
2. `plan_phrase_lesson`: short repeat/slow-down phrases.
3. `plan_choose_natural_phrase`: choose the most natural phrase for a clear intent.
4. `plan_phrase_recall`: recall Day 1 misses and Day 2 phrases.

### Day 3: Say You Need A Moment

Goal: buy time without freezing.

Order:
1. `linked_lesson_slice`.
2. `plan_missing_word`.
3. `plan_listen_choose` only after approved audio assets exist; otherwise the day passport must block release.
4. `plan_quiz`.

### Day 4: Clarify One Detail

Goal: ask one simple clarification.

Order:
1. `linked_lesson_slice`.
2. `plan_phrase_lesson`.
3. `plan_choose_natural_phrase`.
4. `personal_practice_seeded` only if due material exists.

### Day 5: Agree Or Push Back Softly

Goal: agree, say not sure, or ask for a gentler repeat.

Order:
1. `linked_lesson_slice`.
2. `plan_phrase_lesson`.
3. `plan_missing_word`.
4. `plan_pronunciation_repeat` MVP if available, otherwise `plan_phrase_recall`.

### Day 6: Mixed Real-Life Mini Loop

Goal: combine short answer, clarification, and repeat request.

Order:
1. `linked_lesson_slice`.
2. `plan_listen_choose`.
3. `plan_phrase_recall`.
4. `plan_quiz`.

### Day 7: Weekly Review

Goal: active recall and confidence check, not new grammar.

Order:
1. `plan_phrase_recall`.
2. `plan_missing_word`.
3. `plan_quiz`.
4. `trainer_weak_spot` only if real wrong attempts exist.

## Non-Negotiable Gates

- No names, phone numbers, emails, apartments, rent, landlord, viewing, or narrow personal details in early universal route content.
- No new grammar in plan tasks before the linked lesson introduces it.
- Wrong-answer explanations must not claim which wrong option the user chose unless the selected answer is explicitly known.
- Progress counts only correct attempts for `correct_only` modes.
- A task card is not enough: every task must have a real open action.
- No day is certified while any required mode for that day is contract-only.
