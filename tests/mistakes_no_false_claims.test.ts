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
    expect(hub).toContain('pluralWord(lang, sheetReady, copy.mistakes)');
    expect(hub).not.toMatch(/\$\{sheetReady\} \$\{copy\.mistakes\}/);
  });

  test('the detail card drops the plural-less noun and shows the rule only as three bars', () => {
    const detail = read('app/mistake_detail.tsx');
    expect(detail).not.toContain('{copy.misses}');
    // зачем (координатор 04.10, §126/§130): прогресс — три деления без пояснений «верно в 3 разных дня».
    expect(detail).not.toContain('ruleCopyFor');
    expect(detail).not.toContain('3 разных дня');
    expect(detail).toMatch(/\[0, 1, 2\]\.map\(\(index\) =>/);
  });

  test('the verdict shows bars and the fixed fact, without day-count promises', () => {
    // 04.10 (макет «Панель»): вердикт рисует «стакан» экрана (StepDots + факт исправления), старой панели нет.
    const screen = read('app/mistake_practice_session.tsx');
    expect(screen).not.toMatch(/oneMoreTwoDays|oneMoreOtherMode|oneMoreAnyMode/);
    expect(screen).toContain('feedback.chain.corrected ? 3 : feedback.chain.days');
    expect(screen).toContain('modes: new Set(afterItem.qualifyingModes).size');
    expect(screen).toContain('requiredModes: requiredModesForMistake(afterItem)');
    // Счётчик шапки «n / total» — просто числа сессии, делить не на что.
    // зачем (05.10, п.70): шапка — пройденные вопросы сессии (mistakePracticeAnsweredProgress), тоже просто числа.
    expect(screen).toContain('`${answeredProgress.answered} / ${answeredProgress.total}`');
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
