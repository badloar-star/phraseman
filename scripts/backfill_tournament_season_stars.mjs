#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'phraseman-ea0b3';

function readArg(name) {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || '';
}

function currentIsoWeekId(at = new Date()) {
  const date = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function weekStartMs(weekId) {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!match) throw new Error(`Bad --week value: ${weekId}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  jan4.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  jan4.setUTCDate(jan4.getUTCDate() + (week - 1) * 7);
  return jan4.getTime();
}

function scoreOf(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function credential() {
  if (existsSync('./service-account.json')) {
    return admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')));
  }
  return admin.credential.applicationDefault();
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: credential(), projectId });
}

const weekId = readArg('--week') || currentIsoWeekId();
const startMs = weekStartMs(weekId);
const endMs = startMs + 7 * 24 * 60 * 60 * 1000;
const db = admin.firestore();
const FINALIZED_BACKFILL_STATES = ['rewards', 'final', 'closed'];

function hasZeroEntryEconomySnapshot(room) {
  const economy = room.economySnapshot && typeof room.economySnapshot === 'object'
    ? room.economySnapshot
    : null;
  return !!economy && scoreOf(economy.entryGems) === 0;
}

function isTournamentTestRoom(room, roomId) {
  if (room.testMode === true) return true;
  if (room.testMode === false || !room.economySnapshot) return false;
  const slotId = typeof room.slotId === 'string' ? room.slotId : '';
  if (!roomId.startsWith('now-') && !slotId.startsWith('now-')) return false;
  const economy = room.economySnapshot && typeof room.economySnapshot === 'object'
    ? room.economySnapshot
    : {};
  return scoreOf(economy.entryGems) === 0 && scoreOf(economy.botEntryGems) === 0;
}

function isBackfillEligibleRoom(room, roomId) {
  return !isTournamentTestRoom(room, roomId) && !hasZeroEntryEconomySnapshot(room);
}

const roomsSnap = await db.collection('tournamentRooms')
  .where('startsAt', '>=', startMs)
  .where('startsAt', '<', endMs)
  .where('state', 'in', FINALIZED_BACKFILL_STATES)
  .get();

const totals = new Map();
let countedRooms = 0;
let skippedNonRewardingRooms = 0;
for (const doc of roomsSnap.docs) {
  const data = doc.data() || {};
  if (!isBackfillEligibleRoom(data, doc.id)) {
    skippedNonRewardingRooms += 1;
    continue;
  }
  const players = Array.isArray(data.players) ? data.players : [];
  let roomContributed = false;
  for (const rawPlayer of players) {
    const player = rawPlayer && typeof rawPlayer === 'object' ? rawPlayer : {};
    const uid = typeof player.id === 'string' ? player.id.trim() : '';
    if (!uid || player.isBot === true) continue;
    const stars = scoreOf(player.score);
    totals.set(uid, (totals.get(uid) || 0) + stars);
    roomContributed = true;
  }
  if (roomContributed) countedRooms += 1;
}

console.log(`${apply ? 'APPLY' : 'DRY RUN'} tournament season stars backfill`);
console.log(JSON.stringify({
  projectId,
  weekId,
  roomsRead: roomsSnap.size,
  roomsCounted: countedRooms,
  skippedNonRewardingRooms,
  usersToUpdate: totals.size,
}, null, 2));

if (!apply) {
  console.log('DRY RUN only. To write, pass --apply and set PHRASEMAN_TOURNAMENT_STARS_BACKFILL_APPLY=1.');
  process.exit(0);
}

if (process.env.PHRASEMAN_TOURNAMENT_STARS_BACKFILL_APPLY !== '1') {
  throw new Error('Refusing to write without PHRASEMAN_TOURNAMENT_STARS_BACKFILL_APPLY=1');
}

let batch = db.batch();
let batchSize = 0;
let written = 0;
for (const [uid, starsTotal] of totals.entries()) {
  const ref = db.collection('tournamentSeasons').doc(weekId).collection('entries').doc(uid);
  batch.set(ref, {
    uid,
    starsTotal,
    starsBackfilledAt: Date.now(),
    starsBackfillSource: 'tournamentRooms.players.score',
  }, { merge: true });
  batchSize += 1;
  written += 1;
  if (batchSize >= 450) {
    await batch.commit();
    batch = db.batch();
    batchSize = 0;
  }
}
if (batchSize > 0) await batch.commit();
console.log(JSON.stringify({ written }, null, 2));
