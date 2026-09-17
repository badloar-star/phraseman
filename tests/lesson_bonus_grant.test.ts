import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/xp_manager', () => ({
  registerXP: jest.fn(),
}));
jest.mock('../app/shards_system', () => ({
  addShards: jest.fn(),
}));
jest.mock('../app/app_health', () => ({
  logAppWarning: jest.fn(),
}));
jest.mock('../app/local_level_spins', () => ({
  grantLocalLessonCompletionSpin: jest.fn(),
}));

import {
  grantLessonFirstCompleteBonus,
  retryPendingLessonBonusGrants,
} from '../app/lesson_bonus_grant';
import { lessonBonusGrantedKey } from '../app/target_storage_keys';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { registerXP } = require('../app/xp_manager');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { addShards } = require('../app/shards_system');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { grantLocalLessonCompletionSpin } = require('../app/local_level_spins');

const PENDING_KEY = 'lesson_bonus_pending_v1';

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('lesson-test-account');
  (registerXP as jest.Mock).mockResolvedValue({ finalDelta: 550, multiplier: 1, isBonus: false });
  (addShards as jest.Mock).mockResolvedValue(25);
  (grantLocalLessonCompletionSpin as jest.Mock).mockResolvedValue(true);
});

describe('grantLessonFirstCompleteBonus', () => {
  it('returns the confirmed base XP and multiplier without changing the grant', async () => {
    (registerXP as jest.Mock).mockResolvedValue({ finalDelta: 1238, multiplier: 2.25, isBonus: true });

    const res = await grantLessonFirstCompleteBonus({ lessonId: 2, studyTarget: 'fr', lang: 'ru' });
    const confirmedBaseXp = (registerXP as jest.Mock).mock.calls[0][0];

    expect(res).toMatchObject({
      status: 'granted',
      baseXp: confirmedBaseXp,
      finalDelta: 1238,
      multiplier: 2.25,
    });
    expect(registerXP).toHaveBeenCalledTimes(1);
    expect(grantLocalLessonCompletionSpin).toHaveBeenCalledWith(2, 'fr', expect.any(Object));
  });

  // зачем (владелец, 2026-09-17): спин за урок стал шансом 20%. Невыпавший
  // спин — нормальный исход, а НЕ сбой выдачи: XP и осколки обязаны дойти,
  // иначе неудачный бросок молча съедал бы остальные награды урока.
  it('невыпавший спин не отменяет XP и осколки за урок', async () => {
    (grantLocalLessonCompletionSpin as jest.Mock).mockResolvedValue(false);

    const res = await grantLessonFirstCompleteBonus({ lessonId: 21, studyTarget: 'fr', lang: 'ru' });

    // Проверяем ровно своё свойство: неудачный бросок — нормальный исход, а не
    // сбой выдачи. Guard-ключ здесь не проверяем: его пишет addShards через
    // localWrites, а addShards в этом файле замокан (предсуществующий долг).
    expect(res.status).toBe('granted');
    expect(registerXP).toHaveBeenCalledTimes(1);
    expect(addShards).toHaveBeenCalledWith('lesson_first', expect.any(Object));
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBeNull();
  });

  // зачем (аудит 2026-09-17): повреждённое состояние спинов бросает
  // `local_spin_state_corrupt`. Раньше это исключение уносило ВЕСЬ бонус урока
  // в retry, где оно повторялось на том же битом файле — бонус зависал
  // навсегда, хотя XP на сервере уже начислен. Спин второстепенен: его сбой
  // не имеет права отменять XP и осколки.
  it('сбой выдачи спина не уносит XP и осколки урока в retry', async () => {
    (grantLocalLessonCompletionSpin as jest.Mock)
      .mockRejectedValue(new Error('local_spin_state_corrupt'));

    const res = await grantLessonFirstCompleteBonus({ lessonId: 23, studyTarget: 'fr', lang: 'ru' });

    expect(res.status).toBe('granted');
    expect(addShards).toHaveBeenCalledWith('lesson_first', expect.any(Object));
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('успешная выдача ставит guard-ключ и не оставляет pending', async () => {
    const res = await grantLessonFirstCompleteBonus({ lessonId: 3, studyTarget: 'fr', lang: 'ru' });

    expect(res.status).toBe('granted');
    expect(registerXP).toHaveBeenCalledTimes(1);
    expect(addShards).toHaveBeenCalledWith('lesson_first', { suppressEarnEvent: true });
    expect(await AsyncStorage.getItem(lessonBonusGrantedKey(3, 'fr'))).toBe('1');
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('повторный вызов после выдачи не начисляет второй раз', async () => {
    await grantLessonFirstCompleteBonus({ lessonId: 3, studyTarget: 'fr', lang: 'ru' });
    (registerXP as jest.Mock).mockClear();

    const res = await grantLessonFirstCompleteBonus({ lessonId: 3, studyTarget: 'fr', lang: 'ru' });

    expect(res.status).toBe('already_granted');
    expect(registerXP).not.toHaveBeenCalled();
  });

  it('неподтверждённый XP (finalDelta=0) -> failed + pending, guard не ставится', async () => {
    (registerXP as jest.Mock).mockResolvedValue({ finalDelta: 0, multiplier: 1, isBonus: false });

    const res = await grantLessonFirstCompleteBonus({ lessonId: 5, studyTarget: 'fr', lang: 'ru' });

    expect(res.status).toBe('failed');
    expect(await AsyncStorage.getItem(lessonBonusGrantedKey(5, 'fr'))).toBeNull();
    const pending = JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) || '[]');
    expect(pending).toHaveLength(1);
    expect(pending[0].lessonId).toBe(5);
  });

  it('исключение registerXP -> failed + pending', async () => {
    (registerXP as jest.Mock).mockRejectedValue(new Error('network down'));

    const res = await grantLessonFirstCompleteBonus({ lessonId: 7, studyTarget: 'fr', lang: 'ru' });

    expect(res.status).toBe('failed');
    const pending = JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) || '[]');
    expect(pending.map((e: { lessonId: number }) => e.lessonId)).toEqual([7]);
  });

  it('параллельные вызовы одного урока выдают бонус ровно один раз', async () => {
    const [a, b] = await Promise.all([
      grantLessonFirstCompleteBonus({ lessonId: 9, studyTarget: 'fr', lang: 'ru' }),
      grantLessonFirstCompleteBonus({ lessonId: 9, studyTarget: 'fr', lang: 'ru' }),
    ]);

    expect(registerXP).toHaveBeenCalledTimes(1);
    expect([a.status, b.status]).toEqual(['granted', 'granted']);
  });
});

describe('retryPendingLessonBonusGrants', () => {
  it('доначисляет зависшую выдачу и чистит очередь', async () => {
    (registerXP as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await grantLessonFirstCompleteBonus({ lessonId: 11, studyTarget: 'fr', lang: 'ru' });
    expect(await AsyncStorage.getItem(lessonBonusGrantedKey(11, 'fr'))).toBeNull();

    const granted = await retryPendingLessonBonusGrants();

    expect(granted).toBe(1);
    expect(await AsyncStorage.getItem(lessonBonusGrantedKey(11, 'fr'))).toBe('1');
    expect(await AsyncStorage.getItem(PENDING_KEY)).toBeNull();
    // retry — silent: осколки идут со стандартным earn-событием (без suppress)
    expect(addShards).toHaveBeenLastCalledWith('lesson_first', undefined);
  });

  it('пустая очередь — ноль работы', async () => {
    expect(await retryPendingLessonBonusGrants()).toBe(0);
    expect(registerXP).not.toHaveBeenCalled();
  });
});
