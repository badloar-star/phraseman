import type { YoutubeVideoState } from '../shared/youtube_catalog_contract';

export const PREMIERE_TICK_INTERVAL_MS = 1_000;
export const PREMIERE_INTRO_MAX_ENTRIES = 40;
export const PREMIERE_INTRO_TTL_MS = 180 * 24 * 60 * 60_000;

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type PremierePresentation =
  | { kind: 'none' }
  | { kind: 'live' }
  | { kind: 'upcoming'; remainingMs: null }
  | { kind: 'checking'; remainingMs: 0 }
  | {
      kind: 'countdown';
      remainingMs: number;
      days: number;
      hours: number;
      minutes: number;
      seconds: number | null;
    };

export function getPremierePresentation(
  state: YoutubeVideoState,
  scheduledStartTime: string | undefined,
  nowMs = Date.now(),
): PremierePresentation {
  if (state === 'live') return { kind: 'live' };
  if (state !== 'upcoming') return { kind: 'none' };

  const startMs = Date.parse(String(scheduledStartTime ?? ''));
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs)) {
    return { kind: 'upcoming', remainingMs: null };
  }
  const remainingMs = Math.max(0, startMs - nowMs);
  if (remainingMs === 0) return { kind: 'checking', remainingMs: 0 };

  const days = Math.floor(remainingMs / DAY_MS);
  const hours = Math.floor((remainingMs % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((remainingMs % HOUR_MS) / MINUTE_MS);
  const seconds = remainingMs < HOUR_MS
    ? Math.floor((remainingMs % MINUTE_MS) / SECOND_MS)
    : null;
  return { kind: 'countdown', remainingMs, days, hours, minutes, seconds };
}

export function shouldRunPremiereCountdownTicker(options: {
  state: YoutubeVideoState;
  scheduledStartTime?: string;
  runtimeActive: boolean;
  appState: string;
  nowMs?: number;
}): boolean {
  if (!options.runtimeActive || options.appState !== 'active' || options.state !== 'upcoming') return false;
  return getPremierePresentation(
    options.state,
    options.scheduledStartTime,
    options.nowMs ?? Date.now(),
  ).kind === 'countdown';
}

export type PremiereIntroSeenMap = Record<string, number>;

function normalizedVideoId(value: string): string {
  const id = String(value ?? '').trim();
  return id && id.length <= 100 ? id : '';
}

export function prunePremiereIntroSeen(
  value: PremiereIntroSeenMap | null | undefined,
  nowMs = Date.now(),
): PremiereIntroSeenMap {
  if (!value || typeof value !== 'object' || !Number.isFinite(nowMs)) return {};
  const oldestAllowed = nowMs - PREMIERE_INTRO_TTL_MS;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([videoId, timestamp]) => (
        !!normalizedVideoId(videoId)
        && Number.isFinite(timestamp)
        && timestamp >= oldestAllowed
        && timestamp <= nowMs
      ))
      .sort((left, right) => right[1] - left[1])
      .slice(0, PREMIERE_INTRO_MAX_ENTRIES),
  );
}

export function shouldPlayPremiereIntro(
  value: PremiereIntroSeenMap | null | undefined,
  videoId: string,
  nowMs = Date.now(),
): boolean {
  const id = normalizedVideoId(videoId);
  return !!id && prunePremiereIntroSeen(value, nowMs)[id] == null;
}

export function markPremiereIntroSeen(
  value: PremiereIntroSeenMap | null | undefined,
  videoId: string,
  nowMs = Date.now(),
): PremiereIntroSeenMap {
  const id = normalizedVideoId(videoId);
  if (!id || !Number.isFinite(nowMs)) return prunePremiereIntroSeen(value, nowMs);
  return prunePremiereIntroSeen({ ...prunePremiereIntroSeen(value, nowMs), [id]: nowMs }, nowMs);
}

/* expo-router route shim: utility module, not a screen */
export default function __RouteShim() { return null; }
