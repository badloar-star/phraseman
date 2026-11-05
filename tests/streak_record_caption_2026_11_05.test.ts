// Раунд 2, Статистика п.1: «до рекорда N дней» / в день побития — «Рекорд!».
import fs from 'node:fs';
import path from 'node:path';
import { streakRecordCaption } from '../app/streak_record_caption';

describe('подпись рекорда серии', () => {
  it('рекорд побит или равен — «Рекорд!»', () => {
    expect(streakRecordCaption('ru', 12, 12)).toBe('Рекорд!');
    expect(streakRecordCaption('ru', 13, 12)).toBe('Рекорд!');
  });
  it('до рекорда — число и верное склонение', () => {
    expect(streakRecordCaption('ru', 9, 10)).toBe('до рекорда 1 день');
    expect(streakRecordCaption('ru', 8, 10)).toBe('до рекорда 2 дня');
    expect(streakRecordCaption('ru', 1, 10)).toBe('до рекорда 9 дней');
    expect(streakRecordCaption('ru', 1, 12)).toBe('до рекорда 11 дней');
    expect(streakRecordCaption('en', 9, 10)).toBe('1 day to the record');
  });
  it('нет серии или рекорда — подписи нет (остаётся прежний текст)', () => {
    expect(streakRecordCaption('ru', 0, 5)).toBeNull();
    expect(streakRecordCaption('ru', 3, 0)).toBeNull();
    expect(streakRecordCaption('ru', Number.NaN, 3)).toBeNull();
  });
  it('карточка серии использует подпись и в озвучке', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/streak_stats.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(src).toContain('streakRecordCaption(lang, totalStreak, bestStreak)');
  });
});
