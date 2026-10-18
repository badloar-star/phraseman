// ═══════════════════════════════════════════════════════════════════════════
// SpireTowerSvg.tsx — башня из 15 этажей на react-native-svg (порт towerSvg() макета spire.html).
//
// зачем (⚡): башня статична — никаких покадровых setState и бесконечных анимаций.
// Каждый этаж — отдельный memo-компонент, который перерисовывается только когда
// меняется его состояние (мой / пройден / впереди / выбран) или наряд лиги. Размытие макета
// (feGaussianBlur) заменено радиальными градиентами — дешевле и одинаково на iOS/Android.
//
// зачем (владелец 13.10: одна башня Оникса в 12 «нарядах»): проп skin (modules/spire/tower_skins.ts) задаёт материал лиги —
// цвет камня, зеркальный блик, текстуру (один Pattern), металл ободков, навершие и вымпел. Без пропа — Оникс прежнего вида.
// Образец — docs/design/v2-app/spire-leagues.html. Правило перформанса: наряд добавляет ≤55 узлов, на кладке нет фильтров.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import Svg, {
  Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Mask, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText,
} from 'react-native-svg';
import type { Lang } from '../../constants/i18n';
import { SPIRE_DEFAULT_SKIN, mixHex, type SpireTowerSkin } from '../../modules/spire/tower_skins';
import { spireText } from './spire_strings';
import SpireTowerFinial, { spireFinialTopY } from './SpireTowerFinial';
import { spireWeekTopViewBox } from './spire_tower_bounds';
import type { SpireScene } from './useSpireScene';
import { SPIRE_TEX_ID, skinTextureDefs } from './SpireTowerTextures';
import { TOWER_ART } from '../../constants/spireTowerArtPalette';
import {
  SPIRE_CX, SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW, spireFloorState, spireIsGuard, spireIsSummit,
  type SpireFloorGeom,
} from './spire_tower_model';

type WindowTone = 'lit' | 'past' | 'dark';

function windowPath(x: number, y: number, w: number, h: number): string {
  return `M${x.toFixed(1)} ${(y + w / 2).toFixed(1)}a${(w / 2).toFixed(1)} ${(w / 2).toFixed(1)} 0 0 1 ${w.toFixed(1)} 0V${y + h}H${x.toFixed(1)}Z`;
}

/** Ряды кладки со швами, сгущающимися к краям цилиндра (stones() макета). */
function stonesPath(fl: SpireFloorGeom): Readonly<{ seams: string; light: string }> {
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

const FloorWindows = memo(function FloorWindows({ fl, tone, skin }: { fl: SpireFloorGeom; tone: WindowTone; skin: SpireTowerSkin }) {
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

type FloorProps = Readonly<{
  fl: SpireFloorGeom;
  tone: WindowTone;
  skin: SpireTowerSkin;
  mine: boolean;
  selected: boolean;
  label: string;
  onSelect: (floor: number) => void;
  /** Мини-башня «Итога недели»: без номера этажа, подписи, рамки выбора и зоны нажатия (их всё равно не видно в кадре). */
  bare?: boolean;
  /** Цвета сцены из темы (номер этажа, подписи). Нет пропа = прежние серые литералы ночной сцены. */
  scene?: SpireScene;
}>;

const Floor = memo(function Floor({ fl, tone, skin, mine, selected, label, onSelect, bare = false, scene }: FloorProps) {
  const { f, y, h, w, x0 } = fl;
  const guard = spireIsGuard(f);
  const stones = useMemo(() => stonesPath(fl), [fl]);
  const clipId = `spireCl${f}`;
  return (
    <G onPress={() => onSelect(f)}>
      <ClipPath id={clipId}><Rect x={x0} y={y} width={w} height={h} /></ClipPath>
      {mine ? <Ellipse cx={SPIRE_CX} cy={y + h / 2} rx={w / 2 + 70} ry={h} fill="url(#spireLitFloor)" /> : null}
      <Rect x={x0} y={y} width={w} height={h} fill={guard ? 'url(#spireCylG)' : 'url(#spireCyl)'} />
      {skin.premium ? <Rect x={x0} y={y} width={w} height={h} fill={`url(#${SPIRE_TEX_ID})`} /> : null}
      <Path d={stones.seams} stroke={`rgba(0,0,0,${skin.seam})`} strokeWidth={1.1} fill="none" clipPath={`url(#${clipId})`} />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      <Path d={stones.light} stroke={`rgba(255,255,255,${skin.seamLight})`} strokeWidth={1} fill="none" clipPath={`url(#${clipId})`} />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      {skin.premium ? <Rect x={x0} y={y} width={w} height={h} fill="url(#spireGloss)" /> : null}
      <Rect x={x0} y={y} width={w} height={h} fill="url(#spireUnder)" />
      <FloorWindows fl={fl} tone={tone} skin={skin} />
      {guard ? null : (
        <>
          <Rect x={x0 - 5} y={y - 3} width={w + 10} height={7} rx={3} fill="url(#spireCylCorn)" />
          <Rect x={x0 - 5} y={y - 3} width={w + 10} height={1.4} rx={0.7} fill={TOWER_ART.white28} />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
        </>
      )}
      {bare ? null : <SvgText x={14} y={y + h / 2 + (label ? 0 : 5)} fontSize={14} fontWeight={mine ? '700' : '600'} fill={scene ? (mine ? scene.numMine : scene.num) : mine ? TOWER_ART.white : TOWER_ART.c8E8E92} textAnchor="middle">{String(f)}</SvgText>}{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      {label && !bare ? <SvgText x={20} y={y + h / 2 + 14} fontSize={7.5} fontWeight="700" letterSpacing={0.5} fill={scene ? scene.num : TOWER_ART.c8E8E92} textAnchor="middle">{label}</SvgText> : null}
      {selected ? <Rect x={x0 - 9} y={y - (guard ? 20 : 6)} width={w + 18} height={h + (guard ? 23 : 9)} rx={5} fill="none" stroke={scene && scene.light ? scene.numMine : TOWER_ART.white80} strokeOpacity={scene && scene.light ? 0.85 : 1} strokeWidth={1.4} /> : null}{/* theme-exempt: рамка выбранного этажа; зачем (Макеты 13.10, кадры spirecheck-001/002): на светлой плите белая рамка не видна — берём цвет текста темы, как у номеров этажей; в тёмной без изменений */}
      {bare ? null : <Rect x={0} y={y - 4} width={SPIRE_TW} height={h + 4} fill="transparent" />}
    </G>
  );
});

/** Ободки карнизов из металла лиги — ОДИН path на все обычные этажи (cornRims образца). Только rim: 'full'. */
const CornRims = memo(function CornRims() {
  const d = useMemo(() => SPIRE_TOWER_GEOM.floors
    .filter((fl) => !spireIsGuard(fl.f))
    .map((fl) => `M${fl.x0 - 5} ${fl.y + 2.4}h${fl.w + 10}v1.4h${-(fl.w + 10)}z`)
    .join(''), []);
  return <Path d={d} fill="url(#spireMetal)" />;
});

/** Зубцы и машикули Стража (parapet() макета). */
const Parapet = memo(function Parapet({ fl, skin }: { fl: SpireFloorGeom; skin: SpireTowerSkin }) {
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

type CrownProps = Readonly<{ skin: SpireTowerSkin; summit: boolean }>;

const Crown = memo(function Crown({ skin, summit }: CrownProps) {
  const t = SPIRE_TOWER_GEOM.floors[SPIRE_FLOOR_COUNT - 1];
  const dw = t.w - 22;
  const dx = SPIRE_CX - dw / 2;
  const yd = t.y - 34;
  const apex = yd - 168;
  const rw = dw + 26;
  const premium = skin.premium;
  const big = premium && summit; // вершина недели: свечение ×2.6, навершие ×1.25
  let shingles = '';
  for (let yy = yd - 10; yy > apex + 10; yy -= 11) {
    const k = (yd - yy) / (yd - apex);
    const hw = (rw / 2) * (1 - k);
    shingles += `M${(SPIRE_CX - hw).toFixed(1)} ${yy}Q${SPIRE_CX} ${(yy + 4 * (1 - k)).toFixed(1)} ${(SPIRE_CX + hw).toFixed(1)} ${yy}`;
  }
  const conePts = `${SPIRE_CX - rw / 2},${yd} ${SPIRE_CX + rw / 2},${yd} ${SPIRE_CX},${apex}`;
  const ring = <Rect x={SPIRE_CX - rw / 2} y={yd - 4} width={rw} height={8} rx={4} fill={skin.rim === 'none' ? 'url(#spireCylCorn)' : 'url(#spireMetal)'} />;
  const poleTop = apex - (skin.pennant ? 34 : 12);
  // зачем (приёмка Макетов 13.10, SK1: стержень от навершия до крыши во всех 12 лигах): как в образце — между навершием и острием пусто,
  // острие кровли тонкое и острое; древко флага начинается у верха навершия и идёт только вверх (нет флага — нет древка).
  const poleBase = spireFinialTopY(skin.finial, apex - 16, big) + 1;
  return (
    <G>
      <Rect x={dx} y={yd} width={dw} height={34} fill="url(#spireCyl)" />
      {premium ? <Rect x={dx} y={yd} width={dw} height={34} fill="url(#spireGloss)" /> : null}
      {premium ? [-0.5, 0, 0.5].map((a) => {
        const ww = 9 * Math.cos(a);
        const x = SPIRE_CX + (dw / 2) * Math.sin(a) - ww / 2;
        return <Path key={`dw${a}`} d={windowPath(x, yd + 9, ww, 15)} fill={big ? skin.lit : skin.winDark} />;
      }) : ring}
      <Polygon points={conePts} fill="url(#spireCone)" />
      {premium ? <Polygon points={conePts} fill={`url(#${SPIRE_TEX_ID})`} /> : null}
      <Path d={shingles} stroke={TOWER_ART.black38} strokeWidth={1.1} fill="none" />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      {premium ? <Polygon points={conePts} fill="url(#spireGloss)" /> : null}
      {premium ? ring : null}
      <Circle cx={SPIRE_CX} cy={apex - 14} r={big ? skin.glowR * 2.6 : skin.glowR} fill="url(#spireGlow)" />
      {premium ? (
        <>
          {skin.pennant && poleBase > poleTop ? <Line x1={SPIRE_CX} y1={poleBase} x2={SPIRE_CX} y2={poleTop} stroke="url(#spireMetal)" strokeWidth={2} /> : null}
          {skin.pennant ? (
            <>
              <Path d={`M${SPIRE_CX + 1} ${poleTop}h18l-5 5.5 5 5.5h-18z`} fill={skin.pennant} />
              <Path d={`M${SPIRE_CX + 1} ${poleTop}h18l-5 5.5h-13z`} fill={TOWER_ART.white20} />
            </>
          ) : null}
          <SpireTowerFinial skin={skin} cx={SPIRE_CX} cy={apex - 16} big={big} />
        </>
      ) : (
        <>
          <Rect x={SPIRE_CX - 1} y={apex - 12} width={2} height={16} fill={TOWER_ART.cD6D6D8} />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
          <Circle cx={SPIRE_CX} cy={apex - 16} r={5.5} fill={TOWER_ART.white} />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
        </>
      )}
    </G>
  );
});

const STARS: readonly (readonly [number, number])[] = [[40, 30], [96, 70], [150, 22], [238, 54], [300, 18], [352, 76], [70, 128], [330, 140], [20, 190], [372, 210], [120, 180]];

/** Градиенты наряда: цилиндр, карнизы, конус, небо, земля, свет; у премиальных ещё блик, металл, шар опала и жар осколка. */
function skinDefs(skin: SpireTowerSkin, scene?: SpireScene): React.ReactNode {
  const s = skin.spec;
  const O6 = ['0', '0.16', '0.36', '0.55', '0.8', '1'] as const;
  const O4 = ['0', '0.35', '0.6', '1'] as const;
  return (
    <>
      <LinearGradient id="spireCyl" x1="0" x2="1" y1="0" y2="0">{O6.map((o, i) => <Stop key={o} offset={o} stopColor={skin.cyl[i]} />)}</LinearGradient>
      <LinearGradient id="spireCylG" x1="0" x2="1" y1="0" y2="0">{O6.map((o, i) => <Stop key={o} offset={o} stopColor={skin.cylG[i]} />)}</LinearGradient>
      <LinearGradient id="spireCylCorn" x1="0" x2="1" y1="0" y2="0">{O4.map((o, i) => <Stop key={o} offset={o} stopColor={skin.corn[i]} />)}</LinearGradient>
      <LinearGradient id="spireCone" x1="0" x2="1" y1="0" y2="0">{O4.map((o, i) => <Stop key={o} offset={o} stopColor={skin.cone[i]} />)}</LinearGradient>
      <LinearGradient id="spireUnder" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={TOWER_ART.black} stopOpacity={skin.underTop} /><Stop offset="0.3" stopColor={TOWER_ART.black} stopOpacity={0} /><Stop offset="1" stopColor={TOWER_ART.black} stopOpacity={0.12} /></LinearGradient>
      <RadialGradient id="spireGlow" cx="0.5" cy="0.5" rx="0.5" ry="0.5"><Stop offset="0" stopColor={skin.glow} stopOpacity={0.5} /><Stop offset="0.45" stopColor={skin.glow} stopOpacity={0.1} /><Stop offset="1" stopColor={skin.glow} stopOpacity={0} /></RadialGradient>
      <RadialGradient id="spireLitFloor" cx="0.5" cy="0.5" rx="0.5" ry="0.5"><Stop offset="0" stopColor={skin.glow} stopOpacity={0.16} /><Stop offset="1" stopColor={skin.glow} stopOpacity={0} /></RadialGradient>
      <LinearGradient id="spireSky" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={skin.sky[0]} /><Stop offset="0.5" stopColor={skin.sky[1]} /><Stop offset="1" stopColor={skin.sky[2]} /></LinearGradient>
      <RadialGradient id="spireGround" cx="0.5" cy="0.2" rx="0.5" ry="0.5"><Stop offset="0" stopColor={skin.ground[0]} /><Stop offset="1" stopColor={skin.ground[1]} stopOpacity={0} /></RadialGradient>
      <RadialGradient id="spireCloud" cx="0.5" cy="0.5" rx="0.5" ry="0.5"><Stop offset="0" stopColor={scene ? scene.tone : TOWER_ART.white} stopOpacity={scene ? (scene.light ? 0.07 : 0.09) : 0.09} /><Stop offset="1" stopColor={scene ? scene.tone : TOWER_ART.white} stopOpacity={0} /></RadialGradient>
      {scene ? <RadialGradient id="spireGroundTheme" cx="0.5" cy="0.2" rx="0.5" ry="0.5"><Stop offset="0" stopColor={scene.tone} stopOpacity={scene.light ? 0.1 : 0.14} /><Stop offset="1" stopColor={scene.tone} stopOpacity={0} /></RadialGradient> : null}
      {skin.premium ? (
        <>
          {/* зачем: «премиальный» отлив без фильтров — узкий зеркальный блик (сила spec), мягкая вторая полоса и подсветка края цветом лиги (gloss образца) */}
          <LinearGradient id="spireGloss" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor={TOWER_ART.black} stopOpacity={0.45} />
            <Stop offset="0.1" stopColor={TOWER_ART.black} stopOpacity={0.12} />
            <Stop offset="0.2" stopColor={TOWER_ART.white} stopOpacity={0} />
            <Stop offset="0.27" stopColor={TOWER_ART.white} stopOpacity={Math.round(s * 12) / 100} />
            <Stop offset="0.31" stopColor={TOWER_ART.white} stopOpacity={Math.round(s * 48) / 100} />
            <Stop offset="0.35" stopColor={TOWER_ART.white} stopOpacity={Math.round(s * 10) / 100} />
            <Stop offset="0.44" stopColor={TOWER_ART.white} stopOpacity={0} />
            <Stop offset="0.62" stopColor={TOWER_ART.black} stopOpacity={0} />
            <Stop offset="0.84" stopColor={TOWER_ART.black} stopOpacity={0.2} />
            <Stop offset="0.93" stopColor={skin.edge} stopOpacity={0} />
            <Stop offset="0.955" stopColor={skin.edge} stopOpacity={Math.round((0.12 + s * 0.12) * 100) / 100} />
            <Stop offset="0.975" stopColor={skin.edge} stopOpacity={0} />
            <Stop offset="1" stopColor={TOWER_ART.black} stopOpacity={0.5} />
          </LinearGradient>
          <LinearGradient id="spireMetal" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor={mixHex(skin.metal, TOWER_ART.black, 0.45)} />
            <Stop offset="0.3" stopColor={mixHex(skin.metal, TOWER_ART.whiteLower, 0.45)} />
            <Stop offset="0.55" stopColor={skin.metal} />
            <Stop offset="1" stopColor={mixHex(skin.metal, TOWER_ART.black, 0.55)} />
          </LinearGradient>
          {skin.finial === 'orb' ? (
            <RadialGradient id="spireOrb" cx="0.35" cy="0.35" r="0.7">
              <Stop offset="0" stopColor={TOWER_ART.white} /><Stop offset="0.35" stopColor={TOWER_ART.cBFEFE0} /><Stop offset="0.6" stopColor={TOWER_ART.cF6C8E0} /><Stop offset="0.85" stopColor={TOWER_ART.c9FC0F2} /><Stop offset="1" stopColor={TOWER_ART.c7A7090} />
            </RadialGradient>
          ) : null}
          {skin.finial === 'shard' ? (
            <RadialGradient id="spireEmber" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
              <Stop offset="0" stopColor={TOWER_ART.cFFB070} stopOpacity={0.8} /><Stop offset="0.4" stopColor={TOWER_ART.cE0503A} stopOpacity={0.3} /><Stop offset="1" stopColor={TOWER_ART.cE0503A} stopOpacity={0} />
            </RadialGradient>
          ) : null}
          {skinTextureDefs(skin.tex)}
        </>
      ) : null}
    </>
  );
}

type Props = Readonly<{
  lang: Lang;
  /** null = локальной недели нет: ни одно окно не светится. */
  myFloor: number | null;
  selected: number;
  onSelect: (floor: number) => void;
  width: number;
  /** Наряд лиги (modules/spire/tower_skins.ts). Нет пропа = Оникс прежнего вида. */
  skin?: SpireTowerSkin;
  /**
   * 'weekTop' — верхушка башни для карточки «Итог недели» (макет spire-leagues.html, раздел «Итог недели»): навершие, конус, барабан, Страж-15 и этаж 14,
   * viewBox узкий (x CX−96…+192, y top−236…top+106), без неба, облаков, земли и маркера, края — мягкая радиальная маска. Высота = width·342/192.
   * Состояние окон — по myFloor: 15 («вершина недели», окна горят, свечение ×2.6) или 1 (окна тёмные).
   */
  variant?: 'tower' | 'weekTop';
  /** зачем (владелец 13.10, светлая тема: «окно башни — по ТЕМЕ, а не по башне»): цвета сцены (небо, звёзды, облака, подписи, земля, тень) из токенов темы. Нет пропа = ночное небо наряда лиги (старый вид). */
  scene?: SpireScene;
  /**
   * Высота видимой части башни в единицах SVG (тур: верх башни без хвоста вниз). Верх НЕ режется никогда: viewBox всегда начинается с 0 (запас над ореолом
   * входит в TOP_PAD); обрезается только низ — зачем (закон владельца 14.10): «пик башни не обрезается ничем, свет тоже».
   */
  cropHeight?: number;
  /** Башня-иллюстрация в окне момента: подписи мельче 10 px не рисуются (на экране Пика цифры этажей — кнопки, там флага нет). */
  illustration?: boolean;
}>;

function SpireTowerSvg({ lang, myFloor, selected, onSelect, width, skin = SPIRE_DEFAULT_SKIN, variant = 'tower', scene, cropHeight, illustration = false }: Props) {
  const geom = SPIRE_TOWER_GEOM;
  const scale = width / SPIRE_TW;
  // зачем (Макеты 18.10, promo_open/floor_open: «шкала этажей и НАД ОБЛАКАМИ микроскопические»): в окнах моментов башня ≤ 196 из 390 —
  // цифры 14 становились ~7 px, подпись облаков ~5 px. Мельче 10 px подписи не рисуем: башня — иллюстрация, этаж видно по окнам.
  const textTooSmall = illustration && scale * 14 < 10;
  const guardLabel = useMemo(() => spireText(lang, 'guard').toUpperCase(), [lang]);
  const summitLabel = useMemo(() => spireText(lang, 'summit').toUpperCase(), [lang]);
  const cloudsLabel = useMemo(() => spireText(lang, 'aboveClouds').toUpperCase(), [lang]);
  const defs = useMemo(() => skinDefs(skin, scene), [skin, scene]);
  const b = geom.floors[0];
  const skyY = geom.top - 250;
  const summit = myFloor === SPIRE_FLOOR_COUNT;
  const visibleH = cropHeight !== undefined ? Math.min(geom.height, cropHeight) : geom.height;
  if (variant === 'weekTop') {
    // зачем (закон владельца 14.10, скрин «ИТОГ НЕДЕЛИ»): viewBox считается из границы башни (острие, навершие, древко, ореол ×2.6) — всё внутри с полем;
    // маска гасит только низ (срез этажей): верх и бока — в абсолютных координатах viewBox, а не радиальным овалом (он гасил острие и свет).
    const vb = spireWeekTopViewBox(skin, summit);
    const topFloors = geom.floors.slice(SPIRE_FLOOR_COUNT - 2); // этаж 14 и Страж-15
    return (
      <Svg width={width} height={(width * vb.h) / vb.w} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
        <Defs>
          {defs}
          <LinearGradient id="spireWeekFadeG" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={TOWER_ART.white} /><Stop offset="0.8" stopColor={TOWER_ART.white} /><Stop offset="1" stopColor={TOWER_ART.black} />
          </LinearGradient>
          <Mask id="spireWeekFade" x={vb.x} y={vb.y} width={vb.w} height={vb.h} maskUnits="userSpaceOnUse">
            <Rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#spireWeekFadeG)" />
          </Mask>
        </Defs>
        <G mask="url(#spireWeekFade)">
          {topFloors.map((fl) => {
            const state = spireFloorState(fl.f, myFloor);
            const tone: WindowTone = state === 'mine' ? 'lit' : state === 'passed' ? 'past' : 'dark';
            return <Floor key={fl.f} fl={fl} tone={tone} skin={skin} mine={state === 'mine'} selected={false} label="" onSelect={onSelect} bare />;
          })}
          {skin.rim === 'full' ? <CornRims /> : null}
          <Crown skin={skin} summit={summit} />
        </G>
      </Svg>
    );
  }
  return (
    <Svg width={width} height={visibleH * scale} viewBox={`0 0 ${SPIRE_TW} ${visibleH}`}>
      <Defs>{defs}</Defs>
      {/* зачем (владелец 13.10): со сценой темы небо не рисуем — окно остаётся плитой темы (SpireTower.window), башня стоит на ней */}
      {scene ? null : <Rect width={SPIRE_TW} height={geom.height} fill="url(#spireSky)" />}
      {scene ? null : <Ellipse cx={SPIRE_CX} cy={geom.top - 120} rx={200} ry={260} fill={TOWER_ART.white03} />}{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      {(scene ? scene.star !== null : true) ? STARS.map(([x, yy], i) => <Circle key={`s${i}`} cx={x} cy={skyY - 40 + yy} r={i % 3 ? 0.8 : 1.2} fill={scene && scene.star ? scene.star : `rgba(255,255,255,${i % 2 ? 0.35 : 0.55})`} opacity={scene ? (i % 2 ? 0.35 : 0.55) : 1} />) : null}{/* theme-exempt: звёзды на ночном небе сцены (spireSky всегда тёмное) */}
      <Ellipse cx={60} cy={geom.top - 150} rx={130} ry={28} fill="url(#spireCloud)" />
      <Ellipse cx={330} cy={geom.top - 170} rx={140} ry={30} fill="url(#spireCloud)" />
      <Ellipse cx={80} cy={geom.top - 96} rx={110} ry={22} fill="url(#spireCloud)" />
      <Ellipse cx={320} cy={geom.top - 90} rx={120} ry={22} fill="url(#spireCloud)" />
      {textTooSmall ? null : <SvgText x={SPIRE_CX} y={geom.top - 272} fontSize={11} fontWeight="700" letterSpacing={3} fill={scene ? scene.cloudsLabel : TOWER_ART.c5E5E62} textAnchor="middle">{cloudsLabel}</SvgText>}{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      <Ellipse cx={SPIRE_CX} cy={geom.base + 44} rx={210} ry={40} fill={scene ? 'url(#spireGroundTheme)' : 'url(#spireGround)'} />
      <Ellipse cx={SPIRE_CX} cy={geom.base + 30} rx={b.w / 2 + 64} ry={12} fill={scene ? scene.shadow : TOWER_ART.black55} />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      <Rect x={b.x0 - 30} y={geom.base + 16} width={b.w + 60} height={14} rx={3} fill="url(#spireCylCorn)" opacity={0.7} />
      <Rect x={b.x0 - 16} y={geom.base + 2} width={b.w + 32} height={16} rx={3} fill="url(#spireCylCorn)" />
      {skin.premium ? <Rect x={b.x0 - 16} y={geom.base + 2} width={b.w + 32} height={1.5} fill={TOWER_ART.white25} /> : null}{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      {skin.rim !== 'none' ? <Rect x={b.x0 - 16} y={geom.base + 15} width={b.w + 32} height={1.6} fill="url(#spireMetal)" /> : null}
      {geom.floors.map((fl) => {
        const state = spireFloorState(fl.f, myFloor);
        const tone: WindowTone = state === 'mine' ? 'lit' : state === 'passed' ? 'past' : 'dark';
        const label = spireIsSummit(fl.f) ? summitLabel : spireIsGuard(fl.f) ? guardLabel : '';
        return <Floor key={fl.f} fl={fl} tone={tone} skin={skin} mine={state === 'mine'} selected={fl.f === selected} label={label} onSelect={onSelect} scene={scene} bare={textTooSmall} />;
      })}
      {skin.rim === 'full' ? <CornRims /> : null}
      {geom.floors.filter((fl) => spireIsGuard(fl.f) && !spireIsSummit(fl.f)).map((fl) => <Parapet key={`p${fl.f}`} fl={fl} skin={skin} />)}
      <Crown skin={skin} summit={summit} />
    </Svg>
  );
}

export default memo(SpireTowerSvg);
