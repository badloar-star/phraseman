// Замок (координатор 29.10, после жалобы №8): Plus только в облаке (оплата через Telegram-бот → VIP) на новом устройстве ещё не на
// телефоне, снимок профиля «free». Окно покупки не открывается сразу — ждёт облако; Plus доехал → окно не показывается. Облако не
// ответило → вариант «Не видим твой Plus» (Восстановить покупки первой кнопкой), source исходный. На устройстве, где облако статус уже
// подтверждало, бесплатному человеку окно открывается сразу, как раньше (без новой задержки).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SERVER_REFUSED_CONTEXT, resolvePremiumModalEntry } from '../app/paywall_entry_contract';
import {
  markPlusCloudConfirmed,
  peekPlusCloudConfirmed,
  readPlusCloudConfirmed,
  resetPlusCloudConfirmedForTests,
} from '../app/plus_cloud_confirmed_marker';
import { PAYWALL_CLOUD_UNCONFIRMED_WAIT_MS, paywallEntryWaitCeilingMs } from '../app/plus_cloud_unconfirmed_entry';
import { PAYWALL_ENTRY_WAIT_CEILING_MS } from '../app/load_gate_config';
import { CLOUD_ACCESS_REFRESH_WAIT_CEILING_MS } from '../app/premium_guard';

const params = { context: 'course_after_lesson3', source: 'lesson_menu' } as const;
const base = { params, impressionId: 'imp_cloud_1', cachedEntitlement: 'free' as const };

beforeEach(async () => {
  resetPlusCloudConfirmedForTests();
  await AsyncStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Telegram-VIP на новом устройстве', () => {
  test('снимок «free», облако статус не подтверждало, доступ ещё проверяется → окно ждёт, не показывается', () => {
    const res = resolvePremiumModalEntry({ ...base, accessResolved: false, hasPremiumAccess: false, cloudConfirmedOnDevice: false });
    expect(res.decision).toBe('wait');
  });

  test('отметку ещё читают с диска → тоже ждём', () => {
    expect(resolvePremiumModalEntry({ ...base, accessResolved: false, hasPremiumAccess: false, cloudConfirmedOnDevice: null }).decision).toBe('wait');
    expect(resolvePremiumModalEntry({ ...base, accessResolved: true, hasPremiumAccess: false, cloudConfirmedOnDevice: null }).decision).toBe('wait');
  });

  test('облако доехало, VIP активен → окно не открывается', () => {
    const res = resolvePremiumModalEntry({ ...base, accessResolved: true, hasPremiumAccess: true, cloudConfirmedOnDevice: false });
    expect(res.decision).toBe('dismiss');
  });

  test('облако не ответило → вариант «Не видим твой Plus», source исходный, Free', () => {
    const res = resolvePremiumModalEntry({ ...base, accessResolved: true, hasPremiumAccess: false, cloudConfirmedOnDevice: false });
    expect(res.decision).toBe('show');
    if (res.decision !== 'show') return;
    expect(res.entry.context).toBe(SERVER_REFUSED_CONTEXT);
    expect(res.entry.source).toBe('lesson_menu');
    expect(res.entry.entitlementState).toBe('free');
  });
});

describe('устройство, где облако статус уже подтверждало — без новой задержки', () => {
  test('снимок «free» → окно сразу, обычный контекст', () => {
    const res = resolvePremiumModalEntry({ ...base, accessResolved: false, hasPremiumAccess: false, cloudConfirmedOnDevice: true });
    expect(res.decision).toBe('show');
    if (res.decision === 'show') expect(res.entry.context).toBe('course_after_lesson3');
  });

  test('без отметки (старые вызовы) — прежнее поведение', () => {
    expect(resolvePremiumModalEntry({ ...base, accessResolved: false, hasPremiumAccess: false }).decision).toBe('show');
  });

  test('потолок ожидания: дольше только при неподтверждённом облаке и снимке «free», и меньше потолка облака', () => {
    expect(paywallEntryWaitCeilingMs(true, 'free')).toBe(PAYWALL_ENTRY_WAIT_CEILING_MS);
    expect(paywallEntryWaitCeilingMs(false, 'unknown')).toBe(PAYWALL_ENTRY_WAIT_CEILING_MS);
    expect(paywallEntryWaitCeilingMs(false, 'free')).toBe(PAYWALL_CLOUD_UNCONFIRMED_WAIT_MS);
    expect(paywallEntryWaitCeilingMs(null, 'free')).toBe(PAYWALL_CLOUD_UNCONFIRMED_WAIT_MS);
    expect(PAYWALL_CLOUD_UNCONFIRMED_WAIT_MS).toBeLessThan(CLOUD_ACCESS_REFRESH_WAIT_CEILING_MS);
  });
});

describe('отметка «облако подтвердило»', () => {
  test('по аккаунту: другой аккаунт отметку не наследует; переживает перезапуск через диск', async () => {
    expect(peekPlusCloudConfirmed('uid_a')).toBeNull();
    expect(await readPlusCloudConfirmed('uid_a')).toBe(false);
    markPlusCloudConfirmed('uid_a');
    expect(peekPlusCloudConfirmed('uid_a')).toBe(true);
    expect(await readPlusCloudConfirmed('uid_b')).toBe(false);
    await Promise.resolve();
    resetPlusCloudConfirmedForTests(); // как новый процесс
    expect(peekPlusCloudConfirmed('uid_a')).toBeNull();
    expect(await readPlusCloudConfirmed('uid_a')).toBe(true);
  });

  test('нет аккаунта → «не подтверждено»', async () => {
    expect(peekPlusCloudConfirmed(null)).toBe(false);
    expect(await readPlusCloudConfirmed(null)).toBe(false);
  });
});
