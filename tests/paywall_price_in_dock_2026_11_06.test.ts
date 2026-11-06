// зачем (150, координатор 06.11, требование сторов: цена рядом с кнопкой): список теперь стоит на offset 0, плитки могут быть ниже края окна — поэтому над кнопкой в нижней панели
// всегда строка выбранного плана с ценой и периодом («Ultra · Год — €39,99 в год»), из того же источника, что плитки; при смене плитки строка меняется.
import { COPY, pick } from '../components/paywall/PaywallPlusCopy';
import { readSource } from './helpers/read_source';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('цена выбранного плана в нижней панели окна оплаты', () => {
  it('нижняя панель рисует строку плана над строкой автопродления', () => {
    const s = readSource('components/paywall/PaywallPlus.tsx');
    const line = s.indexOf('testID="paywall-plan-line"');
    const fine = s.indexOf('testID="paywall-fine"');
    expect(line).toBeGreaterThan(0);
    expect(fine).toBeGreaterThan(line);
    expect(s).toContain('planLine?: string;');
    expect(s).not.toMatch(/planLine:[^}]*adjustsFontSizeToFit/);
  });
  it('экран собирает строку: имя плана · период — цена период; цена из промо/магазина/справочной; журнал priceInDock', () => {
    const s = readSource('components/paywall/PaywallPlusScreen.tsx');
    expect(s).toContain('const planLine = labelReady && planPriceShown');
    expect(s).toContain('SUBSCRIPTION_TIER_NAME.ultra');
    expect(s).toContain('SUBSCRIPTION_TIER_NAME.plus');
    expect(s).toContain('priceInDock: planLine || null');
    expect(s).toContain('planLine={planLine}');
    expect(s).toContain("selectedPromo?.promoPriceString");
  });
  it('слова строки есть на всех 9 языках (год/месяц/в год/в месяц)', () => {
    for (const lang of LANGS) {
      for (const key of ['year', 'month', 'perYear', 'perMonth'] as const) {
        expect(pick(lang, COPY[key]).length).toBeGreaterThan(1);
      }
    }
  });
});
