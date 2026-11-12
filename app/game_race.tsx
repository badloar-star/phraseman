/**
 * Игра «Гонка с собой» — перенос утверждённого макета (docs/design/v2-app/elevate-games.js, `race` → elevate-modes.js,
 * `blitz(ph, auto, true)`; итог — панель `P.record` из elevate-flow.js:76). Владелец 11.11.2026: «все анимации с макета»,
 * «код должен быть в точности перенесён». Числа — в modules/games/race_motion.ts, правила — в modules/games/race_core.ts.
 *
 * Ход: минута, вопрос — фраза урока на изучаемом языке, четыре перевода. Верный ответ двигает верхнюю монету,
 * нижняя идёт по вчерашнему заходу — по мгновениям его верных ответов. Три ошибки или конец минуты → «Минута вышла»,
 * панель «Сегодня / Вчера / Рекорд». Материал — фразы текущего урока; нет курса или язык интерфейса совпадает с
 * изучаемым — заданий нет (перевод совпал бы с фразой), чужой язык не подставляется.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import SkillsSessionGrowth from '../components/skills/SkillsSessionGrowth';
import GameAnswerTile from '../components/games/GameAnswerTile';
import GameRise from '../components/games/GameRise';
import { CoinImage } from '../components/profile-card/ProfileCardCoin';
import { useShadowGlass } from '../components/v2/ShadowSurface';
import { V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { flowTranslation } from '../modules/games/flow_core';
import {
  INITIAL_RACE_STATE, answerRace, buildRaceQuestions, formatRaceClock, ghostCorrectAt, peekRaceHistory,
  raceDayKey, raceQuestionAt, raceSecondsLeft, raceShare, refreshRaceHistory, saveRaceRun, subscribeRaceHistory,
  yesterdayRun, type RaceItem, type RaceState,
} from '../modules/games/race_core';
import { RACE_EASE, RACE_MOTION as M } from '../modules/games/race_motion';
import { currentGameLesson, isFlowAvailable } from '../modules/games/task_source';
import { markWarmupGamePlayed } from '../modules/games/warmup_state';
import { noteSkillAction } from '../modules/skills/skill_store';
import { useSkillSession } from '../modules/skills/use_skill_session';
import { getClassicLessonPhrases, isClassicCourseLang } from './classic_course_phrases';
import { safeRouterBack } from './navigation_back';

const LOG = '[GAME-RACE]';

const COPY = {
  title: { ru: 'Гонка с собой', uk: 'Перегони з собою', es: 'Carrera contigo', en: 'Race yourself' },
  pick: { ru: 'Выбери перевод', uk: 'Обери переклад', es: 'Elige la traducción', en: 'Choose the translation' },
  today: { ru: 'Сегодня', uk: 'Сьогодні', es: 'Hoy', en: 'Today' },
  yesterday: { ru: 'Вчера', uk: 'Учора', es: 'Ayer', en: 'Yesterday' },
  record: { ru: 'Рекорд', uk: 'Рекорд', es: 'Récord', en: 'Record' },
  timeUp: { ru: 'Минута вышла', uk: 'Хвилина минула', es: 'Se acabó el minuto', en: 'Time’s up' },
  correct: { ru: 'Верных', uk: 'Правильних', es: 'Aciertos', en: 'Correct' },
  done: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
  empty: { ru: 'Для игры пока нет заданий', uk: 'Для гри поки немає завдань', es: 'Aún no hay tareas para este juego', en: 'No tasks for this game yet' },
} as const;

const bezier = (c: readonly number[]) => Easing.bezier(c[0], c[1], c[2], c[3]);

type Phase = 'play' | 'ending' | 'over';

/** Сердце в шапке: `.hearts svg.lost` — гаснет до .25 за 300 мс и сжимается до .7 за 400 мс «пружиной». */
const Heart = memo(function Heart({ lost, color }: Readonly<{ lost: boolean; color: string }>) {
  const reduceMotion = useReduceMotion();
  const fade = useSharedValue(1);
  const scale = useSharedValue(1);
  useEffect(() => {
    fade.value = withTiming(lost ? M.heartLostOpacity : 1, { duration: reduceMotion ? 0 : M.heartFadeMs });
    scale.value = withTiming(lost ? M.heartLostScale : 1, { duration: reduceMotion ? 0 : M.heartScaleMs, easing: bezier(RACE_EASE.spring) });
    return () => {
      cancelAnimation(fade);
      cancelAnimation(scale);
    };
  }, [fade, lost, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ scale: scale.value }] }));
  return <Reanimated.View style={style}><Ionicons name="heart" size={M.heartSize} color={color} /></Reanimated.View>;
});

/** Монета на дорожке: верхняя едет 600 мс `--out`, нижняя («вчера») — 1000 мс линейно, серая и полупрозрачная. */
const LaneCoin = memo(function LaneCoin({ x, ghost }: Readonly<{ x: number; ghost: boolean }>) {
  const reduceMotion = useReduceMotion();
  const pos = useSharedValue(0);
  useEffect(() => {
    pos.value = withTiming(x, { duration: reduceMotion ? 0 : ghost ? M.ghostMoveMs : M.meMoveMs, easing: ghost ? Easing.linear : bezier(RACE_EASE.out) });
    return () => cancelAnimation(pos);
  }, [ghost, pos, reduceMotion, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value }] }));
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[s.coin, { top: (ghost ? M.laneTopYesterday : M.laneTopToday) + M.coinShiftY }, ghost && s.coinGhost, style]}
    >
      <CoinImage rank={M.coinRank} size={M.coinSize} />
    </Reanimated.View>
  );
});

/** Полоса времени `.tbar`: сжимается за минуту линейно; конец захода обрывает её в ноль. */
const TimeBar = memo(function TimeBar({ running, track, fill, glow }: Readonly<{ running: boolean; track: string; fill: string; glow: boolean }>) {
  const left = useSharedValue(1);
  useEffect(() => {
    if (!running) {
      cancelAnimation(left);
      left.value = 0;
      return undefined;
    }
    left.value = withTiming(0, { duration: M.durationMs, easing: Easing.linear });
    return () => cancelAnimation(left);
  }, [left, running]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: left.value }] }));
  return (
    <View style={[s.tbar, { backgroundColor: track }]}>
      <Reanimated.View style={[s.tbarFill, { backgroundColor: fill, transformOrigin: 'left' }, glow && s.tbarGlow, style]} />
    </View>
  );
});

/** Текст вопроса: `.qcard.swap .q` — новый вопрос поднимается 420 мс `--out` из прозрачности и сдвига 18. */
const SwapText = memo(function SwapText({ text, style }: Readonly<{ text: string; style: StyleProp<TextStyle> }>) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      t.value = 1;
      return undefined;
    }
    t.value = 0;
    t.value = withTiming(1, { duration: M.swapMs, easing: bezier(RACE_EASE.out) });
    return () => cancelAnimation(t);
  }, [reduceMotion, t, text]);
  const animated = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 18 }] }));
  return <Reanimated.Text style={[style, animated]}>{text}</Reanimated.Text>;
});

/** Строка панели `.rec`: подпись 78, полоса 8, число; полоса заполняется через 900 мс за 1100 мс `cubic-bezier(.2,.8,.2,1)`. */
const RecordRow = memo(function RecordRow({ label, value, old }: Readonly<{ label: string; value: number; old: boolean }>) {
  const p = useV2Palette();
  const reduceMotion = useReduceMotion();
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = reduceMotion ? raceShare(value) : withDelay(M.recordFillDelayMs, withTiming(raceShare(value), { duration: M.recordFillMs, easing: bezier(RACE_EASE.fill) }));
    return () => cancelAnimation(fill);
  }, [fill, reduceMotion, value]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  return (
    <View style={s.rec}>
      <Text style={[s.recLabel, { color: p.textSecondary }]}>{label}</Text>
      <View style={[s.recBar, { backgroundColor: p.track }]}>
        <Reanimated.View style={[StyleSheet.absoluteFill, s.recFill, { backgroundColor: p.text, opacity: old ? M.recordOldOpacity : 1, transformOrigin: 'left' }, style]} />
      </View>
      <Text style={[s.recValue, { color: p.text }]}>{String(value)}</Text>
    </View>
  );
});

export default function GameRaceScreen() {
  const router = useRouter();
  useSkillSession(); // занятие объявляет сам режим — только его прирост попадёт в «Навыки растут»
  const p = useV2Palette();
  const g = useShadowGlass();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();

  // зачем (владелец 11.11: «фразы должны корректно подбираться», «оно должно работать на всех языках»): материал — фразы
  // урока, на котором человек сейчас, на языке, который он учит; нет курса или интерфейс на том же языке — пустой итог
  const questions = useMemo(() => {
    if (!isClassicCourseLang(studyTarget) || !isFlowAvailable(studyTarget, lang)) {
      console.warn(`${LOG} material:unavailable ${JSON.stringify({ studyTarget, lang })}`); // guard-ok: ранний выход с причиной
      return [];
    }
    const lesson = currentGameLesson(studyTarget);
    const pool: RaceItem[] = getClassicLessonPhrases(lesson, studyTarget).map((phrase) => ({
      id: `${studyTarget}:${lesson}:${String(phrase.id)}`, text: phrase.english, translation: flowTranslation(phrase, lang),
    }));
    const built = buildRaceQuestions(pool);
    if (built.length === 0) console.warn(`${LOG} material:empty ${JSON.stringify({ studyTarget, lesson, pool: pool.length })}`); // guard-ok: ранний выход с причиной
    return built;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyTarget]);
  const empty = questions.length === 0;

  // история — сразу из памяти, диск дочитывается фоном (нижняя монета догонит, когда прочитается)
  const history = useSyncExternalStore(subscribeRaceHistory, peekRaceHistory, peekRaceHistory);
  useEffect(() => {
    void refreshRaceHistory();
  }, []);
  const today = useMemo(() => raceDayKey(Date.now()), []);
  const ghostRun = yesterdayRun(history, today);

  const [game, setGame] = useState<RaceState>(INITIAL_RACE_STATE);
  const [phase, setPhase] = useState<Phase>(empty ? 'over' : 'play');
  const [picked, setPicked] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [ghostAt, setGhostAt] = useState(0);
  const [laneWidth, setLaneWidth] = useState(0);
  const [result, setResult] = useState<{ today: number; yesterday: number; best: number } | null>(null);
  const startedAt = useRef(Date.now());
  const shownAt = useRef(Date.now());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lock = useRef(false);
  const ended = useRef(false);
  const ghostStarted = useRef(false);
  const gameRef = useRef(game);
  gameRef.current = game;

  const question = raceQuestionAt(questions, game.asked);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // конец захода: ответы закрыты сразу, «Минута вышла» и панель — через 900 мс, как в макете
  const finish = useCallback((final: RaceState) => {
    // зачем: конец минуты и последний ответ могут совпасть — заход заканчивается и сохраняется ровно один раз
    if (ended.current) return;
    ended.current = true;
    lock.current = true;
    clearTimers();
    setPhase('ending');
    timers.current.push(setTimeout(() => {
      setPhase('over');
      setElapsed(M.durationMs);
      const prevBest = peekRaceHistory()?.best ?? 0;
      setResult({ today: final.correct, yesterday: ghostRun?.correct ?? 0, best: Math.max(prevBest, final.correct) });
      console.log(`${LOG} run:over ${JSON.stringify({ correct: final.correct, misses: final.misses, lives: final.lives })}`); // guard-ok: итог захода
      void saveRaceRun(today, { correct: final.correct, marks: final.marks });
      // зачем: разминка помечает игру сыгранной по факту итога; на карте — число верных, как «Сегодня · N» на дорожке
      markWarmupGamePlayed('race', String(final.correct));
    }, M.endDelayMs));
  }, [clearTimers, ghostRun, today]);

  // часы: раз в секунду — таймер «0:47» и шаг нижней монеты; конец минуты заканчивает заход
  useEffect(() => {
    if (empty || phase === 'over') return undefined;
    const id = setInterval(() => {
      const now = Date.now() - startedAt.current;
      setElapsed(now);
      setGhostAt(now + M.tickMs);
      if (!(now < M.durationMs)) finish(gameRef.current);
    }, M.tickMs);
    // зачем: нижняя монета трогается один раз через 300 мс после старта; повторный запуск часов (догрузилась
    // история) не должен отбрасывать её назад
    const first = ghostStarted.current ? null : setTimeout(() => {
      ghostStarted.current = true;
      setGhostAt((at) => Math.max(at, M.tickMs + M.ghostStartMs));
    }, M.ghostStartMs);
    return () => {
      clearInterval(id);
      if (first) clearTimeout(first);
    };
  }, [empty, finish, phase]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const onPick = useCallback((index: number) => {
    if (phase !== 'play' || lock.current || !question) return; // защита от двойного тапа
    lock.current = true;
    const now = Date.now();
    const outcome = answerRace(game, question, index, now - startedAt.current);
    setPicked(index);
    setGame(outcome.state);
    if (outcome.correct) {
      noteSkillAction({ action: 'blitz_correct', itemKey: `race:${question.id}` });
      noteSkillAction({ action: 'blitz_fast', itemKey: `race:${question.id}`, answerMs: now - shownAt.current });
    }
    if (outcome.over) {
      finish(outcome.state);
      return;
    }
    timers.current.push(setTimeout(() => {
      setPicked(null);
      shownAt.current = Date.now();
      lock.current = false;
    }, outcome.correct ? M.afterOkMs : M.afterMissMs));
  }, [finish, game, phase, question]);

  const onClose = useCallback(() => {
    clearTimers();
    safeRouterBack(router, '/(tabs)/home' as never);
  }, [clearTimers, router]);

  const onLane = useCallback((e: LayoutChangeEvent) => setLaneWidth(e.nativeEvent.layout.width), []);
  const travel = Math.max(0, laneWidth - M.coinSize);
  const ghostCount = ghostRun ? ghostCorrectAt(ghostRun.marks, Math.min(ghostAt, M.durationMs)) : 0;
  const over = phase === 'over';
  // плитки видны в игре и в паузе после последнего ответа; «Минута вышла» их убирает (`ans.innerHTML = ''`)
  const showAnswers = phase === 'play' || (phase === 'ending' && picked !== null);
  // зачем: пока идёт пауза после ответа, вопрос остаётся прежним — следующий появится вместе с новыми плитками
  const shown = picked === null ? question : raceQuestionAt(questions, game.asked - 1);
  // в макете таймер и полоса обнуляются вместе с «Минута вышла», а не в момент последнего ответа
  const clock = over ? '0:00' : formatRaceClock(raceSecondsLeft(elapsed));

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="close" onPress={onClose} accessibilityLabel={triLang(lang, COPY.close)} testID="game-race-close" />
            <Text style={[s.title, { color: p.text }]}>{triLang(lang, COPY.title)}</Text>
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <View style={s.hearts}>
                {/* guard-ok: сердца одного захода в памяти экрана, не баланс и не опыт */}
                {Array.from({ length: M.lives }, (_, i) => <Heart key={`heart-${i}`} lost={i >= game.lives} color={g.isLight ? p.wrong : p.text} />)}
              </View>
            </View>
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{clock}</Text>
            </View>
          </View>

          <TimeBar running={!empty && !over} track={p.track} fill={p.text} glow={!g.isLight} />

          <View style={s.race} onLayout={onLane}>
            <View style={[s.lane, { top: M.laneTopToday, backgroundColor: p.track }]} />
            <View style={[s.lane, { top: M.laneTopYesterday, backgroundColor: p.track }]} />
            <LaneCoin x={raceShare(game.correct) * travel} ghost={false} />
            <LaneCoin x={raceShare(ghostCount) * travel} ghost />
            <Text style={[s.laneLabel, { top: M.labelTopToday, color: p.textSecondary }]}>{`${triLang(lang, COPY.today)} · ${game.correct}`}</Text>
            <Text style={[s.laneLabel, { top: M.labelTopYesterday, color: p.textSecondary }]}>{`${triLang(lang, COPY.yesterday)} · ${ghostRun?.correct ?? 0}`}</Text>
          </View>

          <V2Card style={s.qcard}>
            <Text style={[s.kicker, { color: p.textSecondary }]}>
              {over ? (empty ? '' : `${triLang(lang, COPY.correct)}: ${game.correct}`) : triLang(lang, COPY.pick)}
            </Text>
            <SwapText text={over ? triLang(lang, empty ? COPY.empty : COPY.timeUp) : shown?.text ?? ''} style={[s.question, { color: p.text }]} />
          </V2Card>

          <View style={s.flex} />

          {over ? (
            <GameRise style={s.finish}>
              {result ? (
                <V2Card style={s.panel}>
                  <Text style={[s.panelTitle, { color: p.text }]}>{triLang(lang, COPY.title)}</Text>
                  <RecordRow label={triLang(lang, COPY.today)} value={result.today} old={false} />
                  <RecordRow label={triLang(lang, COPY.yesterday)} value={result.yesterday} old />
                  <RecordRow label={triLang(lang, COPY.record)} value={result.best} old />
                </V2Card>
              ) : null}
              <SkillsSessionGrowth style={s.growth} />
              <V2Button testID="game-race-done" label={triLang(lang, COPY.done)} onPress={onClose} style={s.doneBtn} />
            </GameRise>
          ) : (
            <View style={s.answers}>
              {showAnswers && shown ? shown.options.map((option, i) => (
                <GameAnswerTile
                  key={`${shown.id}-${game.asked - (picked === null ? 0 : 1)}-${i}`}
                  testID={`game-race-option-${i}`}
                  label={option}
                  index={i}
                  disabled={phase !== 'play' || picked !== null}
                  state={picked === null ? 'idle' : i === shown.correctIndex ? 'correct' : i === picked ? 'wrong' : 'off'}
                  onPress={() => onPick(i)}
                />
              )) : null}
            </View>
          )}
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: V2.screenPad, paddingTop: 8, paddingBottom: 16 },
  top: { flexDirection: 'row', alignItems: 'center', gap: M.topGap, height: M.topHeight },
  title: { flex: 1, fontSize: M.titleSize, lineHeight: 26, fontWeight: '700' },
  pill: { height: M.pillHeight, paddingHorizontal: M.pillPadH, borderRadius: M.pillRadius, justifyContent: 'center', alignItems: 'center' },
  pillText: { fontSize: M.pillTextSize, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: M.heartGap },
  tbar: { height: M.barHeight, borderRadius: M.barRadius, marginTop: M.barMarginTop, overflow: 'hidden' },
  tbarFill: { height: '100%', borderRadius: M.barRadius },
  tbarGlow: { boxShadow: `0px 0px ${M.barGlowRadius}px rgba(255,255,255,${M.barGlowOpacity})` },
  race: { height: M.raceHeight, marginTop: M.raceMarginTop },
  lane: { position: 'absolute', left: M.laneInset, right: M.laneInset, height: M.laneHeight, borderRadius: M.laneRadius },
  coin: { position: 'absolute', left: 0, width: M.coinSize, height: M.coinSize },
  // зачем: `filter: grayscale(1)` из макета телефон умеет только на Android; на iOS остаётся полупрозрачность .5
  coinGhost: { opacity: M.ghostOpacity, ...(Platform.OS === 'android' ? { filter: [{ grayscale: 1 }] } : null) },
  laneLabel: { position: 'absolute', right: 0, fontSize: M.labelSize, lineHeight: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  qcard: { paddingVertical: M.cardPadV, paddingHorizontal: M.cardPadH, marginTop: M.cardMarginTop, minHeight: M.cardMinHeight, justifyContent: 'center' },
  kicker: { textAlign: 'center', fontSize: M.kickerSize, lineHeight: 20, minHeight: 20 },
  question: { textAlign: 'center', fontSize: M.questionSize, lineHeight: M.questionLine, fontWeight: '800', letterSpacing: M.questionLetter, marginTop: M.questionMarginTop },
  answers: { gap: 12, minHeight: 4 * 60 + 3 * 12, justifyContent: 'flex-end' },
  finish: { gap: 0 },
  panel: { paddingVertical: M.panelPadV, paddingHorizontal: M.panelPadH },
  panelTitle: { fontSize: M.panelTitleSize, lineHeight: M.panelTitleLine, fontWeight: '700' },
  rec: { flexDirection: 'row', alignItems: 'center', gap: M.recordGap, marginTop: M.recordRowMarginTop },
  recLabel: { width: M.recordLabelWidth, fontSize: M.recordTextSize, lineHeight: 18 },
  recBar: { flex: 1, height: M.recordBarHeight, borderRadius: M.recordBarRadius, overflow: 'hidden' },
  recFill: { borderRadius: M.recordBarRadius },
  recValue: { minWidth: 24, textAlign: 'right', fontSize: M.recordValueSize, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  growth: { marginTop: 22 },
  doneBtn: { marginTop: 16 },
});
