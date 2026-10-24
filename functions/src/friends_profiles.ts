/**
 * Пачковая выдача публичных профилей друзей (убирает 4-RTT цепочку с клиента).
 *
 * Стало: один callable friendsGetProfiles({uids}) читает канонический leaderboard
 * server-to-server,
 * ответ кэшируется на 60 c (как listMyInvitesServerCache).
 *
 * TODO(mapping): набор полей выровнен по клиентскому profileFromLeaderboardDoc.
 * Если там появятся новые поля карточки профиля —
 * дополнить FRIEND_PROFILE_FIELDS-маппинг здесь, не раздувая клиент.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

/** Сколько uid принимаем за вызов. */
const MAX_UIDS_PER_CALL = 100;
/** Server-side кэш ответа: 60 c — список друзей не требует realtime-точности. */
const SERVER_CACHE_TTL_MS = 60 * 1000;
const SERVER_CACHE_MAX_ENTRIES = 500;

/** Кодек `active_days_v1` — см. functions/src/friends_together_core.ts. */
export interface FriendActiveDays {
  anchor: string;
  bits: string;
}

/** Настройки пуша «Позвать» из `friends_push_v1` (app/hall_of_fame_utils.ts пишет active_days_v1 рядом). */
export interface FriendPushSettings {
  enabled: boolean;
  /** Минуты к востоку от UTC, знак как `getTimezoneOffset()*-1`. */
  tz: number;
}

/**
 * «Итог недели друга» (идея 6, docs/design/v2-app/friends-full.html #week): неделя, посчитанная телефоном друга
 * (app/friends_together/friend_week.ts) и лежащая в users/{uid}.progress.friends_week_v1.
 * зачем (закон владельца «телефон решает и выдаёт сразу, сервер только хранит записи, чтобы друг их забрал»): сервер ничего
 * не считает — только строго разбирает чужую запись и отдаёт её тем же чтением users/{uid}; скрытая («не показывать друзьям») — null.
 */
export interface FriendWeekSummaryWire {
  /** Локальный понедельник недели, YYYY-MM-DD. */
  week: string;
  streak: number;
  lessons: number;
  /** Дней с занятиями, 0…7. */
  days: number;
  floor: number | null;
  /** На сколько этажей выше прошлой недели; null — не выше или неизвестно. */
  rise: number | null;
  /** 0 — понедельник … 6 — воскресенье. */
  best: { dow: number; lessons: number } | null;
}

export interface FriendWeekWire {
  v: 1;
  cur: FriendWeekSummaryWire | null;
  prev: FriendWeekSummaryWire | null;
}

/**
 * «Фраза дня вдвоём» (идея 8): ответ друга на фразу дня — его телефон решил верность и записал progress.friends_phrase_v1.
 * зачем (закон владельца «сервер только хранит записи»): сервер строго разбирает и отдаёт тем же чтением users/{uid}.
 */
/**
 * «Урок вместе» (идея 2): маски курса друга — какие занятия он прошёл и какие у него открыты (прогресс v2,
 * modules/learning-v2/progress/course_progress_masks_v1.ts: бит = (урок − 1) · 56 + (занятие − 1), шестнадцатеричная строка).
 * зачем (координатор 22.10; закон владельца «сервер только хранит записи»): выбор друзей показывает «урок открыт / уже прошёл /
 * закрыт» — телефон друга сам пишет маски в синхронизируемый прогресс, сервер лишь строго отдаёт их тем же чтением users/{uid}.
 */
export interface FriendCourseWire {
  v: 1;
  /** Пройдено. */
  c: string;
  /** Открыто, но не пройдено. */
  o: string;
}

export interface FriendPhraseWire {
  v: 1;
  day: string;
  phraseId: string;
  optionId: string;
  correct: boolean;
}

export interface FriendPublicProfile {
  uid: string;
  displayName: string;
  avatar: string;
  frame: string;
  aura: string;
  profileCardLevel: number;
  /** Публичный ранг 0..19; null = проекция отсутствует или не прошла проверку. */
  coinRank: number | null;
  /** Цепочка дней. null = писатель её не проставил (не путать с честным нулём). */
  streak: number | null;
  isPremium: boolean;
  isVip: boolean;
  isLifetime: boolean;
  /** Настоящий Plus из public_profiles (cbdecef56). null = проекция не писала поле — кольца нет. */
  isPlus: boolean | null;
  /** Срок Plus: 0 — бессрочно, иначе мс; null — Plus нет или поле не записано. */
  plusUntilMs: number | null;
  /** «Вместе» (§3.1): последний известный локальный день активности. null = нет данных. */
  lastActiveDate: string | null;
  /** «Вместе»: кодек активных дней для daysTogether(). null = нет данных. */
  activeDays: FriendActiveDays | null;
  /** «Вместе»: настройки пуша «Позвать» этого друга. null = никогда не задавал (трактуем как enabled). */
  friendsPush: FriendPushSettings | null;
  /**
   * Шпиль (TOWER.md §4.5, PM-282): лучший этаж друга ЗА ТЕКУЩУЮ неделю среди
   * всех языков (tier+1, tier 0..11 → этаж 1..12), null = не играл на этой
   * неделе / данных нет. Строка «Друзья на этой неделе» рисует именно это поле.
   */
  spireFloor: number | null;
  /** Язык, на котором друг достиг spireFloor (нужно для подписи/иконки языка в строке). */
  spireLang: string | null;
  /** «Итог недели друга» (идея 6): две недели из friends_week_v1; null — нет записи или друг её скрыл. */
  friendWeek: FriendWeekWire | null;
  /** «Фраза дня вдвоём» (идея 8): последний ответ друга из friends_phrase_v1; null — нет записи. */
  friendPhrase: FriendPhraseWire | null;
  /** «Урок вместе»: маски курса друга из learning_v2_course_masks_sync_v1; null — записи нет или она чужой раскладки. */
  friendCourse: FriendCourseWire | null;
}

type ProfilesResponse = { ok: true; profiles: Record<string, FriendPublicProfile | null> };

const serverCache = new Map<string, { expiresAtMs: number; data: ProfilesResponse }>();

function readServerCache(key: string): ProfilesResponse | null {
  const hit = serverCache.get(key);
  if (hit && hit.expiresAtMs > Date.now()) return hit.data;
  return null;
}

function writeServerCache(key: string, data: ProfilesResponse): void {
  const now = Date.now();
  serverCache.set(key, { expiresAtMs: now + SERVER_CACHE_TTL_MS, data });
  if (serverCache.size > SERVER_CACHE_MAX_ENTRIES) {
    for (const [k, entry] of serverCache) {
      if (entry.expiresAtMs <= now || serverCache.size > SERVER_CACHE_MAX_ENTRIES - 100) {
        serverCache.delete(k);
      }
    }
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Отличает «поля нет» от честного нуля: карточка не должна врать про цепочку. */
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

/** Срок Plus из проекции: только конечное неотрицательное целое число (0 — бессрочно); всё прочее — null. */
function plusUntilMsOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function coinRankOrNull(value: unknown): number | null {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= 19
    ? value
    : null;
}

type DocData = Record<string, unknown> | undefined;

function getProgress(data: DocData): Record<string, unknown> {
  const raw = (data as { progress?: unknown } | undefined)?.progress;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function currentWeekKey(nowMs: number): string {
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Языки Шпиля — зеркало SPIRE_LANGS из spire_progress_contract.ts (PM-275/276). */
const SPIRE_LANGS = ['en', 'es', 'de', 'fr', 'it'] as const;
const SPIRE_WEEK_RECORD_SCHEMA_VERSION = 'spire-week-record.v1';

/**
 * Шпиль друзей (TOWER.md §4.5, PM-282): «этаж друга на этой неделе» ЧИТАЕМ из
 * уже загруженного users/{uid}.progress.spire_week_v1 — того же поля, что пишет
 * spireReportSteps (SPIRE_PROGRESS_FIELD, spire_progress_contract.ts) при пачке
 * отчётов о ступенях. Здесь НЕ импортируем spireParseWeekProgress из
 * spire_progress_contract.ts намеренно: тот модуль валидирует форму отчётов
 * (лишний surface для простого чтения), а локальный узкий парсер использует
 * тот же ISO week key, что и недельный Spire ledger.
 *
 * Никакого нового чтения не добавляет: users/{uid} и так читается в
 * fetchOneProfile ради «Вместе» — Шпиль едет тем же документом,
 * тем же батчем friendsGetProfiles (0 доп. Firestore-чтений на друга).
 *
 * 15 этажей = 135 ступеней (TOWER.md T32), но progress хранит `tier` (0..11,
 * 12 камней T29) — «этаж» здесь = tier+1 в границах текущей комнаты игрока;
 * если Шпиль введёт отдельное поле «этаж» позже, читать его придётся здесь же.
 */
function spireFloorFromUserProgress(
  progress: Record<string, unknown> | undefined,
  nowMs: number = Date.now(),
): { spireFloor: number | null; spireLang: string | null } {
  const raw = progress?.['spire_week_v1'];
  if (typeof raw !== 'string' || !raw) return { spireFloor: null, spireLang: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { spireFloor: null, spireLang: null };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { spireFloor: null, spireLang: null };
  }
  const weekKey = currentWeekKey(nowMs);
  let bestFloor = -1;
  let bestLang: string | null = null;
  for (const lang of SPIRE_LANGS) {
    const row = (parsed as Record<string, unknown>)[lang];
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    if (r.schemaVersion !== SPIRE_WEEK_RECORD_SCHEMA_VERSION || r.weekKey !== weekKey) continue;
    const tier = Number(r.tier);
    if (!Number.isFinite(tier) || tier < 0) continue;
    const floor = Math.floor(tier) + 1;
    if (floor > bestFloor) {
      bestFloor = floor;
      bestLang = lang;
    }
  }
  return bestFloor >= 0 ? { spireFloor: bestFloor, spireLang: bestLang } : { spireFloor: null, spireLang: null };
}

/** Строгий разбор недели друга: дата-понедельник, числа в границах; иначе null (запись недоверенная). */
function friendWeekSummaryFromWire(raw: unknown): FriendWeekSummaryWire | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const week = typeof r.week === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.week) ? r.week : '';
  const [y, m, d] = week.split('-').map(Number);
  const ms = week ? Date.UTC(y!, m! - 1, d!) : NaN;
  const back = new Date(ms);
  if (!week || !Number.isFinite(ms) || back.getUTCDate() !== d || back.getUTCDay() !== 1) return null;
  const bounded = (value: unknown, max: number): number => {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
  };
  const bestRaw = r.best && typeof r.best === 'object' && !Array.isArray(r.best) ? r.best as Record<string, unknown> : null;
  const dow = Math.floor(Number(bestRaw?.dow));
  const bestLessons = bounded(bestRaw?.lessons, 2_000);
  const floor = r.floor === null || r.floor === undefined ? 0 : bounded(r.floor, 999);
  return {
    week,
    streak: bounded(r.streak, 100_000),
    lessons: bounded(r.lessons, 2_000),
    days: bounded(r.days, 7),
    floor: floor > 0 ? floor : null,
    rise: floor > 0 && bounded(r.rise, 999) > 0 ? bounded(r.rise, 999) : null,
    best: bestRaw && Number.isFinite(dow) && dow >= 0 && dow <= 6 && bestLessons > 0 ? { dow, lessons: bestLessons } : null,
  };
}

export function friendWeekFromProgress(progress: Record<string, unknown>): FriendWeekWire | null {
  const raw = parseJsonObject(progress['friends_week_v1']);
  if (raw.v !== 1 || raw.hidden === true) return null;
  const cur = friendWeekSummaryFromWire(raw.cur);
  const prev = friendWeekSummaryFromWire(raw.prev);
  return cur || prev ? { v: 1, cur, prev } : null;
}

/** 32 урока × 56 занятий = 1792 бита = не больше 448 шестнадцатеричных символов на маску. */
const COURSE_MASK_RE = /^[0-9a-f]{0,448}$/;

export function friendCourseFromProgress(progress: Record<string, unknown>): FriendCourseWire | null {
  const r = parseJsonObject(progress['learning_v2_course_masks_sync_v1']);
  // без поля v — первые записи той же раскладки v1; иная версия — чужая раскладка, друзьям не отдаём
  if (r.v !== undefined && r.v !== 1) return null;
  const c = typeof r.c === 'string' ? r.c.toLowerCase() : null;
  const o = typeof r.o === 'string' ? r.o.toLowerCase() : null;
  if (c === null || o === null || !COURSE_MASK_RE.test(c) || !COURSE_MASK_RE.test(o)) return null;
  return { v: 1, c, o };
}

export function friendPhraseFromProgress(progress: Record<string, unknown>): FriendPhraseWire | null {
  const r = parseJsonObject(progress['friends_phrase_v1']);
  const token = (value: unknown): string => (typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(value) ? value : '');
  const day = typeof r.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.day) ? r.day : '';
  const phraseId = token(r.phraseId);
  const optionId = token(r.optionId);
  if (r.v !== 1 || typeof r.correct !== 'boolean' || !day || !phraseId || !optionId) return null;
  return { v: 1, day, phraseId, optionId, correct: r.correct };
}

/** Читает active_days_v1/friends_push_v1/last_active_date из users/{uid}.progress. */
export function friendTogetherFieldsFromUserData(userData: DocData, nowMs: number = Date.now()): {
  lastActiveDate: string | null;
  activeDays: FriendActiveDays | null;
  friendsPush: FriendPushSettings | null;
  spireFloor: number | null;
  spireLang: string | null;
  friendWeek: FriendWeekWire | null;
  friendPhrase: FriendPhraseWire | null;
  friendCourse: FriendCourseWire | null;
} {
  const progress = getProgress(userData);
  const lastActiveDate = typeof progress['last_active_date'] === 'string' && progress['last_active_date']
    ? progress['last_active_date'] as string
    : null;

  const activeDaysRaw = parseJsonObject(progress['active_days_v1']);
  const anchor = typeof activeDaysRaw.anchor === 'string' ? activeDaysRaw.anchor : '';
  const bits = typeof activeDaysRaw.bits === 'string' ? activeDaysRaw.bits : '';
  const activeDays = anchor && bits ? { anchor, bits } : null;

  const pushRaw = parseJsonObject(progress['friends_push_v1']);
  const friendsPush = Object.keys(pushRaw).length > 0
    ? { enabled: pushRaw.enabled !== false, tz: Number.isFinite(Number(pushRaw.tz)) ? Number(pushRaw.tz) : 0 }
    : null;

  const spire = spireFloorFromUserProgress(progress, nowMs);

  return {
    lastActiveDate,
    activeDays,
    friendsPush,
    spireFloor: spire.spireFloor,
    spireLang: spire.spireLang,
    friendWeek: friendWeekFromProgress(progress),
    friendPhrase: friendPhraseFromProgress(progress),
    friendCourse: friendCourseFromProgress(progress),
  };
}

/** Сборка публичного профиля из канонического leaderboard (+ опциональные поля «Вместе» из users/{uid}). */
export function buildFriendProfile(
  uid: string,
  lb: DocData,
  userData?: DocData,
  publicProfileData?: DocData,
  hasDeletionMarker = false,
): FriendPublicProfile | null {
  if (hasDeletionMarker || userData?.identityHidden === true) return null;
  const source = publicProfileData ?? lb;
  if (!source) return null;
  const displayName = str(source.name) || str(source.displayName) || '';
  const profileCardLevel = num(
    source.profileCardLevel ?? source.courseProfileCardLevel,
  );
  // «Вместе»: поля читаются из users/{uid}.progress, НЕ из leaderboard — тот документ
  // их не несёт. userData отсутствует → нейтральные значения (профиль всё равно валиден
  // по leaderboard-полям выше; вызывающий решает, стоит ли платить за 2-е чтение).
  const together = friendTogetherFieldsFromUserData(userData);
  const profile: FriendPublicProfile = {
    uid,
    displayName,
    avatar: str(source.avatar),
    frame: str(source.frame ?? source.courseProfileCardFrame),
    aura: str(source.aura ?? source.courseProfileCardAura),
    profileCardLevel,
    coinRank: coinRankOrNull(publicProfileData?.coinRank),
    streak: numOrNull(source.streak),
    isPremium: source.isPremium === true || source.courseIsPremium === true,
    isVip: source.isVip === true || source.courseIsVip === true,
    isLifetime: source.isLifetime === true || source.courseIsLifetime === true,
    // зачем (координатор 22.10, клиент кольца 4 · ТЕМЫ 49677b5c4): кольцо Plus у друзей из batch. Берём ТОЛЬКО из
    // public_profiles — его пишет проекция/вебхук (isRealPlusActive, без вводного доступа). leaderboard этих полей
    // не несёт: там null, и кольца нет. Это дешевле, чем откатываться на isPremium с вводным доступом. 0 новых чтений.
    isPlus: typeof publicProfileData?.isPlus === 'boolean' ? publicProfileData.isPlus : null,
    plusUntilMs: plusUntilMsOrNull(publicProfileData?.plusUntilMs),
    lastActiveDate: together.lastActiveDate,
    activeDays: together.activeDays,
    friendsPush: together.friendsPush,
    spireFloor: together.spireFloor,
    spireLang: together.spireLang,
    friendWeek: together.friendWeek,
    friendPhrase: together.friendPhrase,
    friendCourse: together.friendCourse,
  };
  if (!profile.displayName && !profile.avatar && profile.profileCardLevel <= 0) {
    return null;
  }
  return profile;
}

/**
 * Та же 4-шаговая цепочка, что была на клиенте, но server-to-server (1 вызов на всех).
 * + 1 доп. чтение users/{uid} для полей «Вместе» (§3.1 спецификации: active_days_v1,
 * friends_push_v1 — leaderboard их не несёт). Оба чтения параллельно —
 * это не удваивает латентность, а серверный кэш 60с (SERVER_CACHE_TTL_MS) держит
 * повторный расход в разумных рамках при частых открытиях вкладки.
 */
/** Документы друга, уже прочитанные проверкой дружбы в этом же вызове. */
type PrefetchedFriendDocs = Readonly<{
  userExists: boolean;
  userData: DocData;
  tombstoneExists: boolean;
}>;

async function fetchOneProfile(
  db: admin.firestore.Firestore,
  uid: string,
  prefetched?: PrefetchedFriendDocs,
): Promise<FriendPublicProfile | null> {
  // зачем (§CORE-0162, аудит стоимости Firebase, пакет D): users/{uid} и метку удаления друга только что прочитала
  // проверка дружбы (authorizedProfileUids, тот же вызов) — второй раз их не читаем: −2 чтения на друга.
  // Без них (свой профиль) — прежние 3 чтения.
  const [publicProfileSnap, user, tombstoneExists] = prefetched
    ? [await db.collection('public_profiles').doc(uid).get(), { exists: prefetched.userExists, data: prefetched.userData }, prefetched.tombstoneExists]
    : await Promise.all([
      db.collection('public_profiles').doc(uid).get(),
      db.collection('users').doc(uid).get().then((snap) => ({ exists: snap.exists, data: snap.data() as DocData })),
      db.collection('account_deletion_tombstones').doc(uid).get().then((snap) => snap.exists),
    ]);

  if (!user.exists || (user.data as Record<string, unknown> | undefined)?.identityHidden === true || tombstoneExists) return null;

  const publicProfileData = publicProfileSnap.exists
    ? publicProfileSnap.data() as DocData
    : undefined;

  let lbData: DocData = undefined;
  if (!publicProfileData) {
    const lbSnap = await db.collection('leaderboard').doc(uid).get();
    if (lbSnap.exists) {
      lbData = lbSnap.data() as DocData;
    } else {
      const byAuth = await db.collection('leaderboard').where('firebaseAuthUid', '==', uid).limit(1).get();
      lbData = byAuth.docs[0]?.data() as DocData;
    }
  }

  return buildFriendProfile(
    uid,
    lbData,
    user.data,
    publicProfileData,
    tombstoneExists,
  );
}

async function authorizedProfileUids(
  db: admin.firestore.Firestore,
  callerStableUid: string,
  requestedUids: string[],
): Promise<Readonly<{ uids: string[]; prefetched: ReadonlyMap<string, PrefetchedFriendDocs> }>> {
  const authorized = new Set<string>();
  const prefetched = new Map<string, PrefetchedFriendDocs>();
  const friendCandidates = requestedUids.filter((uid) => {
    if (uid === callerStableUid) {
      authorized.add(uid);
      return false;
    }
    return true;
  });
  if (friendCandidates.length === 0) return { uids: [...authorized], prefetched };

  const authorizationRefs = friendCandidates.flatMap((friendUid) => [
    db.collection('users').doc(callerStableUid).collection('friends').doc(friendUid),
    db.collection('users').doc(friendUid).collection('friends').doc(callerStableUid),
    db.collection('users').doc(friendUid),
    db.collection('account_deletion_tombstones').doc(friendUid),
  ]);
  const authorizationSnaps = await db.getAll(...authorizationRefs);
  friendCandidates.forEach((friendUid, index) => {
    const offset = index * 4;
    const friendUser = authorizationSnaps[offset + 2];
    if (authorizationSnaps[offset]?.exists
      && authorizationSnaps[offset + 1]?.exists
      && friendUser?.exists
      && friendUser.data()?.identityHidden !== true
      && !authorizationSnaps[offset + 3]?.exists) {
      authorized.add(friendUid);
      prefetched.set(friendUid, {
        userExists: true,
        userData: friendUser.data() as DocData,
        tombstoneExists: false,
      });
    }
  });
  return { uids: [...authorized], prefetched };
}

function responseForRequestedUids(
  requestedUids: string[],
  authorizedUids: ReadonlySet<string>,
  authorizedProfiles: ProfilesResponse,
): ProfilesResponse {
  const profiles: Record<string, FriendPublicProfile | null> = {};
  for (const uid of requestedUids) {
    profiles[uid] = authorizedUids.has(uid)
      ? authorizedProfiles.profiles[uid] ?? null
      : null;
  }
  return { ok: true, profiles };
}

export const friendsGetProfiles = onCall(CALLABLE_BASE, async (request): Promise<ProfilesResponse> => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const rawUids = request.data?.uids;
  if (!Array.isArray(rawUids)) {
    throw new HttpsError('invalid-argument', 'uids array required');
  }
  const uids = [...new Set(rawUids.map((u) => String(u ?? '').trim()).filter(Boolean))].slice(0, MAX_UIDS_PER_CALL);

  const db = admin.firestore();
  const callerStableUid = await resolveStableUidForAuth(
    db,
    request.auth.uid,
    undefined,
    { repairLinks: false },
  );
  return runFriendsGetProfiles(db, callerStableUid, uids);
});

/**
 * Тело friendsGetProfiles без авторизации вызова — для тестов на подменной базе (§CORE-0162).
 * Форма ответа прежняя: старые сборки (1.6.24) получают тот же { ok, profiles }.
 */
export async function runFriendsGetProfiles(
  db: admin.firestore.Firestore,
  callerStableUid: string,
  uids: string[],
): Promise<ProfilesResponse> {
  const { uids: authorizedUids, prefetched } = await authorizedProfileUids(db, callerStableUid, uids);
  const authorizedSet = new Set(authorizedUids);

  // Profiles include private users/{uid}.progress fields, so cached responses
  // are scoped by canonical caller AND the freshly verified mutual-friend set.
  // A removed friendship produces a different key and cannot reuse stale data.
  const cacheKey = `${callerStableUid}\n${authorizedUids.slice().sort().join(',')}`;
  const cached = readServerCache(cacheKey);
  if (cached) return responseForRequestedUids(uids, authorizedSet, cached);

  const entries = await Promise.all(
    authorizedUids.map(async (uid): Promise<[string, FriendPublicProfile | null]> => {
      try {
        return [uid, await fetchOneProfile(db, uid, prefetched.get(uid))];
      } catch (e) {
        console.warn('friendsGetProfiles: failed for uid', uid, e);
        return [uid, null];
      }
    }),
  );

  const profiles: Record<string, FriendPublicProfile | null> = {};
  for (const [uid, profile] of entries) profiles[uid] = profile;

  const result: ProfilesResponse = { ok: true, profiles };
  writeServerCache(cacheKey, result);
  return responseForRequestedUids(uids, authorizedSet, result);
}
