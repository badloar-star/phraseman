// зачем (Ревизор P19 → координатор 15.10): в окнах Пика и «Идеальном уроке» слово после числа монет было зашито — «+21 монет», «22 монет»,
// en «1 coins». Теперь форма слова подбирается под число (constants/plural.ts). Сторож: 1/2/5/11/21/22/25 во всех 9 языках,
// винительный «на 1 монету» / pl «o 1 monetę», число с неразрывным пробелом тысяч («1 181» → «монета»).
import { momentText, momentCoinWord, MOMENT_STRING_KEYS } from '../components/spire/moments/moments_strings';
import { positionMomentText, POSITION_MOMENT_STRING_KEYS } from '../components/spire/moments/position_moment_strings';
import { perfectMomentText, PERFECT_MOMENT_STRING_KEYS } from '../components/lesson_moments/perfect_moment_strings';
import type { Lang } from '../constants/i18n';
import { glueNumbers } from '../components/moments/glue_numbers'; // зачем (18.10): тексты моментов склеивают число со словом неразрывным пробелом

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as Lang[];
const NUMS = [1, 2, 5, 11, 21, 22, 25] as const;

const EXPECTED_NOM: Readonly<Record<string, readonly string[]>> = {
  ru: ['монета', 'монеты', 'монет', 'монет', 'монета', 'монеты', 'монет'],
  uk: ['монета', 'монети', 'монет', 'монет', 'монета', 'монети', 'монет'],
  pl: ['moneta', 'monety', 'monet', 'monet', 'monet', 'monety', 'monet'],
  en: ['coin', 'coins', 'coins', 'coins', 'coins', 'coins', 'coins'],
  es: ['moneda', 'monedas', 'monedas', 'monedas', 'monedas', 'monedas', 'monedas'],
  'pt-BR': ['moeda', 'moedas', 'moedas', 'moedas', 'moedas', 'moedas', 'moedas'],
  vi: ['xu', 'xu', 'xu', 'xu', 'xu', 'xu', 'xu'],
  id: ['koin', 'koin', 'koin', 'koin', 'koin', 'koin', 'koin'],
  tr: ['jeton', 'jeton', 'jeton', 'jeton', 'jeton', 'jeton', 'jeton'],
};

describe('склонение «<число> монет» в окнах моментов', () => {
  it.each(LANGS)('%s: «+N <монета>» за повышение — форма под 1/2/5/11/21/22/25', (lang) => {
    NUMS.forEach((n, i) => {
      expect(momentText(lang, 'promoBonus', { n })).toContain(glueNumbers(`+${n} ${EXPECTED_NOM[lang]![i]}`));
      expect(momentCoinWord(lang, n)).toBe(EXPECTED_NOM[lang]![i]);
    });
  });

  it('ru/uk/pl: недельные монеты приходят строкой с пробелом тысяч — «1 181 монета», «1 180 монет»', () => {
    expect(momentText('ru', 'promoShortBody', { place: 3, coins: '1 181' })).toBe(glueNumbers('3 место · 1 181 монета за неделю'));
    expect(momentText('ru', 'stayBodyNoGap', { place: 7, coins: '1 180' })).toBe(glueNumbers('7 место · 1 180 монет за неделю.'));
    expect(momentText('uk', 'promoShortBody', { place: 3, coins: '22' })).toBe(glueNumbers('3 місце · 22 монети за тиждень'));
    expect(momentText('pl', 'promoShortBody', { place: 3, coins: '21' })).toBe(glueNumbers('3. miejsce · 21 monet w tygodniu'));
    expect(momentText('en', 'stayBodyNoGap', { place: 2, coins: '1' })).toBe(glueNumbers('Place 2 · 1 coin this week.'));
  });

  it('винительный после «на / o / by»: «на 1 монету», «на 21 монету», pl «o 1 monetę», «o 22 monety»', () => {
    expect(positionMomentText('ru', 'overtakeSub', { n: 1 })).toBe(glueNumbers('на 1 монету за неделю'));
    expect(positionMomentText('ru', 'overtakeSub', { n: 21 })).toBe(glueNumbers('на 21 монету за неделю'));
    expect(positionMomentText('ru', 'overtakeSub', { n: 5 })).toBe(glueNumbers('на 5 монет за неделю'));
    expect(positionMomentText('uk', 'overtakeSub', { n: 2 })).toBe(glueNumbers('на 2 монети за тиждень'));
    expect(positionMomentText('pl', 'overtakeSub', { n: 1 })).toBe(glueNumbers('o 1 monetę w tym tygodniu'));
    expect(positionMomentText('pl', 'overtakeSub', { n: 22 })).toBe(glueNumbers('o 22 monety w tym tygodniu'));
    expect(positionMomentText('en', 'overtakeSub', { n: 1 })).toBe(glueNumbers('by 1 coin this week'));
    expect(positionMomentText('ru', 'gapCoins', { n: 21 })).toBe(glueNumbers('21 монета'));
  });

  it('«Идеальный урок»: «+1 монета», «+22 монеты», «+25 монет»', () => {
    expect(perfectMomentText('ru', 'noMistakes', { n: 1 })).toBe(glueNumbers('Ни одной ошибки · +1 монета'));
    expect(perfectMomentText('ru', 'noMistakes', { n: 22 })).toBe(glueNumbers('Ни одной ошибки · +22 монеты'));
    expect(perfectMomentText('pl', 'noMistakes', { n: 21 })).toBe(glueNumbers('Bez błędów · +21 monet'));
  });

  it('ни в одном ключе трёх таблиц на 9 языках не остаётся нераскрытых {плейсхолдеров}', () => {
    const vars = { n: 21, coins: '1 180', place: 4, gap: 30, league: 'X', t: '1:00' };
    for (const lang of LANGS) {
      MOMENT_STRING_KEYS.forEach((k) => expect(momentText(lang, k, vars)).not.toMatch(/\{\w+\}/));
      POSITION_MOMENT_STRING_KEYS.forEach((k) => expect(positionMomentText(lang, k, { ...vars, name: 'A' })).not.toMatch(/\{\w+\}/));
      PERFECT_MOMENT_STRING_KEYS.forEach((k) => expect(perfectMomentText(lang, k, vars)).not.toMatch(/\{\w+\}/));
    }
  });
});
