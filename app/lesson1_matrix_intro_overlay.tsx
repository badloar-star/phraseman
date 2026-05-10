import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PremiumCard from '../components/PremiumCard';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { bundleLang, triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useEffectivePlatformOS } from './platform_ui_preview';

export const LESSON1_MATRIX_INTRO_STORAGE_KEY = 'lesson1_matrix_intro_done_v2';

// ─── Тайминги ────────────────────────────────────────────────────────────────
const T = {
  bgFade:       { d: 700, delay: 0 },
  headline:     { d: 600, delay: 180 },
  card1:        { d: 560, delay: 380 },
  card1line2:   { d: 480, delay: 520 },
  divider:      { d: 500, delay: 660 },
  card2:        { d: 560, delay: 760 },
  card3label:   { d: 400, delay: 960 },
  card3line1:   { d: 480, delay: 1060 },
  card3line2:   { d: 480, delay: 1180 },
  btn:          { d: 500, delay: 1350 },
  btnPulse:     { d: 1200, delay: 1700 },
};

type IntroPack = {
  headline: string;
  card1: [string, string];
  card2: string;
  card3: [string, string];
};

const INTRO_COPY: Record<'ru' | 'uk' | 'es', IntroPack> = {
  ru: {
    headline: 'Сразу к делу, да?',
    card1: [
      'Тогда не будем терять время.',
      'Давай поднимем твой английский на новый уровень.',
    ],
    card2: 'Мы не будем просто заучивать фразы. Мы будем отрабатывать их до автоматизма и приучать мозг понимать саму конструкцию.',
    card3: [
      'Чтобы открыть следующий урок, достаточно собрать 25 правильных ответов.',
      'Но если хочешь отточить тему до автоматизма и получить золотую медаль — придётся пройти урок несколько раз.',
    ],
  },
  uk: {
    headline: 'Одразу до діла, так?',
    card1: [
      'Тоді не будемо гаяти час.',
      'Давай піднімемо твою англійську на новий рівень.',
    ],
    card2: 'Ми не будемо просто зазубрювати фрази. Ми будемо відпрацьовувати їх до автоматизму і привчати мозок розуміти саму конструкцію.',
    card3: [
      'Щоб відкрити наступний урок, достатньо зібрати 25 правильних відповідей.',
      'Але якщо хочеш відточити тему до автоматизму і отримати золоту медаль — доведеться пройти урок кілька разів.',
    ],
  },
  es: {
    headline: '¿Al grano, verdad?',
    card1: [
      'Entonces no perdamos tiempo.',
      'Subamos tu inglés al siguiente nivel.',
    ],
    card2: 'No solo memorizaremos frases. Las practicaremos hasta el automatismo y entrenaremos al cerebro a entender la propia construcción.',
    card3: [
      'Para abrir la siguiente lección, basta con conseguir 25 respuestas correctas.',
      'Pero si quieres dominar el tema hasta el automatismo y conseguir la medalla de oro — tendrás que repetir la lección varias veces.',
    ],
  },
};

function introPack(lang: Lang): IntroPack {
  return INTRO_COPY[bundleLang(lang)];
}

// Создаёт анимируемый стиль: fade + подъём снизу + лёгкий scale
function makeAnim() {
  return {
    opacity:    new Animated.Value(0),
    translateY: new Animated.Value(28),
    scale:      new Animated.Value(0.95),
  };
}

type Anim = ReturnType<typeof makeAnim>;

function animIn(a: Anim, duration: number, delay: number, overshoot = 1.15) {
  return Animated.parallel([
    Animated.timing(a.opacity, {
      toValue: 1, duration, delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(a.translateY, {
      toValue: 0, duration, delay,
      easing: Easing.out(Easing.back(overshoot)),
      useNativeDriver: true,
    }),
    Animated.timing(a.scale, {
      toValue: 1, duration, delay,
      easing: Easing.out(Easing.back(overshoot * 0.6)),
      useNativeDriver: true,
    }),
  ]);
}

function getStyle(a: Anim) {
  return {
    opacity: a.opacity,
    transform: [{ translateY: a.translateY }, { scale: a.scale }],
  };
}

function snapIn(a: Anim) {
  a.opacity.setValue(1);
  a.translateY.setValue(0);
  a.scale.setValue(1);
}

type Props = {
  lang: Lang;
  mode: 'hidden' | 'checking' | 'playing';
  onComplete: () => void | Promise<void>;
  trialCtaEligible?: boolean;
  onTryPremium?: () => void;
};

export function Lesson1MatrixIntroOverlay({
  lang,
  mode,
  onComplete,
  trialCtaEligible = false,
  onTryPremium,
}: Props) {
  const { theme: t, f } = useTheme();
  const effectiveOs = useEffectivePlatformOS();
  const { width } = Dimensions.get('window');
  const pack = useMemo(() => introPack(lang), [lang]);

  const bgOpac    = useRef(new Animated.Value(0)).current;
  const dividerW  = useRef(new Animated.Value(0)).current;
  const btnPulse  = useRef(new Animated.Value(1)).current;
  const runRef    = useRef<Animated.CompositeAnimation | null>(null);
  // Предотвращает flash: значения сбрасываются до первого рендера
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (mode !== 'playing') return;
    bgOpac.setValue(0);
    dividerW.setValue(0);
    btnPulse.setValue(1);
    Object.values(A).forEach(a => {
      a.opacity.setValue(0);
      a.translateY.setValue(28);
      a.scale.setValue(0.95);
    });
    setReady(true);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Индивидуальная анимация для каждого элемента
  const A = useRef({
    headline:   makeAnim(),
    card1:      makeAnim(),
    card1l2:    makeAnim(),
    card2:      makeAnim(),
    card3label: makeAnim(),
    card3l1:    makeAnim(),
    card3l2:    makeAnim(),
    btn:        makeAnim(),
  }).current;

  const snapAll = useCallback(() => {
    Object.values(A).forEach(snapIn);
    dividerW.setValue(44);
  }, [A, dividerW]);

  const finishAndClose = useCallback(() => {
    if (mode !== 'playing') return;
    void hapticTap();
    runRef.current?.stop();
    bgOpac.stopAnimation(() => {});
    Animated.timing(bgOpac, { toValue: 1, duration: 100, useNativeDriver: true }).start();
    snapAll();
    void Promise.resolve(onComplete()).catch(() => {});
  }, [mode, bgOpac, snapAll, onComplete]);

  useEffect(() => {
    if (mode !== 'playing' || !ready) return undefined;

    const run = Animated.parallel([
      // Фон
      Animated.timing(bgOpac, {
        toValue: 1, duration: T.bgFade.d, delay: T.bgFade.delay,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      // Разделитель — рисуется как линия слева направо
      Animated.timing(dividerW, {
        toValue: 44, duration: T.divider.d, delay: T.divider.delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }),
      // Элементы
      animIn(A.headline,   T.headline.d,   T.headline.delay,   1.2),
      animIn(A.card1,      T.card1.d,      T.card1.delay,      1.15),
      animIn(A.card1l2,    T.card1line2.d, T.card1line2.delay, 1.0),
      animIn(A.card2,      T.card2.d,      T.card2.delay,      1.15),
      animIn(A.card3label, T.card3label.d, T.card3label.delay, 1.0),
      animIn(A.card3l1,    T.card3line1.d, T.card3line1.delay, 1.0),
      animIn(A.card3l2,    T.card3line2.d, T.card3line2.delay, 1.0),
      animIn(A.btn,        T.btn.d,        T.btn.delay,        1.3),
      // Пульс кнопки после появления
      Animated.sequence([
        Animated.delay(T.btnPulse.delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(btnPulse, { toValue: 1.035, duration: T.btnPulse.d / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(btnPulse, { toValue: 1,     duration: T.btnPulse.d / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
          { iterations: 3 }
        ),
      ]),
    ]);

    runRef.current = run;
    run.start();
    return () => run.stop();
  }, [mode, ready, bgOpac, dividerW, btnPulse, A]);

  useEffect(() => {
    if (mode === 'hidden' || mode === 'checking') return;
    /** Одноразовый экран: «Назад» не закрывает и не помечает просмотр — только «Продолжить». */
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [mode]);

  const onPremiumPress = useCallback(() => {
    if (!onTryPremium) return;
    void hapticTap();
    runRef.current?.stop();
    snapAll();
    onTryPremium();
  }, [snapAll, onTryPremium]);

  if (mode === 'hidden' || mode === 'checking') return null;

  const continueLabel = triLang(lang, { ru: 'Продолжить', uk: 'Далі', es: 'Continuar' });
  const tryPremiumCta = triLang(lang, {
    ru: 'Попробовать 7 дней бесплатно',
    uk: 'Спробувати 7 днів безкоштовно',
    es: 'Probar 7 días gratis',
  });
  const tryPremiumSub = triLang(lang, {
    ru: 'Дальше — платная подписка. Отмена в настройках магазина.',
    uk: 'Далі — платна підписка. Скасування в налаштуваннях магазину.',
    es: 'Después, suscripción de pago. Cancela en la tienda.',
  });
  const showTrialRow = Boolean(trialCtaEligible && onTryPremium);

  const cardShadow =
    effectiveOs === 'ios'
      ? { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }
      : { elevation: 6 };
  const goldShadow =
    effectiveOs === 'ios'
      ? { shadowColor: t.gold, shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } }
      : { elevation: 5 };

  if (!ready) return null;

  return (
    <View style={styles.root} pointerEvents="auto">
      <Animated.View style={[styles.fill, { opacity: bgOpac }]}>
        <ScreenGradient forceFullBleed style={styles.fill}>
          <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.content, { paddingBottom: effectiveOs === 'ios' ? 20 : 10 }]}
              showsVerticalScrollIndicator={false}
              bounces
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.col, { maxWidth: Math.min(420, width - 32) }]}>

                {/* ── Заголовок ── */}
                <Animated.Text
                  accessibilityRole="header"
                  style={[
                    styles.headline,
                    { color: t.textPrimary, fontSize: Math.min(32, f.h2 + 10), lineHeight: Math.min(40, f.h2 + 18) },
                    getStyle(A.headline),
                  ]}
                >
                  {pack.headline}
                </Animated.Text>

                {/* ── Карточка 1 ── */}
                <Animated.View style={[styles.card, { backgroundColor: t.bgSurface, borderColor: t.borderHighlight, ...cardShadow }, getStyle(A.card1)]}>
                  <Text style={[styles.bodyLg, { color: t.textPrimary, fontSize: f.bodyLg, lineHeight: Math.round(f.bodyLg * 1.55) }]}>
                    {pack.card1[0]}
                  </Text>
                  <Animated.Text style={[styles.bodyLg, styles.mt12, { color: t.textPrimary, fontSize: f.bodyLg, lineHeight: Math.round(f.bodyLg * 1.55) }, getStyle(A.card1l2)]}>
                    {pack.card1[1]}
                  </Animated.Text>
                </Animated.View>

                {/* ── Карточка 2 ── */}
                <Animated.View style={[styles.card, { backgroundColor: t.bgSurface2 ?? t.bgSurface, borderColor: t.border, borderWidth: 1, ...cardShadow }, getStyle(A.card2)]}>
                  <Text style={[styles.body, { color: t.textPrimary, fontSize: f.bodyLg, lineHeight: Math.round(f.bodyLg * 1.58) }]}>
                    {pack.card2}
                  </Text>
                </Animated.View>

                {/* ── Золотой разделитель ── */}
                <Animated.View style={[styles.divider, { width: dividerW, backgroundColor: t.gold }]} />

                {/* ── Карточка 3 — условие / прогресс ── */}
                <Animated.View style={[styles.card, styles.cardGold, { backgroundColor: t.goldBg, borderColor: `${t.gold}66`, ...goldShadow }, getStyle(A.card3label)]}>
                  <Animated.Text style={[styles.body, { color: t.textPrimary, fontSize: f.body, lineHeight: Math.round(f.body * 1.58) }, getStyle(A.card3l1)]}>
                    {pack.card3[0]}
                  </Animated.Text>
                  <Animated.Text style={[styles.body, styles.mt12, { color: t.textPrimary, fontSize: f.body, lineHeight: Math.round(f.body * 1.58) }, getStyle(A.card3l2)]}>
                    {pack.card3[1]}
                  </Animated.Text>
                </Animated.View>

              </View>
            </ScrollView>

            {/* ── Кнопки ── */}
            <Animated.View style={[styles.cta, { paddingBottom: effectiveOs === 'ios' ? 28 : 18 }, getStyle(A.btn)]}>
              {showTrialRow && (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={onPremiumPress}
                  style={[styles.trialBtn, { borderColor: `${t.gold}88`, backgroundColor: t.goldBg }]}
                >
                  <Text style={[styles.trialTitle, { color: t.gold }]}>{tryPremiumCta}</Text>
                  <Text style={[styles.trialSub, { color: t.textMuted, fontSize: f.caption }]}>{tryPremiumSub}</Text>
                </TouchableOpacity>
              )}
              <Animated.View style={{ transform: [{ scale: btnPulse }], marginTop: showTrialRow ? 12 : 0 }}>
                <PremiumCard
                  testID="lesson1-matrix-intro-continue"
                  level={2}
                  disabled={false}
                  onPress={finishAndClose}
                  innerStyle={styles.continueInner}
                >
                  <Text style={{ color: t.textPrimary, fontWeight: '800', fontSize: f.bodyLg }}>{continueLabel}</Text>
                </PremiumCard>
              </Animated.View>
            </Animated.View>
          </SafeAreaView>
        </ScreenGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100 },
  fill: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
  },
  col: { width: '100%', alignSelf: 'center' },
  headline: {
    fontWeight: '800',
    letterSpacing: 0.1,
    marginBottom: 22,
    textAlign: 'left',
  },
  card: {
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  cardGold: {
    borderWidth: 1.5,
  },
  bodyLg: {
    fontWeight: '600',
    textAlign: 'left',
    letterSpacing: 0.02,
  },
  body: {
    fontWeight: '500',
    textAlign: 'left',
    letterSpacing: 0.02,
  },
  divider: {
    height: 3,
    borderRadius: 2,
    marginBottom: 14,
    marginTop: 2,
    opacity: 0.9,
  },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
  cta: {
    paddingHorizontal: 22,
    paddingTop: 6,
    width: '100%',
    alignItems: 'stretch',
  },
  trialBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 0,
  },
  trialTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  trialSub: {
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  continueInner: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
