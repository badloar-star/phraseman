import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('Home daily survey indicator', () => {
  it('caches an active or completed survey without changing the visible indicator', () => {
    const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

    expect(home).toContain("import { buildActiveSurveyDailyChallenge, buildServerConfirmedLegacyCompletion, computeSurveyDailyCounts } from '../survey_daily_challenge_model';");
    expect(home).toContain('const counts = computeSurveyDailyCounts({ baseTotal, baseDone: nextTasksCompleted, survey });');
    expect(home).toContain('commitSurveyDailyTaskRequest(scope, requestId, survey);');
    expect(home).not.toContain('setDailyTaskBarCount(');
    expect(home).toContain('setTasksCompleted(counts.done);');
  });
});
