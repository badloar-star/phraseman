/**
 * Признак официального набора (наборы роликов Professor Lingman).
 *
 * зачем (владелец, OWNER_REQUESTS_LEDGER строка 4; координатор 14:10 «не угадывай»): у официальных наборов в каталоге
 * писалось «Автор сообщества». Признак взят из данных, а не придуман: набор ролика пишет ТОЛЬКО сервер
 * (`buildVideoPackDoc`, functions/src/video_phrases.ts) с `authorStableId: "video:<videoId>"` и полем `videoId`;
 * правила Firestore запрещают создавать `community_packs` с клиента (`allow create, delete: if false`).
 * Поэтому признак строгий: префикс И совпадение хвоста с `videoId` формата YouTube. По нику официальность
 * не определяем никогда — ник может выбрать любой человек.
 */
export const OFFICIAL_VIDEO_PACK_AUTHOR_PREFIX = 'video:';
/** Имя автора официальных наборов — как у канала и на заставке («by Professor Lingman»). */
export const OFFICIAL_PACK_AUTHOR_NAME = 'Professor Lingman';

const YOUTUBE_VIDEO_ID = /^[0-9A-Za-z_-]{11}$/;

export function officialVideoPackAuthorId(videoId: string): string {
  return `${OFFICIAL_VIDEO_PACK_AUTHOR_PREFIX}${videoId}`;
}

export function isOfficialVideoPack(pack: Readonly<{ authorStableId?: unknown; videoId?: unknown }>): boolean {
  const author = String(pack.authorStableId ?? '').trim();
  const videoId = String(pack.videoId ?? '').trim();
  if (!YOUTUBE_VIDEO_ID.test(videoId)) return false;
  return author === officialVideoPackAuthorId(videoId);
}
