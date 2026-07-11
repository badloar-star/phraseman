import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('daily survey delivery', () => {
  it('retries the active survey lookup when auth/cloud state is still settling', () => {
    const client = fs.readFileSync(path.join(ROOT, 'app', 'survey_client.ts'), 'utf8');
    const card = fs.readFileSync(path.join(ROOT, 'components', 'SurveyTaskCard.tsx'), 'utf8');

    expect(client).toContain('export async function fetchActiveSurveyWithRetry');
    expect(client).toContain('options.attempts ?? 3');
    expect(card).toContain('fetchActiveSurveyWithRetry');
  });
});
