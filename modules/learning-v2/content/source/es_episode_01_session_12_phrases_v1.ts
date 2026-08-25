import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_12_LOCALIZED_DETAILS } from './es_episode_01_session_12_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25): фразы применения для сессии 12 —
// «Спрашиваю женщину». Word-first segura (эта сессия) появляется в
// вопросах с eres (сессия 9) и es (сессия 1), оборачивается знаками ¿...?
// (сессия 10) — ровно то действие, что называет заголовок сессии.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s12-eres-segura',
      english: '¿Eres segura?',
      russian: 'Ты уверенная?',
      explanation:
        'Прямой вопрос собеседнице о её уверенности в себе. Eres — потому что обращаются напрямую, segura — потому что речь о женщине.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            {
              value: 'Es',
              reasonCode: 'agreement_person_mismatch:Eres',
              why: 'Es — про предмет или третье лицо. Вопрос собеседнице напрямую — только Eres.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Eres',
              why: 'Soy — про себя. Вопрос собеседнице — только Eres.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'segura',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'seguro',
              reasonCode: 'gender_mismatch:segura',
              why: 'Seguro — форма мужского рода. О собеседнице женского рода нужна форма segura.',
              trapType: 'grammar',
            },
            {
              value: 'bonita',
              reasonCode: 'wrong_word:segura',
              why: 'Bonita означает «красивая» — совсем другой признак, не про уверенность. Нужно segura.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_full', 'confidence_adjective', 'question_marks'],
    },
    {
      id: 'es-e01-s12-es-segura',
      english: '¿Es segura?',
      russian: 'Она уверенная?',
      explanation:
        'Вопрос о третьем лице женского рода — например, спрашивают об общей знакомой. Es — потому что речь не с ней напрямую, а о ней.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres обращается к собеседнице напрямую. Вопрос о третьем лице — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Вопрос о третьем лице — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'segura',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'seguro',
              reasonCode: 'gender_mismatch:segura',
              why: 'Seguro — форма мужского рода. О женщине нужна форма segura.',
              trapType: 'grammar',
            },
            {
              value: 'única',
              reasonCode: 'wrong_word:segura',
              why: 'Única означает «единственная» — совсем другой признак, не про уверенность. Нужно segura.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'gender_agreement_full', 'confidence_adjective', 'question_marks'],
    },
  ]);

export const ES_EPISODE_01_SESSION_12_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_12_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
