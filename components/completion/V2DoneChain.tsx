// ═══════════════════════════════════════════════════════════════════════════
// V2DoneChain.tsx — m10 «Итог урока — цепная реакция» («семь ударов»), эталон engagement-moments-v3-all.html `result3` (одобрен владельцем).
//
// зачем (координатор 15.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m10): одно занятие двигает все счётчики, и это видно за 5 секунд. Блоки итога всплывают по очереди с 300 мс
// через 620 мс (emUp 500 мс, сдвиг 18): «Урок пройден» → звёзды по 150 мс → название → верно/ошибки/точность → «+N монет» (монеты летят в баланс, баланс бежит) →
// «Серия N → N+1», огонь из контура в залитый → «Сегодня · Пройти урок 0/1 → 1/1» с отметкой → кнопки. Тайминги — done_chain_gate DONE_CHAIN_TIMELINE.
// Грузится ТОЛЬКО require'ом из V2DoneScreen, когда экран передал `chain` (moments_v3 включён) — при выключенном флаге этого кода нет даже в памяти.
// Анимации — Reanimated на UI-треде; reduced-motion — сразу финальный кадр без звуков; тап по экрану во время цепочки — досмотреть сразу до финала.
// Компонент ничего не пишет и не начисляет: серия и задача дня — живые локальные сторы, «до» — снимок первого кадра (captureDoneChainBefore). Журнал [MOMENT-m10].
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import type { Lang } from '../../constants/i18n';
import { runeWord } from '../../constants/runes';
import { peekRunes } from '../../app/runes_system';
import { subscribeAppSnapshot } from '../../app/app_snapshot_store';
import { peekStreakDayState, subscribeStreakDayState, type StreakDayState } from '../../app/streak_day_signal';
import { peekTodayTasks, subscribeTodayTasks } from '../../modules/today-tasks/today_tasks_store';
import { todayTasksToView } from '../../modules/today-tasks/today_tasks_view';
import type { TodayTasksDayState } from '../../modules/today-tasks/today_tasks_core';
import { HOME_RUNE_ICON_SOURCE } from '../home/homeRuneAsset';
import type { Lv2Glass } from '../learning-v2/LearningV2Glass';
import { useStreakColors } from '../streak/moments/use_streak_colors';
import { V2IconTile } from '../v2/V2Glass';
import { plateBoxShadow } from '../v2/ShadowSurface';
import {
  DONE_CHAIN_BEAT,
  DONE_CHAIN_LOG,
  DONE_CHAIN_TIMELINE as T,
  deriveStreakRow,
  deriveTodayRow,
  doneChainBeatAt,
  type DoneChainAfter,
  type DoneChainBefore,
  type DoneChainStreakRow,
  type DoneChainTodayRow,
} from './done_chain_gate';
import { playDoneChainBeat } from './done_chain_sound';
import { doneChainText } from './done_chain_strings';

const EASE = Easing.bezier(0.2, 1, 0.3, 1); // --em-ease
const EASE_POP = Easing.bezier(0.3, 1.6, 0.5, 1); // --em-ease-pop
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1); // --em-ease-in-out

type ChainState = Readonly<{
  /** Сколько блоков уже всплыло (0…8). */
  revealed: number;
  /** Без анимации: reduced-motion или досмотрено тапом. */
  instant: boolean;
  streak: DoneChainStreakRow | null;
  today: (DoneChainTodayRow & { title: string }) | null;
  /** Только dev-превью: баланс из моков вместо кошелька устройства (null — живой баланс). */
  previewBalance: number | null;
}>;

const ChainCtx = createContext<ChainState>({ revealed: T.beats, instant: true, streak: null, today: null, previewBalance: null });

/** Строка серии для журнала: дни, засчитан ли день и ключ дня. */
function streakLogText(v: StreakDayState | null): string {
  return v ? `{days=${v.days} counted=${String(v.counted)} day=${v.dayKey}}` : 'null(not hydrated)';
}

function useLiveStreak(): StreakDayState | null {
  const mountedAtRef = useRef(Date.now());
  const [v, setV] = useState<StreakDayState | null>(() => {
    const initial = peekStreakDayState();
    console.log(`[STREAK-RESULT] live:init из памяти стора ${streakLogText(initial)}`); // guard-ok: единичный журнал первого чтения
    return initial;
  });
  useEffect(() => {
    const unsubscribe = subscribeStreakDayState((next) => {
      console.log(`[STREAK-RESULT] live:update +${Date.now() - mountedAtRef.current}мс после монтирования ${streakLogText(next)}`); // guard-ok: по одной строке на запись серии
      setV(next);
    });
    // зачем (Сверка 15.10, «Серия — 0 дней» у свежего гостя): запись дня могла прийти МЕЖДУ первым чтением и подпиской — тогда
    // строка навсегда оставалась на старом значении. Перечитываем стор сразу после подписки и пишем, было ли расхождение.
    const afterSubscribe = peekStreakDayState();
    setV((prev) => {
      const missed = prev !== afterSubscribe;
      console.log(`[STREAK-RESULT] live:subscribed +${Date.now() - mountedAtRef.current}мс было=${streakLogText(prev)} стало=${streakLogText(afterSubscribe)} пропущенаЗапись=${String(missed)}`); // guard-ok: единичный журнал подписки
      return missed ? afterSubscribe : prev;
    });
    return unsubscribe;
  }, []);
  return v;
}

function useLiveToday(): TodayTasksDayState | null {
  const [v, setV] = useState<TodayTasksDayState | null>(() => peekTodayTasks());
  useEffect(() => subscribeTodayTasks(setV), []);
  return v;
}

export type DoneChainProviderProps = Readonly<{
  before: DoneChainBefore;
  lang: Lang;
  /** Цепочка доиграла (или досмотрена тапом) — экран может открывать следующие окна (m09, рубеж серии). */
  onFinished?: () => void;
  /** Только dev-превью (dev_moments_preview?state=donechain): готовое «после» вместо живых сторов серии и задач дня. */
  previewAfter?: DoneChainAfter;
  children: (skip: () => void) => ReactNode;
}>;

/** Ведёт «семь ударов»: таймеры, звук, хаптик, досмотр тапом. Дети получают skip — повесить на корень экрана. */
export const DoneChainProvider = memo(function DoneChainProvider({ before, lang, onFinished, previewAfter, children }: DoneChainProviderProps) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState<number>(reduced ? T.beats : 0);
  const [skipped, setSkipped] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finishedRef = useRef(false);
  const streakFromStore = useLiveStreak();
  const todayFromStore = useLiveToday();
  // зачем (кадры Сверки/Макетов 15.10): превью подставляет готовые данные, в бою — живые локальные сторы
  const liveStreak = previewAfter ? previewAfter.streak : streakFromStore;
  const liveToday = previewAfter ? previewAfter.today : todayFromStore;
  const streak = useMemo(() => deriveStreakRow(before.streak, liveStreak), [before.streak, liveStreak]);
  useEffect(() => {
    // зачем (Сверка 15.10): что строка «Серия» покажет и из чего — снимок «до» (первый кадр итога) и живой стор «после»
    console.log(`[STREAK-RESULT] row до=${streakLogText(before.streak)} после=${streakLogText(liveStreak)} источник=${previewAfter ? 'dev-превью' : 'живой стор'} → ${streak ? `${streak.from.days}→${streak.to.days} засчитан=${String(streak.to.counted)} (${streak.reason})` : 'строки нет'}`); // guard-ok: по одной строке на смену данных серии
  }, [before.streak, liveStreak, previewAfter, streak]);
  const todayBase = useMemo(() => deriveTodayRow(before, liveToday), [before, liveToday]);
  const todayTitle = useMemo(() => (liveToday ? todayTasksToView(liveToday, lang).find((t) => t.kind === 'lesson')?.title ?? null : null), [lang, liveToday]);
  const today = todayBase && todayTitle ? { ...todayBase, title: todayTitle } : null;
  // зачем: звук удара серии/«Сегодня» решается по строке в момент удара, а не по первому кадру (стор дня обновляется асинхронно после записи)
  const rowsRef = useRef({ streak, today });
  rowsRef.current = { streak, today };

  const finish = useCallback((how: 'reduced' | 'played' | 'skipped') => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    console.log(`${DONE_CHAIN_LOG} конец цепочки: ${how === 'reduced' ? 'reduced-motion — сразу финальный кадр' : how === 'played' ? 'доиграла' : 'досмотрено тапом'}`); // guard-ok: единичный журнал конца
    onFinished?.();
  }, [onFinished]);

  useEffect(() => {
    console.log(`${DONE_CHAIN_LOG} старт: reducedMotion=${String(reduced)} серия={${streak ? streak.reason : 'нет строки: серия неизвестна'}} сегодня={${today ? today.reason : 'нет строки: задачи «урок» нет в пуле дня'}}`); // guard-ok: единичный журнал решения
    if (reduced) { finish('reduced'); return undefined; }
    for (let i = 0; i < T.beats; i += 1) {
      timers.current.push(setTimeout(() => {
        setRevealed(i + 1);
        if (i === DONE_CHAIN_BEAT.streak) playDoneChainBeat(i, rowsRef.current.streak?.animate === true);
        else if (i === DONE_CHAIN_BEAT.today) playDoneChainBeat(i, rowsRef.current.today?.animate === true);
        else playDoneChainBeat(i);
      }, doneChainBeatAt(i)));
    }
    timers.current.push(setTimeout(() => finish('played'), doneChainBeatAt(T.beats - 1) + T.enter));
    const list = timers.current;
    return () => { list.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий играет один раз на показ
  }, []);

  const skip = useCallback(() => {
    if (finishedRef.current) return;
    console.log(`${DONE_CHAIN_LOG} тап — досмотр до финала с удара ${revealed}`); // guard-ok: единичный журнал досмотра
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSkipped(true);
    setRevealed(T.beats);
    finish('skipped');
  }, [finish, revealed]);

  const previewBalance = previewAfter?.balance ?? null;
  const value = useMemo<ChainState>(() => ({ revealed, instant: reduced || skipped, streak, today, previewBalance }), [previewBalance, reduced, revealed, skipped, streak, today]);
  return <ChainCtx.Provider value={value}>{children(skip)}</ChainCtx.Provider>;
});

/** Блок `[data-b]`: всплывает (opacity 0 → 1, сдвиг 18 → 0) на своём ударе. */
export const ChainBeat = memo(function ChainBeat({ index, style, children }: { index: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { revealed, instant } = useContext(ChainCtx);
  const on = revealed > index;
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    if (!on) return;
    p.value = instant ? 1 : withTiming(1, { duration: T.enter, easing: EASE });
  }, [instant, on, p]);
  const st = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * T.rise }] }));
  return <Reanimated.View pointerEvents={on ? 'auto' : 'none'} style={[style, st]}>{children}</Reanimated.View>;
});

const ChainStar = memo(function ChainStar({ lit, index, g, color }: { lit: boolean; index: number; g: Lv2Glass; color: string }) {
  const { revealed, instant } = useContext(ChainCtx);
  const go = lit && revealed > DONE_CHAIN_BEAT.stars;
  const pop = useSharedValue(go && instant ? 1 : 0);
  useEffect(() => {
    if (!go) return;
    if (instant) { pop.value = 1; return; }
    // emPop: 0 → 70 % (scale 1.12, видна) → 100 % (scale 1)
    pop.value = withDelay(index * T.starStep, withSequence(withTiming(0.7, { duration: T.starPop * 0.7, easing: EASE_POP }), withTiming(1, { duration: T.starPop * 0.3, easing: EASE_POP })));
  }, [go, index, instant, pop]);
  const st = useAnimatedStyle(() => {
    const v = pop.value;
    const scale = v <= 0.7 ? 0.4 + (1.12 - 0.4) * (v / 0.7) : 1.12 - 0.12 * ((v - 0.7) / 0.3);
    return { opacity: Math.min(1, v / 0.7), transform: [{ scale }] };
  });
  return (
    <View>
      <Ionicons name="star" size={44} color={g.opaqueControl} />
      {lit ? (
        <Reanimated.View style={[StyleSheet.absoluteFill, st]}>
          <Ionicons name="star" size={44} color={color} />
        </Reanimated.View>
      ) : null}
    </View>
  );
});

/** Три звезды образца: горящие красятся акцентом с emPop по 150 мс. */
export const ChainStars = memo(function ChainStars({ stars, g, accessibilityLabel }: { stars: number; g: Lv2Glass; accessibilityLabel: string }) {
  const c = useStreakColors();
  return (
    <View style={s.stars} accessible accessibilityLabel={accessibilityLabel}>
      {[0, 1, 2].map((i) => <ChainStar key={i} index={i} lit={i < stars} g={g} color={c.accentGraphic} />) /* guard-ok: ровно три звезды, порядок неизменен */}
    </View>
  );
});

type CountPhase = 'hold' | 'run' | 'final';

/** hold — стоит на from (блок ещё не всплыл), run — бежит from → to через delay, final — сразу to (reduced-motion / досмотр). */
function useCountUp(from: number, to: number, phase: CountPhase, delay: number, duration: number): number {
  const [shown, setShown] = useState(phase === 'final' ? to : from);
  useEffect(() => {
    if (phase !== 'run') { setShown(phase === 'final' ? to : from); return undefined; }
    const startedAt = Date.now() + delay;
    const timer = setInterval(() => {
      const k = Math.min(1, Math.max(0, (Date.now() - startedAt) / duration));
      setShown(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
      if (k >= 1) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [delay, duration, from, phase, to]);
  return shown;
}

const FlyCoin = memo(function FlyCoin({ k, dx, color }: { k: number; dx: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(T.flyDelay + k * T.flyStep, withTiming(1, { duration: T.flyDuration, easing: EASE_IN_OUT }));
  }, [dx, k, t]);
  const st = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ translateX: dx * t.value }, { scale: 1 - 0.5 * t.value }] }));
  return <Reanimated.View pointerEvents="none" style={[s.fly, { backgroundColor: color }, st]} />;
});

/** Строка «+N монет» с плашкой баланса справа: монеты летят в баланс, счёт 0 → N, баланс бежит. */
export const ChainCoinRow = memo(function ChainCoinRow({ amount, g, lang }: { amount: number; g: Lv2Glass; lang: Lang }) {
  const { revealed, instant, previewBalance } = useContext(ChainCtx);
  const c = useStreakColors();
  const on = revealed > DONE_CHAIN_BEAT.coins;
  const animate = on && !instant;
  const [liveBalance, setBalance] = useState(() => Math.max(0, Math.round(Number(peekRunes()) || 0))); // guard-ok: только показ баланса, ничего не пишет
  useEffect(() => subscribeAppSnapshot(() => setBalance(Math.max(0, Math.round(Number(peekRunes()) || 0)))), []); // guard-ok: только показ баланса, ничего не пишет
  // зачем (Сверка 15.10): превью показывало настоящий кошелёк эмулятора (53 при +150) — баланс не бежал. Моки задают баланс «после урока».
  const balance = previewBalance ?? liveBalance;
  // зачем: баланс уже включает монеты урока — «бежит» от (баланс − N) к балансу; если ещё не включает (баланс < N), не выдумываем и показываем как есть
  const credited = balance >= amount;
  const phase: CountPhase = !on ? 'hold' : animate ? 'run' : 'final';
  const shownCoins = useCountUp(0, amount, phase, 0, T.coinCount);
  const shownBalance = useCountUp(credited ? balance - amount : balance, balance, credited ? phase : 'final', T.balanceAt, T.balanceCount);
  const [rowW, setRowW] = useState(0);
  const [pillW, setPillW] = useState(0);
  const dx = Math.max(0, rowW - 16 - pillW / 2 - (16 + 15));
  const balanceText = String(shownBalance).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setRowW(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`+${amount} ${runeWord(lang, amount)}`}
      style={[s.plateRow, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]}
    >
      <Image source={HOME_RUNE_ICON_SOURCE} style={s.rowCoin} contentFit="contain" accessible={false} />
      <Text style={[s.rowTitle, s.grow, { color: g.text }]}>+{shownCoins} {runeWord(lang, amount)}</Text>
      <View testID="v2-done-chain-balance" onLayout={(e: LayoutChangeEvent) => setPillW(e.nativeEvent.layout.width)} style={[s.pill, { backgroundColor: g.opaqueControl }]}>
        <Image source={HOME_RUNE_ICON_SOURCE} style={s.pillCoin} contentFit="contain" accessible={false} />
        <Text style={[s.pillText, { color: g.text }]}>{balanceText}</Text>
      </View>
      {animate && dx > 0 ? Array.from({ length: T.flyCount }, (_, k) => <FlyCoin key={k} k={k} dx={dx} color={c.accentGraphic} />) : null /* guard-ok: шесть монет фиксированного числа */}
    </View>
  );
});

/** Строка «Серия — N дней»: через 300 мс после появления — N+1, огонь из контура в залитый, «сегодня засчитан». */
export const ChainStreakRow = memo(function ChainStreakRow({ g, lang }: { g: Lv2Glass; lang: Lang }) {
  const { revealed, instant, streak } = useContext(ChainCtx);
  const c = useStreakColors();
  const on = revealed > DONE_CHAIN_BEAT.streak;
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    if (!on || !streak?.animate) return undefined;
    if (instant) { setFlipped(true); return undefined; }
    const id = setTimeout(() => setFlipped(true), T.flipAt);
    return () => clearTimeout(id);
  }, [instant, on, streak?.animate]);
  if (!streak) return null;
  const view = !streak.animate || flipped ? streak.to : streak.from;
  return (
    <View testID="v2-done-chain-streak" style={[s.plateRow, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]}>
      <Ionicons name={view.counted ? 'flame' : 'flame-outline'} size={24} color={c.accentGraphic} />
      <View style={s.grow}>
        <Text style={[s.rowTitle, { color: g.text }]}>{doneChainText(lang, 'streak', view.days)}</Text>
        <Text style={[s.rowSub, { color: g.secondary }]}>{doneChainText(lang, view.counted ? 'counted' : 'pending')}</Text>
      </View>
    </View>
  );
});

/** Строка «Сегодня · Пройти урок»: через 300 мс — 1/1 и отметка цветом кольца. */
export const ChainTodayRow = memo(function ChainTodayRow({ g }: { g: Lv2Glass }) {
  const { revealed, instant, today } = useContext(ChainCtx);
  const c = useStreakColors();
  const on = revealed > DONE_CHAIN_BEAT.today;
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    if (!on || !today?.animate) return undefined;
    if (instant) { setFlipped(true); return undefined; }
    const id = setTimeout(() => setFlipped(true), T.flipAt);
    return () => clearTimeout(id);
  }, [instant, on, today?.animate]);
  if (!today) return null;
  const count = !today.animate || flipped ? today.to : today.from;
  const done = count >= today.target;
  return (
    <View testID="v2-done-chain-today" accessible accessibilityState={{ checked: done }} accessibilityLabel={`${today.title}. ${count}/${today.target}`} style={[s.taskRow, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]}>
      <View
        style={[s.check, done ? { backgroundColor: c.accentGraphic, borderColor: c.accentGraphic } : { borderColor: g.mutedText }]} // guard-ok: D43 отметка-кружок, как у «Сегодня» Главной
      >
        {done ? <Ionicons name="checkmark" size={14} color={g.opaqueSheet} /> : null}
      </View>
      <V2IconTile name="book-outline" size={36} iconSize={19} />
      <Text style={[s.rowTitle, s.grow, { color: g.text }]}>{today.title}</Text>
      <Text style={[s.count, { color: done ? g.text : g.secondary }]}>{count}/{today.target}</Text>
    </View>
  );
});

const s = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  // `.stars`: gap 10, звезда 44
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 14 },
  // `.sf` строки: padding 12/16, gap 12, текст 16/700
  plateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, marginTop: 10 },
  rowCoin: { width: 30, height: 30 },
  rowTitle: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  rowSub: { fontSize: 13, lineHeight: 17, marginTop: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, borderRadius: 17, paddingHorizontal: 10 },
  pillCoin: { width: 18, height: 18 },
  pillText: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // `.fly`: 18 × 18, круг, цвет акцента
  fly: { position: 'absolute', left: 16 + 15 - 9, top: '50%', marginTop: -9, width: 18, height: 18, borderRadius: 9 },
  // `.trow`: min 58, padding 10/14, радиус 14, gap 12
  taskRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginTop: 10 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1, // D145: рамка 1 pt; shadow-ok: кружок-отметка задачи (индикатор выполнено/нет, как радио), не контейнер; guard-ok
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
