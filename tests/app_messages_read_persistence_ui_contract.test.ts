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

  it('opens the Firestore messages subscription only while the inbox modal is visible', () => {
    expect(inboxSource).toContain('if (!visible) return;');
    expect(inboxSource).toContain('subscribeUserAppMessages');
    expect(inboxSource).toContain('}, [hasPremiumAccess, visible]);');
  });
});
