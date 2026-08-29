#!/usr/bin/env node
/**
 * Разовая диагностика жалобы пользователя "Vitaliy/Vitalii" (28.08.2026):
 * цепочка дней не та (должна быть с 13 апреля), лига "медная" вместо "эфирной"
 * или 28 место, сохранённые тематические/урочные карточки отсутствуют,
 * награды и достижения не те. Только ЧТЕНИЕ, ничего не пишет в базу.
 *
 * зачем: владелец попросил разобраться, прежде чем отвечать пользователю —
 * нужно понять, реальная потеря данных или расхождение из-за миграции.
 *
 *   node scripts/inspect_vitaliy_complaint.mjs
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

function readProjectId() {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  try { return JSON.parse(readFileSync('.firebaserc', 'utf8'))?.projects?.default; } catch { return undefined; }
}
function initAdmin() {
  if (admin.apps.length > 0) return;
  const projectId = readProjectId();
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}
const clean = (v, max = 64) => String(v ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
const fmtTs = (ms) => {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${new Date(n).toISOString()}  (${n})`;
};

async function resolveCandidates(db, QUERY) {
  const nameLower = clean(QUERY, 32).replace(/^@+/, '').toLowerCase();
  const found = new Map();
  const add = (uid, via) => { if (uid && !found.has(uid)) found.set(uid, via); };

  const idx = await db.collection('name_index').doc(nameLower).get().catch(() => null);
  if (idx?.exists) add(clean(idx.data()?.uid, 180), 'name_index');

  const legacy = [
    db.collection('users').where('progress.user_name_lower', '==', nameLower).limit(10),
    db.collection('users').where('progress.user_name', '==', clean(QUERY, 32)).limit(10),
    db.collection('leaderboard').where('nameLower', '==', nameLower).limit(10),
  ];
  for (const q of legacy) {
    const snap = await q.get().catch(() => null);
    for (const d of snap?.docs ?? []) add(d.id, 'legacy_exact');
  }

  if (nameLower.length >= 2) {
    const end = nameLower.slice(0, -1) + String.fromCharCode(nameLower.charCodeAt(nameLower.length - 1) + 1);
    const snap = await db.collection('users')
      .where('progress.user_name_lower', '>=', nameLower)
      .where('progress.user_name_lower', '<', end)
      .orderBy('progress.user_name_lower').limit(25).get().catch(() => null);
    for (const d of snap?.docs ?? []) add(d.id, 'prefix');
  }
  return found;
}

async function dumpFlashcards(db, uid) {
  console.log('--- КАРТОЧКИ (сохранённые) ---');
  const cols = ['flashcard_decks', 'flashcards', 'user_flashcard_collections', 'flashcard_saves'];
  for (const col of cols) {
    const bySub = await db.collection('users').doc(uid).collection(col).limit(20).get().catch(() => null);
    if (bySub && !bySub.empty) {
      console.log(`  ▸ users/${uid}/${col} → ${bySub.size} документов`);
      for (const d of bySub.docs.slice(0, 10)) console.log(`      ${d.id}: ${JSON.stringify(d.data()).slice(0, 300)}`);
    }
    const byTop = await db.collection(col).where('uid', '==', uid).limit(20).get().catch(() => null);
    if (byTop && !byTop.empty) {
      console.log(`  ▸ ${col} [uid] → ${byTop.size} документов`);
      for (const d of byTop.docs.slice(0, 10)) console.log(`      ${d.id}: ${JSON.stringify(d.data()).slice(0, 300)}`);
    }
  }
}

async function dumpLeague(db, uid, p) {
  console.log('--- ЛИГА ---');
  const leagueKeys = Object.keys(p).filter(k => /league|tier|division|лига/i.test(k)).sort();
  for (const k of leagueKeys) console.log(`  progress.${k.padEnd(30)} = ${JSON.stringify(p[k])}`);
  const roomId = p.league_room_id || p.leagueRoomId;
  if (roomId) {
    const room = await db.collection('league_rooms').doc(String(roomId)).get().catch(() => null);
    if (room?.exists) {
      const rd = room.data() ?? {};
      console.log(`  ▸ league_rooms/${roomId}: tier=${rd.tier ?? rd.league ?? '—'} week=${rd.isoWeek ?? rd.week ?? '—'}`);
      const members = rd.members || rd.players || {};
      const mine = members?.[uid];
      if (mine) console.log(`    моё место в комнате: ${JSON.stringify(mine).slice(0, 300)}`);
    }
  }
}

async function dumpAchievements(db, uid) {
  console.log('--- НАГРАДЫ / ДОСТИЖЕНИЯ ---');
  const cols = ['user_achievements', 'achievements_unlocked', 'awards', 'user_awards'];
  for (const col of cols) {
    const bySub = await db.collection('users').doc(uid).collection(col).limit(30).get().catch(() => null);
    if (bySub && !bySub.empty) {
      console.log(`  ▸ users/${uid}/${col} → ${bySub.size} документов`);
      for (const d of bySub.docs.slice(0, 15)) console.log(`      ${d.id}`);
    }
  }
}

async function main() {
  initAdmin();
  const db = admin.firestore();

  const QUERIES = process.argv.slice(2);
  const names = QUERIES.length ? QUERIES : ['Vitaliy', 'Vitalii', 'Виталий'];

  for (const QUERY of names) {
    console.log(`\n\n████████ ПОИСК: "${QUERY}" ████████`);
    const candidates = await resolveCandidates(db, QUERY);
    if (candidates.size === 0) { console.log('❌ Ничего не найдено.'); continue; }
    console.log(`Найдено кандидатов: ${candidates.size}`);

    for (const [uid, via] of candidates) {
      const snap = await db.collection('users').doc(uid).get().catch(() => null);
      if (!snap?.exists) { console.log(`\n--- uid=${uid} (${via}) — документа нет`); continue; }
      const d = snap.data() ?? {};
      const p = d.progress ?? {};
      console.log('\n════════════════════════════════════════════════');
      console.log(`uid: ${uid}   (via ${via})`);
      console.log(`имя: "${clean(p.user_name, 40)}"  уровень ${p.user_level ?? '—'}  XP ${p.user_total_xp ?? '—'}`);
      console.log(`email: ${d.email ?? p.email ?? '—'}   создан: ${fmtTs(d.createdAt ?? p.created_at_ms)}`);
      console.log('--- ЦЕПОЧКА ДНЕЙ (streak) ---');
      const streakKeys = Object.keys(p).filter(k => /streak|стрик/i.test(k)).sort();
      for (const k of streakKeys) console.log(`  progress.${k.padEnd(30)} = ${JSON.stringify(p[k])}`);
      await dumpLeague(db, uid, p);
      await dumpFlashcards(db, uid);
      await dumpAchievements(db, uid);
    }
  }
  console.log('\n=== готово ===\n');
  process.exit(0);
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
