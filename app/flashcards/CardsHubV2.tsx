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
import React, { memo, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type BoxShadowValue, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';

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
  /** Высота, доступная под содержимое (экран минус вырезы): стопка и плитки сжимаются на невысоких экранах, чтобы не было прокрутки. */
  availableHeight: number;
  onBack: () => void;
  onCreate: () => void;
  onTrain: () => void;
  trainButtonRef?: React.Ref<View>;
  labels: Readonly<{ back: string; create: string; trainA11y: string   /**
   * Новичок: своих карточек и наборов нет (макет cards-section-extra.js hubNewS). Вместо стопки — стеклянная карточка
   * «Начните с готового», главная кнопка — «Выбрать набор» (а не тренировка, тренировать пока нечего).
   */
  fresh?: Readonly<{ title: string; sub: string; cta: string; onPress: () => void }>;
}>;
}>;

/** Смешивает цвет темы с тёмным основанием (как color-mix макета: доля темы + тёмный). */
function mixDark(hex: string, base: string, t: number): string {
  const c = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = c(hex.length >= 7 ? hex : '#888888');
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
  return [g.accent, g.accentBorder];
}

// зачем (макет cards-section.css: границ у карточек НЕТ, «кромка» — внутренние тени): подсветка сверху-слева, тень снизу-справа и
// тонкое кольцо 1px. Рисуем отдельным слоем поверх заливки (внутренняя тень лежит под детьми, а градиент перекрыл бы её).
const bevel = (hi: string, ring: string): BoxShadowValue[] => [
  { inset: true, offsetX: 1, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: hi },
  { inset: true, offsetX: -1, offsetY: -1.5, blurRadius: 0, spreadDistance: -0.2, color: 'rgba(0,0,0,0.45)' },
  { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 0.5, color: ring },
];

const DROP: BoxShadowValue[] = [{ offsetX: 0, offsetY: 14, blurRadius: 26, spreadDistance: -12, color: 'rgba(0,0,0,0.85)' }];

const Edge = ({ radius, shadows }: { radius: number; shadows: BoxShadowValue[] }) => (
  <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: shadows }]} />
);

/** Заливка карточки стопки: 145°, доля цвета темы 50 %/38 % в тёмном — как «.mc.solid» макета. */
const stackFill = (a: string, b: string) => [mixDark(a, '#0D0D12', 0.5), '#08080B', mixDark(b, '#08080B', 0.38)] as const;
const DIAG_START = { x: 0.21, y: 0.09 } as const;
const DIAG_END = { x: 0.79, y: 0.91 } as const;

const StackCard = ({ g, style, radius, opacity }: { g: GlassTokens; style: StyleProp<ViewStyle>; radius: number; opacity: number }) => {
  const [a, b] = themePair(g);
  return (
    <View pointerEvents="none" style={[styles.stackCard, style, { borderRadius: radius, opacity, boxShadow: DROP }]}>
      <LinearGradient colors={stackFill(a, b)} locations={[0, 0.58, 1]} start={DIAG_START} end={DIAG_END} style={StyleSheet.absoluteFill} />
      <Edge radius={radius} shadows={bevel('rgba(255,255,255,0.30)', `${a}59`)} />
    </View>
  );
};

function CardsHubV2Inner({
  g, title, subtitle, limitLabel, topWord, topIpa, trainLabel, trainLocked, tiles, reduceMotion,
  onBack, onCreate, onTrain, trainButtonRef, labels, availableHeight, fresh,
}: Props) {
  const float = useSharedValue(0);
  // зачем (Performance Bible, сторож perf_freeze_contract): бесконечное «парение» живёт только пока экран в фокусе и приложение на переднем плане.
  const runtimeActive = useRuntimeActive();
  useEffect(() => {
    if (reduceMotion || !runtimeActive) return undefined;
    float.value = withRepeat(withTiming(-8, { duration: 5000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => { float.value = 0; };
  }, [float, reduceMotion, runtimeActive]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const [a, b] = themePair(g);
  // зачем (макет 932dp: стопка 250, плитки 150): на невысоких экранах сжимаем стопку и плитки пропорционально, чтобы хаб оставался без прокрутки.
  const fixed = 4 + 44 + 8 + 46 + 6 + 22 + 26 + 14 + 52 + 20 + 12 + 28; // +28: воздух снизу, как в макете
  const rem = Math.max(0, availableHeight - fixed);
  const { fontScale } = useWindowDimensions();
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
      <View style={[styles.topbar, fs > 1 && { height: undefined, minHeight: 44 }]}>
        <Pressable testID="fc-cards-hub-back" accessibilityRole="button" accessibilityLabel={labels.back} onPress={onBack} hitSlop={8}
          style={({ pressed }) => [styles.round, { backgroundColor: g.opaqueControl }, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={20} color={g.text} />
        </Pressable>
        <View style={styles.topRight}>
          {limitLabel ? (
            <View testID="fc-cards-hub-limit" style={[styles.pill, fs > 1 && { height: undefined, minHeight: 30, paddingVertical: 2 }, { backgroundColor: g.opaqueControl }]}>
              <Ionicons name="albums-outline" size={16} color={g.text} />
              <Text style={[styles.pillText, { color: g.text, lineHeight: lh(20) }]}>{limitLabel}</Text>
            </View>
          ) : null}
          <Pressable testID="fc-cards-hub-create-pack" accessibilityRole="button" accessibilityLabel={labels.create} onPress={onCreate} hitSlop={8}
            style={({ pressed }) => [styles.round, { backgroundColor: g.opaqueControl }, pressed && styles.pressed]}>
            <Ionicons name="add" size={22} color={g.text} />
          </Pressable>
        </View>
      </View>

      <Text accessibilityRole="header" style={[styles.title, { color: g.text, lineHeight: lh(46) }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: g.secondary, lineHeight: lh(22) }]}>{subtitle}</Text>

      {fresh ? (
        // зачем (Сверка cards-section-003, hubNewS): у новичка не было этого состояния — стопка показывала выдуманную
        // карточку «Boarding pass», которой у человека нет. Карточка по центру: плитка 64/r20, 24/700, подпись 16.
        <View testID="fc-cards-hub-fresh" style={[styles.fresh, { minHeight: stackH, boxShadow: [{ offsetX: 0, offsetY: 18, blurRadius: 40, spreadDistance: -18, color: 'rgba(0,0,0,0.85)' }] }]}>
          <LinearGradient
            pointerEvents="none"
            colors={[`${mixDark(a, '#0E0E12', 0.17)}B0`, 'rgba(14,14,18,0.58)', `${mixDark(b, '#0E0E12', 0.17)}A3`]}
            locations={[0, 0.6, 1]}
            start={{ x: 0.25, y: 0.067 }}
            end={{ x: 0.75, y: 0.933 }}
            style={[StyleSheet.absoluteFill, styles.tileFill]}
          />
          <View style={styles.freshIcon}>
            <LinearGradient pointerEvents="none" colors={[mixDark(a, '#1E1E20', 0.6), mixDark(b, '#08080B', 0.32)]} start={DIAG_START} end={DIAG_END} style={StyleSheet.absoluteFill} />
            <Ionicons name="people-outline" size={28} color="#FFFFFF" />
            <Edge radius={20} shadows={[
              { inset: true, offsetX: 1, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: 'rgba(255,255,255,0.32)' },
              { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 0.5, color: 'rgba(255,255,255,0.08)' },
            ]} />
          </View>
          <Text accessibilityRole="header" style={[styles.freshTitle, { color: g.text, lineHeight: lh(30) }]}>{fresh.title}</Text>
          <Text style={[styles.freshSub, { color: g.secondary, lineHeight: lh(22) }]}>{fresh.sub}</Text>
          <Edge radius={26} shadows={bevel('rgba(255,255,255,0.26)', 'rgba(255,255,255,0.07)')} />
        </View>
      ) : (
      <View style={[styles.stack, { height: stackH }]} pointerEvents="box-none">
        <StackCard g={g} opacity={0.7} radius={28} style={[styles.stackBack2, { height: Math.round(110 * k) }]} />
        <StackCard g={g} opacity={0.9} radius={28} style={[styles.stackBack1, { top: Math.round(18 * k), height: Math.round(130 * k) }]} />
        <Reanimated.View style={[styles.stackTop, { top: Math.round(40 * k), height: Math.round(200 * k), boxShadow: DROP }, floatStyle]} pointerEvents="none">
          <LinearGradient colors={stackFill(a, b)} locations={[0, 0.58, 1]} start={DIAG_START} end={DIAG_END} style={StyleSheet.absoluteFill} />
          <Text style={[styles.topWord, { lineHeight: lh(44) }]} numberOfLines={fs > 1 ? undefined : 1}>{topWord}</Text>
          {topIpa ? <Text style={[styles.topIpa, { lineHeight: lh(20) }]} numberOfLines={fs > 1 ? undefined : 1}>{topIpa}</Text> : null}
          <Edge radius={30} shadows={bevel('rgba(255,255,255,0.30)', `${a}59`)} />
        </Reanimated.View>
      </View>
      )}

      <Pressable ref={trainButtonRef} testID="fc-cards-hub-train" accessibilityRole="button" accessibilityLabel={fresh ? fresh.cta : labels.trainA11y} onPress={fresh ? fresh.onPress : onTrain}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: g.accent, boxShadow: [{ offsetX: 0, offsetY: 14, blurRadius: 30, spreadDistance: -12, color: `${g.accent}B3` }] },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.ctaText, { color: g.accentInk, lineHeight: lh(22) }]}>{fresh ? fresh.cta : trainLabel}</Text>
        <View style={styles.ctaIcon}>
          <Ionicons name={!fresh && trainLocked ? 'lock-closed' : 'arrow-forward'} size={20} color={g.accentInk} />
        </View>
        <Edge radius={26} shadows={[{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: 'rgba(255,255,255,0.7)' }]} />
      </Pressable>

      <View style={styles.tiles}>
        {tiles.map((t) => (
          <Pressable key={t.id} testID={`fc-cards-hub-tile-${t.id}`} accessibilityRole="button" accessibilityLabel={t.count === '' ? t.title : `${t.title}. ${t.count}`} onPress={t.onPress}
            style={({ pressed }) => [
              styles.tile,
              { minHeight: tileH, boxShadow: [{ offsetX: 0, offsetY: 18, blurRadius: 40, spreadDistance: -18, color: 'rgba(0,0,0,0.85)' }] },
              pressed && styles.pressed,
            ]}>
            {/* зачем: заливка плитки макета «.gl.pad» — 150°, цвета темы и тёмная середина; прозрачность оставляет пятна фона */}
            <LinearGradient
              pointerEvents="none"
              colors={[`${mixDark(a, '#0E0E12', 0.17)}B0`, 'rgba(14,14,18,0.58)', `${mixDark(b, '#0E0E12', 0.17)}A3`]}
              locations={[0, 0.6, 1]}
              start={{ x: 0.25, y: 0.067 }}
              end={{ x: 0.75, y: 0.933 }}
              style={[StyleSheet.absoluteFill, styles.tileFill]}
            />
            <View style={styles.tileIcon}>
              <LinearGradient pointerEvents="none" colors={[mixDark(a, '#1E1E20', 0.6), mixDark(b, '#08080B', 0.32)]} start={DIAG_START} end={DIAG_END} style={StyleSheet.absoluteFill} />
              <Ionicons name={t.icon} size={24} color="#FFFFFF" />
              <Edge radius={15} shadows={[
                { inset: true, offsetX: 1, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: 'rgba(255,255,255,0.32)' },
                { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 0.5, color: 'rgba(255,255,255,0.08)' },
              ]} />
            </View>
            <View>
              <Text style={[styles.tileTitle, { color: g.text, lineHeight: lh(25) }]} numberOfLines={fs > 1 ? undefined : 1}>{t.title}</Text>
              <Text style={[styles.tileCount, { color: g.secondary, lineHeight: lh(19) }]} numberOfLines={fs > 1 ? undefined : 1}>{t.count === '' ? ' ' : t.count}</Text>
            </View>
            <Edge radius={26} shadows={bevel('rgba(255,255,255,0.26)', 'rgba(255,255,255,0.07)')} />
          </Pressable>
        ))}
      </View>
    </View>
  );
  // зачем: при крупном шрифте хаб не помещается в экран — прокручивается; при 1.0 прежняя разметка без ScrollView (макет без прокрутки)
  return fs > 1
    ? <ScrollView contentContainerStyle={styles.scrollGrow} showsVerticalScrollIndicator={false}>{body}</ScrollView>
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
  pillText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  title: { marginTop: 8, fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { marginTop: 6, fontSize: 16, lineHeight: 22, letterSpacing: 0.15 },
  stack: { height: 250, marginTop: 26 },
  stackCard: { position: 'absolute', overflow: 'hidden' },
  stackBack2: { left: 38, right: 38, top: 0, height: 110 },
  stackBack1: { left: 19, right: 19, top: 18, height: 130 },
  stackTop: { position: 'absolute', left: 0, right: 0, top: 40, height: 200, borderRadius: 30, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  topWord: { color: '#FFFFFF', fontSize: 36, lineHeight: 44, fontWeight: '700', paddingHorizontal: 16 },
  topIpa: { marginTop: 8, color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 20, fontStyle: 'italic' },
  // зачем: текст кнопки не обрезается («осталось 28 и…» на эмуляторе) — меньше боковые поля и перенос строки вместо многоточия; кегль не ужимаем
  cta: { marginTop: 14, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 8 },
  ctaText: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  ctaIcon: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  tiles: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '48%', flexGrow: 1, minHeight: 150, borderRadius: 26, paddingHorizontal: 16, paddingVertical: 18, justifyContent: 'space-between' },
  tileFill: { borderRadius: 26 },
  // hubNewS `.gl.pad`: 26 от подзаголовка, высота стопки (250 в макете), всё по центру.
  fresh: { marginTop: 26, borderRadius: 26, paddingHorizontal: 22, paddingVertical: 22, alignItems: 'center', justifyContent: 'center' },
  freshIcon: { width: 64, height: 64, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  freshTitle: { marginTop: 18, fontSize: 24, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  freshSub: { marginTop: 6, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  tileIcon: { width: 52, height: 52, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  tileCount: { fontSize: 15, lineHeight: 19 },
});
