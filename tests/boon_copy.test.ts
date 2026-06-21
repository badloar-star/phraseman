// Weekly Boons — локализованные тексты бонусов.
import { getBoonCopy } from '../app/boons/boon_copy';
import { ALL_BOON_IDS } from '../app/boons/boon_types';

describe('getBoonCopy', () => {
  it('у каждого бонуса есть emoji, заголовок и описание (ru)', () => {
    for (const id of ALL_BOON_IDS) {
      const c = getBoonCopy(id, 'ru');
      expect(c.emoji.length).toBeGreaterThan(0);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.subtitle.length).toBeGreaterThan(0);
    }
  });

  it('переключает язык (ru ≠ uk для заголовка)', () => {
    const ru = getBoonCopy('double_xp', 'ru');
    const uk = getBoonCopy('double_xp', 'uk');
    expect(ru.title).not.toBe(uk.title);
  });

  it('неизвестный язык падает на ru (fallback не undefined)', () => {
    // @ts-expect-error — проверяем устойчивость к неподдержанному коду языка
    const c = getBoonCopy('streak_saver', 'zz');
    expect(typeof c.title).toBe('string');
    expect(c.title.length).toBeGreaterThan(0);
  });
});
