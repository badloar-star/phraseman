import { parseDialogStreamDoneFrame } from '../app/ai_dialog_stream_client';

const validDoneFrame = {
  type: 'done' as const,
  assistantMessage: 'Hola',
  turnState: null,
  coach: null,
  remainingQuota: 3,
  resetAtMs: Date.UTC(2026, 8, 21),
  quotaVersion: 7,
  model: 'dialog-model',
};

test('stream done frame accepts only strict server quota numbers', () => {
  expect(parseDialogStreamDoneFrame(validDoneFrame)).toMatchObject({
    remainingQuota: 3,
    resetAtMs: Date.UTC(2026, 8, 21),
    quotaVersion: 7,
  });
  expect(parseDialogStreamDoneFrame({ ...validDoneFrame, remainingQuota: '3' })).toBeNull();
  expect(parseDialogStreamDoneFrame({ ...validDoneFrame, resetAtMs: String(validDoneFrame.resetAtMs) })).toBeNull();
  expect(parseDialogStreamDoneFrame({ ...validDoneFrame, quotaVersion: '7' })).toBeNull();
});
