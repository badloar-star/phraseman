import fs from 'node:fs';
import path from 'node:path';

const legacy = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'legacy.html'), 'utf8');

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
      'window.supportSetStatus = async function(id, status, button)',
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
      'window.supportSetStatus = async function(id, status, button)',
    );

    expect(block).not.toContain("supportCallable('adminSupportSendReply')");
  });

  test('guarded automation has a visible kill switch, limits, CAS revision and audit callable', () => {
    expect(legacy).toContain('id="gsi-auto-mode"');
    expect(legacy).toContain('<option value="live_guarded">Автоотправка через 3 часа</option>');
    expect(legacy).toContain('<option value="shadow">Только подтверждение вручную</option>');
    expect(legacy).toContain('<option value="off">Выключено</option>');
    const block = functionBlock('window.supportSaveAutomation = async function()', 'window.loadUserReports = async function()');
    expect(block).toContain("supportCallable('adminSupportSaveAutomation')");
    expect(block).toContain('expectedRevision: _supportAutomationRevision');
    expect(block).toContain('dailyCap');
    expect(block).toContain('perSenderDailyCap');
  });

  test('prepared queue persists manual edits and explains the Telegram re-review', () => {
    expect(legacy).toContain('id="gsi-prepared-list"');
    expect(legacy).toContain('💾 Сохранить правки');
    const block = functionBlock('window.supportSaveDraft = async function(id)', 'window.supportSendOne = async function(id)');
    expect(block).toContain("supportCallable('adminSupportSaveDraft')");
    expect(block).toContain('expectedDraftRevision');
    expect(block).toContain('Новая версия отправлена вам в Telegram');
  });

  test('support cards load one isolated conversation through the permission-checked callable', () => {
    expect(legacy).toContain('История переписки');
    const block = functionBlock(
      'window.supportToggleConversation = async function(messageId, conversationId, button)',
      'window.supportPullMail = async function()',
    );
    expect(block).toContain("supportCallable('adminSupportConversation')");
    expect(block).toContain('Пользователь');
    expect(block).toContain('Поддержка');
    expect(block).toContain('escapeHtml');
  });

  test('Jarvis briefing is editable, byte-bounded, revisioned and saved without HTML rendering', () => {
    expect(legacy).toContain('id="gsi-owner-instructions"');
    expect(legacy).toContain('id="gsi-instructions-status"');
    expect(legacy).toContain('id="gsi-instructions-count"');
    const block = functionBlock('window.supportSaveInstructions = async function()', 'window.loadUserReports = async function()');
    expect(block).toContain("supportCallable('adminSupportSaveInstructions')");
    expect(block).toContain('expectedRevision: _supportInstructionsRevision');
    expect(block).toContain('supportInstructionByteLength(text)');
    expect(block).not.toContain('innerHTML');
  });

  test('single and visible bulk archive use one guarded server archive callable with loading and result feedback', () => {
    expect(legacy).toContain('id="gsi-archive-all"');
    expect(legacy).toContain('Архивировать все показанные');
    const single = functionBlock(
      'window.supportSetStatus = async function(id, status, button)',
      'window.supportArchiveAllVisible = async function()',
    );
    expect(single).toContain("supportCallable('adminSupportArchiveMessages')");
    expect(single).toContain('button.disabled = true');
    expect(single).toContain('Письмо перемещено в архив');

    const bulk = functionBlock(
      'window.supportArchiveAllVisible = async function()',
      'window.supportSaveSignature = async function()',
    );
    expect(bulk).toContain("supportCallable('adminSupportArchiveMessages')");
    expect(bulk).toContain('selectSupportInboxRows(statusFilter).visibleArchiveTargets');
    expect(bulk).toContain('items: targets.map((row) => ({');
    expect(bulk).toContain('expectedStatus: row.status');
    expect(bulk).toContain('expectedDraftRevision');
    expect(bulk).not.toContain('showSupportReplyConfirmation');
    expect(bulk).toContain('showConfirmModal');
    expect(bulk).toContain('btn.disabled = true');
    expect(bulk).not.toContain("supportCallable('adminSupportSetStatus')");
  });
});
