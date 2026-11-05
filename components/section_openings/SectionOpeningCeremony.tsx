// ═════════════════════════════════════════════════════════════════
// SectionOpeningCeremony.tsx — праздничное окно «Открытие раздела» (одобренный макет approved-rev8: openings.js / openings.css / motion.js / preview.css, кадры rev8-unlock-*, rev6-unlock-rank-cta).
//
// зачем (владелец 05.11 дословно: «это не то что я одобрял. ОНО ВООБЩЕ НА МАКЕТАХ НЕ ТАК ВЫГЛЯДЕЛО … В ТОЧНОСТИ 1 К 1 … С АНИМАЦИЕЙ КОТОРУЮ Я ОДОБРИЛ»): окно переписано по макету 1:1 —
// НИКАКОГО круга за героем (в макете `.opening-halo{background:none}`, вместо него белое свечение вдоль силуэта), герой прижат по правилам макета (влево / вправо у диалогов / центр у Plus / 25 % у Пика),
// монета ранга справа у окна «Ранг», арты разделов — из тех же пар dark/light, что в макете (видео: intro_videos, Пик: spire_tile; у диалогов и карточек арта нет), надзаголовок «РАНГ N · НОВЫЙ РАЗДЕЛ»,
// кнопка «На главную», 14 искр, тонкий прогресс 2 px. Таймлайн прежний: 3600 мс, текст с 61 % до 82 %, CTA оживает на 82 % (copy.inert макета).
// Один sharedValue-таймлайн (0→1), все стили — useAnimatedStyle на UI-потоке: ни одного setState в кадрах (владелец борется с лагами Android). «Уменьшить движение» — сразу финальный кадр.
// Цвета — токены темы. Хаптик: мягкий на «Праздник», успех на CTA. Сохранено: «Пропустить» (+ лог skip_tap), persisted-закрытие хоста.
// ═════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, interpolate, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { hapticMediumImpact, hapticSuccess } from '../../hooks/use-haptics';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { sectionOpeningCopy, sectionOpeningHome, sectionOpeningOverline, sectionOpeningSkip } from '../../modules/section_openings/section_opening_strings';
import { SECTION_OPENING_PHASE_ANCHORS, type SectionOpeningId } from '../../modules/section_openings/section_opening_core';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { MomentFullScreen } from '../spire/moments/moments_layout';
import { useSpirePalette } from '../spire/useSpirePalette';
import SpireRankCoin from '../spire/SpireRankCoin';
import { useTheme } from '../ThemeContext';
import { THEMED_ART_GENERATED } from '../theme/themed_art_assets.generated';
import { V2Button } from '../v2/V2Kit';
import { MOMENT_TITLE_MAX_FONT_SCALE } from '../moments/title_scale';

/** Полная церемония макета: 3600 мс (настраивалось 1800–6500). */
export const SECTION_OPENING_DURATION_MS = 3600;
/** Текст виден с 61 %, CTA активен с 82 % (copy.inert макета). */
const COPY_FROM = 0.61;
const COPY_FULL = 0.82;
/** Размер героя макета: `--hero-size` 150 × 1.1 = 165 px, не шире 65 % сцены. */
const HERO_W = 165;
/** Искры макета: 14 штук, позиции `left: 12+(n*37)%78 %`, `top: 8+(n*23)%83 %`. */
const SPARKS = Array.from({ length: 14 }, (_, n) => ({ left: `${12 + (n * 37) % 78}%`, top: `${8 + (n * 23) % 83}%` } as const));

const HERO: Readonly<Record<SectionOpeningId, ImageSourcePropType>> = {
  rank: require('../../assets/images/v2/section_openings/rank.webp'),
  video: require('../../assets/images/v2/section_openings/video.webp'),
  dialogs: require('../../assets/images/v2/section_openings/dialogs.webp'),
  peak: require('../../assets/images/v2/section_openings/peak.webp'),
  cards: require('../../assets/images/v2/section_openings/cards.webp'),
  plus: require('../../assets/images/v2/section_openings/plus.webp'),
};
/** Арт раздела макета (`V.art(f.art)`): видео — intro_videos, Пик — spire_tile; у «Ранга» своя монета, у диалогов/карточек/Plus арта НЕТ. */
const ART_SLOT: Readonly<Partial<Record<SectionOpeningId, string>>> = { video: 'intro_videos', peak: 'spire_tile' };
/** Откуда герой выезжает — `starts` макета: rank/video/dialogs/peak/cards/plus (px, градусы, масштаб). */
const HERO_FROM: Readonly<Record<SectionOpeningId, Readonly<{ x: number; y: number; r: number; s: number }>>> = {
  rank: { x: 0, y: 50, r: -5, s: 1 }, video: { x: -40, y: 0, r: 0, s: 1 }, dialogs: { x: 45, y: 0, r: 0, s: 1 },
  peak: { x: 0, y: 75, r: 0, s: 1 }, cards: { x: -35, y: 0, r: -4, s: 1 }, plus: { x: 0, y: 24, r: 0, s: 0.94 },
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

/** Цвет с прозрачностью для hex #RRGGBB (иначе как есть) — тени и свечение мотивов макета. */
function withAlpha(color: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

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
  const { isDark } = useTheme();
  const { width: windowW } = useWindowDimensions();
  const coinRank = useMyCoinRank();
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

  // ── герой: ключи motion макета — невидим до 12 %, к 48 % на месте (opacity 0→1, сдвиг/поворот/масштаб из `starts`) ──
  const heroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.12, 0.48], [0, 1], 'clamp'),
    transform: [
      { translateX: interpolate(progress.value, [0.12, 0.48], [from.x, 0], 'clamp') },
      { translateY: interpolate(progress.value, [0.12, 0.48], [from.y, 0], 'clamp') },
      { rotate: `${interpolate(progress.value, [0.12, 0.48], [from.r, 0], 'clamp')}deg` },
      { scale: interpolate(progress.value, [0.12, 0.48], [from.s, 1], 'clamp') },
    ],
  }));
  // арт: ключи .22 / .58 (перелёт 1.06 с подъёмом −8) / .8 (на месте); у Пика старт ниже (65), как в макете
  const artStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.22, 0.58, 1], [0, 0, 1, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 0.22, 0.58, 0.8], [id === 'peak' ? 65 : 24, 24, -8, 0], 'clamp') },
      { scale: interpolate(progress.value, [0, 0.22, 0.58, 0.8], [0.92, 0.92, 1.06, 1], 'clamp') },
    ],
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [COPY_FROM, COPY_FULL], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(progress.value, [COPY_FROM, COPY_FULL], [18, 0], 'clamp') }],
  }));
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  // искры макета: ждут до 40 %, вспыхивают (.7) к 56 % с подъёмом −8, гаснут к 85 % на −42; одна анимация на все 14 (разные только места)
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 0.56, 0.85, 1], [0, 0, 0.7, 0, 0]),
    transform: [{ translateY: interpolate(progress.value, [0, 0.4, 0.56, 0.85, 1], [0, 0, -8, -42, -42]) }],
  }));
  // мотивы (openings.js): апертура «Видео» — масштаб по X со сдвигом ±15, пузыри «Диалогов» подъезжают ±65, ступени «Пика» растут снизу по очереди, веер «Карточек» раскладывается на −18°/0°/18°
  const apertureA = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.43, 1], [0, 0.85, 0.25]),
    transform: [{ translateX: interpolate(progress.value, [0, 0.43], [-15, 0], 'clamp') }, { scaleX: interpolate(progress.value, [0, 0.43], [0.05, 1], 'clamp') }],
  }));
  const apertureB = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.43, 1], [0, 0.85, 0.25]),
    transform: [{ translateX: interpolate(progress.value, [0, 0.43], [15, 0], 'clamp') }, { scaleX: interpolate(progress.value, [0, 0.43], [0.05, 1], 'clamp') }],
  }));
  const bubbleOne = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.43, 1], [0, 1, 0.8]),
    transform: [{ translateX: interpolate(progress.value, [0, 0.43], [-65, 0], 'clamp') }, { scale: interpolate(progress.value, [0, 0.43], [0.94, 1], 'clamp') }],
  }));
  const bubbleTwo = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0, 1, 0.8]),
    transform: [{ translateX: interpolate(progress.value, [0, 0.55], [65, 0], 'clamp') }, { scale: interpolate(progress.value, [0, 0.55], [0.94, 1], 'clamp') }],
  }));
  const step1 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.32, 1], [0, 0.8, 0.4]), transform: [{ scaleY: interpolate(progress.value, [0, 0.32], [0.05, 1], 'clamp') }] }));
  const step2 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.44, 1], [0, 0.8, 0.4]), transform: [{ scaleY: interpolate(progress.value, [0, 0.44], [0.05, 1], 'clamp') }] }));
  const step3 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.56, 1], [0, 0.8, 0.4]), transform: [{ scaleY: interpolate(progress.value, [0, 0.56], [0.05, 1], 'clamp') }] }));
  const fan1 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.4, 1], [0, 0.75, 0.4]), transform: [{ translateY: interpolate(progress.value, [0, 0.4], [25, 0], 'clamp') }, { rotate: `${interpolate(progress.value, [0, 0.4], [0, -18], 'clamp')}deg` }] }));
  const fan2 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.48, 1], [0, 0.75, 0.4]), transform: [{ translateY: interpolate(progress.value, [0, 0.48], [25, 0], 'clamp') }] }));
  const fan3 = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.56, 1], [0, 0.75, 0.4]), transform: [{ translateY: interpolate(progress.value, [0, 0.56], [25, 0], 'clamp') }, { rotate: `${interpolate(progress.value, [0, 0.56], [0, 18], 'clamp')}deg` }] }));

  const slot = ART_SLOT[id];
  const art = slot ? THEMED_ART_GENERATED[slot]?.[isDark ? 'dark' : 'light'] : undefined;
  const stageW = Math.max(0, windowW - 24);
  const coinSize = Math.round(stageW * 0.42);
  // положение героя в сцене по макету: left 0 (ранг/видео/карточки), right −3 % (диалоги), left 25 % × 88 % (Пик), по центру left = 50 % − 82 px (Plus); ширина 165, не шире 65 %
  const heroBox = id === 'dialogs'
    ? { right: '-3%' as const, height: '100%' as const }
    : id === 'peak'
      ? { left: '25%' as const, height: '88%' as const }
      : id === 'plus'
        ? { left: Math.round(stageW / 2 - HERO_W * 0.55), height: '100%' as const }
        : { left: 0, height: '100%' as const };
  const artBox = id === 'peak' ? styles.artPeak : styles.art;

  // зачем (макет openings.css): размеры и места мотивов — доли сцены, как в макете
  const motif = (
    <View style={styles.motif} pointerEvents="none">
      {id === 'video' ? (
        <View style={styles.aperture}>
          {/* guard-ok: рамки мотивов — из одобренного макета openings.css */}
          <Animated.View style={[styles.apertureLayerBack, { borderColor: p.accentGraphic, transformOrigin: 'right' }, apertureB]} />
          <Animated.View style={[styles.apertureLayer, { borderColor: p.accentGraphic, boxShadow: `0px 0px 38px ${withAlpha(p.accentGraphic, 0.4)}`, transformOrigin: 'left' }, apertureA]}>
            <LinearGradient colors={[p.control, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      ) : null}
      {id === 'dialogs' ? (
        <>
          <Animated.View style={[styles.bubble, styles.bubbleOne, { backgroundColor: p.card, boxShadow: `0px 6px 25px ${withAlpha('#000000', 0.25)}` }, bubbleOne]}><BubbleDots color={p.accentGraphic} /></Animated.View>
          <Animated.View style={[styles.bubble, styles.bubbleTwo, { backgroundColor: p.card, boxShadow: `0px 6px 25px ${withAlpha('#000000', 0.25)}` }, bubbleTwo]}><BubbleDots color={p.accentGraphic} /></Animated.View>
        </>
      ) : null}
      {id === 'peak' ? (
        <View style={styles.steps}>
          {([['30%', step1], ['65%', step2], ['100%', step3]] as const).map(([h, anim]) => (
            <Animated.View key={h} style={[styles.stepBar, { height: h, transformOrigin: 'bottom' }, anim]}>
              <LinearGradient colors={[p.accentGraphic, p.control]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          ))}
        </View>
      ) : null}
      {id === 'cards' ? (
        <View style={styles.fanBox}>
          <Animated.View style={[styles.fanCard, { backgroundColor: p.card, borderColor: p.accentGraphic, boxShadow: `0px 6px 16px ${withAlpha('#000000', 0.25)}`, transformOrigin: 'bottom' }, fan1]} />
          <Animated.View style={[styles.fanCard, { backgroundColor: p.card, borderColor: p.accentGraphic, boxShadow: `0px 6px 16px ${withAlpha('#000000', 0.25)}`, transformOrigin: 'bottom' }, fan2]} />
          <Animated.View style={[styles.fanCard, { backgroundColor: p.card, borderColor: p.accentGraphic, boxShadow: `0px 6px 16px ${withAlpha('#000000', 0.25)}`, transformOrigin: 'bottom' }, fan3]} />
        </View>
      ) : null}
    </View>
  );

  // зачем (Вход, баг Эмулятора 05.11 b07_04): окно рисуется в прозрачной Modal под системной полосой — «5:11» налезало на подпись, «Skip» лежал поверх значков
  // статуса. Фон остаётся под полосой (MomentFullScreen на весь экран), а содержимое сдвигается на верхний и нижний отступы безопасной зоны.
  const insets = useStableSafeAreaInsets();
  const skip = () => { console.log('[SECTION-OPENING]', 'skip_tap', JSON.stringify({ id })); /* guard-ok: тап Skip / «На главную» */ onSkip(); };
  return (
    <MomentFullScreen testID={`section-opening-${id}`}>
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} accessibilityViewIsModal>
        <View style={[styles.barTrack, { top: insets.top + 2, backgroundColor: p.hairline }]} pointerEvents="none">
          <Animated.View style={[styles.barFill, { backgroundColor: p.accentGraphic }, barStyle]} />
        </View>
        <View style={styles.top}>
          <Text style={[styles.label, { color: p.text }]} maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE}>{copy.label}</Text>
          <V2Button label={sectionOpeningSkip(lang)} variant="secondary" size="small" onPress={skip} testID="section-opening-skip" />
        </View>
        <View style={styles.stage}>
          {motif}
          {SPARKS.map((s, n) => (
            <Animated.View key={n} pointerEvents="none" style={[styles.spark, { left: s.left, top: s.top, backgroundColor: p.accentGraphic, boxShadow: `0px 0px 12px ${p.accentGraphic}` }, sparkStyle]} />
          ))}
          {id === 'rank' ? (
            <Animated.View style={[styles.art, artStyle]}><SpireRankCoin rank={coinRank} size={coinSize} plus={false} /></Animated.View>
          ) : art ? (
            <Animated.View style={[artBox, artStyle]}><Image source={art} style={styles.artImage} contentFit="contain" cachePolicy="none" accessible={false} /></Animated.View>
          ) : null}
          {/* герой: белое свечение вдоль силуэта (drop-shadow макета) — тот же кадр белым цветом, размытый, под героем; круга НЕТ */}
          <Animated.View style={[styles.hero, heroBox, heroStyle]}>
            <Image source={HERO[id]} style={[styles.heroImage, styles.heroGlow]} contentFit="contain" tintColor="#FFFFFF" blurRadius={10} cachePolicy="none" accessible={false} />
            <Image source={HERO[id]} style={styles.heroImage} contentFit="contain" cachePolicy="none" accessible={false} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.copy, copyStyle]}>
          <Text style={[styles.overline, { color: p.text }]} maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE}>{sectionOpeningOverline(lang, id)}</Text>
          <Text style={[styles.title, { color: p.text }]} accessibilityRole="header" maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE}>{copy.title}</Text>
          <Text style={[styles.body, { color: p.text }]} maxFontSizeMultiplier={BODY_MAX_FONT_SCALE}>{copy.body}</Text>
          <View pointerEvents={ctaReady ? 'auto' : 'none'} importantForAccessibility={ctaReady ? 'yes' : 'no-hide-descendants'}>
            <V2Button label={copy.cta} variant="primary" disabled={!ctaReady} onPress={() => { void hapticSuccess(); onCta(); }} testID="section-opening-cta" />
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ctaReady }} onPress={skip} disabled={!ctaReady} hitSlop={8} style={styles.home} testID="section-opening-home">
              <Text style={[styles.homeText, { color: p.text }]} maxFontSizeMultiplier={BODY_MAX_FONT_SCALE}>{sectionOpeningHome(lang)}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </MomentFullScreen>
  );
});

// зачем (проверка длинных текстов 9 языков, 04.11): окно без прокрутки; крупный системный шрифт раздувал абзац (до 84 знаков) и сжимал сцену. 1,3 — читаемо и вмещается на малых экранах.
const BODY_MAX_FONT_SCALE = 1.3;

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 0, paddingTop: 12, paddingBottom: 24 },
  // макет: `.story-progress` left/right 22, высота 2, под статус-баром; заливка едет transform: scaleX от левого края
  barTrack: { position: 'absolute', left: 22, right: 22, height: 2 },
  barFill: { height: 2, transformOrigin: 'left' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingLeft: 22, paddingRight: 16 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, paddingVertical: 4, paddingHorizontal: 8, marginLeft: -8 },
  // макет: `.opening .story-stage{margin:54px 12px 10px;flex:1;min-height:220px}` (54 считается от верха экрана; верх у нас занят строкой подписи)
  stage: { flex: 1, minHeight: 220, marginTop: 6, marginBottom: 10, marginHorizontal: 12 },
  hero: { position: 'absolute', top: 0, width: HERO_W, maxWidth: '65%' },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroGlow: { opacity: 0.4 },
  art: { position: 'absolute', right: '6%', top: '28%', width: '42%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  artPeak: { position: 'absolute', right: '4%', top: '12%', width: '30%', aspectRatio: 1 },
  artImage: { width: '100%', height: '100%' },
  motif: { ...StyleSheet.absoluteFillObject },
  spark: { position: 'absolute', width: 3, height: 3, borderRadius: 2 },
  aperture: { position: 'absolute', right: '2%', top: '22%', width: '60%', height: '48%' },
  apertureLayer: { ...StyleSheet.absoluteFillObject, borderRadius: 24, borderWidth: 2, overflow: 'hidden' }, // guard-ok: рамка мотива — из одобренного владельцем макета openings.css (в точности 1:1, слово владельца 05.11)
  apertureLayerBack: { position: 'absolute', top: '10%', bottom: '-10%', left: '4%', right: '-4%', borderRadius: 24, borderWidth: 2 }, // guard-ok: рамка мотива — из одобренного владельцем макета openings.css (в точности 1:1, слово владельца 05.11)
  bubble: { position: 'absolute', height: '17%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  bubbleOne: { left: '7%', top: '20%', width: '37%', borderRadius: 24, borderBottomLeftRadius: 4 },
  bubbleTwo: { left: '19%', top: '56%', width: '34%', borderRadius: 24, borderBottomRightRadius: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  steps: { position: 'absolute', bottom: 0, left: '8%', right: '8%', height: '40%', flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  stepBar: { flex: 1, borderTopLeftRadius: 14, borderTopRightRadius: 14, overflow: 'hidden' },
  fanBox: { position: 'absolute', right: '4%', top: '27%', width: '40%', height: '53%' },
  fanCard: { ...StyleSheet.absoluteFillObject, borderRadius: 20, borderWidth: 1 }, // guard-ok: рамка мотива — из одобренного владельцем макета openings.css (в точности 1:1, слово владельца 05.11)
  // макет: `.story-copy{left/right 24; text-align:center}`, надзаголовок 12/17 (600, 1 px), h2 30/1.12 (−0.6), абзац 16/1.45 до 310 px, отступ под абзацем 20
  copy: { marginHorizontal: 24, alignItems: 'center' },
  overline: { fontSize: 12, lineHeight: 17, fontWeight: '600', letterSpacing: 1, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 310, marginBottom: 20 },
  home: { alignSelf: 'center', minHeight: 36, alignItems: 'center', justifyContent: 'center', marginTop: 6, paddingHorizontal: 16 },
  homeText: { fontSize: 13, lineHeight: 18 },
});
