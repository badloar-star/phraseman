// ═══════════════════════════════════════════════════════════════════════════
// LessonPrepCtaBody.tsx — начинка кнопки «Продолжить» / «Начать», когда занятие ещё собирается («Готовим занятие…»).
// Живой макет docs/design/v2-app/lesson-preparing-live.html (владелец утвердил 25.10; координатор).
//
// зачем: обычно занятие уже собрано и кнопка ничего не ждёт (вид не меняется вовсе). В крайнем случае — дольше 0,35 с — на месте значка кольцо
// хода, подпись «Готовим занятие…», внутри кнопки мягкая заливка хода; через 6 с — «Ещё готовится…»; готово — заливка дотягивается за 180 мс и
// занятие открывается; не успело — кнопка возвращается, а подсказку снизу показывает запуск. Спиннера на весь экран нет; вечного вращения нет:
// кольцо и заливка — ход подготовки (быстро до ~60 %, дальше медленнее, до конца сами не доходят), считается на UI-потоке (useFrameCallback),
// без setState в кадрах. Смена подписи — 160 мс (в RN без размытия 2 px, только прозрачность). «Уменьшить движение» — смены без анимации.
// Родитель (кнопка) обязан быть position:relative с overflow:hidden и скруглением — заливка режется по нему.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing, cancelAnimation, runOnJS, useAnimatedProps, useAnimatedStyle, useFrameCallback, useReducedMotion, useSharedValue, withTiming,
} from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { useLessonPrep, type LessonPrepSource } from '../../app/lesson_prep_store';
import {
  PREP_FINISH_MS, PREP_SWAP_MS, prepFakeProgress, prepNextStageInMs, prepStageAt, type PrepStage,
} from './prep_cta_model';
import { prepCtaText } from './prep_cta_copy';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const RING_R = 7;
const RING_LEN = 2 * Math.PI * RING_R;
/** Сколько занимает возврат кнопки к обычному виду, когда не успело (заливка тает 200 мс — макет). */
const RETURN_MS = 200;

export type LessonPrepCtaBodyProps = Readonly<{
  source: LessonPrepSource;
  lang: Lang;
  /** Обычная подпись кнопки («Продолжить», «Начать»). */
  label: string;
  /** Цвет текста, кольца и значка (тёмный на белой кнопке). */
  ink: string;
  /** Мягкая заливка хода внутри кнопки (макет: rgba(18,19,24,.09) на белой). */
  fillColor: string;
  /** Обычный значок слева («▶»), 18×18; null — слева ничего нет (кольцо появляется на его месте). */
  idleIcon?: React.ReactNode;
  /** Хвост кнопки (стрелка справа в шторке «Начать»): гаснет, пока готовится. */
  trailing?: React.ReactNode;
  labelStyle: StyleProp<TextStyle>;
  testID?: string;
}>;

function LessonPrepCtaBody({ source, lang, label, ink, fillColor, idleIcon = null, trailing = null, labelStyle, testID }: LessonPrepCtaBodyProps) {
  const prep = useLessonPrep(source);
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<PrepStage>('idle');
  const progress = useSharedValue(0);
  const startedAtSv = useSharedValue(0);
  const fillOpacity = useSharedValue(0);
  const ringT = useSharedValue(0); // 0 — значок, 1 — кольцо
  const finishing = prep?.finishing === true;
  const startedAt = prep?.startedAt ?? null;

  const frame = useFrameCallback(() => {
    'worklet';
    if (startedAtSv.value > 0) progress.value = prepFakeProgress(Date.now() - startedAtSv.value);
  }, false);

  // подпись по времени с тапа: 0,35 с → «Готовим», 6 с → «Ещё готовится»; без prep — обычный вид
  useEffect(() => {
    if (startedAt === null) { setStage('idle'); return undefined; }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const step = (): void => {
      const elapsed = Date.now() - startedAt;
      const next = prepStageAt(elapsed);
      setStage((cur) => {
        if (cur !== next) console.log('[PREP-CTA]', 'stage', JSON.stringify({ source, from: cur, to: next, elapsedMs: elapsed })); // guard-ok: смена подписи для человека
        return next;
      });
      const wait = prepNextStageInMs(elapsed);
      if (wait !== null) timer = setTimeout(step, wait);
    };
    step();
    return () => { if (timer) clearTimeout(timer); };
  }, [source, startedAt]);

  // ход: пока подпись «Готовим…/Ещё готовится…» и подготовка не закончена — кадр за кадром на UI-потоке
  const busyVisible = stage !== 'idle';
  useEffect(() => {
    if (busyVisible && !finishing && startedAt !== null) {
      startedAtSv.value = startedAt;
      frame.setActive(true);
    } else {
      frame.setActive(false);
    }
    return () => frame.setActive(false);
  }, [busyVisible, finishing, frame, startedAt, startedAtSv]);

  // видимость заливки и кольца
  useEffect(() => {
    const ms = reduceMotion ? 0 : PREP_SWAP_MS;
    if (busyVisible) {
      cancelAnimation(fillOpacity);
      fillOpacity.value = withTiming(1, { duration: ms, easing: EASE_OUT });
      ringT.value = withTiming(1, { duration: ms, easing: EASE_OUT });
    } else {
      fillOpacity.value = withTiming(0, { duration: reduceMotion ? 0 : RETURN_MS, easing: EASE_OUT }, (done) => { if (done) progress.value = 0; });
      ringT.value = withTiming(0, { duration: ms, easing: EASE_OUT });
    }
  }, [busyVisible, fillOpacity, progress, reduceMotion, ringT]);

  // готово — заливка и кольцо дотягиваются до конца за 180 мс
  useEffect(() => {
    if (!finishing || !busyVisible) return;
    progress.value = withTiming(1, { duration: reduceMotion ? 0 : PREP_FINISH_MS, easing: EASE_OUT });
  }, [busyVisible, finishing, progress, reduceMotion]);

  const text = stage === 'preparing' ? prepCtaText(lang, 'preparing') : stage === 'still' ? prepCtaText(lang, 'still') : label;
  const [shownText, setShownText] = useState(text);
  const textOpacity = useSharedValue(1);
  useEffect(() => {
    if (text === shownText) return;
    if (reduceMotion) { setShownText(text); return; }
    textOpacity.value = withTiming(0, { duration: PREP_SWAP_MS * 0.45, easing: EASE_OUT }, (done) => { if (done) runOnJS(setShownText)(text); });
  }, [reduceMotion, shownText, text, textOpacity]);
  useEffect(() => {
    textOpacity.value = reduceMotion ? 1 : withTiming(1, { duration: PREP_SWAP_MS * 0.55, easing: EASE_OUT });
  }, [reduceMotion, shownText, textOpacity]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fillOpacity.value, transform: [{ scaleX: Math.max(0, Math.min(1, progress.value)) }] }));
  const idleIconStyle = useAnimatedStyle(() => ({ opacity: 1 - ringT.value, transform: [{ scale: 1 - 0.4 * ringT.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ringT.value, transform: [{ scale: 0.6 + 0.4 * ringT.value }] }));
  const trailingStyle = useAnimatedStyle(() => ({ opacity: 1 - ringT.value }));
  const labelAnimStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LEN * (1 - Math.max(0, Math.min(1, progress.value))) }));

  return (
    <>
      <Animated.View pointerEvents="none" style={[s.fill, { backgroundColor: fillColor }, fillStyle]} testID={testID ? `${testID}-fill` : undefined} />
      <View style={s.row}>
        {idleIcon !== null ? (
          <View style={s.iconSlot}>
            <Animated.View style={[s.iconLayer, idleIconStyle]}>{idleIcon}</Animated.View>
            <Animated.View style={[s.iconLayer, ringStyle]} pointerEvents="none">
              <RingIcon ink={ink} animatedProps={ringProps} />
            </Animated.View>
          </View>
        ) : (
          <Animated.View style={[s.ringOnly, ringStyle]} pointerEvents="none">
            <RingIcon ink={ink} animatedProps={ringProps} />
          </Animated.View>
        )}
        <Animated.View style={labelAnimStyle}>
          <Text style={labelStyle} numberOfLines={1} accessibilityLiveRegion="polite" testID={testID ? `${testID}-label` : undefined}>{shownText}</Text>
        </Animated.View>
      </View>
      {trailing ? <Animated.View pointerEvents="none" style={[s.trailing, trailingStyle]}>{trailing}</Animated.View> : null}
    </>
  );
}

function RingIcon({ ink, animatedProps }: Readonly<{ ink: string; animatedProps: object }>) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Circle cx={9} cy={9} r={RING_R} fill="none" stroke={ink} strokeOpacity={0.18} strokeWidth={2.4} />
      <AnimatedCircle cx={9} cy={9} r={RING_R} fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeDasharray={`${RING_LEN} ${RING_LEN}`} animatedProps={animatedProps} rotation={-90} origin="9, 9" />
    </Svg>
  );
}

const s = StyleSheet.create({
  // заливка хода: слева направо, режется скруглением кнопки (родитель overflow hidden)
  fill: { ...StyleSheet.absoluteFillObject, transformOrigin: 'left center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexShrink: 1 },
  iconSlot: { width: 18, height: 18 },
  iconLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringOnly: { position: 'absolute', left: -28, width: 18, height: 18 },
  trailing: { position: 'absolute', right: 22, top: 0, bottom: 0, justifyContent: 'center' },
});

export default memo(LessonPrepCtaBody);
