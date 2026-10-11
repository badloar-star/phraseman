// зачем (координатор 14.10, R1_SHOT_LIST settings-gap-007…009, 029): dev-кампании слота сообщений и опроса Настроек для съёмки.
// Сид пишет только локальные ключи устройства, кампании выдуманные (id dev-state-…), голос за них в сеть не уходит,
// а в стор-сборке функция отказывает и ничего не пишет.
const mockStore = new Map<string, string>();
let mockStoreRelease = false;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => (mockStore.has(key) ? mockStore.get(key)! : null)),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStore.delete(key); }),
    multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => mockStore.set(k, v)); }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => mockStore.delete(k)); }),
    multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, mockStore.has(k) ? mockStore.get(k)! : null])),
  },
}));
jest.mock('../app/config', () => {
  const actual = jest.requireActual('../app/config');
  return { ...actual, get IS_STORE_RELEASE() { return mockStoreRelease; } };
});
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'uid-1') }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-1') }));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import { devSeedSettingsMessageSlot, peekAppMessagesSnapshot, DEV_SETTINGS_CAMPAIGN_PREFIX } from '../app/app_messages';
import { selectSettingsMessageSlots } from '../app/settings_message_slots';
import { devSetSettingsPollVote, readSettingsPollVote } from '../app/settings_poll_vote';
import { parseDevStateParams } from '../app/dev_state_fixtures';

(globalThis as { __DEV__?: boolean }).__DEV__ = true; // зачем: проверка dev-ветки; стор-сборка имитируется через IS_STORE_RELEASE

const CTX = { stableId: 'stable-1', hasPremiumAccess: false, appVersion: '1.0.0' } as const;

describe('dev-кампании слота сообщений Настроек', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    mockStore.clear();
    mockStoreRelease = false;
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); });

  it('poll: опрос в нижнем слоте без голоса; верхнего слота нет', async () => {
    const res = await devSeedSettingsMessageSlot('poll', 'stable-1');
    expect(res.ok).toBe(true);
    const selection = selectSettingsMessageSlots(peekAppMessagesSnapshot(), CTX);
    expect(selection.bottom?.id).toBe(`${DEV_SETTINGS_CAMPAIGN_PREFIX}poll`);
    expect(selection.bottom?.kind).toBe('poll');
    expect(selection.bottom?.poll?.options.length).toBe(3);
    expect(selection.top).toBeNull();
    expect(await readSettingsPollVote('stable-1', `${DEV_SETTINGS_CAMPAIGN_PREFIX}poll`)).toBeNull();
  });

  it('poll_voted: тот же опрос, но голос отдан локально и помечен синхронизированным', async () => {
    await devSeedSettingsMessageSlot('poll_voted', 'stable-1');
    const vote = await readSettingsPollVote('stable-1', `${DEV_SETTINGS_CAMPAIGN_PREFIX}poll`);
    expect(vote).toMatchObject({ optionId: 'speed', status: 'synced' });
  });

  it('message и top: сообщение в нужном слоте', async () => {
    await devSeedSettingsMessageSlot('message', 'stable-1');
    let selection = selectSettingsMessageSlots(peekAppMessagesSnapshot(), CTX);
    expect(selection.bottom?.kind).toBe('message');
    expect(selection.top).toBeNull();
    await devSeedSettingsMessageSlot('top', 'stable-1');
    selection = selectSettingsMessageSlots(peekAppMessagesSnapshot(), CTX);
    expect(selection.top?.id).toBe(`${DEV_SETTINGS_CAMPAIGN_PREFIX}top`);
    expect(selection.bottom).toBeNull();
  });

  it('off: убирает dev-кампании и голос', async () => {
    await devSeedSettingsMessageSlot('poll_voted', 'stable-1');
    await devSeedSettingsMessageSlot('off', 'stable-1');
    const selection = selectSettingsMessageSlots(peekAppMessagesSnapshot(), CTX);
    expect(selection.top).toBeNull();
    expect(selection.bottom).toBeNull();
    expect(await readSettingsPollVote('stable-1', `${DEV_SETTINGS_CAMPAIGN_PREFIX}poll`)).toBeNull();
  });

  it('в стор-сборке не действует: отказ, ни одного ключа в хранилище', async () => {
    mockStoreRelease = true;
    const res = await devSeedSettingsMessageSlot('poll_voted', 'stable-1');
    expect(res).toEqual({ ok: false, reason: 'not_dev_build' });
    expect(mockStore.size).toBe(0);
    expect(await devSetSettingsPollVote('stable-1', `${DEV_SETTINGS_CAMPAIGN_PREFIX}poll`, 'speed')).toBe(false);
    expect(mockStore.size).toBe(0);
    expect(String(warn.mock.calls[0]?.[0])).toContain('[DEV-STATE]');
  });

  it('голос пишется только для dev-кампаний; настоящие кампании не трогаются', async () => {
    expect(await devSetSettingsPollVote('stable-1', 'real-campaign-1', 'a')).toBe(false);
    expect(mockStore.size).toBe(0);
  });

  it('каждая ветка пишет [DEV-STATE] (вход, итог)', async () => {
    await devSeedSettingsMessageSlot('top', 'stable-1');
    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.includes('[DEV-STATE] settings_slot вход kind=top'))).toBe(true);
    expect(lines.some((line) => line.includes('[DEV-STATE] settings_slot итог kind=top'))).toBe(true);
  });

  it('ссылка dev_state?slot=…: разбор значений, мусор отбрасывается с причиной', () => {
    expect(parseDevStateParams({ slot: 'poll_voted' }).request.slot).toBe('poll_voted');
    const bad = parseDevStateParams({ slot: 'banner' });
    expect(bad.request.slot).toBeUndefined();
    expect(Object.keys(bad.rejected)).toEqual(['slot']);
  });

  it('транспорт голоса отказывает dev-кампаниям (в сеть не уходит)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'settings_poll_vote.ts'), 'utf8');
    expect(src).toMatch(/input\.messageId\.startsWith\(DEV_SETTINGS_CAMPAIGN_ID_PREFIX\)/);
    expect(src).toMatch(/dev_state_campaign_no_network/);
    const messages = fs.readFileSync(path.join(__dirname, '..', 'app', 'app_messages.ts'), 'utf8');
    expect(messages).toMatch(/DEV_SETTINGS_CAMPAIGN_PREFIX = 'dev-state-'/);
    expect(src).toMatch(/DEV_SETTINGS_CAMPAIGN_ID_PREFIX = 'dev-state-'/);
  });
});
