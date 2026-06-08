import AsyncStorage from '@react-native-async-storage/async-storage';
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
  seedLocalVipSurveyTestMessage,
} from '../app/app_messages';

describe('app_messages', () => {
  const now = Date.UTC(2026, 4, 16, 12, 0, 0);

  beforeEach(() => {
    (AsyncStorage as unknown as { __reset?: () => void }).__reset?.();
  });

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
      [{ messageId: 'm2', readAtMs: now - 1, dismissedAtMs: null, reaction: 'like', updatedAtMs: now }],
      now,
    );

    expect(snapshot.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(snapshot.unreadCount).toBe(1);
    expect(snapshot.messages.find((m) => m.id === 'm2')?.reaction).toBe('like');
  });

  it('keeps regular dismissed messages visible until admin expiry or deactivation', () => {
    const dismissed = normalizeAppMessage('m1', {
      active: true,
      createdAtMs: now,
      expiresAtMs: now + 60_000,
      messageRu: 'A',
    }, now);

    const snapshot = mergeAppMessagesWithStates(
      [dismissed],
      [{ messageId: 'm1', readAtMs: now - 1, dismissedAtMs: now, reaction: null, updatedAtMs: now }],
      now,
    );

    expect(snapshot.messages.map((m) => m.id)).toEqual(['m1']);
    expect(snapshot.messages[0].unread).toBe(false);
    expect(snapshot.unreadCount).toBe(0);
  });

  it('picks localized text with legacy backup and makes compact previews', () => {
    const message = normalizeAppMessage('m1', {
      titleRu: 'RU title',
      messageRu: 'One two three four five',
      titleUk: '',
      messageUk: '',
      titlePtBr: 'PT title',
      messagePtBr: 'PT body',
      titleVi: 'VI title',
      messageVi: 'VI body',
      titleId: 'ID title',
      messageId: 'ID body',
      titleTr: 'TR title',
      messageTr: 'TR body',
      titlePl: 'PL title',
      messagePl: 'PL body',
    }, now);

    expect(pickAppMessageText(message, 'uk')).toEqual({
      title: 'RU title',
      body: 'One two three four five',
    });
    expect(pickAppMessageText(message, 'pt-BR')).toEqual({ title: 'PT title', body: 'PT body' });
    expect(pickAppMessageText(message, 'vi')).toEqual({ title: 'VI title', body: 'VI body' });
    expect(pickAppMessageText(message, 'id')).toEqual({ title: 'ID title', body: 'ID body' });
    expect(pickAppMessageText(message, 'tr')).toEqual({ title: 'TR title', body: 'TR body' });
    expect(pickAppMessageText(message, 'pl')).toEqual({ title: 'PL title', body: 'PL body' });
    expect(buildAppMessagePreview('One\n\n two   three four', 13)).toBe('One two...');
  });

  it('does not route planned app messages through RU/UK/ES text', () => {
    const message = normalizeAppMessage('m-planned-missing', {
      titleRu: 'RU title',
      messageRu: 'RU body',
      titleUk: 'UK title',
      messageUk: 'UK body',
      titleEs: 'ES title',
      messageEs: 'ES body',
      createdAtMs: now,
    }, now);

    for (const lang of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(pickAppMessageText(message, lang)).toEqual({ title: '', body: '' });
    }
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

  it('always keeps VIP survey messages free-tier only, even if audience is all', () => {
    const surveyAll = normalizeAppMessage('survey-all', {
      active: true,
      kind: 'vip_survey',
      audience: 'all',
      createdAtMs: now,
      messageRu: 'Survey',
    }, now);
    const surveyPremium = normalizeAppMessage('survey-premium', {
      active: true,
      kind: 'vip_survey',
      audience: 'premium',
      createdAtMs: now - 1,
      messageRu: 'Survey',
    }, now);
    const snapshot = mergeAppMessagesWithStates([surveyAll, surveyPremium], [], now);

    expect(filterAppMessagesSnapshotForAudience(snapshot, false).messages.map((m) => m.id)).toEqual(['survey-all', 'survey-premium']);
    expect(filterAppMessagesSnapshotForAudience(snapshot, true).messages).toEqual([]);
    expect(filterAppMessagesSnapshotForAudience(snapshot, true).unreadCount).toBe(0);
  });

  it('filters messages by exact target app versions when provided', () => {
    const current = normalizeAppMessage('current', {
      active: true,
      audience: 'free',
      createdAtMs: now,
      messageRu: 'Current version only',
      targetAppVersions: ['1.5.41'],
    }, now);
    const other = normalizeAppMessage('other', {
      active: true,
      audience: 'free',
      createdAtMs: now - 1,
      messageRu: 'Other version only',
      targetAppVersions: ['1.5.40'],
    }, now);
    const allVersions = normalizeAppMessage('all-versions', {
      active: true,
      audience: 'free',
      createdAtMs: now - 2,
      messageRu: 'No version gate',
    }, now);
    const snapshot = mergeAppMessagesWithStates([current, other, allVersions], [], now);

    expect(filterAppMessagesSnapshotForAudience(snapshot, false, '1.5.41').messages.map((m) => m.id)).toEqual([
      'current',
      'all-versions',
    ]);
    expect(filterAppMessagesSnapshotForAudience(snapshot, false, '1.5.40').messages.map((m) => m.id)).toEqual([
      'other',
      'all-versions',
    ]);
    expect(filterAppMessagesSnapshotForAudience(snapshot, false, '1.5.42').messages.map((m) => m.id)).toEqual([
      'all-versions',
    ]);
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
        questionPtBr: 'O que adicionar agora?',
        questionVi: 'Nên thêm gì tiếp theo?',
        questionId: 'Apa yang perlu ditambahkan berikutnya?',
        questionTr: 'Sırada ne ekleyelim?',
        questionPl: 'Co dodać jako następne?',
        options: [
          { id: 'opt_1', textRu: 'Вызовы', textUk: 'Квізи', textPtBr: 'Quizzes', textVi: 'Câu đố', textId: 'Kuis', textTr: 'Quizler', textPl: 'Quizy' },
          { id: 'opt_2', textRu: 'Карточки', textUk: 'Картки', textPtBr: 'Cartões', textVi: 'Thẻ học', textId: 'Kartu', textTr: 'Kartlar', textPl: 'Fiszki' },
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
    expect(pickAppMessagePollQuestion(message.poll!, 'pt-BR')).toBe('O que adicionar agora?');
    expect(pickAppMessagePollOptionText(message.poll!.options[1], 'pl')).toBe('Fiszki');
    expect(snapshot.messages[0].pollOptionId).toBe('opt_2');
  });

  it('normalizes VIP survey messages and hides dismissed states', () => {
    const survey = normalizeAppMessage('survey1', {
      active: true,
      kind: 'vip_survey',
      titleRu: 'VIP',
      messageRu: 'Take survey',
      createdAtMs: now,
      vipSurvey: { surveyId: 'vip_feedback_v2', rewardDays: 30 },
    }, now);
    const normal = normalizeAppMessage('m1', {
      active: true,
      titleRu: 'Team',
      messageRu: 'News',
      createdAtMs: now - 1,
    }, now);

    expect(survey.kind).toBe('vip_survey');
    expect(survey.vipSurvey).toEqual({
      surveyId: 'vip_feedback_v2',
      rewardDays: 30,
      reviewUrlIos: '',
      reviewUrlAndroid: '',
    });

    const snapshot = mergeAppMessagesWithStates(
      [survey, normal],
      [normalizeAppMessageState('survey1', { dismissedAtMs: now + 1, updatedAtMs: now + 1 })],
      now,
    );

    expect(snapshot.messages.map((m) => m.id)).toEqual(['m1']);
    expect(snapshot.unreadCount).toBe(1);
  });

  it('seeds an admin VIP survey test as a local-only inbox message', async () => {
    const id = await seedLocalVipSurveyTestMessage(now);
    const rawMessages = await AsyncStorage.getItem('app_messages_local_preview_v1');
    const rawStates = await AsyncStorage.getItem('app_message_local_preview_states_v1');
    const messages = JSON.parse(rawMessages || '[]');
    const states = JSON.parse(rawStates || '[]');

    expect(id).toBe(`admin_test_vip_survey_${now}`);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id,
      kind: 'vip_survey',
      audience: 'free',
      titleRu: 'Хотите получить месяц VIP?',
      messageRu: 'Пройдите короткий опрос о приложении и активируйте 30 дней VIP.',
      vipSurvey: { surveyId: 'vip_feedback_v2', rewardDays: 30 },
    });
    expect(states).toEqual([]);
  });
});
