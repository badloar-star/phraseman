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

const { buildRestoreSnapshot } = __cloudSyncTestHooks;

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
});
