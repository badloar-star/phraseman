# Distractor Strategy Research: Current vs. Improved

## Current Approach (Phraseman)

**Strategy:** Single-word distractors from semantic pools
**Example:** For "I am a teacher"
- Correct word: `a`
- Distractors: Single words like `the`, `an`, `this`, `that` (articles)

**Pros:**
- Simple to implement
- Forces selection between similar words
- Clear choices for beginners

**Cons:**
- TOO easy to identify the correct choice
- No cognitive struggle = less memorable learning
- User doesn't need to think about grammar structure
- "Идиоту понятно что выбирать нужно" (too obvious even for an idiot)

---

## Improved Approach (Competitor App)

**Strategy:** Multi-word context distractors that show the word FOLLOWING the critical word
**Example:** For "Does she work at a company as a driver?"

### Context about the noun:

When selecting an article before a noun:
- Instead of: `a`, `the`, `an`, `this`
- Show: `a company`, `the company`, `an company`, `this company`

**Why this works:**
1. **Cognitive Load:** User must think about BOTH the article AND what follows
2. **Realistic Mistakes:** Mimics actual learner errors:
   - Selecting "company" and forgetting the article
   - Choosing wrong article for that specific noun
3. **Grammar Connection:** Reinforces that articles depend on the FOLLOWING word:
   - `a` before consonant sounds
   - `an` before vowel sounds
   - `the` for specific/known items

### Visual Progression from Screenshots:

1. **Phase 1:** Just the word slot to fill (`does`, `did`, `will`, `do`)
2. **Phase 2:** More options with related verbs (`worked`, `work`, `works`, `on`, `in`)
3. **Phase 3:** Shows compound mistakes (`Does we works at this company`)
4. **Phase 4:** Adds context words (`a company`, `this company`)
5. **Phase 5:** Full reconstruction with word-level error highlighting + explanation

---

## Implementation Strategy for Phraseman

### For Article Selection (highest priority):

When the word to select is `a` or `an` or `the`:
- Show the NOUN that follows as context
- Example options: `a teacher`, `an engineer`, `the manager`
- User must choose the correct article+context pair
- This teaches:
  - When to use `a` (consonant sound)
  - When to use `an` (vowel sound)
  - When to use `the` (specific/known)

### For Verb Selection:

When the word is a verb like `is`, `are`, `do`, `does`:
- Show the verb + the word that typically follows
- Example: `is working`, `are students`, `do work`
- Forces thinking about verb agreement + structure

### For Preposition Selection:

When selecting `from`, `at`, `in`, `on`:
- Show preposition + the location/object
- Example: `from London`, `at home`, `in the office`
- Reinforces preposition + proper contexts

---

## Learning Science Behind Multi-Word Distractors

**Spacing + Difficulty Effect:**
- Easy problems (single word) → weak retention
- Harder problems (with context) → stronger encoding
- Mistakes with context → deeper learning than correct answers to easy questions

**Real-world transfer:**
- User learns articles in context (how they actually appear)
- Not memorizing isolated words
- Pattern recognition based on real language structure

---

## Phraseman Implementation Plan

### Phase 1: Lesson 1 (Articles Focus)
- When correct word is: `a`, `an`, `the`
- Show 5 options with the following noun included
- Example: Phrase "I am a teacher"
  - Correct: `a teacher`
  - Distractors: `the teacher`, `an teacher`, `teacher`, `a`

### Phase 2: Extend to other lessons
- Lesson 2: Negation context (`is not`, `are not`, `am not`)
- Lesson 3: Verb forms with subject (`he works`, `she works`, `they work`)

---

## Expected Outcomes

- **Error Rate:** Increase (which is good — more mistakes = better learning)
- **Retention:** Significant improvement (harder learning = longer retention)
- **User Satisfaction:** Higher challenge = more rewarding progress
- **Language Transfer:** Better ability to use articles/verbs in real writing

**Ведь чем больше ошибок тем лучше запоминает разве не так?** ✓
(Correct: More errors → better memory → active learning)
