// зачем (Сверка 06.11, dev_state?newbie=on): «новичок» на залогиненном боевом аккаунте без выхода и без стирания данных.
// Защита: бонус +500 НЕ выдаётся при ключе (монеты не уйдут на настоящий аккаунт), прогресс не трогается, в релизе ключ не работает.
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEV_FORCE_NEWBIE_KEY, isDevForceNewbie, setDevForceNewbie } from '../app/dev_force_newbie';
import { maybeGrantFirstLessonBonus } from '../app/first_lesson_bonus';

const storage = AsyncStorage as unknown as { __reset: () => void };
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const globals = globalThis as { __DEV__?: boolean };
const originalDev = globals.__DEV__;

beforeEach(() => {
  globals.__DEV__ = true; // зачем: ключ работает только в dev-сборке; в jest __DEV__ по умолчанию выключен
  storage.__reset();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  globals.__DEV__ = originalDev;
  jest.restoreAllMocks();
});

describe('dev-ключ «новичок»', () => {
  it('включается и выключается, прогресс не трогает', async () => {
    await AsyncStorage.setItem('user_total_xp', '777');
    expect(await isDevForceNewbie()).toBe(false);
    await expect(setDevForceNewbie(true)).resolves.toBe(true);
    expect(await AsyncStorage.getItem(DEV_FORCE_NEWBIE_KEY)).toBe('1');
    expect(await isDevForceNewbie()).toBe(true);
    await setDevForceNewbie(false);
    expect(await isDevForceNewbie()).toBe(false);
    expect(await AsyncStorage.getItem('user_total_xp')).toBe('777');
  });

  it('при ключе бонус +500 не выдаётся, даже если вердикт «новый» и флага нет', async () => {
    await setDevForceNewbie(true);
    const grant = jest.fn(async () => undefined);
    const granted = await maybeGrantFirstLessonBonus({
      gatesEnabled: () => true,
      verdict: async () => ({ isNew: true, reason: 'force_new' }),
      ownerStableId: async () => 'owner-real-account',
      sha256Hex: async () => 'a'.repeat(64),
      grant,
      readFlag: async () => false,
      writeFlag: async () => undefined,
    });
    expect(granted).toBe(false);
    expect(grant).not.toHaveBeenCalled();
  });

  it('вердикт и запись первого языка читают ключ; параметр newbie есть в dev_state', () => {
    expect(read('app/rank_gates_new_user.ts')).toContain("return { isNew: true, reason: 'force_new' };");
    expect(read('app/rank_gates_new_user.ts')).toContain('await isDevForceNewbie()');
    expect(read('app/course_language_access.ts')).toContain('newUser: forceNew || verdict.isNew');
    const fixtures = read('app/dev_state_fixtures.ts');
    expect(fixtures).toContain("pick('newbie', ['on', 'off', '1', '0'] as const)");
    expect(fixtures).toContain("setDevForceNewbie(request.newbie === 'on')");
  });

  it('[NEWBIE-SIM]: ключ не пишет на сервер и не трогает хранилище прогресса', async () => {
    await AsyncStorage.multiSet([['user_total_xp', '777'], ['streak_count', '9'], ['user_stars_v1', '123'], ['story_events_v1:first_lesson_bonus_granted:o', '1']]);
    const before = await AsyncStorage.multiGet(['user_total_xp', 'streak_count', 'user_stars_v1', 'story_events_v1:first_lesson_bonus_granted:o']);
    await setDevForceNewbie(true);
    await setDevForceNewbie(false);
    expect(await AsyncStorage.multiGet(['user_total_xp', 'streak_count', 'user_stars_v1', 'story_events_v1:first_lesson_bonus_granted:o'])).toEqual(before);
    const src = read('app/dev_force_newbie.ts');
    expect(src).not.toMatch(/firestore|firebase|httpsCallable|fetch\(/i);
    expect(src).toContain('[NEWBIE-SIM] set');
  });

  it('вне __DEV__ ключ не включается и не читается (релиз)', async () => {
    globals.__DEV__ = false;
    await expect(setDevForceNewbie(true)).resolves.toBe(false);
    expect(await AsyncStorage.getItem(DEV_FORCE_NEWBIE_KEY)).toBeNull();
    await AsyncStorage.setItem(DEV_FORCE_NEWBIE_KEY, '1');
    expect(await isDevForceNewbie()).toBe(false);
  });

  it('в стор-сборке и вне __DEV__ ключ не работает', () => {
    const src = read('app/dev_force_newbie.ts');
    expect(src).toContain('__DEV__ === true && !IS_STORE_RELEASE');
  });
});
