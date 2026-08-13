// The native facade pulls in expo-modules-core (ESM, untransformed by jest) and
// is irrelevant to the pure builder under test — stub it to a safe no-op.
jest.mock('../modules/phrase-widget', () => ({
  __esModule: true,
  default: { isAvailable: () => false, setData: async () => {}, reloadAll: async () => {} },
}));

import {
  buildPersonalDeckWidgetPayload,
  buildWidgetPayload,
} from '../app/widget_bridge';
import type { DailyPhrase } from '../app/daily_phrase_system';

// The widget snapshot is the single contract the native iOS/Android widgets read.
// These tests lock in the redesign fixes:
//   - transcription is actually populated (was a permanently-empty dead field)
//   - the theme payload carries `glow` (needed for the accent bloom on both sides)
//   - schemaVersion / date / deep links stay stable for the native decoders.

const phrase: DailyPhrase = {
  id: 'local-11',
  english: 'Break the ice',
  literal: 'Разбить лёд',
  meaning: 'Растопить лёд',
  text: 'Пример использования.',
  date: '2026-06-22',
} as unknown as DailyPhrase;

describe('buildWidgetPayload contract', () => {
  const payload = buildWidgetPayload(phrase, 'ru', 'dark', 1_700_000_000_000);

  test('transcription is derived and non-empty (the dead-field fix)', () => {
    expect(payload.transcription.length).toBeGreaterThan(0);
    // IPA generator wraps output in slashes.
    expect(payload.transcription.startsWith('/')).toBe(true);
    expect(payload.transcription.endsWith('/')).toBe(true);
  });

  test('theme carries the glow stop for the accent bloom', () => {
    expect(typeof payload.theme.glow).toBe('string');
    expect(payload.theme.glow.length).toBeGreaterThan(0);
  });

  test('theme still carries the full chrome the native widgets decode', () => {
    for (const key of [
      'gradientTop', 'gradientMid', 'gradientBottom', 'border', 'titleColor',
      'phraseColor', 'subColor', 'accent', 'chipBg', 'chipBorder', 'glow',
    ] as const) {
      expect(payload.theme[key].length).toBeGreaterThan(0);
    }
  });

  test('schema version, date and deep links are stable for native decoding', () => {
    expect(payload.schemaVersion).toBe(2);
    expect(payload.date).toBe('2026-06-22');
    expect(payload.deepLink).toBe('phraseman://phrase/local-11');
    expect(payload.playDeepLink).toBe('phraseman://phrase/local-11?play=1');
    expect(payload.kicker).toBe('ФРАЗА ДНЯ');
  });
});

describe('buildPersonalDeckWidgetPayload contract', () => {
  const payload = buildPersonalDeckWidgetPayload({
    isPlus: true,
    lang: 'ru',
    mode: 'dark',
    now: 1_700_000_000_000,
    saved: [{ id: 'saved-1', en: 'Make it count', ru: 'Ð¡Ð´ÐµÐ»Ð°Ð¹ Ñ‚Ð°Ðº, Ñ‡Ñ‚Ð¾Ð±Ñ‹ ÑÑ‚Ð¾ Ð¸Ð¼ÐµÐ»Ð¾ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¸Ðµ.' }],
    created: [{ id: 'custom-1', en: 'I learn in small steps', ru: 'Ð¯ ÑƒÑ‡ÑƒÑÑŒ Ð¼Ð°Ð»ÐµÐ½ÑŒÐºÐ¸Ð¼Ð¸ ÑˆÐ°Ð³Ð°Ð¼Ð¸.' }],
  });

  test('ships both personal decks in a versioned Plus snapshot', () => {
    expect(payload.schemaVersion).toBe(3);
    expect(payload.access).toBe('plus');
    expect(payload.decks.saved.cards).toHaveLength(1);
    expect(payload.decks.created.cards).toHaveLength(1);
  });

  test('links each card to its exact collection route instead of the daily phrase', () => {
    expect(payload.decks.saved.cards[0].deepLink).toBe('phraseman://deck/saved/saved-1');
    expect(payload.decks.created.cards[0].deepLink).toBe('phraseman://deck/created/custom-1');
  });

  test('does not expose deck contents after Plus access ends', () => {
    const free = buildPersonalDeckWidgetPayload({
      isPlus: false,
      lang: 'ru',
      mode: 'dark',
      now: 1_700_000_000_000,
      saved: [{ id: 'saved-1', en: 'Private card', ru: 'Ð›Ð¸Ñ‡Ð½Ð°Ñ ÐºÐ°Ñ€Ñ‚Ð¾Ñ‡ÐºÐ°.' }],
      created: [],
    });

    expect(free.access).toBe('free');
    expect(free.decks.saved.cards).toEqual([]);
    expect(free.decks.created.cards).toEqual([]);
  });

  test('marks an empty chosen collection without substituting another deck', () => {
    expect(payload.decks.created.empty).toBe(false);
    const empty = buildPersonalDeckWidgetPayload({
      isPlus: true,
      lang: 'ru',
      mode: 'dark',
      now: 1_700_000_000_000,
      saved: [],
      created: [],
    });
    expect(empty.decks.saved.empty).toBe(true);
    expect(empty.decks.created.empty).toBe(true);
  });
});
