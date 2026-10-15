// зачем (координатор 15.10, m04 A «Итог недели» по эталону v3 за moments_v3): башня «выпрыгивает» на 0,2 с (emPop 600 мс, .55 → 1,12 → 1), хаптик успеха и звук new_week;
// флаг выключен — прежняя пружина Animated без звука (ни пикселя разницы).
import fs from 'node:fs';
import path from 'node:path';

const card = fs.readFileSync(path.join(__dirname, '..', 'components', 'spire', 'SpireWeekResultCard.tsx'), 'utf8');

describe('m04 · карточка «Итог недели»', () => {
  it('тайминги эталона: задержка 200, emPop 600, scale .55 → 1,12 → 1, кривая (.3, 1.6, .5, 1)', () => {
    expect(card).toContain('export const WEEK_CARD_POP = { delay: 200, duration: 600, from: 0.55, peak: 1.12 } as const;');
    expect(card).toContain('Easing.bezier(0.3, 1.6, 0.5, 1)');
  });
  it('флаг включён — WeekPopV3: хаптик успеха и new_week ровно на удар, журнал [MOMENT-m04]', () => {
    expect(card).toContain('{momentsV3 ? (');
    expect(card).toContain('<WeekPopV3 reduceMotion={reduceMotion}');
    expect(card).toContain("playEvent('new_week')");
    expect(card).toContain('hapticSuccess()');
    expect(card).toContain("const LOG = '[MOMENT-m04]';");
  });
  it('флаг выключен — прежняя пружина (stiffness 240, damping 14) и тот же testID', () => {
    expect(card).toContain('if (momentsV3) return; // зачем (m04 v3): анимацию ведёт WeekPopV3');
    expect(card).toContain('Animated.spring(pop, { toValue: 1, stiffness: 240, damping: 14, mass: 0.9, useNativeDriver: true }).start();');
    expect(card.match(/testID="spire-week-result-pop"/g)?.length).toBe(2);
  });
});
