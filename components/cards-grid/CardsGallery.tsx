/**
 * Галерея карточек — общий компонент списков «Карточек» (макет docs/design/v2-app/cards-v2.html, сетка `.zg` и горизонтальная плитка `.wc`).
 *
 * зачем (Карточки 2.0, владелец 12.10): плитки лежат абсолютно и пересчитываются от шага (1 / 2 / 3 / 5 колонок) на UI-потоке: смена шага — перетекание
 * 380 мс (позиция и размер каждой плитки идут из старой раскладки в новую), содержимое плитки проявляется после 22 % пути. Лицо плитки по шагу:
 * 1 колонка — озвучка слева, «EN», слово 26, перевод 15, «⋯» справа; 2 — слово 20 и перевод, озвучка внизу справа; 3 и 5 — только слово.
 * Тап открывает карточку, долгое нажатие и «⋯» — действия. Рисуются только плитки в окне прокрутки (+ запас; на время перетекания — окно старой и новой раскладки).
 * Стиль «Тень»: плитку отделяет заливка плашки и тень темы, без обводки; цвета — токены темы.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import { PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { PlateFill, nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';
import {
  GALLERY_STEPS,
  galleryHeight,
  galleryLayoutFor,
  galleryPosition,
  galleryVisibleRange,
  unionRange,
} from './cardsGalleryLayout';
import { cardsPerfCount, cardsPerfMark } from './cardsPerfLog';
import type { GridMorph, GridState } from './useCardsScale';

export type GalleryCard = Readonly<{
  id: string;
  front: string;
  /** Перевод (на плитке 1 и 2 колонок). */
  back?: string | null;
  /** Больше не рисуются (макет cards-v2: на плитке только слово и перевод), поля оставлены для старых вызовов. */
  ipa?: string | null;
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

/** Размеры текста плитки по шагу (макет `.zg.s0…s3`): подпись EN, слово, перевод. Числа заданы здесь, а не литералами в стилях. */
const FACE = [
  { lg: 12, lgLine: 14, w: 26, wLine: 32, wTop: 6, tr: 15, trLine: 20, trTop: 2 },
  { lg: 11, lgLine: 14, w: 20, wLine: 25, wTop: 4, tr: 13.5, trLine: 18, trTop: 2 },
  { lg: 0, lgLine: 0, w: 15, wLine: 19, wTop: 0, tr: 0, trLine: 0, trTop: 0 },
  { lg: 0, lgLine: 0, w: 10.5, wLine: 13, wTop: 0, tr: 0, trLine: 0, trTop: 0 },
] as const;
const SPEAK_SIZE = [38, 28, 0, 0] as const;
// зачем: потолок системного масштаба шрифта в плитках 3/5 колонок — при 1.5 две строки слова (3 кол.) всё ещё лежат в плитке 62.
const MINI_MAX_FONT_SCALE = 1.5;

const Tile = memo(function Tile({ card, index, step, morph, width, g, onOpen, onSpeak, speakLabel, onLongPress, moreLabel, selected, highlight }: Readonly<{
  card: GalleryCard;
  index: number;
  step: number;
  morph: GridMorph;
  width: number;
  g: GlassTokens;
  onOpen: (id: string) => void;
  onSpeak?: (id: string) => void;
  speakLabel?: string;
  onLongPress?: (id: string) => void;
  moreLabel?: string;
  selected?: boolean | undefined;
  highlight?: string;
}>) {
  cardsPerfCount('tile-render'); // зачем: [CARDS-PERF] сколько плиток перерисовано за прокрутку (memo должен их держать)
  const { from, to, t, shift } = morph;
  const style = useAnimatedStyle(() => {
    const a = galleryLayoutFor(from.value, width);
    const b = galleryLayoutFor(to.value, width);
    const pa = galleryPosition(index, a);
    const pb = galleryPosition(index, b);
    const k = t.value;
    return {
      width: a.w + (b.w - a.w) * k,
      height: a.h + (b.h - a.h) * k,
      transform: [{ translateX: pa.x + (pb.x - pa.x) * k }, { translateY: (pa.y + shift.value) * (1 - k) + pb.y * k }],
    };
  });
  // зачем (макет: firstElementChild opacity 0 → 0 до 22 % → 1): содержимое плитки появляется после того, как плитка заняла почти новый размер
  const contentStyle = useAnimatedStyle(() => ({ opacity: t.value < 0.22 ? 0 : (t.value - 0.22) / 0.78 }));
  const def = GALLERY_STEPS[step]!;
  const f = FACE[step]!;
  const radius = def.radius;
  const showTranslation = step <= 1 && !!card.back;
  const speakSize = SPEAK_SIZE[step]!;
  const speakVisible = step <= 1 && !!onSpeak;
  // зачем (сверка Макетов e4e4149d0): в плитках 3 и 5 колонок высота плитки фиксирована (62 / 37), длинное слово раньше ломало её переносом без границы.
  // Режем по правилам: 2 строки (3 кол.) / 1 строка (5 кол.) + многоточие, БЕЗ adjustsFontSizeToFit; крупный шрифт ограничен 1.5, межстрочный растёт вместе с ним.
  const miniStep = step >= 2;
  const miniScale = miniStep ? Math.min(Math.max(PixelRatio.getFontScale(), 1), MINI_MAX_FONT_SCALE) : 1;
  const wordEl = (
    <Text
      numberOfLines={step === 2 ? 2 : step === 3 ? 1 : undefined}
      ellipsizeMode={miniStep ? 'tail' : undefined}
      maxFontSizeMultiplier={miniStep ? MINI_MAX_FONT_SCALE : undefined}
      style={[styles.word, { color: g.text, fontSize: f.w, lineHeight: miniStep ? Math.ceil(f.wLine * miniScale) : f.wLine, marginTop: f.wTop }, miniStep && styles.wordMini]}>
      {renderFront(card.front, highlight)}
    </Text>
  );
  const speakEl = speakVisible ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={speakLabel}
      hitSlop={8}
      onPress={() => onSpeak?.(card.id)}
      style={[
        step === 0 ? styles.speak0 : styles.speak1,
        { width: speakSize, height: speakSize, borderRadius: speakSize / 2, backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) },
      ]}>
      <Ionicons name="volume-high" size={step === 0 ? 18 : 14} color={g.text} />
    </Pressable>
  ) : null;
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
          <PlateFill g={g} radius={radius} />
          <Animated.View style={[StyleSheet.absoluteFill, contentStyle]}>
            {step === 0 ? (
              <View style={styles.row0}>
                {speakEl}
                <View style={styles.text}>
                  <Text style={[styles.lg, { color: g.secondary, fontSize: f.lg, lineHeight: f.lgLine }]}>EN</Text>
                  {wordEl}
                  {showTranslation ? <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.tr, { color: g.secondary, fontSize: f.tr, lineHeight: f.trLine, marginTop: f.trTop }]}>{card.back}</Text> : null}
                </View>
                {selected === undefined && onLongPress ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={moreLabel} hitSlop={10} onPress={() => onLongPress(card.id)} style={styles.more}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={g.secondary} />
                  </Pressable>
                ) : null}
              </View>
            ) : step === 1 ? (
              <View style={styles.col1}>
                <Text style={[styles.lg, { color: g.secondary, fontSize: f.lg, lineHeight: f.lgLine }]}>EN</Text>
                {wordEl}
                {/* зачем (координатор 13.10, cards-007): в двух колонках перевод «стоимость проезда» резался кнопкой звука («стоимость прое…»). Две строки вместо одной: полная подпись читается, высота плитки (96) вмещает 14+4+25+2+2×18; кнопка звука внизу справа второй строки не достаёт */}
                {showTranslation ? <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.tr, { color: g.secondary, fontSize: f.tr, lineHeight: f.trLine, marginTop: f.trTop }]}>{card.back}</Text> : null}
                {speakEl}
              </View>
            ) : (
              <View style={[styles.mini, { paddingHorizontal: step === 2 ? 12 : 7 }]}>{wordEl}</View>
            )}
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

function CardsGalleryInner({ g, cards, width, step: stepProp, morph: morphProp, morphFrom: morphFromProp, scale, scrollY, viewportH, onOpen, onSpeak, speakLabel, onLongPress, moreLabel, selectedIds, highlight }: Props) {
  const step = stepProp ?? scale?.step ?? 1;
  const morph = (morphProp ?? scale?.morph) as GridMorph;
  const morphFrom = morphFromProp ?? scale?.morphFrom ?? null;
  const { to, live, fx, fy } = morph;
  const heightStyle = useAnimatedStyle(() => ({
    height: galleryHeight(cards.length, galleryLayoutFor(to.value, width)),
    // живой отклик щипка: сетка тянется за пальцами вокруг точки опоры (translate → scale → translate обратно)
    transform: [{ translateX: fx.value }, { translateY: fy.value }, { scale: live.value }, { translateX: -fx.value }, { translateY: -fy.value }],
  }));
  const range = useMemo(() => {
    const now = galleryVisibleRange(cards.length, galleryLayoutFor(step, width), scrollY, viewportH);
    if (!morphFrom) return now;
    return unionRange(now, galleryVisibleRange(cards.length, galleryLayoutFor(morphFrom.step, width), Math.max(0, morphFrom.scrollY), viewportH));
  }, [cards.length, morphFrom, scrollY, step, viewportH, width]);
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
          width={width}
          g={g}
          onOpen={onOpen}
          onSpeak={onSpeak}
          speakLabel={speakLabel}
          moreLabel={moreLabel}
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
  pressed: { transform: [{ scale: 0.97 }] },
  face: { flex: 1, overflow: 'hidden' },
  row0: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 22, paddingLeft: 12, paddingRight: 46 },
  col1: { flex: 1, justifyContent: 'center', paddingLeft: 16, paddingRight: 44 },
  mini: { flex: 1, justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  lg: { fontWeight: '600' },
  word: { fontWeight: '600', letterSpacing: -0.2 },
  wordMini: { minWidth: 0, flexShrink: 1 },
  // зачем (R1_DIFF_ONE_FIX, cards-v2-006 / cards-section-008): макет `.wc .tr` — white-space: nowrap + ellipsis; перевод «стоимость проезда» переносился на две строки и делал карточку выше соседних
  tr: {},
  match: { textDecorationLine: 'underline' },
  speak0: { alignItems: 'center', justifyContent: 'center' },
  speak1: { position: 'absolute', right: 12, bottom: 12, alignItems: 'center', justifyContent: 'center' },
  more: { position: 'absolute', right: 18, top: 14 },
  check: { position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
