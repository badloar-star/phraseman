import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('Home daily survey indicator', () => {
  it('shows a fourth indicator only for an active or completed survey', () => {
    const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

    expect(home).toContain("import { buildActiveSurveyDailyChallenge, buildServerConfirmedLegacyCompletion, computeSurveyDailyCounts } from '../survey_daily_challenge_model';");
    expect(home).toContain('const counts = computeSurveyDailyCounts({ baseTotal, baseDone: nextTasksCompleted, survey });');
    expect(home).toContain('commitSurveyDailyTaskRequest(scope, requestId, survey);');
    expect(home).toContain('() => hh?.tasksTotal ?? (initialSurveyDailyTask ? 4 : 3),');
    expect(home).toContain('setDailyTaskBarCount((previous) => previous === counts.total ? previous : counts.total);');
    expect(home).toContain('setTasksCompleted(counts.done);');
    expect(home).toContain('testID="home-daily-task-progress"');
    expect(home).toContain("minWidth: 30, alignItems: 'flex-end', flexShrink: 0");
  });
});
