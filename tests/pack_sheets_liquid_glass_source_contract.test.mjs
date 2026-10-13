import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const comments = read('app/community_packs/PackCommentsSheet.tsx');
const reportComment = read('app/community_packs/ReportCommentModal.tsx');
const reportPack = read('components/ReportPackModal.tsx');
const header = read('app/flashcards/CollectionHeader.tsx');
const myPacks = read('app/flashcards_my_packs.tsx');

// Only the modal blocks of these two screens are in scope (the rest of the screens belongs to other tasks).
const block = (src, from, to) => {
  const i = src.indexOf(from);
  assert.ok(i >= 0, `block start ${from} exists`);
  const j = src.indexOf(to, i);
  assert.ok(j > i, `block end ${to} exists`);
  return src.slice(i, j);
};
const actionsMenu = block(header, '<Modal visible={actionsOpen}', '</Modal>');
const deleteModal = block(myPacks, '<Modal visible={!!deletePackTarget}', '</Modal>');

const glassFiles = { PackCommentsSheet: comments, ReportCommentModal: reportComment, ReportPackModal: reportPack };

function maxBorderWidth(src) {
  let max = 0;
  for (const m of src.matchAll(/border(?:Top|Bottom|Left|Right)?Width:\s*(\d+(?:\.\d+)?)/g)) max = Math.max(max, Number(m[1]));
  return max;
}

test('all three pack sheets read the active 13-theme Liquid Glass tokens', () => {
  for (const [name, src] of Object.entries(glassFiles)) {
    assert.ok(src.includes('liquidGlassTokens(liquidGlassThemeId)'), `${name}: token registry`);
    assert.ok(src.includes('liquidGlassThemeId'), `${name}: theme id from useTheme`);
  }
});

test('no green brand CTA (t.correct*), no thick borders, no font shrinking', () => {
  for (const [name, src] of Object.entries(glassFiles)) {
    assert.ok(!/t\.correct/.test(src), `${name}: t.correct must not be used`);
    assert.ok(!src.includes('adjustsFontSizeToFit'), `${name}: adjustsFontSizeToFit is forbidden`);
    assert.ok(maxBorderWidth(src) <= 1, `${name}: borderWidth must be <= 1`);
    assert.ok(!/borderColor:\s*t\.border/.test(src), `${name}: no theme-border containers`);
  }
  for (const [name, src] of [['CollectionHeader actions menu', actionsMenu], ['flashcards_my_packs delete modal', deleteModal]]) {
    assert.ok(maxBorderWidth(src) <= 1, `${name}: borderWidth must be <= 1`);
    assert.ok(!src.includes('adjustsFontSizeToFit'), `${name}: adjustsFontSizeToFit is forbidden`);
  }
});

test('comments sheet and report modals use the opaque Liquid Glass sheet shell', () => {
  for (const [name, src] of [['PackCommentsSheet', comments], ['ReportCommentModal', reportComment], ['ReportPackModal', reportPack]]) {
    assert.ok(src.includes('HybridSheetShell'), `${name}: shared sheet shell`);
    assert.ok(src.includes('material="liquid-glass-opaque"'), `${name}: opaque material`);
    assert.ok(src.includes('useGlassSheetContentMaxHeight'), `${name}: bounded scroll height`);
    assert.ok(src.includes('glass.cta'), `${name}: neutral theme CTA`);
    assert.ok(src.includes('glass.ctaInk'), `${name}: neutral CTA ink`);
  }
  // зачем (решение владельца 13.10, cards-020): жалоба на набор — нижняя шторка (HybridSheetShell), не окно по центру (HybridAlertShell).
  assert.ok(!reportPack.includes('HybridAlertShell') && !reportPack.includes('<Modal'), 'ReportPackModal is a bottom sheet, not a centered alert');
  assert.ok(reportPack.includes('glass.opaqueControl'), 'ReportPackModal rows are tonal plates');
});

test('comments sheet keeps every behavior: optimistic send, retry, reactions, moderation, report', () => {
  for (const needle of [
    'handleSend', 'handleRetry', 'handleReply', 'handleReaction', 'handleHideByAuthor', 'handleDeleteMine',
    'handleTogglePin', 'handleDiscardFailed', 'publishPackComment', 'togglePackCommentReaction',
    'hidePackCommentByAuthor', 'deletePackComment', 'setPackCommentPinned', 'community_pack_comments_changed',
    'testID="pack-comment-send"', 'pack-comment-reply-', 'pack-comment-more-', 'highlightCommentId',
    '<ReportCommentModal', 'onScrollToIndexFailed', "status: 'sending'", "status: 'failed'",
  ]) assert.ok(comments.includes(needle), `PackCommentsSheet keeps ${needle}`);
  assert.ok(comments.includes('Загрузка комментариев'), 'loading state text from the mockup');
  assert.ok(!comments.includes('<ActivityIndicator') || comments.includes('glass.secondary'), 'spinner uses neutral token');
  assert.ok(!comments.includes('💬'), 'no emoji empty-state icon');
});

test('report comment modal keeps submit, throttle and failure semantics', () => {
  for (const needle of [
    'submitPackCommentReport', "r === 'throttled'", "r === 'failed'", 'setThrottled(true)', 'accessibilityRole="radio"',
    'maxLength={500}', 'commentAuthorStableId', 'onClose',
  ]) assert.ok(reportComment.includes(needle), `ReportCommentModal keeps ${needle}`);
});

test('report pack sheet keeps props and the send path, adds optimistic close, toasts and [PACK-REPORT] log', () => {
  for (const needle of [
    'submitPackReport', 'onPackHiddenOnDevice', 'motionVariant',
    'authorStableId', 'studyTarget', "r === 'throttled'", "r === 'failed'", 'maxLength={500}',
    'sendInFlightRef', "const LOG = '[PACK-REPORT]'", 'requestDismiss();', "actionToastTri('success'", "actionToastTri('error'", "actionToastTri('warning'",
  ]) assert.ok(reportPack.includes(needle), `ReportPackModal keeps ${needle}`);
  assert.ok(!reportPack.includes('hideCommunityPackOnDevice'), 'the centered done step with hide-on-device is gone (13.10: toast only)');
});

test('actions menu and delete-pack modal: glass tokens, shadow plate without edges (Тень 12.10)', () => {
  assert.ok(actionsMenu.includes('fc-saved-actions-menu') && actionsMenu.includes('g.sheet') && actionsMenu.includes('boxShadow: plateBoxShadow(g)') && !actionsMenu.includes('g.glassEdge'), 'CollectionHeader actions menu on glass tokens, shadow plate without edge');
  assert.ok(deleteModal.includes('fc-delete-pack-confirm-modal') && deleteModal.includes('g.sheet') && deleteModal.includes('boxShadow: plateBoxShadow(g)') && !deleteModal.includes('g.glassEdge'), 'delete-pack modal on glass tokens, shadow plate without edge');
  assert.ok(deleteModal.includes('fc-delete-pack-confirm-confirm') && deleteModal.includes('deletePackBusy'), 'delete confirm and busy state present');
});
