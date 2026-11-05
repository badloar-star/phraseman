// ═══════════════════════════════════════════════════════════════════════════
// SplashCoin.tsx — экранная заставка «Г · Монета» (1,8 с): монета катится слева и раскрывается в знак, внизу строка реализации.
//
// зачем (слово владельца 05.11: «ДЕЛАЙ Г монета! Можно сделать так, чтобы она сразу была при запуске, без статичной картинки вначале?»; макет
// docs/work/release/mockups/splash_variants_2026-11-05.html, вариант «Г · Монета»): повтор 1:1, включая тайминги и кривые макета. Прежний бесконечный пульс заменён
// конечной анимацией: в финале стоит знак. Всё на нативном драйвере (transform/opacity, UI-поток), старт с первого кадра JS.
//   монета      : translateX −300→+7→0 и rotate −290°→+7°→0 за 700 мс (574 мс cubic-bezier(.3,.6,.35,1), затем 126 мс cubic-bezier(.45,0,.55,1)); opacity 0→1 за первые 8 %
//   переворот   : в 700 мс, 230 мс cubic-bezier(.55,0,.85,.35): perspective 800, rotateY 0→90°, scale 1→1,22 (ребро — монета исчезает)
//   знак        : в 930 мс, 560 мс cubic-bezier(.23,1,.32,1) на каждом отрезке: rotateY −90°→8°→0, scale .83→1,03→1
//   искра       : в 1300 мс, 460 мс cubic-bezier(.23,1,.32,1): scale .2→1→.6, rotate −45°→0→20°, opacity 0→1→0
//   надпись     : в 1080 мс, 460 мс cubic-bezier(.23,1,.32,1): opacity 0→1, translateY 10→0;  подзаголовок: в 1240 мс, 400 мс
// Animated.add не используем — на Android New Architecture он держит ссылку на снятую интерполяцию (см. комментарий в app/_layout.tsx): каждое свойство — свой Value
// с последовательностью timing. «Уменьшить движение» — короткое растворение 280 мс готового кадра. Журнал [SPLASH-COIN]: start / end / ms / reducedMotion.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';

export const SPLASH_COIN_TOTAL_MS = 1800;
export const SPLASH_COIN_REDUCED_MS = 280;
const GLYPH = 176;
const COIN = 120;
const WORD_W = 232;
const WORD_H = Math.round(WORD_W * (68 / 553)); // из assets/images/splash-wordmark.webp
const SPARK = 28;

// кривые макета (--out, --sym и частные)
const B_ROLL = Easing.bezier(0.3, 0.6, 0.35, 1);
const SYM = Easing.bezier(0.45, 0, 0.55, 1);
const OUT = Easing.bezier(0.23, 1, 0.32, 1);
const FLIP = Easing.bezier(0.55, 0, 0.85, 0.35);

/** Анимация уже доиграла в этом процессе — повторный показ (запасной экран онбординга) сразу рисует финал, без перезапуска. */
let splashCoinFinished = false;
export const isSplashCoinFinished = (): boolean => splashCoinFinished;

const t = (v: Animated.Value, to: number, duration: number, easing: (x: number) => number, delay = 0): Animated.CompositeAnimation =>
  Animated.timing(v, { toValue: to, duration, delay, easing, useNativeDriver: true });
/** Две части одного свойства: к промежуточному значению и к финалу (отрезки keyframes макета). */
const seq = (v: Animated.Value, mid: number, end: number, d1: number, d2: number, e1: (x: number) => number, e2: (x: number) => number, delay = 0): Animated.CompositeAnimation =>
  Animated.sequence([t(v, mid, d1, e1, delay), t(v, end, d2, e2)]);
const deg = (v: Animated.Value): Animated.AnimatedInterpolation<string> => v.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] });

type Props = Readonly<{
  /** Цвет подзаголовка «by Professor Lingman». */
  subtitleColor: string;
  /** Подкраска надписи (null — исходный светлый рисунок). */
  wordmarkTint: string | null;
  /** null — системное значение ещё читается: играем обычную анимацию, при true переключаемся на растворение. */
  reducedMotion: boolean | null;
  fontFamily?: string;
  onLog: (step: string, extra?: unknown) => void;
}>;

function SplashCoinImpl({ subtitleColor, wordmarkTint, reducedMotion, fontFamily, onLog }: Props): React.JSX.Element {
  const finished = splashCoinFinished;
  const v = useRef({
    rollX: new Animated.Value(finished ? 0 : -300), rollR: new Animated.Value(finished ? 0 : -290), rollOp: new Animated.Value(0),
    flip: new Animated.Value(finished ? 1 : 0), flipOp: new Animated.Value(finished ? 0 : 1),
    gOp: new Animated.Value(finished ? 1 : 0), gRY: new Animated.Value(finished ? 0 : -90), gScale: new Animated.Value(finished ? 1 : 0.83),
    sOp: new Animated.Value(0), sScale: new Animated.Value(0.2), sRot: new Animated.Value(-45),
    wOp: new Animated.Value(finished ? 1 : 0), wY: new Animated.Value(finished ? 0 : 10),
    subOp: new Animated.Value(finished ? 1 : 0), subY: new Animated.Value(finished ? 0 : 10),
    fade: new Animated.Value(finished ? 1 : 0),
  }).current;
  const startedAt = useRef(0);

  useEffect(() => {
    // i18n-ok: лог трассировки, пользователь не видит
    if (finished) { onLog('[SPLASH-COIN] final-state (replay skipped: animation already finished)', {}); return undefined; }
    startedAt.current = Date.now();
    onLog('[SPLASH-COIN] start', { reducedMotion });
    let anim: Animated.CompositeAnimation;
    if (reducedMotion === true) {
      // «Уменьшить движение»: готовый кадр растворяется за 280 мс
      v.gOp.setValue(1); v.gRY.setValue(0); v.gScale.setValue(1); v.wOp.setValue(1); v.wY.setValue(0); v.subOp.setValue(1); v.subY.setValue(0);
      anim = t(v.fade, 1, SPLASH_COIN_REDUCED_MS, OUT);
    } else {
      v.fade.setValue(1);
      anim = Animated.parallel([
        // монета катится: 700 мс
        seq(v.rollX, 7, 0, 574, 126, B_ROLL, SYM),
        seq(v.rollR, 7, 0, 574, 126, B_ROLL, SYM),
        t(v.rollOp, 1, 56, B_ROLL),
        // переворот ребром
        t(v.flip, 1, 230, FLIP, 700),
        t(v.flipOp, 0, 1, Easing.linear, 930),
        // знак раскрывается
        t(v.gOp, 1, 6, Easing.linear, 930),
        seq(v.gRY, 8, 0, 364, 196, OUT, OUT, 930),
        seq(v.gScale, 1.03, 1, 364, 196, OUT, OUT, 930),
        // искра
        seq(v.sOp, 1, 0, 207, 253, OUT, OUT, 1300),
        seq(v.sScale, 1, 0.6, 207, 253, OUT, OUT, 1300),
        seq(v.sRot, 0, 20, 207, 253, OUT, OUT, 1300),
        // надпись и подзаголовок
        t(v.wOp, 1, 460, OUT, 1080), t(v.wY, 0, 460, OUT, 1080),
        t(v.subOp, 1, 400, OUT, 1240), t(v.subY, 0, 400, OUT, 1240),
      ]);
    }
    anim.start(({ finished: done }) => {
      const ms = Date.now() - startedAt.current;
      if (done) splashCoinFinished = true;
      onLog('[SPLASH-COIN] end', { ms, finished: done, reducedMotion });
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion === true]);

  const coinTransform = useMemo(() => ({
    opacity: v.rollOp,
    transform: [{ translateX: v.rollX }, { rotate: deg(v.rollR) }],
  }), [v]);
  const flipStyle = {
    opacity: v.flipOp,
    transform: [{ perspective: 800 }, { rotateY: v.flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }, { scale: v.flip.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }],
  };
  const glyphStyle = {
    opacity: v.gOp,
    transform: [{ perspective: 800 }, { rotateY: deg(v.gRY) }, { scale: v.gScale }],
  };
  const sparkStyle = { opacity: v.sOp, transform: [{ scale: v.sScale }, { rotate: deg(v.sRot) }] };

  return (
    <Animated.View style={{ alignItems: 'center', opacity: v.fade }}>
      <View style={{ width: GLYPH, height: GLYPH }}>
        <Animated.View pointerEvents="none" style={[s.coinSlot, coinTransform]}>
          <Animated.View style={[{ width: COIN, height: COIN }, flipStyle]}>
            <Image source={require('../../assets/images/splash-coin.webp')} contentFit="contain" accessible={false} style={{ width: COIN, height: COIN }} />
          </Animated.View>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glyphStyle]}>
          <Image source={require('../../assets/images/splash-glyph.webp')} contentFit="contain" accessible={false} style={{ width: GLYPH, height: GLYPH }} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[s.spark, sparkStyle]}>
          <Svg width={SPARK} height={SPARK} viewBox="0 0 28 28">
            <Path fill="#F6E3B8" d="M14 0c.9 7.4 6.6 13.1 14 14-7.4.9-13.1 6.6-14 14-.9-7.4-6.6-13.1-14-14C7.4 13.1 13.1 7.4 14 0Z" />
          </Svg>
        </Animated.View>
      </View>
      <Animated.View style={{ marginTop: 22, width: WORD_W, height: WORD_H, opacity: v.wOp, transform: [{ translateY: v.wY }] }}>
        <Image source={require('../../assets/images/splash-wordmark.webp')} contentFit="contain" tintColor={wordmarkTint ?? undefined} accessible={false} style={{ width: '100%', height: '100%' }} />
      </Animated.View>
      <Animated.Text style={[s.sub, { color: subtitleColor, fontFamily, opacity: v.subOp, transform: [{ translateY: v.subY }] }]}>
        by Professor Lingman
      </Animated.Text>
    </Animated.View>
  );
}

export const SplashCoin = memo(SplashCoinImpl);

const s = StyleSheet.create({
  // монета 120 по центру знака 176: left/top = (176 − 120) / 2
  coinSlot: { position: 'absolute', left: (GLYPH - COIN) / 2, top: (GLYPH - COIN) / 2, width: COIN, height: COIN },
  // искра макета: left 246 / top 304 при знаке left 107 / top 294 → сдвиг (139, 10) внутри знака
  spark: { position: 'absolute', left: 139, top: 10, width: SPARK, height: SPARK },
  sub: { marginTop: 10, fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: 0.2 },
});
