// Бонус +500 подключён к ОСНОВНОМУ пути новичка — классическому экрану завершения урока (координатор 30.10: V2 заморожен), и к V2 тоже.
import fs from 'node:fs';
import path from 'node:path';
import { maybeGrantFirstLessonBonus, type FirstLessonBonusDeps } from '../app/first_lesson_bonus';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('подключение бонуса', () => {
  it('классический lesson_complete зовёт бонус рядом с зачётом монет, за флагом', () => {
    const src = read('app/lesson_complete.tsx');
    // зачем (координатор 05.11): в первой версии ранговые гейты ВЫКЛ по умолчанию, а бонус от них НЕ зависит — флаг гейтов бонус не выключает
    expect(src).toContain('maybeGrantFirstLessonBonus(defaultFirstLessonBonusDeps(() => true');
    expect(src).not.toContain('defaultFirstLessonBonusDeps(() => getRemoteBool');
    expect(src.indexOf('practiceRunesSettleOnceRef.current = true;')).toBeLessThan(src.indexOf('maybeGrantFirstLessonBonus('));
  });
  it('сценарий: новичок завершил классический урок 1 дважды (повторный заход) — +500 ровно один раз', async () => {
    const grants: string[] = []; let flag = false;
    const deps: FirstLessonBonusDeps = {
      gatesEnabled: () => true, verdict: async () => ({ isNew: true, reason: 'sticky_new' }), ownerStableId: async () => 'u1',
      sha256Hex: async () => 'a'.repeat(64), grant: async ({ requestId, giftId }) => { grants.push(`${requestId}|${giftId}`); },
      readFlag: async () => flag, writeFlag: async () => { flag = true; },
    };
    expect(await maybeGrantFirstLessonBonus(deps)).toBe(true);
    expect(await maybeGrantFirstLessonBonus(deps)).toBe(false);
    expect(grants).toEqual([`dailyjourney_${'a'.repeat(32)}_1|stars_500`]);
  });
  it('монеты ранга и бонус — один кошелёк: апгрейд ранга тратит через prepareRuneSpend из level_spin_star_grants, бонус зачисляется туда же', () => {
    expect(read('app/coin_rank_upgrade_v1.ts')).toContain("from './level_spin_star_grants'");
    expect(read('app/first_lesson_bonus.ts')).toContain("import('./level_spin_star_grants')");
  });
});
