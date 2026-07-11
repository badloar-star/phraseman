/**
 * reply_to_reports.mjs — массовая рассылка ответов юзерам на репорты ИЗ ЛОКАЛЬНОЙ СЕССИИ ЛЛМ.
 *
 * Зеркало cloud-функции adminReplyToReport (functions/src/report_replies.ts), но через
 * Admin SDK: ЛЛМ-сессия (Claude Code) не залогинена в админку и не может дёргать callable —
 * зато может запустить этот скрипт с service-account.json из корня проекта.
 *
 * Поток (см. шапку, которую админка вшивает в «📋 Копировать все репорты»):
 *   1) Админ копирует пачку репортов из админки → вставляет в ЛЛМ.
 *   2) ЛЛМ чинит подтверждённые баги в коде, готовит вежливые ответы юзерам,
 *      пишет replies.json и запускает этот скрипт.
 *   3) Каждый юзер получает ответ в колокольчик приложения; если подтвердилось —
 *      с кнопкой «Забрать осколки» (клейм через CF claimReportReward).
 *
 * Запуск:
 *   node scripts/reply_to_reports.mjs replies.json --dry-run   - preview only; no writes
 *   node scripts/reply_to_reports.mjs replies.json --send      - live send only after manual confirmation
 *
 * Формат replies.json — массив объектов:
 *   {
 *     "reportId": "abc123",              // id документа репорта (поле id из выгрузки)
 *     "uid": "stable-uid-юзера",         // поле uid из выгрузки
 *     "title": "Спасибо за репорт!",     // заголовок уведомления НА ЯЗЫКЕ ЮЗЕРА
 *     "body": "Ошибка исправлена…",      // 2-4 предложения, вежливо, на языке юзера
 *     "shards": 1,                        // 1+ если подтвердилось, 0 если нет
 *     "reportCollection": "error_reports" // опционально, дефолт error_reports
 *   }
 *
 * Идемпотентность: репорт с уже проставленным replyMessageId пропускается (skip),
 * повторный запуск того же файла не шлёт дубли и не задваивает награды.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let admin;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REPORT_COLLECTIONS = new Set([
  'error_reports',
  'explain_report_entries',
  'user_reports',
  'community_pack_reports',
]);
const HELPFUL_REPORTS_CONFIRMED_KEY = 'helpful_error_reports_confirmed_v1';
const TOP_HELPERS_COLLECTION = 'top_helpers';
const SHARDS_MAX = 100;
const TITLE_MAX = 120;
const BODY_MAX = 1200;

/**
 * Публичные поля профиля для проекции борда «Топ хелперов».
 *
 * ИСТОЧНИК ПРОФИЛЯ (как во всём проекте — arena/help_board/league_chat):
 * leaderboard/{uid} — вторичная проекция, её НЕТ у юзеров, не попавших в топ лиги.
 * Поэтому имя/аватар/уровень читаем с фолбэком на users/{uid}.progress.user_*
 * (первичный источник). Без этого на борде «—» и уровень 1 у реальных юзеров.
 * Зеркало functions/src/report_replies.ts.
 */
function readLeaderboardProjection(data, progress, report) {
  const d = data ?? {};
  const p = progress ?? {};
  const r = report ?? {};
  const str = (v, max = 64) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : '');
  const int = (v) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const proj = {
    isPremium: !!d.isPremium || !!r.userPremium,
    isVip: !!d.isVip,
    isLifetime: !!d.isLifetime,
    // profileCardLevel = ФЛАГ карточки (0..1), НЕ игровой уровень.
    profileCardLevel: int(d.profileCardLevel),
  };
  // Настоящий игровой уровень: progress.user_level → report.userLevel.
  const gameLevel = int(p.user_level) || int(r.userLevel);
  if (gameLevel > 0) proj.gameLevel = gameLevel;
  // Профиль по приоритету: progress → leaderboard → САМ РЕПОРТ (userName/userAvatar…).
  const name = str(p.user_name, 60) || str(d.displayName, 60) || str(d.name, 60) || str(r.userName, 60);
  if (name) proj.displayName = name;
  const avatar = str(p.user_avatar) || str(d.avatar) || str(r.userAvatar);
  if (avatar) proj.avatar = avatar;
  const aura = str(p.user_avatar_aura) || str(d.aura) || str(r.userAvatarAura);
  if (aura) proj.aura = aura;
  const frame = str(p.user_avatar_frame) || str(d.frame) || str(r.userAvatarFrame);
  if (frame) proj.frame = frame;
  const theme = str(d.profileCardTheme) || str(p.profile_card_theme);
  if (theme) proj.profileCardTheme = theme;
  const crownCount = int(d.leagueCrownCount);
  if (crownCount > 0) proj.leagueCrownCount = crownCount;
  const crownExpires = int(d.leagueCrownExpiresAt);
  if (crownExpires > 0) proj.leagueCrownExpiresAt = crownExpires;
  return proj;
}

/**
 * Активна ли разовая покупка «Навсегда» (Pro) по данным users/{uid}.progress.
 * Зеркало серверного isLifetimePlanActive: premium_plan==='lifetime' и store-премиум
 * не истёк (premium_expiry '0'/будущее). Мягко: любой мусор → false.
 */
function isLifetimeFromUserData(userData) {
  const progress = (userData && userData.progress) || {};
  const plan = String(progress.premium_plan ?? '').trim().toLowerCase();
  if (plan !== 'lifetime') return false;
  const expiryRaw = progress.premium_expiry;
  // '0' / отсутствие = бессрочный store-премиум (lifetime) → активен.
  const expiryMs = Number(expiryRaw);
  if (expiryRaw == null || expiryRaw === '' || String(expiryRaw).trim() === '0') return true;
  return Number.isFinite(expiryMs) && expiryMs > Date.now();
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

const fileArg = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
const send = process.argv.includes('--send');
if (!fileArg) fail('Usage: node scripts/reply_to_reports.mjs <replies_batch.json> --dry-run|--send');

let rows;
try {
  rows = JSON.parse(readFileSync(path.resolve(fileArg), 'utf8'));
} catch (e) {
  fail(`Не удалось прочитать ${fileArg}: ${e.message}`);
}
if (!Array.isArray(rows) || rows.length === 0) fail('replies.json: ожидается непустой массив');

// Валидация ДО любых записей: один битый элемент — не шлём ничего (fail fast).
const clean = rows.map((row, i) => {
  const at = `элемент #${i + 1}`;
  const reportId = String(row.reportId ?? '').trim();
  const uid = String(row.uid ?? '').trim();
  const title = String(row.title ?? '').trim().slice(0, TITLE_MAX);
  const body = String(row.body ?? '').trim().slice(0, BODY_MAX);
  const shards = Math.floor(Number(row.shards ?? 0));
  const reportCollection = String(row.reportCollection ?? 'error_reports').trim();
  if (!reportId) fail(`${at}: пустой reportId`);
  if (!uid || uid === 'unknown' || uid === 'test_uid_abc123') fail(`${at}: невалидный uid "${uid}"`);
  if (!title || !body) fail(`${at}: пустой title/body`);
  if (!Number.isFinite(shards) || shards < 0 || shards > SHARDS_MAX) fail(`${at}: shards должен быть 0..${SHARDS_MAX}`);
  if (!REPORT_COLLECTIONS.has(reportCollection)) fail(`${at}: неизвестная reportCollection "${reportCollection}"`);
  return { reportId, uid, title, body, shards, reportCollection };
});

if (dryRun) {
  console.log(`🔍 DRY-RUN: ${clean.length} ответ(ов)\n`);
  for (const item of clean) {
    console.log(`  · ${item.reportCollection}/${item.reportId} → users/${item.uid.slice(0, 10)}… (+${item.shards}💎)`);
    console.log(`    «${item.title}» — ${item.body.slice(0, 120)}${item.body.length > 120 ? '…' : ''}`);
  }
  console.log('\n🔍 DRY-RUN завершён — ничего не записано и Firebase Admin не инициализирован.');
  process.exit(0);
}
if (!send) fail('Live-режим требует явного флага --send. Без него используйте --dry-run.');

admin = require('firebase-admin');

let serviceAccount;
try {
  serviceAccount = require(path.join(ROOT, 'service-account.json'));
} catch {
  fail('Нет service-account.json в корне проекта (Firebase Console → Project Settings → Service Accounts)');
}
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function sendOne(item) {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const reportRef = db.collection(item.reportCollection).doc(item.reportId);
  const userRef = db.collection('users').doc(item.uid);
  const messageRef = userRef.collection('user_messages').doc();
  const notificationRef = userRef.collection('notifications').doc(`report_reply_${messageRef.id}`);
  const auditRef = db.collection('admin_log').doc();
  const helperRef = db.collection(TOP_HELPERS_COLLECTION).doc(item.uid);
  // Публичный профиль для проекции борда (то же, что читает Зал славы). Читаем до
  // транзакции: leaderboard редко меняется, лишний tx.get на каждый ответ — трата.
  let helperProjection = null;
  if (item.shards > 0) {
    // 3 источника профиля читаем параллельно: users.progress → leaderboard → САМ РЕПОРТ
    // (userName/userLevel/userXP). Репорт — самый надёжный источник имени/уровня хелпера.
    const [leaderboardSnap, userSnap, reportProfileSnap] = await Promise.all([
      db.collection('leaderboard').doc(item.uid).get(),
      userRef.get().catch(() => null),
      reportRef.get().catch(() => null),
    ]);
    const userData = userSnap?.data() ?? {};
    helperProjection = readLeaderboardProjection(
      leaderboardSnap.data(),
      userData.progress,
      reportProfileSnap?.data(),
    );
    // Pro-план резолвим из users/{uid} (leaderboard премиум-поля не обновляет).
    helperProjection.isLifetime = isLifetimeFromUserData(userData);
  }

  return db.runTransaction(async (tx) => {
    const reportSnap = await tx.get(reportRef);
    if (!reportSnap.exists) return { status: 'missing' };
    const report = reportSnap.data() ?? {};
    if (typeof report.replyMessageId === 'string' && report.replyMessageId) return { status: 'skip' };

    tx.set(messageRef, {
      kind: 'report_reply',
      title: item.title,
      body: item.body,
      shards: item.shards,
      claimed: false,
      claimedAtMs: null,
      reportCollection: item.reportCollection,
      reportId: item.reportId,
      adminEmail: 'llm_reply_script',
      createdAt: nowIso,
      createdAtMs: nowMs,
    });

    tx.set(notificationRef, {
      type: 'report_reply',
      fromUid: 'phraseman_team',
      fromName: 'Phraseman',
      fromAvatar: '',
      text: item.title.slice(0, 160),
      nav: { kind: 'report_reply', messageId: messageRef.id },
      reportReply: {
        messageId: messageRef.id,
        title: item.title,
        body: item.body,
        shards: item.shards,
        claimed: false,
        claimedAtMs: null,
        reportCollection: item.reportCollection,
        reportId: item.reportId,
      },
      read: false,
      createdAt: nowMs,
      updatedAt: nowMs,
    });

    // Подтверждённый репорт: двигаем счётчик титула И публичную проекцию борда
    // «Топ хелперов» в той же транзакции — чтобы рейтинг на борде и счётчик титула
    // никогда не разъезжались (зеркало functions/src/report_replies.ts).
    if (item.shards > 0) {
      tx.set(userRef, {
        progress: { [HELPFUL_REPORTS_CONFIRMED_KEY]: admin.firestore.FieldValue.increment(1) },
      }, { merge: true });
      tx.set(helperRef, {
        uid: item.uid,
        confirmed: admin.firestore.FieldValue.increment(1),
        lastConfirmedAtMs: nowMs,
        updatedAtMs: nowMs,
        ...(helperProjection ?? {}),
      }, { merge: true });
    }

    tx.set(reportRef, {
      status: 'answered',
      replyMessageId: messageRef.id,
      replyNotificationId: notificationRef.id,
      replyShards: item.shards,
      repliedAt: nowIso,
      repliedBy: 'llm_reply_script',
    }, { merge: true });

    tx.set(auditRef, {
      ts: nowIso,
      adminEmail: 'llm_reply_script',
      action: 'reply_to_report',
      uid: item.uid,
      details: { reportCollection: item.reportCollection, reportId: item.reportId, shards: item.shards, title: item.title },
    });

    return { status: 'sent', messageId: messageRef.id, notificationId: notificationRef.id };
  });
}

(async () => {
  console.log(`${dryRun ? '🔍 DRY-RUN' : '📨 Рассылка'}: ${clean.length} ответ(ов)\n`);
  let sent = 0, skipped = 0, missing = 0, errors = 0;
  for (const item of clean) {
    const label = `${item.reportCollection}/${item.reportId} → users/${item.uid.slice(0, 10)}… (+${item.shards}💎)`;
    try {
      const res = await sendOne(item);
      if (res.status === 'sent') { sent++; console.log(`  ✅ ${label}`); }
      else if (res.status === 'skip') { skipped++; console.log(`  ⏭ уже отвечен: ${label}`); }
      else { missing++; console.log(`  ⚠️ репорт не найден: ${label}`); }
    } catch (e) {
      errors++;
      console.error(`  ❌ ${label}: ${e.message}`);
    }
  }
  if (dryRun) { console.log('\n🔍 DRY-RUN завершён — ничего не записано.'); process.exit(0); }
  console.log(`\nИтог: отправлено ${sent}, пропущено (уже отвечены) ${skipped}, не найдено ${missing}, ошибок ${errors}`);
  process.exit(errors ? 1 : 0);
})();
