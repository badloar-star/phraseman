const test = require('node:test');
const assert = require('node:assert/strict');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function levelBank(language, level) {
  return {
    language,
    level,
    questions: Array.from({ length: 40 }, (_, index) => ({
      id: `${language}-${level.toLowerCase()}-${String(index + 1).padStart(3, '0')}`,
      level,
      reviewStatus: 'self_checked',
    })),
  };
}

test('release builder combines exactly six reviewed 40-item levels without mutating candidates', async () => {
  const { buildReleaseBank } = await import('../scripts/lib/language_test_release_bank.mjs');
  const levelBanks = Object.fromEntries(LEVELS.map((level) => [level, levelBank('es', level)]));
  const before = structuredClone(levelBanks);
  const bank = buildReleaseBank({ language: 'es', bankVersion: '2026-08-03.1', levelBanks });
  assert.equal(bank.questions.length, 240);
  assert.deepEqual(bank.levels, LEVELS);
  assert.equal(bank.questions.every(({ reviewStatus }) => reviewStatus === 'independent_ai_reviewed'), true);
  assert.deepEqual(levelBanks, before);
});

test('release builder fails closed on unsupported languages, counts, and identities', async () => {
  const { buildReleaseBank } = await import('../scripts/lib/language_test_release_bank.mjs');
  const valid = Object.fromEntries(LEVELS.map((level) => [level, levelBank('de', level)]));
  assert.throws(() => buildReleaseBank({ language: 'xx', bankVersion: '2026-08-03.1', levelBanks: valid }));
  assert.throws(() => buildReleaseBank({ language: 'de', bankVersion: 'candidate', levelBanks: valid }));
  const short = structuredClone(valid);
  short.A1.questions.pop();
  assert.throws(() => buildReleaseBank({ language: 'de', bankVersion: '2026-08-03.1', levelBanks: short }));
  const wrongId = structuredClone(valid);
  wrongId.C2.questions[39].id = 'de-c2-999';
  assert.throws(() => buildReleaseBank({ language: 'de', bankVersion: '2026-08-03.1', levelBanks: wrongId }));
});
