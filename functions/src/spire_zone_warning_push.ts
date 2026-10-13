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
import { spireLiveZoneSize, spireWeekStartMs } from './spire_residents';
import {
  chunkSpirePushMessages,
  isSpirePushOptedOut,
  isSpirePushUiLangAllowed,
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

// ── Час отправки по поясу человека (🟡 №3 симуляции Шпиля, выкладка после Codex) ──────────────────────────────
// зачем: один прогон в 20:00 UTC приходил на Бали в 04:00. Теперь крон идёт каждый час в воскресенье 06–22 UTC и
// шлёт тем, у кого сейчас 20:00 по местному. Кому местные 20:00 воскресенья наступают уже после конца недели
// (запад США, Гавайи) или слишком близко к нему — запасной прогон в 22:00 UTC. Пояс неизвестен/битый — 20:00 UTC (как было).
export const SPIRE_ZONE_WARNING_FIRST_RUN_HOUR_UTC = 6;
export const SPIRE_ZONE_WARNING_LAST_RUN_HOUR_UTC = 22;
export const SPIRE_ZONE_WARNING_DEFAULT_HOUR_UTC = 20;
const HOUR_MS = 60 * 60 * 1000;

function localWeekdayHour(tz: string, ms: number): { weekday: string; hour: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(ms));
    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    return weekday && Number.isFinite(hour) ? { weekday, hour } : null;
  } catch {
    // зачем: битый пояс (не IANA) — не роняем крон, вызывающий уходит на час по умолчанию.
    return null;
  }
}

/**
 * Час UTC (воскресенье этой недели), в который человеку слать предупреждение. weekEndMs — понедельник 00:00 UTC.
 * Ищем воскресные 20:00 по местному среди прогонов крона (06–22 UTC); не нашли — запасной 22:00 UTC (запад) или 06:00
 * (если местные 20:00 раньше первого прогона, крайний восток); пояса нет — 20:00 UTC.
 */
export function spireZoneWarningDueHourUtc(tz: string | null | undefined, weekEndMs: number): number {
  if (!tz) return SPIRE_ZONE_WARNING_DEFAULT_HOUR_UTC;
  const sundayStartMs = weekEndMs - 24 * HOUR_MS;
  for (let h = SPIRE_ZONE_WARNING_FIRST_RUN_HOUR_UTC; h <= SPIRE_ZONE_WARNING_LAST_RUN_HOUR_UTC; h++) {
    const local = localWeekdayHour(tz, sundayStartMs + h * HOUR_MS);
    if (!local) return SPIRE_ZONE_WARNING_DEFAULT_HOUR_UTC;
    if (local.weekday === 'Sun' && local.hour === 20) return h;
  }
  const first = localWeekdayHour(tz, sundayStartMs + SPIRE_ZONE_WARNING_FIRST_RUN_HOUR_UTC * HOUR_MS);
  if (!first) return SPIRE_ZONE_WARNING_DEFAULT_HOUR_UTC;
  // На первом прогоне у человека уже позже 20:00 воскресенья (крайний восток) — шлём на первом; иначе — на последнем.
  return first.weekday === 'Sun' && first.hour > 20 ? SPIRE_ZONE_WARNING_FIRST_RUN_HOUR_UTC : SPIRE_ZONE_WARNING_LAST_RUN_HOUR_UTC;
}

/** Слать ли на этом прогоне: час совпал, или прошлый час пропущен (одна попытка догнать — метка недели не даст дубля). */
export function isSpireZoneWarningDueNow(tz: string | null | undefined, nowMs: number, weekEndMs: number): boolean {
  const due = spireZoneWarningDueHourUtc(tz, weekEndMs);
  const hourNow = new Date(nowMs).getUTCHours();
  return hourNow === due || hourNow === due + 1;
}

export type SpireZoneWarningUser = Readonly<{
  expoPushToken?: string | null;
  pushTokenLang?: string | null;
  pushPrefs?: SpirePushPrefs | null;
  /** weekId, за который предупреждение уже отправлено (PM-200). */
  sentForWeekId?: string | null;
  /** IANA-пояс устройства (users.pushTokenTimezone) — час отправки «20:00 по местному». */
  timezone?: string | null;
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
): 'no_token' | 'ui_lang_not_supported' | 'opted_out' | 'already_sent' | null {
  if (!isValidSpireExpoPushToken(u.expoPushToken)) return 'no_token';
  // зачем (владелец 11.10): Шпиль только для интерфейса ru/uk — иначе пропуск, а не русский текст.
  if (!isSpirePushUiLangAllowed(u.pushTokenLang)) return 'ui_lang_not_supported';
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
  // зачем (решение владельца 13.10, сборка 16.10): «Шпиль» → «Пик» во всех видимых текстах; шлём только ru/uk (SPIRE_PUSH_UI_LANGS).
  if (c.status === 'promotion_edge') {
    const byLang: Record<string, Copy> = {
      ru: { title: '⏳ Пик: неделя почти кончилась', body: 'Ты у самой границы повышения. Ещё немного — и получится.' },
      uk: { title: '⏳ Пік: тиждень майже закінчився', body: 'Ти біля самої межі підвищення. Ще трохи — і вийде.' },
      en: { title: '⏳ Peak: the week is almost over', body: "You're right at the promotion line. A little more and you'll make it." },
      es: { title: '⏳ Pico: la semana casi termina', body: 'Estás justo en el límite del ascenso. Un poco más y lo logras.' },
      'pt-BR': { title: '⏳ Pico: a semana está acabando', body: 'Você está bem no limite da promoção. Só mais um pouco.' },
      vi: { title: '⏳ Đỉnh: tuần sắp kết thúc', body: 'Bạn đang sát ngưỡng thăng hạng. Cố thêm chút nữa là được.' },
      id: { title: '⏳ Puncak: minggu hampir berakhir', body: 'Kamu tepat di batas naik level. Sedikit lagi saja.' },
      tr: { title: '⏳ Zirve: hafta bitmek üzere', body: 'Terfi sınırının tam üzerindesin. Biraz daha gayret.' },
      pl: { title: '⏳ Szczyt: tydzień prawie się skończył', body: 'Jesteś tuż przy granicy awansu. Jeszcze trochę.' },
    };
    return byLang[c.uiLang] || byLang.ru;
  }
  const byLang: Record<string, Copy> = {
    ru: { title: '⏳ Пик: неделя почти кончилась', body: 'Ты у края зоны понижения. Ещё есть время удержаться.' },
    uk: { title: '⏳ Пік: тиждень майже закінчився', body: 'Ти на межі зниження. Ще є час втриматись.' },
    en: { title: '⏳ Peak: the week is almost over', body: "You're at the edge of the drop zone. There's still time to hold on." },
    es: { title: '⏳ Pico: la semana casi termina', body: 'Estás al borde de la zona de descenso. Aún hay tiempo para mantenerte.' },
    'pt-BR': { title: '⏳ Pico: a semana está acabando', body: 'Você está na beira da zona de rebaixamento. Ainda dá tempo de se segurar.' },
    vi: { title: '⏳ Đỉnh: tuần sắp kết thúc', body: 'Bạn đang ở mép vùng rớt hạng. Vẫn còn thời gian để trụ lại.' },
    id: { title: '⏳ Puncak: minggu hampir berakhir', body: 'Kamu di tepi zona turun level. Masih ada waktu untuk bertahan.' },
    tr: { title: '⏳ Zirve: hafta bitmek üzere', body: 'Düşme bölgesinin kıyısındasın. Tutunmak için hâlâ vaktin var.' },
    pl: { title: '⏳ Szczyt: tydzień prawie się skończył', body: 'Jesteś na skraju strefy spadku. Wciąż jest czas, by się utrzymać.' },
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
  const weekEndMs = spireWeekStartMs(now) + 7 * 24 * HOUR_MS;
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
        timezone: typeof data?.pushTokenTimezone === 'string' ? data.pushTokenTimezone : null,
      });
    });
  }

  let optedOut = 0;
  let alreadySent = 0;
  let uiLangSkipped = 0;
  for (const u of usersByUid.values()) {
    const reason = spireZoneWarningSkipReason(u, weekId);
    if (reason === 'opted_out') optedOut++;
    else if (reason === 'already_sent') alreadySent++;
    else if (reason === 'ui_lang_not_supported') uiLangSkipped++;
  }
  if (optedOut > 0 || alreadySent > 0 || uiLangSkipped > 0) {
    // Только счётчики — без uid/токенов. uiLangSkipped — интерфейс не ru/uk (Шпиль скрыт, решение владельца 11.10).
    console.log('[PUSH-PREFS]', JSON.stringify({ event: 'spire_zone_warning_skip', weekId, optedOut, alreadySent, uiLangSkipped }));
  }

  // зачем (🟡 №3, приватность): пояс берём из users (читаем ради токена всё равно), а не из строки комнаты — комнату
  // читает любой вошедший. Кому сейчас не 20:00 по местному — ждут своего часа (счётчик в логе, без uid).
  const dueInputs = inputs.filter((input) => isSpireZoneWarningDueNow(usersByUid.get(input.uid)?.timezone ?? null, now, weekEndMs));
  const notDueYet = inputs.length - dueInputs.length;
  console.log(LOG, JSON.stringify({ event: 'timezone_filter', weekId, hourUtc: new Date(now).getUTCHours(), due: dueInputs.length, notDueYet }));
  const candidates = buildSpireZoneWarningCandidates(dueInputs, usersByUid, weekId);
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
    // зачем (🟡 №3 симуляции Шпиля): каждый час в воскресенье 06–22 UTC — каждому в 20:00 по его поясу.
    schedule: '0 6-22 * * 0',
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
