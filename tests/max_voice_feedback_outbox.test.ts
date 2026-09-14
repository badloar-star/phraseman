import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  dequeueVoiceFeedback,
  enqueueVoiceFeedback,
  FEEDBACK_OUTBOX_MAX_ENTRIES,
  FEEDBACK_OUTBOX_TTL_MS,
  flushVoiceFeedbackOutbox,
  listPendingVoiceFeedback,
} from '../app/max_voice_feedback_outbox';
import type { VoiceFeedbackInput } from '../app/max_voice_feedback_client';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');

const ACCOUNT = 'account-A';

function input(sessionId: string, message = 'Хорошо прошло'): VoiceFeedbackInput {
  return { sessionId, message, rating: 5, lang: 'ru' };
}

// зачем (владелец 2026-08-23): «исправь почему не отправляется». Корень —
// функция приёма отзывов ещё не в проде, поэтому вызов падал и отзыв пропадал.
// Очередь гарантирует, что написанное человеком не теряется ни при каком сбое.
describe('очередь отзывов о звонке MAX', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetAccountGenerationForTests();
    beginAccountGeneration(ACCOUNT);
  });

  it('не дописывает отзыв старого аккаунта во время transition lease', async () => {
    let releaseTransition!: () => void;
    let transitionStarted!: () => void;
    const started = new Promise<void>((resolve) => { transitionStarted = resolve; });
    const transition = withAccountTransitionLock(async () => {
      transitionStarted();
      await new Promise<void>((resolve) => { releaseTransition = resolve; });
    });
    await started;
    invalidateAccountGeneration();
    beginAccountGeneration('account-B');

    let enqueueSettled = false;
    const enqueue = enqueueVoiceFeedback(ACCOUNT, input('lease-race'))
      .finally(() => { enqueueSettled = true; });
    await Promise.resolve();
    await Promise.resolve();
    expect(enqueueSettled).toBe(false);
    expect(await AsyncStorage.getItem('max_voice_feedback_outbox_v1:account-A')).toBeNull();

    releaseTransition();
    await transition;
    await expect(enqueue).rejects.toThrow('max_feedback_generation_stale');
    expect(await AsyncStorage.getItem('max_voice_feedback_outbox_v1:account-A')).toBeNull();
  });

  it('не держит глобальный transition lease, пока сетевой send не завершён', async () => {
    await enqueueVoiceFeedback(ACCOUNT, input('network-pending'));
    let resolveSend!: () => void;
    let sendStarted!: () => void;
    const started = new Promise<void>((resolve) => { sendStarted = resolve; });
    const flush = flushVoiceFeedbackOutbox(ACCOUNT, async () => {
      sendStarted();
      await new Promise<void>((resolve) => { resolveSend = resolve; });
    });
    await started;

    let transitionStarted = false;
    const transition = withAccountTransitionLock(async () => { transitionStarted = true; });
    await Promise.resolve();
    await Promise.resolve();
    const transitionStartedBeforeResponse = transitionStarted;

    resolveSend();
    await expect(flush).resolves.toEqual({ sent: 1, left: 0 });
    await transition;
    expect(transitionStartedBeforeResponse).toBe(true);
  });

  it('не удаляет отзыв A по позднему сетевому ответу после перехода на B', async () => {
    await enqueueVoiceFeedback(ACCOUNT, input('late-response'));
    let resolveSend!: () => void;
    let sendStarted!: () => void;
    const started = new Promise<void>((resolve) => { sendStarted = resolve; });
    const sentOwners: string[] = [];
    const flush = flushVoiceFeedbackOutbox(ACCOUNT, async (_input, expectedStableUid) => {
      sentOwners.push(expectedStableUid);
      sendStarted();
      await new Promise<void>((resolve) => { resolveSend = resolve; });
    });
    await started;

    let switched = false;
    const transition = withAccountTransitionLock(async () => {
      invalidateAccountGeneration();
      beginAccountGeneration('account-B');
      switched = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    const switchedBeforeResponse = switched;

    resolveSend();
    const flushResult = await flush;
    await transition;
    expect(switchedBeforeResponse).toBe(true);
    expect(sentOwners).toEqual([ACCOUNT]);
    expect(flushResult).toEqual({ sent: 0, left: 1 });
    expect(await AsyncStorage.getItem('max_voice_feedback_outbox_v1:account-B')).toBeNull();
    expect(await AsyncStorage.getItem('max_voice_feedback_outbox_v1:account-A')).not.toBeNull();
  });

  it('сохраняет отзыв и переживает перезапуск приложения', async () => {
    await enqueueVoiceFeedback(ACCOUNT, input('s1'));
    const pending = await listPendingVoiceFeedback(ACCOUNT);
    expect(pending).toHaveLength(1);
    expect(pending[0].input.sessionId).toBe('s1');
    expect(pending[0].input.message).toBe('Хорошо прошло');
    expect(pending[0].expectedStableUid).toBe(ACCOUNT);
  });

  it('держит один отзыв на звонок: повторная отправка заменяет прежний', async () => {
    await enqueueVoiceFeedback(ACCOUNT, input('s1', 'первый'));
    await enqueueVoiceFeedback(ACCOUNT, input('s1', 'исправленный'));
    const pending = await listPendingVoiceFeedback(ACCOUNT);
    expect(pending).toHaveLength(1);
    expect(pending[0].input.message).toBe('исправленный');
  });

  it('разделяет очереди разных аккаунтов', async () => {
    await enqueueVoiceFeedback(ACCOUNT, input('s1'));
    beginAccountGeneration('account-B');
    await enqueueVoiceFeedback('account-B', input('s2'));
    expect(await listPendingVoiceFeedback('account-B')).toHaveLength(1);
    beginAccountGeneration(ACCOUNT);
    expect(await listPendingVoiceFeedback(ACCOUNT)).toHaveLength(1);
  });

  it('забывает отзывы старше суток', async () => {
    const queuedAt = 1_000_000;
    await enqueueVoiceFeedback(ACCOUNT, input('s1'), queuedAt);
    const stillFresh = await listPendingVoiceFeedback(ACCOUNT, queuedAt + FEEDBACK_OUTBOX_TTL_MS - 1);
    expect(stillFresh).toHaveLength(1);
    const expired = await listPendingVoiceFeedback(ACCOUNT, queuedAt + FEEDBACK_OUTBOX_TTL_MS + 1);
    expect(expired).toHaveLength(0);
  });

  it('не копит бесконечно: держит только самые свежие записи', async () => {
    for (let i = 0; i < FEEDBACK_OUTBOX_MAX_ENTRIES + 3; i += 1) {
      await enqueueVoiceFeedback(ACCOUNT, input(`s${i}`));
    }
    const pending = await listPendingVoiceFeedback(ACCOUNT);
    expect(pending).toHaveLength(FEEDBACK_OUTBOX_MAX_ENTRIES);
    // Осталась именно свежая часть, а не первые попавшие.
    expect(pending[pending.length - 1].input.sessionId).toBe(`s${FEEDBACK_OUTBOX_MAX_ENTRIES + 2}`);
  });

  it('досылает очередь и очищает доставленное', async () => {
    await enqueueVoiceFeedback(ACCOUNT, input('s1'));
    await enqueueVoiceFeedback(ACCOUNT, input('s2'));
    const sent: string[] = [];
    const result = await flushVoiceFeedbackOutbox(ACCOUNT, async (row) => {
      sent.push(row.sessionId);
    });
    expect(sent).toEqual(['s1', 's2']);
    expect(result).toEqual({ sent: 2, left: 0 });
    expect(await listPendingVoiceFeedback(ACCOUNT)).toHaveLength(0);
  });

  it('при недоступной функции сохраняет отзыв и не перебирает остаток впустую', async () => {
    await enqueueVoiceFeedback(ACCOUNT, input('s1'));
    await enqueueVoiceFeedback(ACCOUNT, input('s2'));
    let calls = 0;
    const result = await flushVoiceFeedbackOutbox(ACCOUNT, async () => {
      calls += 1;
      throw new Error('unavailable');
    });
    // Ровно одна попытка: очередь заведомо провальных вызовов не нужна.
    expect(calls).toBe(1);
    expect(result.sent).toBe(0);
    expect(await listPendingVoiceFeedback(ACCOUNT)).toHaveLength(2);
  });

  it('снимает доставленный отзыв из очереди', async () => {
    await enqueueVoiceFeedback(ACCOUNT, input('s1'));
    await dequeueVoiceFeedback(ACCOUNT, 's1');
    expect(await listPendingVoiceFeedback(ACCOUNT)).toHaveLength(0);
  });

  it('переживает битое содержимое хранилища, не роняя экран разбора', async () => {
    await AsyncStorage.setItem('max_voice_feedback_outbox_v1:account-A', '{не json');
    expect(await listPendingVoiceFeedback(ACCOUNT)).toEqual([]);
  });

  it('не усыновляет legacy-запись без owner UID текущим аккаунтом B', async () => {
    beginAccountGeneration('account-B');
    await AsyncStorage.setItem('max_voice_feedback_outbox_v1:account-B', JSON.stringify([{
      input: input('legacy-A', 'Старый приватный отзыв A'),
      queuedAtMs: Date.now(),
    }]));
    const send = jest.fn(async () => undefined);

    await expect(flushVoiceFeedbackOutbox('account-B', send)).resolves.toEqual({ sent: 0, left: 0 });
    expect(send).not.toHaveBeenCalled();
  });
});
