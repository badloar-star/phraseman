# Skyler Quiz Pack Schema

This is the authoring contract checked by `npm run skyler:quiz -- --mode gate`.
The JSON below is a structural excerpt, not a gateable pack. Real drafts must
include every required interface locale with real adapted localized prompts and
real adapted explanations, never `...`, `TODO`, copied English, or
machine-translation placeholders.
Do not duplicate the same explanation bundle or locale review note across
locales. Within each item, `localizedPrompts` must be adapted per locale, and
`choiceRationales` plus each locale's explanations must be unique per choice.
Use a stable kebab-case categoryId, a concrete categoryTitle, and concrete
researchPolicy.notes; placeholders or generic metadata are blocked.
Prompt, choices, and learningGoal must be real learner-facing text, never
placeholders.
Language packs must include `styleProfile` evidence from
`QUIZ_STYLE_CONTRACT.md`, sampled from `app/quiz_data.ts` and
`app/quiz_source_locale_payloads.ts`. Block generic prompt shells such as
`Which word fits`, `Kitchen — object`, and flat `Correct/Wrong label prefixes`;
explanations must be reader-worthy mini rewards in the current app style, not
generated dictionary feedback. Every language-pack `styleProfile` must include
`readerRewardPattern`: the rule for giving each explanation a memory hook,
mini-scene, useful contrast, or source-backed fact.
Use stable source, claim, and item IDs: source/claim IDs are alphanumeric
tokens, and item IDs are kebab-case.
Use a stable answer_key itemId: it must be the same kebab-case item ID used by
the item it proves.
Use stable skillTag/factTag values: lowercase machine tags with words separated
by `_` or `-`, never prose labels or placeholders.
Every locale review needs a reviewer owner; missing or placeholder reviewer
metadata is blocked.
Every item needs distinct claimIds; repeating the same claim ID does not add
evidence coverage.
Official source URLs must be unique and use distinct source hosts; two pages on
one host do not count as independent cross-checking.
Block unused official sources: every official source must be cited by at least
one verified claim or answer_key.
Validated social listening needs at least two distinct social signals with
concrete non-placeholder `source` and `text`; repeated URLs or same source/text
pairs do not count as separate demand. Use `seed-only` when only one pain signal
exists.

```json
{
  "schemaVersion": "skyler-quiz-pack-v1",
  "target": "en",
  "categoryId": "conversation-repair",
  "categoryTitle": "Conversation repair moves",
  "researchPolicy": {
    "directTranslationUsed": false,
    "notes": "All locales were adapted from source notes."
  },
  "releasePolicy": {
    "environment": "dev-only",
    "productionActivation": "blocked_until_explicit_user_approval",
    "approvedBy": "",
    "approvedAt": "",
    "approvalSource": "",
    "notes": "New Skyler quiz packs stay in dev until the user explicitly approves production activation."
  },
  "styleProfile": {
    "basedOnExistingPools": true,
    "sampledFiles": ["app/quiz_data.ts", "app/quiz_source_locale_payloads.ts"],
    "promptPattern": "Use human learner questions or short source-language phrases, not generic Which word fits or Kitchen — object shells.",
    "explanationPattern": "Each explanation is a reader-worthy mini reward: useful, option-specific, lightly playful, and not a dry dictionary gloss.",
    "readerRewardPattern": "Each explanation gives a natural memory cue, mini-scene, useful contrast, or source-backed fact; do not force explicit lifehack labels; historical/etymology notes require verified claim IDs and source IDs.",
    "distractorPattern": "Distractors mirror current pools: plausible learner errors, false friends, wrong context, or same-domain confusions."
  },
  "visualAssets": {
    "status": "queued",
    "styleBasis": "DALL-E visual kickoff follows existing Phraseman home_menu and achievement assets: premium mobile-game polish, centered object, bevels, rim light, no bitmap text.",
    "assets": [
      {
        "family": "forest",
        "plaquePrompt": "Generate a forest-family topic plaque for this category in existing Phraseman style, with no text.",
        "iconPrompt": "Generate a forest-family compact topic icon for this category in existing Phraseman style, with no text."
      }
    ]
  },
  "socialListening": {
    "status": "validated",
    "signals": [
      {
        "source": "provided_public_signal",
        "text": "Learners report confusion about this category.",
        "url": "https://example.org/public-thread"
      },
      {
        "source": "moderated_feedback_export",
        "text": "Students repeatedly ask for clearer practice on this topic.",
        "url": "https://reference.example.net/feedback-summary"
      }
    ]
  },
  "officialSources": [
    {
      "id": "S1",
      "title": "Reference title",
      "url": "https://example.org",
      "tier": "A",
      "publisherType": "official_institution",
      "usedFor": "Primary usage/fact verification.",
      "limitations": "None known for this claim.",
      "checkedAt": "2026-05-21"
    },
    {
      "id": "S2",
      "title": "Second reference",
      "url": "https://reference.example.net/second",
      "tier": "A",
      "publisherType": "expert_edited_reference",
      "usedFor": "Cross-checking the same claim.",
      "limitations": "Secondary source for comparison.",
      "checkedAt": "2026-05-21"
    }
  ],
  "claims": [
    {
      "id": "C1",
      "type": "usage_rule",
      "text": "Could you say that again? is a natural polite repair phrase in this context.",
      "sourceIds": ["S1", "S2"],
      "verificationStatus": "verified",
      "sourceComparison": "Both sources support the usage; no competing correct option is supported for this prompt."
    },
    {
      "id": "C2",
      "type": "answer_key",
      "text": "Choice 0 is the only correct answer for this item.",
      "itemId": "conversation-repair-001",
      "answerIndex": 0,
      "sourceIds": ["S1", "S2"],
      "verificationStatus": "verified",
      "sourceComparison": "Both sources support choice 0 and do not support the distractors."
    }
  ],
  "localeReviews": [
    {
      "locale": "ru",
      "method": "research_adapted",
      "reviewer": "Locale Editor",
      "notes": "Adapted from source notes, not direct translation.",
      "directTranslationUsed": false,
      "adaptationBasis": "source_notes",
      "sourceIds": ["S1", "S2"]
    }
  ],
  "items": [
    {
      "id": "conversation-repair-001",
      "type": "mcq",
      "prompt": "Which phrase naturally asks someone to repeat?",
      "localizedPrompts": {
        "ru": "Какая фраза естественно просит повторить сказанное?",
        "uk": "Яка фраза природно просить повторити сказане?"
      },
      "choices": ["Could you say that again?", "Say me again.", "Repeat me.", "Speak it back."],
      "correctIndex": 0,
      "learningGoal": "Choose a natural polite repair phrase.",
      "skillTag": "conversation_repair",
      "sourceIds": ["S1", "S2"],
      "claimIds": ["C1", "C2"],
      "choiceRationales": [
        "The correct choice is natural in the tested context and supported by both sources.",
        "This distractor is plausible for learners but uses the wrong verb pattern.",
        "This distractor changes the meaning and is not supported by the sources.",
        "This distractor is not idiomatic for the tested context."
      ],
      "qualityChecks": {
        "singleCorrect": true,
        "distractorsPlausible": true,
        "noAmbiguity": true,
        "sourceBacked": true
      },
      "explanations": {
        "ru": [
          "Correct: this is a natural polite repair phrase.",
          "Wrong: say me is not the structure here.",
          "Wrong: repeat me means repeat the person, not the words.",
          "Wrong: this is not idiomatic."
        ],
        "uk": [
          "Real adapted explanation for uk choice 0, grounded in S1/S2 notes.",
          "Real adapted explanation for uk choice 1, grounded in S1/S2 notes.",
          "Real adapted explanation for uk choice 2, grounded in S1/S2 notes.",
          "Real adapted explanation for uk choice 3, grounded in S1/S2 notes."
        ]
      }
    }
  ]
}
```

## Target-Specific Blocks

- Smartest packs must include `trackPolicy` with
  `smartestIsContentVertical: true` and `doesNotUseStudyTarget: true`.
- French packs must include `frenchGate.productionActivation:
  blocked_until_source_gate_approval` and the current French source UI locales.
- English/French language items use `skillTag`; Smartest items use `factTag`.
  Never include both on the same item. Use stable skillTag/factTag tokens,
  never placeholder or prose labels.

## Evidence Date And Coverage Rules

- `categoryId` must be stable kebab-case, `categoryTitle` must be concrete, and
  `researchPolicy.notes` must explain the research/adaptation basis.
- Validated `socialListening.signals` must include at least two distinct social
  signals with concrete non-placeholder `source` and `text`. Repeated URLs or
  repeated source/text pairs cannot inflate demand validation; a single signal
  must stay `seed-only`.
- Use stable source, claim, and item IDs. Source IDs and claim IDs use
  alphanumeric tokens such as `S1` or `C1`; item IDs use kebab-case.
- Every `answer_key.itemId` must be a stable answer_key itemId: the same
  kebab-case item ID used by the item it proves.
- Use stable skillTag/factTag metadata. Tags use lowercase machine tokens such
  as `conversation_repair` or `source-backed-fact`, not `TODO`, `<tag>`, or
  human-readable prose.
- Prompt, choices, and learningGoal must be concrete item text, not `TODO`,
  `...`, `<choice>`, or other placeholders.
- Prompt and choice granularity must match. A full-phrase `How do you say...`
  / `Как сказать...` prompt must offer full-phrase answer choices. If the
  choices are single words or bare verbs, ask directly for the word or verb
  instead of asking the learner to translate a whole phrase.
- Language packs need `styleProfile.basedOnExistingPools: true`, sampled from
  `app/quiz_data.ts` and `app/quiz_source_locale_payloads.ts`, with concrete
  `promptPattern`, `explanationPattern`, `readerRewardPattern`, and
  `distractorPattern` notes. The gate blocks generic prompt shells like
  `Which word fits`, `Kitchen — object`, and flat `Correct/Wrong label
  prefixes`.
- Every pack must include `releasePolicy`. New packs start with
  `releasePolicy.environment: dev-only` and `releasePolicy.productionActivation:
  blocked_until_explicit_user_approval`. After explicit user approval, a pack may
  use `releasePolicy.environment: production` and
  `releasePolicy.productionActivation: approved_by_user` with concrete
  `approvedBy`, `approvedAt`, and `approvalSource` metadata before production
  mapping.
- Every pack must include `visualAssets` so the DALL-E plaque/icon kickoff is
  tracked before quiz drafting. `visualAssets.status` may be `queued` during
  authoring or `generated` after workspace assets exist. Entries must cover
  `forest`, `dark`, `neon`, `neonGreen`, `gold`, `coral`, `minimalLight`, and
  `minimalDark`, each with distinct plaque and icon prompts. Generated entries
  must also record existing workspace plaque and icon paths under
  `assets/images/quizzes/theme_cards/` and
  `assets/images/quizzes/theme_logos/`.
- `localizedPrompts` must include every required interface locale with
  locale-adapted prompt text. A localized prompt must not copy the English
  author prompt, and prompt copy must not be duplicated across locales.

- `checkedAt` must be a real non-future `YYYY-MM-DD` date.
- `officialSources` must use unique source URLs; two IDs pointing to the same
  page do not count as cross-checking.
- `officialSources` must use distinct source hosts. Two pages on the same host
  do not count as independent cross-checking.
- Block unused official sources. Every source in `officialSources` must be
  cited by at least one verified claim or `answer_key`; listing a source without
  claim usage does not strengthen the pack.
- Claim, item, and locale-review `sourceIds` must be distinct. Repeating `S1`
  twice does not count as cross-checking.
- Each locale review needs at least two distinct source IDs; one source is not
  enough to prove locale adaptation.
- This rule is explicit: locale review needs at least two distinct source IDs.
- Each locale review needs a concrete reviewer owner so adaptation has an
  accountable editor, not anonymous generated copy.
- Explanations must be reader-worthy mini rewards, not dry dictionary glosses.
  Block phrases like `простое базовое слово`, `подсказка говорит`, or
  `the prompt asks`; explain the selected option directly with a useful image,
  contrast, or memory hook.
- Explanations are learner-facing product copy. Do not show audit wording such
  as `source-backed`, `source IDs`, or `verified claim` to the learner. Mention
  the selected English choice or the correct English contrast so feedback stays
  tied to the chosen option.
- Explanations must describe the tapped word, its meaning, and the contrast
  with the correct word. Do not tell the learner that a word "lands in" a
  kitchen/category/section, and do not reuse one long generated tail across all
  four answer choices.
- Do not use formulaic pseudo-lifehack shorthand such as `water + dishes +
  kitchen = sink` or `recipe = roadmap for food`; write a natural image,
  contrast, or usage cue instead.
- Do not force explicit `Лайфхак:`, `Truco:`, `Dica:`, `Mẹo nhớ:`, `Trik:`,
  `İpucu:`, or `Sztuczka:` labels in explanations. A good cue should read
  naturally; a weak cue should be replaced with a mini-scene, usage note, or
  verified fact.
- Do not use vague atmosphere as the explanation. A mini-scene must be anchored
  to a direct language reason: the meaning, the usage boundary, the common
  confusion, or the contrast with the selected option.
- Do not invent phrase or sentence context that is not in the prompt. A simple
  word-translation item must explain the word and the choices, not pretend there
  was a sentence with extra objects or actions.
- Do not list multiple distractors in correct-answer feedback. Keep the correct
  explanation focused on the right answer; wrong-answer entries should carry the
  specific contrasts.
- Do not make explanations sterile glossary copy. The language reason comes
  first, but a small grounded joke, concrete image, or human aside should remain
  when the real prompt/choices support it.
- Reader rewards can be natural memory cues, mini-scenes, useful contrasts, or
  source-backed facts. Historical or etymology notes must be represented by
  verified claims with source IDs and sourceComparison; do not invent them for
  flavor.
- An item's `sourceIds` must include every source ID used by its cited
  `claimIds`; extra sources cannot replace the claim's required sources.
- An item's `claimIds` must be distinct claimIds. Repeating `C1` twice does not
  add evidence coverage.
- Every item must cite at least one verified target-appropriate content claim:
  `grammar_rule` or `usage_rule` for English/French, `fact` for Smartest.
- Every item must cite at least one verified `answer_key` claim whose `itemId`
  matches the item `id` and whose `answerIndex` matches the selected
  `correctIndex`.
- Each item's `choiceRationales` and each locale's four explanations must be
  unique per choice; repeated generic feedback and copied long explanation
  fragments are blocked.

Repeat `localizedPrompts` and `explanations` for every required active
interface locale in real packs. French packs use only the current French source
UI locales while the French source gate is closed.
