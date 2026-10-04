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

  // 04.10: живая подписка снята в 95eec1717 (01.08) ради экономии чтений; замена — кэш сразу + свежее разовое
  // чтение при открытии центра (minIntervalMs: 0). «Центр без подписки» закреплён и в background_refresh_contract.
  it('opening either surface reads cache first, then a fresh one-shot read without a live subscription', () => {
    expect(inboxSource).not.toContain('subscribeUserAppMessages');
    expect(inboxSource).toContain('minIntervalMs: effectiveVisible ? 0 : BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS');
    expect(inboxSource).toContain('}, [applyAppMessagesSnapshot, effectiveVisible, runtimeActive]);');
  });

  it('refreshes the closed inbox badge from cache plus a throttled one-shot poll', () => {
    expect(inboxSource).toContain("AppState.addEventListener('change'");
    expect(inboxSource).toContain("state === 'active'");
    expect(inboxSource).toContain('readCachedAppMessagesSnapshot');
    expect(inboxSource).toContain('refreshAppMessagesSnapshotOnce');
    expect(inboxSource).toContain('if (!runtimeActive) return;');
  });

  it('claims report-reply rewards optimistically without a visible network wait', () => {
    // 04.10: осколки → монеты (D70/D104, 53063c465) — та же оптимистичная функция под новым именем.
    expect(inboxSource).toContain('claimReportReplyCoinsOptimistically');
    expect(inboxSource).toContain('optimisticReportClaimIdsRef');
    expect(inboxSource).toContain('markReplyClaimedLocally(message.id);');
    expect(inboxSource).not.toContain('await claimReportReplyShards');
    expect(inboxSource).not.toContain('claimErrorId');
    expect(inboxSource).not.toContain('ActivityIndicator');
    expect(inboxSource).not.toContain('disabled={claiming}');
  });
});
