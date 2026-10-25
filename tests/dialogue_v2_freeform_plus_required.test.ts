/* eslint-disable import/first */
// зачем (владелец 25.10, «свободный диалог: написано „сервис недоступен“»): старт отказывал dialogue_v2_freeform_plus_required
// (сервер не видит Plus), а клиент превращал отказ в «недоступно» с тихими повторами. Сторож: отказ «нужен Plus» распознаётся
// только по своему коду и сообщению, экран не повторяет старт и ведёт на экран Plus; журнал Plus печатает источник «да».
import fs from 'fs';
import path from 'path';

const mockCallableRun = jest.fn();
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({ name: 'app' })) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ region: 'us-central1' })),
  httpsCallable: jest.fn(() => mockCallableRun),
}));
const mockRecheck = jest.fn(async () => undefined);
jest.mock('../app/plus_server_recheck', () => ({ recheckPlusAfterServerRefusal: (surface: string) => mockRecheck(surface) }));

import {
  isFreeformPlusRequiredError,
  startDialogueV2FreeformSession,
} from '../app/dialogue_v2_freeform_client';

const callableError = (code: string, message: string): Error => Object.assign(new Error(message), { code });
const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('freeform start: server says Plus is required', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('recognises only the exact plus_required refusal (with and without the functions/ prefix)', () => {
    expect(isFreeformPlusRequiredError(callableError('functions/permission-denied', 'dialogue_v2_freeform_plus_required'))).toBe(true);
    expect(isFreeformPlusRequiredError(callableError('permission-denied', '[functions/permission-denied] dialogue_v2_freeform_plus_required'))).toBe(true);
    // чужой permission-denied, тот же текст без кода, другой код — не «нужен Plus»
    expect(isFreeformPlusRequiredError(callableError('functions/permission-denied', 'model detail'))).toBe(false);
    expect(isFreeformPlusRequiredError(new Error('dialogue_v2_freeform_plus_required'))).toBe(false);
    expect(isFreeformPlusRequiredError(callableError('functions/failed-precondition', 'dialogue_v2_freeform_plus_required'))).toBe(false);
    expect(isFreeformPlusRequiredError(null)).toBe(false);
  });

  it('start rejects with reason plus_required instead of the generic unavailable', async () => {
    mockCallableRun.mockRejectedValueOnce(callableError('functions/permission-denied', 'dialogue_v2_freeform_plus_required'));
    await expect(startDialogueV2FreeformSession({ studyTarget: 'en' })).rejects.toMatchObject({ reason: 'plus_required' });
    // Б2: отказ «нужен Plus» запускает фоновую перепроверку доступа (ленивый импорт, без ожидания)
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockRecheck).toHaveBeenCalledWith('dialogue_v2_freeform_start');
    mockRecheck.mockClear();
    mockCallableRun.mockRejectedValueOnce(callableError('functions/permission-denied', 'model detail'));
    await expect(startDialogueV2FreeformSession({ studyTarget: 'en' })).rejects.toMatchObject({ reason: 'unavailable' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockRecheck).not.toHaveBeenCalled();
  });

  it('screen: plus_required clears the retry timer and opens Plus via replace, never the silent retry', () => {
    const src = read('app/dialogue_v2_freeform.tsx');
    const branch = src.slice(src.indexOf('} else if (isFreeformPlusRequired(error)) {'), src.indexOf('} else if (isFreeformDailyCap(error)) {'));
    expect(branch.length).toBeGreaterThan(100);
    expect(branch).toContain('clearStartRetryTimer()');
    expect(branch).toContain('[DIALOGUE-V2-FREEFORM] start → plus_required');
    expect(branch).toMatch(/routerRef\.current\.replace\(\{\s*pathname: '\/premium_modal'/);
    expect(branch).not.toContain('handleStartFailure');
    // ветка «нужен Plus» стоит раньше общего «недоступно»
    expect(src.indexOf('isFreeformPlusRequired(error)')).toBeLessThan(src.indexOf('handleStartFailure(message)'));
  });

  it('premium resolve log names the source of «yes» without identifiers', () => {
    const src = read('components/PremiumContext.tsx');
    const done = src.slice(src.indexOf('const accessSources = {'), src.indexOf("'[PREMIUM-RESOLVE] reload:done'") + 260);
    for (const key of ['realPremium:', 'vip:', 'verifiedCloud:', 'intro:', 'devOverride']) expect(done).toContain(key);
    expect(done).toContain('sources: accessSources');
    expect(done).not.toMatch(/stableId|uid|email/i);
  });
});
