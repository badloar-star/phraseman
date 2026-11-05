// PeakTour — тур первого входа в Пик поверх экрана B «Рельса»: 3 страницы, затемнение с «окнами» над нужными блоками, карточка с точками,
// «Пропустить»/«Далее», на 3-й — «Начать»; на 3-й стрелки «поднимаются» у топ-5. Утверждён владельцем 04.11 (макет peak-tour-2026-11-04/peak_tour_B.html).
// зачем: рассказать правила недели на самом экране, а не отдельной картинкой. Окна — от измеренных блоков (peak_tour_core), цвета — токены темы,
// текст ≥ 15 px, Reduce Motion — без анимации (карточка и стрелки статичны). Движение только transform/opacity на UI-потоке.
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { Easing, FadeIn, FadeInDown, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import type { Lang } from '../../../constants/i18n';
import { spireTierName } from '../../../modules/spire/tier_names';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { useRuntimeActive } from '../../../hooks/use_runtime_active';
import { useShadowGlass } from '../../v2/ShadowSurface';
import V2Pressable from '../../v2/V2Pressable';
import { useSpirePalette } from '../useSpirePalette';
import { spireGameText, spireTextRankByNow } from '../spire_game_strings';
import { peakScreenV2On } from './peak_screen_flag';
import { PEAK_TOUR_ARROW_SIZE, PEAK_TOUR_PAGES, peakTourArrows, peakTourArrowPage, peakTourCardPlacement, peakTourHoles, peakTourKeys, peakTourPage, type PeakTourPage, type PeakTourRects } from './peak_tour_core';

type Props = Readonly<{
  lang: Lang;
  rankBy: 'steps' | 'coins';
  rects: PeakTourRects;
  /** Сколько строк в топ-5 сейчас на экране (для стрелок). */
  topCount: number;
  /** Сколько из них «поднимаются» (в режиме монет — все пять). */
  upCount: number;
  /** Только dev-съёмка: с какой страницы начать, 0…2. */
  initialPage?: number;
  onDone: () => void;
}>;

const ARROW_RISE = 6;
// зачем (ревизор 04.11): крупный системный шрифт раздувал карточку и закрывал подсвеченные строки; потолок 1,15 держит её компактной (читаемо, как заголовки окон моментов)
const CARD_MAX_FONT_SCALE = 1.15;

function RisingArrow({ x, y, delay, color, still }: Readonly<{ x: number; y: number; delay: number; color: string; still: boolean }>) {
  const lift = useSharedValue(0);
  // зачем (сторож perf_freeze_contract): бесконечный подъём стрелок стоит, пока экран не в фокусе или приложение в фоне; вид и тайминги те же
  const runtimeActive = useRuntimeActive();
  useEffect(() => {
    if (still || !runtimeActive) { cancelAnimation(lift); lift.value = 0; return undefined; }
    // зачем (макет: стрелки «поднимаются»): мягкий подъём вверх и возврат, со сдвигом по строкам; только transform на UI-потоке
    lift.value = withDelay(delay, withRepeat(withSequence(withTiming(-ARROW_RISE, { duration: 700, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: 700, easing: Easing.inOut(Easing.cubic) })), -1));
    return () => cancelAnimation(lift);
  }, [still, runtimeActive, delay, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[s.arrow, { left: x, top: y }, style]}>
      <Ionicons name="arrow-up" size={PEAK_TOUR_ARROW_SIZE} color={color} />
    </Animated.View>
  );
}

function PeakTour({ lang, rankBy, rects, topCount, upCount, initialPage = 0, onDone }: Props) {
  const p = useSpirePalette();
  const g = useShadowGlass();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState<PeakTourPage>(peakTourPage(initialPage));
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const rootRef = useRef<View>(null);
  // зачем (ревизор 04.11): высота карточки зависит от шрифта и языка — меряем и ставим её так, чтобы она не закрывала подсвеченные строки
  const [card, setCard] = useState<Readonly<{ page: number; height: number }> | null>(null);
  const last = page === PEAK_TOUR_PAGES - 1;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
    // зачем: координаты блоков экрана — в системе окна; оверлей-окно может начинаться не с нуля (полупрозрачная строка состояния Android)
    rootRef.current?.measureInWindow((x, y) => setOrigin({ x, y }));
  }, []);

  const next = useCallback(() => {
    if (last) { console.log('[PEAK-TOUR]', 'done', JSON.stringify({ via: 'start' })); onDone(); return; } // guard-ok: итог тура
    setPage((n) => peakTourPage(n + 1));
  }, [last, onDone]);
  const skip = useCallback(() => { console.log('[PEAK-TOUR]', 'done', JSON.stringify({ via: 'skip', page })); onDone(); }, [onDone, page]); // guard-ok: итог тура

  const keys = peakTourKeys(page, rankBy);
  const title = keys.title ? spireGameText(lang, keys.title) : null; // зачем: в режиме монет заголовков нет (владелец дал только тексты)
  const text = spireGameText(lang, keys.text, { a: spireTierName(0, lang), b: spireTierName(1, lang), c: spireTierName(2, lang), z: spireTierName(11, lang) });
  // зачем ([PEAK-TOUR-COPY], владелец 05.11): какой компонент тура, какие ключи и почему — одна строка на страницу
  useEffect(() => {
    console.log('[PEAK-TOUR-COPY]', JSON.stringify({ component: 'PeakTour', page: page + 1, titleKey: keys.title, textKey: keys.text, rankByProp: rankBy, textRankBy: spireTextRankByNow(), screenV2: peakScreenV2On(), lang })); // guard-ok: трассировка текстов тура
  }, [page, keys.title, keys.text, rankBy, lang]);
  const holes = peakTourHoles(page, rects, origin, rankBy);
  const arrows = page === peakTourArrowPage(rankBy) ? peakTourArrows(rects, topCount, upCount, origin) : [];
  const measured = card !== null && card.page === page && size.height > 0;
  const placement = measured ? peakTourCardPlacement({ holes, screenHeight: size.height, cardHeight: card.height, insetTop: insets.top, insetBottom: insets.bottom }) : null;
  useEffect(() => {
    if (placement?.where === 'overlap') console.warn('[PEAK-TOUR]', 'card_overlap', JSON.stringify({ page, screen: size.height, card: card?.height })); // guard-ok: карточка не поместилась вне окон — нужен кадр Сверки
  }, [placement?.where, page, size.height, card?.height]);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={skip}>
      <View ref={rootRef} collapsable={false} style={s.root} onLayout={onLayout} testID="peak-tour" accessibilityViewIsModal>
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)} style={StyleSheet.absoluteFill} pointerEvents="auto">
          {size.width > 0 ? (
            <Svg width={size.width} height={size.height}>
              <Defs>
                <Mask id="peak-tour-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={size.width} height={size.height}>
                  <Rect x={0} y={0} width={size.width} height={size.height} fill="white" />
                  {holes.map((h, i) => <Rect key={`hole-${i}`} x={h.x} y={h.y} width={h.width} height={h.height} rx={h.radius} ry={h.radius} fill="black" />)}
                </Mask>
              </Defs>
              <Rect x={0} y={0} width={size.width} height={size.height} fill={g.scrim} mask="url(#peak-tour-mask)" />
            </Svg>
          ) : null}
        </Animated.View>
        {arrows.map((a, i) => <RisingArrow key={`arrow-${i}`} x={a.x} y={a.y} delay={i * 120} color={p.correct} still={Boolean(reduceMotion)} />)}
        <Animated.View
          key={`card-${page}`}
          entering={reduceMotion ? undefined : FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}
          onLayout={(e: LayoutChangeEvent) => setCard({ page, height: e.nativeEvent.layout.height })}
          style={[s.card, { backgroundColor: g.opaqueCard, top: placement ? placement.top : 0, opacity: placement ? 1 : 0 }]}
          testID={`peak-tour-card-${page + 1}`}
        >
          <View style={s.dots} accessible accessibilityLabel={`${page + 1} / ${PEAK_TOUR_PAGES}`}>
            {[0, 1, 2].map((i) => <View key={`dot-${i}`} style={[s.dot, i === page && s.dotOn, { backgroundColor: i === page ? p.text : p.control }]} />)}
          </View>
          {/* зачем (контракт reachable_action_buttons, ночь 05.11): текст — в прокручиваемой области с потолком высоты, кнопки «Пропустить»/«Далее»/«Начать» ниже и всегда достижимы, даже на самом низком экране или при очень длинном языке */}
          <ScrollView style={{ maxHeight: Math.max(120, Math.round(size.height * 0.4)) }} showsVerticalScrollIndicator={false} bounces={false}>
            {title ? <Text accessibilityRole="header" style={[s.title, { color: p.text }]} maxFontSizeMultiplier={CARD_MAX_FONT_SCALE}>{title}</Text> : null}
            <Text style={[title ? s.text : s.textOnly, { color: title ? p.textSecondary : p.text }]} maxFontSizeMultiplier={CARD_MAX_FONT_SCALE}>{text}</Text>
          </ScrollView>
          <View style={s.buttons}>
            {last ? null : (
              <V2Pressable onPress={skip} accessibilityRole="button" accessibilityLabel={spireGameText(lang, 'skip')} style={[s.btn, s.ghost, { backgroundColor: p.control }]} testID="peak-tour-skip">
                <Text style={[s.btnText, { color: p.text }]}>{spireGameText(lang, 'skip')}</Text>
              </V2Pressable>
            )}
            <V2Pressable onPress={next} accessibilityRole="button" accessibilityLabel={spireGameText(lang, last ? 'start' : 'next')} style={[s.btn, s.main, { backgroundColor: p.cta }]} testID="peak-tour-next">
              <Text style={[s.btnText, { color: p.ctaText }]}>{spireGameText(lang, last ? 'start' : 'next')}</Text>
            </V2Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  arrow: { position: 'absolute', width: PEAK_TOUR_ARROW_SIZE, height: PEAK_TOUR_ARROW_SIZE },
  card: { position: 'absolute', left: 12, right: 12, borderRadius: 28, paddingTop: 22, paddingBottom: 18, paddingHorizontal: 20, gap: 12 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { width: 24 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4 },
  text: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  textOnly: { fontSize: 19, lineHeight: 26, fontWeight: '600' }, // зачем: карточка только с текстом (заголовков владелец не давал) — текст главный, крупнее и ярче
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 12 }, // зачем (закон владельца 13.10 №35): зазор между кнопками >= 12
  // зачем (кадр peak-b 23:35, координатор): «Далее» схлопывалась в кружок — у кнопок нет собственных боковых полей и минимальной ширины; теперь поля 18 и minWidth, подпись в одну строку не режется
  btn: { minHeight: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  ghost: { paddingHorizontal: 18 },
  main: { flex: 1, minWidth: 120 },
  btnText: { fontSize: 17, fontWeight: '700' },
});

export default memo(PeakTour);
