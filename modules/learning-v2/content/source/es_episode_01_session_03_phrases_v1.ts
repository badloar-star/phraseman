import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_03_LOCALIZED_DETAILS } from './es_episode_01_session_03_localized_details_v1';

// зачем этот файл (владелец, 2026-08-24): фразы применения для сессии 3 —
// «Es bonito» и «Es bonita» показывают согласование признака по роду с уже
// известной связкой es (сессия 1). Слова es и bonito/bonita — единственные
// в этих фразах, оба уже изучены к этому моменту (es — сессия 1, bonito —
// word-first этой сессии, bonita — его женская форма из того же контакта
// build_form). Никаких новых слов внутри фраз — word-first правило соблюдено.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s03-es-bonito',
      english: 'Es bonito',
      russian: 'Это красиво',
      explanation:
        'Оценка предмета мужского рода. Признак согласуется с тем, о чём идёт речь, — здесь нужна форма на -o.',
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
          correct: 'bonito',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'bonita',
              reasonCode: 'gender_mismatch:bonito',
              why: 'Bonita — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: bonito.',
              trapType: 'grammar',
            },
            {
              value: 'fácil',
              reasonCode: 'wrong_word:bonito',
              why: 'Fácil означает «лёгкий» — совсем другой признак, не про внешний вид. Нужно bonito.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s03-es-bonita',
      english: 'Es bonita',
      russian: 'Это красиво (о предмете женского рода)',
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
          correct: 'bonita',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'bonito',
              reasonCode: 'gender_mismatch:bonita',
              why: 'Bonito — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: bonita.',
              trapType: 'grammar',
            },
            {
              value: 'verdad',
              reasonCode: 'wrong_word:bonita',
              why: 'Verdad означает «правда» — совсем другое понятие, не про внешний вид. Нужно bonita.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'gender_agreement_full'],
    },
  ]);

export const ES_EPISODE_01_SESSION_03_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_03_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
