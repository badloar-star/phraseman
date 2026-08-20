import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown, SlideInRight, ZoomIn } from 'react-native-reanimated';

import { arenaTaskRenderable } from '../modules/arena/task_adapter';
import { arenaClearMatch, arenaLoadMatch } from '../modules/arena/match_store';
import type { ArenaLocalMatchState } from '../modules/arena/match_machine';
import { arenaOutboxClassify } from '../modules/arena/result_outbox';
import { arenaOutboxEnqueue, arenaOutboxRemove } from '../modules/arena/outbox_storage';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';
import type { ArenaMatchReport } from '../modules/arena/match_machine';
import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { ArenaPlayers } from '../components/arena/ArenaPlayers';
import { ArenaQuestion } from '../components/arena/ArenaQuestion';
import { ArenaTimerRing } from '../components/arena/ArenaTimerRing';
import { ArenaComboMeter } from '../components/arena/ArenaComboMeter';
import { ArenaStarFlight } from '../components/arena/ArenaStarFlight';
import { ArenaVersusIntro } from '../components/arena/ArenaVersusIntro';
import { V2Card, V2Cta, V2Segments } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette, v2motion } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import type { ArenaPlayer } from '../modules/arena/contract';
import {
  ARENA_ACCEPT_RETRY_MS,
  arenaEntryFailure,
  arenaEntryFailureCopy,
  type ArenaEntryFailure,
  arenaEntryStep,
  arenaPlanTaskToPublic,
  type ArenaMatchPlanWire,
} from '../modules/arena/duel_plan';
import { arenaAwardLines, arenaMatchHud } from '../modules/arena/match_view';
import { arenaQuestionLayout } from '../modules/arena/question_layout';
import { useArenaLocalMatch } from '../hooks/use_arena_local_match';
import {
  arenaClosedTicks,
  arenaLivePublishPlan,
  arenaMergeOpponentTicks,
  arenaParseLiveSeat,
} from '../modules/arena/live_channel';
import { arenaMonotonicNowMs } from '../modules/arena/monotonic';
import { useArenaFontScale } from '../hooks/use_arena_font_scale';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { arenaCosmeticDefinition } from '../modules/arena/arena_cosmetics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useArenaSound } from '../hooks/use_arena_sound';
import {
  arenaExpansionHome,
  arenaMatchReportToWire,
  arenaV2Forfeit,
  arenaV2MatchAccept,
  arenaV2MatchFinish,
  arenaV2MatchPlan,
  arenaV2MatchSettle,
  arenaPublishLiveTicks,
  createArenaRequestId,
  rememberArenaViewerSeat,
  useArenaOpponentLive,
} from './arena_client';

/**
 * Входной план уже запечатан сервером и идемпотентен. React может снять
 * первый экземпляр экрана, пока callable находится в полёте (особенно после
 * перехода matchmaking → match), и тогда успешный ответ терялся: сервер уже
 * отмечал duelVersion=3, а новый экран бесконечно показывал ожидание.
 * Один promise на matchId позволяет следующему экземпляру забрать тот же
 * успешный ответ без второго сетевого запроса.
 */
const arenaMatchPlanRequests = new Map<string, ReturnType<typeof arenaV2MatchPlan>>();

function arenaMatchPlanRequest(matchId: string): ReturnType<typeof arenaV2MatchPlan> {
  const current = arenaMatchPlanRequests.get(matchId);
  if (current) return current;
  const request = arenaV2MatchPlan(matchId).then((result) => {
    if (!result) arenaMatchPlanRequests.delete(matchId);
    return result;
  }).catch((error) => {
    arenaMatchPlanRequests.delete(matchId);
    throw error;
  });
  arenaMatchPlanRequests.set(matchId, request);
  // Матчей за один живой процесс немного, но кэш всё равно ограничен.
  if (arenaMatchPlanRequests.size > 8) {
    const oldest = arenaMatchPlanRequests.keys().next().value;
    if (oldest && oldest !== matchId) arenaMatchPlanRequests.delete(oldest);
  }
  return request;
}

/**
 * Экран матча Арены.
 *
 * Сеть здесь трогается ТРИ раза за весь матч: план при входе, отчёт в конце и
 * — только если соперник не сдался к сроку — один запрос на закрытие. Между
 * ними нет ни одного обращения: вердикт считается на устройстве отпечатками и
 * показывается в том же кадре, в котором игрок нажал. Владелец потребовал
 * этого прямо: «чтобы не было вообще задержек, даже 1 секунда недопустима».
 *
 * Строки «Сервер проверяет ответ…» здесь больше нет и быть не может.
 */
export default function ArenaMatchScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  // Высота строки числом не растёт вместе с системным шрифтом: при крупном
  // кегле объяснения наезжали строка на строку. См. use_arena_font_scale.
  const fontScale = useArenaFontScale();
  const titleLine = { lineHeight: 26 * fontScale };
  const hintLine = { lineHeight: 20 * fontScale };
  const bigHintLine = { lineHeight: 21 * fontScale };
  const params = useLocalSearchParams<{ matchId?: string }>();
  const matchId = typeof params.matchId === 'string' ? params.matchId : null;
  const active = useRuntimeActive();
  const reduceMotion = useReduceMotion();
  const playSound = useArenaSound();

  const [plan, setPlan] = useState<ArenaMatchPlanWire | null>(null);
  const [planError, setPlanError] = useState(false);
  /**
   * Почему не вошли. Владелец (D-72): рейтинг без сети начать нельзя, и игрок
   * должен видеть ПРИЧИНУ, а не общее «повторить»: «нет сети» и «матч уже
   * кончился» лечатся по-разному.
   */
  const [entryFailure, setEntryFailure] = useState<ArenaEntryFailure | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [sent, setSent] = useState(false);
  /**
   * Косметика входа — платная. При переписывании экрана она чуть не пропала:
   * раньше она красила карточку принятия дуэли, а карточки больше нет — дуэль
   * принимается сама. Теперь она красит заставку «ты против соперника», то есть
   * ровно тот момент входа, за который её и покупали.
   */
  const [entryCosmetic, setEntryCosmetic] = useState<string | undefined>();
  const entryTreatment = arenaCosmeticDefinition(entryCosmetic)?.treatment;

  useEffect(() => {
    if (!active) return;
    void arenaExpansionHome()
      .then((home) => setEntryCosmetic(home.wallet.equippedBySlot.entry))
      .catch(() => {});
  }, [active]);

  /* ---- вход в матч: принять, затем взять план ---- */
  useEffect(() => {
    if (!matchId || plan || planError) return;
    let alive = true;
    const enteredAtMs = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Пока ОБА не приняли дуэль, плана не существует — сервер откажет.
    // Поэтому вход это короткий цикл, ограниченный окном принятия. Это не
    // опрос хода матча: он длится секунды и только ДО старта, а во время
    // самого матча к серверу не обращаются вовсе.
    const attempt = () => {
      if (!alive) return;
      void arenaV2MatchAccept(matchId)
        .then((response) => {
          if (!alive) return;
          if (response.viewerSeat) rememberArenaViewerSeat(matchId, response.viewerSeat);
          const step = arenaEntryStep({
            state: String(response.state ?? ''),
            elapsedSinceEntryMs: Date.now() - enteredAtMs,
          });
          // Соперник не принял вызов. Это не ошибка сервера, и говорить о
          // ней надо иначе, чем об отказе сети.
          if (step === 'give_up') { setEntryFailure('no_opponent'); setPlanError(true); return; }
          if (step === 'accept') {
            timer = setTimeout(attempt, ARENA_ACCEPT_RETRY_MS);
            return;
          }
          return arenaMatchPlanRequest(matchId).then((planned) => {
            if (!alive) return;
            // Разбор закрытый: не сошёлся целиком — матч не начинаем вовсе.
            if (!planned) { setPlanError(true); return; }
            rememberArenaViewerSeat(matchId, planned.plan.viewerSeat);
            setPlan(planned.plan);
          });
        })
        .catch((reason) => {
          if (!alive) return;
          setEntryFailure(arenaEntryFailure(reason));
          setPlanError(true);
        });
    };
    attempt();

    return () => {
      alive = false;
      if (timer !== null) clearTimeout(timer);
    };
  }, [active, matchId, plan, planError]);

  /* ---- живой прогресс соперника ---- */
  const live = useArenaOpponentLive(matchId, plan?.opponent.seat ?? null, active && Boolean(plan));
  const liveSeat = useMemo(
    () => (plan ? arenaParseLiveSeat(live.value, plan.tasks.length) : null),
    [live.value, plan],
  );
  /**
   * Два источника, один код. У бота ходы приезжают вместе с планом, у живого
   * соперника — из канала, и нигде не спрашивается, кто перед нами: такая
   * развилка сразу утекла бы в поведение экрана.
   */
  const opponentTicks = useMemo(
    () => (plan ? arenaMergeOpponentTicks(plan.opponentTicks, liveSeat?.ticks ?? []) : []),
    [plan, liveSeat],
  );

  /**
   * Снимок матча с диска.
   *
   * Он писался на каждой границе задания — и НИКТО его не читал. То есть цена
   * записи платилась, а обещанное свойство «матч переживает перезапуск» не
   * работало: приложение убили посреди матча — и он начинался заново, с
   * первого задания и с обнулённым временем.
   *
   * Восстанавливаем только снимок ЭТОГО матча и только пока он не доигран —
   * это проверяет сам модуль хранения.
   */
  const [restored, setRestored] = useState<ArenaLocalMatchState | null>(null);
  const [restoreChecked, setRestoreChecked] = useState(false);
  useEffect(() => {
    if (!matchId) { setRestoreChecked(true); return; }
    let alive = true;
    void arenaLoadMatch(AsyncStorage as unknown as ArenaKeyValueStore, Date.now(), matchId)
      .then((stored) => { if (alive && stored) setRestored(stored.state); })
      .catch(() => {})
      .finally(() => { if (alive) setRestoreChecked(true); });
    return () => { alive = false; };
  }, [matchId]);

  /**
   * План подставляется в машину только когда проверка снимка закончилась:
   * иначе матч успел бы начаться с нуля и затереть восстановленное состояние.
   */
  const match = useArenaLocalMatch({
    plan: restoreChecked ? plan : null,
    restored,
    opponentTicks,
  });

  /* ---- публикация своего хода: одна запись на задание, не больше ---- */
  const publishedRef = useRef<number[]>([]);
  const finishPublishedRef = useRef(false);
  useEffect(() => {
    if (!matchId || !plan || !match) return;
    const decision = arenaLivePublishPlan({
      publishedTaskIndexes: publishedRef.current,
      closedTicks: arenaClosedTicks(match.state),
      finished: match.state.phase === 'finished',
      finishPublished: finishPublishedRef.current,
    });
    // null означает «писать нечего». Это и есть предохранитель против роста
    // счёта за базу: экран дёргает этот эффект на каждое изменение состояния,
    // а запись случается только на границе задания.
    if (!decision) return;
    decision.ticks.forEach((tick) => publishedRef.current.push(tick.taskIndex));
    if (decision.finished) finishPublishedRef.current = true;
    void arenaPublishLiveTicks({
      matchId,
      seat: plan.viewerSeat,
      ticks: arenaClosedTicks(match.state),
      finished: decision.finished,
    });
  }, [matchId, plan, match]);

  /* ---- отчёт: тоже один запрос ---- */
  useEffect(() => {
    if (!matchId || !plan || !match?.report || sent) return;
    // Сохраняем суженное значение до async-границы: объект `match` живёт в
    // React-состоянии и TypeScript справедливо не переносит его narrowing
    // внутрь отложенной функции.
    const report = match.report;
    setSent(true);
    void (async () => {
      // Сначала durable intent, потом сеть. Если процесс погибнет в любой
      // точке ниже, либо outbox уже содержит отчёт, либо финальный снимок всё
      // ещё восстановит тот же отчёт с тем же matchId.
      const durable = await arenaOutboxEnqueue(
        AsyncStorage as unknown as ArenaKeyValueStore,
        report as ArenaMatchReport,
        Date.now(),
        plan.rulesVersion,
      );
      if (durable) {
        await arenaClearMatch(AsyncStorage as unknown as ArenaKeyValueStore);
      }

      let rejected = false;
      try {
        const response = await arenaV2MatchFinish({
          matchId,
          report: arenaMatchReportToWire(report, plan.rulesVersion),
        });
        await arenaOutboxRemove(AsyncStorage as unknown as ArenaKeyValueStore, matchId);
        await arenaClearMatch(AsyncStorage as unknown as ArenaKeyValueStore);
        // Соперник ещё не сдался: спрашиваем РОВНО ОДИН раз, когда истечёт
        // окно ожидания. Опрос по кругу здесь запрещён — он и есть тот самый
        // хартбит, от которого растёт счёт за базу.
        if (!response.settled && typeof response.settleProbeAtMs === 'number') {
          const waitMs = Math.max(0, response.settleProbeAtMs - Date.now());
          setTimeout(() => { void arenaV2MatchSettle(matchId).catch(() => {}); }, waitMs);
        }
      } catch (reason) {
        const failure = arenaOutboxClassify(reason);
        // Отказ по существу дослать нельзя: сервер не примет его и завтра.
        if (failure === 'rejected') {
          rejected = true;
          await arenaOutboxRemove(AsyncStorage as unknown as ArenaKeyValueStore, matchId);
          await arenaClearMatch(AsyncStorage as unknown as ArenaKeyValueStore);
        }
        // При временном отказе durable outbox уже владеет отчётом. Если даже
        // его записать не удалось, финальный снимок намеренно остаётся на
        // диске и при следующем входе создаст тот же отчёт заново.
      } finally {
        router.replace({
          pathname: '/arena_results',
          params: rejected ? { matchId, reportRejected: '1' } : { matchId },
        } as never);
      }
    })();
  }, [matchId, match?.report, plan, router, sent]);

  /* ---- выход ---- */
  const forfeitNow = useCallback(() => {
    match?.abandon();
    if (matchId) void arenaV2Forfeit(matchId).catch(() => {});
    router.replace('/arena' as never);
  }, [match, matchId, router]);

  const confirmForfeit = useCallback(() => {
    Alert.alert(arenaText(lang, 'leaveTitle'), arenaText(lang, 'leaveBody'), [
      { text: arenaText(lang, 'stay'), style: 'cancel' },
      { text: arenaText(lang, 'leaveConfirm'), style: 'destructive', onPress: forfeitNow },
    ]);
  }, [forfeitNow, lang]);

  useEffect(() => {
    if (!active) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmForfeit();
      return true;
    });
    return () => subscription.remove();
  }, [active, confirmForfeit]);

  /* ---- звуки, привязанные к смене состояния ---- */
  const lastTaskRef = useRef(-1);
  const lastComboRef = useRef(0);
  const rivalToldRef = useRef(-1);
  useEffect(() => {
    if (!match) return;
    const state = match.state;
    // Новое задание приехало.
    if (state.taskIndex !== lastTaskRef.current && state.phase === 'reading') {
      lastTaskRef.current = state.taskIndex;
      playSound('taskIn');
    }
    // Серия: рост и обрыв звучат по-разному, потому что значат разное.
    if (state.comboRun > lastComboRef.current) {
      playSound(lastComboRef.current === 0 ? 'comboStart' : 'comboUp');
    } else if (state.comboRun === 0 && lastComboRef.current >= 2) {
      playSound('comboBreak');
    }
    lastComboRef.current = state.comboRun;
    // Соперник ответил — ровно один раз на задание, иначе индикатор трещит.
    const tick = state.opponentByTask[state.taskIndex];
    if (tick && rivalToldRef.current !== state.taskIndex) {
      rivalToldRef.current = state.taskIndex;
      playSound('opponentAnswered');
    }
  }, [match, playSound]);

  const hud = useMemo(
    () => (plan && match ? arenaMatchHud(plan, match.state, match.phase, arenaMonotonicNowMs()) : null),
    [plan, match],
  );

  const ownScore = hud?.matchStars ?? 0;
  const rivalScore = hud?.opponentMatchStars ?? null;
  const immersive = hud?.mode ? arenaQuestionLayout(hud.mode).immersive : false;
  const playerIdentities: readonly ArenaPlayer[] = useMemo(() => {
    if (!plan) return [];
    const you: ArenaPlayer = {
      uid: plan.viewerSeat, name: arenaText(lang, 'you'), rank: 0, rating: 0, score: 0, correct: 0,
    };
    const rival: ArenaPlayer = {
      uid: plan.opponent.seat,
      name: plan.opponent.name || arenaText(lang, 'opponent'),
      ...(plan.opponent.avatar ? { avatar: plan.opponent.avatar } : {}),
      ...(plan.opponent.aura ? { aura: plan.opponent.aura } : {}),
      rank: plan.opponent.rank,
      rating: 0,
      score: 0,
      correct: 0,
    };
    return plan.viewerSeat === 'a' ? [you, rival] : [rival, you];
  }, [lang, plan]);
  const players = useMemo(() => {
    if (!plan) return [];
    const you = playerIdentities.find((player) => player.uid === plan.viewerSeat);
    const rival = playerIdentities.find((player) => player.uid === plan.opponent.seat);
    if (!you || !rival) return [];
    const scoredYou = { ...you, score: ownScore };
    const scoredRival = { ...rival, score: rivalScore };
    return plan.viewerSeat === 'a' ? [scoredYou, scoredRival] : [scoredRival, scoredYou];
  }, [ownScore, plan, playerIdentities, rivalScore]);

  /**
   * Просрочка и звёзды звучат по ЗАКРЫТОМУ заданию, а не по фазе: фаза может
   * перерисоваться дважды, а закрытый исход появляется ровно один раз.
   */
  const lastOutcomeRef = useRef(0);
  useEffect(() => {
    if (!match) return;
    const outcomes = match.state.outcomes;
    if (outcomes.length <= lastOutcomeRef.current) return;
    lastOutcomeRef.current = outcomes.length;
    const last = outcomes[outcomes.length - 1];
    if (last.status === 'timeout') playSound('timeout');
    if (last.mode === 'speed_match' && last.resolvedPairs >= 4) playSound('pairClear');
    const award = match.state.awards[match.state.awards.length - 1];
    if (award && award.stars > 0) {
      playSound('starFly');
      // Первым ответил — третья звезда, ради которой в Арене и торопятся.
      if (award.firstBonus > 0) playSound('answerFirst');
    }
  }, [match, playSound]);

  /**
   * Можно ли вообще нарисовать текущее задание. Считается ДО отрисовки: разбор
   * задания бросает исключение, и внутри отрисовки оно уносит весь матч.
   */
  const taskRenderable = useMemo(
    () => (hud?.task ? arenaTaskRenderable(arenaPlanTaskToPublic(hud.task)) : true),
    [hud?.task],
  );

  // Сломанное задание закрывается как пропущенное — ровно один раз на задание.
  const brokenReportedRef = useRef<number | null>(null);
  useEffect(() => {
    const taskIndex = hud?.task?.taskIndex;
    if (!match || taskRenderable || typeof taskIndex !== 'number') return;
    if (brokenReportedRef.current === taskIndex) return;
    brokenReportedRef.current = taskIndex;
    match.reportBroken(taskIndex);
  }, [match, hud?.task?.taskIndex, taskRenderable]);

  const onSubmit = useCallback((answer: unknown) => {
    const correct = match?.answer(answer);
    // Звук берётся из ВЕРДИКТА, который уже посчитан локально: сети между
    // нажатием и звуком нет вовсе, поэтому он попадает в тот же кадр.
    playSound(correct ? 'answerCorrect' : 'answerWrong');
  }, [match, playSound]);

  const onSpeedAttempt = useCallback((pairIndex: number, selectedIndex: number) => {
    const correct = match?.tapPair(pairIndex, selectedIndex) ?? false;
    playSound(correct ? 'pairMatch' : 'pairMiss');
    return Promise.resolve(correct);
  }, [match, playSound]);

  if (planError) {
    /**
     * Причин не начаться четыре, и они требуют разных слов и разных кнопок.
     * Раньше три из них сводились к одному слову «Повторить» — глаголу вместо
     * объяснения, да ещё и без кнопки повтора: игрок читал приказ, который
     * нечем выполнить.
     */
    const failure = arenaEntryFailureCopy(entryFailure);
    return (
      <ArenaScreen title={arenaText(lang, 'title')} variant="play" scroll={false}>
        <View style={styles.center}>
          <Text accessibilityLiveRegion="polite" style={[styles.failureTitle, titleLine, { color: P.text }]}>
            {arenaText(lang, failure.title)}
          </Text>
          <Text style={[styles.failureHint, hintLine, { color: P.muted }]}>{arenaText(lang, failure.hint)}</Text>
          {failure.canRetry ? (
            <V2Cta onPress={() => { setEntryFailure(null); setPlanError(false); }}>
              {arenaText(lang, 'retry')}
            </V2Cta>
          ) : null}
          {/* зачем: соперник не принял вызов — человек всё ещё хочет играть,
              а единственной кнопкой была «На главную». Его выкидывало из
              Арены за чужой отказ (владелец, 2026-08-16: «появился экран
              соперник не принял вызов»). Возвращаем в поиск одним нажатием,
              новым requestId — старый билет уже закрыт сервером. */}
          {entryFailure === 'no_opponent' ? (
            <V2Cta onPress={() => router.replace({
              pathname: '/arena_matchmaking',
              params: { mode: 'quick', requestId: createArenaRequestId('queue') },
            } as never)}>
              {arenaText(lang, 'quick')}
            </V2Cta>
          ) : null}
          <V2Cta tone="ghost" onPress={() => router.replace('/arena' as never)}>{arenaText(lang, 'home')}</V2Cta>
        </View>
      </ArenaScreen>
    );
  }

  if (!plan || !match || !hud) {
    /**
     * Соперник уже найден матчмейкером. Здесь оба клиента принимают найденную
     * дуэль и получают план, поэтому повторное «ждём второго игрока» было
     * неправдой и выглядело как возврат обратно в поиск.
     */
    return (
      <ArenaScreen title={arenaText(lang, 'title')} variant="play" scroll={false}>
        <View style={styles.center}>
          <Text accessibilityLiveRegion="polite" style={[styles.failureTitle, titleLine, { color: P.text }]}>
            {arenaText(lang, 'preparingDuel')}
          </Text>
          <Text style={[styles.failureHint, hintLine, { color: P.muted }]}>{arenaText(lang, 'preparingDuelHint')}</Text>
        </View>
      </ArenaScreen>
    );
  }

  // Заставка «ты против соперника» и отсчёт идут поверх уже загруженного
  // матча: пока игрок её смотрит, готовиться больше не к чему.
  if (!introDone && match.phase.kind === 'countdown') {
    return (
      <ArenaScreen title={arenaText(lang, 'title')} variant="play" scroll={false}>
        <Animated.View
          style={styles.intro}
          entering={reduceMotion ? FadeIn.duration(120)
            : entryTreatment === 'entry_trail' ? SlideInRight.duration(260)
            : entryTreatment === 'entry_burst' ? ZoomIn.duration(240)
            : entryTreatment === 'entry_crown' ? FadeInDown.duration(300)
            : FadeIn.duration(160)}
        >
        <ArenaVersusIntro
          you={playerIdentities.find((player) => player.uid === plan.viewerSeat)}
          opponent={playerIdentities.find((player) => player.uid === plan.opponent.seat)}
          goLabel={arenaText(lang, 'title')}
          onDone={() => setIntroDone(true)}
        />
        </Animated.View>
      </ArenaScreen>
    );
  }

  const opponentAnswered = hud.opponent.kind === 'answered';
  /**
   * Живой канал соперника молчит из-за СВЯЗИ, а не потому, что соперник ничего
   * не делает. Без этой оговорки игрок читает пустое место как «соперник
   * пассивен», спокойно доигрывает — и получает в конце неожиданное поражение.
   *
   * Показывается только пока от соперника не пришло НИ ОДНОГО хода: как только
   * ход появился (из канала или из плана), канал очевидно работает.
   */
  const rivalUnseen = Boolean(live.error)
    && Object.keys(match.state.opponentByTask).length === 0;
  return (
    <ArenaScreen
      title={arenaText(lang, 'title')}
      subtitle={`${hud.taskOrdinal} / ${hud.taskCount}`}
      variant="play"
      scroll={false}
      onBack={confirmForfeit}
    >
      <ArenaPlayers compact={immersive} players={players} active={active} animateScore />
      <V2Segments total={hud.taskCount} done={Math.max(0, hud.taskOrdinal - 1)} />

      {hud.task ? (
        <Animated.View
          key={hud.task.taskId}
          entering={immersive ? undefined : reduceMotion ? FadeIn.duration(120) : SlideInRight.duration(v2motion.taskSwapMs)}
          style={styles.question}
        >
          <View style={styles.hudRow}>
            {hud.timer ? (
                  <ArenaTimerRing
                    durationMs={hud.timer.durationMs}
                    elapsedMs={hud.timer.elapsedMs}
                    size={immersive ? 62 : 84}
                    stroke={immersive ? 6 : 7}
                    paused={!active}
                  />
                ) : <View style={[styles.timerHole, immersive ? styles.timerHoleCompact : null]} />}
            <View style={styles.hudSide}>
              <ArenaComboMeter streak={hud.combo.streak} bonusLabel={`+1★`} size="compact" />
              {/* Индикатор соперника. Владелец: загорается СРАЗУ, как тот ответил. */}
              {rivalUnseen ? (
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={[styles.rival, { color: P.muted }]}
                  accessibilityLiveRegion="polite"
                >
                  {arenaText(lang, 'rivalUnseen')}
                </Text>
              ) : null}
              {opponentAnswered ? (
                <Animated.View entering={FadeIn.duration(140)}>
                  {/* Имя соперника плюс отметка ответа: при крупном системном
                      шрифте это обязано остаться одной строкой, иначе шапка
                      растёт и выдавливает само задание. */}
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.rival, { color: P.gold }]}
                    accessibilityLiveRegion="polite"
                  >
                    {plan.opponent.name || arenaText(lang, 'opponent')} · {arenaText(lang, 'opponentAnsweredBadge')}
                  </Text>
                </Animated.View>
              ) : null}
            </View>
          </View>

          {/*
            Испорченное задание раньше роняло ВЕСЬ экран: разбор задания бросает
            исключение, а зовут его во время отрисовки. Машина матча умеет
            закрывать такое задание как сломанное и играть дальше — просто
            никто ей об этом не сообщал.
          */}
          {/*
            Матч восстановлен после холодного старта: задание, открытое в тот
            момент, закрылось просрочкой. Раньше игрок просто видел потерянное
            задание и не понимал, за что.
          */}
          {match.state.clockSuspect ? (
            <View style={styles.clockNote}>
              <Text accessibilityLiveRegion="polite" style={[styles.failureHint, hintLine, { color: P.muted }]}>
                {arenaText(lang, 'clockJumped')}
              </Text>
              <Text style={[styles.failureHint, hintLine, { color: P.muted }]}>{arenaText(lang, 'clockJumpedHint')}</Text>
            </View>
          ) : null}

          {taskRenderable ? (
            <ArenaQuestion
              task={arenaPlanTaskToPublic(hud.task)}
              locked={!hud.interactive}
              submitLabel={arenaText(lang, 'submit')}
              onSubmit={onSubmit}
              onSpeedAttempt={onSpeedAttempt}
            />
          ) : (
            <View style={styles.center}>
              <Text accessibilityLiveRegion="polite" style={[styles.failureTitle, titleLine, { color: P.text }]}>
                {arenaText(lang, 'taskBroken')}
              </Text>
              <Text style={[styles.failureHint, hintLine, { color: P.muted }]}>{arenaText(lang, 'taskBrokenHint')}</Text>
            </View>
          )}

          {/* Разбор награды: почему звёзд именно столько, а не больше. */}
          {hud.award ? (
            <Animated.View entering={FadeInDown.duration(180)} style={styles.awardBox}>
              <Text style={[styles.awardHead, { color: hud.award.stars > 0 ? P.accent : P.danger }]}>
                {hud.award.stars > 0 ? `+${hud.award.stars}★` : arenaText(lang, 'wrong')}
              </Text>
              {arenaAwardLines(hud.award).map((line, index) => (
                <Text
                  key={`${line.reason}-${index}`}
                  style={[styles.awardLine, { color: line.state === 'earned' ? P.text : P.muted }]}
                >
                  {line.state === 'earned' ? `+${line.stars}★` : `—`} · {line.reason}
                </Text>
              ))}
            </Animated.View>
          ) : null}

          {hud.starsToFly > 0 ? <ArenaStarFlight amount={hud.starsToFly} /> : null}
        </Animated.View>
      ) : (
        <View style={styles.center}>
          <V2Card style={styles.doneCard}>
            <Text style={[styles.big, { color: P.text }]}>{hud.matchStars}★</Text>
            {/* Матч доигран, идёт отправка итога. «Загрузка» здесь неправда:
                считать уже нечего, счёт на экране. */}
            <Text style={[styles.hint, bigHintLine, { color: P.muted }]}>{arenaText(lang, 'sendingResult')}</Text>
          </V2Card>
        </View>
      )}
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 12 },
  // Высота строк задаётся на месте: она умножается на системный масштаб.
  failureTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  failureHint: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  clockNote: { gap: 2, paddingHorizontal: 8 },
  intro: { flex: 1 },
  question: { flex: 1, justifyContent: 'center', gap: 10 },
  hudRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  hudSide: { flex: 1, alignItems: 'flex-end', gap: 6 },
  timerHole: { width: 84, height: 84 },
  timerHoleCompact: { width: 62, height: 62 },
  rival: { fontSize: 13, fontWeight: '800' },
  awardBox: { gap: 2, alignItems: 'center' },
  awardHead: { fontSize: 20, fontWeight: '900' },
  awardLine: { fontSize: 12, fontWeight: '700' },
  doneCard: { gap: 10, alignItems: 'center' },
  big: { fontSize: 34, fontWeight: '900', textAlign: 'center' },
  hint: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
