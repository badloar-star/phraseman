import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_04_LOCALIZED_DETAILS } from './es_episode_01_session_04_localized_details_v1';

// зачем этот файл (владелец, 2026-08-24): фразы применения для сессии 4 —
// «Es verdadero» и «Es verdadera» показывают согласование признака «истинный»
// по роду, признак известный к этому моменту. es — сессия 1, verdadero/
// verdadera — word-first этой сессии. Никаких новых слов внутри фраз.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s04-es-verdadero',
      english: 'Es verdadero',
      russian: 'Это истинно (о предмете мужского рода)',
      explanation:
        'Оценка предмета мужского рода: не «правда» как существительное, а признак «истинный». Форма на -o согласуется с родом.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка предмета не о говорящем — Es.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — это «ты». Про предмет — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'verdadero',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'verdadera',
              reasonCode: 'gender_mismatch:verdadero',
              why: 'Verdadera — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: verdadero.',
              trapType: 'grammar',
            },
            {
              value: 'verdad',
              reasonCode: 'wrong_word_class:verdadero',
              why: 'Verdad — существительное «правда», предмет, а не признак. Признак предмета — verdadero.',
              trapType: 'grammar',
            },
          ],
        },
      ],
      features: ['ser', 'gender_agreement_full', 'truth_adjective'],
    },
    {
      id: 'es-e01-s04-es-verdadera',
      english: 'Es verdadera',
      russian: 'Это истинно (о предмете женского рода)',
      explanation:
        'Та же оценка, но предмет женского рода. Меняется только концовка признака: -o становится -a, связка es не меняется вовсе.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка предмета не о говорящем — Es.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — это «ты». Про предмет — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'verdadera',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'verdadero',
              reasonCode: 'gender_mismatch:verdadera',
              why: 'Verdadero — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: verdadera.',
              trapType: 'grammar',
            },
            {
              value: 'bonita',
              reasonCode: 'wrong_word:verdadera',
              why: 'Bonita означает «красивая» — совсем другой признак, не про истинность. Нужно verdadera.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'gender_agreement_full', 'truth_adjective'],
    },
  ]);

export const ES_EPISODE_01_SESSION_04_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_04_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
