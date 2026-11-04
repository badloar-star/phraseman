// зачем (ночной выпуск 05.11, «энергия от Пика»): каждое повышение даёт +1 к запасу энергии — об этом говорят существующие окна повышения (полное и короткое), без новых элементов.
// Сторож: строка есть на 9 языках с «+1», оба окна её показывают, остальные строки окон не тронуты.
import fs from 'node:fs';
import path from 'node:path';
import { momentText } from '../components/spire/moments/moments_strings';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«+1 к запасу энергии» в окнах повышения', () => {
  it('на 9 языках, с «+1» или «1 +»', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      const t = momentText(lang, 'promoEnergy');
      expect(t.length).toBeGreaterThan(5);
      expect(t).toMatch(/\+1/);
    }
    expect(momentText('ru', 'promoEnergy')).toBe('+1 к запасу энергии');
  });
  it('полное и короткое окна показывают строку', () => {
    expect(read('components/spire/moments/MomentPromotion.tsx')).toContain("momentText(lang, 'promoEnergy')");
    expect(read('components/spire/moments/MomentPromotionShort.tsx')).toContain("momentText(lang, 'promoEnergy')");
  });
  it('короткое окно: строка энергии — отдельной строкой под итогом, сам итог (promotionShortBody) не менялся', () => {
    const src = read('components/spire/moments/MomentPromotionShort.tsx');
    expect(src).toContain('{promotionShortBody(lang, myPlace, weekCoins, bonusCoins, weekSteps)}</Animated.Text>');
    expect(src).toContain('`${testID}-energy`');
  });
});
