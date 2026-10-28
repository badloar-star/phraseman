// ═══════════════════════════════════════════════════════════════════════════
// announcement_v2_text.tsx — типографика кадров объявлений (макет stories-announcements-v1.html, «типографика кадра»): метка, заголовок
// по длине (40/34/28, в узкой колонке 24), блоки трёх стилей, большое число, и пропсы кадра.
//
// зачем (владелец 28.10: «точно так же, как на макете»): кегли, межстрочные, разрядки, отступы и цвета — из CSS макета построчно
// (.ov 13/17 700 +1,4 accentText; .h1 h40 40/44 −,9 · h34 34/40 −,6 · h28 28/34 −,4 · h24 24/29 −,3, max 334; .p 16/22 secondary, b14 14/20,
// b20 20/27 text, max 320; .blk.acc плашка текст·10 % радиус 14 поля 12/16 600; .blk.q планка 2 accent, курсив; .big 96/96 −4, .m 72/76 −3).
// Слова заголовка входят лесенкой через 50 мс (words(text, d0) макета), ширина строк — как text-wrap: balance.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { balancedWidth } from '../templates/story_template_layout';
import { Enter } from '../templates/story_template_motion';
import { mix } from '../templates/story_template_palette';
import { useAnnPalette } from './announcement_v2_palette';
import { announcementTitleSize, type AnnouncementTitleSize, type AnnouncementV2Block, type AnnouncementV2Content } from './announcement_v2_registry';

/** Опрос кадра (Моменты): свой выбор, проценты после голоса, голос. */
export type AnnPoll = Readonly<{ myOption: number | null; percents: readonly number[] | null; onVote: (index: number) => void }>;

/** Пропсы кадра: содержимое, язык интерфейса, свой ранг монеты, опрос (только poll). */
export type AnnFrameProps = Readonly<{
  content: AnnouncementV2Content; lang: Lang; myRank: number | null; poll?: AnnPoll | null;
  /** Код приглашения человека (invite): нет — карточка кода не рисуется; фотостудия передаёт пример макета. */
  inviteCode?: string | null;
}>;

export type Align = 'center' | 'left';

// ── метка (.ov) ───────────────────────────────────────────────────────────────────────────────────────────────────

export const AnnBadge = memo(function AnnBadge({ text, d, align = 'center', color, style }: Readonly<{ text: string; d: number; align?: Align; color?: string; style?: StyleProp<ViewStyle> }>) {
  const pal = useAnnPalette();
  if (!text) return null;
  return <Enter d={d} style={[t.ovBox, style]}><Text style={[t.ov, { color: color ?? pal.acc, textAlign: align }]}>{text}</Text></Enter>;
});

// ── заголовок (.h1): слова лесенкой ───────────────────────────────────────────────────────────────────────────────

const H1: Readonly<Record<AnnouncementTitleSize, TextStyle>> = {
  40: { fontSize: 40, lineHeight: 44, letterSpacing: -0.9 },
  34: { fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  28: { fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  24: { fontSize: 24, lineHeight: 29, letterSpacing: -0.3 },
};
const GAP: Readonly<Record<AnnouncementTitleSize, number>> = { 40: 10, 34: 9, 28: 7, 24: 6 };

type WordsProps = Readonly<{ text: string; d0: number; step?: number; style: StyleProp<TextStyle>; maxWidth: number; gap: number; align: Align }>;

/** Слова заголовка входят по очереди (.w.a); ширина блока — как text-wrap: balance после замера слов; выравнивание по центру или слева. */
export const AnnWords = memo(function AnnWords({ text, d0, step = 50, style, maxWidth, gap, align }: WordsProps) {
  const words = useMemo(() => text.split(' ').filter(Boolean), [text]);
  const [widths, setWidths] = useState<readonly number[] | null>(null);
  const measured = useMemo(() => new Map<number, number>(), [text]); // eslint-disable-line react-hooks/exhaustive-deps -- зачем: замер заново на новый текст
  const onWord = useCallback((i: number, e: LayoutChangeEvent) => {
    measured.set(i, e.nativeEvent.layout.width); // guard-ok: Map в памяти — ширины слов для выравнивания строк
    if (measured.size === words.length) setWidths(words.map((_, k) => measured.get(k) ?? 0));
  }, [measured, words]);
  const width = widths ? balancedWidth(widths, gap, maxWidth) : maxWidth;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text} style={[t.words, { width, columnGap: gap, justifyContent: align === 'left' ? 'flex-start' : 'center', alignSelf: align === 'left' ? 'flex-start' : 'center' }]}>
      {words.map((word, i) => (
        <Enter key={`${i}-${word}`} kind="a" d={d0 + i * step}>
          <Text style={style} onLayout={(e) => onWord(i, e)}>{word}</Text>
        </Enter>
      ))}
    </View>
  );
});

type TitleProps = Readonly<{ text: string; d0: number; align?: Align; narrow?: boolean; color?: string; maxWidth?: number; style?: StyleProp<ViewStyle> }>;

/** Заголовок по длине текста; `narrow` — узкая колонка (на ступень меньше). Ширина — не больше 334 и не больше колонки. */
export const AnnTitle = memo(function AnnTitle({ text, d0, align = 'center', narrow = false, color, maxWidth = 334, style }: TitleProps) {
  const pal = useAnnPalette();
  const size = announcementTitleSize(text, narrow);
  const [avail, setAvail] = useState<number | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => { setAvail(Math.round(e.nativeEvent.layout.width)); }, []);
  if (!text) return null;
  return (
    <View style={[t.h1Box, align === 'left' ? t.leftBox : null, style]} onLayout={onLayout}>
      <AnnWords text={text} d0={d0} style={[t.h1, H1[size], { color: color ?? pal.tx, textAlign: align }]} maxWidth={Math.min(maxWidth, avail ?? maxWidth)} gap={GAP[size]} align={align} />
    </View>
  );
});

/** Заголовок одним блоком (без лесенки) — для масок раскрытия (цитата) и пузыря ответа. */
export function titleTextStyle(size: AnnouncementTitleSize, color: string, align: Align): StyleProp<TextStyle> {
  return [t.h1, H1[size], { color, textAlign: align }];
}

// ── блоки (.p / .blk.acc / .blk.q) ───────────────────────────────────────────────────────────────────────────────

const BLOCK_SIZE: Readonly<Record<14 | 16 | 20, TextStyle>> = { 14: { fontSize: 14, lineHeight: 20 }, 16: { fontSize: 16, lineHeight: 22 }, 20: { fontSize: 20, lineHeight: 27 } }; // typo-exempt: макет stories-announcements-v1 — кегль и межстрочный кадра 1:1

export const AnnBlock = memo(function AnnBlock({ block, d, align = 'center' }: Readonly<{ block: AnnouncementV2Block; d: number; align?: Align }>) {
  const pal = useAnnPalette();
  const size = BLOCK_SIZE[block.size] ?? BLOCK_SIZE[16];
  if (block.style === 'accent') {
    return <Enter d={d} style={[t.blk, t.acc, { backgroundColor: mix(pal.tx, 0.1) }, align === 'left' ? t.leftBox : null]}><Text style={[size, t.accT, { color: pal.tx, textAlign: align }]}>{block.text}</Text></Enter>;
  }
  if (block.style === 'quote') {
    return (
      <Enter d={d} style={[t.blk, t.q, align === 'left' ? t.leftBox : null]}>
        <View style={[t.qBar, { backgroundColor: pal.accG }]} />
        <Text style={[size, t.qT, { color: pal.tx }]}>{block.text}</Text>
      </Enter>
    );
  }
  return <Enter d={d} style={[t.pBox, align === 'left' ? t.leftBox : null]}><Text style={[size, { color: block.size === 20 ? pal.tx : pal.sec, textAlign: align }]}>{block.text}</Text></Enter>;
});

/** Блоки объявления по очереди (blocks(list, d0, step) макета: d0 + 160·i). `max` — сколько держит кадр. */
export const AnnBlocks = memo(function AnnBlocks({ blocks, d0, step = 160, align = 'center', max = 4 }: Readonly<{ blocks: readonly AnnouncementV2Block[]; d0: number; step?: number; align?: Align; max?: number }>) {
  return <>{blocks.slice(0, max).map((b, i) => <AnnBlock key={`${i}-${b.text}`} block={b} d={d0 + i * step} align={align} />)}</>;
});

// ── большое число (.big) ─────────────────────────────────────────────────────────────────────────────────────────

export const bigStyle = StyleSheet.create({
  big: { fontSize: 96, lineHeight: 96, fontWeight: '800', letterSpacing: -4, textAlign: 'center', fontVariant: ['tabular-nums'] },
  m: { fontSize: 72, lineHeight: 76, fontWeight: '800', letterSpacing: -3, textAlign: 'center', fontVariant: ['tabular-nums'] },
  s: { fontSize: 56, lineHeight: 60, fontWeight: '800', letterSpacing: -2, textAlign: 'center', fontVariant: ['tabular-nums'] },
  box: { marginTop: 10, marginBottom: 4 },
});

export const t = StyleSheet.create({
  ovBox: { maxWidth: 334 },
  ov: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  h1Box: { marginTop: 8, alignSelf: 'stretch', alignItems: 'center' },
  leftBox: { alignItems: 'flex-start', alignSelf: 'flex-start' },
  h1: { fontWeight: '800' },
  words: { flexDirection: 'row', flexWrap: 'wrap' },
  pBox: { marginTop: 8, maxWidth: 320 },
  blk: { marginTop: 14, maxWidth: 320 },
  acc: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14 },
  accT: { fontWeight: '600' },
  q: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  qBar: { width: 2, borderRadius: 1 },
  qT: { fontStyle: 'italic', flexShrink: 1, textAlign: 'left' },
});
