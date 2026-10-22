/**
 * Окно вехи «Серия вдвоём — 7 / 30 / 100 дней» на вкладке «Друзья» (идея 1): когда открыть, когда ждать, когда снять.
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html «Прервалась и веха → 30 дней» — окно поверх вкладки):
 * праздник, когда огонь пары зажёгся у обоих, — один раз на пару и веху. Решение — по снимку «Вместе» и своим дням активности
 * на телефоне (как Главная и финал занятия): ни чтений, ни записей Firestore. takePairMilestone ставит отметку «праздновали»
 * в момент решения, поэтому взятая веха не теряется: пока открыто окно вкладки или общее окно приложения, она ждёт.
 * Окно приходит само, не по тапу, поэтому идёт через общую очередь окон (OverlayArbiter): два нативных окна сразу на iOS
 * роняют стек презентаций.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useOverlayVisible } from '../components/OverlayArbiter';
import { NATIVE_MODAL_DISMISS_GAP_MS } from '../app/safe_modal_navigation';
import { getLocalDayKey } from '../app/local_date';
import { maskUid } from '../app/diagnostic_mask';
import { getCanonicalUserId } from '../app/user_id_policy';
import { readMyActiveDays, type FriendsTogetherSnapshot } from '../app/friends_together/together_store';
import { pairCandidatesFromSnapshot, type PairSnapshotCandidate } from '../app/friends_together/pair_today';
import { takePairMilestone } from '../app/friends_together/pair_milestones';

/**
 * waiting — веха взята и ждёт: вкладка не на экране, открыто её окно или ещё идёт зазор после его закрытия;
 * ready — просит слот в общей очереди окон; open — на экране; closing — уходит.
 */
export type PairMilestonePhase = 'waiting' | 'ready' | 'open' | 'closing';
export type PairMilestoneMoment = Readonly<{ candidate: PairSnapshotCandidate; milestone: number; phase: PairMilestonePhase }>;

export type PairMilestoneMomentInput = Readonly<{
  /** Вкладка на экране и «Вместе» включён. */
  active: boolean;
  /** Снимок «Вместе» вкладки: новый снимок — новая проверка. */
  snapshot: FriendsTogetherSnapshot | null;
  /**
   * Открыто окно вкладки. Читается только до показа: пока веха на экране, вкладка считает её своим окном, и флаг не мешает.
   */
  blocked: boolean;
}>;

type Found = Readonly<{ candidate: PairSnapshotCandidate; milestone: number }>;

const log = (line: string): void => { console.log(`[FRIENDS-1] ${line}`); }; // guard-ok: журнал вехи на вкладке, одна строка на шаг
const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

async function findPairMilestone(snapshot: FriendsTogetherSnapshot): Promise<Found | null> {
  const [scope, myDays] = await Promise.all([getCanonicalUserId(), readMyActiveDays()]);
  if (!scope) {
    log('milestone:skip reason=no_user');
    return null;
  }
  const candidates = pairCandidatesFromSnapshot(snapshot, myDays, getLocalDayKey());
  const lit = candidates.filter((c) => c.view.state === 'both_today');
  log(`milestone:check pairs=${Object.keys(snapshot.pairs).length} named=${candidates.length} both_today=${lit.map((c) => `${maskUid(c.friendUid)}:${c.view.streak}`).join(',') || 'none'} myDays=${myDays ? 'yes' : 'no'}`);
  // зачем: огонь у обоих не горит ни у кого — хранилище вех даже не читаем
  return lit.length > 0 ? takePairMilestone(lit, scope) : null;
}

export function usePairMilestoneMoment({ active, snapshot, blocked }: PairMilestoneMomentInput): Readonly<{
  moment: PairMilestoneMoment | null;
  /** Шторка на экране: окно открыто и общая очередь отдала ему слот. */
  visible: boolean;
  /** «Отлично», свайп или «Назад»: окно уходит, слот очереди свободен. */
  close: () => void;
  /** Окно ушло с экрана: веху снимаем, вкладка снова открывает свои окна. */
  dismissed: () => void;
}> {
  const [moment, setMoment] = useState<PairMilestoneMoment | null>(null);
  const momentRef = useRef<PairMilestoneMoment | null>(null);
  momentRef.current = moment;
  const checkedRef = useRef<FriendsTogetherSnapshot | null>(null);
  // зачем: веха взята и ещё не снята — синхронный флаг, а не состояние: следующая проверка в очереди видит его сразу
  const busyRef = useRef(false);
  // зачем: проверки по очереди — снимок с диска и сразу снимок из сети не возьмут две вехи разом (вторая потерялась бы)
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!active || !snapshot || checkedRef.current === snapshot) return;
    checkedRef.current = snapshot;
    queueRef.current = queueRef.current
      .then(async () => {
        if (busyRef.current) {
          log('milestone:skip reason=moment_taken');
          return;
        }
        const found = await findPairMilestone(snapshot);
        if (!found) return;
        busyRef.current = true;
        // зачем: отметка «праздновали» уже стоит — веху кладём всегда, без отмены по смене снимка, иначе праздник потерян
        setMoment({ ...found, phase: 'waiting' });
      })
      .catch((e: unknown) => {
        console.warn(`[FRIENDS-1] milestone:check failed → окна нет: ${errText(e)}`); // guard-ok: catch называет причину
      });
  }, [active, snapshot]);

  // waiting → ready: вкладка на экране, её окна закрыты и прошёл зазор закрытия нативного окна
  useEffect(() => {
    if (moment?.phase !== 'waiting') return undefined;
    if (!active || blocked) {
      log(`milestone:wait reason=${active ? 'tab_window' : 'tab_hidden'} friend=${maskUid(moment.candidate.friendUid)} milestone=${moment.milestone}`);
      return undefined;
    }
    // зачем (iOS): новое нативное окно сразу после ухода другого может не показаться — тот же зазор, что у общей очереди окон
    const timer = setTimeout(() => {
      setMoment((current) => (current === moment ? { ...current, phase: 'ready' } : current));
    }, NATIVE_MODAL_DISMISS_GAP_MS);
    return () => clearTimeout(timer);
  }, [active, blocked, moment]);

  const granted = useOverlayVisible('friendPairMilestone', moment?.phase === 'ready' || moment?.phase === 'open');

  // ready → open, когда очередь отдала слот; открылось окно вкладки или вкладка ушла — снова ждём и слот не держим
  useEffect(() => {
    if (moment?.phase !== 'ready') return;
    const friend = maskUid(moment.candidate.friendUid);
    if (!active || blocked) {
      log(`milestone:wait reason=${active ? 'tab_window' : 'tab_hidden'} friend=${friend} milestone=${moment.milestone} from=ready`);
      setMoment({ ...moment, phase: 'waiting' });
      return;
    }
    if (!granted) {
      log(`milestone:wait reason=app_overlay friend=${friend} milestone=${moment.milestone}`);
      return;
    }
    log(`milestone:show friend=${friend} milestone=${moment.milestone} streak=${moment.candidate.view.streak}`);
    setMoment({ ...moment, phase: 'open' });
  }, [active, blocked, granted, moment]);

  const close = useCallback(() => {
    setMoment((current) => (current?.phase === 'open' ? { ...current, phase: 'closing' } : current));
  }, []);

  const dismissed = useCallback(() => {
    const current = momentRef.current;
    log(current
      ? `milestone:closed friend=${maskUid(current.candidate.friendUid)} milestone=${current.milestone}`
      : 'milestone:closed reason=no_moment');
    busyRef.current = false;
    setMoment(null);
  }, []);

  return { moment, visible: moment?.phase === 'open' && granted, close, dismissed };
}
