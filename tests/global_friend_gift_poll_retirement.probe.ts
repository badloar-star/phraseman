import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
const notifications = fs.readFileSync(path.join(root, 'app/notifications.ts'), 'utf8');
const events = fs.readFileSync(path.join(root, 'app/events.ts'), 'utf8');
const tapHandler = fs.readFileSync(path.join(root, 'app/notification_tap_handler.ts'), 'utf8');
const inbox = fs.readFileSync(path.join(root, 'app/user_notifications.ts'), 'utf8');
const notificationCenter = fs.readFileSync(path.join(root, 'components/NotificationCenterButton.tsx'), 'utf8');

assert.doesNotMatch(layout, /GlobalFriendGiftHost/);
assert.equal(fs.existsSync(path.join(root, 'components/GlobalFriendGiftHost.tsx')), false);
assert.match(layout, /<EntitlementExpiredHost \/>/);
assert.match(layout, /<BillingIssueToastHost \/>/);
assert.doesNotMatch(notifications, /case 'friend_gift_received'|case 'friend_gift_thanks'|friend_gift_push_opened/);
assert.doesNotMatch(events, /friend_gift_push_opened/);
for (const source of [tapHandler, inbox, notificationCenter]) {
  assert.doesNotMatch(source, /friend_gift_received|friend_gift_thanks|friend_gift_push_opened/);
}
