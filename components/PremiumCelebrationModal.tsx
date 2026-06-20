/**
 * PremiumCelebrationModal — ВАУ-празднование покупки Premium/VIP (2026-06-13).
 *
 * Переписано с нуля по ТЗ юзера: «дорогие» эффекты, уникальный аврора-фон,
 * длинный динамичный список преимуществ который сам едет вниз (камера следует),
 * каждая строка вспыхивает + хаптик, финальный аккорд, sticky CTA.
 *
 * Контракт props сохранён: { visible, onClose, variant } — VipCelebrationModal
 * остаётся тонкой обёрткой (variant="vip").
 *
 * Хаптик: на каждую строку — hapticTap (cooldown 80мс, см. use-haptics);
 * НЕ hapticSuccess/Impact — у них cooldown 4.5с, они бы «съелись».
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnim,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import Reanimated, {
  Easing as REasing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import AuroraBackground from './premium_celebration/AuroraBackground';
import {
  CELEBRATION_FEATURES,
  CELEBRATION_PALETTES,
  VIP_EXTRA_FEATURE,
  type CelebrationFeature,
  type CelebrationVariant,
} from './premium_celebration/celebrationContent';

interface PremiumCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  variant?: CelebrationVariant;
}

const ROW_HEIGHT = 70;            // высота строки + gap (для расчёта скролла)
const ROW_STEP_MS = 360;          // время на одну строку авто-прокрутки
const REEL_START_DELAY = 900;     // пауза перед стартом проезда (на hero-вступление)
const HERO_OFFSET = 248;          // высота hero-зоны сверху

function localeText(map: CelebrationFeature['title'], lang: ReturnType<typeof useLang>['lang']): string {
  return (map as Record<string, string>)[lang] ?? map.ru;
}

/** Одна строка-преимущество: подсвечивается когда камера до неё доезжает. */
function FeatureRow({ feature, lang, lit, palette, f }: {
  feature: CelebrationFeature;
  lang: ReturnType<typeof useLang>['lang'];
  lit: boolean;
  palette: typeof CELEBRATION_PALETTES['premium'];
  f: ReturnType<typeof useTheme>['f'];
}) {
  const p = useSharedValue(0);
  const flash = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    if (lit) {
      p.value = withSpring(1, { mass: 0.6, damping: 13, stiffness: 130 });
      flash.value = withSequence(
        withTiming(1, { duration: 220, easing: REasing.out(REasing.quad) }),
        withTiming(0, { duration: 360, easing: REasing.in(REasing.quad) }),
      );
      check.value = withDelay(120, withSpring(1, { mass: 0.5, damping: 8, stiffness: 170 }));
    } else {
      p.value = 0.28;
      flash.value = 0;
      check.value = 0;
    }
  }, [lit, p, flash, check]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0.28, 1]),
    transform: [
      { translateX: interpolate(p.value, [0, 1], [-26, 0]) },
      { scale: interpolate(p.value, [0, 1], [0.95, 1]) },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: interpolate(flash.value, [0, 1], [0, 0.22]) }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: check.value }],
  }));

  const sub = feature.sub ? localeText(feature.sub, lang) : null;

  return (
    <Reanimated.View
      style={[
        styles.row,
        { borderColor: `${palette.main}29` },
        rowStyle,
      ]}
    >
      {/* Плотная тёмная база строки + акцентная вуаль: гасит движущийся фон под
          текстом, чтобы строка читалась, а не «плыла» поверх анимации. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rowBase]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rowTint, { backgroundColor: `${palette.main}1F` }]} />
      <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rowFlash, { backgroundColor: palette.main }, flashStyle]} />
      <View style={[styles.rowIco, { borderColor: `${palette.main}4D`, backgroundColor: `${palette.main}1A` }]}>
        <Text style={styles.rowEmoji}>{feature.emoji}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: palette.rowText, fontSize: f.bodyLg }]} numberOfLines={1}>
          {localeText(feature.title, lang)}
        </Text>
        {sub ? (
          <Text style={[styles.rowSub, { color: palette.rowSub, fontSize: f.caption }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Reanimated.View style={[styles.checkBadge, { backgroundColor: palette.main }, checkStyle]}>
        <Text style={[styles.checkMark, { color: palette.ctaText }]}>✓</Text>
      </Reanimated.View>
    </Reanimated.View>
  );
}

function PremiumCelebrationModal({ visible, onClose, variant = 'premium' }: PremiumCelebrationModalProps) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { f } = useTheme();
  const { lang } = useLang();
  const palette = CELEBRATION_PALETTES[variant];

  const features = useMemo<CelebrationFeature[]>(
    () => (variant === 'vip' ? [VIP_EXTRA_FEATURE, ...CELEBRATION_FEATURES] : CELEBRATION_FEATURES),
    [variant],
  );

  const scrollRef = useRef<ScrollView>(null);
  const [litCount, setLitCount] = useState(0);
  const [finaleLit, setFinaleLit] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ctaBottom = 28 + insets.bottom;
  const reelBottom = ctaBottom + 78;
  const reelTop = HERO_OFFSET;
  const reelViewport = Math.max(180, winH - reelTop - reelBottom);

  // hero / emblem / cta анимации
  const ringSpin = useSharedValue(0);
  const ringPulse = useSharedValue(0);
  const heroIn = useSharedValue(0);
  const ctaT = useSharedValue(0);
  const ctaShimmer = useSharedValue(0);
  const finaleScale = useSharedValue(0);

  const clearTimers = useCallback(() => {
    if (stepTimer.current) { clearTimeout(stepTimer.current); stepTimer.current = null; }
    if (startTimer.current) { clearTimeout(startTimer.current); startTimer.current = null; }
  }, []);

  useEffect(() => {
    if (!visible) {
      clearTimers();
      cancelAnimation(ringSpin); cancelAnimation(ringPulse); cancelAnimation(heroIn);
      cancelAnimation(ctaT); cancelAnimation(ctaShimmer); cancelAnimation(finaleScale);
      ringSpin.value = 0; ringPulse.value = 0; heroIn.value = 0;
      ctaT.value = 0; ctaShimmer.value = 0; finaleScale.value = 0;
      setLitCount(0); setFinaleLit(false); setSkipped(false);
      return;
    }

    // вступление
    hapticSuccess();
    heroIn.value = withTiming(1, { duration: 520, easing: REasing.out(REasing.back(1.4)) });
    ringSpin.value = withRepeat(withTiming(1, { duration: 6000, easing: REasing.linear }), -1, false);
    ringPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1300, easing: REasing.inOut(REasing.sin) }),
        withTiming(0, { duration: 1300, easing: REasing.inOut(REasing.sin) }),
      ),
      -1, true,
    );
    ctaT.value = withDelay(REEL_START_DELAY, withSpring(1, { mass: 0.6, damping: 12, stiffness: 120 }));
    ctaShimmer.value = withDelay(
      REEL_START_DELAY + 300,
      withRepeat(withTiming(1, { duration: 2400, easing: REasing.linear }), -1, false),
    );

    // авто-прокрутка: подсвечиваем по строке + двигаем камеру + хаптик
    let i = 0;
    const totalRows = features.length;
    const fullHeight = totalRows * ROW_HEIGHT + 120; // + финал
    const maxScroll = Math.max(0, fullHeight - reelViewport);

    const lightNext = () => {
      if (i >= totalRows) {
        // финал
        scrollRef.current?.scrollTo({ y: maxScroll, animated: true });
        setFinaleLit(true);
        finaleScale.value = withDelay(150, withSpring(1, { mass: 0.6, damping: 10, stiffness: 120 }));
        setTimeout(() => { hapticSuccess(); }, 420);
        return;
      }
      i += 1;
      setLitCount(i);
      hapticTap();
      // камера держит подсвеченную строку около 46% вьюпорта
      const target = Math.min(maxScroll, Math.max(0, (i - 1) * ROW_HEIGHT - reelViewport * 0.42));
      scrollRef.current?.scrollTo({ y: target, animated: true });
      stepTimer.current = setTimeout(lightNext, ROW_STEP_MS);
    };

    startTimer.current = setTimeout(lightNext, REEL_START_DELAY);

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, variant]);

  const skip = useCallback(() => {
    clearTimers();
    setSkipped(true);
    setLitCount(features.length);
    setFinaleLit(true);
    finaleScale.value = withTiming(1, { duration: 220 });
    ctaT.value = withTiming(1, { duration: 180 });
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [clearTimers, features.length, finaleScale, ctaT]);

  const handleClose = useCallback(() => { onClose(); }, [onClose]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroIn.value,
    transform: [{ translateY: interpolate(heroIn.value, [0, 1], [-18, 0]) }, { scale: interpolate(heroIn.value, [0, 1], [0.9, 1]) }],
  }));
  const ringSpinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(ringSpin.value, [0, 1], [0, 360])}deg` }] }));
  const ringGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringPulse.value, [0, 1], [0.4, 0.95]),
    transform: [{ scale: interpolate(ringPulse.value, [0, 1], [0.92, 1.08]) }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaT.value,
    transform: [{ translateY: interpolate(ctaT.value, [0, 1], [16, 0]) }, { scale: interpolate(ctaT.value, [0, 1], [0.94, 1]) }],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(ctaShimmer.value, [0, 1], [-160, winW]) }] }));
  const finaleStyle = useAnimatedStyle(() => ({
    opacity: finaleScale.value,
    transform: [{ scale: interpolate(finaleScale.value, [0, 1], [0.9, 1]) }],
  }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.root}>
        <AuroraBackground
          active={visible}
          width={winW}
          height={winH}
          bg={palette.bg}
          auroraRgb={palette.auroraRgb}
          main={palette.main}
        />

        {/* Scrim: затемняющая вуаль между живым фоном и текстом — возвращает
            читаемость. Плотнее сверху (под HERO) и снизу (под CTA), легче в
            центре (где лента уже со своей подложкой). Анимация остаётся видна
            сквозь полупрозрачные зоны, но не «мешается» с текстом. */}
        <LinearGradient
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          colors={['rgba(0,0,0,0.62)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.34)', 'rgba(0,0,0,0.70)']}
          locations={[0, 0.34, 0.66, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* тап по фону = пропустить (раскрыть всё), затем закрыть */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={skipped ? handleClose : skip}
          accessibilityRole="button"
        />

        {/* skip-подсказка */}
        {!skipped ? (
          <View pointerEvents="none" style={[styles.skipHint, { top: insets.top + 14 }]}>
            <Text style={styles.skipHintText}>
              {triLang(lang, { ru: 'тапни, чтобы пропустить', uk: 'тапни, щоб пропустити', es: 'toca para saltar', 'pt-BR': 'toque para pular', vi: 'chạm để bỏ qua', id: 'ketuk untuk lewati', tr: 'geçmek için dokun', pl: 'dotknij, by pominąć' })}
            </Text>
          </View>
        ) : null}

        {/* ── HERO ── */}
        <Reanimated.View pointerEvents="none" style={[styles.hero, { top: insets.top + 36 }, heroStyle]}>
          <View style={styles.emblemRing}>
            <Reanimated.View style={[styles.ringConic, ringSpinStyle]}>
              <LinearGradient
                colors={[`${palette.main}00`, palette.main, `${palette.main}00`, palette.cta[0], `${palette.main}00`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Reanimated.View>
            <Reanimated.View style={[styles.ringGlow, { backgroundColor: palette.main }, ringGlowStyle]} />
            <View style={[styles.emblemDisc, { borderColor: `${palette.main}80` }]}>
              <LinearGradient
                colors={[`${palette.main}26`, '#0f0b03']}
                start={{ x: 0.4, y: 0.2 }}
                end={{ x: 0.6, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {palette.emblem === 'VIP'
                ? <Text style={[styles.emblemVip, { color: palette.bright }]}>VIP</Text>
                : <Text style={styles.emblemEmoji}>{palette.emblem}</Text>}
            </View>
          </View>

          {/* Подложка-«таблетка» под текстом заголовка: гасит светлые частицы,
              всплывающие за буквами, чтобы текст не «кашился» с анимацией. */}
          <View style={styles.heroTextPlate}>
            <Text style={[styles.title, { color: palette.bright, fontSize: Math.max(25, f.h1 + 3), textShadowColor: `${palette.main}80` }]}>
              {variant === 'vip'
                ? triLang(lang, { ru: 'VIP активирован', uk: 'VIP активовано', es: 'VIP activado', 'pt-BR': 'VIP ativado', vi: 'Đã kích hoạt VIP', id: 'VIP aktif', tr: 'VIP etkinleştirildi', pl: 'VIP aktywowany' })
                : triLang(lang, { ru: 'Premium активирован', uk: 'Premium активовано', es: 'Premium activado', 'pt-BR': 'Premium ativado', vi: 'Đã kích hoạt Premium', id: 'Premium aktif', tr: 'Premium etkin', pl: 'Premium aktywowany' })}
            </Text>
            <Text style={[styles.subtitle, { color: palette.text, fontSize: f.body }]}>
              {variant === 'vip'
                ? triLang(lang, { ru: 'VIP-доступ открыт: энергия и все функции', uk: 'VIP-доступ відкрито: енергія й усі функції', es: 'Acceso VIP: energía y todo desbloqueado', 'pt-BR': 'Acesso VIP: energia e tudo liberado', vi: 'VIP: năng lượng và mọi tính năng', id: 'Akses VIP: energi dan semua fitur', tr: 'VIP: enerji ve tüm özellikler', pl: 'Dostęp VIP: energia i wszystkie funkcje' })
                : triLang(lang, { ru: 'Всё открыто. Учи без лимитов — прямо сейчас', uk: 'Усі можливості розблоковано — поїхали', es: 'Todo desbloqueado — empieza ahora', 'pt-BR': 'Tudo desbloqueado — comece agora', vi: 'Đã mở mọi thứ — bắt đầu ngay', id: 'Semua terbuka — mulai sekarang', tr: 'Her şey açıldı — hemen başla', pl: 'Wszystko odblokowane — zaczynamy' })}
            </Text>
          </View>
        </Reanimated.View>

        {/* ── REEL ──
            До skip лента не ловит тапы (pointerEvents none) — тап проваливается
            на бэкдроп → skip. После skip включаем скролл и тачи. */}
        <View style={[styles.reelMask, { top: reelTop, bottom: reelBottom }]} pointerEvents={skipped ? 'box-none' : 'none'}>
          <ScrollView
            ref={scrollRef}
            style={StyleSheet.absoluteFill}
            contentContainerStyle={styles.reelContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={skipped}
          >
            {features.map((fe, idx) => (
              <FeatureRow
                key={`${variant}_${idx}`}
                feature={fe}
                lang={lang}
                lit={skipped || idx < litCount}
                palette={palette}
                f={f}
              />
            ))}
            <Reanimated.View style={[styles.finale, { borderColor: `${palette.main}66`, backgroundColor: `${palette.main}1F` }, finaleStyle]}>
              <Text style={[styles.finaleBig, { color: palette.bright }]}>
                {triLang(lang, { ru: '✨ Всё это теперь твоё ✨', uk: '✨ Усе це тепер твоє ✨', es: '✨ Todo esto ahora es tuyo ✨', 'pt-BR': '✨ Tudo isso agora é seu ✨', vi: '✨ Tất cả giờ là của bạn ✨', id: '✨ Semua ini milikmu ✨', tr: '✨ Hepsi artık senin ✨', pl: '✨ To wszystko teraz twoje ✨' })}
              </Text>
              <Text style={[styles.finaleSmall, { color: palette.text }]}>
                {triLang(lang, {
                  ru: `${features.length}+ преимуществ разблокировано`,
                  uk: `${features.length}+ переваг розблоковано`,
                  es: `${features.length}+ ventajas desbloqueadas`,
                  'pt-BR': `${features.length}+ vantagens desbloqueadas`,
                  vi: `Đã mở ${features.length}+ đặc quyền`,
                  id: `${features.length}+ keuntungan terbuka`,
                  tr: `${features.length}+ ayrıcalık açıldı`,
                  pl: `${features.length}+ korzyści odblokowano`,
                })}
              </Text>
            </Reanimated.View>
          </ScrollView>
        </View>

        {/* ── CTA ── */}
        <Reanimated.View style={[styles.ctaWrap, { bottom: ctaBottom }, ctaStyle]}>
          <TouchableOpacity
            testID={`${variant}-celebration-cta`}
            accessibilityRole="button"
            activeOpacity={0.88}
            onPress={() => { hapticSuccess(); handleClose(); }}
            style={styles.ctaTouch}
          >
            <LinearGradient colors={palette.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
              <Text style={[styles.ctaText, { color: palette.ctaText, fontSize: f.bodyLg + 1 }]}>
                {variant === 'vip'
                  ? triLang(lang, { ru: 'Поехали', uk: 'Поїхали', es: 'Vamos', 'pt-BR': 'Vamos', vi: 'Bắt đầu', id: 'Ayo mulai', tr: 'Hadi', pl: 'Zaczynamy' })
                  : triLang(lang, { ru: 'Начать учиться', uk: 'Почати вчитися', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu học', id: 'Mulai belajar', tr: 'Öğrenmeye başla', pl: 'Zacznij naukę' })}
              </Text>
              <View style={styles.shimmerMask} pointerEvents="none">
                <Reanimated.View style={[styles.shimmer, shimmerStyle]}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.65)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ flex: 1, width: 120 }}
                  />
                </Reanimated.View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Reanimated.View>
      </View>
    </Modal>
  );
}

export default memo(PremiumCelebrationModal);

const styles = StyleSheet.create({
  root: { flex: 1 },
  skipHint: { position: 'absolute', right: 18, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.28)' },
  skipHintText: { color: 'rgba(255,255,255,0.5)', fontSize: 12.5, fontWeight: '600' },

  hero: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  emblemRing: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ringConic: { position: 'absolute', width: 136, height: 136, borderRadius: 68, opacity: 0.8, overflow: 'hidden' },
  ringGlow: { position: 'absolute', width: 120, height: 120, borderRadius: 60, opacity: 0.5 },
  emblemDisc: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  emblemEmoji: { fontSize: 52 },
  emblemVip: { fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  title: {
    fontWeight: '900', textAlign: 'center', letterSpacing: 0.3,
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12,
  },
  subtitle: { textAlign: 'center', marginTop: 7, opacity: 0.85, fontWeight: '600', lineHeight: 20 },
  heroTextPlate: {
    marginTop: 2, alignSelf: 'stretch', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.40)',
  },

  reelMask: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  reelContent: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 30, gap: 11 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    paddingVertical: 13, paddingHorizontal: 15, borderRadius: 17, borderWidth: 1,
    overflow: 'hidden',
  },
  rowBase: { borderRadius: 17, backgroundColor: 'rgba(8,10,9,0.82)' },
  rowTint: { borderRadius: 17 },
  rowFlash: { borderRadius: 17 },
  rowIco: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowEmoji: { fontSize: 21 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: '800', letterSpacing: 0.1 },
  rowSub: { fontWeight: '500', marginTop: 1 },
  checkBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkMark: { fontSize: 13, fontWeight: '900' },

  finale: { marginTop: 8, padding: 20, borderRadius: 20, borderWidth: 1.5, alignItems: 'center' },
  finaleBig: { fontSize: 19, fontWeight: '900', textAlign: 'center' },
  finaleSmall: { fontSize: 13, marginTop: 4, opacity: 0.8, textAlign: 'center', fontWeight: '600' },

  ctaWrap: { position: 'absolute', left: 24, right: 24 },
  ctaTouch: { borderRadius: 19, overflow: 'hidden' },
  ctaGradient: { height: 58, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', overflow: 'hidden' },
  ctaText: { fontWeight: '900', letterSpacing: 0.3 },
  shimmerMask: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 19 },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 120 },
});
