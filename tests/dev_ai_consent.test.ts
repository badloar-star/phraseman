// зачем (координатор 12.10): dev_state?aiConsent=granted подменяет ТОЛЬКО ответ гейта согласия на AI-диалоги (память). Согласие — юридический факт: запись в хранилище и
// вызов облачной функции не выполняются; в стор-сборке подмена невозможна.
import fs from 'node:fs';
import path from 'node:path';

const mockSetItem = jest.fn(async () => undefined);
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: (...a: unknown[]) => (mockSetItem as unknown as (...x: unknown[]) => unknown)(...a), removeItem: jest.fn(), multiSet: jest.fn(), multiGet: jest.fn(async () => []), multiRemove: jest.fn() },
}));
const mockEnsureAnonUser = jest.fn(async () => undefined);
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: (...a: unknown[]) => (mockEnsureAnonUser as unknown as (...x: unknown[]) => unknown)(...a), getCurrentUid: () => null, waitForAnonAuth: async () => false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { parseDevStateParams } from '../app/dev_state_fixtures';

describe('dev_ai_consent', () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.dontMock('../app/config');
    jest.resetModules();
    mockSetItem.mockClear();
    mockEnsureAnonUser.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('parses aiConsent=granted|off; rejects anything else', () => {
    expect(parseDevStateParams({ aiConsent: 'granted' }).request.aiConsent).toBe('granted');
    expect(parseDevStateParams({ aiConsent: 'off' }).request.aiConsent).toBe('off');
    expect(parseDevStateParams({ aiConsent: 'denied' }).request.aiConsent).toBe('denied');
    expect(parseDevStateParams({ aiConsent: 'yes' }).rejected).toHaveProperty('aiConsent');
  });

  it('in a dev build the gate answers granted/decided/hydrated while the override is on, and returns to the real state when it is off', () => {
    const consent = require('../app/ai_dialog_consent') as typeof import('../app/ai_dialog_consent');
    const dev = require('../app/dev_ai_consent') as typeof import('../app/dev_ai_consent');
    expect(consent.isAiDialogConsentGranted()).toBe(false);
    expect(consent.getAiDialogConsentState()).toBe('unset');
    expect(consent.hasAiDialogConsentDecision()).toBe(false);
    expect(dev.setDevAiConsentGranted(true)).toBe(true);
    expect(consent.isAiDialogConsentGranted()).toBe(true);
    expect(consent.getAiDialogConsentState()).toBe('granted');
    expect(consent.hasAiDialogConsentDecision()).toBe(true);
    expect(consent.isAiDialogConsentHydrated()).toBe(true);
    expect(dev.setDevAiConsentGranted(false)).toBe(true);
    expect(consent.isAiDialogConsentGranted()).toBe(false);
    expect(consent.getAiDialogConsentState()).toBe('unset');
  });

  // зачем (координатор 13.10, dialogs-010): экран «AI-диалоги выключены» достигается только решением «отказ».
  it('aiConsent=denied: the gate answers denied/decided/hydrated without writing anything', async () => {
    const fixtures = require('../app/dev_state_fixtures') as typeof import('../app/dev_state_fixtures');
    const consent = require('../app/ai_dialog_consent') as typeof import('../app/ai_dialog_consent');
    const result = await fixtures.applyDevState({ aiConsent: 'denied' });
    expect(result.applied).toHaveProperty('aiConsent');
    expect(consent.isAiDialogConsentGranted()).toBe(false);
    expect(consent.getAiDialogConsentState()).toBe('denied');
    expect(consent.hasAiDialogConsentDecision()).toBe(true);
    expect(consent.isAiDialogConsentHydrated()).toBe(true);
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockEnsureAnonUser).not.toHaveBeenCalled();
    await fixtures.applyDevState({ aiConsent: 'off' });
    expect(consent.getAiDialogConsentState()).toBe('unset');
  });

  it('applying the fixture writes nothing to storage and never calls the cloud', async () => {
    const fixtures = require('../app/dev_state_fixtures') as typeof import('../app/dev_state_fixtures');
    const consent = require('../app/ai_dialog_consent') as typeof import('../app/ai_dialog_consent');
    const result = await fixtures.applyDevState({ aiConsent: 'granted' });
    expect(result.applied).toHaveProperty('aiConsent');
    expect(consent.isAiDialogConsentGranted()).toBe(true);
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockEnsureAnonUser).not.toHaveBeenCalled();
  });

  it('in a store build the setter refuses and the gate keeps its real answer', () => {
    jest.doMock('../app/config', () => ({ IS_STORE_RELEASE: true, IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
    const dev = require('../app/dev_ai_consent') as typeof import('../app/dev_ai_consent');
    const consent = require('../app/ai_dialog_consent') as typeof import('../app/ai_dialog_consent');
    expect(dev.setDevAiConsentGranted(true)).toBe(false);
    expect(dev.getDevAiConsentGranted()).toBe(false);
    expect(dev.setDevAiConsentOverride('denied')).toBe(false);
    expect(dev.getDevAiConsentOverride()).toBeNull();
    expect(consent.isAiDialogConsentGranted()).toBe(false);
  });

  it('the override module has no storage, cloud or consent-writing code', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_ai_consent.ts'), 'utf8');
    expect(source).not.toMatch(/AsyncStorage|firebase|firestore|httpsCallable|setConsent|recordToCloud|recordAiDialogConsent|fetch\(/);
  });
});
