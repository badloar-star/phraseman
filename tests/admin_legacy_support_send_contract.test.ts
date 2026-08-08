import fs from 'node:fs';
import path from 'node:path';

const legacy = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8');

function functionBlock(startMarker: string, endMarker: string): string {
  const start = legacy.indexOf(startMarker);
  const end = legacy.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return legacy.slice(start, end);
}

describe('Legacy admin support mail delivery contract', () => {
  test('single reply is prepared, previewed, and dispatched with the sealed operation fields', () => {
    const block = functionBlock(
      'window.supportSendOne = async function(id)',
      'window.supportSendAllDrafts = async function()',
    );

    const prepareIndex = block.indexOf("supportCallable('adminSupportPrepareReply')");
    const previewIndex = block.indexOf('showSupportReplyConfirmation');
    const dispatchIndex = block.indexOf("supportCallable('adminSupportDispatchReply')");

    expect(prepareIndex).toBeGreaterThanOrEqual(0);
    expect(previewIndex).toBeGreaterThan(prepareIndex);
    expect(dispatchIndex).toBeGreaterThan(previewIndex);
    expect(block).toContain('expectedDraftRevision');
    expect(block).toContain('operationId: prepared.operationId');
    expect(block).toContain('confirmationNonce: prepared.confirmationNonce');
    expect(block).toContain('payloadHash: prepared.payloadHash');
    expect(block).toContain("supportCallable('adminSupportCancelReply')");
  });

  test('bulk reply is prepared, previewed, and dispatched with the sealed batch fields', () => {
    const block = functionBlock(
      'window.supportSendAllDrafts = async function()',
      'window.supportSetStatus = async function(id, status)',
    );

    const prepareIndex = block.indexOf("supportCallable('adminSupportPrepareReplyBatch')");
    const previewIndex = block.indexOf('showSupportReplyConfirmation');
    const dispatchIndex = block.indexOf("supportCallable('adminSupportDispatchReplyBatch')");

    expect(prepareIndex).toBeGreaterThanOrEqual(0);
    expect(previewIndex).toBeGreaterThan(prepareIndex);
    expect(dispatchIndex).toBeGreaterThan(previewIndex);
    expect(block).toContain('batchId: prepared.batchId');
    expect(block).toContain('confirmationNonce: prepared.confirmationNonce');
    expect(block).toContain('manifestHash: prepared.manifestHash');
    expect(block).toContain("supportCallable('adminSupportCancelReplyBatch')");
  });

  test('legacy support actions no longer use the removed mutable send payload', () => {
    const block = functionBlock(
      'window.supportSendOne = async function(id)',
      'window.supportSetStatus = async function(id, status)',
    );

    expect(block).not.toContain("supportCallable('adminSupportSendReply')");
  });
});
