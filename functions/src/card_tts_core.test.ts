import {
  CARD_TTS_MAX_CHARS,
  CARD_TTS_VOICE_BY_LANGUAGE,
  cardTtsDownloadToken,
  cardTtsDownloadUrl,
  cardTtsEstimateUsd,
  cardTtsKey,
  cardTtsObjectPath,
  mapWithConcurrency,
  normalizeCardTtsText,
  planCardTtsItems,
  planPackCardTts,
} from './card_tts_core';

describe('card_tts_core (D128)', () => {
  it('uses one voice per language: echo for en (corpus), marin for es/fr/de/it', () => {
    expect(CARD_TTS_VOICE_BY_LANGUAGE).toEqual({ en: 'echo', es: 'marin', fr: 'marin', de: 'marin', it: 'marin' });
  });

  it('key is stable across whitespace, but differs by language and case', () => {
    const a = cardTtsKey('es', '  Hola   mundo ');
    expect(a).toBe(cardTtsKey('es', 'Hola mundo'));
    expect(a).toMatch(/^[0-9a-f]{40}$/);
    expect(cardTtsKey('it', 'Hola mundo')).not.toBe(a);
    expect(cardTtsKey('de', 'Haus')).not.toBe(cardTtsKey('de', 'haus'));
  });

  it('pins the key/token algorithm (client mirror depends on it)', () => {
    const key = cardTtsKey('en', 'Nice to meet you');
    const path = cardTtsObjectPath('en', key);
    expect(path).toBe(`card-audio/v1/en/${key}.mp3`);
    expect(cardTtsDownloadToken(path)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    const url = cardTtsDownloadUrl('bucket-x', path);
    expect(url).toContain('/v0/b/bucket-x/o/card-audio%2Fv1%2Fen%2F');
    expect(url).toContain(`&token=${cardTtsDownloadToken(path)}`);
  });

  it('dedupes texts and skips empty / too long', () => {
    const { items, skipped } = planCardTtsItems('fr', ['Bonjour', 'bonjour ', 'Bonjour', '', 'x'.repeat(CARD_TTS_MAX_CHARS + 1)]);
    expect(items.map((i) => i.text)).toEqual(['Bonjour', 'bonjour']);
    expect(skipped).toEqual({ empty: 1, too_long: 1 });
  });

  it('never plans unpublished packs or packs without language (D127)', () => {
    const cards = [{ id: 'c1', en: 'Paris' }];
    expect(planPackCardTts('p', { listingStatus: 'pending', cards })).toEqual({ ok: false, reason: 'not_published' });
    expect(planPackCardTts('p', null)).toEqual({ ok: false, reason: 'not_published' });
    expect(planPackCardTts('p', { listingStatus: 'published', packLanguage: 'none', cards })).toEqual({ ok: false, reason: 'pack_language_none' });
    expect(planPackCardTts('p', { listingStatus: 'published', packLanguage: 'es', cards: [] })).toEqual({ ok: false, reason: 'no_cards' });
  });

  it('plans published packs by targetText, legacy packs as English, revision tracks content', () => {
    const plan = planPackCardTts('p', {
      listingStatus: 'published',
      packLanguage: 'it',
      cards: [{ id: 'a', en: 'old', targetText: 'Ciao' }, { id: 'b', en: 'Grazie' }],
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.language).toBe('it');
    expect(plan.items.map((i) => i.text)).toEqual(['Ciao', 'Grazie']);
    const reordered = planPackCardTts('p', {
      listingStatus: 'published', packLanguage: 'it', cards: [{ id: 'b', en: 'Grazie' }, { id: 'a', targetText: 'Ciao' }],
    });
    expect(reordered.ok && reordered.revision).toBe(plan.revision);
    const legacy = planPackCardTts('p', { listingStatus: 'published', cards: [{ id: 'a', en: 'Hello' }] });
    expect(legacy.ok && legacy.language).toBe('en');
  });

  it('normalizes and estimates cost at $0.015 / 1k chars', () => {
    expect(normalizeCardTtsText(' a \n b ')).toBe('a b');
    expect(cardTtsEstimateUsd(1000)).toBe(0.015);
  });

  it('mapWithConcurrency keeps order and respects the limit', async () => {
    let active = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50, 60]);
    expect(peak).toBe(2);
  });
});
