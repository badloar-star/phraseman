/**
 * D49 + Q12: «Дневной путь» удалён, но компенсация за его незабранные подарки
 * читается из сырого журнала модулем миграции. Проверяем: проверка подписи,
 * квитанции «забрано», начатая запись (prepared), битые данные → бросок,
 * точная очистка по владельцу и разовая очистка ключей показа.
 */
import { createHash } from 'crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  purgeRetiredDailyPathAccountKeys,
  purgeRetiredDailyPathPresentationKeys,
  readLegacyDailyPathPending,
} from '../app/gifts_to_coins_legacy_daily_path_v1';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (_algorithm: string, value: string) => createHash('sha256').update(value).digest('hex'),
}));

const OWNER = 'owner-a';
let storage: Record<string, string> = {};

function occurrence(operationId: string, revision: number, kind = 'runes', amount = 100) {
  const body = {
    schemaVersion: 'daily-journey-gift-occurrence.v1',
    operationId,
    ownerStableId: OWNER,
    source: 'daily_journey',
    cycle: 1,
    day: revision,
    reward: { kind, amount },
    revision,
    createdAtMs: 1000 + revision,
  };
  return { ...body, payloadFingerprint: createHash('sha256').update(JSON.stringify(body)).digest('hex') };
}

function put(key: string, value: unknown): void {
  storage[key] = typeof value === 'string' ? value : JSON.stringify(value);
}

beforeEach(() => {
  storage = {};
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: readonly string[]) =>
    keys.map((key) => [key, storage[key] ?? null]));
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: readonly string[]) => {
    for (const key of keys) delete storage[key];
  });
});

afterEach(() => jest.restoreAllMocks());

describe('readLegacyDailyPathPending', () => {
  it('возвращает незабранные подарки и пропускает забранные', async () => {
    const a = occurrence('daily_journey:aaaa:c1:d1', 1, 'spins', 2);
    const b = occurrence('daily_journey:bbbb:c1:d2', 2, 'runes', 150);
    put(`daily_journey_gift_occurrence_v1:${OWNER}:${encodeURIComponent(a.operationId)}`, a);
    put(`daily_journey_gift_occurrence_v1:${OWNER}:${encodeURIComponent(b.operationId)}`, b);
    put(`daily_journey_gift_claim_receipt_v1:${OWNER}:${encodeURIComponent(b.operationId)}`, {
      schemaVersion: 'daily-journey-gift-claim-receipt.v1', operationId: b.operationId, ownerStableId: OWNER,
    });
    const pending = await readLegacyDailyPathPending(OWNER);
    expect(pending.map((p) => [p.operationId, p.reward.kind, p.reward.amount])).toEqual([
      [a.operationId, 'spins', 2],
    ]);
  });

  it('добавляет начатую (prepared) запись, если её ещё нет в журнале', async () => {
    const a = occurrence('daily_journey:cccc:c1:d1', 1);
    put(`daily_journey_gift_prepared_v1:${OWNER}`, {
      schemaVersion: 'daily-journey-gift-prepared.v1', ownerStableId: OWNER, occurrence: a, preparedAtMs: 2000,
    });
    const pending = await readLegacyDailyPathPending(OWNER);
    expect(pending.map((p) => p.operationId)).toEqual([a.operationId]);
  });

  it('подделанная подпись → бросок (миграция пометит источник corrupt)', async () => {
    const a = { ...occurrence('daily_journey:dddd:c1:d1', 1), reward: { kind: 'runes', amount: 9999 } };
    put(`daily_journey_gift_occurrence_v1:${OWNER}:${encodeURIComponent(a.operationId)}`, a);
    await expect(readLegacyDailyPathPending(OWNER)).rejects.toThrow('daily_journey_occurrence_corrupt');
  });

  it('чужой владелец с общим началом имени не попадает в выборку', async () => {
    const other = { ...occurrence('daily_journey:eeee:c1:d1', 1), ownerStableId: `${OWNER}x` };
    put(`daily_journey_gift_occurrence_v1:${OWNER}x:${encodeURIComponent(other.operationId)}`, other);
    expect(await readLegacyDailyPathPending(OWNER)).toEqual([]);
  });
});

describe('очистка', () => {
  it('ключи показа стираются разово, журнал подарков не трогается', async () => {
    put(`daily_journey_production_presented_v1:${OWNER}`, 'x');
    put(`daily_journey_production_intent_v1:${OWNER}`, 'x');
    put(`daily_journey_gift_occurrence_v1:${OWNER}:op`, 'keep');
    await purgeRetiredDailyPathPresentationKeys();
    expect(Object.keys(storage).sort()).toEqual([
      'daily_journey_gift_occurrence_v1:owner-a:op',
      'daily_path_retired_presentation_purged_v1',
    ]);
    put(`daily_journey_production_presented_v1:${OWNER}`, 'again');
    await purgeRetiredDailyPathPresentationKeys();
    expect(storage[`daily_journey_production_presented_v1:${OWNER}`]).toBe('again');
  });

  it('журнал владельца стирается точно по владельцу', async () => {
    put(`daily_journey_gift_occurrence_v1:${OWNER}:op`, 'x');
    put(`daily_journey_gift_prepared_v1:${OWNER}`, 'x');
    put(`daily_journey_freeze_projection_v1:${OWNER}`, 'x');
    put(`daily_journey_gift_occurrence_v1:${OWNER}x:op`, 'other');
    await purgeRetiredDailyPathAccountKeys(OWNER);
    expect(Object.keys(storage)).toEqual([`daily_journey_gift_occurrence_v1:${OWNER}x:op`]);
  });
});
