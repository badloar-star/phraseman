import {
  assessDialogRepeat,
  canonicalizeDialogTurnState,
  generateDialogWithRepeatGuard,
  normalizeDialogReply,
  sanitizeDialogGameState,
} from './premium_dialog_quality';

describe('dialog repeat quality guard', () => {
  it('normalizes markers, case, punctuation and whitespace', () => {
    expect(normalizeDialogReply('  [[What size]] would you like?! ')).toBe(
      'what size would you like',
    );
  });

  it('normalizes curly and straight apostrophes identically', () => {
    expect(normalizeDialogReply('What’s your name?')).toBe(
      normalizeDialogReply("What's your name?"),
    );
  });

  it('detects exact repeats and A-B-C-A cycles', () => {
    const history = [
      { role: 'assistant' as const, content: 'What size would you like?' },
      { role: 'user' as const, content: 'Large.' },
      { role: 'assistant' as const, content: 'Would you like milk?' },
      { role: 'user' as const, content: 'No.' },
      { role: 'assistant' as const, content: 'Will you pay by card?' },
    ];

    expect(assessDialogRepeat('What size would you like?', history)).toMatchObject({
      repeated: true,
      reason: 'exact',
      score: 1,
      bucket: 'exact',
    });
  });

  it('detects a close rewrite of a recent question', () => {
    const history = [
      { role: 'assistant' as const, content: 'Would you like to pay with cash or by card today?' },
    ];

    expect(
      assessDialogRepeat('Would you like to pay with cash or by card now?', history),
    ).toMatchObject({ repeated: true, reason: 'near' });
  });

  it('detects the same question behind different short acknowledgements', () => {
    expect(
      assessDialogRepeat('Okay! What size would you like?', [
        { role: 'assistant', content: 'Great! What size would you like?' },
      ]),
    ).toMatchObject({ repeated: true, reason: 'exact' });
  });

  it('allows a shared acknowledgement when the actual question changes', () => {
    expect(
      assessDialogRepeat('Thank you for telling me. Would you like coffee?', [
        { role: 'assistant', content: 'Thank you for telling me. Would you like tea?' },
      ]),
    ).toMatchObject({ repeated: false, reason: 'none' });
  });

  it('does not reject harmless short acknowledgements', () => {
    expect(
      assessDialogRepeat('Yes, please.', [
        { role: 'assistant', content: 'Yes, that sounds good.' },
      ]),
    ).toMatchObject({ repeated: false, reason: 'none' });
  });

  it('ignores user messages when looking for assistant repetition', () => {
    expect(
      assessDialogRepeat('What size would you like?', [
        { role: 'user', content: 'What size would you like?' },
      ]),
    ).toMatchObject({ repeated: false });
  });
});

describe('dialog carried game state', () => {
  it('clamps numbers, removes duplicates and rejects unknown objectives', () => {
    expect(
      sanitizeDialogGameState(
        {
          exchangeIndex: 999,
          mood: -4,
          objectivesMet: ['order', 'evil', 'order'],
          noProgressTurns: 99,
        },
        ['order', 'pay'],
        80,
      ),
    ).toEqual({
      exchangeIndex: 32,
      mood: 0,
      objectivesMet: ['order'],
      noProgressTurns: 32,
    });
  });

  it('uses a safe first-turn state when the client sends nothing', () => {
    expect(sanitizeDialogGameState(undefined, ['order'], 85)).toEqual({
      exchangeIndex: 1,
      mood: 85,
      objectivesMet: [],
      noProgressTurns: 0,
    });
  });

  it('keeps old objectives and deterministically succeeds', () => {
    expect(
      canonicalizeDialogTurnState(
        { mood: 70, objectivesMet: ['pay'], outcome: 'ongoing' },
        { exchangeIndex: 4, mood: 75, objectivesMet: ['order'], noProgressTurns: 0 },
        ['order', 'pay'],
      ),
    ).toMatchObject({
      mood: 70,
      objectivesMet: ['order', 'pay'],
      outcome: 'success',
    });
  });

  it('prioritizes lost patience over success', () => {
    expect(
      canonicalizeDialogTurnState(
        { mood: 0, objectivesMet: ['pay'] },
        { exchangeIndex: 4, mood: 10, objectivesMet: ['order'], noProgressTurns: 0 },
        ['order', 'pay'],
      ).outcome,
    ).toBe('lost_patience');
  });

  it('preserves an explicit lost-patience terminal outcome above success', () => {
    expect(
      canonicalizeDialogTurnState(
        { mood: 15, objectivesMet: ['pay'], outcome: 'lost_patience' },
        { exchangeIndex: 4, mood: 20, objectivesMet: ['order'], noProgressTurns: 0 },
        ['order', 'pay'],
      ).outcome,
    ).toBe('lost_patience');
  });

  it('stalls an unfinished scenario at exchange eight', () => {
    expect(
      canonicalizeDialogTurnState(
        { mood: 70, objectivesMet: [], outcome: 'ongoing' },
        { exchangeIndex: 8, mood: 70, objectivesMet: [], noProgressTurns: 7 },
        ['order'],
      ).outcome,
    ).toBe('stalled');
  });
});

describe('dialog repeat regeneration', () => {
  const history = [
    { role: 'assistant' as const, content: 'What size would you like?' },
    { role: 'user' as const, content: 'Large, please.' },
  ];

  it('regenerates once and returns the novel candidate', async () => {
    const generate = jest.fn()
      .mockResolvedValueOnce({ reply: 'What size would you like?', value: 1 })
      .mockResolvedValueOnce({ reply: 'Would you prefer a small or large cup?', value: 2 });

    const out = await generateDialogWithRepeatGuard(generate, history);

    expect(generate).toHaveBeenNthCalledWith(1, 0);
    expect(generate).toHaveBeenNthCalledWith(2, 1);
    expect(out.value.value).toBe(2);
    expect(out.quality).toMatchObject({
      repeatDetected: true,
      regenerationAttempted: true,
      regenerationSucceeded: true,
    });
  });

  it('throws dialog_repeated_reply after the second repeat', async () => {
    const generate = jest.fn().mockResolvedValue({ reply: 'What size would you like?' });

    await expect(generateDialogWithRepeatGuard(generate, history)).rejects.toMatchObject({
      code: 'dialog_repeated_reply',
    });
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
