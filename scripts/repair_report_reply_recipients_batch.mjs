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

const auditFile = value('--audit-file');
if (!auditFile) throw new Error('missing required --audit-file');
const auditPath = path.resolve(ROOT, auditFile);
if (!auditPath.startsWith(ROOT + path.sep)) throw new Error('audit file must be inside project root');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const candidates = Array.isArray(audit.candidates) ? audit.candidates : [];
if (candidates.length === 0) throw new Error('audit has no candidates');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(ROOT, 'service-account.json'), 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const backupDir = path.join(ROOT, '.codex-tmp', 'report-reply-recipient-repair', `batch-${Date.now()}`);
fs.mkdirSync(backupDir, { recursive: true });

const confirmedKey = 'helpful_error_reports_confirmed_v1';
const requiredString = (candidate, key) => {
  const item = String(candidate[key] || '').trim();
  if (!item) throw new Error(`candidate missing ${key}`);
  return item;
};

async function validateAndMaybeRepair(candidate, index) {
  if (candidate.safe !== true) throw new Error('candidate.safe !== true');
  const expected = {
    collection: requiredString(candidate, 'collection'),
    reportId: requiredString(candidate, 'reportId'),
    sourceUid: requiredString(candidate, 'sourceUid'),
    targetUid: requiredString(candidate, 'targetUid'),
    messageId: requiredString(candidate, 'messageId'),
    notificationId: requiredString(candidate, 'notificationId'),
  };
  if (expected.sourceUid === expected.targetUid) throw new Error('source and target uid must differ');

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
  const refs = [
    reportRef, sourceUserRef, targetUserRef, sourceMessageRef, targetMessageRef,
    sourceNotificationRef, targetNotificationRef, sourceHelperRef, targetHelperRef, authLinkRef,
  ];

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
    return { status: 'already_repaired', index, ...expected };
  }
  if (!sourceMessageSnap.exists || !sourceNotificationSnap.exists) throw new Error('source reply documents missing');
  if (targetMessageSnap.exists || targetNotificationSnap.exists) throw new Error('target reply documents already exist');
  if (message.reportCollection !== expected.collection || message.reportId !== expected.reportId) throw new Error('message/report mismatch');
  if (notification.reportReply?.reportId !== expected.reportId || notification.reportReply?.messageId !== expected.messageId) {
    throw new Error('notification/report mismatch');
  }
  if (message.claimed === true || notification.reportReply?.claimed === true) throw new Error('claimed === true; refusing repair');
  if (authLink.stable_id !== expected.targetUid) throw new Error('auth link does not prove target identity');
  if (!targetUserSnap.exists) throw new Error('target user does not exist');

  const shards = Math.floor(Number(message.shards || 0));
  if (shards > 0) {
    const sourceConfirmed = Number(sourceUserSnap.data()?.progress?.[confirmedKey] || 0);
    const sourceHelperConfirmed = Number(sourceHelperSnap.data()?.confirmed || 0);
    if (sourceConfirmed < 1 || sourceHelperConfirmed < 1) throw new Error('source helper counters cannot be decremented');
  }

  const backupPath = path.join(backupDir, `${String(index + 1).padStart(3, '0')}-${expected.reportId}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({
    expected,
    report: data(reportSnap),
    sourceUser: data(sourceUserSnap),
    targetUser: data(targetUserSnap),
    sourceMessage: message,
    targetMessage: data(targetMessageSnap),
    sourceNotification: notification,
    targetNotification: data(targetNotificationSnap),
    sourceHelper: data(sourceHelperSnap),
    targetHelper: data(targetHelperSnap),
    authLink,
  }, null, 2));

  if (!apply) return { status: 'dry_run_ready', index, shards, backupPath, ...expected };

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
      const targetHelperUpdate = th.exists
        ? { confirmed: admin.firestore.FieldValue.increment(1), updatedAtMs: Date.now() }
        : { ...(th.data() || sh.data() || {}), uid: expected.targetUid, confirmed: admin.firestore.FieldValue.increment(1), updatedAtMs: Date.now() };
      tx.set(targetHelperRef, targetHelperUpdate, { merge: true });
    }

    tx.create(db.collection('admin_log').doc(), {
      ts: new Date().toISOString(),
      adminEmail: 'codex_repair_script',
      action: 'repair_report_reply_recipient_batch',
      uid: expected.targetUid,
      details: { ...expected, shards, backupPath, auditPath },
    });
  });

  return { status: 'repaired', index, shards, backupPath, ...expected };
}

const results = [];
let failed = 0;
for (let i = 0; i < candidates.length; i += 1) {
  try {
    results.push(await validateAndMaybeRepair(candidates[i], i));
  } catch (error) {
    failed += 1;
    results.push({
      status: 'skipped_error',
      index: i,
      collection: candidates[i]?.collection || null,
      reportId: candidates[i]?.reportId || null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const summary = {
  mode: apply ? 'apply' : 'dry_run',
  auditPath,
  backupDir,
  total: candidates.length,
  repaired: results.filter((r) => r.status === 'repaired').length,
  dryRunReady: results.filter((r) => r.status === 'dry_run_ready').length,
  alreadyRepaired: results.filter((r) => r.status === 'already_repaired').length,
  failed,
};
const resultPath = path.join(backupDir, apply ? 'apply-result.json' : 'dry-run-result.json');
fs.writeFileSync(resultPath, JSON.stringify({ summary, results }, null, 2));
console.log(JSON.stringify({ ...summary, resultPath }, null, 2));
if (failed > 0) process.exitCode = 1;
