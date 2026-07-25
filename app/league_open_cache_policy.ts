import type { LeagueState } from './league_engine';

type EmptyParticipantsInput = {
  localLeagueHydrated: boolean;
  participantCount: number;
};

let cachedLeagueStateSnapshot: LeagueState | null = null;

/**
 * Санитизация распарсенного состояния лиги из кэша (AsyncStorage). Главное — `group`
 * ОБЯЗАН быть массивом: битый/частично-записанный кэш может дать `group` = объект/строку/null,
 * и тогда `[...state.group]` / `state.group.sort()` в club_screen падают `TypeError: not iterable`,
 * а единственный глобальный ErrorBoundary роняет ВСЁ приложение в белый экран. Чистая функция.
 */
export function sanitizeLeagueState(raw: unknown): LeagueState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const group = Array.isArray(obj.group) ? obj.group : [];
  return { ...(obj as object), group } as LeagueState;
}

export function rememberLeagueStateSnapshot(state: LeagueState | null | undefined): LeagueState | null {
  cachedLeagueStateSnapshot = state ? sanitizeLeagueState(state) : null;
  return cachedLeagueStateSnapshot;
}

// зачем: cachedLeagueStateSnapshot выше — module-scope кэш БЕЗ привязки к uid,
// он просто держит последнее сохранённое состояние лиги процесса (ранг, группа,
// участники). При logout/смене аккаунта БЕЗ полного рестарта приложения (общий
// девайс, QA свитчит тестовые аккаунты) getCachedLeagueStateSync() синхронно
// отдавал состояние лиги ПРЕДЫДУЩЕГО аккаунта следующему вошедшему — утечка
// чужих данных лиги. Вызывается из wipeLocalAccountDataUnsafe (cloud_sync.ts) и
// signOutCurrentProvider (auth_provider.ts) — тех же точек, что и
// resetMultiplierBreakdownCache в xp_manager.ts (см. 35b425d4c).
export function clearCachedLeagueStateSnapshot(): void {
  cachedLeagueStateSnapshot = null;
}

export function getCachedLeagueStateSync(): LeagueState | null {
  return cachedLeagueStateSnapshot;
}

export function shouldShowLeagueEmptyParticipants(input: EmptyParticipantsInput): boolean {
  return input.localLeagueHydrated && input.participantCount <= 0;
}

export default function __RouteShim() { return null; }
