/**
 * Хаб «Карточки» — СПИСОК по утверждённому макету (владелец 05.11 ~14:45 «Хаб карточек — СПИСКОМ, по уже утверждённому макету»;
 * ~20:55 «ХАБ ДЕЛАЕТ КАК МАКЕТ Я ОДОБРИЛ»). Эталон: docs/work/golden/approved-rev8/hub-community-approved-rev4.png,
 * интерактивный макет approved-rev8 (views.js `view === 'cards'`, preview.css `.screen-head`, `.screen-content`, `.row-card`).
 *
 * Анатомия 1:1 с макетом:
 *   • шапка `.screen-head` (поля 12/20, зазор 12): круглая «назад» 44, заголовок 23/800 в строку, круглый «+» 44 — «Создать набор»;
 *   • список `.screen-content` (поля 12/20, зазор 12): пять строк `.row-card` — плашка r18, поля 16, предмет 54×54, название, шеврон;
 *     порядок и предметы — app/flashcards/cards_hub_rows.ts (Сохранённые, Мои наборы, Из видео, Мои ошибки, Сообщество).
 * Подписи под названием нет (в макете `<small>` пустой), числа на экране нет — число и единица остаются в подписи для скринридера.
 * Стопки, главной кнопки «Тренироваться» и пилюли «30/30» в утверждённом макете нет: тренировка запускается из «Сохранённых» и наборов
 * (их «Тренировать» ведёт сюда с ?train=1 — окно режимов и лимит живут в FlashcardsHubScreen и не тронуты).
 * Цвета — только токены темы (плашка = PlateFill + тень, без обводок). Без вечных анимаций; нажатие — V2Pressable (scale + .86).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLang } from '../../components/LangContext';
import { ThemedArtLayers } from '../../components/theme/ThemedArtLayers';
import { resolveThemedArt, type ThemedArtName } from '../../components/theme/themed_art_registry';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { useLineScale } from '../../hooks/useLineScale';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../../components/v2/ShadowSurface';
import BackGlyph from '../../components/v2/BackGlyph';
import V2Pressable from '../../components/v2/V2Pressable';
import { useHubLifecycle } from '../hub_lifecycle_probe';
import {
  buildCardsHubRows,
  cardsHubMistakesTitle,
  cardsHubRowA11yLabel,
  CARDS_HUB_MISTAKES_ROUTE,
  type CardsHubRow,
  type CardsHubRowInput,
} from './cards_hub_rows';

export type CardsHubTile = Readonly<{
  id: 'saved' | 'mine' | 'video' | 'community';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  count: string;
  /** Единица для скринридера («наборов», «карточек»): «Из видео. наборов: 6». */
  unit?: string;
  onPress: () => void;
}>;

type Props = Readonly<{
  g: GlassTokens;
  title: string;
  tiles: readonly CardsHubTile[];
  onBack: () => void;
  onCreate: () => void;
  labels: Readonly<{ back: string; create: string; trainA11y: string }>;
  // ── Ниже — пропсы прежнего хаба «стопка + кнопка + плитки». Экран (FlashcardsHubScreen) их ещё передаёт; в списке по
  // утверждённому макету они не рисуются. зачем оставлены в типе: FlashcardsHubScreen сейчас правит другая сессия — экран
  // не трогаем, пропсы снимем вместе с ним отдельной правкой.
  subtitle?: string;
  limitLabel?: string | null;
  topWord?: string;
  topIpa?: string;
  trainLabel?: string;
  trainLocked?: boolean;
  reduceMotion?: boolean;
  verticalInsets?: number;
  onTrain?: () => void;
  trainButtonRef?: React.Ref<View>;
  fresh?: Readonly<{ cta: string; onPress: () => void }>;
}>;

/** Запасной значок строки, если у темы нет предмета (origin 'none'). */
const ROW_FALLBACK_ICON: Readonly<Record<CardsHubRow['id'], keyof typeof Ionicons.glyphMap>> = {
  saved: 'bookmark-outline',
  mine: 'layers-outline',
  video: 'play',
  mistakes: 'refresh-outline',
  community: 'people-outline',
};

const ART_SIZE = 54;

type RowProps = Readonly<{ g: GlassTokens; row: CardsHubRow; tone: 'dark' | 'light'; lh: (n: number) => number }>;

/** Строка `.row-card`: предмет 54, название, шеврон. memo — список не перерисовывается от смены квоты/фокуса экрана. */
const CardsHubListRow = memo(function CardsHubListRow({ g, row, tone, lh }: RowProps) {
  const art = resolveThemedArt(row.art as ThemedArtName, tone);
  return (
    <V2Pressable
      testID={`fc-cards-hub-tile-${row.id}`}
      accessibilityRole="button"
      accessibilityLabel={cardsHubRowA11yLabel(row)}
      onPress={row.onPress}
      scaleTo={0.98}
      style={[styles.row, { boxShadow: plateBoxShadow(g) }]}
    >
      <PlateFill g={g} radius={ROW_RADIUS} />
      {art.base ? (
        <ThemedArtLayers source={art.base} accent={art.accent} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artFallback, { backgroundColor: g.opaqueControl, boxShadow: nestedBoxShadow(g) }]}>
          <Ionicons name={ROW_FALLBACK_ICON[row.id]} size={26} color={g.text} />
        </View>
      )}
      {/* зачем ([LABEL-FIT]): длинное название переносится на 2 строки, шрифт не ужимаем */}
      <Text style={[styles.rowTitle, { color: g.text, lineHeight: lh(22) }]} numberOfLines={2}>{row.title}</Text>
      <BackGlyph size={22} color={g.text} style={styles.chevron} />
    </V2Pressable>
  );
}, (a, b) => a.g === b.g && a.row === b.row && a.tone === b.tone && a.lh === b.lh);

function CardsHubV2Inner({ g, title, tiles, onBack, onCreate, labels }: Props) {
  useHubLifecycle('CardsHubV2'); // зачем (координатор 12.10, утечка памяти в хабе; сперва логи)
  const router = useRouter();
  const { lang } = useLang();
  const lh = useLineScale();
  const tone: 'dark' | 'light' = g.isLight ? 'light' : 'dark';

  // зачем (макет rev4: «Мои ошибки» между «Из видео» и «Сообществом»): строка ведёт туда же, куда плитка Главной; журнал [CARDS-HUB] — откуда открыли.
  const openMistakes = useCallback(() => {
    console.log('[CARDS-HUB] row:open', JSON.stringify({ id: 'mistakes', route: CARDS_HUB_MISTAKES_ROUTE })); // guard-ok: вход в «Мои ошибки» из хаба
    router.push(CARDS_HUB_MISTAKES_ROUTE as never);
  }, [router]);
  const mistakesTitle = cardsHubMistakesTitle(lang);

  const rows = useMemo(() => {
    const inputs: CardsHubRowInput[] = [
      ...tiles.map((t) => ({ id: t.id, title: t.title, count: t.count, unit: t.unit, onPress: t.onPress })),
      { id: 'mistakes', title: mistakesTitle, count: '', onPress: openMistakes },
    ];
    return buildCardsHubRows(inputs);
  }, [tiles, mistakesTitle, openMistakes]);

  // зачем (правило «сперва логи»): одна строка на смену состава — какие строки и с каким предметом нарисованы.
  const rowsKey = rows.map((r) => `${r.id}:${resolveThemedArt(r.art, tone).origin}`).join(',');
  useEffect(() => {
    console.log('[CARDS-HUB] list', JSON.stringify({ rows: rowsKey, tone, lang })); // guard-ok: состав списка хаба
  }, [rowsKey, tone, lang]);

  return (
    <View style={styles.root} testID="fc-cards-hub-v2">
      <View style={styles.head}>
        {/* зачем (аудит 22.10, «V2Pressable на всех управляющих элементах»): нажатие — как у всех кнопок 2.0; вибрация — на управляющей кнопке */}
        <V2Pressable testID="fc-cards-hub-back" accessibilityRole="button" accessibilityLabel={labels.back} onPress={onBack} hitSlop={8} scaleTo={0.94} withHaptic
          style={[styles.round, { boxShadow: plateBoxShadow(g) }]}>
          <PlateFill g={g} radius={ROUND / 2} />
          <BackGlyph size={22} color={g.text} />
        </V2Pressable>
        <Text maxFontSizeMultiplier={1.15} accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: g.text, lineHeight: lh(29) }]}>{title}</Text>
        <V2Pressable testID="fc-cards-hub-create-pack" accessibilityRole="button" accessibilityLabel={labels.create} onPress={onCreate} hitSlop={8} scaleTo={0.94} withHaptic
          style={[styles.round, { boxShadow: plateBoxShadow(g) }]}>
          <PlateFill g={g} radius={ROUND / 2} />
          <Ionicons name="add" size={24} color={g.text} />
        </V2Pressable>
      </View>
      {/* зачем: пять строк — список фиксированный и короткий, FlatList не нужен (лишняя виртуализация); прокрутка — для крупного шрифта и низких экранов */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} testID="fc-cards-hub-list">
        {rows.map((row) => /* guard-ok: пять фиксированных строк макета, виртуализация не нужна */ <CardsHubListRow key={row.id} g={g} row={row} tone={tone} lh={lh} />)}
      </ScrollView>
    </View>
  );
}

const CardsHubV2 = memo(CardsHubV2Inner);
export default CardsHubV2;

const ROUND = 44;
const ROW_RADIUS = 18;

// зачем: размеры строго из макета approved-rev8 (preview.css): `.screen-head{padding:12px 20px;gap:12px}`, `.icon-button 44`,
// `.screen-head h2{font-size:23px;font-weight:800}`, `.screen-content{padding:12px 20px;gap:12px}`,
// `.row-card{gap:12px;padding:16px;border-radius:18px}`, `.row-card img{54×54}`, `.icon 22`.
const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  round: { width: ROUND, height: ROUND, borderRadius: ROUND / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  title: { flex: 1, fontSize: 23, lineHeight: 29, fontWeight: '800', letterSpacing: -0.3 },
  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: ROW_RADIUS, minHeight: ART_SIZE + 32 },
  art: { width: ART_SIZE, height: ART_SIZE },
  artFallback: { borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  // зачем: шеврон макета `m9 5 7 7-7 7` — зеркало общего «назад» (тот же контур и толщина)
  chevron: { transform: [{ scaleX: -1 }] },
});
