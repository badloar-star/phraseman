import { feedbackRatingAlertFromCreate } from './admin_alert_sources_ratings';

const NOW_MS = Date.UTC(2026, 8, 12, 20, 0);

describe('feedback Telegram alert source', () => {

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
