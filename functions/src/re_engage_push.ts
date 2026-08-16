/**
 * re_engage_push.ts — серверный «возврат пропавших».
 *
 * Проблема (из аудита удержания): все локальные уведомления планируются только
 * когда юзер открывает приложение. Если он пропал на 3+ дня — телефон молчит,
 * сервер не может достучаться. Это дыра в дне воронки удержания.
 *
 * Решение: ежедневный cron сканирует users/, находит тех, кто давно не заходил
 * или у кого вот-вот сгорит стрик, и шлёт им push через Expo Push API
 * (тот же канал, что уже используется в арене). Expo доставляет через FCM/APNs
 * даже в закрытое приложение.
 *
 * Архитектура: чистая логика отбора и текстов (selectReEngageCandidates,
 * buildExpoPushMessage, chunkMessages) отделена от I/O (runReEngagePush) —
 * чистые функции покрыты unit-тестами без сети и Firestore.
 */
import * as admin from 'firebase-admin';

// ── Константы политики ────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;

/** Не трогаем тех, кто заходил совсем недавно (им не нужен «возврат»). */
export const INACTIVE_MIN_DAYS = 3;
/** И не спамим «мёртвых» бесконечно — после 14 дней молчания прекращаем. */
export const INACTIVE_MAX_DAYS = 14;
/** Стрик под угрозой: есть серия и сегодня ещё не заходил (>20ч). */
export const STREAK_AT_RISK_MIN = 3;
export const STREAK_RISK_INACTIVE_HOURS = 20;
/** Не слать один и тот же тип чаще, чем раз в N дней (анти-спам). */
export const REENGAGE_COOLDOWN_DAYS = 2;
/** Расширенное окно возврата: 15-30 дней (второй шанс для ушедших). */
export const INACTIVE_EXTENDED_MIN_DAYS = 15;
export const INACTIVE_EXTENDED_MAX_DAYS = 30;

/**
 * Потолок отправок за ОДИН прогон крона.
 *
 * зачем (аудит 2026-08-15): cooldown защищает конкретного человека от
 * повторного пуша, но общего потолка не было — цикл сканирования идёт по
 * всей коллекции users. Ошибка в условиях отбора (например, поле
 * `last_active_at` переименовали, и все выглядят неактивными) означала бы
 * веерную рассылку всей базе за один заход, без единого подтверждения.
 *
 * зачем именно отсечка, а не остановка прогона: если кандидатов вдруг стало
 * слишком много, правильнее отправить безопасную порцию и оставить след в
 * логах, чем не отправить ничего — настоящие «стрик под угрозой» ждать
 * до завтра не могут.
 *
 * Число выбрано так, чтобы покрывать нормальный день с запасом и при этом
 * делать катастрофу невозможной: массовая рассылка упрётся в потолок,
 * а не в терпение пользователей.
 */
export const MAX_PUSHES_PER_RUN = 2_000;

export type ReEngageReason = 'streak_at_risk' | 'inactive_return' | 'inactive_long';

export interface ReEngageUser {
  uid: string;
  expoPushToken?: string | null;
  pushTokenLang?: string | null;
  pushTokenTimezone?: string | null; // IANA timezone, напр. "Europe/Moscow"
  lastActiveAt?: number | null;      // users/{uid}.last_active_at (ms)
  streakCount?: number | null;       // из progress.streak_count
  lastReEngagePushAt?: number | null;// users/{uid}.lastReEngagePushAt (ms)
  userName?: string | null;
  /** Выбор юзера в разделе «Уведомления» (клиент зеркалит в users/{uid}.pushPrefs).
   *  Отсутствие поля = старый клиент = всё разрешено. */
  pushPrefs?: { streak?: boolean; offers?: boolean } | null;
}

export interface ReEngageCandidate {
  uid: string;
  token: string;
  lang: string;
  reason: ReEngageReason;
  streakCount: number;
  userName: string;
}

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data: { type: ReEngageReason };
}

// ── Парсинг полей юзер-документа ───────────────────────────────────────────────
function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Достаёт нужные поля из сырого Firestore-документа в типизированный ReEngageUser. */
export function parseReEngageUser(uid: string, data: Record<string, unknown> | undefined): ReEngageUser {
  const progress = (data?.progress ?? {}) as Record<string, unknown>;
  const prefsRaw = data?.pushPrefs;
  const pushPrefs = prefsRaw && typeof prefsRaw === 'object'
    ? {
        streak: typeof (prefsRaw as Record<string, unknown>).streak === 'boolean'
          ? (prefsRaw as Record<string, unknown>).streak as boolean
          : undefined,
        offers: typeof (prefsRaw as Record<string, unknown>).offers === 'boolean'
          ? (prefsRaw as Record<string, unknown>).offers as boolean
          : undefined,
      }
    : null;
  return {
    uid,
    expoPushToken: typeof data?.expoPushToken === 'string' ? data.expoPushToken : null,
    pushTokenLang: typeof data?.pushTokenLang === 'string' ? data.pushTokenLang : null,
    pushTokenTimezone: typeof data?.pushTokenTimezone === 'string' ? data.pushTokenTimezone : null,
    lastActiveAt: num(data?.last_active_at),
    streakCount: num(progress.streak_count),
    lastReEngagePushAt: num(data?.lastReEngagePushAt),
    userName: typeof progress.user_name === 'string' ? progress.user_name : null,
    pushPrefs,
  };
}

/** Возвращает локальный час пользователя (0-23) по его IANA timezone. */
export function getLocalHour(nowMs: number, timezone: string | null | undefined): number {
  try {
    if (!timezone) return new Date(nowMs).getUTCHours();
    const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone });
    const hourStr = formatter.format(new Date(nowMs));
    const h = parseInt(hourStr, 10);
    return Number.isFinite(h) ? h % 24 : new Date(nowMs).getUTCHours();
  } catch {
    return new Date(nowMs).getUTCHours();
  }
}

/** Тихие часы 22:00–09:00 по локальному времени пользователя. */
export function isInQuietHours(nowMs: number, timezone: string | null | undefined): boolean {
  const h = getLocalHour(nowMs, timezone);
  return h >= 22 || h < 9;
}

/** Валиден ли Expo push token (формат ExponentPushToken[...] или ExpoPushToken[...]). */
export function isValidExpoPushToken(token: unknown): token is string {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token.trim());
}

// ── Чистая логика отбора ───────────────────────────────────────────────────────
/**
 * Решает, нужно ли слать юзеру re-engage push и по какой причине.
 * Возвращает причину или null (слать не надо).
 *
 * Приоритет: стрик под угрозой важнее «давно не заходил» (потеря серии больнее).
 */
export function classifyReEngageUser(u: ReEngageUser, now: number): ReEngageReason | null {
  if (!isValidExpoPushToken(u.expoPushToken)) return null;
  if (u.lastActiveAt == null) return null;

  // Тихие часы: не будим пользователя ночью (22:00–09:00 по его локальному времени).
  if (isInQuietHours(now, u.pushTokenTimezone)) return null;

  // Анти-спам: недавно уже слали — пропускаем.
  if (u.lastReEngagePushAt != null && now - u.lastReEngagePushAt < REENGAGE_COOLDOWN_DAYS * DAY_MS) {
    return null;
  }

  const msInactive = now - u.lastActiveAt;
  const hoursInactive = msInactive / (60 * 60 * 1000);
  const streak = u.streakCount ?? 0;

  // 1) Стрик под угрозой: есть серия, сегодня не заходил, но ещё в пределах суток
  //    (иначе серия уже сгорела — это уже кейс inactive_return).
  // зачем: юзер может выключить «Серия под угрозой» в разделе уведомлений —
  // клиент зеркалит выбор в pushPrefs.streak. Отсутствие поля = старый клиент = слать.
  if (streak >= STREAK_AT_RISK_MIN && hoursInactive >= STREAK_RISK_INACTIVE_HOURS && hoursInactive < 24) {
    if (u.pushPrefs?.streak === false) return null;
    return 'streak_at_risk';
  }

  const daysInactive = msInactive / DAY_MS;

  // 2) Давно не заходил: основное окно [3, 14 дней].
  if (daysInactive >= INACTIVE_MIN_DAYS && daysInactive <= INACTIVE_MAX_DAYS) {
    return 'inactive_return';
  }

  // 3) Расширенный возврат: [15, 30 дней] — повторная попытка с другим текстом.
  if (daysInactive > INACTIVE_EXTENDED_MIN_DAYS && daysInactive <= INACTIVE_EXTENDED_MAX_DAYS) {
    return 'inactive_long';
  }

  return null;
}

/** Отбирает всех кандидатов на push из списка юзеров (чистая функция). */
export function selectReEngageCandidates(users: ReEngageUser[], now: number): ReEngageCandidate[] {
  const out: ReEngageCandidate[] = [];
  for (const u of users) {
    const reason = classifyReEngageUser(u, now);
    if (!reason) continue;
    out.push({
      uid: u.uid,
      token: u.expoPushToken as string,
      lang: u.pushTokenLang || 'ru',
      reason,
      streakCount: u.streakCount ?? 0,
      userName: u.userName || '',
    });
  }
  return out;
}

/**
 * Отсекает всё сверх потолка прогона.
 *
 * зачем сортировать перед отсечкой: если кандидатов больше потолка, обрезать
 * надо не случайных, а наименее срочных. «Стрик под угрозой» ждать до завтра
 * не может — серия сгорит сегодня; вернуть ушедшего можно и на день позже.
 */
export function capCandidates(candidates: ReEngageCandidate[]): ReEngageCandidate[] {
  if (candidates.length <= MAX_PUSHES_PER_RUN) return candidates;
  const priority: Record<ReEngageReason, number> = {
    streak_at_risk: 0,
    inactive_return: 1,
    inactive_long: 2,
  };
  return [...candidates]
    .sort((a, b) => priority[a.reason] - priority[b.reason])
    .slice(0, MAX_PUSHES_PER_RUN);
}

// ── Локализованные тексты ──────────────────────────────────────────────────────
type Copy = { title: string; body: string };
const SUPPORTED_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type CopyLang = (typeof SUPPORTED_LANGS)[number];

function normLang(lang: string): CopyLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang) ? (lang as CopyLang) : 'ru';
}

// Gain-framing (Phraseman Bible: loss-framing only for streak 7+; the at-risk trigger fires from
// streak 3, so we keep the copy positive — the series "is waiting", grows with one session — for
// every streak length, no «под угрозой»/«не теряй». One emoji, no extra «!».
const STREAK_AT_RISK_COPY: Record<CopyLang, (streak: number) => Copy> = {
  ru: (s) => ({ title: `🔥 Серия ${s} дней ждёт тебя`, body: 'Одна сессия сегодня — и серия растёт.' }),
  uk: (s) => ({ title: `🔥 Серія ${s} днів чекає на тебе`, body: 'Одна сесія сьогодні — і серія росте.' }),
  es: (s) => ({ title: `🔥 Tu racha de ${s} días te espera`, body: 'Una sesión hoy y tu racha crece.' }),
  'pt-BR': (s) => ({ title: `🔥 Sua sequência de ${s} dias te espera`, body: 'Uma sessão hoje e sua sequência cresce.' }),
  vi: (s) => ({ title: `🔥 Chuỗi ${s} ngày đang chờ bạn`, body: 'Một buổi hôm nay là chuỗi dài thêm.' }),
  id: (s) => ({ title: `🔥 Seri ${s} hari menantimu`, body: 'Satu sesi hari ini, serimu bertambah.' }),
  tr: (s) => ({ title: `🔥 ${s} günlük serin seni bekliyor`, body: 'Bugün bir oturum, serin uzar.' }),
  pl: (s) => ({ title: `🔥 Twoja seria ${s} dni czeka`, body: 'Jedna sesja dziś i seria rośnie.' }),
};

const INACTIVE_RETURN_COPY: Record<CopyLang, Copy> = {
  ru: { title: `👋 Давно тебя не было`, body: `Пять минут практики — и ты снова в ритме. Продолжим?` },
  uk: { title: `👋 Давно тебе не було`, body: `П'ять хвилин практики — і ти знову в ритмі. Продовжимо?` },
  es: { title: `👋 Cuánto tiempo`, body: `Cinco minutos de práctica y vuelves a tu ritmo. ¿Seguimos?` },
  'pt-BR': { title: `👋 Quanto tempo`, body: `Cinco minutos de prática e você volta ao ritmo. Vamos?` },
  vi: { title: `👋 Lâu rồi không gặp`, body: `Năm phút luyện tập là bạn trở lại nhịp. Tiếp tục nhé?` },
  id: { title: `👋 Sudah lama tidak bertemu`, body: `Lima menit latihan dan kamu kembali ke ritme. Lanjut?` },
  tr: { title: `👋 Seni özledik`, body: `Beş dakikalık pratikle eski ritmine dönersin. Devam edelim mi?` },
  pl: { title: `👋 Dawno cię nie było`, body: `Pięć minut praktyki i wracasz do rytmu. Kontynuujemy?` },
};

const INACTIVE_LONG_COPY: Record<CopyLang, Copy> = {
  ru: { title: `💡 Мы всё ещё помним тебя`, body: `Начнём с малого — пара фраз, и слова снова приходят сами.` },
  uk: { title: `💡 Ми все ще пам'ятаємо тебе`, body: `Почнімо з малого — пара фраз, і слова знову приходять самі.` },
  es: { title: `💡 Aún te recordamos`, body: `Empecemos con poco — un par de frases y las palabras vuelven solas.` },
  'pt-BR': { title: `💡 Ainda lembramos de você`, body: `Vamos com calma — algumas frases e as palavras voltam sozinhas.` },
  vi: { title: `💡 Chúng tôi vẫn nhớ bạn`, body: `Bắt đầu nhẹ nhàng — vài câu là từ ngữ tự quay lại.` },
  id: { title: `💡 Kami masih ingat kamu`, body: `Mulai dari kecil — beberapa frasa dan kata-kata kembali sendiri.` },
  tr: { title: `💡 Seni hâlâ hatırlıyoruz`, body: `Küçük başlayalım — birkaç cümle ve kelimeler kendiliğinden döner.` },
  pl: { title: `💡 Wciąż o tobie pamiętamy`, body: `Zacznijmy spokojnie — kilka zdań i słowa wracają same.` },
};

/** Локализованное сообщение для кандидата (чистая функция). */
export function buildExpoPushMessage(c: ReEngageCandidate): ExpoPushMessage {
  const lang = normLang(c.lang);
  const copy =
    c.reason === 'streak_at_risk'
      ? STREAK_AT_RISK_COPY[lang](c.streakCount)
      : c.reason === 'inactive_long'
        ? INACTIVE_LONG_COPY[lang]
        : INACTIVE_RETURN_COPY[lang];
  return {
    to: c.token,
    title: copy.title,
    body: copy.body,
    sound: 'default',
    data: { type: c.reason },
  };
}

/** Разбивка сообщений на чанки (Expo Push API принимает до 100 за раз). */
export function chunkMessages<T>(messages: T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < messages.length; i += size) {
    chunks.push(messages.slice(i, i + size));
  }
  return chunks;
}

// ── I/O: отправка через Expo Push API ──────────────────────────────────────────
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_ENDPOINT = 'https://exp.host/--/api/v2/push/getReceipts';

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/**
 * Отправляет чанк и возвращает ticket-ids для последующей проверки receipts.
 */
async function sendExpoPushChunk(chunk: ExpoPushMessage[]): Promise<string[]> {
  const res = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(chunk),
  });
  if (!res.ok) {
    throw new Error(`expo_push_http_${res.status}`);
  }
  const json = (await res.json()) as { data?: ExpoTicket[] };
  const ticketIds: string[] = [];
  for (const ticket of json.data ?? []) {
    if (ticket.status === 'ok' && ticket.id) ticketIds.push(ticket.id);
  }
  return ticketIds;
}

/**
 * Запрашивает receipts по ticket-ids и возвращает uid пользователей
 * с DeviceNotRegistered — их токены нужно удалить из Firestore.
 */
export async function fetchExpiredTokenUids(
  ticketIds: string[],
  uidByTicket: Map<string, string>,
): Promise<string[]> {
  if (ticketIds.length === 0) return [];
  try {
    const res = await fetch(EXPO_RECEIPTS_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: ticketIds }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Record<string, ExpoReceipt> };
    const expiredUids: string[] = [];
    for (const [id, receipt] of Object.entries(json.data ?? {})) {
      if (
        receipt.status === 'error' &&
        receipt.details?.error === 'DeviceNotRegistered'
      ) {
        const uid = uidByTicket.get(id);
        if (uid) expiredUids.push(uid);
      }
    }
    return expiredUids;
  } catch {
    return [];
  }
}

/**
 * Удаляет expoPushToken из Firestore для пользователей с устаревшими токенами.
 * Вызывается через 30+ минут после отправки (Expo обрабатывает receipts не мгновенно).
 */
export async function pruneExpiredPushTokens(expiredUids: string[]): Promise<void> {
  if (expiredUids.length === 0) return;
  const db = admin.firestore();
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let count = 0;
  for (const uid of expiredUids) {
    batch.set(
      db.collection('users').doc(uid),
      { expoPushToken: admin.firestore.FieldValue.delete() },
      { merge: true },
    );
    count++;
    if (count % BATCH_SIZE === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % BATCH_SIZE !== 0) await batch.commit();
  console.log(`re_engage_push: pruned ${expiredUids.length} expired tokens`);
}

// ── I/O: главный прогон cron ────────────────────────────────────────────────────
/**
 * Сканирует users/, отбирает кандидатов, шлёт push и проставляет lastReEngagePushAt
 * (чтобы не слать повторно в пределах cooldown). Cursor-pagination по образцу
 * reset_weekly_xp.ts. Возвращает сводку для логов.
 */
export async function runReEngagePush(now: number = Date.now()): Promise<{
  scanned: number;
  candidates: number;
  sent: number;
  failedChunks: number;
  ticketCount: number;
}> {
  const db = admin.firestore();
  const PAGE_SIZE = 300;
  const STAMP_BATCH = 400;

  let scanned = 0;
  const allCandidates: ReEngageCandidate[] = [];
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  // 1) Scan + отбор кандидатов.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // зачем: раньше страница тянула документы users целиком, хотя ниже используется ровно
    // тот набор полей, который читает parseReEngageUser. Проекция режет трафик и память
    // функции (доки users самые «толстые» в базе), число тарифицируемых чтений не меняется.
    // ВАЖНО: список ниже обязан совпадать с полями parseReEngageUser — добавляешь поле
    // туда, добавь и сюда, иначе оно молча придёт пустым и кандидат отсеется.
    let query: FirebaseFirestore.Query = db.collection('users')
      .orderBy('__name__')
      .limit(PAGE_SIZE)
      .select(
        'expoPushToken',
        'pushTokenLang',
        'pushTokenTimezone',
        'last_active_at',
        'lastReEngagePushAt',
        'progress.streak_count',
        'progress.user_name',
        'pushPrefs',
      );
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];

    const pageUsers: ReEngageUser[] = snap.docs.map((doc) =>
      parseReEngageUser(doc.id, doc.data() as Record<string, unknown>),
    );
    scanned += pageUsers.length;
    allCandidates.push(...selectReEngageCandidates(pageUsers, now));

    if (snap.size < PAGE_SIZE) break;
  }

  if (allCandidates.length === 0) {
    return { scanned, candidates: 0, sent: 0, failedChunks: 0, ticketCount: 0 };
  }

  // зачем потолок здесь (аудит 2026-08-15): выше цикл идёт по ВСЕЙ коллекции
  // users. Cooldown защищает конкретного человека, но от веерной рассылки при
  // ошибке в условиях отбора не защищает ничто. Отсечка делает катастрофу
  // невозможной: массовая рассылка упрётся в число, а не в терпение людей.
  const capped = capCandidates(allCandidates);
  if (capped.length < allCandidates.length) {
    // зачем громко: столько кандидатов за прогон — это повод проверить
    // условия отбора, а не поднять потолок.
    console.warn(
      `re_engage_push: сработал потолок — кандидатов ${allCandidates.length}, `
      + `отправлено ${MAX_PUSHES_PER_RUN}, отброшено ${allCandidates.length - capped.length}. `
      + 'Проверь условия отбора: столько людей одновременно — это подозрительно.',
    );
  }

  // 2) Отправка push чанками по 100.
  // Отслеживаем uid и ticket-ids успешных отправок:
  // uid → для stamping cooldown, ticketIds → для последующей проверки receipts.
  const messages = capped.map(buildExpoPushMessage);
  const candidateChunks = chunkMessages(capped, 100);
  const messageChunks = chunkMessages(messages, 100);
  let sent = 0;
  let failedChunks = 0;
  const successfulUids: string[] = [];
  const allTicketIds: string[] = [];
  const uidByTicket = new Map<string, string>();
  for (let i = 0; i < messageChunks.length; i++) {
    try {
      const ticketIds = await sendExpoPushChunk(messageChunks[i]);
      sent += messageChunks[i].length;
      for (let j = 0; j < candidateChunks[i].length; j++) {
        const c = candidateChunks[i][j];
        successfulUids.push(c.uid);
        if (ticketIds[j]) {
          uidByTicket.set(ticketIds[j], c.uid);
          allTicketIds.push(ticketIds[j]);
        }
      }
    } catch (e) {
      failedChunks++;
      console.error('re_engage_push: chunk failed', e);
    }
  }

  // 3) Проставляем lastReEngagePushAt только тем, кому пуш реально ушёл.
  // Пользователи из упавших чанков не получают cooldown — они будут повторно
  // отобраны на следующем прогоне.
  if (successfulUids.length > 0) {
    let batch = db.batch();
    let stamped = 0;
    for (const uid of successfulUids) {
      batch.set(db.collection('users').doc(uid), { lastReEngagePushAt: now }, { merge: true });
      stamped++;
      if (stamped % STAMP_BATCH === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    if (stamped % STAMP_BATCH !== 0) {
      await batch.commit();
    }
  }

  // 4) Сохраняем ticket-ids в Firestore для отложенной проверки receipts (~30 мин).
  // Отдельный cron (runReEngageReceiptCheck) читает этот документ, запрашивает receipts
  // у Expo и удаляет устаревшие токены (DeviceNotRegistered).
  if (allTicketIds.length > 0) {
    const uidByTicketObj: Record<string, string> = {};
    uidByTicket.forEach((uid, ticketId) => { uidByTicketObj[ticketId] = uid; });
    await db.collection('_internal').doc('re_engage_receipts_pending').set(
      { ticketIds: allTicketIds, uidByTicket: uidByTicketObj, sentAt: now },
      { merge: false },
    );
  }

  return { scanned, candidates: allCandidates.length, sent, failedChunks, ticketCount: allTicketIds.length };
}
