# Lesson Package Schema

The Lesson 33 package is a review artifact. It is not app source.

```json
{
  "lessonId": 33,
  "status": "ready_for_review",
  "cefrTarget": "B2",
  "title": {
    "ru": "",
    "uk": "",
    "es": ""
  },
  "topic": {
    "primary": "have/get something done",
    "contrastWith": [],
    "prerequisites": []
  },
  "phrases": [
    {
      "id": "lesson33_phrase_1",
      "english": "",
      "russian": "",
      "ukrainian": "",
      "spanish": "",
      "wordsEn": []
    }
  ],
  "introScreens": [],
  "theoryBlocks": [],
  "personalTraining": null,
  "qaNotes": []
}
```

## Source Integration

Only after review and explicit approval should the package be converted into app source files.

## Roadmap Contract

Every scaffolded run also includes `curriculum_roadmap_33_60.md`. Treat it as the course-order contract, not decoration. Each Lesson 33-60 item must explain:

- prerequisites
- recycledFrom
- newSkill
- risk
- whyHere

Lesson 33 must remain anchored to Lesson 32 and its `need/want + object + V3` bridge. Later C1 lessons must stay gated behind the B2/B2+ work on conditionals, modals, reporting, and clauses.

## Package Gate

Run:

```bash
npm run lesson33:gate -- --package docs/lesson33/runs/<runId>/lesson_package.json
```

The gate expects:

- `lessonId: 33`
- `cefrTarget: "B2"`
- `topic.primary` mentions `have/get something done`
- exactly 50 phrases
- `status` set to `ready_for_review` or `final_candidate`
- localized `title.ru`, `title.uk`, and `title.es`
- localized titles must differ across RU, UK, and ES
- RU, UK, ES text for every phrase
- `wordsEn` token data with at least five unique distractors per token
- at least three intro screens
- intro screens explaining result, formula, and practice
- at least three theory blocks
- theory blocks covering formula, contrast, questions/negatives, and traps
- a personal training object with at least 12 steps
- `personalTraining.id` exactly `causative_have_get_done`
- personal training steps covering `recognition`, `production`, and `mixed_review`
- every personal training step containing `prompt` and a Lesson 33 causative `target`
- `topic.prerequisites` mentioning Lesson 32
- `phraseTargets.count` must be 50 when present
- sequential phrase IDs from `lesson33_phrase_1` to `lesson33_phrase_50`
- `wordsEn` tokens matching the English phrase
- every `wordsEn.correct` value matching its `text`
- no blank distractors
- no distractor matching the correct answer
- phrase translations not duplicating English
- RU, UK, and ES phrase translations not identical to each other
- at least 35 phrases with the Lesson 33 causative/result-object pattern
- at least 10 phrases with `need/want + object + V3`
- at least 5 question phrases
- at least 5 negative phrases
- no attributive-description false positives like "I have a repaired phone"
