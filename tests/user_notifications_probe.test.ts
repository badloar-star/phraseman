// зачем (владелец 17.10 «друзья должны находиться мгновенно, а не через полчаса»): колокольчик перечитывал раз в 12 ч,
// заявка в друзья лежала в notifications часами. Проба одного документа ≤1 раз в минуту, полный список — только при новом.
import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'node:fs';
import path from 'node:path';
import { probeUserNotificationsHead, refreshUserNotificationsOnce } from '../app/user_notifications';
import { getCanonicalUserId } from '../app/user_id_policy';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'auth-user'),
  ensureStableAuthLink: jest.fn(async () => true),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn() }));

const mockDocs: { id: string; data: Record<string, unknown> }[] = [];
const mockLimits: number[] = [];

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn((n: number) => ({
              get: jest.fn(async () => {
                mockLimits.push(n);
                return { docs: mockDocs.slice(0, n).map((row) => ({ id: row.id, data: () => row.data })) };
              }),
            })),
          })),
        })),
      })),
    })),
  })),
}));

const storage: Record<string, string> = {};
let mockNow = 1_000_000;

function friendRequest(id: string, createdAt: number) {
  return { id, data: { type: 'friend_request', fromUid: 'sender', fromName: '', createdAt, read: false, nav: { kind: 'friends' } } };
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  mockDocs.length = 0;
  mockLimits.length = 0;
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => { storage[key] = value; });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => { delete storage[key]; });
  jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('новая заявка после полного чтения: проба (1 документ) видит её и сразу перечитывает список, без порога 30 с', async () => {
  (getCanonicalUserId as jest.Mock).mockResolvedValue('owner-new');
  mockDocs.push(friendRequest('n1', 100));
  await refreshUserNotificationsOnce({ force: true });
  mockLimits.length = 0;
  mockDocs.unshift(friendRequest('friend_request_x', 200));
  mockNow += 5_000;

  const list = await probeUserNotificationsHead('test');

  expect(mockLimits[0]).toBe(1);
  expect(mockLimits).toHaveLength(2);
  expect(list?.map((row) => row.id)).toContain('friend_request_x');
});

it('ничего нового: только 1 документ, полный список не читается; повтор раньше минуты не идёт в сеть', async () => {
  (getCanonicalUserId as jest.Mock).mockResolvedValue('owner-same');
  mockDocs.push(friendRequest('n1', 100));
  await refreshUserNotificationsOnce({ force: true });
  mockLimits.length = 0;
  mockNow += 120_000;

  await expect(probeUserNotificationsHead('test')).resolves.toBeNull();
  expect(mockLimits).toEqual([1]);

  mockNow += 30_000;
  await expect(probeUserNotificationsHead('test')).resolves.toBeNull();
  expect(mockLimits).toEqual([1]);
});

it('порог Главной 5 мин: через 2 мин сеть не трогается, через 5 мин — 1 документ (№45 шаг 6)', async () => {
  (getCanonicalUserId as jest.Mock).mockResolvedValue('owner-home');
  mockDocs.push(friendRequest('n1', 100));
  await refreshUserNotificationsOnce({ force: true });
  mockLimits.length = 0;
  mockNow += 120_000;
  await expect(probeUserNotificationsHead('home_focus', { minIntervalMs: 5 * 60_000 })).resolves.toBeNull();
  expect(mockLimits).toEqual([1]);

  mockNow += 120_000;
  await expect(probeUserNotificationsHead('home_focus', { minIntervalMs: 5 * 60_000 })).resolves.toBeNull();
  expect(mockLimits).toEqual([1]);

  mockNow += 5 * 60_000;
  await expect(probeUserNotificationsHead('home_focus', { minIntervalMs: 5 * 60_000 })).resolves.toBeNull();
  expect(mockLimits).toEqual([1, 1]);
});

it('колокольчик на фокусе Главной сначала пробует (порог 5 мин), полный перечит по 12 ч остаётся запасным', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'NotificationCenterButton.tsx'), 'utf8');
  expect(src).toContain('const HOME_BELL_PROBE_MIN_INTERVAL_MS = 5 * 60_000;');
  expect(src).toContain("probeUserNotificationsHead('home_focus', { minIntervalMs: HOME_BELL_PROBE_MIN_INTERVAL_MS }).then((probed) => probed ?? refreshUserNotificationsOnce({");
});
