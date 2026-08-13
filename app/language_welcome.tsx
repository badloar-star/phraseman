// ═══════════════════════════════════════════════════════════════════════════
// language_welcome — приветствие нового изучаемого языка (мини-онбординг).
//
// Открывается из пикера языков в настройках, когда пользователь добавляет язык,
// который ещё не начинал. Приветствует, задаёт два вопроса (зачем + уровень),
// сохраняет ответы в профиль языка (language_profile_v1::{target} — сырьё для
// выбранных настроек) и активирует язык. Прогресс каждого языка живёт в своём
// namespace, поэтому предыдущий язык ничего не теряет.
//
// Гейт: фри-аккаунт = 1 язык. Экран страхует пикер — если сюда попали в обход
// (диплинк), эффект-гейт уводит на пейвол. Replace из эффекта — ТОЛЬКО с
// markNextNavigationAsReplace (иначе петля «назад», см. navigation_back.ts).
//
// Performance Bible: статичный экран, без бесконечных анимаций и подписок;
// первый кадр — синхронный (все данные — локальные константы + параметр роута).
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRootNavigationState, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import { ENABLE_DEV_STUDY_TARGET_LANG } from './config';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import {
  openPremiumPaywall,
  scheduleAfterRootNavigationReady,
  type ScheduledNavigation,
} from './paywall_navigation';
import {
  applyStudyLanguageSelection,
  getStartedStudyLanguages,
  isKnownStudyLanguage,
  saveLanguageProfile,
  shouldGateExtraLanguage,
} from './study_languages';
import {
  isStudyTargetSourceUiLang,
  studyTargetLabelForSourceUiLang,
  type StudyTargetLang,
} from './study_target_lang_dev';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type WelcomeStep = 'welcome' | 'goal' | 'level' | 'done';

const FLAG_ASSETS: Partial<Record<StudyTargetLang, ImageSourcePropType>> = {
  en: require('../assets/images/language_flags/language_en.webp'),
  fr: require('../assets/images/language_flags/language_fr_dev.webp'),
  es: require('../assets/images/language_flags/language_es_dev.webp'),
};

/** Название языка в винительной форме для вопросов («Зачем тебе …?»). */
const LANGUAGE_ACCUSATIVE: Record<'ru' | 'uk', Record<StudyTargetLang, string>> = {
  ru: { en: 'английский', fr: 'французский', es: 'испанский' },
  uk: { en: 'англійська', fr: 'французька', es: 'іспанська' },
};

/**
 * Персональное напутствие для экрана-подтверждения — по выбранной цели (goal).
 * Ключи совпадают с id GOAL_OPTIONS; fallback — на случай неизвестной цели.
 */
const DONE_ENCOURAGEMENT: Record<'ru' | 'uk', Record<string, string>> = {
  ru: {
    series: 'План под тебя готов. Пара минут в день — и любимые сериалы зазвучат понятнее уже на этой неделе.',
    everyday: 'План под тебя готов. Пара минут в день — и первые живые фразы для разговора появятся уже на этой неделе.',
    travel: 'План под тебя готов. Пара минут в день — и в поездке ты будешь понимать и отвечать увереннее.',
    words: 'План под тебя готов. Пара минут в день — и нужные фразы начнут оставаться в памяти уже на этой неделе.',
    mind: 'План под тебя готов. Пара минут в день — и первые фразы зазвучат уже на этой неделе.',
    default: 'План под тебя готов. Пара минут в день — и первые фразы зазвучат уже на этой неделе.',
  },
  uk: {
    series: 'План під тебе готовий. Пара хвилин на день — і улюблені серіали звучатимуть зрозуміліше вже цього тижня.',
    everyday: 'План під тебе готовий. Пара хвилин на день — і перші живі фрази для розмови зʼявляться вже цього тижня.',
    travel: 'План під тебе готовий. Пара хвилин на день — і в подорожі ти розумітимеш і відповідатимеш упевненіше.',
    words: 'План під тебе готовий. Пара хвилин на день — і потрібні фрази почнуть залишатися в памʼяті вже цього тижня.',
    mind: 'План під тебе готовий. Пара хвилин на день — і перші фрази зазвучать уже цього тижня.',
    default: 'План під тебе готовий. Пара хвилин на день — і перші фрази зазвучать уже цього тижня.',
  },
};

type ChoiceOption = {
  id: string;
  ru: string;
  uk: string;
  icon: IoniconName;
  asset?: ImageSourcePropType;
};

/** Те же id, что в CleanOnboarding. */
const GOAL_OPTIONS: ChoiceOption[] = [
  { id: 'series', ru: 'Понимать кино и сериалы', uk: 'Розуміти кіно й серіали', icon: 'volume-high-outline', asset: require('../assets/images/flow_clean_202607/goal_series.webp') },
  { id: 'everyday', ru: 'Говорить в обычной жизни', uk: 'Говорити в повсякденному житті', icon: 'chatbubble-ellipses-outline', asset: require('../assets/images/flow_clean_202607/goal_everyday.webp') },
  { id: 'travel', ru: 'Путешествовать', uk: 'Подорожувати', icon: 'airplane-outline', asset: require('../assets/images/flow_clean_202607/goal_travel.webp') },
  { id: 'words', ru: 'Нужные фразы каждый день', uk: 'Потрібні фрази щодня', icon: 'cube-outline', asset: require('../assets/images/flow_clean_202607/goal_words.webp') },
  { id: 'mind', ru: 'Учиться для себя', uk: 'Вчитися для себе', icon: 'school-outline', asset: require('../assets/images/flow_clean_202607/goal_mind.webp') },
];

const LEVEL_OPTIONS: ChoiceOption[] = [
  { id: 'a0', ru: 'Начинаю с нуля', uk: 'Починаю з нуля', icon: 'bar-chart-outline', asset: require('../assets/images/flow_clean_202607/level_a0.webp') },
  { id: 'a1', ru: 'Знаю отдельные слова', uk: 'Знаю окремі слова', icon: 'bar-chart-outline', asset: require('../assets/images/flow_clean_202607/level_a1.webp') },
  { id: 'a2', ru: 'Могу поддержать простой разговор', uk: 'Можу підтримати просту розмову', icon: 'bar-chart-outline', asset: require('../assets/images/flow_clean_202607/level_a2.webp') },
  { id: 'b1', ru: 'Говорю на знакомые темы', uk: 'Розмовляю на знайомі теми', icon: 'bar-chart-outline', asset: require('../assets/images/flow_clean_202607/level_b1.webp') },
  { id: 'b2', ru: 'Обсуждаю почти всё', uk: 'Обговорюю майже все', icon: 'bar-chart-outline', asset: require('../assets/images/flow_clean_202607/level_b2.webp') },
];

export default function LanguageWelcomeScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { hasPremiumAccess } = usePremium();
  const params = useLocalSearchParams<{ target?: string }>();
  const rawTarget = Array.isArray(params.target) ? params.target[0] : params.target;
  const parsedTarget: StudyTargetLang | null = isKnownStudyLanguage(rawTarget) ? rawTarget : null;
  const target: StudyTargetLang | null =
    parsedTarget && (ENABLE_DEV_STUDY_TARGET_LANG || parsedTarget === 'en') ? parsedTarget : null;
  const sourceUi: 'ru' | 'uk' = lang === 'uk' ? 'uk' : 'ru';
  const tr = useCallback((ru: string, uk: string) => (sourceUi === 'uk' ? uk : ru), [sourceUi]);

  const [step, setStep] = useState<WelcomeStep>('welcome');
  const [goal, setGoal] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const goBackSafely = useCallback(() => {
    safeRouterBack(router, '/settings_language' as any);
  }, [router]);

  // Готов ли корневой навигатор. Экран достижим deep-link'ом (см. шапку) — на холодном
  // старте навигация до монтирования Root Layout бросает assertIsReady (крэш 1.5.50
  // в premium_modal). Ждём key И откладываем сами навигации ниже.
  const rootNavState = useRootNavigationState();
  const rootNavReady = Boolean(rootNavState?.key);

  // Эффект-гейт: невалидный язык → назад; фри с ≥1 начатым языком → пейвол.
  // ОБЕ навигации — только после rootNavReady и через scheduleAfterRootNavigationReady:
  // key появляется раньше, чем роутер реально принимает replace на холодном deep-link.
  useEffect(() => {
    if (!rootNavReady) return;
    let cancelled = false;
    let scheduled: ScheduledNavigation | null = null;
    void (async () => {
      if (!target || !isStudyTargetSourceUiLang(lang)) {
        scheduled = scheduleAfterRootNavigationReady(() => {
          if (!cancelled) goBackSafely();
        });
        return;
      }
      const started = await getStartedStudyLanguages();
      if (cancelled) return;
      if (started.includes(target)) return; // уже начат — экран просто освежит план
      if (shouldGateExtraLanguage({ target, startedLanguages: started, hasPremiumAccess })) {
        scheduled = scheduleAfterRootNavigationReady(() => {
          if (cancelled) return;
          markNextNavigationAsReplace();
          openPremiumPaywall(router, {
            context: 'language_add',
            source: 'language_welcome_gate',
            language: target,
          }, 'replace');
        });
      }
    })();
    return () => {
      cancelled = true;
      scheduled?.cancel();
    };
  }, [rootNavReady, target, lang, hasPremiumAccess, router, goBackSafely]);

  const languageName = target && isStudyTargetSourceUiLang(lang)
    ? studyTargetLabelForSourceUiLang(target, lang)
    : '';
  const languageAcc = target ? LANGUAGE_ACCUSATIVE[sourceUi][target] : '';

  const activateLanguage = useCallback(() => {
    if (!target || !goal || !level || busy) return;
    void hapticTap();
    setBusy(true);
    void (async () => {
      try {
        // Повторная проверка гейта в момент действия — статус мог измениться.
        const started = await getStartedStudyLanguages();
        if (!started.includes(target)
          && shouldGateExtraLanguage({ target, startedLanguages: started, hasPremiumAccess })) {
          openPremiumPaywall(router, {
            context: 'language_add',
            source: 'language_welcome_cta',
            language: target,
          });
          return;
        }
        await saveLanguageProfile(target, { goal, level });
        await applyStudyLanguageSelection(target, lang);
        setStep('done'); // язык активирован → экран-подтверждение, а не молчаливый выход
      } catch {
        // Сохранение/активация упали (сеть/сторедж) — без catch это был бы немой
        // провал + unhandled rejection. Говорим пользователю и оставляем на шаге,
        // чтобы он мог нажать ещё раз (setBusy(false) в finally уже разблокирует CTA).
        Alert.alert(
          tr('Не получилось', 'Не вдалося'),
          tr(
            'Не удалось сохранить выбор языка. Проверь соединение и попробуй ещё раз.',
            'Не вдалося зберегти вибір мови. Перевір зʼєднання та спробуй ще раз.',
          ),
        );
      } finally {
        setBusy(false);
      }
    })();
  }, [target, goal, level, busy, hasPremiumAccess, lang, router, tr]);

  // Кнопка на экране-подтверждении: язык уже активен — уводим в обучение (главная).
  const startLearning = useCallback(() => {
    void hapticTap();
    router.replace('/(tabs)/home' as any);
  }, [router]);

  if (!target) return <View style={styles.safe} />;

  const flagAsset = FLAG_ASSETS[target];

  if (step === 'done') {
    const encouragement =
      DONE_ENCOURAGEMENT[sourceUi][goal ?? 'default'] ?? DONE_ENCOURAGEMENT[sourceUi].default;
    return (
      <DoneCelebration
        flagAsset={flagAsset}
        languageName={languageName}
        eyebrow={tr('Новый язык выбран', 'Нову мову вибрано')}
        encouragement={encouragement}
        buttonLabel={tr('Начать учить', 'Почати вчитися')}
        onStart={startLearning}
      />
    );
  }

  const stepIndex = step === 'welcome' ? 0 : step === 'goal' ? 1 : 2;

  const renderOptions = (
    options: ChoiceOption[],
    selected: string | null,
    onPick: (id: string) => void,
  ) => (
    <View style={styles.optionList}>
      {options.map((item) => {
        const isSelected = selected === item.id;
        return (
          <Pressable
            key={item.id}
            testID={`language-welcome-option-${item.id}`}
            onPressIn={() => { void hapticTap(); }}
            onPress={() => onPick(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [styles.optionCard, isSelected && styles.optionCardSelected, pressed && styles.pressed]}
          >
            {item.asset ? (
              <Image source={item.asset} style={styles.optionAsset} resizeMode="contain" />
            ) : (
              <Ionicons name={item.icon} size={32} color={isSelected ? '#E3ECFF' : '#C6D3FF'} />
            )}
            <Text style={styles.optionTitle} numberOfLines={2}>{tr(item.ru, item.uk)}</Text>
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected ? <Ionicons name="checkmark" size={18} color="#07111F" /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const primaryButton = (label: string, onPress: () => void, disabled?: boolean) => (
    <Pressable
      testID="language-welcome-primary"
      onPressIn={() => { if (!disabled && !busy) void hapticTap(); }}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy }}
      style={({ pressed }) => [styles.primaryButtonOuter, pressed && styles.pressed, (disabled || busy) && styles.disabled]}
    >
      <LinearGradient
        colors={disabled ? ['#293044', '#293044'] : ['#E3ECFF', '#7B8CFF', '#C95CFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButton}
      >
        {busy ? <ActivityIndicator size="small" color="#07111F" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Pressable
          testID="language-welcome-back"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => {
            if (step === 'level') { setStep('goal'); return; }
            if (step === 'goal') { setStep('welcome'); return; }
            goBackSafely();
          }}
          hitSlop={10}
          accessibilityRole="button"
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={30} color="#DCE4FF" />
        </Pressable>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i <= stepIndex && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView decelerationRate="normal" contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 'welcome' ? (
          <View style={styles.welcomeBlock}>
            <View style={styles.flagHalo}>
              {flagAsset ? (
                <Image source={flagAsset} style={styles.flagImage} resizeMode="contain" />
              ) : (
                <Ionicons name="flag-outline" size={60} color="#C6D3FF" />
              )}
            </View>
            <Text style={styles.title}>
              {tr(`${languageName}. Начнём!`, `${languageName}. Почнімо!`)}
            </Text>
            <Text style={styles.subtitle}>
              {tr(
                'Отличный выбор! У каждого языка — свой план и свой прогресс: то, что ты уже выучил, никуда не денется. Ответь на пару вопросов, чтобы собрать стартовый план.',
                'Чудовий вибір! У кожної мови — свій план і свій прогрес: те, що ти вже вивчив, нікуди не зникне. Дай відповідь на пару запитань, щоб зібрати стартовий план.',
              )}
            </Text>
          </View>
        ) : null}
        {step === 'goal' ? (
          <View>
            <Text style={styles.question}>
              {tr(`Зачем тебе ${languageAcc}?`, `Навіщо тобі ${languageAcc}?`)}
            </Text>
            {renderOptions(GOAL_OPTIONS, goal, (id) => { setGoal(id); })}
          </View>
        ) : null}
        {step === 'level' ? (
          <View>
            <Text style={styles.question}>
              {tr('Сколько ты уже знаешь?', 'Скільки ти вже знаєш?')}
            </Text>
            {renderOptions(LEVEL_OPTIONS, level, (id) => { setLevel(id); })}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'welcome'
          ? primaryButton(tr('Поехали', 'Поїхали'), () => setStep('goal'))
          : step === 'goal'
            ? primaryButton(tr('Продолжить', 'Продовжити'), () => setStep('level'), !goal)
            : primaryButton(
              tr(`Начать ${languageAcc}`, `Почати ${languageAcc}`),
              activateLanguage,
              !level,
            )}
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DoneCelebration — финальный экран-подтверждение выбора языка.
// Разовая анимация появления (ореол + флаг spring + галочка + текст), затем
// покой: НИКАКИХ withRepeat(-1)/Animated.loop (Performance Bible). Кнопка уводит
// в обучение; язык к этому моменту уже активирован родительским экраном.
// ─────────────────────────────────────────────────────────────────────────────
interface DoneCelebrationProps {
  flagAsset?: ImageSourcePropType;
  languageName: string;
  eyebrow: string;
  encouragement: string;
  buttonLabel: string;
  onStart: () => void;
}

function DoneCelebration({
  flagAsset,
  languageName,
  eyebrow,
  encouragement,
  buttonLabel,
  onStart,
}: DoneCelebrationProps) {
  const badge = useSharedValue(0); // ореол + флаг: появление
  const check = useSharedValue(0); // галочка: pop с overshoot
  const copy = useSharedValue(0); // текст + кнопка: мягкое проявление

  useEffect(() => {
    badge.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
    check.value = withDelay(
      360,
      withSequence(
        withTiming(1.18, { duration: 240, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.ease) }),
      ),
    );
    copy.value = withDelay(300, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
  }, [badge, check, copy]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: badge.value * 0.55,
    transform: [{ scale: 0.4 + badge.value * 0.6 }],
  }));
  const flagStyle = useAnimatedStyle(() => ({
    opacity: badge.value,
    transform: [{ scale: 0.6 + badge.value * 0.4 }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value === 0 ? 0 : 1,
    transform: [{ scale: check.value }],
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: copy.value,
    transform: [{ translateY: (1 - copy.value) * 12 }],
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.doneBody}>
        <View style={styles.badgeWrap}>
          <Reanimated.View style={[styles.doneHalo, haloStyle]} />
          <Reanimated.View style={[styles.doneBadge, flagStyle]}>
            {flagAsset ? (
              <Image source={flagAsset} style={styles.doneFlag} resizeMode="contain" />
            ) : (
              <Ionicons name="flag-outline" size={54} color="#C6D3FF" />
            )}
            <Reanimated.View style={[styles.doneCheck, checkStyle]}>
              <Ionicons name="checkmark" size={20} color="#07111F" />
            </Reanimated.View>
          </Reanimated.View>
        </View>

        <Reanimated.View style={[styles.doneCopy, copyStyle]}>
          <Text style={styles.doneEyebrow}>{eyebrow}</Text>
          <Text style={styles.doneTitle}>{languageName}</Text>
          <Text style={styles.doneText}>{encouragement}</Text>
        </Reanimated.View>
      </View>

      <View style={styles.footer}>
        <Reanimated.View style={copyStyle}>
          <Pressable
            testID="language-welcome-done-start"
            onPressIn={() => { void hapticTap(); }}
            onPress={onStart}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButtonOuter, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={['#E3ECFF', '#7B8CFF', '#C95CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
            </LinearGradient>
          </Pressable>
        </Reanimated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07111F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(198,211,255,0.25)' },
  dotActive: { backgroundColor: '#8AB9FF' },
  scrollContent: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 28, flexGrow: 1 },
  welcomeBlock: { alignItems: 'center', paddingTop: 26 },
  flagHalo: {
    width: 180,
    height: 112,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  flagImage: { width: 160, height: 100 },
  title: { color: '#F7FAFF', fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 14 },
  subtitle: { color: '#C6D3FF', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  question: { color: '#F7FAFF', fontSize: 26, fontWeight: '800', marginBottom: 18, marginTop: 8 },
  optionList: { gap: 10 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 0,
    borderColor: 'rgba(198,211,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionCardSelected: { borderColor: '#7B8CFF', backgroundColor: 'rgba(123,140,255,0.16)' },
  optionAsset: { width: 40, height: 40 },
  optionTitle: { color: '#EAF0FF', fontSize: 16, fontWeight: '600', flex: 1 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 0,
    borderColor: 'rgba(198,211,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: '#8AB9FF', borderColor: '#8AB9FF' },
  footer: { paddingHorizontal: 22, paddingBottom: 14, paddingTop: 8 },
  primaryButtonOuter: { borderRadius: 18, overflow: 'hidden' },
  primaryButton: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  primaryButtonText: { color: '#07111F', fontSize: 17, fontWeight: '800' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },

  // Экран-подтверждение (step === 'done').
  doneBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  badgeWrap: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  doneHalo: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(123,140,255,0.22)',
  },
  doneBadge: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0,
    borderColor: 'rgba(198,211,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  doneFlag: { width: 84, height: 60, borderRadius: 8 },
  doneCheck: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8AB9FF',
    borderWidth: 0,
    borderColor: '#07111F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCopy: { alignItems: 'center', marginTop: 22 },
  doneEyebrow: { color: '#8AB9FF', fontSize: 14, fontWeight: '700', letterSpacing: 0.3, marginBottom: 6 },
  doneTitle: { color: '#F7FAFF', fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 14 },
  doneText: { color: '#C6D3FF', fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 320 },
});
