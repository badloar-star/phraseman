// зачем (координатор 18.10 08:22, Firebase-экономия владельца): вкладка «Друзья» — профили в кэше 30 мин (было 5), мои лайки
// (2 запроса до 500 документов) — только при открытой вкладке и не чаще раза в 30 мин, не на холодном старте. Сердца после повторного
// открытия не «откатываются»: успешный лайк/снятие правит кэш. Журнал [COST-CUT].
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Друзья: экономия чтений', () => {
  const likes = read('app/friend_activity_likes.ts');
  const tab = read('app/(tabs)/friends.tsx');
  const batch = read('app/friends_profiles_batch.ts');

  it('профили: по умолчанию 30 мин для записи с профилем, пустая запись после сбоя — 5 мин, hit/miss в журнале', () => {
    expect(batch).toContain('const ttl = hit?.profile ? Math.max(BATCH_CACHE_TTL_MS, Math.min(options.maxAgeMs ?? FRIENDS_BATCH_LONG_TTL_MS, BATCH_CACHE_KEEP_MS)) : BATCH_CACHE_TTL_MS;');
    expect(batch).toContain('maxAgeMs: number = FRIENDS_BATCH_LONG_TTL_MS');
    expect(batch).toContain('[COST-CUT] friends profiles hit=');
  });

  it('лайки: только при открытой вкладке и через кэш', () => {
    expect(tab).toMatch(/if \(!hasFriends \|\| !friendsRuntimeActive\) return;[\s\S]{0,200}void fetchActivityLikeStatesCached\(\)/);
    expect(tab).toContain('}, [friendsRuntimeActive, hasFriends]);');
    expect(tab).not.toMatch(/void fetchActivityLikeStates\(\)/);
  });

  it('кэш лайков: 30 мин, по владельцу (после смены аккаунта чужие лайки не отдаются), журнал hit/miss', () => {
    expect(likes).toContain('export const ACTIVITY_LIKE_STATES_CACHE_TTL_MS = 30 * 60 * 1000;');
    expect(likes).toContain('likeStatesCache.ownerUid === ownerUid && now - likeStatesCache.at < ACTIVITY_LIKE_STATES_CACHE_TTL_MS');
    expect(likes).toContain('[COST-CUT] friends likes hit');
    expect(likes).toContain('[COST-CUT] friends likes miss');
  });

  it('Optimistic UI не ломается: успешный лайк и снятие правят кэш', () => {
    const send = likes.slice(likes.indexOf('export async function sendFriendActivityLike('), likes.indexOf('export async function removeFriendActivityLike('));
    const remove = likes.slice(likes.indexOf('export async function removeFriendActivityLike('), likes.indexOf('export async function fetchActivityLikesReceived('));
    expect(send).toMatch(/patchActivityLikeStatesCache\(data\.targetUid, [^)]*, true\);\s*return res\.data;/);
    expect(remove).toMatch(/patchActivityLikeStatesCache\(data\.targetUid, [^)]*, false\);\s*return res\.data;/);
  });
});
