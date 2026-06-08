import {
  computeSavingsPct,
  computePerDayString,
  parsePriceNumeric,
} from '../app/paywall_pricing';

describe('paywall_pricing — parsePriceNumeric', () => {
  it('парсит простые форматы', () => {
    expect(parsePriceNumeric('$4.99')).toBeCloseTo(4.99);
    expect(parsePriceNumeric('₽299')).toBeCloseTo(299);
    expect(parsePriceNumeric('€9,99')).toBeCloseTo(9.99);
  });
  it('парсит тысячный разделитель', () => {
    expect(parsePriceNumeric('Rp 79.000')).toBeCloseTo(79000);
  });
  it('возвращает null для мусора', () => {
    expect(parsePriceNumeric('')).toBeNull();
    expect(parsePriceNumeric('Загружаем…')).toBeNull();
  });
});

describe('paywall_pricing — computeSavingsPct', () => {
  it('считает из pricePerMonth когда оба есть', () => {
    // year ~ 3.33/mo, month 4.99 → ~33%
    expect(computeSavingsPct({ yearlyPerMonth: 3.33, monthlyPerMonth: 4.99 })).toBe(33);
  });

  it('fallback: считает из строк year vs month*12', () => {
    // year 39.99, month 4.99 → month*12=59.88 → ~33%
    const pct = computeSavingsPct({ yearlyPriceStr: '$39.99', monthlyPriceStr: '$4.99' });
    expect(pct).toBe(33);
  });

  it('предпочитает pricePerMonth строковому fallback', () => {
    const pct = computeSavingsPct({
      yearlyPerMonth: 2,
      monthlyPerMonth: 4,
      yearlyPriceStr: '$100',
      monthlyPriceStr: '$5',
    });
    expect(pct).toBe(50); // из perMonth, не из строк
  });

  it('возвращает null если данных нет', () => {
    expect(computeSavingsPct({})).toBeNull();
  });

  it('возвращает null если годовой не выгоднее', () => {
    expect(computeSavingsPct({ yearlyPerMonth: 5, monthlyPerMonth: 4 })).toBeNull();
  });
});

describe('paywall_pricing — computePerDayString', () => {
  it('делит годовую цену на 365 и сохраняет символ валюты', () => {
    const s = computePerDayString('$365');
    expect(s).toContain('$');
    expect(s).toContain('1'); // ~$1.00/день
  });

  it('сохраняет рублёвый символ', () => {
    const s = computePerDayString('₽3650');
    expect(s).toContain('₽');
    expect(s).toContain('10'); // ~₽10/день
  });

  it('возвращает null для непарсимой цены', () => {
    expect(computePerDayString('Загружаем…')).toBeNull();
    expect(computePerDayString('')).toBeNull();
  });

  it('numericHint приоритетнее неоднозначной строки (€9.990 = 9.99/мес×12)', () => {
    // строка «€9.990» парсингом дала бы 9990 → ~27/день (абсурд);
    // с точным numericHint=119.88 → ~0.33/день
    const s = computePerDayString('€9.990', 119.88);
    expect(s).toContain('€');
    expect(s).toContain('0'); // ~€0.33/день, не €27
  });

  it('numericHint игнорируется если невалиден', () => {
    const s = computePerDayString('$365', 0);
    expect(s).toContain('1'); // падает обратно на парсинг строки → ~$1/день
  });
});
