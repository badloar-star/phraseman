import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('report replies in home notification center', () => {
  it('mirrors admin report replies into users/{uid}/notifications for the bell', () => {
    const source = read(path.join('functions', 'src', 'report_replies.ts'));
    expect(source).toContain("import { buildUserNotification, userNotificationRef } from './user_notifications'");
    expect(source).toContain('const notificationRef = userNotificationRef(db, uid, `report_reply_${messageRef.id}`)');
    expect(source).toContain("type: 'report_reply'");
    expect(source).toContain("nav: { kind: 'report_reply', messageId: messageRef.id }");
    expect(source).toContain('reportReply: {');
    expect(source).toContain('replyNotificationId: notificationRef.id');
  });

  it('keeps the local LLM bulk reply script aligned with the callable', () => {
    const script = read(path.join('scripts', 'reply_to_reports.mjs'));
    expect(script).toContain("const notificationRef = userRef.collection('notifications').doc(`report_reply_${messageRef.id}`)");
    expect(script).toContain("type: 'report_reply'");
    expect(script).toContain("nav: { kind: 'report_reply', messageId: messageRef.id }");
    expect(script).toContain('replyNotificationId: notificationRef.id');
  });

  it('teaches the home bell client to render and claim report replies', () => {
    const model = read(path.join('app', 'user_notifications.ts'));
    const button = read(path.join('components', 'NotificationCenterButton.tsx'));
    expect(model).toContain("| 'report_reply'");
    expect(model).toContain('export interface UserNotificationReportReply');
    expect(model).toContain('reportReply: normalizeReportReply(data.reportReply)');
    expect(model).toContain('export async function refreshUserNotificationsOnce');
    expect(model).toContain("LAST_REFRESH_KEY = 'user_notifications_last_refresh_ms_v1'");

    expect(button).toContain("import { claimReportReplyCoinsOptimistically } from '../app/app_messages'");
    expect(button).toContain("import { AppState, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'");
    expect(button).toContain("import MotionModal from './MotionModal'");
    expect(button).toContain('<MotionModal');
    expect(button).not.toContain('<Modal');
    expect(button).toContain('NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 12 * 60 * 60_000');
    expect(button).toContain('minIntervalMs: NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS');
    expect(button).not.toContain('subscribeUserNotifications((list)');
    expect(button).toContain('refreshUserNotificationsOnce({ force: true })');
    expect(button).toContain("AppState.addEventListener('change'");
    expect(button).toContain("row.type === 'report_reply' && row.reportReply");
    expect(button).toContain('notification-report-reply-claim-cta');
    expect(button).toContain('claimReportReplyCoinsOptimistically(reward.messageId, reward.coins)');
  });
});
