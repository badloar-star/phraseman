import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('daily survey delivery', () => {
  it('retries the active survey lookup when auth/cloud state is still settling', () => {
    const client = fs.readFileSync(path.join(ROOT, 'app', 'survey_client.ts'), 'utf8');
    const dailyTasks = fs.readFileSync(path.join(ROOT, 'app', 'daily_tasks_screen.tsx'), 'utf8');

    expect(client).toContain('export async function fetchActiveSurveyWithRetry');
    expect(client).toContain('options.attempts ?? 3');
    expect(client).toContain('wait?: (ms: number) => Promise<void>');
    expect(client).toMatch(/Math\.min\(\d+, Math\.max\(0, [^\n]*options\.delayMs/);
    expect(client).toContain('await wait(delayMs)');
    expect(dailyTasks).toContain('fetchActiveSurveyWithRetry({ stableId, platform: Platform.OS, lang })');
  });
});
