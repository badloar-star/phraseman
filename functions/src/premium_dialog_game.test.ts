class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: () => ({ value: () => 'sk-test-key' }),
}));

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(),
}));

jest.mock('./callable_options', () => ({
  ENFORCE_APP_CHECK_OPENAI: false,
}));

import { buildScenarioSystemPrompt, parseGameEnvelope } from './premium_dialog';

describe('premium dialog game mechanics', () => {
  const objectives = [
    { id: 'order_drink', en: 'order a drink' },
    { id: 'ask_price', en: 'ask the price' },
  ];

  describe('gameBlock injection into scenario prompt', () => {
    it('injects mood/outcome rules + JSON format when objectives are present', () => {
      const prompt = buildScenarioSystemPrompt('A2', {
        interfaceLang: 'ru',
        role: 'a barista',
        setting: 'a cafe',
        goalEn: 'order coffee',
        objectives,
        temperament: { patience: 'high', warmth: 'warm' },
      });
      expect(prompt).toContain('GAME STATE');
      expect(prompt).toContain('order_drink: order a drink');
      expect(prompt).toContain('LANGUAGE MISTAKES NEVER lower mood');
      expect(prompt).toContain('"outcome": "ongoing|success|lost_patience|stalled"');
      expect(prompt).toContain('patience level is high');
    });

    it('does NOT inject game block when no objectives (backward compatible)', () => {
      const prompt = buildScenarioSystemPrompt('A2', {
        interfaceLang: 'ru',
        role: 'a barista',
        setting: 'a cafe',
        goalEn: 'order coffee',
      });
      expect(prompt).not.toContain('GAME STATE');
      expect(prompt).not.toContain('OUTPUT FORMAT');
    });

    it('low-patience temperament seeds a lower start mood than high', () => {
      const high = buildScenarioSystemPrompt('A2', { objectives, temperament: { patience: 'high' } });
      const low = buildScenarioSystemPrompt('A2', { objectives, temperament: { patience: 'low' } });
      expect(high).toContain('mood" at about 85');
      expect(low).toContain('mood" at about 55');
    });
  });

  describe('parseGameEnvelope — robust parsing + fallback', () => {
    it('parses a clean JSON envelope', () => {
      const out = parseGameEnvelope(
        '{"reply":"What size?","mood":80,"objectivesMet":["order_drink"],"outcome":"ongoing","characterReaction":"","coachTips":[]}',
      );
      expect(out).not.toBeNull();
      expect(out!.reply).toBe('What size?');
      expect((out!.turnState as { mood: number }).mood).toBe(80);
    });

    it('strips ```json fences', () => {
      const out = parseGameEnvelope('```json\n{"reply":"Hi there"}\n```');
      expect(out).not.toBeNull();
      expect(out!.reply).toBe('Hi there');
    });

    it('returns null on broken JSON (caller falls back to plain reply)', () => {
      expect(parseGameEnvelope('not json at all')).toBeNull();
      expect(parseGameEnvelope('{"reply":')).toBeNull();
    });

    it('returns null when reply field is missing/empty', () => {
      expect(parseGameEnvelope('{"mood":50}')).toBeNull();
      expect(parseGameEnvelope('{"reply":""}')).toBeNull();
    });
  });
});
