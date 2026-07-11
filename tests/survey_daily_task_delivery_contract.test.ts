import fs from 'node:fs';
import path from 'node:path';

const mockCallable = jest.fn();

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => true),
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable),
}));

import { fetchActiveSurveyWithRetry } from '../app/survey_client';

const ROOT = path.resolve(__dirname, '..');
const lookup = { stableId: 'stable-1', platform: 'ios', lang: 'en' };

describe('daily survey delivery', () => {
  beforeEach(() => {
    mockCallable.mockReset();
  });

  it('keeps the source-level Daily Tasks callsite contract', () => {
    const client = fs.readFileSync(path.join(ROOT, 'app', 'survey_client.ts'), 'utf8');
    const dailyTasks = fs.readFileSync(path.join(ROOT, 'app', 'daily_tasks_screen.tsx'), 'utf8');
    const card = fs.readFileSync(path.join(ROOT, 'components', 'SurveyTaskCard.tsx'), 'utf8');
    const screen = fs.readFileSync(path.join(ROOT, 'app', 'survey_screen.tsx'), 'utf8');

    expect(client).toContain('export async function fetchActiveSurveyWithRetry');
    expect(client).toContain('options.attempts ?? 3');
    expect(client).toContain('wait?: (ms: number) => Promise<void>');
    expect(client).toMatch(/Math\.min\(\d+, Math\.max\(0, [^\n]*options\.delayMs/);
    expect(client).toContain('await wait(delayMs)');
    expect(dailyTasks).toContain('fetchActiveSurveyWithRetry({ stableId, platform: Platform.OS, lang })');
    expect(dailyTasks).toContain('const dayKey = getTodayKey()');
    expect(dailyTasks).toContain('migrateLegacySurveyCompletion');
    expect(dailyTasks).toContain('beginSurveyDailyTaskRequest');
    expect(dailyTasks).toContain('commitSurveyDailyTaskRequest');
    expect(dailyTasks).not.toContain('isSurveyDailyTaskDoneToday()');
    expect(card).not.toContain('isSurveyDailyTaskDoneToday');
    expect(card).toContain('primeSurvey({ survey, stableId, dayKey, lang })');
    expect(screen).toContain('takePrimedSurvey(surveyId, scope)');
    expect(screen).toContain('markSurveyDailyTaskDone({');
  });

  it('defaults to three attempts and does not wait after the final attempt', async () => {
    mockCallable.mockResolvedValue({ data: { survey: null, completion: null } });
    const wait = jest.fn(async () => {});

    await expect(fetchActiveSurveyWithRetry(lookup, { wait })).resolves.toEqual({ survey: null, completion: null });

    expect(mockCallable).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenNthCalledWith(1, 350);
    expect(wait).toHaveBeenNthCalledWith(2, 350);
  });

  it('defaults non-finite attempts and caps delay', async () => {
    mockCallable.mockResolvedValue({ data: { survey: null, completion: null } });
    const wait = jest.fn(async () => {});

    await expect(fetchActiveSurveyWithRetry(lookup, { attempts: Infinity, delayMs: Infinity, wait }))
      .resolves.toEqual({ survey: null, completion: null });

    expect(mockCallable).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(2000);
  });

  it('caps a large finite attempt count at five', async () => {
    mockCallable
      .mockResolvedValueOnce({ data: { survey: null, completion: null } })
      .mockResolvedValueOnce({ data: { survey: null, completion: null } })
      .mockResolvedValueOnce({ data: { survey: null, completion: null } })
      .mockResolvedValueOnce({ data: { survey: null, completion: null } })
      .mockResolvedValueOnce({ data: { survey: null, completion: null } })
      .mockResolvedValueOnce({ data: { survey: { surveyId: 'too-late' } } });
    const wait = jest.fn(async () => {});

    await expect(fetchActiveSurveyWithRetry(lookup, { attempts: 1000, wait }))
      .resolves.toEqual({ survey: null, completion: null });

    expect(mockCallable).toHaveBeenCalledTimes(5);
    expect(wait).toHaveBeenCalledTimes(4);
    expect(wait).toHaveBeenCalledWith(350);
  });

  it('keeps the minimum attempt count at one', async () => {
    mockCallable.mockResolvedValue({ data: { survey: null, completion: null } });
    const wait = jest.fn(async () => {});

    await expect(fetchActiveSurveyWithRetry(lookup, { attempts: 0, wait })).resolves.toEqual({ survey: null, completion: null });

    expect(mockCallable).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it('propagates the last callable error after exhausting attempts', async () => {
    const first = new Error('first');
    const last = new Error('last');
    mockCallable.mockRejectedValueOnce(first).mockRejectedValueOnce(last);
    const wait = jest.fn(async () => {});

    await expect(fetchActiveSurveyWithRetry(lookup, { attempts: 2, wait })).rejects.toBe(last);

    expect(mockCallable).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it('preserves survey and authenticated completion when they coexist', async () => {
    const survey = { surveyId: 's1', questions: [{ id: 'q1' }] };
    mockCallable.mockResolvedValue({ data: { survey, completion: { completedAtMs: 123 } } });
    await expect(fetchActiveSurveyWithRetry(lookup)).resolves.toEqual({ survey, completion: { completedAtMs: 123 } });
  });
});
