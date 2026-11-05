/**
 * Доступ к разделам по рангу (координатор 30.10, «Главная Free по рангам»).
 *
 * зачем: один источник решения для Главной, «Сегодня», нижней панели и закрытых ссылок. Гейты действуют ТОЛЬКО для «нового» пользователя
 * при включённом флаге Пульта rank_gates_enabled; иначе всё открыто (grandfather = всё). Неопределённое (ранг/Plus не прочитаны) → pending →
 * НЕ запираем. Точка подключения праздничных окон открытия: onRankSectionOpened (шаг «Моменты», не здесь).
 * Лог: [RANK-GATE].
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { usePremium } from '../components/PremiumContext';
import { getRemoteBool } from '../app/remote_flags';
import { readRankGateUserVerdict, type RankGateUserVerdict } from '../app/rank_gates_new_user';
import { useMyCoinRank } from './use_my_coin_rank';
import type { RankAccessDecision, RankAccessSurface } from '../shared/rank_access_contract';
import { setDialogueRankShiftActive } from '../app/dialogue_rank_shift';
import { decideForUser, isSurfaceLocked } from '../app/rank_gate_decision';
import { subscribeAccountGeneration } from '../app/account_generation';

export { decideForUser, isSurfaceLocked };
export type { RankAccessDecision };

let verdictCache: RankGateUserVerdict | null = null;
let verdictPromise: Promise<RankGateUserVerdict> | null = null;
// зачем (владелец 04.11, дыры новичка/восстановления): вердикт принадлежит АККАУНТУ — при смене аккаунта (выход, удаление, второй человек на телефоне)
// кэш процесса сбрасывается и хуки читают вердикт заново; «нет владельца» не кэшируется (прочитаем, когда аккаунт станет активным).
let verdictEpoch = 0;
const verdictEpochListeners = new Set<() => void>();
subscribeAccountGeneration(() => {
  verdictCache = null;
  verdictPromise = null;
  verdictEpoch += 1;
  verdictEpochListeners.forEach((listener) => listener());
});
const subscribeVerdictEpoch = (listener: () => void): (() => void) => {
  verdictEpochListeners.add(listener);
  return () => { verdictEpochListeners.delete(listener); };
};
const getVerdictEpoch = (): number => verdictEpoch;
function loadVerdict(): Promise<RankGateUserVerdict> {
  if (!verdictPromise) {
    const promise: Promise<RankGateUserVerdict> = readRankGateUserVerdict().then((v) => {
      if (verdictPromise !== promise) return v; // зачем: за время чтения аккаунт сменился — чужой вердикт в кэш не кладём
      if (v.reason === 'no_owner' || v.reason === 'owner_changed') verdictPromise = null; else verdictCache = v;
      return v;
    });
    verdictPromise = promise;
  }
  return verdictPromise;
}

type OpenedListener = (surface: RankAccessSurface) => void;
const openedListeners = new Set<OpenedListener>();
/** Точка подключения для «Моментов»: вызывается, когда раздел впервые стал доступен (ранг вырос). */
export function onRankSectionOpened(listener: OpenedListener): () => void {
  openedListeners.add(listener);
  return () => { openedListeners.delete(listener); };
}
const lastLocked = new Map<RankAccessSurface, boolean>();

export function useRankAccess(surface: RankAccessSurface): RankAccessDecision {
  const rank = useMyCoinRank();
  const premium = usePremium();
  const [verdict, setVerdict] = useState<RankGateUserVerdict | null>(verdictCache);
  const epoch = useSyncExternalStore(subscribeVerdictEpoch, getVerdictEpoch, getVerdictEpoch);
  useEffect(() => {
    if (verdictCache) { setVerdict(verdictCache); return undefined; }
    setVerdict(null); // зачем: прежний вердикт принадлежал другому аккаунту; пока читаем — «неопределённое не запираем»
    let alive = true;
    void loadVerdict().then((v) => { if (alive) setVerdict(v); });
    return () => { alive = false; };
  }, [epoch]);
  const gatesEnabled = getRemoteBool('rank_gates_enabled') !== false;
  const existingUsersGated = getRemoteBool('rank_gates_existing_users') !== false;
  // зачем (владелец 30.10): сдвиг требований диалогов «+1, потолок 19» включён только для нового пользователя при включённых гейтах
  setDialogueRankShiftActive(gatesEnabled && verdict?.isNew === true);
  const decision = useMemo(
    () => decideForUser(surface, { gatesEnabled, verdict, rank, plusActive: premium.isPremium, plusResolved: premium.accessResolved, existingUsersGated }),
    [surface, gatesEnabled, existingUsersGated, verdict, rank, premium.isPremium, premium.accessResolved],
  );
  useEffect(() => {
    const locked = isSurfaceLocked(decision);
    const was = lastLocked.get(surface);
    if (was === true && !locked) {
      console.log('[RANK-GATE] opened', JSON.stringify({ surface, rank }));
      openedListeners.forEach((l) => l(surface));
    }
    lastLocked.set(surface, locked);
  }, [decision, surface, rank]);
  return decision;
}
