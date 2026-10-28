// ═══════════════════════════════════════════════════════════════════════════
// frames_text.tsx — кадры 1–6 макета stories-announcements-v1.html (v2.1): Манифест, Редакция, Цитата, Три пункта, Вопрос и ответ,
// Большая цифра.
//
// зачем (владелец 28.10: «точно так же, как на макете»): разметка, размеры, задержки и кривые — из render() TPL и CSS макета построчно
// (manifest: плоскость 60 % кадра раскрывается слева за 900 с 100, строки капсом с 500 через 120, метка 900 + 120·n, блок 1000 + 120·n;
// editorial: панель 210 опускается за 800 с 100, блик с 1,4 с, заголовок 800, блоки 1200; quote: диск 330 из угла −70/−90, цитата
// открывается слева направо за 900 с 700, автор 1600; list3: линия растёт 900 с 300, заливка 1500 с 500, пункты справа 600 с 700 через 260;
// qa: вопрос слева 520 с 200, «печатает…» 1500 с 700, ответ пружиной 600 с 2300, блок 2800; number: одометр с 200 через 120, блоки 1300).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Enter } from '../templates/story_template_motion';
import { Grow } from '../templates/story_template_parts';
import { mix } from '../templates/story_template_palette';
import { AnnRoot, EASE_OUT, EASE_SPRING, Keyframed, Loop, Reveal, TextZone, type Key } from './announcement_v2_motion';
import { useAnnPalette } from './announcement_v2_palette';
import { Disc, KineticLines, Odometer, Plane, SheenLoop } from './announcement_v2_parts';
import { TypingDots } from './announcement_v2_particles';
import { announcementTitleSize } from './announcement_v2_registry';
import { AnnBadge, AnnBlocks, AnnTitle, titleTextStyle, type AnnFrameProps } from './announcement_v2_text';
import { shortMonth } from './announcement_v2_dates';

type Box = Readonly<{ w: number; h: number }> | null;
const useBox = (): readonly [Box, (e: LayoutChangeEvent) => void] => {
  const [box, setBox] = useState<Box>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => { const { width, height } = e.nativeEvent.layout; setBox({ w: Math.round(width), h: Math.round(height) }); }, []);
  return [box, onLayout];
};

// ── 1 · Манифест — постер: плоскость темы на 60 % кадра, капс внутри, метка и абзац ниже ────────────────────────

export const ManifestFrame = memo(function ManifestFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const [body, onBody] = useBox();
  const lines = useMemo(() => content.title.split(' ').length, [content.title]);
  // зачем: число строк капса известно только из раскладки — задержки метки и блока считаются от строк, как в макете (900 / 1000 + 120·n)
  const after = 120 * Math.min(8, Math.max(1, Math.ceil(lines / 2)));
  return (
    <AnnRoot testID="story-ann-manifest" left fill>
      <View style={f.poster}>
        <View style={f.pbody} onLayout={onBody}>
          {body ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { left: -16, right: -16 }]}>
              <Reveal width={body.w + 32} height={body.h} from="left" d={100} dur={900}>
                <Plane width={body.w + 32} height={body.h} radius={32} angle={150}><SheenLoop width={body.w + 32} height={body.h} periodMs={6000} d={1600} /></Plane>
              </Reveal>
            </View>
          ) : null}
          <KineticLines text={content.title} color={pal.accInk} maxW={300} d0={500} />
        </View>
        <View style={f.pfoot}>
          <AnnBadge text={content.badge} d={900 + after} align="left" />
          <AnnBlocks blocks={content.blocks} d0={1000 + after} align="left" max={1} />
        </View>
      </View>
    </AnnRoot>
  );
});

// ── 2 · Редакция — панель-занавес сверху с бликом, текст слева ───────────────────────────────────────────────────

const PANEL_DOWN: readonly Key[] = [{ at: 0, y: -273 }, { at: 1, y: 0 }];

export const EditorialFrame = memo(function EditorialFrame({ content, lang }: AnnFrameProps) {
  const pal = useAnnPalette();
  const [col, onCol] = useBox();
  const w = col?.w ?? 334;
  const mark = shortMonth(lang, content.publishedAtMs ?? Date.now());
  return (
    <AnnRoot testID="story-ann-editorial" left>
      <View style={f.edit} onLayout={onCol}>
        <Keyframed keys={PANEL_DOWN} d={100} dur={800} ease={EASE_OUT}>
          <Plane width={w} height={210} radius={28} angle={135}>
            <SheenLoop width={w} height={210} periodMs={5000} d={1400} />
            <View style={f.panelIn}>
              <Text style={[f.panelOv, { color: pal.accInk }]}>{content.badge}</Text>
              <Text style={[f.mark, { color: pal.accInk }]}>{mark}</Text>
            </View>
          </Plane>
        </Keyframed>
        <View style={f.gap18} />
        <AnnTitle text={content.title} d0={800} align="left" />
        <AnnBlocks blocks={content.blocks} d0={1200} align="left" max={2} />
      </View>
    </AnnRoot>
  );
});

// ── 3 · Цитата — диск темы с кавычкой входит из угла, цитата внизу слева открывается маской ──────────────────────

const FLOAT: readonly Key[] = [{ at: 0, y: 0 }, { at: 0.5, y: -6 }, { at: 1, y: 0 }];

export const QuoteFrame = memo(function QuoteFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const [tb, onTitle] = useBox();
  const size = announcementTitleSize(content.title);
  const title = <Text style={titleTextStyle(size, pal.tx, 'left')}>{content.title}</Text>;
  return (
    <AnnRoot
      testID="story-ann-quote"
      left
      fill
      back={
        <Disc size={330} angle={150} d={100} originFx={0.3} originFy={0.3} style={f.qdisc}>
          <Loop keys={FLOAT} periodMs={4200} style={f.qmWrap}><Text style={[f.qm, { color: pal.accInk }]}>“</Text></Loop>
        </Disc>
      }
    >
      <View style={f.qwrap}>
        {/* зачем: clip-path inset(0 100% 0 0) → inset(0) макета — раскрытие слева направо после замера блока цитаты */}
        <View onLayout={onTitle} style={f.measure}>{tb ? null : title}</View>
        {tb ? <Reveal width={tb.w} height={tb.h} from="left" d={700} dur={900} style={f.measureOver}>{title}</Reveal> : null}
        <AnnBlocks blocks={content.blocks} d0={1600} align="left" max={1} />
      </View>
    </AnnRoot>
  );
});

// ── 4 · Три пункта — вертикальный таймлайн ───────────────────────────────────────────────────────────────────────

const FROM_R: readonly Key[] = [{ at: 0, x: 48, opacity: 0 }, { at: 1, x: 0, opacity: 1 }];

export const List3Frame = memo(function List3Frame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  return (
    <AnnRoot testID="story-ann-list3">
      <AnnBadge text={content.badge} d={100} />
      <AnnTitle text={content.title} d0={220} />
      <View style={f.tl}>
        <Grow axis="y" d={300} dur={900} style={[f.tlLine, { backgroundColor: mix(pal.tx, 0.2) }]}>
          <Grow axis="y" d={500} dur={1500} style={[StyleSheet.absoluteFill, { backgroundColor: pal.accG }]} />
        </Grow>
        {content.blocks.slice(0, 3).map((b, i) => (
          <Keyframed key={`${i}-${b.text}`} keys={FROM_R} d={700 + i * 260} dur={600} ease={EASE_OUT} style={f.tlItem}>
            <View style={[f.tlDot, { backgroundColor: pal.accG, boxShadow: `0 0 0 4px ${mix(pal.accG, 0.25)}` }]} />
            <Text style={[f.tlText, { color: pal.tx }]}>{b.text}</Text>
          </Keyframed>
        ))}
      </View>
    </AnnRoot>
  );
});

// ── 5 · Вопрос и ответ — чат ─────────────────────────────────────────────────────────────────────────────────────

const FROM_L: readonly Key[] = [{ at: 0, x: -48, opacity: 0 }, { at: 1, x: 0, opacity: 1 }];
const POP: readonly Key[] = [{ at: 0, scale: 0.6, opacity: 0 }, { at: 1, scale: 1, opacity: 1 }];
const AB_SIZE = { 40: { fontSize: 30, lineHeight: 35 }, 34: { fontSize: 24, lineHeight: 30 }, 28: { fontSize: 20, lineHeight: 26 }, 24: { fontSize: 20, lineHeight: 26 } } as const;

export const QaFrame = memo(function QaFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const size = announcementTitleSize(content.title);
  return (
    <AnnRoot testID="story-ann-qa">
      <View style={f.chat}>
        {content.badge ? (
          <Keyframed keys={FROM_L} d={200} dur={520} ease={EASE_OUT} style={[f.qb, { backgroundColor: mix(pal.tx, 0.11) }]}>
            <Text style={[f.qbT, { color: pal.tx }]}>{content.badge}</Text>
          </Keyframed>
        ) : null}
        <Keyframed keys={POP} d={2300} dur={600} ease={EASE_SPRING} originX={150} originY={40} style={[f.ab, { backgroundColor: pal.accG }]}>
          <Text style={[f.abT, AB_SIZE[size], { color: pal.accInk }]}>{content.title}</Text>
        </Keyframed>
        <TypingDots />
      </View>
      <AnnBlocks blocks={content.blocks} d0={2800} max={1} />
    </AnnRoot>
  );
});

// ── 6 · Большая цифра — одометр ──────────────────────────────────────────────────────────────────────────────────

export const NumberFrame = memo(function NumberFrame({ content }: AnnFrameProps) {
  const pal = useAnnPalette();
  const n = Number(String(content.title).replace(/\D/g, '')) || 0;
  return (
    <AnnRoot testID="story-ann-number">
      <TextZone>
        <AnnBadge text={content.badge} d={100} />
        <View style={f.gap12} />
        <Odometer value={n} d0={200} color={pal.tx} />
        <AnnBlocks blocks={content.blocks} d0={1300} max={2} />
      </TextZone>
    </AnnRoot>
  );
});

const f = StyleSheet.create({
  // .poster: вся высота; .pbody 60 % — текст у низа плоскости, поля 0 10 26 18; .pfoot: 22 сверху, 18 слева
  poster: { flex: 1, alignSelf: 'stretch' },
  pbody: { flex: 0.6, justifyContent: 'flex-end', paddingLeft: 18, paddingRight: 10, paddingBottom: 26 },
  pfoot: { flex: 0.4, paddingTop: 22, paddingLeft: 18, paddingRight: 6, alignItems: 'flex-start' },
  // .edit: колонка на всю ширину; панель 210, поля 20/22; .mark 60/60 800 −3
  edit: { alignSelf: 'stretch', alignItems: 'flex-start' },
  panelIn: { flex: 1, justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 20, paddingHorizontal: 22 },
  panelOv: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.82 }, // guard-ok: метка .ov макета на панели (обзор капсом), не подпись под названием
  mark: { fontSize: 60, lineHeight: 60, fontWeight: '800', letterSpacing: -3 },
  gap18: { height: 18 },
  gap12: { height: 12 },
  // .qdisc: 330 в углу −70/−90; кавычка 190/150 800 −8 ,92 у правого низа (поля 0 48 22 0)
  qdisc: { position: 'absolute', left: -70, top: -90, alignItems: 'flex-end', justifyContent: 'flex-end', paddingRight: 48, paddingBottom: 22 },
  qmWrap: {},
  qm: { fontSize: 190, lineHeight: 150, fontWeight: '800', letterSpacing: -8, opacity: 0.92 },
  qwrap: { flex: 1, alignSelf: 'stretch', justifyContent: 'flex-end', alignItems: 'flex-start', paddingBottom: 32 },
  measure: { alignSelf: 'stretch', maxWidth: 334 },
  measureOver: { marginTop: 0 },
  // .tl: max 320, 18 сверху, слева 36, зазор 18; линия left 11 top 10 bottom 10 width 2; точка 16 на −33/4; текст 17/23 700
  tl: { width: '100%', maxWidth: 320, marginTop: 18, paddingLeft: 36, gap: 18 }, // зачем: alignSelf stretch + maxWidth в Yoga прижимает к левому краю (7 dp левее макета) — width 100 % центрируется колонкой
  tlLine: { position: 'absolute', left: 11, top: 10, bottom: 10, width: 2 },
  tlItem: { alignSelf: 'stretch' },
  tlDot: { position: 'absolute', left: -33, top: 4, width: 16, height: 16, borderRadius: 8 },
  tlText: { fontSize: 17, lineHeight: 23, fontWeight: '700', textAlign: 'left' }, // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1
  // .chat: max 320, зазор 12; .qb 82 %, поля 12/16, радиус 20 (угол 6), 16/21 600; .ab 94 %, поля 16/18, радиус 22 (угол 6), 800 −,4
  chat: { width: '100%', maxWidth: 320, gap: 12 },
  qb: { alignSelf: 'flex-start', maxWidth: '82%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, borderBottomLeftRadius: 6 },
  qbT: { fontSize: 16, lineHeight: 21, fontWeight: '600', textAlign: 'left' },
  ab: { alignSelf: 'flex-end', maxWidth: '94%', paddingVertical: 16, paddingHorizontal: 18, borderRadius: 22, borderBottomRightRadius: 6 },
  abT: { fontWeight: '800', letterSpacing: -0.4, textAlign: 'left' },
});
