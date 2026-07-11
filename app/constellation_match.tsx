// ════════════════════════════════════════════════════════════════════════════
// constellation_match.tsx — живой матч «Созвездий» (спек F3/A3/A11, v1).
//
// Экран = проекция серверного матча: подписка на constellation_matches/{id}
// и свой constellation_players-док; ЛЮБОЙ ход — только callable (никаких
// прямых записей). Фазы сервера: choose (выбор цели/щит) → answer (цепочка
// вопросов с правилом после каждого ответа) → резолв (сервер перерисовывает
// stars/roundEvents). Матч живёт на сервере — экран можно убить/вернуться.
//
// Performance Bible: секундный тик дедлайна — ≥1000мс, гейт фокусом, очистка
// (внесён в owner-контракт); вечных анимаций нет; freezeOnBlur:false —
// осознанное realtime-исключение (perf_freeze_contract).
// v1-хвосты (осознанно, добавятся полировкой): pan/pinch карты, зрительская
// live-трансляция чужой дуэли (F3a), резолв-синематик (сейчас — вспышка+хаптика).
// ════════════════════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DuoPressable from '../components/DuoPressable';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import {
  hapticCelebrate, hapticError, hapticHeavyImpact, hapticLightImpact,
  hapticMediumImpact, hapticSuccess, hapticWarning,
} from '../hooks/use-haptics';
import { useTimerTickCue } from '../hooks/use-timer-tick-cue';
import { useDevForceLowEnd, setDevForceLowEnd } from '../hooks/dev_force_low_end';
import { ENABLE_DEV_TOOLS } from './config';
import {
  submitAnswer,
  submitChooseTarget,
  submitEmote,
  submitPhaseTick,
  submitUseShield,
  subscribeConstellationMatch,
  subscribeMyConstellationPlayer,
} from './services/constellations_db';
import { ensureArenaAuthUid } from './user_id_policy';
import { CONSTELLATION_SLOT_COLORS } from './constellation_sky_map';
import { ConstellationZoomMap } from './constellation_zoom_map';
import { ConstellationStarfield } from './constellation_starfield';
import { starName } from './constellation_star_names';
import { hexKey, neighborsInMap, parseHexKey, ringOf } from './constellations_hex';
import type {
  ConstellationMatch,
  ConstellationMatchPlayer,
  ConstellationPlayerPrivate,
} from './types/constellations';

/** Эмоуты F10: id серверные, тексты — на языке матча (studyTarget en v1). */
// Реплики-эмоуты на языке матча (studyTarget=en) + эмодзи-иконка. id совпадают
// с серверными CONSTELLATION_EMOTE_IDS (submit.ts). Перевод — мелким шрифтом в меню.
const EMOTES: ReadonlyArray<{ id: string; emoji: string; text: string; hint: string }> = [
  { id: 'well_played', emoji: '👏', text: 'Well played!', hint: 'отлично' },
  { id: 'too_easy', emoji: '😎', text: 'Too easy!', hint: 'легко' },
  { id: 'on_fire', emoji: '🔥', text: "I'm on fire!", hint: 'в ударе' },
  { id: 'lucky_star', emoji: '⭐', text: 'Lucky star!', hint: 'везёт' },
  { id: 'thinking', emoji: '🤔', text: 'Let me think…', hint: 'думаю' },
  { id: 'not_bad', emoji: '😏', text: 'Not bad…', hint: 'неплохо' },
  { id: 'ouch', emoji: '😅', text: 'Ouch!', hint: 'ай' },
  { id: 'gg', emoji: '🤝', text: 'GG!', hint: 'хорошая игра' },
];
const EMOTE_SHOW_MS = 3000;
// Длительности фаз (сек), fallback к дефолтам конфига. И баннер-кольцо, и
// полоса квиза считают ОТ ОДНОГО значения по фазе — иначе они наполняются с
// разной скоростью (аудит: рассинхрон таймеров дуэли). Дуэль идёт внутри
// фазы answer и делит её общий дедлайн, отдельного per-question таймера нет.
const CHOOSE_PHASE_SEC = 12;
const ANSWER_PHASE_SEC = 38;

export default function ConstellationMatchScreen() {
  const router = useRouter();
  const { matchId: rawMatchId } = useLocalSearchParams<{ matchId?: string }>();
  const matchId = typeof rawMatchId === 'string' ? rawMatchId : '';
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const focused = useIsScreenFocused();
  const insets = useSafeAreaInsets();
  // dev-only тумблер авто-лайта (F9) — см. кнопку «лайт» в HUD ниже.
  const devForceLowEnd = useDevForceLowEnd();

  const [uid, setUid] = useState<string | null>(null);
  const [match, setMatch] = useState<ConstellationMatch | null>(null);
  const [me, setMe] = useState<ConstellationPlayerPrivate | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [shieldMode, setShieldMode] = useState(false);
  // Обратная связь на ответ: индекс выбранной плитки + верно/неверно, для
  // короткой подсветки БЕЗ модалки. qIndex — чтобы фидбек не «прилип» к
  // следующему вопросу (сбрасывается при смене вопроса/раунда).
  const [answerFeedback, setAnswerFeedback] = useState<{ qIndex: number; index: number; correct: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [exitAsk, setExitAsk] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownDoneRef = useRef(false);
  // Заставка дуэли (2.7): показывается один раз на каждый вход в дуэль-раунд.
  const [duelIntro, setDuelIntro] = useState(false);
  const duelIntroRoundRef = useRef(0);
  const [emoteMenuOpen, setEmoteMenuOpen] = useState(false);
  const navigatedRef = useRef(false);
  const prevRoundRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2600);
  }, []);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const netErrText = useCallback(() => triLang(lang, {
    ru: 'Нет связи — попробуй ещё раз', uk: 'Немає зв’язку — спробуй ще раз',
    es: 'Sin conexión — inténtalo de nuevo', 'pt-BR': 'Sem conexão — tente de novo',
    vi: 'Mất kết nối — thử lại', id: 'Tidak ada koneksi — coba lagi',
    tr: 'Bağlantı yok — tekrar dene', pl: 'Brak połączenia — spróbuj ponownie',
  }), [lang]);

  useEffect(() => { void ensureArenaAuthUid().then(setUid); }, []);
  // Dev-форс живёт только в рамках этого экрана матча — не должен «утекать»
  // и подменять реальный тир на результатах/интро после выхода.
  useEffect(() => () => setDevForceLowEnd(null), []);

  // Подписки на матч и свой док.
  useEffect(() => {
    if (!matchId || !uid) return;
    const unsubMatch = subscribeConstellationMatch(matchId, setMatch);
    const unsubMe = subscribeMyConstellationPlayer(matchId, uid, setMe);
    return () => { unsubMatch(); unsubMe(); };
  }, [matchId, uid]);

  // Отсчёт 3-2-1 перед первым раундом — задаёт ритм и «привлекает внимание».
  // Один раз при первом появлении активного матча.
  useEffect(() => {
    if (countdownDoneRef.current || !match || match.stage !== 'active') return;
    countdownDoneRef.current = true;
    let n = 3;
    setCountdown(n);
    hapticMediumImpact();
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setCountdown(0); // «GO!»
        hapticSuccess();
        setTimeout(() => setCountdown(null), 700);
      } else {
        setCountdown(n);
        hapticMediumImpact();
      }
    }, 850);
    return () => clearInterval(id);
  }, [match]);

  // Заставка дуэли (2.7): при входе в дуэль-раунд — короткая «аватар vs аватар»
  // с хаптикой. Один раз на раунд (duelIntroRoundRef). Гейт focused (не в фоне).
  useEffect(() => {
    if (!focused || !match || match.stage !== 'active') return;
    const inDuel = me?.kind === 'duel' && me.round === match.round && match.phase === 'answer';
    if (!inDuel) return;
    if (duelIntroRoundRef.current === match.round) return;
    duelIntroRoundRef.current = match.round;
    setDuelIntro(true);
    hapticHeavyImpact();
    const id = setTimeout(() => setDuelIntro(false), 1800);
    return () => clearTimeout(id);
  }, [focused, match, me]);

  // Секундный тик дедлайна фазы (гейт фокусом, очистка — owner-контракт).
  useEffect(() => {
    if (!focused) return;
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [focused]);

  // Звук тика на последних 3 секундах фазы (жалоба «всё мертво» без звука).
  // Один тик на каждое значение секунд — не дублируется при лишних ре-рендерах.
  const { playTimerTick } = useTimerTickCue();
  const lastTickSecRef = useRef<number | null>(null);
  useEffect(() => {
    if (!focused || !match || match.stage !== 'active') return;
    const left = Math.max(0, Math.ceil(match.phaseDeadlineAt / 1000) - nowSec);
    if (left > 0 && left <= 3 && lastTickSecRef.current !== left) {
      lastTickSecRef.current = left;
      playTimerTick();
    }
    if (left === 0) lastTickSecRef.current = null;
  }, [focused, match, nowSec, playTimerTick]);

  // Анти-зависание: когда дедлайн фазы истёк, клиент сам просит сервер
  // форсировать переход раунда — не ждём минутный watchdog-cron (иначе фаза
  // «висит» до ~60с для одинокого игрока против ботов). Идемпотентно по
  // раунду+фазе; сервер проверяет дедлайн сам. Дёргаем один раз на фазу.
  const tickSentRef = useRef<string>('');
  useEffect(() => {
    if (!focused || !match || !uid) return;
    if (match.stage !== 'active') return;
    const deadlineSec = Math.ceil(match.phaseDeadlineAt / 1000);
    if (nowSec < deadlineSec) return;
    const tickKey = `${match.round}:${match.phase}`;
    if (tickSentRef.current === tickKey) return;
    tickSentRef.current = tickKey;
    void submitPhaseTick(matchId, uid, match.round, match.phase).catch(() => {
      // Не вышло — сбросим маркер, чтобы следующий тик повторил попытку.
      tickSentRef.current = '';
    });
  }, [focused, match, uid, matchId, nowSec]);

  const myPublic: ConstellationMatchPlayer | null = useMemo(
    () => match?.players.find((p) => p.uid === uid) ?? null,
    [match, uid],
  );
  const mySlot = myPublic?.slot ?? null;

  // Резолв: новый раунд → вспышка последнего захвата + хаптика + сброс локального UI.
  useEffect(() => {
    if (!match) return;
    if (match.round !== prevRoundRef.current) {
      prevRoundRef.current = match.round;
      setSheetKey(null);
      setShieldMode(false);
      setAnswerFeedback(null);
      const capture = match.roundEvents.find(
        (e) => (e.type === 'capture' || e.type === 'duel_capture') && e.starKey,
      );
      if (capture?.starKey) {
        setFlashKey(capture.starKey);
        setTimeout(() => setFlashKey(null), 1100);
      }
      // Хаптика различает исход (8.1): победа и поражение больше не одинаковы.
      // Приоритет: выбит → тяжёлый удар; стал падающим → тревога; мой захват/
      // выбивание врага → празднование; иначе есть события → нейтральный удар.
      const myWin = mySlot !== null && match.roundEvents.some(
        (e) => (e.type === 'capture' || e.type === 'duel_capture' || e.type === 'eliminated') && e.slot === mySlot,
      );
      // Мой щит возрождённого отразил удар по дому: это хороший исход, не «пробили».
      const myHomeHeld = mySlot !== null && match.roundEvents.some(
        (e) => e.type === 'home_shielded' && e.slot === mySlot,
      );
      if (myPublic?.status === 'out') hapticHeavyImpact();
      else if (myPublic?.status === 'falling') hapticWarning();
      else if (myWin) hapticCelebrate();
      else if (myHomeHeld) hapticSuccess();
      else if (match.roundEvents.length > 0) hapticMediumImpact();
    }
  }, [match, mySlot, myPublic]);

  // Финиш → экран результатов.
  useEffect(() => {
    if (!match || navigatedRef.current) return;
    if (match.stage === 'finished') {
      navigatedRef.current = true;
      router.replace({ pathname: '/constellation_results', params: { matchId } } as any);
    }
  }, [match, matchId, router]);

  // Легальные цели фазы выбора: соседи моих звёзд (сервер валидирует повторно).
  const legalTargets = useMemo(() => {
    if (!match || mySlot === null || myPublic?.status !== 'alive') return [];
    if (match.phase !== 'choose') return [];
    const out = new Set<string>();
    for (const [key, star] of Object.entries(match.stars)) {
      if (star.owner !== mySlot) continue;
      const h = parseHexKey(key);
      if (!h) continue;
      for (const n of neighborsInMap(h)) {
        const nKey = hexKey(n);
        if (match.stars[nKey]?.owner !== mySlot) out.add(nKey);
      }
    }
    return [...out];
  }, [match, mySlot, myPublic]);

  // Свои звёзды — легальные цели РЕЖИМА ЩИТА (жалоба «экран как будто пустой/
  // прыгает»: раньше подсветка полностью гасла в shieldMode, будто пропали
  // все свои звёзды). Теперь подсвечиваем именно то, что можно щитить.
  const myStarKeys = useMemo(() => {
    if (!match || mySlot === null) return [];
    return Object.entries(match.stars)
      .filter(([, star]) => star.owner === mySlot)
      .map(([key]) => key);
  }, [match, mySlot]);

  const secondsLeft = match ? Math.max(0, Math.ceil(match.phaseDeadlineAt / 1000) - nowSec) : 0;

  // onStarPress СТАБИЛЕН (пустые deps) — иначе каждый snapshot/тик менял бы
  // колбэк и ломал memo карты (главная причина лагов). Актуальное состояние
  // читаем через ref, обновляемый эффектом ниже.
  const starPressStateRef = useRef({
    match, uid, mySlot, myPublic, shieldMode, legalTargets, matchId,
  });
  starPressStateRef.current = { match, uid, mySlot, myPublic, shieldMode, legalTargets, matchId };
  const onStarPress = useCallback((key: string) => {
    const s = starPressStateRef.current;
    if (!s.match || !s.uid || s.mySlot === null) return;
    if (s.match.phase !== 'choose' || s.myPublic?.status !== 'alive') return;
    if (s.shieldMode) {
      if (s.match.stars[key]?.owner === s.mySlot && !s.myPublic.shieldUsed) {
        setShieldMode(false);
        setBusy(true);
        void submitUseShield(s.matchId, s.uid, key)
          .then(() => hapticSuccess())
          .catch(() => hapticError())
          .finally(() => setBusy(false));
      } else {
        // Тап мимо своей звезды в режиме щита — явный отказ, а не тишина
        // (жалоба «непонятно, почему ничего не произошло»).
        hapticError();
      }
      return;
    }
    if (s.legalTargets.includes(key)) {
      hapticLightImpact(); // мгновенный отклик на выбор цели
      setSheetKey(key);
    }
  }, []);

  const confirmTarget = useCallback(() => {
    if (!sheetKey || !uid || busy) return;
    // Оптимистично: закрываем шторку и вибрируем СРАЗУ, не ждём сервер (раньше
    // «Зажечь звезду» висело ~3с до ответа). Результат придёт через onSnapshot;
    // при ошибке — тост, шторка уже закрыта (ход просто не засчитается).
    const key = sheetKey;
    hapticMediumImpact();
    setSheetKey(null);
    setBusy(true);
    void submitChooseTarget(matchId, uid, key)
      .catch(() => { hapticError(); showToast(netErrText()); })
      .finally(() => setBusy(false));
  }, [sheetKey, uid, busy, matchId, showToast, netErrText]);

  const onAnswer = useCallback((answerIndex: number) => {
    if (!me || !uid || busy) return;
    const qIndex = me.answers.length;
    setBusy(true);
    // Идемпотентный ретрай: ОДИН actionId на обе попытки (оффлайн F7 — сабмит
    // не задвоится сервером). При провале обеих — явный тост «нет связи».
    const actionId = `ans_${matchId}_r${me.round}_q${qIndex}`;
    const apply = (res: { correct?: boolean }) => {
      if (res.correct) hapticSuccess(); else hapticError();
      // БЕЗ модалки «Верно/Мимо» (просьба владельца): только мгновенная
      // подсветка выбранной плитки (зелёная/красная), следующий вопрос
      // приходит сам через onSnapshot (me.answers.length++). Подсветку
      // держим коротко, чтобы глаз считал результат до смены вопроса.
      setAnswerFeedback({ qIndex, index: answerIndex, correct: !!res.correct });
    };
    void submitAnswer(matchId, uid, qIndex, answerIndex, actionId)
      .then(apply)
      .catch(() => submitAnswer(matchId, uid, qIndex, answerIndex, actionId)
        .then(apply)
        .catch(() => { hapticError(); showToast(netErrText()); }))
      .finally(() => setBusy(false));
  }, [me, uid, busy, matchId, showToast, netErrText]);

  const onEmote = useCallback((emoteId: string) => {
    if (!uid) return;
    void submitEmote(matchId, uid, emoteId).catch(() => {});
  }, [matchId, uid]);

  // Выход из матча (0.6): матч живёт на сервере, ход будет пропускаться, звёзды
  // остаются, можно вернуться. Явный router.replace на арену (стек после серии
  // replace непредсказуем — back() увёл бы не туда).
  const doExit = useCallback(() => {
    setExitAsk(false);
    navigatedRef.current = true;
    router.replace('/(tabs)/arena' as any);
  }, [router]);

  // Перехват Android hardware back → тот же диалог выхода (пока матч активен).
  useEffect(() => {
    if (!focused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigatedRef.current) return false;
      if (match?.stage === 'finished') return false;
      setExitAsk(true);
      return true; // поглощаем — не уводим с экрана без подтверждения
    });
    return () => sub.remove();
  }, [focused, match?.stage]);

  // Последний свежий эмоут для пузыря.
  const activeEmote = useMemo(() => {
    if (!match || match.emotes.length === 0) return null;
    const last = match.emotes[match.emotes.length - 1];
    if (Date.now() - last.at > EMOTE_SHOW_MS) return null;
    const def = EMOTES.find((e) => e.id === last.emoteId);
    if (!def) return null;
    const sender = match.players.find((p) => p.slot === last.slot);
    return { text: `${def.emoji} ${def.text}`, name: sender?.name ?? '', slot: last.slot };
  }, [match, nowSec]); // nowSec — чтобы пузырь сам гас

  const skyColors = useMemo(
    (): [string, string, string] => [t.bgGradient?.[0] ?? '#0A1124', '#0E1734', '#080D1F'],
    [t],
  );

  if (!match || !myPublic) {
    // Мгновенный первый кадр: финальная геометрия неба, без спиннера (Библия).
    return <LinearGradient colors={skyColors} style={styles.root} />;
  }

  const isChoose = match.phase === 'choose';
  const iAmOut = myPublic.status === 'out';
  const iAmFalling = myPublic.status === 'falling';
  const currentQuestion = !isChoose && me && me.round === match.round && me.answers.length < me.questions.length
    ? me.questions[me.answers.length]
    : null;
  const answeredAll = !isChoose && me && me.round === match.round
    && me.questions.length > 0 && me.answers.length >= me.questions.length;
  const myTargetThisRound = me && me.round === match.round ? me.target : null;
  const isDuel = me?.kind === 'duel' && me.round === match.round;
  // Единая длительность текущей фазы для ОБОИХ таймеров (баннер-кольцо и полоса
  // квиза): считают от одного значения → наполняются синхронно (аудит-фикс).
  const phaseTotalSec = isChoose ? CHOOSE_PHASE_SEC : ANSWER_PHASE_SEC;
  // Мини-контекст цели над квизом (аудит: «не теряется, за что бьюсь»): имя
  // звезды + цвет её нынешнего владельца. Нейтральная звезда — акцент темы.
  const targetOwnerSlot = myTargetThisRound ? match.stars[myTargetThisRound]?.owner ?? null : null;
  const targetLabel = myTargetThisRound ? starName(myTargetThisRound, lang) : null;
  const targetColor = targetOwnerSlot !== null ? CONSTELLATION_SLOT_COLORS[targetOwnerSlot] : t.accent;
  // «N/M сходили» для экрана ожидания (аудит: мёртвое время не должно ощущаться
  // зависанием). Считаем среди живых участников — выбывшие ходов не делают.
  const liveInRound = match.players.filter((p) => p.status !== 'out');
  const doneCount = liveInRound.filter((p) => p.roundDone).length;
  const liveCount = liveInRound.length;
  // Фаза уже answer, но мой player-док ещё не догнал раунд (два независимых
  // Firestore-снапшота — match и player приходят не строго синхронно).
  // Раньше это был пустой экран «вопрос не появляется, хотя таймер идёт»
  // (жалоба); теперь — явный индикатор загрузки на пару кадров.
  const loadingQuestion = !isChoose && !iAmOut && myPublic.status === 'alive'
    && (!me || me.round !== match.round);

  // Данные соперника по дуэли (2.7): аватар/имя/цвет из публичного матч-дока.
  const duelOpp = isDuel && me?.duelOppSlot != null
    ? match.players.find((p) => p.slot === me.duelOppSlot) ?? null
    : null;
  // Мой счёт дуэли = число верных ответов (соперника НЕ раскрываем — анти-чит).
  const myDuelScore = isDuel && me ? me.answers.filter((a) => a.correct).length : 0;
  const duelTotal = me?.questions.length ?? 0;
  // Внезапная смерть = дошли до последнего вопроса дуэли (красная драма).
  const duelSuddenDeath = isDuel && duelTotal > 0 && (me?.answers.length ?? 0) >= duelTotal - 1;

  return (
    <View style={styles.root}>
      <LinearGradient colors={skyColors} style={StyleSheet.absoluteFill} />
      <ConstellationStarfield count={38} />

      {/* HUD: выход, раунд, таймер фазы, фаза */}
      {/* (countdown-оверлей ниже, поверх всего) */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          testID="constellation-match-exit"
          onPress={() => setExitAsk(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.exitBtn}
        >
          <Ionicons name="close" size={18} color={t.textSecond} />
        </TouchableOpacity>
        <View style={[styles.roundBox, { borderColor: t.border }]}>
          <Text style={[styles.roundText, { color: t.textSecond, fontSize: f.caption }]}>
            {triLang(lang, {
              ru: 'раунд', uk: 'раунд', es: 'ronda', 'pt-BR': 'rodada',
              vi: 'vòng', id: 'ronde', tr: 'tur', pl: 'runda',
            })}{' '}
            <Text style={{ color: t.textPrimary, fontWeight: '800' }}>{match.round}</Text>
            /{match.roundsTotal}
          </Text>
        </View>
        {/* Таймер-пилюля убрана из HUD (аудит: три таймера разом): время
            показывает кольцо в баннере фазы — единственный счётчик. */}
        {match.starfall.golden ? (
          <View style={styles.goldChip}>
            <Text style={styles.goldChipText}>◆ {myPublic.starfallEarned}</Text>
          </View>
        ) : null}
        {/* dev-only: ручная проверка авто-лайта (F9) — не собирается в стор-сборку
            и скрыта от обычных игроков (ENABLE_DEV_TOOLS гасится в проде/сторе). */}
        {ENABLE_DEV_TOOLS ? (
          <TouchableOpacity
            testID="constellation-match-dev-lowend-toggle"
            onPress={() => {
              hapticLightImpact();
              setDevForceLowEnd(devForceLowEnd ? null : true);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.devLowEndChip, devForceLowEnd ? styles.devLowEndChipActive : null]}
          >
            <Ionicons name="battery-half-outline" size={12} color={devForceLowEnd ? '#0A0F26' : t.textSecond} />
            <Text style={[styles.devLowEndChipText, devForceLowEnd ? { color: '#0A0F26' } : { color: t.textSecond }]}>
              лайт
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Полоса игроков: аватар + ник + счёт + статус «сходил». Ник реальный
          у всех (твой чип подсвечен рамкой), не «Ты». */}
      <View style={styles.playersRow}>
        {match.players.map((p) => {
          const isMe = p.uid === uid;
          const isOut = p.status === 'out';
          const isFalling = p.status === 'falling';
          return (
            <View
              key={p.slot}
              style={[styles.playerChip, {
                borderColor: isMe ? CONSTELLATION_SLOT_COLORS[p.slot] : t.border,
                borderWidth: isMe ? 1.5 : 1,
                backgroundColor: isMe ? `${CONSTELLATION_SLOT_COLORS[p.slot]}18` : 'rgba(12,18,44,0.7)',
                // Выбитый — тускло (аудит: статус читается сразу): он больше не в игре.
                opacity: isOut ? 0.42 : 1,
              }]}
            >
              <View style={[styles.playerAva, { backgroundColor: CONSTELLATION_SLOT_COLORS[p.slot] }]}>
                <Text style={styles.playerAvaText}>{(p.name[0] ?? '?').toUpperCase()}</Text>
                {/* Выбит → череп-значок; падающая звезда → искра; иначе «сходил» → галочка. */}
                {isOut ? (
                  <View style={[styles.playerDone, { backgroundColor: '#FF8080' }]}>
                    <Ionicons name="skull" size={8} color="#0A0F26" />
                  </View>
                ) : isFalling ? (
                  <View style={[styles.playerDone, { backgroundColor: '#FF7A9E' }]}>
                    <Ionicons name="sparkles" size={8} color="#0A0F26" />
                  </View>
                ) : p.roundDone ? (
                  <View style={styles.playerDone}>
                    <Ionicons name="checkmark" size={9} color="#0A0F26" />
                  </View>
                ) : null}
              </View>
              <View style={styles.playerInfo}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.playerName, { color: isMe ? CONSTELLATION_SLOT_COLORS[p.slot] : t.textSecond }]}>
                  {p.name}
                </Text>
                <Text style={[styles.playerScore, { color: t.textPrimary }]}>{p.liveScore ?? p.bonusPoints}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Крупный баннер фазы + кольцевой таймер (2.2/2.3): всегда ясно, что
          происходит и сколько осталось. Тускнеет для падающих/выбитых. */}
      {!iAmOut ? (
        <PhaseBanner
          lang={lang}
          isChoose={isChoose}
          isDuel={!!isDuel}
          isFalling={iAmFalling}
          secondsLeft={secondsLeft}
          phaseTotalSec={phaseTotalSec}
          deadlineMs={match.phaseDeadlineAt}
        />
      ) : null}

      {/* Карта: объём нарисован внутри SVG (грани/высоты). Обёрнута в зум/пан
          (2.5) — два пальца масштабируют/двигают, кнопки ＋/－/центр дублируют. */}
      <View style={styles.mapBox}>
        <View style={styles.mapFrame}>
          <ConstellationZoomMap
            stars={match.stars}
            homes={match.homes}
            players={match.players}
            highlightKeys={isChoose ? (shieldMode ? myStarKeys : legalTargets) : undefined}
            selectedKey={sheetKey}
            myTargetKey={myTargetThisRound}
            mySlot={mySlot}
            onStarPress={onStarPress}
            flashKey={flashKey}
          />
        </View>
        {activeEmote ? (
          <View style={[styles.emoteBubble, { borderColor: CONSTELLATION_SLOT_COLORS[activeEmote.slot] }]}>
            <Text style={styles.emoteText}>{activeEmote.text}</Text>
            <Text style={[styles.emoteName, { color: t.textSecond }]}>{activeEmote.name}</Text>
          </View>
        ) : null}
      </View>

      {/* Нижняя зона: щит + эмоуты в choose; статусы */}
      {isChoose && myPublic.status === 'alive' ? (
        <View style={[styles.bottomRow, { paddingBottom: insets.bottom + 6 }]}>
          {/* Раздел «Бонусы»: Щит сияния (тактический козырь). */}
          {!myPublic.shieldUsed ? (
            <TouchableOpacity
              testID="constellation-shield"
              style={[styles.actionBtn, {
                borderColor: shieldMode ? '#FFD166' : t.border,
                backgroundColor: shieldMode ? 'rgba(255,209,102,0.16)' : 'rgba(12,18,44,0.7)',
              }]}
              onPress={() => { setShieldMode((v) => !v); setSheetKey(null); hapticLightImpact(); }}
            >
              <Ionicons name="shield" size={18} color={shieldMode ? '#FFD166' : t.textSecond} />
              <Text style={{ color: shieldMode ? '#FFD166' : t.textSecond, fontSize: f.caption, fontWeight: '700' }}>
                {shieldMode
                  ? triLang(lang, {
                    ru: 'Тапни свою звезду', uk: 'Тапни свою зірку', es: 'Toca tu estrella',
                    'pt-BR': 'Toque sua estrela', vi: 'Chạm sao của bạn', id: 'Ketuk bintangmu',
                    tr: 'Yıldızına dokun', pl: 'Dotknij swojej gwiazdy',
                  })
                  : triLang(lang, {
                    ru: 'Щит', uk: 'Щит', es: 'Escudo', 'pt-BR': 'Escudo',
                    vi: 'Khiên', id: 'Perisai', tr: 'Kalkan', pl: 'Tarcza',
                  })}
              </Text>
            </TouchableOpacity>
          ) : <View style={{ flex: 1 }} />}
          {/* Отдельная кнопка «Реакции» → анимированное выпадающее меню. */}
          <TouchableOpacity
            testID="constellation-emote-toggle"
            style={[styles.actionBtn, {
              flex: 0, width: 52,
              borderColor: emoteMenuOpen ? '#8B7BFF' : t.border,
              backgroundColor: emoteMenuOpen ? 'rgba(139,123,255,0.16)' : 'rgba(12,18,44,0.7)',
            }]}
            onPress={() => { setEmoteMenuOpen((v) => !v); hapticLightImpact(); }}
          >
            <Ionicons name="happy-outline" size={20} color={emoteMenuOpen ? '#8B7BFF' : t.textSecond} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Анимированное выпадающее меню реакций (реплики на языке матча + перевод) */}
      {emoteMenuOpen && !iAmOut ? (
        <EmoteMenu
          lang={lang}
          bottomInset={insets.bottom}
          onPick={(id) => { onEmote(id); setEmoteMenuOpen(false); }}
          onClose={() => setEmoteMenuOpen(false)}
        />
      ) : null}

      {/* Шторка цели (choose) */}
      {sheetKey && isChoose ? (
        <TargetSheet
          lang={lang}
          starKey={sheetKey}
          match={match}
          busy={busy}
          bottomInset={insets.bottom}
          onConfirm={confirmTarget}
          onClose={() => setSheetKey(null)}
        />
      ) : null}

      {/* Квиз-оверлей (answer) */}
      {currentQuestion ? (
        <QuizOverlay
          lang={lang}
          isDuel={!!isDuel}
          qIndex={me?.answers.length ?? 0}
          total={me?.questions.length ?? 0}
          question={currentQuestion.question}
          options={currentQuestion.options}
          targetLabel={targetLabel}
          targetColor={targetColor}
          busy={busy}
          answerFeedback={answerFeedback}
          secondsLeft={secondsLeft}
          phaseTotalSec={phaseTotalSec}
          deadlineMs={match.phaseDeadlineAt}
          duelMyScore={myDuelScore}
          duelTotal={duelTotal}
          duelOppName={duelOpp?.name ?? null}
          duelSuddenDeath={duelSuddenDeath}
          bottomInset={insets.bottom}
          onAnswer={onAnswer}
        />
      ) : null}

      {/* Вопрос ещё грузится (player-док отстаёт от фазы матча на снапшот) */}
      {loadingQuestion ? (
        <View style={[styles.waitCard, { borderColor: t.border, backgroundColor: 'rgba(8,13,30,0.92)' }]}>
          <Ionicons name="hourglass-outline" size={18} color={t.accent} />
          <Text style={{ color: t.textSecond, fontSize: f.caption }}>
            {triLang(lang, {
              ru: 'Загружаем вопрос…', uk: 'Завантажуємо питання…',
              es: 'Cargando pregunta…', 'pt-BR': 'Carregando pergunta…',
              vi: 'Đang tải câu hỏi…', id: 'Memuat pertanyaan…',
              tr: 'Soru yükleniyor…', pl: 'Wczytujemy pytanie…',
            })}
          </Text>
        </View>
      ) : null}

      {/* Ответил всё — ждём резолв. Живой прогресс (аудит: «мёртвое время»):
          сколько игроков уже сходили + сколько секунд осталось до резолва —
          ожидание не выглядит зависанием. */}
      {answeredAll && !currentQuestion && !iAmOut ? (
        <View style={[styles.waitCard, { borderColor: t.border, backgroundColor: 'rgba(8,13,30,0.92)' }]}>
          <Ionicons name="checkmark-done" size={18} color={t.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.textSecond, fontSize: f.caption }}>
              {triLang(lang, {
                ru: 'Готово — ждём остальных', uk: 'Готово — чекаємо інших',
                es: 'Listo — esperando al resto', 'pt-BR': 'Pronto — esperando os outros',
                vi: 'Xong — chờ người khác', id: 'Selesai — menunggu yang lain',
                tr: 'Tamam — diğerleri bekleniyor', pl: 'Gotowe — czekamy na innych',
              })}
            </Text>
            <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 2 }}>
              {triLang(lang, {
                ru: `Сходили ${doneCount}/${liveCount}`, uk: `Сходили ${doneCount}/${liveCount}`,
                es: `Listos ${doneCount}/${liveCount}`, 'pt-BR': `Prontos ${doneCount}/${liveCount}`,
                vi: `Đã đi ${doneCount}/${liveCount}`, id: `Selesai ${doneCount}/${liveCount}`,
                tr: `Hazır ${doneCount}/${liveCount}`, pl: `Gotowi ${doneCount}/${liveCount}`,
              })}
              {secondsLeft > 0 ? ` · ${secondsLeft}${triLang(lang, { ru: 'с', uk: 'с', es: 's', 'pt-BR': 's', vi: 's', id: 'd', tr: 'sn', pl: 's' })}` : ''}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Падающая звезда (A11/2.10): дрейфующая звезда + прогресс-бар света. */}
      {iAmFalling ? (
        <FallingStarBanner lang={lang} light={myPublic.fallingLight} needed={2} />
      ) : null}

      {/* Выбит окончательно (A11): «Звезда погасла» */}
      {iAmOut ? (
        <View style={[styles.outOverlay]}>
          <Text style={styles.outTitle}>
            {triLang(lang, {
              ru: 'Звезда погасла', uk: 'Зірка згасла', es: 'La estrella se apagó',
              'pt-BR': 'A estrela se apagou', vi: 'Ngôi sao đã tắt', id: 'Bintang padam',
              tr: 'Yıldız söndü', pl: 'Gwiazda zgasła',
            })}
          </Text>
          <Text style={[styles.outSub, { fontSize: f.caption }]}>
            {triLang(lang, {
              ru: 'Награды за место уже начислены. Знания — с собой.',
              uk: 'Нагороди за місце вже нараховано.',
              es: 'Las recompensas ya son tuyas.',
              'pt-BR': 'As recompensas já são suas.',
              vi: 'Phần thưởng đã được cộng.',
              id: 'Hadiah sudah masuk.',
              tr: 'Ödüller hesabında.',
              pl: 'Nagrody już przyznane.',
            })}
          </Text>
          <DuoPressable
            testID="constellation-out-requeue"
            onPress={() => router.replace('/constellation_search' as any)}
            edgeColor={t.accent}
            style={[styles.outBtn, { backgroundColor: t.accent }]}
          >
            <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.sub }}>
              {triLang(lang, {
                ru: '⭐ Играть снова', uk: '⭐ Грати знову', es: '⭐ Jugar otra vez',
                'pt-BR': '⭐ Jogar de novo', vi: '⭐ Chơi lại', id: '⭐ Main lagi',
                tr: '⭐ Tekrar oyna', pl: '⭐ Zagraj znów',
              })}
            </Text>
          </DuoPressable>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/arena' as any)} style={[styles.outGhost, { borderColor: t.border }]}>
            <Text style={{ color: t.textSecond, fontSize: f.body }}>
              {triLang(lang, {
                ru: 'В арену', uk: 'До арени', es: 'A la arena', 'pt-BR': 'Para a arena',
                vi: 'Về đấu trường', id: 'Ke arena', tr: 'Arenaya', pl: 'Do areny',
              })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Отсчёт 3-2-1 перед игрой — пульсирующий, привлекает внимание */}
      {countdown !== null ? <RoundCountdown value={countdown} lang={lang} /> : null}

      {/* Заставка дуэли (2.7): аватар vs аватар при входе в столкновение. */}
      {duelIntro && duelOpp && mySlot !== null ? (
        <DuelIntro
          lang={lang}
          meName={myPublic.name}
          meColor={CONSTELLATION_SLOT_COLORS[mySlot]}
          oppName={duelOpp.name}
          oppColor={CONSTELLATION_SLOT_COLORS[duelOpp.slot]}
        />
      ) : null}

      {/* Тост ошибки сети (0.5) */}
      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 90 }]} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      {/* Диалог выхода (0.6) */}
      {exitAsk ? (
        <View style={styles.exitOverlay}>
          <View style={[styles.exitCard, { backgroundColor: '#0E1734' }]}>
            <Text style={[styles.exitTitle, { color: t.textPrimary, fontSize: f.sub }]}>
              {triLang(lang, {
                ru: 'Выйти из матча?', uk: 'Вийти з матчу?', es: '¿Salir de la partida?',
                'pt-BR': 'Sair da partida?', vi: 'Rời trận?', id: 'Keluar dari match?',
                tr: 'Maçtan çık?', pl: 'Wyjść z meczu?',
              })}
            </Text>
            <Text style={[styles.exitSub, { color: t.textSecond, fontSize: f.caption }]}>
              {triLang(lang, {
                ru: 'Ход будет пропускаться, звёзды остаются. Можно вернуться в матч.',
                uk: 'Хід пропускатиметься, зірки лишаються. Можна повернутись.',
                es: 'Se saltará tu turno, las estrellas quedan. Puedes volver.',
                'pt-BR': 'Sua vez será pulada, as estrelas ficam. Você pode voltar.',
                vi: 'Lượt của bạn bị bỏ qua, sao vẫn còn. Có thể quay lại.',
                id: 'Giliranmu dilewati, bintang tetap. Bisa kembali.',
                tr: 'Sıran atlanır, yıldızlar kalır. Geri dönebilirsin.',
                pl: 'Twoja tura zostanie pominięta, gwiazdy zostają. Możesz wrócić.',
              })}
            </Text>
            <View style={styles.exitBtns}>
              <TouchableOpacity onPress={() => setExitAsk(false)} style={[styles.exitAction, { borderColor: t.border }]}>
                <Text style={{ color: t.textPrimary, fontWeight: '700', fontSize: f.body }}>
                  {triLang(lang, {
                    ru: 'Остаться', uk: 'Лишитись', es: 'Quedarme', 'pt-BR': 'Ficar',
                    vi: 'Ở lại', id: 'Tetap', tr: 'Kal', pl: 'Zostań',
                  })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doExit} style={[styles.exitAction, { backgroundColor: '#FF6B8A', borderColor: '#FF6B8A' }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: f.body }}>
                  {triLang(lang, {
                    ru: 'Выйти', uk: 'Вийти', es: 'Salir', 'pt-BR': 'Sair',
                    vi: 'Rời', id: 'Keluar', tr: 'Çık', pl: 'Wyjdź',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── Баннер фазы + кольцевой таймер (2.2/2.3) ─────────────────────────────────

// ── Меню реакций (эмоуты) ────────────────────────────────────────────────────

interface EmoteMenuProps {
  lang: Lang;
  bottomInset: number;
  onPick: (id: string) => void;
  onClose: () => void;
}

const EmoteMenu = memo(function EmoteMenu({ lang, bottomInset, onPick, onClose }: EmoteMenuProps) {
  const { theme: t, f } = useTheme();
  const y = useSharedValue(40);
  const op = useSharedValue(0);
  useEffect(() => {
    y.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) });
    op.value = withTiming(1, { duration: 200 });
  }, [y, op]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: op.value,
  }));
  return (
    <>
      <TouchableOpacity style={styles.emoteBackdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.emoteMenu, { bottom: bottomInset + 64 }, animStyle]}>
        <Text style={[styles.emoteMenuTitle, { color: t.textSecond }]}>
          {triLang(lang, {
            ru: 'Реакция · на языке матча', uk: 'Реакція · мовою матчу',
            es: 'Reacción · en idioma del match', 'pt-BR': 'Reação · no idioma',
            vi: 'Phản ứng', id: 'Reaksi', tr: 'Tepki', pl: 'Reakcja',
          })}
        </Text>
        <View style={styles.emoteGrid}>
          {EMOTES.map((e) => (
            <TouchableOpacity key={e.id} style={styles.emoteCell} onPress={() => onPick(e.id)} activeOpacity={0.8}>
              <Text style={styles.emoteCellEmoji}>{e.emoji}</Text>
              <Text style={[styles.emoteCellText, { color: t.textPrimary }]} numberOfLines={1}>{e.text}</Text>
              <Text style={[styles.emoteCellHint, { color: t.textSecond, fontSize: f.caption - 2 }]}>{e.hint}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </>
  );
});

// ── Заставка дуэли (2.7): аватар vs аватар ──────────────────────────────────

const DuelIntro = memo(function DuelIntro({
  lang, meName, meColor, oppName, oppColor,
}: { lang: Lang; meName: string; meColor: string; oppName: string; oppColor: string }) {
  const { f } = useTheme();
  const reduceMotion = useReduceMotion();
  const left = useSharedValue(reduceMotion ? 0 : -1);
  const right = useSharedValue(reduceMotion ? 0 : 1);
  const op = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    op.value = withTiming(1, { duration: 200 });
    left.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.back(1.6)) });
    right.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.back(1.6)) });
  }, [left, right, op, reduceMotion]);
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: left.value * 140 }], opacity: op.value }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: right.value * 140 }], opacity: op.value }));
  const vsStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  const avatar = (name: string, color: string) => (
    <View style={[styles.duelAva, { backgroundColor: color }]}>
      <Text style={styles.duelAvaText}>{(name[0] ?? '?').toUpperCase()}</Text>
    </View>
  );

  return (
    <View style={styles.duelIntroOverlay} pointerEvents="none">
      <View style={styles.duelIntroRow}>
        <Animated.View style={[styles.duelSide, leftStyle]}>
          {avatar(meName, meColor)}
          <Text style={[styles.duelName, { color: meColor }]}>{meName}</Text>
        </Animated.View>
        <Animated.Text style={[styles.duelVs, vsStyle, { fontSize: f.h1 }]}>VS</Animated.Text>
        <Animated.View style={[styles.duelSide, rightStyle]}>
          {avatar(oppName, oppColor)}
          <Text style={[styles.duelName, { color: oppColor }]}>{oppName}</Text>
        </Animated.View>
      </View>
      <Animated.Text style={[styles.duelIntroLabel, vsStyle]}>
        ⚡ {triLang(lang, {
          ru: 'СТОЛКНОВЕНИЕ', uk: 'ЗІТКНЕННЯ', es: 'COLISIÓN', 'pt-BR': 'COLISÃO',
          vi: 'VA CHẠM', id: 'TABRAKAN', tr: 'ÇARPIŞMA', pl: 'ZDERZENIE',
        })}
      </Animated.Text>
    </View>
  );
});

// ── Падающая звезда (2.10): драма вместо статичного баннера ─────────────────

const FallingStarBanner = memo(function FallingStarBanner({
  lang, light, needed,
}: { lang: Lang; light: number; needed: number }) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();
  const focused = useIsScreenFocused();
  // Мягкий дрейф звезды по горизонтали + лёгкое покачивание вверх-вниз.
  // Бесконечный loop гейтится focused+reduceMotion (Performance Bible).
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || !focused) { drift.value = 0.5; return; }
    drift.value = 0;
    drift.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
  }, [drift, reduceMotion, focused]);
  const starStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (drift.value - 0.5) * 26 },
      { translateY: Math.sin(drift.value * Math.PI) * -6 },
    ],
  }));
  const frac = Math.max(0, Math.min(1, light / Math.max(1, needed)));

  return (
    <View style={[styles.fallingBanner, { borderColor: '#FF7A9E' }]}>
      <View style={styles.fallingHead}>
        <Animated.Text style={[styles.fallingStar, starStyle]}>✦</Animated.Text>
        <Text style={styles.fallingTitle}>
          {triLang(lang, {
            ru: 'Ты — Падающая звезда', uk: 'Ти — Падаюча зірка',
            es: 'Eres una estrella fugaz', 'pt-BR': 'Você é uma estrela cadente',
            vi: 'Bạn là sao băng', id: 'Kamu bintang jatuh',
            tr: 'Kayan yıldızsın', pl: 'Jesteś spadającą gwiazdą',
          })}
        </Text>
      </View>
      {/* Прогресс-бар света: needed делений, заполненные светятся. */}
      <View style={styles.fallingTrack}>
        <View style={[styles.fallingFill, { width: `${frac * 100}%` }]} />
      </View>
      <Text style={[styles.fallingSub, { color: t.textSecond, fontSize: f.caption }]}>
        {triLang(lang, {
          ru: `Свет ${light}/${needed} · отвечай верно, чтобы возродиться`,
          uk: `Світло ${light}/${needed} · відповідай вірно, щоб відродитись`,
          es: `Luz ${light}/${needed} · responde bien para renacer`,
          'pt-BR': `Luz ${light}/${needed} · responda certo para renascer`,
          vi: `Ánh sáng ${light}/${needed} · trả lời đúng để hồi sinh`,
          id: `Cahaya ${light}/${needed} · jawab benar untuk bangkit`,
          tr: `Işık ${light}/${needed} · doğru cevapla ve diril`,
          pl: `Światło ${light}/${needed} · odpowiadaj dobrze, by odrodzić się`,
        })}
      </Text>
    </View>
  );
});

// ── Отсчёт 3-2-1 перед игрой ─────────────────────────────────────────────────

const RoundCountdown = memo(function RoundCountdown({ value, lang }: { value: number; lang: Lang }) {
  // Каждая цифра «влетает» с масштабом и гаснет — пульсирующий ритм.
  const s = useSharedValue(0.4);
  useEffect(() => {
    s.value = 0.4;
    s.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.back(2)) });
  }, [value, s]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: Math.min(1, s.value + 0.2),
  }));
  const isGo = value === 0;
  const goText = triLang(lang, {
    ru: 'ПОЕХАЛИ!', uk: 'ПОЇХАЛИ!', es: '¡VAMOS!', 'pt-BR': 'VAMOS!',
    vi: 'BẮT ĐẦU!', id: 'AYO!', tr: 'HADI!', pl: 'RUSZAMY!',
  });
  return (
    // На цифрах «3-2-1» блокируем тапы по карте (сервер держит фору таймера),
    // на «ПОЕХАЛИ» пропускаем — старт мгновенный.
    <View style={styles.cdOverlay} pointerEvents={isGo ? 'none' : 'auto'}>
      <Animated.Text style={[styles.cdText, animStyle, isGo ? styles.cdGo : null]}>
        {isGo ? goText : String(value)}
      </Animated.Text>
    </View>
  );
});

interface PhaseBannerProps {
  lang: Lang;
  isChoose: boolean;
  isDuel: boolean;
  isFalling: boolean;
  secondsLeft: number;
  phaseTotalSec: number;
  deadlineMs: number;
}

const RING_R = 20;
const RING_C = 2 * Math.PI * RING_R;
const AnimatedRingCircle = Animated.createAnimatedComponent(Circle);

const PhaseBanner = memo(function PhaseBanner({
  lang, isChoose, isDuel, isFalling, secondsLeft, phaseTotalSec, deadlineMs,
}: PhaseBannerProps) {
  const low = secondsLeft <= 5;
  const ringColor = low ? '#FF6B8A' : isChoose ? '#8B7BFF' : '#F6A93B';

  // Плавное кольцо таймера (жалоба «рывками»): анимируем непрерывно от текущей
  // доли до 0 за оставшееся время, а не скачками раз в секунду от secondsLeft.
  const ringProg = useSharedValue(1);
  useEffect(() => {
    const remainMs = Math.max(0, deadlineMs - Date.now());
    const total = Math.max(1, phaseTotalSec * 1000);
    ringProg.value = Math.max(0, Math.min(1, remainMs / total));
    if (remainMs > 0) {
      ringProg.value = withTiming(0, { duration: remainMs, easing: Easing.linear });
    }
  }, [deadlineMs, phaseTotalSec, ringProg]);
  const ringAnimProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - ringProg.value),
  }));

  // Входная анимация баннера при СМЕНЕ фазы (deadlineMs) — «влетает» сверху и
  // пружинит, привлекает внимание к тому, что происходит (просьба владельца).
  const bannerReduceMotion = useReduceMotion();
  const enter = useSharedValue(0);
  useEffect(() => {
    if (bannerReduceMotion) { enter.value = 1; return; } // 8.4: без «влёта»
    enter.value = 0;
    enter.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.4)) });
  }, [deadlineMs, enter, bannerReduceMotion]);
  const enterStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - enter.value) * -18 }, { scale: 0.9 + enter.value * 0.1 }],
    opacity: enter.value,
  }));

  const label = isFalling
    ? triLang(lang, {
      ru: 'ПАДАЮЩАЯ ЗВЕЗДА', uk: 'ПАДАЮЧА ЗІРКА', es: 'ESTRELLA FUGAZ', 'pt-BR': 'ESTRELA CADENTE',
      vi: 'SAO BĂNG', id: 'BINTANG JATUH', tr: 'KAYAN YILDIZ', pl: 'SPADAJĄCA GWIAZDA',
    })
    : isDuel
      ? triLang(lang, {
        ru: 'СТОЛКНОВЕНИЕ', uk: 'ЗІТКНЕННЯ', es: 'COLISIÓN', 'pt-BR': 'COLISÃO',
        vi: 'VA CHẠM', id: 'TABRAKAN', tr: 'ÇARPIŞMA', pl: 'ZDERZENIE',
      })
      : isChoose
        ? triLang(lang, {
          ru: 'ВЫБОР ЦЕЛИ', uk: 'ВИБІР ЦІЛІ', es: 'ELIGE OBJETIVO', 'pt-BR': 'ESCOLHA ALVO',
          vi: 'CHỌN MỤC TIÊU', id: 'PILIH TARGET', tr: 'HEDEF SEÇ', pl: 'WYBIERZ CEL',
        })
        : triLang(lang, {
          ru: 'ОТВЕЧАЙ', uk: 'ВІДПОВІДАЙ', es: 'RESPONDE', 'pt-BR': 'RESPONDA',
          vi: 'TRẢ LỜI', id: 'JAWAB', tr: 'CEVAPLA', pl: 'ODPOWIADAJ',
        });

  const hint = isFalling
    ? triLang(lang, {
      ru: 'отвечай, чтобы вернуться', uk: 'відповідай, щоб повернутись', es: 'responde para volver',
      'pt-BR': 'responda para voltar', vi: 'trả lời để quay lại', id: 'jawab untuk kembali',
      tr: 'dönmek için cevapla', pl: 'odpowiadaj, by wrócić',
    })
    : isDuel
      ? triLang(lang, {
        ru: 'дуэль за звезду', uk: 'дуель за зірку', es: 'duelo por la estrella',
        'pt-BR': 'duelo pela estrela', vi: 'đấu tay đôi', id: 'duel bintang',
        tr: 'yıldız düellosu', pl: 'pojedynek o gwiazdę',
      })
      : isChoose
        ? triLang(lang, {
          ru: 'выбери звезду для захвата', uk: 'обери зірку для захоплення', es: 'elige estrella a capturar',
          'pt-BR': 'escolha a estrela', vi: 'chọn sao để chiếm', id: 'pilih bintang',
          tr: 'ele geçirilecek yıldızı seç', pl: 'wybierz gwiazdę',
        })
        : triLang(lang, {
          ru: 'ответь верно', uk: 'відповідай правильно', es: 'responde bien',
          'pt-BR': 'responda certo', vi: 'trả lời đúng', id: 'jawab benar',
          tr: 'doğru cevapla', pl: 'odpowiedz dobrze',
        });

  return (
    <View style={styles.bannerRow} pointerEvents="none">
      <Animated.View style={[styles.bannerPill, { borderColor: `${ringColor}66` }, enterStyle]}>
        <View style={styles.bannerTimer}>
          <Svg width={44} height={44}>
            <Circle cx={22} cy={22} r={RING_R} fill="none" stroke="rgba(150,170,230,0.15)" strokeWidth={4} />
            <AnimatedRingCircle
              cx={22} cy={22} r={RING_R} fill="none" stroke={ringColor} strokeWidth={4}
              strokeLinecap="round" strokeDasharray={RING_C}
              animatedProps={ringAnimProps}
              transform="rotate(-90 22 22)"
            />
          </Svg>
          <Text style={[styles.bannerTimerText, { color: ringColor }]}>{secondsLeft}</Text>
        </View>
        <View style={styles.bannerLabels}>
          <Text style={[styles.bannerLabel, { color: '#EAF2FF' }]}>{label}</Text>
          <Text style={styles.bannerHint}>{hint}</Text>
        </View>
      </Animated.View>
    </View>
  );
});

// ── Шторка цели ──────────────────────────────────────────────────────────────

interface TargetSheetProps {
  lang: Lang;
  starKey: string;
  match: ConstellationMatch;
  busy: boolean;
  bottomInset: number;
  onConfirm: () => void;
  onClose: () => void;
}

const TargetSheet = memo(function TargetSheet({
  lang, starKey, match, busy, bottomInset, onConfirm, onClose,
}: TargetSheetProps) {
  const { theme: t, f } = useTheme();
  const star = match.stars[starKey];
  const hex = parseHexKey(starKey);
  if (!star || !hex) return null;
  const ring = ringOf(hex);
  const owner = star.owner !== null ? match.players.find((p) => p.slot === star.owner) : null;
  const isHome = owner ? match.homes[owner.slot] === starKey : false;
  const baseQuestions = isHome
    ? (owner && owner.cores === 1 ? 3 : 2)
    : ring === 'polar' ? 3 : ring === 'outer' ? 1 : 2;
  const questions = isHome && owner && owner.cores === 1
    ? 3
    : Math.min(4, baseQuestions + star.radiance);

  const ringName = triLang(lang, {
    ru: { outer: 'Внешнее кольцо', middle: 'Среднее кольцо', inner: 'Внутреннее кольцо', polar: 'Полярная звезда' }[ring],
    uk: { outer: 'Зовнішнє кільце', middle: 'Середнє кільце', inner: 'Внутрішнє кільце', polar: 'Полярна зірка' }[ring],
    es: { outer: 'Anillo exterior', middle: 'Anillo medio', inner: 'Anillo interior', polar: 'Estrella Polar' }[ring],
    'pt-BR': { outer: 'Anel externo', middle: 'Anel médio', inner: 'Anel interno', polar: 'Estrela Polar' }[ring],
    vi: { outer: 'Vòng ngoài', middle: 'Vòng giữa', inner: 'Vòng trong', polar: 'Sao Bắc Cực' }[ring],
    id: { outer: 'Cincin luar', middle: 'Cincin tengah', inner: 'Cincin dalam', polar: 'Bintang Kutub' }[ring],
    tr: { outer: 'Dış halka', middle: 'Orta halka', inner: 'İç halka', polar: 'Kutup Yıldızı' }[ring],
    pl: { outer: 'Zewnętrzny pierścień', middle: 'Środkowy pierścień', inner: 'Wewnętrzny pierścień', polar: 'Gwiazda Polarna' }[ring],
  });

  // Сложность звезды (пипсы 1–4): по кольцу + Сияние. outer=1 … polar=4, +Сияние.
  const baseDiff = { outer: 1, middle: 2, inner: 3, polar: 4 }[ring];
  const difficulty = Math.min(4, baseDiff + (star.radiance > 0 ? 1 : 0));
  const name = starName(starKey, lang);

  return (
    <View style={[sheetStyles.sheet, { backgroundColor: 'rgba(8,13,30,0.96)', borderColor: '#2A3A6A', bottom: 14 + bottomInset }]}>
      <View style={sheetStyles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[sheetStyles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
            {isHome && owner && owner.cores === 1 ? '🔥 ' : ''}{name}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 2 }}>
            {ringName}{owner ? ` · ${owner.name}` : ''}
          </Text>
          {/* Сложность пипсами (2.1) */}
          <View style={sheetStyles.diffRow}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  sheetStyles.pip,
                  { backgroundColor: i < difficulty ? '#FFD166' : 'rgba(150,170,230,0.2)' },
                ]}
              />
            ))}
          </View>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color={t.textSecond} />
        </TouchableOpacity>
      </View>
      <View style={sheetStyles.meta}>
        {owner ? (
          <View style={[sheetStyles.chip, { borderColor: t.border }]}>
            <Text style={{ color: CONSTELLATION_SLOT_COLORS[owner.slot], fontSize: f.caption, fontWeight: '700' }}>
              {owner.name}
            </Text>
          </View>
        ) : (
          <View style={[sheetStyles.chip, { borderColor: t.border }]}>
            <Text style={{ color: t.textSecond, fontSize: f.caption }}>
              {triLang(lang, {
                ru: 'нейтральная', uk: 'нейтральна', es: 'neutral', 'pt-BR': 'neutra',
                vi: 'trung lập', id: 'netral', tr: 'nötr', pl: 'neutralna',
              })}
            </Text>
          </View>
        )}
        {star.radiance > 0 ? (
          <View style={[sheetStyles.chip, { borderColor: t.border }]}>
            <Text style={{ color: '#EAF2FF', fontSize: f.caption }}>✦ {star.radiance}</Text>
          </View>
        ) : null}
        <View style={[sheetStyles.chip, { borderColor: t.border }]}>
          <Text style={{ color: t.textSecond, fontSize: f.caption }}>
            {triLang(lang, {
              ru: `вопросов: ${questions}`, uk: `питань: ${questions}`, es: `preguntas: ${questions}`,
              'pt-BR': `perguntas: ${questions}`, vi: `câu hỏi: ${questions}`, id: `soal: ${questions}`,
              tr: `soru: ${questions}`, pl: `pytań: ${questions}`,
            })}
          </Text>
        </View>
        {isHome && owner ? (
          <View style={[sheetStyles.chip, { borderColor: t.border }]}>
            <Text style={{ color: CONSTELLATION_SLOT_COLORS[owner.slot], fontSize: f.caption }}>
              {'●'.repeat(Math.max(0, owner.cores))}
            </Text>
          </View>
        ) : null}
      </View>
      <DuoPressable
        testID="constellation-attack"
        onPress={onConfirm}
        edgeColor={t.accent}
        wrapStyle={{ opacity: busy ? 0.6 : 1 }}
        style={[sheetStyles.cta, { backgroundColor: t.accent }]}
      >
        <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.sub }}>
          {triLang(lang, {
            ru: '⭐ Зажечь звезду', uk: '⭐ Запалити зірку', es: '⭐ Encender estrella',
            'pt-BR': '⭐ Acender estrela', vi: '⭐ Thắp sao', id: '⭐ Nyalakan bintang',
            tr: '⭐ Yıldızı yak', pl: '⭐ Zapal gwiazdę',
          })}
        </Text>
      </DuoPressable>
    </View>
  );
});

// ── Квиз-оверлей ────────────────────────────────────────────────────────────

interface QuizOverlayProps {
  lang: Lang;
  isDuel: boolean;
  qIndex: number;
  total: number;
  question: string;
  options: string[];
  /** Имя целевой звезды и цвет её владельца — мини-контекст «за что бьюсь». */
  targetLabel: string | null;
  targetColor: string;
  busy: boolean;
  /** Обратная связь на ответ: индекс плитки + верно/неверно (для подсветки). */
  answerFeedback: { qIndex: number; index: number; correct: boolean } | null;
  secondsLeft: number;
  phaseTotalSec: number;
  deadlineMs: number;
  /** Дуэль (2.7): мой счёт верных, всего вопросов, имя соперника, внезапная смерть. */
  duelMyScore?: number;
  duelTotal?: number;
  duelOppName?: string | null;
  duelSuddenDeath?: boolean;
  bottomInset: number;
  onAnswer: (index: number) => void;
}

const QuizOverlay = memo(function QuizOverlay({
  lang, isDuel, qIndex, total, question, options, targetLabel, targetColor, busy, answerFeedback, secondsLeft, phaseTotalSec, deadlineMs, duelMyScore = 0, duelTotal = 0, duelOppName, duelSuddenDeath = false, bottomInset, onAnswer,
}: QuizOverlayProps) {
  const { theme: t, f } = useTheme();
  const budgetLow = secondsLeft <= 5;
  // Плавная полоса бюджета (жалоба «дёргается по секциям»): та же техника, что
  // кольцо в PhaseBanner — течёт непрерывно к 0, а не скачет раз в секунду.
  const budgetProg = useSharedValue(1);
  useEffect(() => {
    const remainMs = Math.max(0, deadlineMs - Date.now());
    const total = Math.max(1, phaseTotalSec * 1000);
    budgetProg.value = Math.max(0, Math.min(1, remainMs / total));
    if (remainMs > 0) {
      budgetProg.value = withTiming(0, { duration: remainMs, easing: Easing.linear });
    }
  }, [deadlineMs, phaseTotalSec, budgetProg]);
  const budgetStyle = useAnimatedStyle(() => ({
    width: `${budgetProg.value * 100}%`,
  }));
  // Микрофидбек плиток (2.9): подсветка выбранной сразу при тапе (до ответа
  // сервера — нейтрально-акцентная), затем зелёная/красная по answerFeedback.
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  useEffect(() => { setPickedIndex(null); }, [qIndex]);
  // Фидбек показываем только для ТЕКУЩЕГО вопроса (иначе «прилипнет» к след.).
  const fb = answerFeedback && answerFeedback.qIndex === qIndex ? answerFeedback : null;
  // Время фазы вышло — блокируем варианты (жалоба «нет ограничения после
  // таймера»): раньше кнопки оставались активными до прихода нового снапшота,
  // хотя сервер такой ответ всё равно отклонит («не та фаза»/просрочен).
  const timeUp = secondsLeft <= 0;
  const handlePick = useCallback((i: number) => {
    if (busy || timeUp) return;
    // Мгновенная вибрация выбора (жалоба «нет реакции при выборе») — до сетевого
    // ответа. На плитках только вибрация, без звука (правило проекта).
    hapticLightImpact();
    setPickedIndex(i);
    onAnswer(i);
  }, [busy, timeUp, onAnswer]);
  // Вход: квиз «выезжает» снизу при появлении нового вопроса (привлекает внимание).
  const quizReduceMotion = useReduceMotion();
  const enter = useSharedValue(0);
  useEffect(() => {
    if (quizReduceMotion) { enter.value = 1; return; } // 8.4: без «выезда»
    enter.value = 0;
    enter.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [qIndex, enter, quizReduceMotion]);
  const enterStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - enter.value) * 40 }],
    opacity: enter.value,
  }));
  return (
    <Animated.View style={[quizStyles.box, enterStyle, {
      backgroundColor: 'rgba(8,13,30,0.97)',
      // Внезапная смерть дуэли — красная рамка (2.7 драма решающего вопроса).
      borderColor: isDuel ? (duelSuddenDeath ? '#FF5C7A' : '#FFD166') : '#2A3A6A',
      borderWidth: isDuel && duelSuddenDeath ? 2 : 1,
      bottom: 14 + bottomInset, // над системной навигацией Android (жалоба)
    }]}>
      {/* Полоса бюджета фазы (2.3): игрок видит, сколько времени тает, прямо
          над вопросом — не «внезапно время вышло». Краснеет на ≤5с. Течёт
          плавно (withTiming), не скачет раз в секунду (жалоба «дёргается»). */}
      <View style={quizStyles.budgetTrack}>
        <Animated.View
          style={[
            quizStyles.budgetFill,
            budgetStyle,
            { backgroundColor: budgetLow ? '#FF6B8A' : (isDuel ? '#FFD166' : '#8B7BFF') },
          ]}
        />
      </View>
      {isDuel ? (
        <View style={quizStyles.duelScoreRow}>
          {/* Мой прогресс дуэли: ⚡ за верный ответ, ○ за оставшиеся. Счёт
              соперника НЕ раскрываем (анти-чит) — он «?» до резолва. */}
          <View style={quizStyles.duelPips}>
            {Array.from({ length: Math.max(1, duelTotal) }).map((_, i) => (
              <Text key={i} style={{ fontSize: 13, color: i < duelMyScore ? '#FFD166' : 'rgba(150,170,230,0.35)' }}>
                {i < duelMyScore ? '⚡' : '○'}
              </Text>
            ))}
          </View>
          <Text style={quizStyles.duelBadge}>
            {duelSuddenDeath
              ? triLang(lang, {
                ru: '⚡ РЕШАЮЩИЙ', uk: '⚡ ВИРІШАЛЬНИЙ', es: '⚡ DECISIVO', 'pt-BR': '⚡ DECISIVO',
                vi: '⚡ QUYẾT ĐỊNH', id: '⚡ PENENTU', tr: '⚡ BELİRLEYİCİ', pl: '⚡ DECYDUJĄCY',
              })
              : `⚡ vs ${duelOppName ?? '?'}`}
          </Text>
        </View>
      ) : null}
      {/* Мини-контекст цели (аудит): игрок всегда видит, ЗА КАКУЮ звезду бьётся
          и чья она — цветная точка владельца + имя. */}
      {targetLabel ? (
        <View style={quizStyles.targetRow}>
          <View style={[quizStyles.targetDot, { backgroundColor: targetColor }]} />
          <Text numberOfLines={1} style={[quizStyles.targetText, { color: t.textSecond, fontSize: f.caption }]}>
            {triLang(lang, {
              ru: 'За звезду', uk: 'За зірку', es: 'Por la estrella', 'pt-BR': 'Pela estrela',
              vi: 'Giành sao', id: 'Rebut bintang', tr: 'Yıldız için', pl: 'O gwiazdę',
            })}{' '}
            <Text style={{ color: targetColor, fontWeight: '800' }}>{targetLabel}</Text>
          </Text>
        </View>
      ) : null}
      {/* Вопрос всегда виден — БЕЗ модалки «Верно/Мимо» (просьба владельца):
          ответил → плитка мгновенно красится зелёным/красным → следующий
          вопрос приходит сам через onSnapshot. Никакого экрана «Дальше». */}
      <Text style={[quizStyles.meta, { color: t.textSecond, fontSize: f.caption - 1 }]}>
        {qIndex + 1}/{total}
      </Text>
      <Text style={[quizStyles.question, { color: t.textPrimary, fontSize: f.sub + 2 }]}>
        {question}
      </Text>
      <View style={quizStyles.opts}>
        {options.map((opt, i) => {
          const picked = pickedIndex === i;
          const isFbTile = fb?.index === i;
          // Подсветка: пришёл фидбек → зелёная (верно) / красная (мимо) на
          // выбранной; до фидбека — нейтрально-акцентная на выбранной.
          let bColor = '#1E2A4A';
          let bg = 'transparent';
          if (isFbTile) {
            bColor = fb.correct ? '#63E6A4' : '#FF8080';
            bg = fb.correct ? 'rgba(99,230,164,0.16)' : 'rgba(255,128,128,0.16)';
          } else if (picked) {
            bColor = '#8B7BFF';
            bg = 'rgba(139,123,255,0.16)';
          }
          const highlighted = isFbTile || picked;
          return (
            <TouchableOpacity
              key={i}
              testID={`constellation-opt-${i}`}
              style={[quizStyles.opt, {
                borderColor: bColor,
                backgroundColor: bg,
                borderWidth: highlighted ? 1.5 : 1,
                opacity: (busy || timeUp) && !highlighted ? 0.5 : 1,
              }]}
              disabled={busy || timeUp}
              onPress={() => handlePick(i)}
              activeOpacity={0.85}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: highlighted ? '800' : '600' }}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
});

// ── Стили ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  cdOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,7,18,0.55)',
    zIndex: 100,
  },
  cdText: {
    fontSize: 96,
    fontWeight: '900',
    color: '#EAF2FF',
    textShadowColor: 'rgba(139,123,255,0.7)',
    textShadowRadius: 30,
    textShadowOffset: { width: 0, height: 0 },
  },
  cdGo: { fontSize: 58, color: '#FFD166', letterSpacing: 2 },
  duelIntroOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,7,18,0.72)',
    zIndex: 100,
    gap: 16,
  },
  duelIntroRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  duelSide: { alignItems: 'center', gap: 6, width: 96 },
  duelAva: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  duelAvaText: { color: '#06122B', fontWeight: '900', fontSize: 28 },
  duelName: { fontWeight: '800', fontSize: 13, maxWidth: 96, textAlign: 'center' },
  duelVs: {
    color: '#FFD166', fontWeight: '900', letterSpacing: 1,
    textShadowColor: 'rgba(255,209,102,0.7)', textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 },
  },
  duelIntroLabel: { color: '#FFD166', fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  exitBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,140,220,0.10)',
  },
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,107,138,0.92)',
  },
  toastText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  exitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,7,18,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  exitCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 22,
    gap: 10,
  },
  exitTitle: { fontWeight: '800' },
  exitSub: { lineHeight: 19 },
  exitBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  exitAction: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(13,20,44,0.9)',
  },
  roundText: { fontVariant: ['tabular-nums'] },
  goldChip: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,209,102,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.4)',
  },
  goldChipText: { color: '#FFD166', fontWeight: '800', fontSize: 11 },
  devLowEndChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(120,140,220,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(120,140,220,0.25)',
  },
  devLowEndChipActive: {
    backgroundColor: '#FFD166',
    borderColor: '#FFD166',
  },
  devLowEndChipText: { fontWeight: '800', fontSize: 10 },
  bannerRow: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 6,
    paddingRight: 18,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(14,22,54,0.72)',
  },
  bannerTimer: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bannerTimerText: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  bannerLabels: {},
  bannerLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
  bannerHint: { fontSize: 10.5, fontWeight: '600', color: '#93A3CB', marginTop: 1 },
  playersRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  playerChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 6,
    backgroundColor: 'rgba(12,18,44,0.7)',
  },
  playerAva: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvaText: { color: '#06122B', fontWeight: '800', fontSize: 12 },
  playerDone: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#63E6A4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: { fontSize: 11, fontWeight: '600' },
  playerScore: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  mapBox: {
    flex: 1,
    minHeight: 0,
  },
  mapFrame: {
    // Карта занимает ВСЮ доступную область (жалоба «игровая область маленькая»);
    // SVG сам вписывает viewBox через preserveAspectRatio, зум работает поверх.
    flex: 1,
  },
  emoteBubble: {
    position: 'absolute',
    top: 8,
    left: 16,
    backgroundColor: '#EAF2FF',
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    borderWidth: 1.5,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  emoteText: { color: '#0A1024', fontWeight: '800', fontSize: 12 },
  emoteName: { fontSize: 9 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
  },
  emoteBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  emoteMenu: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 41,
    backgroundColor: 'rgba(14,22,54,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(160,180,255,0.25)',
    borderRadius: 20,
    padding: 14,
  },
  emoteMenuTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  emoteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  emoteCell: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(139,123,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(140,160,220,0.15)',
  },
  emoteCellEmoji: { fontSize: 22 },
  emoteCellText: { fontSize: 11.5, fontWeight: '700', marginTop: 4 },
  emoteCellHint: { marginTop: 1 },
  waitCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
  },
  fallingBanner: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(8,13,30,0.95)',
    alignItems: 'center',
    gap: 4,
  },
  fallingTitle: { color: '#FF7A9E', fontWeight: '800', fontSize: 15 },
  fallingSub: { textAlign: 'center' },
  fallingHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fallingStar: {
    color: '#FFD9E6',
    fontSize: 18,
    textShadowColor: 'rgba(255,122,158,0.9)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  fallingTrack: {
    width: '70%',
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,122,158,0.18)',
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 2,
  },
  fallingFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#FF7A9E',
  },
  outOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,6,14,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  outTitle: { color: '#F4F7FF', fontSize: 26, fontWeight: '900' },
  outSub: { color: '#A7B4D6', textAlign: 'center' },
  outBtn: {
    borderRadius: 14,
    paddingHorizontal: 30,
    paddingVertical: 14,
  },
  outGhost: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
});

const sheetStyles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 14,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontWeight: '800' },
  diffRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  pip: { width: 16, height: 6, borderRadius: 3 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cta: {
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 13,
  },
});

const quizStyles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 14,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  budgetTrack: {
    height: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(150,170,230,0.15)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  budgetFill: { height: '100%', borderRadius: 5 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  targetDot: { width: 9, height: 9, borderRadius: 5 },
  targetText: { flex: 1, fontWeight: '600' },
  duelScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  duelPips: { flexDirection: 'row', gap: 3 },
  duelBadge: {
    color: '#FFD166',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  meta: { marginBottom: 6, fontVariant: ['tabular-nums'] },
  question: { fontWeight: '800', lineHeight: 24, marginBottom: 12 },
  opts: { gap: 8 },
  opt: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(20,31,66,0.5)',
  },
});
