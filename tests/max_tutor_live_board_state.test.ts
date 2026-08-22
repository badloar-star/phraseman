import {
  initialTutorLiveUiState,
  normalizeTutorBoard,
  reduceTutorLiveUi,
} from '../app/max_tutor_live_board_state';

describe('MAX tutor live board', () => {
  it('accepts one bounded hint and replaces the previous board', () => {
    const first = normalizeTutorBoard({
      kind: 'hint',
      targetText: 'Could we move it to Friday?',
      meaning: 'Можем перенести это на пятницу?',
      source: 'learner_request',
    }, 1_000);
    expect(first?.expiresAtMs).toBe(13_000);

    const shown = reduceTutorLiveUi(initialTutorLiveUiState('Встреча'), {
      type: 'show_board',
      board: first!,
    });
    const replaced = reduceTutorLiveUi(shown, {
      type: 'show_board',
      board: { ...first!, targetText: 'Could we do Sunday instead?' },
    });

    expect(replaced.board?.targetText).toBe('Could we do Sunday instead?');
  });

  it.each(['speech_started', 'reconnecting', 'background', 'ended'] as const)(
    '%s clears transient help',
    (type) => {
      const board = normalizeTutorBoard({
        kind: 'hint',
        targetText: 'Try this',
        source: 'silence',
      }, 1_000)!;
      const shown = reduceTutorLiveUi(initialTutorLiveUiState('Work'), {
        type: 'show_board',
        board,
      });

      expect(reduceTutorLiveUi(shown, { type }).board).toBeNull();
    },
  );

  it('changes topic, clears the board, and can enter free talk without deleting the planned goal', () => {
    const board = normalizeTutorBoard({
      kind: 'translation',
      targetText: 'weekend',
      source: 'learner_request',
    }, 1_000)!;
    const shown = reduceTutorLiveUi(initialTutorLiveUiState('Work'), {
      type: 'show_board',
      board,
    });
    const changed = reduceTutorLiveUi(shown, {
      type: 'set_topic',
      topic: 'Планы на выходные',
      mode: 'free_talk',
      nowMs: 2_000,
    });

    expect(changed).toMatchObject({
      board: null,
      currentTopic: 'Планы на выходные',
      mode: 'free_talk',
    });
    expect(changed.notice?.expiresAtMs).toBe(4_000);
  });

  it('keeps the two-second topic confirmation when the learner starts speaking', () => {
    const changed = reduceTutorLiveUi(initialTutorLiveUiState('Work'), {
      type: 'set_topic',
      topic: 'Weekend plans',
      mode: 'guided',
      nowMs: 2_000,
    });

    const speaking = reduceTutorLiveUi(changed, { type: 'speech_started' });

    expect(speaking.board).toBeNull();
    expect(speaking.notice).toEqual({ text: 'Weekend plans', expiresAtMs: 4_000 });
  });

  it('expires boards and notices independently', () => {
    const board = normalizeTutorBoard({
      kind: 'hint',
      targetText: 'Try this',
      source: 'silence',
    }, 1_000)!;
    const withBoard = reduceTutorLiveUi(initialTutorLiveUiState('Work'), {
      type: 'show_board',
      board,
    });
    const withNotice = reduceTutorLiveUi(withBoard, {
      type: 'set_topic',
      topic: 'Weekend plans',
      mode: 'guided',
      nowMs: 2_000,
    });

    expect(reduceTutorLiveUi(withNotice, { type: 'expire', nowMs: 4_000 }).notice).toBeNull();
  });

  it('rejects unknown enums, blank text, oversized payloads, and uncertain recasts', () => {
    expect(normalizeTutorBoard({ kind: 'grade', targetText: 'x', source: 'silence' }, 0)).toBeNull();
    expect(normalizeTutorBoard({ kind: 'hint', targetText: ' ', source: 'silence' }, 0)).toBeNull();
    expect(normalizeTutorBoard({ kind: 'hint', targetText: 'x'.repeat(101), source: 'silence' }, 0)).toBeNull();
    expect(normalizeTutorBoard({ kind: 'recast', targetText: 'Try this', source: 'silence' }, 0)).toBeNull();
  });
});
