/**
 * Единственный владелец показа найденного соперника.
 *
 * зачем (владелец 2026-09-20): поиск продолжается, когда человек ушёл с экрана
 * Арены, поэтому и предложение матча обязано приходить где угодно. Хост висит в
 * корне приложения рядом с остальными — экрана Арены в этот момент может не
 * быть вовсе.
 *
 * Здесь же — единственная точка СПИСАНИЯ энергии за Арену. Вход в очередь
 * бесплатный (проверка без списания), платим за состоявшийся матч: так
 * исчезает весь механизм возврата, который раньше жил на экране поиска.
 *
 * Логи: префикс `[ARENA-BGSEARCH]`, общий со фоновым поиском.
 *
 * зачем ЗДЕСЬ НЕТ BackHandler (разобрано аудитом 2026-09-20): старый экран
 * поиска блокировал «Назад», пока шёл вход в матч, — уход означал потерю
 * оплаченного матча на весь экран. Тост живёт ПОВЕРХ любого экрана, и такая
 * блокировка заморозила бы навигацию всего приложения. Вместо неё: кнопки
 * гаснут на время входа (`busy`), а решение по матчу принимается ровно один
 * раз (`decidedRef`). Возвращать BackHandler сюда не нужно.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import {
  arenaBackgroundSearch,
  startArenaBackgroundSearchLifecycle,
  useArenaBackgroundSearchState,
} from '../../app/arena_background_search';
import { arenaEntryPrefetchStart } from '../../app/arena_entry_prefetch';
import { arenaEntryFailure } from '../../modules/arena/duel_plan';
import { arenaText } from '../../modules/arena/copy';
import { activityEnergyCost } from '../../app/energy_contract';
import { useEnergy, useEnergySessionIntent } from '../EnergyContext';
import { useLang } from '../LangContext';
import { useOverlayVisible } from '../OverlayArbiter';
import { useGlobalBottomOverlayOffset } from '../../hooks/use-global-bottom-overlay-offset';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useVisibleWallClock } from '../../hooks/use_visible_wall_clock';
import { DebugLogger } from '../../app/debug-logger';
import NoEnergyModal from '../NoEnergyModal';
import { ArenaOpponentFoundToast } from './ArenaOpponentFoundToast';
import { ArenaSearchIndicator } from './ArenaSearchIndicator';

export default function ArenaOpponentFoundHost() {
  const { lang } = useLang();
  const router = useRouter();
  /**
   * зачем (владелец 2026-09-20): «когда ты на экране поиска соперника плашка
   * не нужна вот эта в левом углу, она нужна только если выйти на другие
   * экраны». На самом экране поиска и так виден пульс и секундомер — метка
   * дублировала бы их и мешала.
   */
  const pathname = usePathname();
  const onSearchScreen = pathname === '/arena_matchmaking';
  const reduceMotion = useReduceMotion();
  const bottomOffset = useGlobalBottomOverlayOffset();
  const search = useArenaBackgroundSearchState();
  const found = search.phase === 'found' ? search.found : null;
  const visible = useOverlayVisible('arenaOpponentFound', found !== null);
  const now = useVisibleWallClock(found !== null, 1_000);
  const [busy, setBusy] = useState(false);
  const [noEnergy, setNoEnergy] = useState(false);
  /** Защита от двойного тапа: решение по матчу принимается ровно один раз. */
  const decidedRef = useRef<string | null>(null);

  /** Цена входа берётся из единого каталога, а не из числа в разметке. */
  const energyCost = activityEnergyCost('arena_match');
  const { acknowledgeSessionStart, confirmSpendAmount, refundActivityStart } = useEnergy();
  const energyIntent = useEnergySessionIntent(
    'arena_match',
    search.mode ?? 'quick',
    found?.matchId ?? 'none',
  );

  useEffect(() => {
    // Пауза/возобновление поиска по состоянию приложения. Живёт здесь, потому
    // что хост монтируется в корне ровно один раз; подписка идемпотентна.
    startArenaBackgroundSearchLifecycle();
  }, []);

  useEffect(() => {
    // Новый матч — новое решение. Без сброса второй тост за сессию был бы
    // мёртвым: замок остался бы взведённым с прошлого раза.
    if (found && decidedRef.current !== found.matchId) {
      decidedRef.current = null;
      setBusy(false);
    }
  }, [found]);

  const decline = useCallback(() => {
    if (!found || decidedRef.current === found.matchId) return;
    decidedRef.current = found.matchId;
    DebugLogger.info('arena_opponent_found',
      `[ARENA-BGSEARCH] declined by user matchId=${found.matchId}`);
    // Мгновенно: тост уходит сразу, сеть догоняет внутри stop().
    arenaBackgroundSearch.stop('declined');
  }, [found]);

  const accept = useCallback(() => {
    if (!found || decidedRef.current === found.matchId) return;
    decidedRef.current = found.matchId;
    setBusy(true);
    const matchId = found.matchId;
    // Контур обучения берём из самого поиска: Арена намеренно не догадывается
    // о языке, а получает его явно (гейт arena_target_gate).
    const studyTarget = search.studyTarget;
    if (!studyTarget) {
      DebugLogger.warn('arena_opponent_found',
        `[ARENA-BGSEARCH] accept aborted: no studyTarget matchId=${matchId}`);
      setBusy(false);
      arenaBackgroundSearch.stop('declined');
      return;
    }
    DebugLogger.info('arena_opponent_found',
      `[ARENA-BGSEARCH] accept tapped matchId=${matchId} cost=${energyCost}`);

    void confirmSpendAmount(energyCost, energyIntent).then((result) => {
      if (result !== 'spent') {
        /**
         * зачем: баланс мог упасть между проверкой на входе и этим списанием
         * (вторая сессия, истёкший временный бонус). Молча проглотить нельзя —
         * получилось бы «нажал Принять, и ничего не произошло». Матч
         * отпускаем, поиск гасим, причину показываем.
         */
        DebugLogger.warn('arena_opponent_found',
          `[ARENA-BGSEARCH] accept refused by energy matchId=${matchId} result=${result}`);
        setBusy(false);
        arenaBackgroundSearch.stop('insufficient_energy');
        if (result === 'insufficient') setNoEnergy(true);
        return;
      }
      DebugLogger.info('arena_opponent_found',
        `[ARENA-BGSEARCH] energy spent, entering match matchId=${matchId}`);
      // Поиск закончен ДО входа: матч больше не «находка», и молчаливый
      // таймер отказа не имеет права сработать под уже принятым матчем.
      arenaBackgroundSearch.acknowledgeAccepted();
      /**
       * Подготовка входа ДО перехода — так было и на старом экране, и это
       * намеренно: войти в матч без плана хуже, чем подождать секунду. Кнопки
       * на это время погашены (`busy`), поэтому ожидание видно, а не выглядит
       * зависанием.
       *
       * `studyTarget` обязателен: Арена не угадывает язык, а получает его
       * явно — без него экран матча уйдёт в чужой контур. `prepared: '1'`
       * отдаёт экрану уже готовый план и избавляет от лишнего круга сети.
       */
      arenaEntryPrefetchStart(matchId, studyTarget).then(() => {
        /**
         * Печать «старт подтверждён» (возвращена аудитом 2026-09-20).
         *
         * зачем: она ЗАКРЫВАЕТ возможность возврата этой траты — леджер
         * отвечает `energy_session_already_acknowledged` любому позднему
         * возврату. Без неё операция оставалась открытой навсегда: человек
         * сыграл матч, а энергия могла вернуться. Старый экран её ставил,
         * при переписи она потерялась.
         *
         * Именно ЗДЕСЬ, а не раньше: до успешного входа матч ещё может не
         * состояться, и тогда возврат обязан остаться возможным.
         */
        void acknowledgeSessionStart(energyIntent.operationId).catch((error: unknown) => {
          DebugLogger.warn('arena_opponent_found',
            `[ARENA-BGSEARCH] ack failed matchId=${matchId}: ${String(error)}`);
        });
        setBusy(false);
        router.push({
          pathname: '/arena_match',
          params: { matchId, studyTarget, prepared: '1' },
        } as never);
      }).catch((reason: unknown) => {
        /**
         * зачем разбор причины (аудит 2026-09-20): я едва не потерял защиту,
         * которая была на старом экране. Временный сбой сети — не повод
         * тащить человека в матч без плана; но энергия УЖЕ списана за
         * принятый матч, поэтому и бросать его нельзя. Идём на экран матча в
         * любом случае: он умеет догрузить план сам и показать честный отказ,
         * если матч действительно мёртв. Оплата при этом не теряется.
         */
        const failure = arenaEntryFailure(reason);
        DebugLogger.warn('arena_opponent_found',
          `[ARENA-BGSEARCH] prefetch failed matchId=${matchId} failure=${failure}: ${String(reason)}`);
        setBusy(false);
        /**
         * МЁРТВЫЙ матч ('rejected'/'gated') — вести туда человека нельзя:
         * он увидит «Этого матча больше нет», а 25⚡ уже списаны за матч,
         * которого не случилось. Возвращаем плату и гасим поиск.
         *
         * зачем (аудит 2026-09-20): это ровно тот экран, который прислал
         * владелец. Подтверждения старта тут ещё НЕ было, поэтому возврат
         * пройдёт — именно ради таких случаев печать ставится позже.
         */
        if (failure === 'rejected' || failure === 'gated') {
          void refundActivityStart(energyIntent.operationId, `arena_entry_${failure}`)
            .catch((refundError: unknown) => {
              DebugLogger.warn('arena_opponent_found',
                `[ARENA-BGSEARCH] refund after dead match failed matchId=${matchId}: `
                + String(refundError));
            });
          arenaBackgroundSearch.stop('no_opponent');
          return;
        }
        // Временный сбой (сеть моргнула) — матч жив, экран матча догрузит план.
        router.push({
          pathname: '/arena_match',
          params: { matchId, studyTarget },
        } as never);
      });
    }).catch((error: unknown) => {
      /**
       * Списание упало исключением (сбой локального хранилища энергии).
       * Матч при этом не начался, поэтому плата не должна остаться на игроке:
       * возврат идемпотентен и по тому же operationId, а если списания и не
       * было — он просто ничего не сделает. Лучше лишний безвредный возврат,
       * чем молча съеденные 25⚡.
       */
      DebugLogger.warn('arena_opponent_found',
        `[ARENA-BGSEARCH] accept failed matchId=${matchId}: ${String(error)}`);
      void refundActivityStart(energyIntent.operationId, 'arena_accept_failed')
        .catch((refundError: unknown) => {
          DebugLogger.warn('arena_opponent_found',
            `[ARENA-BGSEARCH] refund after failed accept failed matchId=${matchId}: ${String(refundError)}`);
        });
      setBusy(false);
      arenaBackgroundSearch.stop('declined');
    });
  }, [acknowledgeSessionStart, confirmSpendAmount, energyCost, energyIntent, found,
    refundActivityStart, router, search.studyTarget]);

  if (noEnergy) {
    return (
      <NoEnergyModal
        visible
        activity="arena_match"
        onClose={() => setNoEnergy(false)}
      />
    );
  }

  /*
   * зачем (владелец 2026-09-20): «когда идет поиск то где в углу где не будет
   * мешать должен быть индикатор что идет поиск». Поиск живёт вне экрана
   * Арены, и без метки человек не знает, что он идёт, — узнал бы только когда
   * прилетит тост находки.
   *
   * Метка не занимает слот арбитра оверлеев: она ничего не перекрывает и не
   * требует решения, поэтому вставать в очередь за модалками ей незачем.
   */
  if (!found) {
    const searching = search.phase === 'searching' || search.phase === 'paused';
    if (!searching || onSearchScreen) return null;
    return (
      <ArenaSearchIndicator
        label={arenaText(lang, 'searching')}
        paused={search.phase === 'paused'}
        reduceMotion={reduceMotion}
        bottomOffset={bottomOffset}
      />
    );
  }

  if (!visible) return null;

  return (
    <ArenaOpponentFoundToast
      title={arenaText(lang, 'opponentFound')}
      opponentName={found.opponentName}
      opponentAvatar={found.opponentAvatar}
      opponentStars={found.opponentStars}
      acceptLabel={arenaText(lang, 'acceptForEnergy')
        .replace('{n}', String(energyCost))}
      declineLabel={arenaText(lang, 'declineShort')}
      deadlineAtMs={found.acceptDeadlineAtMs}
      nowMs={now}
      reduceMotion={reduceMotion}
      busy={busy}
      onAccept={accept}
      onDecline={decline}
      bottomOffset={bottomOffset}
    />
  );
}
