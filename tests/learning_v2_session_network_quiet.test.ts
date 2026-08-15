import {
  __resetInteractiveNetworkQuietForTests,
  interactiveNetworkQuietSnapshot,
  withBackgroundNetworkLease,
} from '../app/interactive_network_quiet';
import {
  __resetLearningV2SessionNetworkIntentForTests,
  captureLearningV2SessionNetworkIntentFrameReleaseTarget,
  cancelPreparedLearningV2SessionNetworkIntent,
  claimLearningV2SessionNetworkIntent,
  isLearningV2SessionNetworkIntentReady,
  learningV2SessionNetworkIntentSnapshot,
  markLearningV2SessionExitPending,
  markLearningV2SessionResultPending,
  prepareLearningV2SessionNetworkIntent,
  releaseLearningV2SessionNetworkIntent,
  releaseLearningV2SessionNetworkIntentAfterExitFrame,
  releaseLearningV2SessionNetworkIntentAfterResultFrame,
  restoreLearningV2SessionNetworkIntentAfterNavigationFailure,
  waitForLearningV2SessionNetworkIntent,
} from '../app/learning_v2_session_network_quiet';

beforeEach(() => {
  __resetLearningV2SessionNetworkIntentForTests();
  __resetInteractiveNetworkQuietForTests();
});

test('map preparation transfers the same uninterrupted quiet epoch into session', async () => {
  const offered = prepareLearningV2SessionNetworkIntent('lesson-1-understand-1');
  expect(interactiveNetworkQuietSnapshot().activeHandles).toBe(1);
  const claimed = claimLearningV2SessionNetworkIntent('lesson-1-understand-1');
  expect(claimed).toBe(offered);
  expect(interactiveNetworkQuietSnapshot().activeHandles).toBe(1);
  await waitForLearningV2SessionNetworkIntent(claimed);
  expect(isLearningV2SessionNetworkIntentReady(claimed)).toBe(true);
  expect(learningV2SessionNetworkIntentSnapshot()).toMatchObject({
    active: true, owner: 'session', sessionId: 'lesson-1-understand-1', ready: true,
  });
});

test('deep-link claim mounts locally but readiness waits for real admitted settlement', async () => {
  let releaseNative!: () => void;
  const native = new Promise<void>((resolve) => { releaseNative = resolve; });
  const running = withBackgroundNetworkLease('completion.sync.test', async () => native);
  await Promise.resolve();

  const intent = claimLearningV2SessionNetworkIntent('lesson-1-use-2');
  let ready = false;
  const waiting = waitForLearningV2SessionNetworkIntent(intent).then(() => { ready = true; });
  await Promise.resolve();
  expect(ready).toBe(false);
  expect(isLearningV2SessionNetworkIntentReady(intent)).toBe(false);

  releaseNative();
  await expect(running).rejects.toThrow('interactive_network_deferred');
  await waiting;
  expect(ready).toBe(true);
});

test('sheet dismiss releases only an unclaimed map intent', async () => {
  prepareLearningV2SessionNetworkIntent('lesson-1-master-4');
  cancelPreparedLearningV2SessionNetworkIntent('lesson-1-master-4');
  await Promise.resolve();
  expect(learningV2SessionNetworkIntentSnapshot().active).toBe(false);
  expect(interactiveNetworkQuietSnapshot().phase).toBe('open');

  const claimed = claimLearningV2SessionNetworkIntent('lesson-1-master-4');
  cancelPreparedLearningV2SessionNetworkIntent('lesson-1-master-4');
  expect(learningV2SessionNetworkIntentSnapshot().owner).toBe('session');
  releaseLearningV2SessionNetworkIntent(claimed);
  await Promise.resolve();
});

test('successful result keeps admission closed across replace until recovered map frame', async () => {
  const intent = claimLearningV2SessionNetworkIntent('lesson-1-understand-2');
  await waitForLearningV2SessionNetworkIntent(intent);
  markLearningV2SessionResultPending(intent);
  releaseLearningV2SessionNetworkIntent(intent);
  await Promise.resolve();
  expect(interactiveNetworkQuietSnapshot().phase).toBe('quiet');
  expect(learningV2SessionNetworkIntentSnapshot().owner).toBe('result');

  releaseLearningV2SessionNetworkIntentAfterResultFrame(
    captureLearningV2SessionNetworkIntentFrameReleaseTarget('result'),
  );
  await Promise.resolve();
  expect(interactiveNetworkQuietSnapshot().phase).toBe('open');
  expect(learningV2SessionNetworkIntentSnapshot().active).toBe(false);
});

test('a stale painted-frame target cannot release a newer result handoff', async () => {
  const first = claimLearningV2SessionNetworkIntent('lesson-1-understand-2');
  await waitForLearningV2SessionNetworkIntent(first);
  markLearningV2SessionResultPending(first);
  const staleTarget = captureLearningV2SessionNetworkIntentFrameReleaseTarget('result');

  const prepared = prepareLearningV2SessionNetworkIntent('lesson-1-understand-3');
  const current = claimLearningV2SessionNetworkIntent('lesson-1-understand-3');
  expect(current).toBe(prepared);
  markLearningV2SessionResultPending(current);
  releaseLearningV2SessionNetworkIntentAfterResultFrame(staleTarget);
  expect(learningV2SessionNetworkIntentSnapshot()).toMatchObject({
    active: true,
    owner: 'result',
    sessionId: 'lesson-1-understand-3',
  });

  releaseLearningV2SessionNetworkIntentAfterResultFrame(
    captureLearningV2SessionNetworkIntentFrameReleaseTarget('result'),
  );
  await Promise.resolve();
  expect(learningV2SessionNetworkIntentSnapshot().active).toBe(false);
});

test('an exit target cannot cross an exit to session to exit ownership cycle', async () => {
  const intent = claimLearningV2SessionNetworkIntent('lesson-1-understand-4');
  markLearningV2SessionExitPending(intent);
  const staleExit = captureLearningV2SessionNetworkIntentFrameReleaseTarget('exit');
  const reclaimed = claimLearningV2SessionNetworkIntent('lesson-1-understand-4');
  expect(reclaimed).toBe(intent);
  markLearningV2SessionExitPending(intent);

  releaseLearningV2SessionNetworkIntentAfterExitFrame(staleExit);
  expect(learningV2SessionNetworkIntentSnapshot()).toMatchObject({
    active: true,
    owner: 'exit',
  });
  releaseLearningV2SessionNetworkIntentAfterExitFrame(
    captureLearningV2SessionNetworkIntentFrameReleaseTarget('exit'),
  );
  await Promise.resolve();
  expect(learningV2SessionNetworkIntentSnapshot().active).toBe(false);
});

test('a result target cannot cross a result to session to result ownership cycle', async () => {
  const intent = claimLearningV2SessionNetworkIntent('lesson-1-use-1');
  markLearningV2SessionResultPending(intent);
  const staleResult = captureLearningV2SessionNetworkIntentFrameReleaseTarget('result');
  restoreLearningV2SessionNetworkIntentAfterNavigationFailure(intent);
  markLearningV2SessionResultPending(intent);

  releaseLearningV2SessionNetworkIntentAfterResultFrame(staleResult);
  expect(learningV2SessionNetworkIntentSnapshot()).toMatchObject({
    active: true,
    owner: 'result',
  });
  releaseLearningV2SessionNetworkIntentAfterResultFrame(
    captureLearningV2SessionNetworkIntentFrameReleaseTarget('result'),
  );
  await Promise.resolve();
  expect(learningV2SessionNetworkIntentSnapshot().active).toBe(false);
});

test('navigation failure restores session ownership without an admission gap', async () => {
  const intent = claimLearningV2SessionNetworkIntent('lesson-1-use-3');
  await waitForLearningV2SessionNetworkIntent(intent);
  markLearningV2SessionResultPending(intent);
  restoreLearningV2SessionNetworkIntentAfterNavigationFailure(intent);
  expect(learningV2SessionNetworkIntentSnapshot()).toMatchObject({
    owner: 'session', ready: true,
  });
  expect(interactiveNetworkQuietSnapshot().phase).toBe('quiet');
  releaseLearningV2SessionNetworkIntent(intent);
  await Promise.resolve();
});

test('early exit remains quiet until a destination frame acknowledges it', async () => {
  const intent = claimLearningV2SessionNetworkIntent('lesson-1-master-1');
  await waitForLearningV2SessionNetworkIntent(intent);
  markLearningV2SessionExitPending(intent);
  releaseLearningV2SessionNetworkIntent(intent);
  await Promise.resolve();
  expect(interactiveNetworkQuietSnapshot().phase).toBe('quiet');
  expect(learningV2SessionNetworkIntentSnapshot().owner).toBe('exit');

  releaseLearningV2SessionNetworkIntentAfterExitFrame(
    captureLearningV2SessionNetworkIntentFrameReleaseTarget('exit'),
  );
  await Promise.resolve();
  expect(interactiveNetworkQuietSnapshot().phase).toBe('open');
});

test('a new map tap after result frame replaces ownership without reopening admission', async () => {
  const first = claimLearningV2SessionNetworkIntent('lesson-1-use-3');
  await waitForLearningV2SessionNetworkIntent(first);
  markLearningV2SessionResultPending(first);

  const next = prepareLearningV2SessionNetworkIntent('lesson-1-use-4');
  expect(next).not.toBe(first);
  await Promise.resolve();
  expect(interactiveNetworkQuietSnapshot()).toMatchObject({
    phase: 'quiet', activeHandles: 1,
  });
  expect(learningV2SessionNetworkIntentSnapshot()).toMatchObject({
    owner: 'map', sessionId: 'lesson-1-use-4', ready: true,
  });
});

test('bounds identity to the exact supported session id', () => {
  expect(() => prepareLearningV2SessionNetworkIntent('lesson-2-use-1'))
    .toThrow('learning_v2_session_intent_invalid');
});
