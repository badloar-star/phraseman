import { buildFillGapCandidates, type FillGapCategory } from './tournament_pool_v11_fill_gap';
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
  it('never labels the grammatical alternative locks as agreement for She closes the door at night', () => {
    const source = phrase(
      'closes', 'She closes the door at night.', 'closes', 'verb', ['close', 'closed', 'locks'],
    );

    const candidate = buildFillGapCandidates(day, source).find((item) => item.correctToken === 'closes');

    expect(candidate).toBeDefined();
    expect(candidate?.distractors).not.toContainEqual(expect.objectContaining({
      value: 'locks', trapType: 'agreement',
    }));
    expect(candidate?.distractors.every((item) => item.reason.includes(item.value))).toBe(true);
    expect(candidate?.distractors.every((item) => item.completedSentence.includes(item.value))).toBe(true);
  });

  it('creates typed candidates across all supported categories with exact authored reconstruction', () => {
    const fixtures = [
      phrase('verb', 'They cook dinner.', 'cook', 'verb', ['cooks', 'cooked', 'bake']),
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
      .toEqual(expect.arrayContaining(['morphology', 'government', 'collocation']));
    for (const candidate of candidates) {
      expect(candidate.prompt.replace('___', candidate.correctToken)).toBe(candidate.authoredSentence);
      expect(candidate.correctToken.trim().split(/\s+/)).toHaveLength(1);
      expect(candidate.distractors).toHaveLength(3);
      expect(new Set([candidate.correctToken, ...candidate.distractors.map((item) => item.value)].map((item) => item.toLowerCase())).size).toBe(4);
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

  it('classifies closes versus close as morphology with a token-specific inflection reason', () => {
    const candidate = buildFillGapCandidates(day, phrase(
      'closes-close', 'She closes the door.', 'closes', 'verb', ['close', 'closed', 'locks'],
    )).at(0);

    expect(candidate?.distractors).toContainEqual(expect.objectContaining({
      value: 'close', trapType: 'morphology',
      reason: expect.stringMatching(/close.*closes.*inflection/i),
    }));
  });

  it('does not invent content-word distractors when authored evidence is short', () => {
    expect(buildFillGapCandidates(day, phrase('sleep', 'They sleep now.', 'sleep', 'verb', []))).toEqual([]);
  });

  it('rejects an unknown or empty part of speech instead of treating it as lexical_other', () => {
    expect(buildFillGapCandidates(day, phrase('unknown', 'They sleep now.', 'sleep', 'mystery', ['sleeps', 'slept', 'rest']))).toEqual([]);
    expect(buildFillGapCandidates(day, phrase('empty', 'They sleep now.', 'sleep', '', ['sleeps', 'slept', 'rest']))).toEqual([]);
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
});
