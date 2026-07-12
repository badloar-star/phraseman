import { HttpsError } from 'firebase-functions/v2/https';
import { normalizeAppMessageCreateInput, normalizeAppMessageToggleInput } from './admin_app_messages';

const base = {
  reason: 'Reviewed campaign for new lesson announcement',
  idempotencyKey: 'campaign-create-1',
  requestId: 'request-1',
  audience: 'free',
  priority: 12,
  ttlDays: 14,
  translations: { ru: { title: 'Новый урок', body: 'Откройте новый урок сегодня.' } },
};

describe('normalizeAppMessageCreateInput', () => {
  test('creates a bounded message and falls empty languages back to RU', () => {
    const result = normalizeAppMessageCreateInput(base, 'admin@example.com', Date.UTC(2026, 6, 12));
    expect(result.document).toMatchObject({
      kind: 'message', active: false, audience: 'free', priority: 12, ttlDays: 14,
      titleRu: 'Новый урок', titleUk: 'Новый урок', messagePl: 'Откройте новый урок сегодня.',
      createdBy: 'admin@example.com', readCount: 0, likeCount: 0, dislikeCount: 0,
    });
  });

  test('keeps the idempotency fingerprint stable across retry time', () => {
    const first = normalizeAppMessageCreateInput(base, 'admin@example.com', 1_800_000_000_000);
    const retry = normalizeAppMessageCreateInput(base, 'admin@example.com', 1_800_060_000_000);
    expect(retry.requestFingerprint).toBe(first.requestFingerprint);
    expect(retry.document.createdAtMs).not.toBe(first.document.createdAtMs);
  });

  test('normalizes polls with 2-6 stable options and translated fallbacks', () => {
    const result = normalizeAppMessageCreateInput({
      ...base,
      kind: 'poll',
      active: true,
      translations: {
        ru: { title: 'Выберите', body: 'Помогите выбрать.', pollQuestion: 'Что добавить?', pollOptions: ['Уроки', 'Квизы'] },
        es: { title: 'Elige', body: 'Ayúdanos.', pollQuestion: '¿Qué añadir?', pollOptions: ['Lecciones', 'Cuestionarios'] },
      },
    }, 'admin@example.com', 1_800_000_000_000);
    expect(result.document.kind).toBe('poll');
    expect(result.document.active).toBe(true);
    expect(result.document.poll).toMatchObject({
      questionRu: 'Что добавить?', questionEs: '¿Qué añadir?', optionIds: ['option_1', 'option_2'], voteCount: 0,
      options: [
        { id: 'option_1', textRu: 'Уроки', textEs: 'Lecciones', textUk: 'Уроки' },
        { id: 'option_2', textRu: 'Квизы', textEs: 'Cuestionarios', textUk: 'Квизы' },
      ],
    });
  });

  test('rejects missing reason, RU content and incomplete polls', () => {
    expect(() => normalizeAppMessageCreateInput({ ...base, reason: '' }, 'admin')).toThrow(HttpsError);
    expect(() => normalizeAppMessageCreateInput({ ...base, translations: { ru: { title: '', body: '' } } }, 'admin')).toThrow(HttpsError);
    expect(() => normalizeAppMessageCreateInput({ ...base, kind: 'poll', translations: { ru: { title: 'x', body: 'y', pollQuestion: 'q', pollOptions: ['one'] } } }, 'admin')).toThrow(HttpsError);
  });
});

describe('normalizeAppMessageToggleInput', () => {
  test('accepts a reasoned active-state change and rejects malformed ids', () => {
    expect(normalizeAppMessageToggleInput({ messageId: 'message_123', active: false, reason: 'Campaign ended', idempotencyKey: 'toggle-1', requestId: 'req-1' })).toMatchObject({ messageId: 'message_123', active: false });
    expect(() => normalizeAppMessageToggleInput({ messageId: '../bad', active: true, reason: 'x', idempotencyKey: 'toggle-2', requestId: 'req-2' })).toThrow(HttpsError);
  });
});
