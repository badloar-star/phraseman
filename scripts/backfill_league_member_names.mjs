#!/usr/bin/env node
/**
 * Разовый бэкфилл имён участников лиги: заменяет «Player XXXX» на реальное
 * progress.user_name из документа самого юзера. Чинит уже записанные группы —
 * чтобы имена появились сразу, не дожидаясь пере-захода каждого юзера.
 *
 * Причина бага: резолвер имени лиги требовал подтверждения в name_index под
 * текущим uid; у большинства юзеров индекса нет или он на старом uid (после
 * auth-merge) → подставлялось «Player XXXX». Серверный резолвер уже исправлен
 * (доверяет собственному progress.user_name); этот скрипт правит исторические
 * записи в league_groups.
 *
 *   node scripts/backfill_league_member_names.mjs            # dry-run (только показывает)
 *   node scripts/backfill_league_member_names.mjs --apply    # реально переписать
 *   node scripts/backfill_league_member_names.mjs --week 2026-W28 --apply   # только неделя
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const weekArgIdx = process.argv.indexOf('--week');
const WEEK = weekArgIdx >= 0 ? process.argv[weekArgIdx + 1] : null;

if (admin.apps.length === 0) {
  let projectId; try { projectId = JSON.parse(readFileSync('.firebaserc','utf8'))?.projects?.default; } catch {}
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json','utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}
const db = admin.firestore();

const sanitize = (v, max = 48) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const isFallback = (name) => /^Player [0-9A-Fa-f]{2,4}$/.test(String(name || ''));

// Кэш реальных имён по uid, чтобы не читать один и тот же users-док много раз.
const nameCache = new Map();
async function realNameFor(uid) {
  if (nameCache.has(uid)) return nameCache.get(uid);
  let out = '';
  const snap = await db.collection('users').doc(uid).get().catch(() => null);
  if (snap?.exists) {
    const d = snap.data() || {};
    // Уважаем скрытие личности: скрытым имя не раскрываем.
    if (d.identityHidden !== true) out = sanitize(d?.progress?.user_name);
  }
  nameCache.set(uid, out);
  return out;
}

let groupsScanned = 0, groupsChanged = 0, membersFixed = 0;
let lastDoc = null;
while (true) {
  let q = db.collection('league_groups').orderBy('__name__').limit(200);
  if (WEEK) q = db.collection('league_groups').where('weekId', '==', WEEK).orderBy('__name__').limit(200);
  if (lastDoc) q = q.startAfter(lastDoc);
  const snap = await q.get();
  if (snap.empty) break;
  lastDoc = snap.docs[snap.docs.length - 1];

  for (const g of snap.docs) {
    groupsScanned++;
    const members = g.data()?.members;
    if (!members || typeof members !== 'object') continue;
    const updates = {};
    for (const [uid, m] of Object.entries(members)) {
      const cur = (m && typeof m === 'object') ? m.name : '';
      if (!isFallback(cur)) continue;
      const real = await realNameFor(uid);
      if (real && real !== cur) {
        updates[`members.${uid}.name`] = real;
        membersFixed++;
        console.log(`  ${g.id}: "${cur}" → "${real}"  (uid …${uid.slice(-8)})`);
      }
    }
    if (Object.keys(updates).length > 0) {
      groupsChanged++;
      if (APPLY) await g.ref.update(updates);
    }
  }
  if (snap.size < 200) break;
}

console.log(`\nГрупп просмотрено: ${groupsScanned}. Групп с правками: ${groupsChanged}. Имён исправлено: ${membersFixed}.`);
console.log(APPLY ? '✓ Применено.' : '\n[dry-run] Ничего не записано. Добавь --apply, чтобы применить.');
process.exit(0);
