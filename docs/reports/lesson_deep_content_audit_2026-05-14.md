# Deep Lesson Content Audit (2026-05-14)

## Scope

- lesson word prompts: RU/UK separately, exact EN leaks, Latin review tokens, same-prompt collisions, long mobile prompts
- phrase data: required translations, token/slot alignment, raw/generated option correctness, duplicate options
- theory: extracted help text presence, mojibake, known pattern coverage
- intro screens: presence, duplicate ids/orders, empty/mojibake text

## Summary

- Issues: high=0, medium=0, low=48

## Counts By Code

- WORD_SAME_EN_DIFFERENT_POS_REVIEW: 34
- WORD_PROMPT_HAS_LATIN_REVIEW: 14

## Issues

- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:1114: ru prompt has Latin tokens [good]: Лучше (сравн. от good)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:1114: uk prompt has Latin tokens [good]: Краще (від good)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:1115: ru prompt has Latin tokens [bad]: Хуже (сравн. от bad)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:1115: uk prompt has Latin tokens [bad]: Гірше (від bad)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:1501: ru prompt has Latin tokens [he, she]: Был (для I/he/she/it)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:1502: ru prompt has Latin tokens [we, they]: Были (для you/we/they)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:1704: ru prompt has Latin tokens [ame]: Археолог (AmE)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:1704: uk prompt has Latin tokens [ame]: Археолог (AmE)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:266: ru prompt has Latin tokens [he, she]: нужно / приходится (he/she/it)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:266: uk prompt has Latin tokens [he, she]: потрібно / доводиться (he/she/it)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:272: ru prompt has Latin tokens [he, she]: нужно / необходимо (he/she/it)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:272: uk prompt has Latin tokens [he, she]: потрібно / необхідно (he/she/it)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:966: ru prompt has Latin tokens [off]: Выключил(а) (с off) / повернул(а)
- **LOW WORD_PROMPT_HAS_LATIN_REVIEW** app/lesson_words.tsx:966: uk prompt has Latin tokens [off]: Вимкнув(ла) (з off) / повернув(ла)
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** answer: answer appears as multiple POS: verbs, nouns in lessons 10, 14, 15, 21
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** before: before appears as multiple POS: prepositions, adverbs in lessons 22, 24
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** better: better appears as multiple POS: adjectives, adverbs in lessons 13, 14, 32
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** break: break appears as multiple POS: verbs, nouns in lessons 4, 7
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** call: call appears as multiple POS: verbs, nouns in lessons 3, 4, 6, 11, 13, 18
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** clean: clean appears as multiple POS: adjectives, verbs in lessons 9, 18
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** faster: faster appears as multiple POS: adjectives, adverbs in lessons 14, 26, 29
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** he: he appears as multiple POS: pronouns, nouns in lessons 1, 2, 3, 7
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** his: his appears as multiple POS: adjectives, pronouns in lessons 7, 15
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** i: i appears as multiple POS: pronouns, nouns in lessons 1, 2, 3, 7
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** late: late appears as multiple POS: adjectives, adverbs in lessons 1, 2, 16, 22
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** lighter: lighter appears as multiple POS: nouns, adjectives in lessons 7, 14
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** may: may appears as multiple POS: nouns, verbs in lessons 8, 10
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** my: my appears as multiple POS: adjectives, pronouns in lessons 7, 15
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** near: near appears as multiple POS: adjectives, adverbs in lessons 1, 19, 25, 29
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** new: new appears as multiple POS: nouns, adjectives in lessons 9, 11
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** not: not appears as multiple POS: adverbs, nouns in lessons 2, 7, 15
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** okay: okay appears as multiple POS: adjectives, adverbs in lessons 1, 2, 27, 32
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** old: old appears as multiple POS: nouns, adjectives in lessons 9, 11
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** open: open appears as multiple POS: adjectives, verbs in lessons 2, 6, 18
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** order: order appears as multiple POS: verbs, nouns in lessons 3, 6, 11, 21, 29
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** park: park appears as multiple POS: nouns, verbs in lessons 8, 11
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** rent: rent appears as multiple POS: nouns, verbs in lessons 8, 11, 13
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** rest: rest appears as multiple POS: nouns, verbs in lessons 3, 26, 28
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** return: return appears as multiple POS: adjectives, verbs in lessons 7, 11
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** she: she appears as multiple POS: pronouns, nouns in lessons 1, 2, 3, 7
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** they: they appears as multiple POS: pronouns, nouns in lessons 1, 2, 3, 7
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** this: this appears as multiple POS: adjectives, pronouns in lessons 7, 15
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** water: water appears as multiple POS: verbs, nouns in lessons 11, 20
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** we: we appears as multiple POS: pronouns, nouns in lessons 1, 2, 3, 7
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** which: which appears as multiple POS: adverbs, pronouns in lessons 6, 30
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** who: who appears as multiple POS: adverbs, pronouns in lessons 6, 30
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** will: will appears as multiple POS: verbs, adverbs in lessons 10, 13, 26
- **LOW WORD_SAME_EN_DIFFERENT_POS_REVIEW** work: work appears as multiple POS: verbs, nouns in lessons 3, 4, 11, 18
