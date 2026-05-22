# Skyler Category Brief

Category id: `kitchen-and-cooking`

Target: `en`

## Learner Pain

- Signal 1: Reddit r/EnglishLearning — a learner asks what simple word or category name to use for "kitchen utensils", showing confusion around everyday kitchen object labels.
  Source: https://www.reddit.com/r/EnglishLearning/comments/1gpn0hm/words_for_kitchen_utensils/
- Signal 2: Reddit r/whatstheword — a user asks for the word for the category of tools/things used in cooking, showing demand for category-level kitchen tool vocabulary.
  Source: https://www.reddit.com/r/whatstheword/comments/hghjj5/wtw_for_the_category_of_toolsthings_used_in/
- Signal 3: seed hypothesis — learners also need action verbs for recipes and daily kitchen tasks: boil, fry, chop, stir, pour.

Validated demand requires at least two distinct social signals with concrete
non-placeholder `source` and `text`. Duplicate URLs or repeated source/text
pairs do not count as separate demand. Single-signal themes stay `seed-only`
until another independent pain signal is documented.

## Why This Is Interesting

Kitchen vocabulary is practical, visual, and immediately useful: learners can
connect words to objects they see every day, then use the same category for
short recipe-style actions and common object confusions. This makes it a good
first thematic quiz category because it can mix simple nouns, verbs, and
context without becoming abstract grammar.

## Source Matrix

| Source id | Tier | Publisher type | URL/title | Used for | Checked at | Limitations |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | A | dictionary_or_academy | Cambridge Dictionary: frying pan — https://dictionary.cambridge.org/us/dictionary/english/frying-pan | Definition and learner-level cross-check for frying pan as an object used for frying food. | 2026-05-21 | Specific to frying pan; does not cover the full kitchen vocabulary set. |
| S2 | A | official_institution | British Council LearnEnglish Teens: Kitchen exercises — https://learnenglishteens.britishcouncil.org/sites/teens/files/kitchen_-_exercises.pdf | A1-A2 kitchen object vocabulary and learner-friendly usage prompts for knife, bowl, spoon, fork, cup, plate, and cooker. | 2026-05-21 | Basic classroom vocabulary; cooking verb contrasts still require dictionary or ELT cross-checking. |
| S3 | B | dictionary_or_academy | Oxford Learner's Dictionaries topic: Cooking and eating — https://www.oxfordlearnersdictionaries.com/us/topic/cooking-and-eating | Cross-checking cooking/eating vocabulary, learner dictionary wording, and item-level distractor distinctions. | 2026-05-21 | Broad topic page; individual entries may still need item-level checks. |
| S4 | B | educational_publisher | BBC Learning English Quiznet: Food preparation and cooking — https://downloads.bbc.co.uk/worldservice/learningenglish/quiznet/pdfs/qnet_137_food_cooking_070614.pdf | Cooking/preparation vocabulary and common learner confusion around food preparation words. | 2026-05-21 | Older PDF, useful as educational support but should be cross-checked against S1-S3 before final items. |

Every source row must contain a real http(s) URL, concrete `usedFor` notes, and
limitations. Social/forum links can explain demand in Learner Pain, but they
cannot prove a fact, rule, answer key, or explanation.

## First Pack Shape

- Item count: 10-12 MCQ items for first pack.
- Difficulty ramp: A1 object recognition -> A2 tool/action matching -> B1 common confusion in context.
- Item types: vocabulary meaning, object-to-action, phrase completion, context choice, mistake contrast.
- Required locales: all active English interface locales from Heisenberg/source-locale architecture: ru, uk, es, pt-BR, vi, id, tr, pl.

## Blockers

- [x] Official source matrix filled
- [x] First pack ambiguity pass completed through Skyler gate
- [x] First pack distractor pass completed through choice rationales and Skyler gate
- [x] Localized prompts added for ru, uk, es, pt-BR, vi, id, tr, pl
- [x] Locale reviews added for ru, uk, es, pt-BR, vi, id, tr, pl
- [x] Validated demand has at least two distinct social signals; social posts remain pain signals only, not factual proof.
