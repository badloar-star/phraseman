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
import { Pressable, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from '../../components/SafeLinearGradient';
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
  labels: Readonly<{ back: string; create: string; trainA11y: string }>;
}>;

/** Смешивает цвет темы с тёмным основанием (как color-mix макета: 46% темы + тёмный) — карточки НЕПРОЗРАЧНЫЕ, без просвечивания слоёв. */
function mixDark(hex: string, base: string, t: number): string {
  const c = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = c(hex.length >= 7 ? hex : '#888888');
  const b = c(base);
  return `#${a.map((v, i) => Math.round(v * t + b[i]! * (1 - t)).toString(16).padStart(2, '0')).join('')}`;
}

/** Два цвета темы для градиента внутри карточек: из роли градиента акцента, иначе — акцент и кромка. */
function themePair(g: GlassTokens): readonly [string, string] {
  const gr = g.accentGradient;
  if (gr && gr.length >= 2) return [gr[0]!, gr[gr.length - 1]!];
  return [g.accent, g.accentBorder];
}

const StackCard = ({ g, style, opacity }: { g: GlassTokens; style: StyleProp<ViewStyle>; opacity: number }) => {
  const [a, b] = themePair(g);
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[mixDark(a, '#0A0A0E', 0.46), '#08080C', mixDark(b, '#08080C', 0.4)]}
      locations={[0, 0.58, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.stackCard, style, { opacity }]}
    />
  );
};

function CardsHubV2Inner({
  g, title, subtitle, limitLabel, topWord, topIpa, trainLabel, trainLocked, tiles, reduceMotion,
  onBack, onCreate, onTrain, trainButtonRef, labels, availableHeight,
}: Props) {
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return undefined;
    float.value = withRepeat(withTiming(-8, { duration: 5000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => { float.value = 0; };
  }, [float, reduceMotion]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const [a, b] = themePair(g);
  // зачем (макет 932dp: стопка 250, плитки 150): на невысоких экранах сжимаем стопку и плитки пропорционально, чтобы хаб оставался без прокрутки.
  const fixed = 44 + 4 + 8 + 40 + 2 + 22 + 26 + 14 + 52 + 20 + 12 + 28; // +28: воздух снизу, как в макете
  const rem = Math.max(0, availableHeight - fixed);
  const stackH = Math.round(Math.min(250, Math.max(150, rem * 0.42)));
  const tileH = Math.round(Math.min(150, Math.max(96, (rem - stackH) / 2)));
  const k = stackH / 250;

  return (
    <View style={styles.root} testID="fc-cards-hub-v2">
      <View style={styles.topbar}>
        <Pressable testID="fc-cards-hub-back" accessibilityRole="button" accessibilityLabel={labels.back} onPress={onBack} hitSlop={8}
          style={({ pressed }) => [styles.round, { backgroundColor: g.opaqueControl }, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={20} color={g.text} />
        </Pressable>
        <View style={styles.topRight}>
          {limitLabel ? (
            <View testID="fc-cards-hub-limit" style={[styles.pill, { backgroundColor: g.opaqueControl }]}>
              <Ionicons name="albums-outline" size={16} color={g.text} />
              <Text style={[styles.pillText, { color: g.text }]}>{limitLabel}</Text>
            </View>
          ) : null}
          <Pressable testID="fc-cards-hub-create-pack" accessibilityRole="button" accessibilityLabel={labels.create} onPress={onCreate} hitSlop={8}
            style={({ pressed }) => [styles.round, { backgroundColor: g.opaqueControl }, pressed && styles.pressed]}>
            <Ionicons name="add" size={22} color={g.text} />
          </Pressable>
        </View>
      </View>

      <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: g.secondary }]}>{subtitle}</Text>

      <View style={[styles.stack, { height: stackH }]} pointerEvents="box-none">
        <StackCard g={g} opacity={0.7} style={[styles.stackBack2, { height: Math.round(110 * k) }]} />
        <StackCard g={g} opacity={0.9} style={[styles.stackBack1, { top: Math.round(18 * k), height: Math.round(130 * k) }]} />
        <Reanimated.View style={[styles.stackTop, { top: Math.round(40 * k), height: Math.round(200 * k) }, floatStyle]} pointerEvents="none">
          <LinearGradient
            colors={[mixDark(a, '#0A0A0E', 0.5), '#08080C', mixDark(b, '#08080C', 0.42)]}
            locations={[0, 0.58, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.topWord} numberOfLines={1}>{topWord}</Text>
          {topIpa ? <Text style={styles.topIpa} numberOfLines={1}>{topIpa}</Text> : null}
        </Reanimated.View>
      </View>

      <Pressable ref={trainButtonRef} testID="fc-cards-hub-train" accessibilityRole="button" accessibilityLabel={labels.trainA11y} onPress={onTrain}
        style={({ pressed }) => [styles.cta, { backgroundColor: g.accent }, pressed && styles.pressed]}>
        <Text style={[styles.ctaText, { color: g.accentInk }]} numberOfLines={1}>{trainLabel}</Text>
        <View style={styles.ctaIcon}>
          <Ionicons name={trainLocked ? 'lock-closed' : 'arrow-forward'} size={20} color={g.accentInk} />
        </View>
      </Pressable>

      <View style={styles.tiles}>
        {tiles.map((t) => (
          <Pressable key={t.id} testID={`fc-cards-hub-tile-${t.id}`} accessibilityRole="button" accessibilityLabel={`${t.title}. ${t.count}`} onPress={t.onPress}
            style={({ pressed }) => [styles.tile, { backgroundColor: g.opaqueCard, minHeight: tileH }, pressed && styles.pressed]}>
            <LinearGradient pointerEvents="none" colors={[`${a}2E`, 'transparent', `${b}24`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient pointerEvents="none" colors={['#FFFFFF24', '#FFFFFF00']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 0.6 }} style={StyleSheet.absoluteFill} />
            <View style={[styles.tileIcon, { backgroundColor: g.accentTile }]}>
              <Ionicons name={t.icon} size={24} color={g.lightTint} />
            </View>
            <View>
              <Text style={[styles.tileTitle, { color: g.text }]} numberOfLines={1}>{t.title}</Text>
              <Text style={[styles.tileCount, { color: g.secondary }]} numberOfLines={1}>{t.count === '' ? ' ' : t.count}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const CardsHubV2 = memo(CardsHubV2Inner);
export default CardsHubV2;

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  pressed: { opacity: 0.82 },
  topbar: { height: 44, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pill: { height: 36, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  title: { marginTop: 8, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { marginTop: 2, fontSize: 16, lineHeight: 22 },
  stack: { height: 250, marginTop: 26 },
  // зачем (макет): тонкая 1px полупрозрачная кромка карточек — разрешена исключением PhraseMan 2.0 (толстых и цветных рамок нет)
  stackCard: { position: 'absolute', borderRadius: 28, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  stackBack2: { left: 38, right: 38, top: 0, height: 110 },
  stackBack1: { left: 19, right: 19, top: 18, height: 130 },
  stackTop: { position: 'absolute', left: 0, right: 0, top: 40, height: 200, borderRadius: 30, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  topWord: { color: '#FFFFFF', fontSize: 36, lineHeight: 42, fontWeight: '700', paddingHorizontal: 16 },
  topIpa: { marginTop: 8, color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 22, fontStyle: 'italic' },
  cta: { marginTop: 14, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44 },
  ctaText: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  ctaIcon: { position: 'absolute', right: 20, top: 0, bottom: 0, justifyContent: 'center' },
  tiles: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '48%', flexGrow: 1, minHeight: 150, borderRadius: 26, padding: 16, justifyContent: 'space-between', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  tileIcon: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 19, lineHeight: 24, fontWeight: '700' },
  tileCount: { marginTop: 2, fontSize: 15, lineHeight: 20 },
});
