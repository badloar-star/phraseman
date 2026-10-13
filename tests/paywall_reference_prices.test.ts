// зачем (владелец 11.10, капсом: «ЦЕНЫ ДОЛЖНЫ ПОКАЗЫВАТЬСЯ ВСЕ РАВНО!!! ВЕЗДЕ»): на плитках пейвола цена видна всегда —
// живая из магазина → последняя настоящая (кэш) → справочная (рубильник → зашитая страховка). Живая всегда главнее.
import fs from 'node:fs';
import path from 'node:path';
import {
  PAYWALL_REFERENCE_PRICES_BUILTIN,
  localizeReferencePrice,
  parsePaywallReferencePrices,
  pickPaywallPrice,
  resolvePaywallReferencePrices,
} from '../app/paywall_reference_prices';
import { applyRemoteConfigSnapshot } from '../app/remote_flags';
import { ONBOARDING_COPY_SOURCE } from './helpers/onboarding_copy_source';

describe('цепочка цены', () => {
  test('живая цена магазина главнее кэша и справочной', () => {
    expect(pickPaywallPrice({ store: '39,99 €', cache: '€35', reference: '€39,99' })).toEqual({ price: '39,99 €', source: 'store' });
  });
  test('нет живой — последняя настоящая из кэша', () => {
    expect(pickPaywallPrice({ store: '', cache: '€35', reference: '€39,99' })).toEqual({ price: '€35', source: 'cache' });
  });
  test('нет ни живой, ни кэша — справочная (никогда не пусто)', () => {
    expect(pickPaywallPrice({ store: '', reference: '€39,99' })).toEqual({ price: '€39,99', source: 'reference' });
  });
  test('показать нечего — none (магазин ответил без этого плана: цену не выдумываем)', () => {
    expect(pickPaywallPrice({ store: '' })).toEqual({ price: '', source: 'none' });
  });
});

describe('справочные цены', () => {
  test('пусто или мусор в рубильнике — зашитая страховка', () => {
    expect(parsePaywallReferencePrices('')).toBe(PAYWALL_REFERENCE_PRICES_BUILTIN);
    expect(parsePaywallReferencePrices('not json')).toBe(PAYWALL_REFERENCE_PRICES_BUILTIN);
    expect(parsePaywallReferencePrices('{"yearly":"€39,99"}')).toBe(PAYWALL_REFERENCE_PRICES_BUILTIN);
    expect(parsePaywallReferencePrices('{"yearly":"abc","monthly":"€7,99"}')).toBe(PAYWALL_REFERENCE_PRICES_BUILTIN);
  });
  test('рубильник задаёт свои цены без релиза', () => {
    expect(parsePaywallReferencePrices('{"yearly":"$44.99","monthly":"$8.99","yearlyPerMonth":"$3.75"}'))
      .toEqual({ yearly: '$44.99', monthly: '$8.99', yearlyPerMonth: '$3.75', source: 'remote' });
  });
  test('рубильник подхватывается из снимка remote config', () => {
    applyRemoteConfigSnapshot({ texts: { paywall_reference_prices: '{"yearly":"€41","monthly":"€8"}' } });
    expect(resolvePaywallReferencePrices()).toMatchObject({ yearly: '€41', monthly: '€8', source: 'remote' });
    applyRemoteConfigSnapshot({});
    expect(resolvePaywallReferencePrices()).toBe(PAYWALL_REFERENCE_PRICES_BUILTIN);
  });
});

describe('хук пейвола: цепочка во всех пейволах', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'paywall_purchase.ts'), 'utf8');
  test('кэш цен — не только в окне Plus', () => {
    expect(source).toMatch(/useState<PaywallPriceCache \| null>\(\s*\(\) => peekPaywallPriceCache\(\),\s*\)/);
    expect(source).not.toMatch(/resilientCheckout \? peekPaywallPriceCache\(\)/);
    expect(source).not.toMatch(/const cacheYearly = resilientCheckout/);
  });
  test('справочная цена — только пока магазин ни разу не ответил, без кэша и не на экранах без «≈»', () => {
    expect(source).toMatch(/const referencePrices = allowReferencePrice && !offeringsEverLoaded && !cacheYearly && !cacheMonthly/);
  });
  test('на кнопке была справочная цена — покупка только вторым тапом', () => {
    expect(source).toMatch(/if \(shownSource === 'reference'\) \{[\s\S]{0,300}return;/);
  });
  // зачем (координатор 12.10: «≈ везде», Дизайн): онбординг тоже показывает справочную цену — но с «≈», а текст об автопродлении строится ТОЛЬКО из
  // настоящей цены (магазин/кэш): справочная выдала бы чужую валюту за условия подписки.
  test('онбординг: справочная цена с «≈», условия подписки — только из настоящей цены, тап без магазина — тихая подпись', () => {
    const onboarding = fs.readFileSync(path.join(__dirname, '..', 'components', 'CleanOnboarding.tsx'), 'utf8') + ONBOARDING_COPY_SOURCE; // // зачем (координатор 12.10): тексты онбординга переехали в components/onboarding/*
    expect(onboarding).not.toMatch(/allowReferencePrice: false/);
    expect(onboarding).toMatch(/yearlyPriceSource === 'reference' \? '≈ ' : ''/);
    expect(onboarding).toMatch(/selectedPriceIsReference[\s\S]{0,400}oc\.priceViaStore/);
    expect(onboarding).toContain('Цена уточнится в магазине');
    expect(onboarding).toMatch(/paywallTapNotice \? oc\.tryInMinute/);
    expect(onboarding).toContain('Попробуй через минуту');
  });
  test('тап без магазина в любом пейволе — тихая подсказка, не немой выход', () => {
    expect(source).toMatch(/resilientCheckout=false — тихая подсказка и догрузка[\s\S]{0,200}setTapNotice\(true\);/);
  });
  test('хук отдаёт источник цены пейволам', () => {
    expect(source).toMatch(/priceSource, pricesApproximate,/);
  });
});

// зачем (координатор 13.10, EN-проход): страховка «€39,99» в английском интерфейсе — с точкой; остальные языки — запятая.
describe('справочные цены по языку интерфейса', () => {
  test('en: десятичная точка, прочие языки — как хранится', () => {
    expect(localizeReferencePrice('€39,99', 'en')).toBe('€39.99');
    expect(localizeReferencePrice('≈ €3,33 / мес', 'en')).toBe('≈ €3.33 / мес');
    expect(localizeReferencePrice('€39,99', 'ru')).toBe('€39,99');
    expect(localizeReferencePrice('€39,99', 'pl')).toBe('€39,99');
    expect(localizeReferencePrice('€1,999', 'en')).toBe('€1,999');
  });
  test('resolvePaywallReferencePrices(en) отдаёт все три цены с точкой', () => {
    const en = resolvePaywallReferencePrices('en');
    const ru = resolvePaywallReferencePrices('ru');
    expect(en.yearly).toBe(localizeReferencePrice(ru.yearly, 'en'));
    expect(en.monthly).toBe(localizeReferencePrice(ru.monthly, 'en'));
    expect(en.yearlyPerMonth).toBe(localizeReferencePrice(ru.yearlyPerMonth, 'en'));
    expect(`${en.yearly}${en.monthly}${en.yearlyPerMonth}`).not.toMatch(/\d,\d{2}(?!\d)/);
  });
});
