import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
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
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
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
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import AuroraBackground from './premium_celebration/AuroraBackground';
import {
  CELEBRATION_FEATURES,
  CELEBRATION_PALETTES,
  type CelebrationFeature,
  type CelebrationVariant,
} from './premium_celebration/celebrationContent';
import { soundDirector } from '../modules/audio/sound_director';

interface PremiumCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  variant?: CelebrationVariant;
}

const ROW_HEIGHT = 70;            // высота строки + gap (для расчёта скролла)
// зачем: окно поздравления шло ~7с (900мс пауза + 16×360мс + финал) — юзер
// жаловался «очень долго». Проезд ужат до ~3с: шаг строки 360→170мс, стартовая
// пауза 900→450мс. Строки по-прежнему загораются по одной (эффект раскрытия
// сохранён), но празднование не превращается в ожидание.
const ROW_STEP_MS = 170;          // время на одну строку авто-прокрутки
const REEL_START_DELAY = 450;     // пауза перед стартом проезда (на hero-вступление)
const HERO_OFFSET = 248;          // высота hero-зоны сверху

function localeText(map: CelebrationFeature['title'], lang: ReturnType<typeof useLang>['lang']): string {
  return (map as Record<string, string>)[lang] ?? map.ru;
}

/** Одна строка-преимущество: подсвечивается когда камера до неё доезжает. */
function FeatureRow({ feature, lang, lit, palette, f, reduceMotion }: {
  feature: CelebrationFeature;
  lang: ReturnType<typeof useLang>['lang'];
  lit: boolean;
  palette: typeof CELEBRATION_PALETTES['premium'];
  f: ReturnType<typeof useTheme>['f'];
  reduceMotion: boolean;
}) {
  const p = useSharedValue(0);
  const flash = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    if (lit) {
      // зачем: при «Уменьшении движения» строка проявляется мягким фейдом без
      // пружины, сдвига и вспышки — правило требует убрать ДВИЖЕНИЕ, а не
      // смысл: понимание «пункт открылся» держится на opacity и галочке.
      if (reduceMotion) {
        p.value = withTiming(1, { duration: 160, easing: REasing.out(REasing.quad) });
        flash.value = 0;
        check.value = withTiming(1, { duration: 160 });
        return;
      }
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
  }, [lit, p, flash, check, reduceMotion]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0.28, 1]),
    transform: reduceMotion
      ? []
      : [
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
        <Text style={[styles.rowTitle, { color: palette.rowText, fontSize: f.bodyLg }]}>
          {localeText(feature.title, lang)}
        </Text>
        {sub ? (
          <Text style={[styles.rowSub, { color: palette.rowSub, fontSize: f.caption }]}>
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
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { f } = useTheme();
  const { lang } = useLang();
  const palette = CELEBRATION_PALETTES[variant];

  const features = CELEBRATION_FEATURES;

  const scrollRef = useRef<ScrollView>(null);
  const [litCount, setLitCount] = useState(0);
  const [finaleLit, setFinaleLit] = useState(false);
  const [skipped, setSkipped] = useState(false);
  // Реальная высота hero-блока (эмблема + заголовок + подзаголовок). Меряем
  // через onLayout, потому что она «плавает»: insets.top (чёлка/Dynamic Island),
  // f-scale крупного шрифта и перенос длинного RU-подзаголовка на 2-3 строки
  // делают фиксированный HERO_OFFSET ненадёжным — лента наезжала на заголовок.
  const [heroH, setHeroH] = useState(0);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Финальный хаптик отложен на 420мс. Без ref он срабатывал уже на СЛЕДУЮЩЕМ
  // экране, если модалку закрыли в эту паузу — вибрация из ниоткуда.
  const finaleHapticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  const onHeroLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    const h = e.nativeEvent.layout.height;
    setHeroH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
  }, []);

  const ctaBottom = 28 + bottomInset;
  const reelBottom = ctaBottom + 78;
  // Лента начинается ПОД фактическим низом hero + зазор. HERO_OFFSET остаётся
  // лишь как fallback до первого замера, чтобы лента не прыгала на 1-м кадре.
  const heroTop = insets.top + 36;
  const reelTop = heroH > 0 ? heroTop + heroH + 18 : HERO_OFFSET;
  const reelViewport = Math.max(180, winH - reelTop - reelBottom);
  // Авто-прокрутка читает вьюпорт из ref, а не из замыкания useEffect (его deps —
  // [visible, variant], он не перезапускается после onLayout-замера heroH).
  const reelViewportRef = useRef(reelViewport);
  reelViewportRef.current = reelViewport;

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
    if (finaleHapticTimer.current) { clearTimeout(finaleHapticTimer.current); finaleHapticTimer.current = null; }
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
    soundDirector.request(variant === 'vip' ? 'pm.reward.vip_open' : 'pm.reward.premium_open', {
      scope: 'premium-celebration',
      dedupeKey: `${variant}:open`,
    });
    // зачем: при «Уменьшении движения» ВСЕ бесконечные циклы (вращение кольца,
    // пульсация свечения, бегущий блик CTA) не запускаются вовсе — именно они
    // крутились вопреки системной настройке. Статичные конечные значения
    // сохраняют вид кадра: пользователь видит ту же карточку, просто без
    // вечного движения. Тот же приём уже применён в PlayerProfileModal (A-54/55).
    if (reduceMotion) {
      heroIn.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.quad) });
      ringSpin.value = 0;
      ringPulse.value = 0.5;
      ctaT.value = withDelay(REEL_START_DELAY, withTiming(1, { duration: 180 }));
      ctaShimmer.value = 0;
    } else {
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
    }

    // авто-прокрутка: подсвечиваем по строке + двигаем камеру + хаптик
    let i = 0;
    const totalRows = features.length;
    const fullHeight = totalRows * ROW_HEIGHT + 120; // + финал

    const lightNext = () => {
      const viewport = reelViewportRef.current;
      const maxScroll = Math.max(0, fullHeight - viewport);
      if (i >= totalRows) {
        // финал
        scrollRef.current?.scrollTo({ y: maxScroll, animated: true });
        setFinaleLit(true);
        finaleScale.value = withDelay(150, withSpring(1, { mass: 0.6, damping: 10, stiffness: 120 }));
        soundDirector.request(variant === 'vip' ? 'pm.reward.vip_finale' : 'pm.reward.premium_finale', {
          scope: 'premium-celebration',
          dedupeKey: `${variant}:finale`,
        });
        finaleHapticTimer.current = setTimeout(() => {
          finaleHapticTimer.current = null;
          hapticSuccess();
        }, 420);
        return;
      }
      i += 1;
      setLitCount(i);
      hapticTap();
      // камера держит подсвеченную строку около 46% вьюпорта
      const target = Math.min(maxScroll, Math.max(0, (i - 1) * ROW_HEIGHT - viewport * 0.42));
      scrollRef.current?.scrollTo({ y: target, animated: true });
      stepTimer.current = setTimeout(lightNext, ROW_STEP_MS);
    };

    startTimer.current = setTimeout(lightNext, REEL_START_DELAY);

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, variant, reduceMotion]);

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

  // зачем: аппаратная «назад» на Android раньше сразу выбрасывала из
  // празднования, которое пользователь оплатил, — прямо посреди проезда ленты.
  // Теперь она повторяет логику тапа по фону: сначала раскрыть всё, и только
  // повторное нажатие закрывает. Выйти по-прежнему можно двумя нажатиями.
  const handleBack = useCallback(() => {
    if (skipped) { handleClose(); return; }
    skip();
  }, [skipped, skip, handleClose]);

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
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleBack}>
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
        <Reanimated.View pointerEvents="none" onLayout={onHeroLayout} style={[styles.hero, { top: heroTop }, heroStyle]}>
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
              <Text style={styles.emblemEmoji}>{palette.emblem}</Text>
            </View>
          </View>

          {/* Подложка-«таблетка» под текстом заголовка: гасит светлые частицы,
              всплывающие за буквами, чтобы текст не «кашился» с анимацией. */}
          <View style={styles.heroTextPlate}>
            <Text style={[styles.title, { color: palette.bright, fontSize: Math.max(25, f.h1 + 3), textShadowColor: `${palette.main}80` }]}>
              {variant === 'pro'
                ? triLang(lang, { ru: 'Pro активирован', uk: 'Pro активовано', es: 'Pro activado', 'pt-BR': 'Pro ativado', vi: 'Đã kích hoạt Pro', id: 'Pro aktif', tr: 'Pro etkinleştirildi', pl: 'Pro aktywowany' })
                : triLang(lang, { ru: 'Plus активирован', uk: 'Plus активовано', es: 'Plus activado', 'pt-BR': 'Plus ativado', vi: 'Đã kích hoạt Plus', id: 'Plus aktif', tr: 'Plus etkinleştirildi', pl: 'Plus aktywowany' })}
            </Text>
            <Text style={[styles.subtitle, { color: palette.text, fontSize: f.body }]}>
              {variant === 'pro'
                ? triLang(lang, { ru: 'Phraseman Pro: разовая покупка, энергия и все функции — без подписки', uk: 'Phraseman Pro: разова покупка, енергія й усі функції — без підписки', es: 'Phraseman Pro: compra única, energía y todo, sin suscripción', 'pt-BR': 'Phraseman Pro: compra única, energia e tudo, sem assinatura', vi: 'Phraseman Pro: mua một lần, năng lượng và mọi tính năng', id: 'Phraseman Pro: pembelian sekali, energi dan semua fitur', tr: 'Phraseman Pro: tek seferlik satın alma, enerji ve tüm özellikler', pl: 'Phraseman Pro: zakup jednorazowy, energia i wszystkie funkcje' })
                : variant === 'vip'
                ? triLang(lang, { ru: 'Plus-доступ открыт: энергия и все функции', uk: 'Plus-доступ відкрито: енергія й усі функції', es: 'Acceso Plus: energía y todo desbloqueado', 'pt-BR': 'Acesso Plus: energia e tudo liberado', vi: 'Plus: năng lượng và mọi tính năng', id: 'Akses Plus: energi dan semua fitur', tr: 'Plus: enerji ve tüm özellikler', pl: 'Dostęp Plus: energia i wszystkie funkcje' })
                : triLang(lang, { ru: 'Всё открыто. Прокачивайся без лимитов — прямо сейчас', uk: 'Усі можливості розблоковано — поїхали', es: 'Todo desbloqueado — empieza ahora', 'pt-BR': 'Tudo desbloqueado — comece agora', vi: 'Đã mở mọi thứ — bắt đầu ngay', id: 'Semua terbuka — mulai sekarang', tr: 'Her şey açıldı — hemen başla', pl: 'Wszystko odblokowane — zaczynamy' })}
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
                reduceMotion={reduceMotion}
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
                {triLang(lang, { ru: 'Поехали', uk: 'Поїхали', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Ayo mulai', tr: 'Hadi başla', pl: 'Zaczynamy' })}
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
    width: 96, height: 96, borderRadius: 48, borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  emblemEmoji: { fontSize: 52 },
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
    paddingVertical: 13, paddingHorizontal: 15, borderRadius: 17, borderWidth: 0,
    overflow: 'hidden',
  },
  rowBase: { borderRadius: 17, backgroundColor: 'rgba(8,10,9,0.82)' },
  rowTint: { borderRadius: 17 },
  rowFlash: { borderRadius: 17 },
  rowIco: { width: 42, height: 42, borderRadius: 21, borderWidth: 0, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowEmoji: { fontSize: 21 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: '800', letterSpacing: 0.1 },
  rowSub: { fontWeight: '500', marginTop: 1 },
  checkBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkMark: { fontSize: 13, fontWeight: '900' },

  finale: { marginTop: 8, padding: 20, borderRadius: 20, borderWidth: 0, alignItems: 'center' },
  finaleBig: { fontSize: 19, fontWeight: '900', textAlign: 'center' },
  finaleSmall: { fontSize: 13, marginTop: 4, opacity: 0.8, textAlign: 'center', fontWeight: '600' },

  ctaWrap: { position: 'absolute', left: 24, right: 24 },
  ctaTouch: { borderRadius: 19, overflow: 'hidden' },
  ctaGradient: { height: 58, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', overflow: 'hidden' },
  ctaText: { fontWeight: '900', letterSpacing: 0.3 },
  shimmerMask: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 19 },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 120 },
});
