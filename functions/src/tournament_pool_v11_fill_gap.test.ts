import { buildFillGapCandidates, buildIrregularLemmaFamilies, buildIrregularNounFamilies, type FillGapCategory } from './tournament_pool_v11_fill_gap';
import { phraseTokens, type SourceDay, type SourcePhrase } from './tournament_task_factory';

const day: SourceDay = {
  planId: 'v11', dayIndex: 7, level: 'A2', phrases: [],
};

function phrase(
  id: string,
  english: string,
  token: string,
  partOfSpeech: string,
  distractors: readonly string[],
): SourcePhrase {
  return {
    id,
    english,
    meaning: { ru: 'Контекст для проверки.' },
    words: [{ text: token, partOfSpeech, distractors }],
  };
}

describe('buildFillGapCandidates', () => {
  it('fails closed on authored regular-verb lookalikes for She closes the door at night', () => {
    const source = phrase(
      'closes', 'She closes the door at night.', 'closes', 'verb', ['close', 'closed', 'locks'],
    );

    expect(buildFillGapCandidates(day, source)).toEqual([]);
  });

  it('creates typed candidates across all supported categories with exact authored reconstruction', () => {
    const fixtures = [
      phrase('verb', 'They make dinner.', 'make', 'verb', ['makes', 'made', 'cook']),
      phrase('noun', 'The cat sleeps.', 'cat', 'noun', ['dog', 'rat', 'bat']),
      phrase('adjective', 'A red car stopped.', 'red', 'adjective', ['big', 'old', 'new']),
      phrase('adverb', 'She sings loudly.', 'loudly', 'adverb', ['softly', 'badly', 'slowly']),
      phrase('particle', 'Turn off lights.', 'off', 'phrasal particle', ['on', 'up', 'out']),
      phrase('preposition', 'Sit on chairs.', 'on', 'preposition', ['in', 'by', 'at']),
      phrase('modal', 'You can swim.', 'can', 'modal', ['may', 'must', 'will']),
      phrase('pronoun', 'He likes tea.', 'He', 'pronoun', ['She', 'We', 'It']),
      phrase('conjunction', 'Tea and cake.', 'and', 'conjunction', ['but', 'or', 'so']),
      phrase('determiner', 'These books help.', 'These', 'determiner', ['Those', 'Some', 'Many']),
      phrase('existential', 'There are books.', 'There', 'existential', ['Here', 'Where', 'Then']),
      phrase('article', 'A dog runs.', 'A', 'article', ['The', 'An', 'No']),
      phrase('to-be', 'They are ready.', 'are', 'to be', ['is', 'am', 'be']),
      phrase('number', 'Meet at 7.', '7', 'number', ['6', '8', '9']),
      phrase('other', 'Please hello now.', 'hello', 'interjection', ['sorry', 'thanks', 'welcome']),
    ];
    const candidates = fixtures.flatMap((item) => buildFillGapCandidates(day, item));
    const expected: FillGapCategory[] = [
      'verb', 'noun', 'adjective', 'adverb', 'phrasal_particle', 'preposition',
      'modal', 'pronoun', 'conjunction', 'determiner', 'existential', 'article',
      'to_be', 'number_time', 'lexical_other',
    ];

    for (const category of expected) expect(candidates.map((item) => item.category)).toContain(category);
    expect(new Set(candidates.map((item) => item.position))).toEqual(new Set(['first', 'middle', 'last']));
    expect([...new Set(candidates.flatMap((item) => item.distractors.map((distractor) => distractor.trapType)))])
      .toEqual(expect.arrayContaining(['morphology', 'government', 'lexical_meaning']));
    const expectedTraps: Readonly<Record<FillGapCategory, readonly string[]>> = {
      verb: ['morphology', 'morphology', 'lexical_meaning'], noun: ['lexical_meaning', 'lexical_meaning', 'lexical_meaning'],
      adjective: ['lexical_meaning', 'lexical_meaning', 'lexical_meaning'], adverb: ['lexical_meaning', 'lexical_meaning', 'lexical_meaning'],
      phrasal_particle: ['government', 'government', 'government'], preposition: ['government', 'government', 'government'],
      modal: ['function_choice', 'function_choice', 'function_choice'], pronoun: ['reference', 'reference', 'reference'],
      conjunction: ['function_choice', 'function_choice', 'function_choice'], determiner: ['function_choice', 'function_choice', 'function_choice'],
      existential: ['function_choice', 'function_choice', 'function_choice'], article: ['function_choice', 'function_choice', 'function_choice'],
      to_be: ['agreement', 'agreement', 'morphology'], number_time: ['lexical_meaning', 'lexical_meaning', 'lexical_meaning'],
      lexical_other: ['lexical_meaning', 'lexical_meaning', 'lexical_meaning'],
    };
    for (const candidate of candidates) {
      expect(candidate.prompt.replace('___', candidate.correctToken)).toBe(candidate.authoredSentence);
      expect(candidate.correctToken.trim().split(/\s+/)).toHaveLength(1);
      expect(candidate.distractors).toHaveLength(3);
      expect(new Set([candidate.correctToken, ...candidate.distractors.map((item) => item.value)].map((item) => item.toLowerCase())).size).toBe(4);
      expect(candidate.distractors.map((item) => item.trapType)).toEqual(expectedTraps[candidate.category]);
      expect(candidate.prompt.split('___')).toHaveLength(2);
      const [before, after] = candidate.prompt.split('___');
      expect(`${before}${candidate.correctToken}${after}`).toBe(candidate.authoredSentence);
    }
  });

  it('rejects a word that occurs more than once in the authored phrase', () => {
    expect(buildFillGapCandidates(day, phrase('repeat', 'Go go now.', 'go', 'verb', ['went', 'goes', 'walk']))).toEqual([]);
  });

  it('rejects a multi-token distractor', () => {
    expect(buildFillGapCandidates(day, phrase('multi', 'We walk home.', 'walk', 'verb', ['walked away', 'walks', 'runs']))).toEqual([]);
  });

  it('rejects an unsupported-character distractor', () => {
    expect(buildFillGapCandidates(day, phrase('unsupported', 'We walk home.', 'walk', 'verb', ['walk!', 'walks', 'runs']))).toEqual([]);
  });

  it('rejects an obvious distractor length giveaway', () => {
    expect(buildFillGapCandidates(day, phrase('length', 'We walk home.', 'walk', 'verb', ['supercalifragilistic', 'walks', 'runs']))).toEqual([]);
  });

  it('rejects duplicate normalized authored distractors', () => {
    expect(buildFillGapCandidates(day, phrase('duplicate', 'We walk home.', 'walk', 'verb', ['walked', 'WALKED', 'goes']))).toEqual([]);
  });

  it('rejects an authored closes versus close regular-verb pair without morphology guessing', () => {
    expect(buildFillGapCandidates(day, phrase(
      'closes-close', 'She closes the door.', 'closes', 'verb', ['close', 'closed', 'locks'],
    ))).toEqual([]);
  });

  it('does not invent content-word distractors when authored evidence is short', () => {
    expect(buildFillGapCandidates(day, phrase('sleep', 'They sleep now.', 'sleep', 'verb', []))).toEqual([]);
  });

  it('rejects an unknown or empty part of speech instead of treating it as lexical_other', () => {
    expect(buildFillGapCandidates(day, phrase('unknown', 'They sleep now.', 'sleep', 'mystery', ['sleeps', 'slept', 'rest']))).toEqual([]);
    expect(buildFillGapCandidates(day, phrase('empty', 'They sleep now.', 'sleep', '', ['sleeps', 'slept', 'rest']))).toEqual([]);
  });

  it.each(['constructor', 'toString', '__proto__'])('rejects prototype part-of-speech aliases: %s', (partOfSpeech) => {
    expect(buildFillGapCandidates(day, phrase('prototype-pos', 'They sleep now.', 'sleep', partOfSpeech, ['sleeps', 'slept', 'rest']))).toEqual([]);
  });

  it('uses lexical meaning traps, never collocation, for authored lexical-other and number options', () => {
    const yes = buildFillGapCandidates(day, phrase('yes', 'Yes, we can.', 'Yes', 'interjection', ['No', 'Maybe', 'Later'])).at(0);
    const seven = buildFillGapCandidates(day, phrase('seven', 'Meet at 7.', '7', 'number', ['6', '8', '9'])).at(0);

    for (const candidate of [yes, seven]) {
      expect(candidate).toBeDefined();
      for (const distractor of candidate?.distractors ?? []) {
        expect(distractor.trapType).toBe('lexical_meaning');
        expect(distractor.reason).toContain(distractor.value);
        expect(distractor.reason).toContain(candidate?.correctToken);
        expect(distractor.reason).toContain('Контекст для проверки.');
      }
    }
  });

  it('rejects same-past to_be substitutions as unprovable', () => {
    expect(buildFillGapCandidates(day, phrase(
      'irrealis-were', 'If he were here.', 'were', 'to be', ['was', 'is', 'be'],
    ))).toEqual([]);
  });

  it('rejects ambiguous axes, axe, and axis noun surfaces instead of typing a false inflection trap', () => {
    expect(buildFillGapCandidates(day, phrase(
      'ambiguous-axes', 'The axes are useful.', 'axes', 'noun', ['axe', 'axis', 'tools'],
    ))).toEqual([]);
  });

  it('rejects authored sentences that already contain the fill-gap sentinel', () => {
    expect(buildFillGapCandidates(day, phrase(
      'authored-sentinel', 'Sleep ___ now.', 'Sleep', 'verb', ['sleeps', 'slept', 'rests'],
    ))).toEqual([]);
  });

  it('rejects conflicting irregular family surfaces during registry construction', () => {
    expect(() => buildIrregularLemmaFamilies([
      { base: 'alpha', thirdPerson: 'shares', past: 'alphaed', participle: 'alphaed', gerund: 'alphaing' },
      { base: 'beta', thirdPerson: 'shares', past: 'betaed', participle: 'betaed', gerund: 'betaing' },
    ])).toThrow(/shares.*alpha.*beta/i);
  });

  it('classifies an exact make-a-decision versus do-family substitution as collocation', () => {
    const candidate = buildFillGapCandidates(day, phrase(
      'made-decision', 'She made a decision.', 'made', 'verb', ['make', 'did', 'does'],
    )).at(0);
    const did = candidate?.distractors.find((item) => item.value === 'did');

    expect(candidate).toBeDefined();
    expect(did).toEqual(expect.objectContaining({ value: 'did', trapType: 'collocation' }));
    expect(did?.reason).toContain('did');
    expect(did?.reason).toContain('made');
    expect(did?.reason).toContain('made a decision');
  });

  it.each(['tree', 'table', 'support system', 'maker', 'making'])('does not infer make-a-decision collocation beyond its exact complement boundary: %s', (suffix) => {
    const candidate = buildFillGapCandidates(day, phrase(
      `made-decision-${suffix.replace(/\s+/gu, '-')}`, `She made a decision ${suffix}.`, 'made', 'verb', ['make', 'did', 'does'],
    )).at(0);

    expect(candidate).toBeDefined();
    expect(candidate?.distractors.find((item) => item.value === 'did')).toEqual(expect.objectContaining({
      value: 'did', trapType: 'lexical_meaning',
    }));
  });

  it.each(['yesterday', 'that mattered'])('rejects unparsed make-a-decision trailing material instead of labeling it lexical: %s', (suffix) => {
    expect(buildFillGapCandidates(day, phrase(
      `made-decision-unparsed-${suffix.replace(/\s+/gu, '-')}`, `She made a decision ${suffix}.`, 'made', 'verb', ['make', 'did', 'does'],
    ))).toEqual([]);
  });

  it('promotes uncontracted be forms from both verb aliases and rejects contracted be forms', () => {
    const pluralVerbAlias = buildFillGapCandidates(day, phrase(
      'verbs-are', 'They are ready.', 'are', 'verbs', ['is', 'am', 'be'],
    )).at(0);

    expect(pluralVerbAlias).toEqual(expect.objectContaining({ category: 'to_be' }));
    expect(buildFillGapCandidates(day, phrase(
      'contracted-be', "He isn't ready.", "isn't", 'verb', ['is', 'are', 'be'],
    ))).toEqual([]);
  });

  it.each([
    ["isn't", "He isn't ready.", 'existential'], ["aren't", "They aren't ready.", 'to be'], ["wasn't", "It wasn't ready.", 'verb'],
    ["weren't", "They weren't ready.", 'verbs'], ["ain't", "It ain't ready.", 'verb'], ["I'm", "I'm ready.", 'to be'],
    ["you're", "You're ready.", 'verb'], ["he's", "He's ready.", 'existential'], ["she's", "She's ready.", 'to be'],
    ["it's", "It's ready.", 'verb'], ["we're", "We're ready.", 'verbs'], ["they're", "They're ready.", 'to be'],
    ["there's", "There's a book.", 'existential'], ["here's", "Here's a book.", 'verb'], ["that's", "That's ready.", 'to be'],
    ["what's", "What's ready.", 'verb'], ["who's", "Who's ready.", 'verbs'], ["how's", "How's it going.", 'existential'],
  ])('rejects governed be contraction %s independently of its POS alias', (token, english, partOfSpeech) => {
    expect(buildFillGapCandidates(day, phrase(`contracted-${token}`, english, token, partOfSpeech, ['is', 'are', 'be']))).toEqual([]);
  });

  it('keeps non-be contractions eligible for ordinary verb classification', () => {
    expect(buildFillGapCandidates(day, phrase(
      'dont', "They don't know.", "don't", 'verb', ['active', 'present', 'waiting'],
    ))).toEqual(expect.arrayContaining([expect.objectContaining({ category: 'verb' })]));
  });

  it.each([
    ["where's", "Where's the book.", 'verb'], ["why's", "Why's it ready.", 'to be'], ["who're", "Who're ready.", 'existential'],
    ["what're", "What're ready.", 'verb'], ["there're", "There're books.", 'to be'], ["where\u2019s", "Where\u2019s the book.", 'existential'],
  ])('rejects bounded positive be contraction %s before POS mapping', (token, english, partOfSpeech) => {
    expect(buildFillGapCandidates(day, phrase(`positive-${token}`, english, token, partOfSpeech, ['is', 'are', 'be']))).toEqual([]);
  });

  it.each([
    ['ox', 'oxen'], ['die', 'dice'],
  ])('rejects the governed irregular noun pair %s/%s in an isolated candidate probe', (singular, plural) => {
    expect(buildFillGapCandidates(day, phrase(
      `isolated-${plural}`, `The ${plural} arrive.`, plural, 'noun', [singular, 'dogs', 'cats'],
    ))).toEqual([]);
  });

  it.each([
    ['cactus', 'cacti'], ['alumnus', 'alumni'],
  ])('rejects the expanded governed irregular noun pair %s/%s in an isolated candidate probe', (singular, plural) => {
    expect(buildFillGapCandidates(day, phrase(
      `expanded-${plural}`, `The ${plural} arrive.`, plural, 'noun', [singular, 'dogs', 'cats'],
    ))).toEqual([]);
  });

  it.each([
    ['corpus', 'corpora'], ['genus', 'genera'], ['opus', 'opera'],
  ])('rejects governed noun exception %s/%s without a lexical claim', (singular, plural) => {
    expect(buildFillGapCandidates(day, phrase(
      `exception-${plural}`, `The ${plural} arrive.`, plural, 'noun', [singular, 'dogs', 'cats'],
    ))).toEqual([]);
  });

  it.each([
    ['bacterium', 'bacteria'], ['diagnosis', 'diagnoses'], ['matrix', 'matrices'],
  ])('rejects generalized Latin or Greek noun pair %s/%s without a lexical claim', (singular, plural) => {
    expect(buildFillGapCandidates(day, phrase(
      `generalized-${plural}`, `The ${plural} arrive.`, plural, 'noun', [singular, 'dogs', 'cats'],
    ))).toEqual([]);
  });

  it.each([
    ["Anna's", "Anna's ready.", 'verb'], ["Anna\u2019s", "Anna\u2019s ready.", 'to be'],
    ["Mary-Jane's", "Mary-Jane's ready.", 'existential'], ["O'Brien's", "O'Brien's ready.", 'verb'], ["O’Brien’s", "O’Brien’s ready.", 'to be'],
    ["R2-D2's", "R2-D2's ready.", 'verb'], ["R2-D2’s", "R2-D2’s ready.", 'to be'], ["Room7's", "Room7's ready.", 'existential'],
  ])('rejects open-world positive be-shaped contraction %s before POS mapping', (token, english, partOfSpeech) => {
    // These are length-safe, distinct authored options, so only the contraction gate can reject this source.
    expect(buildFillGapCandidates(day, phrase(
      `open-world-${token}`, english, token, partOfSpeech, ['active', 'present', 'waiting'],
    ))).toEqual([]);
  });

  it('canonicalizes irregular noun families before collision detection', () => {
    expect(() => buildIrregularNounFamilies([
      ['alpha', 'SHARES'], ['beta', 'ＳＨＡＲＥＳ'],
    ])).toThrow(/shares.*alpha.*beta/i);
  });

  it.each([
    ['axis', 'axes'], ['basis', 'bases'], ['child', 'children'], ['person', 'people'], ['man', 'men'], ['woman', 'women'],
    ['tooth', 'teeth'], ['foot', 'feet'], ['mouse', 'mice'], ['goose', 'geese'], ['analysis', 'analyses'], ['crisis', 'crises'],
    ['thesis', 'theses'], ['phenomenon', 'phenomena'], ['criterion', 'criteria'], ['datum', 'data'], ['medium', 'media'],
    ['index', 'indices'], ['appendix', 'appendices'], ['leaf', 'leaves'], ['knife', 'knives'], ['life', 'lives'], ['wife', 'wives'],
    ['wolf', 'wolves'], ['calf', 'calves'], ['half', 'halves'], ['loaf', 'loaves'], ['shelf', 'shelves'], ['thief', 'thieves'],
  ])('rejects governed irregular noun pair %s/%s without inventing a typed inflection trap', (singular, plural) => {
    expect(buildFillGapCandidates(day, phrase(
      `noun-${plural}`, `The ${plural} arrive.`, plural, 'noun', [singular, 'dogs', 'cats'],
    ))).toEqual([]);
  });

  it('rejects ambiguous bases, base, and basis noun surfaces instead of typing a false inflection trap', () => {
    expect(buildFillGapCandidates(day, phrase(
      'ambiguous-bases', 'The bases are useful.', 'bases', 'noun', ['base', 'basis', 'tools'],
    ))).toEqual([]);
  });

  it('canonicalizes registry forms before collision checks and runtime lookup', () => {
    expect(() => buildIrregularLemmaFamilies([
      { base: 'alpha', thirdPerson: 'SHARES', past: 'alphaed', participle: 'alphaed', gerund: 'alphaing' },
      { base: 'beta', thirdPerson: 'ＳＨＡＲＥＳ', past: 'betaed', participle: 'betaed', gerund: 'betaing' },
    ])).toThrow(/shares.*alpha.*beta/i);
    expect(buildIrregularLemmaFamilies([
      { base: 'ＭＡＫＥ', thirdPerson: 'ＭＡＫＥＳ', past: 'ＭＡＤＥ', participle: 'ＭＡＤＥ', gerund: 'ＭＡＫＩＮＧ' },
    ]).get('makes')).toBe('make');
  });

  it('rejects raw distractors that would need whitespace repair and malformed distractor collections', () => {
    expect(buildFillGapCandidates(day, phrase('spaces', 'They sleep now.', 'sleep', 'verb', [' sleeps', 'slept', 'rest']))).toEqual([]);
    const malformed = {
      ...phrase('collection', 'They sleep now.', 'sleep', 'verb', []),
      words: [{ text: 'sleep', partOfSpeech: 'verb', distractors: 'sleeps' }],
    } as unknown as SourcePhrase;
    expect(buildFillGapCandidates(day, malformed)).toEqual([]);
  });

  it('rejects NFKC-equivalent authored options', () => {
    expect(buildFillGapCandidates(day, phrase('nfkc', 'An A fits.', 'A', 'noun', ['Ａ', 'B', 'C']))).toEqual([]);
  });

  it('rejects an unchanged authored option rather than filling it with a fallback', () => {
    expect(buildFillGapCandidates(day, phrase('unchanged', 'They sleep now.', 'sleep', 'verb', ['sleep', 'slept', 'rest']))).toEqual([]);
  });

  it('keeps only one candidate when duplicate source records produce the same normalized option set', () => {
    const source: SourcePhrase = {
      ...phrase('set', 'They sleep now.', 'sleep', 'verb', ['sleeps', 'slept', 'rest']),
      words: [
        { text: 'sleep', partOfSpeech: 'verb', distractors: ['sleeps', 'slept', 'rest'] },
        { text: 'sleep', partOfSpeech: 'verb', distractors: ['SLEEPS', 'SLEPT', 'REST'] },
      ],
    };
    expect(buildFillGapCandidates(day, source)).toHaveLength(1);
  });

  it('uses the same lexical-token contract as phraseTokens, including curly apostrophes and punctuation', () => {
    const source = phrase('dont', 'I don’t know.', 'don’t', 'verb', ['dont', 'doesn’t', 'didn’t']);
    const candidate = buildFillGapCandidates(day, source).at(0);
    expect(phraseTokens(source.english)).toContain('don’t');
    expect(candidate?.correctToken).toBe('don’t');
    expect(candidate?.prompt.replace('___', candidate.correctToken ?? '')).toBe(source.english);
  });

  it('rejects correct tokens beyond the option byte limit', () => {
    const seventyEs = 'é'.repeat(70);
    expect(buildFillGapCandidates(day, phrase('bytes', `${seventyEs} now.`, seventyEs, 'noun', ['a'.repeat(70), 'b'.repeat(70), 'c'.repeat(70)]))).toEqual([]);
  });

  it('rejects a prompt beyond the tournament prompt byte limit', () => {
    expect(buildFillGapCandidates(day, phrase('prompt-bytes', `${'word '.repeat(130)}sleep.`, 'sleep', 'verb', ['sleeps', 'slept', 'rests']))).toEqual([]);
  });

  it('classifies conservative verb lemma variants as morphology with token-specific reasons', () => {
    const running = buildFillGapCandidates(day, phrase(
      'running', 'They are running.', 'running', 'verb', ['run', 'runs', 'jogging'],
    )).at(0);
    const flies = buildFillGapCandidates(day, phrase(
      'flies', 'It flies high.', 'flies', 'verb', ['fly', 'soars', 'lands'],
    )).at(0);
    for (const [candidate, values] of [[running, ['run', 'runs']], [flies, ['fly']]] as const) {
      for (const value of values) {
        const distractor = candidate?.distractors.find((item) => item.value === value);
        expect(distractor).toEqual(expect.objectContaining({ trapType: 'morphology' }));
        expect(distractor?.reason).toContain(value);
        expect(distractor?.reason).toContain(candidate?.correctToken);
        expect(distractor?.reason).toMatch(/form|inflection/i);
      }
    }
  });

  it('rejects potential noun inflections without authoritative lemma metadata', () => {
    expect(buildFillGapCandidates(day, phrase(
      'cat-form', 'A cat sleeps.', 'cat', 'noun', ['cats', 'dog', 'rat'],
    ))).toEqual([]);
    expect(buildFillGapCandidates(day, phrase(
      'leaves-form', 'The leaves fall.', 'leaves', 'noun', ['leave', 'leaf', 'trees'],
    ))).toEqual([]);
  });

  it('fills a regular verb only with explicitly generated same-lemma morphology forms', () => {
    const candidate = buildFillGapCandidates(day, phrase(
      'play-fallback', 'They play outside.', 'play', 'verb', [],
    )).at(0);

    expect(candidate?.distractors.map((item) => item.value)).toEqual(['plays', 'played', 'playing']);
    expect(candidate?.distractors.every((item) => item.trapType === 'morphology')).toBe(true);
    expect(candidate?.distractors.some((item) => /walk|run/i.test(item.value))).toBe(false);
    expect(buildFillGapCandidates(day, phrase('go-fallback', 'They go outside.', 'go', 'verb', []))).toEqual([]);
  });

  it.each(['repay', 'prepay', 'underpay', 'overpay', 'gainsay', 'waylay'])('does not generate morphology fallbacks for ungoverned base %s', (token) => {
    expect(buildFillGapCandidates(day, phrase(
      `unguarded-fallback-${token}`, `They ${token} now.`, token, 'verb', [],
    ))).toEqual([]);
  });

  it('accepts combining-mark tokens with exact punctuation reconstruction while retaining NFKC duplicate rejection', () => {
    const decomposed = 'e\u0301lan';
    const source = phrase('combining', `An ${decomposed}.`, decomposed, 'noun', ['plan', 'clan', 'bean']);
    const candidate = buildFillGapCandidates(day, source).at(0);

    expect(phraseTokens(source.english)).toContain(decomposed);
    expect(candidate?.correctToken).toBe(decomposed);
    expect(candidate?.prompt.replace('___', candidate.correctToken ?? '')).toBe(source.english);
    expect(buildFillGapCandidates(day, phrase('combining-duplicate', `An ${decomposed}.`, decomposed, 'noun', ['élan', 'plan', 'clan']))).toEqual([]);
  });

  it('uses morphology, not agreement, for cross-tense to_be alternatives', () => {
    const candidate = buildFillGapCandidates(day, phrase(
      'he-is', 'He is ready.', 'is', 'to be', ['was', 'are', 'be'],
    )).at(0);
    const was = candidate?.distractors.find((item) => item.value === 'was');
    const are = candidate?.distractors.find((item) => item.value === 'are');

    expect(was).toEqual(expect.objectContaining({ trapType: 'morphology' }));
    expect(was?.reason).toMatch(/was.*is.*form|inflection/i);
    expect(are).toEqual(expect.objectContaining({ trapType: 'agreement' }));
  });

  it('rejects authored regular es verb and noun inflections without lemma evidence', () => {
    const watches = buildFillGapCandidates(day, phrase(
      'watches', 'He watches birds.', 'watches', 'verb', ['watch', 'watched', 'looks'],
    )).at(0);
    const bus = buildFillGapCandidates(day, phrase(
      'bus', 'A bus stops.', 'bus', 'noun', ['buses', 'car', 'van'],
    )).at(0);

    expect(watches).toBeUndefined();
    expect(bus).toBeUndefined();
  });

  it.each([
    ['singes', 'He singes wood.', 'sing'], ['hoped', 'She hoped today.', 'hop'],
  ])('rejects speculative authored regular-verb neighbor %s/%s', (token, english, neighbor) => {
    expect(buildFillGapCandidates(day, phrase(
      `neighbor-${token}`, english, token, 'verb', [neighbor, 'walk', 'talk'],
    ))).toEqual([]);
  });

  it.each([
    ['panicked', 'They panicked today.', 'panic'], ['picnicking', 'They are picnicking.', 'picnic'],
    ['tying', 'They are tying.', 'tie'], ['dying', 'They are dying.', 'die'], ['quizzes', 'She quizzes us.', 'quiz'],
  ])('rejects productive but unproved regular verb pair %s/%s', (token, english, neighbor) => {
    expect(buildFillGapCandidates(day, phrase(
      `productive-${token}`, english, token, 'verb', [neighbor, 'walk', 'talk'],
    ))).toEqual([]);
  });

  it.each([
    ['burned', 'burnt'], ['learned', 'learnt'],
  ])('rejects governed alternate verb form %s/%s without a lexical or morphology claim', (correct, wrong) => {
    expect(buildFillGapCandidates(day, phrase(
      `alternate-${correct}`, `They ${correct} it.`, correct, 'verb', [wrong, 'walked', 'talked'],
    ))).toEqual([]);
  });

  it.each([
    ['spilled', 'spilt'], ['dwelled', 'dwelt'], ['dived', 'dove'], ['sneaked', 'snuck'], ['pleaded', 'pled'],
    ['proved', 'proven'], ['sowed', 'sown'], ['mowed', 'mown'], ['sawed', 'sawn'], ['got', 'gotten'],
    ['showed', 'shown'], ['sewed', 'sewn'], ['waked', 'woke'], ['woke', 'woken'], ['fit', 'fitted'], ['forecast', 'forecasted'],
  ])('rejects governed variant verb form %s/%s without morphology or lexical classification', (correct, wrong) => {
    expect(buildFillGapCandidates(day, phrase(
      `variant-${correct}-${wrong}`, `They ${correct} it.`, correct, 'verb', [wrong, 'walked', 'talked'],
    ))).toEqual([]);
  });

  it.each([
    ['spell', 'spelt'], ['smell', 'smelt'], ['kneel', 'knelt'], ['light', 'lit'],
    ['spill', 'spilt'], ['dwell', 'dwelt'], ['dive', 'dove'], ['sneak', 'snuck'], ['plead', 'pled'],
    ['burn', 'burnt'], ['learn', 'learnt'], ['dream', 'dreamt'], ['spoil', 'spoilt'], ['leap', 'leapt'],
    ['prove', 'proven'], ['sow', 'sown'], ['mow', 'mown'], ['saw', 'sawn'], ['get', 'gotten'],
    ['show', 'shown'], ['sew', 'sewn'], ['wake', 'waked'], ['fit', 'fitted'], ['forecast', 'forecasted'],
  ])('rejects canonical alternate-verb base %s with variant %s without a lexical or morphology claim', (base, variant) => {
    expect(buildFillGapCandidates(day, phrase(
      `alternate-base-${base}-${variant}`, `They ${base} it.`, base, 'verb', [variant, 'walked', 'talked'],
    ))).toEqual([]);
  });

  it('rejects the two-letter regular-looking up/upped authored pair', () => {
    expect(buildFillGapCandidates(day, phrase(
      'productive-upped', 'They upped it.', 'upped', 'verb', ['up', 'walk', 'talk'],
    ))).toEqual([]);
  });

  it.each(['say', 'buy', 'pay'])('does not fabricate regular morphology fallbacks for irregular base %s', (token) => {
    expect(buildFillGapCandidates(day, phrase(
      `irregular-fallback-${token}`, `They ${token} now.`, token, 'verb', [],
    ))).toEqual([]);
  });

  it('keeps unrelated locks as a lexical candidate against closes', () => {
    const candidate = buildFillGapCandidates(day, phrase(
      'closes-locks', 'She closes the door.', 'closes', 'verb', ['locks', 'opens', 'shuts'],
    )).at(0);
    expect(candidate?.distractors.find((item) => item.value === 'locks')).toEqual(expect.objectContaining({
      value: 'locks', trapType: 'lexical_meaning',
    }));
  });

  it('classifies bounded irregular do and go paradigm forms as morphology with form-specific reasons', () => {
    const does = buildFillGapCandidates(day, phrase(
      'does', 'He does work.', 'does', 'verb', ['do', 'did', 'done'],
    )).at(0);
    const goes = buildFillGapCandidates(day, phrase(
      'goes', 'She goes home.', 'goes', 'verb', ['go', 'went', 'gone'],
    )).at(0);

    for (const candidate of [does, goes]) {
      for (const distractor of candidate?.distractors ?? []) {
        expect(distractor.trapType).toBe('morphology');
        expect(distractor.reason).toContain(distractor.value);
        expect(distractor.reason).toContain(candidate?.correctToken);
        expect(distractor.reason).toMatch(/form|tense|inflection/i);
      }
    }
  });

  it('keeps governed irregular morphology exact instead of deriving do/go lookalike lemmas', () => {
    const does = buildFillGapCandidates(day, phrase(
      'does-lookalike', 'He does work.', 'does', 'verb', ['do', 'did', 'doe'],
    )).at(0);
    const goes = buildFillGapCandidates(day, phrase(
      'goes-lookalike', 'She goes home.', 'goes', 'verb', ['go', 'went', 'goe'],
    )).at(0);

    for (const [candidate, morphology, lookalike] of [
      [does, ['do', 'did'], 'doe'],
      [goes, ['go', 'went'], 'goe'],
    ] as const) {
      expect(candidate).toBeDefined();
      for (const value of morphology) {
        expect(candidate?.distractors.find((item) => item.value === value)).toEqual(expect.objectContaining({
          value, trapType: 'morphology',
        }));
      }
      expect(candidate?.distractors.find((item) => item.value === lookalike)).toEqual(expect.objectContaining({
        value: lookalike, trapType: 'lexical_meaning',
      }));
    }
  });

  it.each([
    ['given', 'They have given help.', ['give', 'gave', 'giving']],
    ['brought', 'She brought it.', ['bring', 'brings', 'bringing']],
    ['told', 'They told us.', ['tell', 'tells', 'telling']],
    ['heard', 'We heard music.', ['hear', 'hears', 'hearing']],
  ])('classifies governed irregular family forms for %s as morphology', (token, english, distractors) => {
    const candidate = buildFillGapCandidates(day, phrase(`irregular-${token}`, english, token, 'verb', distractors)).at(0);

    expect(candidate).toBeDefined();
    for (const value of distractors) {
      expect(candidate?.distractors.find((item) => item.value === value)).toEqual(expect.objectContaining({
        value, trapType: 'morphology',
      }));
    }
  });

  it('classifies a fronted-material same-tense to_be substitution as agreement', () => {
    const candidate = buildFillGapCandidates(day, phrase(
      'fronted-subject', 'Today he is ready.', 'is', 'to be', ['are', 'was', 'be'],
    )).at(0);

    expect(candidate).toBeDefined();
    expect(candidate?.distractors.find((item) => item.value === 'are')).toEqual(expect.objectContaining({
      value: 'are', trapType: 'agreement',
    }));
  });

  it('classifies same-tense to_be substitutions as agreement without a pronoun subject', () => {
    const candidate = buildFillGapCandidates(day, phrase(
      'no-subject', 'Today is ready.', 'is', 'to be', ['are', 'was', 'be'],
    )).at(0);

    expect(candidate).toBeDefined();
    expect(candidate?.distractors.find((item) => item.value === 'are')).toEqual(expect.objectContaining({
      value: 'are', trapType: 'agreement',
    }));
  });

  it.each([
    ['I think the books are ready.', 'are', 'is'],
    ['The message for you is ready.', 'is', 'are'],
    ['You and I are ready.', 'are', 'is'],
  ])('classifies same-tense to_be substitutions as agreement without subject inference: %s', (english, token, wrong) => {
    const candidate = buildFillGapCandidates(day, phrase(`to-be-${token}-${wrong}`, english, token, 'to be', [wrong, 'was', 'be'])).at(0);

    expect(candidate).toBeDefined();
    expect(candidate?.distractors.find((item) => item.value === wrong)).toEqual(expect.objectContaining({
      value: wrong, trapType: 'agreement',
    }));
    expect(candidate?.distractors.find((item) => item.value === 'was')).toEqual(expect.objectContaining({
      value: 'was', trapType: 'morphology',
    }));
  });

  it('rejects candidates with ambiguous found and saw irregular surfaces instead of typing them', () => {
    const found = buildFillGapCandidates(day, phrase(
      'ambiguous-found', 'Workers found companies.', 'found', 'verb', ['find', 'founding', 'founder'],
    ));
    const saw = buildFillGapCandidates(day, phrase(
      'ambiguous-saw', 'They saw timber.', 'saw', 'verb', ['see', 'saws', 'sawing'],
    ));

    expect(found).toEqual([]);
    expect(saw).toEqual([]);
  });

  it.each([
    ['became', 'They became ready.', ['become', 'becomes', 'becoming']],
    ['began', 'They began work.', ['begin', 'begins', 'begun']],
    ['broken', 'She has broken it.', ['break', 'broke', 'breaking']],
  ])('classifies expanded governed irregular family forms for %s as morphology', (token, english, distractors) => {
    const candidate = buildFillGapCandidates(day, phrase(`expanded-irregular-${token}`, english, token, 'verb', distractors)).at(0);

    expect(candidate).toBeDefined();
    for (const value of distractors) {
      expect(candidate?.distractors.find((item) => item.value === value)).toEqual(expect.objectContaining({
        value, trapType: 'morphology',
      }));
    }
  });
});
