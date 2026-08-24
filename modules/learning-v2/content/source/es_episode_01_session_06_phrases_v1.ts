import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_06_LOCALIZED_DETAILS } from './es_episode_01_session_06_localized_details_v1';

// зачем этот файл (владелец, 2026-08-24): фразы применения для сессии 6 —
// «Es único»/«Es única» показывают согласование признака «единственный» по
// роду, признак которого держится на письменном ударении (тильда над ú).
// es — сессия 1, único/única — word-first этой сессии.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s06-es-unico',
      english: 'Es único',
      russian: 'Это единственно в своём роде',
      explanation:
        'Так говорят о предмете или решении мужского рода, которому нет равных или замены. Тильда над ú здесь не украшение, а часть смысла: без неё слово читалось бы с другим ударением.',
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
          correct: 'único',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'única',
              reasonCode: 'gender_mismatch:único',
              why: 'Única — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: único.',
              trapType: 'grammar',
            },
            {
              value: 'unico',
              reasonCode: 'missing_tilde:único',
              why: 'Unico без тильды над u читалось бы с другим ударением. Нужная форма пишется с тильдой: único, не unico.',
              trapType: 'orthographic',
            },
          ],
        },
      ],
      features: ['ser', 'gender_agreement_full', 'written_accent'],
    },
    {
      id: 'es-e01-s06-es-unica',
      english: 'Es única',
      russian: 'Это единственно в своём роде (о предмете женского рода)',
      explanation:
        'Та же оценка, но предмет женского рода — например, идея или возможность. Меняется только концовка признака: -o становится -a, а тильда над ú остаётся на месте в обеих формах.',
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
          correct: 'única',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'único',
              reasonCode: 'gender_mismatch:única',
              why: 'Único — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: única.',
              trapType: 'grammar',
            },
            {
              value: 'verdadera',
              reasonCode: 'wrong_word:única',
              why: 'Verdadera означает «истинная» — совсем другой признак, не про единственность. Нужно única.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'gender_agreement_full', 'written_accent'],
    },
  ]);

export const ES_EPISODE_01_SESSION_06_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_06_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
