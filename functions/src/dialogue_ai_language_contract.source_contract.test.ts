import fs from 'fs';
import path from 'path';

function source(name: string): string {
  return fs.readFileSync(path.join(__dirname, name), 'utf8');
}

function between(fullSource: string, start: string, end?: string): string {
  const startIndex = fullSource.indexOf(start);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  const endIndex = end ? fullSource.indexOf(end, startIndex + start.length) : fullSource.length;
  expect(endIndex).toBeGreaterThan(startIndex);
  return fullSource.slice(startIndex, endIndex);
}

function expectBefore(segment: string, first: string, second: string): void {
  const firstIndex = segment.indexOf(first);
  const secondIndex = segment.indexOf(second);
  expect(firstIndex).toBeGreaterThanOrEqual(0);
  expect(secondIndex).toBeGreaterThan(firstIndex);
}

describe('dialogue pack binding source contract', () => {
  it('resolves send and translation bindings before their warmup exits', () => {
    const callableSource = source('premium_dialog.ts');
    const send = between(callableSource, 'export const premiumDialogSend', 'export const premiumDialogTranslate');
    const translate = between(callableSource, 'export const premiumDialogTranslate');

    expectBefore(send, 'resolveDialogueTargetBeforeWarmup(', 'warmupPing === true');
    expectBefore(translate, 'resolveDialogueTargetBeforeWarmup(', 'warmupPing === true');
  });

  it('resolves stream binding before warmup and preserves exact contract errors', () => {
    const stream = between(source('premium_dialog_stream.ts'), 'export const premiumDialogStream');
    expectBefore(stream, 'resolveDialogueTargetBeforeWarmup(', 'warmupPing === true');
    expect(stream).toContain('dialogueContractHttpError(error)');
  });

  it('resolves review binding before request-derived work', () => {
    const review = between(source('premium_dialog_review.ts'), 'export const premiumDialogReview');
    expectBefore(review, 'resolveDialogueTargetBeforeWarmup(', 'sanitizeReviewHistory(data.history)');
  });
});
