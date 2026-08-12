import {
  __resetInteractiveNetworkQuietForTests,
  beginInteractiveNetworkQuiet,
  interactiveNetworkQuietSnapshot,
  isInteractiveNetworkQuietReady,
  registerInteractiveNetworkQuietParticipant,
  releaseInteractiveNetworkQuiet,
  waitForInteractiveNetworkQuiet,
  withBackgroundNetworkLease,
  isInteractiveNetworkDeferredError,
} from '../app/interactive_network_quiet';

beforeEach(() => __resetInteractiveNetworkQuietForTests());

test('closes admission synchronously and reopens only after the final handle releases', async () => {
  const first = beginInteractiveNetworkQuiet();
  const second = beginInteractiveNetworkQuiet();
  await waitForInteractiveNetworkQuiet(first);
  expect(isInteractiveNetworkQuietReady(second)).toBe(true);
  await expect(withBackgroundNetworkLease('completion.sync', async () => true))
    .rejects.toThrow('interactive_network_deferred');

  releaseInteractiveNetworkQuiet(first);
  await Promise.resolve();
  expect(interactiveNetworkQuietSnapshot().phase).toBe('quiet');
  releaseInteractiveNetworkQuiet(second);
  await Promise.resolve();
  expect(interactiveNetworkQuietSnapshot()).toMatchObject({
    phase: 'open', activeHandles: 0, activeNetworkLeases: 0,
  });
});

test('aborts a cancellable operation and fences readiness on actual settlement', async () => {
  let signal: AbortSignal | undefined;
  let releaseTransport!: () => void;
  const transport = new Promise<void>((resolve) => { releaseTransport = resolve; });
  const running = withBackgroundNetworkLease('completion.sync', async (lease) => {
    signal = lease.signal;
    await transport;
    lease.assertCurrent();
  });
  await Promise.resolve();
  const quiet = beginInteractiveNetworkQuiet();
  expect(signal?.aborted).toBe(true);
  let ready = false;
  const waiting = waitForInteractiveNetworkQuiet(quiet).then(() => { ready = true; });
  await Promise.resolve();
  expect(ready).toBe(false);
  releaseTransport();
  await expect(running).rejects.toThrow('interactive_network_deferred');
  await waiting;
  expect(ready).toBe(true);
});

test('never launders a hung non-cancellable operation through a timeout', async () => {
  let releaseNative!: () => void;
  const native = new Promise<void>((resolve) => { releaseNative = resolve; });
  const running = withBackgroundNetworkLease('firebase.native', async () => native);
  await Promise.resolve();
  const quiet = beginInteractiveNetworkQuiet();
  let ready = false;
  const waiting = waitForInteractiveNetworkQuiet(quiet).then(() => { ready = true; });
  await Promise.resolve();
  await Promise.resolve();
  expect(ready).toBe(false);
  expect(interactiveNetworkQuietSnapshot()).toMatchObject({
    phase: 'quiescing', activeNetworkLeases: 1,
  });
  releaseNative();
  await expect(running).rejects.toThrow('interactive_network_deferred');
  await waiting;
});

test('an old release cannot reopen admission across an ABA route hand-off', async () => {
  const old = beginInteractiveNetworkQuiet();
  await waitForInteractiveNetworkQuiet(old);
  releaseInteractiveNetworkQuiet(old);
  const replacement = beginInteractiveNetworkQuiet();
  await Promise.resolve();
  await waitForInteractiveNetworkQuiet(replacement);
  expect(interactiveNetworkQuietSnapshot().phase).toBe('quiet');
  expect(() => releaseInteractiveNetworkQuiet(old))
    .toThrow('interactive_network_quiet_handle_invalid');
  releaseInteractiveNetworkQuiet(replacement);
  await Promise.resolve();
  expect(interactiveNetworkQuietSnapshot().phase).toBe('open');
});

test('rejects malformed sources before invoking work', async () => {
  const work = jest.fn(async () => true);
  await expect(withBackgroundNetworkLease('Bad Source', work))
    .rejects.toThrow('interactive_network_source_invalid');
  expect(work).not.toHaveBeenCalled();
});

test('does not classify an unrelated same-message error as coordinator deferral', () => {
  expect(isInteractiveNetworkDeferredError(new Error('interactive_network_deferred'))).toBe(false);
});

test('bounds leaked quiet handles', () => {
  const leaked = Array.from({ length: 16 }, () => beginInteractiveNetworkQuiet());
  expect(() => beginInteractiveNetworkQuiet())
    .toThrow('interactive_network_quiet_handle_capacity');
  leaked.forEach(releaseInteractiveNetworkQuiet);
});

test('waits for registered subsystem quiescence and resumes it after final release', async () => {
  let settleParticipant!: () => void;
  const participantSettlement = new Promise<void>((resolve) => {
    settleParticipant = resolve;
  });
  const resume = jest.fn();
  const unregister = registerInteractiveNetworkQuietParticipant(
    'firebase.app_check_refresh.test',
    { quiesce: () => participantSettlement, resume },
  );
  try {
    const quiet = beginInteractiveNetworkQuiet();
    let ready = false;
    const waiting = waitForInteractiveNetworkQuiet(quiet).then(() => { ready = true; });
    await Promise.resolve();
    expect(ready).toBe(false);
    expect(interactiveNetworkQuietSnapshot().phase).toBe('quiescing');

    settleParticipant();
    await waiting;
    expect(isInteractiveNetworkQuietReady(quiet)).toBe(true);
    releaseInteractiveNetworkQuiet(quiet);
    await Promise.resolve();
    expect(resume).toHaveBeenCalledTimes(1);
  } finally {
    __resetInteractiveNetworkQuietForTests();
    unregister();
  }
});

test('rejects a participant registered after readiness so SESSION_READY stays monotonic', async () => {
  const quiet = beginInteractiveNetworkQuiet();
  await waitForInteractiveNetworkQuiet(quiet);
  expect(() => registerInteractiveNetworkQuietParticipant(
    'firebase.late_refresh.test',
    { quiesce: () => undefined, resume: () => undefined },
  )).toThrow('interactive_network_participants_sealed');
  expect(interactiveNetworkQuietSnapshot().phase).toBe('quiet');
  expect(isInteractiveNetworkQuietReady(quiet)).toBe(true);
  releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
});

test('cannot unregister a participant while a quiet handle still depends on it', async () => {
  const unregister = registerInteractiveNetworkQuietParticipant(
    'firebase.unregister_guard.test',
    { quiesce: () => undefined, resume: () => undefined },
  );
  const quiet = beginInteractiveNetworkQuiet();
  await waitForInteractiveNetworkQuiet(quiet);
  expect(unregister).toThrow('interactive_network_participant_in_use');
  releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
  expect(unregister).toThrow('interactive_network_participant_in_use');
  __resetInteractiveNetworkQuietForTests();
  expect(unregister).not.toThrow();
});
