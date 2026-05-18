import {
  APP_MESSAGE_TTL_MS,
  buildAppMessagePreview,
  filterAppMessagesSnapshotForAudience,
  isAppMessageVisible,
  mergeAppMessagesWithStates,
  normalizeAppMessage,
  normalizeAppMessageState,
  pickAppMessagePollOptionText,
  pickAppMessagePollQuestion,
  pickAppMessageText,
} from '../app/app_messages';

describe('app_messages', () => {
  const now = Date.UTC(2026, 4, 16, 12, 0, 0);

  it('keeps messages visible for 30 days by default', () => {
    const message = normalizeAppMessage('m1', {
      active: true,
      titleRu: 'Title',
      messageRu: 'Body',
      createdAtMs: now - APP_MESSAGE_TTL_MS + 1,
    }, now);

    expect(isAppMessageVisible(message, now)).toBe(true);
    expect(isAppMessageVisible(message, now + 2)).toBe(false);
  });

  it('merges read state and computes unread count', () => {
    const unread = normalizeAppMessage('m1', { active: true, createdAtMs: now, messageRu: 'A' }, now);
    const read = normalizeAppMessage('m2', { active: true, createdAtMs: now - 10, messageRu: 'B' }, now);
    const expired = normalizeAppMessage('m3', {
      active: true,
      createdAtMs: now - APP_MESSAGE_TTL_MS - 10,
      messageRu: 'C',
    }, now);

    const snapshot = mergeAppMessagesWithStates(
      [read, expired, unread],
      [{ messageId: 'm2', readAtMs: now - 1, reaction: 'like', updatedAtMs: now }],
      now,
    );

    expect(snapshot.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(snapshot.unreadCount).toBe(1);
    expect(snapshot.messages.find((m) => m.id === 'm2')?.reaction).toBe('like');
  });

  it('picks localized text with fallback and makes compact previews', () => {
    const message = normalizeAppMessage('m1', {
      titleRu: 'RU title',
      messageRu: 'One two three four five',
      titleUk: '',
      messageUk: '',
    }, now);

    expect(pickAppMessageText(message, 'uk')).toEqual({
      title: 'RU title',
      body: 'One two three four five',
    });
    expect(buildAppMessagePreview('One\n\n two   three four', 13)).toBe('One two...');
  });

  it('filters messages by free and premium audience before unread count', () => {
    const all = normalizeAppMessage('all', { active: true, audience: 'all', createdAtMs: now, messageRu: 'A' }, now);
    const free = normalizeAppMessage('free', { active: true, audience: 'free', createdAtMs: now, messageRu: 'B' }, now);
    const premium = normalizeAppMessage('premium', { active: true, audience: 'premium', createdAtMs: now, messageRu: 'C' }, now);
    const snapshot = mergeAppMessagesWithStates([all, free, premium], [], now);

    expect(filterAppMessagesSnapshotForAudience(snapshot, false).messages.map((m) => m.id)).toEqual(['all', 'free']);
    expect(filterAppMessagesSnapshotForAudience(snapshot, false).unreadCount).toBe(2);
    expect(filterAppMessagesSnapshotForAudience(snapshot, true).messages.map((m) => m.id)).toEqual(['all', 'premium']);
    expect(filterAppMessagesSnapshotForAudience(snapshot, true).unreadCount).toBe(2);
  });

  it('normalizes polls and carries the selected option from user state', () => {
    const message = normalizeAppMessage('poll1', {
      active: true,
      kind: 'poll',
      titleRu: 'Feedback',
      messageRu: 'Help us choose.',
      createdAtMs: now,
      poll: {
        questionRu: 'Что добавить следующим?',
        questionUk: 'Що додати далі?',
        options: [
          { id: 'opt_1', textRu: 'Квизы', textUk: 'Квізи' },
          { id: 'opt_2', textRu: 'Карточки', textUk: 'Картки' },
        ],
      },
      pollCounts: { opt_1: 3, opt_2: 1 },
      pollVoteCount: 4,
    }, now);
    const state = normalizeAppMessageState('poll1', { pollOptionId: 'opt_2', updatedAtMs: now });
    const snapshot = mergeAppMessagesWithStates([message], [state], now);

    expect(message.kind).toBe('poll');
    expect(message.poll?.optionIds).toEqual(['opt_1', 'opt_2']);
    expect(message.poll?.voteCount).toBe(4);
    expect(pickAppMessagePollQuestion(message.poll!, 'uk')).toBe('Що додати далі?');
    expect(pickAppMessagePollOptionText(message.poll!.options[1], 'uk')).toBe('Картки');
    expect(snapshot.messages[0].pollOptionId).toBe('opt_2');
  });
});
