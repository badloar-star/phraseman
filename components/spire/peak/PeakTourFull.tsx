// PeakTourFull — полноэкранный тур первого входа в Пик, 3 страницы со свайпом. 1:1 по утверждённому макету
// docs/work/release/mockups/peak_tour_full_approved_2026-11-05.html (коммит 81273d1c5).
// зачем (владелец 05.11: «макет Пика одобрен, реализовать ТОЧНО так же, как на макете!!!!»): на странице сверху справа «Пропустить»,
// рисунок 340 dp, текст, точки страниц, «Далее» внизу на всю ширину (на последней «Начать»). Тексты — ДОСЛОВНО ключи peakTour1..3
// (заголовков нет, ключи tour*Title в туре не используются). Рисунки: (1) башня Пика, как в прежнем SpireTour; (2) пять строк
// «Игрок 1–5» с монетами ранга и числами монет недели + плашки «лига → следующая лига», энергия со стрелкой вверх, «+1 000» с монетой;
// (3) окно башни на вершине: моя монета на 15 этаже + «лига → следующая лига». Цвета только из темы, толстых рамок нет.
// Показ: компонент ставится там, где был PeakTour (PeakScreenV2) через ту же очередь окон; сам он про очередь ничего не знает.
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Modal, PixelRatio, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useReducedMotion } from 'react-native-reanimated';
import { triLang, type Lang } from '../../../constants/i18n';
import { V2 } from '../../../constants/v2Style';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { coinRankSourceForSize } from '../../../app/coin_rank_table_v1';
import { useMyCoinRank } from '../../../hooks/use_my_coin_rank';
import { spireTierName } from '../../../modules/spire/tier_names';
import V2Pressable from '../../v2/V2Pressable';
import SpireTower from '../SpireTower';
import SpireTowerDeferred from '../SpireTowerDeferred'; // зачем: башня тура встаёт следующим кадром, рамка того же размера (JS-стоп при монтаже ~500 узлов SVG)
import { SPIRE_TW } from '../spire_tower_model';
import { spireGameText } from '../spire_game_strings';
import { useSpirePalette } from '../useSpirePalette';
import { useSpireScene } from '../useSpireScene';
import { useSpireShadow } from '../useSpireShadow';
import { PEAK_TOUR_FULL_PAGES, PEAK_TOUR_FULL_TEXT_KEYS } from './peak_tour_full_core';

const LOG = '[PEAK-TOUR-FULL]';
export { PEAK_TOUR_FULL_PAGES, PEAK_TOUR_FULL_TEXT_KEYS };

// ── размеры макета (CSS страницы тура, dp = px) ──
const PAGE_PAD_X = 20;
const IMG_HEIGHT = 340;
const TOWER_WIDTH = 240;
// зачем: как в прежнем SpireTour — сверху настоящий запас, обрезается только низ (SVG сам берёт видимую высоту)
const TOUR_CROP_UNITS = IMG_HEIGHT / (TOWER_WIDTH / SPIRE_TW);
const WINDOW3_MAX_WIDTH = 300;
const WINDOW3_HEIGHT = 288;
const ROW_COIN_DP = 36;
const PILL_COIN_DP = 22;
const NBSP = ' ';
// иллюстрация правила «пятёрка лучших получает…»: ранг монеты и монеты недели, как в макете (не данные комнаты)
const TOP5: ReadonlyArray<readonly [rank: number, coins: number]> = [[12, 1840], [9, 1612], [11, 1490], [7, 1388], [5, 1275]];
const noop = () => undefined;

const playerLabel = (lang: Lang, n: number): string => triLang(lang, {
  ru: `Игрок${NBSP}${n}`, uk: `Гравець${NBSP}${n}`, en: `Player${NBSP}${n}`, es: `Jugador${NBSP}${n}`, 'pt-BR': `Jogador${NBSP}${n}`,
  vi: `Người chơi${NBSP}${n}`, id: `Pemain${NBSP}${n}`, tr: `Oyuncu${NBSP}${n}`, pl: `Gracz${NBSP}${n}`,
});
const groupThousands = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

function Coin({ rank, dp }: Readonly<{ rank: number; dp: number }>) {
  // зачем (координатор 26.10, скорость Моментов): монета берётся уменьшенной копией под размер, не полным артом 768²
  const coin = coinRankSourceForSize(rank, dp, PixelRatio.get());
  return coin ? <Image source={coin.source} contentFit="contain" style={{ width: dp, height: dp, borderRadius: dp / 2 }} accessible={false} /> : <View style={{ width: dp, height: dp }} />;
}

/** Рисунок 1 — башня Пика (тот же SVG, что на главном экране Пика), верхушка. */
function PicTower({ lang }: Readonly<{ lang: Lang }>) {
  const scene = useSpireScene();
  return (
    <View style={s.towerClip} pointerEvents="none">
      <SpireTowerDeferred source="tour" lang={lang} myFloor={null} selected={0} onSelect={noop} width={TOWER_WIDTH} scene={scene} cropHeight={TOUR_CROP_UNITS} />
    </View>
  );
}

/** Рисунок 2 — пятёрка лучших и что они получают. */
function PicTop({ lang, compact }: Readonly<{ lang: Lang; compact: boolean }>) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const pill = [s.pill, compact ? s.pillCompact : null, { backgroundColor: p.card }, sh.nested];
  // зачем (владелец 05.11 ~19:15: «монета абсолютно во всех местах обязана соответствовать рангу строго»): монета у «+1 000» — монета ранга пользователя, не зашитая базовая (rank 0); ранга ещё нет — монеты нет
  const myRank = useMyCoinRank();
  const pillText = [s.pillText, { color: p.text }]; // зачем: шрифт плашек везде 15 (сторож «текст не мельче 15»); на узком экране сжимаются только поля и зазор
  return (
    <View style={s.fill}>
      <View style={s.rows}>
        {TOP5.map(([rank, coins], i) => (
          <View key={`row-${rank}`} style={[s.row, { backgroundColor: p.card }, sh.nested]}>
            <Text style={[s.place, { color: p.textSecondary }]}>{i + 1}</Text>
            <Coin rank={rank} dp={ROW_COIN_DP} />
            <Text style={[s.name, { color: p.text }]} numberOfLines={1}>{playerLabel(lang, i + 1)}</Text>
            <Ionicons name="arrow-up" size={18} color={p.correct} />
            <Text style={[s.value, { color: p.text }]}>{groupThousands(coins)}</Text>
          </View>
        ))}
      </View>
      <View style={[s.gets, compact ? s.getsCompact : null]}>
        <View style={pill}>
          <Text style={pillText}>{spireTierName(0, lang)}</Text>
          <Ionicons name="arrow-forward" size={16} color={p.correct} />
          <Text style={pillText}>{spireTierName(1, lang)}</Text>
        </View>
        <View style={pill}>
          <Ionicons name="flash" size={18} color={p.accentGraphic} />
          <Ionicons name="arrow-up" size={18} color={p.correct} />
        </View>
        <View style={pill}>
          {myRank !== null ? <Coin rank={myRank} dp={PILL_COIN_DP} /> : <View style={{ width: PILL_COIN_DP, height: PILL_COIN_DP }} />}
          <Text style={pillText}>{`+1${NBSP}000`}</Text>
        </View>
      </View>
    </View>
  );
}

/** Рисунок 3 — вершина башни, переход в новую лигу. Монеты пользователя на башне нет (владелец 05.11 ~19:40: «башня в туре тоже чистая»). */
function PicSummit({ lang, width }: Readonly<{ lang: Lang; width: number }>) {
  const p = useSpirePalette();
  return (
    <View style={{ width }}>
      <View pointerEvents="none">
        <SpireTower lang={lang} myFloor={15} selected={15} onSelect={noop} myCoinRank={null} windowHeight={WINDOW3_HEIGHT} />
      </View>
      <View style={[s.league, { backgroundColor: p.cta }]}>
        <Text style={[s.pillText, { color: p.ctaText }]}>{spireTierName(0, lang)}</Text>
        <Ionicons name="arrow-forward" size={20} color={p.correct} />
        <Text style={[s.pillText, { color: p.ctaText }]}>{spireTierName(1, lang)}</Text>
      </View>
    </View>
  );
}

type PageProps = Readonly<{
  index: number; lang: Lang; width: number; mounted: boolean; topInset: number; bottomPad: number;
  onSkip: () => void; onNext: () => void;
}>;

function TourPage({ index, lang, width, mounted, topInset, bottomPad, onSkip, onNext }: PageProps) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const last = index === PEAK_TOUR_FULL_PAGES - 1;
  const text = spireGameText(lang, PEAK_TOUR_FULL_TEXT_KEYS[index]!);
  const compact = width <= 400;
  const winWidth = Math.min(WINDOW3_MAX_WIDTH, width - PAGE_PAD_X * 2);
  return (
    <View style={[s.page, { width, paddingTop: topInset, paddingBottom: bottomPad }]} accessible={false} testID={`peak-tour-full-page-${index + 1}`}>
      <View style={s.top}>
        <V2Pressable onPress={onSkip} accessibilityRole="button" accessibilityLabel={spireGameText(lang, 'skip')} style={s.skip} testID={`peak-tour-full-skip-${index + 1}`}>
          <Text style={[s.skipText, { color: p.textSecondary }]}>{spireGameText(lang, 'skip')}</Text>
        </V2Pressable>
      </View>
      <View style={s.img}>
        {!mounted ? null : index === 0 ? <PicTower lang={lang} /> : index === 1 ? <PicTop lang={lang} compact={compact} /> : <PicSummit lang={lang} width={winWidth} />}
      </View>
      <Text style={[s.text, { color: p.text }]} maxFontSizeMultiplier={1.2}>{text}</Text>
      <View style={s.dots} accessible accessibilityLabel={`${index + 1} / ${PEAK_TOUR_FULL_PAGES}`}>
        {[0, 1, 2].map((d) => <View key={`dot-${d}`} style={[s.dot, d === index && s.dotOn, { backgroundColor: d === index ? p.text : p.control }]} />)}
      </View>
      <View style={s.spacer} />
      <V2Pressable onPress={onNext} accessibilityRole="button" accessibilityLabel={spireGameText(lang, last ? 'start' : 'next')} style={[s.cta, { backgroundColor: p.cta }, sh.action(p.cta)]} testID={`peak-tour-full-next-${index + 1}`}>
        <Text style={[s.ctaText, { color: p.ctaText }]}>{spireGameText(lang, last ? 'start' : 'next')}</Text>
        <View pointerEvents="none" style={s.arrow}><Ionicons name="arrow-forward" size={20} color={p.ctaText} /></View>
      </V2Pressable>
    </View>
  );
}

type Props = Readonly<{
  lang: Lang;
  /** Только dev-съёмка: с какой страницы начать, 0…2. */
  initialPage?: number;
  onDone: () => void;
}>;

function PeakTourFull({ lang, initialPage = 0, onDone }: Props) {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const start = Math.max(0, Math.min(PEAK_TOUR_FULL_PAGES - 1, Math.round(initialPage)));
  const [page, setPage] = useState(start);
  const pageRef = useRef(start);
  const scrollRef = useRef<ScrollView>(null);
  const placedRef = useRef(false);

  useEffect(() => {
    console.log(LOG, 'shown', JSON.stringify({ lang, width, startPage: start + 1 })); // guard-ok: показ тура
  }, [lang, width, start]);
  useEffect(() => {
    console.log(LOG, 'page', JSON.stringify({ page: page + 1, textKey: PEAK_TOUR_FULL_TEXT_KEYS[page], lang })); // guard-ok: какая страница и какой ключ текста
  }, [page, lang]);

  const goTo = useCallback((n: number, animated: boolean) => {
    const target = Math.max(0, Math.min(PEAK_TOUR_FULL_PAGES - 1, n));
    scrollRef.current?.scrollTo({ x: target * width, y: 0, animated });
    pageRef.current = target;
    setPage(target);
  }, [width]);
  const onNext = useCallback(() => {
    if (pageRef.current >= PEAK_TOUR_FULL_PAGES - 1) { console.log(LOG, 'start', JSON.stringify({ page: pageRef.current + 1 })); onDone(); return; } // guard-ok: итог тура
    goTo(pageRef.current + 1, !reduceMotion);
  }, [goTo, onDone, reduceMotion]);
  const onSkip = useCallback(() => { console.log(LOG, 'skip', JSON.stringify({ page: pageRef.current + 1 })); onDone(); }, [onDone]); // guard-ok: итог тура
  // зачем: свайп листает встроенным постраничным ScrollView; номер страницы берём из смещения, чтобы «Далее» шло от настоящей
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const n = Math.max(0, Math.min(PEAK_TOUR_FULL_PAGES - 1, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (n !== pageRef.current) { pageRef.current = n; setPage(n); }
  }, [width]);
  // зачем: на Android contentOffset не работает — один раз после раскладки ставим стартовую страницу (только dev-съёмка)
  const onLayoutReady = useCallback(() => { if (placedRef.current) return; placedRef.current = true; if (start > 0) scrollRef.current?.scrollTo({ x: start * width, y: 0, animated: false }); }, [start, width]);

  const bottomPad = Math.max(30, insets.bottom + 16);
  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onSkip} statusBarTranslucent>
      <View style={[s.root, { backgroundColor: p.bg }]} testID="peak-tour-full">
        <ScrollView decelerationRate="fast"
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onLayout={onLayoutReady}
          contentOffset={{ x: start * width, y: 0 }}
        >
          {[0, 1, 2].map((i) => ( // guard-ok: ровно 3 страницы тура, виртуализация не нужна
            // зачем: рисунок соседней страницы собираем заранее (±1), остальные не держим — башня тяжёлая
            <TourPage key={`page-${i}`} index={i} lang={lang} width={width} mounted={Math.abs(i - page) <= 1} topInset={insets.top} bottomPad={bottomPad} onSkip={onSkip} onNext={onNext} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  page: { paddingHorizontal: PAGE_PAD_X },
  top: { flexDirection: 'row', justifyContent: 'flex-end' },
  skip: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  skipText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  img: { height: IMG_HEIGHT, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%' },
  towerClip: { height: IMG_HEIGHT, width: TOWER_WIDTH, alignSelf: 'center' },
  rows: { width: '100%', gap: 8, paddingHorizontal: 6 },
  row: { minHeight: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingLeft: 10, paddingRight: 14 },
  place: { width: 22, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  name: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '600' },
  value: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  gets: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  getsCompact: { gap: 6 },
  pill: { height: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14 },
  pillCompact: { paddingHorizontal: 10, gap: 5 },
  pillText: { fontSize: 15, fontWeight: '700' },
  league: { alignSelf: 'center', marginTop: 12, height: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  text: { marginTop: 30, fontSize: 21, lineHeight: 28, fontWeight: '600', letterSpacing: -0.2 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 24 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { width: 22 },
  spacer: { flex: 1 },
  cta: { minHeight: V2.cta.height, borderRadius: V2.cta.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  arrow: { position: 'absolute', right: 22 },
});

export default memo(PeakTourFull);
