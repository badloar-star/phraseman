// ═══════════════════════════════════════════════════════════════════════════
// spire_zone_warning_push.ts — пуш воскресенья «ты у края зоны» (PM-281,
// TOWER.md T30/§4.7).
//
// зачем: владелец — «воскресенье (у края зоны повышения/понижения)».
// «Край» считается ТОЙ ЖЕ функцией зон, что уже подводит итог недели
// (spireLiveZoneSize из spire_residents.ts, ранжирование compareSpireStanding
// из spire_finalize_core.ts) — экран, боты и итог крона обязаны видеть одну
// границу (см. шапку spire_finalize_core.ts), иначе пуш соврёт про зону,
// которую итог понедельника не подтвердит.
//
// «У края» = ранг среди живых в пределах ZONE_EDGE_MARGIN мест от границы
// зоны повышения ИЛИ понижения (включая саму границу). Margin=1: предпоследнее
// место в зоне и первое место сразу за ней — это и есть «шаг решает».
// Не переиспользуем targetZoneMarginSteps (config/spire_v1.residents) —
// тот margin в СТУПЕНЯХ нужен только коридору ботов (T25/T26), а здесь нужен
// margin в МЕСТАХ среди живых, другая величина той же идеи.
//
// Экономия: крон читает ТОЛЬКО открытые (open==true) комнаты ТЕКУЩЕЙ недели —
// закрытые уже не играются и правку зон не увидят. Комнаты читаются
// страницами, как в spireFinalizeCron; проекция полей (.select) режет
// трафик так же. Токены докупаются одним db.getAll(...) по собранным uid
// кандидатов, а не .get() на каждого. Никакого нового расписания раз в
// N минут — крон раз в неделю, в воскресенье.
//
// Право уведомления и чистая логика — та же схема, что у spire_week_result_push.ts
// (PM-200: pushPrefs.streak/league через isSpirePushOptedOut; метка недели
// spireZoneWarningPushWeekId в users/{uid} — повтор крона не дублирует пуш).
// ═══════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { withCronHeartbeat } from './cron_heartbeat';
import { compareSpireStanding, spireLiveStandings, type SpireStanding } from './spire_finalize_core';
import { SPIRE_GROUPS_COLLECTION, spireWeekId } from './spire_groups';
import { spireLiveZoneSize } from './spire_residents';
import {
  chunkSpirePushMessages,
  isSpirePushOptedOut,
  isValidSpireExpoPushToken,
  readSpirePushMark,
  readSpirePushPrefs,
  sendSpireExpoPushChunk,
  stampSpirePushMarks,
  SPIRE_ZONE_WARNING_PUSH_MARK_FIELD,
  type SpireExpoPushMessage,
  type SpirePushPrefs,
} from './spire_notifications';

const LOG = '[SPIRE-ZONE-WARNING]';

/** Сколько мест от границы зоны считается «краем» — по обе стороны, включая саму границу. */
export const SPIRE_ZONE_EDGE_MARGIN_RANKS = 1;

export type SpireZoneEdgeStatus = 'promotion_edge' | 'demotion_edge' | null;

/**
 * Кто у края зоны в одной комнате (чистая функция, копия правил из
 * spire_finalize_core.ts computeSpireRoomResults, но без монет/переходов —
 * воскресный пуш ничего не записывает, только предупреждает).
 */
export function spireZoneEdgeStatuses(
  members: Readonly<Record<string, unknown>>,
): ReadonlyMap<string, SpireZoneEdgeStatus> {
  const live = spireLiveStandings(members);
  const zoneSize = spireLiveZoneSize(live.length);
  const hasAnyScorer = live.some((m) => m.steps > 0);
  const out = new Map<string, SpireZoneEdgeStatus>();
  if (zoneSize === 0) return out;

  for (const me of live) {
    const liveRank = 1 + live.filter((o) => compareSpireStanding(o, me) < 0).length;
    const bottomRank = 1 + live.filter((o) => compareSpireStanding(o, me) > 0).length;
    const scored = me.steps > 0;

    // Край зоны повышения: играл и стоит в пределах margin рангов ОТ границы
    // (внутри зоны у самой границы, или сразу за ней снаружи).
    const nearPromotion = scored && Math.abs(liveRank - zoneSize) <= SPIRE_ZONE_EDGE_MARGIN_RANKS;
    // Край зоны понижения: считается только если в комнате вообще кто-то
    // играл (иначе никого не понижают — правило spire_finalize_core.ts),
    // и только для тех, кто НЕ на грани повышения одновременно (повышение важнее,
    // T25: бот не может отнять повышение — здесь тот же приоритет для текста пуша).
    const nearDemotion = hasAnyScorer
      && !nearPromotion
      && Math.abs(bottomRank - zoneSize) <= SPIRE_ZONE_EDGE_MARGIN_RANKS;

    if (nearPromotion) out.set(me.uid, 'promotion_edge');
    else if (nearDemotion) out.set(me.uid, 'demotion_edge');
  }
  return out;
}

export type SpireZoneWarningInput = Readonly<{
  uid: string;
  status: Exclude<SpireZoneEdgeStatus, null>;
}>;

export type SpireZoneWarningUser = Readonly<{
  expoPushToken?: string | null;
  pushTokenLang?: string | null;
  pushPrefs?: SpirePushPrefs | null;
  /** weekId, за который предупреждение уже отправлено (PM-200). */
  sentForWeekId?: string | null;
}>;

export interface SpireZoneWarningCandidate {
  uid: string;
  token: string;
  uiLang: string;
  status: Exclude<SpireZoneEdgeStatus, null>;
}

/** Почему пуш не шлём (null = шлём). Чистая функция. */
export function spireZoneWarningSkipReason(
  u: SpireZoneWarningUser,
  weekId?: string | null,
): 'no_token' | 'opted_out' | 'already_sent' | null {
  if (!isValidSpireExpoPushToken(u.expoPushToken)) return 'no_token';
  if (isSpirePushOptedOut(u.pushPrefs)) return 'opted_out';
  if (weekId && u.sentForWeekId === weekId) return 'already_sent';
  return null;
}

export function shouldSendSpireZoneWarningPush(u: SpireZoneWarningUser, weekId?: string | null): boolean {
  return spireZoneWarningSkipReason(u, weekId) === null;
}

/** Один пуш на человека за прогон (несколько комнат/языков — берём первый статус). */
export function buildSpireZoneWarningCandidates(
  inputs: readonly SpireZoneWarningInput[],
  usersByUid: ReadonlyMap<string, SpireZoneWarningUser>,
  weekId?: string | null,
): SpireZoneWarningCandidate[] {
  const out: SpireZoneWarningCandidate[] = [];
  const seen = new Set<string>();
  for (const r of inputs) {
    const u = usersByUid.get(r.uid);
    if (!u || seen.has(r.uid) || !shouldSendSpireZoneWarningPush(u, weekId)) continue;
    seen.add(r.uid);
    out.push({ uid: r.uid, token: u.expoPushToken as string, uiLang: u.pushTokenLang || 'ru', status: r.status });
  }
  return out;
}

type Copy = { title: string; body: string };

/** Текст без обещаний исхода — до конца недели ещё есть время (§4.7 «фактом», не заранее). */
export function buildSpireZoneWarningCopy(c: SpireZoneWarningCandidate): Copy {
  if (c.status === 'promotion_edge') {
    const byLang: Record<string, Copy> = {
      ru: { title: '⏳ Шпиль: неделя почти кончилась', body: 'Ты у самой границы повышения. Ещё немного — и получится.' },
      uk: { title: '⏳ Шпиль: тиждень майже закінчився', body: 'Ти біля самої межі підвищення. Ще трохи — і вийде.' },
    };
    return byLang[c.uiLang] || byLang.ru;
  }
  const byLang: Record<string, Copy> = {
    ru: { title: '⏳ Шпиль: неделя почти кончилась', body: 'Ты у края зоны понижения. Ещё есть время удержаться.' },
    uk: { title: '⏳ Шпиль: тиждень майже закінчився', body: 'Ти на межі зниження. Ще є час втриматись.' },
  };
  return byLang[c.uiLang] || byLang.ru;
}

export function buildSpireZoneWarningMessage(c: SpireZoneWarningCandidate): SpireExpoPushMessage {
  const copy = buildSpireZoneWarningCopy(c);
  return {
    to: c.token,
    title: copy.title,
    body: copy.body,
    sound: 'default',
    data: { type: 'spire_zone_warning', status: c.status },
  };
}

export interface SpireZoneWarningPushSummary {
  rooms: number;
  live: number;
  candidates: number;
  sent: number;
  failedChunks: number;
  optedOut?: number;
  alreadySent?: number;
}

/** Неделя, для которой ищем открытые комнаты в воскресенье (она же текущая — комнаты ещё играются). */
export function spireCurrentWeekIdForWarning(spireWeekId: (at: Date) => string, nowMs: number): string {
  return spireWeekId(new Date(nowMs));
}

const ROOM_PAGE_SIZE = 200;
const GET_ALL_CHUNK = 300;

/**
 * Главный прогон воскресного крона: открытые комнаты текущей недели →
 * статусы края по комнате (чистая функция выше) → докупка токенов →
 * отправка. Пишет только метку недели spireZoneWarningPushWeekId тем, кому пуш ушёл (PM-200).
 */
export async function runSpireZoneWarningPush(
  db: admin.firestore.Firestore,
  weekId: string,
  now: number = Date.now(),
): Promise<SpireZoneWarningPushSummary> {
  const inputs: SpireZoneWarningInput[] = [];
  let rooms = 0;
  let live = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query: FirebaseFirestore.Query = db.collection(SPIRE_GROUPS_COLLECTION)
      .where('weekId', '==', weekId)
      .where('open', '==', true)
      .orderBy('__name__')
      .limit(ROOM_PAGE_SIZE)
      .select('members');
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];

    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const members = (data.members && typeof data.members === 'object' ? data.members : {}) as Record<string, unknown>;
      const statuses = spireZoneEdgeStatuses(members);
      rooms++;
      live += Object.keys(members).length;
      for (const [uid, status] of statuses) {
        if (status) inputs.push({ uid, status });
      }
    }
    if (snap.size < ROOM_PAGE_SIZE) break;
  }

  if (inputs.length === 0) {
    console.log(LOG, JSON.stringify({ event: 'done', weekId, rooms, live, candidates: 0, sent: 0 }));
    return { rooms, live, candidates: 0, sent: 0, failedChunks: 0 };
  }

  const usersByUid = new Map<string, SpireZoneWarningUser>();
  for (let i = 0; i < inputs.length; i += GET_ALL_CHUNK) {
    const slice = inputs.slice(i, i + GET_ALL_CHUNK);
    const refs = slice.map((r) => db.collection('users').doc(r.uid));
    // guard-ok: db.getAll — один сетевой вызов на чанк, не N вызовов .get().
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap, idx) => {
      const data = snap.data() as Record<string, unknown> | undefined;
      usersByUid.set(slice[idx].uid, {
        expoPushToken: typeof data?.expoPushToken === 'string' ? data.expoPushToken : null,
        pushTokenLang: typeof data?.pushTokenLang === 'string' ? data.pushTokenLang : null,
        pushPrefs: readSpirePushPrefs(data?.pushPrefs),
        sentForWeekId: readSpirePushMark(data, SPIRE_ZONE_WARNING_PUSH_MARK_FIELD),
      });
    });
  }

  let optedOut = 0;
  let alreadySent = 0;
  for (const u of usersByUid.values()) {
    const reason = spireZoneWarningSkipReason(u, weekId);
    if (reason === 'opted_out') optedOut++;
    else if (reason === 'already_sent') alreadySent++;
  }
  if (optedOut > 0 || alreadySent > 0) {
    // Только счётчики — без uid/токенов.
    console.log('[PUSH-PREFS]', JSON.stringify({ event: 'spire_zone_warning_skip', weekId, optedOut, alreadySent }));
  }

  const candidates = buildSpireZoneWarningCandidates(inputs, usersByUid, weekId);
  if (candidates.length === 0) {
    console.log(LOG, JSON.stringify({ event: 'skip', reason: 'no_candidates', weekId, rooms, optedOut, alreadySent }));
    return { rooms, live, candidates: 0, sent: 0, failedChunks: 0, optedOut, alreadySent };
  }

  let sent = 0;
  let failedChunks = 0;
  for (const chunk of chunkSpirePushMessages(candidates, 100)) {
    try {
      await sendSpireExpoPushChunk(chunk.map(buildSpireZoneWarningMessage));
      sent += chunk.length;
    } catch (err) {
      failedChunks++;
      console.error(LOG, JSON.stringify({ event: 'chunk_failed', error: String((err as Error)?.message ?? err) }));
      continue;
    }
    try {
      await stampSpirePushMarks(db, chunk.map((c) => c.uid), SPIRE_ZONE_WARNING_PUSH_MARK_FIELD, weekId);
    } catch (err) {
      // Пуш уже ушёл; без метки повторный прогон может его продублировать — громко.
      console.error('[PUSH-PREFS]', JSON.stringify({
        event: 'spire_zone_warning_mark_failed', weekId, count: chunk.length,
        error: String((err as Error)?.message ?? err),
      }));
    }
  }

  const summary = { rooms, live, candidates: candidates.length, sent, failedChunks, optedOut, alreadySent };
  console.log(LOG, JSON.stringify({ event: 'done', weekId, ...summary }));
  return summary;
}

// re-export для тестов/крона: используется как явная зависимость сигнатуры выше.
export type { SpireStanding };

/**
 * Крон воскресенья (PM-281, T30/§4.7): «ты у края зоны». Отдельный от
 * spireFinalizeCron намеренно — тот подводит итог ПРОШЛОЙ недели в понедельник,
 * этот предупреждает про ТЕКУЩУЮ (ещё играющуюся) неделю за день до конца.
 * Время — воскресенье 20:00 UTC, тот же час, что spirePackWeeklyCron
 * (functions/src/spire_pack_build.ts) выбрал для сборки пакетов: обе задачи
 * лёгкие и это время уже проверено не пересекаться с ночным пиком понедельника.
 */
export const spireZoneWarningCron = onSchedule(
  {
    schedule: 'every sunday 20:00',
    timeZone: 'UTC',
    timeoutSeconds: 300,
    memory: '256MiB',
    region: 'us-central1',
    retryCount: 1,
  },
  withCronHeartbeat('spireZoneWarningCron', async () => {
    const db = admin.firestore();
    const weekId = spireCurrentWeekIdForWarning(spireWeekId, Date.now());
    const summary = await runSpireZoneWarningPush(db, weekId);
    // зачем: withCronHeartbeat ждёт Record<string, string|number|boolean>, а
    // структурно совместимый интерфейс TypeScript в это не приводит сам —
    // явная распаковка полей (не { ...summary }: тот же класс несовместимости).
    return {
      rooms: summary.rooms, live: summary.live, candidates: summary.candidates, sent: summary.sent,
      failedChunks: summary.failedChunks, optedOut: summary.optedOut ?? 0, alreadySent: summary.alreadySent ?? 0,
    };
  }),
);
