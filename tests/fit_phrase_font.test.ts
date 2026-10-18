import fs from 'node:fs';
import path from 'node:path';

import { estimateWrappedLines, fitPhraseFontSize } from '../app/flashcards/fit_phrase_font';

// зачем (владелец 18.10, координатор 10:10): на карточках из видео длинная фраза должна ПОМЕЩАТЬСЯ — размер уменьшается по длине (до 14), перенос по словам, без обрезки «…»; без adjustsFontSizeToFit (на iOS класс бага).
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const BOX = { widthPx: 290, maxHeightPx: 120 };

describe('fitPhraseFontSize', () => {
  it('короткая фраза получает базовый размер без изменений (обычные карточки не меняются)', () => {
    expect(fitPhraseFontSize({ text: 'Nice to meet you', baseSize: 20, ...BOX })).toBe(20);
  });

  it('длинная фраза уменьшается, но не ниже 14', () => {
    const long = 'I have been thinking about what you said yesterday and I honestly believe that we should try again tomorrow morning';
    const size = fitPhraseFontSize({ text: long, baseSize: 20, ...BOX });
    expect(size).toBeLessThan(20);
    expect(size).toBeGreaterThanOrEqual(14);
    const huge = long.repeat(6);
    expect(fitPhraseFontSize({ text: huge, baseSize: 20, ...BOX })).toBe(14);
  });

  it('чем длиннее текст, тем размер не больше (монотонность)', () => {
    let previous = 99;
    for (const words of [4, 10, 16, 22, 30, 44]) {
      const text = Array.from({ length: words }, (_, i) => `word${i}`).join(' ');
      const size = fitPhraseFontSize({ text, baseSize: 22, ...BOX });
      expect(size).toBeLessThanOrEqual(previous);
      previous = size;
    }
  });

  it('текст с подобранным размером реально помещается по расчёту строк', () => {
    const text = 'Could you please tell me where the nearest pharmacy is because I need to buy something for a headache';
    const size = fitPhraseFontSize({ text, baseSize: 22, ...BOX });
    if (size > 14) expect(estimateWrappedLines(text, size, BOX.widthPx) * size * 1.3).toBeLessThanOrEqual(BOX.maxHeightPx);
  });

  it('перенос по словам: слово длиннее строки делится, пустой текст — одна строка', () => {
    expect(estimateWrappedLines('', 16, 200)).toBe(1);
    expect(estimateWrappedLines('supercalifragilisticexpialidocious-and-more-and-more', 16, 100)).toBeGreaterThan(1);
  });

  it('карточка использует расчёт (а не adjustsFontSizeToFit) для лицевой и обратной стороны', () => {
    const item = read('app/flashcards/FlashcardListItem.tsx');
    expect(item).toContain('fitPhraseFontSize({ text: item.en');
    expect(item).toContain('fitPhraseFontSize({ text: tr');
    expect(item).toContain('fontSize: frontPhraseSize,');
    expect(item).toContain('fontSize: backPhraseSize');
    expect(item).not.toContain('adjustsFontSizeToFit');
  });
});
