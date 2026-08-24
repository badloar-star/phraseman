import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_EPISODE_01_SESSION_01_PHRASES } from './es_episode_01_session_01_phrases_v1';
import { ES_EPISODE_01_SESSION_02_PHRASES } from './es_episode_01_session_02_phrases_v1';
import { ES_EPISODE_01_SESSION_03_PHRASES } from './es_episode_01_session_03_phrases_v1';
import { ES_EPISODE_01_SESSION_04_PHRASES } from './es_episode_01_session_04_phrases_v1';
import { ES_EPISODE_01_SESSION_05_PHRASES } from './es_episode_01_session_05_phrases_v1';
import { ES_EPISODE_01_SESSION_06_PHRASES } from './es_episode_01_session_06_phrases_v1';
import { ES_SESSION_07_VOICE_LOCALIZED_DETAILS } from './es_episode_01_session_07_voice_localized_details_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 7 "Скажи вслух: оцени" / kind: 'voice', builtOn: [1,2,3,4,5],
// recalls: [1,3,4,5]): voice-сессия не вводит новых слов — переиспользует
// 13 уже утверждённых фраз из сессий 1-6 (только слова word-first словаря:
// es, soy, fácil, verdad, no, bonito, bonita, verdadero, verdadera, rápido,
// rápida, único, única). SESSION_PHRASE_COUNT_V1 требует ровно 15 фраз, а
// phrase_duplicate запрещает повтор одного и того же english-текста внутри
// сессии (проверено кодом гейта) — значит просто дублировать 2 существующие
// фразы под новым id, как в английском voice-образце, здесь НЕ работает:
// у английского пул кандидатов ≥15 УНИКАЛЬНЫХ строк благодаря полным/
// сокращённым формам (I am/I'm), которых у испанского нет. Недостающие 2
// закрыты двумя ГЕНУИННО новыми фразами "No es único"/"No es única" —
// тот же приём отрицания уже известного признака, что и No es fácil/
// No es rápido, слова все уже изучены (no, es, único/única), новых нет.
function findPhrase(
  pool: readonly EpisodeSourcePhrase[],
  id: string,
): EpisodeSourcePhrase {
  const found = pool.find((phrase) => phrase.id === id);
  if (!found) throw new Error(`es_session_07_voice_phrase_missing:${id}`);
  return found;
}

const ES_S01 = ES_EPISODE_01_SESSION_01_PHRASES;
const ES_S02 = ES_EPISODE_01_SESSION_02_PHRASES;
const ES_S03 = ES_EPISODE_01_SESSION_03_PHRASES;
const ES_S04 = ES_EPISODE_01_SESSION_04_PHRASES;
const ES_S05 = ES_EPISODE_01_SESSION_05_PHRASES;
const ES_S06 = ES_EPISODE_01_SESSION_06_PHRASES;

const RAW_NEW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s07-no-es-unico',
      english: 'No es único',
      russian: 'Это не единственное в своём роде',
      explanation:
        'Так возражают на утверждение об уникальности предмета мужского рода — есть и другие такие же. No встаёт перед связкой, признак остаётся без изменений.',
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
          correct: 'único',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'única',
              reasonCode: 'gender_mismatch:único',
              why: 'Única — форма женского рода, с -a. Здесь нужна форма на -o: único.',
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
      features: ['ser', 'negation', 'written_accent'],
    },
    {
      id: 'es-e01-s07-no-es-unica',
      english: 'No es única',
      russian: 'Это не единственное в своём роде (о предмете женского рода)',
      explanation:
        'Та же реакция, но предмет женского рода — например, идея повторяется у кого-то другого. Меняется только концовка признака: -o становится -a.',
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
          correct: 'única',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'único',
              reasonCode: 'gender_mismatch:única',
              why: 'Único — форма мужского рода, с -o. Здесь нужна форма на -a: única.',
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
      features: ['ser', 'negation', 'written_accent'],
    },
  ]);

const ES_NO_ES_UNICO: EpisodeSourcePhrase = Object.freeze({
  ...RAW_NEW_PHRASES[0],
  localizedDetails: ES_SESSION_07_VOICE_LOCALIZED_DETAILS['es-e01-s07-no-es-unico'],
});
const ES_NO_ES_UNICA: EpisodeSourcePhrase = Object.freeze({
  ...RAW_NEW_PHRASES[1],
  localizedDetails: ES_SESSION_07_VOICE_LOCALIZED_DETAILS['es-e01-s07-no-es-unica'],
});

export const ES_EPISODE_01_SESSION_07_VOICE_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    findPhrase(ES_S01, 'es-e01-s01-es-facil'),
    findPhrase(ES_S01, 'es-e01-s01-es-verdad'),
    findPhrase(ES_S02, 'es-e01-s02-no-es-facil'),
    findPhrase(ES_S02, 'es-e01-s02-no-es-verdad'),
    findPhrase(ES_S03, 'es-e01-s03-es-bonito'),
    findPhrase(ES_S03, 'es-e01-s03-es-bonita'),
    findPhrase(ES_S04, 'es-e01-s04-es-verdadero'),
    findPhrase(ES_S04, 'es-e01-s04-es-verdadera'),
    findPhrase(ES_S05, 'es-e01-s05-es-rapido'),
    findPhrase(ES_S05, 'es-e01-s05-es-rapida'),
    findPhrase(ES_S05, 'es-e01-s05-no-es-rapido'),
    findPhrase(ES_S06, 'es-e01-s06-es-unico'),
    findPhrase(ES_S06, 'es-e01-s06-es-unica'),
    ES_NO_ES_UNICO,
    ES_NO_ES_UNICA,
  ]);
