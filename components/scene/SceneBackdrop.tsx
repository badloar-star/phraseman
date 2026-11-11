// ═══════════════════════════════════════════════════════════════════════════
// SceneBackdrop.tsx — общий слой фона «Сцены»: рисует утверждённый вид (тёмное «Глубокое небо», светлое «А») по результату scenePalette.
//
// зачем (вердикт владельца 29.10: «Тёмная тема везде — глубокое небо, светлая — тон темы ярче и глубже, это всех экранов касается»; координатор: «все экраны берут
// цвета только из scenePalette»): один компонент вместо отдельных градиентов на каждом экране. Всё рисуется ОДНИМ Svg в координатах эталонной канвы (viewBox =
// размер палитры в px), поэтому звёзды, виньетка и свет масштабируются вместе с областью сцены, а палитра (в том числе 70 звёзд) считается один раз в кэше модуля.
// Порядок слоёв — как у эталона: небо → солнце → дымка → звёзды → виньетка → страж; светлое: градиент → свет 1 → свет 2 → затемнение низа.
// Касаний не ловит, заполняет родителя (absoluteFill).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { isRassvetPalette, isSkyPalette, RASSVET_ANGLE_DEG, RASSVET_MID_AT, SCENE_SKY_TONE_MIX, type ScenePaletteResult } from './scene_palette';
import SceneStarTwinkle, { SCENE_TWINKLE_EVERY } from './SceneStarTwinkle';
import { groupStarsByAlpha } from './scene_star_paths';

type Props = Readonly<{ palette: ScenePaletteResult; idPrefix: string; active?: boolean }>;

const rgb = (c: ReadonlyArray<number>): string => `rgb(${Math.round(c[0]!)},${Math.round(c[1]!)},${Math.round(c[2]!)})`;
/**
 * зачем (слово владельца 29.10: «на тёмной теме убери затемнение нижней части сцены», «вся сцена в тёмной теме как звёздное небо»): чёрный градиент стража у низа тёмного неба не рисуется.
 * ВНИМАНИЕ: белый текст в нижней зоне без него хуже (замер: ≈3,0:1 вместо 5,0:1) — решение о возврате/замене за владельцем по макету.
 */
export const SCENE_DARK_BOTTOM_GUARD = false;
/** Виньетка (тёмные края, в том числе снизу) не рисуется: низ сцены не темнее середины ни в каком виде. */
export const SCENE_VIGNETTE = false;
/** Солнечный свет сверху не рисуется: владелец одобрил макет (v8) «ровный тон + лёгкий перелив + звёзды» без солнца (29.10). */
export const SCENE_SKY_SUN = false;
/** Полоса дымки у горизонта не рисуется: весь фон — один тон. */
export const SCENE_HAZE_BAND = false;
/** Звёзды нижней части тёмного неба (статичные, в Svg): детерминированный сид, доли сцены; верхние 40 % уже заняты звёздами палитры. */
const LOWER_STARS: ReadonlyArray<{ x: number; y: number; r: number; a: number }> = (() => {
  let st = 0x9e3779b9;
  const rnd = (): number => { st ^= st << 13; st >>>= 0; st ^= st >>> 17; st ^= st << 5; st >>>= 0; return st / 4294967296; };
  const out: Array<{ x: number; y: number; r: number; a: number }> = [];
  for (let i = 0; i < 102; i += 1) out.push({ x: rnd(), y: 0.4 + rnd() * 0.58, r: 0.9 + rnd() * 0.9, a: 0.3 + rnd() * 0.35 });
  return out;
})();
const ALL_STARS = (top: ReadonlyArray<{ x: number; y: number; r: number; a: number }>): ReadonlyArray<{ x: number; y: number; r: number; a: number }> => [...top, ...LOWER_STARS];
const GUARD_TOP_H = 110; // px эталонной канвы: затемнение верха стража

function SceneBackdrop({ palette, idPrefix, active = true }: Props) {
  const { W, H } = palette.size;
  const id = (n: string): string => `${idPrefix}${n}`;
  // зачем (координатор 04.11, дамп Главной: Circle 312 из 1 334 View): статичные звёзды — ≤5 Path по ступеням прозрачности вместо ~150 Circle; считается один раз на палитру
  const starGroups = useMemo(() => (isSkyPalette(palette) ? groupStarsByAlpha(ALL_STARS(palette.stars.list), palette.size.W, palette.size.H, SCENE_TWINKLE_EVERY) : []), [palette]);
  if (isSkyPalette(palette)) {
    const p = palette;
    const stops = p.gradient.stops;
    // зачем (слово владельца 29.10: «горизонт глубже», без полосы/затемнения снизу): низ неба темнее в самих цветах остановок — без чёрного градиента сверху
    // ИТОГ (слово владельца 29.10: «вся сцена без затемнения внизу, эти 20 % убрать немедленно»): низ неба того же тона, что и середина — остановки ниже горизонта равны тону между серединой и горизонтом
    // ещё жёстче (слово владельца 29.10: «ВСЯ СЦЕНА ВОТ ТАКОГО ЦВЕТА ЦЕЛИКОМ», сине-серый тон верха): все остановки неба — один тон T между серединой и горизонтом своей темы; вертикального потемнения нет совсем
    const tone = p.raw.mid.map((v, i) => v + (p.raw.hor[i]! - v) * SCENE_SKY_TONE_MIX);
    const raw = [tone, tone, tone, tone, tone, tone];
    const aBottom = Math.min(0.7, p.guard.aBottom + 0.04);
    const aTop = Math.min(0.7, p.guard.aTop + 0.04);
    const sunColor = rgb(p.raw.lightC);
    const hazeColor = rgb(p.raw.haze);
    return (
      <>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id('Sky')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
            {stops.map((s, i) => <Stop key={i} offset={s.at} stopColor={rgb(raw[i]!)} stopOpacity="1" />)}
          </LinearGradient>
          <RadialGradient id={id('Sun')} gradientUnits="userSpaceOnUse" cx={p.sun.cx * W} cy={p.sun.cy * H} rx={p.sun.rx * W} ry={p.sun.ry * H} fx={p.sun.cx * W} fy={p.sun.cy * H}>
            <Stop offset="0" stopColor={sunColor} stopOpacity={p.sun.a} />
            <Stop offset="1" stopColor={sunColor} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={id('Diag')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2={H * 0.7}>
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.07" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
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
        {SCENE_SKY_SUN ? <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('Sun')})`} /> : null}
        {SCENE_HAZE_BAND ? <Rect x="0" y={H * p.haze.y0} width={W} height={H * (p.haze.y1 - p.haze.y0)} fill={`url(#${id('Haze')})`} /> : null}
        {/* лёгкий диагональный перелив (светлее слева сверху), только осветляет */}
        <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('Diag')})`} />
        {p.warmEdge ? <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('Warm')})`} /> : null}
        <G>
          {/* зачем (владелец 29.10): каждая 5-я звезда мерцает отдельным слоем SceneStarTwinkle (UI-тред), остальные статичны здесь */}
          {starGroups.map((g) => <Path key={g.a} d={g.d} fill="#FFFFFF" fillOpacity={g.a} />)}
        </G>
        {SCENE_VIGNETTE ? <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('Vig')})`} /> : null}
        {SCENE_DARK_BOTTOM_GUARD && p.guard.aBottom > 0 ? <Rect x="0" y={H * 0.42} width={W} height={H * 0.58} fill={`url(#${id('GuardB')})`} /> : null}
        {p.guard.aTop > 0 ? <Rect x="0" y="0" width={W} height={GUARD_TOP_H} fill={`url(#${id('GuardT')})`} /> : null}
      </Svg>
      <SceneStarTwinkle stars={ALL_STARS(p.stars.list)} active={active} />
      </>
    );
  }
  if (isRassvetPalette(palette)) {
    // зачем (владелец 11.11, макет «1 в 1»): сцена «Рассвет» — градиент 168° в три тона и тёплый свет снизу справа; линия градиента считается как у CSS (через центр области)
    const r = palette;
    const rad = (RASSVET_ANGLE_DEG * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const half = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
    const sun = r.lights[0]!;
    return (
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id('Dawn')} gradientUnits="userSpaceOnUse" x1={W / 2 - dx * half} y1={H / 2 - dy * half} x2={W / 2 + dx * half} y2={H / 2 + dy * half}>
            <Stop offset="0" stopColor={r.gradient.top.hex} stopOpacity="1" />
            <Stop offset={RASSVET_MID_AT} stopColor={r.gradient.mid.hex} stopOpacity="1" />
            <Stop offset="1" stopColor={r.gradient.bottom.hex} stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id={id('DawnSun')} gradientUnits="userSpaceOnUse" cx={sun.cx * W} cy={sun.cy * H} rx={sun.rx * W} ry={sun.ry * H} fx={sun.cx * W} fy={sun.cy * H}>
            <Stop offset="0" stopColor={sun.color.hex} stopOpacity={r.spec.lights[0]!.a} />
            <Stop offset={sun.fade} stopColor={sun.color.hex} stopOpacity="0" />
            <Stop offset="1" stopColor={sun.color.hex} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('Dawn')})`} />
        <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('DawnSun')})`} />
      </Svg>
    );
  }
  const p = palette;
  const g = p.spec;
  const x1 = g.start[0] * W;
  const y1 = g.start[1] * H;
  const x2 = g.end[0] * W;
  const y2 = g.end[1] * H;
  // зачем (слово владельца 29.10): светлая сцена без затемнения низа — scrim не рисуется, градиент уходит в тон середины на половине пути и дальше не темнеет
  const midTone = g.top.map((v, i) => (v + g.bot[i]!) / 2);
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id('Base')} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          <Stop offset="0" stopColor={rgb(g.top)} stopOpacity="1" />
          <Stop offset="0.5" stopColor={rgb(midTone)} stopOpacity="1" />
          <Stop offset="1" stopColor={rgb(midTone)} stopOpacity="1" />
        </LinearGradient>
        {g.lights.map((l, i) => (
          <RadialGradient key={i} id={id(`Light${i}`)} gradientUnits="userSpaceOnUse" cx={l.cx * W} cy={l.cy * H} rx={l.rx * W} ry={l.ry * H} fx={l.cx * W} fy={l.cy * H}>
            <Stop offset="0" stopColor={rgb(l.color)} stopOpacity={l.a} />
            <Stop offset={l.fade} stopColor={rgb(l.color)} stopOpacity="0" />
            <Stop offset="1" stopColor={rgb(l.color)} stopOpacity="0" />
          </RadialGradient>
        ))}
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill={`url(#${id('Base')})`} />
      {g.lights.map((l, i) => <Rect key={i} x="0" y="0" width={W} height={H} fill={`url(#${id(`Light${i}`)})`} />)}
    </Svg>
  );
}

export default memo(SceneBackdrop);
