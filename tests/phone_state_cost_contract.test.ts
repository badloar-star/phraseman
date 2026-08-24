import {
  synchronizedDevices,
  traceForegroundSync,
  traceLessonSync,
} from '../modules/phone-state/testing/sync_cost_trace';

test('twenty-answer lesson costs one segment create and no callable', async () => {
  const trace = await traceLessonSync({ answers: 20 });
  expect(trace).toMatchObject({
    segmentCreates: 1,
    progressCallables: 0,
    transactions: 0,
  });
});

test('empty foreground is network quiet for personal progress', async () => {
  const trace = await traceForegroundSync({
    localDirty: false,
    remoteHeadsUnchanged: true,
  });
  expect(trace.progressWrites).toBe(0);
  expect(trace.segmentReads).toBe(0);
});

test('second sync reads only unseen tail', async () => {
  const harness = await synchronizedDevices({ initialSegments: 100 });
  await harness.sync();
  harness.appendRemoteSegments(2);
  expect((await harness.sync()).segmentReads).toBe(2);
});
