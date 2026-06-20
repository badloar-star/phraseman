// Standalone validator mirroring app/plan_content_schema.ts + pos_taxonomy WORD_CATEGORIES.
const WORD_CATEGORIES = new Set([
  'verb','noun','pronoun','adjective','adverb','modifier','preposition',
  'syntax','determiner','existential','article','to-be','conjunction',
  'modal','phrasal_particle','other',
]);
const isWordCategory = (v) => typeof v === 'string' && WORD_CATEGORIES.has(v);
const EXPLANATION_MAX_WORDS = 24;
const PLAN_DAY_MIN_PHRASES = 5, PLAN_DAY_MAX_PHRASES = 10;
const PLAN_DAY_MIN_VOCAB = 5, PLAN_DAY_MAX_VOCAB = 8, PLAN_DAY_MAX_INTRO = 4;
const WORD_MIN_DISTRACTORS = 5, WORD_MAX_DISTRACTORS = 5;

function phraseTokens(english) {
  return english.replace(/[.?!,;]+/g, ' ').split(/\s+/).map(t => t.trim()).filter(Boolean);
}
function wordCount(t){ return t.trim().split(/\s+/).filter(Boolean).length; }
function hasRu(t){ return Boolean(t && typeof t.ru === 'string' && t.ru.trim().length > 0); }

const day = JSON.parse(process.argv[2]);
const issues = [];

if (!day.phrases || day.phrases.length === 0) issues.push('missing_phrases');
else {
  if (day.phrases.length < PLAN_DAY_MIN_PHRASES) issues.push('too_few_phrases:'+day.phrases.length);
  if (day.phrases.length > PLAN_DAY_MAX_PHRASES) issues.push('too_many_phrases:'+day.phrases.length);
  const seenIds = new Set();
  for (const p of day.phrases) {
    if (seenIds.has(p.id)) issues.push('DUP_ID:'+p.id); seenIds.add(p.id);
    if (!p.english || !p.english.trim()) issues.push('phrase_missing_english:'+p.id);
    if (!hasRu(p.meaning)) issues.push('phrase_missing_meaning:'+p.id);
    if (!p.constructions || p.constructions.length === 0) issues.push('phrase_missing_constructions:'+p.id);
    const e = p.explanation;
    const complete = e && hasRu(e.title) && hasRu(e.rule) && hasRu(e.why) && hasRu(e.commonMistake);
    if (!complete) issues.push('phrase_missing_explanation:'+p.id);
    else {
      for (const part of ['rule','why','commonMistake']) {
        const wc = wordCount(e[part].ru);
        if (wc > EXPLANATION_MAX_WORDS) issues.push(`explanation_too_long:${p.id}:${part}=${wc}`);
      }
    }
    // word count of english (5-7 words requirement)
    const tokCount = phraseTokens(p.english).length;
    if (tokCount < 5 || tokCount > 7) issues.push(`PHRASE_LEN:${p.id}=${tokCount}`);
    if (!p.words || p.words.length === 0) issues.push('phrase_missing_words:'+p.id);
    else {
      const tokenSet = new Set(phraseTokens(p.english).map(t => t.toLowerCase()));
      for (const w of p.words) {
        const lower = w.text.toLowerCase();
        if (/\s/.test(w.text)) issues.push(`MULTIWORD:${p.id}:${w.text}`);
        if (!tokenSet.has(lower)) issues.push(`word_not_in_phrase:${p.id}:${w.text}`);
        if (!isWordCategory(w.partOfSpeech)) issues.push(`word_invalid_pos:${p.id}:${w.text}:${w.partOfSpeech}`);
        const d = w.distractors ?? [];
        if (d.length < WORD_MIN_DISTRACTORS || d.length > WORD_MAX_DISTRACTORS) issues.push(`word_bad_distractor_count:${p.id}:${w.text}=${d.length}`);
        if (d.some(x => x.toLowerCase() === lower)) issues.push(`word_distractor_collides:${p.id}:${w.text}`);
        const dl = d.map(x=>x.toLowerCase());
        if (new Set(dl).size !== dl.length) issues.push(`DUP_DISTRACTOR:${p.id}:${w.text}`);
      }
    }
  }
}

if (!day.vocabulary || day.vocabulary.length === 0) issues.push('missing_vocabulary');
else {
  if (day.vocabulary.length < PLAN_DAY_MIN_VOCAB) issues.push('too_few_vocabulary:'+day.vocabulary.length);
  if (day.vocabulary.length > PLAN_DAY_MAX_VOCAB) issues.push('too_many_vocabulary:'+day.vocabulary.length);
  const phraseText = (day.phrases ?? []).map(p => p.english.toLowerCase()).join(' ');
  for (const v of day.vocabulary) {
    if (!v.partOfSpeech || !v.partOfSpeech.trim()) issues.push('vocab_missing_pos:'+v.word);
    if (!hasRu(v.translation)) issues.push('vocab_missing_translation:'+v.word);
    if (phraseText && !phraseText.includes(v.word.toLowerCase())) issues.push('vocab_not_in_phrases:'+v.word);
  }
}

if (!day.intro || day.intro.length === 0) issues.push('missing_intro');
else {
  if (day.intro.length > PLAN_DAY_MAX_INTRO) issues.push('too_many_intro:'+day.intro.length);
  const validKinds = new Set(['why','how','trap','tip','mechanic']);
  for (const s of day.intro) {
    if (!hasRu(s.title) || !hasRu(s.body)) issues.push('intro_screen_incomplete:'+s.kind);
    if (!validKinds.has(s.kind)) issues.push('intro_bad_kind:'+s.kind);
  }
}

if (!hasRu(day.outcome)) issues.push('missing_outcome');
if (!day.prerequisiteLessons || day.prerequisiteLessons.length === 0) issues.push('missing_prerequisites');
if (day.prerequisiteLessons && day.prerequisiteLessons.includes(42)) issues.push('PREREQ_CONTAINS_42');
if (!['A1','A2','B1','B2'].includes(day.level)) issues.push('BAD_LEVEL:'+day.level);
if (day.planId !== 'voyazh') issues.push('BAD_PLANID:'+day.planId);
if (day.dayIndex !== 42) issues.push('BAD_DAYINDEX:'+day.dayIndex);

// Gate check: recommended constructions must be within lessons 1..32 (all are).
const GATE_MAP = {
  'to-be':1,'pronouns':1,'to-be-negation':2,'to-be-questions':2,'present-simple':3,
  'present-simple-negation':4,'present-simple-questions':5,'wh-questions':6,'to-have':7,
  'prepositions-time':8,'there-is':9,'there-are':9,'modals':10,'past-simple-regular':11,
  'past-simple-irregular':12,'future-simple':13,'comparatives':14,'superlatives':14,
  'possessive-pronouns':15,'phrasal-verbs':16,'present-continuous':17,'imperative':18,
  'prepositions-place':19,'articles':20,'indefinite-pronouns':21,'gerund':22,'passive-voice':23,
  'present-perfect':24,'past-continuous':25,'conditionals':26,'reported-speech':27,
  'reflexive-pronouns':28,'used-to':29,'relative-clauses':30,'complex-object':31,'review':32,
};
for (const p of (day.phrases||[])) {
  for (const c of (p.constructions||[])) {
    const lesson = GATE_MAP[c];
    if (lesson !== undefined && lesson > 32) issues.push(`ABOVE_GATE:${p.id}:${c}=${lesson}`);
    // thematic tags (not in map) are allowed; grammar tags must be <=32
  }
}

console.log(JSON.stringify({ issueCount: issues.length, issues }, null, 2));
