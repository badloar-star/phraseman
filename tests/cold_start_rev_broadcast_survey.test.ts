// зачем (владелец 22.10, вопрос 27 «сначала безопасные»; карта b94ddc823 п.7, п.8): рассылка и опрос на Главной зовут
// сервер (полное ядро) только когда сервер поднял свою версию в remote_config/app. Старт без изменений = 0 вызовов.
import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'node:fs';
import path from 'node:path';

let mockSurveyRev = 0;
jest.mock('../app/remote_flags', () => ({
  getRemoteNumber: jest.fn((key: string) => (key === 'home_survey_rev' ? mockSurveyRev : 0)),
}));

const mockFetchSurvey = jest.fn(async () => ({ survey: null, completion: null }));
jest.mock('../app/survey_client', () => ({
  fetchActiveSurveyWithRetry: (...args: unknown[]) => mockFetchSurvey(...(args as [])),
}));

import {
  HOME_SURVEY_REV_MAX_AGE_MS,
  HOME_SURVEY_TTL_MS,
  loadHomeSurvey,
  markHomeSurveyCompleted,
  resetHomeSurveyEntryForTests,
} from '../app/home_survey_entry';

const input = (nowMs: number) => ({ stableId: 'stable-A', lang: 'ru' as const, platform: 'android', nowMs });

describe('опрос на Главной по версии home_survey_rev', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetHomeSurveyEntryForTests();
    mockFetchSurvey.mockClear();
    mockSurveyRev = 0;
  });

  it('старт без изменений версии после 6 ч = 0 вызовов сервера (ответ с телефона)', async () => {
    mockSurveyRev = 9_000;
    const t0 = Date.now();
    await loadHomeSurvey(input(t0));
    expect(mockFetchSurvey).toHaveBeenCalledTimes(1);

    resetHomeSurveyEntryForTests(); // новый процесс: память пуста, диск остался
    await loadHomeSurvey(input(t0 + HOME_SURVEY_TTL_MS + 60_000));
    expect(mockFetchSurvey).toHaveBeenCalledTimes(1);
  });

  it('версия выросла → один вызов; версии нет → прежние 6 ч', async () => {
    mockSurveyRev = 9_000;
    const t0 = Date.now();
    await loadHomeSurvey(input(t0));
    resetHomeSurveyEntryForTests();
    mockSurveyRev = 9_500;
    await loadHomeSurvey(input(t0 + HOME_SURVEY_TTL_MS + 60_000));
    expect(mockFetchSurvey).toHaveBeenCalledTimes(2);

    resetHomeSurveyEntryForTests();
    mockSurveyRev = 0;
    await loadHomeSurvey(input(t0 + 2 * HOME_SURVEY_TTL_MS + 120_000));
    expect(mockFetchSurvey).toHaveBeenCalledTimes(3);
  });

  it('страховка 7 дней и «пройден» держится по версии', async () => {
    mockSurveyRev = 9_000;
    const t0 = Date.now();
    await loadHomeSurvey(input(t0));
    markHomeSurveyCompleted('stable-A', 'ru');
    resetHomeSurveyEntryForTests();
    await loadHomeSurvey(input(Date.now() + HOME_SURVEY_TTL_MS + 60_000));
    expect(mockFetchSurvey).toHaveBeenCalledTimes(1);

    resetHomeSurveyEntryForTests();
    await loadHomeSurvey(input(Date.now() + HOME_SURVEY_REV_MAX_AGE_MS + 60_000));
    expect(mockFetchSurvey).toHaveBeenCalledTimes(2);
  });
});

describe('рассылка по версии global_broadcast_rev', () => {
  it('решение: та же версия и «показывать нечего» у этого владельца → без сервера', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { decideGlobalBroadcastSettledSkip, GLOBAL_BROADCAST_SETTLED_MAX_AGE_MS } = require('../app/global_broadcast_settled');
    const now = 1_000_000;
    const settled = { uid: 'A', rev: 7, at: now - 1_000 };
    expect(decideGlobalBroadcastSettledSkip({ remoteRev: 7, uid: 'A', settled, nowMs: now })).toEqual({ skip: true, reason: 'rev_unchanged_settled' });
    expect(decideGlobalBroadcastSettledSkip({ remoteRev: 0, uid: 'A', settled, nowMs: now }).reason).toBe('no_remote_rev');
    expect(decideGlobalBroadcastSettledSkip({ remoteRev: 8, uid: 'A', settled, nowMs: now }).reason).toBe('rev_changed');
    expect(decideGlobalBroadcastSettledSkip({ remoteRev: 7, uid: 'B', settled, nowMs: now }).reason).toBe('not_settled_for_owner');
    expect(decideGlobalBroadcastSettledSkip({ remoteRev: 7, uid: 'A', settled, nowMs: now + GLOBAL_BROADCAST_SETTLED_MAX_AGE_MS }).reason)
      .toBe('max_age');
  });

  it('отметка «показывать нечего» ставится только на итогах без окна, не при сбое и не при показе', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'global_broadcast_modal.ts'), 'utf8');
    const fetchBody = source.slice(source.indexOf('export async function fetchPendingGlobalBroadcastModal('));
    expect(fetchBody).toContain("return settled('no_active_broadcasts');");
    expect(fetchBody).toContain('return settled(`already_claimed id=${payload.id}`);');
    expect(fetchBody).toContain('return settled(`dismissed id=${payload.id}`);');
    // Сбой и смена аккаунта — не «показывать нечего».
    expect(fetchBody).toContain("return skip('account_changed_after_list');");
    expect(fetchBody).not.toContain("settled('failed");
  });
});
