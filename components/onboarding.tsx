import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView,
  Switch, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateReferralCode } from '../app/referral_system';
import { IS_EXPO_GO, IS_BETA_TESTER } from '../app/config';
import { T, Lang } from '../constants/i18n';
import {
  UserProfile,
  LearningGoal,
  MinutesPerDay,
  CurrentLevel,
  TargetLevel,
  estimateDaysToTarget,
  addDays,
} from '../app/types/user_profile';

interface Props {
  onDone: () => void;
  onLangSelect?: (lang: Lang) => void;
}


const GOAL_DESCRIPTIONS: Record<LearningGoal, { ru: string; uk: string }> = {
  tourism: { ru: 'Путешествовать без границ', uk: 'Подорожувати без кордонів' },
  work: { ru: 'Карьера и новые перспективы', uk: 'Кар\'єра та нові перспективи' },
  emigration: { ru: 'Переехать в другую страну', uk: 'Переїхати в іншу країну' },
  hobby: { ru: 'Учить для души и интереса', uk: 'Вчити для душі та інтересу' },
};

const GOAL_EMOJIS: Record<LearningGoal, string> = {
  tourism: '🌍',
  work: '💼',
  emigration: '✈️',
  hobby: '🎨',
};

const MINUTES_OPTIONS: MinutesPerDay[] = [5, 15, 30, 60];
const MINUTES_EMOJIS: Record<MinutesPerDay, string> = {
  5: '⚡️',
  15: '💪',
  30: '🔥',
  60: '💯',
};

const MINUTES_DESCRIPTIONS: Record<MinutesPerDay, { ru: string; uk: string }> = {
  5: { ru: 'Быстрый старт — легко!', uk: 'Швидкий старт — легко!' },
  15: { ru: 'Уверенный прогресс!', uk: 'Впевнений прогрес!' },
  30: { ru: 'Серьезный подход — мощно!', uk: 'Серйозний підхід — потужно!' },
  60: { ru: 'Погружение на максимум — чемпион!', uk: 'Занурення на максимум — чемпіон!' },
};

const LEVEL_EMOJIS: Record<CurrentLevel, string> = {
  a1: '🐣',
  a2: '🌱',
  b1: '🚀',
  b2: '🎧',
};

const LEVEL_DESCRIPTIONS: Record<CurrentLevel, { ru: string; uk: string }> = {
  a1: { ru: 'Пока только мечтаю', uk: 'Поки що тільки мрію' },
  a2: { ru: 'Знаю буквы и пару слов', uk: 'Знаю букви та кілька слів' },
  b1: { ru: 'Могу поддержать беседу', uk: 'Можу підтримати розмову' },
  b2: { ru: 'Понимаю фильмы и музыку', uk: 'Розумію фільми та музику' },
};

const TARGET_LEVELS: TargetLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1'];

const TIME_OPTIONS = ['08:00', '12:00', '18:00', '20:00', '22:00'];

export default function Onboarding({ onDone, onLangSelect }: Props) {
  // Автоопределение языка по локали устройства (uk → украинский, всё остальное → русский)
  const detectLang = (): Lang => {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
      return locale.startsWith('uk') ? 'uk' : 'ru';
    } catch {
      return 'ru';
    }
  };

  const [step, setStep]       = useState<'beta' | 'demo' | 'demo2' | 'name' | 'test_offer' | 'streak' | 'time' | 'referral'>(IS_BETA_TESTER ? 'beta' : 'demo2');
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
  const btnSlide   = useRef(new Animated.Value(30)).current;
  const btnFade    = useRef(new Animated.Value(0)).current;
  const [lang, setLang]       = useState<Lang>(detectLang);
  const [name, setName]       = useState('');
  // Дефолтные значения — экраны выбора удалены, профиль сохраняется с базовыми настройками
  const goal: LearningGoal       = 'hobby';
  const minutesPerDay: MinutesPerDay = 15;
  const currentLevel: CurrentLevel   = 'a1';
  const targetLevel: TargetLevel     = 'a2';
  const [notificationTime, setNotificationTime] = useState<string>('08:00');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const t = T[lang];
  const isUK = lang === 'uk';

  // Плавный переход между экранами
  const goToStep = (next: typeof step) => {
    Animated.timing(screenFade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setStep(next);
    });
  };

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
  const PROGRESS_STEPS = ['demo2', 'demo', 'name', 'test_offer', 'streak', 'time'];
  const PREV_STEP: Partial<Record<typeof step, typeof step>> = {
    demo:       'demo2',
    name:       'demo',
    test_offer: 'name',
    streak:     'test_offer',
    time:       'streak',
  };

  const renderProgressBar = () => {
    const idx = PROGRESS_STEPS.indexOf(step);
    if (idx < 0) return null;
    const pct = Math.round(((idx + 1) / PROGRESS_STEPS.length) * 100);
    const prev = PREV_STEP[step];
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
          {prev ? (
            <TouchableOpacity onPress={() => goToStep(prev)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
              <Text style={{ color: '#C8FF00', fontSize: 20 }}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
          <View style={{ flex: 1, height: 4, backgroundColor: '#1A1A1A', borderRadius: 2 }}>
            <View style={{ height: 4, backgroundColor: '#C8FF00', width: `${pct}%`, borderRadius: 2 }} />
          </View>
          <View style={{ width: 44 }} />
        </View>
      </View>
    );
  };

  // Fade-in экрана при каждой смене шага
  useEffect(() => {
    Animated.timing(screenFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [step]);

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
      Animated.timing(demo2GreetFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(demo2HintFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(demo2QuizFade, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [step]);


  // Уведомляем родителя о языке при монтировании
  useEffect(() => {
    onLangSelect?.(lang);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameDone = async () => {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert('', isUK ? 'Введіть ім\'я щоб продовжити' : 'Введите имя чтобы продолжить'); return; }
    if (trimmed.length < 2) { Alert.alert('', isUK ? 'Мінімум 2 символи' : 'Минимум 2 символа'); return; }
    if (trimmed.length > 20) { Alert.alert('', isUK ? 'Максимум 20 символів' : 'Максимум 20 символов'); return; }
    try {
      const raw = await AsyncStorage.getItem('leaderboard');
      if (raw) {
        const board = JSON.parse(raw);
        const taken = board.some((e: any) => e.name.toLowerCase() === trimmed.toLowerCase());
        if (taken) {
          Alert.alert(
            isUK ? "Ім'я зайнято" : 'Имя занято',
            isUK ? 'Такий нікнейм вже є в рейтингу. Обери інший.' : 'Такой никнейм уже есть в рейтинге. Выбери другой.'
          );
          return;
        }
      }
    } catch {}
    await AsyncStorage.multiSet([
      ['app_lang', lang],
      ['user_name', trimmed],
    ]);
    goToStep('test_offer');
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
    } catch (e) {
    }
  };

  const handleTakeTest = async () => {
    try {
      await saveUserProfile();
      await AsyncStorage.multiSet([['onboarding_done', '1'], ['open_diagnostic', '1']]);
      onDone();
    } catch (error) {
      Alert.alert(
        isUK ? 'Помилка' : 'Ошибка',
        isUK ? 'Не вдалось зберегти профіль' : 'Не удалось сохранить профиль'
      );
    }
  };

  const handleZeroLesson = async () => {
    try {
      await saveUserProfile();
      await AsyncStorage.setItem('onboarding_done', '1');
      onDone();
    } catch (error) {
      Alert.alert(
        isUK ? 'Помилка' : 'Ошибка',
        isUK ? 'Не вдалось зберегти профіль' : 'Не удалось сохранить профиль'
      );
    }
  };

  const handleFinishOnboarding = async () => {
    await saveUserProfile();
    await AsyncStorage.setItem('onboarding_done', '1');
    onDone();
  };

  // ── Шаг 0: Добро пожаловать в бета ─────────────────────────────────────────
  if (step === 'beta') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 28, paddingVertical: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🧪</Text>
          <Text style={[styles.appName, { marginBottom: 24 }]}>Бета-тест</Text>

          <View style={{ backgroundColor: '#202020', borderRadius: 18, padding: 20, width: '100%', marginBottom: 28, borderWidth: 1, borderColor: 'rgba(200,255,0,0.12)' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>
              🙏 Спасибо за участие!
            </Text>
            <Text style={{ color: '#A8A8A8', fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
              Ты один из первых пользователей Phraseman. Твоя обратная связь напрямую влияет на продукт.
            </Text>

            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              Что нужно сделать:
            </Text>
            {[
              '📱 Пройди несколько уроков и проверь кнопки',
              '🔍 Обрати внимание на ошибки и неудобства',
              '📸 Сделай скриншот, если что-то не так',
              '💬 Напиши мне в Telegram со скриншотом',
            ].map((item, i) => (
              <Text key={i} style={{ color: '#A8A8A8', fontSize: 13, lineHeight: 22, marginBottom: 4 }}>
                {item}
              </Text>
            ))}

            <View style={{ marginTop: 16, backgroundColor: '#2A2A2A', borderRadius: 10, padding: 12 }}>
              <Text style={{ color: '#A8A8A8', fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
                Все замечания и предложения рассматриваются и учитываются.{'\n'}
                Пожалуйста, не удаляй приложение{'\n'}в течение <Text style={{ color: '#fff', fontWeight: '700' }}>14 дней</Text> — иначе твоё участие не засчитается.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, { width: '100%' }]}
            onPress={() => goToStep('demo2')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Понятно 👍</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Шаг 2: Демо квиз — 4 варианта ──────────────────────────────────────────
  if (step === 'demo') {
    const demoPhrase = '"I\'m fed up with this job"';
    const demoQuestion = isUK ? 'Що означає "fed up with"?' : 'Что значит "fed up with"?';
    const demoOptions = isUK
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
          <Text style={{ color: '#A8A8A8', fontSize: 14, marginBottom: 28, textAlign: 'center' }}>
            {isUK ? 'Спробуй вгадати фразу прямо зараз' : 'Попробуй угадать фразу прямо сейчас'}
          </Text>
          <View style={{ backgroundColor: '#202020', borderRadius: 16, padding: 20, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(200,255,0,0.12)' }}>
            <Text style={{ color: '#A8A8A8', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              {demoQuestion}
            </Text>
            <Text style={{ color: '#C8FF00', fontSize: 22, fontWeight: '700', lineHeight: 30 }}>
              {demoPhrase}
            </Text>
          </View>
          <View style={{ width: '100%', gap: 10 }}>
            {demoOptions.map((opt, i) => {
              let borderColor: string = 'rgba(200,255,0,0.12)';
              let bg = '#1A1A1A';
              let textColor = '#D0D0D0';
              let iconStroke = '#666';
              if (demoAnswered) {
                if (i === correctIndex) {
                  borderColor = '#C8FF00'; bg = 'rgba(200,255,0,0.08)';
                  textColor = '#C8FF00'; iconStroke = '#C8FF00';
                } else if (i === demoSelected) {
                  borderColor = '#FF453A'; bg = 'rgba(255,69,58,0.08)';
                  textColor = '#FF453A'; iconStroke = '#FF453A';
                } else {
                  borderColor = '#2A2A2A'; bg = '#141414';
                  textColor = '#444'; iconStroke = '#333';
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
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: demoAnswered && i === correctIndex ? 'rgba(200,255,0,0.15)' : demoAnswered && i === demoSelected ? 'rgba(255,69,58,0.15)' : '#2A2A2A', alignItems: 'center', justifyContent: 'center' }}>
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
                    ? (isUK ? '🎉 Вірно! Продовжити' : '🎉 Верно! Продолжить')
                    : (isUK ? '👀 Зрозуміло! Продовжити' : '👀 Понял! Продолжить')}
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
    const demo2Correct_order = [1, 0, 3, 4, 2]; // Please turn off the TV
    const demo2Answer = ['Please', 'turn', 'off', 'the', 'TV'];

    const currentPhrase = demo2Selected.map(idx => demo2Words[idx]);
    const isDemo2Correct = demo2Selected.length === demo2Answer.length
      && demo2Selected.every((idx, pos) => demo2Words[idx] === demo2Answer[pos]);

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
            <Text style={{ color: '#C8FF00', fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
              Phraseman
            </Text>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 34 }}>
              {isUK ? 'Вивчай англійські\nфрази граючи' : 'Учи английские\nфразы играя'}
            </Text>
            <Text style={{ color: '#A8A8A8', fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 10 }}>
              {isUK
                ? 'Тут ти збираєш фрази, вчиш ідіоми\nта розумієш живу англійську'
                : 'Здесь ты собираешь фразы, учишь идиомы\nи понимаешь живой английский'}
            </Text>
          </Animated.View>

          {/* Подсказка-инструкция (fade-in с задержкой) */}
          <Animated.View style={{ opacity: demo2HintFade, marginBottom: 20 }}>
            <View style={{ backgroundColor: '#1A1A1A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(200,255,0,0.15)' }}>
              <Text style={{ color: '#C8FF00', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                {isUK ? 'Спробуй скласти фразу з цих слів:' : 'Попробуй собрать фразу из этих слов:'}
              </Text>
              <Text style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                {isUK ? 'Будь ласка, вимкни телевізор' : 'Пожалуйста, выключи телевизор'}
              </Text>
            </View>
          </Animated.View>

          {/* Сама игра (fade-in последним) */}
          <Animated.View style={{ opacity: demo2QuizFade }}>
            {/* Область ответа */}
            <View style={{ minHeight: 56, backgroundColor: '#151515', borderRadius: 14, borderWidth: 1.5, borderColor: demo2Answered ? (demo2Correct ? '#C8FF00' : '#FF4444') : 'rgba(200,255,0,0.20)', padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {currentPhrase.length === 0
                ? <Text style={{ color: '#333', fontSize: 15 }}>{isUK ? 'тут з\'явиться фраза…' : 'здесь появится фраза…'}</Text>
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
                            backgroundColor: isWrong ? 'rgba(255,69,58,0.15)' : '#2A2A2A',
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderWidth: isWrong ? 1 : 0,
                            borderColor: isWrong ? '#FF453A' : 'transparent',
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: isWrong ? '#FF453A' : '#fff', fontSize: 16, fontWeight: '500' }}>{w}</Text>
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
                      backgroundColor: used ? '#111' : '#252525',
                      borderRadius: 10,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderWidth: 1.5,
                      borderColor: used ? '#222' : 'rgba(200,255,0,0.18)',
                    }}
                  >
                    <Text style={{ color: used ? '#333' : '#E0E0E0', fontSize: 16, fontWeight: '500' }}>{w}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Результат + кнопка */}
            {demo2Answered && (
              <Animated.View style={{ marginTop: 4, opacity: btnFade, transform: [{ translateY: btnSlide }] }}>
                <Text style={{ color: demo2Correct ? '#C8FF00' : '#FF8888', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 16 }}>
                  {demo2Correct
                    ? (isUK ? '🎉 Відмінно! Всі правильно!' : '🎉 Отлично! Всё правильно!')
                    : `${isUK ? '✅ Правильно: ' : '✅ Правильно: '}${demo2Answer.join(' ')}`}
                </Text>
                <TouchableOpacity
                  style={[styles.continueBtn, { width: '100%' }]}
                  onPress={() => goToStep('demo')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.continueBtnText}>
                    {isUK ? 'Продовжити' : 'Продолжить'}
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
                <Text style={{ color: '#555', fontSize: 13 }}>
                  {isUK ? 'Пропустити →' : 'Пропустить →'}
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
        <KeyboardAvoidingView style={styles.center} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.appName}>Phraseman</Text>
          <Text style={styles.title}>
            {isUK ? 'Введіть ваше ім\'я або нікнейм' : 'Введите ваше имя или никнейм'}
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={isUK ? 'Ваше ім\'я...' : 'Ваше имя...'}
            placeholderTextColor="#555"
            autoFocus
            maxLength={20}
            returnKeyType="done"
            onSubmitEditing={handleNameDone}
          />
          <TouchableOpacity style={styles.continueBtn} onPress={handleNameDone} activeOpacity={0.85}>
            <Text style={styles.continueBtnText}>{isUK ? 'Продовжити' : 'Продолжить'}</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Шаг 4: Предложение диагностического теста ───────────────────────────────
  if (step === 'test_offer') {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={{ flex: 1, opacity: screenFade }}>
        {renderProgressBar()}
        <ScrollView contentContainerStyle={[styles.center, { flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🔍</Text>
          <Text style={[styles.title, { marginBottom: 12 }]}>
            {isUK ? 'Дізнайся свій рівень' : 'Узнай свой уровень'}
          </Text>
          <Text style={{ color: '#A8A8A8', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 36, paddingHorizontal: 8 }}>
            {isUK
              ? 'Пройди короткий тест (2–3 хв) і ми підберемо тобі підходящий стартовий урок'
              : 'Пройди короткий тест (2–3 мин) и мы подберём тебе подходящий стартовый урок'}
          </Text>
          <TouchableOpacity style={[styles.continueBtn, { width: '100%' }]} onPress={handleTakeTest} activeOpacity={0.85}>
            <Text style={styles.continueBtnText}>
              {isUK ? '🔍 Пройти тест' : '🔍 Пройти тест'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginTop: 14, width: '100%', borderWidth: 1.5, borderColor: 'rgba(200,255,0,0.12)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
            onPress={() => goToStep('streak')}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#C8FF00', fontSize: 15, fontWeight: '600' }}>
              {isUK ? '🐣 Почати з початку' : '🐣 Начать сначала'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Шаг streak: Мотивация + прогресс ────────────────────────────────────────
  if (step === 'streak') {
    const streakMilestones = isUK
      ? [
          { days: 3,  emoji: '🔥', reward: 'Множник XP ×1.2 за кожну відповідь' },
          { days: 7,  emoji: '⚡', reward: 'Множник XP ×1.4 — швидше зростаєш' },
          { days: 30, emoji: '👑', reward: 'Множник XP ×1.8 — максимальний буст' },
        ]
      : [
          { days: 3,  emoji: '🔥', reward: 'Множитель XP ×1.2 за каждый ответ' },
          { days: 7,  emoji: '⚡', reward: 'Множитель XP ×1.4 — растёшь быстрее' },
          { days: 30, emoji: '👑', reward: 'Множитель XP ×1.8 — максимальный буст' },
        ];
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={{ flex: 1, opacity: screenFade }}>
        {renderProgressBar()}
        <ScrollView contentContainerStyle={[styles.center, { flexGrow: 1, paddingHorizontal: 28 }]} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🔥</Text>
          <Text style={[styles.title, { marginBottom: 8 }]}>
            {isUK ? 'Щодня — і ти непереможний' : 'Каждый день — и ты непобедим'}
          </Text>
          <Text style={{ color: '#A8A8A8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
            {isUK
              ? 'Навіть 5 хвилин на день. Серія днів — твій головний інструмент.'
              : 'Даже 5 минут в день. Серия дней — твой главный инструмент.'}
          </Text>

          {/* Milestones */}
          <View style={{ width: '100%', gap: 10, marginBottom: 32 }}>
            {streakMilestones.map((m) => (
              <View key={m.days} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, gap: 14, borderWidth: 1, borderColor: 'rgba(200,255,0,0.10)' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#252525', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#C8FF00', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>
                    {isUK ? `${m.days} днів` : `${m.days} дней`}
                  </Text>
                  <Text style={{ color: '#A8A8A8', fontSize: 13 }}>{m.reward}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, { width: '100%' }]}
            onPress={() => goToStep('time')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {isUK ? '🤝 Обіцяю щодня!' : '🤝 Обещаю каждый день!'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 16 }} onPress={handleFinishOnboarding} activeOpacity={0.7}>
            <Text style={{ color: '#444', fontSize: 13 }}>
              {isUK ? 'Пропустити' : 'Пропустить'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Шаг 7: Выбор времени напоминаний ────────────────────────────────────────
  if (step === 'time') {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={{ flex: 1, opacity: screenFade }}>
        {renderProgressBar()}
        <ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
          <Text style={styles.appName}>Phraseman</Text>
          <Text style={styles.title}>
            {isUK ? 'Коли зазвичай вільний?' : 'Когда обычно свободен?'}
          </Text>
          <View style={{ width: '100%', gap: 12, marginBottom: 24 }}>
            {TIME_OPTIONS.map(time => (
              <TouchableOpacity
                key={time}
                style={[styles.optionButton, notificationTime === time && styles.optionButtonSelected]}
                onPress={() => setNotificationTime(time)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionLabel, notificationTime === time && styles.optionLabelSelected]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.notificationToggle}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 }}>
              {isUK ? `Нагадувати мені в ${notificationTime}` : `Напоминать мне в ${notificationTime}`}
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#555', true: '#C8FF00' }}
              thumbColor={notificationsEnabled ? '#1A2400' : '#999'}
            />
          </View>

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleFinishOnboarding}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {isUK ? 'Почати навчання 🚀' : 'Начать обучение 🚀'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Fallback — не должен достигаться
  return null;
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0D0D0D' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  appName:         { color: '#C8FF00', fontSize: 15, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  title:           { color: '#fff', fontSize: 24, fontWeight: '600', textAlign: 'center', marginBottom: 40, lineHeight: 34 },
  langBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#202020', borderRadius: 14, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(200,255,0,0.12)',
  },
  langFlag:        { fontSize: 32, marginRight: 16 },
  langLabel:       { color: '#fff', fontSize: 20, fontWeight: '500' },
  input: {
    width: '100%', backgroundColor: '#202020', color: '#fff',
    fontSize: 20, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(200,255,0,0.12)', marginBottom: 24,
  },
  continueBtn:     { width: '100%', backgroundColor: '#C8FF00', padding: 18, borderRadius: 12, alignItems: 'center' },
  continueBtnText: { color: '#1A2400', fontSize: 18, fontWeight: '700' },
  langHint:        { color: '#606060', fontSize: 14, fontWeight: '500', letterSpacing: 0.5, marginBottom: 32 },
  // Premium step
  premiumScroll:   { padding: 24, paddingBottom: 40, alignItems: 'center' },
  trialBadge:      { backgroundColor: '#C8FF00', color: '#1A2400', fontWeight: '900', fontSize: 13, letterSpacing: 1.5, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 20, overflow: 'hidden' },
  premiumTitle:    { color: '#fff', fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  premiumSub:      { color: '#A8A8A8', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  featuresBox:     { width: '100%', backgroundColor: '#202020', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(200,255,0,0.12)', gap: 14, marginBottom: 20 },
  featureRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon:     { fontSize: 22, width: 30, textAlign: 'center' },
  featureText:     { color: '#F0F0F0', fontSize: 16, fontWeight: '500' },
  planCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#C8FF00', borderRadius: 16, padding: 18, marginBottom: 12,
  },
  planCardSecondary: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#202020', borderRadius: 16, padding: 18, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#C8FF00',
  },
  planCardLeft:    { flex: 1, marginRight: 12 },
  planBadge:       { color: '#1A2400', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  planCardTitle:   { color: '#1A2400', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  planCardSub:     { color: '#1A2400', fontSize: 12, fontWeight: '500' },
  planCardCta:     { color: '#1A2400', fontSize: 13, fontWeight: '900', textAlign: 'center', lineHeight: 18 },
  planCardCtaSecondary: { color: '#C8FF00', fontSize: 13, fontWeight: '900', textAlign: 'center', lineHeight: 18 },
  // secondary card text overrides
  freeBtn:         { width: '100%', padding: 14, alignItems: 'center', marginBottom: 16 },
  freeBtnText:     { color: '#606060', fontSize: 14, fontWeight: '500' },
  legal:           { color: '#606060', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  // Новые стили для расширенного онбординга
  optionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202020',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(200,255,0,0.12)',
    gap: 14,
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(200,255,0,0.1)',
    borderColor: '#C8FF00',
  },
  optionEmoji: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  optionLabel: {
    color: '#A8A8A8',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  optionLabelSelected: {
    color: '#C8FF00',
    fontWeight: '700',
  },
  planBox: {
    backgroundColor: '#202020',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.12)',
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  forecastLabel: {
    color: '#A8A8A8',
    fontSize: 13,
    fontWeight: '500',
  },
  forecastValue: {
    color: '#C8FF00',
    fontSize: 13,
    fontWeight: '700',
  },
  notificationToggle: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202020',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.12)',
  },
});
