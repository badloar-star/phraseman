import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const apply = process.argv.includes('--apply');
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] || '').trim() : '';
};
const expected = {
  collection: value('--collection'),
  reportId: value('--report-id'),
  sourceUid: value('--source-uid'),
  targetUid: value('--target-uid'),
  messageId: value('--message-id'),
  notificationId: value('--notification-id'),
};
for (const [key, item] of Object.entries(expected)) {
  if (!item) throw new Error(`missing required ${key}`);
}
if (expected.sourceUid === expected.targetUid) throw new Error('source and target uid must differ');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(ROOT, 'service-account.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const reportRef = db.collection(expected.collection).doc(expected.reportId);
const sourceUserRef = db.collection('users').doc(expected.sourceUid);
const targetUserRef = db.collection('users').doc(expected.targetUid);
const sourceMessageRef = sourceUserRef.collection('user_messages').doc(expected.messageId);
const targetMessageRef = targetUserRef.collection('user_messages').doc(expected.messageId);
const sourceNotificationRef = sourceUserRef.collection('notifications').doc(expected.notificationId);
const targetNotificationRef = targetUserRef.collection('notifications').doc(expected.notificationId);
const sourceHelperRef = db.collection('top_helpers').doc(expected.sourceUid);
const targetHelperRef = db.collection('top_helpers').doc(expected.targetUid);
const authLinkRef = db.collection('auth_links').doc(expected.sourceUid);

const refs = [reportRef, sourceUserRef, targetUserRef, sourceMessageRef, targetMessageRef,
  sourceNotificationRef, targetNotificationRef, sourceHelperRef, targetHelperRef, authLinkRef];
const snaps = await db.getAll(...refs);
const [reportSnap, sourceUserSnap, targetUserSnap, sourceMessageSnap, targetMessageSnap,
  sourceNotificationSnap, targetNotificationSnap, sourceHelperSnap, targetHelperSnap, authLinkSnap] = snaps;
const data = (snap) => snap.exists ? snap.data() : null;
const report = data(reportSnap) || {};
const message = data(sourceMessageSnap) || {};
const notification = data(sourceNotificationSnap) || {};
const authLink = data(authLinkSnap) || {};

if (!reportSnap.exists || report.status !== 'answered') throw new Error('report is not answered');
if (report.replyMessageId !== expected.messageId || report.replyNotificationId !== expected.notificationId) {
  throw new Error('report reply ids changed');
}
if (!sourceMessageSnap.exists && !sourceNotificationSnap.exists && targetMessageSnap.exists && targetNotificationSnap.exists
  && report.replyRecipientUid === expected.targetUid) {
  console.log(JSON.stringify({ status: 'already_repaired', ...expected }, null, 2));
  process.exit(0);
}
if (!sourceMessageSnap.exists || !sourceNotificationSnap.exists) throw new Error('source reply documents missing');
if (message.reportCollection !== expected.collection || message.reportId !== expected.reportId) throw new Error('message/report mismatch');
if (notification.reportReply?.reportId !== expected.reportId || notification.reportReply?.messageId !== expected.messageId) {
  throw new Error('notification/report mismatch');
}
if (message.claimed === true || notification.reportReply?.claimed === true) throw new Error('claimed === true; refusing repair');
if (authLink.stable_id !== expected.targetUid) throw new Error('auth link does not prove target identity');
if (!targetUserSnap.exists) throw new Error('target user does not exist');
if (targetMessageSnap.exists || targetNotificationSnap.exists) {
  throw new Error('target reply documents already exist');
}

const backupDir = path.join(ROOT, '.codex-tmp', 'report-reply-recipient-repair');
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `${expected.reportId}-${Date.now()}.json`);
fs.writeFileSync(backupPath, JSON.stringify({ expected, report: data(reportSnap), sourceUser: data(sourceUserSnap),
  targetUser: data(targetUserSnap), sourceMessage: message, targetMessage: data(targetMessageSnap),
  sourceNotification: notification, targetNotification: data(targetNotificationSnap),
  sourceHelper: data(sourceHelperSnap), targetHelper: data(targetHelperSnap), authLink }, null, 2));

const shards = Math.floor(Number(message.shards || 0));
const confirmedKey = 'helpful_error_reports_confirmed_v1';
if (shards > 0) {
  const sourceConfirmed = Number(sourceUserSnap.data()?.progress?.[confirmedKey] || 0);
  const sourceHelperConfirmed = Number(sourceHelperSnap.data()?.confirmed || 0);
  if (sourceConfirmed < 1 || sourceHelperConfirmed < 1) throw new Error('source helper counters cannot be decremented');
}

if (!apply) {
  console.log(JSON.stringify({ status: 'dry_run_ready', backupPath, shards, ...expected }, null, 2));
  process.exit(0);
}

await db.runTransaction(async (tx) => {
  const current = await tx.getAll(...refs);
  const [r, su, tu, sm, tm, sn, tn, sh, th, al] = current;
  if (r.data()?.replyMessageId !== expected.messageId || r.data()?.replyNotificationId !== expected.notificationId) throw new Error('report changed');
  if (!sm.exists || !sn.exists || tm.exists || tn.exists) throw new Error('reply document state changed');
  if (sm.data()?.claimed === true || sn.data()?.reportReply?.claimed === true) throw new Error('claimed === true; refusing repair');
  if (al.data()?.stable_id !== expected.targetUid || !tu.exists) throw new Error('identity proof changed');
  if (shards > 0 && (Number(su.data()?.progress?.[confirmedKey] || 0) < 1 || Number(sh.data()?.confirmed || 0) < 1)) {
    throw new Error('helper counters changed');
  }
  tx.create(targetMessageRef, sm.data());
  tx.create(targetNotificationRef, sn.data());
  tx.delete(sourceMessageRef);
  tx.delete(sourceNotificationRef);
  tx.set(reportRef, {
    replyRecipientUid: expected.targetUid,
    replyOriginalUid: expected.sourceUid,
    replyIdentityRepairedAt: new Date().toISOString(),
  }, { merge: true });
  if (shards > 0) {
    tx.set(sourceUserRef, { progress: { [confirmedKey]: admin.firestore.FieldValue.increment(-1) } }, { merge: true });
    tx.set(targetUserRef, { progress: { [confirmedKey]: admin.firestore.FieldValue.increment(1) } }, { merge: true });
    tx.set(sourceHelperRef, { confirmed: admin.firestore.FieldValue.increment(-1), updatedAtMs: Date.now() }, { merge: true });
    tx.set(targetHelperRef, { ...(sh.data() || {}), uid: expected.targetUid,
      confirmed: admin.firestore.FieldValue.increment(1), updatedAtMs: Date.now() }, { merge: true });
  }
  tx.create(db.collection('admin_log').doc(), {
    ts: new Date().toISOString(),
    adminEmail: 'codex_repair_script',
    action: 'repair_report_reply_recipient',
    uid: expected.targetUid,
    details: { ...expected, shards, backupPath },
  });
});

console.log(JSON.stringify({ status: 'repaired', backupPath, ...expected }, null, 2));
