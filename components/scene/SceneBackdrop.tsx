// ═══════════════════════════════════════════════════════════════════════════
// SceneBackdrop.tsx — общий слой фона «Сцены»: рисует утверждённый вид (тёмное «Глубокое небо», светлое «А») по результату scenePalette.
//
// зачем (вердикт владельца 29.10: «Тёмная тема везде — глубокое небо, светлая — тон темы ярче и глубже, это всех экранов касается»; координатор: «все экраны берут
// цвета только из scenePalette»): один компонент вместо отдельных градиентов на каждом экране. Всё рисуется ОДНИМ Svg в координатах эталонной канвы (viewBox =
// размер палитры в px), поэтому звёзды, виньетка и свет масштабируются вместе с областью сцены, а палитра (в том числе 70 звёзд) считается один раз в кэше модуля.
// Порядок слоёв — как у эталона: небо → солнце → дымка → звёзды → виньетка → страж; светлое: градиент → свет 1 → свет 2 → затемнение низа.
// Касаний не ловит, заполняет родителя (absoluteFill).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { isSkyPalette, type ScenePaletteResult } from './scene_palette';

type Props = Readonly<{ palette: ScenePaletteResult; idPrefix: string }>;

const rgb = (c: ReadonlyArray<number>): string => `rgb(${Math.round(c[0]!)},${Math.round(c[1]!)},${Math.round(c[2]!)})`;
const GUARD_TOP_H = 110; // px эталонной канвы: затемнение верха стража

function SceneBackdrop({ palette, idPrefix }: Props) {
  const { W, H } = palette.size;
  const id = (n: string): string => `${idPrefix}${n}`;
  if (isSkyPalette(palette)) {
    const p = palette;
    const stops = p.gradient.stops;
    const raw = [p.raw.zen, p.raw.mid, p.raw.hor, p.raw.hor, p.raw.gnd, p.raw.bottom];
    const aBottom = Math.min(0.7, p.guard.aBottom + 0.04);
    const aTop = Math.min(0.7, p.guard.aTop + 0.04);
    const sunColor = rgb(p.raw.lightC);
    const hazeColor = rgb(p.raw.haze);
    return (
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id('Sky')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
            {stops.map((s, i) => <Stop key={i} offset={s.at} stopColor={rgb(raw[i]!)} stopOpacity="1" />)}
          </LinearGradient>
          <RadialGradient id={id('Sun')} gradientUnits="userSpaceOnUse" cx={p.sun.cx * W} cy={p.sun.cy * H} rx={p.sun.rx * W} ry={p.sun.ry * H} fx={p.sun.cx * W} fy={p.sun.cy * H}>
            <Stop offset="0" stopColor={sunColor} stopOpacity={p.sun.a} />
            <Stop offset="1" stopColor={sunColor} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={id('Haze')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={hazeColor} stopOpacity={p.haze.a[0]} />
            <Stop offset="0.5" stopColor={hazeColor} stopOpacity={p.haze.a[1]} />
            <Stop offset="1" stopColor={hazeColor} stopOpacity={p.haze.a[2]} />
          </LinearGradient>
          <RadialGradient id={id('Vig')} gradientUnits="userSpaceOnUse" cx={W / 2} cy={H / 2} rx={W * p.vignette.scale} ry={H * p.vignette.scale} fx={W / 2} fy={H / 2}>
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset={p.vignette.inner} stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity={p.vignette.a} />
          </RadialGradient>
          {p.warmEdge ? (
            <RadialGradient id={id('Warm')} gradientUnits="userSpaceOnUse" cx={p.warmEdge.cx * W} cy={p.warmEdge.cy * H} rx={p.warmEdge.rx * W} ry={p.warmEdge.ry * H} fx={p.warmEdge.cx * W} fy={p.warmEdge.cy * H}>
              <Stop offset="0" stopColor={rgb(p.warmEdge.color)} stopOpacity={p.warmEdge.a} />
              <Stop offset={p.warmEdge.fade} stopColor={rgb(p.warmEdge.color)} stopOpacity="0" />
              <Stop offset="1" stopColor={rgb(p.warmEdge.color)} stopOpacity="0" />
            </RadialGradient>
          ) : null}
          <LinearGradient id={id('GuardB')} gradientUnits="userSpaceOnUse" x1="0" y1={H * 0.42} x2="0" y2={H * 0.62}>
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity={aBottom} />
          </LinearGradient>
          <LinearGradient id={id('GuardT')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={GUARD_TOP_H}>
            <Stop offset="0" stopColor="#000000" stopOpacity={aTop} />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('Sky')})`} />
        <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('Sun')})`} />
        <Rect x="0" y={H * p.haze.y0} width={W} height={H * (p.haze.y1 - p.haze.y0)} fill={`url(#${id('Haze')})`} />
        {p.warmEdge ? <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('Warm')})`} /> : null}
        <G>
          {p.stars.list.map((s, i) => <Circle key={i} cx={s.x * W} cy={s.y * H} r={s.r} fill="#FFFFFF" fillOpacity={s.a} />)}
        </G>
        <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('Vig')})`} />
        {p.guard.aBottom > 0 ? <Rect x="0" y={H * 0.42} width={W} height={H * 0.58} fill={`url(#${id('GuardB')})`} /> : null}
        {p.guard.aTop > 0 ? <Rect x="0" y="0" width={W} height={GUARD_TOP_H} fill={`url(#${id('GuardT')})`} /> : null}
      </Svg>
    );
  }
  const p = palette;
  const g = p.spec;
  const x1 = g.start[0] * W;
  const y1 = g.start[1] * H;
  const x2 = g.end[0] * W;
  const y2 = g.end[1] * H;
  const scrim = g.scrim;
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id('Base')} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          <Stop offset="0" stopColor={rgb(g.top)} stopOpacity="1" />
          <Stop offset="1" stopColor={rgb(g.bot)} stopOpacity="1" />
        </LinearGradient>
        {g.lights.map((l, i) => (
          <RadialGradient key={i} id={id(`Light${i}`)} gradientUnits="userSpaceOnUse" cx={l.cx * W} cy={l.cy * H} rx={l.rx * W} ry={l.ry * H} fx={l.cx * W} fy={l.cy * H}>
            <Stop offset="0" stopColor={rgb(l.color)} stopOpacity={l.a} />
            <Stop offset={l.fade} stopColor={rgb(l.color)} stopOpacity="0" />
            <Stop offset="1" stopColor={rgb(l.color)} stopOpacity="0" />
          </RadialGradient>
        ))}
        {scrim ? (
          <LinearGradient id={id('Scrim')} gradientUnits="userSpaceOnUse" x1="0" y1={H - scrim.h} x2="0" y2={H}>
            <Stop offset="0" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity={scrim.a} />
          </LinearGradient>
        ) : null}
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('Base')})`} />
      {g.lights.map((l, i) => <Rect key={i} x="0" y="0" width={W} height={H} fill={`url(#${id(`Light${i}`)})`} />)}
      {scrim ? <Rect x="0" y={H - scrim.h} width={W} height={scrim.h} fill={`url(#${id('Scrim')})`} /> : null}
    </Svg>
  );
}

export default memo(SceneBackdrop);
