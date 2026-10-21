/**
 * Веха серии вдвоём (7 / 30 / 100 дней): кому и когда показать окно FriendPairMilestoneSheet — один раз на пару и веху.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html «Серия вдвоём — 30 дней»): праздник в момент, когда
 * огонь зажёгся у обоих, и только один раз. Отметка «уже праздновали» — на телефоне (AsyncStorage, своя на аккаунт);
 * Firestore не трогаем. Запас 3 дня: если в день вехи приложение не открывали, праздник догонит, но не через месяц.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PAIR_STREAK_MILESTONES, type PairStreakView } from './pair_streak';
import type { PairCandidate } from './pair_today';

const SEEN_KEY = 'friends_pair_milestones_seen_v1';
/** Сколько дней после вехи окно ещё уместно («30 дней» на 31–32 день — да, на 45 — уже нет). */
export const PAIR_MILESTONE_GRACE_DAYS = 3;

type SeenMap = Readonly<Record<string, readonly number[]>>; // friendUid → отпразднованные вехи

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Веха, которую стоит отпраздновать сейчас: огонь горит у обоих, серия в окне вехи, эту веху паре ещё не показывали. */
export function dueMilestone(view: PairStreakView, celebrated: readonly number[]): number | null {
  if (view.state !== 'both_today') return null;
  for (const milestone of [...PAIR_STREAK_MILESTONES].sort((a, b) => b - a)) {
    if (view.streak >= milestone && view.streak < milestone + PAIR_MILESTONE_GRACE_DAYS && !celebrated.includes(milestone)) return milestone;
  }
  return null;
}

async function readSeen(scope: string): Promise<SeenMap> {
  try {
    const raw = await AsyncStorage.getItem(`${SEEN_KEY}::${scope}`);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, number[]> = {};
    for (const [uid, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(list)) out[uid] = list.filter((m): m is number => typeof m === 'number' && Number.isFinite(m));
    }
    return out;
  } catch (e) {
    console.warn(`[FRIENDS-1] milestone:seen read failed → считаем, что не праздновали: ${errText(e)}`); // guard-ok: catch называет причину
    return {};
  }
}

/**
 * Взять веху для показа (самая длинная серия первой) и сразу отметить её отпразднованной — окно не повторится,
 * даже если приложение закроют, не дождавшись «Отлично». scope — свой uid (отметки у каждого аккаунта свои).
 */
export async function takePairMilestone<T extends PairCandidate>(
  candidates: readonly T[],
  scope: string,
): Promise<Readonly<{ candidate: T; milestone: number }> | null> {
  if (!scope) {
    console.log('[FRIENDS-1] milestone:skip reason=no_scope'); // guard-ok: ранний выход называет причину
    return null;
  }
  const seen = await readSeen(scope);
  const ordered = [...candidates].sort((a, b) => b.view.streak - a.view.streak || a.name.localeCompare(b.name));
  for (const candidate of ordered) {
    const milestone = dueMilestone(candidate.view, seen[candidate.friendUid] ?? []);
    if (milestone === null) continue;
    const next: SeenMap = { ...seen, [candidate.friendUid]: [...(seen[candidate.friendUid] ?? []), milestone] };
    try {
      await AsyncStorage.setItem(`${SEEN_KEY}::${scope}`, JSON.stringify(next));
    } catch (e) {
      // зачем: без отметки окно может показаться ещё раз — лучше повтор праздника, чем молча потерять веху
      console.warn(`[FRIENDS-1] milestone:seen write failed friend=${candidate.friendUid} milestone=${milestone}: ${errText(e)}`); // guard-ok: catch называет причину
    }
    console.log(`[FRIENDS-1] milestone:due friend=${candidate.friendUid} milestone=${milestone} streak=${candidate.view.streak}`); // guard-ok: одна строка на веху
    return { candidate, milestone };
  }
  return null;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
