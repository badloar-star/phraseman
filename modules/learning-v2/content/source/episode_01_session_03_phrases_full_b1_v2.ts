import type { EpisodeSourcePhrase, EpisodeSourceWord } from './episode_01_source_v1';
import { EPISODE_01_SESSION_03_FULL_B1_CONTENT_V2 } from './episode_01_session_03_content_v2';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const word = (correct: string, category: EpisodeSourceWord['category'], alternatives: readonly string[]): EpisodeSourceWord => ({
  correct, category,
  distractors: alternatives.map((value) => ({ value, reasonCode: `s03:${correct}:${value}`, trapType: 'semantic_neighbor' as const, why: `${value} is not ${correct}; it changes the required word and therefore cannot express this exact statement.` })),
});

export const EPISODE_01_SESSION_03_FULL_B1_PHRASES_V2: readonly EpisodeSourcePhrase[] = Object.freeze(
  EPISODE_01_SESSION_03_FULL_B1_CONTENT_V2.phrases.map((phrase) => {
    const complement = phrase.english.split(' ')[2]!.replace('.', '');
    const alternatives = [...EPISODE_01_SESSION_03_FULL_B1_CONTENT_V2.vocabulary
      .map((item) => item.target).filter((target) => target !== complement), 'ready', 'here', 'happy'];
    return {
      id: phrase.id, english: phrase.english.replace('.', ''), russian: phrase.meaning.ru,
      explanation: `This is a complete I am statement about being ${complement}. It is used when the speaker names their current state clearly.`,
      features: ['affirmative_self_statement'],
      words: [word('I', 'pronoun', ['me', 'my', 'i']), word('am', 'to-be', ['is', 'are', 'an']), word(complement, 'adjective', alternatives)],
      localizedDetails: Object.fromEntries(locales.map((locale) => [locale, {
        meaning: phrase.meaning[locale],
        explanation: `I am ${complement}: ${phrase.meaning[locale]}. The last word names the state.`,
        distractors: alternatives.map((value) => ({ value: `I am ${value}`, reason: `${value} names a different state from ${complement}.`, trapType: 'semantic_neighbor' as const })),
        words: [
          { correct: 'I', prompt: 'I', distractors: [{ value: 'me', reason: 'me is not the subject I.', trapType: 'grammar' as const }] },
          { correct: 'am', prompt: 'am', distractors: [{ value: 'is', reason: 'I uses am, not is.', trapType: 'grammar' as const }] },
          { correct: complement, prompt: complement, distractors: alternatives.map((value) => ({ value, reason: `${value} is a different state; use ${complement} for this exact statement.`, trapType: 'semantic_neighbor' as const })) },
        ],
      }])),
    } as EpisodeSourcePhrase;
  }),
);
