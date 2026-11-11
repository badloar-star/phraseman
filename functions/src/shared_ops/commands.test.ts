import { parseCommand, buildStatusText, JARVIS_COMMANDS } from './commands';

describe('Jarvis commands — /status and /stop from the phone', () => {
  test('recognises the documented commands', () => {
    expect(parseCommand('/status')).toBe('status');
    expect(parseCommand('/stop')).toBe('stop');
    expect(parseCommand('/start')).toBe('start');
  });

  test('tolerates the @botname suffix Telegram adds in groups', () => {
    expect(parseCommand('/status@codex_reportbot')).toBe('status');
  });

  test('tolerates surrounding whitespace and case', () => {
    expect(parseCommand('  /STATUS  ')).toBe('status');
  });

  test('ignores ordinary text — not every message is a command', () => {
    expect(parseCommand('привет')).toBeNull();
    expect(parseCommand('status')).toBeNull();
    expect(parseCommand('')).toBeNull();
    expect(parseCommand(undefined)).toBeNull();
  });

  test('ignores an unknown command instead of guessing', () => {
    expect(parseCommand('/deploy')).toBeNull();
    expect(parseCommand('/статус')).toBeNull();
  });

  test('the documented list is what the code accepts', () => {
    // Бриф в267: /status, /stop и подтверждения. Ничего лишнего.
    expect([...JARVIS_COMMANDS].sort()).toEqual(['start', 'status', 'stop']);
  });

  test('status names the mode in plain words, not a code', () => {
    const text = buildStatusText({
      mode: 'observe',
      reason: null,
      lastRunAtMs: null,
      openDecisions: 0,
      nowMs: 1_800_000_000_000,
    });
    expect(text).toMatch(/наблюда/i);
    expect(text).not.toContain('observe');
  });

  test('status says plainly when Jarvis is off and why', () => {
    const text = buildStatusText({
      mode: 'off',
      reason: 'разбираюсь с платежами',
      lastRunAtMs: null,
      openDecisions: 0,
      nowMs: 1_800_000_000_000,
    });
    expect(text).toMatch(/выключен/i);
    expect(text).toContain('разбираюсь с платежами');
  });

  test('status admits it has never run rather than showing a fake date', () => {
    const text = buildStatusText({
      mode: 'observe', reason: null, lastRunAtMs: null,
      openDecisions: 0, nowMs: 1_800_000_000_000,
    });
    expect(text).toMatch(/пока не запускал|ещё не/i);
  });

  test('status reports how long ago the last run was', () => {
    const nowMs = 1_800_000_000_000;
    const text = buildStatusText({
      mode: 'observe', reason: null,
      lastRunAtMs: nowMs - 3 * 60 * 60 * 1000,
      openDecisions: 2, nowMs,
    });
    expect(text).toContain('3');
    expect(text).toContain('2');
  });

  test('status escapes HTML so a stray reason cannot break the message', () => {
    const text = buildStatusText({
      mode: 'off', reason: 'сломалось <b>всё</b>',
      lastRunAtMs: null, openDecisions: 0, nowMs: 1_800_000_000_000,
    });
    expect(text).toContain('&lt;b&gt;');
  });
});
