/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const mockCallable = jest.fn();

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable),
}));

import { fetchActiveSurveyWithRetry } from '../app/survey_client';
import { clearPrimedSurvey, primeSurvey, takePrimedSurvey } from '../app/survey_handoff';

const ROOT = path.resolve(__dirname, '..');
const lookup = { stableId: 'stable-1', platform: 'ios', lang: 'en' };

describe('standalone survey delivery', () => {
  beforeEach(() => {
    mockCallable.mockReset();
  });

  it('keeps the source-level Home callsite contract', () => {
    const client = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'survey_client.ts'), 'utf8'));
    const home = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8'));
    const hook = normalizeEol(fs.readFileSync(path.join(ROOT, 'hooks', 'use_home_survey_entry.ts'), 'utf8'));
    const loader = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'home_survey_entry.ts'), 'utf8'));
    const screen = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'survey_screen.tsx'), 'utf8'));
    const controller = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'survey_flow_controller.ts'), 'utf8'));

    expect(client).toContain('export async function fetchActiveSurveyWithRetry');
    expect(client).toContain('options.attempts ?? 3');
    expect(client).toContain('wait?: (ms: number) => Promise<void>');
    expect(client).toMatch(/Math\.min\(\d+, Math\.max\(0, [^\n]*options\.delayMs/);
    expect(client).toContain('await wait(delayMs)');
    // зачем (Q90, 01.10): загрузка вынесена из Главной в загрузчик с кэшем 6 ч; Главная держит только хук.
    expect(loader).toContain('fetchActiveSurveyWithRetry({ stableId: input.stableId, platform: input.platform, lang: input.lang })');
    expect(hook).toContain('dayKey: getUtcDayKey()');
    expect(home).toContain('useHomeSurveyEntry(lang, homeRuntimeActive)');
    expect(home).toContain('<SurveySheetModal');
    expect(home).not.toContain('primeSurvey(');
    expect(home).not.toContain("pathname: '/survey_screen'");
    expect(screen).toContain('takePrimedSurvey(surveyId, scope)');
    expect(screen).toContain('<SurveySheetModal');
    expect(controller).toContain('await markSurveyOfferDone({');
    expect(controller).toContain('stableId,');
    expect(controller).toContain('dayKey,');
  });

  // зачем (смета Firebase п.8, 13.10): «опроса нет» — честный ответ ротации, без повтора; повтор — только при ошибке вызова.
  it('an honest «no survey» answer is not retried', async () => {
    mockCallable.mockResolvedValue({ data: { survey: null, completion: null } });
    const wait = jest.fn(async () => {});

    await expect(fetchActiveSurveyWithRetry(lookup, { wait })).resolves.toEqual({ survey: null, completion: null });

    expect(mockCallable).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it('defaults to three attempts on errors and does not wait after the final attempt', async () => {
    mockCallable.mockRejectedValue(new Error('unavailable'));
    const wait = jest.fn(async () => {});

    await expect(fetchActiveSurveyWithRetry(lookup, { wait })).rejects.toThrow('unavailable');

    expect(mockCallable).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenNthCalledWith(1, 350);
    expect(wait).toHaveBeenNthCalledWith(2, 350);
  });

  it('defaults non-finite attempts and caps delay', async () => {
    mockCallable.mockRejectedValue(new Error('unavailable'));
    const wait = jest.fn(async () => {});

    await expect(fetchActiveSurveyWithRetry(lookup, { attempts: Infinity, delayMs: Infinity, wait }))
      .rejects.toThrow('unavailable');

    expect(mockCallable).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(2000);
  });

  it('caps a large finite attempt count at five', async () => {
    mockCallable
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
      .mockRejectedValueOnce(new Error('e3'))
      .mockRejectedValueOnce(new Error('e4'))
      .mockRejectedValueOnce(new Error('e5'))
      .mockResolvedValueOnce({ data: { survey: { surveyId: 'too-late' } } });
    const wait = jest.fn(async () => {});

    await expect(fetchActiveSurveyWithRetry(lookup, { attempts: 1000, wait }))
      .rejects.toThrow('e5');

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

  it('never hands a primed survey across account, day, or language scope', () => {
    const survey = { surveyId: 's1', title: 'T', subtitle: 'D', rewardShards: 1, questions: [] };
    const scope = { stableId: 'account-a', dayKey: '2026-07-11', lang: 'ru' as const };
    clearPrimedSurvey();
    primeSurvey({ survey, ...scope });
    expect(takePrimedSurvey('s1', scope)).toBe(survey);
    expect(takePrimedSurvey('s1', { ...scope, stableId: 'account-b' })).toBeNull();
    expect(takePrimedSurvey('s1', { ...scope, dayKey: '2026-07-12' })).toBeNull();
    expect(takePrimedSurvey('s1', { ...scope, lang: 'uk' })).toBeNull();
  });
});
