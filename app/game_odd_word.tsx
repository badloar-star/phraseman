/**
 * Игра «Лишнее слово» — перенос утверждённого макета (docs/design/v2-app/elevate-mechanics.app.js, `cut()`).
 * Владелец 11.11.2026: «самое главное — механики», «все анимации с макета», «код должен быть в точности перенесён».
 *
 * Ход: фраза с одним лишним словом → нажатие роняет слово (соседи съезжаются) → перевод и объяснение →
 * монета делает шаг по тропе → следующая фраза. Промах: слово краснеет и вздрагивает, серия обнуляется.
 * зачем так: правила и геометрия тропы — в modules/games/odd_word_core; экран получает готовый список заданий.
 *
 * Движение — из макета в точности (elevate-mechanics.css:137–150), числа — в constants/gameMotion.ts:
 *  • слова поднимаются лесенкой по 60 мс (520 мс, сдвиг 18);
 *  • промах: красный тон за 220 мс и дрожь 380 мс; тон держится, пока не найдено лишнее слово;
 *  • лишнее слово вынимается из строки и падает 520 мс cubic-bezier(.45,0,.9,.5): вниз на 240 с поворотом 26°,
 *    гаснет после 45 % пути; соседи съезжаются 520 мс cubic-bezier(.2,1,.3,1) с задержкой 180 мс;
 *  • через 480 мс: слова по очереди (70 мс) приподнимаются на 3 и светятся (900 мс), проявляются перевод (320 мс)
 *    и объяснение (360 / 520 мс), монета переходит на точку (900 мс cubic-bezier(.2,.9,.2,1)) с подскоком на 16;
 *  • счётчик серии подскакивает (650 мс).
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, {
  Easing, LinearTransition, cancelAnimation, interpolateColor, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import { MyRankCoin } from '../components/rank/MyRankCoin';
import { useStudyTarget } from '../components/StudyTargetContext';
import { newGameAttemptKey, noteGameMistake } from '../modules/games/game_mistake_capture';
import ScreenGradient from '../components/ScreenGradient';
import GameBumpText from '../components/games/GameBumpText';
import GameReveal from '../components/games/GameReveal';
import SkillsSessionGrowth from '../components/skills/SkillsSessionGrowth';
import { V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { GAME_EASE, GAME_MOTION } from '../constants/gameMotion';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { hapticTap } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import {
  INITIAL_ODD_WORD_STATE, ODD_WORD_DURATION_SEC, ODD_WORD_TRAIL_H, ODD_WORD_TRAIL_PATH, ODD_WORD_TRAIL_W,
  nextOddWordRound, oddWordTrail, tapOddWord,
} from '../modules/games/odd_word_core';
import { currentGameLesson, dailyPortion, oddWordTasksFor } from '../modules/games/task_source';
import { markWarmupGamePlayed } from '../modules/games/warmup_state';
import { noteGameResult } from '../modules/games/game_records';
import { exitGameWithMinute } from '../components/games/gameExit';
import { noteSkillAction } from '../modules/skills/skill_store';
import { useSkillSession } from '../modules/skills/use_skill_session';
import { safeRouterBack } from './navigation_back';

const COIN = 44;
const ROUNDS = 4;
const bezier = (c: readonly number[]) => Easing.bezier(c[0], c[1], c[2], c[3]);
const FLIP = LinearTransition.duration(GAME_MOTION.oddFlipMs).delay(GAME_MOTION.oddFlipDelayMs).easing(bezier(GAME_EASE.out));

const COPY = {
  ask: { ru: 'Убери лишнее слово', uk: 'Прибери зайве слово', es: 'Quita la palabra que sobra', en: 'Remove the extra word' },
  doneTitle: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  timeUp: { ru: 'Минута вышла', uk: 'Хвилина минула', es: 'Se acabó el minuto', en: 'Time is up' },
  // зачем (найдено на эмуляторе 11.11): «4 фраз очищено» — число перед словом заставляет склонять; пишем «Очищено фраз: 4»
  solved: { ru: 'Очищено фраз', uk: 'Очищено фраз', es: 'Frases limpias', en: 'Phrases cleaned' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
} as const;

type Point = Readonly<{ x: number; y: number }>;
type WordProps = Readonly<{
  text: string;
  index: number;
  /** Сколько раз по слову промахнулись в этой фразе: 0 — обычное; рост числа запускает дрожь заново. */
  misses: number;
  /** Лишнее слово найдено — оно вынуто из строки и падает из точки `origin`. */
  dropped: boolean;
  origin: Point | null;
  /** Фраза очищена — слово приподнимается и светится. */
  glow: boolean;
  ink: string;
  bad: string;
  dropFill: string;
  disabled: boolean;
  onPress: (index: number) => void;
  onPlace: (index: number, at: Point) => void;
}>;

const OddWord = memo(function OddWord({ text, index, misses, dropped, origin, glow, ink, bad, dropFill, disabled, onPress, onPlace }: WordProps) {
  const reduceMotion = useReduceMotion();
  const rise = useSharedValue(reduceMotion ? 1 : 0);
  const shake = useSharedValue(0);
  const tone = useSharedValue(0);
  const drop = useSharedValue(0);
  const dropFade = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      rise.value = 1;
      return undefined;
    }
    rise.value = withDelay(index * GAME_MOTION.oddRiseStaggerMs, withTiming(1, { duration: GAME_MOTION.riseMs, easing: bezier(GAME_EASE.out) }));
    return () => cancelAnimation(rise);
  }, [index, reduceMotion, rise]);

  useEffect(() => {
    tone.value = withTiming(misses > 0 ? 1 : 0, { duration: reduceMotion ? 0 : GAME_MOTION.oddTintMs, easing: bezier(GAME_EASE.ease) });
    if (misses === 0 || reduceMotion) return undefined;
    // макет при промахе снимает подъём (`classList.remove('rise')`): слово сразу стоит на месте
    cancelAnimation(rise);
    rise.value = 1;
    let previous = 0;
    shake.value = 0;
    shake.value = withSequence(...GAME_MOTION.shakeStops.map((stop) => {
      const duration = (stop.at - previous) * GAME_MOTION.shakeMs;
      previous = stop.at;
      return withTiming(stop.x, { duration, easing: bezier(GAME_EASE.ease) });
    }));
    return () => cancelAnimation(shake);
  }, [misses, reduceMotion, rise, shake, tone]);

  useEffect(() => {
    if (!dropped) return undefined;
    cancelAnimation(rise);
    rise.value = 1;
    if (reduceMotion) {
      drop.value = 1;
      dropFade.value = 1;
      return undefined;
    }
    const ease = bezier(GAME_MOTION.oddDropEase);
    drop.value = withTiming(1, { duration: GAME_MOTION.oddDropMs, easing: ease });
    // `@keyframes drop { 45% { opacity: 1 } 100% { opacity: 0 } }` — гаснет только на второй части пути
    dropFade.value = withDelay(GAME_MOTION.oddDropMs * GAME_MOTION.oddDropFadeFrom, withTiming(1, { duration: GAME_MOTION.oddDropMs * (1 - GAME_MOTION.oddDropFadeFrom), easing: ease }));
    return () => {
      cancelAnimation(drop);
      cancelAnimation(dropFade);
    };
  }, [drop, dropFade, dropped, reduceMotion, rise]);

  useEffect(() => {
    if (!glow || dropped || reduceMotion) return undefined;
    const easeOut = bezier(GAME_EASE.easeOut);
    lift.value = withDelay(index * GAME_MOTION.oddGlowStaggerMs, withSequence(
      withTiming(1, { duration: GAME_MOTION.oddGlowMs * GAME_MOTION.oddGlowPeakAt, easing: easeOut }),
      withTiming(0, { duration: GAME_MOTION.oddGlowMs * (1 - GAME_MOTION.oddGlowPeakAt), easing: easeOut }),
    ));
    return () => cancelAnimation(lift);
  }, [dropped, glow, index, lift, reduceMotion]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: rise.value * (1 - dropFade.value),
    transform: [
      { translateX: shake.value },
      { translateY: (1 - rise.value) * GAME_MOTION.riseShift + drop.value * GAME_MOTION.oddDropY + lift.value * GAME_MOTION.oddGlowShift },
      { rotate: `${drop.value * GAME_MOTION.oddDropRotate}deg` },
    ],
  }));
  const tintStyle = useAnimatedStyle(() => ({ opacity: tone.value * GAME_MOTION.tileTintOpacity }));
  const textStyle = useAnimatedStyle(() => ({ color: interpolateColor(tone.value, [0, 1], [ink, bad]), textShadowRadius: lift.value * GAME_MOTION.oddGlowRadius }));

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    // зачем: место слова в строке запоминается, пока оно в потоке, — оттуда оно и упадёт
    if (!dropped) onPlace(index, { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y });
  }, [dropped, index, onPlace]);

  return (
    <Reanimated.View layout={FLIP} onLayout={onLayout} pointerEvents={dropped ? 'none' : 'auto'} style={dropped && origin ? [s.wordOut, { left: origin.x, top: origin.y }] : null}>
      <Reanimated.View style={wrapStyle}>
        <Pressable accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ disabled }} disabled={disabled} onPressIn={() => { void hapticTap(); }} onPress={() => onPress(index)} style={[s.word, dropped && { backgroundColor: dropFill }]}>
          <Reanimated.View pointerEvents="none" style={[s.wordTint, { backgroundColor: bad }, tintStyle]} />
          <Reanimated.Text style={[s.wordText, s.wordGlow, textStyle]}>{text}</Reanimated.Text>
        </Pressable>
      </Reanimated.View>
    </Reanimated.View>
  );
});

export default function GameOddWordScreen() {
  const router = useRouter();
  useSkillSession(); // занятие объявляет сам режим — только его прирост попадёт в «Навыки растут»
  const p = useV2Palette();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const attemptKey = useRef(newGameAttemptKey());
  const reduceMotion = useReduceMotion();
  // зачем (владелец 11.11: «фразы должны корректно подбираться»): задания — из банка по уроку, на котором сейчас человек,
  // и только для языка, который он учит; порция меняется от дня к дню и не тасуется при повторном рендере
  const tasks = useMemo(() => dailyPortion(oddWordTasksFor(studyTarget, currentGameLesson(studyTarget)), ROUNDS, Math.floor(Date.now() / 86400000)), [studyTarget]);
  const trail = useMemo(() => oddWordTrail(tasks.length), [tasks.length]);

  const [game, setGame] = useState(INITIAL_ODD_WORD_STATE);
  const [removed, setRemoved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState<'done' | 'time' | null>(tasks.length === 0 ? 'done' : null);
  const [misses, setMisses] = useState<Readonly<Record<number, number>>>({});
  const [origin, setOrigin] = useState<Point | null>(null);
  // сколько фраз очищено к этому моменту на тропе: белая линия встаёт сразу, как в макете (у неё нет перехода)
  const [walked, setWalked] = useState(0);
  // серия подскакивает только когда выросла — при обнулении промахом в макете подскока нет
  const [streakBump, setStreakBump] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ODD_WORD_DURATION_SEC);
  const [trailWidth, setTrailWidth] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const places = useRef<Record<number, Point>>({});
  const lock = useRef(false);
  const step = useSharedValue(0);
  const hop = useSharedValue(0);

  const task = tasks[Math.min(game.round, tasks.length - 1)];
  // зачем (найдено на записи 11.11): перевод и объяснение держат текст той фразы, которую показали, — пока блок гаснет
  // перед новой фразой, в нём не должен мелькать текст следующей (в макете текст меняется только при показе)
  const [explained, setExplained] = useState(task);
  const shownTask = explained ?? task;

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    cancelAnimation(step);
    cancelAnimation(hop);
  }, [hop, step]);

  useEffect(() => {
    if (finished) return undefined;
    const id = setInterval(() => setSecondsLeft((sec) => Math.max(0, sec - 1)), 1000);
    return () => clearInterval(id);
  }, [finished]);

  useEffect(() => {
    if (secondsLeft === 0 && !finished) {
      timers.current.forEach(clearTimeout);
      setFinished('time');
    }
  }, [finished, secondsLeft]);

  // зачем: разминка помечает игру сыгранной по факту итога; результат уходит в метку на карте игры
  useEffect(() => {
    if (!finished || tasks.length === 0) return;
    markWarmupGamePlayed('odd_word', `${game.solved}/${tasks.length}`);
    // рекорд — сколько фраз очищено за минуту; запись никогда не бросает
    noteGameResult('odd_word', game.solved);
  }, [finished, game.solved, tasks.length]);

  const onPlace = useCallback((index: number, at: Point) => {
    places.current = { ...places.current, [index]: at };
  }, []);

  const onTap = useCallback((index: number) => {
    if (lock.current || finished || !task) return;
    const result = tapOddWord(game, task, index);
    setGame(result.state);
    if (!result.correct) {
      setMisses((prev) => ({ ...prev, [index]: (prev[index] ?? 0) + 1 }));
      // зачем (D207, связь игр и ошибок): первая ошибка на фразе уходит в «Мои ошибки» — верная фраза и её перевод
      if (!game.missedThisRound) noteGameMistake({ game: 'odd_word', studyTarget, itemId: task.id, target: task.words.filter((_, i) => i !== task.extraIndex).join(' '), meaning: task.translation, given: task.words[index] ?? '', attemptKey: attemptKey.current });
      return;
    }
    lock.current = true;
    const from = places.current[index] ?? null;
    if (!from) console.warn('[GAME_ODD] word place unknown, drop starts in flow', index); // guard-ok: ранний выход, остаётся навсегда
    setOrigin(from);
    setMisses({});
    setRemoved(true);
    setStreakBump((n) => n + 1);
    // зачем (D207): строка таблицы «Лишнее слово: верный ответ» → «Грамматика»
    noteSkillAction({ action: 'odd_word_sorting_correct', itemKey: `odd:${task.id}` });
    const solved = result.state.solved;
    timers.current.push(setTimeout(() => {
      setExplained(task);
      setRevealed(true);
      setWalked(solved);
      if (reduceMotion) {
        step.value = solved;
        return;
      }
      step.value = withTiming(solved, { duration: GAME_MOTION.coinMoveMs, easing: bezier(GAME_MOTION.coinMoveEase) });
      // `@keyframes hop { 40% { translateY(-16px) scale(1.12) } }` — 900 мс `--out`
      const out = bezier(GAME_EASE.out);
      hop.value = withSequence(
        withTiming(1, { duration: GAME_MOTION.coinMoveMs * GAME_MOTION.coinHopPeakAt, easing: out }),
        withTiming(0, { duration: GAME_MOTION.coinMoveMs * (1 - GAME_MOTION.coinHopPeakAt), easing: out }),
      );
    }, GAME_MOTION.oddRevealDelayMs));
    timers.current.push(setTimeout(() => {
      if (game.round >= tasks.length - 1) {
        setFinished('done');
        return;
      }
      places.current = {};
      setGame((prev) => nextOddWordRound(prev));
      setRemoved(false);
      setRevealed(false);
      setOrigin(null);
      lock.current = false;
    }, GAME_MOTION.oddNextMs));
  }, [finished, game, hop, reduceMotion, step, task, tasks.length, studyTarget]);

  const onClose = useCallback(() => {
    timers.current.forEach(clearTimeout);
    safeRouterBack(router, '/(tabs)/home' as never);
  }, [router]);
  // «Готово» после итога: была ошибка — сначала «Минута знаний»
  const onDone = useCallback(() => {
    timers.current.forEach(clearTimeout);
    exitGameWithMinute(router, { misses: game.misses });
  }, [game.misses, router]);

  const scale = trailWidth > 0 ? trailWidth / ODD_WORD_TRAIL_W : 0;
  const stops = trail.stops;
  const coinStyle = useAnimatedStyle(() => {
    const i = Math.max(0, Math.min(stops.length - 1, Math.floor(step.value)));
    const j = Math.min(stops.length - 1, i + 1);
    const t = step.value - i;
    const cx = stops[i].x + (stops[j].x - stops[i].x) * t;
    const cy = stops[i].y + (stops[j].y - stops[i].y) * t;
    // зачем (найдено на записи 11.11): место старта задаётся обычным стилем, а здесь — только сдвиг от него;
    // иначе монета на первых кадрах стояла в углу тропы и прыгала на старт
    return { transform: [{ translateX: (cx - stops[0].x) * scale }, { translateY: (cy - stops[0].y) * scale }] };
  });
  const hopStyle = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value * GAME_MOTION.coinHopShift }, { scale: 1 + (GAME_MOTION.coinHopScale - 1) * hop.value }] }));
  const doneOffset = trail.length * (1 - walked / Math.max(1, stops.length - 1));

  const onTrailLayout = useCallback((e: LayoutChangeEvent) => setTrailWidth(e.nativeEvent.layout.width), []);
  const time = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="close" onPress={onClose} accessibilityLabel={triLang(lang, COPY.close)} testID="game-odd-close" />
            <View style={s.flex} />
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Ionicons name="flame" size={18} color={p.text} />
              <GameBumpText value={String(game.streak)} trigger={streakBump} style={[s.pillText, { color: p.text }]} />
            </View>
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{time}</Text>
            </View>
          </View>

          <View style={s.trail} onLayout={onTrailLayout}>
            {scale > 0 ? (
              <>
                <Svg width={trailWidth} height={ODD_WORD_TRAIL_H * scale} viewBox={`0 0 ${ODD_WORD_TRAIL_W} ${ODD_WORD_TRAIL_H}`}>
                  <Path d={ODD_WORD_TRAIL_PATH} fill="none" stroke={p.track} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 9" />
                  <Path d={ODD_WORD_TRAIL_PATH} fill="none" stroke={p.text} strokeWidth={3} strokeLinecap="round" strokeDasharray={trail.length} strokeDashoffset={doneOffset} />
                  {stops.slice(1).map((stop, k) => (
                    <Circle key={`stop-${stop.x}`} cx={stop.x} cy={stop.y} r={k === stops.length - 2 ? 7 : 4.5} fill={k === stops.length - 2 ? p.text : p.textMuted} />
                  ))}
                </Svg>
                <Reanimated.View style={[s.coin, { left: stops[0].x * scale - COIN / 2, top: stops[0].y * scale - COIN / 2 }, coinStyle]} pointerEvents="none">
                  <Reanimated.View style={hopStyle}>
                    <MyRankCoin style={s.coinImage} contentFit="contain" accessible={false} />
                  </Reanimated.View>
                </Reanimated.View>
              </>
            ) : null}
          </View>

          {finished ? (
            <View style={s.finish}>
              <Text style={[s.big, { color: p.text }]}>{triLang(lang, finished === 'time' ? COPY.timeUp : COPY.doneTitle)}</Text>
              <Text style={[s.sub, { color: p.textSecondary }]}>{`${triLang(lang, COPY.solved)}: ${game.solved}`}</Text>
              <SkillsSessionGrowth style={s.growth} />
              <View style={s.flex} />
              <V2Button testID="game-odd-done" label={triLang(lang, COPY.doneTitle)} onPress={onDone} />
            </View>
          ) : (
            <View style={s.stage}>
              <View style={s.stageTop} />
              <Text style={[s.ask, { color: p.textSecondary }]}>{triLang(lang, COPY.ask)}</Text>
              <View style={s.sentenceBox}>
              <View style={s.sentence}>
                {task.words.map((word, i) => (
                  <OddWord
                    key={`${task.id}-${i}`}
                    text={word}
                    index={i}
                    misses={misses[i] ?? 0}
                    dropped={removed && i === task.extraIndex}
                    origin={removed && i === task.extraIndex ? origin : null}
                    glow={revealed}
                    ink={p.text}
                    bad={p.wrong}
                    dropFill={p.track}
                    disabled={removed}
                    onPress={onTap}
                    onPlace={onPlace}
                  />
                ))}
              </View>
              </View>
              <GameReveal plain shown={revealed} style={s.translationWrap}>
                <Text style={[s.translation, { color: p.textSecondary }]}>{shownTask.translation}</Text>
              </GameReveal>
              <GameReveal shown={revealed} style={s.whyWrap}>
                <V2Card seed={1} style={s.why}>
                  <View style={[s.whyIcon, { backgroundColor: p.track }]}>
                    <Ionicons name="checkmark" size={20} color={p.text} />
                  </View>
                  <View style={s.whyText}>
                    <Text style={[s.whyTitle, { color: p.text }]}>{shownTask.whyTitle}</Text>
                    <Text style={[s.whyBody, { color: p.textSecondary }]}>{shownTask.whyText}</Text>
                  </View>
                </V2Card>
              </GameReveal>
              <View style={s.flex} />
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
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, height: V2.iconButton },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18 },
  pillText: { fontSize: 15, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  trail: { marginTop: 14, height: 96 },
  coin: { position: 'absolute', left: 0, top: 0, width: COIN, height: COIN },
  coinImage: { width: COIN, height: COIN },
  stage: { flex: 1 },
  stageTop: { flex: 0.5 },
  ask: { textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  // `.sent` макета: слова без плашек, крупные; ряд 8, между словами 6, место под две строки держится сразу
  // зачем обёртка (найдено на эмуляторе 11.11): одна строка слов при minHeight прилипала к верху — по высоте центрует обёртка
  sentenceBox: { marginTop: 8, minHeight: 180, justifyContent: 'center' },
  sentence: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 8, columnGap: 6, paddingHorizontal: 2 },
  word: { paddingVertical: 2, paddingHorizontal: 9, borderRadius: 14 },
  wordOut: { position: 'absolute' },
  wordTint: { ...StyleSheet.absoluteFillObject, borderRadius: 14 },
  wordText: { fontSize: 34, lineHeight: 44, fontWeight: '800', letterSpacing: -0.6 },
  wordGlow: { textShadowColor: 'rgba(255,255,255,0.95)', textShadowOffset: { width: 0, height: 0 } },
  translationWrap: { marginTop: 14 },
  translation: { minHeight: 22, textAlign: 'center', fontSize: 16, lineHeight: 22, fontWeight: '500' },
  whyWrap: { marginTop: 18 },
  why: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  whyIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  whyText: { flex: 1, gap: 2 },
  whyTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  whyBody: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  finish: { flex: 1, alignItems: 'stretch', paddingTop: 32 },
  big: { textAlign: 'center', fontSize: 30, lineHeight: 36, fontWeight: '800' },
  sub: { textAlign: 'center', marginTop: 6, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  growth: { marginTop: 22 },
});
