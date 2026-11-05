// ═════════════════════════════════════════════════════════════════
// SectionOpeningCeremony.tsx — праздничное окно «Открытие раздела» (одобренный макет approved-rev8: openings.js / openings.css / motion.js / preview.css, кадры rev8-unlock-*, rev6-unlock-rank-cta).
//
// зачем (владелец 05.11 дословно: «это не то что я одобрял. ОНО ВООБЩЕ НА МАКЕТАХ НЕ ТАК ВЫГЛЯДЕЛО … В ТОЧНОСТИ 1 К 1 … С АНИМАЦИЕЙ КОТОРУЮ Я ОДОБРИЛ»): окно переписано по макету 1:1 —
// НИКАКОГО круга за героем (в макете `.opening-halo{background:none}`, вместо него белое свечение вдоль силуэта), герой прижат по правилам макета (влево / вправо у диалогов / центр у Plus / 25 % у Пика),
// монета ранга справа у окна «Ранг», арты разделов — из тех же пар dark/light, что в макете (видео: intro_videos, Пик: spire_tile; у диалогов и карточек арта нет), надзаголовок «РАНГ N · НОВЫЙ РАЗДЕЛ»,
// кнопка «На главную», 14 искр, тонкий прогресс 2 px. Монета окна «Ранг» — MyRankCoin: строго по РАНГУ ПОЛЬЗОВАТЕЛЯ (закон владельца 05.11, c2af034df). Таймлайн прежний: 3600 мс, текст с 61 % до 82 %, CTA оживает на 82 % (copy.inert макета).
// Один sharedValue-таймлайн (0→1), все стили — useAnimatedStyle на UI-потоке: ни одного setState в кадрах (владелец борется с лагами Android). «Уменьшить движение» — сразу финальный кадр.
// Цвета — токены темы. Хаптик: мягкий на «Праздник», успех на CTA. Сохранено: «Пропустить» (+ лог skip_tap), persisted-закрытие хоста.
// ═════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing, cancelAnimation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { hapticMediumImpact, hapticSuccess } from '../../hooks/use-haptics';
import { sectionOpeningCopy, sectionOpeningHome, sectionOpeningOverline, sectionOpeningSkip } from '../../modules/section_openings/section_opening_strings';
import { SECTION_OPENING_PHASE_ANCHORS, type SectionOpeningId } from '../../modules/section_openings/section_opening_core';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { MomentFullScreen } from '../spire/moments/moments_layout';
import { useSpirePalette } from '../spire/useSpirePalette';
import MyRankCoin from '../rank/MyRankCoin';
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
/** Точки таймлайна для журнала: якоря макета 15 / 43 / 60 % и CTA 82 %, конец 100 %. */
/** Фон окна «Ранг» из эталона (пиксели rev6-unlock-rank-cta: #3D4B5F), чернила и дорожка полоски. */
const RANK_BG = '#3D4B5F';
const RANK_INK = '#FFFFFF';
const RANK_TRACK = '#FFFFFF33';
const PHASE_LOG_MARKS = [0.15, 0.43, 0.6, 0.82, 1] as const;
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
  /** Тап слева: предыдущий кадр истории (true — перешли назад); нет предыдущего или не передан — текущий кадр с начала. */
  onPrev?: () => boolean;
  /** Тест / скриншот Сверки: показать окно уже в этой точке таймлайна (0…1) без анимации. */
  freezeAt?: number;
  /** Dev-превью / Сверка: показать «уменьшенное движение» (финальный кадр сразу), не трогая настройку системы. */
  forceReduced?: boolean;
  /** История: сколько кадров в очереди (сегментов полоски) и номер текущего (0…). По умолчанию один. */
  segments?: number;
  segmentIndex?: number;
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

type SharedProgress = ReturnType<typeof useSharedValue<number>>;

/**
 * Герой и арт вынесены в мемо-слои: родитель больше не перерисовывается на 82 % (кнопка оживает внутри CtaBlock), поэтому expo-image не перезагружает картинки
 * (Сверка 20:41: на финале p4 герой и арт пропадали — совпадало по времени с перерисовкой на CTA; политика кэша «none» перезагружала источник).
 */
const HeroLayer = memo(function HeroLayer({ source, box, animated, onLog }: Readonly<{ source: ImageSourcePropType; box: object; animated: object; onLog: (what: string, ok: boolean, detail?: string) => void }>) {
  return (
    <Animated.View style={[styles.hero, box, animated]}>
      <Image source={source} style={[styles.heroImage, styles.heroGlow]} contentFit="contain" tintColor="#FFFFFF" blurRadius={10} cachePolicy="none" accessible={false} />
      <Image source={source} style={styles.heroImage} contentFit="contain" cachePolicy="none" accessible={false} onLoad={() => onLog('hero', true)} onError={(e) => onLog('hero', false, String((e as { error?: unknown }).error ?? ''))} />
    </Animated.View>
  );
});

const ArtLayer = memo(function ArtLayer({ source, box, animated, onLog }: Readonly<{ source: ImageSourcePropType; box: object; animated: object; onLog: (what: string, ok: boolean, detail?: string) => void }>) {
  return (
    <Animated.View style={[box, animated]}>
      <Image source={source} style={styles.artImage} contentFit="contain" cachePolicy="none" accessible={false} onLoad={() => onLog('art', true)} onError={(e) => onLog('art', false, String((e as { error?: unknown }).error ?? ''))} />
    </Animated.View>
  );
});

/** Кнопка раздела и «На главную»: оживают на 82 % таймлайна (copy.inert макета). Своё состояние — перерисовка не задевает картинки. */
const CtaBlock = memo(function CtaBlock({ progress, initialReady, label, homeLabel, ink, onCta, onHome }: Readonly<{ progress: SharedProgress; initialReady: boolean; label: string; homeLabel: string; ink: string; onCta: () => void; onHome: () => void }>) {
  const [ready, setReady] = useState(initialReady);
  const enable = useCallback(() => setReady(true), []);
  useAnimatedReaction(
    () => progress.value,
    (value, previous) => { if (value >= COPY_FULL && (previous ?? 0) < COPY_FULL) runOnJS(enable)(); },
  );
  return (
    <View pointerEvents={ready ? 'auto' : 'none'} importantForAccessibility={ready ? 'yes' : 'no-hide-descendants'}>
      <V2Button label={label} variant="primary" disabled={!ready} onPress={() => { void hapticSuccess(); onCta(); }} testID="section-opening-cta" />
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready }} onPress={onHome} disabled={!ready} hitSlop={8} style={styles.home} testID="section-opening-home">
        <Text style={[styles.homeText, { color: ink }]} maxFontSizeMultiplier={BODY_MAX_FONT_SCALE}>{homeLabel}</Text>
      </Pressable>
    </View>
  );
});

export const SectionOpeningCeremony = memo(function SectionOpeningCeremony({ id, lang, onCta, onSkip, onPrev, freezeAt, forceReduced, segments = 1, segmentIndex = 0 }: SectionOpeningCeremonyProps) {
  const p = useSpirePalette();
  const { isDark } = useTheme();
  const { width: windowW } = useWindowDimensions();
  const reduced = useReducedMotion() || forceReduced === true;
  const copy = sectionOpeningCopy(lang, id);
  const progress = useSharedValue(reduced ? 1 : freezeAt ?? 0);
  const from = HERO_FROM[id];
  useEffect(() => {
    console.log('[SECTION-OPENING]', 'mount', JSON.stringify({ id, lang, freezeAt: freezeAt ?? null, reduced, forceReduced: forceReduced === true, segments, segmentIndex, isDark })); // guard-ok: вход в историю
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: одна строка на показ
  }, []);

  const celebrate = useCallback(() => { void hapticMediumImpact(); }, []);
  const pausedRef = React.useRef(false);
  // зачем (владелец 05.11; Сверка 20:41: на финале p4 пропадали элементы — СПЕРВА ЛОГИ): вход, значения решения и каждая фаза таймлайна пишутся в [SECTION-OPENING] — видно, дошёл ли прогресс до 100 % и что отрисовано
  const logPhase = useCallback((at: number) => { console.log('[SECTION-OPENING]', 'phase', JSON.stringify({ id, at, ctaReady: at >= COPY_FULL })); /* guard-ok: фазы таймлайна */ }, [id]);
  const logImage = useCallback((what: string, ok: boolean, detail?: string) => { (ok ? console.log : console.warn)('[SECTION-OPENING]', ok ? 'image_loaded' : 'image_failed', JSON.stringify({ id, what, detail: detail ?? null })); /* guard-ok: загрузка/сбой картинки */ }, [id]);

  // зачем (владелец 05.11 «ЭТО ИСТОРИЯ»): таймлайн можно ставить на паузу (удержание) и перематывать (тап) — поэтому CTA и хаптик «Праздник» привязаны к самому прогрессу
  // (useAnimatedReaction), а не к setTimeout: после паузы они сработают в нужной точке (макет: CTA оживает на 82 %, праздник на 60 %)
  const run = useCallback((fromValue: number) => {
    progress.value = fromValue;
    progress.value = withTiming(1, { duration: SECTION_OPENING_DURATION_MS * (1 - fromValue), easing: Easing.linear });
  }, [progress]);
  useEffect(() => {
    if (reduced || freezeAt !== undefined) return undefined;
    run(0);
    return () => cancelAnimation(progress);
  }, [freezeAt, progress, reduced, run]);
  useAnimatedReaction(
    () => progress.value,
    (value, previous) => {
      const before = previous ?? 0;
      for (const mark of PHASE_LOG_MARKS) if (value >= mark && before < mark) runOnJS(logPhase)(mark);
      if (value >= SECTION_OPENING_PHASE_ANCHORS.celebrate && before < SECTION_OPENING_PHASE_ANCHORS.celebrate && !reduced && freezeAt === undefined) runOnJS(celebrate)();
    },
  );
  // жесты истории: удержание — пауза, тап справа — к финалу кадра (а на финале — следующий кадр/закрыть), тап слева — кадр с начала, свайп вниз — закрыть кадр
  const holdStart = useCallback(() => {
    if (reduced || freezeAt !== undefined || progress.value >= 1) return;
    pausedRef.current = true;
    cancelAnimation(progress);
  }, [freezeAt, progress, reduced]);
  const holdEnd = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    run(progress.value);
  }, [progress, run]);
  const tapNext = useCallback(() => {
    if (progress.value < 1 && !reduced && freezeAt === undefined) { cancelAnimation(progress); progress.value = 1; return; }
    console.log('[SECTION-OPENING]', 'story_tap_next', JSON.stringify({ id, segmentIndex, segments })); // guard-ok: тап «дальше» на финале кадра = следующий кадр или закрытие
    onSkip();
  }, [freezeAt, id, onSkip, progress, reduced, segmentIndex, segments]);
  const tapPrev = useCallback(() => {
    if (segmentIndex > 0 && onPrev?.() === true) return; // зачем (координатор 05.11): тап слева — ПРЕДЫДУЩИЙ кадр истории
    if (reduced || freezeAt !== undefined) return;
    cancelAnimation(progress);
    run(0);
  }, [freezeAt, onPrev, progress, reduced, run, segmentIndex]);
  const swipeDown = Gesture.Pan().activeOffsetY(24).failOffsetX([-30, 30]).onEnd((event) => {
    if (event.translationY > 90) runOnJS(onSkip)();
  });

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

  // зачем (Сверка 20:41, «Ранг»: эталон rev6-unlock-rank-cta — сине-серый «ранговый» фон с кольцами-орбитами, тёмный и в светлой теме): у окна «Ранг» свой фон и светлые чернила независимо от темы
  const isRank = id === 'rank';
  const ink = isRank ? RANK_INK : p.text;
  const track = isRank ? RANK_TRACK : p.hairline;
  const slot = ART_SLOT[id];
  const art = slot ? THEMED_ART_GENERATED[slot]?.[isDark ? 'dark' : 'light'] : undefined;
  const stageW = Math.max(0, windowW - 24);
  const coinSize = Math.round(stageW * 0.42);
  // положение героя в сцене по макету: left 0 (ранг/видео/карточки), right −3 % (диалоги), left 25 % × 88 % (Пик), по центру left = 50 % − 82 px (Plus); ширина 165, не шире 65 %
  const heroBox = useMemo(() => id === 'dialogs'
    ? { right: '-3%' as const, height: '100%' as const }
    : id === 'peak'
      ? { left: '25%' as const, height: '88%' as const }
      : id === 'plus'
        ? { left: Math.round(stageW / 2 - HERO_W * 0.55), height: '100%' as const }
        : { left: 0, height: '100%' as const },
    [id, stageW]);
  const artBox = id === 'peak' ? styles.artPeak : styles.art;

  // зачем (макет openings.css): размеры и места мотивов — доли сцены, как в макете
  const motif = (
    <View style={styles.motif} pointerEvents="none">
      {id === 'rank' ? (
        <>
          {/* кольца-орбиты эталона rank (openings.css .opening-constellation): большое кольцо −20° и второе под 65° */}
          <View style={[styles.orbit, { borderColor: '#FFFFFF24', transform: [{ rotate: '-20deg' }] }]} />
          <View style={[styles.orbitTwo, { borderColor: '#FFFFFF1F', transform: [{ rotate: '65deg' }] }]} />
        </>
      ) : null}
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
      <GestureDetector gesture={swipeDown}>
      {/* зачем (Сверка 20:41: «мятный оттенок сверху вместо ровного фона»; макет .opening{background:var(--bg)} — ровный фон): плоский цвет фона темы поверх градиента MomentFullScreen */}
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }, { backgroundColor: isRank ? RANK_BG : p.bg }]} accessibilityViewIsModal>
        {/* зачем (история): полоска по числу кадров очереди — пройденные полные, текущий заполняется по таймлайну, будущие пустые */}
        <View style={[styles.segments, { top: insets.top + 2 }]} pointerEvents="none">
          {Array.from({ length: Math.max(1, segments) }, (_, i) => (
            <View key={i} style={[styles.segment, { backgroundColor: track }]}>
              {i < segmentIndex ? <View style={[styles.barFill, { backgroundColor: p.accentGraphic }]} /> : i === segmentIndex ? <Animated.View style={[styles.barFill, { backgroundColor: p.accentGraphic }, barStyle]} /> : null}
            </View>
          ))}
        </View>
        {/* зоны касаний истории под всем остальным: слева ≈35 % — кадр с начала, справа — дальше; удержание — пауза */}
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={styles.zoneLeft} onPress={tapPrev} onLongPress={holdStart} delayLongPress={180} onPressOut={holdEnd} accessible={false} testID="section-opening-tap-prev" />
          <Pressable style={styles.zoneRight} onPress={tapNext} onLongPress={holdStart} delayLongPress={180} onPressOut={holdEnd} accessible={false} testID="section-opening-tap-next" />
        </View>
        <View style={styles.top}>
          <Text style={[styles.label, { color: ink }]} maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE}>{copy.label}</Text>
          <V2Button label={sectionOpeningSkip(lang)} variant="secondary" size="small" onPress={skip} testID="section-opening-skip" />
        </View>
        <View style={styles.stage} pointerEvents="none">
          {motif}
          {SPARKS.map((s, n) => (
            <Animated.View key={n} pointerEvents="none" style={[styles.spark, { left: s.left, top: s.top, backgroundColor: p.accentGraphic, boxShadow: `0px 0px 12px ${p.accentGraphic}` }, sparkStyle]} />
          ))}
          {id === 'rank' ? (
            <Animated.View style={[styles.art, artStyle]}><MyRankCoin size={coinSize} style={{ width: coinSize, height: coinSize }} contentFit="contain" accessible={false} /></Animated.View>
          ) : art ? (
            <ArtLayer source={art} box={artBox} animated={artStyle} onLog={logImage} />
          ) : null}
          {/* герой: белое свечение вдоль силуэта (drop-shadow макета) — тот же кадр белым цветом, размытый, под героем; круга НЕТ */}
          <HeroLayer source={HERO[id]} box={heroBox} animated={heroStyle} onLog={logImage} />
        </View>
        <Animated.View style={[styles.copy, copyStyle]}>
          <Text style={[styles.overline, { color: ink }]} maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE}>{sectionOpeningOverline(lang, id)}</Text>
          <Text style={[styles.title, { color: ink }]} accessibilityRole="header" maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE}>{copy.title}</Text>
          <Text style={[styles.body, { color: ink }]} maxFontSizeMultiplier={BODY_MAX_FONT_SCALE}>{copy.body}</Text>
          <CtaBlock progress={progress} initialReady={reduced || (freezeAt ?? 0) >= COPY_FULL} label={copy.cta} homeLabel={sectionOpeningHome(lang)} ink={ink} onCta={onCta} onHome={skip} />
        </Animated.View>
      </View>
      </GestureDetector>
    </MomentFullScreen>
  );
});

// зачем (проверка длинных текстов 9 языков, 04.11): окно без прокрутки; крупный системный шрифт раздувал абзац (до 84 знаков) и сжимал сцену. 1,3 — читаемо и вмещается на малых экранах.
const BODY_MAX_FONT_SCALE = 1.3;

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 0, paddingTop: 12, paddingBottom: 24 },
  // макет: `.story-progress` left/right 22, высота 2, под статус-баром; заливка едет transform: scaleX от левого края
  segments: { position: 'absolute', left: 22, right: 22, height: 2, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 2, overflow: 'hidden' },
  zoneLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%' },
  zoneRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '65%' },
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
  orbit: { position: 'absolute', top: '6%', bottom: '6%', left: '3%', right: '3%', borderRadius: 9999, borderWidth: 1 }, // guard-ok: кольцо-орбита эталона rank
  orbitTwo: { position: 'absolute', top: '19%', bottom: '19%', left: '-2%', right: '-2%', borderRadius: 9999, borderWidth: 1 }, // guard-ok: кольцо-орбита эталона rank
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
