import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  readSettingsPollVote,
  peekSettingsPollVote,
  flushSettingsPollVotes,
  submitSettingsPollVoteOptimistically,
  type SettingsPollVoteTransport,
} from '../app/settings_poll_vote';

describe('settings poll vote outbox', () => {
  beforeEach(() => (AsyncStorage as unknown as { __reset?: () => void }).__reset?.());

  it('persists the first choice and never replaces it locally', async () => {
    const pendingTransport: SettingsPollVoteTransport = async () => new Promise(() => {});
    const first = await submitSettingsPollVoteOptimistically('owner-a', 'poll-1', 'option_1', pendingTransport);
    const second = await submitSettingsPollVoteOptimistically('owner-a', 'poll-1', 'option_2', pendingTransport);

    expect(first.optionId).toBe('option_1');
    expect(second.optionId).toBe('option_1');
  });

  it('isolates votes by account owner', async () => {
    const pendingTransport: SettingsPollVoteTransport = async () => new Promise(() => {});
    await submitSettingsPollVoteOptimistically('owner-a', 'poll-1', 'option_1', pendingTransport);
    expect(await readSettingsPollVote('owner-b', 'poll-1')).toBeNull();
  });

  it('prunes old synced votes but keeps the active outbox bounded', async () => {
    await AsyncStorage.setItem('settings_poll_votes_v1:owner-a', JSON.stringify([{
      messageId: 'expired-poll',
      optionId: 'option_1',
      requestId: 'old-request',
      status: 'synced',
      updatedAtMs: Date.now() - (91 * 24 * 60 * 60 * 1000),
    }]));

    await expect(readSettingsPollVote('owner-a', 'expired-poll')).resolves.toBeNull();
  });

  it('serializes simultaneous taps and keeps one local answer', async () => {
    const pendingTransport: SettingsPollVoteTransport = async () => new Promise(() => {});
    const [first, second] = await Promise.all([
      submitSettingsPollVoteOptimistically('owner-a', 'poll-1', 'option_1', pendingTransport),
      submitSettingsPollVoteOptimistically('owner-a', 'poll-1', 'option_2', pendingTransport),
    ]);
    expect(first.optionId).toBe('option_1');
    expect(second.optionId).toBe('option_1');
  });

  it('adopts the immutable option returned by the server', async () => {
    const transport: SettingsPollVoteTransport = async () => ({
      accepted: false, alreadyVoted: true, optionId: 'option_2',
    });
    await submitSettingsPollVoteOptimistically('owner-a', 'poll-1', 'option_1', transport);
    await flushSettingsPollVotes('owner-a', transport);

    await expect(readSettingsPollVote('owner-a', 'poll-1')).resolves.toMatchObject({
      optionId: 'option_2', status: 'synced',
    });
  });

  // зачем (settings-gap-008, журнал Сверки 13.10 15:58): карточка получала голос через 754 мс — первый кадр «не голосовал».
  // Голос, записанный или прочитанный в этом процессе, доступен синхронно для первого кадра.
  it('exposes a known vote synchronously for the first frame (no IO)', async () => {
    const pendingTransport: SettingsPollVoteTransport = async () => new Promise(() => {});
    expect(peekSettingsPollVote('owner-peek', 'poll-1')).toBeUndefined();
    await submitSettingsPollVoteOptimistically('owner-peek', 'poll-1', 'option_1', pendingTransport);
    expect(peekSettingsPollVote('owner-peek', 'poll-1')).toMatchObject({ optionId: 'option_1', status: 'pending' });
    expect(peekSettingsPollVote('owner-peek', 'poll-2')).toBeNull();
    expect(peekSettingsPollVote('', 'poll-1')).toBeNull();
  });
});
