import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView,
  ActivityIndicator, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import Constants from 'expo-constants';
import { sendPremiumNotification } from '../app/notifications';
import { generateReferralCode } from '../app/referral_system';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';
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

type Plan = 'monthly' | 'yearly';

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
  const [step, setStep]       = useState<'beta' | 'lang' | 'name' | 'goal' | 'minutes' | 'level' | 'test_offer' | 'plan' | 'time' | 'referral' | 'premium'>('beta');
  const [lang, setLang]       = useState<Lang>('ru');
  const [name, setName]       = useState('');
  const [goal, setGoal]       = useState<LearningGoal | null>(null);
  const [minutesPerDay, setMinutesPerDay] = useState<MinutesPerDay | null>(null);
  const [currentLevel, setCurrentLevel] = useState<CurrentLevel | null>(null);
  const [targetLevel, setTargetLevel] = useState<TargetLevel | null>(null);
  const [notificationTime, setNotificationTime] = useState<string>('08:00');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selected, setSelected] = useState<Plan>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [packages, setPackages] = useState<{ monthly?: PurchasesPackage; yearly?: PurchasesPackage }>({});

  const t = T[lang];
  const isUK = lang === 'uk';

  useEffect(() => {
    if (step === 'premium' && !IS_EXPO_GO) {
      Purchases.getOfferings()
        .then(offerings => {
          const pkgs = offerings.current?.availablePackages ?? [];
          const monthly = pkgs.find(p => p.product.identifier.includes('monthly'));
          const yearly  = pkgs.find(p => p.product.identifier.includes('yearly'));
          setPackages({ monthly, yearly });
        })
        .catch(() => {});
    }
  }, [step]);

  const handleLangSelect = (l: Lang) => {
    setLang(l);
    onLangSelect?.(l);
    setStep('name');
  };

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
    setStep('goal');
  };

  const handlePurchase = async (plan: Plan) => {
    if (IS_EXPO_GO) { await handleContinueFree(); return; }
    const pkg = plan === 'yearly' ? packages.yearly : packages.monthly;
    if (!pkg) {
      Alert.alert(
        isUK ? 'Магазин недоступний' : 'Магазин недоступен',
        isUK ? 'Спробуйте пізніше або перевірте підключення.' : 'Попробуйте позже или проверьте подключение.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSelected(plan);
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isActive = !!customerInfo.entitlements.active['premium']
        || customerInfo.activeSubscriptions.length > 0;
      if (isActive) {
        const expiry = plan === 'yearly'
          ? Date.now() + 365 * 24 * 60 * 60 * 1000
          : Date.now() + 30  * 24 * 60 * 60 * 1000;
        await AsyncStorage.multiSet([
          ['premium_active', 'true'],
          ['premium_plan', plan],
          ['premium_expiry', String(expiry)],
          ['onboarding_done', '1'],
        ]);
        sendPremiumNotification(lang);
        onDone();
      } else {
        // Покупка прошла, но entitlement ещё не активен (задержка RevenueCat).
        // Сохраняем онбординг и продолжаем — подписка активируется при следующей проверке.
        await AsyncStorage.setItem('onboarding_done', '1');
        Alert.alert(
          isUK ? 'Дякуємо!' : 'Спасибо!',
          isUK
            ? 'Покупку отримано. Premium активується протягом кількох хвилин.'
            : 'Покупка получена. Premium активируется в течение нескольких минут.',
          [{ text: 'OK', onPress: onDone }]
        );
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert(
          isUK ? 'Помилка' : 'Ошибка',
          e.message || (isUK ? 'Щось пішло не так.' : 'Что-то пошло не так.')
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleContinueFree = async () => {
    await AsyncStorage.setItem('onboarding_done', '1');
    onDone();
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
      // removed console.warn
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

  const handleContinueToPremium = async () => {
    await saveUserProfile();
    setStep('test_offer');
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
            onPress={() => setStep('lang')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Понятно 👍</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Шаг 1: Выбор языка ──────────────────────────────────────────────────────
  if (step === 'lang') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.appName}>Phraseman</Text>
          <Text style={styles.langHint}>Select your language</Text>
          <TouchableOpacity style={styles.langBtn} onPress={() => handleLangSelect('ru')} activeOpacity={0.8}>
            <Text style={styles.langFlag}>🇷🇺</Text>
            <Text style={styles.langLabel}>Русский</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.langBtn} onPress={() => handleLangSelect('uk')} activeOpacity={0.8}>
            <Text style={styles.langFlag}>🇺🇦</Text>
            <Text style={styles.langLabel}>Українська</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Шаг 2: Имя ──────────────────────────────────────────────────────────────
  if (step === 'name') {
    return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  // ── Шаг 3: Предложение диагностического теста ───────────────────────────────
  if (step === 'test_offer') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
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
            onPress={handleZeroLesson}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#C8FF00', fontSize: 15, fontWeight: '600' }}>
              {isUK ? '🐣 Почати з початку' : '🐣 Начать сначала'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Шаг 3: Выбор цели ───────────────────────────────────────────────────────
  if (step === 'goal') {
    const goals: Array<{ key: LearningGoal; label: string; emoji: string }> = [
      { key: 'tourism', label: GOAL_DESCRIPTIONS['tourism'][isUK ? 'uk' : 'ru'], emoji: GOAL_EMOJIS.tourism },
      { key: 'work', label: GOAL_DESCRIPTIONS['work'][isUK ? 'uk' : 'ru'], emoji: GOAL_EMOJIS.work },
      { key: 'emigration', label: GOAL_DESCRIPTIONS['emigration'][isUK ? 'uk' : 'ru'], emoji: GOAL_EMOJIS.emigration },
      { key: 'hobby', label: GOAL_DESCRIPTIONS['hobby'][isUK ? 'uk' : 'ru'], emoji: GOAL_EMOJIS.hobby },
    ];

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
          <Text style={styles.appName}>Phraseman</Text>
          <Text style={styles.title}>
            {isUK ? 'Чому ти вчиш англійську?' : 'Зачем ты учишь английский?'}
          </Text>
          <View style={{ width: '100%', gap: 12, marginBottom: 20 }}>
            {goals.map(g => (
              <TouchableOpacity
                key={g.key}
                style={[styles.optionButton, goal === g.key && styles.optionButtonSelected]}
                onPress={() => setGoal(g.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionEmoji}>{g.emoji}</Text>
                <Text style={[styles.optionLabel, goal === g.key && styles.optionLabelSelected]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, !goal && { opacity: 0.5 }]}
            onPress={() => setStep('minutes')}
            activeOpacity={0.85}
            disabled={!goal}
          >
            <Text style={styles.continueBtnText}>
              {isUK ? 'Далі' : 'Далее'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Шаг 4: Выбор интенсивности ──────────────────────────────────────────────
  if (step === 'minutes') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
          <Text style={styles.appName}>Phraseman</Text>
          <Text style={styles.title}>
            {isUK ? 'Скільки часу щодня?' : 'Сколько времени в день?'}
          </Text>
          <View style={{ width: '100%', gap: 12, marginBottom: 20 }}>
            {MINUTES_OPTIONS.map(mins => (
              <TouchableOpacity
                key={mins}
                style={[styles.optionButton, minutesPerDay === mins && styles.optionButtonSelected]}
                onPress={() => setMinutesPerDay(mins)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionEmoji}>{MINUTES_EMOJIS[mins]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, minutesPerDay === mins && styles.optionLabelSelected, { marginLeft: 0 }]}>
                    {MINUTES_DESCRIPTIONS[mins][isUK ? 'uk' : 'ru']}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, !minutesPerDay && { opacity: 0.5 }]}
            onPress={() => setStep('level')}
            activeOpacity={0.85}
            disabled={!minutesPerDay}
          >
            <Text style={styles.continueBtnText}>
              {isUK ? 'Далі' : 'Далее'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Шаг 5: Выбор текущего уровня ────────────────────────────────────────────
  if (step === 'level') {
    const levels = [
      { key: 'a1' as CurrentLevel, emoji: LEVEL_EMOJIS.a1, label: LEVEL_DESCRIPTIONS.a1[isUK ? 'uk' : 'ru'] },
      { key: 'a2' as CurrentLevel, emoji: LEVEL_EMOJIS.a2, label: LEVEL_DESCRIPTIONS.a2[isUK ? 'uk' : 'ru'] },
      { key: 'b1' as CurrentLevel, emoji: LEVEL_EMOJIS.b1, label: LEVEL_DESCRIPTIONS.b1[isUK ? 'uk' : 'ru'] },
      { key: 'b2' as CurrentLevel, emoji: LEVEL_EMOJIS.b2, label: LEVEL_DESCRIPTIONS.b2[isUK ? 'uk' : 'ru'] },
    ];

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
          <Text style={styles.appName}>Phraseman</Text>
          <Text style={styles.title}>
            {isUK ? '❤️ Давай познайомимось. Який твій досвід з англійської?' : '❤️ Давай познакомимся. Каков твой опыт в английском?'}
          </Text>
          <View style={{ width: '100%', gap: 12, marginBottom: 20 }}>
            {levels.map(lvl => (
              <TouchableOpacity
                key={lvl.key}
                style={[styles.optionButton, currentLevel === lvl.key && styles.optionButtonSelected]}
                onPress={() => setCurrentLevel(lvl.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionEmoji}>{lvl.emoji}</Text>
                <Text style={[styles.optionLabel, currentLevel === lvl.key && styles.optionLabelSelected]}>
                  {lvl.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, !currentLevel && { opacity: 0.5 }]}
            onPress={() => setStep('plan')}
            activeOpacity={0.85}
            disabled={!currentLevel}
          >
            <Text style={styles.continueBtnText}>
              {isUK ? 'Далі' : 'Далее'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Шаг 6: Персональный план ────────────────────────────────────────────────
  if (step === 'plan' && goal && minutesPerDay && currentLevel) {
    const targetIdx = Math.min(TARGET_LEVELS.indexOf(currentLevel) + 1, TARGET_LEVELS.length - 1);
    const target = TARGET_LEVELS[targetIdx];
    const daysEstimate = estimateDaysToTarget(currentLevel, target, minutesPerDay);
    const targetDate = addDays(new Date(), daysEstimate);

    const levelDescriptions: Record<CurrentLevel | TargetLevel, { ru: string; uk: string }> = {
      a1: { ru: 'нулевой уровень', uk: 'нульовий рівень' },
      a2: { ru: 'базовый уровень', uk: 'базовий рівень' },
      b1: { ru: 'свободное общение', uk: 'вільне спілкування' },
      b2: { ru: 'уверенное владение', uk: 'впевнене володіння' },
      c1: { ru: 'профессиональный уровень', uk: 'професійний рівень' },
    };

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { marginBottom: 32, fontSize: 28 }]}>
            {isUK ? '🎯 Твоя суперцель' : '🎯 Твоя суперцель'}
          </Text>

          <View style={styles.planBox}>
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#C8FF00', fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
                {GOAL_EMOJIS[goal]} {isUK ? 'Твоя мета:' : 'Твоя цель:'}
              </Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                {GOAL_DESCRIPTIONS[goal][isUK ? 'uk' : 'ru']}
              </Text>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: '#C8FF00', fontSize: 14, fontWeight: '700', marginBottom: 8 }}>
                ⚡️ {isUK ? 'Будемо на зв\'язку:' : 'Будем на связи:'}
              </Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                {MINUTES_DESCRIPTIONS[minutesPerDay][isUK ? 'uk' : 'ru'].split(' — ')[0]} {isUK ? 'щодня' : 'каждый день'}
              </Text>
            </View>

            <View style={{ marginBottom: 24, backgroundColor: '#2A2A2A', borderRadius: 12, padding: 16 }}>
              <Text style={{ color: '#C8FF00', fontSize: 14, fontWeight: '700', marginBottom: 12 }}>
                {isUK ? 'ТВІЙ ПРОГРЕС:' : 'ТВ​ОЙ ПРОГРЕС:'}
              </Text>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={{ color: '#A8A8A8', fontSize: 12, marginBottom: 4 }}>
                    {isUK ? 'У тебе вже є база!' : 'У тебя уже есть база!'}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                    {currentLevel.toUpperCase()} — {levelDescriptions[currentLevel][isUK ? 'uk' : 'ru']}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: '#A8A8A8', fontSize: 12, marginBottom: 4 }}>
                    {isUK ? 'Давай покоримо' : 'Давай покорим'}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                    {target.toUpperCase()} — {levelDescriptions[target][isUK ? 'uk' : 'ru']}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: '#A8A8A8', fontSize: 12, marginBottom: 4 }}>
                    ⏳ {isUK ? 'Час до цілі:' : 'Время до цели:'}
                  </Text>
                  <Text style={{ color: '#C8FF00', fontSize: 15, fontWeight: '700' }}>
                    {isUK ? 'Через' : 'Через'} {daysEstimate} {isUK ? 'днів ти заговориш по-новому' : 'дней ты заговоришь по-новому'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => setStep('time')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {isUK ? 'Далі' : 'Далее'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Шаг 6b: Реферальный код (опциональный) ─────────────────────────────────────
  // ── Шаг 7: Выбор времени напоминаний ────────────────────────────────────────
  if (step === 'time') {
    return (
      <SafeAreaView style={styles.container}>
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
            onPress={handleContinueToPremium}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {isUK ? 'Завершити' : 'Завершить'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Шаг 8: Премиум ──────────────────────────────────────────────────────────
  const features = isUK ? [
    { icon: '📚', text: 'Всі 32 уроки' },
    { icon: '🎯', text: 'Квізи всіх рівнів' },
    { icon: '🏆', text: 'Зал слави та ліги' },
    { icon: '💬', text: 'Усі діалоги' },
    { icon: '🎓', text: 'Фінальний іспит' },
    { icon: '⚡', text: 'Необмежений доступ' },
  ] : [
    { icon: '📚', text: 'Все 32 урока' },
    { icon: '🎯', text: 'Квизы всех уровней' },
    { icon: '🏆', text: 'Зал славы и клубы' },
    { icon: '💬', text: 'Все диалоги' },
    { icon: '🎓', text: 'Финальный экзамен' },
    { icon: '⚡', text: 'Неограниченный доступ' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.premiumScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.trialBadge}>
          {isUK ? '7 ДНІВ БЕЗКОШТОВНО' : '7 ДНЕЙ БЕСПЛАТНО'}
        </Text>
        <Text style={styles.premiumTitle}>
          {isUK ? 'Спробуй Premium' : 'Попробуй Premium'}
        </Text>
        <Text style={styles.premiumSub}>
          {isUK
            ? 'Повний доступ до всіх матеріалів — безкоштовно на тиждень'
            : 'Полный доступ ко всем материалам — бесплатно на неделю'}
        </Text>

        <View style={styles.featuresBox}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Годовая */}
        <TouchableOpacity
          style={[styles.planCard, purchasing && selected === 'yearly' && { opacity: 0.7 }]}
          onPress={() => handlePurchase('yearly')}
          activeOpacity={0.85}
          disabled={purchasing}
        >
          <View style={styles.planCardLeft}>
            <Text style={styles.planBadge}>{isUK ? '⭐ Найкращий вибір' : '⭐ Лучший выбор'}</Text>
            <Text style={styles.planCardTitle}>{isUK ? 'Річна підписка' : 'Годовая подписка'}</Text>
            <Text style={styles.planCardSub}>€23.99 · ≈€2.00/{isUK ? 'міс' : 'мес'} · {isUK ? 'економія 50%' : 'экономия 50%'}</Text>
          </View>
          {purchasing && selected === 'yearly'
            ? <ActivityIndicator color="#1A2400" />
            : <Text style={styles.planCardCta}>{isUK ? '7 днів\nбезкоштовно' : '7 дней\nбесплатно'}</Text>
          }
        </TouchableOpacity>

        {/* Месячная */}
        <TouchableOpacity
          style={[styles.planCardSecondary, purchasing && selected === 'monthly' && { opacity: 0.7 }]}
          onPress={() => handlePurchase('monthly')}
          activeOpacity={0.85}
          disabled={purchasing}
        >
          <View style={styles.planCardLeft}>
            <Text style={[styles.planCardTitle, { color: '#fff' }]}>{isUK ? 'Щомісячна підписка' : 'Ежемесячная подписка'}</Text>
            <Text style={[styles.planCardSub, { color: '#A8A8A8' }]}>€3.99 / {isUK ? 'місяць' : 'месяц'}</Text>
          </View>
          {purchasing && selected === 'monthly'
            ? <ActivityIndicator color="#C8FF00" />
            : <Text style={styles.planCardCtaSecondary}>{isUK ? '7 днів\nбезкоштовно' : '7 дней\nбесплатно'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.freeBtn} onPress={handleContinueFree} activeOpacity={0.7}>
          <Text style={styles.freeBtnText}>
            {isUK ? 'Продовжити безкоштовно (Урок 1)' : 'Продолжить бесплатно (Урок 1)'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          {isUK
            ? 'Після 7 днів підписка продовжується автоматично. Скасування в будь-який час.'
            : 'После 7 дней подписка продлевается автоматически. Отмена в любое время.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
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
