// ЗАМОК ВЛАДЕЛЬЦА 22.10: «кнопка "не хочу с начала" только 1 раз на аккаунт! после того как он прошёл и открылось ему
// что-то или нет, второго раза уже не должно быть!» (реестр docs/work/OWNER_LOCKS.md). Ослабить — только по новому слову
// владельца. Флаг ставит телефон сразу, облако хранит (SYNC_KEYS, слияние ИЛИ). Пока экрана теста нет, флаг ставится по
// нажатию; с экраном теста он переезжает на итог («прошёл»), выход посередине кнопку сохраняет. Журнал [PLACEMENT-ONCE].
import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => ({ phase: 'active', stableId: 'stable-1' }) }));
jest.mock('../app/cloud_sync', () => ({ syncToCloud: jest.fn(async () => undefined) }));

const KEY = 'learning_v2_not_from_start_used_v1';

beforeAll(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); jest.spyOn(console, 'warn').mockImplementation(() => {}); });
// зачем: после resetModules модуль берёт свой экземпляр мока — тест читает хранилище из того же реестра модулей
type Storage = typeof import('@react-native-async-storage/async-storage').default;
const storage = (): Storage => {
  const mod = require('@react-native-async-storage/async-storage') as Storage & { default?: Storage };
  return mod.default ?? mod;
};
beforeEach(async () => { jest.resetModules(); await storage().clear(); });

const load = () => require('../app/learning_v2_not_from_start_once_v1') as typeof import('../app/learning_v2_not_from_start_once_v1');

describe('«Не хочу с начала» — один раз на аккаунт', () => {
  it('fresh account: available; after the tap: gone at once and on disk', async () => {
    const once = load();
    expect(await once.readLearningV2NotFromStartUsedV1()).toBe(false);
    const seen: boolean[] = [];
    once.subscribeLearningV2NotFromStartUsedV1((used) => seen.push(used));
    await once.markLearningV2NotFromStartUsedV1('test');
    expect(seen).toEqual([true]);
    expect(await once.readLearningV2NotFromStartUsedV1()).toBe(true);
    expect(await storage().getItem(KEY)).toBe('1');
  });

  it('flag restored by cloud (reinstall) keeps the button hidden in a fresh process', async () => {
    await storage().setItem(KEY, '1');
    expect(await load().readLearningV2NotFromStartUsedV1()).toBe(true);
  });

  it('the key syncs to the cloud with OR-merge; the season hides the button once used', () => {
    const sync = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');
    expect(sync).toContain(`'${KEY}',`);
    expect(sync).toContain(`${KEY}: mergeTruthyFlagRestoreValue,`);
    const season = fs.readFileSync(path.join(__dirname, '..', 'components', 'learning-v2', 'season', 'SeasonCourseConnected.tsx'), 'utf8');
    expect(season).toContain('onNotFromStart={notFromStartAvailable ? onNotFromStart : undefined}');
    expect(season).toContain("void markLearningV2NotFromStartUsedV1('season_cover')");
    // 29.10 (владелец, жалоба №8): кнопка не только у новичка — показ решает learningV2PlacementEntryV1, где «использован» → скрыта
    expect(season).toContain('learningV2PlacementEntryV1({ used: notFromStartUsed, currentLessonOrdinal: canonical');
    expect(season).toContain('const notFromStartAvailable = placementEntry.show;');
  });
});
