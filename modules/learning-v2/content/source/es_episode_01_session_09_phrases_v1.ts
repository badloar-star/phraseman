import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_09_LOCALIZED_DETAILS } from './es_episode_01_session_09_localized_details_v1';

// зачем этот файл (владелец, 2026-08-24): фразы применения для сессии 9 —
// «Eres bonito»/«Eres bonita» и «Eres rápido»/«Eres rápida» показывают
// связку eres с уже известными признаками из сессий 3 и 5. Никаких новых
// слов внутри фраз — только eres (word-first этой сессии) плюс bonito/
// bonita/rápido/rápida, уже изученные.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s09-eres-bonito',
      english: 'Eres bonito',
      russian: 'Ты красивый',
      explanation:
        'Так говорят собеседнику мужского рода о его внешности напрямую, в лицо. Признак согласуется с тем, к кому обращаются, — форма на -o.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            {
              value: 'Es',
              reasonCode: 'agreement_person_mismatch:Eres',
              why: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Eres',
              why: 'Soy — про себя. Обращение к собеседнику — только Eres.',
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
              why: 'Bonita — форма женского рода, с -a. Про собеседника мужского рода нужна форма на -o: bonito.',
              trapType: 'grammar',
            },
            {
              value: 'rápido',
              reasonCode: 'wrong_word:bonito',
              why: 'Rápido означает «быстрый» — совсем другой признак, не про внешний вид. Нужно bonito.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s09-eres-bonita',
      english: 'Eres bonita',
      russian: 'Ты красивая',
      explanation:
        'Та же оценка, но собеседник женского рода. Меняется только концовка признака: -o становится -a, связка eres не меняется вовсе.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            {
              value: 'Es',
              reasonCode: 'agreement_person_mismatch:Eres',
              why: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Eres',
              why: 'Soy — про себя. Обращение к собеседнику — только Eres.',
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
              why: 'Bonito — форма мужского рода, с -o. Про собеседницу нужна форма на -a: bonita.',
              trapType: 'grammar',
            },
            {
              value: 'única',
              reasonCode: 'wrong_word:bonita',
              why: 'Única означает «единственная» — совсем другой признак, не про внешний вид. Нужно bonita.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s09-eres-rapido',
      english: 'Eres rápido',
      russian: 'Ты быстрый',
      explanation:
        'Так говорят собеседнику мужского рода про его темп — например, в спорте или в работе. Признак согласуется с тем, к кому обращаются, — форма на -o.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            {
              value: 'Es',
              reasonCode: 'agreement_person_mismatch:Eres',
              why: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Eres',
              why: 'Soy — про себя. Обращение к собеседнику — только Eres.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'rápida',
              reasonCode: 'gender_mismatch:rápido',
              why: 'Rápida — форма женского рода, с -a. Про собеседника мужского рода нужна форма на -o: rápido.',
              trapType: 'grammar',
            },
            {
              value: 'verdadero',
              reasonCode: 'wrong_word:rápido',
              why: 'Verdadero означает «истинный» — совсем другой признак, не про скорость. Нужно rápido.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_full', 'pace_adjective'],
    },
    {
      id: 'es-e01-s09-eres-rapida',
      english: 'Eres rápida',
      russian: 'Ты быстрая',
      explanation:
        'Та же оценка темпа, но собеседник женского рода. Меняется только концовка признака: -o становится -a.',
      words: [
        {
          correct: 'Eres',
          category: 'ser',
          distractors: [
            {
              value: 'Es',
              reasonCode: 'agreement_person_mismatch:Eres',
              why: 'Es — про предмет или третье лицо. Обращение к собеседнику — только Eres.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Eres',
              why: 'Soy — про себя. Обращение к собеседнику — только Eres.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'rápida',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'rápido',
              reasonCode: 'gender_mismatch:rápida',
              why: 'Rápido — форма мужского рода, с -o. Про собеседницу нужна форма на -a: rápida.',
              trapType: 'grammar',
            },
            {
              value: 'verdadera',
              reasonCode: 'wrong_word:rápida',
              why: 'Verdadera означает «истинная» — совсем другой признак, не про скорость. Нужно rápida.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'second_person_singular', 'gender_agreement_full', 'pace_adjective'],
    },
  ]);

export const ES_EPISODE_01_SESSION_09_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_09_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
