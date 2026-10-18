// зачем (координатор 18.10, Сверка встала на шторке согласия ИИ): принимать согласие за человека нельзя. dev-подмена ответа гейта
// (`dev_state?consent=on` = `aiConsent=granted`) работает ТОЛЬКО при __DEV__ && !IS_STORE_RELEASE && DIAG_ENABLED и пишет [AI-CONSENT] dev_override;
// в релизной сборке флаг игнорируется: установка отклоняется, гейт отвечает настоящим решением. Ни запись согласия, ни облако подмена не трогает.
jest.mock('../app/dev_energy_tools', () => ({ devSetEnergy: jest.fn(async () => true), setDevEnergyModeOverride: jest.fn(async () => true) }));
jest.mock('../app/dev_plus_controls', () => ({ setDevLocalPlusOverride: jest.fn(async () => undefined), getDevLocalPlusStorageKey: (id: string) => `k:${id}` }));
jest.mock('../app/dev_as_free_flag', () => ({ setDevAsFreeFlag: jest.fn(async () => true) }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-1') }));
jest.mock('../app/spire_tab_flag', () => ({ setSpireTabDevOverride: jest.fn(async () => undefined) }));
jest.mock('../app/spire_gate_refresh', () => ({ forceRefreshSpireGatesNow: jest.fn(async () => ({ tab: true, config: true })) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined), multiSet: jest.fn(async () => undefined), multiRemove: jest.fn(async () => undefined), multiGet: jest.fn(async () => []) },
}));
let mockStoreRelease = false;
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  get IS_STORE_RELEASE() { return mockStoreRelease; },
}));
let mockDiag = true;
jest.mock('../app/dev_diag_gate', () => ({
  ...jest.requireActual('../app/dev_diag_gate'),
  get DIAG_ENABLED() { return mockDiag; },
}));

/* eslint-disable import/first */
import { parseDevStateParams } from '../app/dev_state_fixtures';
import { getDevAiConsentOverride, setDevAiConsentOverride } from '../app/dev_ai_consent';

describe('dev-подмена согласия ИИ: только dev, в релизе игнорируется', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    mockStoreRelease = false;
    mockDiag = true;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    setDevAiConsentOverride(null);
  });
  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.restoreAllMocks();
  });

  it('ссылка consent=on|off — короткое имя для aiConsent=granted|off', () => {
    expect(parseDevStateParams({ consent: 'on' }).request.aiConsent).toBe('granted');
    expect(parseDevStateParams({ consent: 'off' }).request.aiConsent).toBe('off');
    expect(parseDevStateParams({ aiConsent: 'denied', consent: 'on' }).request.aiConsent).toBe('denied');
    expect(parseDevStateParams({ consent: 'yes' }).rejected).toHaveProperty('consent');
  });

  it('в dev-сборке подмена включается и пишет [AI-CONSENT] dev_override', () => {
    expect(setDevAiConsentOverride('granted')).toBe(true);
    expect(getDevAiConsentOverride()).toBe('granted');
    expect(log.mock.calls.some(([line]) => String(line).startsWith('[AI-CONSENT] dev_override=granted'))).toBe(true);
  });

  it('релизная сборка (__DEV__ = false): установка отклоняется, гейт без подмены', () => {
    setDevAiConsentOverride('granted');
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    expect(getDevAiConsentOverride()).toBeNull();
    expect(setDevAiConsentOverride('granted')).toBe(false);
    expect(getDevAiConsentOverride()).toBeNull();
  });

  it('стор-сборка (IS_STORE_RELEASE) или выключенная диагностика (DIAG_ENABLED = false): флаг игнорируется', () => {
    setDevAiConsentOverride('granted');
    mockStoreRelease = true;
    expect(getDevAiConsentOverride()).toBeNull();
    expect(setDevAiConsentOverride('granted')).toBe(false);
    mockStoreRelease = false;
    mockDiag = false;
    expect(getDevAiConsentOverride()).toBeNull();
    expect(setDevAiConsentOverride('granted')).toBe(false);
  });
});
