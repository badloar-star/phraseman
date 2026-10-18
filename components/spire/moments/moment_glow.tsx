// ═══════════════════════════════════════════════════════════════════════════
// moment_glow.tsx — мягкое свечение за героем момента: эталонный `.glowspot` (engagement-moments.css:205 + engagement-moments-app.css:114).
//
// зачем (координатор 18.10, Сверка: «пятно меньше и ярче, с ярким центром; в эталоне — широкое тусклое свечение»): прежний градиент
// обрывался на 65 % РАДИУСА круга (104 px) с центром полной альфы акцента темы. Эталон иначе:
//  • `radial-gradient(circle, …)` без размера = farthest-corner: радиус градиента — до угла квадрата 320 (≈226 px), ноль на 65 % → ≈147 px;
//  • центр — `--acc-soft` эталона: альфа 0,24 в тёмной теме, 0,30 в светлой (мягкий акцент нашей темы бывает плотнее — приводим к эталону);
//  • пульс `emGlow` 0,55 ↔ 1 — вечный цикл запрещён сторожем движения, берём его среднее по времени 0,78 статично;
//  • `filter: blur(10px)` на градиенте, который и так линейно гаснет к 147 px, глазом не меняет края — не повторяем.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import {
  colorAlpha, MOMENT_GLOW_FADE_AT, MOMENT_GLOW_LOG, MOMENT_GLOW_RADIUS, MOMENT_GLOW_SIZE, momentGlowCenterOpacity, momentGlowStop,
} from './moment_glow_math';

type Props = Readonly<{ top: `${number}%`; color: string | undefined; isLight: boolean; scene?: string }>;

/** Эталонный `.glowspot`: центр круга на `top` высоты экрана, по центру по горизонтали; под содержимым, касания не принимает. */
export const MomentGlowSpot = memo(function MomentGlowSpot({ top, color, isLight, scene = '' }: Props) {
  const opacity = color ? momentGlowCenterOpacity(color, isLight) : 0;
  // зачем (d30 «вдвое ярче»): react-native-svg не берёт альфу из stopColor — цвет непрозрачный, вся сила в stopOpacity
  const stop = color ? momentGlowStop(color, isLight) : { stopColor: '', stopOpacity: 0 };
  useEffect(() => {
    // зачем (ранний выход с причиной): без цвета мягкого акцента темы свечение не рисуем — момент показывается без него, а не падает
    if (!color) { console.warn(`${MOMENT_GLOW_LOG} skip ${JSON.stringify({ scene, top, reason: 'no_color', color: String(color) })}`); return; } // guard-ok: строка на пропуск свечения
    console.log(`${MOMENT_GLOW_LOG} ${JSON.stringify({ scene, top, color, own: colorAlpha(color), isLight, opacity: Math.round(opacity * 1000) / 1000, stopColor: stop.stopColor, stopOpacity: Math.round(stop.stopOpacity * 1000) / 1000, size: MOMENT_GLOW_SIZE, fadePx: Math.round(MOMENT_GLOW_SIZE / 100 * MOMENT_GLOW_RADIUS * MOMENT_GLOW_FADE_AT) })}`); // guard-ok: строка на показ свечения
  }, [scene, top, color, isLight, opacity, stop.stopColor, stop.stopOpacity]);
  if (!color) return null;
  return (
    <View pointerEvents="none" accessible={false} style={[s.glow, { top }]}>
      <Svg width={MOMENT_GLOW_SIZE} height={MOMENT_GLOW_SIZE} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="momentGlowSpot" cx="50" cy="50" r={String(MOMENT_GLOW_RADIUS)} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={stop.stopColor} stopOpacity={stop.stopOpacity} />
            <Stop offset={String(MOMENT_GLOW_FADE_AT)} stopColor={stop.stopColor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#momentGlowSpot)" />
      </Svg>
    </View>
  );
});

const s = StyleSheet.create({
  glow: { position: 'absolute', left: '50%', width: MOMENT_GLOW_SIZE, height: MOMENT_GLOW_SIZE, marginLeft: -MOMENT_GLOW_SIZE / 2, marginTop: -MOMENT_GLOW_SIZE / 2 },
});
