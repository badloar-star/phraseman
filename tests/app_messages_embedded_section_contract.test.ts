import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const ROOT = path.resolve(__dirname, '..');
const source = normalizeEol(fs.readFileSync(path.join(ROOT, 'components', 'AppMessagesInbox.tsx'), 'utf8'));

describe('team messages inside notification center', () => {
  it('supports embedded rows and reports its unread count to the bell', () => {
    expect(source).toContain("mode?: 'standalone' | 'notification-center'");
    expect(source).toContain('onUnreadCountChange?: (count: number) => void');
    expect(source).toContain('notificationTargetRef?: React.RefObject<View | null>');
    expect(source).toContain('testID="notification-center-team-section"');
    expect(source).toContain('testID="notification-center-team-detail"');
    expect(source).toContain('testID="notification-center-team-detail-back"');
    expect(source).toContain('onDetailOpenChange?.(!!selectedId)');
    expect(source).toContain("const effectiveVisible = mode === 'notification-center' ? centerVisible : visible");
    expect(source).toContain('if (!runtimeActive) return;');
    expect(source).toContain('const minIntervalMs = effectiveVisible ? INBOX_OPEN_REFRESH_MIN_INTERVAL_MS : BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS;');
    const selectStart = source.indexOf('const selectMessage =');
    const dismissStart = source.indexOf('const dismissMessage =', selectStart);
    const selectHandler = source.slice(selectStart, dismissStart);
    expect(selectHandler).not.toContain('setVisible(true)');
    expect(selectHandler).not.toContain('onRequestCloseCenter');
  });

  it('offers accessible permanent removal with Undo', () => {
    expect(source).toContain('accessibilityLabel={copy.dismiss}');
    expect(source).toContain('event.stopPropagation?.()');
    expect(source).toContain('restoreAppMessage');
    expect(source).toContain('testID="team-message-undo"');
    expect(source).toContain('messages.length === 0 && !undoMessage');
  });

  it('lets the outer notification FlatList own team-detail scrolling', () => {
    const detailStart = source.indexOf('const renderUnifiedDetail =');
    const nextSection = source.indexOf('\n  if (mode ===', detailStart);
    const unifiedDetail = source.slice(detailStart, nextSection);
    expect(unifiedDetail).not.toContain('<ScrollView');
  });
});
