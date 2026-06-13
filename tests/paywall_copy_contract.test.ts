import { PREMIUM_CONTEXT_VALUES, type PremiumContext } from '../app/premium_context';
import {
  getPaywallCopy,
  getHeroPlannedCopy,
  CONTEXT_BENEFITS,
  getContextBenefitPlanned,
  PREMIUM_HERO_ART,
  makeLP,
} from '../app/paywall_copy';

// Уникальные контексты (в union есть дубль dialog_limit — Set убирает).
const CONTEXTS = Array.from(new Set(PREMIUM_CONTEXT_VALUES)) as PremiumContext[];

describe('paywall_copy — контракт покрытия 26 контекстов', () => {
  it.each(CONTEXTS)('контекст "%s": заголовок и сабтайтл непустые (ru/uk/es)', (ctx) => {
    const copy = getPaywallCopy(ctx);
    for (const k of ['titleRu', 'titleUk', 'titleEs', 'subtitleRu', 'subtitleUk', 'subtitleEs'] as const) {
      expect(typeof copy[k]).toBe('string');
      expect(copy[k].length).toBeGreaterThan(0);
    }
  });

  it.each(CONTEXTS)('контекст "%s": planned-герой имеет 5 языков', (ctx) => {
    const planned = getHeroPlannedCopy(ctx, 0);
    for (const lng of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(typeof planned.title[lng]).toBe('string');
      expect(typeof planned.subtitle[lng]).toBe('string');
    }
  });

  it.each(CONTEXTS)('контекст "%s": есть hero-art (accent)', (ctx) => {
    expect(PREMIUM_HERO_ART[ctx]).toBeDefined();
    expect(PREMIUM_HERO_ART[ctx].accent).toMatch(/^#?[0-9a-fA-F]{3,8}$/);
  });

  it('generic всегда есть как фолбэк', () => {
    expect(getPaywallCopy('unknown_ctx_xyz' as PremiumContext)).toBe(getPaywallCopy('generic'));
    expect(CONTEXT_BENEFITS.generic.length).toBeGreaterThanOrEqual(3);
  });

  it('getContextBenefitPlanned не падает на крайних индексах', () => {
    expect(getContextBenefitPlanned('generic', 0)).toBeDefined();
    expect(getContextBenefitPlanned('generic', 99)).toBeDefined();
  });
});

describe('paywall_copy — makeLP', () => {
  it('ru-язык берёт ru-строку', () => {
    const LP = makeLP('ru');
    expect(LP('Привет', 'Привіт', 'Hola', { 'pt-BR': 'Olá', vi: 'Xin chào', id: 'Halo', tr: 'Merhaba', pl: 'Cześć' }))
      .toBe('Привет');
  });
  it('planned-язык (pl) берёт из planned-словаря', () => {
    const LP = makeLP('pl');
    expect(LP('Привет', 'Привіт', 'Hola', { 'pt-BR': 'Olá', vi: 'Xin chào', id: 'Halo', tr: 'Merhaba', pl: 'Cześć' }))
      .toBe('Cześć');
  });
});
