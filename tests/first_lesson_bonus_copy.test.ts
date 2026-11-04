// Подтверждение бонуса: 9 языков, подстановка {coins}, без хвостовой точки (Переводчик, владелец 30.10).
import { firstLessonBonusText } from '../app/first_lesson_bonus_copy';
import { peekFirstLessonBonusRecentCoins } from '../app/first_lesson_bonus';

describe('firstLessonBonusText', () => {
  it.each(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const)('%s: число подставлено, плейсхолдера нет, без точки в конце', (lang) => {
    const text = firstLessonBonusText(lang, 500);
    expect(text).toContain('500');
    expect(text).not.toContain('{coins}');
    expect(text.endsWith('.')).toBe(false);
  });
  it('ru точный текст', () => expect(firstLessonBonusText('ru', 500)).toBe('+500 монет за первое занятие'));
});

describe('peekFirstLessonBonusRecentCoins', () => {
  it('до выдачи — null', () => expect(peekFirstLessonBonusRecentCoins()).toBeNull());
});
