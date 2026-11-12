# English Classic R1 · editorial handoff

This branch records the **original** classic English-bank snapshot and the editorial comparison. It does not replace the installed course. The full candidate, generator, browser demo, lesson-level data, native adapters and optional Git patch are delivered separately in `PhraseMan_EN_Classic_01-32.zip`. This is a draft, not a store/OTA release. Do not merge solely to activate it.

Baseline `7bf2258cdc5d2647bea7a6f9ed9115035ee2d581`. Target English fields and `wordsEn` when present; 32×50 rows. Do not count Spanish tokens from the dual-language bank. Candidate `en-classic-r1-editorial`, canonical `course.json` SHA-256: `f7fe488b82c4eb796e2c92bf099efd33693f10b11c43bd109cb7174d427af1b1`.

- Same 32 topic slots, 1,600 distinct target sentences, 26 normalized exact matches with the old bank, 2,515 permitted full paths across 646 multi-path items. Examples: EN16.14 *Turn off the fan / Turn the fan off*; EN16.16 *Turn it off* (reject *Turn off it*). EN24.12 *She has / She's just called back*. Test negative forms as well as contractions.
- 5 intentionally introduced words or expressions per lesson; all 155 from lessons 1–31 recur in a later task. Nine UI/teaching locales, translation cues from eight non-English languages. Machine-assisted localizations need human editorial acceptance.
- L31 original vs candidate: 211 vs 26 first-introduced written forms; average target length 10.28 vs 6.50 tokens. L8: 41 vs 71 new surface forms (watch burden). Counts are written forms, not lemmas.
- Leave-one-lesson-out frequency-only prediction: 37.53% on the original authored options (not the old dynamically generated UI), 21.26% on the new options. Random baselines differ: 16.67%, 18.15%. Not a measure of learner attainment.
- Local Chromium tested every complete candidate path (2,515), 14,738 correct word clicks, 32 deliberate wrong clicks and returns, 288 intro checks, 1,152 reference section renders. No physical device, whole-app release, or native payment/progress migration test.
- Before replacement: blind native-language review and parallel pilot of L2/8/16/24/31. Keep the old course and paid entitlements; do not equate ordinal positions with mastery of changed material. See `AUDIT.html`, `PORTING.md`, `qa/`, and `source/` in the full ZIP.
