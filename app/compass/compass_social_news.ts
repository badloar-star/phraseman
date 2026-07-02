/**
 * Компас — сбор «соц-сводки» для блока «Кстати…» в брифинге.
 *
 * Собирает свежие соц-события пользователя и превращает их в короткие тёплые
 * строки для блока внутри модалки Компаса (или тоста-фолбэка, когда брифинг
 * сегодня не показывается):
 *   • кто-то прислал тебе заявку в друзья (incoming pending);
 *   • кто-то принял ТВОЮ заявку (новый друг, появившийся с прошлой проверки);
 *   • кто-то поставил тебе лайк.
 *
 * АНТИ-ПОВТОР: каждое событие имеет стабильную сигнатуру; уже показанные
 * сигнатуры лежат в AsyncStorage. И брифинг, и тост-фолбэк зовут одни и те же
 * collect/markSeen — поэтому событие показывается РОВНО один раз, без задвоения
 * между модалкой и тостом.
 *
 * ИЗОЛЯЦИЯ/ДЕШЕВИЗНА: 0 ИИ-токенов, всё детерминированно. В Expo Go / при
 * выключенном cloud-sync возвращает пустую сводку и ничего не читает.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../../constants/i18n';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getCanonicalUserId } from '../user_id_policy';
import {
  type CompassSocialKind,
  safeSocialName,
  socialLineForKind,
  socialMoreSuffix,
} from './compass_social_copy';

/** Сколько строк максимум показываем в блоке (остальное сворачивается в «и ещё N»). */
const MAX_SOCIAL_LINES = 3;
/** Сколько событий каждого типа максимум читаем (защита от больших чтений). */
const FETCH_LIMIT_PER_KIND = 20;
/** TTL «свежести»: события старше этого не всплывают (чтобы не показывать древнее). */
const FRESHNESS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const SEEN_SIGNATURES_KEY = 'compass_social_seen_signatures_v1';
/** Сколько сигнатур храним (кольцевой буфер) — защита от безграничного роста. */
const MAX_STORED_SIGNATURES = 300;

/** Одно событие соц-сводки (уже с разрешённым именем отправителя). */
export interface CompassSocialEvent {
  kind: CompassSocialKind;
  /** Безопасное (готовое к показу) имя отправителя. */
  name: string;
  /** Время события (мс) — для сортировки «свежее сверху». */
  ts: number;
  /** Стабильная сигнатура для анти-повтора. */
  signature: string;
}

/** Готовая к показу сводка: строки + сами события (для markSeen). */
export interface CompassSocialNews {
  /** Локализованные строки для блока «Кстати…» (уже обрезаны до MAX_SOCIAL_LINES). */
  lines: string[];
  /** Полный локализованный список событий для раскрытия блока без повторного чтения облака. */
  allLines: string[];
  /** Все собранные события (включая свёрнутые в «и ещё N») — для markSeen. */
  events: CompassSocialEvent[];
}

function isSocialNewsEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

const getDb = () => {
  if (!isSocialNewsEnabled()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readTs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

/** Имя пользователя из публичного leaderboard-документа (самый дешёвый публичный источник). */
async function resolvePublicName(db: ReturnType<typeof getDb>, uid: string): Promise<string> {
  if (!db || !uid) return '';
  try {
    const snap = await db.collection('leaderboard').doc(uid).get();
    if (!snap.exists) return '';
    const d: Record<string, unknown> = snap.data?.() ?? {};
    return readString(d.name) || readString(d.displayName);
  } catch {
    return '';
  }
}

/** Множество стабильных id уже состоящих в друзьях (для отсева «новых друзей»). */
async function loadKnownFriendUids(db: ReturnType<typeof getDb>, myUid: string): Promise<Set<string>> {
  const out = new Set<string>();
  if (!db) return out;
  try {
    const snap = await db.collection('users').doc(myUid).collection('friends').get();
    for (const doc of snap.docs as Array<{ id: string }>) out.add(doc.id);
  } catch {
    /* ignore — отсутствие списка друзей не должно ломать сводку */
  }
  return out;
}

// ── seen-сигнатуры ───────────────────────────────────────────────────────────

async function loadSeenSignatures(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_SIGNATURES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Помечает события сводки показанными — чтобы они больше не всплыли (ни в
 * брифинге, ни в тосте). Кольцевой буфер: храним последние MAX_STORED_SIGNATURES.
 */
export async function markSocialNewsSeen(events: CompassSocialEvent[]): Promise<void> {
  if (!events.length) return;
  try {
    const existing = await loadSeenSignatures();
    for (const ev of events) existing.add(ev.signature);
    let arr = Array.from(existing);
    if (arr.length > MAX_STORED_SIGNATURES) arr = arr.slice(arr.length - MAX_STORED_SIGNATURES);
    await AsyncStorage.setItem(SEEN_SIGNATURES_KEY, JSON.stringify(arr));
  } catch {
    /* ignore — best-effort */
  }
}

// ── сбор событий ───────────────────────────────────────────────────────────

async function collectFriendRequests(
  db: ReturnType<typeof getDb>,
  myUid: string,
  nowMs: number,
): Promise<CompassSocialEvent[]> {
  if (!db) return [];
  try {
    const snap = await db
      .collection('users').doc(myUid).collection('friend_requests')
      .limit(FETCH_LIMIT_PER_KIND).get();
    const out: CompassSocialEvent[] = [];
    for (const doc of snap.docs as Array<{ id: string; data: () => Record<string, unknown> }>) {
      const d = doc.data() ?? {};
      const status = readString(d.status);
      if (status && status !== 'pending') continue;
      const ts = readTs(d.createdAt) || nowMs;
      if (nowMs - ts > FRESHNESS_WINDOW_MS) continue;
      out.push({
        kind: 'friend_request',
        name: '',
        ts,
        signature: `req:${doc.id}`,
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function collectNewlyAcceptedFriends(
  db: ReturnType<typeof getDb>,
  myUid: string,
  nowMs: number,
): Promise<CompassSocialEvent[]> {
  if (!db) return [];
  try {
    const snap = await db
      .collection('users').doc(myUid).collection('friends')
      .limit(FETCH_LIMIT_PER_KIND).get();
    const out: CompassSocialEvent[] = [];
    for (const doc of snap.docs as Array<{ id: string; data: () => Record<string, unknown> }>) {
      const d = doc.data() ?? {};
      const ts = readTs(d.createdAt) || nowMs;
      if (nowMs - ts > FRESHNESS_WINDOW_MS) continue;
      // acceptedAt ставит ПРИНЯВШИЙ на reverse-доке отправителя (см. acceptFriendRequest).
      // Есть маркер → это «приняли ТВОЮ заявку». Нет → я сам принял входящую → нейтрально.
      const accepted = readTs(d.acceptedAt) > 0;
      // Сигнатура по uid: «новый друг» показывается один раз (любой из двух кейсов).
      out.push({
        kind: accepted ? 'friend_accepted' : 'friend_added',
        name: '',
        ts,
        signature: `acc:${doc.id}`,
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function collectLikesReceived(nowMs: number): Promise<CompassSocialEvent[]> {
  try {
    const { fetchActivityLikesReceived } = await import('../friend_activity_likes');
    const received = await fetchActivityLikesReceived(FETCH_LIMIT_PER_KIND).catch(() => []);
    const out: CompassSocialEvent[] = [];
    for (const like of received) {
      if (nowMs - like.ts > FRESHNESS_WINDOW_MS) continue;
      out.push({
        kind: 'like',
        name: safeSocialNameRaw(like.fromName),
        ts: like.ts,
        signature: `like:${like.id}`,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Сырое имя из лайка: лайк уже несёт fromName, имя резолвить из leaderboard не нужно. */
function safeSocialNameRaw(name: string | undefined): string {
  return (name ?? '').trim();
}

/**
 * Собирает свежую соц-сводку (ещё не показанные события), резолвит имена и строит
 * локализованные строки. Возвращает пустую сводку, если нечего показать.
 *
 * @param lang   язык интерфейса для строк.
 * @param nowMs  текущее время (для тестируемости).
 */
export async function collectCompassSocialNews(
  lang: Lang,
  nowMs: number = Date.now(),
): Promise<CompassSocialNews> {
  const empty: CompassSocialNews = { lines: [], allLines: [], events: [] };
  if (!isSocialNewsEnabled()) return empty;

  const myUid = await getCanonicalUserId();
  if (!myUid) return empty;
  const db = getDb();
  if (!db) return empty;

  const [seen, knownFriends, requests, accepted, likes] = await Promise.all([
    loadSeenSignatures(),
    loadKnownFriendUids(db, myUid),
    collectFriendRequests(db, myUid, nowMs),
    collectNewlyAcceptedFriends(db, myUid, nowMs),
    collectLikesReceived(nowMs),
  ]);

  // Заявка от того, кто УЖЕ друг — мусор (приняли, но request не удалился): пропускаем.
  const freshRequests = requests.filter(ev => !knownFriends.has(ev.signature.slice('req:'.length)));

  // Отсев уже показанных и объединение.
  const all = [...freshRequests, ...accepted, ...likes].filter(ev => !seen.has(ev.signature));
  if (!all.length) return empty;

  // Свежее — сверху.
  all.sort((a, b) => b.ts - a.ts);

  // Резолвим имена для заявок и принятий (у лайков имя уже есть).
  const needName = all.filter(ev => ev.kind !== 'like');
  const uidOf = (ev: CompassSocialEvent): string =>
    ev.signature.startsWith('req:') ? ev.signature.slice('req:'.length)
    : ev.signature.startsWith('acc:') ? ev.signature.slice('acc:'.length)
    : '';
  const nameByUid = new Map<string, string>();
  await Promise.all(
    [...new Set(needName.map(uidOf).filter(Boolean))].map(async uid => {
      nameByUid.set(uid, await resolvePublicName(db, uid));
    }),
  );

  const withNames: CompassSocialEvent[] = all.map(ev => {
    if (ev.kind === 'like') return { ...ev, name: safeSocialName(ev.name, lang) };
    return { ...ev, name: safeSocialName(nameByUid.get(uidOf(ev)) ?? '', lang) };
  });

  const lines = buildSocialLines(withNames, lang);
  const allLines = withNames.map(ev => socialLineForKind(ev.kind, ev.name, lang));
  return { lines, allLines, events: withNames };
}

/** Строит строки для блока: до MAX_SOCIAL_LINES, остаток сворачивает в «и ещё N». */
function buildSocialLines(events: CompassSocialEvent[], lang: Lang): string[] {
  const head = events.slice(0, MAX_SOCIAL_LINES);
  const lines = head.map(ev => socialLineForKind(ev.kind, ev.name, lang));
  const extra = events.length - head.length;
  if (extra > 0 && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1]}${socialMoreSuffix(extra, lang)}`;
  }
  return lines;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
