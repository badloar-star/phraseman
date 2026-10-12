/**
 * DEV-подмена каталога YouTube («Видео»): `dev_state?videopacks=catalog|catalog_upcoming` (координатор 12.10: video-001/004/008/009/011).
 *
 * зачем: Сверка снимает вкладки канала («Главная», «Плейлисты»), экран плейлиста, премьеру «сейчас» и ролик с фразами по таймкодам, а для этого нужен каталог с
 * роликами, плейлистами и премьерой — у гостя на эмуляторе без сети его нет. Подменяется ЕДИНСТВЕННАЯ точка чтения каталога (читатель в youtube_catalog_client)
 * и чтение фраз ролика (video_phrases_client): в памяти процесса лежит готовый «снимок», проходящий настоящие парсеры контракта (shared/youtube_catalog_contract).
 * Firestore не вызывается, ничего не пишется (кроме обычного локального кэша экрана — версия «dev-demo» отличается от боевой). Превью — адреса i.ytimg.com несуществующих
 * роликов: без сети/с 404 картинки пустые, это нормально для кадра состояний.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттеры всегда null, установка отклоняется. Перезапуск приложения сбрасывает. Лог: [DEV-STATE] youtube.
 */
import type {
  YoutubeCatalogManifest,
  YoutubeChannelSnapshot,
  YoutubePlaylistSnapshot,
  YoutubeVideoSnapshot,
} from '../shared/youtube_catalog_contract';
import { videoPhraseId, type VideoPhrase } from '../shared/video_phrases_contract';
import { IS_STORE_RELEASE } from './config';

export type DevYoutubeDemoMode = 'catalog' | 'catalog_upcoming';

type CatalogReader = {
  get(path: string): Promise<unknown | null>;
  list(path: string): Promise<unknown[]>;
};

let current: DevYoutubeDemoMode | null = null;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Включить (`catalog` — премьера «сейчас», `catalog_upcoming` — «скоро») или снять (null). В стор-сборке — отказ с логом. */
export function setDevYoutubeDemo(mode: DevYoutubeDemoMode | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] youtube: отклонено — не dev-сборка', { mode }); // guard-ok: ранний выход логируется
    return false;
  }
  current = mode;
  console.log(`[DEV-STATE] youtube demo=${mode ?? 'off'} (каталог и фразы из памяти, Firestore не вызывается)`); // guard-ok: единичный лог на ссылку
  return true;
}

export const DEV_DEMO_CHANNEL_ID = 'dev_en';
const YOUTUBE_CHANNEL_ID = `UC${'DevDemoPhraseman'.padEnd(22, '0')}`; // UC + 22 символа — формат id канала YouTube
export const DEV_DEMO_VERSION = 'dev-demo-1';
export const DEV_DEMO_PLAYLIST_IDS = ['PLdevDemoEveryday01', 'PLdevDemoTravel0002'] as const;
export const DEV_DEMO_EVENT_VIDEO_ID = 'devDemoEvt1';

/** Ролики: [id, название, длительность с, число фраз, плейлисты]. */
const VIDEOS: ReadonlyArray<readonly [string, string, number, ReadonlyArray<string>]> = [
  ['devDemoVid0', 'Ordering coffee like a local', 252, [DEV_DEMO_PLAYLIST_IDS[0]]],
  ['devDemoVid1', 'A job interview in English', 458, [DEV_DEMO_PLAYLIST_IDS[0]]],
  ['devDemoVid2', 'At the airport: check-in and security', 305, [DEV_DEMO_PLAYLIST_IDS[1]]],
  ['devDemoVid3', 'First date small talk', 380, [DEV_DEMO_PLAYLIST_IDS[0], DEV_DEMO_PLAYLIST_IDS[1]]],
  ['devDemoVid4', 'Office talk: meetings and follow-ups', 421, [DEV_DEMO_PLAYLIST_IDS[0]]],
  ['devDemoVid5', 'Hotel: booking and complaints', 337, [DEV_DEMO_PLAYLIST_IDS[1]]],
];

const THUMB = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const WATCH = (id: string) => `https://www.youtube.com/watch?v=${id}`;

export type DevYoutubeDemoSnapshot = Readonly<{
  manifest: YoutubeCatalogManifest;
  channel: YoutubeChannelSnapshot;
  videos: readonly YoutubeVideoSnapshot[];
  playlists: readonly YoutubePlaylistSnapshot[];
}>;

/** Чистая сборка снимка: проходит настоящие парсеры контракта (тест). */
export function buildDevYoutubeDemo(mode: DevYoutubeDemoMode, nowMs: number): DevYoutubeDemoSnapshot {
  const iso = (ms: number) => new Date(ms).toISOString();
  const manifest: YoutubeCatalogManifest = {
    schemaVersion: 1,
    activeVersion: DEV_DEMO_VERSION,
    generatedAt: iso(nowMs),
    sourceRefreshedAt: iso(nowMs),
    defaultChannelId: DEV_DEMO_CHANNEL_ID,
    // зачем: один демо-канал на любой язык изучения — иначе при studyTarget≠en канал «не найден» и кадр пустой
    localeDefaults: { en: DEV_DEMO_CHANNEL_ID, es: DEV_DEMO_CHANNEL_ID, fr: DEV_DEMO_CHANNEL_ID, de: DEV_DEMO_CHANNEL_ID, it: DEV_DEMO_CHANNEL_ID, ru: DEV_DEMO_CHANNEL_ID, uk: DEV_DEMO_CHANNEL_ID },
    channels: [{ id: DEV_DEMO_CHANNEL_ID, displayName: 'Phraseman English', languageTags: ['en'], order: 0 }],
  };
  const event: YoutubeVideoSnapshot = {
    id: DEV_DEMO_EVENT_VIDEO_ID,
    channelId: DEV_DEMO_CHANNEL_ID,
    title: 'Live lesson: English phrases for travel',
    description: 'Premiere demo (dev).',
    thumbnailUrl: THUMB(DEV_DEMO_EVENT_VIDEO_ID),
    watchUrl: WATCH(DEV_DEMO_EVENT_VIDEO_ID),
    state: mode === 'catalog' ? 'live' : 'upcoming',
    ...(mode === 'catalog'
      ? { actualStartTime: iso(nowMs - 10 * 60_000) }
      : { scheduledStartTime: iso(nowMs + 90 * 60_000) }),
    playlistIds: [],
  };
  const regular: YoutubeVideoSnapshot[] = VIDEOS.map(([id, title, durationSec, playlistIds], index) => ({
    id,
    channelId: DEV_DEMO_CHANNEL_ID,
    title,
    description: 'Demo video (dev).',
    thumbnailUrl: THUMB(id),
    watchUrl: WATCH(id),
    publishedAt: iso(nowMs - (index + 1) * 3 * 86_400_000),
    viewCount: 12_000 - index * 1_300,
    durationSec,
    state: 'video',
    playlistIds: [...playlistIds],
  }));
  const videos = [event, ...regular];
  const playlistTitles = ['Everyday English', 'Travel English'];
  const playlists: YoutubePlaylistSnapshot[] = DEV_DEMO_PLAYLIST_IDS.map((id, index) => {
    const itemCount = regular.filter((video) => video.playlistIds.includes(id)).length;
    return {
      id,
      channelId: DEV_DEMO_CHANNEL_ID,
      title: playlistTitles[index],
      description: 'Demo playlist (dev).',
      thumbnailUrl: THUMB(regular.find((video) => video.playlistIds.includes(id))?.id ?? 'devDemoVid0'),
      url: `https://www.youtube.com/playlist?list=${id}`,
      itemCount,
      order: index,
      pageCount: Math.ceil(itemCount / 50),
    };
  });
  const channel: YoutubeChannelSnapshot = {
    id: DEV_DEMO_CHANNEL_ID,
    youtubeChannelId: YOUTUBE_CHANNEL_ID,
    displayName: 'Phraseman English',
    handle: 'phraseman_demo',
    url: 'https://www.youtube.com/@phraseman_demo',
    languageTags: ['en'],
    order: 0,
    activeEventVideoId: DEV_DEMO_EVENT_VIDEO_ID,
    recentVideoIds: videos.map((video) => video.id),
    playlistIds: [...DEV_DEMO_PLAYLIST_IDS],
  };
  return { manifest, channel, videos, playlists };
}

/** Читатель каталога в памяти: те же пути, что у Firestore-читателя (корень → манифест, канал, ролики, плейлисты). */
export function createDevYoutubeReader(mode: DevYoutubeDemoMode, nowMs: number = Date.now()): CatalogReader {
  const snapshot = buildDevYoutubeDemo(mode, nowMs);
  const root = `youtube_catalog_snapshots/${DEV_DEMO_VERSION}`;
  const channelPath = `${root}/channels/${DEV_DEMO_CHANNEL_ID}`;
  const docs = new Map<string, unknown>([
    ['youtube_catalog/public', snapshot.manifest],
    [root, { status: 'ready', manifest: snapshot.manifest }],
    [channelPath, snapshot.channel],
    ...snapshot.videos.map((video) => [`${channelPath}/videos/${video.id}`, video] as const),
    ...snapshot.playlists.map((playlist) => [`${channelPath}/playlists/${playlist.id}`, playlist] as const),
  ]);
  return {
    get: async (path) => docs.get(path) ?? null,
    list: async (path) => {
      if (path === `${channelPath}/videos`) return snapshot.videos.map((video) => ({ ...video }));
      if (path === `${channelPath}/playlists`) return snapshot.playlists.map((playlist) => ({ ...playlist }));
      return [];
    },
  };
}

/** Читатель подмены или null (подмена выключена / стор-сборка). */
export function getDevYoutubeCatalogReader(): CatalogReader | null {
  if (!devAvailable() || !current) return null;
  return createDevYoutubeReader(current);
}

const PHRASES: ReadonlyArray<ReadonlyArray<readonly [string, string, string]>> = [
  [
    ['Can I get a cappuccino, please?', 'Можно капучино, пожалуйста?', 'Вежливая просьба в кафе: Can I get… вместо I want…'],
    ['What size would you like?', 'Какой размер вы хотите?', 'Вопрос бариста про размер напитка.'],
    ['Do you have oat milk?', 'У вас есть овсяное молоко?', 'Уточняем, какое молоко доступно.'],
    ['For here or to go?', 'Здесь или с собой?', 'Стандартный вопрос: выпить на месте или взять с собой.'],
    ['How much is that?', 'Сколько это стоит?', 'Короткий вопрос про цену.'],
  ],
  [
    ['Tell me about yourself.', 'Расскажите о себе.', 'Классический первый вопрос на собеседовании.'],
    ['I have five years of experience.', 'У меня пять лет опыта.', 'Опыт называем через have + число + years of experience.'],
    ['What are your strengths?', 'Каковы ваши сильные стороны?', 'Вопрос про сильные качества.'],
    ['I am a quick learner.', 'Я быстро учусь.', 'Типичная самохарактеристика.'],
    ['When can you start?', 'Когда вы можете начать?', 'Вопрос про дату выхода на работу.'],
  ],
];

const FALLBACK_PHRASES: ReadonlyArray<readonly [string, string, string]> = [
  ['Nice to meet you.', 'Приятно познакомиться.', 'Стандартное приветствие при знакомстве.'],
  ['Could you say that again?', 'Не могли бы вы повторить?', 'Вежливая просьба повторить.'],
  ['I would like a table for two.', 'Я хотел бы столик на двоих.', 'Бронь в ресторане.'],
  ['Where is the nearest station?', 'Где ближайшая станция?', 'Спрашиваем дорогу.'],
];

/** Фразы демо-ролика с таймкодами (для строки «Смотрю ролик — фразы по таймкодам»); null — не демо-ролик или подмена выключена. */
export function getDevVideoPhrases(videoId: string): readonly VideoPhrase[] | null {
  if (!devAvailable() || !current) return null;
  const index = VIDEOS.findIndex(([id]) => id === videoId);
  if (index < 0 && videoId !== DEV_DEMO_EVENT_VIDEO_ID) return null;
  const rows = PHRASES[index] ?? FALLBACK_PHRASES;
  return rows.map(([phrase, translation, explanation], i) => ({
    id: videoPhraseId(videoId, i + 1),
    ordinal: i + 1,
    phrase,
    translation,
    explanation,
    startSec: 12 + i * 31.5,
  }));
}

export function resetDevYoutubeDemoForTests(): void {
  current = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
