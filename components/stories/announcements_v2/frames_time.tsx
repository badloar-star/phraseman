// ═══════════════════════════════════════════════════════════════════════════
// frames_time.tsx — кадры 7–11 макета stories-announcements-v1.html (v2.1), группа «Срок»: Обратный отсчёт, Дата, Расписание, Скоро,
// Только сегодня.
//
// зачем (владелец 28.10: «точно так же, как на макете»): разметка, размеры, задержки и кривые — из render() TPL и CSS макета построчно
// (countdown: кольцо 190 из 7 долей, 3 живые загораются 500 мс с 500 через 180, цифра 64/66 пружиной с 300, подпись с 600, метка 1000,
// заголовок 1060, блок 1400; date: лист 190 × 206 откидывается rotateX −78° → 8° → 0 за 1100 с 150 (перспектива 700, петля — верхний край),
// парит −6 за 4,2 с, заголовок 700, блок 1100; schedule: метка 100, заголовок 220, линия 3 растёт 900 с 300, заливка 1500 с 500, остановки
// пружиной 520 с 700 через 260; soon: занавес темы 160° поднимается со 102 % за 900 с 100, слово 72/76 из контура (масштаб 1,5 → 1 за 900
// с 800) в заливку (700 с 1700), заголовок 1900, блок 2300; today24: печать 230 вращается 16 с, «24 ч» 62/66 пружиной 700 с 300, 6 искр
// вне полосы текста, заголовок 600, блок 1000).
// Контур слова «Скоро» (-webkit-text-stroke) — SVG-текст с обводкой 2 без заливки: это та же обводка по контуру глифа; заливка — тоже
// SVG-текст той же раскладки, чтобы слои совпадали пиксель в пиксель.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type TextStyle } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';
import type { Lang } from '../../../constants/i18n';
import { DebugLogger } from '../../../app/debug-logger';
import { APP_FONT_FAMILY } from '../../../app/typography';
import { useStoryFrameClock } from '../templates/story_frame_clock';
import { Enter } from '../templates/story_template_motion';
import { Grow } from '../templates/story_template_parts';
import { mix } from '../templates/story_template_palette';
import { AnnRoot, EASE_CSS, EASE_OUT, Keyframed, Loop, TextZone, type Key } from './announcement_v2_motion';
import { useAnnPalette } from './announcement_v2_palette';
import { CircularText, Plane, Ring7 } from './announcement_v2_parts';
import { Sparks } from './announcement_v2_particles';
import { announcementTitleSize, type AnnouncementV2Block } from './announcement_v2_registry';
import { annDaysLeft, annText } from './announcement_v2_strings';
import { AnnBadge, AnnBlocks, AnnTitle, titleTextStyle, type AnnFrameProps } from './announcement_v2_text';
import { calendarLeaf } from './announcement_v2_dates';

const LOG = '[STORY-ANN2]';

type Box = Readonly<{ w: number; h: number }> | null;
const useBox = (): readonly [Box, (e: LayoutChangeEvent) => void] => {
  const [box, setBox] = useState<Box>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => { const { width, height } = e.nativeEvent.layout; setBox({ w: Math.round(width), h: Math.round(height) }); }, []);
  return [box, onLayout];
};

// ── 7 · Обратный отсчёт — кольцо из 7 долей, живые загораются по очереди; цифра пружиной ─────────────────────────

/** Дней до конца срока — пока 3, как в макете. зачем: срок жизни объявления (lifetime / unit) не входит в AnnouncementV2Content —
 *  когда Моменты отдадут его в кадр, число и живые доли кольца (не больше 7) пойдут от него. */
const COUNTDOWN_DAYS = 3;

/** «дня осталось» под цифрой: annDaysLeft даёт «3 дня осталось», а в макете число стоит отдельно крупно (<b>3</b><span>дня осталось</span>). */
function daysLeftCaption(lang: Lang, days: number): string {
  const full = annDaysLeft(lang, days);
  const head = `${days} `;
  return full.startsWith(head) ? full.slice(head.length) : full;
}

export const CountdownFrame = memo(function CountdownFrame({ content, lang }: AnnFrameProps) {
  const pal = useAnnPalette();
  const caption = useMemo(() => daysLeftCaption(lang, COUNTDOWN_DAYS), [lang]);
  return (
    <AnnRoot testID="story-ann-countdown">
      <Ring7 lit={Math.min(7, COUNTDOWN_DAYS)}>
        <Enter kind="pop" d={300}><Text style={[s.cdNum, { color: pal.tx }]}>{COUNTDOWN_DAYS}</Text></Enter>
        <Enter d={600} style={s.cdCapBox}><Text style={[s.cdCap, { color: pal.sec }]}>{caption}</Text></Enter>
      </Ring7>
      <AnnBadge text={content.badge} d={1000} />
      <AnnTitle text={content.title} d0={1060} />
      <AnnBlocks blocks={content.blocks} d0={1400} max={1} />
    </AnnRoot>
  );
});

// ── 8 · Дата — лист календаря откидывается в 3D с отскоком, потом парит ──────────────────────────────────────────

/** stFlipDown: rotateX −78° (прозрачно) → 8° на 60 % (видно) → 0; кривая .23,1,.32,1 на каждом отрезке, как в CSS. */
const FLIP_DOWN: readonly Key[] = [{ at: 0, rotX: -78, opacity: 0 }, { at: 0.6, rotX: 8, opacity: 1 }, { at: 1, rotX: 0, opacity: 1 }];
/** stFloat: 0 → −6 → 0 за 4,2 с (ease-in-out), бесконечно. */
const FLOAT: readonly Key[] = [{ at: 0, y: 0 }, { at: 0.5, y: -6 }, { at: 1, y: 0 }];
const LEAF_W = 190;
const LEAF_H = 206;

export const DateFrame = memo(function DateFrame({ content, lang }: AnnFrameProps) {
  const pal = useAnnPalette();
  const eventAtMs = content.eventAtMs ?? null;
  const leaf = useMemo(() => calendarLeaf(lang, eventAtMs ?? Date.now()), [lang, eventAtMs]);
  const label = [`${leaf.day} ${leaf.month}`, leaf.weekday].filter(Boolean).join(', ');
  useEffect(() => {
    // зачем: дата события — поле только этого шаблона; без него лист показывает сегодня — пустое поле должно быть видно в журнале
    if (eventAtMs === null) DebugLogger.info(LOG, 'date: eventAtMs нет — лист календаря показывает сегодняшнюю дату');
  }, [eventAtMs]);
  return (
    <AnnRoot testID="story-ann-date">
      <View style={s.art} accessible accessibilityLabel={label}>
        <Loop keys={FLOAT} periodMs={4200}>
          {/* зачем: transform-origin: top + perspective 700 у .float макета — петля откидывания у верхнего края (−103 от центра листа) */}
          <Keyframed keys={FLIP_DOWN} d={150} dur={1100} ease={EASE_OUT} perspective={700} originY={-LEAF_H / 2} style={[s.leaf, { backgroundColor: pal.card, boxShadow: `0 30px 60px -24px ${mix(pal.shTint, 0.8)}` }]}>
            <View style={s.leafIn}>
              <View style={[s.mo, { backgroundColor: pal.accG }]}><Text style={[s.moT, { color: pal.accInk }]}>{leaf.month}</Text></View>
              <View style={s.dn}><Text style={[s.dnT, { color: pal.tx }]}>{leaf.day}</Text></View>
              <View style={s.wd}><Text style={[s.wdT, { color: pal.sec }]}>{leaf.weekday}</Text></View>
            </View>
          </Keyframed>
        </Loop>
      </View>
      <AnnTitle text={content.title} d0={700} />
      <AnnBlocks blocks={content.blocks} d0={1100} max={1} />
    </AnnRoot>
  );
});

// ── 9 · Расписание — горизонтальный таймлайн: линия прочерчивается, остановки всплывают пружиной ──────────────────

/** Остановка .stp: блок «12:00 · Раунд 1» → время до первого « · », остальное — подпись; коробка 100 × 150 центром на точке. */
const ScheduleStop = memo(function ScheduleStop({ text, left, d }: Readonly<{ text: string; left: number; d: number }>) {
  const pal = useAnnPalette();
  const [time = '', ...rest] = text.split(' · ');
  const label = rest.join(' · ');
  return (
    <Enter kind="pop" d={d} dur={520} style={[s.stp, { left: left - 50 }]}>
      <Text style={[s.stTm, { color: pal.tx }]}>{time}</Text>
      <View style={[s.stDot, { backgroundColor: pal.accG, boxShadow: `0 0 0 4px ${mix(pal.accG, 0.25)}` }]} />
      {label ? <Text style={[s.stLb, { color: pal.sec }]}>{label}</Text> : null}
    </Enter>
  );
});

export const ScheduleFrame = memo(function ScheduleFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const [hl, onHl] = useBox();
  const rows = useMemo(() => content.blocks.slice(0, 3), [content.blocks]);
  // зачем: макет ставит остановки по ширине ленты 320 (24 + (320 − 48) · доля); берём реальную ширину ленты — на кадре 390 это ровно 320,
  // а на узком экране крайние точки остаются на концах линии
  const span = (hl?.w ?? 320) - 48;
  return (
    <AnnRoot testID="story-ann-schedule">
      <AnnBadge text={content.badge} d={100} />
      <AnnTitle text={content.title} d0={220} />
      <View style={s.hl} onLayout={onHl}>
        <Grow axis="x" d={300} dur={900} style={[s.hlLine, { backgroundColor: mix(pal.tx, 0.22) }]}>
          <Grow axis="x" d={500} dur={1500} style={[StyleSheet.absoluteFill, { backgroundColor: pal.accG }]} />
        </Grow>
        {rows.map((b, i) => ( // guard-ok: до 3 блоков владельца, порядок постоянный — ключ «номер-текст»
          <ScheduleStop key={`${i}-${b.text}`} text={b.text} left={24 + span * (rows.length === 1 ? 0.5 : i / (rows.length - 1))} d={700 + i * 260} />
        ))}
      </View>
    </AnnRoot>
  );
});

// ── 10 · Скоро — занавес цвета темы поднимается снизу, слово из контура в заливку ────────────────────────────────

/** stSoon: проявление и масштаб 1,5 → 1 (900 мс, .23,1,.32,1); stFade: проявление заливки (700 мс, CSS ease). */
const SOON_IN: readonly Key[] = [{ at: 0, opacity: 0, scale: 1.5 }, { at: 1, opacity: 1, scale: 1 }];
const FADE_IN: readonly Key[] = [{ at: 0, opacity: 0 }, { at: 1, opacity: 1 }];
/** Холст слова: шире кадра телефона (слово без переноса бывает шире коробки 300 — white-space: nowrap макета) и выше строки (выносные
 *  элементы не режутся); центр холста = центр коробки .soonw (150, 40) — точка опоры масштаба та же, что у <b> макета. */
const SOON_CANVAS_W = 480;
const SOON_CANVAS_H = 120;
const SOON_FS = 72;
/** Базовая линия: строка 76 по центру коробки 80 (центр 40); у Inter (ascent − descent) / 2 = (0,96875 − 0,2412) / 2 = 0,3638 em →
 *  на 26,2 ниже центра — ровно там, где её ставит раскладка макета (66,2 от верха коробки). */
const SOON_BASELINE = SOON_CANVAS_H / 2 + 0.3638 * SOON_FS;

/** Слово занавеса SVG-текстом: `outline` — обводка 2 по контуру глифов без заливки (-webkit-text-stroke: 2px), иначе заливка. */
const SoonWord = memo(function SoonWord({ text, color, outline }: Readonly<{ text: string; color: string; outline: boolean }>) {
  return (
    <Svg width={SOON_CANVAS_W} height={SOON_CANVAS_H}>
      <SvgText
        x={SOON_CANVAS_W / 2}
        y={SOON_BASELINE}
        textAnchor="middle"
        fontFamily={APP_FONT_FAMILY}
        fontSize={SOON_FS}
        fontWeight="800"
        letterSpacing={-2}
        fill={outline ? 'none' : color}
        stroke={outline ? color : 'none'}
        strokeWidth={outline ? 2 : 0}
      >
        {text}
      </SvgText>
    </Svg>
  );
});

/** .bg.curt: плоскость темы 160° на всю высоту кадра с полями 12 слева и справа, радиус 32, без тени; въезжает со 102 % своей высоты. */
const SoonCurtain = memo(function SoonCurtain() {
  const [box, onBox] = useBox();
  const keys = useMemo<readonly Key[] | null>(() => (box ? [{ at: 0, y: box.h * 1.02 }, { at: 1, y: 0 }] : null), [box]);
  return (
    <View style={s.curt} onLayout={onBox}>
      {box && keys ? (
        <Keyframed keys={keys} d={100} dur={900} ease={EASE_OUT}>
          <Plane width={box.w} height={box.h} radius={32} angle={160} shadow={false} />
        </Keyframed>
      ) : null}
    </View>
  );
});

const INK_SIZE: Readonly<Record<14 | 16 | 20, TextStyle>> = { 14: { fontSize: 14, lineHeight: 20 }, 16: { fontSize: 16, lineHeight: 22 }, 20: { fontSize: 20, lineHeight: 27 } }; // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1

/** Блок на занавесе (.onink .p / .blk): цвет accentInk у всех стилей. opacity .82 у .onink .p макета перекрыта входом .a (анимация держит
 *  opacity 1), поэтому итог — 1. Ширина — как блок макета: по колонке .onink, не шире 320, от её левого края, текст по центру. */
const OnInkBlock = memo(function OnInkBlock({ block, d }: Readonly<{ block: AnnouncementV2Block; d: number }>) {
  const pal = useAnnPalette();
  const size = INK_SIZE[block.size] ?? INK_SIZE[16];
  if (block.style === 'accent') {
    return <Enter d={d} style={[s.inkBlk, s.inkAcc, { backgroundColor: mix(pal.tx, 0.1) }]}><Text style={[size, s.inkAccT, { color: pal.accInk }]}>{block.text}</Text></Enter>;
  }
  if (block.style === 'quote') {
    return (
      <Enter d={d} style={[s.inkBlk, s.inkQ]}>
        <View style={[s.inkQBar, { backgroundColor: pal.accG }]} />
        <Text style={[size, s.inkQT, { color: pal.accInk }]}>{block.text}</Text>
      </Enter>
    );
  }
  return <Enter d={d} style={s.inkP}><Text style={[size, s.inkPT, { color: pal.accInk }]}>{block.text}</Text></Enter>;
});

export const SoonFrame = memo(function SoonFrame({ content, lang }: AnnFrameProps) {
  const pal = useAnnPalette();
  const { final } = useStoryFrameClock();
  const word = content.badge || annText(lang, 'soon');
  const size = announcementTitleSize(content.title);
  const first = content.blocks[0];
  return (
    <AnnRoot testID="story-ann-soon" back={<SoonCurtain />}>
      <View style={s.onink}>
        {/* зачем: .onink макета — обычный блок по ширине содержимого: max(300 у слова, заголовок в одну строку ≤ 334, блок ≤ 320); слово стоит
            у его левого края (при длинном заголовке — на 17 левее центра, как в макете). AnnTitle ставит себе ширину сам после замера, поэтому
            невидимая строка-замер нулевой высоты отдаёт колонке ширину заголовка в одну строку — та же ширина, что в браузере */}
        <Text numberOfLines={1} style={[titleTextStyle(size, pal.accInk, 'center'), s.probe]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{content.title}</Text>
        <View style={s.soonw} accessible accessibilityLabel={word}>
          {/* «Уменьшить движение» — контура нет, только заливка (макет: .soonw b:not(.fill) { opacity: 0 }) */}
          {final ? null : <Keyframed keys={SOON_IN} d={800} dur={900} ease={EASE_OUT} style={s.soonLayer}><SoonWord text={word} color={pal.accInk} outline /></Keyframed>}
          <Keyframed keys={FADE_IN} d={1700} dur={700} ease={EASE_CSS} style={s.soonLayer}><SoonWord text={word} color={pal.accInk} outline={false} /></Keyframed>
        </View>
        <AnnTitle text={content.title} d0={1900} color={pal.accInk} />
        {first ? <OnInkBlock block={first} d={2300} /> : null}
      </View>
    </AnnRoot>
  );
});

// ── 11 · Только сегодня — круговая надпись-печать вращается вокруг «24 ч», искры мигают ──────────────────────────

export const Today24Frame = memo(function Today24Frame({ content, lang }: AnnFrameProps) {
  const pal = useAnnPalette();
  const rawId = useId();
  // зачем: id дуги надписи уникален на экземпляр — соседние истории живут одновременно, одинаковый id взял бы чужую дугу
  const ringId = useMemo(() => `ann-cp-${rawId.replace(/[^A-Za-z0-9_-]/g, '')}`, [rawId]);
  // зачем: макет при пустой метке пишет по кругу «Только сегодня»; ключа этой подписи в announcement_v2_strings ещё нет (todayOnly —
  // добавит координатор), до него запасная надпись — «24 ч»
  const ring = content.badge || annText(lang, 'todayOnly');
  useEffect(() => {
    if (!content.badge) DebugLogger.info(LOG, 'today24: метка пустая — надпись по кругу временно «24 ч» (нужен ключ todayOnly «Только сегодня»)');
  }, [content.badge]);
  return (
    <AnnRoot testID="story-ann-today24" layer={<Sparks n={6} />} maskText>
      <TextZone>
        <View style={s.stamp}>
          <CircularText text={ring} id={ringId} />
          <Enter kind="pop" d={300} dur={700}><Text style={[s.cen, { color: pal.tx }]}>{annText(lang, 'hours24')}</Text></Enter>
        </View>
        <AnnTitle text={content.title} d0={600} />
        <AnnBlocks blocks={content.blocks} d0={1000} max={1} />
      </TextZone>
    </AnnRoot>
  );
});

const s = StyleSheet.create({
  // .ring7 .c: цифра 64/66 800 −3 (табличные), под ней строка 13/17 700 с отступом 2
  cdNum: { fontSize: 64, lineHeight: 66, fontWeight: '800', letterSpacing: -3, fontVariant: ['tabular-nums'], textAlign: 'center' },
  cdCapBox: { marginTop: 2 },
  cdCap: { fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center' }, // guard-ok: строка «дня осталось» под цифрой — элемент макета (.ring7 .c span)
  // .art: 18 снизу; .leaf 190 × 206, радиус 30, тень 0 30 60 −24 (оттенок 80 %); .mo 46 (15/21 800 +2 капс), .dn остаток (92/92 800 −5),
  // .wd 38 (13/21 700 +1 капс); межстрочное 21 — унаследованное от .ph макета
  art: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  leaf: { width: LEAF_W, height: LEAF_H, borderRadius: 30 },
  leafIn: { flex: 1, borderRadius: 30, overflow: 'hidden' },
  mo: { height: 46, alignItems: 'center', justifyContent: 'center' },
  moT: { fontSize: 15, lineHeight: 21, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }, // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1
  dn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dnT: { fontSize: 92, lineHeight: 92, fontWeight: '800', letterSpacing: -5, fontVariant: ['tabular-nums'] },
  wd: { height: 38, alignItems: 'center', justifyContent: 'center' },
  wdT: { fontSize: 13, lineHeight: 21, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }, // guard-ok: день недели на листе — элемент макета (.wd)
  // .hl: 100 % до 320, высота 150, 10 сверху; линия: поля 24, сверху 76, толщина 3, радиус 2 (заливка без радиуса — как <i> макета);
  // остановка 100 × 150: время 22/26 800 (30 сверху), точка 18 (10 сверху, кольцо 4), строка 13/17 700 до 96 (14 сверху)
  hl: { width: '100%', maxWidth: 320, height: 150, marginTop: 10 },
  hlLine: { position: 'absolute', left: 24, right: 24, top: 76, height: 3, borderRadius: 2 },
  stp: { position: 'absolute', top: 0, width: 100, height: 150, alignItems: 'center' },
  stTm: { marginTop: 30, fontSize: 22, lineHeight: 26, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: 'center' },
  stDot: { marginTop: 10, width: 18, height: 18, borderRadius: 9 },
  stLb: { marginTop: 14, maxWidth: 96, fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center' }, // guard-ok: строка остановки — элемент макета (.lb)
  // .bg.curt: поля 12 слева и справа на всю высоту; .onink — блок по ширине содержимого, дети от левого края; .soonw 300 × 80
  curt: { position: 'absolute', top: 0, bottom: 0, left: 12, right: 12 },
  onink: { alignItems: 'center' }, // зачем (макет v2.1, правка 28.10): .onink — колонка по центру, слово и блок не уезжают влево при длинном заголовке
  probe: { height: 0, opacity: 0, alignSelf: 'flex-start' },
  soonw: { width: 300, height: 80 },
  soonLayer: { position: 'absolute', left: 150 - SOON_CANVAS_W / 2, top: 40 - SOON_CANVAS_H / 2, width: SOON_CANVAS_W, height: SOON_CANVAS_H },
  // блоки на занавесе: .p 8 сверху, .blk 14 сверху, оба до 320; плашка 12/16 радиус 14 600; цитата — планка 2 с зазором 12, курсив, влево
  inkP: { marginTop: 8, alignSelf: 'stretch', maxWidth: 320 },
  inkPT: { textAlign: 'center' },
  inkBlk: { marginTop: 14, alignSelf: 'stretch', maxWidth: 320 },
  inkAcc: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14 },
  inkAccT: { fontWeight: '600', textAlign: 'center' },
  inkQ: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  inkQBar: { width: 2, borderRadius: 1 },
  inkQT: { fontStyle: 'italic', flexShrink: 1, textAlign: 'left' },
  // .stamp 230 × 230, 6 снизу; .cen «24 ч» 62/66 800 −2
  stamp: { width: 230, height: 230, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  cen: { fontSize: 62, lineHeight: 66, fontWeight: '800', letterSpacing: -2 },
});
