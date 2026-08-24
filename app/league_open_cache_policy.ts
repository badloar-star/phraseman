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

/**
 * Uses the durable state when available, otherwise preserves the latest
 * account-scoped in-memory projection. This is the recovery path for Android
 * SQLITE_FULL: cloud restore can update memory even when AsyncStorage cannot
 * persist `league_state_v3`.
 */
export function resolveLeagueStateSnapshot(raw: unknown): LeagueState | null {
  const persisted = sanitizeLeagueState(raw);
  if (persisted) return rememberLeagueStateSnapshot(persisted);
  return getCachedLeagueStateSync();
}

/** Projects a cloud restore into memory before any best-effort disk write. */
export function projectCloudLeagueStateSnapshot(raw: unknown): LeagueState | null {
  if (cachedLeagueStateSnapshot) return cachedLeagueStateSnapshot;
  if (raw === null || raw === undefined) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const state = sanitizeLeagueState(parsed);
    return state ? rememberLeagueStateSnapshot(state) : null;
  } catch {
    return null;
  }
}

export function shouldShowLeagueEmptyParticipants(input: EmptyParticipantsInput): boolean {
  return input.localLeagueHydrated && input.participantCount <= 0;
}

/**
 * Минимум полей, которые нужны withMyLivePoints. Специально НЕ импортируем
 * GroupMember из league_engine: этот модуль — чистая политика без зависимостей,
 * а league_engine сам импортирует его (был бы цикл).
 */
type LiveGroupMember = {
  name?: string;
  points?: number;
  isMe?: boolean;
  uid?: string;
};

/**
 * Подставляет СВОИ актуальные недельные очки в кэшированную группу лиги.
 *
 * зачем: владелец захотел «чужие цифры раз в 6 часов, свои — в реальном времени».
 * Свои очки лежат локально (AsyncStorage) и стоят 0 чтений Firestore, поэтому
 * освежать их можно на каждом входе, не трогая сеть. Чужие строки остаются как
 * есть — их обновляет 6-часовой троттл. Чистая функция, ничего не мутирует:
 * возвращает новый массив (правило иммутабельности).
 *
 * Если себя в группе нет — возвращаем группу без изменений: дорисовывать себя
 * тут нельзя, этим занимается ensureCurrentUserInGroup в league_engine, где
 * известен канонический uid и правила лиги.
 */
export function withMyLivePoints<T extends LiveGroupMember>(
  group: T[] | null | undefined,
  myPoints: number,
  myUid?: string | null,
  myName?: string | null,
): T[] {
  const source = Array.isArray(group) ? group : [];
  const safePoints = Math.max(0, Math.floor(Number(myPoints) || 0));
  const uid = (myUid ?? '').trim();
  const name = (myName ?? '').trim();

  return source.map((member) => {
    const isMe = member.isMe === true
      || (!!uid && member.uid === uid)
      || (!uid && !!name && member.name === name);
    if (!isMe) return member;
    // Не понижаем: кэш мог быть свежее локального счётчика (например, очки
    // начислились на другом устройстве и уже приехали в группу).
    const points = Math.max(safePoints, Math.max(0, Math.floor(Number(member.points) || 0)));
    if (points === member.points && member.isMe === true) return member;
    return { ...member, points, isMe: true };
  });
}

// зачем: владелец увидел под «Участники клуба» пустоту — в лиге он ОДИН. Старое
// пустое состояние срабатывает только при participantCount <= 0, а сам список
// рисует ТОЛЬКО игроков после топ-3 (publicListGroup = slice(3)). Значит при
// 1..3 участниках не показывалось ничего, и пустой экран читался как поломка.
// Считаем по числу ВИДИМЫХ в списке, а не по общему числу участников.
export function shouldShowLeagueSoloParticipant(input: {
  localLeagueHydrated: boolean;
  /** Общее число участников лиги (вместе с самим игроком). */
  participantCount: number;
  /** Сколько строк реально попадёт в список (участники после топ-3). */
  visibleListCount: number;
}): boolean {
  if (!input.localLeagueHydrated) return false;
  // полностью пустую лигу закрывает shouldShowLeagueEmptyParticipants
  if (input.participantCount <= 0) return false;
  return input.participantCount === 1;
}

export default function __RouteShim() { return null; }
