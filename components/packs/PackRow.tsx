/**
 * ОДНА строка набора для всех мест показа наборов: каталог «Наборы сообщества», поиск, «Мои наборы»,
 * выбор набора в настройке тренировки, набор внутри (шапка просмотра).
 *
 * зачем (владелец, OWNER_REQUESTS_LEDGER строки 4, 5, 9, 29; пакет packs-author-title-row-height-2026-10-11):
 *   • плашка набора сообщества — Вариант 1 «Плитка-счётчик» (docs/design/v2-app/community-redesign.html #c1, `plate1`):
 *     слева плитка с числом и подписью «карточек», название на всю ширину (бейдж «Топ» стоит В строке названия и
 *     его не ужимает), автор с монетой ранга и счётчики, справа круглая «+» — добавить себе;
 *   • строки ОДНОЙ фиксированной высоты под максимум две строки названия (packRowHeight: межстрочный × 2 с учётом
 *     масштаба шрифта), многоточие только если не влезает, плитка и «+»/шеврон — по центру по вертикали;
 *   • название чистится от хвоста файла (formatPackTitleForDisplay → cleanPackSourceTitle Ядра) прямо здесь,
 *     даже если вызывающий забыл: строка набора — последний рубеж перед глазами человека.
 * Замена вида плашки в будущем — правка ЭТОГО файла, а не четырёх экранов.
 *
 * Нажатие — kit `.t` (KitTouchable: вдавливание 90 мс до .97, отпускание 240 мс cubic-bezier(.3,1.4,.5,1)).
 * Без обводок-контейнеров: кромка — внутренние тени поверхности (KitSurface), как у карточек 2.0.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { CountPill, KitCheck, KitIconTile, KitSurface } from '../cards-grid/CardsKit';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow, raisedBoxShadow, RAISED_LIFT } from '../v2/ShadowSurface';
import { KitTouchable } from '../KitTouchable';
import { LinearGradient } from '../SafeLinearGradient';
import { mixDark, themePair } from '../mistakes-panel/panelPaint';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural';
import { useLineScale } from '../../hooks/useLineScale';
import { coinRankRowForDisplay, isValidCoinRank } from '../../app/coin_rank_table_v1';
import { formatPackTitleForDisplay } from '../../app/flashcards/marketplace';
import { ClampedText } from '../text-integrity/ClampedText';
import {
  COUNT_TILE_MAX_FONT_SCALE,
  PACK_ROW_BADGE_LINE,
  PACK_ROW_METRICS,
  PACK_ROW_TITLE_LINES,
  countTileWidth,
  packRowHeight,
  splitTitleHighlight,
  type PackRowVariant,
} from './packRowModel';
import { PACK_DECK_METRICS, packDeckCountLevel } from './packDeckModel';

type IonName = keyof typeof Ionicons.glyphMap;

export type PackRowLeading =
  | Readonly<{ kind: 'count'; count: number }>
  | Readonly<{ kind: 'icon'; icon: IonName }>;

/** Долгое нажатие макета #c1 (экран 3): нажатая плашка приподнята, остальные приглушены. */
export type PackRowEmphasis = 'normal' | 'lifted' | 'dimmed';

type Props = Readonly<{
  variant: PackRowVariant;
  g: GlassTokens;
  lang: Lang;
  /** Название как есть — строка сама уберёт хвост файла. */
  title: string;
  testID: string;
  titleTestID?: string;
  accessibilityLabel?: string;
  leading: PackRowLeading;
  /** «Топ» — бейдж в строке названия (не отнимает ширину у названия). */
  badge?: string | null;
  /** Строка поиска: совпадение в названии подсвечивается цветом акцента (`.hl`). */
  highlight?: string;
  /** Вторая строка — готовый узел (автор и счётчики), ровно одна строка высотой metaLine. */
  meta?: React.ReactNode;
  /** Вторая строка простым текстом (kit `.row .st`). */
  subtitle?: string;
  trailing?: React.ReactNode;
  emphasis?: PackRowEmphasis;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Действия доступности строки (например «Добавить себе»): вложенная кнопка внутри доступной строки не видна VoiceOver. */
  a11yActions?: readonly Readonly<{ name: string; label: string; run: () => void }>[];
}>;

/** «500 карточек» — подпись плитки-счётчика (`.ct span`). */
export function packCardsWord(lang: Lang, count: number): string {
  return triLang(lang, {
    ru: pluralWord(lang, count, { one: 'карточка', few: 'карточки', many: 'карточек' }),
    uk: pluralWord(lang, count, { one: 'картка', few: 'картки', many: 'карток' }),
    en: count === 1 ? 'card' : 'cards',
    es: count === 1 ? 'tarjeta' : 'tarjetas',
    'pt-BR': count === 1 ? 'cartão' : 'cartões',
    vi: 'thẻ',
    id: 'kartu',
    tr: 'kart',
    pl: pluralWord(lang, count, { one: 'karta', few: 'karty', many: 'kart' }),
  });
}

/** `.ct` макета: плитка 68 с числом 23/26 и подписью; градиент 150° из акцента и второго цвета темы. */
const CountTile = memo(function CountTile({ g, lang, count, height }: Readonly<{ g: GlassTokens; lang: Lang; count: number; height: number }>) {
  const lh = useLineScale();
  const { fontScale } = useWindowDimensions();
  const [, b] = themePair(g);
  const m = PACK_ROW_METRICS.plate;
  const colors = useMemo(() => [mixDark(g.accent, g.deepBase, 0.3), mixDark(b, g.deepBaseAlt, 0.34)] as const, [g.accent, g.deepBase, g.deepBaseAlt, b]); // light-accent-ok: тёмная плитка, акцент смешан с глубоким фоном (mixDark)
  // зачем (ревью 11.10, п.6): при шрифте 1.1–1.3 «карточек» рвалось посередине в ширине 60. Тексты плитки растут не больше
  // COUNT_TILE_MAX_FONT_SCALE (это предел масштаба, а не ужатие шрифта), а ширина плитки растёт тем же множителем —
  // слово и 4-значное число помещаются при любом системном шрифте (расчёт — countTileWidth / тест pack_row_title_author).
  const width = countTileWidth(fontScale);
  return (
    <View
      style={[styles.countTile, {
        width,
        height,
        borderRadius: m.tileRadius,
        boxShadow: nestedBoxShadow(g), // стиль «Тень»: плитка без кольца и фаски — малая тень
      }]}
    >
      <LinearGradient pointerEvents="none" colors={colors} start={{ x: 0.25, y: 0.07 }} end={{ x: 0.75, y: 0.93 }} style={[StyleSheet.absoluteFill, { borderRadius: m.tileRadius }]} />
      <Text maxFontSizeMultiplier={COUNT_TILE_MAX_FONT_SCALE} style={[styles.countNum, { color: g.text, lineHeight: lh(26, COUNT_TILE_MAX_FONT_SCALE) }]}>{count}</Text>
      <Text maxFontSizeMultiplier={COUNT_TILE_MAX_FONT_SCALE} style={[styles.countWord, { color: g.secondary, lineHeight: lh(16, COUNT_TILE_MAX_FONT_SCALE) }]}>{packCardsWord(lang, count)}</Text>
    </View>
  );
});

function PackRowBase({
  variant, g, lang, title, testID, titleTestID, accessibilityLabel, leading, badge, highlight, meta, subtitle, trailing,
  emphasis = 'normal', onPress, onLongPress, disabled, style, a11yActions,
}: Props) {
  const lh = useLineScale();
  const m = PACK_ROW_METRICS[variant];
  // зачем: высота задана заранее, а не «по содержимому» — короткое и длинное название дают одинаковые строки.
  const height = packRowHeight(variant, lh);
  const shown = formatPackTitleForDisplay(title);
  const parts = splitTitleHighlight(shown, highlight);
  const tileHeight = height - m.padTop - m.padBottom;
  const titleLine = lh(m.titleLine);
  const badgeHeight = lh(PACK_ROW_BADGE_LINE);

  const surface = (
      <KitSurface
        g={g}
        radius={m.radius}
        style={[styles.surface, {
          height,
          paddingTop: m.padTop,
          paddingBottom: m.padBottom,
          paddingLeft: m.padLeft,
          paddingRight: m.padRight,
          gap: m.gap,
        }]}
      >
        {leading.kind === 'count'
          ? <CountTile g={g} lang={lang} count={leading.count} height={tileHeight} />
          : <KitIconTile g={g} icon={leading.icon} />}
        <View style={styles.body}>
          {/* зачем: владелец (журнал 9) прямо велел «название до 2 строк, многоточие только если не влезает»; обрезка —
              только через семантический примитив ClampedText (решение координатора 11.10 по сторожу обрезки). */}
          <ClampedText
            testID={titleTestID}
            maxLines={PACK_ROW_TITLE_LINES}
            accessibilityRole={onPress ? undefined : 'header'}
            style={[styles.title, { color: g.text, fontSize: m.titleSize, lineHeight: titleLine }]}
          >
            {parts.before}
            {parts.match ? <Text style={{ color: g.accentText }}>{parts.match}</Text> : null}
            {parts.after}
            {badge ? (
              <>
                {'  '}
                {/* зачем (ревью 11.10, п.7): высота бейджа = badgeHeight ≤ межстрочного названия при ЛЮБОМ масштабе
                    (оба через lh) — строка названия не раздувается и вторая строка не срезается фиксированной высотой. */}
                <View style={[styles.badge, { backgroundColor: g.accent, height: badgeHeight, borderRadius: badgeHeight / 2 }]}>
                  <Text style={[styles.badgeText, { color: g.accentInk, lineHeight: badgeHeight }]}>{badge}</Text>
                </View>
              </>
            ) : null}
          </ClampedText>
          {meta ? <View style={[styles.meta, { height: lh(m.metaLine), marginTop: m.metaGap }]}>{meta}</View> : null}
          {!meta && subtitle ? (
            <ClampedText maxLines={1} style={[styles.subtitle, { color: g.secondary, fontSize: m.metaSize, lineHeight: lh(m.metaLine) }]}>{subtitle}</ClampedText>
          ) : null}
        </View>
        {trailing}
      </KitSurface>
  );

  // зачем: подъём/приглушение (`.pl.up` / `.pl.dm`) — на обёртке: KitTouchable сам управляет transform нажатия,
  // и scale(1.025) на нём перетёрся бы анимацией kit-нажатия. Скругление обёртки = скругление плашки, иначе тень
  // приподнятой плашки рисуется с прямыми углами (ревью 11.10, п.5).
  return (
    <View
      style={[
        { borderRadius: m.radius },
        emphasis === 'dimmed' ? styles.dimmed : null,
        emphasis === 'lifted' ? [styles.lifted, { boxShadow: raisedBoxShadow(g) }] : null,
        style,
      ]}
    >
      {onPress ? (
        <KitTouchable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? shown}
          accessibilityState={{ disabled: !!disabled }}
          // зачем (ревью 11.10, п.11): «+» лежит внутри доступной кнопки строки, VoiceOver его не увидит —
          // то же действие отдаём строке как действие доступности.
          accessibilityActions={a11yActions?.map(({ name, label }) => ({ name, label }))}
          onAccessibilityAction={a11yActions ? (event) => a11yActions.find((a) => a.name === event.nativeEvent.actionName)?.run() : undefined}
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={onLongPress ? 420 : undefined}
          disabled={disabled}
        >
          {surface}
        </KitTouchable>
      ) : (
        // Без нажатия (шапка набора внутри) — обычный контейнер: вложенные кнопки (отклики) доступны по отдельности.
        <View testID={testID}>{surface}</View>
      )}
    </View>
  );
}

export const PackRow = memo(PackRowBase);
export default PackRow;

// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// «КОЛОДА» — Карточки 2.0 (docs/design/v2-app/cards-v2.html: deck(), mySets(), catalog()).
//
// зачем здесь, а не отдельным файлом: ClampedText (единственное разрешённое место обрезки строк наборов) импортируется ТОЛЬКО
// из этого файла (трещотка tests/pack_row_shared_contract.test.ts). Стопка — тот же «набор в списке», что и PackRow, и общая для
// «Моих наборов», каталога сообщества и поиска: меняется вид стопки — правим ЭТОТ блок, а не три экрана.
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

type DeckProps = Readonly<{
  g: GlassTokens;
  lang: Lang;
  title: string;
  testID: string;
  titleTestID?: string;
  accessibilityLabel?: string;
  /** Число карточек набора. */
  count: number;
  /** Уровень A1–C2; null — «· A2» скрыто (данных ждём от Ядра). */
  level?: string | null;
  /** Первые слова набора для трёх чипов; пусто — ряд чипов не рисуется. */
  words?: readonly string[];
  /** Автор добавленного набора: аватар + имя перед числом (`Ирина · 49 · B2`); у своих наборов null. */
  author?: Readonly<{ name: string; coinRank?: number | null }> | null;
  authorTestID?: string;
  /** Статус набора в подписи («На проверке»); пусто — не показывается. */
  note?: string | null;
  highlight?: string;
  emphasis?: PackRowEmphasis;
  /** Правый край карточки: круглая «играть» (Мои наборы) или ♥ (каталог). */
  trailing?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  a11yActions?: readonly Readonly<{ name: string; label: string; run: () => void }>[];
}>;

/** `.mc` — чип слова: тон `dividerTone` и малая тень (стиль «Тень», без кольца), слово 13/600 в одну строку. */
const DeckWordChip = memo(function DeckWordChip({ g, word, lineHeight }: Readonly<{ g: GlassTokens; word: string; lineHeight: number }>) {
  return (
    <View style={[styles.deckChip, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}>
      <ClampedText maxLines={1} style={[styles.deckChipText, { color: g.text, lineHeight }]}>{word}</ClampedText>
    </View>
  );
});

/** `.av` — аватар автора 22: монета ранга, если она есть, иначе значок человека на тоне контрола. */
const DeckAvatar = memo(function DeckAvatar({ g, coinRank }: Readonly<{ g: GlassTokens; coinRank?: number | null }>) {
  const coin = isValidCoinRank(coinRank) ? coinRankRowForDisplay(coinRank) : null;
  const size = PACK_DECK_METRICS.avatarSize;
  if (coin) return <Image source={coin.source} style={{ width: size, height: size }} contentFit="contain" accessible={false} />;
  return (
    <View style={[styles.deckAvatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: g.opaqueControl }]}>
      <Ionicons name="person" size={14} color={g.mutedText} />
    </View>
  );
});

function PackDeckBase({
  g, lang, title, testID, titleTestID, accessibilityLabel, count, level = null, words = [], author = null, authorTestID, note = null,
  highlight, emphasis = 'normal', trailing, onPress, onLongPress, disabled, style, a11yActions,
}: DeckProps) {
  const lh = useLineScale();
  const m = PACK_DECK_METRICS;
  const shown = formatPackTitleForDisplay(title);
  const parts = splitTitleHighlight(shown, highlight);
  const countLevel = packDeckCountLevel(count, level);
  const countText = countLevel.needsUnit ? `${countLevel.text} ${packCardsWord(lang, count)}` : countLevel.text;
  const baseSub = author ? `${author.name} · ${countText}` : countText;
  // зачем (координатор 12.10, мёртвый бейдж «На проверке»): статус набора автора живёт в подписи стопки, а не на удалённой плитке хаба
  const subText = note ? `${baseSub} · ${note}` : baseSub;
  const chipLine = lh(18);

  const body = (
    <View style={[styles.deck, { paddingTop: m.stackTop }]}>
      {/* зачем: два слоя стопки сзади (`.dk.a` / `.dk.b`) — глубина стопки; без собственной тени, их кромка — только тон и прозрачность. */}
      {[m.layerA, m.layerB].map((layer) => (
        <View
          key={layer.top}
          pointerEvents="none"
          style={[styles.deckLayer, {
            top: layer.top,
            left: `${(100 - layer.widthPct) / 2}%`,
            width: `${layer.widthPct}%`,
            height: m.layerHeight,
            borderRadius: m.layerRadius,
            opacity: layer.opacity,
          }]}
        >
          <PlateFill g={g} radius={m.layerRadius} />
        </View>
      ))}
      <View
        style={{
          borderRadius: m.radius,
          paddingTop: m.padTop,
          paddingBottom: m.padBottom,
          paddingLeft: m.padLeft,
          paddingRight: m.padRight,
          boxShadow: plateBoxShadow(g),
        }}
      >
        <PlateFill g={g} radius={m.radius} />
        <View style={styles.deckHead}>
          <View style={styles.deckText}>
            <ClampedText
              testID={titleTestID}
              maxLines={2}
              accessibilityRole={onPress ? undefined : 'header'}
              style={[styles.deckTitle, { color: g.text, lineHeight: lh(m.titleLine) }]}
            >
              {parts.before}
              {parts.match ? <Text style={{ color: g.accentText }}>{parts.match}</Text> : null}
              {parts.after}
            </ClampedText>
            <View style={[styles.deckSub, { marginTop: m.subGap }]}>
              {author ? <DeckAvatar g={g} coinRank={author.coinRank} /> : null}
              <ClampedText testID={authorTestID} maxLines={1} style={[styles.deckSubText, { color: g.secondary, lineHeight: lh(m.subLine) }]}>{subText}</ClampedText>
            </View>
          </View>
          {trailing}
        </View>
        {words.length > 0 ? (
          <View style={[styles.deckChips, { marginTop: m.chipsTop, gap: m.chipsGap }]}>
            {words.map((word, index) => <DeckWordChip key={`${index}:${word}`} g={g} word={word} lineHeight={chipLine} />)}
          </View>
        ) : null}
      </View>
    </View>
  );

  // зачем: подъём/приглушение — на обёртке (как у PackRow): KitTouchable сам управляет transform нажатия.
  return (
    <View
      style={[
        { borderRadius: m.radius },
        emphasis === 'dimmed' ? styles.dimmed : null,
        emphasis === 'lifted' ? [styles.lifted, { boxShadow: raisedBoxShadow(g) }] : null,
        style,
      ]}
    >
      {onPress ? (
        <KitTouchable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? shown}
          accessibilityState={{ disabled: !!disabled }}
          accessibilityActions={a11yActions?.map(({ name, label }) => ({ name, label }))}
          onAccessibilityAction={a11yActions ? (event) => a11yActions.find((a) => a.name === event.nativeEvent.actionName)?.run() : undefined}
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={onLongPress ? 420 : undefined}
          disabled={disabled}
        >
          {body}
        </KitTouchable>
      ) : (
        <View testID={testID}>{body}</View>
      )}
    </View>
  );
}

export const PackDeck = memo(PackDeckBase);

/** `.pl` — круглая «играть» 44 на цвете акцента, цветная тень кнопки действия. */
export const PackDeckPlayButton = memo(function PackDeckPlayButton({ g, label, onPress, testID, disabled }: Readonly<{ g: GlassTokens; label: string; onPress: () => void; testID: string; disabled?: boolean }>) {
  const size = PACK_DECK_METRICS.playSize;
  return (
    <KitTouchable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={[styles.deckPlay, { width: size, height: size, borderRadius: size / 2, backgroundColor: g.accent, boxShadow: actionBoxShadow(g) }]}
    >
      <Ionicons name="play" size={20} color={g.accentInk} />
    </KitTouchable>
  );
});

/** `likes()` каталога — ♥ и число справа в стопке, вторичным тоном. Число — счётчик, не подпись. */
export const PackDeckLikes = memo(function PackDeckLikes({ g, value }: Readonly<{ g: GlassTokens; value: number }>) {
  const lh = useLineScale();
  return (
    <View style={styles.deckLikes} accessible accessibilityLabel={String(value)}>
      <Ionicons name="heart-outline" size={18} color={g.secondary} />
      <Text style={[styles.deckLikesText, { color: g.secondary, lineHeight: lh(18) }]}>{value}</Text>{/* guard-ok: счётчик, не подпись */}
    </View>
  );
});

type MetaProps = Readonly<{
  g: GlassTokens;
  authorName: string;
  coinRank?: number | null;
  likes: number;
  added: number;
  comments: number;
  /** Цена набора (руны) — свойство набора, пишется рядом с автором; 0 — не показываем. */
  priceRunes?: number;
  authorTestID?: string;
  /** Экран набора: тап по счётчику откликов открывает обсуждение. */
  onCommentsPress?: () => void;
  commentsTestID?: string;
  commentsLabel?: string;
}>;

/** `.au` макета: монета ранга автора, ник, ♥ · 👥 · 💬 (комментарии — только если есть). Одна строка. */
export const PackRowAuthorMeta = memo(function PackRowAuthorMeta({ g, authorName, coinRank, likes, added, comments, priceRunes = 0, authorTestID, onCommentsPress, commentsTestID, commentsLabel }: MetaProps) {
  const lh = useLineScale();
  const coin = isValidCoinRank(coinRank) ? coinRankRowForDisplay(coinRank) : null;
  const line = lh(17);
  const author = priceRunes > 0 ? `${authorName} · ᚱ ${priceRunes.toLocaleString('ru-RU').replace(/ /g, ' ')}` : authorName;
  return (
    <View style={styles.metaRow}>
      <View style={styles.authorBox}>
        {coin ? <Image source={coin.source} style={styles.coin} contentFit="contain" accessible={false} /> : null}
        {/* зачем: строка фиксированной высоты (журнал 9) — ник в одну строку через примитив ClampedText. */}
        <ClampedText testID={authorTestID} maxLines={1} style={[styles.metaText, styles.authorText, { color: g.secondary, lineHeight: line }]}>{author}</ClampedText>
      </View>
      <View style={styles.counts}>
        <View style={styles.count}>
          <Ionicons name="heart-outline" size={16} color={g.secondary} />
          <Text style={[styles.metaText, { color: g.secondary, lineHeight: line }]}>{likes}</Text>{/* guard-ok: счётчик, не подпись */}
        </View>
        <View style={styles.count}>
          <Ionicons name="people-outline" size={16} color={g.secondary} />
          <Text style={[styles.metaText, { color: g.secondary, lineHeight: line }]}>{added}</Text>{/* guard-ok: счётчик, не подпись */}
        </View>
        {comments > 0 && onCommentsPress ? (
          // зачем: на экране набора счётчик откликов — вход в обсуждение (как раньше у previewMeta).
          <KitTouchable testID={commentsTestID} accessibilityRole="button" accessibilityLabel={commentsLabel ?? String(comments)} onPress={onCommentsPress} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} style={styles.count}>
            <Ionicons name="chatbubble-outline" size={16} color={g.secondary} />
            <Text style={[styles.metaText, { color: g.secondary, lineHeight: line }]}>{comments}</Text>{/* guard-ok: счётчик, не подпись */}
          </KitTouchable>
        ) : comments > 0 ? (
          <View style={styles.count}>
            <Ionicons name="chatbubble-outline" size={16} color={g.secondary} />
            <Text style={[styles.metaText, { color: g.secondary, lineHeight: line }]}>{comments}</Text>{/* guard-ok: счётчик, не подпись */}
          </View>
        ) : null}
      </View>
    </View>
  );
});

type AddProps = Readonly<{
  g: GlassTokens;
  added: boolean;
  label: string;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
}>;

/** `.rd` макета: круглая «+» 44 — добавить себе; набор уже свой — «✓» на прозрачном с кольцом акцента. */
export const PackRowAddButton = memo(function PackRowAddButton({ g, added, label, onPress, testID, disabled }: AddProps) {
  const size = PACK_ROW_METRICS.plate.addSize;
  return (
    <KitTouchable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || added), selected: added }}
      disabled={disabled || added}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[styles.add, {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: added ? `${g.accent}1F` : `${g.accent}38`, // без кольца (стиль «Тень»): «добавлено» — бледнее заливка + галочка
      }]}
    >
      <Ionicons name={added ? 'checkmark' : 'add'} size={22} color={g.accentText} />
    </KitTouchable>
  );
});

/** Хвост строки «Мои наборы» (kit `.row`): пилюля числа карточек и шеврон. */
export function PackRowCountChevron({ g, count }: Readonly<{ g: GlassTokens; count: number }>) {
  return (
    <>
      <CountPill g={g} value={count} />
      <Ionicons name="chevron-forward" size={20} color={g.secondary} />
    </>
  );
}

/** Хвост строки выбора набора в тренировке: круглая отметка. */
export function PackRowCheck({ g, on }: Readonly<{ g: GlassTokens; on: boolean }>) {
  return <KitCheck g={g} on={on} />;
}

const styles = StyleSheet.create({
  deck: { position: 'relative' },
  deckLayer: { position: 'absolute' },
  deckHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  deckText: { flex: 1, minWidth: 0 },
  deckTitle: { fontSize: 21, fontWeight: '700', letterSpacing: -0.2 },
  deckSub: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deckSubText: { flexShrink: 1, fontSize: 13, fontWeight: '500' },
  deckAvatar: { alignItems: 'center', justifyContent: 'center' },
  deckChips: { flexDirection: 'row' },
  deckChip: { flex: 1, minWidth: 0, height: 38, borderRadius: 9, paddingHorizontal: 10, justifyContent: 'center' },
  deckChipText: { fontSize: 13, fontWeight: '600' },
  deckPlay: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  deckLikes: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 2 },
  deckLikesText: { fontSize: 13, fontWeight: '500' },
  surface: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  dimmed: { opacity: 0.32 },
  // зачем (стиль «Тень»): выбранное приподнято сдвигом вверх и тенью `raised` — только transform, высота ряда не меняется.
  lifted: { transform: [{ translateY: RAISED_LIFT }], zIndex: 3 },
  countTile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // зачем: число — крупная цифра плитки (≥19, D145 разрешает размер макета), подпись — 13 вместо 11 макета (шкала D145).
  countNum: { fontSize: 23, fontWeight: '700', letterSpacing: -0.4 },
  countWord: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  body: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: { fontWeight: '700', letterSpacing: -0.2 },
  badge: { paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 13, fontWeight: '700' },
  meta: { justifyContent: 'center' },
  subtitle: {},
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  authorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1, minWidth: 0 },
  coin: { width: 18, height: 18 },
  authorText: { flexShrink: 1 },
  metaText: { fontSize: 13, fontWeight: '500' },
  counts: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 0 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  add: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
