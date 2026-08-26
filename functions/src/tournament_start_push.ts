/**
 * tournament_start_push.ts — пуш «турнир начинается» в момент открытия лобби.
 *
 * Проблема (владелец, 2026-08-03): турниры не шлют ни одного уведомления.
 * Комната набирается, добивается ботами и проходит без человека — телефон молчит.
 * Юзер не узнаёт, что турнир стартовал, и возвращается уже к результатам.
 *
 * Решение: попутная отправка внутри уже существующего крона tournamentCreateRooms
 * (крутится каждые 5 минут и всё равно читает расписание слотов). Отдельного крона
 * НЕТ намеренно — это сэкономленные чтения Firestore при том же результате.
 *
 * Политика, согласованная с владельцем:
 *  • момент = открытие лобби (старт − TOURNAMENT_LOBBY_OPEN_MS), а не «за 15 минут»:
 *    пуш и возможность зайти совпадают, человек не упирается в закрытую дверь;
 *  • максимум ОДИН турнирный пуш в сутки на юзера (TOURNAMENT_PUSH_COOLDOWN_MS);
 *  • тихие часы 22:00–09:00 по локальному времени юзера — расписание турниров
 *    московское, и без этого фильтра слот 12:00 МСК будил бы Бразилию в 6 утра;
 *  • отдельного тумблера в настройках НЕТ (решение владельца) — уважаем
 *    существующую категорию «Лига» (pushPrefs.league), там же живёт обгон в лиге.
 *
 * Архитектура зеркалит re_engage_push.ts: чистая логика отбора и текстов отделена
 * от I/O, поэтому покрывается тестами без сети и Firestore.
 */
import * as admin from 'firebase-admin';
import { TOURNAMENTS_RELEASED } from './tournament_release_gate';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Турниры не входят в текущий пользовательский релиз. Сервер не должен
 * рекламировать закрытый раздел даже старым клиентам с сохранённым push-токеном.
 * Вернуть true только вместе с осознанным возвратом клиентских маршрутов.
 */
export const TOURNAMENT_START_PUSH_ENABLED = TOURNAMENTS_RELEASED;

/** Один турнирный пуш в сутки на юзера — прямое требование владельца. */
export const TOURNAMENT_PUSH_COOLDOWN_MS = 20 * HOUR_MS;

/**
 * Окно вокруг открытия лобби, внутри которого крон считает момент «настал».
 * Крон ходит раз в 5 минут и может опоздать на минуту-другую, поэтому окно
 * шире шага — иначе слот молча пропускался бы при малейшем сдвиге запуска.
 */
export const TOURNAMENT_PUSH_WINDOW_MS = 6 * 60 * 1000;

/** Не трогаем тех, кто не заходил дольше — для них работает re_engage_push. */
export const TOURNAMENT_PUSH_MAX_INACTIVE_DAYS = 14;

export const TOURNAMENT_QUIET_START_HOUR = 22;
export const TOURNAMENT_QUIET_END_HOUR = 9;

export interface TournamentPushUser {
  uid: string;
  expoPushToken?: string | null;
  pushTokenLang?: string | null;
  pushTokenTimezone?: string | null; // IANA, напр. "Europe/Moscow"
  lastActiveAt?: number | null;      // users/{uid}.last_active_at (ms)
  lastTournamentPushAt?: number | null;
  /** Клиент зеркалит выбор из раздела «Уведомления». Нет поля = старый клиент = слать. */
  pushPrefs?: { league?: boolean } | null;
}

export interface TournamentPushCandidate {
  uid: string;
  token: string;
  lang: string;
}

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data: { type: 'tournament_starting'; roomId: string };
}

// ── Парсинг документа юзера ───────────────────────────────────────────────────
function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Достаёт нужные поля из сырого документа users/.
 * ВАЖНО: набор полей обязан совпадать с .select() в runTournamentStartPush —
 * добавишь поле сюда, добавь и туда, иначе оно молча придёт пустым.
 */
export function parseTournamentPushUser(
  uid: string,
  data: Record<string, unknown> | undefined,
): TournamentPushUser {
  const prefsRaw = data?.pushPrefs;
  const league = prefsRaw && typeof prefsRaw === 'object'
    ? (prefsRaw as Record<string, unknown>).league
    : undefined;
  return {
    uid,
    expoPushToken: typeof data?.expoPushToken === 'string' ? data.expoPushToken : null,
    pushTokenLang: typeof data?.pushTokenLang === 'string' ? data.pushTokenLang : null,
    pushTokenTimezone: typeof data?.pushTokenTimezone === 'string' ? data.pushTokenTimezone : null,
    lastActiveAt: num(data?.last_active_at),
    lastTournamentPushAt: num(data?.lastTournamentPushAt),
    pushPrefs: typeof league === 'boolean' ? { league } : null,
  };
}

/** Локальный час юзера (0–23) по его IANA-таймзоне. */
export function getLocalHour(nowMs: number, timezone: string | null | undefined): number {
  try {
    if (!timezone) return new Date(nowMs).getUTCHours();
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', hour12: false, timeZone: timezone,
    });
    const h = parseInt(formatter.format(new Date(nowMs)), 10);
    return Number.isFinite(h) ? h % 24 : new Date(nowMs).getUTCHours();
  } catch {
    return new Date(nowMs).getUTCHours();
  }
}

/** Тихие часы 22:00–09:00 по локальному времени юзера. */
export function isInQuietHours(nowMs: number, timezone: string | null | undefined): boolean {
  const h = getLocalHour(nowMs, timezone);
  return h >= TOURNAMENT_QUIET_START_HOUR || h < TOURNAMENT_QUIET_END_HOUR;
}

/** Валиден ли Expo push token. */
export function isValidExpoPushToken(token: unknown): token is string {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token.trim());
}

// ── Чистая логика отбора ──────────────────────────────────────────────────────
/** Решает, слать ли юзеру пуш о старте турнира. */
export function shouldSendTournamentPush(u: TournamentPushUser, now: number): boolean {
  if (!isValidExpoPushToken(u.expoPushToken)) return false;
  if (u.lastActiveAt == null) return false;

  // Юзер выключил категорию «Лига» — турниры живут под ней (тумблера у турниров нет).
  if (u.pushPrefs?.league === false) return false;

  // Мёртвые аккаунты не будим: за них отвечает re_engage_push со своим текстом.
  if (now - u.lastActiveAt > TOURNAMENT_PUSH_MAX_INACTIVE_DAYS * DAY_MS) return false;

  // Расписание турниров московское; без этого фильтра слот 12:00 МСК
  // прилетел бы в Бразилию в 6 утра.
  if (isInQuietHours(now, u.pushTokenTimezone)) return false;

  // Один турнирный пуш в сутки.
  if (u.lastTournamentPushAt != null
    && now - u.lastTournamentPushAt < TOURNAMENT_PUSH_COOLDOWN_MS) return false;

  return true;
}

/** Отбирает кандидатов из страницы юзеров (чистая функция). */
export function selectTournamentPushCandidates(
  users: TournamentPushUser[],
  now: number,
): TournamentPushCandidate[] {
  const out: TournamentPushCandidate[] = [];
  for (const u of users) {
    if (!shouldSendTournamentPush(u, now)) continue;
    out.push({
      uid: u.uid,
      token: u.expoPushToken as string,
      lang: u.pushTokenLang || 'ru',
    });
  }
  return out;
}

// ── Локализованные тексты ─────────────────────────────────────────────────────
type Copy = { title: string; body: string };
const SUPPORTED_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type CopyLang = (typeof SUPPORTED_LANGS)[number];

function normLang(lang: string): CopyLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang) ? (lang as CopyLang) : 'ru';
}

/**
 * Четыре варианта текста на язык — чтобы ежедневный пуш не приедался.
 * Юмор мягкий, без давления и без обещаний победы, которых движок не выполнит.
 * зачем (аудит по Библии, 2026-08-26): тексты дразнили проигрышем — «пять минут
 * позора», «последнему стул у выхода», «соперники придумали, как объяснить
 * проигрыш». Часть V п.6 Библии запрещает унижать, Правило 2 требует говорить
 * о выгоде, а не о потере. Переписано во всех восьми языках разом, иначе тон
 * расходится между локалями.
 * Слово «комната» намеренно НЕ используется (владелец: это внутренняя кухня,
 * юзер про комнаты знать не должен) — говорим только «турнир» и «соперники».
 */
const STARTING_COPY: Record<CopyLang, readonly Copy[]> = {
  ru: [
    { title: '🏁 Турнир начинается', body: 'Пять минут — и ты в игре. Заходи.' },
    { title: '🥇 Турнир стартует', body: 'Первое место пока свободно.' },
    { title: '🔥 Турнир открыт', body: 'Места разбирают. Занимай своё.' },
    { title: '🎪 Турнир собирается', body: 'Соперники уже собираются. Присоединяйся.' },
  ],
  uk: [
    { title: '🏁 Турнір починається', body: "П'ять хвилин — і ти у грі. Заходь." },
    { title: '🥇 Турнір стартує', body: 'Перше місце поки вільне.' },
    { title: '🔥 Турнір відкрито', body: 'Місця розбирають. Займай своє.' },
    { title: '🎪 Турнір збирається', body: 'Суперники вже збираються. Приєднуйся.' },
  ],
  es: [
    { title: '🏁 El torneo empieza', body: 'Cinco minutos y estás dentro. Entra.' },
    { title: '🥇 Arranca el torneo', body: 'El primer puesto sigue libre.' },
    { title: '🔥 Torneo abierto', body: 'Los puestos vuelan. Toma el tuyo.' },
    { title: '🎪 El torneo se llena', body: 'Tus rivales ya se reúnen. Únete.' },
  ],
  'pt-BR': [
    { title: '🏁 O torneio vai começar', body: 'Cinco minutos e você está dentro. Entra.' },
    { title: '🥇 O torneio começa', body: 'O primeiro lugar ainda está livre.' },
    { title: '🔥 Torneio aberto', body: 'As vagas somem rápido. Pegue a sua.' },
    { title: '🎪 O torneio está enchendo', body: 'Seus rivais já estão chegando. Bora.' },
  ],
  vi: [
    { title: '🏁 Giải đấu sắp bắt đầu', body: 'Năm phút thôi là bạn vào cuộc. Vào nhé.' },
    { title: '🥇 Giải đấu khởi tranh', body: 'Vị trí số một vẫn còn trống.' },
    { title: '🔥 Giải đấu đã mở', body: 'Chỗ hết nhanh lắm. Giữ chỗ của bạn.' },
    { title: '🎪 Giải đấu đang gom người', body: 'Đối thủ đang tụ họp. Tham gia nào.' },
  ],
  id: [
    { title: '🏁 Turnamen segera dimulai', body: 'Lima menit saja dan kamu ikut. Masuk yuk.' },
    { title: '🥇 Turnamen dimulai', body: 'Peringkat satu masih kosong.' },
    { title: '🔥 Turnamen dibuka', body: 'Tempat cepat habis. Ambil tempatmu.' },
    { title: '🎪 Turnamen mulai terisi', body: 'Lawan sudah berkumpul. Gabung sekarang.' },
  ],
  tr: [
    { title: '🏁 Turnuva başlıyor', body: 'Beş dakika ve oyundasın. Katıl.' },
    { title: '🥇 Turnuva start alıyor', body: 'Birincilik hâlâ boş.' },
    { title: '🔥 Turnuva açıldı', body: 'Yerler kapılıyor. Yerini al.' },
    { title: '🎪 Turnuva doluyor', body: 'Rakipler toplanıyor. Sen de katıl.' },
  ],
  pl: [
    { title: '🏁 Turniej się zaczyna', body: 'Pięć minut i jesteś w grze. Wchodź.' },
    { title: '🥇 Turniej rusza', body: 'Pierwsze miejsce wciąż wolne.' },
    { title: '🔥 Turniej otwarty', body: 'Miejsca znikają. Zajmij swoje.' },
    { title: '🎪 Turniej się zapełnia', body: 'Rywale już się zbierają. Dołącz.' },
  ],
};

/**
 * Выбирает вариант текста детерминированно от uid и дня — один и тот же юзер
 * не получает подряд одинаковый текст, но и рандома нет (тесты воспроизводимы).
 */
export function pickTournamentCopy(uid: string, nowMs: number, lang: string): Copy {
  const variants = STARTING_COPY[normLang(lang)];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  const dayIndex = Math.floor(nowMs / DAY_MS);
  return variants[(hash + dayIndex) % variants.length];
}

/** Локализованное сообщение для кандидата (чистая функция). */
export function buildTournamentPushMessage(
  c: TournamentPushCandidate,
  roomId: string,
  nowMs: number,
): ExpoPushMessage {
  const copy = pickTournamentCopy(c.uid, nowMs, c.lang);
  return {
    to: c.token,
    title: copy.title,
    body: copy.body,
    sound: 'default',
    data: { type: 'tournament_starting', roomId },
  };
}

/** Разбивка на чанки (Expo Push API принимает до 100 за раз). */
export function chunkMessages<T>(items: T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Настал ли момент открытия лобби для слота (чистая функция).
 * Момент = startsAt − lobbyOpenMs, окно ±TOURNAMENT_PUSH_WINDOW_MS/2,
 * чтобы дрожание запуска крона не съедало слот целиком.
 */
export function isLobbyOpeningNow(
  nowMs: number,
  startsAtMs: number,
  lobbyOpenMs: number,
): boolean {
  const lobbyOpensAt = startsAtMs - lobbyOpenMs;
  const delta = nowMs - lobbyOpensAt;
  return delta >= 0 && delta < TOURNAMENT_PUSH_WINDOW_MS;
}

// ── I/O: отправка через Expo Push API ─────────────────────────────────────────
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

async function sendExpoPushChunk(chunk: ExpoPushMessage[]): Promise<void> {
  const res = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(chunk),
  });
  if (!res.ok) throw new Error(`expo_push_http_${res.status}`);
}

export interface TournamentPushSummary {
  scanned: number;
  candidates: number;
  sent: number;
  failedChunks: number;
}

/**
 * Главный прогон: скан users/, отбор, отправка, штамп lastTournamentPushAt.
 *
 * Вызывается ТОЛЬКО когда открылось лобби (см. isLobbyOpeningNow), то есть
 * максимум трижды в сутки при дефолтном расписании — а не на каждом тике крона.
 * Проекция полей режет трафик: доки users/ самые «толстые» в базе.
 */
export async function runTournamentStartPush(
  roomId: string,
  now: number = Date.now(),
): Promise<TournamentPushSummary> {
  if (!TOURNAMENT_START_PUSH_ENABLED) {
    return { scanned: 0, candidates: 0, sent: 0, failedChunks: 0 };
  }

  const db = admin.firestore();
  const PAGE_SIZE = 300;
  const STAMP_BATCH = 400;

  let scanned = 0;
  const allCandidates: TournamentPushCandidate[] = [];
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query: FirebaseFirestore.Query = db.collection('users')
      .orderBy('__name__')
      .limit(PAGE_SIZE)
      .select(
        'expoPushToken',
        'pushTokenLang',
        'pushTokenTimezone',
        'last_active_at',
        'lastTournamentPushAt',
        'pushPrefs',
      );
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];

    const pageUsers = snap.docs.map((doc) =>
      parseTournamentPushUser(doc.id, doc.data() as Record<string, unknown>),
    );
    scanned += pageUsers.length;
    allCandidates.push(...selectTournamentPushCandidates(pageUsers, now));

    if (snap.size < PAGE_SIZE) break;
  }

  if (allCandidates.length === 0) {
    return { scanned, candidates: 0, sent: 0, failedChunks: 0 };
  }

  const candidateChunks = chunkMessages(allCandidates, 100);
  let sent = 0;
  let failedChunks = 0;
  const successfulUids: string[] = [];

  for (const chunk of candidateChunks) {
    try {
      await sendExpoPushChunk(chunk.map((c) => buildTournamentPushMessage(c, roomId, now)));
      sent += chunk.length;
      for (const c of chunk) successfulUids.push(c.uid);
    } catch (e) {
      failedChunks++;
      console.error('tournament_start_push: chunk failed', e);
    }
  }

  // Штампуем cooldown только тем, кому пуш реально ушёл: юзеры из упавших
  // чанков не «сгорают» на сутки и попадут в отбор на следующем слоте.
  if (successfulUids.length > 0) {
    let batch = db.batch();
    let stamped = 0;
    for (const uid of successfulUids) {
      batch.set(db.collection('users').doc(uid), { lastTournamentPushAt: now }, { merge: true });
      stamped++;
      if (stamped % STAMP_BATCH === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    if (stamped % STAMP_BATCH !== 0) await batch.commit();
  }

  return { scanned, candidates: allCandidates.length, sent, failedChunks };
}
