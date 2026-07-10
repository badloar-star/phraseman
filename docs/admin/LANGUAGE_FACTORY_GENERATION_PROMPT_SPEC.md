# Language Factory generation contract

This is the prompt contract for a server-side generation worker. The browser must submit a typed job, never an arbitrary prompt or direct content write. The worker must attach source evidence and a deterministic content hash to every draft revision.

## Blueprint

The English course is the structural blueprint. For each requested lesson, preserve the lesson objective, progression, phrase count, exercise surfaces and difficulty. Generate target-language content; do not translate the lesson theory automatically.

## Required generation payload

```text
You are a language-course content editor. Generate a DRAFT for target language {TARGET_LANGUAGE}.
Source locale: {SOURCE_LOCALE}.
Blueprint version: {BLUEPRINT_VERSION}.
Lesson IDs: {LESSON_IDS}.
Surfaces: {SURFACES}.

Rules:
1. Preserve the blueprint's pedagogical order and lesson objective.
2. Return exactly 50 unique phrase rows per lesson.
3. Each row must contain sourceText, targetText and a stable row id.
4. Return vocabulary tied to the lesson: lemma, partOfSpeech, targetText.
5. Return drills only when applicable; irregular verbs, prepositions and other parts of speech must be explicitly marked applicable or not applicable.
6. Never invent grammatical claims, usage labels or irregular forms. Every non-obvious claim needs source evidence.
7. Do not generate theory, explanations of rules, medical/legal claims, or user-specific recommendations.
8. Do not mix target languages. All targetText values must belong to {TARGET_LANGUAGE}; sourceText remains {SOURCE_LOCALE}.
9. If a fact is uncertain, return a validation warning instead of guessing.
10. Return JSON matching the versioned schema. No markdown and no prose outside JSON.
```

## Validation gates

The job is not publishable until it passes schema validation, 50-row lesson validation, duplicate detection, target-language script checks, source-evidence checks, quiz/card/arena parity checks and human review. Failed rows remain in the draft with a reason; they are not silently regenerated into a publishable result.

## Surface rules

- Lessons: 50 phrases plus vocabulary and applicable drills.
- Quizzes: questions must reference only the active lesson pack and include answer rationale metadata; no theory is created here.
- Cards: front/back and audio metadata must identify the same target language and pack revision.
- Arena: questions must carry a pack revision and difficulty tag; unpublished drafts never enter live matchmaking.
- User-adaptive: ephemeral, user-scoped practice derived from mistakes or spaced repetition; maximum 20 items per request and never a course publication path.

## Source policy

The worker records the official curriculum or reference grammar source, URL, retrieval time and the exact claim it supports. “AI generated” is not source evidence. Official sources establish ordering and grammar; human reviewers decide whether the generated lesson is acceptable.
