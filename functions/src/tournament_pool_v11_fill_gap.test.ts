import { buildFillGapCandidates, type FillGapCategory } from './tournament_pool_v11_fill_gap';
import type { SourceDay, SourcePhrase } from './tournament_task_factory';

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

    expect(new Set(candidates.map((item) => item.category))).toEqual(new Set(expected));
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

  it('rejects repeated tokens, unsupported or multi-token options, duplicates, length giveaways, and unprovable traps', () => {
    expect(buildFillGapCandidates(day, phrase('repeat', 'Go go now.', 'go', 'verb', ['went', 'goes', 'walk']))).toEqual([]);
    expect(buildFillGapCandidates(day, phrase('bad', 'We walk home.', 'walk', 'verb', ['walked away', 'walk!', 'supercalifragilistic']))).toEqual([]);
    expect(buildFillGapCandidates(day, phrase('duplicate', 'We walk home.', 'walk', 'verb', ['walked', 'WALKED', 'goes']))).toEqual([]);
  });
});
