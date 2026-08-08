import {
  JARVIS_CONTROL_DOC,
  DEFAULT_CONTROL,
  parseControl,
  canNotify,
  canRun,
} from './control';

describe('Jarvis control — one visible switch, safe defaults', () => {
  test('an absent document means observe, not off and not silence', () => {
    // зачем: пустая база не должна выключать надзор. Отсутствие настройки —
    // это «ещё не настраивали», а не «владелец выключил».
    const control = parseControl(undefined);
    expect(control.mode).toBe('observe');
    expect(canRun(control)).toBe(true);
  });

  test('mode off stops both running and notifying', () => {
    const control = parseControl({ mode: 'off' });
    expect(canRun(control)).toBe(false);
    expect(canNotify(control)).toBe(false);
  });

  test('mode observe runs and notifies', () => {
    const control = parseControl({ mode: 'observe' });
    expect(canRun(control)).toBe(true);
    expect(canNotify(control)).toBe(true);
  });

  test('mode quiet keeps watching but stops the messages', () => {
    // зачем отдельный режим: «не пиши мне сегодня» ≠ «перестань следить».
    const control = parseControl({ mode: 'quiet' });
    expect(canRun(control)).toBe(true);
    expect(canNotify(control)).toBe(false);
  });

  test('an unknown mode falls back to observe rather than silently disabling', () => {
    expect(parseControl({ mode: 'banana' }).mode).toBe('observe');
    expect(parseControl({ mode: 42 }).mode).toBe('observe');
    expect(parseControl(null).mode).toBe('observe');
  });

  test('remembers why it was switched off and by whom', () => {
    // Бриф в20: у опасного режима обязана быть причина.
    const control = parseControl({ mode: 'off', reason: 'разбираюсь с платежами', changedBy: 'owner', changedAtMs: 5 });
    expect(control.reason).toBe('разбираюсь с платежами');
    expect(control.changedBy).toBe('owner');
    expect(control.changedAtMs).toBe(5);
  });

  test('a missing reason is null, never an invented one', () => {
    expect(parseControl({ mode: 'off' }).reason).toBeNull();
  });

  test('the document path is explicit, not derived at runtime', () => {
    expect(JARVIS_CONTROL_DOC).toBe('jarvis_control/global');
  });

  test('the default is observe — Jarvis watches from the start', () => {
    expect(DEFAULT_CONTROL.mode).toBe('observe');
    expect(DEFAULT_CONTROL.reason).toBeNull();
  });

  test('remembers when the daily run last happened and how many findings it had', () => {
    const control = parseControl({ mode: 'observe', lastRunAtMs: 123, lastRunOpenDecisions: 4 });
    expect(control.lastRunAtMs).toBe(123);
    expect(control.lastRunOpenDecisions).toBe(4);
  });

  test('a never-run Jarvis reports null, not a fake zero timestamp', () => {
    expect(parseControl({ mode: 'observe' }).lastRunAtMs).toBeNull();
  });
});
