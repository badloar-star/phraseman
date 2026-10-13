import fs from 'fs';
import path from 'path';

describe('app messages read persistence UI contract', () => {
  const inboxSource = fs.readFileSync(path.join(process.cwd(), 'components', 'AppMessagesInbox.tsx'), 'utf8');

  it('does not let regular read messages disappear through user dismiss controls', () => {
    expect(inboxSource).not.toContain('onPress={() => hideMessage(selected.id)}');
    expect(inboxSource).not.toContain('hideMessage(message.id);');
    expect(inboxSource).not.toContain('styles.rowDismiss');
  });

  // зачем (паритет system.html system_17, 04.10): прочитанная строка оформлена как непрочитанная — плоская, с линией
  // снизу, без серой компактной плашки и без обрезки текста; отличается только меткой сверху (дата вместо «Новое»).
  it('renders read inbox rows like unread ones (flat rows from system_17) and they can be reopened', () => {
    expect(inboxSource).toContain('const messageRead = !message.unread;');
    expect(inboxSource).toContain('styles.messageRowRead');
    expect(inboxSource).toContain("{message.unread ? copy.unread : formatMessageDate(message.createdAtMs)}");
    expect(inboxSource).toContain('onPress={() => selectMessage(message)}');
  });

  it('keeps unread dots outside the text flow so inbox rows stay centered', () => {
    expect(inboxSource).toContain('{message.unread ? <View pointerEvents="none" style={styles.unreadDot} /> : null}');
    expect(inboxSource).toContain("position: 'absolute'");
    // зачем (system_17): точка стоит у левого края строки внутри отступа 22, а не вынесена за край.
    expect(inboxSource).toContain('left: 4');
    expect(inboxSource).not.toContain('readDotSpace');
    expect(inboxSource).not.toMatch(/messageMetaRow:[\s\S]*?paddingLeft: 16[\s\S]*?messageDate:/);
    expect(inboxSource).not.toMatch(/messagePreview:[\s\S]*?paddingLeft: 16[\s\S]*?messagePreviewRead:/);
    expect(inboxSource).not.toMatch(/messageRowActions:[\s\S]*?paddingLeft: 16[\s\S]*?messageRowCta:/);
  });

  // 04.10: живая подписка снята в 95eec1717 (01.08) ради экономии чтений; замена — кэш сразу + свежее разовое
  // чтение при открытии центра (minIntervalMs: 0). «Центр без подписки» закреплён и в background_refresh_contract.
  it('opening either surface reads cache first, then a fresh one-shot read without a live subscription', () => {
    expect(inboxSource).not.toContain('subscribeUserAppMessages');
    expect(inboxSource).toContain('const minIntervalMs = effectiveVisible ? INBOX_OPEN_REFRESH_MIN_INTERVAL_MS : BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS;');
    expect(inboxSource).toContain('}, [applyAppMessagesSnapshot, effectiveVisible, runtimeActive]);');
  });

  it('refreshes the closed inbox badge from cache plus a throttled one-shot poll', () => {
    expect(inboxSource).toContain("AppState.addEventListener('change'");
    expect(inboxSource).toContain("state === 'active'");
    expect(inboxSource).toContain('readCachedAppMessagesSnapshot');
    expect(inboxSource).toContain('refreshAppMessagesSnapshotOnce');
    expect(inboxSource).toContain('if (!runtimeActive) return;');
  });

  it('does not show the legacy one-pearl report reward that credits nothing (D70/D104)', () => {
    // зачем (координатор 13.10, аудит Ядра adc40dad2): старая награда «+1» за репорт ничего не начисляет — «Получено» было нечестным.
    // «+N» и кнопка во входящих скрыты; современные награды рисует NotificationCenterButton.
    expect(inboxSource).not.toContain('claimReportReplyCoinsOptimistically');
    expect(inboxSource).not.toContain('testID="report-reply-claim-cta"');
    expect(inboxSource).not.toContain('+{message.reportReply?.coins}');
    expect(inboxSource).not.toContain('await claimReportReplyShards');
    expect(inboxSource).not.toContain('claimErrorId');
    expect(inboxSource).not.toContain('ActivityIndicator');
    expect(inboxSource).not.toContain('disabled={claiming}');
  });
});
