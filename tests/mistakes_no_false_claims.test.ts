import fs from 'node:fs';
import path from 'node:path';
import { pluralFormFor, pluralWord } from '../constants/plural';
import { mistakesLockedCopy } from '../app/mistakes_locked_copy';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

/**
 * зачем (владелец 2026-09-15): экраны раздела врали на малых числах —
 * «Чаще всего промахи в „Порядок слов“: 100%» при ОДНОЙ ошибке, «1 ошибок»,
 * «×1 промахов», «ещё один день» вместо двух. Этот сторож держит класс.
 */
describe('mistakes section never claims more than the data says', () => {
  test('slavic plurals agree with the number', () => {
    const mistakes = { one: 'ошибка', few: 'ошибки', many: 'ошибок' };
    expect(pluralWord('ru', 1, mistakes)).toBe('ошибка');
    expect(pluralWord('ru', 2, mistakes)).toBe('ошибки');
    expect(pluralWord('ru', 5, mistakes)).toBe('ошибок');
    expect(pluralWord('ru', 11, mistakes)).toBe('ошибок');
    expect(pluralWord('ru', 21, mistakes)).toBe('ошибка');
    // 112 оканчивается на «двенадцать» — исключение из правила 2..4.
    expect(pluralWord('ru', 112, mistakes)).toBe('ошибок');
    expect(pluralWord('ru', 122, mistakes)).toBe('ошибки');
    // Неславянские — две формы, единственное только при 1.
    expect(pluralFormFor('en', 1)).toBe('one');
    expect(pluralFormFor('en', 2)).toBe('many');
    expect(pluralFormFor('tr', 1)).toBe('one');
  });

  test('the hub counts mistakes with an agreeing word', () => {
    const hub = read('app/mistakes_hub.tsx');
    expect(hub).toContain('pluralWord(lang, facetTotal, copy.mistakes)');
    expect(hub).not.toMatch(/\$\{facetTotal\} \$\{copy\.mistakes\}/);
  });

  test('the streak and the title gap carry agreeing words too', () => {
    const shelf = read('components/mistake-practice/MistakeTitleShelf.tsx');
    expect(shelf).toContain('pluralWord(lang, rewards.streakDays, copy.days)');
    expect(shelf).toContain('pluralWord(lang, rewards.nextTitle.remaining, copy.fixes)');
    // Пустая полка не рисует крупный ноль и лестницу замков.
    expect(shelf).toContain('rewards.corrected < 1) return null;');
    const finale = read('components/mistake-practice/MistakeSessionFinale.tsx');
    expect(finale).toContain('pluralWord(lang, rewards.streakDays, copy.days)');
  });

  test('the detail card drops the plural-less noun and shows the rule only as three bars', () => {
    const detail = read('app/mistake_detail.tsx');
    expect(detail).not.toContain('{copy.misses}');
    // зачем (координатор 04.10, §126/§130): прогресс — три деления без пояснений «верно в 3 разных дня».
    expect(detail).not.toContain('ruleCopyFor');
    expect(detail).not.toContain('3 разных дня');
    expect(detail).toContain('[0, 1, 2].map((index) => (');
  });

  test('the verdict shows bars and the fixed fact, without day-count promises', () => {
    const panel = read('components/mistake-practice/MistakeVerdictPanel.tsx');
    expect(panel).not.toMatch(/oneMoreTwoDays|oneMoreOtherMode|oneMoreAnyMode/);
    expect(panel).toContain('{chain.corrected ? (');
    // Логику не трогали: панель по-прежнему получает число режимов и требуемый минимум.
    expect(panel).toContain('requiredModes: 1 | 2;');
    expect(panel).toContain('modes: number;');
    const screen = read('app/mistake_practice_session.tsx');
    expect(screen).toContain('modes: new Set(afterItem.qualifyingModes).size');
    expect(screen).toContain('requiredModes: requiredModesForMistake(afterItem)');
    // И не делит на ноль в шапке прогресса.
    expect(screen).toContain('session.initialCount > 0 ? Math.min(100');
  });

  test('the locked sheet jokes without telling anyone to fail on purpose', () => {
    const many = mistakesLockedCopy('ru', 3);
    expect(many.body).toContain('7');
    // Шутка помечена как шутка: «но мы такого не советуем».
    expect(many.body).toMatch(/не советуем/);
    const none = mistakesLockedCopy('ru', 0);
    expect(none.body).not.toMatch(/ошибаться/);
    expect(mistakesLockedCopy('en', 3).body).toMatch(/would rather you did not/);
  });
});
