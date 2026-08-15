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

describe('Live legacy admin support mail delivery contract', () => {
  test('single reply is prepared, previewed, and dispatched with the sealed operation fields', () => {
    const block = functionBlock(
      'window.supportSendOne = async function(id)',
      'window.supportSendAllDrafts = async function()',
    );

    const saveIndex = block.indexOf("supportCallable('adminSupportSaveDraft')");
    const prepareIndex = block.indexOf("supportCallable('adminSupportPrepareReply')");
    const previewIndex = block.indexOf('showSupportReplyConfirmation');
    const dispatchIndex = block.indexOf("supportCallable('adminSupportDispatchReply')");

    expect(saveIndex).toBeGreaterThanOrEqual(0);
    expect(prepareIndex).toBeGreaterThanOrEqual(0);
    expect(prepareIndex).toBeGreaterThan(saveIndex);
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
    expect(block).toContain("reviewState === 'retry'");
    expect(block).toContain("reviewState === 'attention_required'");
    expect(block).toContain('Автоотправка заблокирована');
    expect(block).toContain("reviewState === 'exhausted'");
    expect(block).toContain("reviewState === 'stale'");
  });

  test('attention-required replies stay outside the ready queue and use an honest label', () => {
    const block = functionBlock('function selectSupportInboxRows(statusFilter)', 'window.renderSupportInbox = function renderSupportInbox()');
    expect(block).toContain("autoState === 'awaiting_approval'");
    expect(block).toContain("row.draftOrigin === 'owner_manual'");
    expect(block).toContain("row.draftOrigin === 'jarvis'");
    expect(block).toContain("row.autoReply?.grounded === true");
    expect(block).toContain('Number(row.draftPolicyVersion || 0) === _supportAutoPolicyVersion');
    expect(block).toContain('Number(row.draftInstructionsRevision || 0) === _supportInstructionsRevision');
    expect(block).toContain("String(row.draftInstructionsFingerprint || '') === _supportInstructionsFingerprint");
    expect(block).toContain("!['dispatching', 'delivery_unknown'].includes(gateState)");
    expect(block).toContain("!batchReservedMessageIds.has(String(row.id || ''))");
    expect(block).toContain('&& gateAllowsPreparation');
    expect(block).toContain("!preparedRows.includes(row)\n      && !batchReservedMessageIds.has(String(row.id || ''))");
    expect(legacy).toContain("attention_required:'Требует внимания'");
    expect(legacy).not.toContain("attention_required:'Проверить доставку'");
  });

  test('manual generation reports attention instead of claiming that a fallback draft is ready', () => {
    const one = functionBlock('window.supportGenerateOne = async function(id)', 'window.supportGenerateAll = async function()');
    const all = functionBlock('window.supportGenerateAll = async function()', 'function supportRequestToken(prefix)');
    expect(one).toContain('d.attentionRequired');
    expect(one).toContain('Готовый ответ не создан: нужна ручная проверка фактов');
    expect(all).toContain('требуют проверки');
    expect(all).toContain("attention ? 'warn' : 'ok'");
  });

  test('ambiguous delivery has two explicit guarded reconciliation actions', () => {
    const render = functionBlock(
      'window.renderSupportInbox = function renderSupportInbox()',
      'async function _supportRefreshAfter(action)',
    );
    expect(render).toContain("gateState === 'delivery_unknown'");
    expect(render).toContain('Подтвердить отправку');
    expect(render).toContain('Не отправлено');
    expect(render).toContain("'accepted',this");
    expect(render).toContain("'verified_not_sent',this");
    expect(render).toContain('Проверьте папку «Отправленные» в Gmail');

    const action = functionBlock(
      'window.supportResolveReplyDelivery = async function(id, operationId, resolution, button)',
      'window.supportSaveDraft = async function(id)',
    );
    expect(action).toContain('showConfirmModal');
    expect(action).toContain("supportCallable('adminSupportResolveReplyDelivery')");
    expect(action).toContain('operationId,');
    expect(action).toContain('resolution,');
    expect(action).toContain("requestId: supportRequestToken('legacy-support-resolve-delivery')");
    expect(action).toContain("resolution !== 'verified_not_sent'");
    expect(action).toContain('candidate.disabled = true');
    expect(action).toContain('Само письмо сейчас не отправляется');
    expect(action).toContain('Письмо отмечено как отправленное; повторной отправки не будет.');
    expect(action).toContain('Черновик снова доступен для защищённой отправки.');
    expect(action).toContain('Статус доставки не изменён:');
  });

  test('prepared or interrupted sealed batches stay recoverable after reload', () => {
    const load = functionBlock('window.loadSupportInbox = async function(force)', 'function selectSupportInboxRows(statusFilter)');
    expect(load).toContain('_supportPendingBatches = Array.isArray(supportData.pendingBatches)');

    const render = functionBlock(
      'window.renderSupportInbox = function renderSupportInbox()',
      'async function _supportRefreshAfter(action)',
    );
    expect(render).toContain("['prepared', 'dispatching', 'attention_required']");
    expect(render).not.toContain("['prepared', 'dispatching', 'attention_required', 'partial']");
    expect(render).toContain('Продолжить пакет');
    expect(render).toContain('Отменить пакет');

    const action = functionBlock(
      'window.supportResumeReplyBatch = async function(batchId, action, button)',
      'window.supportResolveReplyDelivery = async function(id, operationId, resolution, button)',
    );
    expect(action).toContain('showSupportReplyConfirmation(batch)');
    expect(action).toContain("supportCallable('adminSupportDispatchReplyBatch')");
    expect(action).toContain("supportCallable('adminSupportCancelReplyBatch')");
    expect(action).toContain('confirmationNonce');
    expect(action).toContain('manifestHash');
    expect(action).toContain("state !== 'prepared'");
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
