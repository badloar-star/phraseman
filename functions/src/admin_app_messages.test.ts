import { HttpsError } from 'firebase-functions/v2/https';
import {
  appMessagePollStructureChanged,
  normalizeAppMessageCreateInput,
  normalizeAppMessageCleanupInput,
  normalizeAppMessageDeleteInput,
  normalizePersonalAppMessageInput,
  normalizeAppMessageToggleInput,
  normalizeAppMessageUpdateInput,
} from './admin_app_messages';

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

describe('normalizePersonalAppMessageInput', () => {
  const personal = {
    uid: 'stable-user_123',
    title: 'Ответ команды',
    body: 'Мы проверили ваш вопрос.',
    deliveryMode: 'next_login_modal',
    reason: 'Ответ на обращение пользователя',
    idempotencyKey: 'personal-message-1',
    requestId: 'request-personal-1',
  } as const;

  test('accepts a stable UID and only the two personal delivery modes', () => {
    expect(normalizePersonalAppMessageInput(personal, 'admin@example.com', 1_800_000_000_000)).toMatchObject({
      uid: 'stable-user_123',
      deliveryMode: 'next_login_modal',
      document: {
        kind: 'personal_admin_message',
        deliveryMode: 'next_login_modal',
        title: 'Ответ команды',
        body: 'Мы проверили ваш вопрос.',
        createdBy: 'admin@example.com',
      },
    });
    expect(normalizePersonalAppMessageInput({ ...personal, deliveryMode: 'inbox' }, 'admin@example.com').deliveryMode).toBe('inbox');
    expect(() => normalizePersonalAppMessageInput({ ...personal, deliveryMode: 'push' }, 'admin@example.com')).toThrow(HttpsError);
  });

  test('rejects foreign recipient aliases and keeps retry fingerprint stable', () => {
    expect(() => normalizePersonalAppMessageInput({ ...personal, recipientUid: 'other-user' }, 'admin@example.com')).toThrow(HttpsError);
    const first = normalizePersonalAppMessageInput(personal, 'admin@example.com', 1_800_000_000_000);
    const retry = normalizePersonalAppMessageInput(personal, 'admin@example.com', 1_800_060_000_000);
    expect(retry.requestFingerprint).toBe(first.requestFingerprint);
    expect(retry.document.createdAtMs).not.toBe(first.document.createdAtMs);
  });
});

describe('normalizeAppMessageToggleInput', () => {
  test('accepts a reasoned active-state change and rejects malformed ids', () => {
    expect(normalizeAppMessageToggleInput({ messageId: 'message_123', active: false, reason: 'Campaign ended', idempotencyKey: 'toggle-1', requestId: 'req-1' })).toMatchObject({ messageId: 'message_123', active: false });
    expect(() => normalizeAppMessageToggleInput({ messageId: '../bad', active: true, reason: 'x', idempotencyKey: 'toggle-2', requestId: 'req-2' })).toThrow(HttpsError);
  });
});

describe('app message edit and delete commands', () => {
  test('normalizes an update without recreating engagement counters or extending expiry', () => {
    const result = normalizeAppMessageUpdateInput({
      ...base,
      messageId: 'message_123',
      active: true,
      resetPollEngagement: false,
      translations: { ru: { title: 'Новая тема', body: 'Новый текст' } },
    });
    expect(result).toMatchObject({ messageId: 'message_123', active: true, resetPollEngagement: false });
    expect(result.patch).toMatchObject({ kind: 'message', audience: 'free', priority: 12, titleRu: 'Новая тема', messageRu: 'Новый текст' });
    expect(result.patch).not.toHaveProperty('createdAtMs');
    expect(result.patch).not.toHaveProperty('expiresAtMs');
    expect(result.patch).not.toHaveProperty('readCount');
  });

  test('detects poll option changes while allowing translation-only edits', () => {
    const previous = { optionIds: ['option_1', 'option_2'], options: [{ id: 'option_1', textRu: 'Да' }, { id: 'option_2', textRu: 'Нет' }] };
    const translatedOnly = { ...previous, questionEs: '¿Sí o no?' };
    const changed = { optionIds: ['option_1', 'option_2'], options: [{ id: 'option_1', textRu: 'Конечно' }, { id: 'option_2', textRu: 'Нет' }] };
    expect(appMessagePollStructureChanged(previous, translatedOnly)).toBe(false);
    expect(appMessagePollStructureChanged(previous, changed)).toBe(true);
    expect(appMessagePollStructureChanged(previous, null)).toBe(true);
  });

  test('preserves legacy poll option ids during an edit', () => {
    const result = normalizeAppMessageUpdateInput({
      ...base,
      messageId: 'legacy_poll_1',
      active: true,
      kind: 'poll',
      pollOptionIds: ['opt_1', 'opt_2'],
      translations: { ru: { title: 'Выбор', body: 'Ответьте', pollQuestion: 'Да или нет?', pollOptions: ['Да', 'Нет'] } },
    });
    expect(result.patch.poll).toMatchObject({ optionIds: ['opt_1', 'opt_2'], options: [{ id: 'opt_1' }, { id: 'opt_2' }] });
  });

  test('requires the requested post-edit active state and fingerprints it', () => {
    const input = {
      ...base,
      messageId: 'message_123',
      active: false,
      translations: { ru: { title: 'Draft', body: 'Keep inactive' } },
    };
    const inactive = normalizeAppMessageUpdateInput(input);
    const active = normalizeAppMessageUpdateInput({ ...input, active: true });
    expect(inactive.active).toBe(false);
    expect(active.active).toBe(true);
    expect(active.requestFingerprint).not.toBe(inactive.requestFingerprint);
    expect(() => normalizeAppMessageUpdateInput({ ...input, active: undefined })).toThrow(HttpsError);
  });

  test('requires a reasoned bounded delete command', () => {
    expect(normalizeAppMessageDeleteInput({ messageId: 'message_123', reason: 'Campaign is obsolete', idempotencyKey: 'delete-1', requestId: 'req-delete-1' })).toMatchObject({ messageId: 'message_123' });
    expect(() => normalizeAppMessageDeleteInput({ messageId: '../bad', reason: 'x', idempotencyKey: 'delete-2', requestId: 'req-delete-2' })).toThrow(HttpsError);
  });

  test('deduplicates the bounded cleanup target list', () => {
    expect(normalizeAppMessageCleanupInput({
      messageIds: ['message_123', 'message_123', 'message_456'],
      reason: 'Expired campaign retention cleanup',
      idempotencyKey: 'cleanup-1',
      requestId: 'req-cleanup-1',
    }).messageIds).toEqual(['message_123', 'message_456']);
    expect(() => normalizeAppMessageCleanupInput({ messageIds: [], reason: 'x', idempotencyKey: 'cleanup-2', requestId: 'req-cleanup-2' })).toThrow(HttpsError);
  });
});
