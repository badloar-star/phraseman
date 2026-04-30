import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, ScrollView,
  Animated, BackHandler, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateReferralCode } from '../app/referral_system';
import { IS_BETA_TESTER, ENABLE_SPANISH_LOCALE } from '../app/config';
// Онбординг закреплён за темой "Графит" (MINIMAL_DARK) — это одна из двух
// бесплатных тем (вторая — "Скетч"/MINIMAL_LIGHT). Импортируем под алиасом
// `DARK`, чтобы не править все ~150 ссылок DARK.* по тексту экрана.
import { MINIMAL_DARK as DARK } from '../constants/theme';
import { Lang } from '../constants/i18n';
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
import { emitAppEvent } from '../app/events';
import {
  signInWithProvider,
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  AUTH_PROMPT_SHOWN_KEY,
  type AuthProviderId,
} from '../app/auth_provider';
import { GoogleSignInButton, AppleSignInButton } from './AuthProviderButtons';

interface Props {
  onDone: () => void;
  onLangSelect?: (lang: Lang) => void;
}


const TARGET_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'] as const;
const PROGRESS_STEPS = ['welcome', 'name', 'streak', 'auth'] as const;
type OnboardingStepKey = 'beta' | 'welcome' | 'demo2' | 'demo' | 'name' | 'streak' | 'auth';
const PREV_STEP: Partial<Record<OnboardingStepKey, OnboardingStepKey>> = {
  demo2: 'welcome',
  demo: 'demo2',
  name: 'welcome',
  streak: 'name',
  auth: 'streak',
};


export default function Onboarding({ onDone, onLangSelect }: Props) {
  // uk → UA; при ENABLE_SPANISH_LOCALE локали es-* → испанский; иначе RU как дефолт для остальных
  const detectLang = (): Lang => {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
      if (locale.startsWith('uk')) return 'uk';
      if (ENABLE_SPANISH_LOCALE && locale.toLowerCase().startsWith('es')) return 'es';
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
  // Staggered milestone card anims
  const milestoneAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const btnSlide   = useRef(new Animated.Value(30)).current;
  const btnFade    = useRef(new Animated.Value(0)).current;
  const [lang]       = useState<Lang>(detectLang);
  const [name, setName]       = useState('');
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
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
          {prev ? (
            <TouchableOpacity onPress={() => goToStep(prev)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
              <Text style={{ color: DARK.accent, fontSize: 20 }}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
          <View style={{ flex: 1, height: 4, backgroundColor: DARK.bgSurface, borderRadius: 2 }}>
            <View style={{ height: 4, backgroundColor: DARK.accent, width: `${pct}%`, borderRadius: 2 }} />
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
        setStepRaw(saved as OnboardingStep);
        stepRef.current = saved as OnboardingStep;
      }
    }).catch(() => {});
  }, []);

  // Fade-in экрана при каждой смене шага
  useEffect(() => {
    Animated.timing(screenFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [step, screenFade]);

  useEffect(() => {
    if (step !== 'streak') return;
    milestoneAnims.forEach(a => a.setValue(0));
    Animated.stagger(150, milestoneAnims.map(a =>
      Animated.timing(a, { toValue: 1, duration: 280, useNativeDriver: true })
    )).start();
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
    const trimmed = name.trim();
    if (!trimmed) {
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'Введите имя чтобы продолжить',
        messageUk: 'Введіть ім\'я щоб продовжити',
        messageEs: 'Escribe tu nombre para continuar',
      });
      return;
    }
    if (trimmed.length < 2) {
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'Минимум 2 символа',
        messageUk: 'Мінімум 2 символи',
        messageEs: 'Mínimo 2 caracteres',
      });
      return;
    }
    if (trimmed.length > 20) {
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'Максимум 20 символов',
        messageUk: 'Максимум 20 символів',
        messageEs: 'Máximo 20 caracteres',
      });
      return;
    }

    const result = await reserveName(trimmed, '');
    if (result === 'taken') {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Имя занято. Такой никнейм уже есть в рейтинге.',
        messageUk: "Ім'я зайняте. Такий нікнейм вже є в рейтингу.",
        messageEs: 'Ese nombre ya está en uso. Prueba con otro.',
      });
      return;
    }

    await AsyncStorage.multiSet([
      ['app_lang', lang],
      ['user_name', trimmed],
    ]);
    void import('../app/firestore_leagues')
      .then((m) => m.registerInLeagueGroupSilently())
      .catch(() => {});
    Keyboard.dismiss();
    goToStep('streak');
  };

  const handleSkipName = async () => {
    let autoName = generateAutoName();
    // retry до 5 раз чтобы найти свободный ник
    for (let i = 0; i < 5; i++) {
      const result = await reserveName(autoName, '');
      if (result !== 'taken') break;
      autoName = generateAutoName();
    }
    await AsyncStorage.multiSet([
      ['app_lang', lang],
      ['user_name', autoName],
    ]);
    void import('../app/firestore_leagues')
      .then((m) => m.registerInLeagueGroupSilently())
      .catch(() => {});
    Keyboard.dismiss();
    goToStep('streak');
  };


  const saveUserProfile = async () => {
    if (!goal || !minutesPerDay || !currentLevel) return;

    // Определяем целевой уровень (на один выше текущего, но не выше C1)
    const targetIdx = Math.min(TARGET_LEVELS.indexOf(currentLevel) + 1, TARGET_LEVELS.length - 1);
    const target = TARGET_LEVELS[targetIdx] as TargetLevel;

    const daysEstimate = estimateDaysToTarget(currentLevel, target, minutesPerDay);
    const targetDate = addDays(new Date(), daysEstimate);

    const profile: UserProfile = {
      name,
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

    // Generate referral code for the user
    try {
      await generateReferralCode(name);
    } catch {
    }
  };

  const handleFinishOnboarding = async () => {
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
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 28, paddingVertical: 40 }} showsVerticalScrollIndicator={false}>
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
                'Ти один з перших користувачів Phraseman. Твій зворотний звʼязок напряму впливає на продукт.',
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
            style={[styles.continueBtn, { width: '100%' }]}
            onPress={() => goToStep('demo2')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>{pick('Понятно 👍', 'Зрозуміло 👍', 'Entendido 👍')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Шаг 0: Welcome — главный оффер ─────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={{ flex: 1, opacity: screenFade, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
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
            style={[styles.continueBtn, { width: '100%' }]}
            onPress={() => goToStep('name')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {triOb('Попробовать →', 'Спробувати →', 'Probar ahora →')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
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
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={{ flex: 1, opacity: screenFade }}>
        {renderProgressBar()}
        <ScrollView contentContainerStyle={[styles.center, { paddingTop: 0, flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
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
            <Text style={{ color: DARK.accent, fontSize: 22, fontWeight: '700', lineHeight: 30 }}>
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
                  borderColor = DARK.accent; bg = DARK.correctBg;
                  textColor = DARK.accent; iconStroke = DARK.accent;
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
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: demoAnswered && i === correctIndex ? DARK.correctBg : demoAnswered && i === demoSelected ? 'rgba(255,69,58,0.15)' : DARK.bgSurface2, alignItems: 'center', justifyContent: 'center' }}>
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
        </Animated.View>
      </SafeAreaView>
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

    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={{ flex: 1, opacity: screenFade }}>
        {renderProgressBar()}
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 20 }} showsVerticalScrollIndicator={false}>
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
              <Text style={{ color: DARK.accent, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
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
            <View style={{ minHeight: 56, backgroundColor: DARK.bgPrimary, borderRadius: 14, borderWidth: 1.5, borderColor: demo2Answered ? (demo2Correct ? DARK.accent : '#FF4444') : 'rgba(71,200,112,0.28)', padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
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
                      borderColor: used ? DARK.border : 'rgba(71,200,112,0.3)',
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
                <Text style={{ color: demo2Correct ? DARK.accent : '#FF8888', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 16 }}>
                  {demo2Correct
                    ? pick('🎉 Отлично! Всё правильно!', '🎉 Відмінно! Всі правильно!', '🎉 ¡Genial! ¡Todo correcto!')
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
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Шаг 3: Имя ──────────────────────────────────────────────────────────────
  if (step === 'name') {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={{ flex: 1, opacity: screenFade }}>
        {renderProgressBar()}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={pick('Ваше имя...', 'Ваше ім\'я...', 'Tu nombre...')}
              placeholderTextColor={DARK.textGhost}
              autoFocus
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={handleNameDone}
            />
            <TouchableOpacity style={styles.continueBtn} onPress={handleNameDone} activeOpacity={0.85}>
              <Text style={styles.continueBtnText}>{pick('Продолжить', 'Продовжити', 'Continuar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ width: '100%', borderWidth: 1.5, borderColor: DARK.borderHighlight, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 }}
              onPress={handleSkipName}
              activeOpacity={0.8}
            >
              <Text style={{ color: DARK.textGhost, fontSize: 15, fontWeight: '500' }}>
                {pick(
                  'Пропустить (имя можно сменить позже)',
                  'Пропустити (ім\'я можна змінити пізніше)',
                  'Omitir (podrás cambiar el nombre después)',
                )}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Шаг streak: Мотивация + прогресс ────────────────────────────────────────
  if (step === 'streak') {
    const streakMilestones =
      lang === 'es'
        ? [
            { days: 3,  emoji: '🔥', reward: 'Aprendes un 20 % más rápido' },
            { days: 7,  emoji: '⚡', reward: 'Memorizas el doble de frases' },
            { days: 30, emoji: '👑', reward: 'Desbloqueas niveles y recompensas' },
          ]
        : isUK
          ? [
              { days: 3,  emoji: '🔥', reward: 'Вчишся на 20% швидше' },
              { days: 7,  emoji: '⚡', reward: 'Запам\'ятовуєш вдвічі більше фраз' },
              { days: 30, emoji: '👑', reward: 'Розблокуєш рівні та нагороди' },
            ]
          : [
              { days: 3,  emoji: '🔥', reward: 'Учишься на 20% быстрее' },
              { days: 7,  emoji: '⚡', reward: 'Запоминаешь вдвое больше фраз' },
              { days: 30, emoji: '👑', reward: 'Открываешь уровни и награды' },
            ];
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={{ flex: 1, opacity: screenFade }}>
        {renderProgressBar()}
        <ScrollView contentContainerStyle={[styles.center, { flexGrow: 1, paddingHorizontal: 28 }]} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🔥</Text>
          <Text style={[styles.title, { marginBottom: 8 }]}>
            {pick(
              'Каждый день — и ты непобедим',
              'Щодня — і ти непереможний',
              'Cada día te hace invencible',
            )}
          </Text>
          <Text style={{ color: DARK.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
            {pick(
              'Даже 5 минут в день. Серия дней — твой главный инструмент.',
              'Навіть 5 хвилин на день. Серія днів — твій головний інструмент.',
              'Aunque sean solo 5 minutos al día. La racha es tu mejor aliada.',
            )}
          </Text>

          {/* Milestones */}
          <View style={{ width: '100%', gap: 10, marginBottom: 32 }}>
            {streakMilestones.map((m, i) => (
              <Animated.View key={m.days} style={{ opacity: milestoneAnims[i], transform: [{ translateY: milestoneAnims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DARK.bgSurface, borderRadius: 14, padding: 14, gap: 14, borderWidth: 1, borderColor: DARK.border }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: DARK.bgSurface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: DARK.accent, fontSize: 13, fontWeight: '700', marginBottom: 2 }}>
                    {pick(`${m.days} дней`, `${m.days} днів`, `${m.days} días`)}
                  </Text>
                  <Text style={{ color: DARK.textMuted, fontSize: 13 }}>{m.reward}</Text>
                </View>
              </View>
              </Animated.View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, { width: '100%' }]}
            onPress={() => goToStep('auth')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {pick('Далее', 'Далі', 'Siguiente')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Шаг auth: Сохрани прогресс через Google / Apple (опционально) ────────────
  if (step === 'auth') {
    return <AuthOnboardingStep
      isUK={isUK}
      lang={lang}
      renderProgressBar={renderProgressBar}
      screenFade={screenFade}
      onComplete={handleFinishOnboarding}
    />;
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
  screenFade,
  onComplete,
}: {
  isUK: boolean;
  lang: Lang;
  renderProgressBar: () => React.ReactNode;
  screenFade: Animated.Value;
  onComplete: () => Promise<void> | void;
}) {
  const authPick = (ru: string, uk: string, es: string) =>
    lang === 'es' ? es : isUK ? uk : ru;
  const [googleAvail, setGoogleAvail] = useState(false);
  const [appleAvail, setAppleAvail] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<AuthProviderId | null>(null);

  useEffect(() => {
    isGoogleSignInAvailable().then(setGoogleAvail).catch(() => setGoogleAvail(false));
    isAppleSignInAvailable().then(setAppleAvail).catch(() => setAppleAvail(false));
  }, []);

  const handleSignIn = async (provider: AuthProviderId) => {
    setLoadingProvider(provider);
    try {
      const result = await signInWithProvider(provider);
      setLoadingProvider(null);
      if (result.result === 'cancelled') return;
      if (result.result === 'error') {
        // Тихо игнорируем — не блокируем онбординг при сбое сети.
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
    // Не помечаем AUTH_PROMPT_SHOWN_KEY — пусть модалка появится после урока 1.
    await onComplete();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: screenFade }}>
        {renderProgressBar()}
        <ScrollView contentContainerStyle={[styles.center, { flexGrow: 1, paddingHorizontal: 28 }]} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🚀</Text>
          <Text style={[styles.title, { marginBottom: 8 }]}>
            {authPick('Быстрый старт', 'Швидкий старт', 'Inicio rápido')}
          </Text>
          <Text style={{ color: DARK.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
            {authPick(
              'Один тап — и твой прогресс сохраняется навсегда. Сменишь телефон? Прогресс с тобой.',
              'Один тап — і твій прогрес зберігається назавжди. Заміниш телефон? Прогрес з тобою.',
              'Un toque y tu progreso queda guardado para siempre. ¿Cambias de móvil? Va contigo.',
            )}
          </Text>

          <View style={{ width: '100%', marginBottom: 12 }}>
            {googleAvail && (
              <GoogleSignInButton
                onPress={() => handleSignIn('google')}
                loading={loadingProvider === 'google'}
                disabled={loadingProvider !== null}
                label={authPick('Войти через Google', 'Війти з Google', 'Continuar con Google')}
                variant="light"
              />
            )}
            {appleAvail && (
              <View style={{ marginTop: googleAvail ? 12 : 0 }}>
                <AppleSignInButton
                  onPress={() => handleSignIn('apple')}
                  loading={loadingProvider === 'apple'}
                  disabled={loadingProvider !== null}
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
            onPress={handleLater}
            disabled={loadingProvider !== null}
            style={{ paddingVertical: 14, marginTop: 8 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: DARK.textMuted, fontSize: 15, fontWeight: '500', textAlign: 'center' }}>
              {authPick('Позже', 'Пізніше', 'Más tarde')}
            </Text>
          </TouchableOpacity>

          <Text style={{ color: DARK.textGhost ?? '#666', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 12, paddingHorizontal: 12 }}>
            {authPick(
              'Мы не публикуем ваш email и не отправляем спам.',
              'Ми не публікуємо ваш email і не надсилаємо спам.',
              'No publicamos tu correo ni enviamos spam.',
            )}
          </Text>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: DARK.bgPrimary },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  appName:         { color: DARK.gold, fontSize: 15, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  title:           { color: DARK.textPrimary, fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 40, lineHeight: 34 },
  langBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: DARK.bgCard, borderRadius: 14, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: DARK.border,
  },
  langFlag:        { fontSize: 32, marginRight: 16 },
  langLabel:       { color: DARK.textPrimary, fontSize: 20, fontWeight: '500' },
  input: {
    width: '100%', backgroundColor: DARK.bgCard, color: DARK.textPrimary,
    fontSize: 20, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: DARK.border, marginBottom: 24,
  },
  continueBtn:     { width: '100%', backgroundColor: DARK.accent, padding: 18, borderRadius: 12, alignItems: 'center' },
  continueBtnText: { color: DARK.correctText, fontSize: 18, fontWeight: '700' },
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
