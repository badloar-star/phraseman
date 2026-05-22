# Heisenberg research checklist: tr

## Required external sources
- [ ] W3C Language Tags and Locale Identifiers: https://www.w3.org/TR/ltli/
  Use: Pick and document canonical BCP 47 language tags and region/script variants.
- [ ] W3C Internationalization: Specifying Language in HTML: https://www.w3.org/International/geo/html-tech/tech-lang.html
  Use: Check HTML lang attributes for public web/admin/legal pages.
- [ ] Unicode CLDR Project: https://cldr.unicode.org/
  Use: Use standard locale data for names, formats, language matching, and locale conventions.
- [ ] Unicode CLDR Language Plural Rules: https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html
  Use: Audit plural categories and example numbers before writing counters or reward copy.
- [ ] ICU MessageFormat Guide: https://unicode-org.github.io/icu/userguide/format_parse/messages/
  Use: Prefer whole-message localization with plural/select variants over string concatenation.
- [ ] Mozilla Project Fluent: https://projectfluent.org/
  Use: Model grammar-sensitive copy: gender, cases, plurals, and translator-owned variants.
- [ ] Council of Europe CEFR Companion Volume: https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions
  Use: Keep lesson and quiz levels aligned with accepted A1-C2 descriptors.
- [ ] British Council LearnEnglish Grammar: https://learnenglish.britishcouncil.org/grammar
  Use: Cross-check English grammar explanations and learner exercise wording.

## Target-language research gates
- [ ] Confirm canonical BCP 47 tag, script, region assumptions, and display name.
- [ ] Record CLDR plural categories and example numbers for app counters, streaks, shards, minutes, lessons, and questions.
- [ ] Build a learner-error map for native speakers of this language learning English: articles, tense/aspect, word order, prepositions, pronouns, false friends, phonology where relevant.
- [ ] Decide whether English grammar terms stay in English, are translated, or use bilingual labels.
- [ ] Define tone rules for rewards, mistakes, admin warnings, legal copy, and child-safe wording.
- [ ] Check punctuation, quotation marks, spacing around symbols, decimal/group separators, and capitalization conventions.
- [ ] Write reviewer notes for each lesson cluster before generating translations.
- [ ] Run the mandatory Agent Review Board for every translation block and record each role verdict.
- [ ] Cite every grammar/pedagogy decision in the language report before integration.

## Repo inventory summary
| Surface | Files |
| admin-site | 5 |
| app-other | 950 |
| arena | 22 |
| daily-phrase | 2 |
| docs | 198 |
| legal | 5 |
| lessons | 39 |
| personal-training | 182 |
| progression-daily-rewards | 11 |
| public-web | 14 |
| quizzes | 18 |
| scripts-tools | 279 |
| tests | 142 |
| ui-locale | 4 |

## Minimum checks after each block
- [ ] No target text appears in ru/uk/es fields.
- [ ] Placeholders like {time}, % values, URLs, emoji, and product names are preserved intentionally.
- [ ] Answer choices still align with explanations and correct indexes.
- [ ] Lesson intro examples match the target-language explanation.
- [ ] Personal training rules explain the English mistake for this target-language learner, not just a literal translation.
- [ ] Agent Review Board verdicts are all GO, or every HOLD has a linked follow-up fix.
