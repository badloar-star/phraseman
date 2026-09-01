#!/usr/bin/env node
/**
 * Разовая диагностика жалобы «Издевательство» (Jānis, dubuljan279@gmail.com,
 * 01.09.2026): уровень скачет.
 *
 * Симптомы со слов человека:
 *   • шестигранник аватарки показывает 50, а надпись рядом «Уровень 13»;
 *   • после урока «достиг 13 уровня», потом всё сначала — «уже раз 10»;
 *   • однажды показало ранее достигнутый 41 уровень, хотя был 42;
 *   • после урока ничего не поменялось, а ПОСЛЕ РЕСТАРТА уровень упал до 12;
 *   • «дни поменялись со 155 в 20:11 на 52 в 20:30».
 *
 * зачем: правило проекта — сперва факты, потом починка. Логов с телефона нет,
 * но есть его данные на сервере. Скрипт ТОЛЬКО ЧИТАЕТ и ничего не пишет.
 *
 *   node scripts/inspect_level_drift_complaint.mjs [email|имя|uid]
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const QUERY = process.argv[2] || 'dubuljan279@gmail.com';

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
  return `${new Date(n).toISOString()} (${n})`;
};

// Формула уровня — ТОЧНАЯ копия constants/theme.ts (getLevelFromXP).
// Приблизительная версия здесь была бы хуже отсутствия: диагностика соврала бы
// уверенным тоном, и мы чинили бы не то.
const XP_BASE = 400;
const XP_EXP = 1.82;
const XP_EXP_INV = 1 / XP_EXP;
const LEGENDARY_BASE_LEVEL = 50;
const LEGENDARY_XP_STEP = 150000;
const MAX_LEVEL = 60;

const totalXpForStandardLevel = (level) => (level <= 1
  ? 0
  : Math.round(XP_BASE * Math.pow(level - 1, XP_EXP)));

const totalXpForLegendaryLevel = (level) => {
  const legendaryLevels = Math.max(0, level - LEGENDARY_BASE_LEVEL);
  return totalXpForStandardLevel(LEGENDARY_BASE_LEVEL)
    + Math.round((LEGENDARY_XP_STEP * legendaryLevels * (legendaryLevels + 1)) / 2);
};

const totalXpForLevel = (level) => {
  if (level <= 1) return 0;
  if (level <= LEGENDARY_BASE_LEVEL) return totalXpForStandardLevel(level);
  return totalXpForLegendaryLevel(level);
};

const normalizeLevelForXp = (level, totalXp) => {
  let normalized = Math.max(1, Math.min(MAX_LEVEL, level));
  while (normalized < MAX_LEVEL && totalXp >= totalXpForLevel(normalized + 1)) normalized += 1;
  while (normalized > 1 && totalXp < totalXpForLevel(normalized)) normalized -= 1;
  return normalized;
};

function levelFromXp(totalXpRaw) {
  const totalXp = Math.max(0, Math.floor(Number(totalXpRaw) || 0));
  if (totalXp <= 0) return 1;
  const firstLegendary = totalXpForLegendaryLevel(LEGENDARY_BASE_LEVEL + 1);
  if (totalXp < firstLegendary) {
    const estimated = Math.min(LEGENDARY_BASE_LEVEL, Math.floor(Math.pow(totalXp / XP_BASE, XP_EXP_INV)) + 1);
    return normalizeLevelForXp(estimated, totalXp);
  }
  const legendaryXp = totalXp - totalXpForStandardLevel(LEGENDARY_BASE_LEVEL);
  const legendaryLevels = Math.floor((Math.sqrt(1 + (8 * legendaryXp) / LEGENDARY_XP_STEP) - 1) / 2);
  return normalizeLevelForXp(LEGENDARY_BASE_LEVEL + Math.max(0, legendaryLevels), totalXp);
}

async function resolveUid(db, auth, query) {
  const q = clean(query, 180);
  // 1) прямой uid
  const direct = await db.collection('users').doc(q).get().catch(() => null);
  if (direct?.exists) return { uid: q, via: 'uid' };
  // 2) по email через Auth
  if (q.includes('@')) {
    const rec = await auth.getUserByEmail(q).catch(() => null);
    if (rec?.uid) return { uid: rec.uid, via: 'auth_email' };
  }
  // 3) по имени
  const lower = q.toLowerCase();
  const idx = await db.collection('name_index').doc(lower).get().catch(() => null);
  if (idx?.exists) return { uid: clean(idx.data()?.uid, 180), via: 'name_index' };
  const byName = await db.collection('users')
    .where('progress.user_name_lower', '==', lower).limit(5).get().catch(() => null);
  if (byName && !byName.empty) return { uid: byName.docs[0].id, via: 'user_name_lower' };
  return null;
}

async function main() {
  initAdmin();
  const db = admin.firestore();
  const auth = admin.auth();

  console.log('='.repeat(78));
  console.log('ДИАГНОСТИКА СКАЧУЩЕГО УРОВНЯ · запрос:', QUERY);
  console.log('='.repeat(78));

  const resolved = await resolveUid(db, auth, QUERY);
  if (!resolved) {
    console.log('НЕ НАЙДЕН. Попробуй передать uid или точное имя аргументом.');
    return;
  }
  const { uid, via } = resolved;
  console.log(`uid = ${uid}   (найден через: ${via})\n`);

  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) {
    console.log('Документ users/' + uid + ' НЕ СУЩЕСТВУЕТ — это само по себе объясняло бы сброс.');
    return;
  }
  const data = snap.data() ?? {};
  const p = data.progress ?? {};

  // ── 1. Три источника уровня: расходятся ли они ─────────────────────────────
  console.log('--- 1. ИСТОЧНИКИ УРОВНЯ (главная улика) ---');
  const totalXp = Number(p.user_total_xp ?? 0);
  const avatarRaw = p.user_avatar ?? null;
  const avatarIndex = /^\d+$/.test(String(avatarRaw ?? '')) ? parseInt(String(avatarRaw), 10) : null;
  const computed = levelFromXp(totalXp);
  console.log(`  опыт (user_total_xp)      = ${totalXp}`);
  console.log(`  уровень ПО ОПЫТУ          = ${computed}      <- это рисует надпись «Уровень N»`);
  console.log(`  user_avatar               = ${JSON.stringify(avatarRaw)}`);
  console.log(`  цифра НА ШЕСТИГРАННИКЕ    = ${avatarIndex ?? '(кастомная аватарка)'}   <- это рисует бейдж`);
  console.log(`  user_frame                = ${JSON.stringify(p.user_frame ?? null)}`);
  if (avatarIndex !== null && avatarIndex !== computed) {
    console.log(`  >>> РАСХОЖДЕНИЕ: бейдж ${avatarIndex} против уровня ${computed} (разница ${avatarIndex - computed})`);
  } else {
    console.log('  >>> совпадают');
  }

  // ── 2. Счётчики, которые «прыгали» ────────────────────────────────────────
  console.log('\n--- 2. СЧЁТЧИКИ, НА КОТОРЫЕ ОН ЖАЛОВАЛСЯ ---');
  for (const key of [
    'streak_count', 'last_active_date', 'streak_last_date',
    'stars', 'stars_earned_total', 'shards_balance',
    'weekly_xp', 'weekly_xp_period_start', 'week_points_v2',
    'lessons_completed', 'accountGeneration',
  ]) {
    if (p[key] !== undefined) console.log(`  progress.${key.padEnd(26)} = ${JSON.stringify(p[key]).slice(0, 160)}`);
  }

  // ── 3. Авторитетность сервера — та самая ветка отката ─────────────────────
  console.log('\n--- 3. ФЛАГИ, РАЗРЕШАЮЩИЕ ОБЛАКУ ПЕРЕЗАПИСАТЬ ТЕЛЕФОН ---');
  console.log('  (cloud_sync: phoneStateOwnsCore и progressServerAuthoritative');
  console.log('   перезаписывают локальный прогресс НЕ СРАВНИВАЯ числа)');
  for (const key of Object.keys(data).filter((k) => /authorit|owns|server|migrat|generation/i.test(k))) {
    console.log(`  ${key.padEnd(34)} = ${JSON.stringify(data[key]).slice(0, 200)}`);
  }
  for (const key of Object.keys(p).filter((k) => /authorit|owns|server|migrat|generation/i.test(k))) {
    console.log(`  progress.${key.padEnd(25)} = ${JSON.stringify(p[key]).slice(0, 200)}`);
  }

  // ── 4. Серверный кошелёк прогресса (авторитетный источник) ────────────────
  console.log('\n--- 4. СЕРВЕРНЫЙ ПРОГРЕСС (авторитетный) ---');
  for (const col of ['progress_wallets', 'progress_state', 'user_progress', 'progress_ledger']) {
    const doc = await db.collection(col).doc(uid).get().catch(() => null);
    if (doc?.exists) {
      const d = doc.data() ?? {};
      console.log(`  ▸ ${col}/${uid}:`);
      for (const [k, v] of Object.entries(d).slice(0, 25)) {
        console.log(`      ${k.padEnd(28)} = ${JSON.stringify(v).slice(0, 140)}`);
      }
      const serverXp = Number(d.totalXp ?? d.total_xp ?? d.xp ?? NaN);
      if (Number.isFinite(serverXp)) {
        console.log(`      >>> уровень по серверному опыту = ${levelFromXp(serverXp)} (xp ${serverXp})`);
        if (serverXp !== totalXp) {
          console.log(`      >>> РАСХОЖДЕНИЕ с users/progress: разница ${totalXp - serverXp} XP`);
        }
      }
    }
  }

  // ── 5. Несколько аккаунтов на одну личность — классическая причина ────────
  console.log('\n--- 5. ДУБЛИ АККАУНТА (одна личность → несколько uid) ---');
  const email = clean(data.email ?? p.email ?? '', 180);
  if (email) {
    const rec = await auth.getUserByEmail(email).catch(() => null);
    if (rec) {
      console.log(`  auth: uid=${rec.uid} создан=${rec.metadata?.creationTime} вход=${rec.metadata?.lastSignInTime}`);
      console.log(`  провайдеры: ${(rec.providerData ?? []).map((x) => x.providerId).join(', ') || '—'}`);
      if (rec.uid !== uid) console.log(`  >>> ВНИМАНИЕ: auth uid (${rec.uid}) != документ users (${uid})`);
    }
  }
  const stableId = clean(p.stable_id ?? data.stableId ?? '', 180);
  console.log(`  stable_id в документе = ${stableId || '—'}`);
  if (stableId) {
    const sameStable = await db.collection('users')
      .where('progress.stable_id', '==', stableId).limit(10).get().catch(() => null);
    if (sameStable && sameStable.size > 1) {
      console.log(`  >>> НАЙДЕНО ${sameStable.size} документов с ТЕМ ЖЕ stable_id:`);
      for (const d of sameStable.docs) {
        const dp = d.data()?.progress ?? {};
        const dxp = Number(dp.user_total_xp ?? 0);
        console.log(`      ${d.id}  xp=${dxp}  уровень=${levelFromXp(dxp)}  avatar=${dp.user_avatar ?? '—'}  обновлён=${fmtTs(d.data()?.updatedAtMs ?? dp.updated_at_ms)}`);
      }
    } else {
      console.log('  дублей по stable_id не найдено');
    }
  }

  // ── 6. Спины: у него на скриншоте «Спин 6» ────────────────────────────────
  console.log('\n--- 6. СПИНЫ И НАГРАДЫ ЗА УРОВЕНЬ ---');
  for (const key of Object.keys(p).filter((k) => /spin|level_up|level_gift/i.test(k))) {
    console.log(`  progress.${key.padEnd(30)} = ${JSON.stringify(p[key]).slice(0, 160)}`);
  }

  // ── 7. Хронология: когда документ трогали ─────────────────────────────────
  console.log('\n--- 7. ХРОНОЛОГИЯ ---');
  console.log(`  updatedAtMs        = ${fmtTs(data.updatedAtMs ?? p.updated_at_ms)}`);
  console.log(`  createdAtMs        = ${fmtTs(data.createdAtMs ?? p.created_at_ms)}`);
  const events = await db.collection('progress_events')
    .where('uid', '==', uid).orderBy('createdAtMs', 'desc').limit(25).get().catch(() => null);
  if (events && !events.empty) {
    console.log(`  последние ${events.size} событий прогресса:`);
    for (const d of events.docs) {
      const e = d.data() ?? {};
      console.log(`    ${fmtTs(e.createdAtMs)}  ${clean(e.kind ?? e.type, 28).padEnd(28)} xp=${e.xpDelta ?? e.xp ?? '—'} lvl=${e.level ?? '—'}`);
    }
  } else {
    console.log('  progress_events: пусто или коллекция недоступна');
  }

  console.log('\n' + '='.repeat(78));
  console.log('ЧТО ИСКАТЬ В ВЫВОДЕ:');
  console.log(' • блок 1: расходятся ли бейдж и уровень — подтверждает жалобу «50 и 13»');
  console.log(' • блок 4: серверный опыт НИЖЕ локального → откат при синхронизации');
  console.log(' • блок 5: два uid на одну личность → «после рестарта всё сначала»');
  console.log('='.repeat(78));
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('ОШИБКА ДИАГНОСТИКИ:', e?.message || e);
  process.exit(1);
});
