/**
 * Смахиваемая карточка «Правда / ложь» — макет docs/design/v2-app/cards-v2.html, `.swz` / `.swc` / `initSwipe()`.
 *
 * зачем (Карточки 2.0 12.10): раньше режим отвечал только двумя кнопками. По макету карточку смахивают пальцем: вправо — «Правда», влево — «Ложь».
 * Числа — из макета без изменений: порог ответа 110 px, наклон dx/22 градуса, лёгкий сдвиг вниз |dx|·0.04, штамп «Правда»/«Ложь» проявляется
 * на 90 px, улёт 320 мс cubic-bezier(.4,0,.7,.4) до ±520 px, возврат из недотянутого жеста 420 мс cubic-bezier(.3,1.4,.5,1) (с пружиной),
 * вход следующей карточки: scale .94 → 1 за 380 мс cubic-bezier(.2,.8,.2,1) и opacity за 240 мс.
 * Что делает ответ (счёт, попытки, руны, энергия), решает экран через onDecide — здесь только жест и движение.
 * После ответа карточка остаётся на месте в «зафиксированной» позе (сдвиг 18 px, наклон 3°, штамп на полной яркости, цветное кольцо исхода),
 * а на «Дальше» экран вызывает flyOut() — карточка улетает в ту же сторону и сменяется следующей.
 */
import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing as REasing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLineScale } from '../../hooks/useLineScale';
import { FlowText } from '../../components/text-integrity/FlowText';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../../components/v2/ShadowSurface';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { semanticInk } from '../../constants/liquidGlassSemanticInk';

/** Числа движения из макета (`initSwipe`). */
export const TF_SWIPE_THRESHOLD = 110;
export const TF_SWIPE_FLY_MS = 320;
export const TF_SWIPE_SPRING_MS = 420;
export const TF_SWIPE_ENTER_MS = 380;
const TF_SWIPE_FLY_TO = 520;
const TF_SWIPE_STAMP_AT = 90;
const TF_COMMIT_SHIFT = 18;
const FLY_EASE = REasing.bezier(0.4, 0, 0.7, 0.4);
const SPRING_EASE = REasing.bezier(0.3, 1.4, 0.5, 1);
const ENTER_EASE = REasing.bezier(0.2, 0.8, 0.2, 1);

export type TrueFalseSwipeCardHandle = Readonly<{
  /** Улететь в сторону (-1 — «Ложь», +1 — «Правда») за 320 мс, затем вызвать onDone. */
  flyOut: (dir: -1 | 1, onDone: () => void) => void;
}>;

type Props = Readonly<{
  g: GlassTokens;
  /** Ключ карточки: при смене следующая карточка «входит» (scale .94 → 1). */
  promptKey: string;
  word: string;
  translation: string;
  stampTrue: string;
  stampFalse: string;
  /** Жесты выключены (после ответа / пока попытки не активны). */
  disabled: boolean;
  /** Ответ уже дан: сторона выбора (+1 «Правда», -1 «Ложь») и исход; null — вопрос ещё открыт. */
  committed: Readonly<{ dir: -1 | 1; ok: boolean }> | null;
  /** Игрок решил: true — «Правда», false — «Ложь» (жест за порогом). */
  onDecide: (saysMatch: boolean) => void;
  accessibilityLabel: string;
  testID?: string;
}>;

const clamp = (v: number, a: number, b: number) => {
  'worklet';
  return Math.max(a, Math.min(b, v));
};

function TrueFalseSwipeCardImpl({ g, promptKey, word, translation, stampTrue, stampFalse, disabled, committed, onDecide, accessibilityLabel, testID }: Props, ref: React.Ref<TrueFalseSwipeCardHandle>) {
  const lh = useLineScale();
  const reduceMotion = useReduceMotion();
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const commitDir = useSharedValue(0);
  const flying = useSharedValue(0);
  const lastKeyRef = useRef(promptKey);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  // зачем: ответ дан (кнопкой или жестом) — карточка встаёт в зафиксированную позу; сброс (committed → null) — на место
  useEffect(() => {
    commitDir.value = committed ? committed.dir : 0;
    if (flying.value === 1) return;
    cancelAnimation(x);
    x.value = withTiming(committed ? committed.dir * TF_COMMIT_SHIFT : 0, { duration: reduceMotion ? 0 : TF_SWIPE_FLY_MS, easing: FLY_EASE });
  }, [commitDir, committed, flying, reduceMotion, x]);

  // зачем: следующая карточка входит — прозрачная и чуть меньше, затем встаёт на место (макет `next()`)
  useEffect(() => {
    if (lastKeyRef.current === promptKey) return;
    lastKeyRef.current = promptKey;
    cancelAnimation(x);
    flying.value = 0;
    commitDir.value = 0;
    x.value = 0;
    if (reduceMotion) { opacity.value = 1; scale.value = 1; return; }
    opacity.value = 0;
    scale.value = 0.94;
    opacity.value = withTiming(1, { duration: 240 });
    scale.value = withTiming(1, { duration: TF_SWIPE_ENTER_MS, easing: ENTER_EASE });
  }, [commitDir, flying, opacity, promptKey, reduceMotion, scale, x]);

  useImperativeHandle(ref, () => ({
    flyOut: (dir, onDone) => {
      flying.value = 1;
      cancelAnimation(x);
      x.value = withTiming(dir * TF_SWIPE_FLY_TO, { duration: reduceMotion ? 0 : TF_SWIPE_FLY_MS, easing: FLY_EASE }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
    },
  }), [flying, reduceMotion, x]);

  const decide = (saysMatch: boolean) => { if (!disabledRef.current) onDecide(saysMatch); };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-8, 8])
    .failOffsetY([-24, 24])
    .onBegin(() => { cancelAnimation(x); })
    .onUpdate((e) => { x.value = e.translationX; })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > TF_SWIPE_THRESHOLD) {
        // зачем: ответ засчитываем сразу (Optimistic UI), а карточка доезжает в зафиксированную позу по эффекту выше
        runOnJS(decide)(e.translationX > 0);
      } else {
        x.value = withTiming(0, { duration: reduceMotion ? 0 : TF_SWIPE_SPRING_MS, easing: SPRING_EASE });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: Math.abs(x.value) * 0.04 }, { rotate: `${x.value / 22}deg` }, { scale: scale.value }],
  }));
  const stampTrueStyle = useAnimatedStyle(() => ({ opacity: commitDir.value === 1 ? 1 : commitDir.value === -1 ? 0 : clamp(x.value / TF_SWIPE_STAMP_AT, 0, 1) }));
  const stampFalseStyle = useAnimatedStyle(() => ({ opacity: commitDir.value === -1 ? 1 : commitDir.value === 1 ? 0 : clamp(-x.value / TF_SWIPE_STAMP_AT, 0, 1) }));

  const ring = committed ? (committed.ok ? g.good : g.bad) : null;

  return (
    <View style={styles.zone} testID={testID}>
      {/* `.swz .under`: карточка-подложка позади (поля 14, сверху 14, снизу −10) */}
      <View pointerEvents="none" style={[styles.under, { boxShadow: nestedBoxShadow(g) }]}>
        <PlateFill g={g} radius={20} />
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View
          accessible
          accessibilityLabel={accessibilityLabel}
          style={[styles.card, { boxShadow: plateBoxShadow(g) }, cardStyle]}
        >
          <PlateFill g={g} radius={20} />
          {ring ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ring, { boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1.5, color: `${ring}73` }] }]} /> : null /* shadow-ok: кольцо исхода ответа «верно/неверно» (состояние), не обводка контейнера */}
          <FlowText testID="true-false-word" provenance="authored" style={[styles.word, { color: g.text, lineHeight: lh(40) }]}>{word}</FlowText>
          <View style={[styles.eq, { backgroundColor: g.dividerTone }]} />
          <FlowText testID="true-false-translation" provenance="authored" style={[styles.translation, { color: g.text, lineHeight: lh(28) }]}>{translation}</FlowText>
          {/* штампы `.stmp.y` / `.stmp.n`: «Правда» слева сверху, «Ложь» справа сверху */}
          <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampLeft, { backgroundColor: g.goodSoft }, stampTrueStyle]}>
            <Text style={[styles.stampText, { color: semanticInk(g).goodText }]}>{stampTrue}</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampRight, { backgroundColor: g.badSoft }, stampFalseStyle]}>
            <Text style={[styles.stampText, { color: semanticInk(g).badText }]}>{stampFalse}</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const TrueFalseSwipeCard = memo(forwardRef(TrueFalseSwipeCardImpl));
export default TrueFalseSwipeCard;

const styles = StyleSheet.create({
  // `.swz`: высота 210, сверху 40
  zone: { height: 210, marginTop: 40 },
  under: { position: 'absolute', left: 14, right: 14, top: 14, bottom: -10, borderRadius: 20 },
  card: { ...StyleSheet.absoluteFillObject, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 20 },
  ring: { borderRadius: 20 },
  word: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  eq: { width: 40, height: 1, marginVertical: 14 },
  translation: { fontSize: 22, fontWeight: '600', textAlign: 'center' },
  stamp: { position: 'absolute', top: 18, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10 },
  stampLeft: { left: 18 },
  stampRight: { right: 18 },
  stampText: { fontSize: 16, lineHeight: 22, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
});
