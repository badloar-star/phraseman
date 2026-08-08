import fs from 'fs';
import path from 'path';
import vm from 'vm';

import {
  GIFT_CERTIFICATE_PHRASES,
  type GiftPhrasePlan,
} from '../functions/src/gift_certificate_phrases';

const root = path.resolve(__dirname, '..');
const plans: GiftPhrasePlan[] = ['monthly', 'yearly', 'lifetime'];
const checkoutSource = fs.readFileSync(
  path.join(root, 'functions', 'src', 'web_checkout.ts'),
  'utf8',
);

function loadBrowserCatalog(): typeof GIFT_CERTIFICATE_PHRASES {
  const source = fs.readFileSync(
    path.join(root, 'knowly-www', 'assets', 'gift-certificate-phrases.js'),
    'utf8',
  );
  const window: Record<string, unknown> = {};
  vm.runInNewContext(source, { window, Object });
  return window.PHRASEMAN_GIFT_PHRASES as typeof GIFT_CERTIFICATE_PHRASES;
}

describe('gift certificate catchphrase catalog', () => {
  it.each(plans)('%s contains exactly 50 valid plan-specific phrases', (plan) => {
    const entries = GIFT_CERTIFICATE_PHRASES[plan];
    expect(entries).toHaveLength(50);
    expect(new Set(entries.map(({ id }) => id)).size).toBe(50);

    for (const { id, text } of entries) {
      expect(id).toMatch(new RegExp(`^${plan}-\\d{2}$`));
      expect(text.trim()).toBe(text);
      expect(text.length).toBeGreaterThanOrEqual(12);
      expect(text.length).toBeLessThanOrEqual(90);
    }
  });

  it('keeps all 150 visible texts unique after normalization', () => {
    const texts = plans.flatMap((plan) => GIFT_CERTIFICATE_PHRASES[plan].map(({ text }) => (
      text.toLocaleLowerCase('ru-RU').replace(/[^a-zа-яё0-9]+/gi, ' ').trim()
    )));

    expect(texts).toHaveLength(150);
    expect(new Set(texts).size).toBe(150);
  });

  it('publishes the exact server catalog to the gift page', () => {
    expect(loadBrowserCatalog()).toEqual(GIFT_CERTIFICATE_PHRASES);
  });

  it('persists a server-validated phrase identifier for both payment providers', () => {
    expect(checkoutSource).toContain('giftPhraseId?: string;');
    expect(checkoutSource).toContain('giftPhraseId: input.giftPhraseId || null');
    expect((checkoutSource.match(/resolveGiftPhrase\(plan, body\.giftPhraseId\)\.id/g) ?? [])).toHaveLength(2);
  });
});
