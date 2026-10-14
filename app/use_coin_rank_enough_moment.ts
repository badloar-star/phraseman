// use_coin_rank_enough_moment.ts — m14A «Хватает на ранг N»: точка монтирования для Дизайна (окно CoinRankEnoughDialog).
//
// зачем (координатор 14.10): окно встаёт в общую очередь окон (ключ coinRankEnough после welcomeBack) и появляется, когда монет
// впервые хватает на следующий ранг; 1 раз на ранг. Решение — после первого кадра Главной и на каждое изменение баланса/ранга
// (локальные подписки, 0 чтений Firestore). «Предложено» отмечается, когда окно РЕАЛЬНО получило слот.
//
// Как вставить (Дизайн):
//   const rankEnough = useCoinRankEnoughMoment({ active: homeRuntimeActive });
//   {rankEnough.visible && rankEnough.offer ? <CoinRankEnoughDialog coinRank={rankEnough.offer.rank} coins={rankEnough.offer.balance}
//      onUpgrade={() => { rankEnough.close(); /* на экран ранга */ }} onLater={rankEnough.close} /> : null}
import { useCallback, useEffect, useRef, useState } from 'react';
import { useOverlayVisible } from '../components/OverlayArbiter';
import { captureAccountGeneration, subscribeAccountGeneration } from './account_generation';
import { decideRankEnough, markRankOffered, readOfferedRanks, readRankEnoughFlag } from './coin_rank_enough_gate';
import { peekCoinRank, readCoinRank, subscribeCoinRank } from './coin_rank_state_v1';
import { DebugLogger } from './debug-logger';
import { runAfterHomeFirstFrame } from './first_frame_deferred_warmups';
import { peekRunes, subscribeRunesBalance } from './runes_system';

const LOG = '[RANK-ENOUGH]';

export type RankEnoughOffer = Readonly<{ owner: string; rank: number; nextRank: number; price: number; balance: number }>;

export function useCoinRankEnoughMoment(input: Readonly<{ active: boolean }>): Readonly<{
  visible: boolean;
  offer: RankEnoughOffer | null;
  close: () => void;
}> {
  const [offer, setOffer] = useState<RankEnoughOffer | null>(null);
  const visible = useOverlayVisible('coinRankEnough', offer !== null);
  const offerRef = useRef<RankEnoughOffer | null>(null);
  offerRef.current = offer;
  const markedRef = useRef<string | null>(null);
  const checkingRef = useRef(false);

  const evaluate = useCallback(async (reason: string): Promise<void> => {
    if (offerRef.current) { DebugLogger.info(LOG, `пропуск (${reason}): окно уже ждёт слот или на экране`); return; }
    if (checkingRef.current) { DebugLogger.info(LOG, `пропуск (${reason}): проверка уже идёт`); return; }
    checkingRef.current = true;
    try {
      if (!(await readRankEnoughFlag())) { DebugLogger.info(LOG, `нет (${reason}): флаг moments_v3 выключен`); return; }
      const token = captureAccountGeneration();
      const owner = token.phase === 'active' ? token.stableId?.trim() ?? '' : '';
      if (!owner) { DebugLogger.info(LOG, `нет (${reason}): аккаунт не активен (${token.phase})`); return; }
      const rank = peekCoinRank(owner) ?? await readCoinRank(owner);
      const balance = peekRunes();
      const offered = await readOfferedRanks(owner);
      const decision = decideRankEnough({ rank, balance, offeredRanks: offered });
      if (!decision.show) {
        DebugLogger.info(LOG, `нет (${reason}): ${decision.reason} ранг=${String(rank)} монеты=${String(balance)} предлагали=[${offered.join(',')}]`);
        return;
      }
      if (captureAccountGeneration().generation !== token.generation) { DebugLogger.info(LOG, `нет (${reason}): аккаунт сменился во время проверки`); return; }
      DebugLogger.info(LOG, `ПОКАЗЫВАЕМ (${reason}): ранг ${decision.rank}→${decision.nextRank} цена=${decision.price} монеты=${decision.balance}`);
      setOffer({ owner, rank: decision.rank, nextRank: decision.nextRank, price: decision.price, balance: decision.balance });
    } catch (error) {
      DebugLogger.warn(LOG, `сбой проверки (${reason}): ${String(error).slice(0, 120)}`);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!input.active) return undefined;
    const cancelFirst = runAfterHomeFirstFrame('coin_rank_enough_gate', () => evaluate('first_frame'), { holdDuringOnboarding: true });
    // Рост баланса (начисление) — повод проверить; падение само по себе окно не вызывает.
    const offBalance = subscribeRunesBalance((_next, delta) => { if (delta > 0) void evaluate('balance_up'); });
    // Ранг куплен — следующий ранг может уже быть по карману.
    const offRank = subscribeCoinRank(() => { void evaluate('rank_changed'); });
    const offGeneration = subscribeAccountGeneration(() => { setOffer(null); void evaluate('account_changed'); });
    return () => { cancelFirst(); offBalance(); offRank(); offGeneration.remove(); };
  }, [input.active, evaluate]);

  useEffect(() => {
    if (!visible || !offer) return;
    const key = `${offer.owner}:${offer.nextRank}`;
    if (markedRef.current === key) return;
    markedRef.current = key;
    DebugLogger.info(LOG, `слот получен — окно на экране: ранг ${offer.rank}→${offer.nextRank}`);
    void markRankOffered(offer.owner, offer.nextRank);
  }, [visible, offer]);

  const close = useCallback(() => {
    DebugLogger.info(LOG, 'окно закрыто');
    setOffer(null);
  }, []);

  return { visible: visible && offer !== null, offer, close };
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
