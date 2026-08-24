import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_05_LOCALIZED_DETAILS } from './es_episode_01_session_05_localized_details_v1';

// зачем этот файл (владелец, 2026-08-24): фразы применения для сессии 5 —
// «Es rápido»/«Es rápida» (быстрый) и «No es rápido» (медленный — через
// отрицание уже известного rápido, а не отдельное новое слово "медленный").
// Заголовок карты "Быстрый и медленный" описывает контраст понятий, но курс
// выражает "медленный" не заводя лишнее слово — тем же способом, что и
// сессия 2 ("No es fácil" = "не легко"). Все слова уже изучены: es (1),
// no (2), rápido/rápida (word-first этой сессии).
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s05-es-rapido',
      english: 'Es rápido',
      russian: 'Это быстро',
      explanation:
        'Так говорят, когда оценивают темп предмета или процесса мужского рода — например, поезда или маршрута. Признак согласуется с родом того, о чём речь, поэтому здесь нужна форма на -o, а не -a.',
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
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'rápida',
              reasonCode: 'gender_mismatch:rápido',
              why: 'Rápida — форма женского рода, с -a. Про предмет мужского рода нужна форма на -o: rápido.',
              trapType: 'grammar',
            },
            {
              value: 'fácil',
              reasonCode: 'wrong_word:rápido',
              why: 'Fácil означает «лёгкий» — совсем другой признак, не про скорость. Нужно rápido.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'gender_agreement_full', 'pace_adjective'],
    },
    {
      id: 'es-e01-s05-es-rapida',
      english: 'Es rápida',
      russian: 'Это быстро (о предмете женского рода)',
      explanation:
        'Так говорят про темп предмета или процесса женского рода — например, машины или дороги. Устроена фраза так же, как Es rápido, но меняется только концовка признака: -o становится -a, а связка es остаётся прежней.',
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
          correct: 'rápida',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'rápido',
              reasonCode: 'gender_mismatch:rápida',
              why: 'Rápido — форма мужского рода, с -o. Про предмет женского рода нужна форма на -a: rápida.',
              trapType: 'grammar',
            },
            {
              value: 'bonita',
              reasonCode: 'wrong_word:rápida',
              why: 'Bonita означает «красивая» — совсем другой признак, не про скорость. Нужно rápida.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'gender_agreement_full', 'pace_adjective'],
    },
    {
      id: 'es-e01-s05-no-es-rapido',
      english: 'No es rápido',
      russian: 'Это медленно',
      explanation:
        'Так говорят, когда хотят возразить на утверждение о высоком темпе — например, если кто-то назвал процесс быстрым, а он таким не был. Отрицание темпа выражает «медленный» без отдельного слова: no встаёт перед связкой, точно так же, как в No es fácil.',
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
              why: 'Eres обращено к собеседнику — «ты». Про безличное «это» нужна только форма es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Оценка предмета не о говорящем — es.',
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
              why: 'Rápida — форма женского рода, с -a. Здесь нужна форма на -o: rápido.',
              trapType: 'grammar',
            },
            {
              value: 'rápidamente',
              reasonCode: 'adverb_for_adjective:rápido',
              why: 'Rápidamente — «быстро» как наречие при действии. Признак самой вещи — rápido.',
              trapType: 'grammar',
            },
          ],
        },
      ],
      features: ['ser', 'negation', 'pace_adjective'],
    },
  ]);

export const ES_EPISODE_01_SESSION_05_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_05_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
