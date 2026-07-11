/**
 * Регрессия: залипшая версия приложения в админке.
 *
 * app_version / device_platform принадлежат ТЕКУЩЕМУ устройству и исключены из
 * restore. Но раньше при restore в diff-снапшот (LAST_SYNC_SNAPSHOT_KEY) писалось
 * ВСЁ облачное cloudData целиком, включая СТАРЫЙ app_version. Из-за этого следующий
 * diff-синк решал, что версия уже синкнута, и свежая локальная версия НЕ уезжала —
 * в админке (users/{uid}.progress.app_version) залипала старая версия, и фильтр по
 * новой версии показывал единицы вместо всех обновившихся.
 *
 * Фикс: buildRestoreSnapshot исключает device-owned ключи из снапшота, чтобы их
 * свежее локальное значение гарантированно попало в следующий diff-патч и уехало
 * БЛИЖАЙШИМ обычным синком (без единой лишней записи в облако).
 */
import { __cloudSyncTestHooks } from '../app/cloud_sync';

const {
  buildRestoreSnapshot,
  isSuspiciousLocalXpGap,
  buildStickyServerProgressPairs,
} = __cloudSyncTestHooks;

describe('buildRestoreSnapshot — device-owned keys excluded from diff snapshot', () => {
  it('drops app_version so a fresh local version is not treated as already-synced', () => {
    const cloudData = {
      app_version: '1.5.41', // старая версия из облака
      user_total_xp: '7580',
      user_name: 'Georgii',
    };

    const snapshot = buildRestoreSnapshot(cloudData);

    // app_version НЕ должен попасть в diff-базу: иначе свежая локальная 1.5.52
    // совпала бы с ней и не уехала.
    expect('app_version' in snapshot).toBe(false);
    // Остальные (real progress) поля сохраняются, чтобы diff по ним работал штатно.
    expect(snapshot.user_total_xp).toBe('7580');
    expect(snapshot.user_name).toBe('Georgii');
  });

  it('drops device_platform too', () => {
    const snapshot = buildRestoreSnapshot({ device_platform: 'android', lang: 'ru' });
    expect('device_platform' in snapshot).toBe(false);
    expect(snapshot.lang).toBe('ru');
  });

  it('does not mutate the source cloudData', () => {
    const cloudData = { app_version: '1.5.41', user_total_xp: '100' };
    buildRestoreSnapshot(cloudData);
    // Иммутабельность: исходный объект не тронут (device-owned ключ на месте).
    expect(cloudData.app_version).toBe('1.5.41');
  });

  it('preserves null values for non-excluded keys', () => {
    const snapshot = buildRestoreSnapshot({ some_key: null, app_version: '1.0.0' });
    expect(snapshot.some_key).toBeNull();
    expect('app_version' in snapshot).toBe(false);
  });

  it('returns empty snapshot for empty cloudData', () => {
    expect(buildRestoreSnapshot({})).toEqual({});
  });

  it('drops undefined values so they cannot poison the diff snapshot', () => {
    // Firestore не хранит undefined, но cloudData мутируется по пути restore —
    // undefined не должен просачиваться в снапшот (иначе previousSnapshot[key]
    // === undefined ломает последующее сравнение).
    const snapshot = buildRestoreSnapshot({
      good: 'v',
      bad: undefined as unknown as string | null,
    });
    expect('bad' in snapshot).toBe(false);
    expect(snapshot.good).toBe('v');
  });

  it('prefers an authoritative server ledger across a fresh 3x and 15k local gap', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isSuspiciousLocalXpGap(600_000, 15_000, today, true)).toBe(true);
    expect(isSuspiciousLocalXpGap(45_000, 15_000, today, true)).toBe(true);
    expect(isSuspiciousLocalXpGap(44_999, 15_000, today, true)).toBe(false);
    expect(isSuspiciousLocalXpGap(600_000, 15_000, today, false)).toBe(false);
  });

  it('restores current UTC-week and server streak fields in the sticky branch', () => {
    const pairs = Object.fromEntries(buildStickyServerProgressPairs({
      weekly_xp: '13000',
      weekly_xp_period_start: '2026-07-06',
      week_points: '13000',
      week_points_v2: JSON.stringify({ weekKey: '2026-W28', points: 13000 }),
      streak_count: '42',
      last_active_date: '2026-07-10',
      streak_last_date: '2026-07-10',
    }, new Date('2026-07-10T12:00:00.000Z')));

    expect(pairs).toMatchObject({
      weekly_xp: '13000',
      weekly_xp_period_start: '2026-07-06',
      week_points_v2: JSON.stringify({ weekKey: '2026-W28', points: 13000 }),
      streak_count: '42',
      last_active_date: '2026-07-10',
    });
  });

  it('does not lower server-owned sticky progress while this account has pending events', () => {
    expect(buildStickyServerProgressPairs({
      weekly_xp: '10',
      weekly_xp_period_start: '2026-07-06',
      streak_count: '1',
    }, new Date('2026-07-10T12:00:00.000Z'), true)).toEqual([]);
  });
});
