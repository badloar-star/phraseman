// ═════════════════════════════════════════════════════════════════
// SectionOpeningCeremony.tsx — праздничное окно «Открытие раздела» (макет new-user-ranks-preview/openings.js, одобрен владельцем).
//
// зачем (владелец одобрил 26 состояний; координатор 04.11): герой-персонаж, мотив раздела (апертура / пузыри / ступени / веер / арт) и
// текст, который появляется с фазы «Праздник» (61 %), а CTA оживает на 82 % — как `copy.inert` макета. Один sharedValue-таймлайн
// (0→1 за SECTION_OPENING_DURATION_MS), все стили — useAnimatedStyle на UI-потоке: ни одного setState в кадрах (владелец борется
// с лагами Android). «Уменьшить движение» — сразу финальный кадр. Цвета — токены темы. Хаптик: мягкий на «Праздник», успех на CTA.
// ═════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing, interpolate, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { hapticMediumImpact, hapticSuccess } from '../../hooks/use-haptics';
import { sectionOpeningCopy, sectionOpeningSkip } from '../../modules/section_openings/section_opening_strings';
import { SECTION_OPENING_PHASE_ANCHORS, type SectionOpeningId } from '../../modules/section_openings/section_opening_core';
import { MomentFullScreen } from '../spire/moments/moments_layout';
import { useSpirePalette } from '../spire/useSpirePalette';
import { V2Button } from '../v2/V2Kit';
import { MOMENT_TITLE_MAX_FONT_SCALE } from '../moments/title_scale';

/** Полная церемония макета: 3600 мс (настраивалось 1800–6500). */
export const SECTION_OPENING_DURATION_MS = 3600;
/** Текст виден с 61 %, CTA активен с 82 % (copy.inert макета). */
const COPY_FROM = 0.61;
const COPY_FULL = 0.82;

const HERO: Readonly<Record<SectionOpeningId, ImageSourcePropType>> = {
  rank: require('../../assets/images/v2/section_openings/rank.webp'),
  video: require('../../assets/images/v2/section_openings/video.webp'),
  dialogs: require('../../assets/images/v2/section_openings/dialogs.webp'),
  peak: require('../../assets/images/v2/section_openings/peak.webp'),
  cards: require('../../assets/images/v2/section_openings/cards.webp'),
  plus: require('../../assets/images/v2/section_openings/plus.webp'),
};
/** Арт раздела — те же картинки, что у плиток Главной. */
const ART: Readonly<Partial<Record<SectionOpeningId, ImageSourcePropType>>> = {
  video: require('../../assets/images/v2/spiral_notepad.png'),
  dialogs: require('../../assets/images/v2/chat_bubbles.png'),
  peak: require('../../assets/images/v2/cards_hub_saved.webp'),
  cards: require('../../assets/images/v2/notecard_stack.png'),
};
/** Откуда герой выезжает (px) — startы макета: rank/video/dialogs/peak/cards/plus. */
const HERO_FROM: Readonly<Record<SectionOpeningId, Readonly<{ x: number; y: number }>>> = {
  rank: { x: 0, y: 50 }, video: { x: -40, y: 0 }, dialogs: { x: 45, y: 0 }, peak: { x: 0, y: 75 }, cards: { x: -35, y: 0 }, plus: { x: 0, y: 24 },
};

export type SectionOpeningCeremonyProps = Readonly<{
  id: SectionOpeningId;
  lang: Lang;
  /** CTA: перейти в раздел (rank/plus — просто закрыть/дальше). */
  onCta: () => void;
  onSkip: () => void;
  /** Тест / скриншот Сверки: показать окно уже в этой точке таймлайна (0…1) без анимации. */
  freezeAt?: number;
}>;

function useRange(progress: SharedValue<number>, from: number, to: number) {
  return useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [from, to], [0, 1], 'clamp') }));
}

export const SectionOpeningCeremony = memo(function SectionOpeningCeremony({ id, lang, onCta, onSkip, freezeAt }: SectionOpeningCeremonyProps) {
  const p = useSpirePalette();
  const reduced = useReducedMotion();
  const copy = sectionOpeningCopy(lang, id);
  const progress = useSharedValue(reduced ? 1 : freezeAt ?? 0);
  const [ctaReady, setCtaReady] = useState(reduced || (freezeAt ?? 0) >= COPY_FULL);
  const from = HERO_FROM[id];

  const enableCta = useCallback(() => setCtaReady(true), []);
  const celebrate = useCallback(() => { void hapticMediumImpact(); }, []);

  useEffect(() => {
    if (reduced || freezeAt !== undefined) return;
    progress.value = withTiming(1, { duration: SECTION_OPENING_DURATION_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(enableCta)();
    });
    // зачем: CTA оживает на 82 % (а не в конце) — как в макете; один таймер вместо слежения за кадрами
    const ctaTimer = setTimeout(enableCta, SECTION_OPENING_DURATION_MS * COPY_FULL);
    const celebrateTimer = setTimeout(celebrate, SECTION_OPENING_DURATION_MS * SECTION_OPENING_PHASE_ANCHORS.celebrate);
    return () => { clearTimeout(ctaTimer); clearTimeout(celebrateTimer); };
  }, [celebrate, enableCta, freezeAt, progress, reduced]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.12, 0.48], [0, 1], 'clamp'),
    transform: [
      { translateX: interpolate(progress.value, [0.12, 0.48], [from.x, 0], 'clamp') },
      { translateY: interpolate(progress.value, [0.12, 0.48], [from.y, 0], 'clamp') },
    ],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.56, 1], [0.1, 0.8, 0.35]),
    transform: [{ scale: interpolate(progress.value, [0, 0.56, 1], [0.92, 1.04, 1]) }],
  }));
  const artStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.22, 0.6], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(progress.value, [0.22, 0.6], [id === 'peak' ? 65 : 24, 0], 'clamp') }, { scale: interpolate(progress.value, [0.22, 0.6], [0.92, 1], 'clamp') }],
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [COPY_FROM, COPY_FULL], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(progress.value, [COPY_FROM, COPY_FULL], [18, 0], 'clamp') }],
  }));
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  const motifA = useRange(progress, 0.2, 0.5);
  const motifB = useRange(progress, 0.32, 0.62);
  const motifC = useRange(progress, 0.44, 0.74);

  const art = ART[id];
  const motif = (
    <View style={styles.motif} pointerEvents="none">
      {id === 'peak' ? [motifA, motifB, motifC].map((style, i) => <Animated.View key={i} /* guard-ok: три статичных элемента, порядок постоянный */ style={[styles.step, { height: 40 + i * 28, backgroundColor: p.accentGraphic }, style]} />) : null}
      {id === 'cards' ? [motifA, motifB, motifC].map((style, i) => <Animated.View key={i} /* guard-ok: три статичных элемента, порядок постоянный */ style={[styles.fanCard, { backgroundColor: p.accentGraphic, transform: [{ rotate: `${(i - 1) * 14}deg` }] }, style]} />) : null}
    </View>
  );

  return (
    <MomentFullScreen testID={`section-opening-${id}`}>
      <View style={styles.root} accessibilityViewIsModal>
        <Animated.View style={[styles.bar, { backgroundColor: p.accentGraphic }, barStyle]} />
        <View style={styles.top}>
          <Text style={[styles.label, { color: p.textSecondary }]} maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE}>{copy.label}</Text>
          <V2Button label={sectionOpeningSkip(lang)} variant="secondary" size="small" onPress={onSkip} testID="section-opening-skip" />
        </View>
        <View style={styles.stage}>
          <Animated.View style={[styles.halo, { backgroundColor: p.accentGraphic }, haloStyle]} pointerEvents="none" />
          {motif}
          {art ? <Animated.View style={[styles.art, artStyle]}><Image source={art} style={styles.artImage} contentFit="contain" accessible={false} /></Animated.View> : null}
          <Animated.View style={[styles.hero, heroStyle]}>
            <Image source={HERO[id]} style={styles.heroImage} contentFit="contain" accessible={false} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.copy, copyStyle]}>
          <Text style={[styles.title, { color: p.text }]} accessibilityRole="header" maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE}>{copy.title}</Text>
          <Text style={[styles.body, { color: p.textSecondary }]}>{copy.body}</Text>
          <View pointerEvents={ctaReady ? 'auto' : 'none'} importantForAccessibility={ctaReady ? 'yes' : 'no-hide-descendants'}>
            <V2Button label={copy.cta} variant="primary" disabled={!ctaReady} onPress={() => { void hapticSuccess(); onCta(); }} testID="section-opening-cta" />
          </View>
        </Animated.View>
      </View>
    </MomentFullScreen>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, transformOrigin: 'left' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 1.6 },
  stage: { flex: 1, minHeight: 220, marginTop: 16, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 260, height: 260, borderRadius: 130 },
  hero: { height: '100%', aspectRatio: 0.5, maxWidth: '65%' },
  heroImage: { width: '100%', height: '100%' },
  art: { position: 'absolute', right: 0, bottom: 8, width: '42%', aspectRatio: 1 },
  artImage: { width: '100%', height: '100%' },
  motif: { ...StyleSheet.absoluteFillObject, alignItems: 'flex-start', justifyContent: 'flex-end', flexDirection: 'row', gap: 10, opacity: 0.55 },
  step: { width: 22, borderRadius: 6 },
  fanCard: { position: 'absolute', left: '12%', bottom: 12, width: 54, height: 78, borderRadius: 8 },
  copy: { gap: 10, paddingTop: 16 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  body: { fontSize: 16, lineHeight: 23 },
});
