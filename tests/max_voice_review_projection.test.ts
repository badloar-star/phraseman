import {
  compactReviewText,
  projectMaxReview,
  projectReviewHighlight,
  resolveTomorrowPlan,
} from '../app/max_voice_review_projection';
import type { MaxVoiceReviewReceiptV1 } from '../app/max_voice_finalize_types';

function receipt(overrides: Partial<MaxVoiceReviewReceiptV1> = {}): MaxVoiceReviewReceiptV1 {
  return {
    schemaVersion: 'max-voice-review.v1',
    sessionId: 's1',
    stableUid: 'account-A',
    completedAtMs: 10,
    durationSec: 120,
    endReason: 'completed',
    status: 'ready',
    worked: ['You kept the conversation moving.', 'You asked a clear question.', 'Hidden win.'],
    correction: { said: 'He go', target: 'He goes', explanation: 'Use -s with he.' },
    tomorrowActions: ['One', 'Two', 'Three'],
    targetPhrase: 'Could you repeat that?',
    nextTopic: 'At a hotel',
    goal: { id: 'a1-greeting', masteryBefore: 1, masteryAfter: 2 },
    phraseEvidence: [],
    ...overrides,
  };
}

describe('MAX review projection', () => {
  test('projects a calm four-level hierarchy from the durable receipt', () => {
    expect(projectMaxReview(receipt())).toMatchObject({
      sessionId: 's1',
      worked: ['You kept the conversation moving.', 'You asked a clear question.'],
      correction: { said: 'He go', target: 'He goes', explanation: 'Use -s with he.' },
      tomorrowActions: ['One', 'Two', 'Three'],
      targetPhrase: 'Could you repeat that?',
      nextConversation: 'At a hotel',
    });
  });

  test('never renders more than three numbered tomorrow actions', () => {
    const unsafe = receipt() as unknown as { tomorrowActions: string[] };
    unsafe.tomorrowActions = ['1', '2', '3', '4'];
    expect(projectMaxReview(unsafe as unknown as MaxVoiceReviewReceiptV1).tomorrowActions)
      .toEqual(['1', '2', '3']);
  });

  test('keeps the target phrase and next conversation outside numbered actions', () => {
    const view = projectMaxReview(receipt({
      tomorrowActions: ['Review the correction'],
      targetPhrase: 'Could you repeat that?',
      nextTopic: 'At a hotel',
    }));
    expect(view.tomorrowActions).toEqual(['Review the correction']);
    expect(view.targetPhrase).toBe('Could you repeat that?');
    expect(view.nextConversation).toBe('At a hotel');
  });
  test('compacts top-level copy at a word boundary without changing short copy', () => {
    expect(compactReviewText('Short and useful.', 40)).toBe('Short and useful.');

    const compact = compactReviewText(
      'This is a deliberately long explanation with several extra words that should stay in details.',
      52,
    );
    expect(compact.length).toBeLessThanOrEqual(52);
    expect(compact.endsWith('…')).toBe(true);
    expect(compact).not.toMatch(/\s…$/u);
  });

  test('keeps concise highlights while preserving full content for details', () => {
    const full = {
      original: 'I go to the station yesterday because I needed to meet a friend who arrived very late.',
      corrected: 'I went to the station yesterday because I needed to meet a friend who arrived very late.',
      note: 'Здесь нужен went, потому что действие произошло вчера; остальная часть фразы уже построена хорошо.',
      kind: 'fix' as const,
    };
    const projected = projectReviewHighlight(full);

    expect(projected.full).toEqual(full);
    expect(projected.original.length).toBeLessThanOrEqual(96);
    expect(projected.corrected.length).toBeLessThanOrEqual(112);
    expect(projected.note.length).toBeLessThanOrEqual(150);
  });

  test('next topic never suppresses the practical tip when homework is empty', () => {
    expect(resolveTomorrowPlan({
      homework: [],
      tip: 'Скажи вслух: “Nice to meet you.” три раза.',
      nextTopic: 'Знакомство',
      fallbackAction: 'Повтори ключевую фразу.',
    })).toEqual({
      actions: [{ kind: 'tip', text: 'Скажи вслух: “Nice to meet you.” три раза.' }],
      detailsActions: [],
      nextTopic: 'Знакомство',
    });
  });

  test('keeps homework actions and adds a distinct practical tip', () => {
    expect(resolveTomorrowPlan({
      homework: ['Say: Hello', 'Say: Goodbye'],
      tip: 'Запиши один короткий ответ.',
      nextTopic: 'Первое знакомство',
      fallbackAction: 'fallback',
    })).toEqual({
      actions: [
        { kind: 'phrase', text: 'Say: Hello' },
        { kind: 'phrase', text: 'Say: Goodbye' },
        { kind: 'tip', text: 'Запиши один короткий ответ.' },
      ],
      detailsActions: [],
      nextTopic: 'Первое знакомство',
    });
  });

  test('keeps only three numbered actions on top and preserves the rest in details', () => {
    expect(resolveTomorrowPlan({
      homework: ['One', 'Two', 'Three', 'Four'],
      tip: 'Five',
      nextTopic: 'Travel',
      fallbackAction: 'fallback',
    })).toEqual({
      actions: [
        { kind: 'phrase', text: 'One' },
        { kind: 'phrase', text: 'Two' },
        { kind: 'phrase', text: 'Three' },
      ],
      detailsActions: [
        { kind: 'phrase', text: 'Four' },
        { kind: 'tip', text: 'Five' },
      ],
      nextTopic: 'Travel',
    });
  });

  test('uses a concrete fallback action when homework and tip are empty', () => {
    expect(resolveTomorrowPlan({
      homework: [], tip: '', nextTopic: 'Работа', fallbackAction: 'Повтори ключевую фразу вслух.',
    })).toEqual({
      actions: [{ kind: 'fallback', text: 'Повтори ключевую фразу вслух.' }],
      detailsActions: [],
      nextTopic: 'Работа',
    });
  });
});
