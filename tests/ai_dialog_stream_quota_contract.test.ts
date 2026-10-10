import { parseDialogStreamDoneFrame } from '../app/ai_dialog_stream_client';

// зачем (10.10): квота месячная (D111) — сброс обязан быть на границе календарного месяца UTC.
const validDoneFrame = {
  type: 'done' as const,
  assistantMessage: 'Hola',
  turnState: null,
  coach: null,
  remainingQuota: 3,
  resetAtMs: Date.UTC(2026, 9, 1),
  quotaVersion: 7,
  model: 'dialog-model',
};

test('stream done frame accepts only strict server quota numbers', () => {
  expect(parseDialogStreamDoneFrame(validDoneFrame)).toMatchObject({
    remainingQuota: 3,
    resetAtMs: Date.UTC(2026, 9, 1),
    quotaVersion: 7,
  });
  expect(parseDialogStreamDoneFrame({ ...validDoneFrame, remainingQuota: '3' })).toBeNull();
  expect(parseDialogStreamDoneFrame({ ...validDoneFrame, resetAtMs: String(validDoneFrame.resetAtMs) })).toBeNull();
  expect(parseDialogStreamDoneFrame({ ...validDoneFrame, quotaVersion: '7' })).toBeNull();
});
