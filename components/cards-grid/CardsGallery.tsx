/**
 * Галерея карточек — общий компонент всех списков Карточек (макет docs/design/v2-app/cards-section.html, движок cards-gallery.html «LOCKED:cards-engine»).
 *
 * зачем (владелец: «Карточки меняют размер и форму»): плитки лежат абсолютно и пересчитываются от одного значения масштаба (0…1) на UI-потоке —
 * число колонок, высота, скругление, кегль меняются плавно; мелкие плитки теряют транскрипцию, озвучку и точки. Тап по плитке открывает карточку
 * (переворот в списке убран решением владельца). Рисуются только плитки в окне прокрутки (+ запас), остальное не создаётся.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { LinearGradient } from '../SafeLinearGradient';
import { bevelShadow, mixDark, themePair } from '../mistakes-panel/panelPaint';
import {
  GALLERY_FONT,
  GALLERY_IPA,
  GALLERY_PAD,
  GALLERY_RADIUS,
  cssGradientPoints,
  galleryHeight,
  galleryLayoutFor,
  galleryPosition,
  galleryVisibleRange,
} from './cardsGalleryLayout';

const EXEMPT_COLOR_1 = 'rgba(0,0,0,0.8)'; // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
const EXEMPT_COLOR_2 = 'rgba(255,255,255,0.16)'; // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
const EXEMPT_COLOR_3 = 'rgba(255,255,255,0.04)'; // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
const EXEMPT_COLOR_4 = 'rgba(255,255,255,0)'; // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
const EXEMPT_COLOR_5 = 'rgba(255,255,255,0.05)'; // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
const EXEMPT_COLOR_6 = '#FFFFFF'; // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
const EXEMPT_COLOR_7 = 'rgba(255,255,255,0.22)'; // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
const EXEMPT_COLOR_8 = 'rgba(255,255,255,0.28)'; // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
const EXEMPT_COLOR_9 = '#04261D'; // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета

export type GalleryCard = Readonly<{
  id: string;
  front: string;
  ipa?: string | null;
  /** Сколько из четырёх точек «силы слова» закрашено (0 — точек нет). */
  dots?: number;
}>;

type Props = Readonly<{
  g: GlassTokens;
  cards: readonly GalleryCard[];
  /** Ширина сетки (экран минус поля). */
  width: number;
  scale: SharedValue<number>;
  /** Смещение прокрутки и высота окна — для окна отрисовки. */
  scrollY: number;
  viewportH: number;
  onOpen: (id: string) => void;
  onSpeak?: (id: string) => void;
  speakLabel?: string;
  /** Долгое нажатие на плитку (действия с карточкой). */
  onLongPress?: (id: string) => void;
  /** Режим выбора: отмеченные плитки получают галочку. */
  selectedIds?: ReadonlySet<string>;
  /** Строка поиска: совпадение в слове подчёркивается (макет, кадр «Поиск»). */
  highlight?: string;
}>;

// зачем (макет «Поиск»): найденный кусок слова подчёркнут, остальное как обычно.
function renderFront(front: string, highlight?: string): React.ReactNode {
  const needle = (highlight ?? '').trim().toLowerCase();
  if (!needle) return front;
  const at = front.toLowerCase().indexOf(needle);
  if (at < 0) return front;
  return (
    <>
      {front.slice(0, at)}
      <Text style={styles.match}>{front.slice(at, at + needle.length)}</Text>
      {front.slice(at + needle.length)}
    </>
  );
}

const FACE_ALPHA_TOP = 'E6';
const FACE_ALPHA_MID = 'DB';

const Tile = memo(function Tile({ card, index, lvl, scale, width, a, b, accent, onOpen, onSpeak, speakLabel, onLongPress, selected, highlight }: Readonly<{
  card: GalleryCard;
  index: number;
  lvl: number;
  scale: SharedValue<number>;
  width: number;
  a: string;
  b: string;
  accent: string;
  onOpen: (id: string) => void;
  onSpeak?: (id: string) => void;
  speakLabel?: string;
  onLongPress?: (id: string) => void;
  selected?: boolean | undefined;
  highlight?: string;
}>) {
  const style = useAnimatedStyle(() => {
    const layout = galleryLayoutFor(scale.value, width);
    const p = galleryPosition(index, layout);
    return { width: layout.w, height: layout.h, transform: [{ translateX: p.x }, { translateY: p.y }] };
  });
  const radius = GALLERY_RADIUS[lvl]!;
  const pad = GALLERY_PAD[lvl]!;
  const mid = useMemo(() => galleryLayoutFor((lvl + 0.5) / 4, width), [lvl, width]);
  const pts = useMemo(() => cssGradientPoints(145, mid.w, mid.h), [mid.h, mid.w]);
  const colors = useMemo(
    () => [`${mixDark(a, '#0A0A0E', 0.46)}${FACE_ALPHA_TOP}`, `#08080C${FACE_ALPHA_MID}`, `${mixDark(b, '#08080C', 0.4)}${FACE_ALPHA_MID}`] as const, // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
    [a, b],
  );
  const showIpa = lvl <= 1 && !!card.ipa;
  const full = lvl === 0;
  return (
    <Animated.View style={[styles.tile, style]}>
      <Pressable
        testID={`fc-gallery-tile-${card.id}`}
        accessibilityRole="button"
        accessibilityLabel={card.front}
        onPress={() => onOpen(card.id)}
        onLongPress={onLongPress ? () => onLongPress(card.id) : undefined}
        style={({ pressed }) => [styles.press, { borderRadius: radius, boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 30, spreadDistance: -14, color: EXEMPT_COLOR_1 }] }, pressed && styles.pressed]}>
        <View style={[styles.face, { borderRadius: radius, padding: pad }]}>
          <LinearGradient pointerEvents="none" colors={colors} locations={[0, 0.56, 1]} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
          {/* блик 150°: белый 16 % → 0 к 54 % */}
          <LinearGradient pointerEvents="none" colors={[EXEMPT_COLOR_2, EXEMPT_COLOR_3, EXEMPT_COLOR_4, EXEMPT_COLOR_5]} locations={[0, 0.28, 0.54, 1]} start={{ x: 0.25, y: 0.07 }} end={{ x: 0.75, y: 0.93 }} style={StyleSheet.absoluteFill} />
          {/* свечение цвета темы в правом верхнем углу */}
          <View pointerEvents="none" style={styles.glow}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100">
              <Defs>
                <RadialGradient id={`gl-${card.id}`} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor={a} stopOpacity={0.7} />
                  <Stop offset="1" stopColor={a} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx="50" cy="50" r="50" fill={`url(#gl-${card.id})`} />
            </Svg>
          </View>
          <Text style={[styles.en, { fontSize: GALLERY_FONT[lvl], lineHeight: Math.round(GALLERY_FONT[lvl]! * 1.15) }]}>{renderFront(card.front, highlight)}</Text>
          {showIpa ? <Text style={[styles.ipa, { fontSize: GALLERY_IPA[lvl] }]}>{card.ipa}</Text> : null}
          {full && onSpeak ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={speakLabel}
              hitSlop={8}
              onPress={() => onSpeak(card.id)}
              style={styles.speak}>
              <Ionicons name="volume-high" size={16} color={EXEMPT_COLOR_6} />
            </Pressable>
          ) : null}
          {full && card.dots ? (
            <View style={styles.dots} pointerEvents="none">
              {[0, 1, 2, 3].map((d) => <View key={d} style={[styles.dot, { backgroundColor: d < (card.dots ?? 0) ? accent : EXEMPT_COLOR_7 }]} />)}
            </View>
          ) : null}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: bevelShadow(EXEMPT_COLOR_8, `${a}66`) }]} />
          {selected !== undefined ? (
            <View pointerEvents="none" style={[styles.check, selected ? { backgroundColor: accent } : styles.checkOff]}>
              {selected ? <Ionicons name="checkmark" size={16} color={EXEMPT_COLOR_9} /> : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

function CardsGalleryInner({ g, cards, width, scale, scrollY, viewportH, onOpen, onSpeak, speakLabel, onLongPress, selectedIds, highlight }: Props) {
  const [a, b] = themePair(g);
  const [lvl, setLvl] = useState(() => galleryLayoutFor(scale.value, width).idx);
  // зачем: смена «ступени» (колонки 1…4) — редкое событие; на неё меняются скругление, поля, кегль и набор деталей (не покадрово).
  useAnimatedReaction(
    () => galleryLayoutFor(scale.value, width).idx,
    (value, previous) => { if (value !== previous) runOnJS(setLvl)(value); },
    [width],
  );
  const heightStyle = useAnimatedStyle(() => ({ height: galleryHeight(cards.length, galleryLayoutFor(scale.value, width)) }));
  const range = galleryVisibleRange(cards.length, galleryLayoutFor(scale.value, width), scrollY, viewportH);
  const visible = cards.slice(range.from, range.to);
  return (
    <Animated.View style={[styles.container, { width }, heightStyle]}>
      {visible.map((card, offset) => (
        <Tile
          key={card.id}
          card={card}
          index={range.from + offset}
          lvl={lvl}
          scale={scale}
          width={width}
          a={a}
          b={b}
          accent={g.accent}
          onOpen={onOpen}
          onSpeak={onSpeak}
          speakLabel={speakLabel}
          highlight={highlight}
          onLongPress={onLongPress}
          selected={selectedIds ? selectedIds.has(card.id) : undefined}
        />
      ))}
    </Animated.View>
  );
}

export const CardsGallery = memo(CardsGalleryInner);

const styles = StyleSheet.create({
  container: { position: 'relative' },
  tile: { position: 'absolute', left: 0, top: 0 },
  press: { flex: 1 },
  pressed: { transform: [{ scale: 0.965 }] },
  face: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: '80%', aspectRatio: 1, right: '-30%', top: '-40%', opacity: 0.55 },
  en: { width: '100%', textAlign: 'center', color: '#FFFFFF', fontWeight: '500', letterSpacing: -0.2 }, // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
  match: { textDecorationLine: 'underline' },
  ipa: { marginTop: 6, fontStyle: 'italic', color: 'rgba(255,255,255,0.62)', textAlign: 'center' }, // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
  speak: { position: 'absolute', right: 10, top: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }, // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
  dots: { position: 'absolute', left: 14, bottom: 11, flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  check: { position: 'absolute', left: 10, top: 10, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  checkOff: { backgroundColor: 'rgba(255,255,255,0.14)' }, // theme-exempt: плитка галереи — тёмное лицо карточки с цветом темы и светлым текстом, читаемо в любой теме по замыслу макета
});
