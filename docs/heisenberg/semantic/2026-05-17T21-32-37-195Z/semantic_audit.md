# Heisenberg Semantic Audit

Generated: 2026-05-17T21:32:37.194Z
Blockers: 0
Warnings: 4
Review groups: 4

## Top Finding Codes
- lesson-word-ambiguous-direct-source-map: 4

## Review Groups
- [warning] lesson-word-ambiguous-direct-source-map x1 lesson_words id:better better::adjectives: English headword appears with multiple POS values, but the central source-locale map only has a direct key for this POS. Add a pos-specific key to avoid semantic drift. | line 1117: better (adjectives)
- [warning] lesson-word-ambiguous-direct-source-map x1 lesson_words id:faster faster::adjectives: English headword appears with multiple POS values, but the central source-locale map only has a direct key for this POS. Add a pos-specific key to avoid semantic drift. | line 1127: faster (adjectives)
- [warning] lesson-word-ambiguous-direct-source-map x1 lesson_words id:faster faster::adverbs: English headword appears with multiple POS values, but the central source-locale map only has a direct key for this POS. Add a pos-specific key to avoid semantic drift. | line 1557: faster (adverbs)
- [warning] lesson-word-ambiguous-direct-source-map x1 lesson_words id:better better::adverbs: English headword appears with multiple POS values, but the central source-locale map only has a direct key for this POS. Add a pos-specific key to avoid semantic drift. | line 1833: better (adverbs)

## First Findings
- [warning] lesson-word-ambiguous-direct-source-map lesson_words id:better better::adjectives: English headword appears with multiple POS values, but the central source-locale map only has a direct key for this POS. Add a pos-specific key to avoid semantic drift. | line 1117: better (adjectives)
- [warning] lesson-word-ambiguous-direct-source-map lesson_words id:faster faster::adjectives: English headword appears with multiple POS values, but the central source-locale map only has a direct key for this POS. Add a pos-specific key to avoid semantic drift. | line 1127: faster (adjectives)
- [warning] lesson-word-ambiguous-direct-source-map lesson_words id:faster faster::adverbs: English headword appears with multiple POS values, but the central source-locale map only has a direct key for this POS. Add a pos-specific key to avoid semantic drift. | line 1557: faster (adverbs)
- [warning] lesson-word-ambiguous-direct-source-map lesson_words id:better better::adverbs: English headword appears with multiple POS values, but the central source-locale map only has a direct key for this POS. Add a pos-specific key to avoid semantic drift. | line 1833: better (adverbs)
