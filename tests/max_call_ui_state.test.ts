import {
  MAX_CALL_UI_INITIAL,
  reduceMaxCallUi,
  type MaxCallUiEvent,
  type MaxCallUiPhase,
  type MaxCallUiState,
} from '../app/max_call_ui_state';

const ALL_EVENTS: MaxCallUiEvent[] = [
  { type: 'connected' },
  { type: 'greeting_started' },
  { type: 'speech_started' },
  { type: 'speech_stopped' },
  { type: 'response_created' },
  { type: 'audio_out_started' },
  { type: 'audio_out_stopped' },
  { type: 'audio_out_cleared' },
  { type: 'response_done' },
  { type: 'reconnect_started' },
  { type: 'reconnected' },
  { type: 'wrap_up' },
  { type: 'end' },
  { type: 'fail', reason: 'x' },
  { type: 'barge_in_optimistic' },
  { type: 'barge_in_timeout' },
];

function run(events: MaxCallUiEvent[], from: MaxCallUiState = MAX_CALL_UI_INITIAL): MaxCallUiState {
  return events.reduce(reduceMaxCallUi, from);
}

/** Догоняет автомат до нужной фазы валидной цепочкой событий. */
function reach(phase: MaxCallUiPhase): MaxCallUiState {
  const chains: Record<MaxCallUiPhase, MaxCallUiEvent[]> = {
    connecting: [],
    connected_greeting: [{ type: 'connected' }],
    listening: [{ type: 'connected' }, { type: 'response_done' }],
    thinking: [{ type: 'connected' }, { type: 'response_done' }, { type: 'speech_started' }, { type: 'speech_stopped' }],
    ai_speaking: [{ type: 'connected' }, { type: 'response_done' }, { type: 'audio_out_started' }],
    barge_in: [
      { type: 'connected' },
      { type: 'response_done' },
      { type: 'audio_out_started' },
      { type: 'barge_in_optimistic' },
    ],
    reconnecting: [{ type: 'connected' }, { type: 'response_done' }, { type: 'reconnect_started' }],
    wrapping_up: [{ type: 'connected' }, { type: 'response_done' }, { type: 'wrap_up' }],
    ended: [{ type: 'connected' }, { type: 'end' }],
    failed: [{ type: 'fail', reason: 'boom' }],
  };
  const state = run(chains[phase]);
  expect(state.phase).toBe(phase);
  return state;
}

describe('max_call_ui_state: допустимые переходы', () => {
  it('начальное состояние — connecting без hint-таймера', () => {
    expect(MAX_CALL_UI_INITIAL).toEqual({
      phase: 'connecting',
      failReason: null,
      eqOwner: 'idle',
      allowHintTimer: false,
    });
  });

  it('полный happy path: connect → greeting → ход юзера → ответ ИИ → wrap-up → ended', () => {
    let s = reduceMaxCallUi(MAX_CALL_UI_INITIAL, { type: 'connected' });
    expect(s.phase).toBe('connected_greeting');

    s = reduceMaxCallUi(s, { type: 'greeting_started' });
    expect(s).toMatchObject({ phase: 'connected_greeting', eqOwner: 'ai' });

    s = reduceMaxCallUi(s, { type: 'response_done' });
    expect(s).toMatchObject({ phase: 'listening', eqOwner: 'user', allowHintTimer: true });

    s = reduceMaxCallUi(s, { type: 'speech_started' });
    expect(s).toMatchObject({ phase: 'listening', eqOwner: 'user' });

    s = reduceMaxCallUi(s, { type: 'speech_stopped' });
    expect(s).toMatchObject({ phase: 'thinking', eqOwner: 'idle' });

    s = reduceMaxCallUi(s, { type: 'audio_out_started' });
    expect(s).toMatchObject({ phase: 'ai_speaking', eqOwner: 'ai' });

    s = reduceMaxCallUi(s, { type: 'audio_out_stopped' });
    expect(s).toMatchObject({ phase: 'listening', eqOwner: 'user' });

    s = reduceMaxCallUi(s, { type: 'wrap_up' });
    expect(s).toMatchObject({ phase: 'wrapping_up', allowHintTimer: false });

    s = reduceMaxCallUi(s, { type: 'end' });
    expect(s).toMatchObject({ phase: 'ended', eqOwner: 'idle', allowHintTimer: false });
  });

  it('response_created ведёт из listening в thinking (semantic_vad создал ответ)', () => {
    const s = reduceMaxCallUi(reach('listening'), { type: 'response_created' });
    expect(s.phase).toBe('thinking');
  });

  it('пустой response (done без аудио) возвращает ход юзеру', () => {
    const s = reduceMaxCallUi(reach('thinking'), { type: 'response_done' });
    expect(s).toMatchObject({ phase: 'listening', eqOwner: 'user' });
  });

  it('юзер перебивает приветствие — сцена сразу его', () => {
    const s = reduceMaxCallUi(reach('connected_greeting'), { type: 'speech_started' });
    expect(s).toMatchObject({ phase: 'listening', eqOwner: 'user' });
  });
});

describe('max_call_ui_state: barge-in', () => {
  it('серверный speech_started во время речи ИИ → barge_in с эквалайзером юзера', () => {
    const s = reduceMaxCallUi(reach('ai_speaking'), { type: 'speech_started' });
    expect(s).toMatchObject({ phase: 'barge_in', eqOwner: 'user' });
  });

  it('оптимистичный barge-in без подтверждения откатывается таймаутом в ai_speaking', () => {
    const optimistic = reduceMaxCallUi(reach('ai_speaking'), { type: 'barge_in_optimistic' });
    expect(optimistic).toMatchObject({ phase: 'barge_in', eqOwner: 'user' });

    const rolledBack = reduceMaxCallUi(optimistic, { type: 'barge_in_timeout' });
    expect(rolledBack).toMatchObject({ phase: 'ai_speaking', eqOwner: 'ai' });
  });

  it('подтверждённый barge-in: speech_started фиксирует ход юзера, поздний таймаут — no-op', () => {
    const optimistic = reduceMaxCallUi(reach('ai_speaking'), { type: 'barge_in_optimistic' });
    const confirmed = reduceMaxCallUi(optimistic, { type: 'speech_started' });
    expect(confirmed).toMatchObject({ phase: 'listening', eqOwner: 'user' });

    // Гонка: таймер сработал уже после подтверждения — откатывать нечего.
    const afterLateTimeout = reduceMaxCallUi(confirmed, { type: 'barge_in_timeout' });
    expect(afterLateTimeout).toBe(confirmed);
  });

  it('audio_out_cleared в barge_in завершает перебивание в listening', () => {
    const s = reduceMaxCallUi(reach('barge_in'), { type: 'audio_out_cleared' });
    expect(s).toMatchObject({ phase: 'listening', eqOwner: 'user' });
  });

  it('barge_in_optimistic вне ai_speaking — no-op', () => {
    for (const phase of ['connecting', 'listening', 'thinking', 'reconnecting', 'wrapping_up'] as const) {
      const before = reach(phase);
      expect(reduceMaxCallUi(before, { type: 'barge_in_optimistic' })).toBe(before);
    }
  });
});

describe('max_call_ui_state: out-of-order события — no-op, не throw', () => {
  it('speech_started в connecting — no-op (та же ссылка state)', () => {
    expect(reduceMaxCallUi(MAX_CALL_UI_INITIAL, { type: 'speech_started' })).toBe(MAX_CALL_UI_INITIAL);
  });

  it('поздний response_done после возврата в listening — no-op', () => {
    const listening = reach('listening');
    expect(reduceMaxCallUi(listening, { type: 'response_done' })).toBe(listening);
  });

  it('серверные события старой сессии в reconnecting игнорируются', () => {
    const rec = reach('reconnecting');
    for (const ev of [
      { type: 'speech_started' },
      { type: 'audio_out_started' },
      { type: 'response_done' },
      { type: 'wrap_up' },
    ] as MaxCallUiEvent[]) {
      expect(reduceMaxCallUi(rec, ev)).toBe(rec);
    }
  });

  it('никакая пара (фаза × событие) не бросает', () => {
    const phases: MaxCallUiPhase[] = [
      'connecting', 'connected_greeting', 'listening', 'thinking', 'ai_speaking',
      'barge_in', 'reconnecting', 'wrapping_up', 'ended', 'failed',
    ];
    for (const phase of phases) {
      const base = reach(phase);
      for (const ev of ALL_EVENTS) {
        expect(() => reduceMaxCallUi(base, ev)).not.toThrow();
      }
    }
  });
});

describe('max_call_ui_state: reconnect и wrap-up блокируют hint-таймер', () => {
  it('reconnecting: allowHintTimer=false, reconnected возвращает listening с таймером', () => {
    const rec = reach('reconnecting');
    expect(rec).toMatchObject({ allowHintTimer: false, eqOwner: 'idle' });

    const back = reduceMaxCallUi(rec, { type: 'reconnected' });
    expect(back).toMatchObject({ phase: 'listening', eqOwner: 'user', allowHintTimer: true });
  });

  it('wrapping_up: hint-таймер выключен, но эквалайзер живёт (ИИ договаривает прощание)', () => {
    let s = reach('wrapping_up');
    expect(s.allowHintTimer).toBe(false);

    s = reduceMaxCallUi(s, { type: 'audio_out_started' });
    expect(s).toMatchObject({ phase: 'wrapping_up', eqOwner: 'ai', allowHintTimer: false });

    s = reduceMaxCallUi(s, { type: 'speech_started' });
    expect(s).toMatchObject({ phase: 'wrapping_up', eqOwner: 'user', allowHintTimer: false });

    s = reduceMaxCallUi(s, { type: 'audio_out_stopped' });
    expect(s).toMatchObject({ phase: 'wrapping_up', eqOwner: 'idle', allowHintTimer: false });
  });

  it('wrap_up из любого живого разговора уводит в wrapping_up', () => {
    for (const phase of ['connected_greeting', 'listening', 'thinking', 'ai_speaking', 'barge_in'] as const) {
      const s = reduceMaxCallUi(reach(phase), { type: 'wrap_up' });
      expect(s).toMatchObject({ phase: 'wrapping_up', allowHintTimer: false });
    }
  });

  it('обрыв во время речи ИИ уводит в reconnecting с idle-эквалайзером', () => {
    const s = reduceMaxCallUi(reach('ai_speaking'), { type: 'reconnect_started' });
    expect(s).toMatchObject({ phase: 'reconnecting', eqOwner: 'idle', allowHintTimer: false });
  });
});

describe('max_call_ui_state: терминальные состояния', () => {
  it('fail из любой нетерминальной фазы фиксирует причину', () => {
    for (const phase of [
      'connecting', 'connected_greeting', 'listening', 'thinking',
      'ai_speaking', 'barge_in', 'reconnecting', 'wrapping_up',
    ] as const) {
      const s = reduceMaxCallUi(reach(phase), { type: 'fail', reason: 'ice_failed' });
      expect(s).toEqual({
        phase: 'failed',
        failReason: 'ice_failed',
        eqOwner: 'idle',
        allowHintTimer: false,
      });
    }
  });

  it('ended поглощает все события (включая fail) без изменений', () => {
    const ended = reach('ended');
    for (const ev of ALL_EVENTS) {
      expect(reduceMaxCallUi(ended, ev)).toBe(ended);
    }
  });

  it('failed поглощает все события и не теряет причину', () => {
    const failed = reach('failed');
    for (const ev of ALL_EVENTS) {
      const after = reduceMaxCallUi(failed, ev);
      expect(after).toBe(failed);
      expect(after.failReason).toBe('boom');
    }
  });
});
