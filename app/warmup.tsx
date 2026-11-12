/**
 * Разминка на 4 минуты — перенос утверждённого макета (docs/design/v2-app/elevate-mechanics.app.js, `workout()`).
 * Владелец 11.11.2026: «я хочу, чтобы юзеру особо не надо было выбирать»; разминка — отдельная строка каждый
 * день, в счёт трёх заданий дня не входит; отдельного списка игр нет.
 *
 * Экран показывает три игры дня и одну кнопку: «Начать · <следующая несыгранная игра>». Выбирать не нужно —
 * кнопка сама ведёт по порядку; карту можно пролистать и нажать, если хочется другую.
 * зачем так: состав и порядок игр — в modules/games/warmup_state; экран рисуется сразу из памяти, сети нет.
 *
 * Вид и движение — из макета в точности (elevate-mechanics.css:69–104), числа — в constants/gameMotion.ts:
 *  • веер: выбранная карта по центру, соседние — на 168 в стороны, ниже на 18, повёрнуты на 7°, мельче (.88) и темнее;
 *    смена карты — 620 мс cubic-bezier(.2,1,.3,1), затемнение — 420 мс;
 *  • раздача: карты приходят снизу по одной (через 120 мс и далее каждые 110 мс);
 *  • старт игры: выбранная карта приближается (700 мс, вверх на 40, крупнее в 1.72), остальные гаснут (420 мс);
 *  • точка выбранной карты вытягивается до 22 (420 мс), деление сыгранной игры заполняется за 800 мс.
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import { RuneBalanceChip } from '../components/RuneBalanceChip';
import ScreenGradient from '../components/ScreenGradient';
import GameSegments from '../components/games/GameSegments';
import WarmupCardArt from '../components/games/WarmupCardArt';
import { V2Button, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { GAME_EASE, GAME_MOTION } from '../constants/gameMotion';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { warmupIndicators } from '../modules/games/warmup_indicators';
import { nextWarmupIndex, noteWarmupRefresh, peekWarmup, subscribeWarmup, warmupPlayedCount } from '../modules/games/warmup_state';
import { SKILL_NAME } from '../modules/skills/skill_copy';
import { refreshSkills } from '../modules/skills/skill_store';
import { safeRouterBack } from './navigation_back';

const CARD_W = 268;
const CARD_H = 372;
const NAV_GUARD_MS = 700;
/** Переход в игру начинается, когда карта уже почти приблизилась: кривая `--out` проходит основную часть пути за первые 60 % времени. */
const ZOOM_NAV_MS = Math.round(GAME_MOTION.deckZoomMs * 0.6);
// `.gc.g1` … `.gc.g3` — цвета карт по месту в колоде, одни для всех тем (elevate-mechanics.css:84–86)
const CARD_COLORS = [
  ['#2F7C8C', '#14505E', '#0B2E38'],
  ['#6F5BC9', '#43328F', '#1E1650'],
  ['#B0568F', '#7A2F68', '#3A1236'],
] as const;
const bezier = (c: readonly number[]) => Easing.bezier(c[0], c[1], c[2], c[3]);
type DeckMode = 'idle' | 'zoom' | 'away';

const COPY = {
  title: { ru: 'Разминка', uk: 'Розминка', es: 'Calentamiento', en: 'Warm-up' },
  headline: { ru: '3 игры\nна 4 минуты', uk: '3 гри\nна 4 хвилини', es: '3 juegos\nen 4 minutos', en: '3 games\nin 4 minutes' },
  // зачем (первый запуск на телефоне 11.11): для языка с одной доступной игрой заголовок обещал «3 игры» — обещаем то, что есть
  headlineShort: { ru: 'Игра дня', uk: 'Гра дня', es: 'Juego del día', en: 'Game of the day' },
  start: { ru: 'Начать', uk: 'Почати', es: 'Empezar', en: 'Start' },
  again: { ru: 'Сыграть ещё раз', uk: 'Зіграти ще раз', es: 'Jugar otra vez', en: 'Play again' },
  complete: { ru: 'Разминка пройдена', uk: 'Розминку пройдено', es: 'Calentamiento completado', en: 'Warm-up complete' },
  of: { ru: 'из', uk: 'із', es: 'de', en: 'of' },
  back: { ru: 'Назад', uk: 'Назад', es: 'Atrás', en: 'Back' },
  // зачем: у языка без игр разминка пуста — кнопка говорит об этом прямо и ничего не запускает
  none: { ru: 'Сегодня игр нет', uk: 'Сьогодні ігор немає', es: 'Hoy no hay juegos', en: 'No games today' },
} as const;

type DeckCardProps = Readonly<{
  /** Место в веере: 0 — по центру, 1 — справа, −1 — слева. */
  pos: -1 | 0 | 1;
  /** false — карта ещё не роздана и ждёт под экраном. */
  dealt: boolean;
  mode: DeckMode;
  colors: readonly [string, string, string];
  label: string;
  testID: string;
  onPress: () => void;
  children: React.ReactNode;
}>;

const DeckCard = memo(function DeckCard({ pos, dealt, mode, colors, label, testID, onPress, children }: DeckCardProps) {
  const reduceMotion = useReduceMotion();
  const waiting = !dealt && !reduceMotion;
  const x = useSharedValue(waiting ? 0 : pos * GAME_MOTION.deckSideX);
  const y = useSharedValue(waiting ? GAME_MOTION.deckDealY : pos === 0 ? 0 : GAME_MOTION.deckSideY);
  const rot = useSharedValue(waiting ? 0 : pos * GAME_MOTION.deckSideRotate);
  const scale = useSharedValue(waiting ? GAME_MOTION.deckDealScale : pos === 0 ? 1 : GAME_MOTION.deckSideScale);
  const opacity = useSharedValue(waiting ? 0 : 1);
  const dim = useSharedValue(pos === 0 ? 0 : 1);

  useEffect(() => () => {
    [x, y, rot, scale, opacity, dim].forEach((v) => cancelAnimation(v));
  }, [dim, opacity, rot, scale, x, y]);

  useEffect(() => {
    if (waiting) return;
    const fade = { duration: reduceMotion ? 0 : GAME_MOTION.deckFadeMs, easing: bezier(GAME_EASE.ease) };
    if (mode === 'zoom') {
      const zoom = { duration: reduceMotion ? 0 : GAME_MOTION.deckZoomMs, easing: bezier(GAME_EASE.out) };
      x.value = withTiming(0, zoom);
      y.value = withTiming(GAME_MOTION.deckZoomY, zoom);
      rot.value = withTiming(0, zoom);
      scale.value = withTiming(GAME_MOTION.deckZoomScale, zoom);
      return;
    }
    const move = { duration: reduceMotion ? 0 : GAME_MOTION.deckMoveMs, easing: bezier(GAME_EASE.out) };
    x.value = withTiming(pos * GAME_MOTION.deckSideX, move);
    y.value = withTiming(pos === 0 ? 0 : GAME_MOTION.deckSideY, move);
    rot.value = withTiming(pos * GAME_MOTION.deckSideRotate, move);
    scale.value = withTiming(pos === 0 ? 1 : GAME_MOTION.deckSideScale, move);
    opacity.value = withTiming(mode === 'away' ? 0 : 1, fade);
    dim.value = withTiming(pos === 0 ? 0 : 1, fade);
  }, [dim, mode, opacity, pos, reduceMotion, rot, scale, waiting, x, y]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${rot.value}deg` }, { scale: scale.value }],
  }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value * GAME_MOTION.deckSideDim }));

  return (
    <Reanimated.View style={[s.card, { zIndex: mode === 'zoom' ? 9 : pos === 0 ? 3 : 2 }, cardStyle]}>
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.cardBody}>
        <LinearGradient colors={colors} locations={[0, 0.52, 1]} start={{ x: 0.37, y: 0 }} end={{ x: 0.63, y: 1 }} style={StyleSheet.absoluteFill} />
        {children}
        {/* `filter: brightness(.72)` у боковых карт — тёмным слоем той же силы */}
        <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.cardDim, dimStyle]} />
      </Pressable>
    </Reanimated.View>
  );
});

/** Точка под колодой — `.dots i` / `.dots i.on`: ширина 7 → 22 за 420 мс, цвет за 300 мс. */
const DeckDot = memo(function DeckDot({ on }: Readonly<{ on: boolean }>) {
  const reduceMotion = useReduceMotion();
  const wide = useSharedValue(on ? 1 : 0);
  const lit = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    wide.value = withTiming(on ? 1 : 0, { duration: reduceMotion ? 0 : GAME_MOTION.dotMs, easing: bezier(GAME_EASE.out) });
    lit.value = withTiming(on ? 1 : 0, { duration: reduceMotion ? 0 : GAME_MOTION.dotFillMs, easing: bezier(GAME_EASE.ease) });
  }, [lit, on, reduceMotion, wide]);
  const style = useAnimatedStyle(() => ({ width: GAME_MOTION.dotWidth + (GAME_MOTION.dotWidthOn - GAME_MOTION.dotWidth) * wide.value }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: lit.value }));
  const p = useV2Palette();
  return (
    <Reanimated.View style={[s.dot, { backgroundColor: p.track }, style]}>
      <Reanimated.View style={[StyleSheet.absoluteFill, s.dotFill, { backgroundColor: p.text }, fillStyle]} />
    </Reanimated.View>
  );
});

export default function WarmupScreen() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const state = useSyncExternalStore(subscribeWarmup, peekWarmup, peekWarmup);
  const [index, setIndex] = useState(() => nextWarmupIndex(peekWarmup(), 0) ?? 0);
  const lastNavAt = useRef(0);
  const count = state.games.length;
  // раздача: сколько карт уже пришло снизу
  const [dealt, setDealt] = useState(0);
  // какая карта сейчас приближается перед входом в игру; −1 — никакая
  const [zooming, setZooming] = useState(-1);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segmentIds = useMemo(() => state.games.map((g) => g.id), [state.games]);

  useEffect(() => {
    const timers = Array.from({ length: count }, (_, i) => setTimeout(() => setDealt((n) => Math.max(n, i + 1)), GAME_MOTION.deckDealFirstMs + i * GAME_MOTION.deckDealStepMs));
    return () => timers.forEach(clearTimeout);
  }, [count]);

  // вернулись из игры — колода снова стоит веером (в макете приближение снимается сразу)
  useFocusEffect(useCallback(() => {
    setZooming(-1);
    return () => {
      if (navTimer.current) clearTimeout(navTimer.current);
    };
  }, []));

  // зачем: после перезапуска приложения сыгранное сегодня подтягивается с устройства
  useEffect(() => noteWarmupRefresh(), []);

  useEffect(() => {
    // зачем: прогрев очков навыков до первой игры — итог игры покажет прирост без ожидания диска
    refreshSkills().catch((error: unknown) => {
      console.warn(`[WARMUP] skills_warm_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: лог в catch обязателен
    });
  }, []);

  const played = warmupPlayedCount(state);
  const complete = count > 0 && played === count;

  // после возвращения из игры карусель сама встаёт на следующую несыгранную игру
  useEffect(() => {
    const next = nextWarmupIndex(state, index);
    const shown = state.games[index];
    if (next !== null && next !== index && shown && state.results[shown.id] !== undefined) {
      setIndex(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const game = state.games[index] ?? null;
  // зачем (обход экранов 12.11, «три индикатора показывают разное»): точки, деления и места карт — из одного расчёта по макету (warmup_indicators)
  const ind = useMemo(() => warmupIndicators(state, index), [state, index]);
  const segDone = useMemo(() => Object.fromEntries(state.games.filter((_, i) => ind.segs[i]).map((g) => [g.id, true])), [state.games, ind]);
  useEffect(() => {
    console.log('[WARMUP-IND]', JSON.stringify({ day: state.day, count: ind.count, front: ind.front, frontId: state.games[ind.front]?.id ?? null, // guard-ok: одна строка на смену карты или результата
      played: ind.played, playedIds: state.games.filter((_, i) => ind.segs[i]).map((g) => g.id), cardPos: ind.cardPos, source: 'warmup_state' }));
  }, [ind, state.day, state.games]);
  const date = useMemo(() => {
    try {
      const text = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
      return text.charAt(0).toUpperCase() + text.slice(1);
    } catch (error) {
      console.warn(`[WARMUP] date_format_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: лог в catch обязателен
      return '';
    }
  }, [lang]);

  const onBack = useCallback(() => safeRouterBack(router, '/(tabs)/home' as never), [router]);
  const start = useCallback((target: number) => {
    const now = Date.now();
    if (now - lastNavAt.current < NAV_GUARD_MS) return; // защита от двойного тапа
    lastNavAt.current = now;
    const route = state.games[target]?.route;
    if (!route) {
      console.warn(`[WARMUP] start:no_game ${JSON.stringify({ target, count: state.games.length })}`); // guard-ok: ранний выход с причиной
      return;
    }
    setZooming(target);
    if (navTimer.current) clearTimeout(navTimer.current);
    navTimer.current = setTimeout(() => router.push(route as never), ZOOM_NAV_MS);
  }, [router, state.games]);

  const go = useCallback((step: number) => {
    if (count < 2) return;
    setIndex((i) => (i + step + count) % count);
  }, [count]);
  const onCardPress = useCallback((i: number) => {
    // макет: нажатие на боковую карту выбирает её, на центральную — начинает игру
    if (i !== index) {
      setIndex(i);
      return;
    }
    start(i);
  }, [index, start]);
  const swipe = useMemo(() => Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-24, 24])
    .onEnd((e) => {
      if (Math.abs(e.translationX) > GAME_MOTION.deckSwipe) runOnJS(go)(e.translationX < 0 ? 1 : -1);
    }), [go]);

  const resultLabel = (raw: string | undefined): string | null => {
    if (!raw) return null;
    const [a, b] = raw.split('/');
    return `${a} ${triLang(lang, COPY.of)} ${b}`;
  };

  const cta = !game
    ? triLang(lang, COPY.none)
    : complete
      ? triLang(lang, COPY.complete)
      : `${triLang(lang, state.results[game.id] !== undefined ? COPY.again : COPY.start)} · ${triLang(lang, game.name)}`;

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.content}>
          <View style={s.top}>
            <V2IconButton icon="chevron-back" onPress={onBack} accessibilityLabel={triLang(lang, COPY.back)} testID="warmup-back" />
            <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{triLang(lang, COPY.title)}</Text>
            {/* зачем (владелец 11.11: «без строки, с монетами»): баланс монет справа, как на макете; общий чип читает кошелёк из памяти, сети нет */}
            <View style={[s.coins, { backgroundColor: p.glass }]}>
              <RuneBalanceChip color={p.text} size={20} interactive={false} testID="warmup-coins" />
            </View>
          </View>

          <View style={s.head}>
            <Text style={[s.over, { color: p.textSecondary }]}>{date}</Text>
            <Text style={[s.big, { color: p.text }]}>{triLang(lang, state.games.length >= 3 ? COPY.headline : COPY.headlineShort)}</Text>
          </View>

          <GestureDetector gesture={swipe}>
            {/* зачем (запись 11.11): приближенная карта в макете ложится поверх заголовка и кнопки — колода на время старта поднимается над соседями и не обрезает карту */}
            <View style={[s.deck, zooming >= 0 && s.deckFront]}>
              {state.games.map((item, i) => { // guard-ok: карт не больше трёх, виртуализация не нужна
                const result = resultLabel(state.results[item.id]);
                return (
                  <DeckCard
                    key={item.id}
                    pos={ind.cardPos[i]}
                    dealt={i < dealt}
                    mode={zooming < 0 ? 'idle' : zooming === i ? 'zoom' : 'away'}
                    colors={CARD_COLORS[i % CARD_COLORS.length]}
                    label={triLang(lang, item.name)}
                    testID={`warmup-card-${item.id}`}
                    onPress={() => onCardPress(i)}
                  >
                    <WarmupCardArt gameId={item.id} />
                    <View style={s.tags}>
                      <View style={s.tag}>
                        <Ionicons name={item.icon} size={14} color="#FFFFFF" />
                        <Text style={s.tagText}>{triLang(lang, SKILL_NAME[item.skill])}</Text>
                      </View>
                      {result ? (
                        <View style={s.tag}>
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          <Text style={s.tagText}>{result}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={s.cap}>
                      <Text style={s.name}>{triLang(lang, item.name)}</Text>
                      <Text style={s.description}>{triLang(lang, item.description)}</Text>
                    </View>
                  </DeckCard>
                );
              })}
            </View>
          </GestureDetector>

          <View style={s.dots}>
            {state.games.map((item, i) => <DeckDot key={item.id} on={ind.dots[i]} />)}
          </View>
          <GameSegments ids={segmentIds} done={0} doneIds={segDone} track={p.track} fill={p.text} style={s.segs} />
          <V2Button testID="warmup-start" label={cta} icon={complete || !game ? undefined : 'play'} iconPosition="leading" disabled={complete || !game} onPress={() => start(index)} />
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, paddingTop: 8, paddingBottom: 16, paddingHorizontal: V2.screenPad },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: V2.iconButton },
  // макет elevate-mechanics.app.js:36 (`.top .ttl`): «Разминка» слева сразу за кнопкой, 20/700, занимает остаток строки
  title: { flex: 1, marginLeft: 12, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  coins: { height: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center' },
  head: { marginTop: 22, minHeight: 122 },
  over: { minHeight: 18, fontSize: 14, lineHeight: 18, fontWeight: '500' },
  big: { marginTop: 6, fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -0.8 },
  // `.deck { flex: 1; margin: 18px -20px 0 }`, карта — по центру колоды
  deck: { flex: 1, minHeight: CARD_H + 24, marginTop: 18, marginHorizontal: -V2.screenPad, alignItems: 'center', justifyContent: 'center' },
  deckFront: { zIndex: 5 },
  card: { position: 'absolute', width: CARD_W, height: CARD_H, borderRadius: 30, boxShadow: '0px 30px 50px -22px rgba(0,0,0,0.75)' },
  cardBody: { flex: 1, borderRadius: 30, overflow: 'hidden' },
  cardDim: { backgroundColor: '#000000' },
  tags: { position: 'absolute', left: 16, top: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.28)' },
  tagText: { fontSize: 13, lineHeight: 17, fontWeight: '700', color: '#FFFFFF' },
  cap: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  name: { fontSize: 27, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5, color: '#FFFFFF' },
  description: { marginTop: 6, fontSize: 14, lineHeight: 19, fontWeight: '400', color: 'rgba(255,255,255,0.74)' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 14, marginBottom: 18 },
  dot: { height: 7, borderRadius: 4, overflow: 'hidden' },
  dotFill: { borderRadius: 4 },
  segs: { marginBottom: 16 },
});
