/**
 * Игра «Сортировка» — перенос утверждённого макета (docs/design/v2-app/elevate-mechanics.app.js, `sort()`).
 * Владелец 11.11.2026: «самое главное — механики», «все анимации с макета», «код должен быть в точности перенесён».
 *
 * Ход: верхняя карта колоды смахивается в левую или правую корзину (или корзина нажимается). Верно — карта
 * улетает в корзину, счётчик растёт; мимо — карта возвращается, показывает подсказку, корзина краснеет.
 * зачем так: правила — в modules/games/sort_core; экран получает готовую колоду и исполняет жесты.
 *
 * Движение — из макета в точности (elevate-mechanics.css:158–183), числа — в constants/gameMotion.ts:
 *  • колода: под верхней картой видны две — ниже на 18 и 34, мельче (.93 и .86), глухие, без текста; четвёртая скрыта;
 *    когда карта уходит, остальные подтягиваются за 520 мс cubic-bezier(.2,1,.3,1), текст новой верхней проявляется
 *    за 260 мс с задержкой 120 мс;
 *  • перетаскивание без задержки: сдвиг за пальцем (по вертикали — треть), поворот — сдвиг / 14 градусов;
 *  • верно: карта летит на ±150 / 330 с поворотом ±18° и сжатием до .3 за 520 мс, гаснет за 360 мс; корзина
 *    зеленеет и подрастает до 1.06 (620 мс), счётчик подскакивает, деление прогресса заполняется за 800 мс;
 *  • мимо: карта встаёт на место и дрожит 380 мс, подсказка проявляется за 300 мс, корзина краснеет (520 мс);
 *  • корзина, к которой тянут карту дальше 70, светлеет (260 мс) и подрастает до 1.04 (300 мс «пружиной»).
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  Easing, cancelAnimation, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import GameBumpText from '../components/games/GameBumpText';
import GameRise from '../components/games/GameRise';
import GameSegments from '../components/games/GameSegments';
import SkillsSessionGrowth from '../components/skills/SkillsSessionGrowth';
import { V2Button, V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { GAME_EASE, GAME_MOTION } from '../constants/gameMotion';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { hapticTap } from '../hooks/use-haptics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import {
  INITIAL_SORT_STATE, SORT_HOT_THRESHOLD, SORT_SEED_DECK, dropSortCard, sortSideFromSwipe, type SortBin, type SortSide, type SortTask,
} from '../modules/games/sort_core';
import { markWarmupGamePlayed } from '../modules/games/warmup_state';
import { currentGameLesson, sortDeckFor } from '../modules/games/task_source';
import { noteSkillAction } from '../modules/skills/skill_store';
import { useSkillSession } from '../modules/skills/use_skill_session';
import { safeRouterBack } from './navigation_back';

/** Колоды для языка нет — экран открывается сразу итогом, без чужих заданий. */
const EMPTY_DECK = { ...SORT_SEED_DECK, id: 'empty', tasks: [] };
const COPY = {
  ask: { ru: 'Смахни фразу в свою сторону', uk: 'Змахни фразу у свій бік', es: 'Desliza la frase a su lado', en: 'Swipe the phrase to its side' },
  of: { ru: 'из', uk: 'із', es: 'de', en: 'of' },
  clean: { ru: 'Без единой подсказки', uk: 'Без жодної підказки', es: 'Sin una sola pista', en: 'Without a single hint' },
  hinted: { ru: 'С подсказкой:', uk: 'З підказкою:', es: 'Con pista:', en: 'With a hint:' },
  done: { ru: 'Готово', uk: 'Готово', es: 'Listo', en: 'Done' },
  close: { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', en: 'Close' },
} as const;

// Карта в макете одна для всех тем: светлая, с тёмным текстом (elevate-mechanics.css:159–170)
const CARD = {
  from: 'rgba(255,255,255,0.96)',
  to: 'rgba(236,235,246,0.94)',
  ink: '#101124',
  hint: '#5A5C74',
  back1: '#B9B8D4',
  back2: '#8E8DB0',
  shadow: '0px 26px 44px -20px rgba(0,0,0,0.7)',
} as const;
const MAX_DEPTH = 3;
const bezier = (c: readonly number[]) => Easing.bezier(c[0], c[1], c[2], c[3]);
// зачем (красный экран на эмуляторе 11.11: «non-worklet function bezier on the UI thread»): кривые для кода,
// который исполняется в потоке интерфейса (реакция на перетаскивание), создаются заранее, а не внутри него
const HOT_SPRING = bezier(GAME_EASE.spring);
const HOT_EASE = bezier(GAME_EASE.ease);

type CardProps = Readonly<{
  task: SortTask;
  /** 0 — верхняя, 1–2 — видны под ней, 3 — скрыта; −1 — карта уже улетела в свою корзину. */
  depth: number;
  /** Растёт при каждом промахе по этой карте: карта встаёт на место, дрожит и показывает подсказку. */
  missKey: number;
  /** Растёт, когда верхнюю карту отпустили, не дотянув до корзины: она возвращается на место. */
  returnKey: number;
  /** Сдвиг верхней карты по горизонтали — по нему корзины понимают, что к ним тянут. */
  hotX: SharedValue<number>;
  onRelease: (dx: number) => void;
}>;

const SortCard = memo(function SortCard({ task, depth, missKey, returnKey, hotX, onRelease }: CardProps) {
  const reduceMotion = useReduceMotion();
  const d = Math.max(0, Math.min(MAX_DEPTH, depth));
  const gone = depth < 0;
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const rot = useSharedValue(0);
  const flying = useSharedValue(0);
  const scale = useSharedValue<number>(GAME_MOTION.sortDepthScale[d]);
  const lift = useSharedValue<number>(GAME_MOTION.sortDepthShift[d]);
  const opacity = useSharedValue(d === MAX_DEPTH ? 0 : 1);
  const content = useSharedValue(d === 0 ? 1 : 0);
  const hint = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => () => {
    [x, y, rot, scale, lift, opacity, content, hint, shake].forEach((v) => cancelAnimation(v));
  }, [content, hint, lift, opacity, rot, scale, shake, x, y]);

  // место в колоде или улёт в корзину
  useEffect(() => {
    const move = { duration: reduceMotion ? 0 : GAME_MOTION.sortCardMoveMs, easing: bezier(GAME_EASE.out) };
    const fade = { duration: reduceMotion ? 0 : GAME_MOTION.sortCardFadeMs, easing: bezier(GAME_EASE.ease) };
    if (gone) {
      const dir = task.side === 'left' ? -1 : 1;
      // макет: карта летит из той позы, в которой её отпустили, — поворот продолжается с текущего
      rot.value = x.value / GAME_MOTION.sortRotateDivisor;
      flying.value = 1;
      x.value = withTiming(dir * GAME_MOTION.sortFlyX, move);
      y.value = withTiming(GAME_MOTION.sortFlyY, move);
      rot.value = withTiming(dir * GAME_MOTION.sortFlyRotate, move);
      scale.value = withTiming(GAME_MOTION.sortFlyScale, move);
      opacity.value = withTiming(0, fade);
      return;
    }
    lift.value = withTiming(GAME_MOTION.sortDepthShift[d], move);
    scale.value = withTiming(GAME_MOTION.sortDepthScale[d], move);
    opacity.value = withTiming(d === MAX_DEPTH ? 0 : 1, fade);
    // `.sc > * { transition: opacity 260ms 120ms }`, у задних карт задержки нет
    const text = { duration: reduceMotion ? 0 : GAME_MOTION.sortTextFadeMs, easing: bezier(GAME_EASE.ease) };
    content.value = d === 0 ? withDelay(reduceMotion ? 0 : GAME_MOTION.sortTextDelayMs, withTiming(1, text)) : withTiming(0, text);
  }, [content, d, flying, gone, lift, opacity, reduceMotion, rot, scale, task.side, x, y]);

  // промах: карта сразу на месте, дрожит, подсказка проявляется
  useEffect(() => {
    if (missKey === 0) return;
    x.value = 0;
    y.value = 0;
    hint.value = withTiming(1, { duration: reduceMotion ? 0 : GAME_MOTION.sortHintMs, easing: bezier(GAME_EASE.ease) });
    if (reduceMotion) return;
    let previous = 0;
    shake.value = 0;
    shake.value = withSequence(...GAME_MOTION.shakeStops.map((stop) => {
      const duration = (stop.at - previous) * GAME_MOTION.shakeMs;
      previous = stop.at;
      return withTiming(stop.x, { duration, easing: bezier(GAME_EASE.ease) });
    }));
  }, [hint, missKey, reduceMotion, shake, x, y]);

  const pan = useMemo(() => Gesture.Pan()
    .enabled(depth === 0)
    .onBegin(() => {
      // макет: при новом касании подсказка промаха гаснет (`classList.remove('miss')`)
      hint.value = withTiming(0, { duration: GAME_MOTION.sortHintMs });
      cancelAnimation(x);
      cancelAnimation(y);
    })
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY * GAME_MOTION.sortDragYShare;
      hotX.value = e.translationX;
    })
    .onEnd((e) => {
      hotX.value = 0;
      runOnJS(onRelease)(e.translationX);
    })
    .onFinalize((_e, success) => {
      if (success) return;
      // жест сорван системой — карта возвращается, корзины остывают
      hotX.value = 0;
      x.value = withTiming(0, { duration: GAME_MOTION.sortCardMoveMs });
      y.value = withTiming(0, { duration: GAME_MOTION.sortCardMoveMs });
    }), [depth, hint, hotX, onRelease, x, y]);

  // недотянутая карта возвращается на место (макет: `transform = ''`, переход 520 мс `--out`)
  useEffect(() => {
    if (returnKey === 0) return;
    const move = { duration: reduceMotion ? 0 : GAME_MOTION.sortCardMoveMs, easing: bezier(GAME_EASE.out) };
    x.value = withTiming(0, move);
    y.value = withTiming(0, move);
  }, [reduceMotion, returnKey, x, y]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value + shake.value },
      { translateY: y.value + lift.value },
      { rotate: `${flying.value ? rot.value : x.value / GAME_MOTION.sortRotateDivisor}deg` },
      { scale: scale.value },
    ],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: content.value }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hint.value }));
  const back = d === 1 ? CARD.back1 : d >= 2 ? CARD.back2 : null;

  return (
    <View pointerEvents={depth === 0 ? 'box-none' : 'none'} style={[s.cardSlot, { zIndex: 10 - d }]}>
      <GestureDetector gesture={pan}>
        <Reanimated.View testID={depth === 0 ? 'game-sort-card' : undefined} style={[s.card, { boxShadow: CARD.shadow }, cardStyle]}>
          {back && !gone ? <View style={[s.cardFill, { backgroundColor: back }]} /> : <LinearGradient colors={[CARD.from, CARD.to]} start={{ x: 0.41, y: 0 }} end={{ x: 0.59, y: 1 }} style={s.cardFill} />}
          <Reanimated.View style={[s.cardContent, contentStyle]}>
            <Text style={s.cardText}>{task.text}</Text>
            <Reanimated.Text style={[s.hint, hintStyle]}>{task.hint}</Reanimated.Text>
          </Reanimated.View>
        </Reanimated.View>
      </GestureDetector>
    </View>
  );
});

type BinProps = Readonly<{ bin: SortBin; count: number; side: SortSide; hotX: SharedValue<number>; yesKey: number; noKey: number; onPress: () => void; disabled: boolean }>;

const BinTile = memo(function BinTile({ bin, count, side, hotX, yesKey, noKey, onPress, disabled }: BinProps) {
  const p = useV2Palette();
  const reduceMotion = useReduceMotion();
  const hotScale = useSharedValue(0);
  const hotFill = useSharedValue(0);
  const yes = useSharedValue(0);
  const no = useSharedValue(0);
  const press = useSharedValue(0);
  const pressFade = useSharedValue(0);

  // корзина «теплеет», когда карту тянут в её сторону дальше порога
  useAnimatedReaction(
    () => (side === 'left' ? hotX.value < -SORT_HOT_THRESHOLD : hotX.value > SORT_HOT_THRESHOLD),
    (hot, was) => {
      if (hot === was) return;
      hotScale.value = withTiming(hot ? 1 : 0, { duration: GAME_MOTION.binHotMs, easing: HOT_SPRING });
      hotFill.value = withTiming(hot ? 1 : 0, { duration: GAME_MOTION.binHotFillMs, easing: HOT_EASE });
    },
    [side],
  );

  // `@keyframes binok { 30% { background: --ok-bg; transform: scale(1.06) } }` — 620 мс `--out`
  useEffect(() => {
    if (yesKey === 0 || reduceMotion) return undefined;
    const out = bezier(GAME_EASE.out);
    yes.value = 0;
    yes.value = withSequence(
      withTiming(1, { duration: GAME_MOTION.binYesMs * GAME_MOTION.binPeakAt, easing: out }),
      withTiming(0, { duration: GAME_MOTION.binYesMs * (1 - GAME_MOTION.binPeakAt), easing: out }),
    );
    return () => cancelAnimation(yes);
  }, [reduceMotion, yes, yesKey]);

  // `@keyframes binno { 30% { background: --no-bg } }` — 520 мс ease-out
  useEffect(() => {
    if (noKey === 0 || reduceMotion) return undefined;
    const easeOut = bezier(GAME_EASE.easeOut);
    no.value = 0;
    no.value = withSequence(
      withTiming(1, { duration: GAME_MOTION.binNoMs * GAME_MOTION.binPeakAt, easing: easeOut }),
      withTiming(0, { duration: GAME_MOTION.binNoMs * (1 - GAME_MOTION.binPeakAt), easing: easeOut }),
    );
    return () => cancelAnimation(no);
  }, [no, noKey, reduceMotion]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: 1 - (1 - GAME_MOTION.pressOpacity) * pressFade.value,
    transform: [{
      scale: (1 + (GAME_MOTION.binHotScale - 1) * hotScale.value) * (1 + (GAME_MOTION.binYesScale - 1) * yes.value) * (1 - (1 - GAME_MOTION.pressScale) * press.value),
    }],
  }));
  const hotStyle = useAnimatedStyle(() => ({ opacity: hotFill.value * GAME_MOTION.binHotFill }));
  const yesStyle = useAnimatedStyle(() => ({ opacity: yes.value * GAME_MOTION.tileTintOpacity }));
  const noStyle = useAnimatedStyle(() => ({ opacity: no.value * GAME_MOTION.tileTintOpacity }));

  return (
    <Reanimated.View style={[s.binWrap, wrapStyle]}>
      <Pressable
        testID={`game-sort-bin-${side}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={`${bin.title}, ${count}`}
        disabled={disabled}
        onPressIn={() => {
          void hapticTap();
          press.value = withTiming(1, { duration: GAME_MOTION.pressDownMs });
          pressFade.value = withTiming(1, { duration: GAME_MOTION.pressDownMs });
        }}
        onPressOut={() => {
          press.value = withTiming(0, { duration: GAME_MOTION.pressUpMs, easing: bezier(GAME_EASE.spring) });
          pressFade.value = withTiming(0, { duration: GAME_MOTION.pressOpacityMs });
        }}
        onPress={onPress}
      >
        <V2Card seed={side === 'left' ? 1 : 2} style={s.bin}>
          <View pointerEvents="none" style={s.binTints}>
            <Reanimated.View style={[StyleSheet.absoluteFill, s.binHot, hotStyle]} />
            <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: p.correct }, yesStyle]} />
            <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: p.wrong }, noStyle]} />
          </View>
          <View>
            <Text style={[s.binTitle, { color: p.text }, side === 'right' && s.right]}>{bin.title}</Text>
            <Text style={[s.binExample, { color: p.textSecondary }, side === 'right' && s.right]}>{bin.example}</Text>
          </View>
          {/* макет: счётчик стоит у внутреннего края — у левой корзины справа, у правой слева */}
          <GameBumpText value={String(count)} style={[s.binCount, { color: p.text }, side === 'left' ? s.countEnd : s.countStart]} />
        </V2Card>
      </Pressable>
    </Reanimated.View>
  );
});

export default function GameSortScreen() {
  const router = useRouter();
  useSkillSession(); // занятие объявляет сам режим — только его прирост попадёт в «Навыки растут»
  const p = useV2Palette();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  // зачем (владелец 11.11: «фразы должны корректно подбираться»): задания — из банка по уроку, на котором сейчас человек,
  // и только для языка, который он учит; порция меняется от дня к дню и не тасуется при повторном рендере
  const deck = useMemo(() => sortDeckFor(studyTarget, currentGameLesson(studyTarget)) ?? EMPTY_DECK, [studyTarget]);
  const segmentIds = useMemo(() => deck.tasks.map((t) => t.id), [deck.tasks]);

  const [game, setGame] = useState(INITIAL_SORT_STATE);
  const [miss, setMiss] = useState<{ card: number; key: number }>({ card: -1, key: 0 });
  const [binYes, setBinYes] = useState<Readonly<Record<SortSide, number>>>({ left: 0, right: 0 });
  const [binNo, setBinNo] = useState<Readonly<Record<SortSide, number>>>({ left: 0, right: 0 });
  // итог появляется через 500 мс после последней карты — пока она долетает (макет: `G.after(500, …)`)
  const [showFinish, setShowFinish] = useState(deck.tasks.length === 0);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hotX = useSharedValue(0);
  const [returnKey, setReturnKey] = useState(0);

  useEffect(() => () => {
    if (finishTimer.current) clearTimeout(finishTimer.current);
  }, []);

  const finished = game.index >= deck.tasks.length;

  // зачем: разминка помечает игру сыгранной по факту итога; результат уходит в метку на карте игры
  useEffect(() => {
    if (finished && deck.tasks.length > 0) markWarmupGamePlayed('sort', `${deck.tasks.length}/${deck.tasks.length}`);
  }, [deck.tasks.length, finished]);

  const drop = useCallback((side: SortSide) => {
    const task = deck.tasks[game.index];
    if (finished || !task) return;
    const result = dropSortCard(game, deck, side);
    setGame(result.state);
    if (!result.correct) {
      // мимо: карта возвращается и показывает подсказку, корзина краснеет
      setMiss((prev) => ({ card: game.index, key: prev.key + 1 }));
      setBinNo((prev) => ({ ...prev, [side]: prev[side] + 1 }));
      return;
    }
    // зачем (D207): очки «Грамматики» — только за карту, решённую с первого раза
    if (result.firstTry) noteSkillAction({ action: 'odd_word_sorting_correct', itemKey: `sort:${deck.id}:${task.id}` });
    setBinYes((prev) => ({ ...prev, [side]: prev[side] + 1 }));
    if (result.finished) finishTimer.current = setTimeout(() => setShowFinish(true), GAME_MOTION.sortFinishDelayMs);
  }, [deck, finished, game]);

  const onRelease = useCallback((dx: number) => {
    const side = sortSideFromSwipe(dx);
    if (side) {
      drop(side);
      return;
    }
    // недотянули: карта возвращается на место
    setReturnKey((k) => k + 1);
  }, [drop]);

  const onClose = useCallback(() => safeRouterBack(router, '/(tabs)/home' as never), [router]);

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="close" onPress={onClose} accessibilityLabel={triLang(lang, COPY.close)} testID="game-sort-close" />
            <GameSegments ids={segmentIds} done={Math.min(game.index, deck.tasks.length)} track={p.track} fill={p.text} style={s.segs} />
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{`${Math.min(game.index, deck.tasks.length)} / ${deck.tasks.length}`}</Text>
            </View>
          </View>

          <Text style={[s.ask, { color: p.textSecondary }]}>{finished ? '' : triLang(lang, COPY.ask)}</Text>

          <View style={s.pile}>
            {deck.tasks.map((task, i) => {
              const depth = i - game.index;
              // рисуются только улетающая карта и четыре верхних — остальным в колоде пока нечего показывать
              if (depth < -1 || depth > MAX_DEPTH) return null;
              return (
                <SortCard
                  key={task.id}
                  task={task}
                  depth={depth}
                  missKey={miss.card === i ? miss.key : 0}
                  returnKey={returnKey}
                  hotX={hotX}
                  onRelease={onRelease}
                />
              );
            })}
            {showFinish ? (
              <GameRise style={s.finish}>
                <Text style={[s.big, { color: p.text }]}>{`${deck.tasks.length} ${triLang(lang, COPY.of)} ${deck.tasks.length}`}</Text>
                <Text style={[s.sub, { color: p.textSecondary }]}>{game.misses > 0 ? `${triLang(lang, COPY.hinted)} ${game.misses}` : triLang(lang, COPY.clean)}</Text>
                <SkillsSessionGrowth style={s.growth} />
              </GameRise>
            ) : null}
          </View>

          {showFinish ? (
            <V2Button testID="game-sort-done" label={triLang(lang, COPY.done)} onPress={onClose} />
          ) : (
            <View style={s.bins}>
              <BinTile bin={deck.left} count={game.left} side="left" hotX={hotX} yesKey={binYes.left} noKey={binNo.left} disabled={finished} onPress={() => drop('left')} />
              <BinTile bin={deck.right} count={game.right} side="right" hotX={hotX} yesKey={binYes.right} noKey={binNo.right} disabled={finished} onPress={() => drop('right')} />
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
  top: { flexDirection: 'row', alignItems: 'center', gap: 6, height: V2.iconButton },
  segs: { flex: 1, marginHorizontal: 6 },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center' },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ask: { minHeight: 20, marginTop: 26, textAlign: 'center', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  pile: { flex: 1 },
  // `.sc { left: 50%; top: 46%; width: 300px; height: 190px; margin: -95px 0 0 -150px }`
  cardSlot: { position: 'absolute', left: 0, right: 0, top: '46%', marginTop: -95, alignItems: 'center' },
  card: { width: 300, minHeight: 190, borderRadius: 28 },
  cardFill: { ...StyleSheet.absoluteFillObject, borderRadius: 28 },
  cardContent: { flex: 1, minHeight: 190, paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  cardText: { textAlign: 'center', fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -0.5, color: CARD.ink },
  hint: { marginTop: 10, textAlign: 'center', fontSize: 14, lineHeight: 19, fontWeight: '400', color: CARD.hint },
  bins: { flexDirection: 'row', gap: 12 },
  binWrap: { flex: 1 },
  bin: { height: 112, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14, justifyContent: 'space-between' },
  binTints: { ...StyleSheet.absoluteFillObject, borderRadius: 26, overflow: 'hidden' },
  binHot: { backgroundColor: '#FFFFFF' },
  binTitle: { fontSize: 18, lineHeight: 22, fontWeight: '700' },
  binExample: { marginTop: 3, fontSize: 13, lineHeight: 17, fontWeight: '400' },
  right: { textAlign: 'right' },
  binCount: { fontSize: 26, lineHeight: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  countEnd: { alignSelf: 'flex-end' },
  countStart: { alignSelf: 'flex-start' },
  finish: { position: 'absolute', left: 0, right: 0, top: '20%' },
  big: { textAlign: 'center', fontSize: 30, lineHeight: 36, fontWeight: '800' },
  sub: { textAlign: 'center', marginTop: 6, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  growth: { marginTop: 22 },
});
