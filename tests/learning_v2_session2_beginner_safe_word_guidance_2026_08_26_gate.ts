import assert from 'node:assert/strict';

import { EPISODE_01_SESSION_02_VOCABULARY_V1 } from '../modules/learning-v2/content/source/episode_01_session_02_vocabulary_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

for (const word of EPISODE_01_SESSION_02_VOCABULARY_V1) {
  const forbiddenComparators = word.contacts.recognize.distractors.map((entry) => entry.value.toLowerCase());
  for (const locale of locales) {
    const guidance = word.contacts.recognize.guidance[locale].toLowerCase();
    assert.ok(guidance.includes(word.target.toLowerCase()), `${word.target}/${locale}: guidance must name its own word`);
    for (const comparator of forbiddenComparators) {
      assert.ok(
        !new RegExp(`(^|[^a-z])${comparator.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}([^a-z]|$)`, 'iu').test(guidance),
        `${word.target}/${locale}: first-exposure guidance must not teach through unknown comparator "${comparator}"`,
      );
    }
  }
}

process.stdout.write('LEARNING V2 SESSION 2 BEGINNER-SAFE WORD GUIDANCE 2026-08-26 GATE: PASS\n');
