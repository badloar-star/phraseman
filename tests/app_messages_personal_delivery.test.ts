import {
  mergeAppMessagesWithStates,
  normalizeOwnedUserAppMessage,
  pickNextLoginPersonalMessage,
} from '../app/app_messages';

describe('personal admin message delivery', () => {
  const now = Date.UTC(2026, 6, 22, 12, 0, 0);
  const doc = {
    kind: 'personal_admin_message',
    recipientUid: 'stable-user-1',
    deliveryMode: 'next_login_modal',
    nextLoginModalPending: true,
    title: 'Сообщение команды',
    body: 'Проверьте важное обновление.',
    createdAtMs: now,
  };

  test('accepts a personal message only for its owning stable UID', () => {
    expect(normalizeOwnedUserAppMessage('m1', doc, 'stable-user-1', now)?.kind).toBe('personal_admin_message');
    expect(normalizeOwnedUserAppMessage('m1', doc, 'stable-user-2', now)).toBeNull();
    expect(normalizeOwnedUserAppMessage('m1', { ...doc, recipientUid: '' }, 'stable-user-1', now)).toBeNull();
  });

  test('selects the modal once and keeps the acknowledged message in the bell', () => {
    const message = normalizeOwnedUserAppMessage('m1', doc, 'stable-user-1', now)!;
    const before = mergeAppMessagesWithStates([message], [], now);
    expect(pickNextLoginPersonalMessage(before)).toMatchObject({ id: 'm1' });

    const acknowledged = mergeAppMessagesWithStates([message], [{
      messageId: 'm1',
      readAtMs: now + 1,
      dismissedAtMs: null,
      personalModalAcknowledgedAtMs: now + 1,
      reaction: null,
      updatedAtMs: now + 1,
    }], now + 1);
    expect(pickNextLoginPersonalMessage(acknowledged)).toBeNull();
    expect(acknowledged.messages.map((item) => item.id)).toEqual(['m1']);
  });

  test('never selects inbox-only personal messages for the modal', () => {
    const message = normalizeOwnedUserAppMessage(
      'm2',
      { ...doc, deliveryMode: 'inbox', nextLoginModalPending: false },
      'stable-user-1',
      now,
    )!;
    expect(pickNextLoginPersonalMessage(mergeAppMessagesWithStates([message], [], now))).toBeNull();
  });
});
