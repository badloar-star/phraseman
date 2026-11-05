// зачем (№74 мастер-плана: «Пик: топ-5 по монетам переходят в лигу, +1000 монет, сообщать в местах о переходе»; 04.11/05.11): сторож окна повышения лиги — название лиги и «+1000 монет» на 9 языках,
// сумма берётся из ответа сервера (promotionCoins), а не зашита в клиент (боевой promotionBonus=1000 приходит от сервера), показывается в окне и в карточке итога недели Пика.
import { momentText } from '../components/spire/moments/moments_strings';
import { SPIRE_TIER_COUNT, spireTierName } from '../modules/spire/tier_names';
import type { Lang } from '../constants/i18n';
import { readSource } from './helpers/read_source';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('окно повышения лиги: «+1000 монет» и название лиги на 9 языках', () => {
  it('строка бонуса на каждом языке содержит число 1000 (в виде «1 000»/«1000»/«1.000») и слово «монета» своей формы', () => {
    for (const lang of LANGS) {
      const text = momentText(lang, 'promoBonus', { n: 1000 });
      expect(`${lang}: ${/1[\s .,]?000/.test(text)}`).toBe(`${lang}: true`);
      expect(`${lang}: ${/\{n\}|\{nw\}/.test(text)}`).toBe(`${lang}: false`); // подстановки выполнены
      expect(text.replace(/[+\d\s .,]/g, '').length).toBeGreaterThan(3); // есть слова, а не только число
    }
  });

  it('название лиги: 12 имён на каждом из 9 языков, ни одного пустого', () => {
    expect(SPIRE_TIER_COUNT).toBe(12);
    for (const lang of LANGS) {
      for (let tier = 0; tier < SPIRE_TIER_COUNT; tier += 1) expect(`${lang}.${tier}: ${spireTierName(tier, lang).trim().length > 0}`).toBe(`${lang}.${tier}: true`);
    }
  });

  it('сумма бонуса — из ответа сервера: окно получает result.promotionCoins, карточка итога недели показывает promotionCoins; в клиенте нет зашитых 1000', () => {
    const host = readSource('components/spire/moments/SpireWeekMomentHost.tsx');
    expect(host).toContain('bonusCoins={result.promotionCoins}');
    const promo = readSource('components/spire/moments/MomentPromotion.tsx');
    expect(promo).toContain("momentText(lang, 'promoBonus', { n: bonusCoins })");
    expect(promo).not.toMatch(/\b1000\b|1_000/);
    expect(readSource('components/spire/SpireWeekResultCard.tsx')).toContain('r.promotionCoins');
  });
});
