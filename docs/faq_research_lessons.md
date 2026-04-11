# Phraseman Lesson System - Detailed Research Report

## Overview
Phraseman has 32 lessons organized into 4 CEFR levels (A1-B2). Each lesson has 50 phrases practiced via word-selection exercises.

## 1. Lesson Organization
- A1 (Lessons 1-8): Pronouns, To Be, Present Simple, Special questions, To Have, Prepositions
- A2 (Lessons 9-16): There is/are, Modals, Past Simple, Future, Comparatives, Possessives, Phrasal verbs
- B1 (Lessons 17-24): Present Continuous, Imperative, Place prep, Articles, Indefinites, Gerunds, Passive, Present Perfect
- B2 (Lessons 25-32): Past Continuous, Conditionals, Reported speech, Reflexives, Used to, Relative clauses, Complex object, Review

## 2. Exercise Types
**Primary: Word-by-Word Selection**
- Student sees English phrase broken into words
- For each word, taps one of 4-6 options (correct + 5 distractors)
- Distractors by category: phonetic, morphological, syntactic, semantic
- Alternative Hard Mode: Type instead of tap with contraction normalization

## 3. Progress Tracking (AsyncStorage)
- `lesson{N}_progress`: Array of 50 strings (empty/wrong/replay_wrong/correct/replay_correct)
- Score = (correct_count / 50) * 5.0
- `lesson{N}_words`: Record<word, count> - learned if count >= 3
- `irregular_verbs_global`: Record<base_form, count> - shared across all lessons
- `lesson{N}_pass_count`: How many times lesson completed with score >= 2.5

## 4. Medal Tiers & Unlocking
- None (0.0-2.49): Tracking only
- Bronze (2.5-3.49): Next lesson unlocked
- Silver (3.5-4.49): Contributes to level certificate
- Gold (4.5-5.0): Highest tier

**Cascade:**
- Lesson 1 always available
- When lesson N >= 2.5: Lesson N+1 unlocked
- When all lessons in level >= 4.5: Level certificate unlocked
- When all 32 lessons >= 4.5 + all 4 certs: Exam unlocked

## 5. Lesson Menu Display
- Lesson title (bilingual)
- Medal tier (visual icon)
- Progress bar (50 cells: empty/wrong/correct)
- Score: "X / 50 ★ Y.Y"
- Menu items: Main lesson, Vocabulary (if available), Irregular verbs (if available)

## 6. Error Traps & Feedback (3-Tier)
Located in `/error_traps/` split by ranges (1-8, 9-16, 17-24, 25-32)

1. **Per-Word Trap** (Primary): Target specific word position with hint
2. **Trigger Trap** (Secondary): Pattern-based feedback for common mistakes
3. **General Rule** (Tertiary): Lesson-wide explanation

Text normalized: contractions expanded, lowercase, punctuation removed, whitespace collapsed

FeedbackResult: {explanation, explanations[], source, errorWords[]}

## 7. Irregular Verbs Lesson (Specialized)
Affects lessons 4, 6, 7, 12, 17-32 (20 lessons)

Two tabs:
- **Learn Tab**: One form at a time (V1 base, V2 past, V3 participle), 4 options each, 3 correct attempts to learn
- **Test Tab**: Quiz mode, rapid-fire testing

Color coding: Green (V1), Blue (V2), Purple (V3)
Data: `irregular_verbs_global` Record<base_form, count>
Scoring: 3 XP per correct form

## 8. Exam System
File: `exam.tsx`
- Duration: 60 minutes
- Question pool: 160+ pre-built questions (~5 per lesson)
- Types: Fill-blank (default), Multiple choice (4-option), Error correction
- Topics: All lessons A1-B2
- Unlocked when: All 32 lessons >= 4.5 (Gold) + all 4 certs

Results: Score out of 160, breakdown by topic, XP awarded, achievements checked

## 9. Lesson Completion Flow
Screen: `lesson_complete.tsx`

Upon 50th phrase completion:
1. Display medal tier, final score, XP earned
2. Auto-unlock cascade:
   - tryUnlockNextLesson() if score >= 2.5
   - tryUnlockLevelExam() if all level lessons >= 4.5
   - isLingmanExamAvailable() if all 32 >= 4.5 + all certs

## 10. Lesson Data Structure
Files: `lesson_data_1_8.ts`, `lesson_data_9_16.ts`, `lesson_data_17_24.ts`, `lesson_data_25_32.ts`

Interface LessonPhrase:
- id, english, alternatives[], russian, ukrainian, words[]

Interface LessonWord:
- text, correct, distractors[] (5 items), category

---

## 11. Supporting Features

**Spaced Repetition (active_recall.ts):**
- Mistakes tracked in `active_recall_items`
- SM-2 algorithm: 1-day interval, easeFactor=2.5
- Integrated with Review screen

**Energy System (lesson1_energy.ts + EnergyContext.tsx):**
- Daily energy limit
- Per-lesson cost
- Can purchase via premium
- Regenerates daily

**User Settings (user_settings key):**
```
speechRate: 1.0,        // 0.5-2.0x
voiceOut: true,         // Text-to-speech
autoAdvance: false,
hardMode: false,
autoCheck: false,
haptics: true,
showHints: true
```

**Text-to-Speech:** expo-speech, adjustable speed
**Haptics:** expo-haptics, customizable

## 12. Bilingual Support
Full localization: Russian (RU) and Ukrainian (UK)
- Titles (titleRU, titleUK)
- Translations (russian, ukrainian)
- Error feedback (explanation + explanation_UA)
- UI strings via LangContext
- User preference: `language` key

## 13. Key Constants
- TOTAL = 50 phrases/lesson
- REQUIRED = 3 correct for "learned"
- BRONZE_THRESHOLD = 2.5
- SILVER_THRESHOLD = 4.5
- GOLD_THRESHOLD = 5.0
- TOTAL_EXAM_SECONDS = 3600 (60 min)

## Summary
Comprehensive lesson system with:
1. 32 sequenced lessons (A1-B2)
2. Word-selection exercises with smart distractors
3. 3-tier error feedback system
4. Comprehensive progress tracking
5. Medal tier unlock cascade
6. Specialized irregular verb learning
7. Full exam system (160+ questions)
8. Bilingual interface
9. Spaced repetition, energy system, haptics, TTS
