import { assessDialogRepeat, normalizeDialogReply } from './premium_dialog_quality';

describe('dialog repeat quality guard', () => {
  it('normalizes markers, case, punctuation and whitespace', () => {
    expect(normalizeDialogReply('  [[What size]] would you like?! ')).toBe(
      'what size would you like',
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
