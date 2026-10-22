// зачем (Ядро 22.10): экзамен главы сервер принимает ровно 20 на часть; множитель «Супер-воскресенья» его не трогает,
// даже если удвоение вернут, — иначе сервер отклонил бы операцию и монеты вечно висели бы в очереди.
jest.mock('../modules/economy/super_sunday_runes', () => ({
  ...jest.requireActual('../modules/economy/super_sunday_runes'),
  // Супер-воскресенье «включено»: любая игровая сумма удваивается
  applySuperSundayRuneMultiplier: (base: number) => base * 2,
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { levelSpinStarOperationAmountV1 } from '../app/level_spin_star_grants';
import { chapterExamRewardRequestIdsV1 } from '../app/learning_v2_chapter_exam_reward_v1';

const SUNDAY = Date.parse('2026-10-25T12:00:00.000Z');

describe('chapter exam coins and the Super Sunday multiplier', () => {
  it('on Super Sunday the exam still sends 20 + 20', () => {
    const [one, two] = chapterExamRewardRequestIdsV1(1, 2);
    expect(one).toBe('chapterexam_l01_c2_1');
    expect(two).toBe('chapterexam_l01_c2_2');
    for (const requestId of [one, two]) {
      expect(levelSpinStarOperationAmountV1({ requestId, giftId: 'stars_20', promotionEligibility: 'gameplay', createdAtMs: SUNDAY })).toBe(20);
    }
  });

  it('other gameplay sources keep the multiplier (behaviour unchanged)', () => {
    expect(levelSpinStarOperationAmountV1({ requestId: `dailyjourney_${'a'.repeat(32)}_1`, giftId: 'stars_50', promotionEligibility: 'gameplay', createdAtMs: SUNDAY })).toBe(100);
    expect(levelSpinStarOperationAmountV1({ requestId: 'report_reward_msg0000000001', giftId: 'stars_500', promotionEligibility: 'excluded_compensation', createdAtMs: SUNDAY })).toBe(500);
  });
});
