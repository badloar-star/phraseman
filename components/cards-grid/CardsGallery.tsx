/**
 * Галерея карточек — общий компонент списков «Карточек» (макет docs/design/v2-app/cards-v2.html, сетка `.zg` и горизонтальная плитка `.wc`; лицо плитки — cards-gallery.html `.face`).
 *
 * зачем (Карточки 2.0, владелец 12.10): плитки лежат абсолютно и пересчитываются от шага (1 / 2 / 3 / 5 колонок) на UI-потоке: смена шага — перетекание
 * 380 мс (позиция и размер каждой плитки идут из старой раскладки в новую), содержимое плитки проявляется после 22 % пути. Лицо плитки по шагу:
 * 1 колонка — озвучка слева, «EN», фраза, перевод, «⋯» справа; 2 — фраза и перевод, озвучка внизу справа; 3 и 5 — только фраза. Точки силы слова — слева снизу на шагах 1 и 2.
 * Тап открывает карточку, долгое нажатие и «⋯» — действия. Рисуются только плитки в окне прокрутки (+ запас; на время перетекания — окно старой и новой раскладки).
 * зачем (владелец 18.10, «текст ВСЕГДА помещается целиком», «карточки с градиентом и точками»): кегль и размеры — от ширины плитки (cardsGalleryFit), перенос по словам БЕЗ многоточия,
 * высота ряда растёт под самую длинную фразу (cardsGalleryGrid); фон плитки — градиент цвета темы со стеклом, бликом и свечением (GalleryTileFace); настоящее число строк плитка
 * сверяет с оценкой (onTextLayout) и при расхождении сообщает поправку (onFix).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { plateBoxShadow } from '../v2/ShadowSurface';
import { GALLERY_STEPS, unionRange } from './cardsGalleryLayout';
import { FIT_MAX_FONT_SCALE } from './cardsGalleryFit';
import { gridVisibleRange, type GalleryGrid, type GalleryGrids, type TileGeom } from './cardsGalleryGrid';
import { cardsPerfCount, cardsPerfMark } from './cardsPerfLog';
import { GalleryTileFace } from './GalleryTileFace';
import { galleryFaceColors } from './galleryFaceColors';
import type { GridMorph, GridState } from './useCardsScale';
import { useGalleryGrids } from './useGalleryGrids';

export type GalleryCard = Readonly<{
  id: string;
  front: string;
  /** Перевод (на плитке 1 и 2 колонок). */
  back?: string | null;
  ipa?: string | null;
  /** Сила слова: сколько точек горит (0…3); undefined — точек на плитке нет (чужие экраны). */
  dots?: number;
}>;

type Props = Readonly<{
  g: GlassTokens;
  cards: readonly GalleryCard[];
  /** Ширина сетки (экран минус поля). */
  width: number;
  step?: number;
  morph?: GridMorph;
  /** Если идёт перетекание — из какого шага и с какой прокруткой (окно отрисовки покрывает обе раскладки). */
  morphFrom?: Readonly<{ step: number; scrollY: number }> | null;
  /** Совместимость: состояние из старого хука `useCardsScale` вместо `step/morph/morphFrom`. */
  scale?: GridState;
  /** Смещение прокрутки относительно верха сетки и высота окна — для окна отрисовки. */
  scrollY: number;
  viewportH: number;
  onOpen: (id: string) => void;
  onSpeak?: (id: string) => void;
  speakLabel?: string;
  /** Долгое нажатие на плитку и «⋯» (действия с карточкой). */
  onLongPress?: (id: string) => void;
  moreLabel?: string;
  /** Режим выбора: отмеченные плитки получают галочку. */
  selectedIds?: ReadonlySet<string>;
  /** Строка поиска: совпадение в слове подчёркивается (макет, кадр «Поиск»). */
  highlight?: string;
  /** Готовые сетки (экран считает их сам, чтобы докрутка и окно шли по одним и тем же рядам); без них галерея считает свои. */
  grids?: GalleryGrids;
  onFix?: (cardId: string, step: number, extraPx: number) => void;
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

/** Кнопка звука: 38 / 28 px в макете (× масштаб); на шагах 3 и 5 колонок её нет. */
const SPEAK_SIZE = [38, 28, 0, 0] as const;
const DOT = 6;

const Tile = memo(function Tile({ card, index, step, morph, geoms, gridStep, g, onOpen, onSpeak, speakLabel, onLongPress, moreLabel, selected, highlight, onFix }: Readonly<{
  card: GalleryCard;
  index: number;
  step: number;
  morph: GridMorph;
  geoms: readonly TileGeom[];
  gridStep: GalleryGrid;
  g: GlassTokens;
  onOpen: (id: string) => void;
  onSpeak?: (id: string) => void;
  speakLabel?: string;
  onLongPress?: (id: string) => void;
  moreLabel?: string;
  selected?: boolean | undefined;
  highlight?: string;
  onFix?: (cardId: string, step: number, extraPx: number) => void;
}>) {
  cardsPerfCount('tile-render'); // зачем: [CARDS-PERF] сколько плиток перерисовано за прокрутку (memo должен их держать)
  const { from, to, t, shift } = morph;
  const style = useAnimatedStyle(() => {
    const a = geoms[Math.round(from.value)]!;
    const b = geoms[Math.round(to.value)]!;
    const k = t.value;
    return {
      width: a.w + (b.w - a.w) * k,
      height: a.h + (b.h - a.h) * k,
      transform: [{ translateX: a.x + (b.x - a.x) * k }, { translateY: (a.y + shift.value) * (1 - k) + b.y * k }],
    };
  });
  // зачем (макет: firstElementChild opacity 0 → 0 до 22 % → 1): содержимое плитки появляется после того, как плитка заняла почти новый размер
  const contentStyle = useAnimatedStyle(() => ({ opacity: t.value < 0.22 ? 0 : (t.value - 0.22) / 0.78 }));
  const face = gridStep.face;
  const geom = geoms[step]!;
  const radius = GALLERY_STEPS[step]!.radius;
  const colors = galleryFaceColors(g);
  const showTranslation = face.translation && !!card.back;
  const speakSize = Math.round(SPEAK_SIZE[step]! * face.k);
  const speakVisible = step <= 1 && !!onSpeak;
  // зачем (владелец 18.10: «карточка всегда горизонтальная; не влезает — уменьши кегль»): кегль этой карточки — после уменьшения под потолок высоты (cardsGalleryFit.fitWithin)
  const fit = gridStep.fit(index);
  // настоящее число строк против оценки — если шрифт устройства шире таблицы, плитка получает поправку и вырастает, а не режет текст
  const onWordLines = (lines: number) => { if (lines > fit.wordLines) onFix?.(card.id, step, (lines - fit.wordLines) * fit.wordLine); };
  const onTrLines = (lines: number) => { if (lines > fit.trLines) onFix?.(card.id, step, (lines - fit.trLines) * fit.trLine); };
  const wordEl = (
    <Text
      maxFontSizeMultiplier={FIT_MAX_FONT_SCALE}
      onTextLayout={(e) => onWordLines(e.nativeEvent.lines.length)}
      style={[styles.word, { color: colors.ink, fontSize: fit.wordSize, lineHeight: fit.wordLine, marginTop: face.wordTop }]}>
      {renderFront(card.front, highlight)}
    </Text>
  );
  const trEl = showTranslation ? (
    <Text
      maxFontSizeMultiplier={FIT_MAX_FONT_SCALE}
      onTextLayout={(e) => onTrLines(e.nativeEvent.lines.length)}
      style={{ color: colors.inkSoft, fontSize: fit.trSize, lineHeight: fit.trLine, marginTop: face.trTop }}>{card.back}</Text>
  ) : null;
  const labelEl = face.label ? <Text style={[styles.lg, { color: colors.inkSoft, fontSize: face.lgSize, lineHeight: face.lgLine }]}>EN</Text> : null;
  const speakEl = speakVisible ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={speakLabel}
      hitSlop={8}
      onPress={() => onSpeak?.(card.id)}
      style={[step === 0 ? styles.speak0 : [styles.speak1, { right: 12 * face.k, bottom: 12 * face.k }], { width: speakSize, height: speakSize, borderRadius: speakSize / 2, backgroundColor: colors.speakBg }]}>
      <Ionicons name="volume-high" size={Math.round((step === 0 ? 18 : 14) * face.k)} color={colors.ink} />
    </Pressable>
  ) : null;
  // зачем (владелец 18.10: «с точечками»; макет `.face .dots`: слева снизу, 6 px, зазор 4, заполненные — цвет акцента темы): силу слова показываем на шагах 1 и 2 колонки
  const dotsEl = step <= 1 && card.dots !== undefined ? (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" testID={`fc-gallery-dots-${card.id}`} style={[styles.dots, { left: 14 * face.k, bottom: 11 * face.k }]}>
      {[0, 1, 2].map((i) => <View key={i /* guard-ok: три статичные точки, порядок не меняется */} style={[styles.dot, { backgroundColor: i < (card.dots ?? 0) ? colors.dotOn : colors.dotOff }]} />)}
    </View>
  ) : null;
  const pad = { paddingLeft: face.padL, paddingRight: face.padR, paddingTop: face.padV, paddingBottom: face.padV + face.foot };
  return (
    <Animated.View style={[styles.tile, style]}>
      <Pressable
        testID={`fc-gallery-tile-${card.id}`}
        accessibilityRole="button"
        accessibilityLabel={card.back ? `${card.front}, ${card.back}` : card.front}
        onPress={() => onOpen(card.id)}
        onLongPress={onLongPress ? () => onLongPress(card.id) : undefined}
        style={({ pressed }) => [styles.press, { borderRadius: radius, boxShadow: plateBoxShadow(g) }, pressed && styles.pressed]}>
        <View style={[styles.face, { borderRadius: radius }]}>
          <GalleryTileFace g={g} w={geom.w} h={geom.h} />
          {/* зачем (владелец 18.10): содержимое держит размер ЦЕЛЕВОЙ плитки, а не бегущий — во время перетекания между шагами текст не пересчитывает перенос по сужающейся ширине (иначе onTextLayout принимал промежуточные строки за нехватку места и плитки раздувались), лишнее срезает сама плитка */}
          <Animated.View style={[styles.content, { width: geom.w, height: geom.h }, contentStyle]}>
            {step === 0 ? (
              <View style={[styles.row0, { paddingLeft: face.padL, paddingRight: face.padR, gap: 22 * face.k }]}>
                {speakEl}
                <View style={styles.text}>{labelEl}{wordEl}{trEl}</View>
                {selected === undefined && onLongPress ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={moreLabel} hitSlop={10} onPress={() => onLongPress(card.id)} style={[styles.more, { right: 18 * face.k, top: 14 * face.k }]}>
                    <Ionicons name="ellipsis-horizontal" size={Math.round(20 * face.k)} color={colors.inkSoft} />
                  </Pressable>
                ) : null}
              </View>
            ) : step === 1 ? (
              <View style={[styles.col1, pad]}>{labelEl}{wordEl}{trEl}{speakEl}</View>
            ) : (
              <View style={[styles.mini, pad]}>{wordEl}{trEl}</View>
            )}
            {dotsEl}
          </Animated.View>
          {selected !== undefined ? (
            <View pointerEvents="none" style={[styles.check, selected ? { backgroundColor: g.accent } : { backgroundColor: g.dividerTone }]}>
              {selected ? <Ionicons name="checkmark" size={step >= 2 ? 12 : 16} color={g.accentInk} /> : null}
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

function CardsGalleryInner({ g, cards, width, step: stepProp, morph: morphProp, morphFrom: morphFromProp, scale, scrollY, viewportH, onOpen, onSpeak, speakLabel, onLongPress, moreLabel, selectedIds, highlight, grids: gridsProp, onFix: onFixProp }: Props) {
  const step = stepProp ?? scale?.step ?? 1;
  const morph = (morphProp ?? scale?.morph) as GridMorph;
  const morphFrom = morphFromProp ?? scale?.morphFrom ?? null;
  const { to, live, fx, fy } = morph;
  // зачем: экран, который сам считает сетки (Сохранённые), передаёт их сюда; остальные (предпросмотр набора сообщества) получают свои
  const own = useGalleryGrids(gridsProp ? EMPTY_CARDS : cards, width);
  const grids = gridsProp ?? own.grids;
  const onFix = onFixProp ?? own.reportFix;
  // зачем: в рабочий поток уходит только массив из четырёх высот, а не весь объект сеток (в нём функции и сотни чисел по рядам)
  const heights = grids.heights;
  const heightStyle = useAnimatedStyle(() => ({
    height: heights[Math.round(to.value)] ?? 0,
    // живой отклик щипка: сетка тянется за пальцами вокруг точки опоры (translate → scale → translate обратно)
    transform: [{ translateX: fx.value }, { translateY: fy.value }, { scale: live.value }, { translateX: -fx.value }, { translateY: -fy.value }],
  }));
  const range = useMemo(() => {
    const now = gridVisibleRange(grids.grids[step]!, cards.length, scrollY, viewportH);
    if (!morphFrom) return now;
    return unionRange(now, gridVisibleRange(grids.grids[morphFrom.step]!, cards.length, Math.max(0, morphFrom.scrollY), viewportH));
  }, [cards.length, grids, morphFrom, scrollY, step, viewportH]);
  const visible = cards.slice(range.from, range.to);
  cardsPerfCount('gallery-render');
  cardsPerfMark('tiles-in-window', visible.length);
  cardsPerfMark('cards-total', cards.length);
  return (
    <Animated.View style={[styles.container, { width }, heightStyle]}>
      {visible.map((card, offset) => (
        <Tile
          key={card.id}
          card={card}
          index={range.from + offset}
          step={step}
          morph={morph}
          geoms={grids.geoms(range.from + offset)}
          gridStep={grids.grids[step]!}
          g={g}
          onOpen={onOpen}
          onSpeak={onSpeak}
          speakLabel={speakLabel}
          moreLabel={moreLabel}
          highlight={highlight}
          onLongPress={onLongPress}
          selected={selectedIds ? selectedIds.has(card.id) : undefined}
          onFix={onFix}
        />
      ))}
    </Animated.View>
  );
}

const EMPTY_CARDS: readonly GalleryCard[] = [];

export const CardsGallery = memo(CardsGalleryInner);

const styles = StyleSheet.create({
  container: { position: 'relative' },
  tile: { position: 'absolute', left: 0, top: 0 },
  press: { flex: 1 },
  pressed: { transform: [{ scale: 0.97 }] },
  face: { flex: 1, overflow: 'hidden' },
  content: { position: 'absolute', left: 0, top: 0 },
  row0: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  col1: { flex: 1, justifyContent: 'center' },
  mini: { flex: 1, justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  lg: { fontWeight: '600' },
  word: { fontWeight: '600', letterSpacing: -0.2, minWidth: 0 },
  match: { textDecorationLine: 'underline' },
  speak0: { alignItems: 'center', justifyContent: 'center' },
  speak1: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  more: { position: 'absolute' },
  dots: { position: 'absolute', flexDirection: 'row', gap: 4 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  check: { position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
