// ═══════════════════════════════════════════════════════════════════════════
// SpireTowerParts.tsx — части башни Пика, вынесенные из SpireTowerSvg.tsx как есть: окна этажа, ряды кладки, ободки карнизов, парапет Стража.
//
// зачем (координатор 29.10, сторож «каждый файл Пика ≤ 400 строк», spire_tab_gate_source_contract): после spireTowerSvgHeight SpireTowerSvg.tsx перевалил за 400 строк.
// Код перенесён БЕЗ изменений (добавлен только export) — рисунок и поведение башни байт в байт те же; этажи, корона и сборка Svg остаются в SpireTowerSvg.tsx.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { G, Path, Rect } from 'react-native-svg';
import { mixHex, type SpireTowerSkin } from '../../modules/spire/tower_skins';
import { TOWER_ART } from '../../constants/spireTowerArtPalette';
import { SPIRE_CX, SPIRE_TOWER_GEOM, spireIsGuard, type SpireFloorGeom } from './spire_tower_model';

export type WindowTone = 'lit' | 'past' | 'dark';

export function windowPath(x: number, y: number, w: number, h: number): string {
  return `M${x.toFixed(1)} ${(y + w / 2).toFixed(1)}a${(w / 2).toFixed(1)} ${(w / 2).toFixed(1)} 0 0 1 ${w.toFixed(1)} 0V${y + h}H${x.toFixed(1)}Z`;
}

/** Ряды кладки со швами, сгущающимися к краям цилиндра (stones() макета). */
export function stonesPath(fl: SpireFloorGeom): Readonly<{ seams: string; light: string }> {
  const { y, h, w, x0 } = fl;
  const r = w / 2;
  let seams = '';
  let light = '';
  let row = 0;
  for (let yy = y + 11; yy < y + h; yy += 11, row += 1) {
    seams += `M${x0} ${yy}Q${SPIRE_CX} ${yy + 4} ${x0 + w} ${yy}`;
    light += `M${x0} ${yy + 1.2}Q${SPIRE_CX} ${yy + 5.2} ${x0 + w} ${yy + 1.2}`;
    for (let t = -1.35 + (row % 2) * 0.14; t < 1.4; t += 0.28) {
      const x = SPIRE_CX + r * Math.sin(t);
      seams += `M${x.toFixed(1)} ${(yy - 11 + 1.5 * Math.cos(t)).toFixed(1)}V${(yy + 3 * Math.cos(t)).toFixed(1)}`;
    }
  }
  return { seams, light };
}

export const FloorWindows = memo(function FloorWindows({ fl, tone, skin }: { fl: SpireFloorGeom; tone: WindowTone; skin: SpireTowerSkin }) {
  const { f, y, w } = fl;
  const r = w / 2;
  const guard = spireIsGuard(f);
  const angles = f >= 12 ? [-0.55, 0.55] : [-0.72, 0, 0.72];
  const fill = tone === 'lit' ? skin.lit : tone === 'past' ? skin.winPast : skin.winDark;
  return (
    <>
      {angles.map((t) => {
        const big = guard && t === 0;
        const ww = (big ? 16 : 12) * Math.cos(t);
        const wh = big ? 30 : 20;
        const x = SPIRE_CX + r * Math.sin(t) - ww / 2;
        const yy = y + (guard ? 22 : 12) - (big ? 6 : 0);
        const d = windowPath(x, yy, ww, wh);
        return (
          <G key={t}>
            {tone === 'lit' ? <Path d={d} fill={skin.lit} fillOpacity={0.3} stroke={skin.lit} strokeOpacity={0.25} strokeWidth={6} strokeLinejoin="round" /> : null}{/* theme-exempt: свечение окна на ночной сцене башни — небо (spireSky) всегда тёмное, в светлом оформлении сцена не светлеет */}
            <Path d={d} fill={fill} />
            <Rect x={x - 2} y={yy + wh} width={ww + 4} height={2.6} rx={1} fill={skin.winSill} />
          </G>
        );
      })}
    </>
  );
});

/** Ободки карнизов из металла лиги — ОДИН path на все обычные этажи (cornRims образца). Только rim: 'full'. */
export const CornRims = memo(function CornRims() {
  const d = useMemo(() => SPIRE_TOWER_GEOM.floors
    .filter((fl) => !spireIsGuard(fl.f))
    .map((fl) => `M${fl.x0 - 5} ${fl.y + 2.4}h${fl.w + 10}v1.4h${-(fl.w + 10)}z`)
    .join(''), []);
  return <Path d={d} fill="url(#spireMetal)" />;
});

/** Зубцы и машикули Стража (parapet() макета). */
export const Parapet = memo(function Parapet({ fl, skin }: { fl: SpireFloorGeom; skin: SpireTowerSkin }) {
  const { y, w, x0 } = fl;
  const r = w / 2 + 7;
  const merlons: React.ReactNode[] = [];
  let caps = '';
  for (let t = -1.32; t <= 1.33; t += 0.3) {
    const mw = 11 * Math.cos(t);
    const x = SPIRE_CX + r * Math.sin(t) - mw / 2;
    const shade = 0.62 - 0.38 * Math.sin(t + 0.45);
    merlons.push(<Rect key={`m${t.toFixed(2)}`} x={x} y={y - 17} width={mw} height={14} rx={1.2} fill={mixHex(skin.merlonLo, skin.merlonHi, shade)} />);
    caps += `M${x.toFixed(1)} ${y - 17}h${mw.toFixed(1)}v1.8h${(-mw).toFixed(1)}z`;
  }
  let brackets = '';
  for (let t = -1.25; t <= 1.26; t += 0.25) {
    const cw = 6 * Math.cos(t);
    const x = SPIRE_CX + (w / 2 + 3) * Math.sin(t) - cw / 2;
    brackets += `M${x.toFixed(1)} ${y + 6}h${cw.toFixed(1)}l-1 7h${(-cw + 2).toFixed(1)}Z`;
  }
  return (
    <G>
      <Rect x={x0 - 7} y={y - 4} width={w + 14} height={10} rx={2} fill="url(#spireCylCorn)" />
      {merlons}
      {skin.rim === 'full' ? <Path d={caps} fill="url(#spireMetal)" /> : null}
      <Path d={brackets} fill={TOWER_ART.black45} />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
    </G>
  );
});
