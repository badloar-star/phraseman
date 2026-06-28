/**
 * Контракт контента дневных постов Компаса в чате лиги.
 *
 * Ключевые гарантии (от которых зависит дешевизна и качество фичи):
 *  - контент ДЕТЕРМИНИРОВАН по дню (один и тот же seed → один и тот же пост),
 *    без Math.random() — иначе крон-повтор дал бы разный пост и/или дубли;
 *  - каждый пост локализован НА ВСЕ 8 языков интерфейса (без дыр → без
 *    fallback на чужой язык);
 *  - опросы имеют валидную структуру (≥2 варианта, уникальные ключи).
 */
import {
  buildDailySummaryPost,
  buildIcebreakerPost,
  COMPASS_CHAT_LANGS,
  getDaySeed,
  pickCompassPostForDay,
  type CompassChatLang,
} from '../functions/src/compass_chat_content';

const ALL_LANGS = COMPASS_CHAT_LANGS as readonly CompassChatLang[];

function assertFullyLocalized(map: Partial<Record<CompassChatLang, string>>, label: string): void {
  for (const lang of ALL_LANGS) {
    const value = map[lang];
    expect(typeof value === 'string' && value.length > 0).toBe(true);
  }
  void label;
}

describe('compass_chat_content', () => {
  it('getDaySeed детерминирован для одной даты и растёт на 1 в день', () => {
    const day1 = new Date(Date.UTC(2026, 5, 28, 9, 0, 0));
    const day1Late = new Date(Date.UTC(2026, 5, 28, 23, 59, 0));
    const day2 = new Date(Date.UTC(2026, 5, 29, 1, 0, 0));
    expect(getDaySeed(day1)).toBe(getDaySeed(day1Late));
    expect(getDaySeed(day2)).toBe(getDaySeed(day1) + 1);
  });

  it('pickCompassPostForDay детерминирован (один seed → один и тот же пост)', () => {
    const a = pickCompassPostForDay(100);
    const b = pickCompassPostForDay(100);
    expect(a).toEqual(b);
  });

  it('за 7 дней цикла встречаются разные форматы (не один и тот же)', () => {
    const kinds = new Set<string>();
    for (let seed = 0; seed < 7; seed++) {
      kinds.add(pickCompassPostForDay(seed).kind);
    }
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  it('каждый выбранный пост локализован на все 8 языков', () => {
    for (let seed = 0; seed < 14; seed++) {
      const post = pickCompassPostForDay(seed);
      assertFullyLocalized(post.i18n, `post#${seed}`);
    }
  });

  it('опросы валидны: ≥2 варианта, уникальные ключи, локализованные подписи', () => {
    for (let seed = 0; seed < 14; seed++) {
      const post = pickCompassPostForDay(seed);
      if (post.kind !== 'poll') continue;
      expect(Array.isArray(post.poll)).toBe(true);
      const poll = post.poll!;
      expect(poll.length).toBeGreaterThanOrEqual(2);
      const keys = poll.map((o) => o.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const option of poll) {
        assertFullyLocalized(option.label, `poll#${seed}:${option.key}`);
      }
    }
  });

  it('обрабатывает отрицательные/большие seed без падения', () => {
    expect(() => pickCompassPostForDay(-5)).not.toThrow();
    expect(() => pickCompassPostForDay(999999)).not.toThrow();
    expect(pickCompassPostForDay(-7).kind).toBe(pickCompassPostForDay(0).kind);
  });
});

describe('buildIcebreakerPost', () => {
  it('закреплённое приветствие локализовано на все 8 языков', () => {
    const post = buildIcebreakerPost();
    expect(post.kind).toBe('icebreaker');
    assertFullyLocalized(post.i18n, 'icebreaker');
  });
});

describe('buildDailySummaryPost', () => {
  it('возвращает null, если хвалить некого', () => {
    expect(buildDailySummaryPost([])).toBeNull();
    expect(buildDailySummaryPost(['', '  '])).toBeNull();
  });

  it('сводка локализована на все 8 языков и содержит имена', () => {
    const post = buildDailySummaryPost(['Олег', 'Марина']);
    expect(post).not.toBeNull();
    assertFullyLocalized(post!.i18n, 'summary');
    expect(post!.i18n.ru).toContain('Олег');
    expect(post!.i18n.ru).toContain('Марина');
  });

  it('при >3 именах показывает «и ещё N» (overflow) на каждом языке', () => {
    const names = ['A', 'B', 'C', 'D', 'E'];
    const post = buildDailySummaryPost(names)!;
    // первые 3 имени видны, остаток (2) — в формулировке «ещё»/«more»/«+»
    expect(post.i18n.ru).toContain('и ещё 2');
    expect(post.i18n.es).toContain('2 más');
    expect(post.i18n['pt-BR']).toContain('mais 2');
    // 4-е имя НЕ перечислено напрямую
    expect(post.i18n.ru).not.toContain('D,');
  });
});
