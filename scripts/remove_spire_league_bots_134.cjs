#!/usr/bin/env node
// One-time, fail-closed cleanup after deploying real-player-only room writers.
// Default is a dry run that saves the exact affected fields for recovery.
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, '.codex-tmp', 'handoff-134');
const apply = process.argv.includes('--apply');
const backupArg = process.argv.find((arg) => arg.startsWith('--backup='));
if (apply !== Boolean(backupArg)) throw new Error('Use --apply --backup=<dry-run backup file> together');
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(ROOT, 'service-account.json');
const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

function provenBot(uid, member) {
  return uid.startsWith('res_') || (uid.startsWith('bot_') && member?.isBot === true);
}

async function affected() {
  const rows = [];
  for (const collection of ['league_groups', 'spire_groups']) {
    let last = null;
    while (true) {
      let query = db.collection(collection).orderBy(admin.firestore.FieldPath.documentId()).limit(200);
      if (last) query = query.startAfter(last);
      const page = await query.get();
      if (page.empty) break;
      last = page.docs[page.docs.length - 1];
      for (const snap of page.docs) {
        const data = snap.data();
        if (collection === 'league_groups') {
          const members = data.members;
          if (!members || Array.isArray(members) || typeof members !== 'object') continue;
          const entries = Object.entries(members);
          const botCount = entries.filter(([uid, member]) => provenBot(uid, member)).length;
          if (botCount === 0) continue;
          const cleaned = Object.fromEntries(entries.filter(([uid, member]) => !provenBot(uid, member)));
          rows.push({ collection, id: snap.id, updateTime: { seconds: snap.updateTime.seconds, nanoseconds: snap.updateTime.nanoseconds },
            original: { members, memberCount: data.memberCount, liveMemberCount: data.liveMemberCount },
            cleaned: { members: cleaned, memberCount: Object.keys(cleaned).filter((uid) => cleaned[uid]?.identityHidden !== true).length,
              liveMemberCount: Object.keys(cleaned).filter((uid) => cleaned[uid]?.identityHidden !== true).length },
            removed: botCount });
        } else if (Array.isArray(data.roster) && data.roster.length > 0) {
          // Provenance: roster is populated solely by buildSpireRoster, not by players.
          if (!data.roster.every((entry) => typeof entry?.uid === 'string' && entry.uid.startsWith('res_'))) {
            throw new Error('Unexpected spire roster entry; refusing to remove ambiguous data');
          }
          rows.push({ collection, id: snap.id, updateTime: { seconds: snap.updateTime.seconds, nanoseconds: snap.updateTime.nanoseconds },
            original: { roster: data.roster }, cleaned: { roster: [] }, removed: data.roster.length });
        }
      }
      if (page.size < 200) break;
    }
  }
  return rows;
}

function summary(rows) {
  return Object.fromEntries(['league_groups', 'spire_groups'].map((collection) => [collection, {
    docs: rows.filter((row) => row.collection === collection).length,
    bots: rows.filter((row) => row.collection === collection).reduce((sum, row) => sum + row.removed, 0),
  }]));
}

async function main() {
  const rows = await affected();
  if (!apply) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const backupPath = path.join(BACKUP_DIR, `bot-backup-${Date.now()}.json`);
    const body = JSON.stringify({ schema: 'bot-cleanup-134.v1', project: key.project_id, rows });
    fs.writeFileSync(backupPath, body, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    const digest = crypto.createHash('sha256').update(body).digest('hex');
    console.log(JSON.stringify({ mode: 'dry-run', ...summary(rows), backupPath, sha256: digest }));
    return;
  }
  const backupPath = path.resolve(backupArg.slice('--backup='.length));
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  if (backup.schema !== 'bot-cleanup-134.v1' || backup.project !== key.project_id) {
    throw new Error('Backup schema/project mismatch');
  }
  const expected = new Map(backup.rows.map((row) => [`${row.collection}/${row.id}`, row]));
  if (rows.length !== expected.size) throw new Error('Affected document count changed after backup; rerun dry-run');
  for (const row of rows) {
    const prior = expected.get(`${row.collection}/${row.id}`);
    if (!prior || JSON.stringify(prior.updateTime) !== JSON.stringify(row.updateTime) || prior.removed !== row.removed) {
      throw new Error('Affected document changed after backup; rerun dry-run');
    }
  }
  const batch = db.batch();
  for (const row of rows) {
    batch.update(db.collection(row.collection).doc(row.id), row.cleaned,
      { lastUpdateTime: new admin.firestore.Timestamp(row.updateTime.seconds, row.updateTime.nanoseconds) });
  }
  await batch.commit();
  const remaining = await affected();
  if (remaining.length) throw new Error(`Post-check found ${remaining.length} affected documents`);
  console.log(JSON.stringify({ mode: 'applied', ...summary(rows), remaining: 0 }));
}

main().catch((error) => {
  console.error('[BOT-CLEANUP] failed', String(error?.code || error?.message || error).slice(0, 200));
  process.exitCode = 1;
});
