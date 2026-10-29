import { contestMonth, type ContestEntry } from '../../shared/community_month_contest';
import type { PackSocialSnapshot } from './packSocial';

/** One in-memory snapshot for every mounted surface and subsequent reopening. */
export function createPackSocialLiveStore() {
  let version = 0;
  const values = new Map<string, PackSocialSnapshot>();
  const pending = new Set<string>();
  const monthlyBefore = new Map<string, { monthId: string; entry?: ContestEntry; liked: boolean }>();
  let monthId = '';
  const monthly = new Map<string, ContestEntry>();
  const likeVersions = new Map<string, number>();
  const intents = new Map<string, boolean>();
  const listeners = new Set<() => void>();
  return {
    beginLike(id: string): boolean { if (pending.has(id)) return false; pending.add(id); monthlyBefore.set(id, { monthId, entry: monthly.get(id), liked: values.get(id)?.liked ?? false }); return true; },
    endLike(id: string): void { pending.delete(id); monthlyBefore.delete(id); },
    contestEntries(month: string): ContestEntry[] { return month === monthId ? [...monthly.values()] : []; },
    setContestEntries(month: string, entries: readonly ContestEntry[], startedVersion = Infinity): void {
      if (month !== monthId) monthly.clear();
      monthId = month;
      for (const entry of entries) {
        // An in-flight local operation owns its row until confirmation or rollback.
        if ((likeVersions.get(entry.id) ?? 0) > startedVersion && monthly.has(entry.id)) continue;
        if (!pending.has(entry.id) || !monthly.has(entry.id)) monthly.set(entry.id, entry);
      }
      const receivedIds = new Set(entries.map(entry => entry.id));
      for (const id of monthly.keys()) {
        // Omission is also a server update: it must obey the same local-write
        // protection as a returned row, including after the request completes.
        if (receivedIds.has(id) || pending.has(id) || (likeVersions.get(id) ?? 0) > startedVersion) continue;
        monthly.delete(id);
      }
      version += 1; listeners.forEach(notify => notify());
    },
    getVersion: () => version,
    peek: (id: string) => values.get(id),
    get(id: string, initial: PackSocialSnapshot): PackSocialSnapshot {
      if (!values.has(id)) values.set(id, initial);
      return values.get(id)!;
    },
    set(id: string, next: PackSocialSnapshot): void {
      if (values.get(id) === next) return;
      values.set(id, next);
      version += 1;
      listeners.forEach(notify => notify());
    },
    setLiked(id: string, liked: boolean): void {
      intents.set(id, liked);
      const previous = values.get(id);
      if (!previous || previous.liked === liked) return;
      likeVersions.set(id, version + 1);
      const row = monthId === contestMonth(Date.now()).id ? monthly.get(id) : undefined;
      const before = monthlyBefore.get(id);
      if (row) {
        if (before?.entry && before.monthId === monthId && liked === before.liked) monthly.set(id, before.entry);
        else monthly.set(id, { ...row, myMonthHeart: liked, hearts: Math.max(0, row.hearts + Number(liked) - Number(row.myMonthHeart === true)) });
      }
      values.set(id, { ...previous, liked, likesCount: Math.max(0, previous.likesCount + (liked ? 1 : -1)) });
      version += 1;
      listeners.forEach(notify => notify());
    },
    intent(id: string): boolean | undefined { return intents.get(id); },
    setIntent(id: string, liked: boolean): void { intents.set(id, liked); },
    subscribe(notify: () => void): () => void { listeners.add(notify); return () => { listeners.delete(notify); }; },
    reset(): void { likeVersions.clear(); monthly.clear(); monthlyBefore.clear(); monthId = ''; pending.clear(); version += 1; values.clear(); intents.clear(); listeners.forEach(notify => notify()); },
  };
}
export const packSocialLive = createPackSocialLiveStore();

/* expo-router route shim */
export default function __RouteShim() { return null; }
