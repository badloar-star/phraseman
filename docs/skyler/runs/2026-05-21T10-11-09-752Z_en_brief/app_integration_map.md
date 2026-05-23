# Skyler App Integration Map

Pack: `pack-001.draft.json`
Category: `kitchen-and-cooking`
Target: `en`
Gate: `GO`

## Current App Shape

The current quiz runtime loads questions through:

- `app/quiz_phrases_loader.ts`
- `app/quiz_data.ts`
- `getQuizPhrasesLoaded(level, 10, lang)`

The existing runtime is level-first (`easy`, `medium`, `hard`) and samples from
flat pools. Skyler thematic packs now enter through a separate category registry
and category card, not through the existing level pools.

## Why This Pack Should Not Be Pasted Into `EASY_POOL`

- It would mix a thematic kitchen category into the normal random easy quiz pool.
- The user asked for category-based quizzes, not just more level items.
- The pack has category metadata, source claims, answer keys, localized prompts,
  and all-locale explanations that the current flat pool cannot preserve fully.
- French must remain source-gated, and Smartest must remain a separate content
  vertical rather than a `StudyTarget`.

## Required Runtime Adapter

Before runtime integration, add a small thematic quiz layer that can map a
Skyler item to the current `QuizPhrase` shape:

| Skyler field | Current runtime equivalent |
| --- | --- |
| `item.localizedPrompts[lang]` | `sourceText` / displayed prompt |
| `item.choices` | `choices` |
| `item.correctIndex` | `correct` |
| `item.choices[item.correctIndex]` | `answer` |
| `item.explanations[lang]` | `sourceExplanations` |
| `item.id` | `questionId` |
| `item.skillTag` | `skillTag` |
| `pack.categoryId` | future thematic category id |
| `pack.categoryTitle` | future thematic category title |

## Runtime Adapter Slice

- [x] Add a non-UI data module: `app/quiz_thematic_packs.ts`.
- [x] Add an adapter function that converts a gate-passed Skyler pack into
  `QuizPhrase[]` for a selected interface locale.
- [x] Add tests for:
  - all active interface locales have prompts and explanations;
  - no French target can load English thematic packs;
  - choices and correct index survive conversion;
  - `questionId`, `skillTag`, and category metadata survive conversion.
- [x] Add a bundled category data module:
  `app/quiz_thematic_kitchen_and_cooking.ts`.
- [x] Add a runtime category registry:
  `app/quiz_thematic_registry.ts`.
- [x] Add category card and logo assets for every current quiz theme under:
  - `assets/images/quizzes/theme_cards/`
  - `assets/images/quizzes/theme_logos/`
- [x] Add a category card in the main quiz selection screen that loads the
  thematic pack through the registry.

## Content Status

- 100 items authored.
- 200 verified claims.
- 4 official/expert sources.
- 8 interface locales covered: `ru`, `uk`, `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`.
- Skyler gate passed with `0` failures and `0` warnings.

## Runtime Status

`GO`: content, non-UI adapter, category registry, theme assets, and the main
quiz selection card are wired. The pack remains isolated from the flat level
pools. The 100-item pack is treated as the category pool; each runtime session
samples 10 randomized questions and shuffles choices like the standard quiz
flow. Thematic quiz starts and restarts now share the free-user daily quiz limit
and keep the existing energy gate. Standalone `/quizzes` and `/quizzes_screen`
now delegate to the same tab runtime so Skyler, French gate, daily-limit, and
energy behavior cannot drift by route.
