// зачем (координатор 12.10, «ДА» на правку языка пушей): запуск писал на сервер pushTokenLang из сырого app_lang
// (uk/es, иначе ru) и тем же языком перепланировал локальные напоминания. Теперь язык = язык, которым реально
// нарисован интерфейс; запись на сервер — только при смене пары (кэш), повторный старт записи не делает.
import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockSet = jest.fn(async (_data: Record<string, unknown>, _opts: unknown) => undefined);
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({ collection: () => ({ doc: () => ({ set: (data: Record<string, unknown>, opts: unknown) => mockSet(data, opts) }) }) }),
}));
jest.mock('../app/config', () => ({ ...jest.requireActual('../app/config'), CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'stable_push_lang'),
  ensureStableAuthLinkForStableId: jest.fn(async () => true),
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[push-lang-test]' })),
}));

import { resolveBootstrapLocaleFromDeviceLocale } from '../constants/i18n';
import { resolvePushUiLang } from '../app/push_ui_lang';
import { registerPushTokenForServerPush } from '../app/push_token_registration';

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());

describe('язык пушей = фактический язык интерфейса', () => {
  it('uk-телефон, язык вручную не выбирал → uk (раньше ru)', () => {
    const device = resolveBootstrapLocaleFromDeviceLocale('uk-UA');
    expect(resolvePushUiLang({ resolvedUiLang: null, storedAppLang: null, deviceLang: device })).toEqual({ lang: 'uk', source: 'device' });
    expect(resolvePushUiLang({ resolvedUiLang: 'uk', storedAppLang: null, deviceLang: device })).toEqual({ lang: 'uk', source: 'ui' });
  });

  it('pt-BR → pt-BR (выбран вручную или по телефону)', () => {
    expect(resolvePushUiLang({ resolvedUiLang: null, storedAppLang: 'pt-BR', deviceLang: 'ru' }).lang).toBe('pt-BR');
    expect(resolvePushUiLang({ resolvedUiLang: null, storedAppLang: null, deviceLang: resolveBootstrapLocaleFromDeviceLocale('pt-BR') }).lang).toBe('pt-BR');
  });

  it('ru → ru', () => {
    expect(resolvePushUiLang({ resolvedUiLang: 'ru', storedAppLang: null, deviceLang: 'ru' }).lang).toBe('ru');
    expect(resolvePushUiLang({ resolvedUiLang: null, storedAppLang: 'ru', deviceLang: 'uk' }).lang).toBe('ru');
  });

  it('английский интерфейс выключен: en-телефон получает язык, на котором видит интерфейс (ru), а не en', () => {
    const device = resolveBootstrapLocaleFromDeviceLocale('en-US');
    expect(device).toBe('ru');
    expect(resolvePushUiLang({ resolvedUiLang: null, storedAppLang: null, deviceLang: device }).lang).toBe('ru');
    // даже если en когда-то оказался в app_lang — интерфейс его не показывает, пуши тоже не en
    expect(resolvePushUiLang({ resolvedUiLang: null, storedAppLang: 'en', deviceLang: device }).lang).toBe('ru');
    expect(resolvePushUiLang({ resolvedUiLang: 'en', storedAppLang: 'en', deviceLang: device }).lang).toBe('ru');
  });

  it('фактический язык интерфейса важнее сохранённого значения', () => {
    expect(resolvePushUiLang({ resolvedUiLang: 'uk', storedAppLang: 'ru', deviceLang: 'ru' })).toEqual({ lang: 'uk', source: 'ui' });
  });
});

describe('запись pushTokenLang только при смене (кэш)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockSet.mockClear();
  });

  it('первый старт пишет язык; повторный с тем же языком — записи НЕТ; смена языка — одна запись', async () => {
    await expect(registerPushTokenForServerPush('uk')).resolves.toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet.mock.calls[0][0]).toMatchObject({ pushTokenLang: 'uk' });

    await expect(registerPushTokenForServerPush('uk')).resolves.toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(1);

    await expect(registerPushTokenForServerPush('pt-BR')).resolves.toBe(true);
    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet.mock.calls[1][0]).toMatchObject({ pushTokenLang: 'pt-BR' });
  });
});

describe('запуск: один исправленный язык для сервера и локальных напоминаний (контракт по исходнику)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app/_layout.tsx'), 'utf8');

  it('старое правило «uk/es, иначе ru» удалено, язык выбирает resolvePushUiLang', () => {
    expect(src).not.toContain("langRaw === 'uk' ? 'uk' : langRaw === 'es' ? 'es' : 'ru'");
    expect(src).toContain('resolvePushUiLang({ resolvedUiLang: uiLang, storedAppLang: langRaw, deviceLang: getDeviceBootstrapLocale() })');
    expect(src).toContain("console.log('[PUSH-LANG]'");
  });

  it('тот же lang уходит в напоминания и в регистрацию токена', () => {
    // 13.10 (умное напоминание): напоминание включается через enableSmartDailyReminder(lang, …), отключённая scheduleDailyReminder не зовётся.
    expect(src).toContain('notifications.enableSmartDailyReminder(lang,');
    expect(src).not.toContain('notifications.scheduleDailyReminder(hour, minute, lang,');
    expect(src).toContain('notifications.scheduleStreakWarningIfNeeded(lang,');
    expect(src).toContain('registerPushTokenForServerPush(lang)');
  });
});
