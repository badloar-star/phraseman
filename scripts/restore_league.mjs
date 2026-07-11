#!/usr/bin/env node
/**
 * Разовая компенсация лиги конкретному пользователю.
 *
 * Контекст: серверный финализатор лиги (league_finalize_cron) не знал про
 * XP-режим повышения и мог ПОНИЗИТЬ юзера, набравшего XP-порог. Из-за этого
 * юзер, которому клиент показал бейдж «Переход» из Изумрудной, по факту упал
 * в Платиновую. Серверный код уже исправлен, но конкретному юзеру лигу нужно
 * вернуть вручную — это отдельное действие над его данными.
 *
 * Лига хранится в users/{uid}.progress.league_state_v3 (JSON-строка вида
 * {"leagueId":N,"weekId":"...","group":[...]}) — облачный синк AsyncStorage.
 * Скрипт выставляет leagueId и, чтобы модалка итогов не «переиграла» понижение,
 * гасит league_result_pending (ставит consumed-подпись).
 *
 *   node scripts/restore_league.mjs <uid> <leagueId>          # dry-run (ничего не пишет)
 *   node scripts/restore_league.mjs <uid> <leagueId> --apply  # реально вернуть
 *
 * Пример: вернуть Изумрудную (id 5):
 *   node scripts/restore_league.mjs AbC123 5 --apply
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const UID = process.argv[2];
const LEAGUE_ID = Math.floor(Number(process.argv[3]));
const APPLY = process.argv.includes('--apply');

// Лиги 0..11 (см. app/league_engine.ts CLUBS, nameRU). 5 = Изумрудная, 4 = Платиновая, 6 = Сапфировая.
const LEAGUE_NAMES = [
  'Медная', 'Бронзовая', 'Серебряная', 'Золотая', 'Платиновая', 'Изумрудная',
  'Сапфировая', 'Рубиновая', 'Алмазная', 'Чёрного Алмаза', 'Эфирная', 'Высшая',
];

if (!UID || !Number.isFinite(LEAGUE_ID) || LEAGUE_ID < 0 || LEAGUE_ID > 11) {
  console.error('Usage: node scripts/restore_league.mjs <uid> <leagueId 0..11> [--apply]');
  console.error('  5 = Изумрудная, 4 = Платиновая, 6 = Сапфировая');
  process.exit(1);
}

if (admin.apps.length === 0) {
  let projectId;
  try { projectId = JSON.parse(readFileSync('.firebaserc', 'utf8'))?.projects?.default; } catch {}
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}
const db = admin.firestore();
const userRef = db.collection('users').doc(UID);

const snap = await userRef.get();
if (!snap.exists) { console.error(`User ${UID} not found`); process.exit(1); }

const progress = snap.data()?.progress ?? {};
const name = progress.user_name ?? '(?)';

// Разбираем текущее состояние лиги.
let leagueState = null;
try {
  const raw = progress.league_state_v3;
  if (typeof raw === 'string' && raw.trim()) leagueState = JSON.parse(raw);
} catch (e) {
  console.error(`Не удалось распарсить league_state_v3: ${e.message}`);
}
const currentLeagueId = Number.isFinite(Number(leagueState?.leagueId)) ? Number(leagueState.leagueId) : null;
const nameOf = (id) => (id == null ? '(нет)' : `${LEAGUE_NAMES[id] ?? '?'} (${id})`);

console.log(`\nПользователь: ${name}  (${UID})`);
console.log(`Лига сейчас:  ${nameOf(currentLeagueId)}`);
console.log(`Ставим:       ${nameOf(LEAGUE_ID)}`);

if (leagueState == null) {
  console.error('\n⚠ league_state_v3 отсутствует или битый — нечего править по этому пути.');
  console.error('  Юзер, возможно, ещё не синхронизировал лигу в облако. Прерываю.');
  process.exit(1);
}
if (currentLeagueId === LEAGUE_ID) {
  console.log('\nЛига уже равна целевой — менять нечего.');
  process.exit(0);
}

// Новый JSON состояния: только leagueId, остальное (weekId, group) не трогаем.
const nextState = { ...leagueState, leagueId: LEAGUE_ID };
const nextStateJson = JSON.stringify(nextState);

// Отложенный результат недели: если он непустой — гасим его и ставим consumed-
// подпись, чтобы модалка не «переиграла» понижение. Если pending уже пуст
// (понижение съедено) — НИЧЕГО про pending/подпись не трогаем, чтобы не писать
// мусор в поле подписи.
const pendingRaw = progress.league_result_pending;
const hasPending = typeof pendingRaw === 'string' && pendingRaw.trim().length > 0;
let consumedSig = null;
if (hasPending) {
  try {
    const p = JSON.parse(pendingRaw);
    // Подпись как в app/league_engine.ts leagueResultSignature: prev|new|rank|total.
    consumedSig = `${p.prevLeagueId}|${p.newLeagueId}|${p.myRank}|${p.totalInGroup}`;
  } catch {}
}

console.log(`\nЧто будет записано в users/${UID}.progress:`);
console.log(`  league_state_v3           = ${nextStateJson}`);
console.log(`  league_result_pending     = ${hasPending ? '"" (гасим)' : '(без изменений — уже пуст)'}`);
console.log(`  league_result_consumed_sig= ${consumedSig ?? '(без изменений)'}`);

if (!APPLY) {
  console.log('\n[dry-run] Ничего не записано. Добавь --apply, чтобы применить.\n');
  process.exit(0);
}

const now = Date.now();
const update = {
  'progress.league_state_v3': nextStateJson,
  updatedAt: now,
};
if (hasPending) {
  update['progress.league_result_pending'] = '';
  if (consumedSig) update['progress.league_result_consumed_sig'] = consumedSig;
}

await userRef.update(update);
console.log(`\n✓ Лига возвращена: ${nameOf(currentLeagueId)} → ${nameOf(LEAGUE_ID)} для ${name}.`);
console.log('  Юзеру нужно перезайти/дождаться синка, чтобы увидеть изменение.\n');
process.exit(0);
