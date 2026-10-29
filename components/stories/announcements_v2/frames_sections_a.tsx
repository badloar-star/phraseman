// ═══════════════════════════════════════════════════════════════════════════
// frames_sections_a.tsx — кадры 12–16 макета stories-announcements-v1.html (v2.1), группа «Разделы» (первая половина): Новые уроки,
// Диалоги, Карточки, Пик, Дуэли.
//
// зачем (владелец 28.10: «точно так же, как на макете»; гейт сравнивает снимок приложения со снимком макета в конечном состоянии): разметка,
// размеры, задержки и кривые — из render() TPL и CSS макета построчно
// (lessons: .par 300 × 280 по центру, арт 250 пружиной с 100, пятно accentGlow 250, параллакс stParB/stParF 9 с туда-обратно, метка 500,
// заголовок 560, блок 1000; dialogs: .g4 две колонки 152 с зазором 12, плитки 122 радиус 22, stTileIn пружиной 640 с 200/360/520/680,
// stFloat 5 с с −1200·i, метка 900, заголовок 960; cards: .fly 240 × 180 perspective 900, карточки 200 × 130 stFlyIn 900 с 200/380/560,
// переворот верхней 900 с 2600, метка 900, заголовок 960, блок 1300; peak: плоскость темы left 12 × 190 въезжает −115 % → 0 за 800 с 100,
// башня tower(1, 5, 150, 'dark') раскрывается снизу 1500 с 200, колонка 160, текст справа (поле 10, узкий заголовок), метка 1100,
// заголовок 1160, блок 1500; duels: половины .vsbg (текст·9 % / accent·26 %, радиус 28) съезжаются 700 с 100, монеты 92 сталкиваются
// 900 с 500, VS 40/44 падает со scale 3 за 700 с 1200, метка 1500, заголовок 1560, блок 1900).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import { spireSkinForTier } from '../../../modules/spire/tower_skins';
import SpireRankCoin from '../../spire/SpireRankCoin';
import SpireTowerSvg from '../../spire/SpireTowerSvg';
import { SPIRE_TOWER_GEOM, SPIRE_TW } from '../../spire/spire_tower_model';
import { SPIRE_SCENE_TOWER } from '../../spire/useSpireScene';
import { resolveThemedArt } from '../../theme/themed_art_registry';
import { frameMs, phase, useStoryFrameClock } from '../templates/story_frame_clock';
import { splitAlpha } from '../templates/story_template_layout';
import { Enter } from '../templates/story_template_motion';
import { TowerReveal } from '../templates/story_template_parts';
import { mix } from '../templates/story_template_palette';
import { AnnRoot, EASE_OUT, EASE_SPRING, Keyframed, Loop, type Key } from './announcement_v2_motion';
import { useAnnPalette } from './announcement_v2_palette';
import { Plane } from './announcement_v2_parts';
import { Clouds } from './announcement_v2_particles';
import { announcementArt, type AnnouncementV2Design } from './announcement_v2_registry';
import { annText } from './announcement_v2_strings';
import { AnnBadge, AnnBlocks, AnnTitle, type AnnFrameProps } from './announcement_v2_text';

const LOG = '[STORY-ANN2]';

type Box = Readonly<{ w: number; h: number }> | null;
/** Размер блока после раскладки (полуширина фона дуэлей, высота плоскости Пика); тот же размер — без лишней перерисовки. */
function useBox(): readonly [Box, (e: LayoutChangeEvent) => void] {
  const [box, setBox] = useState<Box>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  }, []);
  return [box, onLayout];
}

// ── арт приложения (.v2art макета): 3D-значок assets/v2art по оформлению темы ──────────────────────────────────────

/** Значок кадра size × size: выбранный в редакторе или арт макета. drop-shadow макета (0 18 30 shTint·55 %) не переносится — только размер. */
const AnnArt = memo(function AnnArt({ design, chosen, size }: Readonly<{ design: AnnouncementV2Design; chosen: unknown; size: number }>) {
  const pal = useAnnPalette();
  const name = announcementArt(design, chosen);
  const brightness = pal.isLight ? 'light' : 'dark';
  const source = useMemo(() => (name ? resolveThemedArt(name, brightness).base : null), [name, brightness]);
  const box = useMemo(() => ({ width: size, height: size }), [size]);
  useEffect(() => {
    // зачем (правило владельца: ранний выход — с причиной в логе): картинки нет — место арта остаётся пустым, геометрия кадра та же
    if (!source) DebugLogger.info(LOG, `арт кадра ${design}: ${name ?? 'не задан'} (${brightness}) — источника нет, место ${size} пустое`);
  }, [brightness, design, name, size, source]);
  return <View style={box}>{source ? <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} accessible={false} /> : null}</View>;
});

// ── 12 · Новые уроки — крупный арт с параллаксом: свет и книга плывут в разные стороны ─────────────────────────────

/**
 * stParB / stParF макета: from → to за 9 с ease-in-out, туда-обратно (infinite alternate): .lay.back (−14, 6) → (14, −6), .lay.front
 * (8, −4) → (−8, 4). Покой цикла («Уменьшить движение») — слой без сдвига, как .lay макета без анимации (transform: none).
 */
const PAR_BACK: readonly Key[] = [{ at: 0, x: -14, y: 6 }, { at: 1, x: 14, y: -6 }];
const PAR_FRONT: readonly Key[] = [{ at: 0, x: 8, y: -4 }, { at: 1, x: -8, y: 4 }];
const PAR_PERIOD = 9000;

/** .par .blob: круг 250, radial-gradient(circle, accentGlow, transparent 68 %); у circle длина луча — до дальнего угла (125·√2). */
const BLOB = 250;
const GlowBlob = memo(function GlowBlob() {
  const pal = useAnnPalette();
  const glow = useMemo(() => splitAlpha(pal.accGlow), [pal.accGlow]);
  return (
    <Svg width={BLOB} height={BLOB} viewBox={`0 0 ${BLOB} ${BLOB}`}>
      <Defs>
        <RadialGradient id="annLessonsBlob" cx={BLOB / 2} cy={BLOB / 2} r={(BLOB / 2) * Math.SQRT2} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={glow.solid} stopOpacity={glow.alpha} />
          <Stop offset="0.68" stopColor={glow.solid} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={BLOB / 2} cy={BLOB / 2} r={BLOB / 2} fill="url(#annLessonsBlob)" />
    </Svg>
  );
});

export const LessonsFrame = memo(function LessonsFrame({ content }: AnnFrameProps) {
  return (
    <AnnRoot testID="story-ann-lessons" left>
      {/* зачем: .par стоит по центру и в левой колонке (align-self: center макета); пятно лежит внутри .par под артом — как в разметке макета */}
      <View style={f.par}>
        <Loop keys={PAR_BACK} periodMs={PAR_PERIOD} alternate style={f.lay}><GlowBlob /></Loop>
        <Loop keys={PAR_FRONT} periodMs={PAR_PERIOD} alternate style={f.lay}>
          <Enter kind="pop" d={100}><AnnArt design={content.design} chosen={content.art} size={250} /></Enter>
        </Loop>
      </View>
      <AnnBadge text={content.badge} d={500} align="left" />
      <AnnTitle text={content.title} d0={560} align="left" />
      <AnnBlocks blocks={content.blocks} d0={1000} align="left" max={1} />
    </AnnRoot>
  );
});

// ── 13 · Диалоги — сетка 2 × 2: плитки влетают с поворотом по одной, потом плавают вразнобой ─────────────────────────

/** stTileIn: scale .7 rotate −6° прозрачно → на место (640 мс, пружина .34,1.56,.64,1). */
const TILE_IN: readonly Key[] = [{ at: 0, scale: 0.7, rot: -6, opacity: 0 }, { at: 1, scale: 1, rot: 0, opacity: 1 }];
/** stFloat: 0 → −6 → 0 (ease-in-out на каждом отрезке). */
const FLOAT: readonly Key[] = [{ at: 0, y: 0 }, { at: 0.5, y: -6 }, { at: 1, y: 0 }];
// зачем: перевод под подсказками — пример render() макета (ru = [...]); поля перевода в контракте нет, поэтому строки живут в
// announcement_v2_strings на 9 языках (правило владельца: тексты интерфейса — через Переводчика), а не константами на русском.
const DIALOG_HINT_KEYS = ['dialogsHint1', 'dialogsHint2', 'dialogsHint3'] as const;
/** Перевод под подсказкой; совпадает с самой фразой (английский интерфейс) — не рисуем (Переводчик 29.10: дубль под фразой). */
function dialogHint(lang: Lang, i: number, phrase: string): string | null {
  const hint = annText(lang, DIALOG_HINT_KEYS[i] ?? 'dialogsHint1');
  return hint.trim().toLowerCase() === phrase.trim().toLowerCase() ? null : hint;
}

export const DialogsFrame = memo(function DialogsFrame({ content, lang }: AnnFrameProps) {
  const pal = useAnnPalette();
  const tile = useMemo(() => [f.gt, { backgroundColor: mix(pal.tx, 0.1) }], [pal.tx]);
  return (
    <AnnRoot testID="story-ann-dialogs">
      <View style={f.g4}>
        <Loop keys={FLOAT} periodMs={5000} style={f.tw}>
          <Keyframed keys={TILE_IN} d={200} dur={640} ease={EASE_SPRING} style={f.gtArt}>
            <AnnArt design={content.design} chosen={content.art} size={96} />
          </Keyframed>
        </Loop>
        {content.blocks.slice(0, 3).map((b, i) => (
          <Loop key={`${i}-${b.text}`} keys={FLOAT} periodMs={5000} d={-(i + 1) * 1200} style={f.tw}>
            <Keyframed keys={TILE_IN} d={360 + i * 160} dur={640} ease={EASE_SPRING} style={tile}>
              {/* зачем: плитка фиксированной высоты 122 — длинная подсказка владельца не вылезает за плитку (у примера макета 2 строки) */}
              <Text style={[f.gtT, { color: pal.tx }]} numberOfLines={3}>{b.text}</Text>
              {dialogHint(lang, i, b.text) !== null ? <Text style={[f.gtRu, { color: pal.sec }]}>{dialogHint(lang, i, b.text)}</Text> : null}
            </Keyframed>
          </Loop>
        ))}
      </View>
      <AnnBadge text={content.badge} d={900} />
      <AnnTitle text={content.title} d0={960} />
    </AnnRoot>
  );
});

// ── 14 · Карточки — стопка влетает из угла в 3D, верхняя переворачивается переводом ───────────────────────────────────

type FlyCard = Readonly<{ ty: number; rz: number; d: number; keys: readonly Key[] }>;
/** stFlyIn: из translate(220, 260) rotateY(60°) rotateZ(20°) прозрачной — в translate(0, ty) rotateZ(rz); --ty / --rz / --d трёх .fc макета. */
const FLY: readonly FlyCard[] = [{ ty: 26, rz: -6, d: 200 }, { ty: 13, rz: 3, d: 380 }, { ty: 0, rz: 0, d: 560 }].map((c) => ({
  ...c,
  keys: [{ at: 0, x: 220, y: 260, rotY: 60, rot: 20, opacity: 0 }, { at: 1, x: 0, y: c.ty, rotY: 0, rot: c.rz, opacity: 1 }],
}));
// зачем: слово на гранях — пример render() макета (.face .en / .face.back .en); полей для них в контракте нет. Английское слово общее
// для всех языков, его значение — на 9 языках в announcement_v2_strings (cardsSampleMeaning), а не русской константой.
const CARD_WORD = 'quit';
/** .flipw: rotateY 0 → 180° за 900 мс ease-out после 2600. */
const FLIP_D = 2600;
const FLIP_DUR = 900;

/** Две грани верхней карточки: каждая поворачивается сама (без preserve-3d), обратную прячет backfaceVisibility, на 90° — смена прозрачности. */
const FlipFaces = memo(function FlipFaces({ lang }: Readonly<{ lang: Lang }>) {
  const pal = useAnnPalette();
  const { progress, durationMs, final } = useStoryFrameClock();
  const front = useAnimatedStyle(() => {
    const a = 180 * EASE_OUT(phase(frameMs(progress.value, durationMs, final), FLIP_D, FLIP_DUR));
    return { opacity: a < 90 ? 1 : 0, transform: [{ perspective: 900 }, { rotateY: `${a}deg` }] };
  });
  const back = useAnimatedStyle(() => {
    const a = 180 * EASE_OUT(phase(frameMs(progress.value, durationMs, final), FLIP_D, FLIP_DUR));
    return { opacity: a < 90 ? 0 : 1, transform: [{ perspective: 900 }, { rotateY: `${a - 180}deg` }] };
  });
  return (
    <>
      <Animated.View style={[f.face, { backgroundColor: pal.card }, front]}>
        <Text style={[f.faceWord, { color: pal.tx }]}>{CARD_WORD}</Text>
        <Text style={[f.faceNote, { color: pal.sec }]}>{annText(lang, 'cardsTapToFlip')}</Text>
      </Animated.View>
      <Animated.View style={[f.face, { backgroundColor: pal.accG }, back]}>
        <Text style={[f.faceWord, { color: pal.accInk }]}>{annText(lang, 'cardsSampleMeaning')}</Text>
        <Text style={[f.faceNote, f.faceNoteBack, { color: pal.accInk }]}>{CARD_WORD}</Text>
      </Animated.View>
    </>
  );
});

export const CardsFrame = memo(function CardsFrame({ content, lang }: AnnFrameProps) {
  const pal = useAnnPalette();
  const card = useMemo(() => [f.fc, { backgroundColor: pal.card, boxShadow: `0 18px 40px -16px ${mix(pal.shTint, 0.7)}` }], [pal.card, pal.shTint]);
  return (
    <AnnRoot testID="story-ann-cards">
      <View style={f.art}>
        <View style={f.fly} accessible accessibilityLabel={`${CARD_WORD} — ${annText(lang, 'cardsSampleMeaning')}`}>
          {FLY.map((c, i) => (
            <Keyframed key={c.d} keys={c.keys} d={c.d} dur={900} ease={EASE_OUT} perspective={900} style={card}>
              {i === FLY.length - 1 ? <FlipFaces lang={lang} /> : null}
            </Keyframed>
          ))}
        </View>
      </View>
      <AnnBadge text={content.badge} d={900} />
      <AnnTitle text={content.title} d0={960} />
      <AnnBlocks blocks={content.blocks} d0={1300} max={1} />
    </AnnRoot>
  );
});

// ── 15 · Пик — сплит: плоскость темы с башней слева, текст справа, облака плывут ─────────────────────────────────────

/** spire-tower-render.js макета держит над верхним этажом запас 300; в приложении запас больше (SPIRE_TOWER_GEOM.top = 376 — ореол лиг). */
const MOCK_TOWER_TOP = 300;
const MOCK_TOWER_H = SPIRE_TOWER_GEOM.height - SPIRE_TOWER_GEOM.top + MOCK_TOWER_TOP;
/** tower(ph, 1, 5, 150, 'dark') макета: ширина min(150, ⌊380·390 / H⌋) = 131, высота окна round(H·w / 390) = 379. */
const TOWER_W = Math.min(150, Math.floor((380 * SPIRE_TW) / MOCK_TOWER_H));
const TOWER_H = Math.round((MOCK_TOWER_H * TOWER_W) / SPIRE_TW);
/** зачем: лишний запас приложения сверху (76 ед. × масштаб ≈ 25,5 dp) уходит за верх окна — этажи и подножие стоят там же, где в макете. */
const TOWER_SHIFT = ((SPIRE_TOWER_GEOM.top - MOCK_TOWER_TOP) * TOWER_W) / SPIRE_TW;
/** Наряд лиги 1 и свой этаж 5 — пример макета (tower(ph, 1, 5, …)). */
const PEAK_SKIN = spireSkinForTier(1);
const PEAK_FLOOR = 5;
const noopSelect = (): void => undefined;

/** .bg.hplane: ширина 190, left 12, сверху донизу; translateX −115 % → 0 (800 мс ease-out после 100). */
const HPLANE_W = 190;
const HPLANE_IN: readonly Key[] = [{ at: 0, x: -1.15 * HPLANE_W }, { at: 1, x: 0 }];

/** Плоскость темы (градиент 180°, радиус 32, тень оттенка темы) — высота кадра известна после раскладки. */
const HPlane = memo(function HPlane() {
  const [box, onBox] = useBox();
  return (
    <View style={f.hplane} onLayout={onBox}>
      {box ? (
        <Keyframed keys={HPLANE_IN} d={100} dur={800} ease={EASE_OUT}>
          <Plane width={HPLANE_W} height={box.h} radius={32} angle={180} />
        </Keyframed>
      ) : null}
    </View>
  );
});

export const PeakFrame = memo(function PeakFrame({ content, lang }: AnnFrameProps) {
  // зачем: облака (.fx) идут в разметке макета раньше плоскости (.bg) с тем же z-index 0 — плоскость их закрывает; слой `layer` корня рисуется
  // поверх подложек, поэтому облака лежат в `back` первыми. Сцена башни — всегда тёмная (tower(…, 'dark') макета = SPIRE_SCENE_TOWER).
  return (
    <AnnRoot testID="story-ann-peak" back={<><Clouds id="annPeakCloud" /><HPlane /></>}>
      <View style={f.split}>
        <View style={f.colL} pointerEvents="none">
          <TowerReveal width={TOWER_W} height={TOWER_H}>
            <View style={f.towerShift}>
              <SpireTowerSvg lang={lang} myFloor={PEAK_FLOOR} selected={PEAK_FLOOR} onSelect={noopSelect} width={TOWER_W} skin={PEAK_SKIN} scene={SPIRE_SCENE_TOWER} />
            </View>
          </TowerReveal>
        </View>
        <View style={f.colR}>
          <AnnBadge text={content.badge} d={1100} align="left" />
          <AnnTitle text={content.title} d0={1160} align="left" narrow />
          <AnnBlocks blocks={content.blocks} d0={1500} align="left" max={1} />
        </View>
      </View>
    </AnnRoot>
  );
});

// ── 16 · Дуэли — половины экрана съезжаются, монеты сталкиваются с отскоком, VS падает с размаха ───────────────────────

/** stClashL / stClashR: 0 % ∓170 прозрачно, 70 % ±8 видно, 85 % ∓4, 100 % на месте (ease-out на каждом отрезке). */
const CLASH_L: readonly Key[] = [{ at: 0, x: -170, opacity: 0 }, { at: 0.7, x: 8, opacity: 1 }, { at: 0.85, x: -4 }, { at: 1, x: 0 }];
const CLASH_R: readonly Key[] = [{ at: 0, x: 170, opacity: 0 }, { at: 0.7, x: -8, opacity: 1 }, { at: 0.85, x: 4 }, { at: 1, x: 0 }];
/** stVs: scale 3 прозрачно → на место. */
const VS_IN: readonly Key[] = [{ at: 0, scale: 3, opacity: 0 }, { at: 1, scale: 1, opacity: 1 }];
/** Монеты примера макета: coin(5, 92) слева (своя, пока ранг неизвестен) и coin(8, 92) справа (соперник). */
const MY_RANK_FALLBACK = 5;
const RIVAL_RANK = 8;

/** .bg.vsbg: на весь кадр, радиус 28; половины текст·9 % и accent·26 % въезжают с боков (∓100 % → 0, 700 мс после 100). */
const VsBack = memo(function VsBack() {
  const pal = useAnnPalette();
  const [box, onBox] = useBox();
  const half = box ? box.w / 2 : 0;
  const fromL = useMemo<readonly Key[]>(() => [{ at: 0, x: -half }, { at: 1, x: 0 }], [half]);
  const fromR = useMemo<readonly Key[]>(() => [{ at: 0, x: half }, { at: 1, x: 0 }], [half]);
  return (
    <View style={f.vsbg} onLayout={onBox}>
      {box ? (
        <>
          <Keyframed keys={fromL} d={100} dur={700} ease={EASE_OUT} style={[f.vsHalf, { backgroundColor: mix(pal.tx, 0.09) }]} />
          <Keyframed keys={fromR} d={100} dur={700} ease={EASE_OUT} style={[f.vsHalf, { backgroundColor: mix(pal.accG, 0.26) }]} />
        </>
      ) : null}
    </View>
  );
});

export const DuelsFrame = memo(function DuelsFrame({ content, lang, myRank }: AnnFrameProps) {
  const pal = useAnnPalette();
  return (
    <AnnRoot testID="story-ann-duels" back={<VsBack />}>
      <View style={f.art}>
        <View style={f.vs2}>
          <Keyframed keys={CLASH_L} d={500} dur={900} ease={EASE_OUT}><SpireRankCoin rank={myRank ?? MY_RANK_FALLBACK} size={92} /></Keyframed>
          <Keyframed keys={VS_IN} d={1200} dur={700} ease={EASE_OUT} style={f.vsw}><Text style={[f.vsT, { color: pal.tx }]}>{annText(lang, 'vs')}</Text></Keyframed>
          <Keyframed keys={CLASH_R} d={500} dur={900} ease={EASE_OUT}><SpireRankCoin rank={RIVAL_RANK} size={92} /></Keyframed>
        </View>
      </View>
      <AnnBadge text={content.badge} d={1500} />
      <AnnTitle text={content.title} d0={1560} />
      <AnnBlocks blocks={content.blocks} d0={1900} max={1} />
    </AnnRoot>
  );
});

const f = StyleSheet.create({
  // .par: 300 × 280 по центру колонки; .lay: на весь .par, содержимое по центру
  par: { width: 300, height: 280, alignSelf: 'center' },
  lay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  // .g4: две колонки по 152, зазор 12, 18 снизу; .gt: 122, радиус 22, поля 12, зазор 6, 15/19 700; .ru 12/15 400; плитка арта — без фона и полей
  g4: { flexDirection: 'row', flexWrap: 'wrap', width: 316, gap: 12, marginBottom: 18 },
  tw: { width: 152 },
  gt: { height: 122, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
  gtArt: { height: 122, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  gtT: { fontSize: 15, lineHeight: 19, fontWeight: '700', textAlign: 'center' }, // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1
  gtRu: { fontSize: 12, lineHeight: 15, fontWeight: '400', textAlign: 'center' }, // guard-ok: перевод фразы на плитке (.g4 .gt .ru макета), не подпись под названием // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1
  // .art: по центру, 18 снизу; .fly 240 × 180; .fc: left 20, top 10, 200 × 130, радиус 20
  art: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  fly: { width: 240, height: 180 },
  fc: { position: 'absolute', left: 20, top: 10, width: 200, height: 130, borderRadius: 20 },
  // .face: на всю карточку, радиус 20, по центру, зазор 4; .en 24/28 800; .ru 13/17 (на обороте — цвет accentInk, прозрачность ,8)
  face: { ...StyleSheet.absoluteFillObject, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 4, backfaceVisibility: 'hidden' },
  faceWord: { fontSize: 24, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
  faceNote: { fontSize: 13, lineHeight: 17, textAlign: 'center' }, // guard-ok: подсказка грани карточки (.fly .face .ru макета), не подпись под названием
  faceNoteBack: { opacity: 0.8 }, // guard-ok: оборот карточки (.face.back .ru макета)
  // .split: на всю ширину, по центру, зазор 12; .colL 160 (башня по центру); .colR: остаток, поле слева 10, текст слева
  split: { flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center', gap: 12 },
  colL: { width: 160, alignItems: 'center' },
  colR: { flex: 1, minWidth: 0, alignItems: 'flex-start', paddingLeft: 10 },
  towerShift: { marginTop: -TOWER_SHIFT },
  // .bg.hplane: left 12, сверху донизу, ширина 190
  hplane: { position: 'absolute', left: 12, top: 0, bottom: 0, width: HPLANE_W },
  // .bg.vsbg: на весь кадр, радиус 28, две половины в ряд
  vsbg: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', borderRadius: 28, overflow: 'hidden' },
  vsHalf: { flex: 1 },
  // .vs2: ряд по центру, зазор 12; .vsw: ширина 64, 40/44 800 −1
  vs2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  vsw: { width: 64 },
  vsT: { fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1, textAlign: 'center' },
});
