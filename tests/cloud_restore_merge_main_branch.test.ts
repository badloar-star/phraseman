// зачем (координатор 11.10, «локальное накопление не теряется»): в ветке «облако главнее» основной цикл раньше писал
// облако поверх ключей со своим правилом слияния (FC_RESTORE_MERGE_STRATEGIES работала только в sticky/fr-ветках).
// Теперь основной цикл сначала смотрит в таблицу: локальный день активности, которого нет в облаке, переживает.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __cloudSyncTestHooks } from '../app/cloud_sync';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

const makeCloudUserDoc = (progress: Record<string, unknown>) => ({ exists: true, data: () => ({ progress }) });
const daysOn = (raw: string | null) => (raw ? (JSON.parse(raw) as { bits: string }).bits.split('').filter((b) => b === '1').length : 0);

describe('ветка «облако главнее» — ключи из таблицы слияний сливаются, а не перезаписываются', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('active_days_v1: локальный день, которого нет в облаке, сохраняется (ИЛИ по датам)', async () => {
    await AsyncStorage.multiSet([
      ['streak_count', '0'],
      ['active_days_v1', JSON.stringify({ anchor: '2026-10-11', bits: '1' })],
    ]);
    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      // облачная серия больше локальной → ветка «облако главнее»
      streak_count: '5',
      last_active_date: '2026-10-10',
      active_days_v1: JSON.stringify({ anchor: '2026-10-10', bits: '1' }),
    }));
    expect(restored).toBe(true);
    const merged = await AsyncStorage.getItem('active_days_v1');
    expect(merged).not.toBe(JSON.stringify({ anchor: '2026-10-10', bits: '1' }));
    expect(daysOn(merged)).toBe(2);
  });

  it('пп.6–8, 12: начатый язык, счётчик «Хелпер» и флаги оплаты не откатываются облаком', async () => {
    await AsyncStorage.multiSet([
      ['streak_count', '0'],
      ['study_languages_started_v1', JSON.stringify(['en', 'fr'])],
      ['helpful_error_reports_confirmed_v1', '3'],
      ['had_premium_ever', '1'],
      ['achievement_access_plus_paid_v1', 'true'],
    ]);
    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      streak_count: '5',
      last_active_date: '2026-10-10',
      study_languages_started_v1: JSON.stringify(['en', 'es']),
      helpful_error_reports_confirmed_v1: '2',
      had_premium_ever: '0',
      achievement_access_plus_paid_v1: 'false',
    }));
    expect(restored).toBe(true);
    const langs = JSON.parse((await AsyncStorage.getItem('study_languages_started_v1')) ?? '[]') as string[];
    expect([...langs].sort()).toEqual(['en', 'es', 'fr']);
    expect(await AsyncStorage.getItem('helpful_error_reports_confirmed_v1')).toBe('3');
    expect(await AsyncStorage.getItem('had_premium_ever')).toBe('1');
    expect(await AsyncStorage.getItem('achievement_access_plus_paid_v1')).toBe('true');
  });

  it('облачный флаг оплаты приходит, если локально его нет', async () => {
    await AsyncStorage.multiSet([['streak_count', '0']]);
    await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      streak_count: '5',
      last_active_date: '2026-10-10',
      achievement_access_pro_paid_v1: 'true',
    }));
    expect(await AsyncStorage.getItem('achievement_access_pro_paid_v1')).toBe('true');
  });

  it('пп.13–14: заморозка и бонус входа — правило прежнее (облако), но есть лог с обеими сторонами', async () => {
    const logSpy = console.log as unknown as jest.Mock;
    await AsyncStorage.multiSet([
      ['streak_count', '0'],
      ['streak_freeze', JSON.stringify({ active: true, date: '2026-10-11' })],
    ]);
    await __cloudSyncTestHooks.applyRestoreFromUserDoc(makeCloudUserDoc({
      streak_count: '5',
      last_active_date: '2026-10-10',
      streak_freeze: JSON.stringify({ active: false, date: '2026-10-09' }),
    }));
    expect(await AsyncStorage.getItem('streak_freeze')).toBe(JSON.stringify({ active: false, date: '2026-10-09' }));
    const line = logSpy.mock.calls.find((call) => call[0] === '[FREEZE-RESTORE]');
    expect(line).toBeDefined();
    expect(JSON.parse(String(line?.[1]))).toMatchObject({ winner: 'cloud', local: JSON.stringify({ active: true, date: '2026-10-11' }) });
  });

  it('основной цикл зовёт таблицу слияний (контракт по исходнику)', () => {
    const source = require('fs').readFileSync(require('path').join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8') as string;
    const loopStart = source.indexOf('for (const key of getRuntimeSyncKeys()) {', source.indexOf('const mergeStrategyRuntimeKeys'));
    const loop = source.slice(loopStart, source.indexOf("pairs.push([key, mergeLessonRestoreValue(key, storageValue, localLessonRestoreMap[key])]);", loopStart));
    expect(loop).toContain('const mergeStrategy = FC_RESTORE_MERGE_STRATEGIES[key] ?? cardRestoreStrategies[key];');
    expect(loop).toContain('logRestoreMerge(key, localValue, storageValue, merged);');
  });
});
