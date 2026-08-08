import fs from 'fs';
import path from 'path';

describe('app messages read persistence UI contract', () => {
  const inboxSource = fs.readFileSync(path.join(process.cwd(), 'components', 'AppMessagesInbox.tsx'), 'utf8');

  it('does not let regular read messages disappear through user dismiss controls', () => {
    expect(inboxSource).not.toContain('onPress={() => hideMessage(selected.id)}');
    expect(inboxSource).not.toContain('hideMessage(message.id);');
    expect(inboxSource).not.toContain('styles.rowDismiss');
  });

  it('renders read inbox rows as compact gray plaques that can be reopened', () => {
    expect(inboxSource).toContain('const messageRead = !message.unread;');
    expect(inboxSource).toContain('styles.messageRowRead');
    expect(inboxSource).toContain('numberOfLines={messageRead ? 1 : 2}');
    expect(inboxSource).toContain('onPress={() => selectMessage(message)}');
  });

  it('keeps unread dots outside the text flow so inbox rows stay centered', () => {
    expect(inboxSource).toContain('{message.unread ? <View pointerEvents="none" style={styles.unreadDot} /> : null}');
    expect(inboxSource).toContain("position: 'absolute'");
    expect(inboxSource).toContain('left: -14');
    expect(inboxSource).not.toContain('readDotSpace');
    expect(inboxSource).not.toMatch(/messageMetaRow:[\s\S]*?paddingLeft: 16[\s\S]*?messageDate:/);
    expect(inboxSource).not.toMatch(/messagePreview:[\s\S]*?paddingLeft: 16[\s\S]*?messagePreviewRead:/);
    expect(inboxSource).not.toMatch(/messageRowActions:[\s\S]*?paddingLeft: 16[\s\S]*?messageRowCta:/);
  });

  it('opens the Firestore subscription while either the standalone or embedded surface is visible', () => {
    expect(inboxSource).toContain('if (!runtimeActive || !effectiveVisible) return;');
    expect(inboxSource).toContain('subscribeUserAppMessages');
    expect(inboxSource).toContain('}, [applyAppMessagesSnapshot, effectiveVisible, runtimeActive]);');
  });

  it('refreshes the closed inbox badge from cache plus a throttled one-shot poll', () => {
    expect(inboxSource).toContain("AppState.addEventListener('change'");
    expect(inboxSource).toContain("state === 'active'");
    expect(inboxSource).toContain('readCachedAppMessagesSnapshot');
    expect(inboxSource).toContain('refreshAppMessagesSnapshotOnce');
    expect(inboxSource).toContain('if (!runtimeActive || effectiveVisible) return;');
  });

  it('claims report-reply rewards optimistically without a visible network wait', () => {
    expect(inboxSource).toContain('claimReportReplyShardsOptimistically');
    expect(inboxSource).toContain('optimisticReportClaimIdsRef');
    expect(inboxSource).toContain('markReplyClaimedLocally(message.id);');
    expect(inboxSource).not.toContain('await claimReportReplyShards');
    expect(inboxSource).not.toContain('claimErrorId');
    expect(inboxSource).not.toContain('ActivityIndicator');
    expect(inboxSource).not.toContain('disabled={claiming}');
  });
});
