// The native facade pulls in expo-modules-core (ESM, untransformed by jest) and
// is irrelevant to the pure builder under test — stub it to a safe no-op.
jest.mock('../modules/phrase-widget', () => ({
  __esModule: true,
  default: { isAvailable: () => false, setData: async () => {}, reloadAll: async () => {} },
}));

import { buildWidgetPayload } from '../app/widget_bridge';
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
