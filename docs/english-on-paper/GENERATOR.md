# АНГЛИЙСКИЙ НА БУМАГУ

Canonical name: `АНГЛИЙСКИЙ НА БУМАГУ`.

Rename note: this folder is the renamed paper-course pipeline for the earlier working idea `обучение Аллы`. A direct old folder or file with that exact name was not found in the current workspace, so this package is now the source of truth.

## Learner Profile

- Age: 12.
- Context: lives in Ireland for about 3 years.
- Level: understands everyday school English, but needs slower, clearer practice for active writing and confident phrase recall.
- Tone: age-appropriate, practical, friendly, not babyish.
- Lesson surface: printable DOCX for color printer, handwritten answers, no app/audio dependency.

## Phrase Selection Rules

Borrowed and adapted from the Personal Plans generation contracts:

- Use living, practical English that a real person would say today.
- Keep phrases short enough to remember and write by hand.
- Tie every phrase to one clear situation.
- Every phrase must have a teaching note for one useful word or structure.
- Avoid textbook filler and random word lists.
- Distractors must be close enough to teach a real difference, not random noise.
- Review older phrases on later lessons instead of adding only new material.
- Do not use technical generator language in student-facing text.
- Do not claim readiness or mastery from one generated lesson.

## Ten Paper Task Types

Each lesson should use all 10 task types, but the phrase set changes.

1. **Phrase Map**: read 8 target phrases with short Ukrainian meaning and one simple English note.
2. **Fill The Missing Word**: write one missing word inside a sentence.
3. **Match Meaning**: match English phrases to Ukrainian meanings.
4. **Choose The Natural Phrase**: choose the phrase that sounds normal in the situation.
5. **Word Bank Build**: build a sentence from given words.
6. **Fix The Mistake**: correct one realistic learner mistake.
7. **Rewrite With A New Detail**: keep the pattern, change one detail.
8. **Mini Dialogue**: complete a two-line school conversation.
9. **Memory Cover Test**: cover the phrase bank and translate short prompts.
10. **Exit Ticket**: write 3 useful sentences for the learner's real week.

## Lesson Structure

Every printable lesson must follow this order:

1. Title block with lesson number, topic, learner name/date fields.
2. Tiny goal in very simple English.
3. Phrase bank with English in blue, Russian in warm red, key word/note in green.
4. Detailed but simple English explanation.
5. Ten task sections, with answer space.
6. Reading Practice block with one normal-length English text and at least 3 tasks based on that text.
7. Small self-check box.
8. Teacher/parent answer key on the final page.

## Generator Prompt 1: Lesson Blueprint

```text
You are generating a printable English worksheet called АНГЛИЙСКИЙ НА БУМАГУ.

Learner:
- age 12;
- lives in Ireland for about 3 years;
- understands some everyday English;
- needs active writing, memory, and natural phrase practice.

Create one lesson blueprint.

Rules:
- choose one real-life topic from school, home, friends, shops, travel in Ireland, appointments, hobbies, or online safety;
- create 8 short target phrases;
- each phrase must sound natural, current, and useful;
- each phrase needs a short Ukrainian meaning;
- each phrase needs one simple English teaching note;
- avoid childish content and avoid adult bureaucratic overload;
- include exactly 10 task sections: Phrase Map, Fill The Missing Word, Match Meaning, Choose The Natural Phrase, Word Bank Build, Fix The Mistake, Rewrite With A New Detail, Mini Dialogue, Memory Cover Test, Exit Ticket;
- add one Reading Practice block with a normal-length English text and at least 3 comprehension tasks based only on that text;
- explanations must be in very simple English, but detailed enough to teach why the phrase works;
- output a structured JSON-like lesson plan, not a DOCX.
```

## Generator Prompt 2: Worksheet Content

```text
Using the approved lesson blueprint, write the full worksheet content for a color printable DOCX.

Format:
- Title: АНГЛИЙСКИЙ НА БУМАГУ — Lesson <number>
- Topic line
- Name and date fields
- Goal line in very simple English
- Phrase bank table: English phrase, Ukrainian meaning, key word, simple English note
- Then exactly 10 task sections with handwritten answer space
- Add one Reading Practice block: one normal-length English text plus at least 3 tasks based only on the text
- Last page: Answer Key

Style rules:
- English phrases should be marked for blue accent;
- Ukrainian meanings should be marked for warm red accent;
- key words and memory tips should be marked for green accent;
- keep instructions short but clear;
- explanations must be in English only and very simple;
- tasks must be varied and age-appropriate;
- include no technical generator words.
```

## Generator Prompt 3: DOCX Build And QA

```text
Build the worksheet as a DOCX for printing.

Layout:
- US Letter portrait;
- 1 inch margins;
- readable school worksheet typography;
- colored accents: English blue, Russian red, key word green, soft yellow task headers;
- enough blank lines for handwriting;
- no crowded tables;
- answer key starts on a new page.

Quality checks:
- document opens as a valid DOCX;
- all 10 task types are present;
- Reading Practice is present with at least 3 tasks for one text;
- phrase bank has exactly 8 phrases;
- explanations are in simple English;
- no text should be clipped;
- no dense wall of text;
- final answer should link only the DOCX unless asked for internals.
```
