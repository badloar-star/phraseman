// ═══════════════════════════════════════════════════════════════════════════
// language_welcome — приветствие нового изучаемого языка (мини-онбординг).
//
// Открывается из пикера языков в настройках, когда пользователь добавляет язык,
// который ещё не начинал. Приветствует, задаёт два вопроса (зачем + уровень),
// сохраняет ответы в профиль языка (language_profile_v1::{target} — сырьё для
// выбранных настроек) и активирует язык. Прогресс каждого языка живёт в своём
// namespace, поэтому предыдущий язык ничего не теряет.
//
// Plus не нужен: владелец 2026-09-30 «языки обучения все фри без плюс» — гейт
// «1 язык фри» и уход на пейвол удалены (D78).
//
// Performance Bible: статичный экран, без бесконечных анимаций и подписок;
// первый кадр — синхронный (все данные — локальные константы + параметр роута).
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import {
  scheduleAfterRootNavigationReady,
  type ScheduledNavigation,
} from './paywall_navigation';
import {
  applyStudyLanguageSelection,
  getStartedStudyLanguages,
  isKnownStudyLanguage,
  saveLanguageProfile,
} from './study_languages';
import { type StudyTargetLang } from './study_target_lang_dev';
import { commitPhoneStateDurableAction } from './phone_state_recovery';
import { DebugLogger } from './debug-logger';
import { actionToastTri, emitAppEvent } from './events';
import { fill, onboardingCopy, type OnboardingCopyKey } from '../components/onboarding/clean_onboarding_copy';
import { languageNameOf } from '../components/onboarding/clean_onboarding_options';
import { IS_STORE_RELEASE } from './config';
import BackGlyph from '../components/v2/BackGlyph';

const EXEMPT_COLOR_1 = '#E3ECFF'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_2 = '#C6D3FF'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_3 = '#07111F'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_4 = '#293044'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_5 = '#E3ECFF'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_6 = '#7B8CFF'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_7 = '#C95CFF'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_8 = '#07111F'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_9 = '#DCE4FF'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_10 = '#C6D3FF'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_11 = '#C6D3FF'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_12 = '#07111F'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_13 = '#E3ECFF'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_14 = '#7B8CFF'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
const EXEMPT_COLOR_15 = '#C95CFF'; // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type WelcomeStep = 'welcome' | 'goal' | 'level' | 'done';

const FLAG_ASSETS: Partial<Record<StudyTargetLang, ImageSourcePropType>> = {
  en: require('../assets/images/language_flags/language_en.webp'),
  fr: require('../assets/images/language_flags/language_fr_dev.webp'),
  es: require('../assets/images/language_flags/language_es_dev.webp'),
  de: require('../assets/images/language_flags/language_de.webp'),
  it: require('../assets/images/language_flags/language_it.webp'),
};

// зачем (координатор 12.10): экран был ru/uk — теперь все 9 языков интерфейса из components/onboarding/clean_onboarding_copy_language.ts.
/** Ключи названия языка внутри вопроса «Зачем тебе …?» и на кнопке «Начать …» (форма зависит от языка интерфейса). */
const LANGUAGE_Q_KEY = { en: 'langQEn', fr: 'langQFr', es: 'langQEs', de: 'langQDe', it: 'langQIt' } as const satisfies Record<StudyTargetLang, OnboardingCopyKey>;
const LANGUAGE_START_KEY = { en: 'langStartEn', fr: 'langStartFr', es: 'langStartEs', de: 'langStartDe', it: 'langStartIt' } as const satisfies Record<StudyTargetLang, OnboardingCopyKey>;

/**
 * Персональное напутствие для экрана-подтверждения — по выбранной цели (goal).
 * Ключи совпадают с id GOAL_OPTIONS; fallback — на случай неизвестной цели.
 */
const DONE_ENCOURAGEMENT_KEY: Record<string, OnboardingCopyKey> = {
  series: 'lwDoneSeries',
  everyday: 'lwDoneEveryday',
  travel: 'lwDoneTravel',
  words: 'lwDoneWords',
  mind: 'lwDoneDefault',
  default: 'lwDoneDefault',
};

type ChoiceOption = {
  id: string;
  labelKey: OnboardingCopyKey;
  icon: IoniconName;
};

/** Те же id, что в CleanOnboarding. */
const GOAL_OPTIONS: ChoiceOption[] = [
  { id: 'series', labelKey: 'lwGoalSeries', icon: 'volume-high-outline' },
  { id: 'everyday', labelKey: 'lwGoalEveryday', icon: 'chatbubble-ellipses-outline' },
  { id: 'travel', labelKey: 'lwGoalTravel', icon: 'airplane-outline' },
  { id: 'words', labelKey: 'lwGoalWords', icon: 'cube-outline' },
  { id: 'mind', labelKey: 'lwGoalMind', icon: 'school-outline' },
];

const LEVEL_OPTIONS: ChoiceOption[] = [
  { id: 'a0', labelKey: 'lwLevelA0', icon: 'bar-chart-outline' },
  { id: 'a1', labelKey: 'lwLevelA1', icon: 'bar-chart-outline' },
  { id: 'a2', labelKey: 'lwLevelA2', icon: 'bar-chart-outline' },
  { id: 'b1', labelKey: 'lwLevelB1', icon: 'bar-chart-outline' },
  { id: 'b2', labelKey: 'lwLevelB2', icon: 'bar-chart-outline' },
];

export default function LanguageWelcomeScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const params = useLocalSearchParams<{ target?: string; resolveStarted?: string; devStep?: string }>();
  const rawTarget = Array.isArray(params.target) ? params.target[0] : params.target;
  const parsedTarget: StudyTargetLang | null = isKnownStudyLanguage(rawTarget) ? rawTarget : null;
  const target = parsedTarget;
  const resolveStarted = params.resolveStarted === '1';
  const lc = onboardingCopy(lang);

  // зачем (координатор 12.10, съёмка onboarding-029): экран «Новый язык выбран» достижим только после настоящего включения языка
  // (сохранение профиля и смена языка гостя). dev `devStep=done` открывает его сразу с целью/уровнем по умолчанию и БЕЗ сохранений;
  // в стор-сборке параметр игнорируется.
  const devStepRaw = Array.isArray(params.devStep) ? params.devStep[0] : params.devStep;
  const devDonePreview = typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE && devStepRaw === 'done';
  const [step, setStep] = useState<WelcomeStep>(devDonePreview ? 'done' : 'welcome');
  const [goal, setGoal] = useState<string | null>(devDonePreview ? 'everyday' : null);
  const [level, setLevel] = useState<string | null>(devDonePreview ? 'a1' : null);
  const [busy, setBusy] = useState(false);
  const [entryResolved, setEntryResolved] = useState(!resolveStarted);

  const goBackSafely = useCallback(() => {
    safeRouterBack(router, '/settings_language' as any);
  }, [router]);

  // Готов ли корневой навигатор. Экран достижим deep-link'ом (см. шапку) — на холодном
  // старте навигация до монтирования Root Layout бросает assertIsReady (крэш 1.5.50
  // в premium_modal). Ждём key И откладываем сами навигации ниже.
  const rootNavState = useRootNavigationState();
  const rootNavReady = Boolean(rootNavState?.key);

  // Эффект-вход: невалидный язык → назад. Пейвола больше нет — владелец 2026-09-30:
  // «языки обучения все фри без плюс». Навигация — только после rootNavReady и через scheduleAfterRootNavigationReady:
  // key появляется раньше, чем роутер реально принимает replace на холодном deep-link.
  useEffect(() => {
    if (!rootNavReady) return;
    let cancelled = false;
    let scheduled: ScheduledNavigation | null = null;
    void (async () => {
      if (!target) {
        scheduled = scheduleAfterRootNavigationReady(() => {
          if (!cancelled) goBackSafely();
        });
        return;
      }
      const started = await getStartedStudyLanguages();
      if (cancelled) return;
      if (started.includes(target)) {
        if (resolveStarted) {
          // зачем (ревью TG-3BD963DD05D5): здесь не было catch — отказ записи был немым unhandled rejection,
          // а экран оставался пустым. Логируем шаг и всё равно возвращаем человека назад.
          try {
            await applyStudyLanguageSelection(target, lang);
          } catch (error: unknown) {
            console.warn(`[LANGUAGE-WELCOME] resolve_started_apply_failed target=${target} step=${String((error as { step?: unknown } | null)?.step ?? 'unknown')} reason=${error instanceof Error ? error.message : String(error)}`);
          }
          if (!cancelled) goBackSafely();
        }
        return; // обычный deep-link уже начатого языка освежает план
      }
      setEntryResolved(true);
    })();
    return () => {
      cancelled = true;
      scheduled?.cancel();
    };
  }, [rootNavReady, target, resolveStarted, lang, goBackSafely]);

  const languageName = target ? languageNameOf(lc, target) : '';

  const languageActivateFailedToast = () => actionToastTri('error', {
    ru: 'Не получилось включить язык. Попробуй ещё раз.', uk: 'Не вдалося увімкнути мову. Спробуй ще раз.',
    en: "Couldn't turn on the language. Try again.", es: 'No se pudo activar el idioma. Inténtalo de nuevo.',
    'pt-BR': 'Não foi possível ativar o idioma. Tente de novo.', vi: 'Không bật được ngôn ngữ. Hãy thử lại.',
    id: 'Bahasa tidak dapat diaktifkan. Coba lagi.', tr: 'Dil açılamadı. Tekrar dene.', pl: 'Nie udało się włączyć języka. Spróbuj ponownie.',
  });

  const activateLanguage = useCallback(() => {
    if (!target || !goal || !level || busy) return;
    void hapticTap();
    setBusy(true);
    void (async () => {
      try {
        const committed = await commitPhoneStateDurableAction(async () => {
          await saveLanguageProfile(target, { goal, level });
          await applyStudyLanguageSelection(target, lang);
        });
        if (committed) {
          setStep('done'); // язык активирован → экран-подтверждение, а не молчаливый выход
        } else {
          // зачем (R56, аудит кнопок 15.10): неподтверждённая запись — кнопка отпускалась молча, человек не понимал, что произошло
          console.warn(`[LANG-WELCOME] activate: не подтверждено target=${target}`); // guard-ok: ветка неудачи
          emitAppEvent('action_toast', languageActivateFailedToast());
        }
      } catch (e) {
      // Local durability recovery owns retry; человеку — понятный ответ (раньше экран молчал).
      DebugLogger.error('language_welcome:committed', e instanceof Error ? e : new Error(String(e)), 'warning');
      emitAppEvent('action_toast', languageActivateFailedToast());
    } finally {
        setBusy(false);
      }
    })();
  }, [target, goal, level, busy, lang]);

  // Кнопка на экране-подтверждении: язык уже активен — уводим в обучение (главная).
  const startLearning = useCallback(() => {
    void hapticTap();
    router.replace('/(tabs)/home' as any);
  }, [router]);

  if (!target || !entryResolved) return <View style={styles.safe} />;

  const flagAsset = FLAG_ASSETS[target];

  if (step === 'done') {
    const encouragement = lc[DONE_ENCOURAGEMENT_KEY[goal ?? 'default'] ?? DONE_ENCOURAGEMENT_KEY.default!];
    return (
      <DoneCelebration
        flagAsset={flagAsset}
        languageName={languageName}
        eyebrow={lc.lwPickedTitle}
        encouragement={encouragement}
        buttonLabel={lc.lwStartLearning}
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
            <Ionicons name={item.icon} size={32} color={isSelected ? EXEMPT_COLOR_1 : EXEMPT_COLOR_2} />
            <Text style={styles.optionTitle} numberOfLines={2}>{lc[item.labelKey]}</Text>
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected ? <Ionicons name="checkmark" size={18} color={EXEMPT_COLOR_3} /> : null}
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
        colors={disabled ? [EXEMPT_COLOR_4, '#293044'] : [EXEMPT_COLOR_5, EXEMPT_COLOR_6, EXEMPT_COLOR_7]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButton}
      >
        {busy ? <ActivityIndicator size="small" color={EXEMPT_COLOR_8} /> : <Text style={styles.primaryButtonText}>{label}</Text>}
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
          <BackGlyph size={30} color={EXEMPT_COLOR_9} />
        </Pressable>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i <= stepIndex && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView decelerationRate="fast" contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 'welcome' ? (
          <View style={styles.welcomeBlock}>
            <View style={styles.flagHalo}>
              {flagAsset ? (
                <Image source={flagAsset} style={styles.flagImage} resizeMode="contain" />
              ) : (
                <Ionicons name="flag-outline" size={60} color={EXEMPT_COLOR_10} />
              )}
            </View>
            <Text style={styles.title}>
              {fill(lc.lwLetsGo, { language: languageName })}
            </Text>
            <Text style={styles.subtitle}>
              {lc.lwIntro}
            </Text>
          </View>
        ) : null}
        {step === 'goal' ? (
          <View>
            <Text style={styles.question}>
              {fill(lc.lwGoalQuestion, { lang: target ? lc[LANGUAGE_Q_KEY[target]] : '' })}
            </Text>
            {renderOptions(GOAL_OPTIONS, goal, (id) => { setGoal(id); })}
          </View>
        ) : null}
        {step === 'level' ? (
          <View>
            <Text style={styles.question}>
              {lc.lwLevelQuestion}
            </Text>
            {renderOptions(LEVEL_OPTIONS, level, (id) => { setLevel(id); })}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'welcome'
          ? primaryButton(lc.lwGo, () => setStep('goal'))
          : step === 'goal'
            ? primaryButton(lc.continue, () => setStep('level'), !goal)
            : primaryButton(
              fill(lc.lwStart, { lang: target ? lc[LANGUAGE_START_KEY[target]] : '' }),
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
              <Ionicons name="flag-outline" size={54} color={EXEMPT_COLOR_11} />
            )}
            <Reanimated.View style={[styles.doneCheck, checkStyle]}>
              <Ionicons name="checkmark" size={20} color={EXEMPT_COLOR_12} />
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
              colors={[EXEMPT_COLOR_13, EXEMPT_COLOR_14, EXEMPT_COLOR_15]}
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
  safe: { flex: 1, backgroundColor: '#07111F' }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(198,211,255,0.25)' }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  dotActive: { backgroundColor: '#8AB9FF' }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  scrollContent: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 28, flexGrow: 1 },
  welcomeBlock: { alignItems: 'center', paddingTop: 26 },
  flagHalo: {
    width: 180,
    height: 112,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)', // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  flagImage: { width: 160, height: 100 },
  title: { color: '#F7FAFF', fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 14 }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  subtitle: { color: '#C6D3FF', fontSize: 16, lineHeight: 24, textAlign: 'center' }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  question: { color: '#F7FAFF', fontSize: 26, fontWeight: '800', marginBottom: 18, marginTop: 8 }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  optionList: { gap: 10 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
    borderRadius: 16,
    borderWidth: 0,
    borderColor: 'rgba(198,211,255,0.18)', // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionCardSelected: { borderColor: '#7B8CFF', backgroundColor: 'rgba(123,140,255,0.16)' }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  optionTitle: { color: '#EAF0FF', fontSize: 16, fontWeight: '600', flex: 1 }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 0,
    borderColor: 'rgba(198,211,255,0.4)', // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: '#8AB9FF', borderColor: '#8AB9FF' }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  footer: { paddingHorizontal: 22, paddingBottom: 14, paddingTop: 8 },
  primaryButtonOuter: { borderRadius: 18, overflow: 'hidden' },
  primaryButton: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  primaryButtonText: { color: '#07111F', fontSize: 16, fontWeight: '700' }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
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
    backgroundColor: 'rgba(123,140,255,0.22)', // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  },
  doneBadge: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: 'rgba(255,255,255,0.08)', // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
    borderWidth: 0,
    borderColor: 'rgba(198,211,255,0.22)', // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
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
    backgroundColor: '#8AB9FF', // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
    borderWidth: 0,
    borderColor: '#07111F', // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCopy: { alignItems: 'center', marginTop: 22 },
  doneEyebrow: { color: '#8AB9FF', fontSize: 13, fontWeight: '700', letterSpacing: 0.3, marginBottom: 6 }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  doneTitle: { color: '#F7FAFF', fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 14 }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
  doneText: { color: '#C6D3FF', fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 320 }, // theme-exempt: экран выбора языка — самостоятельная тёмная палитра экрана до выбора темы (светлая строка состояния задана там же)
});
