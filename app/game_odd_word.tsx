/**
 * Игра «Лишнее слово» — перенос утверждённого макета (docs/design/v2-app/elevate-mechanics.app.js, `cut()`).
 * Владелец 11.11.2026: «самое главное — механики».
 *
 * Ход: фраза с одним лишним словом → нажатие убирает слово (соседи съезжаются) → перевод и объяснение →
 * монета делает шаг по тропе → следующая фраза. Промах: слово вздрагивает, серия обнуляется.
 * зачем так: правила и геометрия тропы — в modules/games/odd_word_core; экран получает готовый список заданий.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, {
  Easing, FadeInDown, FadeOutDown, LinearTransition, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue,
  withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import { MyRankCoin } from '../components/rank/MyRankCoin';
import ScreenGradient from '../components/ScreenGradient';
import SkillsSessionGrowth from '../components/skills/SkillsSessionGrowth';
import { V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { hapticTap } from '../hooks/use-haptics';
import {
  INITIAL_ODD_WORD_STATE, ODD_WORD_DURATION_SEC, ODD_WORD_SEED_TASKS, ODD_WORD_TRAIL_H, ODD_WORD_TRAIL_PATH, ODD_WORD_TRAIL_W,
  isValidOddWordTask, nextOddWordRound, oddWordTrail, tapOddWord,
} from '../modules/games/odd_word_core';
import { noteSkillAction } from '../modules/skills/skill_store';
import { safeRouterBack } from './navigation_back';

const REVEAL_MS = 480;
const NEXT_MS = 2900;
const COIN = 44;
const AnimatedPath = Reanimated.createAnimatedComponent(Path);

const COPY = {
  ask: { ru: 'Убери лишнее слово', uk: 'Прибери зайве слово', es: 'Quita la palabra que sobra', en: 'Remove the extra word' },
  doneTitle: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  timeUp: { ru: 'Минута вышла', uk: 'Хвилина минула', es: 'Se acabó el minuto', en: 'Time is up' },
  solved: { ru: 'фраз очищено', uk: 'фраз очищено', es: 'frases limpias', en: 'phrases cleaned' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
} as const;

type WordProps = Readonly<{ text: string; index: number; shakeKey: number; color: string; chip: string; onPress: () => void; disabled: boolean }>;

const OddWord = memo(function OddWord({ text, index, shakeKey, color, chip, onPress, disabled }: WordProps) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (shakeKey === 0) return undefined;
    // промах: короткая дрожь, как `.w.no` в макете
    x.value = withSequence(withTiming(-6, { duration: 60 }), withTiming(6, { duration: 80 }), withTiming(-4, { duration: 80 }), withTiming(0, { duration: 80 }));
    return () => cancelAnimation(x);
  }, [shakeKey, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Reanimated.View entering={FadeInDown.duration(320).delay(index * 60)} exiting={FadeOutDown.duration(360)} layout={LinearTransition.duration(520).delay(180).easing(Easing.bezier(0.2, 1, 0.3, 1))} style={style}>
      <Pressable accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ disabled }} disabled={disabled} onPressIn={() => { void hapticTap(); }} onPress={onPress} style={({ pressed }) => [s.word, { backgroundColor: chip }, pressed && s.pressed]}>
        <Text style={[s.wordText, { color }]}>{text}</Text>
      </Pressable>
    </Reanimated.View>
  );
});

export default function GameOddWordScreen() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const tasks = useMemo(() => ODD_WORD_SEED_TASKS.filter(isValidOddWordTask), []);
  const trail = useMemo(() => oddWordTrail(tasks.length), [tasks.length]);

  const [game, setGame] = useState(INITIAL_ODD_WORD_STATE);
  const [removed, setRemoved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState<'done' | 'time' | null>(null);
  const [shake, setShake] = useState<{ index: number; key: number }>({ index: -1, key: 0 });
  const [secondsLeft, setSecondsLeft] = useState(ODD_WORD_DURATION_SEC);
  const [trailWidth, setTrailWidth] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lock = useRef(false);
  const step = useSharedValue(0);

  const task = tasks[Math.min(game.round, tasks.length - 1)];

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    cancelAnimation(step);
  }, [step]);

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

  const onTap = useCallback((index: number) => {
    if (lock.current || finished || !task) return;
    const result = tapOddWord(game, task, index);
    setGame(result.state);
    if (!result.correct) {
      setShake((prev) => ({ index, key: prev.key + 1 }));
      return;
    }
    lock.current = true;
    setRemoved(true);
    // зачем (D207): строка таблицы «Лишнее слово: верный ответ» → «Грамматика»
    noteSkillAction({ action: 'odd_word_sorting_correct', itemKey: `odd:${task.id}` });
    const solved = result.state.solved;
    timers.current.push(setTimeout(() => {
      setRevealed(true);
      step.value = withTiming(solved, { duration: 900, easing: Easing.bezier(0.2, 0.9, 0.2, 1) });
    }, REVEAL_MS));
    timers.current.push(setTimeout(() => {
      if (game.round >= tasks.length - 1) {
        setFinished('done');
        return;
      }
      setGame((prev) => nextOddWordRound(prev));
      setRemoved(false);
      setRevealed(false);
      lock.current = false;
    }, NEXT_MS));
  }, [finished, game, step, task, tasks.length]);

  const onClose = useCallback(() => {
    timers.current.forEach(clearTimeout);
    safeRouterBack(router, '/(tabs)/home' as never);
  }, [router]);

  const scale = trailWidth > 0 ? trailWidth / ODD_WORD_TRAIL_W : 0;
  const stops = trail.stops;
  const coinStyle = useAnimatedStyle(() => {
    const i = Math.max(0, Math.min(stops.length - 1, Math.floor(step.value)));
    const j = Math.min(stops.length - 1, i + 1);
    const t = step.value - i;
    const cx = stops[i].x + (stops[j].x - stops[i].x) * t;
    const cy = stops[i].y + (stops[j].y - stops[i].y) * t;
    return { transform: [{ translateX: cx * scale - COIN / 2 }, { translateY: cy * scale - COIN / 2 }] };
  });
  const doneProps = useAnimatedProps(() => ({ strokeDashoffset: trail.length * (1 - step.value / Math.max(1, stops.length - 1)) }));

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
              <Text style={[s.pillText, { color: p.text }]}>{game.streak}</Text>
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
                  <AnimatedPath d={ODD_WORD_TRAIL_PATH} fill="none" stroke={p.text} strokeWidth={3} strokeLinecap="round" strokeDasharray={trail.length} animatedProps={doneProps} />
                  {stops.slice(1).map((stop, k) => (
                    <Circle key={`stop-${stop.x}`} cx={stop.x} cy={stop.y} r={k === stops.length - 2 ? 7 : 4.5} fill={k === stops.length - 2 ? p.text : p.textMuted} />
                  ))}
                </Svg>
                <Reanimated.View style={[s.coin, coinStyle]} pointerEvents="none">
                  <MyRankCoin style={s.coinImage} contentFit="contain" accessible={false} />
                </Reanimated.View>
              </>
            ) : null}
          </View>

          {finished ? (
            <View style={s.finish}>
              <Text style={[s.big, { color: p.text }]}>{triLang(lang, finished === 'time' ? COPY.timeUp : COPY.doneTitle)}</Text>
              <Text style={[s.sub, { color: p.textSecondary }]}>{`${game.solved} ${triLang(lang, COPY.solved)}`}</Text>
              <SkillsSessionGrowth style={s.growth} />
              <View style={s.flex} />
              <V2Button testID="game-odd-done" label={triLang(lang, COPY.doneTitle)} onPress={onClose} />
            </View>
          ) : (
            <View style={s.stage}>
              <View style={s.stageTop} />
              <Text style={[s.ask, { color: p.textSecondary }]}>{triLang(lang, COPY.ask)}</Text>
              <View style={s.sentence}>
                {task.words.map((word, i) => (removed && i === task.extraIndex ? null : (
                  <OddWord
                    key={`${task.id}-${i}`}
                    text={word}
                    index={i}
                    shakeKey={shake.index === i ? shake.key : 0}
                    color={p.text}
                    chip={p.glass}
                    disabled={removed}
                    onPress={() => onTap(i)}
                  />
                )))}
              </View>
              <Text style={[s.translation, { color: p.textSecondary, opacity: revealed ? 1 : 0 }]}>{task.translation}</Text>
              <V2Card seed={1} style={[s.why, { opacity: revealed ? 1 : 0 }]}>
                <Ionicons name="checkmark-circle" size={20} color={p.correct} />
                <View style={s.whyText}>
                  <Text style={[s.whyTitle, { color: p.text }]}>{task.whyTitle}</Text>
                  <Text style={[s.whyBody, { color: p.textSecondary }]}>{task.whyText}</Text>
                </View>
              </V2Card>
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
  sentence: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8, minHeight: 112, alignContent: 'center' },
  word: { height: 52, paddingHorizontal: 16, borderRadius: 16, justifyContent: 'center' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.97 }] },
  wordText: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  translation: { minHeight: 22, marginTop: 14, textAlign: 'center', fontSize: 16, lineHeight: 22, fontWeight: '500' },
  why: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, marginTop: 16 },
  whyText: { flex: 1, gap: 2 },
  whyTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  whyBody: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  finish: { flex: 1, alignItems: 'stretch', paddingTop: 32 },
  big: { textAlign: 'center', fontSize: 30, lineHeight: 36, fontWeight: '800' },
  sub: { textAlign: 'center', marginTop: 6, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  growth: { marginTop: 22 },
});
