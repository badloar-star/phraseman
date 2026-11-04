// зачем (удобство №8, владелец 04.11): подсказка «Повторить N слов · M мин» — порог 5, минуты вверх, 9 языков, без Firebase и без обводок.
import fs from 'node:fs';
import path from 'node:path';

import { HOME_REVIEW_MAX_SESSION, HOME_REVIEW_MIN_WORDS, buildHomeReviewHint, countDueWords } from '../app/home_review_hint';
import { HOME_REVIEW_HINT_STRINGS, homeReviewFormIndex, homeReviewHintText } from '../app/home_review_hint_copy';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('подсказка «Повторить слова» на Главной', () => {
  it('считает только карточки со статусом review', () => {
    expect(countDueWords({ a: 'review', b: 'weak', c: 'new', d: 'review', e: 'mastered', f: 'learning' })).toBe(2);
    expect(countDueWords({})).toBe(0);
  });

  it('меньше 5 слов — подсказки нет; от 5 — есть', () => {
    expect(HOME_REVIEW_MIN_WORDS).toBe(5);
    expect(buildHomeReviewHint(4)).toBeNull();
    expect(buildHomeReviewHint(Number.NaN)).toBeNull();
    expect(buildHomeReviewHint(5)).toEqual({ words: 5, minutes: 1, sessionSize: 5 });
  });

  it('минуты округляются вверх, мини-тренировка не длиннее потолка', () => {
    expect(buildHomeReviewHint(12)).toEqual({ words: 12, minutes: 2, sessionSize: 12 });
    const big = buildHomeReviewHint(80);
    expect(big?.words).toBe(80);
    expect(big?.sessionSize).toBe(HOME_REVIEW_MAX_SESSION);
    expect(big?.minutes).toBe(2);
  });

  it('текст на 9 языках с подстановкой числа слов и минут', () => {
    expect(HOME_REVIEW_HINT_STRINGS).toHaveLength(9);
    for (const v of HOME_REVIEW_HINT_STRINGS) {
      expect(v).toContain('{n}');
      expect(v).toContain('{min}');
    }
    expect(homeReviewHintText('ru', 12, 2)).toBe('Повторить 12 слов · 2 минуты');
    expect(homeReviewHintText('en', 7, 1)).toBe('Review 7 words · 1 min');
  });

  it('хук читает только локальную память и не трогает Firebase; компонент без обводок и мелкого текста', () => {
    const hook = read('hooks/use_home_review_hint.ts');
    expect(hook).toContain('loadFlashcardStatuses');
    expect(hook).not.toMatch(/firebase|firestore/i);
    const view = read('components/home/HomeReviewHint.tsx');
    expect(view).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit/);
    for (const m of view.matchAll(/fontSize:\s*(\d+)/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(15);
  });

  it('Главная показывает подсказку сразу под карточкой «Сегодня»', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain("import HomeReviewHint from '../../components/home/HomeReviewHint'");
    expect(home).toContain('<HomeReviewHint lang={lang} active={homeRuntimeActive} />');
  });

  it('тап ведёт в тренировку только из просроченных слов (параметр due=1 понимает экран карточек)', () => {
    expect(read('components/home/HomeReviewHint.tsx')).toContain("due: '1'");
    const swipe = read('app/flashcards_swipe.tsx');
    expect(swipe).toContain("routeParamString(params.due).trim() === '1'");
    expect(swipe).toContain('sorted.filter((card) => isDueMemory(card.memory ?? defaultMemory(), now))');
    expect(swipe).toContain('dueOnly.length > 0 ? dueOnly : sorted');
  });

  it('слова и минуты склоняются по числу (ru/uk/pl — три формы; en/es/pt-BR — две)', () => {
    expect(homeReviewHintText('ru', 21, 2)).toBe('Повторить 21 слово · 2 минуты');
    expect(homeReviewHintText('ru', 5, 1)).toBe('Повторить 5 слов · 1 минуту');
    expect(homeReviewHintText('ru', 11, 3)).toBe('Повторить 11 слов · 3 минуты');
    expect(homeReviewHintText('ru', 22, 5)).toBe('Повторить 22 слова · 5 минут');
    expect(homeReviewHintText('uk', 7, 1)).toBe('Повторити 7 слів · 1 хвилину');
    expect(homeReviewHintText('pl', 22, 2)).toBe('Powtórz 22 słowa · 2 minuty');
    expect(homeReviewHintText('pl', 21, 1)).toBe('Powtórz 21 słów · 1 minutę');
    expect(homeReviewHintText('es', 1, 1)).toBe('Repasar 1 palabra · 1 min');
    expect(homeReviewHintText('pt-BR', 6, 1)).toBe('Revisar 6 palavras · 1 min');
    expect(homeReviewHintText('vi', 8, 1)).toBe('Ôn 8 từ · 1 phút');
    expect(homeReviewFormIndex('ru', 112)).toBe(2);
  });
});
