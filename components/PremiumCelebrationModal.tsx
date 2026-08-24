/**
 * PremiumCelebrationModal — празднование покупки Plus/Pro/MAX и активации
 * промокода. Хореография v6 «Золотая палата» (владелец утвердил 2026-08-24).
 *
 * зачем: старая версия показывала ленту из 12 одинаковых строк ~3.4 с, била
 * hapticTap двенадцать раз подряд (ощущалось как дребезг), не имела
 * кульминации и двигала камеру двенадцатью императивными scrollTo по
 * JS-мосту. Всё это удалено целиком. Новая структура — три акта:
 *
 *   Акт 1 «Разлом» (1.45 с) — вспышка, световой шов, эмблема из света,
 *       ЕДИНСТВЕННЫЙ удар кадра на 900 мс, заголовок.
 *   Акт 2 «Сцены» (11 × 780 мс) — каждое преимущество показывается СВОЕЙ
 *       механикой (CelebrationSceneViews), фон «дышит» в такт сцене.
 *       У тира MAX добавляется 12-я сцена — пробуждение сферы.
 *   Акт 3 «Финал» (1.1 с) — эмблема возвращается, число вылетает крупно,
 *       CTA приезжает последним.
 *
 * Тайминги — источник правды для звука: те же миллисекунды лежат в картах
 * ударов docs/design/CELEBRATION_SOUND_PROMPTS.md и должны попасть в
 * modules/audio/sound_motion.ts. Менять здесь — менять и там.
 *
 * Контракт props сохранён: { visible, onClose, variant }. VipCelebrationModal
 * остаётся тонкой обёрткой (variant="vip").
 *
 * Макет-эталон: .motion-mockups/phraseman-celebration-v6.html
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { isLowEndDevice } from '../hooks/device_perf_tier';
import { soundDirector } from '../modules/audio/sound_director';
import CelebrationSceneView from './premium_celebration/CelebrationSceneViews';
import {
  CELEBRATION_PALETTES,
  type CelebrationVariant,
} from './premium_celebration/celebrationContent';
import {
  CELEBRATION_SCENES,
  SCENE_STEP_MS,
  scenesForVariant,
  sceneText,
} from './premium_celebration/celebrationScenes';

interface PremiumCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  variant?: CelebrationVariant;
  /** Промокод: показать штамп кода перед актом 1. */
  promoCode?: string | null;
}

// ── Тайминги актов (мс). Совпадают с картами ударов в документе звуков. ──
const ACT1_STRIKE_MS = 900;      // единственный удар акта 1
const ACT1_TOTAL_MS = 1450;      // конец акта 1 → старт акта 2
const PROMO_STAMP_MS = 850;      // штамп промокода играет ДО акта 1
const ACT3_NUMBER_MS = 200;      // число в финале
const ACT3_CTA_MS = 440;         // CTA в финале

type Act = 'promo' | 'act1' | 'act2' | 'act3';

function PremiumCelebrationModal({ visible, onClose, variant = 'premium', promoCode = null }: PremiumCelebrationModalProps) {
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { f } = useTheme();
  const { lang } = useLang();
  const palette = CELEBRATION_PALETTES[variant];
  const reduceMotion = useReducedMotion();

  // зачем: на слабых Android тяжёлая сцена с 12 узлами и градиентами роняет
  // кадры — там показываем финальный кадр каждой сцены без движения, сохраняя
  // ВЕСЬ смысл (текст и итоговая картинка на месте), но не тратя кадры.
  const lowEnd = useMemo(
    () => isLowEndDevice({ OS: Platform.OS as 'ios' | 'android', Version: Platform.Version }),
    [],
  );
  const animateScenes = !reduceMotion && !lowEnd;

  const scenes = useMemo(() => scenesForVariant(variant), [variant]);
  const hasPromo = Boolean(promoCode);

  const [act, setAct] = useState<Act>(hasPromo ? 'promo' : 'act1');
  const [sceneIndex, setSceneIndex] = useState(0);
  const [skipped, setSkipped] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // ── shared values ──
  const flash = useSharedValue(0);
  const seam = useSharedValue(0);
  const heroIn = useSharedValue(0);
  const heroDock = useSharedValue(0);   // 0 = центр акта 1, 1 = медальон акта 2
  const heroBack = useSharedValue(0);   // финал: возврат из медальона
  const strikeX = useSharedValue(1);
  const strikeY = useSharedValue(1);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const titleT = useSharedValue(0);
  const beat = useSharedValue(0);
  const finT = useSharedValue(0);
  const ctaT = useSharedValue(0);
  const stampT = useSharedValue(0);
  const sceneT = useSharedValue(0);

  const cancelAll = useCallback(() => {
    [flash, seam, heroIn, heroDock, heroBack, strikeX, strikeY, ring1, ring2,
      titleT, beat, finT, ctaT, stampT, sceneT].forEach(cancelAnimation);
  }, [flash, seam, heroIn, heroDock, heroBack, strikeX, strikeY, ring1, ring2,
    titleT, beat, finT, ctaT, stampT, sceneT]);

  const resetAll = useCallback(() => {
    flash.value = 0; seam.value = 0; heroIn.value = 0; heroDock.value = 0;
    heroBack.value = 0; strikeX.value = 1; strikeY.value = 1;
    ring1.value = 0; ring2.value = 0; titleT.value = 0; beat.value = 0;
    finT.value = 0; ctaT.value = 0; stampT.value = 0; sceneT.value = 0;
  }, [flash, seam, heroIn, heroDock, heroBack, strikeX, strikeY, ring1, ring2,
    titleT, beat, finT, ctaT, stampT, sceneT]);

  const soundKey = useCallback((name: string) => `pm.celebration.${name}`, []);

  const playSound = useCallback((name: string, dedupe: string) => {
    soundDirector.request(soundKey(name) as never, {
      scope: 'premium-celebration',
      dedupeKey: `${variant}:${dedupe}`,
    });
  }, [soundKey, variant]);

  /** Мгновенно показать финальный кадр всей последовательности. */
  const jumpToEnd = useCallback(() => {
    clearTimers();
    cancelAll();
    flash.value = 0; seam.value = 0;
    heroIn.value = 1; heroDock.value = 0; heroBack.value = 1;
    strikeX.value = 1; strikeY.value = 1; ring1.value = 1; ring2.value = 1;
    titleT.value = 0; beat.value = 0;
    finT.value = 1; ctaT.value = 1; stampT.value = 0;
    setAct('act3');
    setSkipped(true);
  }, [clearTimers, cancelAll, flash, seam, heroIn, heroDock, heroBack,
    strikeX, strikeY, ring1, ring2, titleT, beat, finT, ctaT, stampT]);

  // ── главная последовательность ──
  useEffect(() => {
    if (!visible) {
      clearTimers();
      cancelAll();
      resetAll();
      setAct(hasPromo ? 'promo' : 'act1');
      setSceneIndex(0);
      setSkipped(false);
      return undefined;
    }

    hapticSuccess();

    // Reduce Motion / слабое устройство: один финальный кадр, без прогона.
    if (reduceMotion) {
      jumpToEnd();
      playSound('finale_chord', 'finale');
      return () => clearTimers();
    }

    const runAct1 = () => {
      setAct('act1');
      playSound('open_rift', 'open');
      flash.value = withSequence(
        withTiming(1, { duration: 39, easing: REasing.out(REasing.quad) }),
        withTiming(0, { duration: 261, easing: REasing.in(REasing.quad) }),
      );
      seam.value = withTiming(1, { duration: 660, easing: REasing.bezier(0.23, 1, 0.32, 1) });
      heroIn.value = withDelay(150, withTiming(1, { duration: 560, easing: REasing.bezier(0.23, 1, 0.32, 1) }));

      later(() => {
        // ЕДИНСТВЕННЫЙ удар кадра — один hapticSuccess, а не 12 тапов подряд.
        strikeY.value = withSequence(withTiming(0.82, { duration: 0 }), withSpring(1, { mass: 0.6, damping: 9, stiffness: 220 }));
        strikeX.value = withSequence(withTiming(1.2, { duration: 0 }), withSpring(1, { mass: 0.6, damping: 9, stiffness: 220 }));
        ring1.value = withTiming(1, { duration: 820, easing: REasing.bezier(0.23, 1, 0.32, 1) });
        hapticSuccess();
      }, ACT1_STRIKE_MS);
      later(() => { ring2.value = withTiming(1, { duration: 820, easing: REasing.bezier(0.23, 1, 0.32, 1) }); }, 1010);
      titleT.value = withDelay(990, withTiming(1, { duration: 460, easing: REasing.bezier(0.23, 1, 0.32, 1) }));

      later(runAct2, ACT1_TOTAL_MS);
    };

    const runAct2 = () => {
      setAct('act2');
      titleT.value = withTiming(0, { duration: 300, easing: REasing.in(REasing.quad) });
      heroDock.value = withTiming(1, { duration: 620, easing: REasing.bezier(0.77, 0, 0.175, 1) });

      const step = (i: number) => {
        if (i >= scenes.length) { runAct3(); return; }
        setSceneIndex(i);
        // зачем: фон «дышит» на каждой сцене — связывает разные механики
        // в одно целое; один тихий hapticTap на сцену вместо 12 подряд.
        beat.value = withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(0, { duration: 950, easing: REasing.bezier(0.23, 1, 0.32, 1) }),
        );
        sceneT.value = 0;
        sceneT.value = withTiming(1, { duration: 220, easing: REasing.bezier(0.23, 1, 0.32, 1) });
        hapticTap();
        playSound(scenes[i].sound, `scene_${scenes[i].id}`);
        later(() => step(i + 1), SCENE_STEP_MS);
      };
      step(0);
    };

    const runAct3 = () => {
      setAct('act3');
      playSound('finale_chord', 'finale');
      heroBack.value = withTiming(1, { duration: 620, easing: REasing.bezier(0.77, 0, 0.175, 1) });
      finT.value = withDelay(ACT3_NUMBER_MS, withTiming(1, { duration: 480, easing: REasing.bezier(0.23, 1, 0.32, 1) }));
      ctaT.value = withDelay(ACT3_CTA_MS, withSpring(1, { mass: 0.6, damping: 12, stiffness: 120 }));
      later(hapticSuccess, ACT3_NUMBER_MS);
    };

    if (hasPromo) {
      setAct('promo');
      playSound('promo_stamp', 'promo');
      stampT.value = withSequence(
        withTiming(1, { duration: 470, easing: REasing.bezier(0.3, 1.5, 0.4, 1) }),
        withDelay(60, withTiming(2, { duration: 320, easing: REasing.in(REasing.quad) })),
      );
      later(runAct1, PROMO_STAMP_MS);
    } else {
      runAct1();
    }

    return () => { clearTimers(); cancelAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, variant, reduceMotion, hasPromo]);

  const handleClose = useCallback(() => { onClose(); }, [onClose]);

  /** Тап: первый — досмотреть всё сразу, второй — закрыть. */
  const handleTap = useCallback(() => {
    if (skipped || act === 'act3') { handleClose(); return; }
    jumpToEnd();
  }, [skipped, act, handleClose, jumpToEnd]);

  // ── стили ──
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.82 }));
  const seamStyle = useAnimatedStyle(() => ({
    opacity: interpolate(seam.value, [0, 0.24, 1], [0, 1, 0]),
    transform: [
      { translateX: -1 },
      { scaleY: interpolate(seam.value, [0, 0.24], [0.06, 1], 'clamp') },
      { scaleX: interpolate(seam.value, [0.24, 1], [1, 34], 'clamp') },
    ],
  }));
  const heroStyle = useAnimatedStyle(() => {
    const dock = heroDock.value * (1 - heroBack.value);
    return {
      opacity: heroIn.value,
      transform: [
        { translateY: interpolate(dock, [0, 1], [0, -138]) },
        { scale: interpolate(heroIn.value, [0, 1], [0.72, 1]) * interpolate(dock, [0, 1], [1, 0.42]) },
      ],
    };
  });
  const discStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: strikeX.value }, { scaleY: strikeY.value }],
  }));
  // зачем: два отдельных useAnimatedStyle, а не фабрика — хук нельзя вызывать
  // из вложенной функции (правило хуков React), иначе порядок вызовов поедет.
  const ring1Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring1.value, [0, 1], [0.82, 0]),
    transform: [{ scale: interpolate(ring1.value, [0, 1], [1, 3.4]) }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring2.value, [0, 1], [0.82, 0]),
    transform: [{ scale: interpolate(ring2.value, [0, 1], [1, 3.4]) }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleT.value,
    transform: [{ translateY: interpolate(titleT.value, [0, 1], [15, 0]) }],
  }));
  const beatStyle = useAnimatedStyle(() => ({ opacity: beat.value * 0.5 }));
  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneT.value,
    transform: [{ scale: interpolate(sceneT.value, [0, 1], [0.97, 1]) }],
  }));
  const finStyle = useAnimatedStyle(() => ({
    opacity: finT.value,
    transform: [{ translateY: interpolate(finT.value, [0, 1], [12, 0]) }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaT.value,
    transform: [
      { translateY: interpolate(ctaT.value, [0, 1], [18, 0]) },
      { scale: interpolate(ctaT.value, [0, 1], [0.95, 1]) },
    ],
  }));
  const stampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stampT.value, [0, 1, 2], [0, 1, 0]),
    transform: [
      { scale: interpolate(stampT.value, [0, 1, 2], [2.5, 1, 0.72]) },
      { rotate: `${interpolate(stampT.value, [0, 1], [-9, 0], 'clamp')}deg` },
    ],
  }));

  if (!visible) return null;

  const scene = scenes[Math.min(sceneIndex, scenes.length - 1)];
  const ctaBottom = 28 + bottomInset;
  const isMax = variant === 'max';
  const isPro = variant === 'pro';

  const titleText = isMax
    ? triLang(lang, { ru: 'MAX активирован', uk: 'MAX активовано', es: 'MAX activado', 'pt-BR': 'MAX ativado', vi: 'Đã kích hoạt MAX', id: 'MAX aktif', tr: 'MAX etkinleştirildi', pl: 'MAX aktywowany' })
    : isPro
      ? triLang(lang, { ru: 'Pro активирован', uk: 'Pro активовано', es: 'Pro activado', 'pt-BR': 'Pro ativado', vi: 'Đã kích hoạt Pro', id: 'Pro aktif', tr: 'Pro etkinleştirildi', pl: 'Pro aktywowany' })
      : hasPromo
        ? triLang(lang, { ru: 'Промокод сработал', uk: 'Промокод спрацював', es: 'Código activado', 'pt-BR': 'Código ativado', vi: 'Mã đã kích hoạt', id: 'Kode aktif', tr: 'Kod etkinleşti', pl: 'Kod zadziałał' })
        : triLang(lang, { ru: 'Plus активирован', uk: 'Plus активовано', es: 'Plus activado', 'pt-BR': 'Plus ativado', vi: 'Đã kích hoạt Plus', id: 'Plus aktif', tr: 'Plus etkinleştirildi', pl: 'Plus aktywowany' });

  const subtitleText = isMax
    ? triLang(lang, { ru: 'Всё из Plus — и живой разговор голосом', uk: 'Усе з Plus — і жива розмова голосом', es: 'Todo de Plus y conversación en vivo', 'pt-BR': 'Tudo do Plus e conversa ao vivo', vi: 'Mọi thứ của Plus và trò chuyện trực tiếp', id: 'Semua dari Plus dan percakapan langsung', tr: "Plus'ın hepsi ve canlı sohbet", pl: 'Wszystko z Plus i żywa rozmowa' })
    : isPro
      ? triLang(lang, { ru: 'Разовая покупка. Навсегда', uk: 'Разова покупка. Назавжди', es: 'Compra única. Para siempre', 'pt-BR': 'Compra única. Para sempre', vi: 'Mua một lần. Mãi mãi', id: 'Sekali beli. Selamanya', tr: 'Tek seferlik. Sonsuza dek', pl: 'Zakup jednorazowy. Na zawsze' })
      : triLang(lang, { ru: 'Всё открыто. Прямо сейчас', uk: 'Усе відкрито. Просто зараз', es: 'Todo abierto. Ahora mismo', 'pt-BR': 'Tudo aberto. Agora mesmo', vi: 'Mở tất cả. Ngay bây giờ', id: 'Semua terbuka. Sekarang', tr: 'Her şey açık. Hemen şimdi', pl: 'Wszystko otwarte. Już teraz' });

  const finaleNumber = isMax ? 'MAX' : String(CELEBRATION_SCENES.length);
  const finaleLabel = isMax
    ? triLang(lang, { ru: 'всё открыто', uk: 'усе відкрито', es: 'todo abierto', 'pt-BR': 'tudo aberto', vi: 'đã mở tất cả', id: 'semua terbuka', tr: 'her şey açık', pl: 'wszystko otwarte' })
    : isPro
      ? triLang(lang, { ru: 'преимуществ навсегда', uk: 'переваг назавжди', es: 'ventajas para siempre', 'pt-BR': 'vantagens para sempre', vi: 'đặc quyền vĩnh viễn', id: 'keuntungan selamanya', tr: 'ayrıcalık sonsuza dek', pl: 'korzyści na zawsze' })
      : triLang(lang, { ru: 'преимуществ разблокировано', uk: 'переваг розблоковано', es: 'ventajas desbloqueadas', 'pt-BR': 'vantagens desbloqueadas', vi: 'đặc quyền đã mở', id: 'keuntungan terbuka', tr: 'ayrıcalık açıldı', pl: 'korzyści odblokowano' });

  const ctaText = isMax
    ? triLang(lang, { ru: 'Позвонить MAX', uk: 'Зателефонувати MAX', es: 'Llamar a MAX', 'pt-BR': 'Ligar para MAX', vi: 'Gọi MAX', id: 'Hubungi MAX', tr: "MAX'i ara", pl: 'Zadzwoń do MAX' })
    : triLang(lang, { ru: 'Поехали', uk: 'Поїхали', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Ayo mulai', tr: 'Hadi başla', pl: 'Zaczynamy' });

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleTap}>
      <View style={styles.root}>
        <LinearGradient
          pointerEvents="none"
          colors={palette.bg}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* «дыхание» фона в такт сцене */}
        <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, beatStyle]}>
          <LinearGradient
            colors={[`${palette.main}38`, 'transparent']}
            start={{ x: 0.5, y: 0.4 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>

        {/* акт 1: вспышка и световой шов */}
        <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.bright }, flashStyle]} />
        <Reanimated.View pointerEvents="none" style={[styles.seam, seamStyle]}>
          <LinearGradient
            colors={['transparent', palette.bright, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>

        <Pressable style={StyleSheet.absoluteFill} onPress={handleTap} accessibilityRole="button" />

        {!skipped && act !== 'act3' ? (
          <View pointerEvents="none" style={[styles.skipHint, { top: insets.top + 14 }]}>
            <Text style={styles.skipHintText}>
              {triLang(lang, { ru: 'тапни, чтобы пропустить', uk: 'тапни, щоб пропустити', es: 'toca para saltar', 'pt-BR': 'toque para pular', vi: 'chạm để bỏ qua', id: 'ketuk untuk lewati', tr: 'geçmek için dokun', pl: 'dotknij, by pominąć' })}
            </Text>
          </View>
        ) : null}

        {/* промокод: штамп кода перед актом 1 */}
        {hasPromo ? (
          <Reanimated.View pointerEvents="none" style={[styles.stamp, stampStyle]}>
            <Text style={[styles.stampText, { color: palette.bright }]}>{promoCode}</Text>
          </Reanimated.View>
        ) : null}

        {/* герой: акт 1 в центре → акт 2 медальоном сверху → финал обратно */}
        <Reanimated.View pointerEvents="none" style={[styles.heroWrap, heroStyle]}>
          {/* guard-ok: ударные волны от удара эмблемы — кольцо и есть сама линия
              волны, тоном/тенью её не нарисовать; это не рамка вокруг блока */}
          <Reanimated.View style={[styles.ringBase, { borderColor: palette.main }, ring1Style]} />
          <Reanimated.View style={[styles.ringBase, styles.ringThin, { borderColor: palette.main }, ring2Style]} />
          <Reanimated.View style={[styles.disc, discStyle]}>
            <LinearGradient
              colors={[`${palette.main}85`, '#0B0803']}
              start={{ x: 0.33, y: 0.22 }}
              end={{ x: 0.7, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name={palette.emblemIcon} size={50} color={palette.bright} />
          </Reanimated.View>
        </Reanimated.View>

        {/* акт 1: заголовок */}
        <Reanimated.View pointerEvents="none" style={[styles.titleWrap, titleStyle]}>
          <Text style={[styles.title, { color: palette.bright, fontSize: Math.max(28, f.h1 + 5) }]}>{titleText}</Text>
          <Text style={[styles.subtitle, { color: palette.text, fontSize: f.body }]}>{subtitleText}</Text>
        </Reanimated.View>

        {/* акт 2: сцена преимущества */}
        {act === 'act2' ? (
          <Reanimated.View pointerEvents="none" style={[styles.sceneWrap, sceneStyle]}>
            <View style={styles.sceneViz}>
              <CelebrationSceneView
                key={`${variant}_${scene.id}`}
                id={scene.id}
                palette={palette}
                animate={animateScenes}
              />
            </View>
            <View style={styles.sceneCaption}>
              <Text style={[styles.sceneTitle, { color: '#FFFFFF', fontSize: Math.max(20, f.h2) }]}>
                {sceneText(scene.title, lang)}
              </Text>
              <Text style={[styles.sceneSub, { color: palette.rowSub, fontSize: f.body }]}>
                {sceneText(scene.sub, lang)}
              </Text>
            </View>
          </Reanimated.View>
        ) : null}

        {/* акт 2: риски прогресса */}
        {act === 'act2' ? (
          <View pointerEvents="none" style={[styles.ticks, { top: insets.top + 42 }]}>
            {scenes.map((s, i) => (
              <View
                key={`tick_${s.id}`}
                style={[
                  styles.tick,
                  { backgroundColor: i <= sceneIndex ? palette.main : 'rgba(255,255,255,0.14)' },
                ]}
              />
            ))}
          </View>
        ) : null}

        {/* акт 3: финал */}
        {act === 'act3' ? (
          <Reanimated.View pointerEvents="none" style={[styles.finWrap, finStyle]}>
            <Text style={[styles.finNumber, { color: palette.bright }]}>{finaleNumber}</Text>
            <Text style={[styles.finLabel, { color: palette.text }]}>{finaleLabel}</Text>
          </Reanimated.View>
        ) : null}

        {/* CTA */}
        <Reanimated.View style={[styles.ctaWrap, { bottom: ctaBottom }, ctaStyle]} pointerEvents={act === 'act3' ? 'auto' : 'none'}>
          <TouchableOpacity
            testID={`${variant}-celebration-cta`}
            accessibilityRole="button"
            activeOpacity={0.88}
            onPress={() => { hapticSuccess(); handleClose(); }}
            style={styles.ctaTouch}
          >
            <LinearGradient colors={palette.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
              <Text style={[styles.ctaText, { color: palette.ctaText, fontSize: f.bodyLg + 1 }]}>{ctaText}</Text>
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

  seam: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2 },

  skipHint: {
    position: 'absolute', right: 16, paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)',
  },
  skipHintText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },

  stamp: {
    position: 'absolute', left: 24, right: 24, top: '33%',
    alignItems: 'center', paddingVertical: 13, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.46)',
  },
  stampText: { fontSize: 20, fontWeight: '900', letterSpacing: 4 },

  heroWrap: {
    position: 'absolute', left: 0, right: 0, top: '33%',
    alignItems: 'center', justifyContent: 'center',
  },
  disc: {
    width: 106, height: 106, borderRadius: 53, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  // guard-ok: ударная волна — линия по построению, а не обводка контейнера
  ringBase: {
    position: 'absolute', width: 106, height: 106, borderRadius: 53, borderWidth: 2,
  },
  ringThin: { borderWidth: 1 },

  titleWrap: { position: 'absolute', left: 22, right: 22, top: '51%', alignItems: 'center' },
  title: { fontWeight: '900', textAlign: 'center', letterSpacing: -0.5, lineHeight: 38 },
  subtitle: { textAlign: 'center', marginTop: 11, fontWeight: '600', opacity: 0.86, lineHeight: 20 },

  ticks: { position: 'absolute', left: 22, right: 22, flexDirection: 'row', gap: 3, height: 2.5 },
  tick: { flex: 1, borderRadius: 2, height: 2.5 },

  sceneWrap: { position: 'absolute', left: 0, right: 0, top: '17%', bottom: 108 },
  sceneViz: { flex: 1 },
  sceneCaption: { paddingHorizontal: 26, alignItems: 'center' },
  sceneTitle: { fontWeight: '900', textAlign: 'center', letterSpacing: -0.4, lineHeight: 28 },
  sceneSub: { fontWeight: '600', textAlign: 'center', marginTop: 7, opacity: 0.78, lineHeight: 19 },

  finWrap: { position: 'absolute', left: 22, right: 22, top: '44%', alignItems: 'center' },
  finNumber: { fontSize: 66, fontWeight: '900', lineHeight: 70, letterSpacing: -2 },
  finLabel: { fontSize: 15, fontWeight: '700', marginTop: 11, opacity: 0.8, textAlign: 'center' },

  ctaWrap: { position: 'absolute', left: 20, right: 20 },
  ctaTouch: { borderRadius: 19, overflow: 'hidden' },
  ctaGradient: { height: 58, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontWeight: '900', letterSpacing: 0.3 },
});
