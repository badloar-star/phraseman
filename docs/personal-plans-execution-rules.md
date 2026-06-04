# Personal Plans Execution Rules

These rules define how future "дальше" prompts should be handled for the Personal Plans workstream.

## Main Objective

The priority is to get at least one complete, high-quality Personal Plan ready as a real product experience as fast as possible.

The first target plan is:

- `Гавань`
- Week 1 first
- Then full route expansion

The work must focus on daily content, exercise modes, phrase quality, explanations, recall, quizzes, audio/pronunciation readiness, and user-facing quality.

## What "Дальше" Means

When the user says `дальше`, `ДАЛЬШЕ`, or gives a broad continuation prompt:

1. Re-evaluate the whole Personal Plans system, not only the last tiny file.
2. Choose the most valuable next package of work.
3. Do a large practical batch, not one microtask.
4. Prefer content and working user value over more abstract reports.
5. Keep quality gates, but do not let gates replace the actual plan content.
6. Continue until the batch has meaningful finished output and verification.

## Minimum Batch Size

A normal continuation batch should try to cover at least 20 concrete actions when feasible, for example:

- audit current plan files;
- audit route/day coverage;
- audit exercise modes;
- rewrite weak phrases;
- rewrite weak explanations;
- clean user-facing copy;
- add or tighten tests;
- check forbidden anchors;
- check mojibake;
- check quiz size and scope;
- check recall behavior;
- check phrase tile counts;
- check distractors;
- check audio placeholders;
- check pronunciation requirements;
- update export packets;
- update reviewer gates;
- run focused tests;
- run typecheck;
- summarize remaining gaps;
- choose the next batch.

## Product Direction

Plans must feel like a premium learning product, not developer scaffolding.

Every day should include a varied mix of modes, such as:

- lesson bridge;
- phrase build;
- missing word;
- natural choice;
- listening choice;
- active recall;
- mistake repair;
- quick reply;
- micro-dialogue;
- pronunciation shadow;
- quiz intent or day quiz.

The content must be universal, socially safe, and useful in common real life. Early route content must avoid narrow anchors like apartments, rent, phone numbers, email, personal identity forms, or forced names unless explicitly required later.

## Copy Rules

Never write developer-style copy in user-facing text.

Avoid:

- "черновик";
- "dev";
- "зарегистрировать квиз";
- "регистрация";
- "материал-кандидат";
- technical unlock wording;
- fake personalization;
- invented wrong-answer explanations;
- stale textbook phrases;
- overly niche situations too early.

Use:

- clear everyday Russian;
- natural modern English;
- short supportive explanations;
- grounded feedback that explains the correct idea;
- word explanations whenever a learner may not know the word.

## Wrong Answer Explanations

Wrong-answer feedback must not invent what the user selected unless the runtime actually provides that selected value.

Good wrong-answer feedback explains:

- what the target phrase means;
- why the correct construction works;
- which word carries the meaning;
- how to remember it next time.

Bad wrong-answer feedback says:

- "ты выбрал...";
- "этот вариант...";
- "выбранный вариант...";
- any claim about unseen choices.

## Quality Gates

Every content batch should verify at least:

- no mojibake;
- no forbidden narrow anchors;
- no developer copy;
- phrase tile count matches the target;
- distractors do not duplicate correct tiles;
- explanations cover new words and constructions;
- recall has no hints/highlighting and mistakes return later;
- quiz intent has exactly 10 questions when a day quiz is planned;
- audio/pronunciation claims are honest if assets/scoring are not built;
- production/live bridge remains blocked unless explicitly approved.

## Implementation Priority

Do not spend a whole continuation turn only on planning unless the user explicitly asks for planning only.

Preferred order:

1. Fix or create real day content.
2. Add exercise mode data needed by that content.
3. Add tests/gates to protect quality.
4. Update export/reviewer artifacts.
5. Run focused tests and typecheck.
6. Report what changed and what remains.

## Current North Star

The route should make a user feel:

- "I know what to do today";
- "The phrases are useful";
- "The app understands where I struggle";
- "The tasks are varied";
- "The product feels expensive and human";
- "I can see real progress within a month."

