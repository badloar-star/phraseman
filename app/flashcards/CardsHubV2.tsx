/**
 * Хаб «Карточки» — вариант А, утверждённый владельцем 04.10.2026 (макет docs/design/v2-app/cards-section.html, блок «Хаб — вариант А»).
 *
 * зачем (владелец: «в приложении запрещены любые различия с одобренными макетами, визуально в точности»):
 * чистый вид без данных и без навигации — всё приходит пропсами из FlashcardsHubScreen. Без прокрутки:
 * шапка (пилюля лимита и «плюс»), заголовок, стопка из трёх карточек с верхним словом, главная кнопка с остатком тренировок
 * и четыре равные плитки (Сохранённые, Мои наборы, Из видео, Сообщество).
 * Анимации — только transform на UI-потоке: лёгкое «парение» верхней карточки (6 с, не крутится при reduceMotion).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { noteHubSubscription, useHubLifecycle } from '../hub_lifecycle_probe';
import { CardsHubAnimProbe } from './CardsHubAnimProbe';
import React, { memo, useEffect, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { isDevAnimationsOff, subscribeDevAnimationsOff } from '../dev_animations_off';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow } from '../../components/v2/ShadowSurface';
import BackGlyph from '../../components/v2/BackGlyph';

export type CardsHubTile = Readonly<{
  id: 'saved' | 'mine' | 'video' | 'community';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  count: string;
  onPress: () => void;
}>;

type Props = Readonly<{
  g: GlassTokens;
  title: string;
  subtitle: string;
  limitLabel: string | null;
  topWord: string;
  topIpa: string;
  trainLabel: string;
  trainLocked: boolean;
  tiles: readonly CardsHubTile[];
  reduceMotion: boolean;
  /** Сумма вырезов сверху и снизу: высота под содержимое = высота окна минус они; стопка и плитки сжимаются на невысоких экранах, чтобы не было прокрутки. */
  verticalInsets: number;
  onBack: () => void;
  onCreate: () => void;
  onTrain: () => void;
  trainButtonRef?: React.Ref<View>;
  labels: Readonly<{ back: string; create: string; trainA11y: string }>;
  /**
   * Новичок: своих карточек и наборов нет (макет cards-section-extra.js hubNewS). Вместо стопки — стеклянная карточка
   * «Начните с готового», главная кнопка — «Выбрать набор» (а не тренировка, тренировать пока нечего).
   */
  fresh?: Readonly<{ title: string; sub: string; cta: string; onPress: () => void }>;
}>;

/** Смешивает цвет темы с тёмным основанием (как color-mix макета: доля темы + тёмный). */
function mixDark(hex: string, base: string, t: number): string {
  const c = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = c(hex.length >= 7 ? hex : '#888888'); // theme-exempt: запасной серый при битом входе функции смешивания
  const b = c(base);
  return `#${a.map((v, i) => Math.round(v * t + b[i]! * (1 - t)).toString(16).padStart(2, '0')).join('')}`;
}

/** Два цвета темы для градиентов: пятна фона (A, B) — как «--g1/--g2» макета; у светлых тем пятен нет — акцент и кромка. */
function themePair(g: GlassTokens): readonly [string, string] {
  // зачем (макет: плитки и карточка идут от первого цвета темы ко второму — зелёный→фиолетовый у «Авроры»):
  // два цвета темы лежат в пятнах фона bgGlow (A, B, A) — берём их без альфы.
  const glow = g.bgGlow;
  if (glow && glow[0] && glow[1] && glow[0].slice(1, 7) !== '000000' && glow[1].slice(1, 7) !== '000000') {
    return [glow[0].slice(0, 7), glow[1].slice(0, 7)];
  }
  const gr = g.accentGradient;
  if (gr && gr.length >= 2) return [gr[0]!, gr[gr.length - 1]!];
  return [g.accentGraphic, g.accentBorder]; // зачем (светлый акцент): запасной градиент — графика
}

// зачем (владелец 12.10, стиль «Тень»): внутренних кромок-фасок (bevel) и колец больше нет — плитки и «Свежий» блок это плашки
// (PlateFill + plateBoxShadow), карточки стопки — арт с градиентом и внешней тенью, значки — вложенные (nestedBoxShadow).
/** Градиент плитки-значка: цвет темы 60 % / 32 % в базах темы. */
const iconGlass = (g: GlassTokens, a: string, b: string) => [mixDark(a, g.deepBase, 0.6), mixDark(b, g.deepBaseAlt, 0.32)] as const;
/** Заливка карточки стопки: 145°, доля цвета темы 50 %/38 % в тёмном — как «.mc.solid» макета. */
const stackFill = (g: GlassTokens, a: string, b: string) => [mixDark(a, g.deepBase, 0.5), g.deepBaseAlt, mixDark(b, g.deepBaseAlt, 0.38)] as const;
const DIAG_START = { x: 0.21, y: 0.09 } as const;
const DIAG_END = { x: 0.79, y: 0.91 } as const;

const StackCard = ({ g, style, radius, opacity }: { g: GlassTokens; style: StyleProp<ViewStyle>; radius: number; opacity: number }) => {
  const [a, b] = themePair(g);
  return (
    <View pointerEvents="none" style={[styles.stackCard, style, { borderRadius: radius, opacity, boxShadow: plateBoxShadow(g) }]}>
      <LinearGradient colors={stackFill(g, a, b)} locations={[0, 0.58, 1]} start={DIAG_START} end={DIAG_END} style={StyleSheet.absoluteFill} />
    </View>
  );
};

function CardsHubV2Inner({
  g, title, subtitle, limitLabel, topWord, topIpa, trainLabel, trainLocked, tiles, reduceMotion,
  onBack, onCreate, onTrain, trainButtonRef, labels, verticalInsets, fresh,
}: Props) {
  useHubLifecycle('CardsHubV2'); // зачем (координатор 12.10, утечка памяти в хабе; сперва логи)
  // зачем (Сверка 10.10, светлая тема): заливки стопки и плиток-значков в светлых темах светлые, белый «ink на медиа» на них не читается —
  // в светлой теме берём текст темы, в тёмных остаётся прежний (mediaInk).
  const faceInk = g.isLight ? g.text : g.mediaInk;
  // зачем (таблица docs/phraseman-2.0/evidence/hub_cards_contrast_23_themes.md, решение координатора 14.10): приглушённый цвет подписи
  // транскрипции на тонированной заливке стопки давал контраст 1.57–5.33 (нечитаемо на всех 23 темах) — берём цвет слова, 4.10–4.49.
  const faceInkSoft = faceInk;
  const float = useSharedValue(0);
  // зачем (координатор 12.10): «парение» стопки (8 dp за 5 с) бесконечное — по приказу владельца 11.10 («хаб утра»); по коду крутится на UI-потоке и стоит вне фокуса/в фоне/при «уменьшить движение».
  // Для робота — dev-подмена `animations=off` (app/dev_animations_off.ts, только память, в сторе недоступна): uiautomator не доходит до покоя на вечной анимации. Замер кадров — [CARDS-HUB-ANIM].
  const animationsOffByDev = useSyncExternalStore(subscribeDevAnimationsOff, isDevAnimationsOff, () => false);
  // зачем (Performance Bible, сторож perf_freeze_contract): бесконечное «парение» живёт только пока экран в фокусе и приложение на переднем плане.
  const runtimeActive = useRuntimeActive();
  useEffect(() => {
    if (reduceMotion || !runtimeActive || animationsOffByDev) return undefined;
    noteHubSubscription('CardsHubV2.floatLoop', 'on');
    float.value = withRepeat(withTiming(-8, { duration: 5000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => { float.value = 0; noteHubSubscription('CardsHubV2.floatLoop', 'off'); };
  }, [animationsOffByDev, float, reduceMotion, runtimeActive]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const animProbe = typeof __DEV__ !== 'undefined' && __DEV__
    ? <CardsHubAnimProbe float={float} active={!reduceMotion && runtimeActive && !animationsOffByDev} />
    : null;
  const [a, b] = themePair(g);
  // зачем (макет 932dp: стопка 250, плитки 150): на невысоких экранах сжимаем стопку и плитки пропорционально, чтобы хаб оставался без прокрутки.
  const fixed = 4 + 44 + 8 + 46 + 6 + 22 + 26 + 14 + 52 + 20 + 12 + 28; // +28: воздух снизу, как в макете
  // зачем (R1, C4): высоту окна читаем здесь, а не в корне экрана — смена размера окна/клавиатуры не перерисовывает корень хаба
  const { fontScale, height: windowHeight } = useWindowDimensions();
  const rem = Math.max(0, windowHeight - verticalInsets - fixed);
  const fs = Math.max(1, fontScale);
  // при крупном шрифте превью-карточке нужно больше места под слово и транскрипцию (до ×1.5), иначе слово режется по высоте
  const stackH = Math.round(Math.min(250, Math.max(150, rem * 0.42)) * (fs > 1 ? Math.min(fs, 1.5) : 1));
  const tileH = Math.round(Math.min(150, Math.max(96, (rem - stackH) / 2)));
  const k = stackH / 250;
  // зачем (координатор 05.10, «хаб «Карточки» режет текст при системном шрифте 2.0»; сжимать шрифт нельзя): fontSize система масштабирует, а заданный
  // lineHeight остаётся прежним — строка становится ниже глифов и низ срезается. Масштабируем lineHeight тем же коэффициентом, высоты пилюли/шапки —
  // в minHeight, подписи плиток и превью — с переносом. При шрифте 1.0 коэффициент 1: вид совпадает с макетом пиксель в пиксель.
  const lh = (n: number) => (fs === 1 ? n : Math.round(n * fs));

  const body = (
    <View style={styles.root} testID="fc-cards-hub-v2">
      {animProbe}
      <View style={[styles.topbar, fs > 1 && { height: undefined, minHeight: 44 }]}>
        <Pressable testID="fc-cards-hub-back" accessibilityRole="button" accessibilityLabel={labels.back} onPress={onBack} hitSlop={8}
          style={({ pressed }) => [styles.round, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }, pressed && styles.pressed]}>
          <BackGlyph size={20} color={g.text} />
        </Pressable>
        <View style={styles.topRight}>
          {limitLabel ? (
            <View testID="fc-cards-hub-limit" style={[styles.pill, fs > 1 && { height: undefined, minHeight: 30, paddingVertical: 2 }, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }]}>
              {/* зачем (координатор 13.10, пилюля «30/30» хаба Карточек): в образце cards-v2 `limPill('copy', '30/30')` — значок «копии», как у настройки тренировки (copy-outline), а не «стопка» albums-outline */}
              <Ionicons name="copy-outline" size={16} color={g.text} />
              <Text style={[styles.pillText, { color: g.text, lineHeight: lh(20) }]}>{limitLabel}</Text>
            </View>
          ) : null}
          <Pressable testID="fc-cards-hub-create-pack" accessibilityRole="button" accessibilityLabel={labels.create} onPress={onCreate} hitSlop={8}
            style={({ pressed }) => [styles.round, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }, pressed && styles.pressed]}>
            <Ionicons name="add" size={22} color={g.text} />
          </Pressable>
        </View>
      </View>

      <Text maxFontSizeMultiplier={1.15} accessibilityRole="header" style={[styles.title, { color: g.text, lineHeight: lh(46) }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: g.secondary, lineHeight: lh(22) }]}>{subtitle}</Text>

      {fresh ? (
        // зачем (Сверка cards-section-003, hubNewS): у новичка не было этого состояния — стопка показывала выдуманную
        // карточку «Boarding pass», которой у человека нет. Карточка по центру: плитка 64/r20, 24/700, подпись 16.
        <View testID="fc-cards-hub-fresh" style={[styles.fresh, { minHeight: stackH, boxShadow: plateBoxShadow(g) }]}>
          <PlateFill g={g} radius={26} />
          <View style={[styles.freshIcon, { boxShadow: nestedBoxShadow(g) }]}>
            <LinearGradient pointerEvents="none" colors={iconGlass(g, a, b)} start={DIAG_START} end={DIAG_END} style={StyleSheet.absoluteFill} />
            <Ionicons name="people-outline" size={28} color={faceInk} />
          </View>
          <Text accessibilityRole="header" style={[styles.freshTitle, { color: g.text, lineHeight: lh(30) }]}>{fresh.title}</Text>
          <Text style={[styles.freshSub, { color: g.secondary, lineHeight: lh(22) }]}>{fresh.sub}</Text>
        </View>
      ) : (
      <View style={[styles.stack, { height: stackH }]} pointerEvents="box-none">
        <StackCard g={g} opacity={0.7} radius={28} style={[styles.stackBack2, { height: Math.round(110 * k) }]} />
        <StackCard g={g} opacity={0.9} radius={28} style={[styles.stackBack1, { top: Math.round(18 * k), height: Math.round(130 * k) }]} />
        <Reanimated.View style={[styles.stackTop, { top: Math.round(40 * k), height: Math.round(200 * k), boxShadow: plateBoxShadow(g) }, floatStyle]} pointerEvents="none">
          <LinearGradient colors={stackFill(g, a, b)} locations={[0, 0.58, 1]} start={DIAG_START} end={DIAG_END} style={StyleSheet.absoluteFill} />
          {/* зачем (hubLimitS): сообщение о лимите длинное — переносится на 2 строки по центру, а не режется многоточием */}
          <Text style={[styles.topWord, trainLocked && styles.topWordWrap, { color: faceInk, lineHeight: lh(44) }]} numberOfLines={fs > 1 ? undefined : (trainLocked ? 2 : 1)}>{topWord}</Text>
          {topIpa ? <Text style={[styles.topIpa, { color: faceInkSoft, lineHeight: lh(20) }]} numberOfLines={fs > 1 ? undefined : 1}>{topIpa}</Text> : null}
        </Reanimated.View>
      </View>
      )}

      <Pressable ref={trainButtonRef} testID="fc-cards-hub-train" accessibilityRole="button" accessibilityLabel={fresh ? fresh.cta : labels.trainA11y} onPress={fresh ? fresh.onPress : onTrain}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: g.ctaFill, boxShadow: actionBoxShadow(g) },
          // зачем (hubLimitS): исчерпанный лимит — кнопка приглушена до .55, как в макете.
          !fresh && trainLocked ? styles.ctaLocked : null,
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.ctaText, { color: g.ctaFillInk, lineHeight: lh(22) }]}>{fresh ? fresh.cta : trainLabel}</Text>
        <View style={styles.ctaIcon}>
          <Ionicons name={!fresh && trainLocked ? 'lock-closed' : 'arrow-forward'} size={20} color={g.ctaFillInk} />
        </View>
      </Pressable>

      <View style={styles.tiles}>
        {tiles.map((t) => (
          <Pressable key={t.id} testID={`fc-cards-hub-tile-${t.id}`} accessibilityRole="button" accessibilityLabel={t.count === '' ? t.title : `${t.title}. ${t.count}`} onPress={t.onPress}
            style={({ pressed }) => [
              styles.tile,
              { minHeight: tileH, boxShadow: plateBoxShadow(g) },
              pressed && styles.pressed,
            ]}>
            {/* зачем (Тень 12.10): плитка — плашка (градиент 180° + тень), без фасок и кольца */}
            <PlateFill g={g} radius={26} />
            <View style={[styles.tileIcon, { boxShadow: nestedBoxShadow(g) }]}>
              <LinearGradient pointerEvents="none" colors={iconGlass(g, a, b)} start={DIAG_START} end={DIAG_END} style={StyleSheet.absoluteFill} />
              <Ionicons name={t.icon} size={24} color={faceInk} />
            </View>
            <View>
              <Text style={[styles.tileTitle, { color: g.text, lineHeight: lh(25) }]} numberOfLines={fs > 1 ? undefined : 1}>{t.title}</Text>
              <Text style={[styles.tileCount, { color: g.secondary, lineHeight: lh(19) }]} numberOfLines={fs > 1 ? undefined : 1}>{t.count === '' ? ' ' : t.count}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
  // зачем: при крупном шрифте хаб не помещается в экран — прокручивается; при 1.0 прежняя разметка без ScrollView (макет без прокрутки)
  return fs > 1
    ? <ScrollView contentContainerStyle={styles.scrollGrow} showsVerticalScrollIndicator={false} decelerationRate="fast">{body}</ScrollView>
    : body;
}

const CardsHubV2 = memo(CardsHubV2Inner);
export default CardsHubV2;

// зачем: размеры строго из макета cards-section (замер getBoundingClientRect, 430×932): заголовок 40/46, пилюля 30, кнопки шапки 42, плитка 150 с отступами 18/16.
const styles = StyleSheet.create({
  scrollGrow: { flexGrow: 1, paddingBottom: 24 },
  root: { flex: 1, paddingHorizontal: 20 },
  pressed: { opacity: 0.82 },
  topbar: { height: 44, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  pill: { height: 30, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  title: { marginTop: 8, fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { marginTop: 6, fontSize: 16, lineHeight: 22, letterSpacing: 0.15 },
  stack: { height: 250, marginTop: 26 },
  stackCard: { position: 'absolute', overflow: 'hidden' },
  stackBack2: { left: 38, right: 38, top: 0, height: 110 },
  stackBack1: { left: 19, right: 19, top: 18, height: 130 },
  stackTop: { position: 'absolute', left: 0, right: 0, top: 40, height: 200, borderRadius: 30, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  topWord: { fontSize: 36, lineHeight: 44, fontWeight: '700', paddingHorizontal: 16 },
  topWordWrap: { textAlign: 'center' },
  topIpa: { marginTop: 8, fontSize: 16, lineHeight: 20, fontStyle: 'italic' },
  // зачем: текст кнопки не обрезается («осталось 28 и…» на эмуляторе) — меньше боковые поля и перенос строки вместо многоточия; кегль не ужимаем
  cta: { marginTop: 14, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 8 },
  ctaLocked: { opacity: 0.55 },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  ctaIcon: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  tiles: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '48%', flexGrow: 1, minHeight: 150, borderRadius: 26, paddingHorizontal: 16, paddingVertical: 18, justifyContent: 'space-between' },
  // hubNewS `.gl.pad`: 26 от подзаголовка, высота стопки (250 в макете), всё по центру.
  fresh: { marginTop: 26, borderRadius: 26, paddingHorizontal: 22, paddingVertical: 22, alignItems: 'center', justifyContent: 'center' },
  freshIcon: { width: 64, height: 64, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  freshTitle: { marginTop: 18, fontSize: 24, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  freshSub: { marginTop: 6, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  tileIcon: { width: 52, height: 52, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  tileCount: { fontSize: 16, lineHeight: 21 },
});
