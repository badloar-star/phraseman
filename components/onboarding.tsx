import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, ScrollView,
  Animated, BackHandler, Keyboard, Easing,
  Platform,
  Image,
  StatusBar,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateReferralCode } from '../app/referral_system';
import { IS_BETA_TESTER } from '../app/config';
// Онбординг закреплён за темой "Графит" (MINIMAL_DARK) — это одна из двух
// бесплатных тем (вторая — "Скетч"/MINIMAL_LIGHT). Импортируем под алиасом
// `DARK`, чтобы не править все ~150 ссылок DARK.* по тексту экрана.
import { MINIMAL_DARK as DARK } from '../constants/theme';
import { isInterfaceLangEnabled, type Lang } from '../constants/i18n';
import {
  UserProfile,
  estimateDaysToTarget,
  addDays,
  type LearningGoal,
  type MinutesPerDay,
  type CurrentLevel,
  type TargetLevel,
} from '../app/types/user_profile';
import { scheduleDailyReminder } from '../app/notifications';
import { reserveName } from '../app/firestore_leaderboard';
import { validateProfileName } from '../app/settings/profile_name_service';
import { enqueueThemedBlockingInfoAlert } from '../app/themed_blocking_alert_queue';
import { useScreen } from '../hooks/use-screen';
import {
  signInWithProvider,
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  AUTH_PROMPT_SHOWN_KEY,
  APPLE_ANDROID_MISSING_SERVICE_ID,
  type AuthProviderId,
} from '../app/auth_provider';
import { GoogleSignInButton, AppleSignInButton } from './AuthProviderButtons';
import { backgroundTransitionKey, useBackgroundBlurSwitch } from './backgroundTransition';

const AppInfoDialog = {
  alert(title: string, message: string) {
    void enqueueThemedBlockingInfoAlert(title, message, 'OK');
  },
};

interface Props {
  onDone: () => void;
  onLangSelect?: (lang: Lang) => void;
}


const TARGET_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'] as const;
const PROGRESS_STEPS = ['welcome', 'name', 'streak', 'auth'] as const;
type OnboardingStepKey = 'beta' | 'welcome' | 'demo2' | 'demo' | 'name' | 'streak' | 'auth';
type StreakMilestoneIconKind = 'flame' | 'bolt' | 'gem' | 'crown';
type OnboardingParticleSpec = {
  left: `${number}%`;
  top: `${number}%`;
  size: number;
  delay: number;
  duration: number;
  rise: number;
  drift: number;
  opacity: number;
};
const USE_ELITE_ONBOARDING_WELCOME = true;
const ONBOARDING_ACCENT = '#F2B84B';
const ONBOARDING_ACCENT_BG = 'rgba(242,184,75,0.16)';
const ONBOARDING_TEXT_MUTED = '#D8CCB5';
const ONBOARDING_BG_BETA = require('../assets/images/onboarding/onboarding-bg-beta-wide.webp');
const ONBOARDING_BG_WELCOME = require('../assets/images/onboarding/onboarding-bg-welcome-wide.webp');
const ONBOARDING_BG_NAME = require('../assets/images/onboarding/onboarding-bg-name-wide.webp');
const ONBOARDING_BG_BUILDER = require('../assets/images/onboarding/onboarding-bg-builder-wide.webp');
const ONBOARDING_BG_QUIZ = require('../assets/images/onboarding/onboarding-bg-quiz-wide.webp');
const ONBOARDING_BG_STREAK = require('../assets/images/onboarding/onboarding-bg-streak-wide.webp');
const ONBOARDING_BG_AUTH = require('../assets/images/onboarding/onboarding-bg-auth-wide.webp');
const ONBOARDING_LINGMAN_ICON = require('../assets/images/onboarding/lingman-icon-transparent.webp');
const ONBOARDING_AUTH_ICON = require('../assets/images/onboarding/auth-quick-start-icon.webp');
const ONBOARDING_STREAK_ICONS: Record<StreakMilestoneIconKind, ImageSourcePropType> = {
  flame: require('../assets/images/onboarding/streak-flame-medallion.webp'),
  bolt: require('../assets/images/onboarding/streak-bolt-medallion.webp'),
  gem: require('../assets/images/onboarding/streak-gem-medallion.webp'),
  crown: require('../assets/images/onboarding/streak-crown-medallion.webp'),
};
const PREV_STEP: Partial<Record<OnboardingStepKey, OnboardingStepKey>> = {
  demo2: 'welcome',
  demo: 'demo2',
  name: 'welcome',
  streak: 'name',
  auth: 'streak',
};
const ONBOARDING_BACKGROUND_PARTICLES: OnboardingParticleSpec[] = [
  { left:  '9%', top: '26%', size: 2, delay: 500,  duration: 9800,  rise: 82,  drift:  10, opacity: 0.20 },
  { left: '23%', top: '34%', size: 2, delay: 2400, duration: 10600, rise: 96,  drift: -12, opacity: 0.22 },
  { left: '48%', top: '22%', size: 2, delay: 3900, duration: 11200, rise: 76,  drift:  8,  opacity: 0.18 },
  { left: '73%', top: '30%', size: 2, delay: 1200, duration: 10100, rise: 90,  drift: -10, opacity: 0.21 },
  { left: '88%', top: '40%', size: 2, delay: 5600, duration: 10800, rise: 104, drift:  13, opacity: 0.18 },
  { left: '16%', top: '47%', size: 2, delay: 3300, duration: 9300,  rise: 118, drift: -14, opacity: 0.25 },
  { left: '39%', top: '52%', size: 2, delay: 700,  duration: 9900,  rise: 126, drift:  16, opacity: 0.24 },
  { left: '64%', top: '48%', size: 2, delay: 4500, duration: 9600,  rise: 112, drift: -15, opacity: 0.23 },
  { left:  '8%', top: '78%', size: 2, delay: 0,    duration: 7600, rise: 142, drift:  16, opacity: 0.46 },
  { left: '18%', top: '84%', size: 3, delay: 900,  duration: 9200, rise: 184, drift: -20, opacity: 0.42 },
  { left: '30%', top: '72%', size: 2, delay: 1800, duration: 8200, rise: 128, drift:  12, opacity: 0.38 },
  { left: '42%', top: '88%', size: 2, delay: 2600, duration: 9800, rise: 208, drift: -14, opacity: 0.40 },
  { left: '56%', top: '76%', size: 3, delay: 600,  duration: 8600, rise: 156, drift:  18, opacity: 0.44 },
  { left: '68%', top: '86%', size: 2, delay: 2200, duration: 9400, rise: 198, drift: -18, opacity: 0.36 },
  { left: '82%', top: '74%', size: 2, delay: 1400, duration: 7900, rise: 132, drift:  10, opacity: 0.34 },
  { left: '92%', top: '82%', size: 3, delay: 3200, duration: 9100, rise: 176, drift: -22, opacity: 0.40 },
  { left: '14%', top: '58%', size: 2, delay: 4100, duration: 10400, rise: 154, drift:  12, opacity: 0.28 },
  { left: '36%', top: '64%', size: 2, delay: 5200, duration: 9700,  rise: 168, drift: -16, opacity: 0.30 },
  { left: '61%', top: '60%', size: 2, delay: 3600, duration: 10100, rise: 146, drift:  14, opacity: 0.28 },
  { left: '76%', top: '66%', size: 2, delay: 4700, duration: 8900,  rise: 138, drift: -10, opacity: 0.32 },
];


export default function Onboarding({ onDone, onLangSelect }: Props) {
  const insets = useSafeAreaInsets();
  const { width: viewportW, height: viewportH, uiScale } = useScreen();
  const progressTopPadding = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + 8;
  const narrowViewport = Math.min(viewportW, viewportH);
  const compactOnboarding = narrowViewport < 370 || viewportH < 700;
  const onboardingScale = Math.min(1, Math.max(0.78, uiScale));
  const onboardingHPad = compactOnboarding ? 18 : 28;
  const onboardingScrollProps = {
    keyboardShouldPersistTaps: 'handled' as const,
    showsVerticalScrollIndicator: true,
  };
  const streakHeroIconSize = Math.round((compactOnboarding ? 76 : 92) * onboardingScale);
  const streakMilestoneIconSize = Math.round((compactOnboarding ? 50 : 60) * onboardingScale);

  // uk -> UA; es-* -> Spanish UI when the interface locale is enabled; otherwise RU.
  const detectLang = (): Lang => {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
      if (locale.startsWith('uk')) return 'uk';
      if (locale.toLowerCase().startsWith('es') && isInterfaceLangEnabled('es')) return 'es';
      return 'ru';
    } catch {
      return 'ru';
    }
  };

  type OnboardingStep = OnboardingStepKey;
  const [step, setStepRaw]    = useState<OnboardingStep>(IS_BETA_TESTER ? 'beta' : 'welcome');
  const stepRef = useRef(step);
  const setStep = useCallback((next: OnboardingStep) => {
    stepRef.current = next;
    setStepRaw(next);
    AsyncStorage.setItem('onboarding_step', next).catch(() => {});
  }, []);
  const nameForProfileRef = useRef('');
  const [demoAnswered, setDemoAnswered] = useState(false);
  const [demoCorrect, setDemoCorrect]   = useState(false);
  const [demoSelected, setDemoSelected] = useState<number>(-1);
  // Demo2 state — phrase builder
  const [demo2Selected, setDemo2Selected] = useState<number[]>([]);
  const [demo2Answered, setDemo2Answered] = useState(false);
  const [demo2Correct, setDemo2Correct]   = useState(false);
  const demo2GreetFade  = useRef(new Animated.Value(0)).current;
  const demo2HintFade   = useRef(new Animated.Value(0)).current;
  const demo2QuizFade   = useRef(new Animated.Value(0)).current;
  const demo2ShakeAnims = useRef([0,1,2,3,4,5].map(() => new Animated.Value(0))).current;
  // Global screen fade transition
  const screenFade = useRef(new Animated.Value(1)).current;
  const welcomeIntro = useRef(new Animated.Value(0)).current;
  const lingmanPulse = useRef(new Animated.Value(0)).current;
  // Staggered milestone card anims
  const milestoneAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const btnSlide   = useRef(new Animated.Value(30)).current;
  const btnFade    = useRef(new Animated.Value(0)).current;
  const [lang]       = useState<Lang>(detectLang);
  const [name, setName]       = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameFieldError, setNameFieldError] = useState<string | null>(null);
  const [keyboardPad, setKeyboardPad] = useState(0);
  // Дефолтные значения — экраны выбора удалены, профиль сохраняется с базовыми настройками
  const goal: LearningGoal       = 'hobby';
  const minutesPerDay: MinutesPerDay = 15;
  const currentLevel: CurrentLevel   = 'a1';
  const [notificationTime] = useState<string>('08:00');

  const isUK = lang === 'uk';
  const pick = (ru: string, uk: string, es: string) =>
    lang === 'es' ? es : isUK ? uk : ru;
  const triOb = (ru: string, uk: string, es: string) =>
    lang === 'es' ? es : isUK ? uk : ru;

  const renderScreen = (
    testID: string | undefined,
    source: ImageSourcePropType,
    children: React.ReactNode,
    contentStyle?: StyleProp<ViewStyle>,
  ) => (
    <OnboardingScreenShell
      testID={testID}
      source={source}
      screenFade={screenFade}
      contentStyle={contentStyle}
    >
      {children}
    </OnboardingScreenShell>
  );

  // Плавный переход между экранами
  const goToStep = useCallback((next: typeof step) => {
    Animated.timing(screenFade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setStep(next);
    });
  }, [screenFade, setStep]);

  // Анимация появления кнопки снизу
  const animateBtn = () => {
    btnSlide.setValue(30);
    btnFade.setValue(0);
    Animated.parallel([
      Animated.timing(btnFade,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(btnSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  };

  // Прогресс-бар + кнопка назад
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const prev = PREV_STEP[step];
      if (prev) { goToStep(prev); return true; }
      return true; // блокируем GO_BACK даже на первом экране
    });
    return () => sub.remove();
  }, [step, goToStep]);

  const renderProgressBar = () => {
    const idx = (PROGRESS_STEPS as readonly string[]).indexOf(step);
    if (idx < 0) return null;
    const pct = Math.round(((idx + 1) / PROGRESS_STEPS.length) * 100);
    const prev = PREV_STEP[step];
    return (
      <View style={[styles.progressWrap, { paddingTop: progressTopPadding }]}>
        <View style={styles.progressRow}>
          {prev ? (
            <TouchableOpacity onPress={() => goToStep(prev)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
              <Text style={{ color: ONBOARDING_ACCENT, fontSize: 20 }}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <View style={{ width: 44 }} />
        </View>
      </View>
    );
  };

  // Восстанавливаем шаг при повторном монтировании (после Alert на Android и т.п.)
  useEffect(() => {
    AsyncStorage.getItem('onboarding_step').then(saved => {
      if (saved && saved !== stepRef.current) {
        const restored = saved === 'energy' ? 'auth' : saved as OnboardingStep;
        setStepRaw(restored);
        stepRef.current = restored;
      }
    }).catch(() => {});
  }, []);

  // Fade-in экрана при каждой смене шага
  useEffect(() => {
    Animated.timing(screenFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [step, screenFade]);

  useEffect(() => {
    if (step !== 'welcome' || !USE_ELITE_ONBOARDING_WELCOME) return;
    welcomeIntro.setValue(0);
    Animated.spring(welcomeIntro, {
      toValue: 1,
      useNativeDriver: true,
      friction: 10,
      tension: 58,
    }).start();
  }, [step, welcomeIntro]);

  useEffect(() => {
    if (step !== 'welcome') return;
    lingmanPulse.setValue(0);
    const pulse = Animated.sequence([
      Animated.delay(700),
      Animated.timing(lingmanPulse, {
        toValue: 1,
        duration: 22000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    pulse.start();
    return () => pulse.stop();
  }, [lingmanPulse, step]);

  useEffect(() => {
    if (step !== 'name') {
      setKeyboardPad(0);
      return;
    }
    const evShow = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const evHide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(evShow, (e) => {
      setKeyboardPad(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(evHide, () => setKeyboardPad(0));
    return () => { show.remove(); hide.remove(); };
  }, [step]);

  useEffect(() => {
    if (step !== 'streak') return;
    milestoneAnims.forEach(a => a.setValue(0));
    Animated.sequence([
      Animated.delay(160),
      Animated.stagger(150, milestoneAnims.map(a =>
        Animated.timing(a, {
          toValue: 1,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )),
    ]).start();
  }, [step, milestoneAnims]);

  useEffect(() => {
    if (step !== 'demo2') return;
    // reset phrase builder
    demo2GreetFade.setValue(0);
    demo2HintFade.setValue(0);
    demo2QuizFade.setValue(0);
    setDemo2Selected([]);
    setDemo2Answered(false);
    setDemo2Correct(false);
    // sequence: greet → hint → quiz
    Animated.sequence([
      Animated.timing(demo2GreetFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(demo2HintFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(200),
      Animated.timing(demo2QuizFade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [step, demo2GreetFade, demo2HintFade, demo2QuizFade]);


  // Уведомляем родителя о языке при монтировании
  useEffect(() => {
    onLangSelect?.(lang);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const AUTO_NAME_WORDS = [
    // Языковая / литературная тема
    'Syntax', 'Lexis', 'Prose', 'Verse', 'Quill', 'Glyph', 'Script', 'Riddle',
    'Fable', 'Rhyme', 'Serif', 'Sonnet', 'Clause', 'Motif', 'Trope', 'Parable',
    'Thesis', 'Corpus', 'Lore', 'Rune', 'Lyric', 'Gloss', 'Tome', 'Epics',
    // Греческий алфавит
    'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Theta', 'Iota',
    'Kappa', 'Lambda', 'Sigma', 'Omega', 'Phi', 'Psi', 'Tau', 'Rho',
    // "Умные" короткие слова
    'Axiom', 'Cipher', 'Sage', 'Totem', 'Omen', 'Nexus', 'Prism', 'Vector',
    'Quantum', 'Ethos', 'Logos', 'Kairos', 'Telos', 'Aporia', 'Datum',
  ];

  const generateAutoName = (): string => {
    const word = AUTO_NAME_WORDS[Math.floor(Math.random() * AUTO_NAME_WORDS.length)];
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${word}${suffix}`;
  };

  const handleNameDone = async () => {
    if (nameBusy) return;
    setNameFieldError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setNameFieldError(pick('Введите имя чтобы продолжить', 'Введіть ім\'я щоб продовжити', 'Escribe tu nombre para continuar'));
      return;
    }
    if (trimmed.length < 2) {
      setNameFieldError(pick('Минимум 2 символа', 'Мінімум 2 символи', 'Mínimo 2 caracteres'));
      return;
    }
    if (trimmed.length > 20) {
      setNameFieldError(pick('Максимум 20 символов', 'Максимум 20 символів', 'Máximo 20 caracteres'));
      return;
    }
    const prof = validateProfileName(trimmed);
    if (prof === 'profanity') {
      setNameFieldError(pick(
        'Это имя не подходит — выберите другое.',
        'Це ім\'я не підходить — оберіть інше.',
        'Este nombre no es adecuado; prueba con otro.',
      ));
      return;
    }

    setNameBusy(true);
    const result = 'ok' as Awaited<ReturnType<typeof reserveName>>;
    setName(trimmed);
    nameForProfileRef.current = trimmed;
    if (result === 'taken') {
      setNameBusy(false);
      setNameFieldError(pick(
        'Это имя уже занято — придумай другой ник.',
        'Це ім\'я вже зайняте — вигадай інший нік.',
        'Este nombre ya está en uso; prueba con otro.',
      ));
      return;
    }
    if (result === 'error') {
      setNameBusy(false);
      setNameFieldError(pick(
        'Не удалось проверить имя. Проверь интернет и попробуй ещё раз.',
        'Не вдалося перевірити ім\'я. Перевір мережу й спробуй ще раз.',
        'No se pudo comprobar el nombre. Revisa la conexión e inténtalo de nuevo.',
      ));
      return;
    }

    try {
      Keyboard.dismiss();
      goToStep('streak');
      await AsyncStorage.multiSet([
        ['app_lang', lang],
        ['user_name', trimmed],
      ]);
      await reserveName(trimmed, '').catch(() => {});
      await import('../app/firestore_leagues')
        .then((m) => m.registerInLeagueGroupSilently())
        .catch(() => {});
    } finally {
      setNameBusy(false);
    }
  };

  const handleSkipName = async () => {
    if (nameBusy) return;
    setNameFieldError(null);
    setNameBusy(true);
    try {
      let autoName = generateAutoName();
      setName(autoName);
      nameForProfileRef.current = autoName;
      Keyboard.dismiss();
      goToStep('streak');
      // retry до 5 раз чтобы найти свободный ник
      for (let i = 0; i < 5; i++) {
        const result = await reserveName(autoName, '');
        if (result !== 'taken') break;
        autoName = generateAutoName();
      }
      setName(autoName);
      nameForProfileRef.current = autoName;
      await AsyncStorage.multiSet([
        ['app_lang', lang],
        ['user_name', autoName],
      ]);
      await import('../app/firestore_leagues')
        .then((m) => m.registerInLeagueGroupSilently())
        .catch(() => {});
    } finally {
      setNameBusy(false);
    }
  };


  const saveUserProfile = async () => {
    if (!goal || !minutesPerDay || !currentLevel) return;

    // Определяем целевой уровень (на один выше текущего, но не выше C1)
    const targetIdx = Math.min(TARGET_LEVELS.indexOf(currentLevel) + 1, TARGET_LEVELS.length - 1);
    const target = TARGET_LEVELS[targetIdx] as TargetLevel;

    const daysEstimate = estimateDaysToTarget(currentLevel, target, minutesPerDay);
    const targetDate = addDays(new Date(), daysEstimate);

    const profile: UserProfile = {
      name: (nameForProfileRef.current || name).trim(),
      learningGoal: goal,
      minutesPerDay,
      currentLevel,
      targetLevel: target,
      preferredNotificationTime: notificationTime,
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      estimatedDaysToTarget: daysEstimate,
      estimatedTargetDate: targetDate.toISOString().split('T')[0],
    };

    await AsyncStorage.setItem('user_profile', JSON.stringify(profile));

    // Рефкод в облаке — в фоне, без блокировки кнопки «Позже» / входа
    void generateReferralCode((nameForProfileRef.current || name).trim()).catch(() => {});
  };

  // Гард от повторного завершения онбординга при двойном тапе на «Позже»/auth-кнопках.
  // Без него onDone() мог дёрнуться дважды → setTimeout в _layout повторно открывал
  // модалку «Начнём первый урок?» уже после нажатия «Поехали».
  const finishingRef = useRef(false);
  const handleFinishOnboarding = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    await saveUserProfile();
    await AsyncStorage.setItem('onboarding_done', '1');
    await AsyncStorage.removeItem('onboarding_step');
    // Включаем напоминание по умолчанию в 20:00 — пользователь может сменить в настройках.
    // requestPermission: false — НЕ дёргаем системный диалог push на онбординге.
    // Нативный запрос разрешения идёт строго через NotificationPermissionModal в _layout.tsx
    // по разработанным условиям (missedDays > 0, антиспам 1 раз в день и т.п.).
    scheduleDailyReminder(20, 0, lang, { requestPermission: false }).catch(() => {});
    onDone();
  };

  // ── Шаг 0: Добро пожаловать в бета ─────────────────────────────────────────
  if (step === 'beta') {
    const betaItems =
      lang === 'es'
        ? [
            '📱 Completa algunas lecciones y prueba los botones',
            '🔍 Fíjate en errores y en lo que resulte incómodo',
            '📸 Haz una captura si algo va mal',
            '💬 Escríbeme por Telegram con la captura',
          ]
        : isUK
          ? [
              '📱 Пройди декілька уроків та перевір кнопки',
              '🔍 Зверни увагу на помилки та незручності',
              '📸 Зроби скріншот, якщо щось не так',
              '💬 Напиши мені в Telegram зі скріншотом',
            ]
          : [
              '📱 Пройди несколько уроков и проверь кнопки',
              '🔍 Обрати внимание на ошибки и неудобства',
              '📸 Сделай скриншот, если что-то не так',
              '💬 Напиши мне в Telegram со скриншотом',
            ];
    return renderScreen(
      'onboarding-beta-screen',
      ONBOARDING_BG_BETA,
      (
        <ScrollView
          {...onboardingScrollProps}
          contentContainerStyle={{
            alignItems: 'center',
            paddingHorizontal: onboardingHPad,
            paddingTop: compactOnboarding ? 24 : 40,
            paddingBottom: (compactOnboarding ? 24 : 40) + insets.bottom,
          }}
        >
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🧪</Text>
          <Text style={[styles.appName, { marginBottom: 24 }]}>
            {pick('Бета-тест', 'Бета-тест', 'Prueba beta')}
          </Text>

          <View style={{ backgroundColor: DARK.bgCard, borderRadius: 18, padding: 20, width: '100%', marginBottom: 28, borderWidth: 1, borderColor: DARK.border }}>
            <Text style={{ color: DARK.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>
              {pick('🙏 Спасибо за участие!', '🙏 Дякуємо за участь!', '🙏 ¡Gracias por participar!')}
            </Text>
            <Text style={{ color: DARK.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
              {pick(
                'Ты один из первых пользователей Phraseman. Твоя обратная связь напрямую влияет на продукт.',
                'Ти один з перших користувачів Phraseman. Твій зворотний зв\'язок напряму впливає на продукт.',
                'Eres de los primeros usuarios de Phraseman. Tus comentarios influyen de forma directa en la app.',
              )}
            </Text>

            <Text style={{ color: DARK.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              {pick('Что нужно сделать:', 'Що треба зробити:', 'Qué tienes que hacer:')}
            </Text>
            {betaItems.map((item, i) => (
              <Text key={i} style={{ color: DARK.textMuted, fontSize: 13, lineHeight: 22, marginBottom: 4 }}>
                {item}
              </Text>
            ))}

            <View style={{ marginTop: 16, backgroundColor: DARK.bgSurface2, borderRadius: 10, padding: 12 }}>
              <Text style={{ color: DARK.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
                {lang === 'es' ? (
                  <>
                    Todas las observaciones se revisan y se tienen en cuenta.{'\n'}
                    Por favor, no borres la app durante{'\n'}
                    <Text style={{ color: DARK.textPrimary, fontWeight: '700' }}>14 días</Text>
                    {' '}— si no, no podremos contar tu participación.
                  </>
                ) : isUK ? (
                  <>
                    Всі зауваження та пропозиції розглядаються й враховуються.{'\n'}
                    Будь ласка, не видаляй застосунок{'\n'}протягом <Text style={{ color: DARK.textPrimary, fontWeight: '700' }}>14 днів</Text> — інакше твоя участь не зарахується.
                  </>
                ) : (
                  <>
                    Все замечания и предложения рассматриваются и учитываются.{'\n'}
                    Пожалуйста, не удаляй приложение{'\n'}в течение <Text style={{ color: DARK.textPrimary, fontWeight: '700' }}>14 дней</Text> — иначе твоё участие не засчитается.
                  </>
                )}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            testID="onboarding-beta-continue"
            style={[styles.continueBtn, { width: '100%' }]}
            onPress={() => goToStep('demo2')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>{pick('Понятно 👍', 'Зрозуміло 👍', 'Entendido 👍')}</Text>
          </TouchableOpacity>
        </ScrollView>
      ),
    );
  }

  // ── Шаг 0: Welcome — главный оффер ─────────────────────────────────────────
  if (step === 'welcome') {
    if (USE_ELITE_ONBOARDING_WELCOME) {
      const heroY = welcomeIntro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
      const heroScale = welcomeIntro.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
      const lingmanScale = lingmanPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.105] });
      return renderScreen(
        'onboarding-welcome-screen',
        ONBOARDING_BG_WELCOME,
        (
          <>
            <Animated.View
              style={[
                styles.eliteWelcomeMain,
                { transform: [{ translateY: heroY }, { scale: heroScale }] },
              ]}
            >
              <Animated.View style={[styles.eliteWelcomeMark, { transform: [{ scale: lingmanScale }] }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.075)', 'rgba(242,184,75,0.11)']}
                  locations={[0, 0.46, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.eliteWelcomeMarkGlass}
                >
                  <View pointerEvents="none" style={styles.eliteWelcomeGlassShine} />
                  <Image
                    source={ONBOARDING_LINGMAN_ICON}
                    style={styles.eliteWelcomeMarkLogo}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </Animated.View>
              <Text style={styles.eliteWelcomeTitle}>
                {triOb(
                  'Английский без лишнего шума',
                  'Англійська без зайвого шуму',
                  'Inglés sin ruido',
                )}
              </Text>
              <Text style={styles.eliteWelcomeSub}>
                {triOb(
                  'Короткая практика, спокойный ритм и понятный прогресс.',
                  'Коротка практика, спокійний ритм і зрозумілий прогрес.',
                  'Práctica breve, ritmo tranquilo y progreso claro.',
                )}
              </Text>
            </Animated.View>

            <View style={styles.eliteWelcomeBottom}>
              <TouchableOpacity
                testID="onboarding-welcome-continue"
                style={styles.eliteWelcomeCta}
                onPress={() => goToStep('name')}
                activeOpacity={0.88}
              >
                <Text style={styles.eliteWelcomeCtaText}>
                  {triOb('Начать', 'Почати', 'Empezar')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.eliteWelcomeFootnote}>
                {triOb('Займет меньше минуты.', 'Займе менше хвилини.', 'Tarda menos de un minuto.')}
              </Text>
            </View>
          </>
        ),
        styles.eliteWelcomeRoot,
      );
    }
    return renderScreen(
      'onboarding-welcome-screen',
      ONBOARDING_BG_WELCOME,
      (
        <>
          <Text style={{ color: DARK.gold, fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 32, textAlign: 'center' }}>
            Phraseman
          </Text>
          <Text style={{ color: DARK.textPrimary, fontSize: 30, fontWeight: '800', textAlign: 'center', lineHeight: 40, marginBottom: 16 }}>
            {triOb(
              '10 минут вместо скроллинга ленты.',
              '10 хвилин замість скролінгу стрічки.',
              'Diez minutos mejor invertidos que otro scroll.',
            )}
          </Text>
          <Text style={{ color: DARK.gold, fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 36, marginBottom: 48 }}>
            {triOb(
              '+350 фраз уже к концу недели.',
              '+350 фраз вже до кінця тижня.',
              '+350 frases antes de terminar la semana.',
            )}
          </Text>
          <TouchableOpacity
            testID="onboarding-welcome-continue"
            style={[styles.continueBtn, { width: '100%' }]}
            onPress={() => goToStep('name')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {triOb('Попробовать →', 'Спробувати →', 'Probar ahora →')}
            </Text>
          </TouchableOpacity>
        </>
      ),
      { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
    );
  }

  // ── Шаг 2: Демо квиз — 4 варианта ──────────────────────────────────────────
  if (step === 'demo') {
    const demoPhrase = '"I\'m fed up with this job"';
    const demoQuestion = pick(
      'Что значит "fed up with"?',
      'Що означає "fed up with"?',
      '¿Qué significa «fed up with»?',
    );
    const demoOptions =
      lang === 'es'
        ? [
            'Estoy harto de este trabajo',
            'Estoy encantado con esta oferta',
            'Estoy hasta la coronilla de este almuerzo',
            'Me da miedo perder este puesto',
          ]
        : isUK
          ? [
              'Мене вже нудить від цієї роботи',
              'Я в захваті від цієї вакансії',
              'Я ситий по горло цим обідом',
              'Я боюся втратити це місце',
            ]
          : [
              'Меня уже тошнит от этой работы',
              'Я в восторге от этой вакансии',
              'Я сыт по горло этим обедом',
              'Я боюсь потерять это место',
            ];
    const correctIndex = 0;
    return renderScreen(
      'onboarding-demo-screen',
      ONBOARDING_BG_QUIZ,
      (
        <>
          {renderProgressBar()}
        <ScrollView
          {...onboardingScrollProps}
          contentContainerStyle={[
            styles.center,
            {
              paddingTop: 0,
              flexGrow: 1,
              paddingHorizontal: onboardingHPad,
              paddingBottom: 24 + insets.bottom,
            },
          ]}
        >
          <Text style={[styles.appName, { marginBottom: 8 }]}>Phraseman</Text>
          <Text style={{ color: DARK.textMuted, fontSize: 14, marginBottom: 28, textAlign: 'center' }}>
            {pick(
              'Попробуй угадать фразу прямо сейчас',
              'Спробуй вгадати фразу прямо зараз',
              'Adivina qué significa la frase',
            )}
          </Text>
          <View style={{ backgroundColor: DARK.bgCard, borderRadius: 16, padding: 20, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: DARK.border }}>
            <Text style={{ color: DARK.textMuted, fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              {demoQuestion}
            </Text>
            <Text style={{ color: ONBOARDING_ACCENT, fontSize: 22, fontWeight: '700', lineHeight: 30 }}>
              {demoPhrase}
            </Text>
          </View>
          <View style={{ width: '100%', gap: 10 }}>
            {demoOptions.map((opt, i) => {
              let borderColor: string = DARK.border;
              let bg = DARK.bgSurface;
              let textColor = DARK.textPrimary;
              let iconStroke = DARK.textGhost;
              if (demoAnswered) {
                if (i === correctIndex) {
                  borderColor = ONBOARDING_ACCENT; bg = ONBOARDING_ACCENT_BG;
                  textColor = ONBOARDING_ACCENT; iconStroke = ONBOARDING_ACCENT;
                } else if (i === demoSelected) {
                  borderColor = '#FF453A'; bg = 'rgba(255,69,58,0.08)';
                  textColor = '#FF453A'; iconStroke = '#FF453A';
                } else {
                  borderColor = DARK.bgSurface2; bg = DARK.bgPrimary;
                  textColor = DARK.textGhost; iconStroke = DARK.textGhost;
                }
              }
              const iconShapes = ['○', '◇', '△', '□'];
              const DemoIcon = () => (
                <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: iconStroke, fontSize: 16, lineHeight: 22 }}>{iconShapes[i] || '○'}</Text>
                </View>
              );
              return (
                <TouchableOpacity
                  testID={`onboarding-demo-option-${i}`}
                  key={i}
                  style={{ width: '100%', backgroundColor: bg, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                  onPress={() => {
                    if (demoAnswered) return;
                    setDemoSelected(i);
                    setDemoAnswered(true);
                    setDemoCorrect(i === correctIndex);
                    animateBtn();
                  }}
                  activeOpacity={demoAnswered ? 1 : 0.8}
                >
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: demoAnswered && i === correctIndex ? ONBOARDING_ACCENT_BG : demoAnswered && i === demoSelected ? 'rgba(255,69,58,0.15)' : DARK.bgSurface2, alignItems: 'center', justifyContent: 'center' }}>
                    <DemoIcon />
                  </View>
                  <Text style={{ color: textColor, fontSize: 16, fontWeight: '500', flex: 1 }}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {demoAnswered && (
            <Animated.View style={{ width: '100%', marginTop: 24, opacity: btnFade, transform: [{ translateY: btnSlide }] }}>
              <TouchableOpacity
                testID="onboarding-demo-continue"
                style={[styles.continueBtn, { width: '100%' }]}
                onPress={() => goToStep('name')}
                activeOpacity={0.85}
              >
                <Text style={styles.continueBtnText}>
                  {demoCorrect
                    ? pick('🎉 Верно! Продолжить', '🎉 Вірно! Продовжити', '🎉 ¡Correcto! Continuar')
                    : pick('👀 Понял! Продолжить', '👀 Зрозуміло! Продовжити', '👀 ¡Entendido! Continuar')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
        </>
      ),
    );
  }

  // ── Шаг 1: Демо1 — приветствие + сбор фразы ────────────────────────────────
  if (step === 'demo2') {
    const demo2Words = ['turn', 'Please', 'TV', 'off', 'the'];
    const demo2Answer = ['Please', 'turn', 'off', 'the', 'TV'];

    const currentPhrase = demo2Selected.map(idx => demo2Words[idx]);
    const shakeWord = (pos: number) => {
      const anim = demo2ShakeAnims[pos];
      anim.setValue(0);
      Animated.sequence([
        Animated.timing(anim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(anim, { toValue:  6, duration: 60, useNativeDriver: true }),
        Animated.timing(anim, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(anim, { toValue:  4, duration: 50, useNativeDriver: true }),
        Animated.timing(anim, { toValue:  0, duration: 40, useNativeDriver: true }),
      ]).start();
    };

    const handleWordTap = (wordIdx: number) => {
      if (demo2Answered) return;
      if (demo2Selected.includes(wordIdx)) {
        setDemo2Selected(demo2Selected.filter(i => i !== wordIdx));
      } else {
        const next = [...demo2Selected, wordIdx];
        setDemo2Selected(next);
        const pos = next.length - 1;
        const isWrongHere = demo2Words[wordIdx] !== demo2Answer[pos];
        if (isWrongHere) {
          setTimeout(() => shakeWord(pos), 50);
        }
        if (next.length === demo2Words.length) {
          const correct = next.every((idx, p) => demo2Words[idx] === demo2Answer[p]);
          setDemo2Answered(true);
          setDemo2Correct(correct);
          animateBtn();
        }
      }
    };

    return renderScreen(
      'onboarding-demo2-screen',
      ONBOARDING_BG_BUILDER,
      (
        <>
          {renderProgressBar()}
        <ScrollView
          {...onboardingScrollProps}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: onboardingHPad,
            paddingTop: compactOnboarding ? 16 : 20,
            paddingBottom: (compactOnboarding ? 18 : 20) + insets.bottom,
          }}
        >
          {/* Приветствие */}
          <Animated.View style={{ opacity: demo2GreetFade, marginBottom: 28 }}>
            <Text style={{ color: DARK.gold, fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
              Phraseman
            </Text>
            <Text style={{ color: DARK.textPrimary, fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 34 }}>
              {pick(
                'Учи английские\nфразы играя',
                'Вивчай англійські\nфрази граючи',
                'Aprende frases en inglés\njugando',
              )}
            </Text>
            <Text style={{ color: DARK.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 10 }}>
              {pick(
                'Здесь ты собираешь фразы, учишь идиомы\nи понимаешь живой английский',
                'Тут ти збираєш фрази, вчиш ідіоми\nта розумієш живу англійську',
                'Aquí formas frases, estudias modismos\ny entiendes el inglés de verdad',
              )}
            </Text>
          </Animated.View>

          {/* Подсказка-инструкция (fade-in с задержкой) */}
          <Animated.View style={{ opacity: demo2HintFade, marginBottom: 20 }}>
            <View style={{ backgroundColor: DARK.bgSurface, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: DARK.borderHighlight }}>
              <Text style={{ color: ONBOARDING_ACCENT, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                {pick(
                  'Попробуй собрать фразу из этих слов:',
                  'Спробуй скласти фразу з цих слів:',
                  'Forma la frase con estas palabras:',
                )}
              </Text>
              <Text style={{ color: DARK.textGhost, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                {pick(
                  'Пожалуйста, выключи телевизор',
                  'Будь ласка, вимкни телевізор',
                  'Por favor, apaga la televisión',
                )}
              </Text>
            </View>
          </Animated.View>

          {/* Сама игра (fade-in последним) */}
          <Animated.View style={{ opacity: demo2QuizFade }}>
            {/* Область ответа */}
            <View style={{ minHeight: 56, backgroundColor: DARK.bgPrimary, borderRadius: 14, borderWidth: 1.5, borderColor: demo2Answered ? (demo2Correct ? ONBOARDING_ACCENT : '#FF4444') : 'rgba(255,91,91,0.28)', padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {currentPhrase.length === 0
                ? <Text style={{ color: DARK.textGhost, fontSize: 15 }}>{pick('здесь появится фраза…', 'тут з\'явиться фраза…', 'aquí aparecerá la frase…')}</Text>
                : currentPhrase.map((w, pos) => {
                    const wordIdx = demo2Selected[pos];
                    const isWrong = !demo2Answered && demo2Words[wordIdx] !== demo2Answer[pos];
                    return (
                      <Animated.View key={pos} style={{ transform: [{ translateX: demo2ShakeAnims[pos] }] }}>
                        <TouchableOpacity
                          onPress={() => {
                            if (demo2Answered) return;
                            setDemo2Selected(demo2Selected.filter((_, i) => i !== pos));
                          }}
                          style={{
                            backgroundColor: isWrong ? 'rgba(255,69,58,0.15)' : DARK.bgSurface2,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderWidth: isWrong ? 1 : 0,
                            borderColor: isWrong ? '#FF453A' : 'transparent',
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: isWrong ? '#FF453A' : DARK.textPrimary, fontSize: 16, fontWeight: '500' }}>{w}</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })
              }
            </View>

            {/* Доступные слова */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
              {demo2Words.map((w, idx) => {
                const used = demo2Selected.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleWordTap(idx)}
                    activeOpacity={used ? 1 : 0.75}
                    style={{
                      backgroundColor: used ? DARK.bgPrimary : DARK.bgSurface2,
                      borderRadius: 10,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderWidth: 1.5,
                      borderColor: used ? DARK.border : 'rgba(255,91,91,0.28)',
                    }}
                  >
                    <Text style={{ color: used ? DARK.textGhost : DARK.textPrimary, fontSize: 16, fontWeight: '500' }}>{w}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Результат + кнопка */}
            {demo2Answered && (
              <Animated.View style={{ marginTop: 4, opacity: btnFade, transform: [{ translateY: btnSlide }] }}>
                <Text style={{ color: demo2Correct ? ONBOARDING_ACCENT : '#FF8888', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 16 }}>
                  {demo2Correct
                    ? pick('🎉 Отлично! Всё правильно!', '🎉 Відмінно! Усе вірно!', '🎉 ¡Genial! ¡Todo correcto!')
                    : `${pick('✅ Правильно: ', '✅ Правильно: ', '✅ Correcto: ')}${demo2Answer.join(' ')}`}
                </Text>
                <TouchableOpacity
                  style={[styles.continueBtn, { width: '100%' }]}
                  onPress={() => goToStep('demo')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.continueBtnText}>
                    {pick('Продолжить', 'Продовжити', 'Continuar')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            {/* Кнопка пропустить — всегда видна если пользователь ещё не ответил */}
            {!demo2Answered && (
              <TouchableOpacity
                testID="onboarding-demo2-skip"
                style={{ marginTop: 20, alignSelf: 'center', padding: 12 }}
                onPress={() => goToStep('demo')}
                activeOpacity={0.7}
              >
                <Text style={{ color: DARK.textGhost, fontSize: 13 }}>
                  {pick('Пропустить →', 'Пропустити →', 'Omitir →')}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </ScrollView>
        </>
      ),
    );
  }

  // ── Шаг 3: Имя ──────────────────────────────────────────────────────────────
  if (step === 'name') {
    return renderScreen(
      undefined,
      ONBOARDING_BG_NAME,
      (
        <>
          {renderProgressBar()}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: onboardingHPad,
              paddingVertical: 24,
              paddingBottom: 24 + keyboardPad + insets.bottom,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <Text style={styles.appName}>Phraseman</Text>
            <Text style={styles.title}>
              {pick('Как тебя зовут?', 'Як тебе звати?', '¿Cómo te llamas?')}
            </Text>
            <Text style={{ color: DARK.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24, marginTop: -8 }}>
              {pick(
                'Чтобы в таблице лидеров не висело «Неизвестный герой» 😅',
                'Щоб у таблиці лідерів не висіло «Невідомий герой» 😅',
                'Para que en la tabla no figure «Héroe desconocido» 😅',
              )}
            </Text>
            {nameFieldError ? (
              <Text
                style={{
                  color: '#FF8A8A',
                  fontSize: 14,
                  fontWeight: '600',
                  textAlign: 'center',
                  lineHeight: 20,
                  marginBottom: 10,
                  width: '100%',
                }}
              >
                {nameFieldError}
              </Text>
            ) : null}
            <TextInput
              testID="onboarding-name-input"
              style={styles.input}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (nameFieldError) setNameFieldError(null);
              }}
              placeholder={pick('Ваше имя...', 'Ваше ім\'я...', 'Tu nombre...')}
              placeholderTextColor={DARK.textGhost}
              autoFocus
              maxLength={20}
              editable={!nameBusy}
              returnKeyType="done"
              onSubmitEditing={handleNameDone}
            />
            <TouchableOpacity
              testID="onboarding-name-continue"
              style={[styles.continueBtn, nameBusy && { opacity: 0.75 }]}
              onPress={handleNameDone}
              activeOpacity={0.85}
              disabled={nameBusy}
            >
              {false && nameBusy ? (
                <View />
              ) : (
                <Text style={styles.continueBtnText}>{pick('Продолжить', 'Продовжити', 'Continuar')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              testID="onboarding-name-skip"
              style={{ paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', marginTop: 8 }}
              onPress={handleSkipName}
              activeOpacity={0.8}
              disabled={nameBusy}
            >
              <Text style={{ color: DARK.textGhost, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                {pick(
                  'Пропустить (имя можно сменить позже)',
                  'Пропустити (ім\'я можна змінити пізніше)',
                  'Omitir (podrás cambiar el nombre después)',
                )}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
        </>
      ),
    );
  }

  // ── Шаг streak: Мотивация + прогресс ────────────────────────────────────────
  if (step === 'streak') {
    const streakMilestones: { label: string; icon: StreakMilestoneIconKind; reward: string }[] =
      lang === 'es'
        ? [
            { label: '3 días seguidos', icon: 'flame', reward: 'La costumbre empieza' },
            { label: '7 días seguidos', icon: 'bolt', reward: 'Ya tienes ritmo' },
            { label: '14 días seguidos', icon: 'gem', reward: 'Practicar se vuelve más fácil' },
            { label: '30 días seguidos', icon: 'crown', reward: 'Una racha fuerte' },
          ]
        : isUK
          ? [
              { label: '3 дні поспіль', icon: 'flame', reward: 'Звичка починається' },
              { label: '7 днів поспіль', icon: 'bolt', reward: 'У тебе вже є ритм' },
              { label: '14 днів поспіль', icon: 'gem', reward: 'Практикуватися легше' },
              { label: '30 днів поспіль', icon: 'crown', reward: 'Сильна серія' },
            ]
          : [
              { label: '3 дня подряд', icon: 'flame', reward: 'Хорошее начало' },
              { label: '7 дней подряд', icon: 'bolt', reward: 'Ты держишь темп' },
              { label: '14 дней подряд', icon: 'gem', reward: 'Становится проще' },
              { label: '30 дней подряд', icon: 'crown', reward: 'Сильная серия' },
            ];
    return renderScreen(
      'onboarding-streak-screen',
      ONBOARDING_BG_STREAK,
      (
        <>
          {renderProgressBar()}
        <ScrollView
          {...onboardingScrollProps}
          contentContainerStyle={[
            styles.center,
            {
              flexGrow: 1,
              justifyContent: compactOnboarding ? 'flex-start' : 'center',
              paddingHorizontal: onboardingHPad,
              paddingTop: compactOnboarding ? 8 : 0,
              paddingBottom: 24 + insets.bottom,
            },
          ]}
        >
          <View style={styles.streakHeroIconWrap}>
            <OnboardingStreakIcon kind="flame" size={streakHeroIconSize} hero />
          </View>
          <Text style={[styles.title, { marginBottom: 8 }]}>
            {pick(
              'Английский любит регулярность',
              'Щодня — і ти непереможний',
              'Cada día te hace invencible',
            )}
          </Text>
          <Text style={{ color: DARK.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
            {pick(
              'Лучше понемногу каждый день, чем редко и тяжело.',
              'Коротка практика щодня перетворюється на звичку.',
              'Una práctica corta cada día se convierte en hábito.',
            )}
          </Text>

          {/* Milestones */}
          <View style={{ width: '100%', gap: compactOnboarding ? 8 : 10, marginBottom: compactOnboarding ? 20 : 32 }}>
            {streakMilestones.map((m, i) => (
              <Animated.View
                key={m.label}
                style={{
                  opacity: milestoneAnims[i],
                  transform: [
                    { translateY: milestoneAnims[i].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                    { scale: milestoneAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                  ],
                }}
              >
              <View style={[styles.onboardingGlassCard, compactOnboarding && styles.onboardingGlassCardCompact]}>
                <View
                  style={[
                    styles.streakMilestoneIconSlot,
                    {
                      width: Math.max(56, streakMilestoneIconSize + 12),
                      marginRight: compactOnboarding ? 8 : 12,
                    },
                  ]}
                >
                  <OnboardingStreakIcon kind={m.icon} size={streakMilestoneIconSize} />
                </View>
                <View style={styles.streakMilestoneTextWrap}>
                  <Text
                    style={[styles.streakMilestoneTitle, compactOnboarding && styles.streakMilestoneTextCompact]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    maxFontSizeMultiplier={1}
                  >
                    {m.label}
                  </Text>
                  <Text
                    style={[styles.streakMilestoneReward, compactOnboarding && styles.streakMilestoneTextCompact]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    maxFontSizeMultiplier={1}
                  >
                    {m.reward}
                  </Text>
                </View>
              </View>
              </Animated.View>
            ))}
          </View>

          <TouchableOpacity
            testID="onboarding-streak-continue"
            style={[styles.continueBtn, { width: '100%' }]}
            onPress={() => goToStep('auth')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {pick('Далее', 'Далі', 'Siguiente')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </>
      ),
    );
  }

  // ── Шаг auth: Сохрани прогресс через Google / Apple (опционально) ────────────
  if (step === 'auth') {
    return renderScreen(
      'onboarding-auth-screen',
      ONBOARDING_BG_AUTH,
      (
        <AuthOnboardingStep
          isUK={isUK}
          lang={lang}
          renderProgressBar={renderProgressBar}
          onComplete={handleFinishOnboarding}
        />
      ),
    );
  }

  // Fallback — не должен достигаться
  return null;
}

/**
 * Отдельный компонент шага auth: имеет свои useState/useEffect для проверки
 * доступности Google/Apple — нельзя просто inline в основной Onboarding,
 * потому что hooks могут идти только в одном порядке.
 */
function AuthOnboardingStep({
  isUK,
  lang,
  renderProgressBar,
  onComplete,
}: {
  isUK: boolean;
  lang: Lang;
  renderProgressBar: () => React.ReactNode;
  onComplete: () => Promise<void> | void;
}) {
  const authPick = (ru: string, uk: string, es: string) =>
    lang === 'es' ? es : isUK ? uk : ru;
  const [googleAvail, setGoogleAvail] = useState(false);
  const [appleAvail, setAppleAvail] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<AuthProviderId | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const { width: viewportW, height: viewportH } = useScreen();
  const compactOnboarding = Math.min(viewportW, viewportH) < 370 || viewportH < 700;
  const onboardingHPad = compactOnboarding ? 18 : 28;

  useEffect(() => {
    isGoogleSignInAvailable().then(setGoogleAvail).catch(() => setGoogleAvail(false));
    isAppleSignInAvailable().then(setAppleAvail).catch(() => setAppleAvail(false));
  }, []);

  const handleSignIn = async (provider: AuthProviderId) => {
    setLoadingProvider(provider);
    try {
      const result = await signInWithProvider(provider);
      setLoadingProvider(null);
      if (result.result === 'cancelled') {
        AppInfoDialog.alert(
          authPick('Вход не завершён', 'Вхід не завершено', 'Acceso sin terminar'),
          authPick(
            'Окно входа закрылось. Можно пропустить шаг или нажать кнопку ещё раз.',
            'Вікно входу закрилось. Можна пропустити крок або натиснути ще раз.',
            'Se cerró la ventana de acceso. Puedes omitir el paso o intentar otra vez.',
          ),
        );
        return;
      }
      if (result.result === 'error') {
        if (result.error?.includes(APPLE_ANDROID_MISSING_SERVICE_ID)) {
          AppInfoDialog.alert(
            authPick('Apple на Android', 'Apple на Android', 'Apple en Android'),
            authPick(
              'Задай в сборке EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID (Services ID) и return URL в Apple Developer (часто phraseman://apple-auth).',
              'Задай у збірці EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID (Services ID) і return URL у Apple Developer (часто phraseman://apple-auth).',
              'Configura EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID (Services ID) y el return URL en Apple Developer (a menudo phraseman://apple-auth).',
            ),
          );
          return;
        }
        // Человеческое сообщение для известных кодов ошибок.
        const err = result.error ?? '';
        const isNetwork =
          err.includes('deadline-exceeded') ||
          err.includes('ssl') ||
          err.includes('I/O error') ||
          err.includes('network') ||
          err.includes('NETWORK_ERROR');
        const body = isNetwork
          ? authPick(
              'Проблема с сетью. Проверь интернет и попробуй ещё раз.',
              'Проблема з мережею. Перевір інтернет і спробуй ще раз.',
              'Problema de red. Comprueba Internet e inténtalo otra vez.',
            )
          : authPick('Попробуй ещё раз или пропусти шаг.', 'Спробуй ще раз або пропусти крок.', 'Inténtalo otra vez u omite el paso.');
        AppInfoDialog.alert(
          authPick('Не удалось войти', 'Не вдалося увійти', 'No se pudo iniciar sesión'),
          body,
        );
        return;
      }
      // Помечаем что промпт показывали — чтобы lesson_complete не показал повторно.
      await AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(() => {});
      await onComplete();
    } catch {
      setLoadingProvider(null);
    }
  };

  const handleLater = async () => {
    if (authBusy || loadingProvider) return;
    setAuthBusy(true);
    try {
      await onComplete();
    } finally {
      setAuthBusy(false);
    }
  };

  const interactionLocked = loadingProvider !== null || authBusy;

  return (
    <>
      {renderProgressBar()}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          contentContainerStyle={[
            styles.center,
            {
              flexGrow: 1,
              paddingHorizontal: onboardingHPad,
              paddingBottom: 24 + insets.bottom,
            },
          ]}
        >
          <Image
            source={ONBOARDING_AUTH_ICON}
            style={styles.authQuickStartIcon}
            resizeMode="contain"
            accessible={false}
          />
          <Text style={[styles.title, { marginBottom: 8 }]}>
            {authPick('Быстрый старт', 'Швидкий старт', 'Inicio rápido')}
          </Text>
          <Text style={{ color: ONBOARDING_TEXT_MUTED, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28, fontWeight: '700' }}>
            {authPick(
              'Вход можно пропустить. Но если сменить телефон или случайно удалить приложение, есть риск потерять прогресс.',
              'Можна продовжити без входу, але якщо видалити застосунок без привʼязки акаунта, прогрес може загубитися. Привʼязати акаунт можна пізніше в налаштуваннях.',
              'Puedes seguir sin iniciar sesión, pero si eliminas la app sin vincular tu cuenta, podrías perder el progreso. Puedes vincularla más tarde en Ajustes.',
            )}
          </Text>

          <View style={{ width: '100%', marginBottom: 12 }}>
            {googleAvail && (
              <GoogleSignInButton
                onPress={() => handleSignIn('google')}
                loading={loadingProvider === 'google'}
                disabled={interactionLocked}
                label={authPick('Войти через Google', 'Війти з Google', 'Continuar con Google')}
                variant="light"
              />
            )}
            {appleAvail && (
              <View style={{ marginTop: googleAvail ? 12 : 0 }}>
                <AppleSignInButton
                  onPress={() => handleSignIn('apple')}
                  loading={loadingProvider === 'apple'}
                  disabled={interactionLocked}
                  label={authPick('Войти через Apple', 'Війти з Apple', 'Continuar con Apple')}
                />
              </View>
            )}
          </View>

          {!googleAvail && !appleAvail && (
            <Text style={{ color: DARK.textMuted, fontSize: 12, textAlign: 'center', marginVertical: 12 }}>
              {authPick(
                'Ни один провайдер не доступен на этом устройстве. Можно войти позже из настроек.',
                'Жоден провайдер не доступний на цьому пристрої. Можеш увійти пізніше з налаштувань.',
                'Ningún método disponible en este dispositivo. Podrás iniciar sesión más tarde desde Ajustes.',
              )}
            </Text>
          )}

          <TouchableOpacity
            testID="onboarding-auth-later"
            onPress={handleLater}
            disabled={interactionLocked}
            style={{ paddingVertical: 14, marginTop: 8 }}
            activeOpacity={0.7}
          >
            {false && authBusy ? (
              <View />
            ) : (
              <Text style={{ color: DARK.textMuted, fontSize: 15, fontWeight: '500', textAlign: 'center' }}>
                {authPick('Позже', 'Пізніше', 'Más tarde')}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={{ color: DARK.textGhost ?? '#666', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 12, paddingHorizontal: 12 }}>
            {authPick(
              'Мы не публикуем ваш email и не отправляем спам.',
              'Ми не публікуємо ваш email і не надсилаємо спам.',
              'No publicamos tu correo ni enviamos spam.',
            )}
          </Text>
        </ScrollView>
    </>
  );
}

function OnboardingScreenShell({
  testID,
  source,
  screenFade,
  contentStyle,
  children,
}: {
  testID?: string;
  source: ImageSourcePropType;
  screenFade: Animated.Value;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView edges={[]} style={styles.container} testID={testID}>
      <OnboardingArtBackground source={source} motion="zoomOut" />
      <Animated.View style={[styles.onboardingContentLayer, contentStyle, { opacity: screenFade }]}>
        {children}
      </Animated.View>
    </SafeAreaView>
  );
}

function OnboardingStreakIcon({
  kind,
  size = 52,
  hero = false,
}: {
  kind: StreakMilestoneIconKind;
  size?: number;
  hero?: boolean;
}) {
  return (
    <View
      style={[
        styles.streakIconShadow,
        hero && styles.streakHeroIconShadow,
        { width: size, height: size },
      ]}
    >
      <Image
        source={ONBOARDING_STREAK_ICONS[kind]}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#020304', overflow: 'hidden' },
  onboardingContentLayer: { flex: 1 },
  center:          { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  appName:         { color: ONBOARDING_ACCENT, fontSize: 15, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  title:           { color: '#FFF8E8', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 40, lineHeight: 34 },
  authQuickStartIcon: {
    width: 132,
    height: 132,
    marginBottom: 12,
  },
  progressWrap: {
    paddingTop: 0,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 4,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    backgroundColor: ONBOARDING_ACCENT,
    borderRadius: 999,
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  onboardingBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#020304',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  onboardingBgImageStack: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.68,
  },
  onboardingBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  onboardingBgDim: {
    ...StyleSheet.absoluteFillObject,
  },
  onboardingParticleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  onboardingParticle: {
    position: 'absolute',
    backgroundColor: 'rgba(242,184,75,0.92)',
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.72,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  onboardingGlassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 92,
    position: 'relative',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.18)',
    backgroundColor: 'rgba(20,18,15,0.50)',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  onboardingGlassCardCompact: {
    minHeight: 78,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  streakMilestoneIconSlot: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakMilestoneTextWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  streakMilestoneTitle: {
    color: ONBOARDING_ACCENT,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  streakMilestoneTextCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  streakMilestoneReward: {
    color: ONBOARDING_TEXT_MUTED,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  streakHeroIconWrap: {
    marginBottom: 12,
  },
  streakIconShadow: {
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  streakHeroIconShadow: {
    shadowOpacity: 0.42,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  eliteWelcomeRoot: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  eliteWelcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
    paddingVertical: 8,
  },
  eliteWelcomeLogo: {
    width: 34,
    height: 34,
  },
  eliteWelcomeBrand: {
    color: DARK.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  eliteWelcomeMain: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    paddingBottom: 18,
  },
  eliteWelcomeMark: {
    width: 188,
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.34,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  eliteWelcomeMarkGlass: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.28)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  eliteWelcomeGlassShine: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.13)',
    opacity: 0.62,
  },
  eliteWelcomeMarkLogo: {
    width: 138,
    height: 106,
  },
  eliteHeroPreview: {
    width: '100%',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    shadowColor: '#D6B85C',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  eliteHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eliteHeroKicker: {
    color: DARK.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eliteHeroXp: {
    color: DARK.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  eliteHeroPhrase: {
    color: DARK.textPrimary,
    fontSize: 23,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  eliteHeroTranslation: {
    color: DARK.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
  eliteHeroMetrics: {
    flexDirection: 'row',
    gap: 8,
  },
  eliteMetricPill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eliteMetricValue: {
    color: DARK.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  eliteMetricLabel: {
    color: DARK.textGhost,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  eliteWelcomeCopy: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  eliteWelcomeTitle: {
    color: '#FFF7E5',
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  eliteWelcomeSub: {
    color: ONBOARDING_TEXT_MUTED,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 310,
  },
  eliteWelcomeBottom: {
    width: '100%',
    gap: 12,
  },
  eliteWelcomeCta: {
    width: '100%',
    minHeight: 56,
    backgroundColor: ONBOARDING_ACCENT,
    paddingVertical: 17,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.38)',
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.36,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  eliteWelcomeCtaText: {
    color: '#1D1202',
    fontSize: 18,
    fontWeight: '900',
  },
  eliteWelcomeFootnote: {
    color: DARK.textGhost,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
  },
  langBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: DARK.bgCard, borderRadius: 14, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: DARK.border,
  },
  langFlag:        { fontSize: 32, marginRight: 16 },
  langLabel:       { color: DARK.textPrimary, fontSize: 20, fontWeight: '500' },
  input: {
    width: '100%',
    backgroundColor: 'rgba(18,16,13,0.62)',
    color: '#FFF8E8',
    fontSize: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.22)',
    marginBottom: 24,
  },
  continueBtn: {
    width: '100%',
    backgroundColor: ONBOARDING_ACCENT,
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.36)',
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  continueBtnText: { color: '#1D1202', fontSize: 18, fontWeight: '900' },
  langHint:        { color: DARK.textGhost, fontSize: 14, fontWeight: '500', letterSpacing: 0.5, marginBottom: 32 },
  // Premium step
  premiumScroll:   { padding: 24, paddingBottom: 40, alignItems: 'center' },
  trialBadge:      { backgroundColor: DARK.accent, color: DARK.correctText, fontWeight: '900', fontSize: 13, letterSpacing: 1.5, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 20, overflow: 'hidden' },
  premiumTitle:    { color: DARK.textPrimary, fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  premiumSub:      { color: DARK.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  featuresBox:     { width: '100%', backgroundColor: DARK.bgCard, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: DARK.border, gap: 14, marginBottom: 20 },
  featureRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon:     { fontSize: 22, width: 30, textAlign: 'center' },
  featureText:     { color: DARK.textOnCard, fontSize: 16, fontWeight: '500' },
  planCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DARK.accent, borderRadius: 16, padding: 18, marginBottom: 12,
  },
  planCardSecondary: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DARK.bgCard, borderRadius: 16, padding: 18, marginBottom: 20,
    borderWidth: 1.5, borderColor: DARK.accent,
  },
  planCardLeft:    { flex: 1, marginRight: 12 },
  planBadge:       { color: DARK.correctText, fontSize: 11, fontWeight: '800', marginBottom: 4 },
  planCardTitle:   { color: DARK.correctText, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  planCardSub:     { color: DARK.correctText, fontSize: 12, fontWeight: '500' },
  planCardCta:     { color: DARK.correctText, fontSize: 13, fontWeight: '900', textAlign: 'center', lineHeight: 18 },
  planCardCtaSecondary: { color: DARK.accent, fontSize: 13, fontWeight: '900', textAlign: 'center', lineHeight: 18 },
  // secondary card text overrides
  freeBtn:         { width: '100%', padding: 14, alignItems: 'center', marginBottom: 16 },
  freeBtnText:     { color: DARK.textGhost, fontSize: 14, fontWeight: '500' },
  legal:           { color: DARK.textGhost, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  // Новые стили для расширенного онбординга
  optionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: DARK.border,
    gap: 14,
  },
  optionButtonSelected: {
    backgroundColor: DARK.correctBg,
    borderColor: DARK.accent,
  },
  optionEmoji: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  optionLabel: {
    color: DARK.textMuted,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  optionLabelSelected: {
    color: DARK.accent,
    fontWeight: '700',
  },
  planBox: {
    backgroundColor: DARK.bgCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  forecastLabel: {
    color: DARK.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  forecastValue: {
    color: DARK.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  notificationToggle: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: DARK.border,
  },
});

function OnboardingArtBackground({
  source,
  motion = 'zoomOut',
}: {
  source: ImageSourcePropType;
  motion?: 'zoomIn' | 'zoomOut';
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const { activeValue: activeSource } = useBackgroundBlurSwitch({
    value: source,
    transitionKey: backgroundTransitionKey(source),
  });
  const particleAnims = useRef(ONBOARDING_BACKGROUND_PARTICLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 15000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [motion, progress]);

  useEffect(() => {
    let active = true;
    particleAnims.forEach((value, index) => {
      const spec = ONBOARDING_BACKGROUND_PARTICLES[index];
      const run = () => {
        if (!active) return;
        value.setValue(0);
        Animated.sequence([
          Animated.delay(spec.delay),
          Animated.timing(value, {
            toValue: 1,
            duration: spec.duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (active && finished) run();
        });
      };
      run();
    });

    return () => {
      active = false;
      particleAnims.forEach(value => value.stopAnimation());
    };
  }, [particleAnims]);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: motion === 'zoomIn' ? [1.0, 1.085] : [1.085, 1.0],
  });
  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View pointerEvents="none" style={styles.onboardingBg}>
        <View pointerEvents="none" style={styles.onboardingBgImageStack}>
          <Animated.Image
            source={activeSource}
            style={[styles.onboardingBgImage, { transform: [{ scale }] }]}
            resizeMode="cover"
            resizeMethod="resize"
          />
        </View>
        <LinearGradient
          colors={[
            'rgba(1,2,3,0.58)',
            'rgba(2,3,5,0.68)',
            'rgba(3,4,6,0.76)',
            'rgba(2,2,3,0.90)',
            'rgba(0,0,0,0.99)',
          ]}
          locations={[0, 0.32, 0.56, 0.78, 1]}
          style={styles.onboardingBgDim}
        />
        <View pointerEvents="none" style={styles.onboardingParticleLayer}>
          {ONBOARDING_BACKGROUND_PARTICLES.map((spec, index) => {
            const anim = particleAnims[index];
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -spec.rise],
            });
            const translateX = anim.interpolate({
              inputRange: [0, 0.55, 1],
              outputRange: [0, spec.drift * 0.52, spec.drift],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.12, 0.68, 1],
              outputRange: [0, spec.opacity, spec.opacity * 0.62, 0],
            });
            const particleScale = anim.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0.55, 1, 0.62],
            });

            return (
              <Animated.View
                key={`${spec.left}-${spec.top}-${index}`}
                style={[
                  styles.onboardingParticle,
                  {
                    left: spec.left,
                    top: spec.top,
                    width: spec.size,
                    height: spec.size,
                    borderRadius: spec.size / 2,
                    opacity,
                    transform: [
                      { translateX },
                      { translateY },
                      { scale: particleScale },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </>
  );
}
