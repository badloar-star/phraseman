import { feedbackRatingAlertFromCreate } from './admin_alert_sources_ratings';

const NOW_MS = Date.UTC(2026, 8, 12, 20, 0);

describe('feedback Telegram alert source', () => {
  test.each([
    ['lesson', 'lessonRating', 'Урок'],
    ['vocab', 'vocabDialogueRating', 'Словарь'],
    ['dialogue', 'vocabDialogueRating', 'Диалог'],
    ['arena_blitz', 'arenaRating', 'Arena Blitz'],
    ['arena_rating', 'arenaRating', 'Arena Rating'],
  ] as const)('maps %s to %s without carrying comment text', (kind, eventType, category) => {
    const alert = feedbackRatingAlertFromCreate({
      feedbackId: `feedback-${kind}`,
      data: {
        kind,
        rating: 4,
        uid: 'stable-A1B2',
        message: 'private free-form comment',
        entityLabel: 'potentially private label',
        createdAtMs: NOW_MS,
      },
      nowMs: NOW_MS + 1,
    });

    expect(alert).toEqual({
      eventType,
      source: 'feedback.rating',
      sourceId: `feedback-${kind}`,
      occurredAtMs: NOW_MS,
      payload: { rating: 4, category, uidLast4: 'A1B2', route: '#max-feedback' },
    });
    expect(JSON.stringify(alert)).not.toContain('private free-form comment');
    expect(JSON.stringify(alert)).not.toContain('potentially private label');
  });

  test('alerts for text-only feedback but not malformed or empty rows', () => {
    expect(feedbackRatingAlertFromCreate({
      feedbackId: 'text-only', data: { kind: 'lesson', rating: 0, message: 'text' }, nowMs: NOW_MS,
    })).toMatchObject({ eventType: 'lessonRating', sourceId: 'text-only' });
    expect(feedbackRatingAlertFromCreate({ feedbackId: 'empty', data: { kind: 'lesson', rating: 0, message: '' }, nowMs: NOW_MS })).toBeNull();
    expect(feedbackRatingAlertFromCreate({
      feedbackId: 'unknown', data: { kind: 'max_call', rating: 5 }, nowMs: NOW_MS,
    })).toBeNull();
  });
});
