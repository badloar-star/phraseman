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
  Easing, interpolate, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { hapticMediumImpact, hapticSuccess } from '../../hooks/use-haptics';
import { sectionOpeningCopy, sectionOpeningSkip } from '../../modules/section_openings/section_opening_strings';
import { SECTION_OPENING_PHASE_ANCHORS, type SectionOpeningId } from '../../modules/section_openings/section_opening_core';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
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
  /** Dev-превью / Сверка: показать «уменьшенное движение» (финальный кадр сразу), не трогая настройку системы. */
  forceReduced?: boolean;
}>;

function BubbleDots({ color }: Readonly<{ color: string }>) {
  return (
    <>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </>
  );
}

export const SectionOpeningCeremony = memo(function SectionOpeningCeremony({ id, lang, onCta, onSkip, freezeAt, forceReduced }: SectionOpeningCeremonyProps) {
  const p = useSpirePalette();
  const reduced = useReducedMotion() || forceReduced === true;
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
  // зачем (макет openings.js): апертура «Видео» раскрывается по горизонтали (scaleX .05→1 со сдвигом ±15), пузыри «Диалогов» подъезжают с двух сторон
  // (±65), ступени «Пика» растут снизу по очереди, веер «Карточек» раскладывается на −18°/0°/18° от нижнего центра — всё на UI-потоке
  const apertureA = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.2, 0.5], [0, 1], 'clamp'),
    transform: [{ translateX: interpolate(progress.value, [0.2, 0.62], [-15, 0], 'clamp') }, { scaleX: interpolate(progress.value, [0.2, 0.62], [0.05, 1], 'clamp') }],
  }));
  const apertureB = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.2, 0.62], [0, 0.25], 'clamp'),
    transform: [{ translateX: interpolate(progress.value, [0.2, 0.62], [15, 0], 'clamp') }, { scaleX: interpolate(progress.value, [0.2, 0.62], [0.05, 1], 'clamp') }],
  }));
  const bubbleOne = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.24, 0.55], [0, 1], 'clamp'),
    transform: [{ translateX: interpolate(progress.value, [0.24, 0.55], [-65, 0], 'clamp') }, { scale: interpolate(progress.value, [0.24, 0.55], [0.94, 1], 'clamp') }],
  }));
  const bubbleTwo = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.34, 0.65], [0, 1], 'clamp'),
    transform: [{ translateX: interpolate(progress.value, [0.34, 0.65], [65, 0], 'clamp') }, { scale: interpolate(progress.value, [0.34, 0.65], [0.94, 1], 'clamp') }],
  }));
  const step1 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.28, 0.5], [0, 0.85], 'clamp'), transform: [{ scaleY: interpolate(progress.value, [0.28, 0.5], [0.05, 1], 'clamp') }] }));
  const step2 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.4, 0.62], [0, 0.85], 'clamp'), transform: [{ scaleY: interpolate(progress.value, [0.4, 0.62], [0.05, 1], 'clamp') }] }));
  const step3 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.52, 0.74], [0, 0.85], 'clamp'), transform: [{ scaleY: interpolate(progress.value, [0.52, 0.74], [0.05, 1], 'clamp') }] }));
  const fan1 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.3, 0.6], [0, 1], 'clamp'), transform: [{ translateY: interpolate(progress.value, [0.3, 0.6], [25, 0], 'clamp') }, { rotate: `${interpolate(progress.value, [0.3, 0.6], [0, -18], 'clamp')}deg` }] }));
  const fan2 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.36, 0.66], [0, 1], 'clamp'), transform: [{ translateY: interpolate(progress.value, [0.36, 0.66], [25, 0], 'clamp') }] }));
  const fan3 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.42, 0.72], [0, 1], 'clamp'), transform: [{ translateY: interpolate(progress.value, [0.42, 0.72], [25, 0], 'clamp') }, { rotate: `${interpolate(progress.value, [0.42, 0.72], [0, 18], 'clamp')}deg` }] }));

  const art = ART[id];
  // зачем (макет openings.css): размеры и места мотивов — доли сцены, как в макете; без обводок — тон карточки (правило владельца)
  const motif = (
    <View style={styles.motif} pointerEvents="none">
      {id === 'video' ? (
        <View style={styles.aperture}>
          <Animated.View style={[styles.apertureLayer, { backgroundColor: p.cardRaised, transformOrigin: 'left' }, apertureA]} />
          <Animated.View style={[styles.apertureLayerBack, { backgroundColor: p.accentGraphic, transformOrigin: 'right' }, apertureB]} />
        </View>
      ) : null}
      {id === 'dialogs' ? (
        <>
          <Animated.View style={[styles.bubble, styles.bubbleOne, { backgroundColor: p.cardRaised }, bubbleOne]}><BubbleDots color={p.accentGraphic} /></Animated.View>
          <Animated.View style={[styles.bubble, styles.bubbleTwo, { backgroundColor: p.cardRaised }, bubbleTwo]}><BubbleDots color={p.accentGraphic} /></Animated.View>
        </>
      ) : null}
      {id === 'peak' ? (
        <View style={styles.steps}>
          <Animated.View style={[styles.stepBar, { height: '30%', backgroundColor: p.accentGraphic, transformOrigin: 'bottom' }, step1]} />
          <Animated.View style={[styles.stepBar, { height: '65%', backgroundColor: p.accentGraphic, transformOrigin: 'bottom' }, step2]} />
          <Animated.View style={[styles.stepBar, { height: '100%', backgroundColor: p.accentGraphic, transformOrigin: 'bottom' }, step3]} />
        </View>
      ) : null}
      {id === 'cards' ? (
        <View style={styles.fanBox}>
          <Animated.View style={[styles.fanCard, { backgroundColor: p.cardRaised, transformOrigin: 'bottom' }, fan1]} />
          <Animated.View style={[styles.fanCard, { backgroundColor: p.cardRaised, transformOrigin: 'bottom' }, fan2]} />
          <Animated.View style={[styles.fanCard, { backgroundColor: p.cardRaised, transformOrigin: 'bottom' }, fan3]} />
        </View>
      ) : null}
    </View>
  );

  // зачем (Вход, баг Эмулятора 05.11 b07_04): окно рисуется в прозрачной Modal под системной полосой — «5:11» налезало на подпись, «Skip» лежал поверх значков
  // статуса. Фон остаётся под полосой (MomentFullScreen на весь экран), а содержимое сдвигается на верхний и нижний отступы безопасной зоны.
  const insets = useStableSafeAreaInsets();
  return (
    <MomentFullScreen testID={`section-opening-${id}`}>
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} accessibilityViewIsModal>
        <Animated.View style={[styles.bar, { backgroundColor: p.accentGraphic }, barStyle]} />
        <View style={styles.top}>
          <Text style={[styles.label, { color: p.textSecondary }]} maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE}>{copy.label}</Text>
          <V2Button label={sectionOpeningSkip(lang)} variant="secondary" size="small" onPress={() => { console.log('[SECTION-OPENING]', 'skip_tap', JSON.stringify({ id })); /* guard-ok: тап Skip */ onSkip(); }} testID="section-opening-skip" />
        </View>
        <View style={styles.stage}>
          <Animated.View style={[styles.halo, { backgroundColor: p.accentGraphic }, haloStyle]} pointerEvents="none" />
          {motif}
          {art ? <Animated.View style={[styles.art, artStyle]}><Image source={art} style={styles.artImage} contentFit="contain" cachePolicy="none" accessible={false} /></Animated.View> : null}
          <Animated.View style={[styles.hero, heroStyle]}>
            <Image source={HERO[id]} style={styles.heroImage} contentFit="contain" cachePolicy="none" accessible={false} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.copy, copyStyle]}>
          <Text style={[styles.title, { color: p.text }]} accessibilityRole="header" maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE}>{copy.title}</Text>
          <Text style={[styles.body, { color: p.textSecondary }]} maxFontSizeMultiplier={BODY_MAX_FONT_SCALE}>{copy.body}</Text>
          <View pointerEvents={ctaReady ? 'auto' : 'none'} importantForAccessibility={ctaReady ? 'yes' : 'no-hide-descendants'}>
            <V2Button label={copy.cta} variant="primary" disabled={!ctaReady} onPress={() => { void hapticSuccess(); onCta(); }} testID="section-opening-cta" />
          </View>
        </Animated.View>
      </View>
    </MomentFullScreen>
  );
});

// зачем (проверка длинных текстов 9 языков, 04.11): окно без прокрутки; крупный системный шрифт раздувал абзац (до 84 знаков) и сжимал сцену. 1,3 — читаемо и вмещается на малых экранах.
const BODY_MAX_FONT_SCALE = 1.3;

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
  motif: { ...StyleSheet.absoluteFillObject },
  aperture: { position: 'absolute', right: '2%', top: '22%', width: '60%', height: '48%' },
  apertureLayer: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  apertureLayerBack: { position: 'absolute', top: '10%', bottom: '-10%', left: '4%', right: '-4%', borderRadius: 24 },
  bubble: { position: 'absolute', height: '17%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  bubbleOne: { left: '7%', top: '20%', width: '37%', borderRadius: 24, borderBottomLeftRadius: 4 },
  bubbleTwo: { left: '19%', top: '56%', width: '34%', borderRadius: 24, borderBottomRightRadius: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  steps: { position: 'absolute', bottom: 0, left: '8%', right: '8%', height: '40%', flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  stepBar: { flex: 1, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  fanBox: { position: 'absolute', right: '4%', top: '27%', width: '40%', height: '53%' },
  fanCard: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
  copy: { gap: 10, paddingTop: 16 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  body: { fontSize: 16, lineHeight: 23 },
});
