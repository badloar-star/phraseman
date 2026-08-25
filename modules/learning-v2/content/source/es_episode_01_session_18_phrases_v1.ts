import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_18_LOCALIZED_DETAILS } from './es_episode_01_session_18_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25): фразы применения для сессии 18 —
// «Дорого или дёшево». Word-first barato/barata (эта сессия) появляется
// рядом с уже знакомым caro/cara (сессия 1, сессия 17) — та же формула
// -o/-a (recall 3), та же связка es для оценки предмета/ситуации (recall
// 17). Заголовок сессии — прямой выбор между двумя признаками цены.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s18-es-barato',
      english: 'Es barato',
      russian: 'Это дёшево',
      explanation:
        'Так оценивают низкую цену вещи или услуги мужского рода или по умолчанию. Es — потому что оценивают предмет или ситуацию, а не человека; barato — с -o, форма по умолчанию.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Оценка цены предмета — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка цены предмета — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'barato',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'caro',
              reasonCode: 'wrong_word:barato',
              why: 'Caro означает «дорого» — прямая противоположность. Нужно barato.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'barata',
              reasonCode: 'gender_mismatch:barato',
              why: 'Barata — форма женского рода, с -a. По умолчанию, без названного предмета, нужна форма на -o: barato.',
              trapType: 'grammar',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'price_adjective'],
    },
    {
      id: 'es-e01-s18-es-barata',
      english: 'Es barata',
      russian: 'Она дешёвая',
      explanation:
        'Та же низкая цена, но про вещь женского рода — например, entrada (билет). Es не меняется вовсе, меняется только концовка признака: -o становится -a.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка цены предмета женского рода — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнице напрямую. Оценка предмета — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'barata',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'barato',
              reasonCode: 'gender_mismatch:barata',
              why: 'Barato — форма мужского рода, с -o. Для предмета женского рода нужна форма на -a: barata.',
              trapType: 'grammar',
            },
            {
              value: 'cara',
              reasonCode: 'wrong_word:barata',
              why: 'Cara означает «дорогая» — прямая противоположность. Нужно barata.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'price_adjective'],
    },
    {
      id: 'es-e01-s18-no-es-caro',
      english: 'No es caro',
      russian: 'Это не дорого',
      explanation:
        'Так возражают на чужую оценку цены как высокой — вещь на самом деле по карману. No встаёт перед связкой, признак caro уже знаком из прошлых тем (сессия 1, сессия 17).',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            {
              value: 'Es',
              reasonCode: 'word_order_invalid:No',
              why: 'No должно стоять первым, перед связкой. Начинать с Es значит потерять отрицание.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'wrong_word:No',
              why: 'Eres — это связка, а не отрицание. Возражение начинается с No.',
              trapType: 'grammar',
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
              why: 'Eres — обращение к собеседнику. Возражение про цену предмета — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Возражение про цену предмета — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'difícil',
              reasonCode: 'wrong_word:caro',
              why: 'Difícil означает «трудно» — совсем другой признак, не про цену. Здесь возражают именно про цену: нужно caro.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'cara',
              reasonCode: 'gender_mismatch:caro',
              why: 'Cara — форма женского рода, с -a. По умолчанию, без названного предмета, нужна форма на -o: caro.',
              trapType: 'grammar',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'price_adjective', 'negation'],
    },
    {
      id: 'es-e01-s18-es-caro-o-barato',
      english: '¿Es caro o barato?',
      russian: 'Это дорого или дёшево?',
      explanation:
        'Так спрашивают напрямую о цене вещи, предлагая выбор из двух признаков. Вопрос оборачивается знаками ¿...?, оба признака стоят в форме мужского рода или по умолчанию (-o).',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Вопрос о цене предмета — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Вопрос о цене предмета — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'cara',
              reasonCode: 'gender_mismatch:caro',
              why: 'Cara — форма женского рода, с -a. По умолчанию, без названного предмета, нужна форма на -o: caro.',
              trapType: 'grammar',
            },
            {
              value: 'fácil',
              reasonCode: 'wrong_word:caro',
              why: 'Fácil означает «легко» — совсем другой признак, не про цену. Нужно caro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'o',
          category: 'conjunction',
          distractors: [
            {
              value: 'y',
              reasonCode: 'wrong_word:o',
              why: 'Y означает «и» — соединяет, а не предлагает выбор. Между двумя противоположными признаками нужно o.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'es',
              reasonCode: 'wrong_word:o',
              why: 'Es — связка, она уже стоит в начале фразы. Между двумя признаками нужен союз выбора o.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'barato',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'barata',
              reasonCode: 'gender_mismatch:barato',
              why: 'Barata — форма женского рода, с -a. По умолчанию, без названного предмета, нужна форма на -o: barato.',
              trapType: 'grammar',
            },
            {
              value: 'difícil',
              reasonCode: 'wrong_word:barato',
              why: 'Difícil означает «трудно» — совсем другой признак, не про цену. Нужно barato.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'price_adjective', 'question_marks'],
    },
  ]);

export const ES_EPISODE_01_SESSION_18_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_18_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
