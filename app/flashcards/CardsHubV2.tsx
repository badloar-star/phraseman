/**
 * Хаб «Карточки 2.0» — утверждён владельцем 12.10 (макет docs/design/v2-app/cards-v2.html, блок «Хаб»; перекрывает прежний «вариант А» из CARDS_LOCKED).
 *
 * зачем (владелец: «да подтверждаю. этот хаб и все остальное тут в карточки 2.0 все в работу»): экран прокручивается и состоит из секций —
 * шапка (назад, «+»), заголовок, hero «Продолжить» (стопка плашек, слово, подпись, полоса позиции, главная кнопка и кнопка режимов),
 * «Твои карточки» (две плитки: мозаика сохранённых и стопка обложек наборов), лента «Из видео» (карточки 252) и чарт «Лучшее у сообщества».
 * Чистый вид без данных и навигации — всё приходит пропсами из FlashcardsHubScreen. Стиль «Тень»: плашки без обводок (components/v2/ShadowSurface).
 * Секции, для которых у приложения пока нет данных (позиция «Продолжить», чарт без наборов), скрываются, а не выдумываются.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { FlowText } from '../../components/text-integrity/FlowText';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow, raisedBoxShadow } from '../../components/v2/ShadowSurface';

export type CardsHubVideoItem = Readonly<{ id: string; title: string; meta: string; thumbUrl: string | null; duration: string; onPress: () => void }>;
export type CardsHubCommunityItem = Readonly<{ id: string; title: string; sub: string; word: string; likes: string; onPress: () => void }>;

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
  yours: Readonly<{
    title: string;
    saved: Readonly<{ title: string; count: string; empty: boolean; emptyLabel: string; words: readonly string[]; onPress: () => void }>;
    mine: Readonly<{ title: string; count: string; empty: boolean; emptyLabel: string; covers: readonly Readonly<{ title: string; count: string }>[]; onPress: () => void }>;
  }>;
  video: Readonly<{ title: string; allLabel: string; items: readonly CardsHubVideoItem[]; onAll: () => void }> | null;
  community: Readonly<{ title: string; allLabel: string; items: readonly CardsHubCommunityItem[]; onAll: () => void }> | null;
  reduceMotion: boolean;
  onBack: () => void;
  onCreate: () => void;
  ctaRef?: React.Ref<View>;
  labels: Readonly<{ back: string; create: string; ctaA11y: string }>;
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

function SectionHead({ g, title, allLabel, onAll }: Readonly<{ g: GlassTokens; title: string; allLabel?: string; onAll?: () => void }>) {
  return (
    <View style={styles.sec}>
      <Text accessibilityRole="header" style={[styles.secTitle, { color: g.text }]}>{title}</Text>
      {allLabel && onAll ? (
        <Pressable accessibilityRole="button" accessibilityLabel={allLabel} onPress={onAll} hitSlop={10} style={({ pressed }) => [styles.secAll, pressed && styles.pressed]}>
          <Text style={[styles.secAllText, { color: g.secondary }]}>{allLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={g.secondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Мини-плашка слова (макет `.mc`): мозаика сохранённых и обложки чарта. */
function WordChip({ g, text, style }: Readonly<{ g: GlassTokens; text: string; style?: object }>) {
  return (
    <View style={[styles.mc, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }, style]}>
      <Text numberOfLines={1} style={[styles.mcText, { color: g.text }]}>{text}</Text>
    </View>
  );
}

const Tile = memo(function Tile({ g, testID, title, count, onPress, icon, children }: Readonly<{ g: GlassTokens; testID: string; title: string; count: string; onPress: () => void; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }>) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`${title}, ${count}`} onPress={onPress}
      style={({ pressed }) => [styles.tile, { boxShadow: plateBoxShadow(g) }, pressed && styles.pressed]}>
      <PlateFill g={g} radius={22} />
      {children}
      <View style={styles.yft}>
        <View style={styles.yftText}>
          <FlowText testID="fc-cards-hub-tile-title" provenance="authored" style={[styles.ytt, { color: g.text }]}>{title}</FlowText>
          <FlowText testID="fc-cards-hub-tile-count" provenance="authored" style={[styles.ysu, { color: g.secondary }]}>{count}</FlowText>
        </View>
        <Ionicons name={icon} size={18} color={g.secondary} style={styles.yftIcon} />
      </View>
    </Pressable>
  );
});

function CardsHubV2Inner({ g, title, hero, yours, video, community, reduceMotion, onBack, onCreate, ctaRef, labels }: Props) {
  const { fontScale } = useWindowDimensions();
  const fs = Math.max(1, fontScale);
  // зачем (large font): высота hero растёт с системным шрифтом, чтобы слово и подпись не резались; сам шрифт не сжимаем.
  const heroH = Math.round(192 * (fs > 1 ? Math.min(fs, 1.4) : 1));
  const hasVideo = !!video && video.items.length > 0;
  const hasCommunity = !!community && community.items.length > 0;
  let idx = 0;

  return (
    <ScrollView testID="fc-cards-hub-v2" style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false} decelerationRate="fast">
      <View style={styles.topbar}>
        <RoundBtn g={g} icon="arrow-back" label={labels.back} onPress={onBack} testID="fc-cards-hub-back" />
        <RoundBtn g={g} icon="add" label={labels.create} onPress={onCreate} testID="fc-cards-hub-create-pack" />
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
        <SectionHead g={g} title={yours.title} />
        <View style={styles.ygrid}>
          <Tile g={g} testID="fc-cards-hub-tile-saved" title={yours.saved.title} count={yours.saved.empty ? yours.saved.emptyLabel : yours.saved.count} onPress={yours.saved.onPress} icon="bookmark-outline">
            <View style={[styles.ymos, yours.saved.empty && styles.dim]}>
              {(yours.saved.empty ? ['', '', '', ''] : yours.saved.words.slice(0, 4)).map((w, i) => <WordChip key={`m${i}`} g={g} text={w} style={styles.ymosItem} />)}
            </View>
          </Tile>
          <Tile g={g} testID="fc-cards-hub-tile-mine" title={yours.mine.title} count={yours.mine.empty ? yours.mine.emptyLabel : yours.mine.count} onPress={yours.mine.onPress} icon="layers-outline">
            <View style={styles.ystk}>
              {yours.mine.empty ? (
                <View style={[styles.cv, styles.cvEmpty, { top: 40, backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}>
                  <Ionicons name="add" size={20} color={g.secondary} />
                </View>
              ) : yours.mine.covers.slice(0, 3).map((c, i) => (
                <View key={`c${i}`} style={[styles.cv, { top: (2 - i) * 20, zIndex: 3 - i, backgroundColor: g.plateFillTo, boxShadow: nestedBoxShadow(g) }]}>
                  <Text numberOfLines={1} style={[styles.cvTitle, { color: g.text }]}>{c.title}</Text>
                  <Text style={[styles.cvCount, { color: g.secondary }]}>{c.count}</Text>
                </View>
              )).reverse()}
            </View>
          </Tile>
        </View>
      </Rise>

      {hasVideo && video ? (
        <Rise index={idx++} reduceMotion={reduceMotion}>
          <SectionHead g={g} title={video.title} allLabel={video.allLabel} onAll={video.onAll} />
          <ScrollView /* guard-ok: лента «Из видео» — не более 8 роликов */ horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={264} snapToAlignment="start" contentContainerStyle={styles.rail}>
            {video.items.map((v) => (
              <Pressable key={v.id} testID={`fc-cards-hub-video-${v.id}`} accessibilityRole="button" accessibilityLabel={`${v.title}, ${v.meta}`} onPress={v.onPress}
                style={({ pressed }) => [styles.vcard, pressed && styles.pressed]}>
                <View style={[styles.vfr, { backgroundColor: g.opaqueControl, boxShadow: plateBoxShadow(g) }]}>
                  {v.thumbUrl ? <Image source={{ uri: v.thumbUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} accessible={false} /> : null}
                  {v.duration ? <View style={styles.dur}><Text style={styles.durText}>{v.duration}</Text></View> : null}
                </View>
                <FlowText testID="fc-cards-hub-video-title" provenance="external" style={[styles.vt, { color: g.text }]}>{v.title}</FlowText>
                <FlowText testID="fc-cards-hub-video-meta" provenance="authored" style={[styles.vm, { color: g.secondary }]}>{v.meta}</FlowText>
              </Pressable>
            ))}
          </ScrollView>
        </Rise>
      ) : null}

      {hasCommunity && community ? (
        <Rise index={idx++} reduceMotion={reduceMotion}>
          <SectionHead g={g} title={community.title} allLabel={community.allLabel} onAll={community.onAll} />
          <View>
            {community.items.map((c, i) => (
              <React.Fragment key={c.id}>
              {/* зачем (стиль «Тень»): разделитель строк чарта — тонкий View, а не рамка контейнера */}
              {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: g.dividerTone }} /> : null}
              <Pressable testID={`fc-cards-hub-community-${c.id}`} accessibilityRole="button" accessibilityLabel={`${i + 1}. ${c.title}, ${c.sub}`} onPress={c.onPress}
                style={({ pressed }) => [styles.cr, pressed && styles.pressed]}>
                <Text style={[styles.rk, { color: g.mutedText }]}>{i + 1}</Text>
                <View style={styles.cov}>
                  <View pointerEvents="none" style={[styles.covBack, { backgroundColor: g.plateFillTo, boxShadow: nestedBoxShadow(g) }]} />
                  <WordChip g={g} text={c.word} style={styles.covChip} />
                </View>
                <View style={styles.crText}>
                  <FlowText testID="fc-cards-hub-community-title" provenance="external" style={[styles.crTitle, { color: g.text }]}>{c.title}</FlowText>
                  <FlowText testID="fc-cards-hub-community-sub" provenance="external" style={[styles.crSub, { color: g.secondary }]}>{c.sub}</FlowText>
                </View>
                <View style={styles.likes}>
                  <Ionicons name="heart-outline" size={16} color={g.secondary} />
                  <Text style={[styles.likesText, { color: g.secondary }]}>{c.likes}</Text>
                </View>
              </Pressable>
              </React.Fragment>
            ))}
          </View>
        </Rise>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  pressed: { opacity: 0.82 },
  topbar: { minHeight: 44, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 8, fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.6 },
  hstk: { position: 'relative', paddingTop: 22, marginTop: 22 },
  slab: { position: 'absolute', left: '50%', height: 40, borderRadius: 18 },
  slabA: { top: 0, width: '84%', marginLeft: '-42%', opacity: 0.55 },
  slabB: { top: 10, width: '92%', marginLeft: '-46%', opacity: 0.85 },
  hc: { borderRadius: 22, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 20 },
  ov: { fontSize: 13, lineHeight: 16, fontWeight: '700', letterSpacing: 2.4 },
  hbottom: { marginTop: 'auto' },
  hw: { fontSize: 38, lineHeight: 44, fontWeight: '700', letterSpacing: -0.8 },
  hs: { marginTop: 4, fontSize: 16, lineHeight: 22 },
  trk: { marginTop: 16, height: 4, borderRadius: 2, overflow: 'hidden' },
  trkFill: { height: '100%', borderRadius: 2 },
  ctaRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cta: { flex: 1, minHeight: 56, borderRadius: 28, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  modeBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  sec: { marginTop: 30, marginBottom: 14, marginHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 },
  secTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', flexShrink: 1 },
  secAll: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  secAllText: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  ygrid: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, borderRadius: 22, paddingTop: 12, paddingHorizontal: 12, paddingBottom: 14 },
  ymos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, height: 92, alignContent: 'flex-start' },
  ymosItem: { width: '48%', flexGrow: 1, height: 43 },
  dim: { opacity: 0.28 },
  ystk: { position: 'relative', height: 92 },
  cv: { position: 'absolute', left: 0, right: 0, height: 52, borderRadius: 11, paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row', justifyContent: 'space-between' },
  cvEmpty: { justifyContent: 'center', alignItems: 'center' },
  cvTitle: { fontSize: 13, lineHeight: 16, fontWeight: '700', flexShrink: 1 },
  cvCount: { fontSize: 13, lineHeight: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  yft: { marginTop: 14, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  yftText: { flex: 1, minWidth: 0 },
  yftIcon: { marginBottom: 2 },
  ytt: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  ysu: { marginTop: 1, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  mc: { height: 40, borderRadius: 9, paddingHorizontal: 10, justifyContent: 'center', minWidth: 0 },
  mcText: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  rail: { gap: 12, paddingRight: 20 },
  vcard: { width: 252 },
  vfr: { aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden' },
  dur: { position: 'absolute', right: 8, bottom: 10, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.72)' }, // theme-exempt: плашка длительности поверх кадра ролика — темнота в любой теме
  durText: { fontSize: 13, lineHeight: 16, fontWeight: '600', color: '#FFFFFF', fontVariant: ['tabular-nums'] }, // theme-exempt: белый текст на тёмной плашке длительности
  vt: { marginTop: 10, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  vm: { marginTop: 2, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  cr: { paddingVertical: 12, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rk: { width: 18, fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  cov: { position: 'relative', width: 92, height: 46 },
  covBack: { position: 'absolute', left: 7, right: 7, top: -5, height: 12, borderRadius: 8 },
  covChip: { height: 46, borderRadius: 10 },
  crText: { flex: 1, minWidth: 0 },
  crTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  crSub: { marginTop: 2, fontSize: 13, lineHeight: 18 },
  likes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likesText: { fontSize: 13, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
});

export default memo(CardsHubV2Inner);
