// зачем (координатор 12.10): dev-фикстура «прыжок серии после восстановления» — порядок записи и событие, как у
// настоящего восстановления (cloud_profile_hydrated), чтобы проверить [HOME-RESTORE-JUMP] на аккаунте с ненулевой серией.
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockEmit = jest.fn();
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => mockEmit(...args) }));

import { parseDevStreakJump, runDevStreakRestoreJump } from '../app/dev_streak_restore_jump';

beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => undefined));
afterAll(() => jest.restoreAllMocks());

describe('dev streakJump', () => {
  it('разбор «до:после»', () => {
    expect(parseDevStreakJump('5:12')).toEqual({ local: 5, cloud: 12 });
    expect(parseDevStreakJump(' 0:7 ')).toEqual({ local: 0, cloud: 7 });
    expect(parseDevStreakJump('5-12')).toBeNull();
    expect(parseDevStreakJump(undefined)).toBeNull();
  });

  it('сначала локальная серия, после кадра Главной и паузы — «облачная» и событие восстановления', async () => {
    await AsyncStorage.clear();
    let releasePaint: (() => void) | null = null;
    let releaseWait: (() => void) | null = null;
    await runDevStreakRestoreJump({ local: 5, cloud: 12 }, {
      whenHomePainted: () => new Promise<void>((resolve) => { releasePaint = resolve; }),
      wait: () => new Promise<void>((resolve) => { releaseWait = resolve; }),
    });
    expect(await AsyncStorage.getItem('streak_count')).toBe('5');
    expect(mockEmit).not.toHaveBeenCalled();
    (releasePaint as unknown as () => void)();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await AsyncStorage.getItem('streak_count')).toBe('5');
    (releaseWait as unknown as () => void)();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await AsyncStorage.getItem('streak_count')).toBe('12');
    expect(mockEmit).toHaveBeenCalledWith('cloud_profile_hydrated');
  });
});
