import { lesson1DistractorChoicesV2 } from '../modules/learning-v2/content/source/lesson1_distractor_catalog_v2';

const CASES = [
  ['am', 'I am ready.', 'grammar'],
  ['ready', 'I am ready.', 'semantic_neighbor'],
  ['Sorry', 'Sorry?', 'collocation_pragmatics'],
  ['eight', 'There are eight books.', 'phonetic'],
  ['her', 'This is her book.', 'orthographic'],
  ['I', 'I am here.', 'l1_transfer'],
  ['and', 'I am happy and ready.', 'phrase_assembly'],
] as const;

describe('Lesson 1 semantic distractor catalog', () => {
  it.each(CASES)(
    'builds pair-specific traps for %s and covers %s',
    (correct, phrase, expectedType) => {
      const choices = lesson1DistractorChoicesV2('ru', correct, phrase);
      expect(choices).toHaveLength(5);
      expect(new Set(choices.map((choice) => choice.value)).size).toBe(5);
      expect(choices.some((choice) => choice.trapType === expectedType)).toBe(true);
      choices.forEach((choice) => {
        expect(choice.value.toLowerCase()).not.toBe(correct.toLowerCase());
        expect(choice.reason.toLowerCase()).toContain(choice.value.toLowerCase());
        expect(choice.reason.toLowerCase()).toContain(correct.toLowerCase());
      });
    },
  );

  it.each(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const)(
    'does not reuse one semantic-neighbor explanation skeleton in %s',
    (locale) => {
      const pairs = [
        ['ready', 'I am ready.'],
        ['tired', 'I am tired.'],
        ['book', 'It is a book.'],
        ['teacher', 'I am a teacher.'],
      ] as const;
      const skeletons = pairs.map(([correct, phrase]) => {
        const choice = lesson1DistractorChoicesV2(locale, correct, phrase).find(
          (candidate) => candidate.trapType === 'semantic_neighbor',
        );
        expect(choice).toBeDefined();
        return choice!.reason
          .normalize('NFKC')
          .toLocaleLowerCase(locale)
          .replace(/[«“„][^»”]+[»”]/gu, '{value}')
          .replace(/\s+/gu, ' ')
          .trim();
      });

      expect(new Set(skeletons).size).toBe(skeletons.length);
    },
  );
});
