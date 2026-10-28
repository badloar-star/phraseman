// Владелец 28.10 (кнопки через координатора, жалоба №8, вариант А): «Проверить уровень» в курсе видна, пока тест на аккаунте не
// использован, сколько бы занятий ни было пройдено; дальше урока 10 — не показывать; замок «1 раз на аккаунт» остаётся.
import { learningV2PlacementEntryV1 } from '../app/learning_v2_placement_entry_v1';

beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

describe('вход в тест уровня «Проверить уровень»', () => {
  it('не использован — виден и новичку, и тому, кто уже проходит урок 3', () => {
    expect(learningV2PlacementEntryV1({ used: false, currentLessonOrdinal: null, where: 't' })).toEqual({ show: true, reason: 'shown' });
    expect(learningV2PlacementEntryV1({ used: false, currentLessonOrdinal: 3, where: 't' })).toEqual({ show: true, reason: 'shown' });
    expect(learningV2PlacementEntryV1({ used: false, currentLessonOrdinal: 9, where: 't' })).toEqual({ show: true, reason: 'shown' });
  });

  it('замок «1 раз на аккаунт»: использован — не виден; флаг ещё не прочитан — не виден', () => {
    expect(learningV2PlacementEntryV1({ used: true, currentLessonOrdinal: 1, where: 't' })).toEqual({ show: false, reason: 'used' });
    expect(learningV2PlacementEntryV1({ used: null, currentLessonOrdinal: 1, where: 't' })).toEqual({ show: false, reason: 'used_unknown' });
  });

  it('с урока 10 — не виден: тест не поднимет старт выше урока 10', () => {
    expect(learningV2PlacementEntryV1({ used: false, currentLessonOrdinal: 10, where: 't' })).toEqual({ show: false, reason: 'beyond_cap' });
    expect(learningV2PlacementEntryV1({ used: false, currentLessonOrdinal: 17, where: 't' })).toEqual({ show: false, reason: 'beyond_cap' });
  });

  it('лог [PLACEMENT-ENTRY] называет причину', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    learningV2PlacementEntryV1({ used: false, currentLessonOrdinal: 12, where: 'season_cover' });
    expect(log.mock.calls.some((c) => c[0] === '[PLACEMENT-ENTRY]' && String(c[1]).includes('"reason":"beyond_cap"') && String(c[1]).includes('"where":"season_cover"'))).toBe(true);
  });
});

describe('тексты входа и плашки (Переводчик 28.10)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const copy = require('../app/learning_v2_placement_entry_copy') as typeof import('../app/learning_v2_placement_entry_copy');
  const langs = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

  it('9 языков, кнопка короткая, номер подставляется', () => {
    for (const lang of langs) {
      const label = copy.placementCheckLevelLabel(lang);
      expect(label.length).toBeGreaterThan(0);
      expect(label.length).toBeLessThanOrEqual(20);
      expect(copy.placementOpensAfterText(lang, 'lesson', 4)).toContain('4');
      expect(copy.placementOpensAfterText(lang, 'session', 7)).toContain('7');
      expect(copy.placementOpensAfterText(lang, 'session', 7)).not.toContain('{n}');
    }
    expect(copy.placementCheckLevelLabel('ru')).toBe('Проверить уровень');
    expect(copy.placementOpensAfterText('ru', 'lesson', 4)).toBe('Откроется после урока 4');
    expect(copy.placementOpensAfterText('ru', 'session', 7)).toBe('Откроется после занятия 7');
  });
});
