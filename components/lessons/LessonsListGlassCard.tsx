import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import PressableHybrid from '../PressableHybrid';
import { KitGlassLayer, KIT_GLASS_DROP } from '../v2/KitLiquidGlass';
import type { Lang } from '../../constants/i18n';
import {
  lessonsGlassAlpha,
  lessonsGlassCardStyle,
  lessonsListCopy,
  LessonsListStars,
  type LessonsListGlass,
} from './LessonsListGlassKit';
import { useLineScale } from '../../hooks/useLineScale';

// зачем (владелец 2026-09-30): карточка урока `.lc` из learn.html — круг 44 с номером слева,
// название 17/22, строка состояния (звёзды D36 / полоска прогресса / «Открыт» / замок), шеврон.
// Пять состояний макета и только они: пройден, в процессе, открыт, Plus, замок прогресса.
// Цен и кнопок покупки в карточке нет (в 2.0 отметка покупки урока снята). Нажатие только
// сообщает номер урока наверх: доступ решает прежний обработчик в app/(tabs)/lessons.tsx.

export type LessonsListCardState =
  | { kind: 'done'; stars: 0 | 1 | 2 | 3 }
  | { kind: 'progress'; pct: number }
  | { kind: 'open' }
  | { kind: 'plus' }
  | { kind: 'locked'; prevNum: number };

type Props = {
  glass: LessonsListGlass;
  lang: Lang;
  num: number;
  name: string;
  state: LessonsListCardState;
  current: boolean;
  onPressLesson: (num: number) => void;
};

const CIRCLE = 44;
const POP_EASE = Easing.bezier(0.3, 1.5, 0.5, 1);

type CardFx = 'unlock' | 'done';

function isLockedKind(kind: LessonsListCardState['kind']): boolean {
  return kind === 'locked' || kind === 'plus';
}

/**
 * Какая анимация нужна при смене состояния карточки на глазах (learn.html A14): замок → номер
 * («открыт») или урок пройден (галочка и звёзды). Первый показ карточки анимаций не даёт.
 */
function fxForTransition(prev: LessonsListCardState['kind'], next: LessonsListCardState['kind']): CardFx | null {
  if (prev === next) return null;
  if (next === 'done') return 'done';
  if (isLockedKind(prev) && (next === 'open' || next === 'progress')) return 'unlock';
  return null;
}

/** Круг номера «выстреливает»: .6 → 1 с перелётом, прозрачность 0 → 1 (420 мс, как в макете). */
function CirclePop({ children }: { children: React.ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(260, withTiming(1, { duration: 420, easing: POP_EASE }));
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.6),
    transform: [{ scale: 0.6 + p.value * 0.4 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Строка состояния (звёзды/«Пройден»/«Открыт») мягко проявляется после смены круга. */
function StatusFade({ children }: { children: React.ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(420, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + p.value * 0.75,
    transform: [{ translateX: (1 - p.value) * -4 }],
  }));
  return <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }, style]}>{children}</Animated.View>;
}

/** Подсветка открывшейся карточки: светлая кромка и мягкое сияние 500 мс, держится ~1.4 с. */
function UnlockGlow({ glass, onDone }: { glass: LessonsListGlass; onDone: () => void }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withSequence(
      withDelay(260, withTiming(1, { duration: 500 })),
      withDelay(1400, withTiming(0, { duration: 500 })),
    );
    const timer = setTimeout(onDone, 2800);
    return () => clearTimeout(timer);
  }, [onDone, p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: 14,
          borderWidth: 1, // guard-ok: светлая кромка подсветки из макета (A14), держится 1.4 с
          borderColor: lessonsGlassAlpha(glass.text, 0.55), // guard-ok
          backgroundColor: lessonsGlassAlpha(glass.text, 0.04),
        },
        style,
      ]}
    />
  );
}

function statusText(lang: Lang, state: LessonsListCardState): string {
  switch (state.kind) {
    case 'done': return state.stars > 0
      ? `${lessonsListCopy.done(lang)}, ${lessonsListCopy.stars(lang, state.stars)}`
      : lessonsListCopy.done(lang);
    case 'progress': return `${state.pct}%`;
    case 'open': return lessonsListCopy.open(lang);
    case 'plus': return lessonsListCopy.plus(lang);
    case 'locked': return lessonsListCopy.lockPrev(lang, state.prevNum);
  }
}

function NumberCircle({ glass, num, state, current }: {
  glass: LessonsListGlass;
  num: number;
  state: LessonsListCardState;
  current: boolean;
}) {
  const locked = state.kind === 'plus' || state.kind === 'locked';
  const done = state.kind === 'done';
  return (
    <View
      style={{
        width: CIRCLE,
        height: CIRCLE,
        borderRadius: CIRCLE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: done ? glass.cta : 'transparent',
        borderWidth: done ? 0 : 1, // guard-ok: 1 px кромка круга номера, как .num в макете
        borderColor: current && !locked ? lessonsGlassAlpha(glass.text, 0.55) : locked ? glass.line : glass.glassEdge, // guard-ok
      }}
    >
      {done ? (
        <Ionicons name="checkmark" size={20} color={glass.ctaInk} />
      ) : locked ? (
        // зачем (сверка learn-002 п.3, learn.html `.num.lk` + kit lockF): замок маленький и залитый, тон --sec;
        // глиф lockF занимает 14 из 24 — Ionicons 14 даёт ту же видимую величину.
        <Ionicons name="lock-closed" size={14} color={glass.secondary} />
      ) : (
        <Text style={{ color: glass.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {num}
        </Text>
      )}
    </View>
  );
}

function StatusRow({ glass, lang, state }: { glass: LessonsListGlass; lang: Lang; state: LessonsListCardState }) {
  // зачем (learn.html `.pct` 600, `.lkt` обычный): «Пройден»/проценты — полужирные, «Открыт»/«Пройди урок…» — обычные.
  const muted = { color: glass.secondary, fontSize: 13, fontWeight: '600' as const };
  const lkt = { color: glass.secondary, fontSize: 13, fontWeight: '400' as const };
  if (state.kind === 'done') {
    return (
      <>
        {state.stars > 0 ? <LessonsListStars glass={glass} count={state.stars} /> : null}
        <Text style={muted}>{lessonsListCopy.done(lang)}</Text>
      </>
    );
  }
  if (state.kind === 'progress') {
    const pct = Math.max(0, Math.min(100, Math.round(state.pct)));
    return (
      <>
        <View style={{ flex: 1, height: 6, borderRadius: 4, backgroundColor: glass.line, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, minWidth: 6, height: 6, borderRadius: 4, backgroundColor: glass.accent }} />
        </View>
        <Text style={[muted, { minWidth: 34, textAlign: 'right', fontVariant: ['tabular-nums'] }]}>{pct}%</Text>
      </>
    );
  }
  if (state.kind === 'plus') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        <Ionicons name="lock-closed" size={12} color={glass.secondary} />
        <Text style={[lkt, { flexShrink: 1 }]}>{lessonsListCopy.plus(lang)}</Text>
      </View>
    );
  }
  const text = state.kind === 'open' ? lessonsListCopy.open(lang) : lessonsListCopy.lockPrev(lang, state.prevNum);
  return <Text style={[lkt, { flexShrink: 1 }]}>{text}</Text>;
}

export const LessonsListGlassCard = React.memo(function LessonsListGlassCard({
  glass,
  lang,
  num,
  name,
  state,
  current,
  onPressLesson,
}: Props) {
  const lh = useLineScale();
  const locked = state.kind === 'plus' || state.kind === 'locked';
  const press = useCallback(() => onPressLesson(num), [num, onPressLesson]);
  // зачем (владелец 2026-09-30, learn.html A14 «Открытие следующего урока»): когда урок
  // открывается или проходится на глазах (возврат из урока в список), замок сменяется номером
  // с «выстрелом», карточка подсвечивается кромкой, строка состояния проявляется. Смена
  // ловится во время рендера (derived state) — первый кадр нового состояния уже анимирован,
  // без мигания. Движение на UI-треде; reduceMotion — сразу финальный кадр.
  const reducedMotion = useReducedMotion();
  const [trackedKind, setTrackedKind] = useState(state.kind);
  const [fx, setFx] = useState<Readonly<{ kind: CardFx; key: number }> | null>(null);
  if (trackedKind !== state.kind) {
    const nextFx = reducedMotion ? null : fxForTransition(trackedKind, state.kind);
    setTrackedKind(state.kind);
    setFx(nextFx ? { kind: nextFx, key: (fx?.key ?? 0) + 1 } : null);
  }
  const clearFx = useCallback(() => setFx(null), []);
  const circle = <NumberCircle glass={glass} num={num} state={state} current={current} />;
  const status = <StatusRow glass={glass} lang={lang} state={state} />;
  return (
    <PressableHybrid
      testID={`lessons-row-${num}`}
      accessibilityRole="button"
      accessibilityLabel={`${lessonsListCopy.lesson(lang, num)}. ${name}. ${statusText(lang, state)}`}
      onPress={press}
      // зачем: вибрацию даёт прежний обработчик урока (hapticTap в onPress) — не дублируем.
      withHaptic={false}
      variant="card"
      pressScaleTo={0.975}
      // зачем (kit.css --lg-drop): у карточек макета мягкая тень снизу.
      style={{ marginHorizontal: 20, marginTop: 9, borderRadius: 14, boxShadow: KIT_GLASS_DROP }}
      contentStyle={[
        lessonsGlassCardStyle(glass, 14),
        { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
      ]}
    >
      {/* зачем (сверка 04.10, learn-001): карточка урока — стекло kit.css (.card::after: блик 150°, светлая
          кромка сверху-слева, тёмная снизу), а не плоская заливка с подкраской темы. */}
      <KitGlassLayer radius={14} />
      {fx?.kind === 'unlock' ? <UnlockGlow key={`glow-${fx.key}`} glass={glass} onDone={clearFx} /> : null}
      <View style={{ opacity: locked ? 0.8 : 1 }}>
        {fx ? <CirclePop key={`pop-${fx.key}`}>{circle}</CirclePop> : circle}
      </View>
      <View style={{ flex: 1, minWidth: 0, opacity: locked ? 0.8 : 1 }}>
        {/* зачем (learn.html `.lc.locked .tt`): у закрытого урока название приглушённое (0xD0D0D2 ≈ текст темы с прозрачностью .82, + .8 у блока). */}
        <Text style={{ color: locked ? lessonsGlassAlpha(glass.text, 0.82) : glass.text, fontSize: 16, lineHeight: lh(21), fontWeight: '700' }}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, minHeight: 18 }}>
          {fx ? <StatusFade key={`st-${fx.key}`}>{status}</StatusFade> : status}
        </View>
      </View>
      {/* зачем (learn.html `.lc` → `.ch` без своего цвета): шеврон наследует цвет текста карточки и не приглушается у закрытых. */}
      <Ionicons name="chevron-forward" size={20} color={glass.text} />
    </PressableHybrid>
  );
});
