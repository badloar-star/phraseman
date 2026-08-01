import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('Home daily survey indicator', () => {
  it('adds an active or completed survey to the daily indicator total', () => {
    const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

    expect(home).toContain("import { buildActiveSurveyDailyChallenge, buildServerConfirmedLegacyCompletion, computeSurveyDailyCounts } from '../survey_daily_challenge_model';");
    expect(home).toContain('const counts = computeSurveyDailyCounts({ baseTotal, baseDone: nextTasksCompleted, survey });');
    expect(home).toContain('setDailyTaskBarCount(counts.total);');
    expect(home).toContain('setTasksCompleted(counts.done);');
  });
});
