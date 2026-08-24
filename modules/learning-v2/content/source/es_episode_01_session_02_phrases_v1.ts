import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_02_LOCALIZED_DETAILS } from './es_episode_01_session_02_localized_details_v1';

// зачем этот файл (владелец, 2026-08-24): фразы применения для сессии 2 —
// «No es fácil» и «No es verdad» используют ТОЛЬКО слова, уже изученные к
// этому моменту: no (сессия 2, word-first), es/fácil/verdad (сессия 1).
// Никаких новых слов внутри фраз — word-first правило соблюдено полностью.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s02-no-es-facil',
      english: 'No es fácil',
      russian: 'Это не легко',
      explanation:
        'Прямое возражение на оценку кого-то другого. No встаёт перед es, fácil остаётся без изменений — отрицается вся фраза целиком.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            {
              value: 'Nada',
              reasonCode: 'negation_word_mismatch:No',
              why: 'Nada — «ничего», отдельное слово-предмет. Глагол отрицают через no.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'Non',
              reasonCode: 'orthographic_invalid:No',
              why: 'Non — не испанское слово. В испанском отрицание пишется no.',
              trapType: 'orthographic',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — это «ты». Про «это» (безличную оценку) — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Оценка ситуации не о говорящем — es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'fácil',
          category: 'quality-adjective',
          distractors: [
            {
              value: 'fácilmente',
              reasonCode: 'adverb_for_adjective:fácil',
              why: 'Fácilmente — «легко» как наречие при действии («сделал легко»). Признак самой вещи — fácil.',
              trapType: 'grammar',
            },
            {
              value: 'facilidad',
              reasonCode: 'noun_for_adjective:fácil',
              why: 'Facilidad — «лёгкость», предмет. Признак — fácil.',
              trapType: 'grammar',
            },
          ],
        },
      ],
      features: ['ser', 'negation', 'quality'],
    },
    {
      id: 'es-e01-s02-no-es-verdad',
      english: 'No es verdad',
      russian: 'Это неправда',
      explanation:
        'Прямое опровержение чужих слов. No встаёт перед es, verdad остаётся без изменений — та же формула, что и в No es fácil.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            {
              value: 'Nunca',
              reasonCode: 'negation_word_mismatch:No',
              why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'Non',
              reasonCode: 'orthographic_invalid:No',
              why: 'Non — не испанское слово. В испанском отрицание пишется no.',
              trapType: 'orthographic',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — это «ты». Про «это» (безличную оценку) — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Оценка ситуации не о говорящем — es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'verdad',
          category: 'truth-noun',
          distractors: [
            {
              value: 'verdadero',
              reasonCode: 'adjective_for_fixed_phrase:verdad',
              why: 'Verdadero — «истинный» как признак предмета. Устойчивая реакция — именно (no) es verdad, с существительным, а не прилагательным.',
              trapType: 'grammar',
            },
            {
              value: 'mentira',
              reasonCode: 'antonym_as_wrong_construction:verdad',
              why: 'Mentira значит «ложь» само по себе — сказали бы Es mentira, без no. Здесь строим отрицание готовой фразы Es verdad.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'negation', 'fixed-reaction'],
    },
  ]);

export const ES_EPISODE_01_SESSION_02_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_02_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
