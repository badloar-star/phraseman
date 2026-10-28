// ═══════════════════════════════════════════════════════════════════════════
// frames_service.tsx — кадры 31–36 макета stories-announcements-v1.html (v2.1): День рождения, Новая тема, Обновление, Техработы,
// Мы прочитали, Совет.
//
// зачем (владелец 28.10: «точно так же, как на макете»): разметка, размеры, задержки и кривые — из render() TPL и CSS макета построчно
// (birthday: шары по краям гаснут в полосе текста, метка 100, диск 230 всплывает 200 и парит 4,2 с, цифра 150 падает пружиной 800 с 500,
// остаток заголовка 900, блоки 1200; theme: плоскость темы раскрывается кругом 0 → 560 в 50 %/34 % за 1300 с 200, образец 900, текст
// цветом accentInk 1300/1360/1700; version: метка 100, номер 84/88 всплывает 150, бенто 2 × 98 (зазор 10, max 320) съезжается слева,
// справа и снизу за 700 с 600 через 160; maintenance: часы 150 переворачиваются за 3,4 с после 1 с, метка 400, заголовок 480, окно 260
// с 900, полоса растёт 2400 с 600, блок 1200; feedback: доска 334 × 262 — плоскость −3° пружиной 800 с 200, три записки 210 слетаются
// веером 800 с 800 через 240, заголовок 1500; tip: лампочка 100, метка 500, заголовок 560, карточка «Как сделать» 1000).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from '../../SafeLinearGradient';
import { liquidGlassGradientTheme } from '../../../constants/liquidGlassGradientThemes';
import { resolveThemedArt } from '../../theme/themed_art_registry';
import { Art } from '../templates/story_template_kit';
import { ThemeSwatch } from '../templates/story_template_layers';
import { Enter } from '../templates/story_template_motion';
import { Grow } from '../templates/story_template_parts';
import { mix } from '../templates/story_template_palette';
import { AnnRoot, CircleReveal, EASE_HOUR, EASE_OUT, EASE_SPRING, Keyframed, Loop, TextZone, type Key } from './announcement_v2_motion';
import { gradientPoints, useAnnPalette } from './announcement_v2_palette';
import { Plane } from './announcement_v2_parts';
import { Balloons, Bulb } from './announcement_v2_particles';
import { announcementArt, announcementCta, announcementTitleSize, type AnnouncementV2Art, type AnnouncementV2Block, type StoryIconName } from './announcement_v2_registry';
import { annText } from './announcement_v2_strings';
import { AnnBadge, AnnBlocks, AnnTitle, t as typo, titleTextStyle, type AnnFrameProps } from './announcement_v2_text';

type Box = Readonly<{ w: number; h: number }> | null;
const useBox = (): readonly [Box, (e: LayoutChangeEvent) => void] => {
  const [box, setBox] = useState<Box>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    setBox((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);
  return [box, onLayout];
};

// ── арт приложения (.sl .v2art: тень по силуэту drop-shadow(0 18px 30px sh-tint·55 %)) ────────────────────────────

function artShadow(color: string): ViewStyle {
  // зачем: тень идёт по альфе картинки, а не прямоугольником: на iOS — тень слоя (style.filter там растеризует слой квадратом, MomentCoin
  // 18.10), на Android — filter dropShadow (Android 12+; ниже тени нет); σ = 30 / 2
  if (Platform.OS === 'ios') return { shadowColor: color, shadowOpacity: 1, shadowRadius: 15, shadowOffset: { width: 0, height: 18 } };
  return { filter: [{ dropShadow: { offsetX: 0, offsetY: 18, standardDeviation: 15, color } }] };
}

const V2Art = memo(function V2Art({ name, size }: Readonly<{ name: AnnouncementV2Art; size: number }>) {
  const pal = useAnnPalette();
  const src = useMemo(() => resolveThemedArt(name, pal.isLight ? 'light' : 'dark').base, [name, pal.isLight]);
  const shadow = useMemo(() => artShadow(mix(pal.shTint, 0.55)), [pal.shTint]);
  // зачем: место под арт держится всегда — геометрия кадра одна и та же, даже если картинки нет
  return (
    <View style={[{ width: size, height: size }, shadow]}>
      {src ? <Image source={src} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} accessible={false} /> : null}
    </View>
  );
});

// ── 31 · День рождения — цифра на диске темы, шары по краям ──────────────────────────────────────────────────────

const FLOAT: readonly Key[] = [{ at: 0, y: 0 }, { at: 0.5, y: -6 }, { at: 1, y: 0 }];
const BOUNCE_IN: readonly Key[] = [{ at: 0, y: -80, scale: 0.6, opacity: 0 }, { at: 1, y: 0, scale: 1, opacity: 1 }];
/** Число лет в начале заголовка (регулярка render() макета): «3 года» → «3» на диске и «года» заголовком. */
const YEARS = /^(\d+)\s*(.*)$/;

/** .bdisc 230 (градиент темы 150°, тень 0 30 60 −24 sh-tint·70 %) всплывает пружиной с 200 и парит; .bnum падает с отскоком 800 с 500. */
const BirthdayDisc = memo(function BirthdayDisc({ num }: Readonly<{ num: string }>) {
  const pal = useAnnPalette();
  const pts = useMemo(() => gradientPoints(150, 230, 230), []);
  return (
    <Art>
      <Enter kind="pop" d={200}>
        <Loop keys={FLOAT} periodMs={4200} style={[v.bdisc, { boxShadow: `0 30px 60px -24px ${mix(pal.shTint, 0.7)}` }]}>
          {/* зачем: border-radius макета режет только фон диска — цифра на входе может выйти за край, поэтому градиент в своём круге */}
          <View style={v.bdiscFill}>
            <LinearGradient colors={[pal.gradA, pal.gradB]} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
          </View>
          <Keyframed keys={BOUNCE_IN} d={500} dur={800} ease={EASE_SPRING}>
            <Text style={[v.bnum, { color: pal.accInk }]}>{num}</Text>
          </Keyframed>
        </Loop>
      </Enter>
    </Art>
  );
});

export const BirthdayFrame = memo(function BirthdayFrame({ content }: AnnFrameProps) {
  const m = YEARS.exec(content.title);
  const num = m ? m[1]! : '';
  const rest = m ? m[2]! : content.title;
  const badge = content.badge ? <AnnBadge text={content.badge} d={100} /> : null;
  const disc = num ? <BirthdayDisc num={num} /> : null;
  const hasText = rest.length > 0 || content.blocks.length > 0;
  const text = hasText ? (
    <>
      {rest ? <AnnTitle text={rest} d0={900} /> : null}
      <AnnBlocks blocks={content.blocks} d0={1200} max={2} />
    </>
  ) : null;
  // зачем (fitFx макета): полоса текста — от первого до последнего ребёнка кадра, кроме арта; диск попадает в полосу (шары на нём гаснут),
  // только когда стоит между меткой и текстом; без метки диск над полосой и шары проходят за ним
  let body: React.ReactNode;
  if (badge && hasText) body = <TextZone>{badge}{disc}{text}</TextZone>;
  else if (badge) body = <><TextZone>{badge}</TextZone>{disc}</>;
  else body = <>{disc}{text ? <TextZone>{text}</TextZone> : null}</>;
  return <AnnRoot testID="story-ann-birthday" layer={<Balloons />} maskText>{body}</AnnRoot>;
});

// ── 32 · Новая тема — цвет темы раскрывается кругом на весь кадр, образец с орбитами ─────────────────────────────

/** .bg.wipebg: плоскость темы (left/right 12, радиус 32, 135°, без тени) открывается кругом circle(0 → 560 at 50 % 34 %) за 1300 с 200. */
const ThemeWipe = memo(function ThemeWipe({ estW, estH }: Readonly<{ estW: number; estH: number }>) {
  const [box, onBox] = useBox();
  // зачем: центр круга — 34 % высоты кадра, плоскость — на всю высоту: размер берётся замером слоя подложки, до замера — оценка по окну
  const w = box?.w ?? estW;
  const h = box?.h ?? estH;
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onBox}>
      {w > 24 && h > 0 ? (
        <CircleReveal width={w} height={h} cx={0.5} cy={0.34} radius={560} d={200} dur={1300}>
          <Plane width={w - 24} height={h} radius={32} angle={135} shadow={false} style={v.wipePlane} />
        </CircleReveal>
      ) : null}
    </View>
  );
});

const INK_SIZE = { 14: { fontSize: 14, lineHeight: 20 }, 16: { fontSize: 16, lineHeight: 22 }, 20: { fontSize: 20, lineHeight: 27 } } as const; // typo-exempt: кегли .p.b14/b16/b20 макета (владелец 28.10)

/** Блок на плоскости темы (.sl .onink .p / .blk): текст accentInk; плашка .acc и планка .q — как у AnnBlock. */
const InkBlock = memo(function InkBlock({ block, d }: Readonly<{ block: AnnouncementV2Block; d: number }>) {
  const pal = useAnnPalette();
  const size = INK_SIZE[block.size] ?? INK_SIZE[16];
  if (block.style === 'accent') {
    return <Enter d={d} style={[typo.blk, typo.acc, { backgroundColor: mix(pal.tx, 0.1) }]}><Text style={[size, typo.accT, { color: pal.accInk, textAlign: 'center' }]}>{block.text}</Text></Enter>;
  }
  if (block.style === 'quote') {
    return (
      <Enter d={d} style={[typo.blk, typo.q]}>
        <View style={[typo.qBar, { backgroundColor: pal.accG }]} />
        <Text style={[size, typo.qT, { color: pal.accInk }]}>{block.text}</Text>
      </Enter>
    );
  }
  return <Enter d={d} style={typo.pBox}><Text style={[size, { color: pal.accInk, textAlign: 'center' }]}>{block.text}</Text></Enter>;
});

/**
 * .onink макета — обычный блок внутри колонки кадра: ширина по содержимому (заголовок одной строкой, но не шире 334 и колонки), дети — на всю
 * эту ширину до своих max-width и слева. зачем (замер макета в конечном состоянии): у примера .onink 334, блок .p 320 стоит у левого края —
 * его текст на 7 dp левее центра кадра, плашка .acc — во всю ширину 320; распорка ширины строки заголовка даёт ту же ширину в Yoga.
 */
const InkColumn = memo(function InkColumn({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  const pal = useAnnPalette();
  const [line, onLine] = useBox();
  const size = announcementTitleSize(title);
  return (
    <View style={v.ink}>
      <View pointerEvents="none" style={v.inkProbe} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={titleTextStyle(size, pal.accInk, 'left')} onLayout={onLine}>{title}</Text>
      </View>
      {line ? <View style={[v.inkStrut, { width: Math.min(line.w, 334) }]} /> : null}
      {children}
    </View>
  );
});

export const ThemeFrame = memo(function ThemeFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const win = useWindowDimensions();
  // зачем: оценка кадра до замера — просмотр ставит кадр от 120 сверху до 150 снизу с кнопкой (.sl.hascta), без кнопки — до 60
  const estH = win.height - 120 - (announcementCta(content) ? 150 : 60);
  // зачем (правило «цвета — только токены»): образец — сама открытая тема из каталога (как ThemeFrame личных историй); нет в каталоге — акцент текущей
  const def = liquidGlassGradientTheme(content.themeId);
  // зачем (.onink макета): метка, заголовок и блок — цветом accentInk; .8 / .82 из `.onink .ov / .p` в макете перекрывает анимация .a
  // (fill both → opacity 1 в конечном состоянии; замер макета: opacity 1), поэтому прозрачности нет — как на снимке макета
  return (
    <AnnRoot testID="story-ann-theme" back={<ThemeWipe estW={win.width} estH={estH} />}>
      <InkColumn title={content.title}>
        <Art><Enter kind="pop" d={900}><ThemeSwatch colorA={def?.accent ?? pal.accB} colorB={def?.glowA ?? pal.accG} /></Enter></Art>
        <AnnBadge text={content.badge} d={1300} color={pal.accInk} />
        <AnnTitle text={content.title} d0={1360} color={pal.accInk} />
        {content.blocks.slice(0, 1).map((b, i) => <InkBlock key={`${i}-${b.text}`} block={b} d={1700 + i * 160} />)}
      </InkColumn>
    </AnnRoot>
  );
});

// ── 33 · Обновление — номер версии и бенто из трёх плиток ───────────────────────────────────────────────────────

const FROM_L: readonly Key[] = [{ at: 0, x: -48, opacity: 0 }, { at: 1, x: 0, opacity: 1 }];
const FROM_R: readonly Key[] = [{ at: 0, x: 48, opacity: 0 }, { at: 1, x: 0, opacity: 1 }];
const UP: readonly Key[] = [{ at: 0, y: 16, opacity: 0 }, { at: 1, y: 0, opacity: 1 }];
/** Плитка: вход (stFromL / stFromR / stUp) и глиф. зачем: глифы — те, что рисует шрифт Ionicons макета (I.chat = chatbubble, I.school = school);
 * I.trash макета указывает на код 62970 (trending-down-sharp, опечатка таблицы) — здесь trash (62962) по смыслу «Удаление ошибок». */
const TILES: readonly Readonly<{ keys: readonly Key[]; icon: StoryIconName }>[] = [
  { keys: FROM_L, icon: 'chatbubble' }, { keys: FROM_R, icon: 'trash' }, { keys: UP, icon: 'school' },
];

/** .bt: радиус 20, фон текст·10 %, поля 14, значок сверху, текст снизу; вход 700 ease-out с 600 + 160·i. */
const BentoTile = memo(function BentoTile({ text, i }: Readonly<{ text: string; i: 0 | 1 | 2 }>) {
  const pal = useAnnPalette();
  const tile = TILES[i]!;
  return (
    <Keyframed keys={tile.keys} d={600 + i * 160} dur={700} ease={EASE_OUT} style={[v.bt, i === 2 ? v.btWide : v.btHalf, { backgroundColor: mix(pal.tx, 0.1) }]}>
      <View style={[v.bti, { backgroundColor: mix(pal.tx, 0.12) }]}><Ionicons name={tile.icon} size={20} color={pal.acc} /></View>
      <Text style={[v.btT, { color: pal.tx }]}>{text}</Text>
    </Keyframed>
  );
});

export const VersionFrame = memo(function VersionFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const [first, second, third] = content.blocks;
  // зачем (grid 1fr 1fr макета): первая строка — две половины (без второго блока половина пустая), третья плитка — на две колонки
  return (
    <AnnRoot testID="story-ann-version">
      <AnnBadge text={content.badge} d={100} />
      <Enter kind="rise" d={150}><Text accessibilityRole="header" style={[v.ver, { color: pal.tx }]}>{content.title}</Text></Enter>
      <View style={v.bento}>
        {first ? (
          <View style={v.bentoRow}>
            <BentoTile text={first.text} i={0} />
            {second ? <BentoTile text={second.text} i={1} /> : <View style={v.btHalf} />}
          </View>
        ) : null}
        {second && third ? <BentoTile text={third.text} i={2} /> : null}
      </View>
    </AnnRoot>
  );
});

// ── 34 · Техработы — песочные часы переворачиваются, полоса окна заполняется ────────────────────────────────────

/** stHourFlip: 0–30 % — 0°, 50–80 % — 180°, 100 % — 360° (кривая .6,0,.4,1 на каждом отрезке). */
const HOUR_FLIP: readonly Key[] = [{ at: 0, rot: 0 }, { at: 0.3, rot: 0 }, { at: 0.5, rot: 180 }, { at: 0.8, rot: 180 }, { at: 1, rot: 360 }];
/** Окно работ — пример макета (.win .tt): начало и конец по краям, полоса — ход окна. */
const WINDOW_FROM = '02:00';
const WINDOW_TO = '03:00';

export const MaintenanceFrame = memo(function MaintenanceFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const art = announcementArt('maintenance', content.art);
  return (
    <AnnRoot testID="story-ann-maintenance">
      {art ? (
        <Art>
          <Enter kind="pop" d={100}>
            {/* зачем: тень арта — на том же слое, что вращается (filter + transform одного img макета: тень переворачивается с часами) */}
            <Loop keys={HOUR_FLIP} periodMs={3400} d={1000} ease={EASE_HOUR}><V2Art name={art} size={150} /></Loop>
          </Enter>
        </Art>
      ) : null}
      <AnnBadge text={content.badge} d={400} />
      <AnnTitle text={content.title} d0={480} />
      <Enter d={900} style={[v.win, { backgroundColor: mix(pal.tx, 0.1) }]}>
        <View style={v.tt}>
          <Text style={[v.ttT, { color: pal.tx }]}>{WINDOW_FROM}</Text>
          <Text style={[v.ttT, { color: pal.tx }]}>{WINDOW_TO}</Text>
        </View>
        {/* зачем: заливка дорожки растёт с 600, раньше входа окна (900) — к появлению окна полоса уже в пути, как в макете */}
        <View style={[v.tr, { backgroundColor: mix(pal.tx, 0.14) }]}>
          <Grow axis="x" d={600} dur={2400} style={[StyleSheet.absoluteFill, { backgroundColor: pal.accG }]} />
        </View>
      </Enter>
      <AnnBlocks blocks={content.blocks} d0={1200} max={1} />
    </AnnRoot>
  );
});

// ── 35 · Мы прочитали — цветная доска с тремя записками веером, заголовок под ней ─────────────────────────────────

const BOARD_IN: readonly Key[] = [{ at: 0, rot: -3, scale: 0.7, opacity: 0 }, { at: 1, rot: -3, scale: 1, opacity: 1 }];
type NoteSpot = Readonly<{ left: number; top: number; keys: readonly Key[] }>;
/** Записка на доске: left/top, поворот r и откуда слетает (fx, fy) — pos макета; stNoteIn: translate(fx, fy) rotate(r) → (0, 0) rotate(r). */
const spot = (left: number, top: number, r: number, fx: number, fy: number): NoteSpot => ({
  left, top, keys: [{ at: 0, x: fx, y: fy, rot: r, opacity: 0 }, { at: 1, x: 0, y: 0, rot: r, opacity: 1 }],
});
const NOTE_SPOTS: readonly NoteSpot[] = [spot(14, 16, -4, -220, -60), spot(116, 88, 3, 240, -40), spot(40, 160, -2, 0, 260)];

/** .nt: 210, поля 14/16, радиус 18, фон card, тень 0 16 36 −16 sh-tint·70 %; цитата 14/19 курсивом, подпись «исправлено» через 6. */
const Note = memo(function Note({ text, by, i }: Readonly<{ text: string; by: string; i: number }>) {
  const pal = useAnnPalette();
  const s = NOTE_SPOTS[i]!;
  return (
    <Keyframed keys={s.keys} d={800 + i * 240} dur={800} ease={EASE_OUT} style={[v.nt, { left: s.left, top: s.top, backgroundColor: pal.card, boxShadow: `0 16px 36px -16px ${mix(pal.shTint, 0.7)}` }]}>
      <Text style={[v.ntT, { color: pal.tx }]}>{text}</Text>
      <Text style={[v.ntBy, { color: pal.sec }]}>{by}</Text>
    </Keyframed>
  );
});

export const FeedbackFrame = memo(function FeedbackFrame({ content, lang }: AnnFrameProps) {
  const by = annText(lang, 'fixed');
  return (
    <AnnRoot testID="story-ann-feedback">
      <AnnBadge text={content.badge} d={100} />
      <View style={v.board}>
        {/* .bplane: inset 6 0, радиус 28, 135°; stBoardIn rotate(−3°) scale .7 → rotate(−3°), пружина 800 с 200 */}
        <Keyframed keys={BOARD_IN} d={200} dur={800} ease={EASE_SPRING} style={v.bplane}>
          <Plane width={334} height={250} radius={28} angle={135} />
        </Keyframed>
        {content.blocks.slice(0, 3).map((b, i) => <Note key={`${i}-${b.text}`} text={b.text} by={by} i={i} />)}
      </View>
      <AnnTitle text={content.title} d0={1500} />
    </AnnRoot>
  );
});

// ── 36 · Совет — лампочка с лучами, карточка совета снизу ───────────────────────────────────────────────────────

export const TipFrame = memo(function TipFrame({ content, lang }: AnnFrameProps) {
  const pal = useAnnPalette();
  const tip = content.blocks[0];
  return (
    <AnnRoot testID="story-ann-tip">
      <Art><Enter kind="pop" d={100}><Bulb /></Enter></Art>
      <AnnBadge text={content.badge} d={500} />
      <AnnTitle text={content.title} d0={560} />
      {tip ? (
        <Enter kind="rise" d={1000} style={[v.tipbox, { backgroundColor: pal.card, boxShadow: `0 18px 44px -18px ${mix(pal.shTint, 0.7)}` }]}>
          <Text style={[v.tipK, { color: pal.acc }]}>{annText(lang, 'howTo')}</Text>
          <Text style={[v.tipS, { color: pal.tx }]}>{tip.text}</Text>
        </Enter>
      ) : null}
    </AnnRoot>
  );
});

const v = StyleSheet.create({
  // .bdisc 230, круг, по центру; .bnum 150/150 800 −6, цифры одной ширины
  bdisc: { width: 230, height: 230, borderRadius: 115, alignItems: 'center', justifyContent: 'center' },
  bdiscFill: { ...StyleSheet.absoluteFillObject, borderRadius: 115, overflow: 'hidden' },
  bnum: { fontSize: 150, lineHeight: 150, fontWeight: '800', letterSpacing: -6, textAlign: 'center', fontVariant: ['tabular-nums'] },
  // .wipebg: left/right 12, на всю высоту кадра
  wipePlane: { position: 'absolute', left: 12, top: 0 },
  // .onink: ширина по содержимому (не шире колонки), дети тянутся и стоят слева; невидимый замер строки заголовка и распорка его ширины
  ink: { maxWidth: '100%' },
  inkProbe: { position: 'absolute', left: 0, top: 0, width: 2000, alignItems: 'flex-start', opacity: 0 },
  inkStrut: { height: 0 },
  // .ver 84/88 800 −4; .bento: 2 колонки, строки 98, зазор 10, 100 % до 320, отступ 16; .bt: радиус 20, поля 14, 15/19 700 слева; .bti 36, радиус 10
  ver: { fontSize: 84, lineHeight: 88, fontWeight: '800', letterSpacing: -4, textAlign: 'center', fontVariant: ['tabular-nums'] },
  bento: { width: '100%', maxWidth: 320, marginTop: 16, gap: 10 },
  bentoRow: { flexDirection: 'row', gap: 10, height: 98 },
  bt: { borderRadius: 20, padding: 14, justifyContent: 'space-between', alignItems: 'flex-start' },
  btHalf: { flex: 1 },
  btWide: { height: 98 },
  bti: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btT: { fontSize: 15, lineHeight: 19, fontWeight: '700', textAlign: 'left' }, // typo-exempt: .bento .bt 15/19 макета (владелец 28.10)
  // .win: 260, отступ 14, поля 12/14, радиус 16, зазор 8; .tt 14/18 700 по краям; .tr 6, радиус 3
  win: { width: 260, marginTop: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, gap: 8 },
  tt: { flexDirection: 'row', justifyContent: 'space-between' },
  ttT: { fontSize: 14, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }, // typo-exempt: .win .tt 14/18 макета (владелец 28.10)
  tr: { height: 6, borderRadius: 3, overflow: 'hidden' },
  // .notes.board 334 × 262, отступы 14 / 6; .bplane inset 6 0; .nt 210, поля 14/16, радиус 18; .by 12 700 через 6 (строка 19 — от .nt)
  board: { width: 334, height: 262, marginTop: 14, marginBottom: 6 },
  bplane: { position: 'absolute', left: 0, right: 0, top: 6, bottom: 6 },
  nt: { position: 'absolute', width: 210, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18 },
  ntT: { fontSize: 14, lineHeight: 19, fontStyle: 'italic', textAlign: 'left' }, // typo-exempt: .notes .nt 14/19 макета (владелец 28.10)
  ntBy: { marginTop: 6, fontSize: 12, lineHeight: 19, fontWeight: '700', textAlign: 'left' }, // typo-exempt: .nt .by 12 макета (владелец 28.10)
  // .tipbox: 100 % до 310, поля 18/20, радиус 22, отступ 18; .k 12/16 700 +1 капсом; .s 15/21 через 6
  tipbox: { width: '100%', maxWidth: 310, paddingVertical: 18, paddingHorizontal: 20, borderRadius: 22, marginTop: 18 },
  tipK: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'left' }, // typo-exempt: .tipbox .k 12/16 макета (владелец 28.10)
  tipS: { marginTop: 6, fontSize: 15, lineHeight: 21, textAlign: 'left' }, // typo-exempt: .tipbox .s 15/21 макета (владелец 28.10)
});
