import {
  RECONNECT_GRACE_MS,
  RECONNECT_EMPTY_MARKER,
  RECONNECT_SUMMARY_MAX_CHARS,
  reconnectPhase,
  makeReconnectChain,
  canReconnect,
  nextChain,
  buildReconnectSummary,
  type ReconnectChainState,
} from '../app/max_call_reconnect';
import { isMaxEndIntent } from '../app/max_voice_copy';
import type { TranscriptTurn } from '../app/max_call_transcript';

const CAPS = { auto: 2, manual: 1 };

function turn(role: 'user' | 'assistant', text: string, atMs: number, interrupted?: boolean): TranscriptTurn {
  const t: TranscriptTurn = { role, text, atMs };
  if (interrupted) t.interrupted = true;
  return t;
}

describe('reconnect phase protocol', () => {
  it('holds a 4s grace before tearing anything down', () => {
    expect(RECONNECT_GRACE_MS).toBe(4000);
    expect(reconnectPhase(0)).toBe('grace');
    expect(reconnectPhase(3999)).toBe('grace');
  });

  it('switches to full re-mint once grace is over', () => {
    expect(reconnectPhase(4000)).toBe('remint');
    expect(reconnectPhase(60000)).toBe('remint');
  });
});

describe('reconnect chain cap (2 auto + 1 manual)', () => {
  it('allows exactly two auto reconnects', () => {
    let chain = makeReconnectChain('sess_root');
    expect(canReconnect(chain, 'auto', CAPS)).toBe(true);
    chain = nextChain(chain, 'auto');
    expect(canReconnect(chain, 'auto', CAPS)).toBe(true);
    chain = nextChain(chain, 'auto');
    expect(canReconnect(chain, 'auto', CAPS)).toBe(false);
  });

  it('keeps the single manual attempt available after auto attempts are spent', () => {
    let chain = makeReconnectChain('sess_root');
    chain = nextChain(nextChain(chain, 'auto'), 'auto');
    expect(canReconnect(chain, 'auto', CAPS)).toBe(false);
    expect(canReconnect(chain, 'manual', CAPS)).toBe(true);
    chain = nextChain(chain, 'manual');
    expect(canReconnect(chain, 'manual', CAPS)).toBe(false);
  });

  it('counts auto and manual independently and preserves the root session id', () => {
    const chain = makeReconnectChain('sess_root');
    const after = nextChain(nextChain(chain, 'manual'), 'auto');
    expect(after).toEqual({ rootSessionId: 'sess_root', autoCount: 1, manualCount: 1 });
    // Исходное состояние не мутируется — оно живёт в ref'е клиента.
    expect(chain).toEqual({ rootSessionId: 'sess_root', autoCount: 0, manualCount: 0 });
  });

  it('respects custom caps from remote config', () => {
    const chain: ReconnectChainState = { rootSessionId: 'r', autoCount: 0, manualCount: 0 };
    expect(canReconnect(chain, 'auto', { auto: 0, manual: 0 })).toBe(false);
    expect(canReconnect(chain, 'manual', { auto: 0, manual: 2 })).toBe(true);
  });
});

describe('buildReconnectSummary (template, no AI)', () => {
  it('returns the "where were we" marker for an empty transcript', () => {
    expect(buildReconnectSummary([], {})).toBe(RECONNECT_EMPTY_MARKER);
    expect(RECONNECT_EMPTY_MARKER).toBe(
      "The line dropped at the very start — restart from 'where were we?'.",
    );
  });

  it('treats whitespace-only turns as an empty transcript', () => {
    const history = [turn('assistant', '   ', 0)];
    expect(buildReconnectSummary(history, {})).toBe(RECONNECT_EMPTY_MARKER);
  });

  it('weaves objectives, weak words and last exchanges into the template', () => {
    const history = [
      turn('assistant', 'Hi! What can I get you?', 0),
      turn('user', 'A large cappuccino please', 4000),
      turn('assistant', 'Sure! To go or', 8000, true),
    ];
    const summary = buildReconnectSummary(history, {
      objectivesClosed: ['greet the barista', 'order a drink'],
      weakWordsSpoken: ['cappuccino', 'large'],
    });

    expect(summary).toContain('Objectives already completed: greet the barista; order a drink.');
    expect(summary).toContain('Weak words the learner already used: cappuccino, large.');
    expect(summary).toContain('AI: Hi! What can I get you?');
    expect(summary).toContain('You: A large cappuccino please');
    // Оборванная barge-in'ом реплика ИИ помечена «—»: не дозачитывать её.
    expect(summary).toContain('AI: Sure! To go or —');
    // Свежие реплики идут после старых (хронология сохранена).
    expect(summary.indexOf('Hi! What can I get you?')).toBeLessThan(
      summary.indexOf('A large cappuccino please'),
    );
  });

  it('omits objectives/weak-words lines when they are absent', () => {
    const summary = buildReconnectSummary([turn('user', 'Hello', 0)], {});
    expect(summary).not.toContain('Objectives already completed');
    expect(summary).not.toContain('Weak words');
    expect(summary).toContain('You: Hello');
  });

  it('weaves already-given corrections in so the AI does not repeat the same recast', () => {
    const history = [turn('user', 'I go to cinema yesterday', 0)];
    const summary = buildReconnectSummary(history, {
      correctionsGiven: ['went to the cinema', 'a large coffee'],
    });
    expect(summary).toContain('Corrections already woven in: went to the cinema; a large coffee.');
    // Пустые/пробельные коррекции не создают строку.
    const noLine = buildReconnectSummary(history, { correctionsGiven: ['  ', ''] });
    expect(noLine).not.toContain('Corrections already woven in');
  });

  it('caps output at maxChars (default 1200 ≈ 300 tokens), dropping oldest turns first', () => {
    const history: TranscriptTurn[] = [];
    for (let i = 0; i < 60; i++) {
      history.push(turn(i % 2 === 0 ? 'assistant' : 'user', `Turn number ${i} with some filler words`, i * 1000));
    }
    const summary = buildReconnectSummary(history, {});
    expect(summary.length).toBeLessThanOrEqual(RECONNECT_SUMMARY_MAX_CHARS);
    expect(RECONNECT_SUMMARY_MAX_CHARS).toBe(1200);
    // Свежий хвост важнее старого начала.
    expect(summary).toContain('Turn number 59');
    expect(summary).not.toContain('Turn number 0 ');
  });

  it('respects an explicit maxChars and still stays within it for oversized single turns', () => {
    const history = [turn('assistant', 'word '.repeat(500), 0)];
    const summary = buildReconnectSummary(history, { maxChars: 200 });
    expect(summary.length).toBeLessThanOrEqual(200);
    expect(summary).toContain('[RECONNECT SUMMARY]');
  });

  it('falls back to the default cap on invalid maxChars', () => {
    const history = [turn('user', 'Hello there', 0)];
    const summary = buildReconnectSummary(history, { maxChars: Number.NaN });
    expect(summary).toContain('You: Hello there');
    expect(summary.length).toBeLessThanOrEqual(RECONNECT_SUMMARY_MAX_CHARS);
  });
});

describe('explicit learner end intent', () => {
  it.each([
    'Finish the conversation.',
    'Please, end the call now',
    'Давай закончим!',
    'Нам надо закончить разговор.',
    'Будь ласка, закінчи розмову',
    'Por favor, termina la conversación',
    'Por favor, encerre a conversa',
    'Lütfen konuşmayı bitir',
    'Proszę, zakończ rozmowę',
  ])('accepts a completed explicit command: %s', (text) => {
    expect(isMaxEndIntent(text)).toBe(true);
  });

  it.each([
    'I need to finish my work before the call.',
    'Мы закончили работу вчера.',
    'How do I say finish the conversation?',
    'She wants to stop smoking.',
  ])('does not substring-match ordinary discussion: %s', (text) => {
    expect(isMaxEndIntent(text)).toBe(false);
  });
});
