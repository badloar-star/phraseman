import { EPISODE_01_SESSION_17_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_17_v1';
import { EPISODE_01_SESSION_18_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_18_v1';
import { EPISODE_01_SESSION_19_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_19_v1';
import { EPISODE_01_SESSION_20_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_20_v1';
import { EPISODE_01_SESSION_21_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_21_v1';
import { EPISODE_01_SESSION_22_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_22_v1';
import { EPISODE_01_SESSION_23_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_23_v1';
import { EPISODE_01_SESSION_24_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_24_v1';
import { assertEpisode01Session17To24Contract } from '../modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1';

test('session 17 keeps the third-person pronouns and is contract', () => assertEpisode01Session17To24Contract(EPISODE_01_SESSION_17_SOURCE, 17, 'words_then_phrases', ['third_person_pronoun', 'third_person_singular']));

test('sessions 17 to 24 keep distinct topical intros and one English answer per intro question', () => {
  const sources = [EPISODE_01_SESSION_17_SOURCE, EPISODE_01_SESSION_18_SOURCE, EPISODE_01_SESSION_19_SOURCE, EPISODE_01_SESSION_20_SOURCE, EPISODE_01_SESSION_21_SOURCE, EPISODE_01_SESSION_22_SOURCE, EPISODE_01_SESSION_23_SOURCE, EPISODE_01_SESSION_24_SOURCE];
  const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  locales.forEach((locale) => expect(new Set(sources.map((source) => source.title[locale])).size).toBe(8));
  sources.forEach((source) => source.introPages.forEach((page) => {
    const choices = page.question.choices.map((choice) => choice.ru);
    expect(new Set(choices).size).toBe(3);
    expect(choices[page.question.correctChoiceIndex]).toBe(source.phrases[0].english);
  }));
});
