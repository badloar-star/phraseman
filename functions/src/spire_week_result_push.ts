// ═══════════════════════════════════════════════════════════════════════════
// spire_week_result_push.ts — пуш понедельника «итог + новый шпиль» (PM-281,
// TOWER.md T30/§4.7).
//
// зачем: владелец — «Пуши: понедельник (итог + новый шпиль), воскресенье
// (у края зоны). Больше ничего.» Понедельничный пуш обязан уйти ПОСЛЕ того,
// как spireFinalizeCron подвёл итоги недели (не до) — иначе текст «Ты
// поднялся в Нефрит» соврёт про шпиль, который ещё не записан.
//
// Экономия (владелец: «посмотри как уже решено для похожих массовых
// уведомлений, не изобретай свой дорогой способ»): НЕ отдельный крон и НЕ
// новый скан users/ или spire_week_results/. Кандидаты собираются ПОПУТНО,
// внутри уже идущего spireFinalizeCron — тот и так проходит каждого живого
// участника каждой комнаты прошлой недели (uid, lang, prevTier/newTier,
// promoted/demoted уже в памяти). Тот же приём, что и у tournament_start_push
// (см. его шапку): «отдельного крона НЕТ намеренно — это сэкономленные
// чтения Firestore при том же результате». Токены докупаются ОДНИМ
// db.getAll(...) по всем собранным uid (а не .get() на каждого), чанками —
// Firestore ограничивает getAll практическим пределом на вызов.
//
// Права уведомления (PM-200): pushPrefs.streak (мастер && «Серия под угрозой»)
// или устаревший pushPrefs.league === false — см. isSpirePushOptedOut в
// spire_notifications.ts. Повтор прогона не дублирует пуш: метка недели
// spireWeekResultPushWeekId в users/{uid}.
//
// Чистая логика (отбор кандидата, выбор текста, сборка сообщения) отдельно
// от I/O — покрывается unit-тестами без сети и Firestore.
// ═══════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import {
  chunkSpirePushMessages,
  isSpirePushOptedOut,
  isValidSpireExpoPushToken,
  readSpirePushMark,
  readSpirePushPrefs,
  sendSpireExpoPushChunk,
  spirePushTierName,
  stampSpirePushMarks,
  SPIRE_WEEK_RESULT_PUSH_MARK_FIELD,
  type SpireExpoPushMessage,
  type SpirePushPrefs,
} from './spire_notifications';

const LOG = '[SPIRE-RESULT-PUSH]';

/** Итог одного живого участника, собранный ПОПУТНО во время цикла spireFinalizeCron. */
export type SpireWeekResultPushInput = Readonly<{
  uid: string;
  /** Язык изучения (en/es/de/fr…) — НЕ язык интерфейса; нужен только для лога. */
  studyLang: string;
  prevTier: number;
  newTier: number;
  promoted: boolean;
  demoted: boolean;
}>;

export type SpireWeekResultPushUser = Readonly<{
  expoPushToken?: string | null;
  /** Язык интерфейса (в отличие от studyLang выше) — текст пушей выбирается по нему. */
  pushTokenLang?: string | null;
  pushPrefs?: SpirePushPrefs | null;
  /** weekId, за который итог уже отправлен (метка идемпотентности, PM-200). */
  sentForWeekId?: string | null;
}>;

export interface SpireWeekResultPushCandidate {
  uid: string;
  token: string;
  uiLang: string;
  prevTier: number;
  newTier: number;
  promoted: boolean;
  demoted: boolean;
}

/** Почему пуш не шлём (null = шлём). Чистая функция. */
export function spireWeekResultSkipReason(
  u: SpireWeekResultPushUser,
  weekId?: string | null,
): 'no_token' | 'opted_out' | 'already_sent' | null {
  if (!isValidSpireExpoPushToken(u.expoPushToken)) return 'no_token';
  if (isSpirePushOptedOut(u.pushPrefs)) return 'opted_out';
  if (weekId && u.sentForWeekId === weekId) return 'already_sent';
  return null;
}

/** Слать ли юзеру понедельничный пуш — валидный токен и нет opt-out (PM-200). */
export function shouldSendSpireWeekResultPush(u: SpireWeekResultPushUser, weekId?: string | null): boolean {
  return spireWeekResultSkipReason(u, weekId) === null;
}

/**
 * Собирает кандидатов из результатов недели + докупленных документов users/ (чистая функция).
 * Один пуш на человека за прогон: при нескольких языках изучения берётся первый итог.
 */
export function buildSpireWeekResultCandidates(
  results: readonly SpireWeekResultPushInput[],
  usersByUid: ReadonlyMap<string, SpireWeekResultPushUser>,
  weekId?: string | null,
): SpireWeekResultPushCandidate[] {
  const out: SpireWeekResultPushCandidate[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    const u = usersByUid.get(r.uid);
    if (!u || seen.has(r.uid) || !shouldSendSpireWeekResultPush(u, weekId)) continue;
    seen.add(r.uid);
    out.push({
      uid: r.uid,
      token: u.expoPushToken as string,
      uiLang: u.pushTokenLang || 'ru',
      prevTier: r.prevTier,
      newTier: r.newTier,
      promoted: r.promoted,
      demoted: r.demoted,
    });
  }
  return out;
}

type Copy = { title: string; body: string };

/**
 * Текст итога недели. Три исхода: повышение (T30 «итог + новый шпиль» —
 * называем оба), понижение (без злорадства — только факт и новый шпиль),
 * остался на месте (T33: «Новый шпиль недели отличается только видом» —
 * поэтому даже без смены tier есть что сказать: новый шпиль недели начался).
 */
export function buildSpireWeekResultCopy(
  c: SpireWeekResultPushCandidate,
): Copy {
  const newTierName = spirePushTierName(c.newTier, c.uiLang);
  if (c.promoted) {
    const byLang: Record<string, Copy> = {
      ru: { title: '🏔️ Шпиль подвёл итог недели', body: `Ты поднялся в ${newTierName}! Новый шпиль уже ждёт.` },
      uk: { title: '🏔️ Шпиль підбив підсумок тижня', body: `Ти піднявся в ${newTierName}! Новий шпиль вже чекає.` },
    };
    return byLang[c.uiLang] || byLang.ru;
  }
  if (c.demoted) {
    const byLang: Record<string, Copy> = {
      ru: { title: '🏔️ Новая неделя в Шпиле', body: `Ты в шпиле ${newTierName}. Новый шпиль недели уже открыт — поднимайся заново.` },
      uk: { title: '🏔️ Новий тиждень у Шпилі', body: `Ти в шпилі ${newTierName}. Новий шпиль тижня вже відкрито — піднімайся знову.` },
    };
    return byLang[c.uiLang] || byLang.ru;
  }
  const byLang: Record<string, Copy> = {
    ru: { title: '🏔️ Новый шпиль недели', body: `Твой шпиль — ${newTierName}. Новая неделя, новый вид — поднимайся.` },
    uk: { title: '🏔️ Новий шпиль тижня', body: `Твій шпиль — ${newTierName}. Новий тиждень, новий вигляд — піднімайся.` },
  };
  return byLang[c.uiLang] || byLang.ru;
}

/** Собирает Expo-сообщение для кандидата (чистая функция). */
export function buildSpireWeekResultMessage(c: SpireWeekResultPushCandidate): SpireExpoPushMessage {
  const copy = buildSpireWeekResultCopy(c);
  return {
    to: c.token,
    title: copy.title,
    body: copy.body,
    sound: 'default',
    data: { type: 'spire_week_result', promoted: c.promoted, demoted: c.demoted, newTier: c.newTier },
  };
}

export interface SpireWeekResultPushSummary {
  results: number;
  candidates: number;
  sent: number;
  failedChunks: number;
  optedOut?: number;
  alreadySent?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Понедельник 00:00 UTC недели, в которую попадает nowMs (как spireWeekStartMs). */
function weekStartUtcMs(nowMs: number): number {
  const now = new Date(nowMs);
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday);
}

/**
 * ISO-неделя, итог которой подводит понедельничный крон (= spirePreviousWeek
 * из spire_finalize_cron.ts). Своя копия, чтобы не делать циклический импорт
 * (крон импортирует этот модуль). Формат как у spireWeekId: YYYY-Www.
 */
export function spireResultPushWeekId(nowMs: number): string {
  const prevStart = weekStartUtcMs(weekStartUtcMs(nowMs) - 1);
  const date = new Date(prevStart + 3 * DAY_MS); // четверг той недели задаёт год ISO-недели
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const weekNum = Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Точка входа, вызываемая ИЗНУТРИ spireFinalizeCron после того, как все
 * комнаты недели подведены (аргумент results собран за время его прогона).
 *
 * Один db.getAll(...) на все собранные uid (чанками) — 1 доп. чтение на
 * живого участника, ноль лишних чтений на ботов и на тех, кто не играл на
 * этой неделе (их вообще нет в results). Провал отправки не мешает основному
 * результату крона: пуш — не источник истины, итог уже записан в Firestore
 * и его увидит экран Шпиля фактом при заходе (§4.7).
 */
export async function runSpireWeekResultPush(
  db: admin.firestore.Firestore,
  results: readonly SpireWeekResultPushInput[],
  // зачем optional: вызывающий spireFinalizeCron сейчас правит другая сессия;
  // без аргумента считаем ту же «прошлую неделю», что и крон.
  weekId: string = spireResultPushWeekId(Date.now()),
): Promise<SpireWeekResultPushSummary> {
  if (results.length === 0) {
    console.log(LOG, JSON.stringify({ event: 'skip', reason: 'no_results', weekId }));
    return { results: 0, candidates: 0, sent: 0, failedChunks: 0 };
  }

  const GET_ALL_CHUNK = 300;
  const usersByUid = new Map<string, SpireWeekResultPushUser>();
  for (let i = 0; i < results.length; i += GET_ALL_CHUNK) {
    const slice = results.slice(i, i + GET_ALL_CHUNK);
    const refs = slice.map((r) => db.collection('users').doc(r.uid));
    // guard-ok: db.getAll — один сетевой вызов на чанк, не N вызовов .get().
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap, idx) => {
      const data = snap.data() as Record<string, unknown> | undefined;
      usersByUid.set(slice[idx].uid, {
        expoPushToken: typeof data?.expoPushToken === 'string' ? data.expoPushToken : null,
        pushTokenLang: typeof data?.pushTokenLang === 'string' ? data.pushTokenLang : null,
        pushPrefs: readSpirePushPrefs(data?.pushPrefs),
        sentForWeekId: readSpirePushMark(data, SPIRE_WEEK_RESULT_PUSH_MARK_FIELD),
      });
    });
  }

  let optedOut = 0;
  let alreadySent = 0;
  for (const u of usersByUid.values()) {
    const reason = spireWeekResultSkipReason(u, weekId);
    if (reason === 'opted_out') optedOut++;
    else if (reason === 'already_sent') alreadySent++;
  }
  if (optedOut > 0 || alreadySent > 0) {
    // Только счётчики — без uid/токенов.
    console.log('[PUSH-PREFS]', JSON.stringify({ event: 'spire_week_result_skip', weekId, optedOut, alreadySent }));
  }

  const candidates = buildSpireWeekResultCandidates(results, usersByUid, weekId);
  if (candidates.length === 0) {
    console.log(LOG, JSON.stringify({ event: 'skip', reason: 'no_candidates', weekId, optedOut, alreadySent }));
    return { results: results.length, candidates: 0, sent: 0, failedChunks: 0, optedOut, alreadySent };
  }

  let sent = 0;
  let failedChunks = 0;
  for (const chunk of chunkSpirePushMessages(candidates, 100)) {
    try {
      await sendSpireExpoPushChunk(chunk.map(buildSpireWeekResultMessage));
      sent += chunk.length;
    } catch (err) {
      failedChunks++;
      console.error(LOG, JSON.stringify({ event: 'chunk_failed', error: String((err as Error)?.message ?? err) }));
      continue;
    }
    try {
      await stampSpirePushMarks(db, chunk.map((c) => c.uid), SPIRE_WEEK_RESULT_PUSH_MARK_FIELD, weekId);
    } catch (err) {
      // Пуш уже ушёл; без метки повторный прогон может его продублировать — громко.
      console.error('[PUSH-PREFS]', JSON.stringify({
        event: 'spire_week_result_mark_failed', weekId, count: chunk.length,
        error: String((err as Error)?.message ?? err),
      }));
    }
  }

  const summary = { results: results.length, candidates: candidates.length, sent, failedChunks, optedOut, alreadySent };
  console.log(LOG, JSON.stringify({ event: 'done', ...summary }));
  return summary;
}
