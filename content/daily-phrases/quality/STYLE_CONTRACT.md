# Daily Phrase narrative style contract

Status: owner-approved on 2026-09-20  
Version: `daily-phrase-narrative-style-v1`

The English Daily Phrase corpus is the delivery-style baseline. New Spanish,
French and German descriptions must reproduce its narrative energy and learning
rhythm without translating English idioms or inventing cultural facts.

## Required shape for every RU and UK description

1. Start with `❤️ ` and an immediate human hook: a scene, surprise, direct
   address, recognisable feeling or playful contradiction.
2. Make the target expression part of the story itself. Do not append it as a
   glossary label.
3. Unpack the literal image or central metaphor in plain language.
4. Show a concrete, believable situation in which a speaker would use it.
5. End with a memorable human line, question, light joke or return to the
   opening image. A learner question is optional, never a mandatory slot.
6. Use 50–70 words and 4–7 paced sentences per locale. This is the approved
   authoring band, derived from the English baseline and fixed by the owner.
7. Write RU and UK independently. Matching structure is allowed; mirrored,
   unnatural translation is not.
8. Mention an origin story only when the source evidence supports it. Style
   parity never licenses invented etymology.

## Rejected shape

- thesis → “Так говорят / Так кажуть” → “Например / Наприклад”;
- dictionary or textbook exposition with no person, scene or emotional turn;
- the same opening formula repeated across a batch;
- a learner question inserted into nearly every card as a substitute for
  genuine variety; the English baseline uses a question in about 44% of cards,
  so the deterministic batch ceiling is 60% per locale after target questions
  are removed;
- generic motivational filler, forced slang, fake warmth or a joke unrelated to
  the expression;
- dry correctness that is visibly weaker than the English card beside it.

## Mandatory gates after every authoring or edit batch

Run the deterministic gate on the exact changed rows:

```powershell
node scripts/daily_phrase_style_gate.mjs content/daily-phrases/es/source-bank.json --ids es-001,es-002
```

`PASS` proves only measurable form: both locales exist, length and sentence
rhythm are in band, the target is woven in, rejected dry formulas are absent,
batch openings are not cloned and learner questions do not become an obligatory
template. A vivid scene may pass without directly addressing the learner.

Then a fresh independent `judge_taste` must compare the exact current bytes
with supplied English baseline cards and return a hash-bound PASS receipt.
That judge owns the semantic style questions a regex cannot prove: vividness,
natural imagery, voice, humour, memorable closing and absence of synthetic
prose. A machine PASS without the agent PASS remains `HOLD`; an agent cannot
override a machine failure.

The final release gate calls the deterministic batch style gate again. Editing
any description invalidates its old style review and requires both gates again.
