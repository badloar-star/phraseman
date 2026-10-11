/**
 * Хаб «Карточки 2.0».
 *
 * зачем (приказ владельца 11.10 по хабу: «верни хаб как был, 4 кнопки внизу… не большие три карточки парящие, а вот как сейчас… но внизу было
 * 4 кнопки крупные»): ВЕРХ — как сейчас (шапка с лупой и «+», заголовок, hero «Продолжить» со стопкой, главная кнопка и кнопка режимов);
 * НИЗ — сетка 2×2 из четырёх КРУПНЫХ плиток: Сохранённые, Мои наборы, Из видео, Сообщество (иконка сверху слева, название и счётчик снизу).
 * «Твои карточки» (две плитки), лента «Из видео» с роликами и чарт «Лучшее у сообщества» убраны. Стиль «Тень»: плашки без обводок.
 * Чистый вид без данных и навигации — всё приходит пропсами из FlashcardsHubScreen.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { FlowText } from '../../components/text-integrity/FlowText';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow, raisedBoxShadow } from '../../components/v2/ShadowSurface';

export type CardsHubTile = Readonly<{
  id: 'saved' | 'mine' | 'video' | 'community';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** Счётчик под названием; пусто — число ещё не известно (подпись плитки тогда без числа). */
  count: string;
  onPress: () => void;
}>;

type Props = Readonly<{
  g: GlassTokens;
  title: string;
  hero: Readonly<{
    overline: string;
    word: string;
    sub: string;
    /** Позиция в наборе 0…1; null — данных нет, полоса скрыта. */
    progress: number | null;
    ctaLabel: string;
    ctaLocked: boolean;
    modeLabel: string;
    onCta: () => void;
    onMode: () => void;
  }>;
  /** Четыре крупные плитки внизу (сетка 2×2). */
  tiles: readonly CardsHubTile[];
  reduceMotion: boolean;
  onBack: () => void;
  /** Лупа в шапке (макет `hubTop`); поиск по трём группам — у Ядра, пока открывает поиск «Сохранённых». */
  onSearch: () => void;
  onCreate: () => void;
  ctaRef?: React.Ref<View>;
  labels: Readonly<{ back: string; create: string; search: string; ctaA11y: string }>;
}>;

/** Появление секций по очереди (макет `.rise`: 520 мс, cubic-bezier(.2,.8,.2,1), шаг 50 мс). «Уменьшить движение» — без анимации. */
function Rise({ index, reduceMotion, children }: Readonly<{ index: number; reduceMotion: boolean; children: React.ReactNode }>) {
  if (reduceMotion) return <View>{children}</View>;
  return <Reanimated.View entering={FadeInDown.duration(520).delay(index * 50)}>{children}</Reanimated.View>;
}

function RoundBtn({ g, icon, label, onPress, testID }: Readonly<{ g: GlassTokens; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; testID: string }>) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}
      style={({ pressed }) => [styles.round, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }, pressed && styles.pressed]}>
      <Ionicons name={icon} size={icon === 'add' ? 22 : 20} color={g.text} />
    </Pressable>
  );
}

function CardsHubV2Inner({ g, title, hero, tiles, reduceMotion, onBack, onSearch, onCreate, ctaRef, labels }: Props) {
  const { fontScale } = useWindowDimensions();
  const fs = Math.max(1, fontScale);
  // зачем (large font): высота hero растёт с системным шрифтом, чтобы слово и подпись не резались; сам шрифт не сжимаем.
  const heroH = Math.round(192 * (fs > 1 ? Math.min(fs, 1.4) : 1));
  let idx = 0;

  return (
    <ScrollView testID="fc-cards-hub-v2" style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false} decelerationRate="fast">
      <View style={styles.topbar}>
        <RoundBtn g={g} icon="arrow-back" label={labels.back} onPress={onBack} testID="fc-cards-hub-back" />
        <View style={styles.topRight}>
          <RoundBtn g={g} icon="search" label={labels.search} onPress={onSearch} testID="fc-cards-hub-search" />
          <RoundBtn g={g} icon="add" label={labels.create} onPress={onCreate} testID="fc-cards-hub-create-pack" />
        </View>
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>

      <Rise index={idx++} reduceMotion={reduceMotion}>
        <View style={styles.hstk} testID="fc-cards-hub-hero">
          <View pointerEvents="none" style={[styles.slab, styles.slabA, { boxShadow: nestedBoxShadow(g) }]}><PlateFill g={g} radius={18} /></View>
          <View pointerEvents="none" style={[styles.slab, styles.slabB, { boxShadow: nestedBoxShadow(g) }]}><PlateFill g={g} radius={18} /></View>
          <View style={[styles.hc, { height: heroH, boxShadow: raisedBoxShadow(g) }]}>
            <PlateFill g={g} radius={22} raised />
            <Text style={[styles.ov, { color: g.secondary }]}>{hero.overline.toUpperCase()}</Text>
            <View style={styles.hbottom}>
              <FlowText testID="fc-cards-hub-hero-word" provenance="external" style={[styles.hw, { color: g.text }]}>{hero.word}</FlowText>
              {hero.sub ? <FlowText testID="fc-cards-hub-hero-sub" provenance="external" style={[styles.hs, { color: g.secondary }]}>{hero.sub}</FlowText> : null}
              {hero.progress !== null ? (
                <View style={[styles.trk, { backgroundColor: g.dividerTone }]}>
                  <View style={[styles.trkFill, { backgroundColor: g.accent, width: `${Math.round(Math.max(0, Math.min(1, hero.progress)) * 100)}%` }]} />
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.ctaRow}>
          <Pressable ref={ctaRef} testID="fc-cards-hub-train" accessibilityRole="button" accessibilityLabel={labels.ctaA11y} onPress={hero.onCta}
            style={({ pressed }) => [styles.cta, hero.ctaLocked ? { backgroundColor: g.opaqueControl, boxShadow: nestedBoxShadow(g) } : { backgroundColor: g.accent, boxShadow: actionBoxShadow(g) }, pressed && styles.pressed]}>
            <Ionicons name={hero.ctaLocked ? 'lock-closed' : 'play'} size={18} color={hero.ctaLocked ? g.text : g.accentInk} />
            <FlowText testID="fc-cards-hub-train-label" provenance="authored" style={[styles.ctaText, { color: hero.ctaLocked ? g.text : g.accentInk }]}>{hero.ctaLabel}</FlowText>
          </Pressable>
          <Pressable testID="fc-cards-hub-mode" accessibilityRole="button" accessibilityLabel={hero.modeLabel} onPress={hero.onMode} hitSlop={6}
            style={({ pressed }) => [styles.modeBtn, { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }, pressed && styles.pressed]}>
            <Ionicons name="layers-outline" size={20} color={g.text} />
          </Pressable>
        </View>
      </Rise>

      <Rise index={idx++} reduceMotion={reduceMotion}>
        <View style={styles.tiles}>
          {tiles.map((t) => (
            <Pressable key={t.id} testID={`fc-cards-hub-tile-${t.id}`} accessibilityRole="button" accessibilityLabel={t.count === '' ? t.title : `${t.title}. ${t.count}`} onPress={t.onPress}
              style={({ pressed }) => [styles.tile, { boxShadow: plateBoxShadow(g) }, pressed && styles.pressed]}>
              {/* зачем (Тень 12.10, приказ владельца 11.10): крупная плитка — плашка (градиент 180° + тень), без фасок и кольца */}
              <PlateFill g={g} radius={26} />
              <View style={[styles.tileIcon, { backgroundColor: g.opaqueControl, boxShadow: nestedBoxShadow(g) }]}>
                <Ionicons name={t.icon} size={24} color={g.text} />
              </View>
              <View>
                <FlowText testID={`fc-cards-hub-tile-title-${t.id}`} provenance="authored" style={[styles.tileTitle, { color: g.text }]}>{t.title}</FlowText>
                <FlowText testID={`fc-cards-hub-tile-count-${t.id}`} provenance="authored" style={[styles.tileCount, { color: g.secondary }]}>{t.count === '' ? ' ' : t.count}</FlowText>
              </View>
            </Pressable>
          ))}
        </View>
      </Rise>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tiles: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '48%', flexGrow: 1, minHeight: 150, borderRadius: 26, paddingHorizontal: 16, paddingVertical: 18, justifyContent: 'space-between' },
  tileIcon: { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  tileCount: { fontSize: 16, lineHeight: 21 },
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  pressed: { opacity: 0.82 },
  topbar: { minHeight: 44, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 8, fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.6 },
  hstk: { position: 'relative', paddingTop: 22, marginTop: 22 },
  slab: { position: 'absolute', left: '50%', height: 40, borderRadius: 18 },
  slabA: { top: 0, width: '84%', marginLeft: '-42%', opacity: 0.55 },
  slabB: { top: 10, width: '92%', marginLeft: '-46%', opacity: 0.85 },
  hc: { borderRadius: 22, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 20 },
  ov: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 2.4 },
  hbottom: { marginTop: 'auto' },
  hw: { fontSize: 38, lineHeight: 44, fontWeight: '700', letterSpacing: -0.8 },
  hs: { marginTop: 4, fontSize: 16, lineHeight: 22 },
  trk: { marginTop: 16, height: 4, borderRadius: 2, overflow: 'hidden' },
  trkFill: { height: '100%', borderRadius: 2 },
  ctaRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cta: { flex: 1, minHeight: 56, borderRadius: 28, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  modeBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});

export default memo(CardsHubV2Inner);
