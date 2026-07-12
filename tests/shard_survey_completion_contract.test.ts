import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

it('returns authenticated server completion on every active-survey response without changing submit transaction', () => {
  const source = fs.readFileSync(path.join(root, 'functions/src/shard_survey.ts'), 'utf8');
  const lookup = source.slice(source.indexOf('export const getActiveShardSurvey'), source.indexOf('export const submitShardSurvey'));
  expect(lookup).toContain('progress.shard_survey_last_at_ms');
  expect(lookup).toContain('completion');
  expect(lookup).toContain('completedAtMs');
  expect(lookup).not.toMatch(/request\.data\?\.completion/);
  const submit = source.slice(source.indexOf('export const submitShardSurvey'));
  expect(submit).not.toContain('completion:');
});
