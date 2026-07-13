import AsyncStorage from '@react-native-async-storage/async-storage';
import { XMLParser } from 'fast-xml-parser';
import {
  getYoutubeChannelHandleOverride,
  getYoutubeChannelIdOverride,
  getYoutubeChannelNameOverride,
  getYoutubeChannelUrlOverride,
  getYoutubePinnedVideosRaw,
} from './remote_flags';

export type LingmanYoutubeVideo = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  updatedAt: string;
  watchUrl: string;
  viewCount?: number;
};

export type LingmanYoutubeSnapshot = {
  videos: LingmanYoutubeVideo[];
  latestVideoId: string | null;
  unreadCount: number;
  fetchedAtMs: number;
  error?: string;
};

// ── Канал по умолчанию (PHRASEMAN). Используется, пока «Пульт» не задал свой ──
// channelId. Экспортируется под историческими именами LINGMAN_CHANNEL_* для
// обратной совместимости импортов; реальный «текущий» канал берётся через
// getActiveYoutubeChannel() ниже (учитывает remote_config override).
export const LINGMAN_CHANNEL_ID = 'UCNNVZbMkh4jrW6uluaaJTwA';
export const LINGMAN_CHANNEL_DISPLAY_NAME = 'PHRASEMAN';
export const LINGMAN_CHANNEL_HANDLE = '@PhrasemanENGLISH';
export const LINGMAN_CHANNEL_URL = 'https://www.youtube.com/@PhrasemanENGLISH/videos';
const LINGMAN_FEED_TIMEOUT_MS = 10000;
export const LINGMAN_YOUTUBE_EMBED_BASE_URL = 'https://app.phraseman/';

/** Описание активного канала (дефолт PHRASEMAN или override из «Пульта»). */
export type ActiveYoutubeChannel = {
  /** YouTube channelId (UC…) — по нему строится RSS-фид. */
  channelId: string;
  /** Отображаемое имя в шапке/кнопке. */
  displayName: string;
  /** @handle (всегда с ведущим @). */
  handle: string;
  /** Прямая ссылка на канал (videos). */
  url: string;
  /** true, если канал переопределён из «Пульта» (а не дефолт). */
  isOverride: boolean;
};

/**
 * Извлекает валидный YouTube channelId (UC + 22 символа base64url) из любого
 * ввода админа: голый id, ссылка на /channel/UC…, или строка, где он встречается.
 * Возвращает '' если канал-id не найден (тогда канал остаётся дефолтным).
 * Чистая функция — экспортируется для тестов и переиспользуется в админке.
 */
export function parseYoutubeChannelId(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const match = s.match(/UC[0-9A-Za-z_-]{22}/);
  return match ? match[0] : '';
}

/**
 * Нормализует @handle из ввода админа (ссылка /@name, "@name" или "name").
 * Возвращает '' если ничего вменяемого не нашлось. Без ведущего @.
 */
export function parseYoutubeHandle(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  // Ссылка вида youtube.com/@handle(/videos|/...) — берём сегмент после @.
  const fromUrl = s.match(/youtube\.com\/@([0-9A-Za-z._-]+)/i);
  if (fromUrl) return fromUrl[1];
  // Голый "@handle" или "handle" (без пробелов и слешей).
  const bare = s.replace(/^@/, '');
  if (/^[0-9A-Za-z._-]+$/.test(bare)) return bare;
  return '';
}

/**
 * Активный канал с учётом remote_config override. channelId-override обязателен
 * для смены канала: без него (пусто/мусор) возвращается дефолтный PHRASEMAN, а
 * остальные override-поля игнорируются (чтобы не показать чужое имя на дефолтном
 * канале). handle/name/url пустые → выводятся из id/дефолта. Чистого Firestore
 * здесь нет — значения уже разрешены слоем remote_flags.
 */
export function getActiveYoutubeChannel(): ActiveYoutubeChannel {
  const overrideId = parseYoutubeChannelId(getYoutubeChannelIdOverride());
  if (!overrideId) {
    return {
      channelId: LINGMAN_CHANNEL_ID,
      displayName: LINGMAN_CHANNEL_DISPLAY_NAME,
      handle: LINGMAN_CHANNEL_HANDLE,
      url: LINGMAN_CHANNEL_URL,
      isOverride: false,
    };
  }
  const handleRaw = parseYoutubeHandle(getYoutubeChannelHandleOverride());
  const handle = handleRaw ? `@${handleRaw}` : '';
  const name = String(getYoutubeChannelNameOverride() ?? '').trim();
  // url: доверенная ссылка из «Пульта» (https + youtube.com), иначе из handle.
  const urlOverride = getTrustedLingmanYoutubeUrl(String(getYoutubeChannelUrlOverride() ?? '').trim() || null);
  const url = urlOverride
    || (handleRaw ? `https://www.youtube.com/@${handleRaw}/videos` : `https://www.youtube.com/channel/${overrideId}/videos`);
  return {
    channelId: overrideId,
    displayName: name || LINGMAN_CHANNEL_DISPLAY_NAME,
    handle: handle || `@${LINGMAN_CHANNEL_DISPLAY_NAME.toLowerCase()}`,
    url,
    isOverride: true,
  };
}

/** RSS-фид активного канала. */
function getActiveFeedUrl(): string {
  const { channelId } = getActiveYoutubeChannel();
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
}
const STORAGE_LAST_SEEN_ID = 'lingman_youtube_last_seen_video_id_v2';
const STORAGE_LAST_OPENED_AT = 'lingman_youtube_last_opened_at_ms_v2';
const STORAGE_LAST_SUCCESSFUL_SNAPSHOT = 'lingman_youtube_last_successful_snapshot_v2';
const KNOWN_SHORT_VIDEO_IDS = new Set(['xdISurogEds', 'KHn07unaGHU']);
const SHORTS_MARKER_RE = /(?:^|\s)#shorts?\b/i;

const LEGACY_PROFESSOR_LINGMAN_FALLBACK_VIDEOS: LingmanYoutubeVideo[] = [
  {
    id: 'X7L3Xg3qITo',
    title: '200 фраз, после которых проще начать отвечать на английском',
    description: '200 базовых английских фраз A1 для тренировки на слух, повторения вслух и первого разговорного слоя.',
    thumbnailUrl: 'https://i.ytimg.com/vi/X7L3Xg3qITo/hqdefault.jpg',
    publishedAt: '2026-05-31T13:21:06+00:00',
    updatedAt: '2026-05-31T14:37:55+00:00',
    watchUrl: getLingmanYoutubeWatchUrl('X7L3Xg3qITo'),
  },
  {
    id: 'FF4zI8l2JmE',
    title: 'Английский не держится в голове? Попробуй метод цепочек',
    description: 'Практика метода цепочек: не отдельные слова, а короткие связки, которые легче всплывают в разговоре.',
    thumbnailUrl: 'https://i.ytimg.com/vi/FF4zI8l2JmE/hqdefault.jpg',
    publishedAt: '2026-05-30T16:43:06+00:00',
    updatedAt: '2026-05-30T19:57:21+00:00',
    watchUrl: getLingmanYoutubeWatchUrl('FF4zI8l2JmE'),
  },
  {
    id: 'uszm81bTNUs',
    title: 'ПОЧЕМУ ЭТО НЕ ОБЪЯСНЯЮТ В НАЧАЛЕ АНГЛИЙСКОГО?',
    description: 'TO BE без тяжелых таблиц: зачем нужны am, is, are и почему английская фраза ломается без связки.',
    thumbnailUrl: 'https://i.ytimg.com/vi/uszm81bTNUs/hqdefault.jpg',
    publishedAt: '2026-05-28T16:48:11+00:00',
    updatedAt: '2026-05-30T02:55:30+00:00',
    watchUrl: getLingmanYoutubeWatchUrl('uszm81bTNUs'),
  },
];

const PHRASEMAN_ENGLISH_FALLBACK_VIDEOS: LingmanYoutubeVideo[] = [
  {
    id: '5HRccrAtA00',
    title: 'Не верь красивым словам: эти фразы спасают реальный разговор',
    description: 'Phraseman для практики живых английских фраз и разговорного слоя.',
    thumbnailUrl: 'https://i.ytimg.com/vi/5HRccrAtA00/hqdefault.jpg',
    publishedAt: '2026-06-19T14:05:20+00:00',
    updatedAt: '2026-06-19T14:12:17+00:00',
    watchUrl: getLingmanYoutubeWatchUrl('5HRccrAtA00'),
  },
  {
    id: 'xdISurogEds',
    title: 'Убийца Duolingo по ссылке в описании профиля. Попробуй не выучить английский с приложением PHRASEMAN',
    description: 'Короткое видео с канала PHRASEMAN про приложение для английского.',
    thumbnailUrl: 'https://i.ytimg.com/vi/xdISurogEds/hqdefault.jpg',
    publishedAt: '2026-06-19T13:31:12+00:00',
    updatedAt: '2026-06-19T13:48:03+00:00',
    watchUrl: getLingmanYoutubeWatchUrl('xdISurogEds'),
  },
  {
    id: 'syNj0G3sq-4',
    title: 'Лёгкий английский на фоне: 200 простых фраз с переводом',
    description: 'Фоновая тренировка простых английских фраз с переводом.',
    thumbnailUrl: 'https://i.ytimg.com/vi/syNj0G3sq-4/hqdefault.jpg',
    publishedAt: '2026-06-19T08:33:00+00:00',
    updatedAt: '2026-06-19T08:34:11+00:00',
    watchUrl: getLingmanYoutubeWatchUrl('syNj0G3sq-4'),
  },
  {
    id: 'eXCZoiJRCX4',
    title: 'Метод цепной ассоциации: Говорим по-английски на автомате!',
    description: 'Длинный урок PHRASEMAN про метод цепной ассоциации.',
    thumbnailUrl: 'https://i.ytimg.com/vi/eXCZoiJRCX4/hqdefault.jpg',
    publishedAt: '2026-06-14T08:00:42+00:00',
    updatedAt: '2026-06-18T21:06:45+00:00',
    watchUrl: getLingmanYoutubeWatchUrl('eXCZoiJRCX4'),
  },
];

const FALLBACK_VIDEOS = (PHRASEMAN_ENGLISH_FALLBACK_VIDEOS.length
  ? PHRASEMAN_ENGLISH_FALLBACK_VIDEOS
  : LEGACY_PROFESSOR_LINGMAN_FALLBACK_VIDEOS).filter(isLingmanLongFormVideo);

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && '#text' in value) {
    return textValue((value as { '#text'?: unknown })['#text']);
  }
  return '';
}

function attrValue(value: unknown, attr: string): string {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return textValue(record[`@_${attr}`] ?? record[attr]);
}

function parseViewCount(entry: Record<string, unknown>): number | undefined {
  const group = entry['media:group'] as Record<string, unknown> | undefined;
  const community = group?.['media:community'] as Record<string, unknown> | undefined;
  const stats = community?.['media:statistics'];
  const raw = attrValue(stats, 'views');
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseEntry(entry: Record<string, unknown>): LingmanYoutubeVideo | null {
  const group = entry['media:group'] as Record<string, unknown> | undefined;
  const id = textValue(entry['yt:videoId']);
  if (!id) return null;

  const thumbnail = group?.['media:thumbnail'];
  const publishedAt = textValue(entry.published);
  const updatedAt = textValue(entry.updated);
  return {
    id,
    title: textValue(entry.title) || textValue(group?.['media:title']) || LINGMAN_CHANNEL_DISPLAY_NAME,
    description: textValue(group?.['media:description']),
    thumbnailUrl: attrValue(thumbnail, 'url') || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    publishedAt,
    updatedAt,
    watchUrl: getLingmanYoutubeWatchUrl(id),
    viewCount: parseViewCount(entry),
  };
}

export function isLingmanLongFormVideo(video: Pick<LingmanYoutubeVideo, 'id' | 'title' | 'description'>): boolean {
  if (KNOWN_SHORT_VIDEO_IDS.has(video.id)) return false;
  return !SHORTS_MARKER_RE.test(`${video.title}\n${video.description}`);
}

export function getLingmanYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId.trim())}`;
}

/** Один пришпиленный («ручной») видео-элемент из «Пульта». */
export type PinnedVideoInput = {
  /** YouTube videoId (11 символов) — обязателен. */
  id: string;
  /** Необязательное название карточки (пусто → имя канала-заглушка). */
  title?: string;
  /** Необязательное описание. */
  description?: string;
  /** Необязательная ISO-дата публикации (для подписи; пусто → не показывается). */
  publishedAt?: string;
};

const YOUTUBE_VIDEO_ID_RE = /^[0-9A-Za-z_-]{11}$/;

/**
 * Извлекает 11-символьный YouTube videoId из любого ввода: голый id, ссылка
 * watch?v=, youtu.be/, /shorts/, /embed/, /live/ — с любыми лишними параметрами.
 * Возвращает '' если id не распознан. Чистая функция — экспортируется для тестов
 * и переиспользуется в админке (держать regexp'ы в синхроне).
 */
export function parseYoutubeVideoId(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  // Голый videoId.
  if (YOUTUBE_VIDEO_ID_RE.test(s)) return s;
  // ?v=ID или &v=ID (watch-ссылки).
  const v = s.match(/[?&]v=([0-9A-Za-z_-]{11})/);
  if (v) return v[1];
  // youtu.be/ID, /shorts/ID, /embed/ID, /live/ID.
  const path = s.match(/(?:youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([0-9A-Za-z_-]{11})/);
  if (path) return path[1];
  return '';
}

/**
 * Парсит сырой JSON пришпиленных видео из «Пульта» в нормализованный список.
 * Принимает массив вида [{id|url, title?, ...}, ...] или массив строк (id/url).
 * Любой мусор тихо отбрасывается (конфиг от админа не должен ронять приложение).
 * Дубли по videoId схлопываются (первое вхождение побеждает). Чистая функция.
 */
export function parsePinnedVideos(raw: string | null | undefined): PinnedVideoInput[] {
  const out: PinnedVideoInput[] = [];
  const seen = new Set<string>();
  const s = String(raw ?? '').trim();
  if (!s) return out;
  let arr: unknown;
  try {
    arr = JSON.parse(s);
  } catch {
    return out;
  }
  if (!Array.isArray(arr)) return out;
  for (const item of arr) {
    let id = '';
    let title: string | undefined;
    let description: string | undefined;
    let publishedAt: string | undefined;
    if (typeof item === 'string') {
      id = parseYoutubeVideoId(item);
    } else if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>;
      id = parseYoutubeVideoId(typeof rec.id === 'string' ? rec.id : '')
        || parseYoutubeVideoId(typeof rec.url === 'string' ? rec.url : '');
      if (typeof rec.title === 'string' && rec.title.trim()) title = rec.title.trim();
      if (typeof rec.description === 'string' && rec.description.trim()) description = rec.description.trim();
      if (typeof rec.publishedAt === 'string' && rec.publishedAt.trim()) publishedAt = rec.publishedAt.trim();
    }
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title, description, publishedAt });
  }
  return out;
}

/** Превращает один пин в карточку ленты (обложка/watch-url строятся из id). */
function pinnedToVideo(pin: PinnedVideoInput): LingmanYoutubeVideo {
  return {
    id: pin.id,
    title: pin.title || LINGMAN_CHANNEL_DISPLAY_NAME,
    description: pin.description || '',
    thumbnailUrl: `https://i.ytimg.com/vi/${pin.id}/hqdefault.jpg`,
    publishedAt: pin.publishedAt || '',
    updatedAt: pin.publishedAt || '',
    watchUrl: getLingmanYoutubeWatchUrl(pin.id),
  };
}

/**
 * Список пришпиленных видео как карточки ленты. Берёт сырой JSON из remote_config.
 * Применяется фильтр «не Shorts» как и к фиду (по title/description/known ids),
 * но id-only пин почти всегда проходит. Экспортируется для тестов.
 */
export function getPinnedFeedVideos(): LingmanYoutubeVideo[] {
  return parsePinnedVideos(getYoutubePinnedVideosRaw())
    .map(pinnedToVideo)
    .filter(isLingmanLongFormVideo);
}

/**
 * Сливает пиннов В НАЧАЛО ленты (как «новые»), убирая из канального списка дубли
 * по videoId (если пин уже есть в фиде — он остаётся только сверху, один раз).
 * Чистая функция — экспортируется для тестов.
 */
export function mergePinnedVideos(
  pinned: LingmanYoutubeVideo[],
  feed: LingmanYoutubeVideo[],
): LingmanYoutubeVideo[] {
  if (!pinned.length) return feed;
  const pinnedIds = new Set(pinned.map((v) => v.id));
  return [...pinned, ...feed.filter((v) => !pinnedIds.has(v.id))];
}

export function getTrustedLingmanYoutubeUrl(rawUrl: string | null | undefined, fallbackVideoId?: string | null): string | null {
  try {
    if (!rawUrl) throw new Error('Missing URL');
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const isTrustedHost = host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com' || host === 'youtu.be';
    if (url.protocol !== 'https:' || !isTrustedHost) throw new Error('Untrusted YouTube URL');
    return url.toString();
  } catch {
    return fallbackVideoId ? getLingmanYoutubeWatchUrl(fallbackVideoId) : null;
  }
}

export function parseLingmanYoutubeFeed(xml: string): LingmanYoutubeVideo[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  });
  const parsed = parser.parse(xml) as { feed?: { entry?: unknown } };
  return asArray(parsed.feed?.entry)
    .map((entry) => (entry && typeof entry === 'object' ? parseEntry(entry as Record<string, unknown>) : null))
    .filter((video): video is LingmanYoutubeVideo => Boolean(video))
    .filter(isLingmanLongFormVideo);
}

export function getLingmanYoutubeUnreadCount(videos: Pick<LingmanYoutubeVideo, 'id'>[], lastSeenId: string | null): number {
  if (!videos.length) return 0;
  if (!lastSeenId) return 1;
  const index = videos.findIndex((video) => video.id === lastSeenId);
  if (index < 0) return 1;
  return Math.max(0, index);
}

async function readCachedVideos(): Promise<LingmanYoutubeVideo[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_LAST_SUCCESSFUL_SNAPSHOT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { videos?: LingmanYoutubeVideo[]; channelId?: string };
    // Кэш привязан к channelId: если «Пульт» переключил канал, старый список не
    // показываем (иначе под новым именем висели бы видео прошлого канала).
    const activeChannelId = getActiveYoutubeChannel().channelId;
    if (parsed.channelId && parsed.channelId !== activeChannelId) return null;
    const videos = Array.isArray(parsed.videos) ? parsed.videos.filter(isLingmanLongFormVideo) : [];
    return videos.length ? videos : null;
  } catch {
    return null;
  }
}

async function cacheSuccessfulVideos(videos: LingmanYoutubeVideo[]): Promise<void> {
  try {
    const channelId = getActiveYoutubeChannel().channelId;
    await AsyncStorage.setItem(STORAGE_LAST_SUCCESSFUL_SNAPSHOT, JSON.stringify({ videos, channelId, fetchedAtMs: Date.now() }));
  } catch {
    // Cache is best-effort; the fallback list still keeps the catalog usable.
  }
}

export async function fetchLingmanYoutubeVideos(): Promise<LingmanYoutubeVideo[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LINGMAN_FEED_TIMEOUT_MS);
  try {
    const response = await fetch(getActiveFeedUrl(), {
      headers: {
        Accept: 'application/atom+xml, application/xml, text/xml',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`YouTube feed failed: ${response.status}`);
    }
    const xml = await response.text();
    const videos = parseLingmanYoutubeFeed(xml);
    if (!videos.length) {
      throw new Error('YouTube feed returned no videos');
    }
    return videos;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLingmanYoutubeSnapshot(): Promise<LingmanYoutubeSnapshot> {
  const [lastSeenId] = await Promise.all([
    AsyncStorage.getItem(STORAGE_LAST_SEEN_ID),
  ]);

  // Пришпиленные («ручные») видео из «Пульта» — идут В НАЧАЛЕ ленты как «новые»,
  // поверх канального фида (и канального кэша/фолбэка). Кэшируем ТОЛЬКО чистый
  // канальный список, а пины подмешиваем при отдаче — так смена пиннов мгновенна
  // и не «застревает» в кэше канала.
  const pinned = getPinnedFeedVideos();

  try {
    const feed = await fetchLingmanYoutubeVideos();
    void cacheSuccessfulVideos(feed);
    const videos = mergePinnedVideos(pinned, feed);
    const latestVideoId = videos[0]?.id ?? null;
    return {
      videos,
      latestVideoId,
      unreadCount: getLingmanYoutubeUnreadCount(videos, lastSeenId),
      fetchedAtMs: Date.now(),
    };
  } catch (error) {
    // Встроенный fallback-список — это видео PHRASEMAN. Показываем его только когда
    // активен дефолтный канал; для переключённого из «Пульта» канала чужой список
    // был бы неверным — тогда отдаём только channel-matched кэш (или пусто).
    const isDefaultChannel = !getActiveYoutubeChannel().isOverride;
    const feed = (await readCachedVideos()) ?? (isDefaultChannel ? FALLBACK_VIDEOS : []);
    const videos = mergePinnedVideos(pinned, feed);
    const latestVideoId = videos[0]?.id ?? null;
    return {
      videos,
      latestVideoId,
      // Если фид упал, но есть пины — это не «ошибка пустой ленты»: пины показываем
      // без баннера сбоя (он бы зря пугал, когда контент в ленте есть из пиннов).
      unreadCount: getLingmanYoutubeUnreadCount(videos, lastSeenId),
      fetchedAtMs: Date.now(),
      error: feed.length === 0 && pinned.length > 0
        ? undefined
        : (error instanceof Error ? error.message : 'Unable to load videos'),
    };
  }
}

export async function markLingmanYoutubeCatalogSeen(latestVideoId: string | null): Promise<void> {
  const entries: [string, string][] = [[STORAGE_LAST_OPENED_AT, String(Date.now())]];
  if (latestVideoId) entries.push([STORAGE_LAST_SEEN_ID, latestVideoId]);
  await AsyncStorage.multiSet(entries);
}

export function buildLingmanEmbedHtml(videoId: string): string {
  const safeVideoId = parseYoutubeVideoId(videoId);
  if (!safeVideoId) {
    throw new Error('Invalid YouTube video ID');
  }
  const baseOrigin = LINGMAN_YOUTUBE_EMBED_BASE_URL.replace(/\/$/, '');
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
      #player, iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <script src="https://www.youtube.com/iframe_api"></script>
    <script>
      (function() {
        var player = null;
        var pollTimer = null;
        var analyticsActive = true;
        var stateNames = {
          0: 'ended',
          1: 'playing',
          2: 'paused',
          3: 'buffering'
        };

        function postMessage(message) {
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(JSON.stringify(message));
          }
        }

        function toBoundedMs(seconds) {
          var numericSeconds = Number(seconds);
          if (!Number.isFinite(numericSeconds) || numericSeconds <= 0) return 0;
          return Math.min(86400000, Math.round(numericSeconds * 1000));
        }

        function emitState(state) {
          var positionMs = 0;
          var durationMs = 0;
          try { positionMs = toBoundedMs(player.getCurrentTime()); } catch (_) {}
          try { durationMs = toBoundedMs(player.getDuration()); } catch (_) {}
          postMessage({
            version: 1,
            type: 'state',
            state: state,
            positionMs: positionMs,
            durationMs: durationMs
          });
        }

        function stopPolling() {
          if (pollTimer === null) return;
          clearInterval(pollTimer);
          pollTimer = null;
        }

        function isPlaying() {
          try {
            return player !== null && player.getPlayerState() === 1;
          } catch (_) {
            return false;
          }
        }

        function emitCurrentState() {
          if (!analyticsActive || document.visibilityState !== 'visible' || !isPlaying()) {
            stopPolling();
            return;
          }
          emitState('playing');
        }

        function startPolling() {
          if (pollTimer !== null) return;
          if (!analyticsActive || document.visibilityState !== 'visible' || !isPlaying()) return;
          pollTimer = setInterval(emitCurrentState, 1000);
        }

        function onReady() {
          postMessage({ version: 1, type: 'ready' });
        }

        function onStateChange(event) {
          var state = stateNames[event.data];
          if (!state) {
            stopPolling();
            return;
          }
          if (state === 'playing') {
            emitState(state);
            startPolling();
            return;
          }
          stopPolling();
          emitState(state);
        }

        function onError(event) {
          stopPolling();
          var rawCode = Number(event && event.data);
          var officialCodes = [2, 5, 100, 101, 150];
          var errorCode = officialCodes.indexOf(rawCode) >= 0 ? rawCode : 5;
          postMessage({ version: 1, type: 'error', code: errorCode });
        }

        window.__phrasemanSetAnalyticsActive = function(active) {
          analyticsActive = active === true;
          if (!analyticsActive) {
            stopPolling();
            return true;
          }
          startPolling();
          return true;
        };

        document.addEventListener('visibilitychange', function() {
          if (document.visibilityState !== 'visible') {
            stopPolling();
            return;
          }
          startPolling();
        });
        window.addEventListener('pagehide', stopPolling);
        window.addEventListener('beforeunload', stopPolling);

        window.onYouTubeIframeAPIReady = function() {
          player = new YT.Player('player', {
            videoId: '${safeVideoId}',
            playerVars: {
              playsinline: 1,
              rel: 0,
              controls: 1,
              fs: 1,
              origin: '${baseOrigin}',
              widget_referrer: '${LINGMAN_YOUTUBE_EMBED_BASE_URL}'
            },
            events: { onReady: onReady, onStateChange: onStateChange, onError: onError }
          });
        };
      })();
    </script>
  </body>
</html>`;
}

export function formatLingmanVideoDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
