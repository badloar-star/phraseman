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
  { type: 'transport_lost' },
  { type: 'reconnected' },
  { type: 'wrap_up' },
  { type: 'learner_end_requested' },
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
    failed: [{ type: 'fail', reason: 'network' }],
    ended: [{ type: 'connected' }, { type: 'end' }],
  };
  const state = run(chains[phase]);
  expect(state.phase).toBe(phase);
  return state;
}

describe('max_call_ui_state: допустимые переходы', () => {
  it('начальное состояние — connecting без hint-таймера', () => {
    expect(MAX_CALL_UI_INITIAL).toEqual({
      phase: 'connecting',
      eqOwner: 'idle',
      allowHintTimer: false,
    });
  });

  it('полный happy path: connect → greeting → ход юзера → ответ ИИ → wrap-up → ended', () => {
    let s = reduceMaxCallUi(MAX_CALL_UI_INITIAL, { type: 'connected' });
    expect(s.phase).toBe('connected_greeting');

    s = reduceMaxCallUi(s, { type: 'greeting_started' });
    expect(s).toMatchObject({ phase: 'connected_greeting', eqOwner: 'ai' });

    // response.done = конец генерации; аудио приветствия ещё играет из буфера —
    // ход юзера НЕ начинается (иначе таймер подсказки стрелял под речь ИИ).
    const stillGreeting = reduceMaxCallUi(s, { type: 'response_done' });
    expect(stillGreeting).toBe(s);

    s = reduceMaxCallUi(stillGreeting, { type: 'audio_out_stopped' });
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

  // зачем: владелец 2026-08-16 — «реплика не успевает закончиться, снизу уже
  // текст следующей». Пока звучит аудио ИИ, никакое response_done не отдаёт
  // ход юзеру (и не взводит подсказку) — только реальный конец аудио.
  it('ai_speaking: response_done при звучащем аудио — no-op, ход юзера начинается с audio_out_stopped', () => {
    const speaking = reach('ai_speaking');
    expect(reduceMaxCallUi(speaking, { type: 'response_done' })).toBe(speaking);
    expect(reduceMaxCallUi(speaking, { type: 'audio_out_stopped' })).toMatchObject({ phase: 'listening', eqOwner: 'user' });
    // Порядок наоборот (аудио доиграло раньше done): stopped → listening, поздний done — no-op.
    const listening = reduceMaxCallUi(speaking, { type: 'audio_out_stopped' });
    expect(reduceMaxCallUi(listening, { type: 'response_done' })).toBe(listening);
  });

  it('приветствие без аудио (пустой response) всё же отдаёт ход юзеру по response_done', () => {
    const s = reduceMaxCallUi(reach('connected_greeting'), { type: 'response_done' });
    expect(s).toMatchObject({ phase: 'listening', eqOwner: 'user' });
  });

  it('response_created ведёт из listening в thinking (semantic_vad создал ответ)', () => {
    const s = reduceMaxCallUi(reach('listening'), { type: 'response_created' });
    expect(s.phase).toBe('thinking');
  });

  it('пустой response (done без аудио) возвращает ход юзеру', () => {
    const s = reduceMaxCallUi(reach('thinking'), { type: 'response_done' });
    expect(s).toMatchObject({ phase: 'listening', eqOwner: 'user' });
  });

  it('speech_started не обрывает приветствие до конца его аудио', () => {
    const greeting = reach('connected_greeting');
    expect(reduceMaxCallUi(greeting, { type: 'speech_started' })).toBe(greeting);
  });
});

describe('max_call_ui_state: barge-in', () => {
  it('speech_started во время речи ИИ не открывает следующий ход до конца аудио', () => {
    const s = reduceMaxCallUi(reach('ai_speaking'), { type: 'speech_started' });
    expect(s).toMatchObject({ phase: 'ai_speaking', eqOwner: 'ai' });
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
      'barge_in', 'reconnecting', 'wrapping_up', 'failed', 'ended',
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

  it('transport_lost показывает reconnecting сразу, без промежуточного thinking', () => {
    expect(reduceMaxCallUi(reach('listening'), { type: 'transport_lost' })).toMatchObject({
      phase: 'reconnecting', eqOwner: 'idle', allowHintTimer: false,
    });
  });

  it('явная просьба ученика завершить разговор не может оставить listening', () => {
    expect(reduceMaxCallUi(reach('listening'), { type: 'learner_end_requested' })).toMatchObject({
      phase: 'wrapping_up', allowHintTimer: false,
    });
  });
});

describe('max_call_ui_state: терминальные состояния', () => {
  it('fail остаётся видимым до выбора ученика и сохраняет причину', () => {
    for (const phase of [
      'connecting', 'connected_greeting', 'listening', 'thinking',
      'ai_speaking', 'barge_in', 'reconnecting', 'wrapping_up',
    ] as const) {
      const s = reduceMaxCallUi(reach(phase), { type: 'fail', reason: 'ice_failed' });
      expect(s).toEqual({
        phase: 'failed',
        eqOwner: 'idle',
        allowHintTimer: false,
        failureCode: 'ice_failed',
      });
    }
  });

  it('из failed можно явно начать реконнект или завершить', () => {
    const failed = reach('failed');
    expect(reduceMaxCallUi(failed, { type: 'reconnect_started' }).phase).toBe('reconnecting');
    expect(reduceMaxCallUi(failed, { type: 'end' }).phase).toBe('ended');
  });

  it('ended поглощает все события (включая fail) без изменений', () => {
    const ended = reach('ended');
    for (const ev of ALL_EVENTS) {
      expect(reduceMaxCallUi(ended, ev)).toBe(ended);
    }
  });

});
