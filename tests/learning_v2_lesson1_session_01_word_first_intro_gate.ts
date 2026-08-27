import assert from 'node:assert/strict';

import {
  EPISODE_01_SESSION_01_WORD_FIRST_INTRO,
} from '../modules/learning-v2/content/source/episode_01_session_01_intro_word_first_v1';
import {
  EPISODE_01_SESSION_01_SOURCE,
} from '../modules/learning-v2/content/source/episode_01_session_01_v1';
import type { LearningV2InterfaceLocale } from '../modules/learning-v2/content/generator_course_contract';

const LOCALES: readonly LearningV2InterfaceLocale[] = [
  'ru',
  'uk',
  'es',
  'en',
  'pt-BR',
  'vi',
  'id',
  'tr',
  'pl',
];

const EXPECTED_TARGET_TERMS = [
  new Set(['I', 'i', 'l']),
  new Set(['i', 'am', 'an', 'm']),
  new Set(['here', 'hear', 'hair']),
] as const;

assert.ok(
  Object.is(
    EPISODE_01_SESSION_01_SOURCE.introPages,
    EPISODE_01_SESSION_01_WORD_FIRST_INTRO,
  ),
  'Session 1 must use the owner-reset word-first intro, not the old phrase-first intro.',
);

for (const [pageIndex, page] of EPISODE_01_SESSION_01_SOURCE.introPages.entries()) {
  for (const locale of LOCALES) {
    const runs = page.bodyRuns?.[locale];
    assert.ok(runs, `intro page ${pageIndex + 1} ${locale}: semantic runs are required`);

    const targetTerms = new Set(
      runs
        .filter((run) => run.semantic !== 'explanation')
        .map((run) => run.text),
    );
    const comparableTerms = pageIndex === 0
      ? targetTerms
      : new Set([...targetTerms].map((term) => term.toLocaleLowerCase('en')));
    assert.deepEqual(
      comparableTerms,
      EXPECTED_TARGET_TERMS[pageIndex],
      `intro page ${pageIndex + 1} ${locale}: unexpected target-language item before word contacts`,
    );

    const body = page.body[locale] ?? page.body.ru;
    assert.doesNotMatch(
      body,
      /\bI\s+am(?:\s+(?:here|ready))?\b/u,
      `intro page ${pageIndex + 1} ${locale}: a complete phrase appeared before standalone word contacts`,
    );
  }
}

assert.deepEqual(
  EPISODE_01_SESSION_01_SOURCE.introPages.map((page) => page.kind),
  ['concept', 'formula', 'trap'],
  'Session 1 intro must preserve concept → formula → trap.',
);

console.log('LEARNING V2 SESSION 1 WORD-FIRST INTRO GATE: PASS');
